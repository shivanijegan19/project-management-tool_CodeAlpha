// This is the "database." Instead of connecting to MongoDB, we just
// read and write one JSON file on disk. It's not how a production app
// would do it, but it's a real backend: data is stored on the server,
// not in the browser, and survives server restarts.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const empty = { users: [], projects: [], tasks: [], comments: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
