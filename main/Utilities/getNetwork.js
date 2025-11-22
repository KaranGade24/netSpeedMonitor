// main/Utilities/getNetwork.js
const { spawn } = require("child_process");
const path = require("path");
const queueUsageWrite = require("./saveUsage");

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
  } else {
    // renderer not available (hidden, reloading, closed) — skip sending
    // console.log("⚠ Renderer not available, skipping send");
  }
}

function setWindow(win) {
  winRef = win;
}

function startPythonStream() {
  const pythonPath = path
    .join(__dirname, "./network_speed.py")
    .replace(/\\/g, "/");
  console.log("Python running:", pythonPath);

  const python = spawn("python", [pythonPath], { windowsHide: true });

  python.stdout.on("data", (data) => {
    // split by newline because Python prints JSON per line
    const lines = data.toString().split(/\r?\n/);

    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;

      try {
        const json = JSON.parse(line);

        // Save to DB (queued inside saveUsage)
        queueUsageWrite(json.upload_bytes, json.download_bytes);

        // Format speeds for UI using raw bytes (per second)
        const formatted = {
          downloadSpeed: formatBytes(json.download_bytes),
          uploadSpeed: formatBytes(json.upload_bytes),
          ip: json.ip || "0.0.0.0",
          ping: typeof json.ping !== "undefined" ? `${json.ping} ms` : "--",
          packetLoss:
            typeof json.packet_loss !== "undefined"
              ? `${json.packet_loss}%`
              : "--",
        };

        // send formatted to renderer on the 'speed-update' channel (preload expects this)
        safeSend("speed-update", formatted);
      } catch (err) {
        // log the exact line that failed (non fatal)
        console.error("JSON Parse Failed (single line):", line);
      }
    }
  });

  python.stderr.on("data", (data) => {
    console.error("Python Error:", data.toString());
  });

  python.on("close", () => console.log("Python closed"));
}

module.exports = { startPythonStream, setWindow };
