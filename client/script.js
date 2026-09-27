/* ======================================================
   Web-Based Text Encryption Tool
   12 algorithms:
     Modern:     AES, DES, RSA, Base64, SHA-256
     Classical:  Caesar, Vigenère, Vigenère Autokey,
                 Vernam (XOR), One-Time Pad (XOR),
                 Rail Fence, Columnar Transposition
   ====================================================== */

// ---------- DOM references ----------
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const algorithm = document.getElementById('algorithm');
const paramFieldWrap = document.getElementById('paramFieldWrap');
const paramLabel = document.getElementById('paramLabel');
const paramInput = document.getElementById('paramInput');
const rsaKeyInfo = document.getElementById('rsaKeyInfo');
const statusMsg = document.getElementById('statusMsg');

const encryptBtn = document.getElementById('encryptBtn');
const decryptBtn = document.getElementById('decryptBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');

// ======================================================
// Per-algorithm UI configuration: what the parameter field
// should look like (label, placeholder, default) for each
// algorithm, and whether it needs one at all.
// ======================================================
const ALGO_CONFIG = {
  caesar: { label: 'Shift (1-25)', type: 'number', placeholder: '', value: '3' },
  base64: null, // no parameter needed
  aes: { label: 'Secret Key', type: 'text', placeholder: 'Enter a secret passphrase' },
  des: { label: 'Secret Key', type: 'text', placeholder: 'Enter a secret passphrase' },
  sha256: null,
  rsa: null, // keys are auto-generated; shown in rsaKeyInfo instead
  vigenere: { label: 'Keyword (letters only)', type: 'text', placeholder: 'e.g. PASWD' },
  autokey: { label: 'Keyword (letters only)', type: 'text', placeholder: 'e.g. KING' },
  vernam: { label: 'XOR Key (letters only, same length as text)', type: 'text', placeholder: 'e.g. RANCHOBABA' },
  otp: { label: 'One-Time Key (letters or binary; leave blank to auto-generate)', type: 'text', placeholder: 'Optional' },
  railfence: { label: 'Number of Rails (2+)', type: 'number', placeholder: '', value: '3' },
  columnar: { label: 'Keyword', type: 'text', placeholder: 'e.g. ZEBRA' },
};

algorithm.addEventListener('change', () => {
  const algo = algorithm.value;
  const config = ALGO_CONFIG[algo];

  if (config) {
    paramFieldWrap.style.display = 'block';
    paramLabel.textContent = config.label;
    paramInput.type = config.type;
    paramInput.placeholder = config.placeholder || '';
    paramInput.value = config.value || '';
  } else {
    paramFieldWrap.style.display = 'none';
    paramInput.value = '';
  }

  rsaKeyInfo.style.display = algo === 'rsa' ? 'block' : 'none';
  if (algo === 'rsa') updateRSAKeyInfo();

  // Hashing is one-way, so decryption makes no sense for it
  decryptBtn.disabled = (algo === 'sha256');
  decryptBtn.style.opacity = (algo === 'sha256') ? 0.5 : 1;
  clearStatus();
});

// ======================================================
// 1. CAESAR CIPHER (classical substitution)
// ======================================================
function caesarEncrypt(text, shift) {
  shift = ((shift % 26) + 26) % 26;
  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char === char.toUpperCase() ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);
  });
}
function caesarDecrypt(text, shift) {
  return caesarEncrypt(text, -shift);
}

// ======================================================
// 2. BASE64 ENCODING (not true encryption — no key)
// ======================================================
function base64Encrypt(text) {
  return btoa(unescape(encodeURIComponent(text)));
}
function base64Decrypt(text) {
  try {
    return decodeURIComponent(escape(atob(text)));
  } catch (e) {
    throw new Error('Invalid Base64 input.');
  }
}

// ======================================================
// 3. AES — symmetric block cipher (via CryptoJS)
// ======================================================
function aesEncrypt(text, key) {
  return CryptoJS.AES.encrypt(text, key).toString();
}
function aesDecrypt(cipherText, key) {
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  const result = bytes.toString(CryptoJS.enc.Utf8);
  if (!result) throw new Error('Decryption failed. Check your key or ciphertext.');
  return result;
}

