/* Datei: public/sus.js – als <script type="module" src="public/sus.js"> einbinden */

const SUPABASE_URL = 'https://dxzeleiiaitigzttbnaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4emVsZWlpYWl0aWd6dHRibmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDcxODQsImV4cCI6MjA3MjgyMzE4NH0.iXKtGyH0y8KUvAWLSJZKFIfz4VQ-y2PZBWucEg7ZHJ4';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: 'app' }
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

function mkList(sectionEl, id) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = id;
  sectionEl.appendChild(ul);
  return ul;
}

/* ===== Login (Schülerin) ===== */
async function requireStudent() {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;

  const email = prompt('E-Mail (Schülerin):');
  const password = prompt('Passwort:');
  if (!email || !password) throw new Error('Login abgebrochen');

  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Login fehlgeschlagen: ' + error.message); throw error; }
  return signIn.user;
}

/* ===== State für Edit (nur eigene SuS-Tasks) ===== */
let editId = null;

/* ===== Laden & Rendern ===== */
async function loadTasks() {
  clearLists();
  const todayISO = new Date().toISOString().split('T')[0];

  // Aktueller User
  const { data: usr } = await supabase.auth.getUser();
  const uid = usr?.user?.id;

  // 1) Admin-Aufgaben (alle sehen), plus MEIN Status (done) aus admin_task_status
  const [{ data: admins, error: e1 }, { data: myStatus, error: e2 }] = await Promise.all([
    supabase.from('admin_tasks').select('*').order('due_date', { ascending: true }),
    uid ? supabase.from('admin_task_status').select('task_id, done').eq('user_id', uid)
        : Promise.resolve({ data: [], error: null })
  ]);

  if (e1) { console.error(e1); alert('Fehler beim Laden (Admin-Aufgaben): ' + e1.message); }
  const statusMap = new Map((myStatus || []).map(r => [r.task_id, !!r.done]));
  (admins || []).forEach(entry => renderAdminEntry(entry, todayISO, statusMap));

  // 2) Eigene SuS-Aufgaben (privat)
  if (uid) {
    const { data: mine, error: e3 } = await supabase
      .from('student_tasks')
      .select('*')
      .eq('user_id', uid)
      .order('due_date', { ascending: true });

    if (e3) { console.error(e3); alert('Fehler beim Laden (eigene Aufgaben): ' + e3.message); }
    else { (mine || []).forEach(entry => renderStudentEntry(entry, todayISO)); }
  }

  toggleHeadings();
}

function clearLists(){ listToday.innerHTML=''; listAll.innerHTML=''; listDone.innerHTML=''; }

function toggleHeadings() {
  document.getElementById('heute-title').classList.toggle('visually-hidden', listToday.children.length===0);
  document.getElementById('alle-title').classList.toggle('visually-hidden',   listAll.children.length===0);
  document.getElementById('erledigt-title').classList.toggle('visually-hidden', listDone.children.length===0);
}

