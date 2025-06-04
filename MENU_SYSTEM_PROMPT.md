# Prompt für ChatGPT Codex: Menüsystem mit Overlay

## Ziel
Generiere ein voll funktionsfähiges Menüsystem inklusive Overlay in Apple-Optik (San Francisco / iOS-Stil) unter Beachtung der TEACCH-Prinzipien. Das Overlay soll identisch aussehen wie jenes in der bestehenden Datei `index.html`: halbtransparenter Hintergrund (rgba(0,0,0,0.5)) mit Blur-Effekt und ein zentriertes weißes Modal mit abgerundeten Ecken.

## Lieferumfang
Erzeuge folgende Dateien in einer gemeinsamen Ordnerstruktur (z.B. ZIP-Archiv):

- `menu.html`
- `public/style-shared.css`
- `public/style-menu.css`
- `public/fade.css`
- `public/menu.js`

## 1) HTML: `menu.html`
- Verwende `<!DOCTYPE html>` und `<html lang="de">`.
- Im `<head>` in genau dieser Reihenfolge einbinden:
  1. `<link rel="stylesheet" href="public/fade.css">`
  2. `<link rel="stylesheet" href="public/style-shared.css">`
  3. `<link rel="stylesheet" href="public/style-menu.css">`
- Das `<body>` erhält initial die Klasse `fade-initial`.
- Struktur des `<body>`:
  1. `<header>` mit Systemschrift, weißer Text auf blauem Hintergrund (#0078D4), zentriertem Titel "App-Titel" und einem rechts platzierten Zahnrad-Icon
     `<button id="settings-btn" class="settings-button">⚙️</button>`.
  2. Direkt danach das Overlay:
```html
<div id="settings-overlay" class="overlay-hidden">
  <div class="settings-modal">
    <button id="settings-close" class="close-button" aria-label="Schließen">×</button>
    <h2>Einstellungen</h2>
    <nav class="settings-menu">
      <!-- Menüpunkte -->
    </nav>
  </div>
</div>
```
  3. Anschließend ein `<main role="main">` für weitere Inhalte.
  4. Vor dem schließenden `</body>` die JS-Datei einbinden:
```html
<script src="public/menu.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.remove('fade-initial');
  });
</script>
```

## 2) CSS: `public/style-shared.css`
- Definiere darin CSS-Variablen für die Palette "Beruhigendes Blau" und Platzhalter für weitere Paletten.
- Allgemeine Basis-Styles für `body`, `header` und weitere Grundelemente, Beispiel:
```css
:root {
  /* === Palette 1: Beruhigendes Blau === */
  --bg-color: #F5F7FA;
  --nav-bg: #3F7CAC;
  --nav-active: #2A5D87;
  --task-bg: #E4EBF2;
  --highlight: #7FB069;
  --text-main: #2D3E50;
  --button-bg: #3F7CAC;
  --icon-color: #5D8AA8;
  --border: #BDC9D7;
  /* === Weitere Paletten (2–6) ... === */
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg-color);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-main);
  transition: background 0.3s, color 0.3s;
}

header {
  background: var(--nav-bg);
  color: #fff;
  padding: 1em;
  display: flex;
  align-items: center;
  position: relative;
}

header .header-title {
  flex: 1;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}
```

## 3) CSS: `public/style-menu.css`
- Achte auf korrekte Spezifität. Die Regel zum Ausblenden muss **nach** der allgemeinen Overlay-Regel kommen:
```css
#settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

#settings-overlay.overlay-hidden {
  display: none !important;
}
```
- Weitere Styles für `.settings-modal`, `.close-button`, `.settings-button` usw., jeweils mit abgerundeten Ecken, Apple-typischer Schrift und ausreichendem Weißraum.

## 4) CSS: `public/fade.css`
```css
body.fade-initial {
  opacity: 0;
}
body {
  opacity: 1;
  transition: opacity 0.5s ease-in-out;
}
```

## 5) JavaScript: `public/menu.js`
- Erst nach `DOMContentLoaded` Event-Listener registrieren.
- Beim Klick auf das Zahnrad-Icon `.overlay-hidden` vom Overlay entfernen.
- Beim Klick auf den Schließen-Button oder auf den halbtransparenten Hintergrund `.overlay-hidden` wieder hinzufügen.
Beispiel:
```js
document.addEventListener('DOMContentLoaded', () => {
  const btnOpen  = document.getElementById('settings-btn');
  const btnClose = document.getElementById('settings-close');
  const overlay  = document.getElementById('settings-overlay');

  btnOpen.addEventListener('click', () => {
    overlay.classList.remove('overlay-hidden');
  });

  btnClose.addEventListener('click', () => {
    overlay.classList.add('overlay-hidden');
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.add('overlay-hidden');
    }
  });
});
```

## 6) Zusätzliche Hinweise
- Halte die Struktur klar und aufgeräumt im Sinne der TEACCH-Prinzipien.
- Verwende keine Inline-CSS-Overrides.
- Stelle sicher, dass das Overlay zu Beginn unsichtbar ist und sich problemlos öffnen und schließen lässt.

