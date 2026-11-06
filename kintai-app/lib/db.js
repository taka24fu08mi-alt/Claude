const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'kintai.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  emp_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dept TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','admin')),
  pw_salt TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS punches (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  UNIQUE (user_id, work_date)
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,
  kubun TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  alcohol TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, work_date)
);
CREATE TABLE IF NOT EXISTS report_items (
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  customer TEXT NOT NULL DEFAULT '',
  start TEXT NOT NULL DEFAULT '',
  end TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT ''
);
`);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const a = Buffer.from(crypto.scryptSync(password, salt, 64).toString('hex'), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createUser({ emp_no, name, dept = '', role = 'employee', password }) {
  const { salt, hash } = hashPassword(password);
  const r = db.prepare(
    'INSERT INTO users (emp_no, name, dept, role, pw_salt, pw_hash) VALUES (?,?,?,?,?,?)'
  ).run(emp_no, name, dept, role, salt, hash);
  return Number(r.lastInsertRowid);
}

// 初回起動時に管理者を1人作る（パスワードはランダムで画面に表示）
function ensureAdmin() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (n > 0) return null;
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
  createUser({ emp_no: 'admin', name: '管理者', dept: '', role: 'admin', password });
  return password;
}

module.exports = { db, createUser, hashPassword, verifyPassword, ensureAdmin };
