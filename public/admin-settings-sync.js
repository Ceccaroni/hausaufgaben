/* Datei: public/admin-settings-sync.js  – NACH admin.js laden */

(async () => {
  // supabase-Client aus admin.js verwenden oder selbst erzeugen, wenn nicht vorhanden
  let supabase = window.supabase;
  if (!supabase) {
    const SUPABASE_URL = 'https://dxzeleiiaitigzttbnaf.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4emVsZWlpYWl0aWd6dHRibmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDcxODQsImV4cCI6MjA3MjgyMzE4NH0.iXKtGyH0y8KUvAWLSJZKFIfz4VQ-y2PZBWucEg7ZHJ4';
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true }, db:{ schema:'app' } });
  }

  // Warten bis DOM steht
  await new Promise(r => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r, {once:true}) : r()));

  // Teacher-User holen
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) return; // nicht eingeloggt => nichts tun (z. B. auf sus.html)

  // DOM-Controls
  const elSound  = document.getElementById('toggle-sound');
  const elTheme  = document.getElementById('select-theme');
  const fsSlider = document.getElementById('fontsize-slider');
  const fsValue  = document.getElementById('fontsize-value');
  const cSlider  = document.getElementById('contrast-slider');
  const cValue   = document.getElementById('contrast-value');

  // LocalStorage-Key wie im Overlay
  const key = (name) => `ui_admin_${name}`;

  // Server -> Local anwenden
  async function pullSettings() {
    const { data, error } = await supabase
      .from('user_settings')
      .select('theme, sound_on, fontsize, contrast')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) { console.warn('settings pull error:', error.message); return; }
    if (!data) return; // noch nichts gespeichert

    try {
      localStorage.setItem(key('theme'), data.theme || 'standard');
      localStorage.setItem(key('sound_on'), String(!!data.sound_on));
      localStorage.setItem(key('fontsize'), String(data.fontsize ?? 12));
      localStorage.setItem(key('contrast'), String(data.contrast ?? 100));
    } catch {}

    applyToDOM({
      theme: data.theme || 'standard',
      sound_on: !!data.sound_on,
      fontsize: data.fontsize ?? 12,
      contrast: data.contrast ?? 100
    });
  }

  // Local -> Server speichern
  async function pushSettings(partial) {
    const current = {
      theme: localStorage.getItem(key('theme')) || 'standard',
      sound_on: (localStorage.getItem(key('sound_on')) ?? 'true') !== 'false',
      fontsize: parseInt(localStorage.getItem(key('fontsize')||'12'), 10) || 12,
      contrast: parseInt(localStorage.getItem(key('contrast')||'100'), 10) || 100,
      ...partial
    };
    const { error } = await supabase.from('user_settings')
      .upsert({ user_id: user.id, ...current });
    if (error) console.warn('settings push error:', error.message);
  }

  // Auf DOM anwenden (spiegelt die Logik aus dem Overlay)
  function applyToDOM(s) {
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.style.setProperty('--base-font', `${s.fontsize}px`);
    document.documentElement.style.fontSize = `${s.fontsize}px`;
    document.body.style.filter = `contrast(${s.contrast}%)`;

    if (elTheme)  elTheme.value  = s.theme;
    if (elSound)  elSound.checked = !!s.sound_on;
    if (fsSlider) fsSlider.value = String(s.fontsize), fsValue && (fsValue.textContent = fsSlider.value);
    if (cSlider)  cSlider.value  = String(s.contrast), cValue && (cValue.textContent = cSlider.value);
  }

  // Initial: vom Server ziehen und anwenden
  await pullSettings();

  // Events abhören und sofort zum Server spiegeln
  elTheme?.addEventListener('change',  () => pushSettings({ theme: elTheme.value }));
  elSound?.addEventListener('change',  () => pushSettings({ sound_on: elSound.checked }));
  fsSlider?.addEventListener('change', () => pushSettings({ fontsize: parseInt(fsSlider.value, 10) || 12 }));
  cSlider?.addEventListener('change',  () => pushSettings({ contrast: parseInt(cSlider.value, 10) || 100 }));
})();
