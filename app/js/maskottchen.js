// Blockfilm – Maskottchen „Glib“: ein kleiner bunter Schleim, der durch die Filme begleitet.
//   maskottchen2d [name] bei x y [groesse 7] [schweben]   Glib selbst hinstellen (dann gibt es keine automatischen Auftritte)
//   maskottchen aus                                         keine automatischen Auftritte in diesem Film
// Ohne eigene Angabe erzählt Glib jeden 2D-Film: er steht in jedem Kapitel in einer freien unteren Ecke und spricht mit. Die Zeichnung im neuen Stil steht in hf/figuren2d.js (OB.schleim).
(function () {
  const BF = (window.BF = window.BF || {});
  const Z = (BF.zusatz = BF.zusatz || {});
  BF.MASKOTTCHEN_NAME = 'Glib';
  const H = () => BF.w2dHelfer;

  Z.maskottchen2d = Z.glib2d = Z.glibbi2d = Z.schleim2d = function (w, t, h) {
    const { w2d, nameOder, punkt, neuesObjekt } = H();
    const F = h.F;
    w2d(F);
    const gr = w.optZahl(['groesse'], 9);
    w.optWort(['farbe']); // Farbe gibt es nicht: Glib ist immer bunt
    const schweben = w.flag(['schweben', 'schwebt', 'fliegt']);
    const name = nameOder(w, 'glib');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'schleim', name, t0: t, p, r: gr, schweben });
    return 0;
  };
  Z.maskottchen = function (w, t, h) { if (w.flag(['aus', 'weg', 'nein'])) h.F.maskottchenAus = true; return 0; };

  // ---------- automatische Auftritte ----------
  const SCHWEB_HG = ['weltraum', 'all', 'space', 'mikro', 'meer'];
  function hgBei(F, t) { let a = 'weltraum'; for (const b of F.w2d.hg) if (b.t0 <= t) a = b.art; return a; }
  function belegung(F, x, y, t0, t1) {
    // wie sehr eine Stelle in der Zeit [t0, t1] von anderen Objekten belegt ist
    const pos = BF.w2dIntern.pos;
    let summe = 0;
    for (const t of [t0 + 0.5, (t0 + t1) / 2, t1 - 0.3]) {
      for (const o of F.w2d.liste) {
        if (o.typ === 'schleim' || !(t >= o.t0 && t < (o.t1 ?? Infinity))) continue;
        const p = pos(F, o, t), r = Math.min(30, o.typ === 'zeitleiste' ? o.r / 2 : o.r);
        const d = Math.hypot(p[0] - x, (p[1] + r * 0.4) - (y + 4));
        summe += Math.max(0, r + 6 - d);
      }
    }
    return summe;
  }
  BF.nachKompilieren = BF.nachKompilieren || [];
  // Namensschilder der früheren Begleitfigur heißen jetzt wie das Maskottchen
  BF.nachKompilieren.push(function (F) {
    if (!F.w2d) return;
    for (const tx of F.w2d.texte) if (tx.an && tx.an.obj && F.w2d.obj[tx.an.obj] && F.w2d.obj[tx.an.obj].typ === 'schleim' && /^mia$/i.test(tx.text)) tx.text = BF.MASKOTTCHEN_NAME;
  });
  // Glib erzählt: in jedem Kapitel steht er in einer freien unteren Ecke und spricht mit (Mund bewegt sich mit der Stimme).
  // Wird seine Ecke belegt, hüpft er hinaus und kommt auf der anderen Seite wieder herein.
  BF.nachKompilieren.push(function maskottchenErzaehler(F) {
    if (!F.w2d || F.maskottchenAus || (F.reihenfolge && F.reihenfolge.length)) return;
    if (F.w2d.liste.some(o => o.typ === 'schleim')) return;      // das Skript stellt Glib selbst hin
    const sp = (F.sprache || []).slice().sort((a, b) => a.t0 - b.t0);
    if (!sp.length) return;
    const karten = F.texte.filter(x => x.karte).sort((a, b) => a.t0 - b.t0);
    // Kapitel: von einer Kapitelkarte bis zur nächsten (vor der ersten Karte: Filmanfang)
    const kapitel = [];
    let ab = Math.max(0, sp[0].t0 - 0.6);
    for (const k of karten) { if (k.t0 > ab + 1) kapitel.push([ab, k.t0]); ab = Math.max(ab, k.t1); }
    kapitel.push([ab, F.dauer - 0.2]);
    const { neuesObjekt, w2d } = H();
    let erster = true;
    kapitel.forEach(([k0, k1], ki) => {
      const saetze = sp.filter(s => s.t0 >= k0 - 0.05 && s.t0 < k1);
      if (!saetze.length || k1 - k0 < 2.5) return;
      const start = k0 + 0.2, ende = k1 - 0.15;
      const schweben = SCHWEB_HG.includes(hgBei(F, start + 0.5));
      const y = schweben ? -15 : -11;
      // Ecke Satz für Satz wählen; nur wechseln, wenn die andere Ecke deutlich freier ist
      let seite = belegung(F, -42, y, start, saetze[0].t1) <= belegung(F, 42, y, start, saetze[0].t1) ? -1 : 1;
      const startSeite = seite, wechsel = [];
      for (const s of saetze.slice(1)) {
        const hier = belegung(F, seite * 42, y, s.t0, s.t1), dort = belegung(F, -seite * 42, y, s.t0, s.t1);
        if (hier > dort + 8) { seite = -seite; wechsel.push([s.t0 - 0.5, seite]); }
      }
      const o = neuesObjekt(F, { typ: 'schleim', name: 'glib_erzaehler' + ki, t0: start, p: [startSeite * 60, y], r: 8, schweben, auto: true });
      // Ablauf in zeitlicher Reihenfolge: hereinhüpfen, zwischen Sätzen herumlaufen, bei Bedarf Ecke wechseln, hinaushüpfen
      const ereignisse = wechsel.filter(([t]) => t >= start + 1.2 && t <= ende - 1.5).map(([t, neu]) => ({ t, neu }));
      saetze.slice(1).forEach((s2, i) => { if (i % 2 === 1) ereignisse.push({ t: s2.t0 - 0.05, laufen: true }); });
      ereignisse.sort((a2, b2) => a2.t - b2.t);
      let seiteJetzt = startSeite, x = startSeite * 41, frei = start + 0.9, schritt = 0;
      o.segs.push({ typ: 'zu', t0: start, t1: frei, von: [startSeite * 60, y], zu: [x, y] });
      for (const e of ereignisse) {
        if (e.t < frei + 0.3 || e.t > ende - 1.6) continue;
        if (e.neu) { // Ecke belegt: hinaus und auf der anderen Seite herein
          o.segs.push({ typ: 'zu', t0: e.t, t1: e.t + 0.45, von: [x, y], zu: [seiteJetzt * 60, y] });
          seiteJetzt = e.neu; x = seiteJetzt * 41;
          o.segs.push({ typ: 'zu', t0: e.t + 0.45, t1: e.t + 0.9, von: [seiteJetzt * 60, y], zu: [x, y] });
          frei = e.t + 0.9;
        } else { // ein Stück Richtung Mitte und wieder zurück
          const ziel = seiteJetzt * (schritt++ % 2 === 0 ? 33 : 42);
          o.segs.push({ typ: 'zu', t0: e.t, t1: e.t + 1.1, von: [x, y], zu: [ziel, y] });
          x = ziel; frei = e.t + 1.1;
        }
      }
      o.segs.push({ typ: 'zu', t0: Math.max(frei, ende - 0.8), t1: Math.max(frei, ende - 0.8) + 0.8, von: [x, y], zu: [seiteJetzt * 60, y] });
      o.t1 = ende + 0.05;
      if (erster) { // beim ersten Auftritt kurz ein Namensschild
        w2d(F).texte.push({ t0: start + 1, t1: start + 4, text: BF.MASKOTTCHEN_NAME, an: { obj: o.name } });
        erster = false;
      }
    });
  });

  // Menschenfiguren ohne Aufgabe im Video weglassen: Sie bleiben nur, wenn sie etwas tun (laufen, kippen, niesen,
  // vom Licht getroffen), ein Namensschild haben oder im gesprochenen Text vorkommen.
  const MENSCH_WORTE = /\b(kind|kinder|kindes|mensch|menschen|oma|opa|mama|papa|eltern|junge|jungen|mädchen|maedchen|frau|mann|leute|person|freund\w*|forscher\w*|paläontolog\w*|palaeontolog\w*|ärzt\w*|arzt|telefonier\w*|niest\w*|hatschi)\b/i;
  BF.nachKompilieren.push(function menschenAufraeumen(F) {
    if (!F.w2d || F.menschenBleiben) return;
    for (const o of F.w2d.liste) {
      if (o.typ !== 'kind') continue;
      const ende = Math.min(o.t1 ?? F.dauer, F.dauer);
      const tut = o.segs.length || o.kipp || (F.w2d.niesen || []).some(n => n.wer === o.name) || (F.w2d.licht || []).some(l => l.ziel === o.name) || F.w2d.texte.some(t => t.an && t.an.obj === o.name);
      const genannt = (F.sprache || []).some(s => s.t0 < ende && s.t1 > o.t0 && MENSCH_WORTE.test(s.text));
      if (!tut && !genannt) o.t1 = o.t0; // nie sichtbar
    }
  });
  Z.menschen = function (w, t, h) { if (w.flag(['bleiben', 'an', 'lassen'])) h.F.menschenBleiben = true; return 0; };

  // Mia (die frühere Begleitfigur) ist jetzt Glib
  const altKind = Z.kind2d;
  Z.kind2d = Z.mensch2d = function (w, t, h) {
    if (w.pk && /^mia\d*$/.test(w.pk() || '')) {
      // gleich hoch wie ein Kind wäre ein Schleim viel zu breit: kleiner machen
      const d = Z.maskottchen2d(w, t, h);
      const W = h.F.w2d, o = W.liste[W.liste.length - 1];
      if (o && o.typ === 'schleim') o.r = Math.round(o.r * 0.75 * 10) / 10;
      return d;
    }
    return altKind(w, t, h);
  };

  // ---------- Glib erzählt selbst: Sprechertext in der Ich-Form ----------
  // „Glib fragt: Warum …?“ → „Warum …?“, „Das ist Glib.“ → „Ich bin Glib.“, „Glib badet …“ → „Ich bade …“,
  // „… guckt Glib auf …“ → „… gucke ich auf …“. Gilt nicht mit „maskottchen aus“.
  const SAGEN = /^Glib\s+(fragt|ruft|staunt|sagt|meint|denkt|überlegt|jubelt|lacht|flüstert|kichert|grübelt|rätselt|antwortet|erklärt|schreit|seufzt|freut\s+sich|wundert\s+sich|fragt\s+sich|denkt\s+sich)(\s+(dich|euch|laut|leise|begeistert|neugierig|fröhlich|erstaunt|aufgeregt|nochmal|noch\s+einmal))*\s*:\s*/i;
  const UNREGEL = { ist: 'bin', hat: 'habe', kann: 'kann', will: 'will', darf: 'darf', muss: 'muss', mag: 'mag', weiß: 'weiß', soll: 'soll', sieht: 'sehe', läuft: 'laufe', fährt: 'fahre', nimmt: 'nehme', gibt: 'gebe', isst: 'esse', schläft: 'schlafe', hält: 'halte', fällt: 'falle', liest: 'lese', trifft: 'treffe', wird: 'werde', trägt: 'trage', lässt: 'lasse', vergisst: 'vergesse', hilft: 'helfe', spricht: 'spreche', wirft: 'werfe', fängt: 'fange', bläst: 'blase', wäscht: 'wasche' };
  const KEIN_VERB = /^(nicht|gut|weit|bunt|jetzt|heute|selbst|zuerst|zuletzt|fast|oft|erst|t)$/i;
  function ichVerb(v) {
    if (UNREGEL[v.toLowerCase()]) return UNREGEL[v.toLowerCase()];
    if (KEIN_VERB.test(v) || !/^[a-zäöüß]+t$/.test(v) || v.length < 4) return null;
    return /[^aeiouäöü]et$/.test(v) ? v.slice(0, -2) + 'e' : v.slice(0, -1) + 'e'; // badet → bade, rechnet → rechne, guckt → gucke
  }
  const gross = s => s.charAt(0).toUpperCase() + s.slice(1);
  function ichForm(satz) {
    let s = satz.replace(SAGEN, '');
    if (s !== satz) return gross(s);
    s = s.replace(/^(Glib\s+und\s+ich|Ich\s+und\s+Glib)\b/, 'Wir').replace(/\b(Glib\s+und\s+ich|ich\s+und\s+Glib)\b/g, 'wir');
    if (s !== satz) return s.replace(/^Wir\s+(\S+)/, (m, v) => 'Wir ' + v); // Verb steht schon im Plural („Glib und ich sagen“)
    s = s.replace(/\b(Das|Hier|Da)\s+ist\s+Glib\b/g, (m, a) => (a === 'Das' ? 'Ich bin Glib' : a + ' bin ich'));
    s = s.replace(/\bGlib\s+und\s+du,\s+ihr\s+seid\b/g, 'Du und ich, wir sind').replace(/\bGlib\s+und\s+du\b/g, 'du und ich');
    // Nebensatz: „was Glib jetzt sieht?“ → „was ich jetzt sehe?“ (Verb am Ende)
    s = s.replace(/\b(was|wenn|bis|weil|dass|ob|wie|wo|als|damit|ehe|sobald|während)\s+Glib\s+([^,.!?;:]*?)\s*([a-zäöüß]+)(?=\s*([,.!?;:]|$))/gi, (all, k, mitte, v) => { const i = ichVerb(v); return i ? `${k} ich ${mitte ? mitte + ' ' : ''}${i}` : all; });
    let m = /^Glib\s+(\S+)/.exec(s);
    if (m) { const v = ichVerb(m[1]); if (v) s = 'Ich ' + v + s.slice(m[0].length); }
    s = s.replace(/\b([a-zäöüß]+)\s+Glib\b/g, (all, v) => { if (/^(mit|zu|bei|von)$/.test(v)) return v + ' mir'; if (/^(für|um|ohne|an)$/.test(v)) return v + ' mich'; const i = ichVerb(v); return i ? i + ' ich' : all; });
    if (s !== satz) s = s.replace(/\bsein(e|en|em|er|es)?\b/g, (x, e) => 'mein' + (e || '')).replace(/\bsich\b/g, 'mich');
    return s;
  }
  BF.glibIchForm = text => String(text).split(/(?<=[.!?])\s+/).map(ichForm).join(' ');
  BF.vorKompilieren = BF.vorKompilieren || [];
  BF.vorKompilieren.push(function glibErzaehltSelbst(text) {
    if (/^\s*maskottchen\s+(aus|weg|nein)\b/mi.test(text)) return text;
    const mia = /^\s*(?:&\s*)?(kind2d|mensch2d)\s+mia\d*\b/mi.test(text); // die frühere Begleitfigur Mia ist jetzt Glib
    if (!/Glib/.test(text) && !mia) return text;
    return text.split('\n').map(z => z.replace(/^(\s*(?:&\s*)?(?:sprecher|erzaehler|erzähler|erzaehlerin|erzählerin|vorlesen|sprich)\s+")([^"]*)(".*)$/i, (all, a, t, b) => a + BF.glibIchForm(mia ? t.replace(/\bMia\b/g, 'Glib') : t) + b)).join('\n');
  });

  // ---------- einfache Zeichnung für die alte Vorschau (ohne „Neuer Stil“) ----------
  BF.zeichne2d = BF.zeichne2d || {};
  BF.zeichne2d.schleim = function (ctx, o, sx, sy, r, t) {
    const w = 1 + Math.sin(t * 2.2) * 0.03;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(r * w, r * (2 - w));
    const g = ctx.createLinearGradient(0, -0.85, 0, 0); g.addColorStop(0, '#ff7ad1'); g.addColorStop(0.5, '#a98bff'); g.addColorStop(1, '#3fe0c8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-0.55, 0); ctx.bezierCurveTo(-0.62, -0.25, -0.5, -0.8, 0, -0.84); ctx.bezierCurveTo(0.5, -0.8, 0.62, -0.25, 0.55, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-0.22, -0.62, 0.12, 0.07, -0.5, 0, 7); ctx.fill();
    for (const sg of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sg * 0.17, -0.48, 0.12, 0, 7); ctx.fill(); ctx.fillStyle = '#1d2340'; ctx.beginPath(); ctx.arc(sg * 0.17, -0.46, 0.065, 0, 7); ctx.fill(); }
    ctx.restore();
  };
})();
