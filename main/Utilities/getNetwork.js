const { spawn } = require("child_process");
const path = require("path");
const queueUsageWrite = require("./saveUsage");
const { net, app } = require("electron");

let winRef = null;

function formatBytes(bytes) {
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

function safeSend(channel, data) {
  if (
    winRef &&
    !winRef.isDestroyed() &&
    winRef.webContents &&
    !winRef.webContents.isDestroyed()
  ) {
    try {
      winRef.webContents.send(channel, data);
    } catch (e) {
      console.warn("safeSend error:", e);
    }
  }
}

function setWindow(win) {
  winRef = win;
}

function startPythonStream() {
  const isDev = !app.isPackaged;

  const pythonExe = isDev
    ? path.join(__dirname, "../../python", "python.exe") // <-- DEV PATH
    : path.join(process.resourcesPath, "python", "python.exe"); // <-- BUILD PATH

  const script = isDev
    ? path.join(__dirname, "../../python", "network_speed.py")
    : path.join(process.resourcesPath, "python", "network_speed.py");

  console.log("Running Python at:", pythonExe);

  const python = spawn(pythonExe, [script], {
    cwd: path.dirname(script),
    windowsHide: true,
  });

  python.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const json = JSON.parse(trimmed);
        const isOnline = net.isOnline();
        const formatted = {
          downloadSpeed: formatBytes(json.download_bytes),
          uploadSpeed: formatBytes(json.upload_bytes),
          ip: json.ip,
          ping: `${json.ping} ms`,
          packetLoss: `${json.packet_loss}%`,
          isOnline: isOnline
            ? "Network Status: ONLINE"
            : "Network Status: OFFLINE",
        };

        safeSend("speed-update", formatted);
      } catch {
        console.log("Parse failed:", trimmed);
      }
    }
  });

  python.stderr.on("data", (err) => {
    console.error("Python error:", err.toString());
  });

  python.on("close", () => console.log("Python Closed"));
}

module.exports = { startPythonStream, setWindow };
