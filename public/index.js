// public/index.js

// ===== Gemeinsame Utilities aus shared.js importieren =====
const {
  loadEntries,
  saveEntryToStorage,
  deleteEntryFromStorage,
  openPreview,
  showMotivationBadge,
  fileMap
} = window.SHARED;

// ===== Variablen für DOM-Elemente (werden nach DOMContentLoaded gesetzt) =====
let form;
let subjI;
let titleI;
let dateI;
let descI;
let attachI;
let fileNames;

let sectionHeute;
let sectionAlle;
let sectionErledigt;

let listToday;
let listAll;
let listDone;

// Hilfsfunktion: Falls eine Liste in der Sektion noch nicht existiert, erstelle sie
function createInnerList(sectionEl, listId) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = listId;
  sectionEl.appendChild(ul);
  return ul;
}

// ===== Event-Handler: Neues Formular absenden =====
async function handleFormSubmit(e) {
  e.preventDefault();

  const subject     = subjI.value;
  const title       = titleI.value.trim();
  const date        = dateI.value;
  const description = descI.value.trim();
  const attachments = Array.from(attachI.files).map(f => f.name);

  if (!subject || !title || !date) {
    // Pflichtfelder prüfen
    return;
  }

  // Eintrag-Objekt anlegen
  const entry = {
    date,
    subject,
    title,
    description,
    done: false,
    attachments,
    origin: 'student'
  };

  // Dateinamen-Fingerprint erstellen: Datum_Fach_Titel.json
  const fn = `${date}_${subject}_${title.replace(/\s+/g, '_')}.json`;
  await saveEntryToStorage(fn, entry);

  // Formular zurücksetzen
  form.reset();
  fileNames.textContent = 'Datei/Foto auswählen';

  // Motivations-Badge anzeigen
  showMotivationBadge();

  // Alle Einträge neu laden und anzeigen
  loadTasks();
}

// ===== Alle gespeicherten Einträge aus LocalStorage holen und rendern =====
async function loadTasks() {
  // Zunächst alle drei Listen leeren
  listToday.innerHTML = '';
  listAll.innerHTML   = '';
  listDone.innerHTML  = '';

  const items = await loadEntries(); 
  // items ist ein Array von { filename, entry }
  // Sortiere nach Datum (älteste zuerst)
  items.sort((a, b) => new Date(a.entry.date) - new Date(b.entry.date));

  // Heutiges Datum als YYYY-MM-DD
  const heuteStr = new Date().toISOString().split('T')[0];

  for (const item of items) {
    const filename = item.filename;
    const entry    = item.entry;

    // Wenn entry.fileData existiert, lade es zurück ins fileMap
    if (entry.fileData) {
      Object.entries(entry.fileData).forEach(([name, data]) => {
        fileMap[name] = data;
      });
    }

    renderEntry(filename, entry, heuteStr);
  }

  // Zeige nur die Sektionen mit Inhalten an
  sectionHeute.style.display    = listToday.children.length ? 'block' : 'none';
  sectionAlle.style.display     = listAll.children.length ? 'block' : 'none';
  sectionErledigt.style.display = listDone.children.length ? 'block' : 'none';
}

// ===== Einzelne Aufgabe rendern und in die korrekte Liste einsortieren =====
function renderEntry(filename, entry, heuteStr) {
  // <li class="task"> ... </li>
  const li = document.createElement('li');
  li.className = 'task';

  // Header (Meta + Inhalt + Controls)
  const header = document.createElement('div');
  header.className = 'task-header';

  // Meta: Datum + Fach
  const meta   = document.createElement('div');
  meta.className = 'meta';
  const dateEl = document.createElement('span');
  dateEl.className = 'date';
  const [y, m, d] = entry.date.split('-');
  // Monatstexte
  const monate = [
    "Januar","Februar","März","April","Mai","Juni","Juli",
    "August","September","Oktober","November","Dezember"
  ];
  dateEl.textContent = parseInt(d,10) + '. ' + monate[parseInt(m,10)-1] + ' ' + y;
  const subjEl = document.createElement('span');
  subjEl.className = 'subject';
  subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  // Inhalt: Titel + optionale Beschreibung
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

  // Anhänge: Wenn vorhanden, iteriere über entry.attachments
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
      // Nur als Symbol, damit ersichtlich ist, ob Bild oder anderes
      iconEl.textContent = ['jpg','jpeg','png','gif'].includes(ext) ? '🖼️' : '📄';
      const txt = document.createElement('span');
      txt.textContent = name;
      txt.title = name;
      span.append(iconEl, txt);
      // Klick aufs Attachment öffnet Preview
      span.addEventListener('click', () => openPreview(name));
      attachmentsDiv.append(span);
    });
  }

  // Controls: Checkbox zum Erledigen und Trash-Button
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
    showMotivationBadge();
    loadTasks();
  });
  controls.append(chk);

  // Trash-Button (löschen immer möglich)
  const trashBtn = document.createElement('button');
  trashBtn.className = 'trash-button';
  trashBtn.innerHTML = '🗑️';
  trashBtn.title = 'Aufgabe löschen';
  trashBtn.addEventListener('click', async () => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    await deleteEntryFromStorage(filename);
    loadTasks();
  });
  controls.append(trashBtn);

  header.append(meta, content, controls);
  li.append(header);
  if (attachmentsDiv) li.append(attachmentsDiv);

  // Einordnung in eine der drei Listen
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

// ===== Initialisierung: DOM-Abfragen & Event-Listener binden =====
window.addEventListener('DOMContentLoaded', () => {
  // *** DOM-Elemente erst jetzt abholen ***
  form      = document.getElementById('task-form');
  subjI     = document.getElementById('task-subject');
  titleI    = document.getElementById('task-title');
  dateI     = document.getElementById('task-date');
  descI     = document.getElementById('task-desc');
  attachI   = document.getElementById('task-attachments');
  fileNames = document.getElementById('file-names');

  sectionHeute    = document.getElementById('heute');
  sectionAlle     = document.getElementById('alle');
  sectionErledigt = document.getElementById('erledigt');

  listToday = sectionHeute.querySelector('ul#task-list-t
