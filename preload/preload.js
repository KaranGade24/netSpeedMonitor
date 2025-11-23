const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  winClose: () => ipcRenderer.send("window-close"),

  onNetSpeed: (callback) =>
    ipcRenderer.on("speed-update", (event, data) => callback(data)),

  get_NetSpeed: () => ipcRenderer.send("get-net-speed"),

  requestUsageLive: () => ipcRenderer.send("get-usage-live"),

  onUsageLive: (cb) => {
    ipcRenderer.on("usage-live-data", (e, data) => cb(data));
  },
});
