// Datei: public/style-settings-overlay.js
(function () {
  const p = location.pathname;
  const IS_SUS   = /\/sus\.html(?:$|[?#])/.test(p);
  const IS_ADMIN = /\/admin\.html(?:$|[?#])/.test(p);
  const SCOPE = IS_ADMIN ? 'admin' : (IS_SUS ? 'sus' : null);
  if (!SCOPE) return;

  // --- Namespacing: pro Seite eigene Keys ---
  const key = (name) => `ui_${SCOPE}_${name}`; // z. B. ui_admin_theme / ui_sus_theme

  // ==== Audio (pro Seite Mute-State) ====
  (function initAudio() {
    try {
      if (!window.clickAudio) {
        const a = new Audio('./assets/sounds/tap-tiny-wooden.mp3');
        a.preload = 'auto';
        a.muted = (localStorage.getItem(key('sound_on')) === 'false');
        window.clickAudio = a;
      } else {
        window.clickAudio.muted = (localStorage.getItem(key('sound_on')) === 'false');
      }
    } catch (e) {}
  })();

  // ==== Overlay-Logik ====
  document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn    = document.getElementById('settings-btn');
    const overlay        = document.getElementById('settings-overlay');
    const closeBtn       = document.getElementById('settings-close');
    const themeSelect    = document.getElementById('select-theme');
    const fontSlider     = document.getElementById('fontsize-slider');
    const fontValue      = document.getElementById('fontsize-value');
    const contrastSlider = document.getElementById('contrast-slider');
    const contrastValue  = document.getElementById('contrast-value');
    const soundToggle    = document.getElementById('toggle-sound');

    if (!settingsBtn || !overlay || !closeBtn || !themeSelect || !fontSlider || !fontValue || !contrastSlider || !contrastValue) return;

    overlay.classList.add('hidden');

    // Slider-UI initialisieren
    fontSlider.style.setProperty('--min', fontSlider.min);
    fontSlider.style.setProperty('--max', fontSlider.max);
    contrastSlider.style.setProperty('--min', contrastSlider.min);
    contrastSlider.style.setProperty('--max', contrastSlider.max);

    // Live-Änderungen
    themeSelect.addEventListener('change', () => {
      localStorage.setItem(key('theme'), themeSelect.value);
      applySettings();
    });
    fontSlider.addEventListener('input', () => {
      fontValue.textContent = fontSlider.value;
      document.documentElement.style.fontSize = fontSlider.value + 'px';
      document.documentElement.style.setProperty('--base-font', fontSlider.value + 'px');
      fontSlider.style.setProperty('--value', fontSlider.value);
    });
    contrastSlider.addEventListener('input', () => {
      contrastValue.textContent = contrastSlider.value;
      document.body.style.filter = `contrast(${contrastSlider.value}%)`;
      contrastSlider.style.setProperty('--value', contrastSlider.value);
    });
    if (soundToggle) {
      soundToggle.addEventListener('change', () => {
        localStorage.setItem(key('sound_on'), soundToggle.checked.toString());
        applySettings();
      });
    }

    // Öffnen/Schliessen
    settingsBtn.addEventListener('click', () => {
      overlay.classList.remove('hidden');
      loadSettings();
    });
    closeBtn.addEventListener('click', () => {
      if (localStorage.getItem(key('sound_on')) !== 'false' && window.clickAudio) {
        window.clickAudio.currentTime = 0;
        window.clickAudio.play();
      }
      saveSettings();
      overlay.classList.add('hidden');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (localStorage.getItem(key('sound_on')) !== 'false' && window.clickAudio) {
          window.clickAudio.currentTime = 0;
          window.clickAudio.play();
        }
        saveSettings();
        overlay.classList.add('hidden');
      }
    });
  });

  // ==== Laden (nur SCOPE-Keys) ====
  function loadSettings() {
    const soundToggle    = document.getElementById('toggle-sound');
    const themeSelect    = document.getElementById('select-theme');
    const fontSlider     = document.getElementById('fontsize-slider');
    const fontValue      = document.getElementById('fontsize-value');
    const contrastSlider = document.getElementById('contrast-slider');
    const contrastValue  = document.getElementById('contrast-value');

    const soundOn     = localStorage.getItem(key('sound_on'));
    const theme       = localStorage.getItem(key('theme'))    || 'standard';
    const fs          = localStorage.getItem(key('fontsize')) || localStorage.getItem(key('font')) || '12';
    const contrast    = localStorage.getItem(key('contrast')) || '100';

    if (soundToggle) soundToggle.checked = (soundOn !== 'false');
    if (themeSelect) themeSelect.value = theme;

    if (fontSlider) {
      fontSlider.value = fs;
      if (fontValue) fontValue.textContent = fs;
      document.documentElement.style.fontSize = fs + 'px';
      document.documentElement.style.setProperty('--base-font', fs + 'px');
      fontSlider.style.setProperty('--value', fs);
    }
    if (contrastSlider) {
      contrastSlider.value = contrast;
      if (contrastValue) contrastValue.textContent = contrast;
      document.body.style.filter = `contrast(${contrast}%)`;
      contrastSlider.style.setProperty('--value', contrast);
    }
  }

  // ==== Speichern (nur SCOPE-Keys) ====
  function saveSettings() {
    const soundToggle    = document.getElementById('toggle-sound');
    const themeSelect    = document.getElementById('select-theme');
    const fontSlider     = document.getElementById('fontsize-slider');
    const contrastSlider = document.getElementById('contrast-slider');

    if (soundToggle)   localStorage.setItem(key('sound_on'), soundToggle.checked.toString());
    if (themeSelect)   localStorage.setItem(key('theme'), themeSelect.value);
    if (fontSlider)    localStorage.setItem(key('fontsize'), fontSlider.value);
    if (contrastSlider)localStorage.setItem(key('contrast'), contrastSlider.value);

    applySettings();
  }

  // ==== Anwenden (nur auf aktueller Seite) ====
  function applySettings() {
    const theme    = localStorage.getItem(key('theme'))    || 'standard';
    const fs       = localStorage.getItem(key('fontsize')) || localStorage.getItem(key('font')) || '12';
    const contrast = localStorage.getItem(key('contrast')) || '100';
    const soundOn  = localStorage.getItem(key('sound_on')) !== 'false';

    // Theme: data-Attribut + Klasse
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.remove(
      'theme-standard',
      'theme-beruhigendes-blau',
      'theme-erdtoene',
      'theme-gedaempftes-pastell',
      'theme-naturinspiriert',
      'theme-lavendel-neutral'
    );
    document.documentElement.classList.add(`theme-${theme}`);

    // Font
    document.documentElement.style.setProperty('--base-font', fs + 'px');
    document.documentElement.style.fontSize = fs + 'px';
    const sliderFont = document.getElementById('fontsize-slider');
    if (sliderFont) sliderFont.style.setProperty('--value', fs);

    // Kontrast
    document.body.style.filter = `contrast(${contrast}%)`;
    const sliderContrast = document.getElementById('contrast-slider');
    if (sliderContrast) sliderContrast.style.setProperty('--value', contrast);

    // Sound
    if (window.clickAudio) window.clickAudio.muted = !soundOn;
  }

  // Beim Laden anwenden
  applySettings();
})();
