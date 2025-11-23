const db = require("./db");

// =============================
//      SAFE QUEUE SYSTEM
// =============================
let saveQueue = null;

function queueUsageWrite(upload, download) {
  // coerce to integers
  upload = Number(upload) || 0;
  download = Number(download) || 0;

  // Only update queue if non-zero or first update
  saveQueue = { upload, download };

  // If timer already exists, skip
  if (queueUsageWrite.timer) return;

  queueUsageWrite.timer = setTimeout(() => {
    if (saveQueue) {
      const { upload, download } = saveQueue;

      // Skip writing if both are zero to avoid idle data
      if (upload !== 0 || download !== 0) {
        writeUsageToDB(upload, download);
      }

      saveQueue = null;
    }
    queueUsageWrite.timer = null;
  }, 1000); // one write per second
}

function writeUsageToDB(upload, download) {
  const query = `
    INSERT INTO usage_stats (timestamp, upload_bytes, download_bytes)
    VALUES (datetime('now', 'localtime'), ?, ?)
  `;

  db.run(query, [upload, download], (err) => {
    if (err) console.log("DB Insert Error:", err);
  });
}

module.exports = queueUsageWrite;