// ======================================================
// 4. DES — symmetric block cipher (via CryptoJS)
// ======================================================
function desEncrypt(text, key) {
  return CryptoJS.DES.encrypt(text, key).toString();
}
function desDecrypt(cipherText, key) {
  const bytes = CryptoJS.DES.decrypt(cipherText, key);
  const result = bytes.toString(CryptoJS.enc.Utf8);
  if (!result) throw new Error('Decryption failed. Check your key or ciphertext.');
  return result;
}

// ======================================================
// 5. SHA-256 — one-way hash (via CryptoJS)
// ======================================================
function sha256Hash(text) {
  return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
}

// ======================================================
// 6. VIGENÈRE CIPHER — polyalphabetic substitution
//    Key repeats over the message; only letters are shifted.
// ======================================================
function vigenereEncrypt(text, key) {
  key = key.replace(/[^a-zA-Z]/g, '');
  if (!key) throw new Error('Keyword must contain at least one letter.');
  let ki = 0;
  return [...text].map((ch) => {
    if (/[a-zA-Z]/.test(ch)) {
      const base = ch === ch.toUpperCase() ? 65 : 97;
      const kBase = key[ki % key.length].toUpperCase().charCodeAt(0) - 65;
      ki++;
      return String.fromCharCode(((ch.charCodeAt(0) - base + kBase) % 26) + base);
    }
    return ch;
  }).join('');
}
function vigenereDecrypt(text, key) {
  key = key.replace(/[^a-zA-Z]/g, '');
  if (!key) throw new Error('Keyword must contain at least one letter.');
  let ki = 0;
  return [...text].map((ch) => {
    if (/[a-zA-Z]/.test(ch)) {
      const base = ch === ch.toUpperCase() ? 65 : 97;
      const kBase = key[ki % key.length].toUpperCase().charCodeAt(0) - 65;
      ki++;
      return String.fromCharCode(((ch.charCodeAt(0) - base - kBase + 26) % 26) + base);
    }
    return ch;
  }).join('');
}

// ======================================================
// 7. VIGENÈRE AUTOKEY CIPHER
//    Key = keyword followed by the plaintext itself,
//    instead of the keyword repeating.
// ======================================================
function autokeyEncrypt(text, key) {
  key = key.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!key) throw new Error('Keyword must contain at least one letter.');
  const letters = text.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const runningKey = (key + letters).slice(0, letters.length);
  let ki = 0;
  return [...text].map((ch) => {
    if (/[a-zA-Z]/.test(ch)) {
      const base = ch === ch.toUpperCase() ? 65 : 97;
      const kBase = runningKey.charCodeAt(ki) - 65;
      ki++;
      return String.fromCharCode(((ch.charCodeAt(0) - base + kBase) % 26) + base);
    }
    return ch;
  }).join('');
}
function autokeyDecrypt(cipher, key) {
  key = key.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!key) throw new Error('Keyword must contain at least one letter.');
  let runningKey = key;
  let ki = 0;
  let result = '';
  for (const ch of cipher) {
    if (/[a-zA-Z]/.test(ch)) {
      const base = ch === ch.toUpperCase() ? 65 : 97;
      const kBase = runningKey.charCodeAt(ki) - 65;
      const plainCode = ((ch.charCodeAt(0) - base - kBase + 26) % 26);
      const plainChar = String.fromCharCode(plainCode + base);
      result += plainChar;
      runningKey += plainChar.toUpperCase();
      ki++;
    } else {
      result += ch;
    }
  }
  return result;
}

// ======================================================
// 8. VERNAM CIPHER
//    Classical textbook formula (Stallings): convert each
//    letter to its 0-25 value (A=0...Z=25), XOR the
//    plaintext value with the key value, convert back to
//    a letter. Requires a key exactly as long as the text.
//    Only handles A-Z letters (case-insensitive); other
//    characters are rejected.
// ======================================================
function letterVal(ch) {
  return ch.toUpperCase().charCodeAt(0) - 65;
}
function vernamEncrypt(text, key) {
  if (key.length !== text.length) {
    throw new Error(`Key length (${key.length}) must exactly match text length (${text.length}).`);
  }
  if (!/^[a-zA-Z]+$/.test(text) || !/^[a-zA-Z]+$/.test(key)) {
    throw new Error('Vernam cipher (classical form) only supports letters A-Z, no spaces or punctuation.');
  }
  return [...text].map((ch, i) => {
    const p = letterVal(ch);
    const k = letterVal(key[i]);
    return String.fromCharCode((p ^ k) + 65);
  }).join('');
}
function vernamDecrypt(cipher, key) {
  // XOR is its own inverse, so decryption uses the exact same operation.
  return vernamEncrypt(cipher, key);
}

