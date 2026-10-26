#!/usr/bin/env python3
"""
Sucht im Archiv des WVV-Ergebnisdienstes alle abgeschlossenen Saisons nach
TuS-Brake-Mannschaften (Damen und Herren, alle Ligaebenen) und schreibt die
Abschlussplatzierungen nach data/historie.js (Seite "Historie").

Aufruf (aus dem Projektordner):
    python3 scripts/historie_laden.py          # nur Saisons, die noch fehlen
    python3 scripts/historie_laden.py --alle   # alles neu laden

Abgeschlossene Saisons ändern sich nicht mehr. Es reicht also, das Skript einmal
im Jahr nach Saisonende laufen zu lassen, sobald die Saison im Archiv steht.
"""
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from daten_aktualisieren import BASE, erste_tabelle, laden, text, zeilen

ARCHIV = BASE + "/cms/home/archiv/erwachsene/"
EBENEN = ["oberligen", "verbandsligen", "landesligen", "bezirksligen", "bezirksklassen", "kreisligen"]
VEREIN = re.compile(r"^TuS Brake(?: (?:[IVX]+|\d+))?$", re.I)

ZIEL = Path(__file__).resolve().parent.parent / "data" / "historie.js"


def laden_mit(url, pruefen, versuche=4):
    """Der Ergebnisdienst liefert unter Last manchmal unvollständige Seiten – dann nochmal."""
    for i in range(versuche):
        seite = laden(url)
        if pruefen(seite):
            return seite
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"Seite unvollständig: {url}")


def saison_seiten():
    """{"2025/26": [Archivseite je Ligaebene, …], …}"""
    saisons = {}
    for ebene in EBENEN:
        # Die Übersichtsseite leitet auf die neueste Saison weiter, die alle Saisons verlinkt
        weiter = re.search(rf"/cms/home/archiv/erwachsene/{ebene}/saison_\d+_\d+\.xhtml",
                           laden(f"{ARCHIV}{ebene}.xhtml"))
        if not weiter:
            print(f"WARNUNG: kein Archiv für {ebene}", file=sys.stderr)
            continue
        seite = laden(BASE + weiter.group(0))
        for pfad, a, b in sorted(set(re.findall(
                rf"(/cms/home/archiv/erwachsene/{ebene}/saison_(\d+)_(\d+)\.xhtml)", seite))):
            saisons.setdefault(f"{a}/{b}", []).append(pfad)
    return saisons


def ligen_auf(pfad):
    """[(Liganame, Tabellen-URL), …] einer Archivseite"""
    seite = laden_mit(BASE + pfad, lambda s: "samsPublicMatchSeriesListMatchSeriesName" in s)
    ligen = []
    for block in seite.split('class="samsPublicMatchSeriesListMatchSeriesName"')[1:]:
        name = text(block[block.find(">") + 1:block.find("</div>")])
        msid = re.search(r"view=resultTable&amp;LeaguePresenter\.matchSeriesId=(\d+)", block)
        if msid:
            ligen.append((name, f"{BASE}{pfad}?LeaguePresenter.view=resultTable"
                                f"&LeaguePresenter.matchSeriesId={msid.group(1)}"))
    return ligen


def gruppe_von(liga):
    if re.search(r"Frauen|Damen|weiblich", liga, re.I):
        return "Damen"
    if re.search(r"Männer|Herren|männlich", liga, re.I):
        return "Herren"
    return "Mixed"


def brake_in(liga):
    """Alle Brake-Zeilen einer Abschlusstabelle"""
    name, url = liga
    treffer = []
    zeilen_ = [(roh, z) for roh, z in zeilen(erste_tabelle(laden_mit(url, lambda s: erste_tabelle(s) or "keine Daten vorhanden" in s))) if z and z[0].isdigit()]
    for roh, z in zeilen_:
        spans = [text(s) for s in re.findall(r"<span[^>]*>(.*?)</span>", roh, re.S)]
        team = spans[0] if spans else z[1]
        if not VEREIN.match(team):
            continue
        status = z[2]
        treffer.append({
            "team": team, "kurz": spans[1] if len(spans) > 1 else z[1],
            "gruppe": gruppe_von(name), "liga": name, "url": url,
            "platz": int(z[0]), "von": len(zeilen_),
            "status": ("auf" if "Aufstieg" in status else "rel-auf" if "△" in status
                       else "rel-ab" if "▽" in status else "ab" if "Abstieg" in status else ""),
            "spiele": int(z[3]), "siege": int(z[4]), "saetze": z[5], "punkte": int(z[6]),
        })
    return treffer


def saison_laden(saison, seiten, pool):
    ligen = [l for ls in pool.map(ligen_auf, seiten) for l in ls]
    print(f"Saison {saison}: durchsuche {len(ligen)} Ligen …", file=sys.stderr)
    eintraege = [t for ts in pool.map(brake_in, ligen) for t in ts]
    # Relegationsrunden an die Ligaplatzierung derselben Mannschaft hängen
    teams = [t for t in eintraege if not t["liga"].startswith("Relegation")]
    for r in (t for t in eintraege if t["liga"].startswith("Relegation")):
        haupt = next((t for t in teams if t["team"] == r["team"] and t["gruppe"] == r["gruppe"]), None)
        if haupt:
            haupt.setdefault("relegation", []).append(
                {k: r[k] for k in ("liga", "url", "platz", "von")})
        else:
            teams.append(r)
    return {"saison": saison, "teams": teams}


def main():
    bisher = {}
    if ZIEL.exists() and "--alle" not in sys.argv:
        roh = ZIEL.read_text(encoding="utf-8")
        bisher = {s["saison"]: s for s in json.loads(roh[roh.index("{"):roh.rindex("}") + 1])["saisons"]}

    with ThreadPoolExecutor(3) as pool:
        saisons = dict(bisher)
        for saison, seiten in saison_seiten().items():
            if saison in bisher:
                print(f"Saison {saison}: schon vorhanden", file=sys.stderr)
                continue
            saisons[saison] = saison_laden(saison, seiten, pool)
            for t in saisons[saison]["teams"]:
                print(f"  {t['gruppe']:6} {t['team']:15} {t['platz']:>2}/{t['von']:<2} {t['liga']}",
                      file=sys.stderr)

    daten = {"stand": datetime.now().strftime("%Y-%m-%dT%H:%M"),
             "saisons": sorted(saisons.values(), key=lambda s: s["saison"], reverse=True)}
    ZIEL.write_text("// Automatisch erzeugt von scripts/historie_laden.py – nicht von Hand bearbeiten.\n"
                    "window.HISTORIE = " + json.dumps(daten, ensure_ascii=False, indent=1) + ";\n",
                    encoding="utf-8")
    print(f"Fertig: {ZIEL}", file=sys.stderr)


if __name__ == "__main__":
    main()
