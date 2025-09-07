/* Datei: public/sus.js – als <script type="module" src="public/sus.js?v=edit-2"> einbinden */
console.log('[sus.js] build edit-2 geladen');

const SUPABASE_URL = 'https://dxzeleiiaitigzttbnaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4emVsZWlpYWl0aWd6dHRibmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDcxODQsImV4cCI6MjA3MjgyMzE4NH0.iXKtGyH0y8KUvAWLSJZKFIfz4VQ-y2PZBWucEg7ZHJ4';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: 'app' } // wir arbeiten im Schema "app"
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

const listToday = sectionHeute.querySelector('#task-list-today')   || mkList(sectionHeute,    'task-list-today');
const listAll   = sectionAlle.querySelector('#task-list-all')      || mkList(sectionAlle,     'task-list-all');
const listDone  = sectionErledigt.querySelector('#task-list-done') || mkList(sectionErledigt, 'task-list-done');

function mkList(sectionEl, id) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = id;
  sectionEl.appendChild(ul);
  return ul;
}

/* Für Edit-Auswahl */
const SUBJECTS = [
  'BG','Deutsch','Englisch','ERG','Französisch','HW','Italienisch','IVE',
  'Mathematik','MI','NT','RZG','TG/XG','WAH'
];

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
  const todayISO = isoDate(new Date());

  // 1) Lehrer-Aufgaben (read-only)
  const { data: admins, error: e1 } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('due_date', { ascending: true });

  if (e1) {
    console.error(e1);
    alert('Fehler beim Laden (Admin-Aufgaben): ' + e1.message);
  } else {
    (admins || []).forEach(entry => renderAdminEntry(entry, todayISO));
  }

  // 2) Eigene SuS-Aufgaben
  const { data: usr } = await supabase.auth.getUser();
  const uid = usr?.user?.id;
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

/* ===== Render: Admin-Task (read-only) ===== */
function renderAdminEntry(entry, todayISO) {
  const li = document.createElement('li'); li.className='task';
  const header = document.createElement('div'); header.className='task-header';

  const meta = document.createElement('div'); meta.className='meta';
  const dateEl = document.createElement('span'); dateEl.className='date';
  dateEl.textContent = humanDate(entry.due_date);
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
  const chk = document.createElement('input'); // nur Anzeige
  chk.type='checkbox'; chk.className='checkbox'; chk.checked = !!entry.done; chk.disabled = true;
  controls.append(chk);

  header.append(meta, content, controls);
  li.append(header);

  placeByDate(li, entry.due_date, entry.done, todayISO);
}

/* ===== Render: eigene SuS-Task (editierbar + löschbar) ===== */
function renderStudentEntry(entry, todayISO) {
  const li = document.createElement('li'); li.className='task';
  const header = document.createElement('div'); header.className='task-header';

  const meta = document.createElement('div'); meta.className='meta';
  const dateEl = document.createElement('span'); dateEl.className='date';
  dateEl.textContent = humanDate(entry.due_date);
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
    const { error } = await supabase
      .from('student_tasks')
      .update({ done: chk.checked })
      .eq('id', entry.id);
    if (error) alert('Konnte Status nicht speichern: ' + error.message);
    else loadTasks();
  });
  controls.append(chk);

  // Edit-Button (✏️) – per Inline-Style sichtbar erzwingen
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-button';
  editBtn.title = 'Aufgabe bearbeiten';
  editBtn.textContent = '✏️';
  editBtn.style.display = 'inline-flex'; // CSS-Override
  editBtn.addEventListener('click', () => startEdit(entry, li));
  controls.append(editBtn);

  // Trash (löschen erlaubt) – per Inline-Style sichtbar erzwingen
  const del = document.createElement('button');
  del.className='trash-button';
  del.innerHTML='🗑️';
  del.title='Aufgabe löschen';
  del.style.display = 'inline-flex'; // CSS-Override
  del.addEventListener('click', async () => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    const { error } = await supabase.from('student_tasks').delete().eq('id', entry.id);
    if (error) alert('Löschen fehlgeschlagen: ' + error.message);
    else loadTasks();
  });
  controls.append(del);

  header.append(meta, content, controls);
  li.append(header);

  placeByDate(li, entry.due_date, entry.done, todayISO);
}

