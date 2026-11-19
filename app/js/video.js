// Blockfilm – eigene Videos als Grundlage: Clips schneiden, Zeitlupe, Standbild, Lupe (Zoom),
// Zeichentrick-Filter, Sprecher (Vorlesestimme) und 2D-Zeichnungen (Kreis, Zeiger, Kurve …) zum Erklären
(function () {
  const BF = (window.BF = window.BF || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const sanft = u => u * u * (3 - 2 * u);
  const Z = (BF.zusatz = BF.zusatz || {});
  BF.videoInfo = BF.videoInfo || {};   // Pfad -> { dauer, breite, hoehe, url, ton }
  BF.sprachDauer = BF.sprachDauer || {}; // Schlüssel -> Sekunden
  BF.SPRECHTEMPO = { ruhig: { stimme: 1, pause: 1, warte: 1 }, flott: { stimme: 1.08, pause: 0.45, warte: 0.6 }, sehrflott: { stimme: 1.15, pause: 0.25, warte: 0.4 } };
  BF.sprechTempoWahl = BF.sprechTempoWahl || 'flott';
  BF.sprachPuffer = BF.sprachPuffer || {};
  BF.clipPuffer = BF.clipPuffer || {};

  function bereit(F) {
    F.clips = F.clips || [];
    F.filter = F.filter || [];
    F.lupen = F.lupen || [];
    F.zeichen = F.zeichen || [];
    F.sprache = F.sprache || [];
    F.brauche = F.brauche || { videos: new Set(), bilder: new Set() };
  }
  // Zeitangaben: 12, 12.5, 1:05, 1:05.5
  function zeitWert(s) {
    if (s === null || s === undefined) return undefined;
    s = String(s).replace(',', '.').replace(/s$/, '');
    if (s.includes(':')) { const t = s.split(':').map(Number); return t.reduce((a, b) => a * 60 + b, 0); }
    const v = parseFloat(s);
    return isNaN(v) ? undefined : v;
  }
  BF.zeitWert = zeitWert;
  function optZeit(w, namen) { const v = w.optWort(namen); return zeitWert(v); }

  // ---------- Video-Clips ----------
  Z.video = Z.clip = Z.aufnahme = function (w, t, h) {
    const F = h.F; bereit(F);
    const datei = w.text();
    if (datei === null) throw new Error('So: video "meine-aufnahme.mp4" von 0:10 bis 0:25');
    const von = optZeit(w, ['von', 'ab', 'start']) ?? 0;
    let bis = optZeit(w, ['bis', 'ende']);
    const tempo = clamp(w.optZahl(['tempo', 'geschwindigkeit', 'zeitlupe'], 1), 0.05, 8);
    const laut = w.flag(['stumm', 'leise', 'ohneton']) ? 0 : w.optZahl(['lautstaerke', 'laut', 'ton'], 1);
    const fuellen = !w.flag(['einpassen', 'ganz']);
    const info = BF.videoInfo[datei];
    F.brauche.videos.add(datei);
    if (bis === undefined) bis = info ? info.dauer : von + 10;
    if (info) bis = Math.min(bis, info.dauer);
    if (bis <= von) throw new Error('„bis“ muss nach „von“ liegen');
    const d = (bis - von) / tempo;
    F.clips.push({ t0: t, t1: t + d, datei, von, bis, tempo, laut, fuellen });
    if (!info) F.wartetAufVideo = true;
    return d;
  };
  Z.standbild = Z.einfrieren = Z.freeze = function (w, t, h) {
    const F = h.F; bereit(F);
    const datei = w.text();
    const bei = optZeit(w, ['bei', 'zeit', 'von']);
    const d = w.dauerOderZahl(3);
    let quelle = datei, zeit = bei;
    if (!quelle) {
      const letzter = F.clips.filter(c => c.t0 <= t).pop();
      if (!letzter) throw new Error('standbild braucht vorher ein video (oder: standbild "datei.mp4" bei 0:12 3)');
      quelle = letzter.datei;
      zeit = bei ?? Math.max(letzter.von, letzter.bis - 0.04);
    }
    F.brauche.videos.add(quelle);
    F.clips.push({ t0: t, t1: t + d, datei: quelle, von: zeit || 0, bis: zeit || 0, tempo: 0, laut: 0, fuellen: true, stand: true });
    return d;
  };
  Z.ohnevideo = Z.videoaus = function (w, t, h) { const F = h.F; bereit(F); for (const c of F.clips) if (c.t1 > t && c.t0 < t) c.t1 = t; return 0; };

  BF.clipBei = function (F, t) {
    if (!F.clips) return null;
    let r = null;
    for (const c of F.clips) if (c.t0 <= t && t < c.t1) r = c;
    if (!r) return null;
    const quellZeit = r.stand ? r.von : Math.min(r.bis - 0.001, r.von + (t - r.t0) * r.tempo);
    return { clip: r, zeit: quellZeit };
  };

  // ---------- Zeichentrick-Filter und Lupe ----------
  Z.zeichentrick = Z.cartoon = Z.comic = function (w, t, h) {
    const F = h.F; bereit(F);
    const aus = w.flag(['aus', 'nein', 'stopp']);
    w.flag(['an', 'ein', 'ja']);
    const staerke = w.optZahl(['staerke', 'stark'], 1);
    const kanten = w.optZahl(['kanten', 'linien', 'umriss'], 1);
    const farben = w.optZahl(['farben', 'stufen'], 6);
    const d = w.dauer(0);
    F.filter.push({ t0: t, t1: t + d, zu: aus ? 0 : clamp(staerke, 0, 2), kanten, farben });
    return d;
  };
  BF.filterBei = function (F, t) {
    let wert = 0, kanten = 1, farben = 6;
    for (const f of F.filter || []) {
      if (f.t0 > t) break;
      const u = f.t1 > f.t0 ? sanft(clamp((t - f.t0) / (f.t1 - f.t0), 0, 1)) : 1;
      wert = lerp(wert, f.zu, u);
      if (f.zu > 0) { kanten = f.kanten; farben = f.farben; }
    }
    return { wert, kanten, farben };
  };
  Z.lupe = Z.zoom = Z.vergroessern = function (w, t, h) {
    const F = h.F; bereit(F);
    const aus = w.flag(['aus', 'zurueck', 'weg']);
    const z = w.optZahl(['zoom', 'faktor', 'mal', 'x'], 2);
    const d = w.dauer(0.8);
    w.fuell();
    let x = 50, y = 50;
    if (!aus && w.istZahl()) { x = w.zahl(); y = w.zahl(50); }
    F.lupen.push({ t0: t, t1: t + d, x: aus ? 50 : x, y: aus ? 50 : y, zoom: aus ? 1 : Math.max(1, z) });
    return d;
  };
  BF.lupeBei = function (F, t) {
    let x = 50, y = 50, z = 1;
    for (const l of F.lupen || []) {
      if (l.t0 > t) break;
      const u = l.t1 > l.t0 ? sanft(clamp((t - l.t0) / (l.t1 - l.t0), 0, 1)) : 1;
      x = lerp(x, l.x, u); y = lerp(y, l.y, u); z = lerp(z, l.zoom, u);
    }
    return { x, y, z };
  };

  // ---------- Sprecher (Vorlesestimme + Untertitel) ----------
  BF.sprachSchluessel = (text, stimme, tempo) => `${stimme || ''}|${tempo || 1}|${text}`;
  Z.sprecher = Z.erzaehler = Z.erzaehlerin = Z.vorlesen = Z.sprich = function (w, t, h) {
    const F = h.F; bereit(F);
    const stimme = w.optWort(['stimme']) || F.stimme || BF.stimmeWahl || null;
    // Sprechtempo aus der App (ruhig / flott / sehr flott) wirkt auf Stimme und Pausen, auch bei fertigen Filmen
    const T = BF.SPRECHTEMPO[BF.sprechTempoWahl] || BF.SPRECHTEMPO.flott;
    const tempo = Math.round(w.optZahl(['tempo'], F.sprechTempo || 1) * T.stimme * 100) / 100;
    const ohneUT = w.flag(['ohneuntertitel', 'ohnetext']);
    const texte = [];
    for (let s = w.text(); s !== null; s = w.text()) texte.push(s);
    if (!texte.length) throw new Error('So: sprecher "Hier siehst du, wie der Block fällt."');
    let tt = Math.max(t, F.sprechFrei || 0); // Sprecher reden nie gleichzeitig
    for (const text of texte) {
      // Geräusch-Wörter (Rascheln, Bumm, Pling …) werden als Geräusch abgespielt, nicht vorgelesen
      const { gesprochen, geraeusche } = BF.geraeuschWorte(text);
      // Geräusche vor dem ersten Wort: erst Geräusch, dann spricht er
      const vorne = geraeusche.filter(g => g.vorne);
      vorne.forEach((g, i) => { for (let k = 0; k < (g.mal || 1); k++) h.ton(tt + i * 0.8 + k * 0.14, g.art, { vol: 1 }); });
      if (vorne.length && gesprochen) tt += vorne.length * 0.8 + 0.15;
      let dauer;
      if (gesprochen) {
        const key = BF.sprachSchluessel(gesprochen, stimme, tempo);
        dauer = BF.sprachDauer[key] ?? (0.45 + gesprochen.length * 0.068 / tempo);
        F.sprache.push({ t0: tt, t1: tt + dauer, text: gesprochen, stimme, tempo, key });
      } else dauer = 0;
      // Geräusche an die passende Stelle im Satz legen
      geraeusche.filter(g => !g.vorne).forEach(g => { for (let k = 0; k < (g.mal || 1); k++) h.ton(tt + dauer * g.anteil + 0.1 + k * 0.14, g.art, { vol: 1 }); });
      if (!gesprochen) dauer = Math.max(1.2, vorne.length * 0.8 + 0.4);
      if (!ohneUT) {
        for (const alt of F.texte) if (alt.ort === 'unten' && alt.t0 < tt && alt.t1 > tt) alt.t1 = tt;
        F.texte.push({ t0: tt, t1: tt + dauer + 0.15, text, ort: 'unten', groesse: 0.95, farbe: '#ffffff', sprecher: true });
      }
      tt += dauer + (F.sprechPause ?? 0.25) * T.pause;
    }
    F.sprechFrei = tt;
    return tt - t;
  };
  // Lautmalerei → Geräusch
  const GERAEUSCH_WORTE = [
    [/^raschel\w*$/i, 'rascheln'], [/^knister\w*$/i, 'rascheln'], [/^bu+m+$/i, 'schlag'], [/^rumms?$/i, 'schlag'], [/^pl(i|o)n?g+$/i, 'plopp'], [/^plopp+$/i, 'plopp'],
    [/^schwu+p+s?$/i, 'schwung'], [/^hu+i+$/i, 'wind'], [/^wu+sch+$/i, 'schwung'], [/^platsch+$/i, 'platsch'], [/^plitsch$/i, 'platsch'],
    [/^kna+ll+$/i, 'knall'], [/^zi+sch+$/i, 'zisch'], [/^pu+ff+$/i, 'puff'], [/^ding-?dong$/i, 'glocke'], [/^dong$/i, 'glocke'], [/^tada+$/i, 'tada'], [/^ka+wu+m+$/i, 'explosion'], [/^peng$/i, 'knall'],
    // Essen, Wasser, Aufprall, Springen, Tiere, Gefühle
    [/^ma+m+p+f+$/i, 'mampf', 3], [/^mja+m+(mja+m+)?$/i, 'mampf', 3], [/^schma+tz+$/i, 'mampf', 3], [/^knu+sper\w*$/i, 'mampf', 3], [/^ha+p+s+$/i, 'mampf', 1], [/^no+m(no+m)?$/i, 'mampf', 2],
    [/^pi+tsch$/i, 'platsch'], [/^splash$/i, 'platsch'], [/^blu+b+$/i, 'plopp'], [/^plu+p+$/i, 'plopp'],
    [/^kra+wu+m+s?$/i, 'explosion'], [/^wu+m+s$/i, 'explosion'], [/^wu+m+$/i, 'schlag'], [/^ba+m+$/i, 'schlag'], [/^klo+n+g$/i, 'schlag'], [/^po+ch(\s*po+ch)?$/i, 'herzschlag'], [/^ba+-?bu+m+$/i, 'herzschlag'],
    [/^kna+cks?$/i, 'bruch'], [/^kli+r+$/i, 'bruch'], [/^kra+cks$/i, 'bruch'], [/^fau+ch$/i, 'zisch'],
    [/^bo+i+n+g+$/i, 'sprung'], [/^do+i+n+g+$/i, 'sprung'],
    [/^hu+sch$/i, 'schwung'], [/^tara+m+$/i, 'tada'], [/^tra+ra+$/i, 'tada'],
    [/^(ha){2,}h?$/i, 'lachen'], [/^(hi){2,}h?$/i, 'lachen'], [/^(ho){2,}h?$/i, 'lachen'], [/^ki+cher\w*$/i, 'lachen'], [/^gi+ggel\w*$/i, 'lachen'],
    [/^gr{2,}$/i, 'bruellen'], [/^ro+a+r+$/i, 'bruellen'], [/^ra+w+r+$/i, 'bruellen'], [/^sta+m+p+f+$/i, 'stampfen'], [/^qui+e+k+$/i, 'quieken'], [/^pi+e+p+$/i, 'quieken'], [/^fi+e+p+$/i, 'quieken'],
    [/^kli+n+g(e+li+n+g)?$/i, 'glocke'], [/^bi+m+e+l$/i, 'glocke'], [/^go+n+g$/i, 'glocke'], [/^ka-?ching$/i, 'muenze'],
    [/^gru+m+e+l$/i, 'donner'], [/^wro+m+$/i, 'rakete'], [/^bru+m+$/i, 'rakete'], [/^ha+tschi+$/i, 'puff'],
  ];
  BF.geraeuschWorte = function (text) {
    // „Hi hi hi“, „Ha, ha!“ → ein Wort (ein einzelnes „Hi“ zur Begrüßung bleibt)
    text = String(text).replace(/\b(h[aio])(?:[\s,-]+\1\b)+/gi, m => m.replace(/[\s,-]+/g, ''));
    const geraeusche = [];
    const woerter = text.split(/(\s+)/);
    let pos = 0;
    const gesamt = text.length || 1;
    const behalten = [];
    let wortSeitGeraeusch = true, vorDemSprechen = true;
    for (const teil of woerter) {
      const kern = teil.replace(/[.,!?;:…"„“”-]/g, '');
      const treffer = kern && GERAEUSCH_WORTE.find(([re]) => re.test(kern));
      if (treffer) {
        // gleiches Geräusch direkt hintereinander ("Rascheln, rascheln!") nur einmal; „Bumm, bumm“ beim Herz ist ein Herzschlag
        const letzte = geraeusche[geraeusche.length - 1];
        const art = treffer[1] === 'schlag' && /herz/i.test(text) ? 'herzschlag' : treffer[1];
        if (!letzte || letzte.art !== art || wortSeitGeraeusch) geraeusche.push({ art, anteil: pos / gesamt, vorne: vorDemSprechen, mal: treffer[2] || 1 });
        wortSeitGeraeusch = false;
        // Satzzeichen behalten, damit die Stimme die Pause macht
        const zeichen = teil.replace(/[^.!?]/g, '');
        if (zeichen) behalten.push(zeichen);
      } else { behalten.push(teil); if (/[a-zäöüß]/i.test(teil)) { wortSeitGeraeusch = true; vorDemSprechen = false; } }
      pos += teil.length;
    }
    let gesprochen = behalten.join('').replace(/\s+([.,!?])/g, '$1').replace(/^[\s,.!?;:]+/, '').replace(/([.!?])[.!?]+/g, '$1').replace(/\s+/g, ' ').trim();
    if (!/[a-zäöüß]/i.test(gesprochen)) gesprochen = '';
    return { gesprochen, geraeusche };
  };
  Z.sprechpause = function (w, t, h) { h.F.sprechPause = Math.max(0, Math.min(5, w.zahl(0.8))); return 0; };
  Z.stimme = function (w, t, h) {
    const F = h.F;
    F.sprechTempo = w.optZahl(['tempo'], F.sprechTempo || 1);
    const n = w.text() || w.wort();
    if (n && n !== 'standard') F.stimme = n;
    return 0;
  };
  Z.kapitel = function (w, t, h) {
    const F = h.F;
    const txt = w.text();
    if (txt === null) throw new Error('So: kapitel "1. Die Schwerkraft"');
    const d = w.dauerOderZahl(2.5);
    F.texte.push({ t0: t, t1: t + d, text: txt, ort: 'mitte', groesse: 1.6, farbe: '#ffffff', karte: true });
    return d;
  };

  // ---------- 2D-Zeichnungen (Koordinaten in Prozent vom Bild: x von links, y von oben) ----------
  function sichtZeiten(w, defZeichnen, defSicht) {
    const zeichnen = w.optZahl(['in', 'zeichnen'], defZeichnen);
    let sicht = w.optZahl(['fuer', 'dauer', 'lang', 'zeige']);
    if (sicht === undefined) sicht = w.dauerFrei();
    return { zeichnen, sicht: sicht ?? defSicht };
  }
  function farbe(w, h, def) { return h.farbeWert(w.optWort(['farbe'], def)); }
  function prozent(w, n) { const a = []; for (let i = 0; i < n; i++) a.push(w.zahl()); return a; }
  Z.kreis = Z.markiere = Z.einkreisen = function (w, t, h) {
    const F = h.F; bereit(F);
    const r = w.optZahl(['radius', 'groesse'], 8);
    const f = farbe(w, h, '#ff3b30');
    const txt = w.text();
    const { zeichnen, sicht } = sichtZeiten(w, 0.5, 3);
    w.fuell();
    const [x, y] = prozent(w, 2);
    F.zeichen.push({ typ: 'kreis', t0: t, t1: t + sicht, zeichnen, x, y, r, farbe: f, text: txt, seed: F.zeichen.length });
    return 0;
  };
  Z.rahmen = Z.box = function (w, t, h) {
    const F = h.F; bereit(F);
    const f = farbe(w, h, '#ffd23a');
    const txt = w.text();
    const { zeichnen, sicht } = sichtZeiten(w, 0.5, 3);
    w.fuell();
    const [x, y, b, hh] = prozent(w, 4);
    F.zeichen.push({ typ: 'rahmen', t0: t, t1: t + sicht, zeichnen, x, y, b, h: hh, farbe: f, text: txt });
    return 0;
  };
  Z.zeiger = Z.pfeil2d = Z.hinweis = function (w, t, h) {
    const F = h.F; bereit(F);
    const f = farbe(w, h, '#ff3b30');
    const txt = w.text();
    const dick = w.optZahl(['dicke'], 1);
    const { zeichnen, sicht } = sichtZeiten(w, 0.45, 3);
    const vi = w.finde(['von']); if (vi >= 0) w.t.splice(vi, 1);
    const [x1, y1] = prozent(w, 2);
    const ni = w.finde(['nach', 'zu', 'bis', 'auf']); if (ni >= 0) w.t.splice(ni, 1);
    const [x2, y2] = prozent(w, 2);
    F.zeichen.push({ typ: 'zeiger', t0: t, t1: t + sicht, zeichnen, x1, y1, x2, y2, farbe: f, text: txt, dick });
    return 0;
  };
  Z.linie = Z.messlinie = Z.strecke = function (w, t, h) {
    const F = h.F; bereit(F);
    const f = farbe(w, h, '#ffd23a');
    const txt = w.text();
    const { zeichnen, sicht } = sichtZeiten(w, 0.5, 3);
    const vi = w.finde(['von']); if (vi >= 0) w.t.splice(vi, 1);
    const [x1, y1] = prozent(w, 2);
    const ni = w.finde(['nach', 'zu', 'bis']); if (ni >= 0) w.t.splice(ni, 1);
    const [x2, y2] = prozent(w, 2);
    F.zeichen.push({ typ: 'linie', t0: t, t1: t + sicht, zeichnen, x1, y1, x2, y2, farbe: f, text: txt });
    return 0;
  };
  Z.kurve = Z.flugbahn = Z.bahn = Z.weg2d = function (w, t, h) {
    const F = h.F; bereit(F);
    const f = farbe(w, h, '#ffd23a');
    const txt = w.text();
    const gestrichelt = w.flag(['gestrichelt', 'strichel']);
    const punkte = w.flag(['punkte', 'mitpunkten']);
    const { zeichnen, sicht } = sichtZeiten(w, 1.2, 4);
    w.fuell();
    const p = [];
    while (w.istZahl() && w.istZahl(1)) p.push([w.zahl(), w.zahl()]);
    if (p.length < 2) throw new Error('So: kurve 10 80 30 40 50 30 70 50 (mindestens 2 Punkte, je x y in Prozent)');
    F.zeichen.push({ typ: 'kurve', t0: t, t1: t + sicht, zeichnen, punkte: p, farbe: f, text: txt, gestrichelt, mitPunkten: punkte });
    return 0;
  };
  Z.notiz = Z.zettel = Z.sprechblase = function (w, t, h) {
    const F = h.F; bereit(F);
    const txt = w.text();
    if (txt === null) throw new Error('So: notiz "Das ist Sand" bei 40 30');
    const f = farbe(w, h, '#fff3a0');
    const { zeichnen, sicht } = sichtZeiten(w, 0.3, 3);
    w.fuell();
    const [x, y] = prozent(w, 2);
    F.zeichen.push({ typ: 'notiz', t0: t, t1: t + sicht, zeichnen, x, y, farbe: f, text: txt });
    return 0;
  };
  Z.bild = Z.sticker = Z.foto = function (w, t, h) {
    const F = h.F; bereit(F);
    const datei = w.text();
    if (datei === null) throw new Error('So: bild "zeichnung.png" bei 70 30 groesse 25');
    const b = w.optZahl(['groesse', 'breite'], 25);
    const { zeichnen, sicht } = sichtZeiten(w, 0.3, 3);
    w.fuell();
    const [x, y] = w.istZahl() ? prozent(w, 2) : [50, 50];
    F.brauche.bilder.add(datei);
    F.zeichen.push({ typ: 'bild', t0: t, t1: t + sicht, zeichnen, x, y, b, datei });
    return 0;
  };

  // ---------- Zeichnen der 2D-Sachen ----------
  BF.bilder = BF.bilder || {};
  function pfeilKopf(ctx, x1, y1, x2, y2, gr) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * gr, y2 - Math.sin(a - 0.45) * gr);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * gr, y2 - Math.sin(a + 0.45) * gr);
    ctx.closePath();
    ctx.fill();
  }
  function schild(ctx, text, x, y, E, farbe, gr = 32) {
    gr *= E;
    ctx.font = `bold ${Math.round(gr)}px "Segoe UI", "Noto Sans", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const b = ctx.measureText(text).width + gr;
    ctx.fillStyle = 'rgba(12,14,20,0.82)';
    ctx.beginPath();
    const r = 8 * E, xx = x - b / 2, yy = y - gr * 0.75, hh = gr * 1.5;
    ctx.moveTo(xx + r, yy); ctx.arcTo(xx + b, yy, xx + b, yy + hh, r); ctx.arcTo(xx + b, yy + hh, xx, yy + hh, r); ctx.arcTo(xx, yy + hh, xx, yy, r); ctx.arcTo(xx, yy, xx + b, yy, r);
    ctx.fill();
    ctx.fillStyle = farbe;
    ctx.fillText(text, x, y + 1);
  }
  function glatt(p, n = 12) {
    // Catmull-Rom: weiche Kurve durch alle Punkte
    if (p.length < 3) return p;
    const out = [];
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const u = k / n, u2 = u * u, u3 = u2 * u;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
      }
    }
    out.push(p[p.length - 1]);
    return out;
  }
  BF.zeichne2D = function (ctx, F, t, w, h) {
    const E = h / 1080;
    for (const z of F.zeichen || []) {
      if (t < z.t0 || t >= z.t1) continue;
      const k = z.zeichnen > 0 ? clamp((t - z.t0) / z.zeichnen, 0, 1) : 1;
      const aus = clamp((z.t1 - t) / 0.3, 0, 1);
      const X = v => (v / 100) * w, Y = v => (v / 100) * h;
      ctx.save();
      ctx.globalAlpha = aus;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = z.farbe; ctx.fillStyle = z.farbe;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 6 * E;
      switch (z.typ) {
        case 'kreis': {
          const r = (z.r / 100) * h;
          ctx.lineWidth = 7 * E;
          ctx.beginPath();
          const start = -Math.PI * 0.6;
          const steps = 60;
          for (let i = 0; i <= steps * k * 1.08; i++) {
            const a = start + (i / steps) * Math.PI * 2;
            const wob = 1 + Math.sin(a * 3 + z.seed) * 0.04 + (i / steps) * 0.06;
            const px = X(z.x) + Math.cos(a) * r * wob * 1.15, py = Y(z.y) + Math.sin(a) * r * wob;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          if (z.text && k >= 1) { ctx.shadowBlur = 0; schild(ctx, z.text, X(z.x), Y(z.y) - r - 34 * E, E, z.farbe); }
          break;
        }
        case 'rahmen': {
          ctx.lineWidth = 6 * E;
          const x = X(z.x), y = Y(z.y), b = X(z.b), hh = Y(z.h);
          const umfang = 2 * (b + hh);
          ctx.setLineDash([umfang * k, umfang]);
          ctx.strokeRect(x, y, b, hh);
          ctx.setLineDash([]);
          if (z.text && k >= 1) { ctx.shadowBlur = 0; schild(ctx, z.text, x + b / 2, y - 30 * E, E, z.farbe); }
          break;
        }
        case 'zeiger': case 'linie': {
          const x1 = X(z.x1), y1 = Y(z.y1);
          const x2 = lerp(x1, X(z.x2), sanft(k)), y2 = lerp(y1, Y(z.y2), sanft(k));
          ctx.lineWidth = (z.typ === 'linie' ? 5 : 8 * (z.dick || 1)) * E;
          const gr = 34 * E * (z.dick || 1);
          const a = Math.atan2(y2 - y1, x2 - x1);
          ctx.beginPath(); ctx.moveTo(x1, y1);
          ctx.lineTo(z.typ === 'zeiger' && k > 0.2 ? x2 - Math.cos(a) * gr * 0.7 : x2, z.typ === 'zeiger' && k > 0.2 ? y2 - Math.sin(a) * gr * 0.7 : y2);
          ctx.stroke();
          if (z.typ === 'zeiger' && k > 0.2) pfeilKopf(ctx, x1, y1, x2, y2, gr);
          if (z.typ === 'linie') for (const [px, py] of [[x1, y1], [x2, y2]]) { ctx.beginPath(); ctx.moveTo(px - Math.sin(a) * 14 * E, py + Math.cos(a) * 14 * E); ctx.lineTo(px + Math.sin(a) * 14 * E, py - Math.cos(a) * 14 * E); ctx.stroke(); }
          if (z.text && k >= 1) {
            ctx.shadowBlur = 0;
            if (z.typ === 'zeiger') { const ox = -Math.cos(a) * 40 * E, oy = -Math.sin(a) * 40 * E; schild(ctx, z.text, x1 + ox, y1 + oy, E, z.farbe); }
            else schild(ctx, z.text, (x1 + x2) / 2 - Math.sin(a) * 34 * E, (y1 + y2) / 2 + Math.cos(a) * -34 * E, E, z.farbe);
          }
          break;
        }
        case 'kurve': {
          const p = glatt(z.punkte.map(q => [X(q[0]), Y(q[1])]));
          const n = Math.max(1, Math.floor((p.length - 1) * k));
          ctx.lineWidth = 6 * E;
          if (z.gestrichelt) ctx.setLineDash([18 * E, 14 * E]);
          ctx.beginPath();
          ctx.moveTo(p[0][0], p[0][1]);
          for (let i = 1; i <= n; i++) ctx.lineTo(p[i][0], p[i][1]);
          ctx.stroke();
          ctx.setLineDash([]);
          if (k >= 1 && !z.gestrichelt) pfeilKopf(ctx, p[p.length - 2][0], p[p.length - 2][1], p[p.length - 1][0], p[p.length - 1][1], 30 * E);
          if (z.mitPunkten) for (const q of z.punkte) { const sx = X(q[0]), sy = Y(q[1]); if (Math.hypot(sx - p[n][0], sy - p[n][1]) > 1 && z.punkte.indexOf(q) / (z.punkte.length - 1) > k + 0.001) continue; ctx.beginPath(); ctx.arc(sx, sy, 8 * E, 0, 7); ctx.fill(); }
          // bewegter Punkt an der Spitze
          if (k < 1) { ctx.beginPath(); ctx.arc(p[n][0], p[n][1], 11 * E, 0, 7); ctx.fillStyle = '#ffffff'; ctx.fill(); }
          if (z.text && k >= 1) { ctx.shadowBlur = 0; const m = p[Math.floor(p.length / 2)]; schild(ctx, z.text, m[0], m[1] - 40 * E, E, z.farbe); }
          break;
        }
        case 'notiz': {
          const s = 0.6 + 0.4 * sanft(k);
          ctx.translate(X(z.x), Y(z.y)); ctx.scale(s, s); ctx.rotate(-0.04);
          ctx.font = `${Math.round(30 * E)}px "Comic Sans MS", "Segoe Print", "Noto Sans", sans-serif`;
          const zeilen = z.text.split('\\n');
          const b = Math.max(...zeilen.map(l => ctx.measureText(l).width)) + 40 * E, hh = zeilen.length * 38 * E + 30 * E;
          ctx.fillStyle = z.farbe; ctx.fillRect(-b / 2, -hh / 2, b, hh);
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-b / 2, -hh / 2, b, 10 * E);
          ctx.fillStyle = '#2a2a2a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          zeilen.forEach((l, i) => ctx.fillText(l, 0, -hh / 2 + 15 * E + 38 * E * (i + 0.5) + 4 * E));
          break;
        }
        case 'bild': {
          const img = BF.bilder[z.datei];
          if (!img || !img.complete || !img.naturalWidth) break;
          const s = 0.6 + 0.4 * sanft(k);
          const b = (z.b / 100) * w * s, hh = b * img.naturalHeight / img.naturalWidth;
          ctx.drawImage(img, X(z.x) - b / 2, Y(z.y) - hh / 2, b, hh);
          break;
        }
      }
      ctx.restore();
    }
  };

  // ---------- Video-Elemente (für Vorschau und Export) ----------
  const elemente = {};
  BF.videoElement = function (datei) {
    const info = BF.videoInfo[datei];
    if (!info || !info.url) return null;
    let el = elemente[datei];
    if (!el) {
      el = document.createElement('video');
      el.muted = true; el.preload = 'auto'; el.playsInline = true; el.crossOrigin = 'anonymous';
      el.src = info.url;
      elemente[datei] = el;
      el.addEventListener('seeked', () => { if (BF.beiVideoBild) BF.beiVideoBild(); });
      el.addEventListener('loadeddata', () => { if (BF.beiVideoBild) BF.beiVideoBild(); });
    }
    return el;
  };
  // Video genau auf die Zeit stellen (für den Export: wartet bis das Bild da ist)
  BF.videoSuchen = function (el, zeit, genau) {
    return new Promise(ok => {
      if (!el) return ok();
      const ziel = Math.max(0, Math.min(zeit, (el.duration || zeit + 1) - 0.001));
      const fertig = () => ok();
      void genau;
      if (el.readyState < 1) { el.addEventListener('loadedmetadata', () => BF.videoSuchen(el, zeit, genau).then(ok), { once: true }); return; }
      if (Math.abs(el.currentTime - ziel) < 0.004 && el.readyState >= 2) return ok();
      el.addEventListener('seeked', fertig, { once: true });
      el.currentTime = ziel;
      setTimeout(ok, 3000);
    });
  };
})();
