const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  downloadAndInstallUpdate: (url, version) =>
    ipcRenderer.invoke("download-and-install-update", { url, version }),
  onUpdateProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("update-download-progress", handler);
    return () => ipcRenderer.removeListener("update-download-progress", handler);
  },
});