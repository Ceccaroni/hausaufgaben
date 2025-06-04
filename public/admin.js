// Datei: public/admin.js

// ===== Admin-Login / Authentifizierung =====
// sha256 hash of the admin password 'gmc666'
const ADMIN_HASH = '8ba27988dfaeb57cfe7f3887fb4f0f72ed15b35a8a9bdad7ae795a5c89ac7988';

async function digest(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const LOGIN_KEY = 'admin_login_valid_until';

const overlay   = document.getElementById('auth-overlay');
const pwdInput  = document.getElementById('admin-password');
const authBtn   = document.getElementById('auth-submit');
const errMsg    = document.getElementById('auth-error');

// Prüfen, ob Admin bereits eingeloggt ist (innerhalb der letzten 30 Tage)
function checkLogin() {
  const validUntil = parseInt(localStorage.getItem(LOGIN_KEY) || '0', 10);
  if (Date.now() < validUntil) {
    overlay.style.display = 'none';
    loadTasks();
    startPolling();
  } else {
    overlay.style.display = 'flex';
  }
}

// Login als gültig markieren (30 Tage im Voraus)
function setLoginValid() {
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  localStorage.setItem(LOGIN_KEY, (Date.now() + thirtyDays).toString());
}

// Event-Listener für Button und Enter-Taste im Passwortfeld
authBtn.addEventListener('click', auth);
pwdInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    auth();
  }
});

// Login-Funktion
async function auth() {
  const hash = await digest(pwdInput.value.trim());
  if (hash === ADMIN_HASH) {
    setLoginValid();
    overlay.style.display = 'none';
    loadTasks();
    startPolling();
  } else {
    errMsg.style.display = 'block';
  }
}

// ===== Storage-Adapter =====
const STORAGE_KEY = 'hausaufgaben_entries';

