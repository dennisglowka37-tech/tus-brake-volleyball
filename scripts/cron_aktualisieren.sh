#!/bin/sh
# Wird vom Cronjob aufgerufen: Spieldaten neu laden und bei Änderungen
# nach GitHub pushen (GitHub Pages veröffentlicht die Seite dann automatisch).
set -eu
cd "$(dirname "$0")/.."
export GIT_TERMINAL_PROMPT=0

echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
git pull --ff-only --quiet origin main

/usr/bin/python3 scripts/daten_aktualisieren.py

# Hat sich nur der Zeitstempel "stand" geändert, gibt es nichts Neues:
# Datei zurücksetzen statt zweimal täglich einen leeren Commit zu machen.
if git diff --quiet -I '"stand":' -- data/spieldaten.js; then
    git checkout -- data/spieldaten.js
    echo "Keine neuen Spieldaten."
    exit 0
fi

git add data/spieldaten.js
git commit --quiet -m "Spieldaten aktualisiert ($(date '+%d.%m.%Y %H:%M'))"
git push --quiet origin main
echo "Neue Spieldaten gepusht."
