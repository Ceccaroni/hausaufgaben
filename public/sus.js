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

/* ===== Laden & Rendern ===== */
async function loadTasks() {
  clearLists();
  const todayISO = new Date().toISOString().split('T')[0];

  // Aktuellen User holen
  const { data: usr } = await supabase.auth.getUser();
  const uid = usr?.user?.id || null;

  // 1) Alle Admin-Aufgaben laden
  const { data: admins, error: e1 } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('due_date', { ascending: true });

  if (e1) {
    console.error(e1);
    alert('Fehler beim Laden (Admin-Aufgaben): ' + e1.message);
  }

  // 1b) Eigene Statuszeilen zu Admin-Aufgaben laden (done pro Schülerin)
  let statusMap = new Map();
  if (uid && admins?.length) {
    const ids = admins.map(a => a.id);
    const { data: statusRows, error: eStatus } = await supabase
      .from('admin_task_status')
      .select('task_id, done')
      .eq('user_id', uid)
      .in('task_id', ids);

    if (eStatus) {
      console.error(eStatus);
    } else {
      (statusRows || []).forEach(r => statusMap.set(r.task_id, !!r.done));
    }
  }

  // Admin-Aufgaben rendern (Checkbox aktiv für eigene Erledigt-Markierung)
  (admins || []).forEach(entry => {
    const doneForMe = statusMap.get(entry.id) || false;
    renderAdminEntry(entry, todayISO, doneForMe, uid);
  });

  // 2) Eigene SuS-Aufgaben (privat)
  if (uid) {
    const { data: mine, error: e2 } = await supabase
      .from('student_tasks')
      .select('*')
      .eq('user_id', uid)
      .order('due_date', { ascending: true });

    if (e2) {
      console.error(e2);
      alert('Fehler beim Laden (eigene Aufgaben): ' + e2.message);
    } else {
      (mine || []).forEach(entry => renderStudentEntry(entry, todayISO));
    }
  }

  toggleHeadings();
}

function clearLists(){ listToday.innerHTML=''; listAll.innerHTML=''; listDone.innerHTML=''; }

function toggleHeadings() {
  document.getElementById('heute-title').classList.toggle('visually-hidden', listToday.children.length===0);
  document.getElementById('alle-title').classList.toggle('visually-hidden',   listAll.children.length===0);
  document.getElementById('erledigt-title').classList.toggle('visually-hidden', listDone.children.length===0);
}

/* ===== Render: Admin-Task (pro Schülerin abhakbar) ===== */
function renderAdminEntry(entry, todayISO, doneForMe, uid) {
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

  // Done-Checkbox (aktiv: speichert in app.admin_task_status per upsert)
  const chk = document.createElement('input');
  chk.type='checkbox'; chk.className='checkbox'; chk.checked = !!doneForMe; chk.disabled = !uid;
  chk.addEventListener('change', async () => {
    if (!uid) return;

    const payload = { task_id: entry.id, user_id: uid, done: chk.checked };
    // Voraussetzung: UNIQUE (task_id, user_id) auf app.admin_task_status
    const { error } = await supabase
      .from('admin_task_status')
      .upsert(payload, { onConflict: 'task_id,user_id' });

    if (error) {
      alert('Konnte Status nicht speichern: ' + error.message);
      // UI zurücksetzen, wenn fehlgeschlagen
      chk.checked = !chk.checked;
      return;
    }

    // Nach erfolgreichem Speichern UI neu aufbauen (verschiebt Karte zwischen Listen)
    await loadTasks();
  });
  controls.append(chk);

  header.append(meta, content, controls);
  li.append(header);

  // Platzierung in Listen basierend auf doneForMe
  if (doneForMe) {
    listDone.appendChild(li);
  } else if (String(entry.due_date) === todayISO) {
    li.classList.add('due-today'); listToday.appendChild(li);
  } else if (String(entry.due_date) < todayISO) {
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
    if (error) { alert('Konnte Status nicht speichern: ' + error.message); chk.checked = !chk.checked; return; }
    await loadTasks();
  });
  controls.append(chk);

  // Trash (löschen erlaubt)
  const del = document.createElement('button');
  del.className='trash-button'; del.innerHTML='🗑️'; del.title='Aufgabe löschen';
  del.addEventListener('click', async () => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    const { error } = await supabase.from('student_tasks').delete().eq('id', entry.id);
    if (error) { alert('Löschen fehlgeschlagen: ' + error.message); return; }
    await loadTasks();
  });
  controls.append(del);

  header.append(meta, content, controls);
  li.append(header);

  if (entry.done) listDone.appendChild(li);
  else if (String(entry.due_date) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (String(entry.due_date) < todayISO)   { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                          { listAll.appendChild(li); }
}

/* ===== Neues SuS-Item (privat) ===== */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject=subjI.value, title=titleI.value.trim(), due_date=dateI.value, description=descI.value.trim();
  if (!subject || !title || !due_date) return;

  const { data: usr } = await supabase.auth.getUser();
  if (!usr?.user?.id) { alert('Nicht eingeloggt.'); return; }

  const { error } = await supabase
    .from('student_tasks')
    .insert([{ subject, title, description, due_date, done:false }]);

  if (error) { alert('Speichern fehlgeschlagen: ' + error.message); return; }

  form.reset();
  await loadTasks();
});

/* ===== Start ===== */
(async () => {
  try { await requireStudent(); await loadTasks(); }
  catch (e) { console.error(e); }
})();
