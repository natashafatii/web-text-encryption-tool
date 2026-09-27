/**
 * server.js
 * ---------
 * Backend for the Text Encryption Tool's bonus feature:
 * user authentication + saving encrypted messages.
 *
 * NOTE: The actual encryption/decryption still happens in the browser
 * (client/script.js). This server only handles accounts and storing
 * already-encrypted ciphertext — it never sees plaintext or secret keys,
 * which is good practice (the server should not be a point where
 * sensitive plaintext passes through, if it doesn't need to).
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// In a real app, store this in an environment variable, never in source code.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const TOKEN_EXPIRY = '2h';

app.use(cors());
app.use(express.json());

// Serve the frontend (client/) as static files too, so the whole app
// can be run from a single `node server.js` command.
app.use(express.static(path.join(__dirname, '..', 'client')));

// ------------------------------------------------------------------
// Auth middleware — verifies the JWT sent in the Authorization header
// ------------------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// ------------------------------------------------------------------
// POST /api/register
// ------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (db.findUserByUsername(username)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = db.createUser(username.trim(), passwordHash);

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  res.status(201).json({ token, username: user.username });
});

// ------------------------------------------------------------------
// POST /api/login
// ------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  res.json({ token, username: user.username });
});

// ------------------------------------------------------------------
// GET /api/messages  — list the logged-in user's saved messages
// ------------------------------------------------------------------
app.get('/api/messages', requireAuth, (req, res) => {
  const messages = db.getMessagesForUser(req.userId);
  res.json({ messages });
});

// ------------------------------------------------------------------
// POST /api/messages — save a new encrypted message
// ------------------------------------------------------------------
app.post('/api/messages', requireAuth, (req, res) => {
  const { algorithm, ciphertext } = req.body || {};

  if (!algorithm || !ciphertext) {
    return res.status(400).json({ error: 'algorithm and ciphertext are required.' });
  }

  const message = db.createMessage(req.userId, algorithm, ciphertext);
  res.status(201).json({ message });
});

// ------------------------------------------------------------------
// DELETE /api/messages/:id — remove a saved message
// ------------------------------------------------------------------
app.delete('/api/messages/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const deleted = db.deleteMessage(req.userId, id);
  if (!deleted) {
    return res.status(404).json({ error: 'Message not found.' });
  }
  res.json({ success: true });
});

// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Text Encryption Tool server running at http://localhost:${PORT}`);
});
