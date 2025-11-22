// main/Utilities/saveUsage.js
const db = require("./db");

// =============================
//      SAFE QUEUE SYSTEM
// =============================
let saveQueue = null;

function queueUsageWrite(upload, download) {
  // coerce to integers
  upload = Number(upload) || 0;
  download = Number(download) || 0;

  // Avoid storing every 0 reading (idle)
  if (upload === 0 && download === 0) {
    // but still update the queue so we don't hold older values indefinitely
    saveQueue = { upload, download };
  } else {
    saveQueue = { upload, download };
  }

  if (queueUsageWrite.timer) return;

  queueUsageWrite.timer = setTimeout(() => {
    if (saveQueue) {
      writeUsageToDB(saveQueue.upload, saveQueue.download);
      saveQueue = null;
    }
    queueUsageWrite.timer = null;
  }, 1000); // one write per second
}

function writeUsageToDB(upload, download) {
  const query = `
    INSERT INTO usage_stats (upload_bytes, download_bytes)
    VALUES (?, ?)
  `;

  db.run(query, [upload, download], (err) => {
    if (err) console.log("DB Insert Error:", err);
  });
}

module.exports = queueUsageWrite;
