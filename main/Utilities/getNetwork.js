// main/Utilities/getNetwork.js
const { spawn } = require("child_process");
const path = require("path");
const queueUsageWrite = require("./saveUsage");
const { net } = require("electron");

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
  // Full path to embedded Python
  const pythonExe = path.join(process.resourcesPath, "python", "python.exe");

  // Path to your Python script
  const scriptPath = path.join(
    process.resourcesPath,
    "python",
    "network_speed.py"
  );

  console.log("Running Embedded Python:", pythonExe);
  console.log("Python Script:", scriptPath);

  // Spawn Python
  const python = spawn(pythonExe, [scriptPath], {
    windowsHide: true,
  });

  python.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      try {
        const json = JSON.parse(line);

        // Save to DB
        queueUsageWrite(json.upload_bytes, json.download_bytes);

        // online status
        const online = net.isOnline();

        // format for UI
        const formatted = {
          downloadSpeed: formatBytes(json.download_bytes),
          uploadSpeed: formatBytes(json.upload_bytes),
          ip: json.ip || "0.0.0.0",
          ping: json.ping !== undefined ? `${json.ping} ms` : "--",
          packetLoss:
            json.packet_loss !== undefined ? `${json.packet_loss}%` : "--",
          isOnline: online
            ? "Network Status: ONLINE"
            : "Network Status: OFFLINE",
        };

        safeSend("speed-update", formatted);
      } catch (err) {
        console.error("JSON Parse Error:", line);
      }
    }
  });

  python.stderr.on("data", (data) => {
    console.error("PYTHON ERROR:", data.toString());
  });

  python.on("close", () => {
    console.log("Python Process Closed");
  });
}

module.exports = { startPythonStream, setWindow };
