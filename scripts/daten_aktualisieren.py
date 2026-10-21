#!/usr/bin/env python3
"""
Holt die aktuellen Tabellen, Spielpläne, Ergebnisse, Pokalspiele und Hallen
aller TuS-Brake-Mannschaften aus dem WVV-Ergebnisdienst (SAMS) und schreibt
sie nach data/spieldaten.js, das von der Homepage geladen wird.

Aufruf (aus dem Projektordner):
    python3 scripts/daten_aktualisieren.py

Neue Saison / andere Liga: einfach die Einträge in MANNSCHAFTEN anpassen.
Die Liga-URL findet man auf https://ergebnisdienst.volleyball.nrw
"""
import html
import json
import re
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

BASE = "https://ergebnisdienst.volleyball.nrw"
ERW = BASE + "/cms/home/erwachsene/"
SAISON = "2026/27"

# id, Anzeigename, Teamname im Ergebnisdienst, Liga-Seite
MANNSCHAFTEN = [
    {"id": "herren-1", "name": "1. Herren", "gruppe": "Herren", "team": "TuS Brake",
     "liga": ERW + "verbandsligen/vl_maenner/verbandsliga_4_maenner.xhtml"},
    {"id": "herren-2", "name": "2. Herren", "gruppe": "Herren", "team": "TuS Brake II",
     "liga": ERW + "bezirksligen/bezirksligen_maenner/bezirksliga_16_maenner.xhtml"},
    {"id": "herren-3", "name": "3. Herren", "gruppe": "Herren", "team": "TuS Brake III",
     "liga": ERW + "bezirksklassen/bezirksklassen_maenner/bezirksklasse_31_maenner.xhtml"},
    {"id": "herren-4", "name": "4. Herren", "gruppe": "Herren", "team": "TuS Brake IV",
     "liga": ERW + "bezirksklassen/bezirksklassen_maenner/bezirksklasse_32_maenner.xhtml"},
    {"id": "damen-1", "name": "1. Damen", "gruppe": "Damen", "team": "TuS Brake",
     "liga": ERW + "bezirksligen/bezirksligen_frauen/bezirksliga_16_frauen.xhtml"},
    {"id": "damen-2", "name": "2. Damen", "gruppe": "Damen", "team": "TuS Brake II",
     "liga": ERW + "bezirksligen/bezirksligen_frauen/bezirksliga_15_frauen.xhtml"},
    {"id": "damen-3", "name": "3. Damen", "gruppe": "Damen", "team": "TuS Brake III",
     "liga": ERW + "bezirksligen/bezirksligen_frauen/bezirksliga_16_frauen.xhtml"},
    {"id": "damen-4", "name": "4. Damen", "gruppe": "Damen", "team": "TuS Brake IV",
     "liga": ERW + "kreisligen/alle_kreisligen.xhtml?LeaguePresenter.matchSeriesId=116018721"},
]

POKAL = ERW + "pokal/"
# Pokalwettbewerbe, in denen Brake-Teams spielen (können). Spiele werden automatisch
# herausgefiltert; Wettbewerbe ohne Brake-Beteiligung tauchen auf der Seite nicht auf.
POKALE = [
    {"name": "Kreispokal Gütersloh/Bielefeld", "gruppe": "Damen",
     "url": POKAL + "kreispokal.xhtml?LeaguePresenter.matchSeriesId=116021652"},
    {"name": "Kreispokal Gütersloh/Bielefeld", "gruppe": "Herren",
     "url": POKAL + "kreispokal.xhtml?LeaguePresenter.matchSeriesId=116021644"},
    {"name": "Bezirkspokal Westfalen-Ost", "gruppe": "Damen",
     "url": POKAL + "bezirkspokal_w.-ost.xhtml?LeaguePresenter.matchSeriesId=116021158"},
    {"name": "Bezirkspokal Westfalen-Ost", "gruppe": "Herren",
     "url": POKAL + "bezirkspokal_w.-ost.xhtml?LeaguePresenter.matchSeriesId=116021135"},
    {"name": "WVV-Pokal", "gruppe": "Damen",
     "url": POKAL + "wvv_pokal_frauen.xhtml?LeaguePresenter.matchSeriesId=116021073"},
    {"name": "WVV-Pokal", "gruppe": "Herren",
     "url": POKAL + "wvv_pokal_maenner.xhtml?LeaguePresenter.matchSeriesId=116021102"},
]

