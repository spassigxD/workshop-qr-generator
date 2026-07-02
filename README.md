# Workshop QR-Code Generator

Eine kleine, eigenständige Web-App, um für ausgewählte **Workshops** und **Bezirke**
automatisch URLs und QR-Codes zu erzeugen und diese druckfertig (A4, mit Schnittmarken)
auszugeben.

Die App läuft komplett **im Browser** – es wird kein Server und keine Internetverbindung
benötigt. Alle Daten (Workshops, Bezirke, Einstellungen) werden lokal im Browser gespeichert.

## Starten

Einfach die Datei `index.html` im Browser öffnen (Doppelklick genügt).

Alternativ über einen lokalen Webserver, z. B.:

```bash
python3 -m http.server 8000
```

und dann http://localhost:8000 aufrufen.

## Funktionen

- **Auswahl per Mehrfachauswahl:** Beliebig viele Workshops **und** Bezirke ankreuzen.
  Für **jede Kombination** (Workshop × Bezirk) wird ein QR-Code erzeugt.
- **URL-Aufbau:** Basis-URL + `?workshop=<Name>&area=<Bezirk>`, wobei die Namen
  URL-kodiert werden (z. B. Leerzeichen → `%20`, `ö` → `%C3%B6`).
- **Verwalten:** Neue Workshops und Bezirke hinzufügen oder löschen. Änderungen
  bleiben dank Browser-Speicher erhalten.
- **Einstellungen:** Basis-URL sowie die Parameternamen (`workshop` / `area`) sind
  anpassbar.
- **Drucken:** Sauberes A4-Layout mit Schnittmarken über den Browser-Druckdialog
  (dort auch „Als PDF sichern“ möglich).
- **PDF herunterladen:** Erzeugt direkt eine PDF-Datei (`workshop-qr-codes.pdf`).
- **CSV exportieren:** Liste aller Kombinationen mit Spalten `workshop;area;url`
  (Semikolon-getrennt, mit BOM für Excel).

## Standard-Daten

**Workshops:**
Info – WS- Janusch VS · Info – WS - MS · Gefühle BiB · Tonnenseite BiB

**Bezirke:**
Bruck-Mürzzuschlag · Deutschlandsberg · Graz-Umgebung · Graz ·
Hartberg-Fürstenfeld · Leibnitz · Liezen · Murtal · Murau · Weiz ·
Voitsberg · Südoststeiermark

**Basis-URL:** `https://www.umbuzoo.de/d/6a452bafc15cac0dea94c72e/`

Mit dem Button **„Alles auf Standard zurücksetzen“** (unter *Einstellungen*) lassen sich
alle Daten wieder auf diese Vorgaben setzen.

## Projektstruktur

```
index.html             Oberfläche
css/styles.css         Gestaltung im Umbuzoo-Look inkl. Druck-Layout (A4 + Schnittmarken)
js/app.js              Logik (URL-Aufbau, QR-Erzeugung, Druck, PDF, CSV)
assets/umbuzoo-logo.svg  Umbuzoo-Logo (Header/Favicon)
libs/qrcode.min.js     QR-Code-Erzeugung (qrcode-generator, lokal)
libs/jspdf.umd.min.js  PDF-Erzeugung (jsPDF, lokal)
```

## Design

Das Erscheinungsbild ist an [umbuzoo.de](https://www.umbuzoo.de) angelehnt: weißer
Header mit Umbuzoo-Logo, Schriftart *Open Sans*, Navy `#143b51` und Akzentblau
`#1570a6`. Die Schrift *Open Sans* wird von Google Fonts geladen; ohne
Internetverbindung greift automatisch die System-Schriftart – die App bleibt also
voll offline-nutzbar.

## Hinweise

- Die QR-Codes werden für die Bildschirm-/Druckansicht als scharfe **SVG-Grafik**
  gerendert und für den PDF-Export als hochauflösendes PNG.
- Beim Drucken die Option „Hintergrundgrafiken“ ggf. nicht nötig – die Codes sind
  reines Schwarz auf Weiß.