/* ===== Inline-Edit für eigene SuS-Tasks ===== */
function startEdit(entry, li) {
  if (li.querySelector('.edit-form')) return; // schon im Edit

  const body = li.querySelector('.content');
  const meta = li.querySelector('.meta');
  const controls = li.querySelector('.controls');

  const original = body.innerHTML;
  const originalMeta = meta.innerHTML;

  const wrap = document.createElement('div');
  wrap.className = 'edit-form';

  const subjSel = document.createElement('select');
  SUBJECTS.forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s;
    if (s === entry.subject) o.selected = true;
    subjSel.appendChild(o);
  });

  const titleIn = document.createElement('input');
  titleIn.type = 'text'; titleIn.value = entry.title; titleIn.placeholder = 'Titel';

  const dateIn = document.createElement('input');
  dateIn.type = 'date'; dateIn.value = entry.due_date;

  const descTa = document.createElement('textarea');
  descTa.value = entry.description || ''; descTa.placeholder = 'Beschreibung (optional)';

  const saveBtn = document.createElement('button'); saveBtn.textContent = 'Speichern'; saveBtn.style.marginRight='0.5em';
  const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Abbrechen';

  meta.innerHTML = '';
  meta.append(
    mkLabelWrap('Fach', subjSel),
    mkLabelWrap('Fällig', dateIn)
  );

  body.innerHTML = '';
  body.append(
    mkLabelWrap('Titel', titleIn),
    mkLabelWrap('Beschreibung', descTa),
    saveBtn, cancelBtn
  );

  // während Edit: nur Checkbox aktiv lassen
  [...controls.children].forEach(ch => {
    if (ch !== controls.firstChild) ch.style.display = 'none';
  });

  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    body.innerHTML = original;
    meta.innerHTML = originalMeta;
    [...controls.children].forEach(ch => ch.style.removeProperty('display'));
  });

  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const payload = {
      subject: subjSel.value,
      title: titleIn.value.trim(),
      due_date: dateIn.value,
      description: descTa.value.trim()
    };
    if (!payload.subject || !payload.title || !payload.due_date) {
      alert('Bitte Fach, Titel und Datum angeben.');
      return;
    }
    const { error } = await supabase
      .from('student_tasks')
      .update(payload)
      .eq('id', entry.id);
    if (error) {
      alert('Speichern fehlgeschlagen: ' + error.message);
    } else {
      loadTasks();
    }
  });
}

function mkLabelWrap(label, el) {
  const wrap = document.createElement('div');
  wrap.style.margin = '0 0 0.5em 0';
  const l = document.createElement('div');
  l.style.fontWeight = '600';
  l.style.fontSize = '0.9rem';
  l.textContent = label;
  wrap.append(l, el);
  return wrap;
}

/* ===== Helpers ===== */
function isoDate(d) {
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().split('T')[0];
}
function humanDate(yyyy_mm_dd) {
  const [y,m,d] = String(yyyy_mm_dd).split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  return parseInt(d,10)+'. '+monate[parseInt(m,10)-1]+' '+y;
}
function placeByDate(li, dueISO, done, todayISO) {
  if (done) { listDone.appendChild(li); return; }
  if (String(dueISO) === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); return; }
  if (String(dueISO) < todayISO)   { li.classList.add('overdue');   listAll.appendChild(li); return; }
  listAll.appendChild(li);
}

/* ===== Neues SuS-Item (privat) ===== */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject=subjI.value, title=titleI.value.trim(), due_date=dateI.value, description=descI.value.trim();
  if (!subject || !title || !due_date) return;

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