ZIEL = Path(__file__).resolve().parent.parent / "data" / "spieldaten.js"


def laden(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (TuS Brake Homepage)",
                                               "Accept-Language": "de-DE,de;q=0.9"})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "ignore")


def text(s):
    s = re.sub(r"<script.*?</script>", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def zeilen(tabelle):
    for roh in re.findall(r"<tr[^>]*>(.*?)</tr>", tabelle, re.S):
        zellen = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", roh, re.S)
        yield roh, [text(z) for z in zellen]


def erste_tabelle(seite):
    t = re.findall(r'<table class="samsDataTable[^"]*">(.*?)</table>', seite, re.S)
    return t[0] if t else ""


def datum_iso(s):
    m = re.match(r"\w+, (\d\d)\.(\d\d)\.(\d\d), (\d\d):(\d\d)", s)
    if not m:
        return None
    d, mo, j, h, mi = m.groups()
    return f"20{j}-{mo}-{d}T{h}:{mi}"


def ergebnis(s):
    m = re.match(r"(\d+):(\d+) / (\d+):(\d+) \((.*)\)", s)
    if not m:
        return None
    saetze = [[int(a), int(b)] for a, b in re.findall(r"(\d+) : (\d+)", m.group(5))]
    return {"saetze": [int(m.group(1)), int(m.group(2))],
            "baelle": [int(m.group(3)), int(m.group(4))], "details": saetze}


def halle(lid, cache):
    if lid in cache:
        return cache[lid]
    seite = laden(f"{BASE}/popup/location/locationDetails.xhtml?locationId={lid}"
                  "&showVolleyballFields=true&hideHistoryBackButton=true")
    info = {"name": "", "strasse": "", "plz": "", "ort": "", "lat": None, "lng": None}
    # <p style="white-space: pre-wrap;"><strong>Name</strong><br />Straße\nPLZ Ort</p>
    m = re.search(r"<strong>(.*?)</strong><br\s*/?>(.*?)</p>", seite, re.S)
    if m:
        info["name"] = text(m.group(1))
        zeilen_ = [html.unescape(z).strip() for z in m.group(2).split("\n") if z.strip()]
        for z in zeilen_:
            a = re.match(r"(\d{5}) (.+)", z)
            if a:
                info["plz"], info["ort"] = a.groups()
            elif not info["strasse"]:
                info["strasse"] = z
    k = re.search(r"LatLng\(\s*([-\d.]+)\s*,\s*([-\d.]+)", seite)
    if k:
        info["lat"], info["lng"] = float(k.group(1)), float(k.group(2))
    cache[lid] = info
    return info


def spiele_aus_tabelle(tabelle, hallen):
    spiele = []
    kopf = None
    for roh, z in zeilen(tabelle):
        if z and z[0] == "Datum":
            kopf = z
            continue
        if not z or not datum_iso(z[0]):
            continue
        lid = re.search(r"locationId=(\d+)", roh)
        sg = z[kopf.index("Schiedsger.")] if kopf and "Schiedsger." in kopf else ""
        spiele.append({
            "datum": datum_iso(z[0]),
            "zeitOffen": "(*)" in z[0],
            "nr": z[1], "heim": z[2], "gast": z[3],
            "ergebnis": ergebnis(z[4]),
            "halle": halle(lid.group(1), hallen) if lid else None,
            "schiri": sg if sg not in ("-", "") else "",
        })
    return spiele


def pokal_laden(pokal, teams, hallen):
    """Nur die Spiele mit Brake-Beteiligung, Teamnamen auf die Liga-Kurznamen vereinheitlicht."""
    basis, q = pokal["url"].split("?")
    seite = laden(f"{basis}?LeaguePresenter.view=matches&{q}&playingScheduleMode=full")
    namen = {t["team"].lower(): t["kurz"] for t in teams if t["gruppe"] == pokal["gruppe"]}
    spiele = []
    # Jede Runde (Achtelfinale, Viertelfinale, …) steht in einem eigenen Block
    for block in seite.split('class="samsCompetitionScheduleGroup"')[1:]:
        runde = re.search(r'samsContentBoxHeader">(.*?)</div>', block, re.S)
        runde = text(runde.group(1)) if runde else ""
        for t in re.findall(r'<table class="samsDataTable[^"]*">(.*?)</table>', block, re.S):
            for sp in spiele_aus_tabelle(t, hallen):
                heim, gast = namen.get(sp["heim"].lower()), namen.get(sp["gast"].lower())
                if not (heim or gast):
                    continue
                sp["heim"], sp["gast"] = heim or sp["heim"], gast or sp["gast"]
                spiele.append({**sp, "runde": runde})
    return {"name": pokal["name"], "gruppe": pokal["gruppe"],
            "url": f"{basis}?LeaguePresenter.view=matches&{q}", "spiele": spiele}


def liga_laden(url, hallen):
    seite = laden(url)
    if "matchSeriesId=" in url:
        msid = url.split("matchSeriesId=")[1]
    else:
        msid = re.search(r"matchSeriesId=(\d+)", seite).group(1)
    basis = url.split("?")[0]
    q = f"LeaguePresenter.matchSeriesId={msid}"
    name = text(re.search(r'samsCmsComponentBlockHeader">(.*?)</h1>', seite, re.S).group(1))

    tab_seite = laden(f"{basis}?LeaguePresenter.view=resultTable&{q}")
    tabelle = []
    for roh, z in zeilen(erste_tabelle(tab_seite)):
        if not z or not z[0].isdigit():
            continue
        spans = [text(s) for s in re.findall(r"<span[^>]*>(.*?)</span>", roh, re.S)]
        status = z[2]
        tabelle.append({
            "platz": int(z[0]),
            "team": spans[0] if spans else z[1],
            "kurz": spans[1] if len(spans) > 1 else z[1],
            "status": ("auf" if "Aufstieg" in status else "rel-auf" if "△" in status
                       else "rel-ab" if "▽" in status else "ab" if "Abstieg" in status else ""),
            "spiele": int(z[3]), "siege": int(z[4]), "saetze": z[5], "punkte": int(z[6]),
        })

    sp_seite = laden(f"{basis}?LeaguePresenter.view=matches&{q}&playingScheduleMode=full")
    spiele = spiele_aus_tabelle(erste_tabelle(sp_seite), hallen)
    return {"name": name, "url": f"{basis}?LeaguePresenter.view=resultTable&{q}",
            "tabelle": tabelle, "spiele": spiele}


def main():
    hallen, ligen, teams = {}, {}, []
    for m in MANNSCHAFTEN:
        if m["liga"] not in ligen:
            print(f"Lade {m['liga']} …", file=sys.stderr)
            ligen[m["liga"]] = liga_laden(m["liga"], hallen)
        liga = ligen[m["liga"]]
        kurz = [t["kurz"] for t in liga["tabelle"]
                if m["team"].lower() in (t["team"].lower(), t["kurz"].lower())]
        if not kurz:
            print(f"WARNUNG: {m['team']} nicht in {liga['name']} gefunden", file=sys.stderr)
        teams.append({**{k: m[k] for k in ("id", "name", "gruppe", "team")},
                      "kurz": kurz[0] if kurz else m["team"],
                      "liga": list(ligen).index(m["liga"])})
    pokale = []
    for p in POKALE:
        print(f"Lade {p['name']} ({p['gruppe']}) …", file=sys.stderr)
        pokal = pokal_laden(p, teams, hallen)
        if pokal["spiele"]:
            pokale.append(pokal)
    daten = {
        "saison": SAISON,
        "stand": datetime.now().strftime("%Y-%m-%dT%H:%M"),
        "quelle": BASE,
        "ligen": list(ligen.values()),
        "teams": teams,
        "pokale": pokale,
    }
    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    ZIEL.write_text("// Automatisch erzeugt von scripts/daten_aktualisieren.py – nicht von Hand bearbeiten.\n"
                    "window.SPIELDATEN = " + json.dumps(daten, ensure_ascii=False, indent=1) + ";\n",
                    encoding="utf-8")
    print(f"Fertig: {ZIEL}", file=sys.stderr)


if __name__ == "__main__":
    main()
