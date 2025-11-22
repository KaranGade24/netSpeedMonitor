const db = require("./db");

// Format bytes to KB/MB/GB
function format(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// ==========================
// GET DAILY USAGE (LIVE)
// ==========================
function getDailyUsage(callback) {
  const query = `
    SELECT 
      SUM(upload_bytes) AS upload,
      SUM(download_bytes) AS download
    FROM usage_stats
    WHERE DATE(timestamp) = DATE('now', 'localtime')
  `;

  db.get(query, (err, row) => {
    if (err) return callback(err);

    const result = {
      upload: row.upload || 0,
      download: row.download || 0,
      total: (row.upload || 0) + (row.download || 0),
    };

    callback(null, result);
  });
}

// ==========================
// GET MONTHLY USAGE (LIVE)
// ==========================
function getMonthlyUsage(callback) {
  const query = `
    SELECT
      SUM(upload_bytes) AS upload,
      SUM(download_bytes) AS download
    FROM usage_stats
    WHERE strftime('%Y-%m', timestamp) = strftime('%Y-%m', 'now', 'localtime')
  `;

  db.get(query, (err, row) => {
    if (err) return callback(err);

    const result = {
      upload: row.upload || 0,
      download: row.download || 0,
      total: (row.upload || 0) + (row.download || 0),
    };

    callback(null, result);
  });
}

module.exports = { getDailyUsage, getMonthlyUsage, format };
