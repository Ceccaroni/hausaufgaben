/* Datei: public/sus.js – benötigt <script type="module" src="public/sus.js"> in sus.html */

const SUPABASE_URL = 'https://DEIN-PROJEKT.supabase.co';         // <- einsetzen
const SUPABASE_ANON_KEY = 'ey...';                                // <- einsetzen

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

/* ===== DOM-Referenzen ===== */
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

function createInnerList(sectionEl, listId) {
  const ul = document.createElement('ul');
  ul.className = 'task-list';
  ul.id = listId;
  sectionEl.appendChild(ul);
  return ul;
}

/* ===== Auth: Schülerin Login (E-Mail/Passwort) =====
   Einfach und robust: Du legst in Supabase für die Schülerin ein Konto an.
   Beim ersten Aufruf fragt die Seite die Zugangsdaten ab und merkt sich die Session.
*/
async function requireStudent() {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;

  const email = prompt('E-Mail (Schülerin):');
  const password = prompt('Passwort:');
  if (!email || !password) throw new Error('Login abgebrochen');

  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login fehlgeschlagen: ' + error.message);
    throw error;
  }
  return signIn.user;
}

/* ===== Laden & Rendern ===== */
async function loadTasks() {
  clearLists();
  const todayISO = new Date().toISOString().split('T')[0];

  // 1) Admin-Tasks (read-only, für alle SuS sichtbar)
  const { data: adminTasks, error: e1 } = await supabase
    .from('app.tasks')
    .select('*')
    .eq('origin', 'admin')
    .order('due_date', { ascending: true })
    .limit(1000);

  if (e1) {
    console.error(e1);
    alert('Fehler beim Laden (Admin-Aufgaben): ' + e1.message);
  } else {
    (adminTasks || []).forEach(entry => renderEntry(entry, todayISO, { deletable: false, editable: false }));
  }

  // 2) Eigene SuS-Tasks (privat)
  const { data: user } = await supabase.auth.getUser();
  if (user?.user?.id) {
    const { data: myTasks, error: e2 } = await supabase
      .from('app.tasks')
      .select('*')
      .eq('origin', 'student')
      .eq('owner_id', user.user.id)
      .order('due_date', { ascending: true });

    if (e2) {
      console.error(e2);
      alert('Fehler beim Laden (eigene Aufgaben): ' + e2.message);
    } else {
      (myTasks || []).forEach(entry => renderEntry(entry, todayISO, { deletable: true, editable: true }));
    }
  }

  toggleSectionHeadings();
}

function clearLists() {
  listToday.innerHTML = '';
  listAll.innerHTML   = '';
  listDone.innerHTML  = '';
}

function toggleSectionHeadings() {
  document.getElementById('heute-title')
    .classList.toggle('visually-hidden', listToday.children.length === 0);
  document.getElementById('alle-title')
    .classList.toggle('visually-hidden', listAll.children.length === 0);
  document.getElementById('erledigt-title')
    .classList.toggle('visually-hidden', listDone.children.length === 0);
}

function renderEntry(entry, todayISO, opts) {
  const { deletable, editable } = opts;

  const li = document.createElement('li');
  li.className = 'task';

  const header = document.createElement('div');
  header.className = 'task-header';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const dateEl = document.createElement('span');
  dateEl.className = 'date';

  const [y, m, d] = entry.due_date.split('-');
  const monate = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  dateEl.textContent = parseInt(d, 10) + '. ' + monate[parseInt(m, 10) - 1] + ' ' + y;

  const subjEl = document.createElement('span');
  subjEl.className = 'subject';
  subjEl.textContent = entry.subject;
  meta.append(dateEl, subjEl);

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

  const controls = document.createElement('div');
  controls.className = 'controls';

  // Done-Checkbox (nur für eigene SuS-Tasks)
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.className = 'checkbox';
  chk.checked = entry.done;
  chk.disabled = !(entry.origin === 'student' && deletable);
  chk.addEventListener('change', async () => {
    const { error } = await supabase
      .from('app.tasks')
      .update({ done: chk.checked })
      .eq('id', entry.id);
    if (error) alert('Konnte Status nicht speichern: ' + error.message);
    loadTasks();
  });
  controls.append(chk);

  // Trash (nur für eigene SuS-Tasks)
  if (entry.origin === 'student' && deletable) {
    const trashBtn = document.createElement('button');
    trashBtn.className = 'trash-button';
    trashBtn.innerHTML = '🗑️';
    trashBtn.title = 'Aufgabe löschen';
    trashBtn.addEventListener('click', async () => {
      if (!confirm('Eintrag wirklich löschen?')) return;
      const { error } = await supabase.from('app.tasks').delete().eq('id', entry.id);
      if (error) alert('Löschen fehlgeschlagen: ' + error.message);
      loadTasks();
    });
    controls.append(trashBtn);
  }

  header.append(meta, content, controls);
  li.append(header);

  if (entry.done) listDone.appendChild(li);
  else if (entry.due_date === todayISO) { li.classList.add('due-today'); listToday.appendChild(li); }
  else if (entry.due_date < todayISO)   { li.classList.add('overdue');   listAll.appendChild(li); }
  else                                   listAll.appendChild(li);
}

/* ===== Formular: neue SuS-Aufgabe (privat) ===== */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const subject     = subjI.value;
  const title       = titleI.value.trim();
  const due_date    = dateI.value;
  const description = descI.value.trim();

  if (!subject || !title || !due_date) return;

  const { data: user } = await supabase.auth.getUser();
  const owner_id = user?.user?.id;
  if (!owner_id) { alert('Nicht eingeloggt.'); return; }

  const { error } = await supabase
    .from('app.tasks')
    .insert([{
      origin: 'student',
      owner_id,
      subject,
      title,
      description,
      due_date,
      done: false
    }]);

  if (error) {
    alert('Speichern fehlgeschlagen: ' + error.message);
    return;
  }

  form.reset();
  loadTasks();
});

/* ===== Start ===== */
(async function start() {
  try {
    await requireStudent();
    await loadTasks();
  } catch (e) {
    console.error(e);
  }
})();
