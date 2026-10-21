# TuS Brake Volleyball – Homepage

Statische Website (HTML/CSS/JS, keine Abhängigkeiten). Einfach `index.html` im Browser öffnen
oder den ganzen Ordner auf einen beliebigen Webspace hochladen.

## Seiten
- **Übersicht** – nächstes Spiel, alle Mannschaften mit Liga, Platz, Form, letzte Ergebnisse
- **Mannschaft** (z. B. `#/team/herren-1`) – Tabelle, nächstes Spiel mit Karte, alle Spiele, Training
- **Spielplan** – alle Spiele aller Teams nach Tagen, filterbar (Heim, Damen, Herren, Ergebnisse)
- **Hallen** – Heimhalle und alle Auswärtshallen mit Adresse und Routenlink
- **Training**, **Kontakt**

## Daten aktualisieren
Tabellen, Spiele, Ergebnisse und Hallen kommen aus dem
[WVV-Ergebnisdienst](https://ergebnisdienst.volleyball.nrw). Zum Aktualisieren:

```bash
python3 scripts/daten_aktualisieren.py
```

Das Skript schreibt `data/spieldaten.js` neu (nur Python-Standardbibliothek nötig).
Auf diesem Rechner ist dafür ein Cronjob eingerichtet (`crontab -l`), der täglich um
6:00 und 23:00 Uhr `scripts/cron_aktualisieren.sh` ausführt. Das Skript lädt die Daten neu
und committet und pusht `data/spieldaten.js` nach GitHub, wenn es neue Spieldaten gibt.
GitHub Pages veröffentlicht die Seite danach automatisch. Die Ausgaben landen in
`logs/aktualisierung.log`.

```
0 6,23 * * * /home/dennis/Dokumente/Volleyball/scripts/cron_aktualisieren.sh >> /home/dennis/Dokumente/Volleyball/logs/aktualisierung.log 2>&1
```

Schlägt ein Abruf fehl, bleibt die bisherige `data/spieldaten.js` unverändert und es wird nichts gepusht.

Live-Seite: https://dennisglowka37-tech.github.io/tus-brake-volleyball/

**Neue Saison:** In `scripts/daten_aktualisieren.py` die Liste `MANNSCHAFTEN`
(Liga-URL und Teamname) sowie `SAISON` anpassen.
**Trainingszeiten** stehen in `js/app.js` (`TRAININGSPLAN`).

## Struktur
```
index.html               Seitengerüst
css/style.css            Gestaltung (Vereinsfarben, Hell/Dunkel, mobil)
js/app.js                Darstellung aller Seiten
data/spieldaten.js       automatisch erzeugte Spieldaten
scripts/daten_aktualisieren.py
assets/                  Logo, Favicon
```
