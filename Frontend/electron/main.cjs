const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const https = require("https");
const http = require("http");
const fs = require("fs");
const { spawn } = require("child_process");

// Helper to resolve redirects and get content-length + accept-ranges metadata
function resolveUrlAndMetadata(url, maxRedirects = 8) {
  return new Promise((resolve, reject) => {
    function follow(currentUrl, depth) {
      if (depth > maxRedirects) return reject(new Error("Too many redirects"));
      const parsed = new URL(currentUrl);
      const client = parsed.protocol === "https:" ? https : http;

      const req = client.request(
        currentUrl,
        {
          method: "HEAD",
          headers: {
            "User-Agent": "KAMBAM-FINANCE-AutoUpdater/2.0",
            Accept: "*/*",
          },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            const nextUrl = new URL(res.headers.location, currentUrl).toString();
            res.resume();
            return follow(nextUrl, depth + 1);
          }

          const contentLength = parseInt(res.headers["content-length"] || "0", 10);
          const acceptRanges = String(res.headers["accept-ranges"] || "").toLowerCase().includes("bytes");
          res.resume();
          resolve({
            finalUrl: currentUrl,
            contentLength,
            acceptRanges,
          });
        }
      );

      req.on("error", reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error("Metadata request timed out"));
      });
      req.end();
    }

    follow(url, 0);
  });
}

// Multi-stream parallel range chunk downloader (4 parallel streams writing directly to file descriptor)
function downloadMultiStream(finalUrl, destPath, totalBytes, concurrency = 4, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = fs.openSync(destPath, "w");
    try {
      fs.ftruncateSync(fd, totalBytes);
    } catch (_) {}

    const chunkSize = Math.ceil(totalBytes / concurrency);
    let transferred = 0;
    let lastReportTime = 0;
    let lastPercent = -1;
    const startTime = Date.now();
    let isAborted = false;
    const activeReqs = [];

    const cleanup = (err) => {
      if (isAborted) return;
      isAborted = true;
      activeReqs.forEach((r) => {
        try { r.destroy(); } catch (_) {}
      });
      try { fs.closeSync(fd); } catch (_) {}
      if (err) {
        fs.unlink(destPath, () => {});
        reject(err);
      }
    };

    const tasks = [];
    for (let i = 0; i < concurrency; i++) {
      const start = i * chunkSize;
      const end = i === concurrency - 1 ? totalBytes - 1 : (i + 1) * chunkSize - 1;

      tasks.push(
        new Promise((taskResolve, taskReject) => {
          let currentOffset = start;
          const parsed = new URL(finalUrl);
          const client = parsed.protocol === "https:" ? https : http;

          const req = client.get(
            finalUrl,
            {
              headers: {
                Range: `bytes=${start}-${end}`,
                "User-Agent": "KAMBAM-FINANCE-AutoUpdater/2.0",
                Accept: "application/octet-stream, */*",
              },
            },
            (res) => {
              if (res.statusCode !== 206 && res.statusCode !== 200) {
                return taskReject(new Error(`Chunk stream ${i} failed: HTTP ${res.statusCode}`));
              }

              res.on("data", (chunk) => {
                if (isAborted) return;
                const writePos = currentOffset;
                currentOffset += chunk.length;
                transferred += chunk.length;

                fs.write(fd, chunk, 0, chunk.length, writePos, (writeErr) => {
                  if (writeErr) {
                    cleanup(writeErr);
                    return taskReject(writeErr);
                  }
                });

                const now = Date.now();
                const percent = Math.round((transferred / totalBytes) * 100);
                if (onProgress && (percent !== lastPercent || now - lastReportTime > 150 || percent >= 100)) {
                  lastPercent = percent;
                  lastReportTime = now;
                  const elapsedSec = (now - startTime) / 1000 || 0.001;
                  const bytesPerSec = transferred / elapsedSec;
                  const mbps = (bytesPerSec / (1024 * 1024)).toFixed(1);
                  onProgress({
                    percent,
                    transferred,
                    total: totalBytes,
                    speed: `${mbps} MB/s`,
                    streams: concurrency,
                  });
                }
              });

              res.on("end", () => taskResolve());
              res.on("error", (err) => {
                cleanup(err);
                taskReject(err);
              });
            }
          );

          req.on("error", (err) => {
            cleanup(err);
            taskReject(err);
          });
          req.setTimeout(60000, () => {
            req.destroy();
            taskReject(new Error(`Stream ${i} timed out`));
          });
          activeReqs.push(req);
        })
      );
    }

    Promise.all(tasks)
      .then(() => {
        try {
          fs.closeSync(fd);
        } catch (_) {}
        resolve(destPath);
      })
      .catch((err) => cleanup(err));
  });
}