// ======================================================
// 9. ONE-TIME PAD (OTP)
//    Same XOR-on-letter-value formula as Vernam above, but
//    with a truly random, single-use key — the discipline,
//    not the math, is what makes it provably secure. If no
//    key is supplied, one is auto-generated (A-Z only) and
//    shown to the user so they can decrypt later.
// ======================================================
function otpEncrypt(text, key) {
  if (/^[01\s]+$/.test(text) && /^[01\s]+$/.test(key)) {
    const tClean = text.replace(/\s+/g, '');
    const kClean = key.replace(/\s+/g, '');
    if (tClean.length !== kClean.length) {
      throw new Error(`Key length (${kClean.length}) must exactly match text length (${tClean.length}).`);
    }
    return [...tClean].map((bit, i) => (bit === kClean[i] ? '0' : '1')).join('');
  }
  return vernamEncrypt(text, key);
}
function otpDecrypt(cipher, key) {
  return otpEncrypt(cipher, key);
}
function randomKeyOfLength(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let key = '';
  for (let i = 0; i < len; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

// ======================================================
// 10. RAIL FENCE CIPHER (transposition, zigzag pattern)
// ======================================================
function railFenceEncrypt(text, rails) {
  rails = Math.max(2, parseInt(rails, 10) || 2);
  const fence = Array.from({ length: rails }, () => []);
  let row = 0, dir = 1;
  text = text.toUpperCase().replace(/\s+/g, '');
  for (const ch of text) {
    fence[row].push(ch);
    if (row === 0) dir = 1;
    else if (row === rails - 1) dir = -1;
    row += dir;
  }
  return fence.map((r) => r.join('')).join(' ');
}
function railFenceDecrypt(cipher, rails) {
  cipher = cipher.toUpperCase().replace(/\s+/g, '');
  rails = Math.max(2, parseInt(rails, 10) || 2);
  const len = cipher.length;
  const pattern = [];
  let row = 0, dir = 1;
  for (let i = 0; i < len; i++) {
    pattern.push(row);
    if (row === 0) dir = 1;
    else if (row === rails - 1) dir = -1;
    row += dir;
  }
  const rowCounts = Array(rails).fill(0);
  pattern.forEach((r) => rowCounts[r]++);
  let idx = 0;
  const rowsChars = [];
  for (let r = 0; r < rails; r++) {
    rowsChars.push(cipher.slice(idx, idx + rowCounts[r]).split(''));
    idx += rowCounts[r];
  }
  const rowPos = Array(rails).fill(0);
  let result = '';
  for (const r of pattern) result += rowsChars[r][rowPos[r]++];
  return result;
}

// ======================================================
// 11. COLUMNAR TRANSPOSITION CIPHER
//     Plaintext written in rows under a keyword; columns
//     are read off in the keyword's alphabetical order.
// ======================================================
function keyOrder(keyword) {
  return [...keyword]
    .map((ch, i) => ({ ch: ch.toUpperCase(), i }))
    .sort((a, b) => (a.ch === b.ch ? a.i - b.i : a.ch.localeCompare(b.ch)))
    .map((o) => o.i);
}
function columnarEncrypt(text, keyword) {
  if (!keyword) throw new Error('Keyword is required.');
  const cols = keyword.length;
  const padded = text + 'X'.repeat((cols - (text.length % cols)) % cols);
  const rows = padded.length / cols;
  const grid = [];
  for (let r = 0; r < rows; r++) grid.push(padded.slice(r * cols, r * cols + cols));
  const order = keyOrder(keyword);
  let result = '';
  for (const colIdx of order) {
    for (let r = 0; r < rows; r++) result += grid[r][colIdx];
  }
  return result;
}
function columnarDecrypt(cipher, keyword) {
  if (!keyword) throw new Error('Keyword is required.');
  const cols = keyword.length;
  if (cipher.length % cols !== 0) throw new Error('Ciphertext length is not a multiple of the keyword length.');
  const rows = cipher.length / cols;
  const order = keyOrder(keyword);
  const colChars = Array(cols);
  let idx = 0;
  for (const colIdx of order) {
    colChars[colIdx] = cipher.slice(idx, idx + rows);
    idx += rows;
  }
  let result = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) result += colChars[c][r];
  }
  return result.replace(/X+$/, '');
}

