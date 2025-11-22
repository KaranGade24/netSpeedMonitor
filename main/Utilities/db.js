// main/Utilities/db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "usage.db");

// Open DB in default mode
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open DB:", err);
  } else {
    // Enable WAL for better concurrency
    db.run("PRAGMA journal_mode = WAL;");
    // Set busy timeout to 2000ms
    db.run("PRAGMA busy_timeout = 2000;");
    // You can lower synchronous for perf (optional):
    db.run("PRAGMA synchronous = NORMAL;");
  }
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      upload_bytes INTEGER,
      download_bytes INTEGER
    )
  `);
});

module.exports = db;
