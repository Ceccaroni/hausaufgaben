/* Datei: public/sus.js – READ-ONLY für Schüler:innen */

const SUPABASE_URL = 'https://dxzeleiiaitigzttbnaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4emVsZWlpYWl0aWd6dHRibmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDcxODQsImV4cCI6MjA3MjgyMzE4NH0.iXKtGyH0y8KUvAWLSJZKFIfz4VQ-y2PZBWucEg7ZHJ4';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: 'app' }
});

/* ===== DOM ===== */
const formContainer = document.querySelector('.form-container'); // wird versteckt
const sectionHeute    = document.getElementById('heute');
const sectionAlle     = document.getElementById('alle');
const sectionErledigt = document.getElementById('erledigt');

const listToday = sectionHeute.querySelector('#task-list-today')    || mkList(sectionHeute, 'task-list-today');
const listAll   = sectionAlle.querySelector('#task-list-all')       || mkList(sectionAlle,  'task-list-all');
const listDone  = sectionErledigt.querySelector('#task-list-done')  || mkList(sectionErledigt, 'task-list-done');

function mkList(sectionEl, id) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = id;
  sectionEl.appendChild(ul);
  return ul;
}

/* ===== Auth (einfach): wenn keine Session -> zurück zur Startseite ===== */
async function requireStudent() {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;
  // Keine Eingabe/Prompts mehr – SuS loggen sich über index.html ein
  location.href = 'index.html';
  throw new Error('Nicht eingeloggt');
}

/* ===== Read-only: nur Admin-Aufgaben laden/anzeigen ===== */
async function loadTasks() {
  clearLists();

  const todayISO = new Date().toISOString().split('T')[0];

  const { data: admins, error } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) {
    console.error(error);
    alert('Fehler beim Laden (Admin-Aufgaben): ' + error.message);
    return;
  }

  (admins || []).forEach(entry => renderAdminEntry(entry, todayISO));
  toggleHeadings();
}

function clearLists() {
  listToday.innerHTML = '';
  listAll.innerHTML   = '';
  listDone.innerHTML  = '';
}

function toggleHeadings() {
  document.getElementById('heute-title')
    .classList.toggle('visually-hidden', listToday.children.length === 0);
  document.getElementById('alle-title')
    .classList.toggle('visually-hidden', listAll.children.length === 0);
  document.getElementById('erledigt-title')
    .classList.toggle('visually-hidden', listDone.children.length === 0);
}

/* ===== Render: Admin-Task (ohne Controls) ===== */
function renderAdminEntry(entry, todayISO) {
  const li = document.createElement('li'); li.className = 'task';
  const header = document.createElement('div'); header.className = 'task-header';

  const meta = document.createElement('div'); meta.className = 'meta';
  const dateEl = document.createElement('span'); dateEl.className = 'date';

  const [y, m, d] = String(entry.due_date).split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  dateEl.textContent = parseInt(d, 10) + '. ' + monate[parseInt(m, 10) - 1] + ' ' + y;

  const subjEl = document.createElement('span'); subjEl.className = 'subject';
  subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  const content = document.createElement('div'); content.className = 'content';
  const titleEl = document.createElement('div'); titleEl.className = 'title';
  titleEl.textContent = entry.title;
  content.append(titleEl);

  if (entry.description) {
    const descEl = document.createElement('div'); descEl.className = 'description';
    descEl.textContent = entry.description;
    content.append(descEl);
  }

  // KEINE Controls (kein Haken, kein Edit, kein Löschen)
  header.append(meta, content);
  li.append(header);

  if (entry.done) listDone.appendChild(li);
  else if (String(entry.due_date) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (String(entry.due_date) <  todayISO)  { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                          { listAll.appendChild(li); }
}

/* ===== Start ===== */
(async () => {
  try {
    if (formContainer) formContainer.style.display = 'none'; // Erfassungsformular ausblenden
    await requireStudent();
    await loadTasks();
  } catch (e) {
    console.error(e);
  }
})();
