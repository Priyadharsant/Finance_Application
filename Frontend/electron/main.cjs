const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const https = require("https");
const http = require("http");
const fs = require("fs");
const { spawn } = require("child_process");

// Helper to stream-download file with HTTP/HTTPS redirect support
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    function requestWithRedirect(currentUrl, redirectCount = 0) {
      if (redirectCount > 8) {
        return reject(new Error("Too many redirects"));
      }

      const client = currentUrl.startsWith("https://") ? https : http;
      const req = client.get(
        currentUrl,
        {
          headers: {
            "User-Agent": "KAMBAM-FINANCE-AutoUpdater/1.0",
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
          const fileStream = fs.createWriteStream(destPath);

          res.on("data", (chunk) => {
            receivedBytes += chunk.length;
            const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
            if (onProgress) {
              onProgress({
                percent,
                transferred: receivedBytes,
                total: totalBytes,
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
    const installerFilename = `FinFlow-Setup-${safeVersion}.exe`;
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

    // Launch the downloaded installer in a detached process
    const installer = spawn(destPath, [], {
      detached: true,
      stdio: "ignore",
    });
    installer.unref();

    // Close current Electron application so installer can overwrite files seamlessly
    setTimeout(() => {
      app.quit();
    }, 1200);

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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
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

app.whenReady().then(createWindow);

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
