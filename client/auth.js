/* ======================================================
   auth.js
   -------
   Handles the bonus "user authentication + saved messages"
   feature. Talks to the Express backend in /server.

   If the backend isn't running, the rest of the app (encrypt/
   decrypt/hash) still works fine — only these auth features
   will show a connection error.
   ====================================================== */

// Change this if you deploy the backend somewhere else.
const API_BASE = window.location.origin.includes('http')
  ? '' // same origin as the page when served by the Express server
  : 'http://localhost:3001';

// ---------- DOM references ----------
const authLoggedOut   = document.getElementById('authLoggedOut');
const authLoggedIn    = document.getElementById('authLoggedIn');
const loggedInUsername = document.getElementById('loggedInUsername');
const authStatus      = document.getElementById('authStatus');

const tabLogin    = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm   = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn       = document.getElementById('loginBtn');

const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const registerBtn      = document.getElementById('registerBtn');

const logoutBtn = document.getElementById('logoutBtn');

const saveRow = document.getElementById('saveRow');
const saveBtn = document.getElementById('saveBtn');
const savedMessagesCard = document.getElementById('savedMessagesCard');
const savedMessagesList = document.getElementById('savedMessagesList');

// ---------- Local auth state ----------
function getToken() {
  return localStorage.getItem('encryptionToolToken');
}
function getUsername() {
  return localStorage.getItem('encryptionToolUsername');
}
function setSession(token, username) {
  localStorage.setItem('encryptionToolToken', token);
  localStorage.setItem('encryptionToolUsername', username);
}
function clearSession() {
  localStorage.removeItem('encryptionToolToken');
  localStorage.removeItem('encryptionToolUsername');
}

function showAuthStatus(message, type) {
  authStatus.textContent = message;
  authStatus.className = 'status ' + (type || '');
}

// ---------- Tab switching ----------
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  showAuthStatus('', '');
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.style.display = 'block';
  loginForm.style.display = 'none';
  showAuthStatus('', '');
});

// ---------- UI state: logged in vs out ----------
function refreshAuthUI() {
  const token = getToken();
  const username = getUsername();

  if (token && username) {
    authLoggedOut.style.display = 'none';
    authLoggedIn.style.display = 'block';
    loggedInUsername.textContent = username;
    saveRow.style.display = 'flex';
    savedMessagesCard.style.display = 'block';
    loadSavedMessages();
  } else {
    authLoggedOut.style.display = 'block';
    authLoggedIn.style.display = 'none';
    saveRow.style.display = 'none';
    savedMessagesCard.style.display = 'none';
  }
}

// ---------- API helpers ----------
async function apiRequest(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---------- Register ----------
registerBtn.addEventListener('click', async () => {
  const username = registerUsername.value.trim();
  const password = registerPassword.value;

  if (!username || !password) {
    showAuthStatus('⚠ Please fill in both fields.', 'error');
    return;
  }

  try {
    const data = await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setSession(data.token, data.username);
    showAuthStatus('✔ Account created! You are now logged in.', 'success');
    registerUsername.value = '';
    registerPassword.value = '';
    refreshAuthUI();
  } catch (err) {
    showAuthStatus('⚠ ' + err.message + ' (Is the backend server running? See README.)', 'error');
  }
});

// ---------- Login ----------
loginBtn.addEventListener('click', async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!username || !password) {
    showAuthStatus('⚠ Please fill in both fields.', 'error');
    return;
  }

  try {
    const data = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setSession(data.token, data.username);
    showAuthStatus('✔ Logged in successfully.', 'success');
    loginUsername.value = '';
    loginPassword.value = '';
    refreshAuthUI();
  } catch (err) {
    showAuthStatus('⚠ ' + err.message + ' (Is the backend server running? See README.)', 'error');
  }
});

// ---------- Logout ----------
logoutBtn.addEventListener('click', () => {
  clearSession();
  refreshAuthUI();
  showAuthStatus('You have been logged out.', 'success');
});

// ---------- Save current result to account ----------
saveBtn.addEventListener('click', async () => {
  const algo = document.getElementById('algorithm').value;
  const result = document.getElementById('outputText').value;

  if (!result) {
    showStatus('⚠ Nothing to save yet — encrypt something first.', 'error');
    return;
  }

  try {
    await apiRequest('/api/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({ algorithm: algo, ciphertext: result }),
    });
    showStatus('✔ Saved to your account.', 'success');
    loadSavedMessages();
  } catch (err) {
    showStatus('⚠ ' + err.message, 'error');
  }
});

// ---------- Load & render saved messages ----------
async function loadSavedMessages() {
  try {
    const data = await apiRequest('/api/messages', {
      headers: { Authorization: 'Bearer ' + getToken() },
    });
    renderSavedMessages(data.messages || []);
  } catch (err) {
    savedMessagesList.innerHTML = `<p class="hint">Could not load saved messages: ${err.message}</p>`;
  }
}

function renderSavedMessages(messages) {
  if (!messages.length) {
    savedMessagesList.innerHTML = '<p class="hint">No saved messages yet.</p>';
    return;
  }

  savedMessagesList.innerHTML = messages
    .map((m) => `
      <div class="saved-item" data-id="${m.id}">
        <div class="meta">
          <span class="algo-tag">${m.algorithm}</span>
          <span>${new Date(m.createdAt).toLocaleString()}</span>
          <button class="delete-link" data-id="${m.id}">Delete</button>
        </div>
        <div class="ciphertext">${escapeHtml(m.ciphertext)}</div>
      </div>
    `)
    .join('');

  savedMessagesList.querySelectorAll('.delete-link').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        await apiRequest('/api/messages/' + id, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + getToken() },
        });
        loadSavedMessages();
      } catch (err) {
        showAuthStatus('⚠ ' + err.message, 'error');
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Init ----------
refreshAuthUI();
