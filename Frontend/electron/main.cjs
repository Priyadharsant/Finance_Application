const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");

// IPC handlers for external links and version checks
ipcMain.handle("open-external", async (event, url) => {
  if (url && typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
    await shell.openExternal(url);
  }
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

app.name = "Finance Application";

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
