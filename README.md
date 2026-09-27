# Web-Based Text Encryption Tool

A web application that lets a user enter plain text, choose an encryption
algorithm, view the resulting ciphertext, reverse it with decryption, and
(if logged in) save encrypted messages to their account.

## Demo Video
Watch the demo here: [https://drive.google.com/file/d/1Tc6Lb0k-866HZ-0oJJb-ot8Upr6mL8jM/view?usp=drive_link](https://drive.google.com/file/d/1Tc6Lb0k-866HZ-0oJJb-ot8Upr6mL8jM/view?usp=drive_link)

## Project Structure
```
text-encryption-tool/
├── client/              # Frontend (HTML/CSS/JS) — runs in the browser
│   ├── index.html
│   ├── style.css
│   ├── script.js        # Encryption/decryption/hashing logic
│   └── auth.js          # Login/register/save-message logic (talks to server)
├── server/               # Backend (Node.js + Express) — auth + saved messages
│   ├── server.js         # API routes
│   ├── db.js             # Simple JSON-file "database" helper
│   ├── package.json
│   └── data/db.json       # Auto-created on first run (gitignored)
└── README.md
```

## Two Ways to Run It

### Option A — Full app with login & saved messages (recommended)
This runs the Express backend, which also serves the frontend, so
everything — encryption, login, and saved messages — works from one
process.

```bash
cd server
npm install
npm start
```

Then open **http://localhost:3001** in your browser.

### Option B — Frontend only (no accounts)
If you just want to try Caesar/Base64/AES/DES/SHA-256 without setting up
the backend, open `client/index.html` directly in a browser, or serve the
`client/` folder with any static server:
```bash
cd client
npx serve .
```
Encrypt/decrypt/hash all still work. The "Log In / Register" card will show
a connection error if you try to use it, since there's no backend running —
that's expected in this mode.

## Backend requirement note
All encryption/decryption/hashing logic runs client-side in JavaScript,
satisfying the assignment's "Backend Logic" requirement (JavaScript is one
of the accepted languages). The Node/Express backend in `server/` exists
specifically to implement the bonus **user authentication + save messages**
feature — it never sees plaintext or secret keys, only the already-computed
ciphertext, which is good security practice.

---

## Report: Encryption Techniques Used

### 1. Caesar Cipher
A classical **substitution cipher** dating back to Roman times. Each letter
in the plaintext is shifted a fixed number of places (the "shift" or "key")
down the alphabet. For example, with a shift of 3, `A → D`, `B → E`, etc.
Non-letter characters (numbers, punctuation, spaces) are left unchanged.

- **Type:** Symmetric, single-key, classical cipher
- **Key:** A number from 1–25
- **Security:** Very weak by modern standards — only 25 possible keys, so it
  can be brute-forced instantly. Included here purely for educational value,
  to illustrate the basic idea of substitution ciphers.
- **Reversible:** Yes — decrypting simply shifts in the opposite direction.

### 2. Base64 Encoding
Base64 is **not actually encryption** — it is an *encoding* scheme that
converts binary/text data into an ASCII string using a 64-character
alphabet (`A–Z`, `a–z`, `0–9`, `+`, `/`). It is included in the tool (as
listed in the assignment) because it is commonly grouped with
"encryption" demos, but it provides **no confidentiality** at all: anyone
can decode it instantly with no key. It's useful for safely transmitting
text/binary data over channels that expect ASCII (e.g., embedding data in
URLs or JSON).

- **Type:** Encoding (not encryption)
- **Key:** None
- **Security:** None — purely obfuscation, not protection.
- **Reversible:** Yes, trivially (no secret needed).

### 3. AES (Advanced Encryption Standard)
AES is the modern, industry-standard **symmetric block cipher**, adopted
by the U.S. government (NIST) in 2001 and used today in HTTPS, disk
encryption, messaging apps, and more. It encrypts data in fixed-size
128-bit blocks using a secret key (this tool uses the CryptoJS library,
which derives a key from the password you enter and uses AES in CBC mode
with a random salt/IV under the hood).

- **Type:** Symmetric, single secret key for both encrypt and decrypt
- **Key:** User-supplied passphrase
- **Security:** Strong — considered secure with a sufficiently long,
  random key. This is what real-world applications use.
- **Reversible:** Yes, only with the correct key.