// ======================================================
// 12. RSA (textbook demo, public-key encryption)
//     Keys are generated once when the page loads and kept
//     in memory for the session. Educational-scale primes
//     only — NOT secure key sizes. ASCII/Latin-1 text only
//     (character codes 0-255).
// ======================================================
let rsaKeys = null;

function modPow(base, exp, mod) {
  base = BigInt(base); exp = BigInt(exp); mod = BigInt(mod);
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}
function randPrime(min, max) {
  let n;
  do { n = Math.floor(Math.random() * (max - min)) + min; } while (!isPrime(n));
  return n;
}
function gcdBig(a, b) { return b === 0n ? a : gcdBig(b, a % b); }
function modInverse(e, phi) {
  let [oldR, r] = [e, phi];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return ((oldS % phi) + phi) % phi;
}
function generateRSAKeys() {
  const p = BigInt(randPrime(200, 500));
  let q = BigInt(randPrime(200, 500));
  while (q === p) q = BigInt(randPrime(200, 500));
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  let e = 3n;
  while (gcdBig(e, phi) !== 1n) e += 2n;
  const d = modInverse(e, phi);
  return { n, e, d };
}
function updateRSAKeyInfo() {
  if (!rsaKeys) rsaKeys = generateRSAKeys();
  rsaKeyInfo.textContent =
    `Auto-generated for this session — Public key (n, e): (${rsaKeys.n}, ${rsaKeys.e}). ` +
    `Only ASCII text (basic English letters, numbers, punctuation) is supported by this demo.`;
}
function rsaEncrypt(text) {
  if (!rsaKeys) rsaKeys = generateRSAKeys();
  for (const ch of text) {
    if (ch.charCodeAt(0) > 255) throw new Error('RSA demo only supports basic ASCII/Latin-1 text.');
  }
  return [...text].map((ch) => modPow(BigInt(ch.charCodeAt(0)), rsaKeys.e, rsaKeys.n).toString()).join(',');
}
function rsaDecrypt(cipher) {
  if (!rsaKeys) throw new Error('No RSA key available in this session — encrypt something first.');
  return cipher.split(',').map((c) => String.fromCharCode(Number(modPow(BigInt(c.trim()), rsaKeys.d, rsaKeys.n)))).join('');
}

// ---------- Status / validation helpers ----------
function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = 'status ' + (type || '');
}
function clearStatus() {
  statusMsg.textContent = '';
  statusMsg.className = 'status';
}

function validateInputs(requireParam) {
  if (!inputText.value.trim()) {
    showStatus('⚠ Please enter some text.', 'error');
    return false;
  }
  if (!algorithm.value) {
    showStatus('⚠ Please select an encryption algorithm.', 'error');
    return false;
  }
  const config = ALGO_CONFIG[algorithm.value];
  const needsParam = config && algorithm.value !== 'otp'; // OTP param is optional (auto-generates)
  if (requireParam && needsParam && !paramInput.value.toString().trim()) {
    showStatus('⚠ Please provide the required key/parameter for this algorithm.', 'error');
    return false;
  }
  return true;
}

