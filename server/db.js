'use strict';
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

const db = new DatabaseSync(path.join(cfg.dataDir, 'orvex.db'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  birth TEXT,
  lang TEXT,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_codes(
  email TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
  hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chats(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_user ON chats(user_id, ts DESC);
CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  parts TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_chat ON messages(chat_id, id);
CREATE TABLE IF NOT EXISTS codes(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lang TEXT,
  code TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS memory(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage(
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, day)
);
CREATE TABLE IF NOT EXISTS points(
  user_id INTEGER PRIMARY KEY,
  used REAL NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS image_usage(
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, day)
);
CREATE TABLE IF NOT EXISTS connectors(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  secret TEXT NOT NULL,
  label TEXT,
  perms TEXT NOT NULL DEFAULT '{}',
  meta TEXT,
  ts INTEGER NOT NULL,
  PRIMARY KEY(user_id, kind)
);
CREATE TABLE IF NOT EXISTS uploads(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mime TEXT,
  size INTEGER,
  ts INTEGER NOT NULL
);
`);

const q = {
  one: (sql, ...a) => db.prepare(sql).get(...a),
  all: (sql, ...a) => db.prepare(sql).all(...a),
  run: (sql, ...a) => db.prepare(sql).run(...a),
};

module.exports = { db, q };
