// Datei: public/style-settings-overlay.js
(function () {
  const p = location.pathname;
  const IS_SUS   = /\/sus\.html(?:$|[?#])/.test(p);
  const IS_ADMIN = /\/admin\.html(?:$|[?#])/.test(p);
  const SCOPE = IS_ADMIN ? 'admin' : (IS_SUS ? 'sus' : null);

  // Overlay nur auf sus.html ODER admin.html aktivieren
  if (!SCOPE) return;

  // ---------- Key-Helper: pro Seite eigene Keys ----------
  const K = {
    theme:    `ui_${SCOPE}_theme`,
    font:     `ui_${SCOPE}_fontsize`,
    contrast: `ui_${SCOPE}_contrast`,
    sound:    `ui_${SCOPE}_sound_on`,
  };
  // Einmalige Migration/Lesefallback von alten globalen Keys
  const Fallback = {
    theme:    'ui_theme',
    font:     'ui_fontsize',
    contrast: 'ui_contrast',
    sound:    'sound_on',
  };
  const lsGet = (key, fallbackKey, def) => {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
    const f = fallbackKey ? localStorage.getItem(fallbackKey) : null;
    return f !== null ? f : def;
  };

  // ==== Audio einmalig initialisieren (pro Seite) ====
  (function initAudio() {
    try {
      if (!window.clickAudio) {
        const a = new Audio('./assets/sounds/tap-tiny-wooden.mp3'); // relativer Pfad
        a.preload = 'auto';
        const soundOn = lsGet(K.sound, Fallback.sound, 'true') !== 'false';
        a.muted = !soundOn;
        window.clickAudio = a;
      } else {
        // Falls bereits vorhanden: Mute-State an Scope anpassen
        const soundOn = lsGet(K.sound, Fallback.sound, 'true') !== 'false';
        window.clickAudio.muted = !soundOn;
      }
    } catch (e) {}
  })();

  // ==== Settings-Overlay öffnen/schliessen ====
  document.addEventListener('DOMContentLoaded', () => {
    // DOM-Referenzen
    const settingsBtn      = document.getElementById('settings-btn');
    const overlay          = document.getElementById('settings-overlay');
    const closeBtn         = document.getElementById('settings-close');
    const themeSelect      = document.getElementById('select-theme');
    const fontSlider       = document.getElementById('fontsize-slider');
    const fontValue        = document.getElementById('fontsize-value');
    const contrastSlider   = document.getElementById('contrast-slider');
    const contrastValue    = document.getElementById('contrast-value');

    if (!settingsBtn || !overlay || !closeBtn || !themeSelect || !fontSlider || !fontValue || !contrastSlider || !contrastValue) return;

    // Overlay initial ausblenden
    overlay.classList.add('hidden');

    // Initial CSS-Variablen für Slider
    fontSlider.style.setProperty('--min', fontSlider.min);
    fontSlider.style.setProperty('--max', fontSlider.max);
    fontSlider.style.setProperty('--value', fontSlider.value);
    contrastSlider.style.setProperty('--min', contrastSlider.min);
    contrastSlider.style.setProperty('--max', contrastSlider.max);
    contrastSlider.style.setProperty('--value', contrastSlider.value);

    // Theme-Auswahl sofort anwenden und speichern (namespaced)
    themeSelect.addEventListener('change', () => {
      const val = themeSelect.value;
      localStorage.setItem(K.theme, val);
      applySettings();
    });

    // Schriftgrösse live anwenden
    fontSlider.addEventListener('input', () => {
      fontValue.textContent = fontSlider.value;
      document.documentElement.style.fontSize = fontSlider.value + 'px';
      document.documentElement.style.setProperty('--base-font', fontSlider.value + 'px');
      fontSlider.style.setProperty('--value', fontSlider.value);
    });

    // Kontrast live anwenden
    contrastSlider.addEventListener('input', () => {
      contrastValue.textContent = contrastSlider.value;
      document.body.style.filter = `contrast(${contrastSlider.value}%)`;
      contrastSlider.style.setProperty('--value', contrastSlider.value);
    });

    // Sound-Toggle sofort anwenden (namespaced)
    const soundToggle = document.getElementById('toggle-sound');
    if (soundToggle) {
      soundToggle.addEventListener('change', () => {
        localStorage.setItem(K.sound, soundToggle.checked.toString());
        applySettings();
      });
    }

    // Klick auf Zahnrad öffnet Overlay und lädt Werte
    settingsBtn.addEventListener('click', () => {
      overlay.classList.remove('hidden');
      loadSettings(); // Felder mit gespeicherten Werten befüllen
    });

    // Klick auf Schliessen-Button speichert Werte und blendet Overlay aus
    closeBtn.addEventListener('click', () => {
      if (lsGet(K.sound, Fallback.sound, 'true') !== 'false' && window.clickAudio) {
        window.clickAudio.currentTime = 0;
        window.clickAudio.play();
      }
      saveSettings();
      overlay.classList.add('hidden');
    });

    // Klick in den ausgeblurrten Bereich schliesst ebenfalls das Overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (lsGet(K.sound, Fallback.sound, 'true') !== 'false' && window.clickAudio) {
          window.clickAudio.currentTime = 0;
          window.clickAudio.play();
        }
        saveSettings();
        overlay.classList.add('hidden');
      }
    });
  });

  // ==== Einstellungen laden (namespaced, mit Fallback) ====
  function loadSettings() {
    const soundToggle     = document.getElementById('toggle-sound');
    const themeSelect     = document.getElementById('select-theme');
    const fontSlider      = document.getElementById('fontsize-slider');
    const fontValue       = document.getElementById('fontsize-value');
    const contrastSlider  = document.getElementById('contrast-slider');
    const contrastValue   = document.getElementById('contrast-value');

    // Ton-Status
    const soundOn = lsGet(K.sound, Fallback.sound, 'true');
    if (soundToggle) soundToggle.checked = (soundOn !== 'false');

    // Theme
    const theme = lsGet(K.theme, Fallback.theme, 'standard') || 'standard';
    if (themeSelect) themeSelect.value = theme;

    // Schriftgrösse
    const savedFont = lsGet(K.font, Fallback.font, '12') || '12';
    if (fontSlider) {
      fontSlider.value = savedFont;
      if (fontValue) fontValue.textContent = savedFont;
      document.documentElement.style.fontSize = savedFont + 'px';
      document.documentElement.style.setProperty('--base-font', savedFont + 'px');
      fontSlider.style.setProperty('--value', savedFont);
    }

    // Kontrast
    const savedContrast = lsGet(K.contrast, Fallback.contrast, '100') || '100';
    if (contrastSlider) {
      contrastSlider.value = savedContrast;
      if (contrastValue) contrastValue.textContent = savedContrast;
      document.body.style.filter = `contrast(${savedContrast}%)`;
      contrastSlider.style.setProperty('--value', savedContrast);
    }
  }

  // ==== Einstellungen speichern (namespaced) ====
  function saveSettings() {
    const soundToggle    = document.getElementById('toggle-sound');
    const themeSelect    = document.getElementById('select-theme');
    const fontSlider     = document.getElementById('fontsize-slider');
    const contrastSlider = document.getElementById('contrast-slider');

    if (soundToggle)   localStorage.setItem(K.sound, soundToggle.checked.toString());
    if (themeSelect)   localStorage.setItem(K.theme, themeSelect.value);
    if (fontSlider)    localStorage.setItem(K.font, fontSlider.value);
    if (contrastSlider)localStorage.setItem(K.contrast, contrastSlider.value);

    applySettings();
  }

  // ==== Einstellungen anwenden (nur auf aktueller Seite) ====
  function applySettings() {
    const theme = lsGet(K.theme, Fallback.theme, 'standard') || 'standard';

    // a) Theme als data-Attribut und Klasse
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

    // b) Ton an/aus
    const soundOn = lsGet(K.sound, Fallback.sound, 'true') !== 'false';
    if (window.clickAudio) window.clickAudio.muted = !soundOn;

    // c) Schriftgrösse
    const fs = lsGet(K.font, Fallback.font, '12') || '12';
    document.documentElement.style.setProperty('--base-font', fs + 'px');
    document.documentElement.style.fontSize = fs + 'px';
    const sliderFont = document.getElementById('fontsize-slider');
    if (sliderFont) sliderFont.style.setProperty('--value', fs);

    // d) Kontrast
    const contrast = lsGet(K.contrast, Fallback.contrast, '100') || '100';
    document.body.style.filter = `contrast(${contrast}%)`;
    const sliderContrast = document.getElementById('contrast-slider');
    if (sliderContrast) sliderContrast.style.setProperty('--value', contrast);
  }

  // Direkt nach Laden der Datei Einstellungen anwenden
  applySettings();
})();
