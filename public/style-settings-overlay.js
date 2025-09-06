// Datei: public/style-settings-overlay.js
(function () {
  const p = location.pathname;
  const IS_SUS   = /\/sus\.html(?:$|[?#])/.test(p);
  const IS_ADMIN = /\/admin\.html(?:$|[?#])/.test(p);

  // Overlay nur auf sus.html ODER admin.html aktivieren
  if (!IS_SUS && !IS_ADMIN) return;

  // ==== Audio einmalig initialisieren (auf beiden Seiten) ====
  (function initAudio() {
    try {
      if (!window.clickAudio) {
        const a = new Audio('./assets/sounds/tap-tiny-wooden.mp3'); // relativer Pfad
        a.preload = 'auto';
        const soundOn = (localStorage.getItem('sound_on') !== 'false');
        a.muted = !soundOn;
        window.clickAudio = a;
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

    // Theme-Auswahl sofort anwenden und speichern
    themeSelect.addEventListener('change', () => {
      const val = themeSelect.value;
      localStorage.setItem('ui_theme', val);
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

    // Sound-Toggle sofort anwenden (nicht nur beim Schliessen)
    const soundToggle = document.getElementById('toggle-sound');
    if (soundToggle) {
      soundToggle.addEventListener('change', () => {
        localStorage.setItem('sound_on', soundToggle.checked.toString());
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
      if (localStorage.getItem('sound_on') !== 'false' && window.clickAudio) {
        window.clickAudio.currentTime = 0;
        window.clickAudio.play();
      }
      saveSettings();
      overlay.classList.add('hidden');
    });

    // Klick in den ausgeblurrten Bereich schliesst ebenfalls das Overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (localStorage.getItem('sound_on') !== 'false' && window.clickAudio) {
          window.clickAudio.currentTime = 0;
          window.clickAudio.play();
        }
        saveSettings();
        overlay.classList.add('hidden');
      }
    });
  });

  // ==== Einstellungen laden ====
  function loadSettings() {
    const soundToggle     = document.getElementById('toggle-sound');
    const themeSelect     = document.getElementById('select-theme');
    const fontSlider      = document.getElementById('fontsize-slider');
    const fontValue       = document.getElementById('fontsize-value');
    const contrastSlider  = document.getElementById('contrast-slider');
    const contrastValue   = document.getElementById('contrast-value');

    // Ton-Status (Standard: ein)
    const soundOn = localStorage.getItem('sound_on');
    if (soundToggle) soundToggle.checked = (soundOn !== 'false');

    // Theme (Standard: standard)
    const theme = localStorage.getItem('ui_theme') || 'standard';
    if (themeSelect) themeSelect.value = theme;

    // Schriftgrösse (Standard: 12)
    const savedFont = localStorage.getItem('ui_fontsize') || '12';
    if (fontSlider) {
      fontSlider.value = savedFont;
      if (fontValue) fontValue.textContent = savedFont;
      document.documentElement.style.fontSize = savedFont + 'px';
      document.documentElement.style.setProperty('--base-font', savedFont + 'px');
      fontSlider.style.setProperty('--value', savedFont);
    }

    // Kontrast (Standard: 100)
    const savedContrast = localStorage.getItem('ui_contrast') || '100';
    if (contrastSlider) {
      contrastSlider.value = savedContrast;
      if (contrastValue) contrastValue.textContent = savedContrast;
      document.body.style.filter = `contrast(${savedContrast}%)`;
      contrastSlider.style.setProperty('--value', savedContrast);
    }
  }

  // ==== Einstellungen speichern ====
  function saveSettings() {
    const soundToggle    = document.getElementById('toggle-sound');
    const themeSelect    = document.getElementById('select-theme');
    const fontSlider     = document.getElementById('fontsize-slider');
    const contrastSlider = document.getElementById('contrast-slider');

    if (soundToggle)   localStorage.setItem('sound_on', soundToggle.checked.toString());
    if (themeSelect)   localStorage.setItem('ui_theme', themeSelect.value);
    if (fontSlider)    localStorage.setItem('ui_fontsize', fontSlider.value);
    if (contrastSlider)localStorage.setItem('ui_contrast', contrastSlider.value);

    applySettings();
  }

  // ==== Einstellungen anwenden ====
  function applySettings() {
    const theme = localStorage.getItem('ui_theme') || 'standard';

    // a) Theme sowohl als data-Attribut wie auch als Klasse setzen
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
    const soundOn = (localStorage.getItem('sound_on') !== 'false');
    if (window.clickAudio) window.clickAudio.muted = !soundOn;

    // c) Schriftgrösse: Root-Variable und direkte font-size setzen
    const fs = localStorage.getItem('ui_fontsize') || '12';
    document.documentElement.style.setProperty('--base-font', fs + 'px');
    document.documentElement.style.fontSize = fs + 'px';
    const sliderFont = document.getElementById('fontsize-slider');
    if (sliderFont) sliderFont.style.setProperty('--value', fs);

    // d) Kontrast
    const contrast = localStorage.getItem('ui_contrast') || '100';
    document.body.style.filter = `contrast(${contrast}%)`;
    const sliderContrast = document.getElementById('contrast-slider');
    if (sliderContrast) sliderContrast.style.setProperty('--value', contrast);
  }

  // Direkt nach Laden der Datei Einstellungen anwenden
  applySettings();
})();
