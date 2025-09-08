/* Datei: public/sus.js – als <script type="module" src="public/sus.js"> einbinden */

const SUPABASE_URL = 'https://dxzeleiiaitigzttbnaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4emVsZWlpYWl0aWd6dHRibmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDcxODQsImV4cCI6MjA3MjgyMzE4NH0.iXKtGyH0y8KUvAWLSJZKFIfz4VQ-y2PZBWucEg7ZHJ4';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db:   { schema: 'app' }
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

/* Submit-Button (für „Hinzufügen“ ⇄ „Speichern“) */
const submitBtn = form?.querySelector('button[type="submit"]');

/* Edit-Status: wenn gesetzt → UPDATE statt INSERT */
let editId = null;

/* ===== Helpers ===== */
function mkList(sectionEl, id) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = id;
  sectionEl.appendChild(ul);
  return ul;
}

function clearLists() {
  listToday.innerHTML = '';
  listAll.innerHTML   = '';
  listDone.innerHTML  = '';
}

function toggleHeadings() {
  document.getElementById('heute-title')   ?.classList.toggle('visually-hidden', listToday.children.length === 0);
  document.getElementById('alle-title')    ?.classList.toggle('visually-hidden',  listAll.children.length   === 0);
  document.getElementById('erledigt-title')?.classList.toggle('visually-hidden',  listDone.children.length  === 0);
}

/** Login nur bei Bedarf (kein Pop-up beim Seitenstart) */
async function ensureLogin() {
  const { data: sess } = await supabase.auth.getSession();
  if (sess?.session?.user) return sess.session.user;

  const email = prompt('E-Mail (Schülerin):');
  const password = prompt('Passwort:');
  if (!email || !password) throw new Error('Login abgebrochen');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Login fehlgeschlagen: ' + error.message); throw error; }
  return data.user;
}