// Lädt alle Einträge (JSON-Array) aus localStorage
async function loadEntriesFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Fügt einen neuen Eintrag hinzu oder aktualisiert einen bestehenden
async function saveEntryToStorage(fn, entry) {
  // Wenn Attachments existieren, baue fileData-Objekt auf
  if (entry.attachments && entry.attachments.length) {
    entry.fileData = entry.fileData || {};
    entry.attachments.forEach(name => {
      if (fileMap[name]) {
        entry.fileData[name] = fileMap[name];
      }
    });
  }

  let list = await loadEntriesFromStorage();
  const idx = list.findIndex(x => x.filename === fn);
  if (idx >= 0) {
    list[idx].entry = entry;
  } else {
    list.push({ filename: fn, entry });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Löscht einen Eintrag aus dem localStorage
async function deleteEntryFromStorage(fn) {
  let list = await loadEntriesFromStorage();
  list = list.filter(x => x.filename !== fn);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ===== Datei-Handling (fileMap für Data-URIs) =====
const fileMap = {};
let pollId = null;

// ===== DOM-Referenzen =====
const listEl    = document.getElementById('task-list');
const form      = document.getElementById('task-form');
const subjI     = document.getElementById('task-subject');
const titleI    = document.getElementById('task-title');
const dateI     = document.getElementById('task-date');
const descI     = document.getElementById('task-desc');
const attachI   = document.getElementById('task-attachments');
const fileNames = document.getElementById('file-names');
let editKey     = null;

// Wenn eine Datei ausgewählt wird, wird sie als Data-URI ins fileMap gespeichert
attachI.addEventListener('change', () => {
  const MAX_SIZE = 500 * 1024; // 500 KB Limit
  const files = Array.from(attachI.files);
  const validFiles = [];

  files.forEach(f => {
    if (f.size > MAX_SIZE) {
      alert(`Datei "${f.name}" ist grösser als 500 KB und wird nicht gespeichert.`);
    } else {
      validFiles.push(f);
    }
  });

  fileNames.textContent = validFiles.map(f => f.name).join(', ');
  fileNames.title = validFiles.map(f => f.name).join('\n');

  validFiles.forEach(f => {
    const reader = new FileReader();
    reader.onload = e => {
      fileMap[f.name] = e.target.result;
    };
    reader.readAsDataURL(f);
  });
});

// ===== Formular-Submit: Neue Aufgabe hinzufügen oder bearbeiten =====
form.addEventListener('submit', async e => {
  e.preventDefault();

  const subject     = subjI.value;
  const title       = titleI.value.trim();
  const date        = dateI.value;
  const description = descI.value.trim();
  const attachments = Array.from(attachI.files).map(f => f.name);

  if (!subject || !title || !date) return;

  const entry = {
    date,
    subject,
    title,
    description,
    done: false,
    attachments,
    origin: 'teacher'
  };

  let fn;
  if (editKey) {
    // Bearbeiten eines bestehenden Eintrags
    fn = editKey;
    await saveEntryToStorage(fn, entry);
    editKey = null;
  } else {
    // Neuer Dateiname: datum_fach_titel.json
    fn = `${date}_${subject}_${title.replace(/\s+/g, '_')}.json`;
    await saveEntryToStorage(fn, entry);
  }

  form.reset();
  fileNames.textContent = 'Datei/Foto auswählen';
  loadTasks();
});

// ===== Aufgaben laden und rendern =====
async function loadTasks() {
  listEl.innerHTML = '';
  const items = await loadEntriesFromStorage();
  items.sort((a, b) => new Date(a.entry.date) - new Date(b.entry.date));

  items.forEach(item => {
    // Privat-Aufgaben nicht im Lehrer-Backend anzeigen:
    if (item.entry.subject === "Privat") {
      return; 
    }
    // Rest wie bisher:
    if (item.entry.fileData) {
      Object.entries(item.entry.fileData).forEach(([name, data]) => {
        fileMap[name] = data;
      });
    }
    renderEntry(item.filename, item.entry);
  });
}

// ===== Lösch-Funktion =====
async function deleteTask(fn) {
  if (!confirm('Eintrag wirklich löschen?')) return;
  await deleteEntryFromStorage(fn);
  loadTasks();
}

// ===== Vorschau-Overlay (öffnen und schließen) =====
const prevO  = document.getElementById('preview-overlay');
const prevC  = document.getElementById('preview-content');
const prevDl = document.getElementById('preview-download');

document.getElementById('preview-close').addEventListener('click', () => {
  prevO.style.display = 'none';
});

function openPreview(name) {
  if (!fileMap[name]) {
    console.warn('Vorschau: keine Daten in fileMap für', name);
    return;
  }
  prevC.innerHTML = '';
  prevDl.style.display = 'none';
  const data = fileMap[name];

  if (data.startsWith('data:image')) {
    const img = new Image();
    img.src = data;
    prevC.append(img);
    prevDl.href = data;
    prevDl.download = name;
    prevDl.style.display = 'block';
  } else {
    const byteString = atob(data.split(',')[1]);
    const mimeType = data.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ia], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const icon = document.createElement('div');
    icon.className = 'file-icon';
    icon.textContent = '📄';
    prevC.append(icon);
    prevDl.href = blobUrl;
    prevDl.download = name;
    prevDl.style.display = 'block';
  }
  prevO.style.display = 'flex';
}

function startPolling() {
  if (!pollId) {
    pollId = setInterval(loadTasks, 30000);
  }
}

// ===== Einzelne Aufgabe rendern =====
function renderEntry(filename, entry) {
  const li = document.createElement('li');
  li.className = 'task';

  const header = document.createElement('div');
  header.className = 'task-header';

  // Datum + Fach
  const meta   = document.createElement('div');
  meta.className = 'meta';
  const dateEl = document.createElement('span');
  dateEl.className = 'date';
  const [y, m, d] = entry.date.split('-');
  const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  dateEl.textContent = parseInt(d,10) + '. ' + monate[parseInt(m,10)-1] + ' ' + y;
  const subjEl = document.createElement('span');
  subjEl.className = 'subject';
  subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  // Titel + Beschreibung
  const content = document.createElement('div');
  content.className = 'content';
  const titleEl = document.createElement('div');
  titleEl.className = 'title';
  titleEl.textContent = entry.title;
  content.append(titleEl);
  if (entry.description) {
    const descEl = document.createElement('div');
    descEl.className = 'description';
    descEl.textContent = entry.description;
    content.append(descEl);
  }

  // Anhänge
  let attachmentsDiv = null;
  if (entry.attachments && entry.attachments.length) {
    attachmentsDiv = document.createElement('div');
    attachmentsDiv.className = 'attachments';
    entry.attachments.forEach(name => {
      const span = document.createElement('div');
      span.className = 'attachment';
      const iconEl = document.createElement('span');
      iconEl.className = 'icon';
      const ext = name.split('.').pop().toLowerCase();
      iconEl.textContent = (['jpg','jpeg','png','gif'].includes(ext) ? '🖼️' : '📄');
      const txt = document.createElement('span');
      txt.textContent = name;
      txt.title = name;
      span.append(iconEl, txt);
      span.addEventListener('click', () => openPreview(name));
      attachmentsDiv.append(span);
    });
  }

  // Controls: Checkbox + Edit + Löschen
  const controls = document.createElement('div');
  controls.className = 'controls';

  // Checkbox
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.className = 'checkbox';
  chk.checked = entry.done;
  chk.addEventListener('change', async () => {
    entry.done = chk.checked;
    await saveEntryToStorage(filename, entry);
    loadTasks();
  });
  controls.append(chk);

  // Edit-Button (nur, wenn origin == 'teacher')
  if (entry.origin === 'teacher') {
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-button';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => {
      editKey = filename;
      subjI.value = entry.subject;
      titleI.value = entry.title;
      descI.value = entry.description || '';
      dateI.value = entry.date;
      attachI.value = '';
    });
    controls.append(editBtn);

    // Delete-Button
    const delBtn = document.createElement('button');
    delBtn.className = 'trash-button';
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => deleteTask(filename));
    controls.append(delBtn);
  }

  header.append(meta, content, controls);
  li.append(header);
  if (attachmentsDiv) li.append(attachmentsDiv);

  listEl.appendChild(li);
}

// ===== Initialisierung =====
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('preview-overlay').style.display = 'none';
  checkLogin();
});
