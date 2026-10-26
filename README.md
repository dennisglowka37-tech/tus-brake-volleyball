# TuS Brake Volleyball – Homepage

Statische Website (HTML/CSS/JS, keine Abhängigkeiten). Einfach `index.html` im Browser öffnen
oder den ganzen Ordner auf einen beliebigen Webspace hochladen.

## Seiten
- **Übersicht** – nächstes Spiel, alle Mannschaften mit Liga, Platz, Form, letzte Ergebnisse
- **Pokalspiele** (Kreis-, Bezirks- und WVV-Pokal) erscheinen mit Runde in allen Spiellisten, mit eigenem Filter
- **Hell/Dunkel** – Umschalter oben rechts; ohne Wahl gilt die Systemeinstellung
- **Mannschaft** (z. B. `#/team/herren-1`) – Tabelle, nächstes Spiel mit Karte, alle Spiele, Training
- **Spielplan** – alle Spiele aller Teams nach Tagen, filterbar (Heim, Damen, Herren, Ergebnisse)
- **Historie** – Weg aller Mannschaften durch die Ligen seit 2022/23 und die Abschlussplatzierungen
  jeder Saison (Auf-/Abstieg, Relegation); jede Mannschaftsseite zeigt zusätzlich ihre bisherigen Saisons
- **Hallen** – Heimhalle und alle Auswärtshallen mit Adresse und Routenlink
- **Training**, **Kontakt**

## Daten aktualisieren
Tabellen, Spiele, Ergebnisse und Hallen kommen aus dem
[WVV-Ergebnisdienst](https://ergebnisdienst.volleyball.nrw). Zum Aktualisieren:

```bash
python3 scripts/daten_aktualisieren.py
```

Das Skript schreibt `data/spieldaten.js` neu (nur Python-Standardbibliothek nötig).

### Automatische Aktualisierung (zwei Rechner)
Auf zwei Rechnern läuft ein systemd-User-Timer
(`~/.config/systemd/user/volleyball-aktualisieren.timer` und `.service`), der
`scripts/cron_aktualisieren.sh` ausführt. Das Skript holt zuerst den Stand von GitHub
(`git pull --ff-only`), lädt die Daten neu und committet und pusht `data/spieldaten.js`, wenn
es neue Spieldaten gibt. GitHub Pages veröffentlicht die Seite danach automatisch. Hat der
andere Rechner die Daten schon gepusht, meldet das Skript nur „Keine neuen Spieldaten.“ War ein
Rechner zur geplanten Zeit aus, wird der Lauf nach dem nächsten Anmelden nachgeholt
(`Persistent=true`).

| | Main-PC | Laptop |
|---|---|---|
| Zeiten | 6:00, 14:00, 20:00 Uhr | 6:15, 14:15, 20:15 Uhr (versetzt, damit sich die Pushes nicht kreuzen) |
| Ordner | Arbeitskopie des Repos | eigener Klon `~/.local/share/tus-brake-aktualisierung` (getrennt von der Arbeitskopie in `~/Dokumente`, damit der Timer nichts Halbfertiges mitcommittet) |
| Log | `logs/aktualisierung.log` | `~/.local/share/tus-brake-aktualisierung/logs/aktualisierung.log` |
| SSH | Deploy-Key `~/.ssh/tus_brake_deploy` (Host-Alias `github-tus-brake` in `~/.ssh/config`) | persönlicher Schlüssel `~/.ssh/id_ed25519` ohne Passphrase |

Auf beiden Rechnern:

```bash
systemctl --user list-timers volleyball-aktualisieren.timer   # nächster Lauf
systemctl --user start volleyball-aktualisieren.service       # sofort ausführen
```

Schlägt ein Abruf fehl, bleibt die bisherige `data/spieldaten.js` unverändert und es wird nichts gepusht.

Live-Seite: https://dennisglowka37-tech.github.io/tus-brake-volleyball/

**Neue Saison:** In `scripts/daten_aktualisieren.py` die Liste `MANNSCHAFTEN`
(Liga-URL und Teamname), `POKALE` (Pokal-URLs) sowie `SAISON` anpassen.
**Trainingszeiten** stehen in `js/app.js` (`TRAININGSPLAN`).

## Historie aktualisieren
Die früheren Saisons kommen aus dem
[Archiv des Ergebnisdienstes](https://ergebnisdienst.volleyball.nrw/cms/home/archiv.xhtml)
(dort ab Saison 2022/23). `scripts/historie_laden.py` durchsucht alle Ligaebenen von der
Oberliga bis zur Kreisliga nach TuS-Brake-Mannschaften und schreibt `data/historie.js`.
Abgeschlossene Saisons ändern sich nicht mehr, darum läuft das nicht im Timer. Einmal im Jahr
nach Saisonende reicht, sobald der WVV die Saison ins Archiv übernommen hat:

```bash
python3 scripts/historie_laden.py          # lädt nur Saisons, die noch fehlen (je Saison ca. 2 Min.)
python3 scripts/historie_laden.py --alle   # alles neu laden
```

Die laufende Saison zeigt die Historie-Seite direkt aus `data/spieldaten.js`. Die Mannschaften
werden pro Saison nach dem Teamnamen im WVV nummeriert („TuS Brake II“ = 2. Damen/Herren).

## Struktur
```
index.html               Seitengerüst
css/style.css            Gestaltung (Vereinsfarben, Hell/Dunkel, mobil)
js/app.js                Darstellung aller Seiten
data/spieldaten.js       automatisch erzeugte Spieldaten (laufende Saison)
data/historie.js         automatisch erzeugte Platzierungen früherer Saisons
scripts/daten_aktualisieren.py
scripts/cron_aktualisieren.sh   vom Timer aufgerufen: aktualisieren, committen, pushen
scripts/historie_laden.py
assets/                  Logo, Favicon
```