/* ===== Laden & Rendern ===== */
async function loadTasks() {
  clearLists();
  const todayISO = new Date().toISOString().split('T')[0];

  // aktueller User
  const { data: usr } = await supabase.auth.getUser();
  const uid = usr?.user?.id || null;

  // 1) Admin-Aufgaben (read-only sichtbar; per User abhakbar über Status-Tabelle)
  const { data: admins, error: e1 } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('due_date', { ascending: true });

  if (e1) {
    console.error(e1);
    alert('Fehler beim Laden (Admin-Aufgaben): ' + e1.message);
  }

  // individuellen Status zu Admin-Aufgaben laden
  let statusMap = new Map();
  if (uid && admins?.length) {
    const ids = admins.map(a => a.id);
    const { data: statusRows, error: eStatus } = await supabase
      .from('admin_task_status')
      .select('task_id, done')
      .eq('user_id', uid)
      .in('task_id', ids);

    if (!eStatus && statusRows) {
      statusRows.forEach(r => statusMap.set(r.task_id, !!r.done));
    }
  }

  (admins || []).forEach(entry => {
    const doneForMe = statusMap.get(entry.id) || false;
    renderAdminEntry(entry, todayISO, doneForMe);
  });

  // 2) Eigene SuS-Aufgaben (nur wenn eingeloggt)
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

/* ===== Render: Admin-Task (pro Schülerin abhakbar, sonst read-only) ===== */
function renderAdminEntry(entry, todayISO, doneForMe) {
  const li = document.createElement('li'); li.className = 'task';
  const header = document.createElement('div'); header.className = 'task-header';

  const meta = document.createElement('div'); meta.className = 'meta';
  const dateEl = document.createElement('span'); dateEl.className = 'date';
  const [y,m,d] = String(entry.due_date).split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  dateEl.textContent = parseInt(d,10)+'. '+monate[parseInt(m,10)-1]+' '+y;
  const subjEl = document.createElement('span'); subjEl.className = 'subject'; subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  const content = document.createElement('div'); content.className = 'content';
  const titleEl = document.createElement('div'); titleEl.className = 'title'; titleEl.textContent = entry.title;
  content.append(titleEl);
  if (entry.description) {
    const descEl = document.createElement('div'); descEl.className = 'description'; descEl.textContent = entry.description;
    content.append(descEl);
  }

  const controls = document.createElement('div'); controls.className = 'controls';

  // Done-Checkbox → admin_task_status upsert (task_id + user_id)
  const chk = document.createElement('input');
  chk.type = 'checkbox'; chk.className = 'checkbox'; chk.checked = !!doneForMe;
  chk.addEventListener('change', async () => {
    try {
      const user = await ensureLogin(); // Login bei Bedarf
      const payload = { task_id: entry.id, user_id: user.id, done: chk.checked };
      const { error } = await supabase.from('admin_task_status').upsert(payload, { onConflict: 'task_id,user_id' });
      if (error) throw error;
      await loadTasks();
    } catch (err) {
      chk.checked = !chk.checked;
      if (err?.message && err.message !== 'Login abgebrochen') alert('Konnte Status nicht speichern: ' + err.message);
    }
  });
  controls.append(chk);

  header.append(meta, content, controls);
  li.append(header);

  if (doneForMe) listDone.appendChild(li);
  else if (String(entry.due_date) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (String(entry.due_date) <  todayISO)  { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                          { listAll.appendChild(li); }
}

/* ===== Render: eigene SuS-Task (editierbar & löschbar) ===== */
function renderStudentEntry(entry, todayISO) {
  const li = document.createElement('li'); li.className = 'task';
  const header = document.createElement('div'); header.className = 'task-header';

  const meta = document.createElement('div'); meta.className = 'meta';
  const dateEl = document.createElement('span'); dateEl.className = 'date';
  const [y,m,d] = String(entry.due_date).split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  dateEl.textContent = parseInt(d,10)+'. '+monate[parseInt(m,10)-1]+' '+y;
  const subjEl = document.createElement('span'); subjEl.className = 'subject'; subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

  const content = document.createElement('div'); content.className = 'content';
  const titleEl = document.createElement('div'); titleEl.className = 'title'; titleEl.textContent = entry.title;
  content.append(titleEl);
  if (entry.description) {
    const descEl = document.createElement('div'); descEl.className = 'description'; descEl.textContent = entry.description;
    content.append(descEl);
  }

  const controls = document.createElement('div'); controls.className = 'controls';

  // Done-Checkbox (editierbar)
  const chk = document.createElement('input');
  chk.type = 'checkbox'; chk.className = 'checkbox'; chk.checked = !!entry.done;
  chk.addEventListener('change', async () => {
    try {
      await ensureLogin();
      const { error } = await supabase.from('student_tasks').update({ done: chk.checked }).eq('id', entry.id);
      if (error) throw error;
      await loadTasks();
    } catch (err) {
      chk.checked = !chk.checked;
      if (err?.message && err.message !== 'Login abgebrochen') alert('Konnte Status nicht speichern: ' + err.message);
    }
  });
  controls.append(chk);

  // ✏️ Edit
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-button';
  editBtn.textContent = '✏️';
  editBtn.title = 'Aufgabe bearbeiten';
  editBtn.style.setProperty('display', 'inline-flex', 'important');   // Icon sicher sichtbar
  editBtn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    try {
      await ensureLogin();
      editId = entry.id;
      subjI.value  = entry.subject || '';
      titleI.value = entry.title   || '';
      dateI.value  = entry.due_date || '';
      descI.value  = entry.description || '';
      if (submitBtn) submitBtn.textContent = 'Speichern';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleI.focus();
    } catch {}
  });
  controls.append(editBtn);

  // 🗑️ Delete
  const del = document.createElement('button');
  del.className = 'trash-button';
  del.innerHTML = '🗑️';
  del.title = 'Aufgabe löschen';
  del.style.setProperty('display', 'inline-flex', 'important');       // Icon sicher sichtbar
  del.addEventListener('click', async () => {
    try {
      await ensureLogin();
      if (!confirm('Eintrag wirklich löschen?')) return;
      const { error } = await supabase.from('student_tasks').delete().eq('id', entry.id);
      if (error) throw error;
      await loadTasks();
    } catch (err) {
      if (err?.message && err.message !== 'Login abgebrochen') alert('Löschen fehlgeschlagen: ' + err.message);
    }
  });
  controls.append(del);

  header.append(meta, content, controls);
  li.append(header);

  if (entry.done) listDone.appendChild(li);
  else if (String(entry.due_date) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (String(entry.due_date) <  todayISO)  { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                          { listAll.appendChild(li); }
}

/* ===== Neues SuS-Item ODER Update (Login nur bei Bedarf) ===== */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const subject     = subjI.value;
  const title       = titleI.value.trim();
  const due_date    = dateI.value;
  const description = descI.value.trim();
  if (!subject || !title || !due_date) return;

  try {
    const user = await ensureLogin(); // nur hier ggf. Pop-up

    if (editId) {
      // UPDATE
      const { error } = await supabase
        .from('student_tasks')
        .update({ subject, title, description, due_date })
        .match({ id: editId, user_id: user.id });

      if (error) throw error;

      editId = null;
      if (submitBtn) submitBtn.textContent = 'Hinzufügen';
    } else {
      // INSERT
      const { error } = await supabase
        .from('student_tasks')
        .insert([{ user_id: user.id, subject, title, description, due_date, done: false }]);

      if (error) throw error;
    }

    form.reset();
    await loadTasks();
  } catch (err) {
    if (err?.message && err.message !== 'Login abgebrochen') alert('Speichern fehlgeschlagen: ' + err.message);
  }
});

/* ===== Start: KEIN automatisches Login-Prompt ===== */
(async () => {
  try {
    await loadTasks();
  } catch (e) {
    console.error(e);
  }
})();