// Single-stream download with large 2MB buffer fallback
function downloadSingleStream(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    function requestWithRedirect(currentUrl, redirectCount = 0) {
      if (redirectCount > 8) {
        return reject(new Error("Too many redirects"));
      }

      const client = currentUrl.startsWith("https://") ? https : http;
      const startTime = Date.now();
      const req = client.get(
        currentUrl,
        {
          headers: {
            "User-Agent": "KAMBAM-FINANCE-AutoUpdater/2.0",
            Accept: "application/octet-stream, */*",
          },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.resume();
            return requestWithRedirect(res.headers.location, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers["content-length"] || "0", 10);
          let receivedBytes = 0;
          const fileStream = fs.createWriteStream(destPath, { highWaterMark: 2 * 1024 * 1024 });
          let lastReportTime = 0;
          let lastPercent = -1;

          res.on("data", (chunk) => {
            receivedBytes += chunk.length;
            const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
            const now = Date.now();
            if (onProgress && (percent !== lastPercent || now - lastReportTime > 150 || percent === 100)) {
              lastPercent = percent;
              lastReportTime = now;
              const elapsedSec = (now - startTime) / 1000 || 0.001;
              const mbps = (receivedBytes / (1024 * 1024) / elapsedSec).toFixed(1);
              onProgress({
                percent,
                transferred: receivedBytes,
                total: totalBytes,
                speed: `${mbps} MB/s`,
                streams: 1,
              });
            }
          });

          res.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close(() => resolve(destPath));
          });

          fileStream.on("error", (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        }
      );

      req.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    requestWithRedirect(url);
  });
}

// Master downloader: Automatically uses 4-stream parallel Range download when supported
async function downloadFile(url, destPath, onProgress) {
  try {
    const meta = await resolveUrlAndMetadata(url);
    if (meta.acceptRanges && meta.contentLength > 5 * 1024 * 1024) {
      console.log(`[AutoUpdater] Fast Multi-Stream active (4 streams, total: ${(meta.contentLength / (1024 * 1024)).toFixed(1)} MB)`);
      return await downloadMultiStream(meta.finalUrl, destPath, meta.contentLength, 4, onProgress);
    }
  } catch (err) {
    console.warn("[AutoUpdater] Multi-stream check notice:", err.message, "Falling back to single stream...");
  }
  return await downloadSingleStream(url, destPath, onProgress);
}

// IPC handlers for external links and version checks
ipcMain.handle("open-external", async (event, url) => {
  if (url && typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
    await shell.openExternal(url);
  }
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// IPC handler for 1-click in-app auto update download & silent/direct execution
ipcMain.handle("download-and-install-update", async (event, { url, version }) => {
  try {
    if (!url) throw new Error("No download URL provided");
    const safeVersion = String(version || "latest").replace(/[^a-zA-Z0-9._-]/g, "");
    const tempDir = app.getPath("temp");
    const installerFilename = `KAMBAM-FINANCE-Setup-${safeVersion}.exe`;
    const destPath = path.join(tempDir, installerFilename);

    // Stream download with live progress events
    await downloadFile(url, destPath, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("update-download-progress", progress);
      }
    });

    const stats = fs.statSync(destPath);
    if (stats.size === 0) {
      throw new Error("Downloaded installer file is empty");
    }

    // Launch NSIS installer visibly (without /S) so the user can see installation progress on screen.
    // Since oneClick: true is configured, it automatically installs without prompting for folders or settings.
    const isPackaged = app.isPackaged;

    if (isPackaged) {
      const updaterScript = path.join(tempDir, `kambam_visible_update_${Date.now()}.bat`);
      const scriptContent = [
        `@echo off`,
        `timeout /t 1 /nobreak >nul`,
        `start "" "${destPath}"`,
        `del "%~f0"`,
      ].join("\r\n");

      fs.writeFileSync(updaterScript, scriptContent, "utf-8");

      const updaterProc = spawn("cmd.exe", ["/c", updaterScript], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      updaterProc.unref();
    } else {
      const installer = spawn(destPath, [], {
        detached: true,
        stdio: "ignore",
      });
      installer.unref();
    }

    // Close current Electron application immediately so installer can overwrite files without lock
    setTimeout(() => {
      app.exit(0);
    }, 200);

    return { success: true };
  } catch (err) {
    console.error("[AutoUpdater] Download/install error:", err);
    return { success: false, error: err.message };
  }
});

app.name = "KAMBAM FINANCE";

// Performance optimization: enable hardware acceleration & GPU rasterization
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");

let mainWindow;

function createWindow() {
  const appIconPath = path.join(__dirname, "icon.ico");
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    show: false, // Prevent flash and stutter while initial content loads
    backgroundColor: "#f8fafc",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false, // Prevents high CPU overhead on large financial tables and numbers
      backgroundThrottling: false, // Keep animations and calculations responsive
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (app.isPackaged) {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  } else {
    mainWindow.webContents.once("did-fail-load", () => {
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    });
    mainWindow.loadURL("http://localhost:5173");
  }
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
