# Hausaufgaben Web App

Dies ist eine kleine Offline-fähige Webanwendung zum Verwalten von Hausaufgaben.
Es gibt eine Lehrer- und eine Schüleransicht. Die Daten werden im
Browser-`localStorage` gespeichert, so dass die App ohne Server auskommt.

## Lokale Nutzung

1. Repository klonen
2. Einen beliebigen HTTP-Server im Projektordner starten, z.B. mit Python:
   ```
   python3 -m http.server
   ```
3. Die Seite `index.html` im Browser öffnen.

## Entwicklung

- Passwörter werden als SHA‑256 Hash geprüft und nicht im Klartext gespeichert.
- Ein Service Worker sorgt dafür, dass alle Seiten auch offline verfügbar sind.

