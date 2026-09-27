/**
 * db.js
 * -----
 * A minimal JSON-file "database" — no external database server needed.
 * Good enough for a student demo project. Not suitable for production
 * (no concurrency control, no encryption at rest, etc).
 *
 * Data shape:
 * {
 *   "users": [ { "id": 1, "username": "alice", "passwordHash": "..." } ],
 *   "messages": [
 *     { "id": 1, "userId": 1, "algorithm": "aes", "ciphertext": "...", "createdAt": "..." }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], messages: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw || '{"users":[],"messages":[]}');
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---------- Users ----------
function findUserByUsername(username) {
  const db = readDB();
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

function createUser(username, passwordHash) {
  const db = readDB();
  const id = db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1;
  const user = { id, username, passwordHash };
  db.users.push(user);
  writeDB(db);
  return user;
}

// ---------- Messages ----------
function getMessagesForUser(userId) {
  const db = readDB();
  return db.messages
    .filter((m) => m.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createMessage(userId, algorithm, ciphertext) {
  const db = readDB();
  const id = db.messages.length ? Math.max(...db.messages.map((m) => m.id)) + 1 : 1;
  const message = {
    id,
    userId,
    algorithm,
    ciphertext,
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  writeDB(db);
  return message;
}

function deleteMessage(userId, messageId) {
  const db = readDB();
  const before = db.messages.length;
  db.messages = db.messages.filter((m) => !(m.id === messageId && m.userId === userId));
  writeDB(db);
  return db.messages.length < before;
}

module.exports = {
  findUserByUsername,
  createUser,
  getMessagesForUser,
  createMessage,
  deleteMessage,
};
