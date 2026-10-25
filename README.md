# TuS Brake Volleyball – Homepage

Statische Website (HTML/CSS/JS, keine Abhängigkeiten). Einfach `index.html` im Browser öffnen
oder den ganzen Ordner auf einen beliebigen Webspace hochladen.

## Seiten
- **Übersicht** – nächstes Spiel, alle Mannschaften mit Liga, Platz, Form, letzte Ergebnisse
- **Pokalspiele** (Kreis-, Bezirks- und WVV-Pokal) erscheinen mit Runde in allen Spiellisten, mit eigenem Filter
- **Hell/Dunkel** – Umschalter oben rechts; ohne Wahl gilt die Systemeinstellung
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
Auf diesem Rechner ist dafür ein systemd-User-Timer eingerichtet
(`~/.config/systemd/user/volleyball-aktualisieren.timer` und `.service`), der täglich um
6:00, 14:00 und 20:00 Uhr `scripts/cron_aktualisieren.sh` ausführt. War der Rechner zu der
Zeit aus, wird der Lauf nach dem nächsten Anmelden nachgeholt (`Persistent=true`). Das Skript
lädt die Daten neu und committet und pusht `data/spieldaten.js` nach GitHub, wenn es neue
Spieldaten gibt. GitHub Pages veröffentlicht die Seite danach automatisch. Die Ausgaben landen
in `logs/aktualisierung.log`.

Gepusht wird per SSH mit einem Deploy-Key (`~/.ssh/tus_brake_deploy`, Host-Alias
`github-tus-brake` in `~/.ssh/config`), damit der Timer nicht vom Schlüsselbund abhängt.

```bash
systemctl --user list-timers volleyball-aktualisieren.timer   # nächster Lauf
systemctl --user start volleyball-aktualisieren.service       # sofort ausführen
```

Schlägt ein Abruf fehl, bleibt die bisherige `data/spieldaten.js` unverändert und es wird nichts gepusht.

Live-Seite: https://dennisglowka37-tech.github.io/tus-brake-volleyball/

**Neue Saison:** In `scripts/daten_aktualisieren.py` die Liste `MANNSCHAFTEN`
(Liga-URL und Teamname), `POKALE` (Pokal-URLs) sowie `SAISON` anpassen.
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
