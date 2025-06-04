// public/sus.js

// ===== STORAGE-Adapter =====
const STORAGE_KEY = 'hausaufgaben_entries';
const fileMap = {};
let pollId = null;

// Einträge aus localStorage laden
async function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Eintrag speichern oder aktualisieren
async function saveEntryToStorage(fn, entry) {
  if (entry.attachments && entry.attachments.length) {
    entry.fileData = entry.fileData || {};
    entry.attachments.forEach(name => {
      if (fileMap[name]) {
        entry.fileData[name] = fileMap[name];
      }
    });
  }

  const list = await loadEntries();
  const i = list.findIndex(e => e.filename === fn);
  if (i >= 0) {
    list[i].entry = entry;
  } else {
    list.push({ filename: fn, entry });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ===== DOM-Referenzen =====
const form      = document.getElementById('task-form');
const subjI     = document.getElementById('task-subject');
const titleI    = document.getElementById('task-title');
const dateI     = document.getElementById('task-date');
const descI     = document.getElementById('task-desc');
const attachI   = document.getElementById('task-attachments');
const fileNames = document.getElementById('file-names');

const sectionHeute    = document.getElementById('heute');
const sectionAlle     = document.getElementById('alle');
const sectionErledigt = document.getElementById('erledigt');

const listToday = sectionHeute.querySelector('ul#task-list-today') || createInnerList(sectionHeute, 'task-list-today');
const listAll   = sectionAlle.querySelector('ul#task-list-all')   || createInnerList(sectionAlle, 'task-list-all');
const listDone  = sectionErledigt.querySelector('ul#task-list-done') || createInnerList(sectionErledigt, 'task-list-done');

// Helper: falls UL in Section fehlt, erstellen wir sie mit passender ID
function createInnerList(sectionEl, listId) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = listId;
  sectionEl.appendChild(ul);
  return ul;
}

// ===== FileReader: Data-URIs speichern =====
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
    reader.onload = e => { fileMap[f.name] = e.target.result; };
    reader.readAsDataURL(f);
  });
});

// ===== Neue Aufgabe hinzufügen =====
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
    origin: 'student'
  };

  const fn = `${date}_${subject}_${title.replace(/\s+/g, '_')}.json`;
  await saveEntryToStorage(fn, entry);

  form.reset();
  fileNames.textContent = 'Datei/Foto auswählen';

  loadTasks();
});

// ===== Aufgaben laden und korrekt verteilen =====
async function loadTasks() {
  // Alle drei Listen zuerst leeren
  listToday.innerHTML = '';
  listAll.innerHTML   = '';
  listDone.innerHTML  = '';

  const items = await loadEntries();
  // Nach Datum sortieren (früheste zuerst)
  items.sort((a, b) => new Date(a.entry.date) - new Date(b.entry.date));

  const heuteStr = new Date().toISOString().split('T')[0];

  items.forEach(item => {
    const filename = item.filename;
    const entry    = item.entry;

    // FileMap aus entry.fileData befüllen, falls vorhanden
    if (entry.fileData) {
      Object.entries(entry.fileData).forEach(([name, data]) => {
        fileMap[name] = data;
      });
    }

    renderEntry(filename, entry, heuteStr);
  });

  // ===== Dynamisches Ein-/Ausblenden der Sektionstitel =====
  const headingHeute    = document.getElementById('heute-title');
  const headingAlle     = document.getElementById('alle-title');
  const headingErledigt = document.getElementById('erledigt-title');

  if (listToday.children.length > 0) {
    headingHeute.classList.remove('visually-hidden');
  } else {
    headingHeute.classList.add('visually-hidden');
  }

  if (listAll.children.length > 0) {
    headingAlle.classList.remove('visually-hidden');
  } else {
    headingAlle.classList.add('visually-hidden');
  }

  if (listDone.children.length > 0) {
    headingErledigt.classList.remove('visually-hidden');
  } else {
    headingErledigt.classList.add('visually-hidden');
  }
}

// ===== Einzelne Aufgabe rendern und in entsprechende Liste einfügen =====
function renderEntry(filename, entry, heuteStr) {
  // Card-Element
  const li = document.createElement('li');
  li.className = 'task';

  // Header-Bereich (Datum, Fach, Inhalt, Controls)
  const header = document.createElement('div');
  header.className = 'task-header';

  // META: Datum + Fach
  const meta = document.createElement('div');
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

  // CONTENT: Titel + Beschreibung
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

  // ATTACHMENTS (falls vorhanden)
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
      iconEl.textContent = ['jpg','jpeg','png','gif'].includes(ext) ? '🖼️' : '📄';
      const txt = document.createElement('span');
      txt.textContent = name;
      txt.title = name;
      span.append(iconEl, txt);
      span.addEventListener('click', () => openPreview(name));
      attachmentsDiv.append(span);
    });
  }

  // CONTROLS: Checkbox + Trash-Button
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
    showCompletionToast();
    loadTasks();
  });
  controls.append(chk);

  // Trash-Button
  const trashBtn = document.createElement('button');
  trashBtn.className = 'trash-button';
  trashBtn.innerHTML = '🗑️';
  trashBtn.title = 'Aufgabe löschen';
  trashBtn.addEventListener('click', async () => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    const list = await loadEntries();
    const filtered = list.filter(e => e.filename !== filename);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    loadTasks();
  });
  controls.append(trashBtn);

  // Zusammensetzen
  header.append(meta, content, controls);
  li.append(header);
  if (attachmentsDiv) {
    li.append(attachmentsDiv);
  }

  if (entry.subject === 'Privat') {
    li.classList.add('privat-task');
  }

  // Status-Klassen setzen (fällig heute, überfällig, erledigt)
  if (entry.done) {
    listDone.appendChild(li);
  } else if (entry.date === heuteStr) {
    li.classList.add('due-today');
    listToday.appendChild(li);
  } else if (entry.date < heuteStr) {
    li.classList.add('overdue');
    listAll.appendChild(li);
  } else {
    listAll.appendChild(li);
  }
}

// ===== Vorschau-Overlay-Funktion =====
function openPreview(name) {
  if (!fileMap[name]) return;

  const prevO  = document.getElementById('preview-overlay');
  const prevC  = document.getElementById('preview-content');
  const prevDl = document.getElementById('preview-download');
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

document.getElementById('preview-close').addEventListener('click', () => {
  document.getElementById('preview-overlay').style.display = 'none';
});

// ===== Initialisierung beim Laden =====
window.addEventListener('DOMContentLoaded', () => {
  // Preview-Overlay initial verstecken
  const prevO = document.getElementById('preview-overlay');
  prevO.style.display = 'none';

  // TEACCH: Beim ersten Laden nur „Alle“ anzeigen
  // Setze aria-current="page" auf den korrekten Tab
  document.querySelector('.nav-tabs a[href="#alle"]').setAttribute('aria-current', 'page');

  loadTasks();
  startPolling();
});
