// Datei: public/style-settings-overlay.js

// ==== Audio initialisieren und global verfügbar machen =====
window.clickAudio = new Audio('assets/tap-tiny-wooden.mp3');
window.clickAudio.preload = 'auto';
window.clickAudio.muted = true; // Standard zunächst stumm

// ==== Settings-Overlay öffnen/schliessen =====
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

  // Slider-Event: Wert direkt anzeigen, anwenden und CSS-Variable setzen
  fontSlider.addEventListener('input', () => {
    fontValue.textContent = fontSlider.value;
    document.documentElement.style.fontSize = fontSlider.value + 'px';
    fontSlider.style.setProperty('--value', fontSlider.value);
  });
  contrastSlider.addEventListener('input', () => {
    contrastValue.textContent = contrastSlider.value;
    document.body.style.filter = `contrast(${contrastSlider.value}%)`;
    contrastSlider.style.setProperty('--value', contrastSlider.value);
  });

  // Klick auf Zahnrad öffnet Overlay und lädt Werte
  settingsBtn.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    loadSettings(); // Felder mit gespeicherten Werten befüllen
  });

  // Klick auf Schliessen-Button speichert Werte und blendet Overlay aus
  closeBtn.addEventListener('click', () => {
    if (localStorage.getItem('sound_on') !== 'false') {
      window.clickAudio.currentTime = 0;
      window.clickAudio.play();
    }
    saveSettings();
    overlay.classList.add('hidden');
  });

  // Klick in den ausgeblurrten Bereich schließt ebenfalls das Overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (localStorage.getItem('sound_on') !== 'false') {
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

  // Ton-Status aus localStorage holen (Standard: eingeschaltet)
  const soundOn = localStorage.getItem('sound_on');
  soundToggle.checked = (soundOn !== 'false');

  // Theme-Wert aus localStorage holen (Standard: standard)
  const theme = localStorage.getItem('ui_theme') || 'standard';
  themeSelect.value = theme;

  // Schriftgrösse aus localStorage holen (Standard: 12)
  const savedFont = localStorage.getItem('ui_fontsize') || '12';
  fontSlider.value = savedFont;
  fontValue.textContent = savedFont;
  document.documentElement.style.fontSize = savedFont + 'px';
  fontSlider.style.setProperty('--value', savedFont);

  // Kontrast aus localStorage holen (Standard: 100)
  const savedContrast = localStorage.getItem('ui_contrast') || '100';
  contrastSlider.value = savedContrast;
  contrastValue.textContent = savedContrast;
  document.body.style.filter = `contrast(${savedContrast}%)`;
  contrastSlider.style.setProperty('--value', savedContrast);
}

// ==== Einstellungen speichern ====
function saveSettings() {
  const soundToggle    = document.getElementById('toggle-sound');
  const themeSelect    = document.getElementById('select-theme');
  const fontSlider     = document.getElementById('fontsize-slider');
  const contrastSlider = document.getElementById('contrast-slider');

  localStorage.setItem('sound_on', soundToggle.checked.toString());
  localStorage.setItem('ui_theme', themeSelect.value);
  localStorage.setItem('ui_fontsize', fontSlider.value);
  localStorage.setItem('ui_contrast', contrastSlider.value);

  applySettings();
}

// ==== Einstellungen anwenden ====
function applySettings() {
  const theme = localStorage.getItem('ui_theme') || 'standard';
  document.documentElement.classList.remove(
    'theme-standard',
    'theme-beruhigendes-blau',
    'theme-erdtoene',
    'theme-gedaempftes-pastell',
    'theme-naturinspiriert',
    'theme-lavendel-neutral'
  );
  document.documentElement.classList.add(`theme-${theme}`);

  // Ton an/aus steuern
  const soundOn = (localStorage.getItem('sound_on') !== 'false');
  window.clickAudio.muted = !soundOn;

  // Schriftgrösse anwenden
  const fs = localStorage.getItem('ui_fontsize') || '12';
  document.documentElement.style.fontSize = fs + 'px';
  const sliderFont = document.getElementById('fontsize-slider');
  if (sliderFont) sliderFont.style.setProperty('--value', fs);

  // Kontrast anwenden
  const contrast = localStorage.getItem('ui_contrast') || '100';
  document.body.style.filter = `contrast(${contrast}%)`;
  const sliderContrast = document.getElementById('contrast-slider');
  if (sliderContrast) sliderContrast.style.setProperty('--value', contrast);
}

// Direkt nach Laden der Seite die Einstellungen anwenden
applySettings();