// ---------- Encrypt button ----------
encryptBtn.addEventListener('click', () => {
  if (!validateInputs(true)) return;

  const text = inputText.value;
  const algo = algorithm.value;
  let result = '';

  try {
    switch (algo) {
      case 'caesar':
        result = caesarEncrypt(text, parseInt(paramInput.value, 10) || 0);
        break;
      case 'base64':
        result = base64Encrypt(text);
        break;
      case 'aes':
        result = aesEncrypt(text, paramInput.value);
        break;
      case 'des':
        result = desEncrypt(text, paramInput.value);
        break;
      case 'sha256':
        result = sha256Hash(text);
        break;
      case 'rsa':
        result = rsaEncrypt(text);
        updateRSAKeyInfo();
        break;
      case 'vigenere':
        result = vigenereEncrypt(text, paramInput.value);
        break;
      case 'autokey':
        result = autokeyEncrypt(text, paramInput.value);
        break;
      case 'vernam':
        result = vernamEncrypt(text, paramInput.value);
        break;
      case 'otp': {
        let key = paramInput.value;
        if (!key) {
          if (/^[01\s]+$/.test(text)) {
            const tClean = text.replace(/\s+/g, '');
            key = Array.from({ length: tClean.length }, () => (Math.random() < 0.5 ? '0' : '1')).join('');
          } else {
            key = randomKeyOfLength(text.length);
          }
          paramInput.value = key;
          showStatus(`✔ Encrypted. Auto-generated key: "${key}" — save it, you need it to decrypt!`, 'success');
        }
        result = otpEncrypt(text, key);
        break;
      }
      case 'railfence':
        result = railFenceEncrypt(text, paramInput.value);
        break;
      case 'columnar':
        result = columnarEncrypt(text.toUpperCase().replace(/[^A-Z]/g, ''), paramInput.value);
        break;
      default:
        showStatus('⚠ Unknown algorithm.', 'error');
        return;
    }
    outputText.value = result;
    if (algo !== 'otp' || !statusMsg.textContent) {
      showStatus('✔ Encryption successful.', 'success');
    }
  } catch (err) {
    showStatus('⚠ ' + err.message, 'error');
  }
});

// ---------- Decrypt button ----------
decryptBtn.addEventListener('click', () => {
  if (!validateInputs(true)) return;

  const text = inputText.value;
  const algo = algorithm.value;

  if (algo === 'sha256') {
    showStatus('⚠ SHA-256 is a one-way hash and cannot be decrypted.', 'error');
    return;
  }

  let result = '';
  try {
    switch (algo) {
      case 'caesar':
        result = caesarDecrypt(text, parseInt(paramInput.value, 10) || 0);
        break;
      case 'base64':
        result = base64Decrypt(text);
        break;
      case 'aes':
        result = aesDecrypt(text, paramInput.value);
        break;
      case 'des':
        result = desDecrypt(text, paramInput.value);
        break;
      case 'rsa':
        result = rsaDecrypt(text);
        break;
      case 'vigenere':
        result = vigenereDecrypt(text, paramInput.value);
        break;
      case 'autokey':
        result = autokeyDecrypt(text, paramInput.value);
        break;
      case 'vernam':
        result = vernamDecrypt(text, paramInput.value);
        break;
      case 'otp':
        if (!paramInput.value) throw new Error('Enter the key that was used to encrypt this message.');
        result = otpDecrypt(text, paramInput.value);
        break;
      case 'railfence':
        result = railFenceDecrypt(text, paramInput.value);
        break;
      case 'columnar':
        result = columnarDecrypt(text.toUpperCase().replace(/[^A-Z]/g, ''), paramInput.value);
        break;
      default:
        showStatus('⚠ Unknown algorithm.', 'error');
        return;
    }
    outputText.value = result;
    showStatus('✔ Decryption successful.', 'success');
  } catch (err) {
    showStatus('⚠ ' + err.message, 'error');
  }
});

// ---------- Clear button ----------
clearBtn.addEventListener('click', () => {
  inputText.value = '';
  outputText.value = '';
  paramInput.value = '';
  algorithm.value = '';
  paramFieldWrap.style.display = 'none';
  rsaKeyInfo.style.display = 'none';
  clearStatus();
});

// ---------- Copy button ----------
copyBtn.addEventListener('click', async () => {
  if (!outputText.value) {
    showStatus('⚠ Nothing to copy yet.', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(outputText.value);
    showStatus('✔ Copied to clipboard!', 'success');
  } catch (e) {
    outputText.select();
    document.execCommand('copy');
    showStatus('✔ Copied to clipboard!', 'success');
  }
});