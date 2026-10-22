/* TuS Brake Volleyball – Homepage
 * Rendert alle Seiten aus window.SPIELDATEN (data/spieldaten.js).
 * Navigation über den Hash: #/, #/team/<id>, #/spielplan, #/hallen, #/training, #/kontakt
 */
(function () {
  "use strict";

  const D = window.SPIELDATEN;
  const main = document.getElementById("inhalt");

  // Trainingsplan (Quelle: tus-brake.de, Stand August 2026)
  const SPORTHALLE = "Sporthalle Brake";
  const MILSE = "Turnhalle Milse";
  const WALDHOF = "Gymnasium Am Waldhof";
  const TRAININGSBEREICHE = ["Damen", "Herren", "Jugend", "Hobbys & Mixed"];
  const TRAININGSPLAN = [
    { bereich: "Damen", gruppe: "1. Damen", team: "damen-1", zeiten: [["Mo", "18:45–20:15", SPORTHALLE], ["Mi", "20:15–22:00", SPORTHALLE]] },
    { bereich: "Damen", gruppe: "2. Damen", team: "damen-2", zeiten: [["Mo", "18:45–20:15", SPORTHALLE], ["Fr", "20:15–22:00", SPORTHALLE]] },
    { bereich: "Damen", gruppe: "3. Damen", team: "damen-3", zeiten: [["Mo", "20:15–22:00", SPORTHALLE], ["Fr", "19:00–20:30", SPORTHALLE]] },
    { bereich: "Damen", gruppe: "4. Damen", team: "damen-4", zeiten: [["Mo", "17:15–18:45", SPORTHALLE], ["Fr", "19:00–20:30", SPORTHALLE]] },
    { bereich: "Damen", gruppe: "4. Damen / Perspektivgruppe", team: "damen-4", zeiten: [["Sa", "11:30–13:00", MILSE]] },
    { bereich: "Herren", gruppe: "1. Herren", team: "herren-1", zeiten: [["Mo", "20:20–22:00", SPORTHALLE], ["Fr", "20:30–22:00", SPORTHALLE]] },
    { bereich: "Herren", gruppe: "2. Herren", team: "herren-2", zeiten: [["Di", "20:00–22:00", WALDHOF], ["Fr", "20:30–22:00", SPORTHALLE]] },
    { bereich: "Jugend", gruppe: "U15 / U16 / U18 männlich", zeiten: [["Mo", "17:15–18:45", SPORTHALLE], ["Fr", "19:00–20:30", MILSE]] },
    { bereich: "Jugend", gruppe: "U13 / U14 mixed", zeiten: [["Fr", "16:00–17:00", SPORTHALLE], ["Sa", "10:00–11:30", MILSE]] },
    { bereich: "Jugend", gruppe: "U12 / U13 mixed", zeiten: [["Fr", "16:00–17:00", SPORTHALLE]] },
    { bereich: "Jugend", gruppe: "Minis (Grundschulkinder)", zeiten: [["Fr", "16:00–17:00", SPORTHALLE]] },
    { bereich: "Hobbys & Mixed", gruppe: "Hobbys", zeiten: [["Mo", "20:30–22:00", SPORTHALLE], ["Mi", "20:00–22:00", MILSE]] },
    { bereich: "Hobbys & Mixed", gruppe: "Leistungsmixed", zeiten: [["Mi", "20:15–22:00", SPORTHALLE]] },
  ];

  const HEIMHALLE_NAME = "Grundschule Brake";

  /* ---------- Hilfsfunktionen ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const datum = (iso) => new Date(iso);
  const TAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const TAGE_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const zwei = (n) => String(n).padStart(2, "0");
  const tagKurz = (d) => `${TAGE[d.getDay()]}, ${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.`;
  const tagLang = (d) => `${TAGE_LANG[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`;
  // 00:00 steht im Ergebnisdienst für "Uhrzeit noch nicht festgelegt"
  const uhr = (d) => (d.getHours() || d.getMinutes() ? `${zwei(d.getHours())}:${zwei(d.getMinutes())} Uhr` : "Uhrzeit offen");
  const tagesbeginn = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Pokalspiele ohne Uhrzeit haben im Ergebnisdienst nur einen Stichtag ("zu spielen bis")
  const terminOffen = (s) => s.pokal && !s.ergebnis && !s.d.getHours() && !s.d.getMinutes();
  const terminKurz = (s) => (terminOffen(s)
    ? { tag: `bis ${tagKurz(s.d)}`, zeit: "Termin offen" }
    : { tag: tagKurz(s.d), zeit: `${s.zeitOffen ? "ca. " : ""}${uhr(s.d)}` });
  const terminLang = (s) => (terminOffen(s)
    ? `Termin noch offen – zu spielen bis ${tagLang(s.d)}`
    : `${tagLang(s.d)}, ${s.zeitOffen ? "ca. " : ""}${uhr(s.d)}`);

  function relativ(d) {
    const tage = Math.round((tagesbeginn(d) - tagesbeginn(new Date())) / 864e5);
    if (tage === 0) return "Heute";
    if (tage === 1) return "Morgen";
    if (tage > 1) return `In ${tage} Tagen`;
    return "";
  }

  const teamById = (id) => D.teams.find((t) => t.id === id);
  const ligaVon = (team) => D.ligen[team.liga];

  // Alle Liga- und Pokalspiele einer Mannschaft, angereichert aus Sicht von TuS Brake
  function spieleVon(team, { mitPokal = true } = {}) {
    const liga = ligaVon(team);
    const wettbewerbe = [{ name: liga.name, spiele: liga.spiele, pokal: false }];
    if (mitPokal) {
      (D.pokale || []).filter((p) => p.gruppe === team.gruppe)
        .forEach((p) => wettbewerbe.push({ name: p.name, spiele: p.spiele, pokal: true }));
    }
    return wettbewerbe.flatMap((w) => w.spiele
      .filter((s) => s.heim === team.kurz || s.gast === team.kurz)
      .map((s) => {
        const heim = s.heim === team.kurz;
        const e = s.ergebnis;
        return {
          ...s, team, heim, d: datum(s.datum), wettbewerb: w.name, pokal: w.pokal,
          gegner: heim ? s.gast : s.heim,
          // In unteren Ligen wird an Spieltagen oft in fremden Hallen gespielt –
          // "Heimspiel" heißt hier: Spiel in unserer eigenen Halle.
          zuhause: s.halle ? s.halle.name === HEIMHALLE_NAME : heim,
          sieg: e ? (heim ? e.saetze[0] > e.saetze[1] : e.saetze[1] > e.saetze[0]) : null,
        };
      }))
      .sort((a, b) => a.d - b.d);
  }
  const heuteStart = tagesbeginn(new Date());
  const istKommend = (s) => !s.ergebnis && s.d >= heuteStart;
  // Vereinsinterne Duelle (z. B. 1. gegen 3. Damen) nur einmal aufführen
  function alleSpiele() {
    const gesehen = new Set();
    return D.teams.flatMap(spieleVon)
      .filter((s) => { const k = `${s.wettbewerb}-${s.team.gruppe}-${s.nr}`; return !gesehen.has(k) && gesehen.add(k); })
      .sort((a, b) => a.d - b.d);
  }

  function tabellenzeile(team) {
    return ligaVon(team).tabelle.find((z) => z.kurz === team.kurz || z.team === team.team);
  }
  const teamsSortiert = () => [...D.teams].sort((a, b) => (a.gruppe === b.gruppe ? 0 : a.gruppe === "Damen" ? -1 : 1));

  function routeLink(h) {
    if (!h) return "#";
    const ziel = h.lat ? `${h.lat},${h.lng}` : encodeURIComponent(`${h.name}, ${h.strasse}, ${h.plz} ${h.ort}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${ziel}`;
  }
  function kartenEmbed(h) {
    if (!h || !h.lat) return "";
    const dx = 0.012, dy = 0.006;
    const bbox = [h.lng - dx, h.lat - dy, h.lng + dx, h.lat + dy].join(",");
    return `<iframe class="karte-map" loading="lazy" title="Karte: ${esc(h.name)}"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${h.lat},${h.lng}"></iframe>`;
  }
  const adresse = (h) => (h ? `${esc(h.strasse)}, ${esc(h.plz)} ${esc(h.ort)}` : "");

  /* ---------- Bausteine ---------- */
  function paarung(s) {
    const wir = `<span class="brake">${esc(s.team.kurz)}</span>`;
    const die = `<span class="gegner">${esc(s.gegner)}</span>`;
    return s.heim ? `${wir} – ${die}` : `${die} – ${wir}`;
  }

  function ergebnisBadge(s) {
    if (!s.ergebnis) {
      return s.d < heuteStart ? `<span class="ergebnis ergebnis--neutral" title="Ergebnis noch nicht gemeldet">–:–</span>` : "";
    }
    const [h, g] = s.ergebnis.saetze;
    const klasse = s.sieg ? "sieg" : "niederlage";
    return `<span class="ergebnis ergebnis--${klasse}" title="${s.sieg ? "Sieg" : "Niederlage"}">${h}:${g}</span>`;
  }
  const satzDetails = (s) => (s.ergebnis ? `<span class="saetze">${s.ergebnis.details.map((x) => x.join(":")).join(" · ")}</span>` : "");

  function spielZeile(s, { mitTeam = true } = {}) {
    const h = s.halle;
    const termin = terminKurz(s);
    const ort = h
      ? `<div class="spiel__ort">📍 ${esc(h.name)}, ${esc(h.ort)} · <a href="${routeLink(h)}" target="_blank" rel="noopener">Route</a></div>`
      : "";
    return `<li class="spiel">
      <div class="spiel__datum"><strong>${termin.tag}</strong><span>${termin.zeit}</span></div>
      <div class="spiel__mitte">
        ${mitTeam || s.pokal ? `<a class="spiel__team" href="#/team/${s.team.id}">${s.pokal ? `<span class="pokal-marke">Pokal</span>` : ""}${mitTeam ? `${esc(s.team.name)} · ` : ""}${esc(s.wettbewerb)}${s.runde ? ` · ${esc(s.runde)}` : ""}</a>` : ""}
        <div class="spiel__paarung">${paarung(s)}</div>
        ${!s.ergebnis ? ort : ""}
      </div>
      <div class="spiel__rechts">
        ${s.ergebnis ? ergebnisBadge(s) + satzDetails(s) : `<span class="marke-ha ${s.zuhause ? "marke-ha--heim" : ""}">${s.zuhause ? "Heim" : "Auswärts"}</span>${ergebnisBadge(s)}`}
      </div>
    </li>`;
  }
  const spielListe = (liste, opt) =>
    liste.length ? `<ul class="spiele">${liste.map((s) => spielZeile(s, opt)).join("")}</ul>` : `<p class="leer">Keine Spiele vorhanden.</p>`;

  function formPunkte(team, n = 5) {
    const letzte = spieleVon(team, { mitPokal: false }).filter((s) => s.ergebnis).slice(-n);
    if (!letzte.length) return `<span class="form__label">Noch keine Ergebnisse</span>`;
    return `<span class="form__label">Form</span>` + letzte
      .map((s) => `<span class="form__punkt form__punkt--${s.sieg ? "s" : "n"}" title="${tagKurz(s.d)} ${esc(s.gegner)}: ${s.ergebnis.saetze.join(":")}">${s.sieg ? "S" : "N"}</span>`)
      .join("");
  }

  function platzBox(team) {
    const z = tabellenzeile(team);
    const n = ligaVon(team).tabelle.length;
    if (!z) return "";
    const st = z.status === "auf" ? "platz--auf" : z.status === "ab" ? "platz--ab" : "";
    return `<div class="platz ${st}"><strong>${z.platz}.</strong><span>von ${n}</span></div>`;
  }

  function tabelleHTML(team) {
    const liga = ligaVon(team);
    const zeilen = liga.tabelle.map((z) => {
      const wir = z.kurz === team.kurz;
      const verloren = z.spiele - z.siege;
      return `<tr class="${z.status ? "st-" + z.status : ""} ${wir ? "ist-wir" : ""}">
        <td class="pl">${z.platz}</td>
        <td><span class="langname">${esc(z.team)}</span><span class="kurzname">${esc(z.kurz)}</span></td>
        <td class="z">${z.spiele}</td>
        <td class="z opt">${z.siege}</td>
        <td class="z opt">${verloren}</td>
        <td class="z">${esc(z.saetze)}</td>
        <td class="r pkt">${z.punkte}</td>
      </tr>`;
    }).join("");
    return `<div class="karte">
      <div class="tabelle-wrap"><table class="tabelle">
        <thead><tr><th>Pl.</th><th>Mannschaft</th><th class="z">Sp.</th><th class="z opt">S</th><th class="z opt">N</th><th class="z">Sätze</th><th class="r">Pkt.</th></tr></thead>
        <tbody>${zeilen}</tbody>
      </table></div>
      <div class="legende">
        <span><i style="background:var(--auf)"></i>Aufstieg</span>
        <span><i style="background:var(--auf);opacity:.45"></i>Relegation (Aufstieg)</span>
        <span><i style="background:var(--ab);opacity:.45"></i>Relegation (Abstieg)</span>
        <span><i style="background:var(--ab)"></i>Abstieg</span>
      </div>
    </div>`;
  }

  /* ---------- Seiten ---------- */
  function seiteStart() {
    const alle = alleSpiele();
    const kommend = alle.filter(istKommend);
    const ergebnisse = alle.filter((s) => s.ergebnis).reverse();
    const naechstes = kommend[0];
    const heimspiele = kommend.filter((s) => s.zuhause).length;
    const siege = alle.filter((s) => s.sieg === true).length;

    const naechstesHTML = naechstes ? `
      <div class="naechstes">
        <div class="naechstes__label"><span>Nächstes Spiel</span><span class="naechstes__countdown">${relativ(naechstes.d)}</span></div>
        <div class="naechstes__team"><a href="#/team/${naechstes.team.id}">${esc(naechstes.team.name)}</a> · ${esc(naechstes.wettbewerb)}${naechstes.runde ? ` · ${esc(naechstes.runde)}` : ""}</div>
        <div class="naechstes__paarung">
          <div class="${naechstes.heim ? "ist-brake" : ""}">${esc(naechstes.heim ? naechstes.team.kurz : naechstes.gegner)}</div>
          <span class="vs">VS</span>
          <div class="${naechstes.heim ? "" : "ist-brake"}">${esc(naechstes.heim ? naechstes.gegner : naechstes.team.kurz)}</div>
        </div>
        <div class="naechstes__info">
          <span>${terminLang(naechstes)}</span>
          ${naechstes.halle ? `<span>📍 ${esc(naechstes.halle.name)} · ${adresse(naechstes.halle)}</span>` : ""}
        </div>
        <div class="naechstes__aktionen">
          ${naechstes.halle ? `<a class="knopf knopf--gelb" href="${routeLink(naechstes.halle)}" target="_blank" rel="noopener">Route planen</a>` : ""}
          <a class="knopf knopf--hell" href="#/spielplan">Alle Spiele</a>
        </div>
      </div>` : `<div class="naechstes"><div class="naechstes__label">Aktuell sind keine Spiele angesetzt.</div></div>`;

    const gruppen = ["Damen", "Herren"].map((g) => `
      <h3 class="gruppe-titel">${g}</h3>
      <div class="raster">${D.teams.filter((t) => t.gruppe === g).map(teamKarte).join("")}</div>`).join("");

    return `
      <section class="hero">
        <div class="hero__innen">
          <div>
            <div class="hero__kicker">Saison ${esc(D.saison)}</div>
            <h1>Volleyball in Bielefeld-Brake</h1>
            <p>Ligen, Tabellen, Ergebnisse und die nächsten Spiele aller Damen- und Herrenmannschaften des TuS Brake – auf einen Blick.</p>
            <div class="hero__zahlen">
              <div><strong>${D.teams.length}</strong><span>Mannschaften im Ligabetrieb</span></div>
              <div><strong>${heimspiele}</strong><span>Heimspiele noch offen</span></div>
              <div><strong>${siege}</strong><span>Siege diese Saison</span></div>
            </div>
          </div>
          ${naechstesHTML}
        </div>
      </section>
      <div class="seite">
        <section class="abschnitt">
          <div class="abschnitt__kopf"><h2>Unsere Mannschaften</h2></div>
          ${gruppen}
        </section>
        <section class="abschnitt zweispaltig">
          <div>
            <div class="abschnitt__kopf"><h2>Nächste Spiele</h2><a href="#/spielplan">Ganzer Spielplan →</a></div>
            <div class="karte">${spielListe(kommend.slice(0, 8))}</div>
          </div>
          <div>
            <div class="abschnitt__kopf"><h2>Letzte Ergebnisse</h2></div>
            <div class="karte">${spielListe(ergebnisse.slice(0, 8))}</div>
          </div>
        </section>
      </div>`;
  }

  function teamKarte(team) {
    const z = tabellenzeile(team);
    const next = spieleVon(team).find(istKommend);
    return `<a class="karte team-karte" href="#/team/${team.id}">
      <div class="team-karte__kopf">
        <div><h3>${esc(team.name)}</h3><div class="team-karte__liga">${esc(ligaVon(team).name)}</div></div>
        ${platzBox(team)}
      </div>
      ${z ? `<div class="team-karte__werte"><span><b>${z.punkte}</b> Punkte</span><span><b>${z.siege}:${z.spiele - z.siege}</b> Spiele</span><span><b>${esc(z.saetze)}</b> Sätze</span></div>` : ""}
      <div class="form">${formPunkte(team)}</div>
      <div class="team-karte__next">${next
        ? `Nächstes Spiel: <b>${terminKurz(next).tag}</b> gegen <b>${esc(next.gegner)}</b>${next.pokal ? " (Pokal)" : ""}`
        : "Keine weiteren Spiele angesetzt"}</div>
    </a>`;
  }

  function seiteTeam(id) {
    const team = teamById(id);
    if (!team) return seiteNichtGefunden();
    const liga = ligaVon(team);
    const z = tabellenzeile(team);
    const spiele = spieleVon(team);
    const kommend = spiele.filter(istKommend);
    const pokal = spiele.filter((s) => s.pokal);
    const next = kommend[0];
    const training = TRAININGSPLAN.filter((t) => t.team === team.id);

    const nextHTML = next ? `
      <div class="karte">
        <div class="halle-kopf">
          <div class="naechstes__label" style="color:var(--text-2)"><span>Nächstes Spiel</span><span style="color:var(--akzent)">${relativ(next.d)}</span></div>
          <h3 style="margin-top:8px">${next.pokal ? `${esc(next.runde || "Pokalspiel")}` : next.zuhause ? "Heimspiel" : "Auswärtsspiel"} gegen ${esc(next.gegner)}</h3>
          ${next.pokal ? `<p class="hinweis" style="margin:2px 0 0">${esc(next.wettbewerb)}</p>` : ""}
          <p>${terminLang(next)}${next.halle ? `<br>📍 <b>${esc(next.halle.name)}</b><br>${adresse(next.halle)}` : ""}</p>
          ${next.halle ? `<a class="knopf knopf--rand" href="${routeLink(next.halle)}" target="_blank" rel="noopener">Route planen ↗</a>` : ""}
        </div>
        ${kartenEmbed(next.halle)}
      </div>` : `<div class="karte"><p class="leer">Aktuell ist kein weiteres Spiel angesetzt.</p></div>`;

    const trainingHTML = training.length
      ? `<ul class="info-liste">${training.flatMap((t) => t.zeiten.map(([tag, zeit, ort]) => `<li><b>${tag} ${zeit} Uhr</b><span>${esc(ort)}</span></li>`)).join("")}</ul>`
      : `<p class="leer">Trainingszeiten bitte bei der <a href="#/kontakt">Abteilungsleitung</a> erfragen.</p>`;

    main.innerHTML = `
      <section class="team-kopf">
        <div class="team-kopf__innen">
          <div>
            <div class="team-kopf__kicker">${esc(team.gruppe)} · Saison ${esc(D.saison)}</div>
            <h1>${esc(team.name)}</h1>
            <div class="team-kopf__liga">${esc(liga.name)} · <a href="${esc(liga.url)}" target="_blank" rel="noopener">beim WVV ansehen ↗</a></div>
          </div>
          ${z ? `<div class="kennzahlen">
            <div class="kennzahl"><strong>${z.platz}.</strong><span>Platz von ${liga.tabelle.length}</span></div>
            <div class="kennzahl"><strong>${z.punkte}</strong><span>Punkte</span></div>
            <div class="kennzahl"><strong>${z.siege}:${z.spiele - z.siege}</strong><span>Siege : Niederl.</span></div>
            <div class="kennzahl"><strong>${esc(z.saetze)}</strong><span>Sätze</span></div>
          </div>` : ""}
        </div>
      </section>
      <div class="seite">
        <section class="abschnitt zweispaltig zweispaltig--breit-links">
          <div>
            <div class="abschnitt__kopf"><h2>Tabelle</h2><span class="hinweis">${esc(liga.name)}</span></div>
            ${tabelleHTML(team)}
          </div>
          <div>
            <div class="abschnitt__kopf"><h2>Als Nächstes</h2></div>
            ${nextHTML}
          </div>
        </section>
        <section class="abschnitt">
          <div class="abschnitt__kopf"><h2>Spiele</h2><div class="form">${formPunkte(team)}</div></div>
          <div class="tabs" role="group" aria-label="Spiele filtern">
            <button type="button" data-filter="kommend" aria-pressed="true">Kommende (${kommend.length})</button>
            <button type="button" data-filter="ergebnisse" aria-pressed="false">Ergebnisse (${spiele.filter((s) => s.ergebnis).length})</button>
            ${pokal.length ? `<button type="button" data-filter="pokal" aria-pressed="false">Pokal (${pokal.length})</button>` : ""}
            <button type="button" data-filter="alle" aria-pressed="false">Alle (${spiele.length})</button>
          </div>
          <div class="karte" id="team-spiele"></div>
        </section>
        <section class="abschnitt">
          <div class="abschnitt__kopf"><h2>Training</h2></div>
          <div class="karte">${trainingHTML}</div>
        </section>
      </div>`;

    const ziel = document.getElementById("team-spiele");
    const zeige = (f) => {
      const liste = f === "kommend" ? kommend : f === "ergebnisse" ? spiele.filter((s) => s.ergebnis).reverse()
        : f === "pokal" ? pokal : spiele;
      ziel.innerHTML = spielListe(liste, { mitTeam: false });
    };
    filterKnoepfe(main.querySelector(".tabs"), zeige);
    zeige("kommend");
  }

  function filterKnoepfe(gruppe, beiWahl) {
    gruppe.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-filter]");
      if (!b) return;
      gruppe.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      beiWahl(b.dataset.filter);
    });
  }

  function seiteSpielplan() {
    const alle = alleSpiele();
    main.innerHTML = `
      <div class="seite">
        <section class="abschnitt">
          <div class="abschnitt__kopf"><h2>Spielplan aller Mannschaften</h2><span class="hinweis">Saison ${esc(D.saison)}</span></div>
          <div class="tabs" role="group" aria-label="Spielplan filtern">
            <button type="button" data-filter="kommend" aria-pressed="true">Kommende Spiele</button>
            <button type="button" data-filter="heim" aria-pressed="false">Nur Heimspiele</button>
            <button type="button" data-filter="Damen" aria-pressed="false">Damen</button>
            <button type="button" data-filter="Herren" aria-pressed="false">Herren</button>
            ${(D.pokale || []).length ? `<button type="button" data-filter="pokal" aria-pressed="false">Pokal</button>` : ""}
            <button type="button" data-filter="ergebnisse" aria-pressed="false">Ergebnisse</button>
          </div>
          <div id="spielplan"></div>
        </section>
      </div>`;
    const ziel = document.getElementById("spielplan");
    const zeige = (f) => {
      let liste = alle.filter(istKommend);
      if (f === "heim") liste = liste.filter((s) => s.zuhause);
      if (f === "Damen" || f === "Herren") liste = liste.filter((s) => s.team.gruppe === f);
      if (f === "pokal") liste = alle.filter((s) => s.pokal);
      if (f === "ergebnisse") liste = alle.filter((s) => s.ergebnis || s.d < heuteStart).reverse();
      if (!liste.length) { ziel.innerHTML = `<div class="karte"><p class="leer">Keine Spiele gefunden.</p></div>`; return; }
      const tage = new Map();
      liste.forEach((s) => {
        const k = tagesbeginn(s.d).getTime();
        if (!tage.has(k)) tage.set(k, []);
        tage.get(k).push(s);
      });
      ziel.innerHTML = [...tage.entries()].map(([k, sp]) => `
        <h3 class="gruppe-titel" style="margin-top:22px">${tagLang(new Date(k))}${relativ(new Date(k)) && f !== "ergebnisse" ? ` · ${relativ(new Date(k))}` : ""}</h3>
        <div class="karte">${spielListe(sp)}</div>`).join("");
    };
    filterKnoepfe(main.querySelector(".tabs"), zeige);
    zeige("kommend");
  }

  function seiteHallen() {
    const alle = alleSpiele();
    const heimhalle = alle.map((s) => s.halle).find((h) => h && h.name === HEIMHALLE_NAME) ||
      { name: HEIMHALLE_NAME, strasse: "Am Bohnenkamp 15", plz: "33729", ort: "Bielefeld", lat: null };

    const heimSpiele = alle.filter((s) => istKommend(s) && s.zuhause);
    const auswaerts = new Map();
    alle.filter((s) => istKommend(s) && !s.zuhause && s.halle).forEach((s) => {
      const k = s.halle.name + s.halle.ort;
      if (!auswaerts.has(k)) auswaerts.set(k, { halle: s.halle, spiele: [] });
      auswaerts.get(k).spiele.push(s);
    });
    const liste = [...auswaerts.values()].sort((a, b) => a.spiele[0].d - b.spiele[0].d);

    main.innerHTML = `
      <div class="seite">
        <section class="abschnitt zweispaltig">
          <div>
            <div class="abschnitt__kopf"><h2>Unsere Heimhalle</h2></div>
            <div class="karte">
              <div class="halle-kopf">
                <h3>${esc(heimhalle.name)}</h3>
                <p>${adresse(heimhalle)}<br>Sporthalle der Grundschule Brake – hier finden unsere Heimspiele und der Großteil des Trainings statt.</p>
                <a class="knopf knopf--rand" href="${routeLink(heimhalle)}" target="_blank" rel="noopener">Route planen ↗</a>
              </div>
              ${kartenEmbed(heimhalle)}
            </div>
          </div>
          <div>
            <div class="abschnitt__kopf"><h2>Kommende Heimspiele</h2></div>
            <div class="karte">${spielListe(heimSpiele)}</div>
          </div>
        </section>
        <section class="abschnitt">
          <div class="abschnitt__kopf"><h2>Auswärtshallen</h2><span class="hinweis">Wo unsere Teams als Nächstes zu Gast sind</span></div>
          <div class="karte">
            ${liste.length ? `<ul class="hallen-liste">${liste.map(({ halle, spiele }) => `
              <li>
                <div>
                  <b>${esc(halle.name)}</b>
                  <small>${adresse(halle)}</small>
                  <small>${spiele.map((s) => `${terminKurz(s).tag} ${terminKurz(s).zeit} · <a href="#/team/${s.team.id}">${esc(s.team.name)}</a> gegen ${esc(s.gegner)}`).join("<br>")}</small>
                </div>
                <a class="knopf knopf--rand" href="${routeLink(halle)}" target="_blank" rel="noopener">Route ↗</a>
              </li>`).join("")}</ul>` : `<p class="leer">Keine Auswärtsspiele angesetzt.</p>`}
          </div>
        </section>
      </div>`;
  }

  function seiteTraining() {
    main.innerHTML = `
      <div class="seite">
        <section class="abschnitt">
          <div class="abschnitt__kopf"><h2>Trainingszeiten</h2><span class="hinweis">Stand: August 2026</span></div>
          <div class="training-raster">
            ${TRAININGSBEREICHE.map((b) => `
              <div class="karte training-karte">
                <h3>${esc(b)}</h3>
                <ul class="training-liste">
                  ${TRAININGSPLAN.filter((t) => t.bereich === b).map((t) => `<li>
                    <b>${t.team ? `<a href="#/team/${t.team}">${esc(t.gruppe)}</a>` : esc(t.gruppe)}</b>
                    ${t.zeiten.map(([tag, zeit, ort]) => `<div class="training-zeit">
                      <span class="tag-chip">${tag}</span><span>${zeit} Uhr</span><span class="training-ort">${esc(ort)}</span>
                    </div>`).join("")}
                  </li>`).join("")}
                </ul>
              </div>`).join("")}
          </div>
          <p class="hinweis" style="margin-top:12px">„Sporthalle Brake“ = Sporthalle der Grundschule Brake, Am Bohnenkamp 15. Lust auf ein Probetraining? Schreib uns vorher kurz an <a href="mailto:volleyball@tus-brake.de">volleyball@tus-brake.de</a>.</p>
        </section>
      </div>`;
  }

  function seiteKontakt() {
    main.innerHTML = `
      <div class="seite">
        <section class="abschnitt zweispaltig">
          <div>
            <div class="abschnitt__kopf"><h2>Kontakt</h2></div>
            <div class="karte">
              <ul class="info-liste">
                <li><b>Abteilungsleitung</b><span>Florian Rügge<br><a href="mailto:volleyball@tus-brake.de">volleyball@tus-brake.de</a></span></li>
                <li><b>Geschäftsstelle</b><span>Lohrenkamp 37, 33729 Bielefeld<br>Di 17:30–19:30 Uhr · <a href="tel:+49521762622">0521 76 26 22</a><br><a href="mailto:info@tus-brake.de">info@tus-brake.de</a></span></li>
                <li><b>Instagram</b><span><a href="https://www.instagram.com/tusbrakevolleyball/" target="_blank" rel="noopener">@tusbrakevolleyball</a></span></li>
                <li><b>Hauptverein</b><span><a href="https://www.tus-brake.de/volleyball.html" target="_blank" rel="noopener">tus-brake.de</a></span></li>
              </ul>
            </div>
          </div>
          <div>
            <div class="abschnitt__kopf"><h2>Mitspielen</h2></div>
            <div class="karte prosa">
              <p>Beim TuS Brake spielen vier Damen- und vier Herrenmannschaften im Ligabetrieb, dazu Leistungsmixed, Hobbies, eine Perspektivgruppe und Jugendteams von den Minis bis zur U18.</p>
              <p>Ob Einsteiger oder erfahren – melde dich per E-Mail und wir finden die passende Gruppe für dich.</p>
              <p><a class="knopf knopf--gelb" href="mailto:volleyball@tus-brake.de?subject=Probetraining">Probetraining anfragen</a>
                 <a class="knopf knopf--rand" href="https://www.tus-brake.de/volleyball.html" target="_blank" rel="noopener">Mitglied werden ↗</a></p>
            </div>
          </div>
        </section>
      </div>`;
  }

  function seiteNichtGefunden() {
    main.innerHTML = `<div class="seite"><div class="karte prosa"><p>Diese Seite gibt es nicht. <a href="#/">Zur Übersicht</a></p></div></div>`;
  }

  /* ---------- Kopfbereich & Routing ---------- */
  function teamleiste() {
    const el = document.getElementById("teamleiste");
    el.innerHTML = ["Damen", "Herren"].map((g) =>
      `<span class="teamleiste__gruppe">${g}</span>` +
      D.teams.filter((t) => t.gruppe === g).map((t) => `<a href="#/team/${t.id}" data-team="${t.id}">${esc(t.name)}</a>`).join("")
    ).join("");
  }

  function datenstand() {
    const d = datum(D.stand);
    document.getElementById("datenstand").innerHTML =
      `Daten: <a href="${esc(D.quelle)}" target="_blank" rel="noopener">WVV-Ergebnisdienst</a><br>Stand: ${tagKurz(d)}${d.getFullYear()}, ${uhr(d)}`;
  }

  function markiereNavigation(pfad) {
    document.querySelectorAll(".nav a, .teamleiste a").forEach((a) => {
      const ziel = a.getAttribute("href").slice(1) || "/";
      a.toggleAttribute("aria-current", ziel === pfad);
      if (ziel === pfad) a.setAttribute("aria-current", "page");
    });
  }

  function route() {
    const pfad = location.hash.slice(1) || "/";
    const teile = pfad.split("/").filter(Boolean);
    if (teile[0] === "team") seiteTeam(teile[1]);
    else if (teile[0] === "spielplan") seiteSpielplan();
    else if (teile[0] === "hallen") seiteHallen();
    else if (teile[0] === "training") seiteTraining();
    else if (teile[0] === "kontakt") seiteKontakt();
    else if (!teile.length) main.innerHTML = seiteStart();
    else seiteNichtGefunden();

    markiereNavigation(pfad);
    const titel = teile[0] === "team" && teamById(teile[1]) ? teamById(teile[1]).name : { spielplan: "Spielplan", hallen: "Hallen", training: "Training", kontakt: "Kontakt" }[teile[0]];
    document.title = titel ? `${titel} · TuS Brake Volleyball` : "TuS Brake Volleyball";
    document.querySelector(".nav").classList.remove("offen");
    document.querySelector(".menu-knopf").setAttribute("aria-expanded", "false");
    window.scrollTo(0, 0);
  }

  // Hell/Dunkel: Wahl wird gespeichert; ohne Wahl gilt die Systemeinstellung
  function themeSetzen(t, speichern) {
    document.documentElement.dataset.theme = t;
    if (speichern) { try { localStorage.setItem("theme", t); } catch (e) { /* privat */ } }
    document.querySelector(".theme-knopf").setAttribute("aria-label", t === "dark" ? "Helles Design aktivieren" : "Dunkles Design aktivieren");
  }
  document.querySelector(".theme-knopf").addEventListener("click", () =>
    themeSetzen(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let gewaehlt = null;
    try { gewaehlt = localStorage.getItem("theme"); } catch (err) { /* privat */ }
    if (!gewaehlt) themeSetzen(e.matches ? "dark" : "light", false);
  });
  themeSetzen(document.documentElement.dataset.theme, false);

  document.querySelector(".menu-knopf").addEventListener("click", (e) => {
    const nav = document.querySelector(".nav");
    const offen = nav.classList.toggle("offen");
    e.currentTarget.setAttribute("aria-expanded", String(offen));
  });

  if (!D) {
    main.innerHTML = `<div class="seite"><div class="karte prosa"><p>Die Spieldaten konnten nicht geladen werden. Bitte <code>python3 scripts/daten_aktualisieren.py</code> ausführen.</p></div></div>`;
    return;
  }
  teamleiste();
  datenstand();
  window.addEventListener("hashchange", route);
  route();
})();
