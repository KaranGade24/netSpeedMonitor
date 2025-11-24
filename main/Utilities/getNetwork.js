// Node-based network monitor to replace the Python streamer.
// Uses `systeminformation` to read network stats and emits the same
// `speed-update` IPC payloads the renderer expects.

const si = require("systeminformation");
const { exec } = require("child_process");
const os = require("os");
const queueUsageWrite = require("./saveUsage");

let winRef = null;
let monitorInterval = null;
let prevBytes = null; // map iface -> { rx_bytes, tx_bytes }
let latestSnapshot = {
  downloadSpeed: "0 B/s",
  uploadSpeed: "0 B/s",
  ip: "0.0.0.0",
  ping: "--",
  packetLoss: "--",
};

function formatBytes(bytes) {
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  let i = 0;
  let val = Number(bytes) || 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(2)} ${units[i]}`;
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

function getIp() {
  const addrs = os.networkInterfaces();
  for (const name of Object.keys(addrs)) {
    for (const info of addrs[name]) {
      if (
        info.family === "IPv4" &&
        !info.internal &&
        info.address &&
        !info.address.startsWith("127.")
      ) {
        return info.address;
      }
    }
  }
  return "0.0.0.0";
}

function pingTest() {
  return new Promise((resolve) => {
    const param = process.platform === "win32" ? "-n" : "-c";
    const cmd = `ping ${param} 1 8.8.8.8`;
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) return resolve({ ping: 0, loss: 100 });
      const out = stdout.toString();
      const timeMatch = out.match(/time[=<]\s*([0-9.]+)\s*ms/);
      if (timeMatch)
        return resolve({ ping: parseFloat(timeMatch[1]), loss: 0 });
      // Some systems show 'time=' without ms token, fallback
      const altMatch = out.match(/time[=<]\s*([0-9.]+)\s*/);
      if (altMatch) return resolve({ ping: parseFloat(altMatch[1]), loss: 0 });
      return resolve({ ping: 0, loss: 100 });
    });
  });
}

async function sampleNetwork() {
  try {
    const stats = await si.networkStats();

    let download_bytes = 0;
    let upload_bytes = 0;

    if (Array.isArray(stats) && stats.length) {
      // Prefer rx_sec/tx_sec if provided by systeminformation (already per-second)
      const hasPerSec = typeof stats[0].rx_sec !== "undefined";

      if (hasPerSec) {
        download_bytes = stats.reduce((acc, s) => acc + (s.rx_sec || 0), 0);
        upload_bytes = stats.reduce((acc, s) => acc + (s.tx_sec || 0), 0);
      } else {
        // compute delta from previous sample using rx_bytes / tx_bytes
        const currentMap = {};
        let totalDownload = 0;
        let totalUpload = 0;
        for (const s of stats) {
          const iface = s.iface || "unknown";
          currentMap[iface] = {
            rx_bytes: s.rx_bytes || 0,
            tx_bytes: s.tx_bytes || 0,
          };
          if (prevBytes && prevBytes[iface]) {
            totalDownload += Math.max(
              0,
              (s.rx_bytes || 0) - (prevBytes[iface].rx_bytes || 0)
            );
            totalUpload += Math.max(
              0,
              (s.tx_bytes || 0) - (prevBytes[iface].tx_bytes || 0)
            );
          }
        }
        prevBytes = currentMap;
        download_bytes = totalDownload;
        upload_bytes = totalUpload;
      }
    }

    // Save to DB (queued inside saveUsage)
    try {
      queueUsageWrite(upload_bytes, download_bytes);
    } catch (e) {
      console.warn("queueUsageWrite failed:", e);
    }

    const ip = getIp();
    const pingRes = await pingTest();

    const formatted = {
      downloadSpeed: formatBytes(download_bytes),
      uploadSpeed: formatBytes(upload_bytes),
      ip: ip || "0.0.0.0",
      ping: typeof pingRes.ping !== "undefined" ? `${pingRes.ping} ms` : "--",
      packetLoss:
        typeof pingRes.loss !== "undefined" ? `${pingRes.loss}%` : "--",
    };

    latestSnapshot = formatted;
    safeSend("speed-update", formatted);
  } catch (err) {
    console.error("sampleNetwork error:", err);
  }
}

function startNetworkStream() {
  if (monitorInterval) return; // already running
  // initial sample to populate prevBytes
  si.networkStats()
    .then((s) => {
      if (Array.isArray(s) && s.length) {
        const map = {};
        for (const item of s) {
          map[item.iface || "unknown"] = {
            rx_bytes: item.rx_bytes || 0,
            tx_bytes: item.tx_bytes || 0,
          };
        }
        prevBytes = map;
      }
    })
    .catch(() => {});

  monitorInterval = setInterval(sampleNetwork, 1000);
}

function stopNetworkStream() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

function isOnline() {
  // quick DNS check — non-blocking but synchronous-style using callback wrapper
  // return true if DNS resolves, false otherwise
  // Keep this simple and synchronous for existing call sites: try to resolve synchronously is not possible,
  // so provide a lightweight heuristic: if at least one non-internal interface exists, assume online.
  const addrs = os.networkInterfaces();
  for (const name of Object.keys(addrs)) {
    for (const info of addrs[name]) {
      if (
        info.family === "IPv4" &&
        !info.internal &&
        info.address &&
        !info.address.startsWith("127.")
      ) {
        return true;
      }
    }
  }
  return false;
}

function getNetworkSpeed() {
  return latestSnapshot;
}

module.exports = {
  startNetworkStream,
  stopNetworkStream,
  setWindow,
  isOnline,
  getNetworkSpeed,
};