### 4. DES (Data Encryption Standard)
DES was the U.S. government's encryption standard from 1977 until it was
replaced by AES. It is also a symmetric block cipher, but uses a much
shorter (56-bit effective) key, making it vulnerable to brute-force
attacks with modern computing power. It's included here for **comparison**
with AES, to show how encryption standards evolve.

- **Type:** Symmetric block cipher
- **Key:** User-supplied passphrase
- **Security:** Weak by modern standards (56-bit key is brute-forceable) —
  included for educational/historical comparison only, not recommended
  for real use.
- **Reversible:** Yes, only with the correct key.

### 5. SHA-256 (bonus — hashing)
SHA-256 is a **cryptographic hash function**, not an encryption algorithm.
It takes an input of any size and produces a fixed-length 256-bit
(64-character hex) digest. It is a **one-way function**: there is no key,
and it cannot be reversed to recover the original text. It's used for
integrity checks (verifying data hasn't changed) and for storing password
hashes (never store plaintext passwords).

- **Type:** One-way cryptographic hash
- **Key:** None
- **Security:** Strong, collision-resistant with current computing power.
- **Reversible:** No — hashing is intentionally irreversible. (The
  "Decrypt" button is disabled for this option in the UI.)

---

## Bonus Features Implemented
- ✅ Decryption for Caesar, Base64, AES, and DES
- ✅ SHA-256 hashing option
- ✅ One-click "Copy Result" button
- ✅ User authentication (register/login) + saving encrypted messages to
  your account — see "Authentication & Saved Messages" below

## Authentication & Saved Messages (bonus feature details)

**Backend:** Node.js + Express, with:
- **bcryptjs** — passwords are hashed (never stored in plain text) before
  being saved
- **jsonwebtoken (JWT)** — on login/register, the server issues a signed
  token (valid 2 hours); the frontend stores it in `localStorage` and sends
  it as `Authorization: Bearer <token>` on every request to a protected
  route
- **Simple JSON-file storage** (`server/data/db.json`) instead of a full
  database engine — enough for a class demo, auto-created on first run.
  For a production app this would be swapped for a real database
  (PostgreSQL, MongoDB, etc.)

**API Endpoints:**
| Method | Route | Auth required? | Purpose |
|---|---|---|---|
| POST | `/api/register` | No | Create an account, returns a JWT |
| POST | `/api/login` | No | Verify credentials, returns a JWT |
| GET | `/api/messages` | Yes | List the logged-in user's saved messages |
| POST | `/api/messages` | Yes | Save a new `{ algorithm, ciphertext }` |
| DELETE | `/api/messages/:id` | Yes | Delete a saved message |

**Frontend flow (`client/auth.js`):**
1. User registers or logs in via the card at the top of the page.
2. Once logged in, a **"💾 Save Result to My Account"** button appears
   under the encrypt/decrypt controls.
3. Saved messages show up in the **"My Saved Messages"** section, each
   tagged with its algorithm and timestamp, with a delete option.

**Security notes (for the report):**
- Passwords are hashed with bcrypt (salted, one-way) — the server never
  stores or even sees a reusable plaintext password after registration.
- The server only ever receives *ciphertext*, never the original plaintext
  or the AES/DES secret key — so even if the JSON "database" were
  compromised, the saved messages remain unreadable without the key the
  user chose (which is never transmitted or stored).
- This is a teaching implementation. For real production use you'd add:
  HTTPS, rate limiting on login attempts, a proper database, refresh
  tokens, and environment-variable-based secrets (the JWT secret here is
  hardcoded as a placeholder for local development).

## Basic Validation Implemented
- Empty plaintext is rejected with an on-screen warning.
- No algorithm selected is rejected with an on-screen warning.
- AES/DES require a non-empty secret key before encrypting.
- Invalid Base64 or wrong AES/DES key on decrypt shows a clear error
  instead of failing silently.

## Disclaimer
This project is built for **educational purposes** to demonstrate how
different encryption/encoding/hashing techniques work. Caesar, Base64, and
DES are intentionally weak/insecure and should never be used to protect
real sensitive data. Only AES (with a strong, randomly generated key) is
suitable for real-world confidentiality — and even then, this demo's
password-based key derivation is simplified for teaching purposes, not
hardened for production use.
