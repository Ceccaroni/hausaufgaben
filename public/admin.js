/* Datei: public/admin.js  – als <script type="module" src="public/admin.js?v=teachers-any-1"> einbinden */

const SUPABASE_URL = 'https://dxzeleiiaitigzttbnaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4emVsZWlpYWl0aWd6dHRibmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDcxODQsImV4cCI6MjA3MjgyMzE4NH0.iXKtGyH0y8KUvAWLSJZKFIfz4VQ-y2PZBWucEg7ZHJ4';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: 'app' } // Schema vereinheitlicht
});

/* ===== DOM ===== */
const form      = document.getElementById('task-form');
const subjI     = document.getElementById('task-subject');
const titleI    = document.getElementById('task-title');
const dateI     = document.getElementById('task-date');
const descI     = document.getElementById('task-desc');

const sectionHeute    = document.getElementById('heute');
const sectionAlle     = document.getElementById('alle');
const sectionErledigt = document.getElementById('erledigt');

const listToday = sectionHeute.querySelector('#task-list-today')    || mkList(sectionHeute, 'task-list-today');
const listAll   = sectionAlle.querySelector('#task-list-all')       || mkList(sectionAlle,  'task-list-all');
const listDone  = sectionErledigt.querySelector('#task-list-done')  || mkList(sectionErledigt, 'task-list-done');

/* Submit-Button (für Edit-Modus) */
const submitBtn = form?.querySelector('button[type="submit"]');
let editId = null;

function mkList(sectionEl, id) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = id;
  sectionEl.appendChild(ul);
  return ul;
}

/* ===== Login (Admin/Teacher) ===== */
async function requireAdmin() {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;

  const email = prompt('Admin E-Mail:');
  const password = prompt('Admin Passwort:');
  if (!email || !password) throw new Error('Login abgebrochen');

  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Login fehlgeschlagen: ' + error.message); throw error; }
  return signIn.user;
}

/* ===== Laden & Rendern (Admin-Tasks) ===== */
async function loadTasks() {
  clearLists();
  const todayISO = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('due_date', { ascending: true })
    .limit(1000);

  if (error) {
    console.error(error);
    alert('Fehler beim Laden: ' + error.message);
    return;
  }

  (data || []).forEach(entry => renderEntry(entry, todayISO));
  toggleHeadings();
}

function clearLists(){ listToday.innerHTML=''; listAll.innerHTML=''; listDone.innerHTML=''; }

function toggleHeadings() {
  document.getElementById('heute-title').classList.toggle('visually-hidden', listToday.children.length===0);
  document.getElementById('alle-title').classList.toggle('visually-hidden',   listAll.children.length===0);
  document.getElementById('erledigt-title').classList.toggle('visually-hidden', listDone.children.length===0);
}

function renderEntry(entry, todayISO) {
  const li = document.createElement('li'); li.className='task';
  const header = document.createElement('div'); header.className='task-header';

  const meta = document.createElement('div'); meta.className='meta';
  const dateEl = document.createElement('span'); dateEl.className='date';
  const [y,m,d] = String(entry.due_date).split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  dateEl.textContent = parseInt(d,10)+'. '+monate[parseInt(m,10)-1]+' '+y;

  const subjEl = document.createElement('span'); subjEl.className='subject';
  subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  const content = document.createElement('div'); content.className='content';
  const titleEl = document.createElement('div'); titleEl.className='title'; titleEl.textContent = entry.title;
  content.append(titleEl);
  if (entry.description) {
    const descEl = document.createElement('div'); descEl.className='description'; descEl.textContent = entry.description;
    content.append(descEl);
  }

  const controls = document.createElement('div'); controls.className='controls';

  // ✏️ Bearbeiten
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-button';
  editBtn.textContent = '✏️';
  editBtn.title = 'Aufgabe bearbeiten';
  editBtn.style.setProperty('display', 'inline-flex', 'important'); // falls CSS versteckt
  editBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    editId = entry.id;
    subjI.value  = entry.subject || '';
    titleI.value = entry.title   || '';
    dateI.value  = entry.due_date || '';
    descI.value  = entry.description || '';
    if (submitBtn) submitBtn.textContent = 'Speichern';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    titleI.focus();
  });
  controls.append(editBtn);

  // 🗑️ Löschen (gehärtet: genau 1 Zeile)
  const del = document.createElement('button');
  del.className='trash-button';
  del.innerHTML='🗑️';
  del.title='Aufgabe löschen';
  del.addEventListener('click', async () => {
    if (!confirm(`Eintrag „${entry.title}” wirklich löschen?`)) return;

    // 1) Prüfen: existiert genau diese ID?
    const { data: checkRows, error: checkErr } = await supabase
      .from('admin_tasks')
      .select('id')
      .eq('id', entry.id)
      .limit(2);

    if (checkErr) { alert('Prüfen fehlgeschlagen: ' + checkErr.message); return; }
    if (!checkRows || checkRows.length !== 1) {
      alert(`Unerwartete Trefferzahl beim Prüfen (=${checkRows?.length ?? 0}). Abbruch.`);
      return;
    }

    // 2) Löschen nur dieser ID und Rückgabe prüfen
    const { data: delRows, error: delErr } = await supabase
      .from('admin_tasks')
      .delete()
      .eq('id', entry.id)
      .select('id'); // Rückgabe der gelöschten Zeilen

    if (delErr) { alert('Löschen fehlgeschlagen: ' + delErr.message); return; }
    if (!delRows || delRows.length !== 1) {
      alert(`Unerwartete Löschmenge (=${delRows?.length ?? 0}). Abbruch.`);
      return;
    }

    loadTasks();
  });
  controls.append(del);

  header.append(meta, content, controls);
  li.append(header);

  if (entry.done) listDone.appendChild(li);
  else if (String(entry.due_date) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (String(entry.due_date) < todayISO)   { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                          { listAll.appendChild(li); }
}

/* ===== Neues Admin-Item ODER Update ===== */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject = subjI.value;
  const title   = titleI.value.trim();
  const due_date = dateI.value;
  const description = descI.value.trim();
  if (!subject || !title || !due_date) return;

  if (editId) {
    // UPDATE (alle Teacher dürfen – Policy geregelt)
    const { error } = await supabase
      .from('admin_tasks')
      .update({ subject, title, description, due_date })
      .eq('id', editId);

    if (error) { alert('Speichern (Update) fehlgeschlagen: ' + error.message); return; }

    editId = null;
    if (submitBtn) submitBtn.textContent = 'Hinzufügen';
  } else {
    // INSERT
    const { error } = await supabase
      .from('admin_tasks')
      .insert([{ subject, title, description, due_date, done: false }]);

    if (error) { alert('Speichern fehlgeschlagen: ' + error.message); return; }
  }

  form.reset();
  await loadTasks();
});

/* ===== Start ===== */
(async () => {
  try { await requireAdmin(); await loadTasks(); }
  catch (e) { console.error(e); }
})();