/* ===== Render: Admin-Task (SuS: eigener Done-Status) ===== */
function renderAdminEntry(entry, todayISO, statusMap) {
  const li = document.createElement('li'); li.className='task';
  const header = document.createElement('div'); header.className='task-header';

  const meta = document.createElement('div'); meta.className='meta';
  const dateEl = document.createElement('span'); dateEl.className='date';
  const [y,m,d] = String(entry.due_date).split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  dateEl.textContent = parseInt(d,10)+'. '+monate[parseInt(m,10)-1]+' '+y;
  const subjEl = document.createElement('span'); subjEl.className='subject'; subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  const content = document.createElement('div'); content.className='content';
  const titleEl = document.createElement('div'); titleEl.className='title'; titleEl.textContent = entry.title;
  content.append(titleEl);
  if (entry.description) {
    const descEl = document.createElement('div'); descEl.className='description'; descEl.textContent = entry.description;
    content.append(descEl);
  }

  const controls = document.createElement('div'); controls.className='controls';

  // Checkbox: eigener Status pro Admin-Aufgabe
  const chk = document.createElement('input');
  chk.type='checkbox'; chk.className='checkbox';
  chk.checked = !!statusMap.get(entry.id);    // MEIN Status
  chk.addEventListener('change', async () => {
    const { data: usr } = await supabase.auth.getUser();
    const uid = usr?.user?.id;
    if (!uid) return;

    // Upsert in admin_task_status (unique: task_id,user_id)
    const { error } = await supabase
      .from('admin_task_status')
      .upsert([{ task_id: entry.id, user_id: uid, done: chk.checked }], { onConflict: 'task_id,user_id' });

    if (error) alert('Konnte Status nicht speichern: ' + error.message);
    else statusMap.set(entry.id, chk.checked);

    // optional neu sortieren
    repositionItem(li, entry.due_date, chk.checked, todayISO);
  });
  controls.append(chk);

  header.append(meta, content, controls);
  li.append(header);

  // Platzieren (nach MEINEM Status)
  const userDone = !!statusMap.get(entry.id);
  if (userDone) listDone.appendChild(li);
  else if (String(entry.due_date) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (String(entry.due_date) < todayISO)   { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                          { listAll.appendChild(li); }
}

/* Hilfsfunktion: nach Statuswechsel neu platzieren */
function repositionItem(li, due_date, userDone, todayISO) {
  li.classList.remove('due-today', 'overdue');
  if (userDone) {
    listDone.appendChild(li);
  } else if (String(due_date) === todayISO) {
    li.classList.add('due-today'); listToday.appendChild(li);
  } else if (String(due_date) < todayISO) {
    li.classList.add('overdue');   listAll.appendChild(li);
  } else {
    listAll.appendChild(li);
  }
}

/* ===== Render: eigene SuS-Task (bearbeitbar/löschbar) ===== */
function renderStudentEntry(entry, todayISO) {
  const li = document.createElement('li'); li.className='task';
  const header = document.createElement('div'); header.className='task-header';

  const meta = document.createElement('div'); meta.className='meta';
  const dateEl = document.createElement('span'); dateEl.className='date';
  const [y,m,d] = String(entry.due_date).split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  dateEl.textContent = parseInt(d,10)+'. '+monate[parseInt(m,10)-1]+' '+y;
  const subjEl = document.createElement('span'); subjEl.className='subject'; subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  const content = document.createElement('div'); content.className='content';
  const titleEl = document.createElement('div'); titleEl.className='title'; titleEl.textContent = entry.title;
  content.append(titleEl);
  if (entry.description) {
    const descEl = document.createElement('div'); descEl.className='description'; descEl.textContent = entry.description;
    content.append(descEl);
  }

  const controls = document.createElement('div'); controls.className='controls';

  // Done-Checkbox (editierbar)
  const chk = document.createElement('input');
  chk.type='checkbox'; chk.className='checkbox'; chk.checked = !!entry.done;
  chk.addEventListener('change', async () => {
    const { error } = await supabase.from('student_tasks').update({ done: chk.checked }).eq('id', entry.id);
    if (error) alert('Konnte Status nicht speichern: ' + error.message);
    repositionItem(li, entry.due_date, chk.checked, todayISO);
  });
  controls.append(chk);

  // Edit-Button (nur eigene SuS-Tasks)
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-button';
  editBtn.textContent = '✏️';
  editBtn.title = 'Aufgabe bearbeiten';
  editBtn.addEventListener('click', () => {
    editId = entry.id;
    subjI.value  = entry.subject;
    titleI.value = entry.title;
    descI.value  = entry.description || '';
    dateI.value  = String(entry.due_date);
    form.scrollIntoView({ behavior: 'smooth' });
    titleI.focus();
  });
  controls.append(editBtn);

  // Trash (löschen erlaubt)
  const del = document.createElement('button');
  del.className='trash-button'; del.innerHTML='🗑️'; del.title='Aufgabe löschen';
  del.addEventListener('click', async () => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    const { error } = await supabase.from('student_tasks').delete().eq('id', entry.id);
    if (error) alert('Löschen fehlgeschlagen: ' + error.message);
    else li.remove();
    toggleHeadings();
  });
  controls.append(del);

  header.append(meta, content, controls);
  li.append(header);

  if (entry.done) listDone.appendChild(li);
  else if (String(entry.due_date) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (String(entry.due_date) < todayISO)   { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                          { listAll.appendChild(li); }
}

/* ===== Neues SuS-Item / Bearbeiten (privat) ===== */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject=subjI.value, title=titleI.value.trim(), due_date=dateI.value, description=descI.value.trim();
  if (!subject || !title || !due_date) return;

  if (editId) {
    const { error } = await supabase.from('student_tasks')
      .update({ subject, title, description, due_date })
      .eq('id', editId);
    if (error) { alert('Änderungen konnten nicht gespeichert werden: ' + error.message); return; }
    editId = null;
  } else {
    // user_id setzt deine DB per Trigger/Policy, sonst explizit übergeben
    const { error } = await supabase.from('student_tasks')
      .insert([{ subject, title, description, due_date, done:false }]);
    if (error) { alert('Speichern fehlgeschlagen: ' + error.message); return; }
  }

  form.reset();
  await loadTasks();
});

/* ===== Start ===== */
(async () => {
  try { await requireStudent(); await loadTasks(); }
  catch (e) { console.error(e); }
})();
