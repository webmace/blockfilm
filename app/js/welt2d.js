// Blockfilm – 2D-Simulation der echten Welt zum Erklären (Weltraum, Sterne, Planeten, schwarze Löcher, Licht)
// Koordinaten: Bildmitte = 0 0, x nach rechts, y nach oben; die Bildbreite sind 100 Einheiten (bei Zoom 1).
(function () {
  const BF = (window.BF = window.BF || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const sanft = u => u * u * (3 - 2 * u);
  const Z = (BF.zusatz = BF.zusatz || {});
  const C = 30; // Lichtgeschwindigkeit in der Simulation (Einheiten pro Sekunde)

  function w2d(F) {
    if (!F.w2d) F.w2d = { an: [], hg: [], obj: {}, liste: [], kam: [], licht: [], texte: [] };
    return F.w2d;
  }
  const FARBEN = { weiss: '#ffffff', gelb: '#ffe27a', orange: '#ffb04a', rot: '#ff6a4a', blau: '#8fb8ff', weissblau: '#cfe0ff', gruen: '#7fe08a' };
  const farbe = (h, s, d) => (s ? FARBEN[BF.norm(s)] || h.farbeWert(s) : d);
  function punkt(w) { w.fuell(); return [w.zahl(), w.zahl()]; }
  function neuesObjekt(F, o) {
    const W = w2d(F);
    if (!W.an.length) W.an.push({ t: 0, an: true });
    o.segs = []; o.t1 = Infinity;
    W.obj[o.name] = o; W.liste.push(o);
    return o;
  }

  // ---------- Befehle ----------
  Z.hintergrund = Z.szene2d = function (w, t, h) {
    const W = w2d(h.F);
    const art = w.wort() || 'weltraum';
    if (['aus', '3d', 'weg', 'ende'].includes(art)) { W.an.push({ t, an: false }); return 0; }
    const d = w.dauer(0);
    W.an.push({ t, an: true });
    W.hg.push({ t0: t, t1: t + d, art });
    return 0;
  };
  Z.ohne2d = Z.zurueck3d = function (w, t, h) { w2d(h.F).an.push({ t, an: false }); return 0; };
  Z.kamera2d = function (w, t, h) {
    const W = w2d(h.F);
    const zoom = w.optZahl(['zoom'], null);
    const d = w.dauer(0);
    w.fuell();
    let p = null;
    if (w.istZahl() && w.istZahl(1)) p = [w.zahl(), w.zahl()];
    else if (w.pk() && W.obj[w.pk()]) p = { obj: w.wort() };
    W.kam.push({ t0: t, t1: t + d, p, zoom });
    return d;
  };
  Z.stern2d = Z.sonne2d = function (w, t, h) {
    const F = h.F; w2d(F).an.length || w2d(F).an.push({ t, an: true });
    const r = w.optZahl(['groesse', 'radius'], 4);
    const f = farbe(h, w.optWort(['farbe']), '#ffe27a');
    const name = !w.istZahl() && w.pk() && !['bei', 'auf'].includes(w.pk()) ? w.wort() : 'stern' + Object.keys(w2d(F).obj).length;
    const p = punkt(w);
    neuesObjekt(F, { typ: 'stern', name, t0: t, p, r, farbe: f });
    return 0;
  };
  Z.planet2d = Z.erde2d = Z.mond2d = function (w, t, h) {
    const F = h.F;
    const r = w.optZahl(['groesse', 'radius'], 3);
    const art = BF.norm(w.optWort(['art', 'als'], 'erde'));
    const f = w.optWort(['farbe']);
    const name = !w.istZahl() && w.pk() && !['bei', 'auf'].includes(w.pk()) ? w.wort() : 'planet' + Object.keys(w2d(F).obj).length;
    const p = punkt(w);
    neuesObjekt(F, { typ: 'planet', name, t0: t, p, r, art, farbe: f ? h.farbeWert(f) : null });
    return 0;
  };
  Z.loch2d = Z.schwarzesloch = function (w, t, h) {
    const F = h.F;
    const r = w.optZahl(['groesse', 'radius'], 3);
    const scheibe = w.flag(['scheibe', 'mitscheibe', 'leuchtend']);
    const name = !w.istZahl() && w.pk() && !['bei', 'auf'].includes(w.pk()) ? w.wort() : 'loch';
    const p = punkt(w);
    const o = neuesObjekt(F, { typ: 'loch', name, t0: t, p, r, scheibe: [] });
    if (scheibe) o.scheibe.push({ t0: t, t1: t + 0.01, an: true });
    return 0;
  };
  Z.kollaps2d = function (w, t, h) {
    // ein Stern fällt zu einem schwarzen Loch zusammen
    const F = h.F, W = w2d(F);
    const n = w.wort();
    const s = W.obj[n];
    if (!s) throw new Error(`2D-Objekt „${n}“ gibt es nicht`);
    w.flag(['zu', 'zum']);
    const lochName = (w.pk() && !['in', 'dauer'].includes(w.pk())) ? w.wort() : 'loch';
    const r = w.optZahl(['groesse'], 3);
    const d = w.dauer(3);
    s.kollaps = { t0: t, t1: t + d };
    s.t1 = t + d;
    const o = neuesObjekt(F, { typ: 'loch', name: lochName, t0: t + d * 0.8, p: s.p.slice(), r, scheibe: [], geburt: true });
    void o;
    F.blitze.push({ t0: t + d * 0.8, t1: t + d * 0.8 + 0.5, staerke: 0.7 });
    h.ton(t, 'zisch', { dauer: d * 0.8 });
    h.ton(t + d * 0.8, 'explosion', { vol: 0.8 });
    return d;
  };
  Z.scheibe2d = function (w, t, h) {
    const W = w2d(h.F);
    const n = w.wort();
    const o = W.obj[n];
    if (!o || o.typ !== 'loch') throw new Error('So: scheibe2d loch an');
    const aus = w.flag(['aus']);
    const d = w.dauer(2);
    o.scheibe.push({ t0: t, t1: t + d, an: !aus });
    return 0;
  };
  Z.licht2d = Z.lichtstrahl = Z.lichtstrahlen = function (w, t, h) {
    const W = w2d(h.F);
    const anzahl = Math.round(w.optZahl(['anzahl'], 1));
    const abstand = w.optZahl(['abstand'], 3);
    const faecher = w.optZahl(['faecher', 'streuung'], 0);
    const f = farbe(h, w.optWort(['farbe']), '#ffe98a');
    let richtung = w.optZahl(['richtung', 'winkel'], null);
    const vi = w.finde(['von']); if (vi >= 0) w.t.splice(vi, 1);
    let start;
    if (w.pk() && W.obj[w.pk()]) start = W.obj[w.wort()].p.slice(); else start = [w.zahl(), w.zahl()];
    const zi = w.finde(['zu', 'nach', 'auf']);
    if (zi >= 0) {
      w.t.splice(zi, 1);
      let ziel;
      if (w.pk() && W.obj[w.pk()]) ziel = W.obj[w.wort()].p; else ziel = [w.zahl(), w.zahl()];
      richtung = Math.atan2(ziel[1] - start[1], ziel[0] - start[0]) * 180 / Math.PI;
    }
    if (richtung === null) richtung = 0;
    for (let i = 0; i < anzahl; i++) {
      const k = anzahl > 1 ? i / (anzahl - 1) - 0.5 : 0;
      const a = (richtung + k * faecher * 2) * Math.PI / 180;
      const off = faecher ? 0 : k * (anzahl - 1) * abstand;
      W.licht.push({ t0: t + (faecher ? 0 : Math.abs(k) * 0.15), x: start[0] - Math.sin(a) * off, y: start[1] + Math.cos(a) * off, a, farbe: f });
    }
    h.ton(t, 'magie');
    return 0;
  };
  Z.auge2d = Z.beobachter = function (w, t, h) {
    const F = h.F;
    const name = !w.istZahl() && w.pk() && !['bei', 'auf'].includes(w.pk()) ? w.wort() : 'auge';
    const r = w.optZahl(['groesse'], 3);
    const p = punkt(w);
    neuesObjekt(F, { typ: 'auge', name, t0: t, p, r });
    return 0;
  };
  Z.rakete2d = function (w, t, h) {
    const F = h.F;
    const name = !w.istZahl() && w.pk() && !['bei', 'auf'].includes(w.pk()) ? w.wort() : 'rakete';
    const r = w.optZahl(['groesse'], 3);
    const p = punkt(w);
    neuesObjekt(F, { typ: 'rakete', name, t0: t, p, r, winkel: w.optZahl(['winkel', 'richtung'], 90) });
    return 0;
  };
  Z.text2d = Z.schild2d = function (w, t, h) {
    const W = w2d(h.F);
    const txt = w.text();
    if (txt === null) throw new Error('So: text2d "Sonne" an stern');
    const d = w.dauerOderZahl(4);
    w.fuell();
    let an;
    if (w.pk() && W.obj[w.pk()]) an = { obj: w.wort() }; else an = { p: [w.zahl(), w.zahl()] };
    W.texte.push({ t0: t, t1: t + d, text: txt, an });
    return 0;
  };
  Z.bewege2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o) throw new Error('So: bewege2d name zu x y in 2');
    const d = w.dauer(2);
    w.fuell();
    const p = [w.zahl(), w.zahl()];
    o.segs.push({ typ: 'zu', t0: t, t1: t + d, von: aktuellePos(o), zu: p });
    o.pAkt = p;
    return d;
  };
  Z.umlauf2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o) throw new Error('So: umlauf2d mond um erde periode 6');
    const per = w.optZahl(['periode', 'umlauf'], 6);
    w.fuell();
    const m = W.obj[w.wort()];
    if (!m) throw new Error('Um welches Objekt soll es kreisen?');
    const p0 = aktuellePos(o);
    const r = Math.hypot(p0[0] - m.p[0], p0[1] - m.p[1]);
    o.segs.push({ typ: 'kreis', t0: t, mitte: m.name, r, a0: Math.atan2(p0[1] - m.p[1], p0[0] - m.p[0]), per });
    return 0;
  };
  Z.drehe2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o) throw new Error('So: drehe2d erde periode 4');
    o.drehPer = w.optZahl(['periode'], 4);
    o.drehAb = t;
    return 0;
  };
  // Natur: Bäume, Blätter, Wolken
  const NATURFARBE = { gruen: '#3f9a3a', grün: '#3f9a3a', gelb: '#f2c230', orange: '#f08a24', rot: '#e8412a', braun: '#8a5a2a', dunkelgruen: '#2a6a2a', blau: '#4a8cff', weiss: '#ffffff', lila: '#9a5aff', violett: '#9a5aff' };
  const naturFarbe = (h, s, d) => (s ? NATURFARBE[BF.norm(s)] || NATURFARBE[s] || h.farbeWert(s) : d);
  const nameOder = (w, def) => (!w.istZahl() && w.pk() && !['bei', 'auf', 'an'].includes(w.pk()) ? w.wort() : def);
  Z.baum2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse', 'hoehe'], 20);
    const f = naturFarbe(h, w.optWort(['farbe']), NATURFARBE.gruen);
    const name = nameOder(w, 'baum' + Object.keys(w2d(F).obj).length);
    const p = punkt(w);
    const o = neuesObjekt(F, { typ: 'baum', name, t0: t, p, r: gr, farben: [{ t0: -1, t1: -1, zu: f }], kahl: [] });
    void o;
    return 0;
  };
  Z.blatt2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 10);
    const f = naturFarbe(h, w.optWort(['farbe']), NATURFARBE.gruen);
    const name = nameOder(w, 'blatt' + Object.keys(w2d(F).obj).length);
    const p = punkt(w);
    neuesObjekt(F, { typ: 'blatt', name, t0: t, p, r: gr, farben: [{ t0: -1, t1: -1, zu: f }] });
    return 0;
  };
  Z.wolke2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 8);
    const regen = w.flag(['regen', 'regnet']);
    const name = nameOder(w, 'wolke' + Object.keys(w2d(F).obj).length);
    const p = punkt(w);
    neuesObjekt(F, { typ: 'wolke', name, t0: t, p, r: gr, regen });
    return 0;
  };
  Z.geist2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 6);
    const name = nameOder(w, 'geist');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'geist', name, t0: t, p, r: gr });
    return 0;
  };
  Z.wand2d = function (w, t, h) {
    const F = h.F;
    const hoehe = w.optZahl(['hoehe'], 22), breite = w.optZahl(['breite', 'dicke'], 4);
    const fenster = w.flag(['fenster', 'glas']);
    const name = nameOder(w, 'wand');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'wand', name, t0: t, p, r: hoehe, breite, fenster });
    return 0;
  };
  Z.kind2d = Z.mensch2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 9);
    const f = h.farbeWert(w.optWort(['farbe'], '#e85a3a'));
    const name = nameOder(w, 'kind');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'kind', name, t0: t, p, r: gr, farbe: f });
    return 0;
  };
  Z.atome2d = function (w, t, h) {
    // ein Gitter aus Atomen (z. B. ein Stück Wand ganz nah)
    const F = h.F;
    const sp = Math.round(w.optZahl(['spalten', 'breite'], 5)), ze = Math.round(w.optZahl(['zeilen', 'hoehe'], 5));
    const r = w.optZahl(['groesse', 'radius'], 2);
    const f = h.farbeWert(w.optWort(['farbe'], '#8fb8ff'));
    const wolke = w.flag(['wolke', 'elektronen', 'leer']);
    const name = nameOder(w, 'atome' + Object.keys(w2d(F).obj).length);
    const p = punkt(w);
    neuesObjekt(F, { typ: 'atome', name, t0: t, p, r, sp, ze, farbe: f, wolke });
    return 0;
  };
  Z.regenbogen2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse', 'radius'], 20);
    const name = nameOder(w, 'regenbogen');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'regenbogen', name, t0: t, p, r: gr });
    return 0;
  };
  Z.luft2d = function (w, t, h) {
    const F = h.F;
    const b = w.optZahl(['breite'], 40), hh = w.optZahl(['hoehe'], 20), n = Math.round(w.optZahl(['anzahl'], 60));
    const name = nameOder(w, 'luft');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'luft', name, t0: t, p, r: hh / 2, breite: b, hoehe: hh, n });
    return 0;
  };
  Z.zickzack2d = Z.streulicht2d = function (w, t, h) {
    // Licht, das an Luftteilchen abprallt und kreuz und quer hüpft
    const W = w2d(h.F);
    const f = naturFarbe(h, w.optWort(['farbe']), '#4a8cff');
    const n = Math.round(w.optZahl(['anzahl'], 3));
    const vi = w.finde(['von']); if (vi >= 0) w.t.splice(vi, 1);
    const von = [w.zahl(), w.zahl()];
    const ni = w.finde(['nach', 'zu', 'bis']); if (ni >= 0) w.t.splice(ni, 1);
    let nach;
    if (w.pk() && W.obj[w.pk()]) nach = W.obj[w.wort()].p.slice(); else nach = [w.zahl(), w.zahl()];
    W.zickzack = W.zickzack || [];
    for (let i = 0; i < n; i++) W.zickzack.push({ t0: t + i * 0.35, von, nach, farbe: f, seed: W.zickzack.length * 13 + 5 });
    h.ton(t, 'magie');
    return 0;
  };
  Z.thermometer2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 14);
    const wert = w.optZahl(['wert', 'grad'], 15);
    const name = nameOder(w, 'thermometer');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'thermometer', name, t0: t, p, r: gr, werte: [{ t0: -1, t1: -1, zu: wert }] });
    return 0;
  };
  Z.temperatur2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o || !o.werte) throw new Error('So: temperatur2d thermometer auf 35 in 2');
    w.flag(['auf', 'zu']);
    const d = w.dauer(2);
    o.werte.push({ t0: t, t1: t + d, zu: w.zahl() });
    return d;
  };
  Z.huelle2d = Z.atmosphaere2d = function (w, t, h) {
    const W = w2d(h.F);
    const dicke = w.optZahl(['dicke'], 1);
    const name = nameOder(w, 'huelle');
    w.fuell();
    const pl = W.obj[w.wort()];
    if (!pl) throw new Error('So: huelle2d decke um erde dicke 1');
    neuesObjekt(h.F, { typ: 'huelle', name, t0: t, p: pl.p.slice(), r: pl.r, planet: pl.name, dicken: [{ t0: -1, t1: -1, zu: dicke }] });
    return 0;
  };
  Z.dicke2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o || !o.dicken) throw new Error('So: dicke2d decke auf 3 in 4');
    w.flag(['auf', 'zu']);
    const d = w.dauer(3);
    o.dicken.push({ t0: t, t1: t + d, zu: w.zahl() });
    return d;
  };
  Z.kaktus2d = function (w, t, h) { const F = h.F; const gr = w.optZahl(['groesse'], 8); const name = nameOder(w, 'kaktus' + Object.keys(w2d(F).obj).length); neuesObjekt(F, { typ: 'kaktus', name, t0: t, p: punkt(w), r: gr }); return 0; };
  // Mathe: Äpfel, große Zahlen, Formen, Pizza (Brüche), Reihen zum Zählen
  Z.apfel2d = function (w, t, h) { const F = h.F; const gr = w.optZahl(['groesse'], 3); const f = naturFarbe(h, w.optWort(['farbe']), '#e8412a'); const name = nameOder(w, 'apfel' + Object.keys(w2d(F).obj).length); neuesObjekt(F, { typ: 'apfel', name, t0: t, p: punkt(w), r: gr, farbe: f }); return 0; };
  Z.zahl2d = function (w, t, h) {
    const F = h.F;
    const name = nameOder(w, 'zahl' + Object.keys(w2d(F).obj).length);
    const txt = w.text();
    if (txt === null) throw new Error('So: zahl2d z1 "3 + 2 = 5" bei 0 0 groesse 8');
    const gr = w.optZahl(['groesse'], 8);
    const f = naturFarbe(h, w.optWort(['farbe']), '#ffffff');
    neuesObjekt(F, { typ: 'zahl', name, t0: t, p: punkt(w), r: gr, text: txt, farbe: f });
    return 0;
  };
  Z.symbol2d = Z.emoji2d = Z.zeichen2d = function (w, t, h) {
    // ein Bildzeichen, z. B. symbol2d auto "🚗" bei 10 0 groesse 6
    const F = h.F;
    const name = nameOder(w, 'symbol' + Object.keys(w2d(F).obj).length);
    const txt = w.text();
    if (txt === null) throw new Error('So: symbol2d auto "🚗" bei 10 0 groesse 6');
    const gr = w.optZahl(['groesse'], 6);
    neuesObjekt(F, { typ: 'zahl', name, t0: t, p: punkt(w), r: gr, text: txt, farbe: '#ffffff', ohneRand: true });
    h.ton(t, 'plopp', { vol: 0.35 });
    return 0;
  };
  Z.kippe2d = Z.neige2d = function (w, t, h) {
    // ein Objekt drehen: kippe2d tablet auf 90 in 1
    const o = w2d(h.F).obj[w.wort()];
    if (!o) throw new Error('So: kippe2d tablet auf 90 in 1');
    w.flag(['auf', 'um', 'zu']);
    const ziel = w.zahl();
    const d = w.dauer(1);
    o.kipp = o.kipp || [{ t0: -1, t1: -1, zu: 0 }];
    o.kipp.push({ t0: t, t1: t + d, zu: ziel });
    return d;
  };
  Z.form2d = function (w, t, h) {
    const F = h.F;
    const art = BF.norm(w.optWort(['art', 'als'], 'kreis'));
    if (!['kreis', 'dreieck', 'quadrat', 'rechteck', 'sechseck', 'stern', 'wuerfel', 'kugel'].includes(art)) throw new Error('Formen: kreis, dreieck, quadrat, rechteck, sechseck, stern, wuerfel, kugel');
    const gr = w.optZahl(['groesse'], 6);
    const f = naturFarbe(h, w.optWort(['farbe']), '#4a8cff');
    const name = nameOder(w, art + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'form', name, t0: t, p: punkt(w), r: gr, art, farbe: f });
    return 0;
  };
  Z.pizza2d = function (w, t, h) {
    const F = h.F;
    const teile = Math.max(1, Math.round(w.optZahl(['teile', 'stuecke'], 4)));
    const gr = w.optZahl(['groesse'], 8);
    const name = nameOder(w, 'pizza' + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'pizza', name, t0: t, p: punkt(w), r: gr, teile, weg: [{ t: -1, n: 0 }] });
    return 0;
  };
  Z.pizzaweg2d = Z.wegnehmen2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'pizza') throw new Error('So: pizzaweg2d pizza anzahl 1');
    const n = Math.round(w.optZahl(['anzahl', 'stuecke', 'teile'], 1));
    o.weg.push({ t, n: o.weg[o.weg.length - 1].n + n });
    h.ton(t, 'mampf');
    return 0;
  };
  Z.reihe2d = function (w, t, h) {
    // mehrere gleiche Dinge nebeneinander: reihe2d a anzahl 5 bei -20 0 abstand 6 art apfel  → Namen a1 … a5
    const F = h.F;
    const name = nameOder(w, 'reihe');
    const n = Math.max(1, Math.min(40, Math.round(w.optZahl(['anzahl'], 3))));
    const abstand = w.optZahl(['abstand'], 6);
    const proZeile = Math.round(w.optZahl(['zeile', 'prozeile'], n));
    const art = BF.norm(w.optWort(['art', 'als'], 'apfel'));
    const gr = w.optZahl(['groesse'], 3);
    const fw = w.optWort(['farbe']);
    const p = punkt(w);
    for (let i = 0; i < n; i++) {
      const x = p[0] + (i % proZeile) * abstand, y = p[1] - Math.floor(i / proZeile) * abstand;
      const t0 = t + i * 0.25;
      if (art === 'apfel') neuesObjekt(F, { typ: 'apfel', name: name + (i + 1), t0, p: [x, y], r: gr, farbe: naturFarbe(h, fw, '#e8412a') });
      else if (art === 'stern') neuesObjekt(F, { typ: 'form', name: name + (i + 1), t0, p: [x, y], r: gr, art: 'stern', farbe: naturFarbe(h, fw, '#f2c230') });
      else neuesObjekt(F, { typ: 'form', name: name + (i + 1), t0, p: [x, y], r: gr, art, farbe: naturFarbe(h, fw, '#4a8cff') });
      h.ton(t0, 'plopp', { vol: 0.4 });
    }
    return n * 0.25;
  };
  Z.pinguin2d = function (w, t, h) { const F = h.F; const gr = w.optZahl(['groesse'], 6); const name = nameOder(w, 'pinguin' + Object.keys(w2d(F).obj).length); neuesObjekt(F, { typ: 'pinguin', name, t0: t, p: punkt(w), r: gr }); return 0; };
  // Menschlicher Körper mit Organen (von vorne)
  const ORGANE = ['gehirn', 'nerven', 'herz', 'blut', 'lunge', 'magen', 'darm', 'knochen'];
  Z.koerper2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse', 'hoehe'], 46);
    const name = nameOder(w, 'koerper');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'koerper', name, t0: t, p, r: gr, organe: {}, essen: [], winken: [] });
    return 0;
  };
  Z.zeige2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o || o.typ !== 'koerper') throw new Error('So: zeige2d koerper herz (oder: gehirn, nerven, blut, lunge, magen, darm, knochen, alles)');
    const aus = w.flag(['aus', 'weg']);
    let teil = w.wort();
    const liste = teil === 'alles' ? ORGANE : [teil];
    for (const tl of liste) {
      if (!ORGANE.includes(tl)) throw new Error(`Organ „${tl}“ kenne ich nicht: ${ORGANE.join(', ')}`);
      (o.organe[tl] = o.organe[tl] || []).push({ t0: t, t1: t + 0.8, zu: aus ? 0 : 1 });
    }
    return 0;
  };
  Z.essen2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'koerper') throw new Error('So: essen2d koerper');
    o.essen.push(t);
    return 0;
  };
  Z.winke2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'koerper') throw new Error('So: winke2d koerper in 3');
    const d = w.dauer(3);
    o.winken.push({ t0: t, t1: t + d });
    return 0;
  };
  // Keime und Abwehr
  const einfach = (typ, gr0) => function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], gr0);
    const f = w.optWort(['farbe']);
    const gut = w.flag(['gut', 'nett', 'freundlich']);
    const ohneGesicht = w.flag(['ohnegesicht']);
    const name = nameOder(w, typ + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ, name, t0: t, p: punkt(w), r: gr, farbe: f ? naturFarbe(h, f, null) : null, gut, ohneGesicht });
    return 0;
  };
  Z.virus2d = einfach('virus', 2.5);
  Z.bakterie2d = einfach('bakterie', 3);
  Z.zelle2d = einfach('zelle', 12);
  Z.abwehr2d = Z.abwehrzelle2d = einfach('abwehr', 4);
  Z.antikoerper2d = einfach('antikoerper', 1.2);
  Z.teilen2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'bakterie') throw new Error('So: teilen2d bakterie in 2');
    const d = w.dauer(2);
    o.teilung = { t0: t, t1: t + d };
    return d;
  };
  Z.niesen2d = Z.husten2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o) throw new Error('So: niesen2d kind richtung rechts');
    const links = w.flag(['links']); w.flag(['rechts', 'richtung']);
    W.niesen = W.niesen || [];
    W.niesen.push({ t0: t, wer: o.name, richtung: links ? -1 : 1 });
    h.ton(t, 'puff', { vol: 0.9 });
    return 0;
  };
  Z.blasen2d = Z.seife2d = function (w, t, h) {
    const W = w2d(h.F);
    const d = w.dauer(5);
    const n = Math.round(w.optZahl(['anzahl'], 18));
    w.fuell();
    let p;
    if (w.pk() && W.obj[w.pk()]) p = W.obj[w.wort()].p.slice(); else p = [w.zahl(), w.zahl()];
    W.blasen = W.blasen || [];
    W.blasen.push({ t0: t, t1: t + d, p, n });
    return 0;
  };
  Z.vermehren2d = function (w, t, h) {
    // Viren-Kopien entstehen in einer Zelle; mit "platzen" fliegen sie danach heraus
    const W = w2d(h.F);
    const z = W.obj[w.wort()];
    if (!z || z.typ !== 'zelle') throw new Error('So: vermehren2d zelle anzahl 10 in 5');
    const n = Math.round(w.optZahl(['anzahl'], 10));
    const d = w.dauer(5);
    z.kopien = { t0: t, t1: t + d, n, platzen: null };
    return d;
  };
  Z.platzen2d = function (w, t, h) {
    const z = w2d(h.F).obj[w.wort()];
    if (!z || !z.kopien) throw new Error('Erst vermehren2d, dann platzen2d');
    z.kopien.platzen = t;
    z.t1 = t + 7;
    h.ton(t, 'knall', { vol: 0.6 });
    return 1.5;
  };
  // Technik: Geräte, Bauteile, Bits, Pixel, Funk, Daten, Akku
  Z.geraet2d = function (w, t, h) {
    const F = h.F;
    const art = BF.norm(w.optWort(['art', 'als'], 'handy'));
    const gr = w.optZahl(['groesse'], 12);
    const bild = BF.norm(w.optWort(['bild', 'zeigt'], 'apps'));
    const name = nameOder(w, art + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'geraet', name, t0: t, p: punkt(w), r: gr, art, bild, bilder: [{ t0: -1, bild }] });
    return 0;
  };
  Z.bildschirm2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'geraet') throw new Error('So: bildschirm2d handy zeigt foto (apps, foto, anruf, spiel, aus, internet, video, nachricht, code)');
    w.flag(['zeigt', 'auf']);
    o.bilder.push({ t0: t, bild: BF.norm(w.wort() || 'apps') });
    return 0;
  };
  Z.bauteil2d = function (w, t, h) {
    const F = h.F;
    const art = BF.norm(w.optWort(['art', 'als'], 'chip'));
    const gr = w.optZahl(['groesse'], 5);
    const name = nameOder(w, art + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'bauteil', name, t0: t, p: punkt(w), r: gr, art });
    return 0;
  };
  Z.bits2d = function (w, t, h) {
    const F = h.F;
    const wert = w.optWort(['wert', 'zeigt'], '01000001');
    const laufen = w.flag(['laufen', 'blinken', 'zufall']);
    const gr = w.optZahl(['groesse'], 3);
    const name = nameOder(w, 'bits' + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'bits', name, t0: t, p: punkt(w), r: gr, wert: String(wert).replace(/[^01]/g, ''), laufen });
    return 0;
  };
  Z.pixel2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 20);
    const nah = w.flag(['nah', 'farben', 'rgb']);
    const name = nameOder(w, 'pixel' + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'pixel', name, t0: t, p: punkt(w), r: gr, nah });
    return 0;
  };
  Z.mast2d = Z.funkmast2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 18);
    const name = nameOder(w, 'mast' + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'mast', name, t0: t, p: punkt(w), r: gr });
    return 0;
  };
  Z.akku2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 8);
    const wert = w.optZahl(['wert', 'prozent'], 20);
    const name = nameOder(w, 'akku');
    neuesObjekt(F, { typ: 'akku', name, t0: t, p: punkt(w), r: gr, werte: [{ t0: -1, t1: -1, zu: wert }] });
    return 0;
  };
  Z.wellen2d = Z.funk2d = Z.daten2d = function (w, t, h) {
    // Funkwellen oder Daten-Päckchen von A nach B (Objekt-Namen oder x y)
    const W = w2d(h.F);
    const art = w.flag(['paeckchen', 'daten', 'pakete']) ? 'daten' : 'wellen';
    const f = naturFarbe(h, w.optWort(['farbe']), art === 'daten' ? '#3ab0e8' : '#f2c230');
    const d = w.dauer(4);
    const lies = () => { if (w.pk() && W.obj[w.pk()]) return { obj: w.wort() }; return { p: [w.zahl(), w.zahl()] }; };
    const vi = w.finde(['von']); if (vi >= 0) w.t.splice(vi, 1);
    const von = lies();
    const ni = w.finde(['nach', 'zu', 'bis']); if (ni >= 0) w.t.splice(ni, 1);
    const nach = lies();
    W.wellen = W.wellen || [];
    W.wellen.push({ t0: t, t1: t + d, von, nach, art, farbe: f });
    return 0;
  };
  Z.faerbe2d = Z.farbe2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o || !o.farben) throw new Error('So: faerbe2d baum zu gelb in 3');
    w.flag(['zu', 'in', 'auf']);
    const d = w.dauer(2);
    const f = naturFarbe(h, w.wort(), NATURFARBE.gelb);
    o.farben.push({ t0: t, t1: t + d, zu: f });
    return d;
  };
  Z.blaetterfallen2d = Z.laubfallen2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o || o.typ !== 'baum') throw new Error('So: blaetterfallen2d baum anzahl 30 in 8');
    const n = Math.round(w.optZahl(['anzahl'], 30));
    const d = w.dauer(8);
    o.kahl.push({ t0: t, t1: t + d, zu: 1 });
    o.fallen = o.fallen || [];
    o.fallen.push({ t0: t, t1: t + d, n });
    return d;
  };
  Z.wachsen2d = function (w, t, h) {
    const W = w2d(h.F);
    const o = W.obj[w.wort()];
    if (!o || o.typ !== 'baum') throw new Error('So: wachsen2d baum in 3');
    const d = w.dauer(3);
    o.kahl.push({ t0: t, t1: t + d, zu: 0 });
    return d;
  };
  Z.verstecke2d = function (w, t, h) { const W = w2d(h.F); const o = W.obj[w.wort()]; if (o && !(o.t1 <= t)) o.t1 = Math.min(o.t1 ?? Infinity, t + 0.4); return 0; };
  const aktuellePos = o => (o.pAkt ? o.pAkt.slice() : o.p.slice());

  // ---------- Auswertung ----------
  BF.welt2dAktiv = function (F, t) {
    if (!F.w2d) return false;
    let an = false;
    for (const e of F.w2d.an) if (e.t <= t) an = e.an;
    return an;
  };
  function pos(F, o, t, tiefe = 0) {
    let p = o.p.slice();
    for (const s of o.segs) {
      if (s.t0 > t) break;
      if (s.typ === 'zu') { const u = sanft(clamp((t - s.t0) / Math.max(0.001, s.t1 - s.t0), 0, 1)); p = [lerp(s.von[0], s.zu[0], u), lerp(s.von[1], s.zu[1], u)]; }
      if (s.typ === 'kreis' && tiefe < 4) {
        const m = F.w2d.obj[s.mitte];
        const c = pos(F, m, t, tiefe + 1);
        const a = s.a0 + (t - s.t0) / s.per * Math.PI * 2;
        p = [c[0] + Math.cos(a) * s.r, c[1] + Math.sin(a) * s.r];
      }
    }
    return p;
  }
  function kamera(F, t) {
    let x = 0, y = 0, z = 1;
    for (const k of F.w2d.kam) {
      if (k.t0 > t) break;
      const u = k.t1 > k.t0 ? sanft(clamp((t - k.t0) / (k.t1 - k.t0), 0, 1)) : 1;
      let p = k.p;
      if (p && p.obj) p = pos(F, F.w2d.obj[p.obj], t);
      if (p) { x = lerp(x, p[0], u); y = lerp(y, p[1], u); }
      if (k.zoom !== null) z = lerp(z, k.zoom, u);
    }
    return { x, y, z };
  }
  function lochAktiv(F, t) {
    return F.w2d.liste.filter(o => o.typ === 'loch' && t >= o.t0 && t < o.t1);
  }
  // Bahn eines Lichtstrahls (einmal berechnet, mit allen schwarzen Löchern, die zu dem Zeitpunkt da sind)
  function bahn(F, s) {
    if (s.pfad) return s.pfad;
    const loecher = lochAktiv(F, s.t0 + 0.01).map(o => ({ p: pos(F, o, s.t0), r: o.r }));
    const koerper = F.w2d.liste.filter(o => (o.typ === 'planet' || o.typ === 'auge' || o.typ === 'geraet') && s.t0 + 0.01 >= o.t0 && s.t0 < o.t1).map(o => ({ p: pos(F, o, s.t0), r: o.typ === 'auge' ? o.r * 1.2 : o.typ === 'geraet' ? o.r * 0.32 : o.r }));
    const waende = F.w2d.liste.filter(o => o.typ === 'wand' && !o.fenster && s.t0 + 0.01 >= o.t0 && s.t0 < o.t1).map(o => ({ p: pos(F, o, s.t0), b: o.breite, h: o.r }));
    const startIn = koerper.filter(K => Math.hypot(s.x - K.p[0], s.y - K.p[1]) < K.r);
    const pts = [s.x, s.y];
    let x = s.x, y = s.y, vx = Math.cos(s.a) * C, vy = Math.sin(s.a) * C;
    const dt = 1 / 120;
    let ende = 'weg';
    for (let i = 0; i < 120 * 10; i++) {
      for (const L of loecher) {
        const dx = x - L.p[0], dy = y - L.p[1], r = Math.hypot(dx, dy);
        if (r < L.r) { ende = 'gefangen'; i = 1e9; break; }
        const a = 1.02 * L.r * C * C / (r * r);
        vx -= a * dx / r * dt; vy -= a * dy / r * dt;
      }
      if (i >= 1e9) break;
      let getroffen = false;
      for (const K of koerper) if (!startIn.includes(K) && Math.hypot(x - K.p[0], y - K.p[1]) < K.r) getroffen = true;
      for (const wd of waende) if (Math.abs(x - wd.p[0]) < wd.b / 2 && y > wd.p[1] && y < wd.p[1] + wd.h) getroffen = true;
      if (getroffen) { ende = 'getroffen'; break; }
      const v = Math.hypot(vx, vy); vx = vx / v * C; vy = vy / v * C;
      x += vx * dt; y += vy * dt;
      pts.push(x, y);
      if (Math.abs(x) > 140 || Math.abs(y) > 110) break;
    }
    s.ende = ende;
    s.pfad = new Float32Array(pts);
    return s.pfad;
  }

  // ---------- Zeichnen ----------
  const sterne = (() => { const r = BF.rng(2024); const a = []; for (let i = 0; i < 900; i++) a.push([(r() - 0.5) * 360, (r() - 0.5) * 220, r() * 1.2 + 0.25, r(), r()]); return a; })();
  const leinwand = document.createElement('canvas');
  BF.welt2dLeinwand = leinwand;

  BF.welt2dZeichnen = function (F, t, w, h) {
    if (leinwand.width !== w || leinwand.height !== h) { leinwand.width = w; leinwand.height = h; }
    const ctx = leinwand.getContext('2d');
    const K = kamera(F, t);
    const s = (w / 100) * K.z; // Pixel pro Einheit
    const X = x => w / 2 + (x - K.x) * s, Y = y => h / 2 - (y - K.y) * s;
    const E = h / 1080;
    // Hintergrund
    let hg = 'weltraum', hgAlt = null, hgU = 1;
    for (const b of F.w2d.hg) if (b.t0 <= t) { hgAlt = hg; hg = b.art; hgU = b.t1 > b.t0 ? sanft(clamp((t - b.t0) / (b.t1 - b.t0), 0, 1)) : 1; }
    const loecher = lochAktiv(F, t).map(o => {
      const p = pos(F, o, t);
      const wachsen = o.geburt ? sanft(clamp((t - o.t0) / 0.6, 0, 1)) : clamp((t - o.t0) / 0.4, 0, 1);
      return { o, p, r: o.r * wachsen, sx: X(p[0]), sy: Y(p[1]) };
    });
    const hgZeichnen = (art, alpha) => {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha;
      if (art === 'weltraum' || art === 'all' || art === 'space') { ctx.fillStyle = '#060818'; ctx.fillRect(0, 0, w, h); }
      else if (art === 'abend' || art === 'sonnenuntergang') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#4a4f9a'); g.addColorStop(0.35, '#d8708a'); g.addColorStop(0.62, '#f8a048'); g.addColorStop(0.7, '#ffd070'); g.addColorStop(0.7, '#4a7a2a'); g.addColorStop(1, '#2f5a1c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      } else if (art === 'erde' || art === 'himmel') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#5f9ae8'); g.addColorStop(0.7, '#bcd8f5'); g.addColorStop(0.7, '#5c9a3a'); g.addColorStop(1, '#3f7a28');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      } else if (art === 'wueste') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#7ab0e8'); g.addColorStop(0.68, '#f4e0b0'); g.addColorStop(0.7, '#e8c27a'); g.addColorStop(1, '#c89a52');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      } else if (art === 'schnee') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#9ab8d8'); g.addColorStop(0.69, '#dfe9f2'); g.addColorStop(0.7, '#f4f8fb'); g.addColorStop(1, '#d8e4ee');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      } else if (art === 'zimmer') {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#f6e8d0'); g.addColorStop(0.7, '#f0dcbc'); g.addColorStop(0.7, '#b8865a'); g.addColorStop(1, '#9a6a42');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120,80,40,0.25)'; ctx.lineWidth = 2 * E;
        for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * w / 11, h * 0.7); ctx.lineTo(i * w / 11 - w * 0.05, h); ctx.stroke(); }
      } else if (art === 'mikro') {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
        g.addColorStop(0, '#fbe8ec'); g.addColorStop(1, '#e8c0cc');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const rm = BF.rng(55);
        for (let i = 0; i < 26; i++) { ctx.strokeStyle = 'rgba(200,120,150,0.18)'; ctx.lineWidth = 2 * E; ctx.beginPath(); ctx.arc(rm() * w + Math.sin(t * 0.3 + i) * 10 * E, rm() * h, (20 + rm() * 60) * E, 0, 7); ctx.stroke(); }
      } else if (art === 'tafel') { ctx.fillStyle = '#23402f'; ctx.fillRect(0, 0, w, h); }
      else if (BF.hintergruende2d && BF.hintergruende2d[art]) BF.hintergruende2d[art](ctx, w, h, t, E);
      else { ctx.fillStyle = art === 'weiss' ? '#f4f4f0' : '#1a1d24'; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    };
    const istAll = a => a === 'weltraum' || a === 'all' || a === 'space';
    if (hgU < 1 && hgAlt && !(istAll(hg) && istAll(hgAlt))) {
      hgZeichnen(hgAlt, 1);
      if (istAll(hgAlt)) weltallSterne(1 - hgU);
      hgZeichnen(hg, hgU);
      if (istAll(hg)) weltallSterne(hgU);
    } else if (!istAll(hg)) {
      hgZeichnen(hg, 1);
    }
    function weltallSterne(alpha) {
      ctx.save(); ctx.globalAlpha = alpha;
      for (const st of sterne) {
        const sx = w / 2 + (st[0] - K.x * 0.35) * s * 0.9, sy = h / 2 - (st[1] - K.y * 0.35) * s * 0.9;
        const hell = 0.5 + 0.5 * Math.sin(t * (1 + st[3] * 2) + st[4] * 20);
        ctx.fillStyle = `rgba(255,255,255,${0.35 + hell * 0.6})`;
        const gr = st[2] * E * 1.6; ctx.fillRect(sx - gr / 2, sy - gr / 2, gr, gr);
      }
      ctx.restore();
    }
    if (istAll(hg) && !(hgU < 1 && hgAlt && !istAll(hgAlt))) {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, w * 0.8);
      g.addColorStop(0, '#0d1230'); g.addColorStop(0.6, '#060818'); g.addColorStop(1, '#020309');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // Nebel
      for (const [nx, ny, nr, nf] of [[-60, 30, 60, 'rgba(90,60,160,0.10)'], [70, -40, 70, 'rgba(40,90,160,0.09)'], [20, 60, 50, 'rgba(160,60,120,0.06)']]) {
        const gx = X(nx * 0.4 + K.x * 0.6), gy = Y(ny * 0.4 + K.y * 0.6);
        const ng = ctx.createRadialGradient(gx, gy, 0, gx, gy, nr * s * 0.8);
        ng.addColorStop(0, nf); ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ng; ctx.fillRect(0, 0, w, h);
      }
      // Sterne – hinter schwarzen Löchern wird das Bild verbogen (Gravitationslinse)
      for (const st of sterne) {
        const par = 0.35;
        let sx = w / 2 + (st[0] - K.x * par) * s * 0.9, sy = h / 2 - (st[1] - K.y * par) * s * 0.9;
        let hell = 0.5 + 0.5 * Math.sin(t * (1 + st[3] * 2) + st[4] * 20);
        let zweit = null, weg = false;
        for (const L of loecher) {
          const dx = sx - L.sx, dy = sy - L.sy, r = Math.hypot(dx, dy);
          const RE = L.r * 3.2 * s, schatten = L.r * 2.6 * s;
          if (r < 1) { weg = true; break; }
          const r1 = (r + Math.sqrt(r * r + 4 * RE * RE)) / 2;
          const r2 = (r - Math.sqrt(r * r + 4 * RE * RE)) / 2;
          zweit = [L.sx + dx / r * r2, L.sy + dy / r * r2, Math.abs(r2) > schatten];
          sx = L.sx + dx / r * r1; sy = L.sy + dy / r * r1;
          if (r1 < schatten) weg = true;
        }
        if (weg) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + hell * 0.6})`;
        const gr = st[2] * E * 1.6;
        ctx.fillRect(sx - gr / 2, sy - gr / 2, gr, gr);
        if (zweit && zweit[2]) { ctx.fillStyle = `rgba(255,255,255,${0.25 + hell * 0.3})`; ctx.fillRect(zweit[0] - gr / 3, zweit[1] - gr / 3, gr / 1.5, gr / 1.5); }
      }
    }
    // Objekte
    for (const o of F.w2d.liste) {
      if (t < o.t0 || t >= o.t1 || o.typ === 'loch') continue;
      const p = pos(F, o, t);
      const sx = X(p[0]), sy = Y(p[1]);
      let r = o.r * s;
      const ein = clamp((t - o.t0) / 0.4, 0, 1) * clamp((o.t1 - t) / 0.4, 0, 1);
      ctx.save();
      ctx.globalAlpha = o.kollaps ? 1 : ein;
      if (o.kipp) { const wk = wertBei(o.kipp, t, 0); if (wk) { ctx.translate(sx, sy); ctx.rotate(wk * Math.PI / 180); ctx.translate(-sx, -sy); } }
      if (o.typ === 'stern') {
        let f = o.farbe;
        if (o.kollaps && t >= o.kollaps.t0) {
          const u = clamp((t - o.kollaps.t0) / (o.kollaps.t1 - o.kollaps.t0), 0, 1);
          r *= Math.max(0.02, 1 - Math.pow(u / 0.8, 2.2));
          if (u > 0.8) r = 0;
          f = u > 0.4 ? '#cfe0ff' : f;
          // Zittern vor dem Zusammenfall
          ctx.translate(Math.sin(t * 70) * u * 3 * E, Math.cos(t * 63) * u * 3 * E);
        }
        if (r > 0.5) {
          const flacker = 1 + Math.sin(t * 3) * 0.03;
          const glow = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 3.2 * flacker);
          glow.addColorStop(0, f); glow.addColorStop(0.25, BF.rgba(BF.hex(f), 1, 0.35)); glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, r * 3.2, 0, 7); ctx.fill();
          const kern = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
          kern.addColorStop(0, '#ffffff'); kern.addColorStop(0.6, f); kern.addColorStop(1, BF.rgba(BF.hex(f), 0.8));
          ctx.fillStyle = kern; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
        }
        // Explosion (Supernova-Ring) beim Zusammenfall
        if (o.kollaps) {
          const tb = t - (o.kollaps.t0 + (o.kollaps.t1 - o.kollaps.t0) * 0.8);
          if (tb > 0 && tb < 2.5) {
            ctx.globalAlpha = 1 - tb / 2.5;
            ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = 6 * E * (1 - tb / 2.5);
            ctx.beginPath(); ctx.arc(sx, sy, tb * 30 * s / K.z * 0.5 * K.z, 0, 7); ctx.stroke();
            const rr = BF.rng(77);
            for (let i = 0; i < 80; i++) { const a = rr() * 6.283, v = (10 + rr() * 25) * tb; ctx.fillStyle = rr() > 0.5 ? '#ffe9b0' : '#9fc8ff'; ctx.fillRect(sx + Math.cos(a) * v * s, sy + Math.sin(a) * v * s, 3 * E, 3 * E); }
          }
        }
      } else if (o.typ === 'planet') {
        planet(ctx, o, sx, sy, r, t, F, p);
      } else if (o.typ === 'baum') {
        baum(ctx, o, sx, sy, s, t, F);
      } else if (o.typ === 'blatt') {
        blatt(ctx, sx, sy, r, farbeBei(o, t), Math.sin(t * 1.3) * 0.08 - 0.4, 1, E);
      } else if (o.typ === 'wolke') {
        wolke(ctx, sx, sy, r, t, o, E);
      } else if (o.typ === 'koerper') {
        koerper(ctx, o, sx, sy, s, t, E);
      } else if (o.typ === 'geraet' || o.typ === 'bauteil' || o.typ === 'bits' || o.typ === 'pixel' || o.typ === 'mast' || o.typ === 'akku') {
        technik(ctx, o, sx, sy, r, t, s, E);
      } else if (o.typ === 'virus' || o.typ === 'bakterie' || o.typ === 'zelle' || o.typ === 'abwehr' || o.typ === 'antikoerper') {
        keim(ctx, o, sx, sy, r, t, s, E, F, p);
      } else if (o.typ === 'thermometer') {
        const wert = wertBei(o.werte, t, o.werte[0].zu);
        const H = r, b = H * 0.16, x = sx - b / 2, y = sy - H * 0.5;
        const anteil = clamp((wert + 40) / 90, 0.03, 1);
        ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = '#555'; ctx.lineWidth = Math.max(1.5, H * 0.015);
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, b, H * 0.85, b / 2) : ctx.rect(x, y, b, H * 0.85); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, y + H * 0.9, b * 0.85, 0, 7); ctx.fill(); ctx.stroke();
        const farbe = wert >= 25 ? '#e8412a' : wert >= 10 ? '#f08a24' : wert >= 0 ? '#4ab84a' : '#4a8cff';
        ctx.fillStyle = farbe;
        ctx.beginPath(); ctx.arc(sx, y + H * 0.9, b * 0.6, 0, 7); ctx.fill();
        const fh = H * 0.8 * anteil;
        ctx.fillRect(sx - b * 0.22, y + H * 0.88 - fh, b * 0.44, fh);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4 * E;
        ctx.font = `bold ${Math.round(Math.max(18 * E, H * 0.12))}px "Segoe UI", "Noto Sans", sans-serif`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const txt = (Math.round(wert * 10) / 10).toString().replace('.', ',') + ' °C';
        ctx.strokeText(txt, sx + b, y + H * 0.88 - fh); ctx.fillText(txt, sx + b, y + H * 0.88 - fh);
      } else if (o.typ === 'huelle') {
        const pl = F.w2d.obj[o.planet];
        const pp = pl ? pos(F, pl, t) : p;
        const cx = X(pp[0]), cy = Y(pp[1]);
        const dk = wertBei(o.dicken, t, o.dicken[0].zu);
        const innen = o.r * s, aussen = (o.r + dk * 1.2) * s;
        const grau = clamp((dk - 1) / 3, 0, 1);
        const g = ctx.createRadialGradient(cx, cy, innen, cx, cy, aussen);
        g.addColorStop(0, `rgba(${Math.round(120 + 80 * grau)},${Math.round(180 + 10 * grau)},${Math.round(255 - 120 * grau)},0.55)`);
        g.addColorStop(1, 'rgba(120,180,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, aussen, 0, Math.PI * 2); ctx.moveTo(cx + innen, cy); ctx.arc(cx, cy, innen, 0, Math.PI * 2, true); ctx.fill();
      } else if (o.typ === 'apfel') {
        const hupf = clamp((t - o.t0) / 0.35, 0, 1);
        r *= 0.6 + 0.4 * (1 - Math.pow(1 - hupf, 3)) + Math.sin(clamp((t - o.t0) / 0.35, 0, 1) * Math.PI) * 0.15;
        ctx.fillStyle = o.farbe; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.beginPath(); ctx.arc(sx - r * 0.42, sy + r * 0.05, r * 0.68, 0, 7); ctx.arc(sx + r * 0.42, sy + r * 0.05, r * 0.68, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx, sy + r * 0.12, r * 1.02, r * 0.86, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(sx - r * 0.45, sy - r * 0.2, r * 0.18, r * 0.3, -0.5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.6); ctx.quadraticCurveTo(sx + r * 0.05, sy - r * 1.0, sx + r * 0.2, sy - r * 1.15); ctx.stroke();
        ctx.fillStyle = '#4ab84a'; ctx.beginPath(); ctx.ellipse(sx + r * 0.42, sy - r * 0.95, r * 0.36, r * 0.16, -0.4, 0, 7); ctx.fill();
      } else if (o.typ === 'zahl') {
        const g = Math.round(r * 1.4);
        ctx.font = `bold ${g}px "Segoe UI", "Noto Sans", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = Math.max(3, g * 0.12);
        const hupf = clamp((t - o.t0) / 0.4, 0, 1);
        ctx.translate(sx, sy); ctx.scale(0.7 + 0.3 * hupf, 0.7 + 0.3 * hupf);
        if (!o.ohneRand) ctx.strokeText(o.text, 0, 0);
        ctx.fillStyle = o.farbe; ctx.fillText(o.text, 0, 0);
      } else if (o.typ === 'form') {
        ctx.fillStyle = o.farbe; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1.5, r * 0.06);
        ctx.beginPath();
        if (o.art === 'kreis') ctx.arc(sx, sy, r, 0, 7);
        else if (o.art === 'quadrat') ctx.rect(sx - r, sy - r, r * 2, r * 2);
        else if (o.art === 'rechteck') ctx.rect(sx - r * 1.5, sy - r * 0.8, r * 3, r * 1.6);
        else if (o.art === 'dreieck') { ctx.moveTo(sx, sy - r * 1.1); ctx.lineTo(sx + r * 1.15, sy + r * 0.9); ctx.lineTo(sx - r * 1.15, sy + r * 0.9); ctx.closePath(); }
        else if (o.art === 'sechseck') { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.closePath(); }
        else if (o.art === 'stern') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } ctx.closePath(); }
        else if (o.art === 'kugel') { const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.35, r * 0.1, sx, sy, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, o.farbe); g.addColorStop(1, BF.rgba(BF.hex(o.farbe), 1, 0.45)); ctx.fillStyle = g; ctx.arc(sx, sy, r, 0, 7); }
        else if (o.art === 'wuerfel') {
          const d = r * 0.5;
          ctx.rect(sx - r, sy - r + d, r * 2 - d, r * 2 - d); ctx.fill(); ctx.stroke();
          ctx.fillStyle = BF.rgba(BF.hex(o.farbe), 1, 0.8); ctx.beginPath(); ctx.moveTo(sx - r, sy - r + d); ctx.lineTo(sx - r + d, sy - r); ctx.lineTo(sx + r, sy - r); ctx.lineTo(sx + r - d, sy - r + d); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = BF.rgba(BF.hex(o.farbe), 1, 0.6); ctx.beginPath(); ctx.moveTo(sx + r - d, sy - r + d); ctx.lineTo(sx + r, sy - r); ctx.lineTo(sx + r, sy + r - d); ctx.lineTo(sx + r - d, sy + r); ctx.closePath();
        }
        ctx.fill(); ctx.stroke();
      } else if (o.typ === 'pizza') {
        let weg = 0; for (const e of o.weg) if (t >= e.t) weg = e.n;
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(sx, sy, r * 1.06, 0, 7); ctx.fill();
        const n = o.teile, rr = BF.rng(n * 31 + 7);
        for (let i = 0; i < n; i++) {
          if (i < weg) continue;
          const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
          ctx.fillStyle = '#e8b04a'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, r, a0, a1); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#e8573a'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, r * 0.86, a0, a1); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, r * 0.8, a0, a1); ctx.closePath(); ctx.fill();
          for (let k = 0; k < 2; k++) { const a = a0 + (a1 - a0) * (0.3 + 0.4 * rr()), d = r * (0.35 + 0.35 * rr()); ctx.fillStyle = '#b8322a'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d, r * 0.09, 0, 7); ctx.fill(); }
          ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = Math.max(1.5, r * 0.025); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, r, a0, a1); ctx.closePath(); ctx.stroke();
        }
      } else if (BF.zeichne2d && BF.zeichne2d[o.typ]) {
        BF.zeichne2d[o.typ](ctx, o, sx, sy, r, t, s, E, F, p);
      } else if (o.typ === 'kaktus') {
        ctx.fillStyle = '#4a9a4a'; ctx.strokeStyle = '#2f6a2f'; ctx.lineWidth = Math.max(1, r * 0.03);
        const arm = (x, y, b, hh) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, b, hh, b / 2) : ctx.rect(x, y, b, hh); ctx.fill(); ctx.stroke(); };
        arm(sx - r * 0.12, sy - r, r * 0.24, r);
        arm(sx - r * 0.42, sy - r * 0.7, r * 0.18, r * 0.36); arm(sx - r * 0.42, sy - r * 0.45, r * 0.32, r * 0.14);
        arm(sx + r * 0.24, sy - r * 0.85, r * 0.18, r * 0.4); arm(sx + r * 0.1, sy - r * 0.55, r * 0.32, r * 0.14);
      } else if (o.typ === 'pinguin') {
        const wackel = Math.sin(t * 4) * 0.08;
        ctx.translate(sx, sy); ctx.rotate(wackel);
        ctx.fillStyle = '#1e2026'; ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.32, r * 0.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.ellipse(0, -r * 0.42, r * 0.22, r * 0.38, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#1e2026'; ctx.beginPath(); ctx.arc(0, -r * 0.95, r * 0.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.07, -r * 0.98, r * 0.05, 0, 7); ctx.fill();
        ctx.fillStyle = '#f0a020'; ctx.beginPath(); ctx.moveTo(r * 0.14, -r * 0.95); ctx.lineTo(r * 0.3, -r * 0.92); ctx.lineTo(r * 0.14, -r * 0.89); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.02, r * 0.1, r * 0.04, 0, 0, 7); ctx.ellipse(r * 0.1, -r * 0.02, r * 0.1, r * 0.04, 0, 0, 7); ctx.fill();
      } else if (o.typ === 'regenbogen') {
        const FARB = ['#e8412a', '#f08a24', '#f2d230', '#4ab84a', '#4a8cff', '#7a5aff'];
        const dicke = r * 0.07;
        ctx.globalAlpha *= 0.85;
        FARB.forEach((fb, i) => { ctx.strokeStyle = fb; ctx.lineWidth = dicke; ctx.beginPath(); ctx.arc(sx, sy, r - i * dicke, Math.PI, 0); ctx.stroke(); });
      } else if (o.typ === 'luft') {
        const rr = BF.rng(BF.hash(o.name));
        for (let i = 0; i < o.n; i++) {
          const x = sx + (rr() - 0.5) * o.breite * s + Math.sin(t * 1.3 + i) * s * 0.4, y = sy + (rr() - 0.5) * o.hoehe * s + Math.cos(t * 1.1 + i * 2) * s * 0.4;
          ctx.fillStyle = 'rgba(235,245,255,0.85)'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, s * 0.28), 0, 7); ctx.fill();
        }
      } else if (o.typ === 'geist') {
        geist(ctx, sx, sy, r, t, F, o, p, s);
      } else if (o.typ === 'wand') {
        wand(ctx, sx, sy, o, s);
      } else if (o.typ === 'kind') {
        kind(ctx, sx, sy, r, t, o, F);
      } else if (o.typ === 'atome') {
        atome(ctx, sx, sy, o, s, t);
      } else if (o.typ === 'auge') {
        auge(ctx, sx, sy, r, t);
      } else if (o.typ === 'rakete') {
        ctx.translate(sx, sy); ctx.rotate(-(o.winkel - 90) * Math.PI / 180);
        ctx.fillStyle = '#e8e8ee'; ctx.beginPath(); ctx.moveTo(0, -r * 1.6); ctx.quadraticCurveTo(r * 0.7, -r * 0.6, r * 0.5, r); ctx.lineTo(-r * 0.5, r); ctx.quadraticCurveTo(-r * 0.7, -r * 0.6, 0, -r * 1.6); ctx.fill();
        ctx.fillStyle = '#d8402a'; ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.4); ctx.lineTo(-r * 0.95, r * 1.2); ctx.lineTo(-r * 0.5, r); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.4); ctx.lineTo(r * 0.95, r * 1.2); ctx.lineTo(r * 0.5, r); ctx.fill();
        ctx.fillStyle = '#5ab0ff'; ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.25, 0, 7); ctx.fill();
        const fl = ctx.createLinearGradient(0, r, 0, r * 2.4); fl.addColorStop(0, '#fff2a0'); fl.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(-r * 0.35, r); ctx.lineTo(0, r * (2.2 + Math.sin(t * 30) * 0.2)); ctx.lineTo(r * 0.35, r); ctx.fill();
      }
      ctx.restore();
    }
    // Lichtstrahlen
    for (const st of F.w2d.licht) {
      if (t < st.t0) continue;
      const pf = bahn(F, st);
      const n = pf.length / 2;
      const k = Math.min(n - 1, Math.floor((t - st.t0) * 120));
      if (k < 1) continue;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = st.farbe; ctx.shadowBlur = 12 * E;
      ctx.strokeStyle = BF.rgba(BF.hex(st.farbe), 1, 0.85); ctx.lineWidth = 3.2 * E;
      const anf = 0;
      const alter = t - st.t0;
      if (alter > 9) { ctx.restore(); continue; }
      ctx.globalAlpha = clamp(1 - (alter - 7) / 2, 0, 1); // ältere Strahlen verschwinden
      ctx.beginPath();
      ctx.moveTo(X(pf[anf * 2]), Y(pf[anf * 2 + 1]));
      for (let i = anf + 1; i <= k; i += 2) ctx.lineTo(X(pf[i * 2]), Y(pf[i * 2 + 1]));
      ctx.lineTo(X(pf[k * 2]), Y(pf[k * 2 + 1]));
      ctx.stroke();
      if (k < n - 1) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(pf[k * 2]), Y(pf[k * 2 + 1]), 5 * E, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    // Funkwellen und Daten-Päckchen
    for (const wl of F.w2d.wellen || []) {
      if (t < wl.t0 || t > wl.t1 + 0.5) continue;
      const punktVon = q => q.obj ? (F.w2d.obj[q.obj] ? pos(F, F.w2d.obj[q.obj], t) : [0, 0]) : q.p;
      const a = punktVon(wl.von), b = punktVon(wl.nach);
      const ax = X(a[0]), ay = Y(a[1]), bx = X(b[0]), by = Y(b[1]);
      const L = Math.hypot(bx - ax, by - ay), wnk = Math.atan2(by - ay, bx - ax);
      ctx.save();
      ctx.globalAlpha = clamp((wl.t1 + 0.5 - t) / 0.5, 0, 1) * clamp((t - wl.t0) / 0.3, 0, 1);
      if (wl.art === 'wellen') {
        ctx.strokeStyle = wl.farbe; ctx.lineWidth = 4 * E; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const u = ((t - wl.t0) * 0.45 + i / 6) % 1;
          const x = ax + Math.cos(wnk) * L * u, y = ay + Math.sin(wnk) * L * u, rb = 12 * E + u * 18 * E;
          ctx.globalAlpha *= 1; ctx.beginPath(); ctx.arc(x, y, rb, wnk - 0.7, wnk + 0.7); ctx.stroke();
        }
      } else {
        ctx.strokeStyle = 'rgba(120,140,170,0.5)'; ctx.lineWidth = 3 * E; ctx.setLineDash([10 * E, 8 * E]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 5; i++) {
          const u = ((t - wl.t0) * 0.35 + i / 5) % 1;
          const x = ax + (bx - ax) * u, y = ay + (by - ay) * u, g = 14 * E;
          ctx.fillStyle = wl.farbe; rr(ctx, x - g / 2, y - g / 2, g, g, g * 0.2); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(g * 0.6)}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i % 2 ? '1' : '0', x, y + 1);
        }
      }
      ctx.restore();
    }
    // Niesen: Tröpfchen fliegen aus dem Mund
    for (const n of F.w2d.niesen || []) {
      const a = t - n.t0;
      if (a < 0 || a > 3) continue;
      const wer = F.w2d.obj[n.wer];
      if (!wer) continue;
      const pp = pos(F, wer, n.t0);
      const mund = [pp[0] + n.richtung * wer.r * 0.1, pp[1] + wer.r * 0.62];
      const rn = BF.rng(Math.floor(n.t0 * 100));
      ctx.save();
      ctx.globalAlpha = clamp(1 - (a - 2) / 1, 0, 1);
      for (let i = 0; i < 60; i++) {
        const w0 = (rn() - 0.5) * 0.9, v = 8 + rn() * 16;
        const x = mund[0] + n.richtung * Math.cos(w0) * v * Math.min(a, 1.2) * 1.2, y = mund[1] + Math.sin(w0) * v * Math.min(a, 1.2) - 3 * a * a;
        ctx.fillStyle = 'rgba(120,190,255,0.75)'; ctx.beginPath(); ctx.arc(X(x), Y(y), Math.max(1.5, s * (0.12 + rn() * 0.2)), 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    for (const b of F.w2d.blasen || []) {
      if (t < b.t0 || t > b.t1 + 1) continue;
      const rb = BF.rng(Math.floor(b.t0 * 100) + 9);
      ctx.save();
      ctx.globalAlpha = clamp((b.t1 + 1 - t), 0, 1);
      for (let i = 0; i < b.n; i++) {
        const st = rb() * (b.t1 - b.t0), a = t - b.t0 - st; const dx = (rb() - 0.5) * 10, gr = 0.5 + rb() * 1.2;
        if (a < 0) continue;
        const x = b.p[0] + dx + Math.sin(a * 2 + i) * 1.2, y = b.p[1] + a * 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.lineWidth = Math.max(1, s * 0.08);
        ctx.beginPath(); ctx.arc(X(x), Y(y), gr * s, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(X(x) - gr * s * 0.35, Y(y) - gr * s * 0.35, gr * s * 0.15, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    // hüpfendes (gestreutes) Licht
    for (const z of F.w2d.zickzack || []) {
      if (t < z.t0) continue;
      const alter = t - z.t0;
      if (alter > 9) continue;
      const rz = BF.rng(z.seed);
      const pts = [z.von];
      const SPR = 7;
      for (let i = 1; i < SPR; i++) {
        const u = i / SPR;
        pts.push([lerp(z.von[0], z.nach[0], u) + (rz() - 0.5) * 18, lerp(z.von[1], z.nach[1], u) + (rz() - 0.5) * 14]);
      }
      pts.push(z.nach);
      let gesamt = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); gesamt += l; }
      let rest = Math.min(gesamt, alter * C * 0.6);
      ctx.save();
      ctx.globalAlpha = clamp(1 - (alter - 7) / 2, 0, 1);
      ctx.strokeStyle = z.farbe; ctx.lineWidth = 3.2 * E; ctx.shadowColor = z.farbe; ctx.shadowBlur = 12 * E; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      let kopf = pts[0];
      for (let i = 1; i < pts.length && rest > 0; i++) {
        const u = Math.min(1, rest / seg[i - 1]);
        kopf = [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
        ctx.lineTo(X(kopf[0]), Y(kopf[1]));
        if (u >= 1) { ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(pts[i][0]), Y(pts[i][1]), 4 * E, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(X(pts[i][0]), Y(pts[i][1])); }
        rest -= seg[i - 1];
      }
      ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(kopf[0]), Y(kopf[1]), 5 * E, 0, 7); ctx.fill();
      ctx.restore();
    }
    // Schwarze Löcher (über allem)
    for (const L of loecher) loch(ctx, L, t, s, E);
    // Beschriftungen
    for (const tx of F.w2d.texte) {
      if (t < tx.t0 || t >= tx.t1) continue;
      let p = tx.an.p, rr = 0;
      if (tx.an.obj) { const o = F.w2d.obj[tx.an.obj]; if (!o) continue; p = pos(F, o, t); rr = (o.typ === 'loch' ? o.r * 2.8 : o.r * 1.2) * s; }
      const ein = clamp((t - tx.t0) / 0.3, 0, 1) * clamp((tx.t1 - t) / 0.3, 0, 1);
      ctx.save(); ctx.globalAlpha = ein;
      const x = X(p[0]), y = Y(p[1]) - rr - 46 * E;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5 * E;
      ctx.beginPath(); ctx.moveTo(X(p[0]), Y(p[1]) - rr); ctx.lineTo(x, y + 18 * E); ctx.stroke();
      ctx.font = `bold ${Math.round(34 * E)}px "Segoe UI", "Noto Sans", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const b = ctx.measureText(tx.text).width + 30 * E;
      ctx.fillStyle = 'rgba(10,12,20,0.75)'; ctx.fillRect(x - b / 2, y - 22 * E, b, 44 * E);
      ctx.fillStyle = '#ffffff'; ctx.fillText(tx.text, x, y + 1);
      ctx.restore();
    }
    return leinwand;
  };

  function loch(ctx, L, t, s, E) {
    const { sx, sy } = L;
    const R = L.r * s; // Ereignishorizont
    if (R < 0.5) return;
    const schatten = R * 2.6;
    // Leuchtende Scheibe (heißes Gas)
    let sch = 0;
    for (const e of L.o.scheibe) if (e.t0 <= t) sch = lerp(sch, e.an ? 1 : 0, sanft(clamp((t - e.t0) / Math.max(0.01, e.t1 - e.t0), 0, 1)));
    const scheibe = (oben) => {
      if (sch <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = sch;
      ctx.translate(sx, sy);
      ctx.scale(1, 0.28);
      const RINGE = 34, SEG = 90;
      for (let ring = 0; ring < RINGE; ring++) {
        const rr = schatten * (1.05 + ring * 0.058);
        const hell = 1 - ring / RINGE;
        for (let seg = 0; seg < SEG; seg++) {
          const a0 = (seg / SEG) * Math.PI * 2 + t * (1.4 - ring * 0.025);
          const vorne = Math.sin(a0 + 0.1) > 0;
          if (vorne !== !oben) continue;
          const doppler = 0.55 + 0.45 * Math.cos(a0 + Math.PI); // eine Seite heller
          const flim = 0.82 + 0.18 * Math.sin(a0 * 3 + ring * 0.9 + t * 2);
          const v = hell * doppler * flim;
          ctx.strokeStyle = `rgba(255,${Math.round(150 + 100 * v)},${Math.round(60 + 140 * v * v)},${0.25 + 0.6 * v})`;
          ctx.lineWidth = schatten * 0.075;
          ctx.beginPath(); ctx.arc(0, 0, rr, a0, a0 + Math.PI * 2 / SEG + 0.03); ctx.stroke();
        }
      }
      ctx.restore();
    };
    // hinterer Teil der Scheibe (wird über das Loch gebogen sichtbar)
    if (sch > 0.01) {
      ctx.save(); ctx.globalAlpha = sch * 0.9;
      const gb = ctx.createRadialGradient(sx, sy, schatten * 0.95, sx, sy, schatten * 1.9);
      gb.addColorStop(0, 'rgba(255,220,150,0.9)'); gb.addColorStop(0.35, 'rgba(255,150,60,0.45)'); gb.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(sx, sy, schatten * 1.9, Math.PI, 0); ctx.arc(sx, sy, schatten * 0.95, 0, Math.PI, true); ctx.fill();
      ctx.restore();
      scheibe(true);
    }
    // Schatten (hier kommt kein Licht heraus)
    const g = ctx.createRadialGradient(sx, sy, schatten * 0.9, sx, sy, schatten * 1.15);
    g.addColorStop(0, '#000000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, schatten * 1.15, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx, sy, schatten * 0.97, 0, 7); ctx.fill();
    // Photonenring
    ctx.strokeStyle = `rgba(255,${200 + Math.round(30 * Math.sin(t * 2))},150,${0.35 + 0.5 * Math.max(sch, 0.3)})`;
    ctx.lineWidth = Math.max(1.5, schatten * 0.035);
    ctx.beginPath(); ctx.arc(sx, sy, schatten, 0, 7); ctx.stroke();
    scheibe(false);
  }

  function planet(ctx, o, sx, sy, r, t, F, p) {
    // Licht kommt vom nächsten Stern
    let lx = -0.6, ly = 0.5;
    const st = F.w2d.liste.find(x => x.typ === 'stern' && t >= x.t0 && t < x.t1);
    if (st) { const sp = pos(F, st, t); const dx = sp[0] - p[0], dy = sp[1] - p[1], l = Math.hypot(dx, dy) || 1; lx = dx / l; ly = dy / l; }
    const ART = { erde: ['#2f6fd0', '#3f9a3a'], mond: ['#9a9a9a', '#7a7a7a'], mars: ['#c8582a', '#8a3a1a'], jupiter: ['#d8b890', '#b88a5a'], venus: ['#e8c890', '#d8a860'], eis: ['#cfe8ff', '#9cc4f5'] };
    const [f1, f2] = o.farbe ? [o.farbe, o.farbe] : ART[o.art] || ART.erde;
    ctx.save();
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.clip();
    ctx.fillStyle = f1; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    const rot = o.drehPer ? ((t - o.drehAb) / o.drehPer) * r * 2 : 0;
    const rr = BF.rng(BF.hash(o.name));
    if (o.art === 'jupiter') for (let i = -4; i <= 4; i++) { ctx.fillStyle = i % 2 ? f2 : f1; ctx.fillRect(sx - r, sy + i * r * 0.22, r * 2, r * 0.12); }
    else for (let i = 0; i < 9; i++) {
      const bx = ((rr() * 4 * r + rot) % (4 * r)) - 2 * r, by = (rr() - 0.5) * 1.6 * r, br = r * (0.18 + rr() * 0.3);
      ctx.fillStyle = f2; ctx.beginPath(); ctx.ellipse(sx + bx, sy + by, br * 1.3, br, 0, 0, 7); ctx.fill();
    }
    if (o.art === 'erde') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(sx - r, sy - r, r * 2, r * 0.18); ctx.fillRect(sx - r, sy + r * 0.82, r * 2, r * 0.18); }
    // Tag- und Nachtseite
    const sch = ctx.createLinearGradient(sx + lx * r, sy - ly * r, sx - lx * r, sy + ly * r);
    sch.addColorStop(0, 'rgba(0,0,0,0)'); sch.addColorStop(0.5, 'rgba(0,0,10,0.15)'); sch.addColorStop(0.62, 'rgba(0,0,15,0.78)'); sch.addColorStop(1, 'rgba(0,0,15,0.88)');
    ctx.fillStyle = sch; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    ctx.restore();
    if (o.art === 'erde') { ctx.strokeStyle = 'rgba(120,180,255,0.45)'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.arc(sx, sy, r * 1.04, 0, 7); ctx.stroke(); }
  }
  function farbeBei(o, t) {
    let c = new THREE.Color(o.farben[0].zu);
    for (const f of o.farben) {
      if (f.t0 > t) break;
      const u = f.t1 > f.t0 ? sanft(clamp((t - f.t0) / (f.t1 - f.t0), 0, 1)) : 1;
      c = c.clone().lerp(new THREE.Color(f.zu), u);
    }
    return '#' + c.getHexString();
  }
  function wertBei(liste, t, start = 0) {
    let v = start;
    for (const k of liste) { if (k.t0 > t) break; const u = k.t1 > k.t0 ? sanft(clamp((t - k.t0) / (k.t1 - k.t0), 0, 1)) : 1; v = lerp(v, k.zu, u); }
    return v;
  }
  function blatt(ctx, x, y, r, farbe, winkel, alpha, E) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.rotate(winkel);
    const c = new THREE.Color(farbe);
    const dunkel = '#' + c.clone().multiplyScalar(0.7).getHexString(), hell = '#' + c.clone().lerp(new THREE.Color('#ffffff'), 0.25).getHexString();
    const g = ctx.createLinearGradient(-r * 0.5, -r, r * 0.5, r);
    g.addColorStop(0, hell); g.addColorStop(1, farbe);
    // Stiel (darf unten herausschauen)
    ctx.strokeStyle = dunkel; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.moveTo(0, r * 0.8); ctx.lineTo(0, r * 1.18); ctx.stroke();
    // Blattfläche
    const form = () => {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.75, -r * 0.6, r * 0.7, r * 0.5, 0, r * 0.85);
      ctx.bezierCurveTo(-r * 0.7, r * 0.5, -r * 0.75, -r * 0.6, 0, -r);
    };
    ctx.fillStyle = g;
    form(); ctx.fill();
    // Adern nur innerhalb des Blattes
    ctx.save();
    form(); ctx.clip();
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.92); ctx.lineTo(0, r * 0.9); ctx.stroke(); // Mittelader
    ctx.lineWidth = Math.max(0.6, r * 0.022);
    for (let i = -3; i <= 3; i++) {
      if (!i) continue;
      const yy = i * r * 0.22 + r * 0.05;
      for (const seite of [1, -1]) {
        ctx.beginPath(); ctx.moveTo(0, yy);
        ctx.quadraticCurveTo(seite * r * 0.2, yy - r * 0.12, seite * r * 0.62, yy - r * 0.3);
        ctx.stroke();
      }
    }
    ctx.restore();
    // feiner Rand
    ctx.strokeStyle = dunkel; ctx.globalAlpha *= 0.5; ctx.lineWidth = Math.max(0.6, r * 0.015);
    form(); ctx.stroke();
    ctx.restore();
  }
  const HERBST = ['#f2c230', '#f08a24', '#d83a2a', '#e8a020'];
  function baum(ctx, o, sx, sy, s, t, F) {
    const H = o.r * s;
    const f = farbeBei(o, t);
    const kahl = wertBei(o.kahl, t, 0);
    const kroneY = sy - H * 0.68, kroneR = H * 0.36;
    // Stamm und Äste
    ctx.fillStyle = '#6b4a2a';
    ctx.beginPath(); ctx.moveTo(sx - H * 0.06, sy); ctx.lineTo(sx - H * 0.035, kroneY); ctx.lineTo(sx + H * 0.035, kroneY); ctx.lineTo(sx + H * 0.06, sy); ctx.fill();
    ctx.strokeStyle = '#5a3d22'; ctx.lineCap = 'round';
    const rr = BF.rng(BF.hash(o.name));
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (rr() - 0.5) * 2.2, l = kroneR * (0.6 + rr() * 0.5);
      ctx.lineWidth = H * 0.02;
      ctx.beginPath(); ctx.moveTo(sx, kroneY + kroneR * 0.3); ctx.lineTo(sx + Math.cos(a) * l, kroneY + kroneR * 0.3 + Math.sin(a) * l); ctx.stroke();
    }
    // Krone aus vielen Blatt-Büscheln
    const anzahl = 46;
    const herbstlich = new THREE.Color(f).getHSL({}).h < 0.2; // gelb/orange/rot
    for (let i = 0; i < anzahl; i++) {
      const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * kroneR;
      const bx = sx + Math.cos(a) * d * 1.15, by = kroneY + Math.sin(a) * d * 0.85;
      const br = kroneR * (0.22 + rr() * 0.14);
      const wahl = rr(), mix = rr();
      if (i / anzahl < kahl) continue; // Blätter sind schon gefallen
      let c = new THREE.Color(f).multiplyScalar(0.82 + wahl * 0.3);
      if (herbstlich) c.lerp(new THREE.Color(HERBST[Math.floor(mix * HERBST.length)]), 0.35);
      ctx.fillStyle = '#' + c.getHexString();
      ctx.beginPath(); ctx.arc(bx + Math.sin(t * 1.2 + i) * H * 0.004, by, br, 0, 7); ctx.fill();
    }
    // fallende Blätter
    for (const fa of o.fallen || []) {
      if (t < fa.t0) continue;
      const rf = BF.rng(BF.hash(o.name) + 7);
      for (let i = 0; i < fa.n; i++) {
        const st = fa.t0 + (i / fa.n) * (fa.t1 - fa.t0);
        const a = rf() * Math.PI * 2, d = Math.sqrt(rf()) * kroneR, pick = rf(), sw = rf();
        if (t < st) continue;
        const alter = t - st;
        const x0 = sx + Math.cos(a) * d, y0 = kroneY + Math.sin(a) * d * 0.8;
        const fallH = sy - y0 + H * 0.02 * (pick - 0.5) * 8;
        const fy = Math.min(fallH, alter * H * 0.12);
        const liegt = fy >= fallH;
        const fx = x0 + (liegt ? Math.sin(fallH / (H * 0.12) * 2.2 + sw * 6) : Math.sin(alter * 2.2 + sw * 6)) * H * 0.06 + (liegt ? 0 : 0);
        const farbe = HERBST[Math.floor(pick * HERBST.length)];
        blatt(ctx, fx, y0 + fy, H * 0.03, new THREE.Color(f).lerp(new THREE.Color(farbe), 0.6).getStyle(), liegt ? 1.3 + sw : Math.sin(alter * 3 + sw * 5) * 0.8, 1, 1);
      }
    }
  }
  function koerper(ctx, o, sx, sy, s, t, E) {
    const H = o.r * s;
    const P = (x, y) => [sx + x * H, sy - y * H]; // x, y als Anteil der Körpergröße, y von den Füßen nach oben
    const sicht = tl => wertBei(o.organe[tl] || [], t, 0);
    const haut = '#f6d2b4', rand = '#c8946e';
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // Winken (rechter Arm, im Bild links)
    let wink = 0;
    for (const wk of o.winken) if (t >= wk.t0 && t < wk.t1) wink = Math.min(1, (t - wk.t0) / 0.4, (wk.t1 - t) / 0.4);
    // Endpunkt des winkenden Arms (Schulter bei -0.19/0.78, Armlänge 0.31): Winkel von "gerade nach unten" nach außen
    const armWinkel = lerp(0.145, 2.45 + Math.sin(t * 9) * 0.3, wink);
    const armEnde = [-0.19 - Math.sin(armWinkel) * 0.31, 0.78 - Math.cos(armWinkel) * 0.31];
    // Körper-Umriss
    const glied = (x1, y1, x2, y2, dicke) => { const a = P(x1, y1), b = P(x2, y2); ctx.lineWidth = dicke * H; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
    for (const [farbe, extra] of [[rand, 0.012], [haut, 0]]) {
      ctx.strokeStyle = farbe;
      glied(-0.07, 0.5, -0.085, 0.03, 0.085 + extra); glied(0.07, 0.5, 0.085, 0.03, 0.085 + extra); // Beine
      glied(0.19, 0.78, 0.235, 0.47, 0.06 + extra); // linker Arm (im Bild rechts)
      glied(-0.19, 0.78, armEnde[0], armEnde[1], 0.06 + extra);
      ctx.fillStyle = farbe;
      const [rx, ry] = P(-0.165 - extra / 2, 0.81 + extra / 2);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(rx, ry, (0.33 + extra) * H, (0.33 + extra) * H, 0.07 * H) : ctx.rect(rx, ry, (0.33 + extra) * H, (0.33 + extra) * H); ctx.fill(); // Rumpf
      const [hx, hy] = P(0, 0.9); ctx.beginPath(); ctx.ellipse(hx, hy, (0.075 + extra) * H, (0.09 + extra) * H, 0, 0, 7); ctx.fill(); // Kopf
      const [nx, ny] = P(-0.03, 0.83); ctx.fillRect(nx, ny, 0.06 * H, 0.03 * H); // Hals
    }
    // Gesicht
    ctx.fillStyle = '#333';
    for (const sgn of [-1, 1]) { const [ax, ay] = P(sgn * 0.028, 0.91); ctx.beginPath(); ctx.arc(ax, ay, 0.008 * H, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#a0503a'; ctx.lineWidth = 0.006 * H; const [mx, my] = P(0, 0.885); ctx.beginPath(); ctx.arc(mx, my - 0.012 * H, 0.025 * H, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    const blende = (tl, f) => { const v = sicht(tl); if (v > 0.01) { ctx.save(); ctx.globalAlpha *= v; f(); ctx.restore(); } };
    // Knochen
    blende('knochen', () => {
      ctx.strokeStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 3 * E;
      glied(0, 0.8, 0, 0.5, 0.018); // Wirbelsäule
      for (let i = 0; i < 6; i++) { const y = 0.77 - i * 0.03; ctx.lineWidth = 0.01 * H; ctx.beginPath(); ctx.ellipse(...P(0, y), 0.12 * H, 0.016 * H, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
      glied(-0.12, 0.5, 0.12, 0.5, 0.02); // Becken
      glied(-0.07, 0.49, -0.08, 0.06, 0.02); glied(0.07, 0.49, 0.08, 0.06, 0.02);
      glied(0.19, 0.77, 0.23, 0.49, 0.016);
      glied(-0.19, 0.77, lerp(-0.19, armEnde[0], 0.92), lerp(0.77, armEnde[1], 0.92), 0.016);
      ctx.lineWidth = 0.012 * H; ctx.beginPath(); ctx.ellipse(...P(0, 0.905), 0.06 * H, 0.075 * H, 0, 0, 7); ctx.stroke(); // Schädel
    });
    // Nerven: gelbe Fäden mit Signalen
    const nervenWege = [[[0, 0.88], [0, 0.5], [-0.08, 0.06]], [[0, 0.88], [0, 0.5], [0.08, 0.06]], [[0, 0.88], [0, 0.78], [0.19, 0.78], [0.235, 0.47]], [[0, 0.88], [0, 0.78], [-0.19, 0.78], armEnde]];
    blende('nerven', () => {
      ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 0.006 * H;
      for (const weg of nervenWege) { ctx.beginPath(); ctx.moveTo(...P(...weg[0])); for (const q of weg.slice(1)) ctx.lineTo(...P(...q)); ctx.stroke(); }
      for (const [i, weg] of nervenWege.entries()) {
        const u = ((t * 0.9 + i * 0.25) % 1);
        const seg = weg.length - 1, k = Math.min(seg - 1, Math.floor(u * seg)), f = u * seg - k;
        const a = weg[k], b = weg[k + 1];
        ctx.fillStyle = '#fff6a0'; ctx.shadowColor = '#ffe040'; ctx.shadowBlur = 10 * E;
        ctx.beginPath(); ctx.arc(...P(lerp(a[0], b[0], f), lerp(a[1], b[1], f)), 0.012 * H, 0, 7); ctx.fill();
      }
    });
    // Gehirn
    blende('gehirn', () => {
      ctx.fillStyle = '#f0a8b8'; ctx.strokeStyle = '#c87088'; ctx.lineWidth = 0.004 * H;
      ctx.beginPath(); ctx.ellipse(...P(0, 0.925), 0.055 * H, 0.04 * H, 0, 0, 7); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(...P(-0.035 + i * 0.018, 0.93 + (i % 2) * 0.01), 0.012 * H, 0, Math.PI); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(...P(0, 0.963)); ctx.lineTo(...P(0, 0.89)); ctx.stroke();
    });
    // Lunge (atmet)
    blende('lunge', () => {
      const atem = 1 + Math.sin(t * Math.PI * 0.5) * 0.07;
      ctx.fillStyle = '#f08a96'; ctx.strokeStyle = '#c05a68'; ctx.lineWidth = 0.004 * H;
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(...P(sgn * 0.065, 0.7), 0.05 * H * atem, 0.085 * H * atem, sgn * 0.12, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = '#d8a0a8'; ctx.lineWidth = 0.012 * H; glied(0, 0.82, 0, 0.75, 0.012);
    });
    // Blut: rot vom Herz weg, blau zurück
    const blutWege = [[[0.02, 0.68], [0, 0.88]], [[0.02, 0.68], [0.19, 0.76], [0.235, 0.48]], [[0.02, 0.68], [-0.19, 0.76], [armEnde[0], armEnde[1] + 0.01]], [[0.02, 0.68], [0.05, 0.5], [0.08, 0.05]], [[0.02, 0.68], [-0.05, 0.5], [-0.08, 0.05]]];
    blende('blut', () => {
      ctx.lineWidth = 0.005 * H;
      for (const [i, weg] of blutWege.entries()) {
        for (const [farbe, versatz, rueck] of [['#e8412a', 0.008, false], ['#4a6ae8', -0.008, true]]) {
          ctx.strokeStyle = farbe; ctx.globalAlpha = 0.6;
          ctx.beginPath(); ctx.moveTo(...P(weg[0][0] + versatz, weg[0][1])); for (const q of weg.slice(1)) ctx.lineTo(...P(q[0] + versatz, q[1])); ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillStyle = farbe;
          for (let j = 0; j < 4; j++) {
            let u = ((t * 0.35 + j / 4 + i * 0.13) % 1); if (rueck) u = 1 - u;
            const seg = weg.length - 1, k = Math.min(seg - 1, Math.floor(u * seg)), f = u * seg - k;
            const a = weg[k], b = weg[k + 1];
            ctx.beginPath(); ctx.arc(...P(lerp(a[0], b[0], f) + versatz, lerp(a[1], b[1], f)), 0.009 * H, 0, 7); ctx.fill();
          }
        }
      }
    });
    // Herz (schlägt)
    blende('herz', () => {
      const schlag = 1 + Math.max(0, Math.sin(t * Math.PI * 2.4)) * 0.12;
      const [hx, hy] = P(0.025, 0.69); const r = 0.03 * H * schlag;
      ctx.fillStyle = '#d8282a'; ctx.shadowColor = 'rgba(255,60,60,0.6)'; ctx.shadowBlur = 8 * E * schlag;
      ctx.beginPath(); ctx.moveTo(hx, hy + r * 1.2);
      ctx.bezierCurveTo(hx - r * 1.6, hy, hx - r * 1.1, hy - r * 1.3, hx, hy - r * 0.5);
      ctx.bezierCurveTo(hx + r * 1.1, hy - r * 1.3, hx + r * 1.6, hy, hx, hy + r * 1.2); ctx.fill();
    });
    // Magen und Darm
    blende('magen', () => {
      ctx.fillStyle = '#f2b090'; ctx.strokeStyle = '#c07858'; ctx.lineWidth = 0.004 * H;
      ctx.beginPath(); ctx.ellipse(...P(0.045, 0.6), 0.055 * H, 0.035 * H, -0.4, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e8a080'; ctx.lineWidth = 0.01 * H; glied(0.005, 0.86, 0.02, 0.62, 0.01); // Speiseröhre
    });
    blende('darm', () => {
      ctx.strokeStyle = '#e89a7a'; ctx.lineWidth = 0.016 * H;
      ctx.beginPath(); ctx.moveTo(...P(0.02, 0.575));
      for (let i = 0; i <= 24; i++) { const u = i / 24; ctx.lineTo(...P(Math.sin(u * Math.PI * 5) * 0.075, 0.57 - u * 0.07)); }
      ctx.stroke();
    });
    // Essen: Apfel in den Mund, dann Speiseröhre → Magen → Darm
    for (const e of o.essen) {
      const a = t - e;
      if (a < 0 || a > 9) continue;
      let pp;
      if (a < 1.5) pp = [lerp(0.4, 0, a / 1.5), lerp(0.95, 0.885, a / 1.5)];
      else if (a < 3) pp = [lerp(0.005, 0.02, (a - 1.5) / 1.5), lerp(0.875, 0.62, (a - 1.5) / 1.5)];
      else if (a < 5) pp = [0.045 + Math.sin(a * 6) * 0.01, 0.6];
      else { const u = (a - 5) / 4; pp = [Math.sin(u * Math.PI * 5) * 0.075, 0.57 - u * 0.07]; }
      const gr = a < 3 ? 0.03 : a < 5 ? 0.02 : 0.012;
      ctx.fillStyle = a < 1.5 ? '#d42a1e' : '#c8a060';
      ctx.beginPath(); ctx.arc(...P(pp[0], pp[1]), gr * H, 0, 7); ctx.fill();
      if (a < 1.5) { ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 0.005 * H; ctx.beginPath(); ctx.moveTo(...P(pp[0], pp[1] + gr)); ctx.lineTo(...P(pp[0] + 0.005, pp[1] + gr + 0.015)); ctx.stroke(); }
    }
    ctx.restore();
  }
  function rr(ctx, x, y, b, hh, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, b, hh, r) : ctx.rect(x, y, b, hh); }
  function bildschirmInhalt(ctx, bild, x, y, b, hh, t, E) {
    ctx.save();
    rr(ctx, x, y, b, hh, Math.min(b, hh) * 0.04); ctx.clip();
    if (bild === 'aus') { ctx.fillStyle = '#0a0a0e'; ctx.fillRect(x, y, b, hh); ctx.restore(); return; }
    const g = ctx.createLinearGradient(x, y, x + b, y + hh); g.addColorStop(0, '#3a6ae8'); g.addColorStop(1, '#9a5ae0');
    ctx.fillStyle = g; ctx.fillRect(x, y, b, hh);
    const FARB = ['#f24a4a', '#f2a030', '#f2d230', '#4ab84a', '#3ab0e8', '#e05ac0', '#ffffff', '#5ae0c0'];
    if (bild === 'apps') {
      const sp = 4, ze = Math.max(3, Math.round(hh / b * 4)), gr = Math.min(b / sp, hh / (ze + 1)) * 0.62;
      for (let i = 0; i < sp; i++) for (let j = 0; j < ze; j++) { ctx.fillStyle = FARB[(i * 3 + j * 5) % FARB.length]; rr(ctx, x + b * (i + 0.5) / sp - gr / 2, y + hh * 0.08 + j * gr * 1.45, gr, gr, gr * 0.25); ctx.fill(); }
    } else if (bild === 'foto') {
      ctx.fillStyle = '#7ab8f0'; ctx.fillRect(x, y, b, hh * 0.6); ctx.fillStyle = '#4a9a3a'; ctx.fillRect(x, y + hh * 0.6, b, hh * 0.4);
      ctx.fillStyle = '#f2d230'; ctx.beginPath(); ctx.arc(x + b * 0.75, y + hh * 0.22, Math.min(b, hh) * 0.1, 0, 7); ctx.fill();
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x + b * 0.25, y + hh * 0.42, b * 0.06, hh * 0.2); ctx.fillStyle = '#3f8a2a'; ctx.beginPath(); ctx.arc(x + b * 0.28, y + hh * 0.38, Math.min(b, hh) * 0.12, 0, 7); ctx.fill();
    } else if (bild === 'anruf') {
      ctx.fillStyle = '#1f2a3a'; ctx.fillRect(x, y, b, hh);
      ctx.fillStyle = '#f2c4a0'; ctx.beginPath(); ctx.arc(x + b / 2, y + hh * 0.33, Math.min(b, hh) * 0.16, 0, 7); ctx.fill();
      ctx.fillStyle = '#4ab84a'; ctx.beginPath(); ctx.arc(x + b / 2, y + hh * 0.78, Math.min(b, hh) * 0.09 * (1 + Math.sin(t * 6) * 0.08), 0, 7); ctx.fill();
    } else if (bild === 'spiel') {
      ctx.fillStyle = '#2a8a3a'; ctx.fillRect(x, y, b, hh);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = FARB[i]; ctx.fillRect(x + ((i * 0.17 + t * 0.12) % 1) * b, y + hh * (0.15 + (i % 3) * 0.28), b * 0.12, b * 0.12); }
    } else if (bild === 'video') {
      ctx.fillStyle = '#111'; ctx.fillRect(x, y, b, hh);
      ctx.fillStyle = '#ff3a3a'; ctx.beginPath(); const c = Math.min(b, hh) * 0.16; ctx.moveTo(x + b / 2 - c * 0.6, y + hh / 2 - c); ctx.lineTo(x + b / 2 + c, y + hh / 2); ctx.lineTo(x + b / 2 - c * 0.6, y + hh / 2 + c); ctx.fill();
    } else if (bild === 'nachricht' || bild === 'internet') {
      ctx.fillStyle = '#f4f6fa'; ctx.fillRect(x, y, b, hh);
      for (let i = 0; i < 5; i++) { const links = i % 2 === 0; ctx.fillStyle = links ? '#dde3ee' : '#7ad07a'; rr(ctx, x + (links ? b * 0.06 : b * 0.38), y + hh * (0.08 + i * 0.18), b * 0.56, hh * 0.12, hh * 0.04); ctx.fill(); }
    } else if (bild === 'code') {
      ctx.fillStyle = '#16181f'; ctx.fillRect(x, y, b, hh);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = FARB[(i * 3) % FARB.length]; ctx.fillRect(x + b * 0.06 + (i % 3) * b * 0.06, y + hh * (0.08 + i * 0.1), b * (0.25 + ((i * 37) % 40) / 100), hh * 0.05); }
    }
    ctx.restore();
  }
  function technik(ctx, o, sx, sy, r, t, s, E) {
    ctx.save();
    if (o.typ === 'geraet') {
      let bild = o.bilder[0].bild; for (const b of o.bilder) if (b.t0 <= t) bild = b.bild;
      const art = o.art;
      if (art === 'laptop' || art === 'pc' || art === 'computer') {
        const b = r * 1.6, hh = r;
        ctx.fillStyle = '#3a3e48'; rr(ctx, sx - b / 2, sy - hh, b, hh, r * 0.05); ctx.fill();
        bildschirmInhalt(ctx, bild, sx - b / 2 + r * 0.06, sy - hh + r * 0.06, b - r * 0.12, hh - r * 0.12, t, E);
        if (art === 'laptop') { ctx.fillStyle = '#b8bec8'; ctx.beginPath(); ctx.moveTo(sx - b * 0.58, sy + r * 0.12); ctx.lineTo(sx + b * 0.58, sy + r * 0.12); ctx.lineTo(sx + b / 2, sy); ctx.lineTo(sx - b / 2, sy); ctx.fill(); }
        else { ctx.fillStyle = '#3a3e48'; ctx.fillRect(sx - r * 0.08, sy, r * 0.16, r * 0.25); ctx.fillRect(sx - r * 0.4, sy + r * 0.25, r * 0.8, r * 0.06); }
      } else {
        const hoch = art !== 'tablet', b = hoch ? r * 0.5 : r * 0.78, hh = hoch ? r : r * 1.05;
        ctx.fillStyle = '#22252c'; rr(ctx, sx - b / 2, sy - hh / 2, b, hh, b * 0.12); ctx.fill();
        bildschirmInhalt(ctx, bild, sx - b / 2 + b * 0.06, sy - hh / 2 + b * 0.1, b * 0.88, hh - b * 0.2, t, E);
        ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(sx, sy - hh / 2 + b * 0.05, b * 0.025, 0, 7); ctx.fill();
      }
    } else if (o.typ === 'bauteil') {
      const a = o.art;
      if (a === 'router') {
        ctx.strokeStyle = '#3a3d46'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = 'round';
        for (const dx of [-0.6, 0.6]) { ctx.beginPath(); ctx.moveTo(sx + dx * r, sy - r * 0.2); ctx.lineTo(sx + dx * r * 1.15, sy - r * 1.1); ctx.stroke(); }
        ctx.fillStyle = '#f2f2f2'; rr(ctx, sx - r, sy - r * 0.3, r * 2, r * 0.6, r * 0.12); ctx.fill();
        ctx.strokeStyle = '#9aa0aa'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.stroke();
        for (let i = 0; i < 5; i++) { ctx.fillStyle = (Math.sin(t * 6 + i * 1.7) > -0.2) ? '#4ae05a' : '#1f5a28'; ctx.beginPath(); ctx.arc(sx - r * 0.6 + i * r * 0.3, sy, r * 0.07, 0, 7); ctx.fill(); }
      } else if (a === 'chip' || a === 'prozessor') {
        ctx.fillStyle = '#2a2d36'; rr(ctx, sx - r / 2, sy - r / 2, r, r, r * 0.06); ctx.fill();
        ctx.strokeStyle = '#d8b04a'; ctx.lineWidth = Math.max(1, r * 0.04);
        for (let i = 0; i < 6; i++) { const q = -r / 2 + r * (i + 0.5) / 6; for (const [x1, y1, x2, y2] of [[q, -r / 2, q, -r * 0.65], [q, r / 2, q, r * 0.65], [-r / 2, q, -r * 0.65, q], [r / 2, q, r * 0.65, q]]) { ctx.beginPath(); ctx.moveTo(sx + x1, sy + y1); ctx.lineTo(sx + x2, sy + y2); ctx.stroke(); } }
        ctx.fillStyle = BF.rgba([255, 220, 120], 1, 0.3 + 0.3 * Math.abs(Math.sin(t * 4))); rr(ctx, sx - r * 0.3, sy - r * 0.3, r * 0.6, r * 0.6, r * 0.04); ctx.fill();
      } else if (a === 'speicher' || a === 'arbeitsspeicher') {
        ctx.fillStyle = '#2a7a4a'; rr(ctx, sx - r, sy - r * 0.25, r * 2, r * 0.5, r * 0.04); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; for (let i = 0; i < 6; i++) ctx.fillRect(sx - r * 0.9 + i * r * 0.31, sy - r * 0.15, r * 0.22, r * 0.3);
        ctx.fillStyle = '#d8b04a'; for (let i = 0; i < 16; i++) ctx.fillRect(sx - r * 0.95 + i * r * 0.12, sy + r * 0.2, r * 0.06, r * 0.05);
      } else if (a === 'kamera') {
        ctx.fillStyle = '#33363e'; rr(ctx, sx - r * 0.6, sy - r * 0.6, r * 1.2, r * 1.2, r * 0.2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.4, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a5ab0'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.25, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(sx - r * 0.08, sy - r * 0.08, r * 0.07, 0, 7); ctx.fill();
      } else if (a === 'lautsprecher') {
        ctx.fillStyle = '#33363e'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.25 * (1 + Math.sin(t * 20) * 0.08), 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(80,80,80,0.6)'; ctx.lineWidth = Math.max(1, r * 0.05);
        for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(sx + r * 0.5, sy, r * (0.3 + i * 0.25 + (t * 0.5 % 0.25)), -0.6, 0.6); ctx.stroke(); }
      } else if (a === 'platine') {
        ctx.fillStyle = '#2a7a4a'; rr(ctx, sx - r, sy - r * 0.7, r * 2, r * 1.4, r * 0.05); ctx.fill();
        ctx.strokeStyle = '#d8b04a'; ctx.lineWidth = Math.max(1, r * 0.02);
        const rp = BF.rng(4); for (let i = 0; i < 14; i++) { ctx.beginPath(); const y = sy - r * 0.6 + rp() * r * 1.2; ctx.moveTo(sx - r * 0.95, y); ctx.lineTo(sx - r * 0.2 + rp() * r * 0.4, y); ctx.lineTo(sx + r * 0.95, y + (rp() - 0.5) * r * 0.3); ctx.stroke(); }
      } else if (a === 'sim' || a === 'karte') {
        ctx.fillStyle = '#e8e8ea'; rr(ctx, sx - r * 0.6, sy - r * 0.4, r * 1.2, r * 0.8, r * 0.08); ctx.fill();
        ctx.fillStyle = '#d8b04a'; rr(ctx, sx - r * 0.35, sy - r * 0.2, r * 0.45, r * 0.4, r * 0.05); ctx.fill();
      }
    } else if (o.typ === 'bits') {
      const n = o.wert.length || 8, d = r * 1.3;
      for (let i = 0; i < n; i++) {
        let an = o.wert[i] === '1';
        if (o.laufen) an = Math.sin(t * 3 + i * 1.7 + Math.floor(t * 2) * 2.3) > 0;
        const x = sx + (i - (n - 1) / 2) * d;
        ctx.fillStyle = an ? '#ffe060' : '#3a3d46';
        if (an) { ctx.shadowColor = '#ffd040'; ctx.shadowBlur = r * 0.8 * s / s; }
        ctx.beginPath(); ctx.arc(x, sy, r * 0.5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = an ? '#3a2a00' : '#c8ccd8'; ctx.font = `bold ${Math.round(r * 0.55)}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(an ? '1' : '0', x, sy + r * 0.03);
      }
    } else if (o.typ === 'pixel') {
      // ein kleines Bild (Smiley) aus Pixeln; "nah" zeigt die roten, grünen und blauen Lämpchen
      const BILD = ['..YYYY..', '.YYYYYY.', 'YYBYYBYY', 'YYYYYYYY', 'YRYYYYRY', 'YYRRRRYY', '.YYYYYY.', '..YYYY..'];
      const n = 8, d = r / n;
      const FARBE = { Y: [255, 210, 50], B: [30, 30, 60], R: [220, 60, 60], '.': [240, 240, 245] };
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const c = FARBE[BILD[j][i]];
        const x = sx - r / 2 + i * d, y = sy - r / 2 + j * d;
        if (o.nah) {
          ctx.fillStyle = '#111'; ctx.fillRect(x, y, d, d);
          [[255, 0, 0], [0, 255, 0], [0, 0, 255]].forEach((k, q) => { const hell = c[q] / 255; ctx.fillStyle = `rgba(${k[0]},${k[1]},${k[2]},${0.15 + 0.85 * hell})`; ctx.fillRect(x + d * (0.08 + q * 0.31), y + d * 0.1, d * 0.25, d * 0.8); });
        } else { ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x, y, d * 0.94, d * 0.94); }
      }
    } else if (o.typ === 'mast') {
      ctx.strokeStyle = '#8a909c'; ctx.lineWidth = Math.max(1.5, r * 0.025);
      ctx.beginPath(); ctx.moveTo(sx - r * 0.18, sy); ctx.lineTo(sx, sy - r); ctx.lineTo(sx + r * 0.18, sy); ctx.stroke();
      for (let i = 1; i < 6; i++) { const y = sy - r * i / 6, b = r * 0.18 * (1 - i / 6); ctx.beginPath(); ctx.moveTo(sx - b, y); ctx.lineTo(sx + b, y - r / 12); ctx.moveTo(sx + b, y); ctx.lineTo(sx - b, y - r / 12); ctx.stroke(); }
      ctx.fillStyle = '#d8dce4'; for (const sgn of [-1, 1]) ctx.fillRect(sx + sgn * r * 0.04 - (sgn < 0 ? r * 0.08 : 0), sy - r * 0.92, r * 0.08, r * 0.2);
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff3a3a' : '#6a1a1a'; ctx.beginPath(); ctx.arc(sx, sy - r, r * 0.03, 0, 7); ctx.fill();
    } else if (o.typ === 'akku') {
      const wert = clamp(wertBei(o.werte, t, o.werte[0].zu), 0, 100);
      const b = r * 0.55, hh = r;
      ctx.fillStyle = '#e8eaf0'; ctx.strokeStyle = '#3a3d46'; ctx.lineWidth = Math.max(2, r * 0.05);
      rr(ctx, sx - b / 2, sy - hh / 2, b, hh, b * 0.12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a3d46'; ctx.fillRect(sx - b * 0.2, sy - hh / 2 - hh * 0.07, b * 0.4, hh * 0.07);
      ctx.fillStyle = wert > 50 ? '#4ab84a' : wert > 20 ? '#f2a030' : '#e8412a';
      const fh = (hh - b * 0.2) * wert / 100;
      rr(ctx, sx - b / 2 + b * 0.1, sy + hh / 2 - b * 0.1 - fh, b * 0.8, fh, b * 0.06); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4 * E; ctx.font = `bold ${Math.round(Math.max(16 * E, r * 0.16))}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(Math.round(wert) + ' %', sx, sy); ctx.fillText(Math.round(wert) + ' %', sx, sy);
    }
    ctx.restore();
  }
  function gesicht(ctx, x, y, r, art) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sgn * r * 0.32, y - r * 0.12, r * 0.2, r * 0.24, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#1a1a1a';
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sgn * r * 0.32 + r * 0.04, y - r * 0.08, r * 0.1, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.lineCap = 'round';
    if (art === 'frech') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.45); ctx.lineTo(x - r * 0.15, y - r * 0.35); ctx.moveTo(x + r * 0.5, y - r * 0.45); ctx.lineTo(x + r * 0.15, y - r * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.28, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    } else { ctx.beginPath(); ctx.arc(x, y + r * 0.12, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.restore();
  }
  function keim(ctx, o, sx, sy, r, t, s, E, F, p) {
    const wackel = Math.sin(t * 3 + r) * 0.08;
    if (o.typ === 'virus') {
      const f = o.farbe || '#9a5ae0';
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.4 + wackel);
      ctx.strokeStyle = BF.rgba(BF.hex(f), 0.7); ctx.fillStyle = '#f2d230'; ctx.lineWidth = Math.max(1.5, r * 0.09);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); ctx.stroke(); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4, r * 0.14, 0, 7); ctx.fill(); }
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, f); g.addColorStop(1, BF.rgba(BF.hex(f), 0.75));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.rotate(-(t * 0.4 + wackel));
      if (!o.ohneGesicht) gesicht(ctx, 0, 0, r * 0.8, 'frech');
      ctx.restore();
    } else if (o.typ === 'bakterie') {
      const f = o.farbe || (o.gut ? '#5ac85a' : '#e07a3a');
      let teile = [[0, 1]];
      if (o.teilung && t >= o.teilung.t0) {
        const u = clamp((t - o.teilung.t0) / (o.teilung.t1 - o.teilung.t0), 0, 1);
        teile = [[-u * r * 1.15, 1 - u * 0.15], [u * r * 1.15, 1 - u * 0.15]];
      }
      for (const [dx, sk] of teile) {
        ctx.save(); ctx.translate(sx + dx, sy + Math.sin(t * 2 + dx) * r * 0.05); ctx.rotate(wackel * 0.5);
        const L = r * 1.1 * sk, B = r * 0.55;
        ctx.strokeStyle = BF.rgba(BF.hex(f), 0.8); ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.beginPath(); ctx.moveTo(-L, 0); for (let i = 0; i <= 10; i++) ctx.lineTo(-L - i * r * 0.12, Math.sin(t * 10 + i) * r * 0.12); ctx.stroke(); // Geißel
        ctx.fillStyle = f; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-L, -B, L * 2, B * 2, B) : ctx.rect(-L, -B, L * 2, B * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-L * 0.3, -B * 0.4, L * 0.5, B * 0.25, 0, 0, 7); ctx.fill();
        if (!o.ohneGesicht) gesicht(ctx, L * 0.35, 0, B * 0.9, o.gut ? 'nett' : 'frech');
        ctx.restore();
      }
    } else if (o.typ === 'zelle') {
      const f = o.farbe || '#f6b8c8';
      const platzt = o.kopien && o.kopien.platzen !== null && t >= o.kopien.platzen;
      ctx.save();
      if (platzt) ctx.globalAlpha *= clamp(1 - (t - o.kopien.platzen) / 0.5, 0, 1);
      const g = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
      g.addColorStop(0, BF.rgba(BF.hex(f), 1, 0.5)); g.addColorStop(1, BF.rgba(BF.hex(f), 1, 0.85));
      ctx.fillStyle = g; ctx.strokeStyle = BF.rgba(BF.hex(f), 0.6); ctx.lineWidth = Math.max(2, r * 0.05);
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const rr = r * (1 + Math.sin(a * 5 + t) * 0.02); i ? ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Zellkern
      ctx.fillStyle = 'rgba(150,80,160,0.55)'; ctx.beginPath(); ctx.arc(sx + r * 0.15, sy + r * 0.1, r * 0.3, 0, 7); ctx.fill();
      // Schlösser auf der Hülle
      ctx.fillStyle = '#7a5ad0';
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * r, sy + Math.sin(a) * r, r * 0.07, 0, 7); ctx.fill(); }
      ctx.restore();
      // Virus-Kopien
      if (o.kopien && t >= o.kopien.t0) {
        const K = o.kopien, rr = BF.rng(BF.hash(o.name) + 3);
        for (let i = 0; i < K.n; i++) {
          const da = K.t0 + (i / K.n) * (K.t1 - K.t0);
          const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r * 0.65;
          if (t < da) continue;
          let x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d;
          if (platzt) { const dt = t - K.platzen; const fl = r * (1.3 * Math.min(dt, 1) + 0.12 * Math.max(0, dt - 1)); x += Math.cos(a) * fl; y += Math.sin(a) * fl; }
          keim(ctx, { typ: 'virus', farbe: '#9a5ae0', ohneGesicht: r < 40, r: 1 }, x, y, r * 0.11 * Math.min(1, (t - da) / 0.4 + 0.2), t + i, s, E, F, p);
        }
      }
    } else if (o.typ === 'abwehr') {
      const f = o.farbe || '#f4f6fb';
      ctx.save();
      ctx.fillStyle = f; ctx.strokeStyle = '#9ab0d8'; ctx.lineWidth = Math.max(1.5, r * 0.05);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const rr = r * (1 + Math.sin(a * 4 + t * 2) * 0.07); i ? ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!o.ohneGesicht) {
        gesicht(ctx, sx, sy + r * 0.1, r * 0.7, 'nett');
        // Polizeimütze
        ctx.fillStyle = '#2a4ab0'; ctx.beginPath(); ctx.ellipse(sx, sy - r * 0.62, r * 0.55, r * 0.22, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(sx - r * 0.62, sy - r * 0.64, r * 1.24, r * 0.12);
        ctx.fillStyle = '#f2d230'; ctx.beginPath(); ctx.arc(sx, sy - r * 0.72, r * 0.08, 0, 7); ctx.fill();
      }
      ctx.restore();
    } else if (o.typ === 'antikoerper') {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 2 + r * 7) * 0.3);
      ctx.strokeStyle = o.farbe || '#3ab0e8'; ctx.lineWidth = Math.max(2, r * 0.22); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.7, -r * 0.8); ctx.moveTo(0, 0); ctx.lineTo(r * 0.7, -r * 0.8); ctx.stroke();
      ctx.restore();
    }
  }
  function wolke(ctx, sx, sy, r, t, o, E) {
    const x = sx + Math.sin(t * 0.15 + r) * r * 0.3;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (const [dx, dy, rr] of [[-0.6, 0.1, 0.45], [-0.15, -0.2, 0.6], [0.4, -0.05, 0.5], [0.8, 0.15, 0.35], [0.1, 0.2, 0.5]]) { ctx.beginPath(); ctx.arc(x + dx * r, sy + dy * r, rr * r, 0, 7); ctx.fill(); }
    if (o.regen) { ctx.strokeStyle = 'rgba(120,160,230,0.8)'; ctx.lineWidth = 2 * E; for (let i = 0; i < 14; i++) { const rx = x - r * 0.8 + (i / 13) * r * 1.6, ry = sy + r * 0.5 + ((t * r * 3 + i * 37) % (r * 2)); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - r * 0.05, ry + r * 0.18); ctx.stroke(); } }
  }
  function geist(ctx, sx, sy, r, t, F, o, p, s) {
    // wird durchsichtiger, wenn er gerade in einer Wand steckt
    let inWand = false;
    for (const wd of F.w2d.liste) if (wd.typ === 'wand' && t >= wd.t0 && t < wd.t1) { const wp = pos(F, wd, t); if (Math.abs(p[0] - wp[0]) < wd.breite / 2 + o.r * 0.5) inWand = true; }
    ctx.save();
    ctx.globalAlpha *= inWand ? 0.45 : 0.92;
    const y = sy + Math.sin(t * 2.2) * r * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(200,220,255,0.9)'; ctx.shadowBlur = r * 0.4;
    ctx.beginPath();
    ctx.arc(sx, y - r * 0.2, r * 0.8, Math.PI, 0);
    ctx.lineTo(sx + r * 0.8, y + r * 0.8);
    for (let i = 0; i < 4; i++) { const x1 = sx + r * 0.8 - (i + 0.5) * r * 0.4, x2 = sx + r * 0.8 - (i + 1) * r * 0.4; ctx.quadraticCurveTo(x1, y + r * (0.55 + 0.2 * Math.sin(t * 6 + i)), x2, y + r * 0.8); }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#222';
    for (const dx of [-0.28, 0.28]) { ctx.beginPath(); ctx.ellipse(sx + dx * r, y - r * 0.25, r * 0.12, r * 0.18, 0, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(sx, y + r * 0.12, r * 0.14, r * 0.1, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function wand(ctx, sx, sy, o, s) {
    const b = o.breite * s, hh = o.r * s, x = sx - b / 2, y = sy - hh;
    ctx.fillStyle = '#b5583a'; ctx.fillRect(x, y, b, hh);
    ctx.strokeStyle = 'rgba(240,225,210,0.75)'; ctx.lineWidth = Math.max(1, s * 0.15);
    const zh = hh / Math.max(4, Math.round(o.r / 1.5));
    for (let yy = y, i = 0; yy < sy; yy += zh, i++) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + b, yy); ctx.stroke();
      const off = i % 2 ? b / 2 : 0;
      ctx.beginPath(); ctx.moveTo(x + off, yy); ctx.lineTo(x + off, Math.min(sy, yy + zh)); ctx.stroke();
    }
    if (o.fenster) {
      const fy = y + hh * 0.25, fh = hh * 0.35;
      ctx.fillStyle = 'rgba(180,220,255,0.55)'; ctx.fillRect(x - 1, fy, b + 2, fh);
      ctx.strokeStyle = '#eee'; ctx.lineWidth = s * 0.3; ctx.strokeRect(x - 1, fy, b + 2, fh);
    }
  }
  function kind(ctx, sx, sy, r, t, o, F) {
    const H = r * 1.0, k = H * 0.17;
    const geht = o.segs.some(g => g.typ === 'zu' && t >= g.t0 && t < g.t1);
    const schritt = geht ? Math.sin(t * 11) : 0;
    ctx.save();
    ctx.lineCap = 'round';
    const huefte = sy - H * 0.44, schulter = sy - H * 0.74, bauch = sy - H * 0.42;
    const halbB = H * 0.15; // halbe Körperbreite an den Schultern
    // Beine: zwei getrennte Beine unter der Hüfte, beim Gehen abwechselnd kürzer (Knie hoch)
    ctx.strokeStyle = '#2f3a5a'; ctx.lineWidth = H * 0.085;
    for (const sgn of [-1, 1]) {
      const hebt = Math.max(0, schritt * sgn) * H * 0.07;
      ctx.beginPath(); ctx.moveTo(sx + sgn * H * 0.07, huefte); ctx.lineTo(sx + sgn * H * 0.08, sy - hebt); ctx.stroke();
      ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.ellipse(sx + sgn * H * 0.09, sy - hebt, H * 0.06, H * 0.03, 0, 0, 7); ctx.fill();
    }
    // Arme: hängen an den Schultern seitlich am Körper herunter und schwingen beim Gehen leicht
    ctx.strokeStyle = '#e8b08a'; ctx.lineWidth = H * 0.065;
    for (const sgn of [-1, 1]) {
      const schwung = -schritt * sgn * H * 0.03;
      const ax = sx + sgn * (halbB + H * 0.02), ay = schulter + H * 0.03;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + sgn * H * 0.02, ay + H * 0.3 + schwung); ctx.stroke();
      ctx.fillStyle = '#f2c4a0'; ctx.beginPath(); ctx.arc(ax + sgn * H * 0.02, ay + H * 0.31 + schwung, H * 0.035, 0, 7); ctx.fill();
    }
    // Pulli
    ctx.fillStyle = o.farbe;
    ctx.beginPath();
    ctx.moveTo(sx - halbB, schulter); ctx.lineTo(sx + halbB, schulter);
    ctx.lineTo(sx + halbB * 1.05, bauch); ctx.lineTo(sx - halbB * 1.05, bauch); ctx.closePath(); ctx.fill();
    // Ärmel oben an den Schultern
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(sx + sgn * (halbB + H * 0.01), schulter + H * 0.05, H * 0.045, 0, 7); ctx.fill(); }
    // Hals und Kopf
    ctx.fillStyle = '#f2c4a0';
    ctx.fillRect(sx - H * 0.03, schulter - H * 0.04, H * 0.06, H * 0.05);
    ctx.beginPath(); ctx.arc(sx, schulter - k * 1.15, k, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.arc(sx, schulter - k * 1.35, k * 0.98, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    // Gesicht von vorne: zwei Augen und ein Lächeln
    ctx.fillStyle = '#222';
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(sx + sgn * k * 0.35, schulter - k * 1.15, k * 0.1, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#a0503a'; ctx.lineWidth = k * 0.1;
    ctx.beginPath(); ctx.arc(sx, schulter - k * 0.95, k * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
  }
  function atome(ctx, sx, sy, o, s, t) {
    const d = o.r * 2.3 * s, R = o.r * s;
    const x0 = sx - (o.sp - 1) * d / 2, y0 = sy - (o.ze - 1) * d / 2;
    for (let i = 0; i < o.sp; i++) for (let j = 0; j < o.ze; j++) {
      const x = x0 + i * d + Math.sin(t * 5 + i * 1.7 + j) * R * 0.06, y = y0 + j * d + Math.cos(t * 4.3 + j * 2.1 + i) * R * 0.06;
      if (o.wolke) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, BF.rgba(BF.hex(o.farbe), 1, 0.05)); g.addColorStop(0.7, BF.rgba(BF.hex(o.farbe), 1, 0.35)); g.addColorStop(1, BF.rgba(BF.hex(o.farbe), 1, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
        ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, R * 0.08), 0, 7); ctx.fill();
        for (let e = 0; e < 2; e++) { const a = t * (3 + e) + i + j * 2 + e * 3; ctx.fillStyle = '#4aa0ff'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * 0.75, y + Math.sin(a * 1.3) * R * 0.6, Math.max(1, R * 0.07), 0, 7); ctx.fill(); }
      } else {
        const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, 0, x, y, R);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, o.farbe); g.addColorStop(1, BF.rgba(BF.hex(o.farbe), 0.6));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 0.9, 0, 7); ctx.fill();
        // Ärmchen zum Nachbarn: Atome halten sich fest
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, R * 0.12);
        if (i < o.sp - 1) { ctx.beginPath(); ctx.moveTo(x + R * 0.9, y); ctx.lineTo(x + d - R * 0.9, y); ctx.stroke(); }
        if (j < o.ze - 1) { ctx.beginPath(); ctx.moveTo(x, y + R * 0.9); ctx.lineTo(x, y + d - R * 0.9); ctx.stroke(); }
      }
    }
  }
  function auge(ctx, sx, sy, r, t) {
    const zu = Math.max(0, Math.sin(t * 0.9) > 0.985 ? 1 : 0); // ab und zu blinzeln
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = '#fbfbf8';
    ctx.beginPath(); ctx.moveTo(-r * 1.6, 0); ctx.quadraticCurveTo(0, -r * 1.3 * (1 - zu), r * 1.6, 0); ctx.quadraticCurveTo(0, r * 1.3 * (1 - zu), -r * 1.6, 0); ctx.fill();
    if (!zu) {
      ctx.fillStyle = '#3a7ad0'; ctx.beginPath(); ctx.arc(-r * 0.35, 0, r * 0.62, 0, 7); ctx.fill();
      ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.18, r * 0.1, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(-r * 1.6, 0); ctx.quadraticCurveTo(0, -r * 1.3 * (1 - zu), r * 1.6, 0); ctx.quadraticCurveTo(0, r * 1.3 * (1 - zu), -r * 1.6, 0); ctx.stroke();
    ctx.restore();
  }

  // ---------- Alters-Fassungen ----------
  // Zeilen wie  sprecher@0-2 "…"  oder  tafel@6-9,10+ "…"  gelten nur für diese Alter; Zeilen ohne @ für alle.
  const TEMPO = { '0-2': ['stimme standard tempo 0.82', 'sprechpause 1.3'], '3-5': ['stimme standard tempo 0.88', 'sprechpause 0.9'], '6-9': ['stimme standard tempo 0.95', 'sprechpause 0.5'], '10+': ['stimme standard tempo 1', 'sprechpause 0.35'] };
  BF.themaFuerAlter = function (skript, alter = '3-5') {
    const out = [];
    for (const z of skript.split('\n')) {
      if (/^stimme standard tempo/.test(z)) { out.push(TEMPO[alter][0]); continue; }
      if (/^sprechpause\b/.test(z)) { out.push(TEMPO[alter][1]); continue; }
      const m = /^(&?\s*\S+?)@([0-9+,\-]+)\s(.*)$/.exec(z);
      if (m) { if (m[2].split(',').includes(alter)) out.push(m[1] + ' ' + m[3]); continue; }
      out.push(z);
    }
    return out.join('\n');
  };
  BF.themaSkript = function (thema, alter = '3-5') {
    if (alter === '0-2' && thema.kurz) return BF.themaFuerAlter(thema.kurz, alter);
    return BF.themaFuerAlter(thema.skript, alter);
  };
  BF.ALTER_NAME = { '0-2': '0–2 Jahre', '3-5': '3–5 Jahre', '6-9': '6–9 Jahre', '10+': '10+ Jahre' };

  // ---------- Fertige Themen (vollständige Erklärfilme) ----------
  BF.THEMEN = {
    mathe: {
      name: 'Wie funktioniert Mathe?',
      erkennen: /mathe|mathematik|einmaleins|geometrie|\bzaehlen\b|plus und minus|rechnen lernen|wie rechnet man|wie funktioniert rechnen/,
      kurz: `hintergrund weiss
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Zählen" 3
apfel2d a1 bei -16 0 groesse 5
sprecher "Schau mal! Ein Apfel. Eins!"
apfel2d a2 bei 0 0 groesse 5
sprecher "Noch ein Apfel. Zwei!"
apfel2d a3 bei 16 0 groesse 5
sprecher "Und noch einer. Drei!"
zahl2d z3 "3" bei 0 13 groesse 9 farbe orange
& ton tada
sprecher "Drei Äpfel. Toll gezählt!"
warte 1
verstecke2d a1
& verstecke2d a2
& verstecke2d a3
& verstecke2d z3
form2d ball bei -14 0 groesse 7 art kugel farbe rot
& form2d kiste bei 14 0 groesse 6 art wuerfel farbe gelb
& ton plopp
sprecher "Ein runder Ball. Und eine eckige Kiste."
warte 1
sprecher "Rund und eckig. Das ist Mathe!"
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
      skript: `hintergrund tafel
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Wie funktioniert Mathe?" 3.5
zahl2d t1 "1 2 3" bei -20 8 groesse 7 farbe gelb
& form2d f1 bei 18 8 groesse 5 art dreieck farbe blau
& pizza2d p1 bei -18 -10 groesse 6 teile 4
& form2d f2 bei 18 -10 groesse 5 art kreis farbe rot
& ton glocke
sprecher "Hallo! Heute geht es um Mathe."
sprecher "Vielleicht denkst du: Mathe, das ist nur was für die Schule."
sprecher "Aber weißt du was? Mathe ist überall! Und du kannst schon ganz viel davon."
sprecher "Mathe heißt: zählen, rechnen, Formen erkennen, teilen und messen."
sprecher@10+ "Mathematik ist die Wissenschaft von Zahlen, Formen, Mustern und logischen Zusammenhängen."
warte 1.5
verstecke2d t1
& verstecke2d f1
& verstecke2d p1
& verstecke2d f2
kapitel "1. Zählen" 3
hintergrund weiss in 2
sprecher "Das Allererste in Mathe ist Zählen. Zählen wir zusammen!"
apfel2d a1 bei -24 0 groesse 4
& zahl2d n1 "1" bei -24 10 groesse 6 farbe orange
sprecher "Eins."
apfel2d a2 bei -12 0 groesse 4
& zahl2d n2 "2" bei -12 10 groesse 6 farbe orange
sprecher "Zwei."
apfel2d a3 bei 0 0 groesse 4
& zahl2d n3 "3" bei 0 10 groesse 6 farbe orange
sprecher "Drei."
apfel2d a4 bei 12 0 groesse 4
& zahl2d n4 "4" bei 12 10 groesse 6 farbe orange
sprecher "Vier."
apfel2d a5 bei 24 0 groesse 4
& zahl2d n5 "5" bei 24 10 groesse 6 farbe orange
sprecher "Fünf!"
& ton tada
sprecher "Fünf Äpfel. Super gezählt!"
sprecher "Jede Zahl sagt uns, wie viele Sachen da sind."
sprecher "Die Zahl Fünf ist immer gleich viel. Egal ob fünf Äpfel, fünf Autos oder fünf Elefanten."
sprecher@6-9,10+ "Die letzte Zahl beim Zählen verrät, wie viele es insgesamt sind."
warte 1.5
verstecke2d a1
& verstecke2d a2
& verstecke2d a3
& verstecke2d a4
& verstecke2d a5
& verstecke2d n1
& verstecke2d n2
& verstecke2d n3
& verstecke2d n4
& verstecke2d n5
symbol2d hand1 "🖐️" bei -10 2 groesse 10
& symbol2d hand2 "🖐️" bei 10 2 groesse 10
sprecher "Und weißt du, womit man ganz leicht zählen kann? Mit deinen Fingern!"
sprecher "Du hast zehn Finger. Fünf an jeder Hand."
verstecke2d hand1
& verstecke2d hand2
zahl2d zehn "10" bei 0 2 groesse 12 farbe blau
& ton plopp
sprecher "Darum zählen wir in Zehner-Päckchen. Zehn, zwanzig, dreißig, vierzig …"
sprecher@6-9,10+ "Mit nur zehn Zeichen, den Ziffern null bis neun, kann man jede Zahl der Welt aufschreiben."
sprecher@10+ "Das nennt man Zehnersystem. Bei der Zahl dreihundertfünfundzwanzig steht die drei für drei Hunderter, die zwei für zwei Zehner und die fünf für fünf Einer."
warte 1
verstecke2d zehn
zahl2d null "0" bei 0 2 groesse 12 farbe gelb
& ton plopp
sprecher "Und es gibt eine ganz besondere Zahl. Die Null!"
sprecher "Null heißt: gar nichts. Wenn alle Äpfel aufgegessen sind, sind null Äpfel übrig."
sprecher@6-9,10+ "Die Null wurde vor ungefähr eintausendfünfhundert Jahren in Indien erfunden. Vorher gab es kein Zeichen für nichts."
warte 1.5
verstecke2d null
kapitel "2. Plus rechnen" 3
sprecher "Jetzt rechnen wir! Zuerst mit Plus."
reihe2d p anzahl 3 bei -32 2 abstand 10 art apfel groesse 3.5
sprecher "Hier liegen drei Äpfel."
reihe2d q anzahl 2 bei 14 2 abstand 10 art apfel groesse 3.5 farbe gruen
sprecher "Und jetzt kommen noch zwei Äpfel dazu."
sprecher "Wie viele sind es jetzt zusammen?"
warte 2
zahl2d plus "3 + 2 = 5" bei 0 13 groesse 7 farbe gelb
& ton tada
sprecher "Fünf! Drei plus zwei ist fünf."
sprecher "Plus heißt: Es kommt etwas dazu. Dann wird es mehr."
sprecher@6-9,10+ "Das Zeichen für Plus ist ein kleines Kreuz. Und das Ergebnis heißt Summe."
sprecher@10+ "Beim Plus ist die Reihenfolge egal. Zwei plus drei ist auch fünf."
warte 1.5
verstecke2d p1
& verstecke2d p2
& verstecke2d p3
& verstecke2d q1
& verstecke2d q2
& verstecke2d plus
kapitel "3. Minus rechnen" 3
reihe2d m anzahl 5 bei -24 2 abstand 12 art apfel groesse 4
sprecher "Jetzt haben wir wieder fünf Äpfel."
sprecher "Aber ich habe Hunger. Ich esse zwei Äpfel auf."
verstecke2d m5
& ton mampf
warte 0.8
verstecke2d m4
& ton mampf
sprecher "Mampf, mampf. Lecker!"
sprecher "Wie viele Äpfel sind noch übrig?"
warte 2
zahl2d minus "5 − 2 = 3" bei 0 13 groesse 7 farbe gelb
& ton tada
sprecher "Drei! Fünf minus zwei ist drei."
sprecher "Minus heißt: Es wird etwas weggenommen. Dann wird es weniger."
sprecher@6-9,10+ "Das Zeichen für Minus ist ein kleiner Strich. Und Plus und Minus sind wie Geschwister: Das eine macht das andere wieder rückgängig."
sprecher@10+ "Mit Minus kommt man sogar unter null. Das sind die negativen Zahlen, zum Beispiel minus fünf Grad im Winter."
warte 1.5
verstecke2d m1
& verstecke2d m2
& verstecke2d m3
& verstecke2d minus
kapitel "4. Mal rechnen" 3
sprecher "Jetzt kommt ein Zaubertrick zum schnellen Zählen."
reihe2d s anzahl 12 bei -15 13 abstand 9 zeile 4 art stern groesse 3
sprecher "Hier sind Sterne. Drei Reihen. Und in jeder Reihe sind vier Sterne."
sprecher "Man kann alle einzeln zählen. Aber das dauert lange."
sprecher "Schneller geht es so: vier, und noch mal vier, und noch mal vier."
zahl2d mal "3 · 4 = 12" bei 0 -13 groesse 5.5 farbe gelb
& ton tada
sprecher "Das sind zwölf! Drei mal vier ist zwölf."
sprecher "Mal ist also ganz schnelles Plus."
sprecher@6-9,10+ "Wenn man die Mal-Aufgaben bis zehn auswendig kann, nennt man das das kleine Einmaleins."
sprecher@10+ "Auch beim Malnehmen ist die Reihenfolge egal. Drei mal vier und vier mal drei ergeben beide zwölf. Dreh das Bild einfach im Kopf."
warte 1.5
verstecke2d mal
& verstecke2d s1
& verstecke2d s2
& verstecke2d s3
& verstecke2d s4
& verstecke2d s5
& verstecke2d s6
& verstecke2d s7
& verstecke2d s8
& verstecke2d s9
& verstecke2d s10
& verstecke2d s11
& verstecke2d s12
kapitel "5. Teilen" 3
pizza2d pizza bei 0 0 groesse 12 teile 4
& symbol2d kid1 "👧" bei -24 9 groesse 6
& symbol2d kid2 "👦" bei 24 9 groesse 6
& symbol2d kid3 "🧒" bei -24 -9 groesse 6
& symbol2d kid4 "👶" bei 24 -9 groesse 6
& ton plopp
sprecher "Mmh, eine Pizza! Und wir sind vier Kinder."
sprecher "Damit es gerecht ist, schneiden wir die Pizza in vier gleich große Stücke."
sprecher "Jedes Kind bekommt ein Stück."
pizzaweg2d pizza anzahl 1
sprecher "Das erste Kind nimmt sein Stück."
pizzaweg2d pizza anzahl 1
sprecher "Das zweite Kind."
pizzaweg2d pizza anzahl 1
sprecher "Das dritte."
pizzaweg2d pizza anzahl 1
sprecher "Und das vierte. Alle haben gleich viel. Das ist Teilen!"
& ton tada
sprecher "Teilen heißt: Man macht aus einem Ganzen gleich große Teile."
sprecher@6-9,10+ "Ein Stück von vier gleichen Stücken nennt man ein Viertel. Zwei Viertel sind zusammen eine halbe Pizza."
sprecher@10+ "So etwas nennt man Bruch. Ein Viertel schreibt man als eins über vier, mit einem Strich dazwischen."
warte 1.5
verstecke2d pizza
& verstecke2d kid1
& verstecke2d kid2
& verstecke2d kid3
& verstecke2d kid4
kapitel "6. Formen" 3
form2d kr bei -27 4 groesse 6 art kreis farbe rot
& text2d "Kreis" an kr 5
& ton plopp
sprecher "Mathe ist auch Formen. Das hier ist ein Kreis. Rund wie ein Teller oder ein Rad."
form2d dr bei -9 4 groesse 6 art dreieck farbe gelb
& text2d "Dreieck" an dr 5
& ton plopp
sprecher "Das ist ein Dreieck. Es hat drei Ecken. Wie ein Stück Pizza oder ein Dach."
form2d qu bei 9 4 groesse 5.5 art quadrat farbe blau
& text2d "Quadrat" an qu 5
& ton plopp
sprecher "Das ist ein Quadrat. Es hat vier Ecken und vier gleich lange Seiten."
form2d re bei 28 4 groesse 4 art rechteck farbe gruen
& text2d "Rechteck" an re 5
& ton plopp
sprecher "Und das ist ein Rechteck. Wie eine Tür oder ein Buch."
warte 1
form2d se bei -14 -13 groesse 5 art sechseck farbe orange
& ton plopp
sprecher "Diese Form hat sechs Ecken. Die Bienen bauen ihre Waben genau so."
form2d wu bei 4 -13 groesse 5 art wuerfel farbe lila
& form2d ku bei 20 -13 groesse 5 art kugel farbe rot
& ton plopp
sprecher "Und es gibt Formen zum Anfassen. Ein Würfel, wie ein Bauklotz. Und eine Kugel, wie ein Ball."
sprecher "Schau dich mal um. Welche Formen findest du in deinem Zimmer?"
sprecher@6-9,10+ "Ein Würfel hat sechs Flächen, acht Ecken und zwölf Kanten. Zähl mal bei einem Spielwürfel nach!"
sprecher@10+ "Dieser Teil der Mathematik heißt Geometrie. Er hilft zum Beispiel beim Bauen von Häusern und Brücken."
warte 1.5
verstecke2d kr
& verstecke2d dr
& verstecke2d qu
& verstecke2d re
& verstecke2d se
& verstecke2d wu
& verstecke2d ku
kapitel "7. Muster" 3
reihe2d mu anzahl 5 bei -24 0 abstand 10 art kreis groesse 3.5 farbe rot
sprecher "Und Mathe ist auch Muster erkennen. Schau genau hin."
form2d b1 bei -14 0 groesse 3.5 art kreis farbe blau
& verstecke2d mu2
form2d b2 bei 6 0 groesse 3.5 art kreis farbe blau
& verstecke2d mu4
sprecher "Rot, blau, rot, blau, rot. Was kommt als Nächstes?"
warte 2.5
form2d b3 bei 26 0 groesse 3.5 art kreis farbe blau
& ton tada
sprecher "Blau! Richtig! Du hast das Muster erkannt."
sprecher "Muster gibt es überall. Bei Streifen auf einem Pulli, bei Musik und sogar bei den Wochentagen."
sprecher@6-9,10+ "Auch Zahlen haben Muster: zwei, vier, sechs, acht. Immer zwei mehr. Was kommt als Nächstes?"
warte@6-9,10+ 2
sprecher@6-9,10+ "Zehn!"
warte 1.5
verstecke2d mu1
& verstecke2d mu3
& verstecke2d mu5
& verstecke2d b1
& verstecke2d b2
& verstecke2d b3
kapitel "8. Messen und Vergleichen" 3
hintergrund erde in 2
kind2d kind bei -14 -11 groesse 12
& baum2d baum bei 16 -11 groesse 20 farbe gruen
& ton plopp
sprecher "Mit Mathe kann man auch vergleichen. Wer ist größer, das Kind oder der Baum?"
warte 1.5
sprecher "Der Baum! Er ist viel größer."
symbol2d mass "📏" bei 2 4 groesse 7
sprecher "Mit einem Maßband kann man genau messen, wie groß etwas ist. Zum Beispiel in Zentimetern."
verstecke2d mass
symbol2d waage "⚖️" bei -2 4 groesse 7
& symbol2d uhr "⏰" bei 8 4 groesse 7
sprecher "Und man kann messen, wie schwer etwas ist. Und wie lange etwas dauert."
sprecher@6-9,10+ "Ein Kind in der ersten Klasse ist ungefähr einhundertzwanzig Zentimeter groß. Das ist ein Meter und zwanzig Zentimeter."
sprecher@10+ "Damit sich alle verstehen, gibt es feste Einheiten: Meter für Längen, Kilogramm für Gewicht und Sekunden für die Zeit."
warte 1.5
verstecke2d kind
& verstecke2d baum
& verstecke2d waage
& verstecke2d uhr
kapitel "9. Mathe im Alltag" 3
hintergrund zimmer in 2
sprecher "Wofür brauchen wir Mathe eigentlich im Alltag?"
warte 1
reihe2d e anzahl 3 bei -26 4 abstand 7 art apfel groesse 3
symbol2d geld "🪙" bei -2 4 groesse 6
sprecher "Beim Einkaufen. Drei Äpfel kosten etwas Geld. Wie viel muss man bezahlen?"
symbol2d wf "🎲" bei 14 4 groesse 7
& ton plopp
sprecher "Beim Spielen. Du würfelst eine Vier und gehst vier Felder weiter."
symbol2d kuchen "🎂" bei 28 4 groesse 7
sprecher "Beim Backen. Im Rezept steht, wie viel Mehl und wie viele Eier in den Kuchen kommen."
symbol2d pc "💻" bei 0 -6 groesse 7
sprecher "Und Computer und Handys rechnen die ganze Zeit. Ohne Mathe gäbe es keine Spiele und keine Videos."
symbol2d@6-9,10+ rak "🚀" bei 14 -6 groesse 7
sprecher@6-9,10+ "Auch Uhren, Kalender, Landkarten und Raketen funktionieren nur mit Mathe."
sprecher@10+ "Mathematik ist wie eine Sprache, mit der man die Welt beschreibt. Physik, Technik und Informatik bauen alle darauf auf."
warte 1.5
verstecke2d e1
& verstecke2d e2
& verstecke2d e3
& verstecke2d wf
& verstecke2d geld
& verstecke2d kuchen
& verstecke2d pc
& verstecke2d rak
hintergrund tafel in 2
tafel@3-5 "Merk dir:" "Zählen: 1, 2, 3, 4, 5" "Plus: Es wird mehr." "Minus: Es wird weniger." "Formen: Kreis, Dreieck, Quadrat" rechts 18
tafel@6-9 "Merk dir:" "Plus: 3 + 2 = 5" "Minus: 5 − 2 = 3" "Mal: 3 · 4 = 12" "Teilen: 1 Pizza für 4 = 4 Viertel" "Formen und Muster erkennen" rechts 20
tafel@10+ "Merke:" "Zehnersystem: Ziffern 0 bis 9" "Plus und Minus heben sich auf" "Mal = wiederholtes Plus" "Brüche: Teile eines Ganzen" "Geometrie: Formen und Körper" rechts 20
sprecher "Merk dir: Mathe ist Zählen, Rechnen, Teilen, Formen und Muster."
sprecher "Und du benutzt Mathe jeden Tag, schon jetzt!"
sprecher "Probier es gleich aus: Zähl doch mal, wie viele Spielsachen in deinem Zimmer liegen."
ton tada
warte 2
sprecher "Tschüss, und bis zum nächsten Mal!"
ausblenden 1.5`,
    },
    technik: {
      name: 'Wie funktionieren Handys, Computer und Tablets?',
      erkennen: /handy|handys|computer|laptop|tablet|ipad|smartphone|\bpc\b|internet|telefonier/,
      kurz: `hintergrund zimmer
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Handy und Tablet" 3
geraet2d handy bei -16 2 groesse 18 art handy
& geraet2d tablet bei 16 2 groesse 18 art tablet
ton plopp
sprecher "Schau! Ein Handy. Und ein Tablet."
bildschirm2d handy zeigt foto
& bildschirm2d tablet zeigt video
sprecher "Damit kann man Fotos machen. Und Videos schauen."
warte 1
bildschirm2d handy zeigt anruf
& ton glocke
sprecher "Und man kann mit Oma telefonieren. Hallo, Oma!"
warte 1
verstecke2d handy
& verstecke2d tablet
pixel2d px bei 0 0 groesse 30
& ton magie
sprecher "Das Bild ist aus ganz vielen kleinen bunten Punkten."
sprecher "Schau, ein lachendes Gesicht!"
warte 1
verstecke2d px
akku2d akku bei 0 0 groesse 18 wert 10
sprecher "Oh, das Handy ist müde. Der Akku ist leer."
temperatur2d akku auf 100 in 5
& ton magie
sprecher "Jetzt laden wir es auf. Fertig!"
ton tada
verstecke2d akku
kind2d kind bei 0 -11 groesse 12
sprecher "Und dann machen wir eine Pause. Und spielen draußen!"
sprecher "Tschüss!"
ausblenden 1.5`,
      skript: `hintergrund zimmer
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Handy, Computer und Tablet: Wie funktioniert das?" 4
geraet2d handy bei -26 2 groesse 18 art handy
& geraet2d tablet bei 0 2 groesse 18 art tablet
& geraet2d laptop bei 28 -6 groesse 14 art laptop
& ton glocke
sprecher "Hallo! Schau mal, was hier alles liegt."
sprecher "Ein Handy, ein Tablet und ein Laptop."
& text2d "Handy" an handy 5
& text2d "Tablet" an tablet 5
& text2d "Laptop" an laptop 5
sprecher "Vielleicht hast du so etwas auch zu Hause. Mama, Papa, Oma oder Opa benutzen sie bestimmt jeden Tag."
sprecher "Damit kann man telefonieren, Fotos machen, Videos schauen, spielen und noch viel mehr."
bildschirm2d handy zeigt foto
& bildschirm2d tablet zeigt video
& bildschirm2d laptop zeigt spiel
& ton plopp
sprecher "Aber wie funktionieren diese kleinen Wunderkisten eigentlich?"
warte 1.5
sprecher "Was ist da drin? Und wie kommt das Bild auf den Bildschirm?"
sprecher "Das finden wir heute zusammen heraus. Los geht's!"
& ton tada
warte 1.5
verstecke2d handy
& verstecke2d tablet
& verstecke2d laptop
kapitel "1. Was ist ein Computer?" 3
geraet2d c1h bei -26 2 groesse 18 art handy
& geraet2d c1t bei 0 2 groesse 18 art tablet
& geraet2d c1l bei 28 -6 groesse 14 art laptop
& ton plopp
sprecher "Fangen wir mit einer Überraschung an."
sprecher "Ein Handy ist eigentlich ein Computer. Und ein Tablet auch!"
sprecher "Alle drei sind Computer. Nur in verschiedenen Größen."
verstecke2d c1h
& verstecke2d c1t
& verstecke2d c1l
geraet2d pc bei 0 -6 groesse 18 art pc
& ton plopp
sprecher "Ein Computer ist eine Maschine, die ganz schnell rechnen kann."
sprecher "Viel, viel schneller als jeder Mensch auf der Welt."
sprecher@6-9,10+ "Ein Handy kann Milliarden Rechnungen in einer einzigen Sekunde machen."
sprecher@10+ "Ein moderner Handy-Prozessor schafft je nach Aufgabe Billionen einfache Rechenschritte pro Sekunde."
warte 1
sprecher "Aber ein Computer ist nicht schlau wie ein Mensch."
sprecher "Er kann nicht selbst denken. Er macht nur genau das, was man ihm sagt."
sprecher "Was er tun soll, steht in einer langen Liste von Befehlen."
bildschirm2d pc zeigt code
& ton magie
sprecher "So eine Liste heißt Programm."
& text "Programm = Liste von Befehlen" 5 oben farbe gelb
symbol2d rezept "📜" bei 26 2 groesse 7
sprecher "Das ist so ähnlich wie ein Kochrezept."
symbol2d schuessel "🥣" bei -26 0 groesse 7
sprecher "Erst Mehl in die Schüssel. Dann Milch dazu. Dann umrühren."
sprecher "Der Computer liest die Befehle und macht sie, einen nach dem anderen. Ganz genau."
verstecke2d rezept
& verstecke2d schuessel
sprecher@6-9,10+ "Die Menschen, die Programme schreiben, heißen Programmierer."
sprecher@10+ "Programme werden in Programmiersprachen geschrieben. Bekannte sind zum Beispiel Python, Java oder Scratch für Kinder."
warte 1.5
verstecke2d pc
kapitel "2. Früher und heute" 3
hintergrund tafel in 2
sprecher "Computer gab es nicht schon immer."
symbol2d finger "🖐️" bei -22 0 groesse 8
& symbol2d steine "🪨" bei 0 0 groesse 8
& symbol2d abakus "🧮" bei 22 0 groesse 8
sprecher "Vor langer Zeit haben die Menschen mit den Fingern gerechnet. Oder mit Steinen und Holzperlen."
sprecher "Das ging aber nur langsam."
warte 1
verstecke2d finger
& verstecke2d steine
& verstecke2d abakus
geraet2d alt bei 0 -2 groesse 26 art pc zeigt code
& ton plopp
sprecher "Vor ungefähr achtzig Jahren haben Menschen die ersten Computer gebaut."
symbol2d elefant "🐘" bei 30 -2 groesse 8
sprecher "Die waren riesengroß. So groß wie ein ganzes Zimmer! Und schwer wie ein Elefant."
verstecke2d elefant
sprecher@6-9,10+ "Sie brauchten so viel Strom wie ein kleines Dorf. Und trotzdem konnten sie viel weniger als ein Handy heute."
sprecher "Mit den Jahren wurden die Computer immer kleiner. Und immer schneller."
verstecke2d alt
geraet2d pc2 bei -24 -6 groesse 18 art pc
& ton plopp
sprecher "Dann kamen Computer, die auf einen Schreibtisch passen."
geraet2d lap2 bei 4 -6 groesse 13 art laptop
& ton plopp
sprecher "Dann Laptops, die man zuklappen und mitnehmen kann."
geraet2d hand2 bei 30 -2 groesse 10 art handy
& ton plopp
sprecher "Und heute passt ein Computer sogar in deine Hosentasche!"
symbol2d telefon "☎️" bei 30 12 groesse 6
sprecher "Früher hatten Telefone ein Kabel und standen zu Hause im Flur. Mit einem Handy kann man fast überall telefonieren."
verstecke2d telefon
sprecher@10+ "Handys mit großem Bildschirm zum Tippen, so wie wir sie heute kennen, gibt es erst seit ungefähr zwanzig Jahren."
warte 1.5
verstecke2d pc2
& verstecke2d lap2
& verstecke2d hand2
hintergrund zimmer in 2
kapitel "3. Handy, iPad, Laptop und PC" 3
geraet2d vh bei -33 -2 groesse 10 art handy
& geraet2d vt bei -12 0 groesse 15 art tablet
& geraet2d vl bei 12 -6 groesse 12 art laptop
& geraet2d vp bei 34 -5 groesse 14 art pc
& ton plopp
sprecher "Alle vier sind Computer. Aber was ist eigentlich der Unterschied?"
sprecher "Das Handy ist der kleinste. Es passt in die Hosentasche. Und man kann damit telefonieren."
& text2d "Handy" an vh 6
sprecher "Ein Tablet ist wie ein großes Handy. Der Bildschirm ist größer. Darauf kann man gut malen, lesen und Filme schauen."
& text2d "Tablet" an vt 6
sprecher "Ein iPad ist ein Tablet von einer bestimmten Firma. Es gibt auch viele andere Tablets."
sprecher "Ein Laptop kann man aufklappen. Er hat eine Tastatur. Damit kann man gut schreiben und arbeiten."
& text2d "Laptop" an vl 6
sprecher "Und der PC steht fest auf dem Schreibtisch. Er ist oft der stärkste von allen."
& text2d "PC" an vp 6
sprecher "Weil er nicht in eine Tasche passen muss, ist darin Platz für große, schnelle Teile."
sprecher@6-9,10+ "Mit einem starken PC kann man zum Beispiel große Spiele spielen oder Filme schneiden."
sprecher@10+ "PC ist die Abkürzung für Personal Computer. Das heißt: ein Computer für eine einzelne Person."
sprecher "Groß oder klein: Innen funktionieren alle vier fast gleich. Das schauen wir uns jetzt an."
warte 1.5
verstecke2d vh
& verstecke2d vt
& verstecke2d vl
& verstecke2d vp
kapitel "4. Was ist da drin?" 3
geraet2d handy2 bei -24 0 groesse 22 art handy
& ton plopp
sprecher "Jetzt schauen wir einmal in ein Handy hinein."
sprecher "Aber nur im Film! Bitte schraube nie selbst ein Handy auf."
warte 1
bauteil2d platine bei 10 0 groesse 14 art platine
& ton magie
sprecher "Innen drin ist eine grüne Platte voller feiner Linien. Sie heißt Platine."
sprecher "Die feinen Linien sind wie kleine Straßen. Darauf fließt Strom von einem Teil zum anderen."
warte 1
verstecke2d platine
bauteil2d chip bei 10 4 groesse 9 art chip
& ton plopp
& text2d "Prozessor" an chip 5
sprecher "Das hier ist der wichtigste Teil. Der Prozessor."
sprecher "Er ist das Gehirn vom Handy. Er rechnet und rechnet, die ganze Zeit."
sprecher@6-9,10+ "Im Prozessor stecken Milliarden winzige Schalter. Sie heißen Transistoren."
sprecher@10+ "Die kleinsten Transistoren sind nur wenige Nanometer groß. Viel kleiner als ein Virus."
warte 1
verstecke2d chip
bauteil2d ram bei 10 4 groesse 10 art speicher
& ton plopp
& text2d "Speicher" an ram 5
sprecher "Das hier ist der Speicher."
sprecher "Im Speicher merkt sich das Handy alles. Deine Fotos, deine Spiele und deine Lieder."
sprecher "Er ist wie ein riesiger Schrank mit ganz vielen kleinen Schubladen."
sprecher@6-9,10+ "Es gibt zwei Arten von Speicher. Der Arbeitsspeicher ist wie ein Notizzettel für gerade jetzt."
sprecher@6-9,10+ "Und der große Speicher behält alles, auch wenn das Handy aus ist."
warte 1
verstecke2d ram
bauteil2d kam bei 4 6 groesse 7 art kamera
& bauteil2d laut bei 18 6 groesse 7 art lautsprecher
& ton plopp
sprecher "Dann gibt es noch eine Kamera. Das ist das Auge vom Handy."
sprecher "Und einen Lautsprecher. Das ist der Mund vom Handy."
symbol2d mikro "🎤" bei 30 6 groesse 6
sprecher "Und ein Mikrofon. Das ist das Ohr vom Handy."
warte 1
verstecke2d kam
& verstecke2d laut
& verstecke2d mikro
akku2d akku bei 10 2 groesse 14 wert 80
& ton plopp
sprecher "Und ganz wichtig: der Akku."
sprecher "Im Akku ist Strom gespeichert. Ohne Strom funktioniert gar nichts."
sprecher "Der Akku ist wie der Magen vom Handy. Er muss immer wieder gefüttert werden."
& ton mampf
warte 1.5
verstecke2d akku
& verstecke2d handy2
kapitel "5. Warum wird ein Handy warm?" 3
geraet2d hw bei -14 0 groesse 18 art handy zeigt spiel
& thermometer2d tw bei 18 -3 groesse 14 wert 25
& ton plopp
sprecher "Hast du schon mal gemerkt, dass ein Handy beim Spielen warm wird?"
temperatur2d tw auf 40 in 4
sprecher "Der Prozessor arbeitet ganz fleißig. Und wo Strom arbeitet, entsteht Wärme."
sprecher "So ähnlich wie bei dir. Wenn du ganz schnell rennst, wird dir auch warm."
sprecher "Ein großer Computer hat deshalb einen Lüfter. Das ist ein kleiner Ventilator. Er pustet die warme Luft heraus."
& ton wind
sprecher "Ein Handy hat keinen Lüfter. Darum wird es manchmal langsamer, wenn es zu heiß ist. So schützt es sich selbst."
sprecher@6-9,10+ "Leg ein warmes Handy darum nie unter dein Kopfkissen. Dort kann es seine Wärme nicht loswerden."
temperatur2d tw auf 25 in 4
sprecher "Wenn das Handy eine Pause macht, kühlt es wieder ab."
warte 1.5
verstecke2d hw
& verstecke2d tw
kapitel "6. Wie sagt man dem Computer etwas?" 3
geraet2d lap3 bei 0 -4 groesse 18 art laptop zeigt nachricht
& ton plopp
sprecher "Ein Computer muss wissen, was du von ihm willst. Aber wie sagst du es ihm?"
warte 1
& text2d "Tastatur" an lap3 5
sprecher "Bei einem Laptop gibt es eine Tastatur. Darauf sind ganz viele Tasten mit Buchstaben und Zahlen."
sprecher "Wenn du eine Taste drückst, schließt sich darunter ein kleiner Stromkreis."
sprecher "Und der Computer weiß: Aha, das war der Buchstabe A!"
& ton plopp
symbol2d maus "🖱️" bei 24 -8 groesse 6
sprecher "Es gibt auch eine Maus. Natürlich keine echte Maus!"
sprecher "Die Computermaus schiebst du über den Tisch. Und ein kleiner Pfeil auf dem Bildschirm bewegt sich mit."
sprecher@6-9,10+ "Unten in der Maus ist ein kleines Licht und eine winzige Kamera. Sie fotografiert ganz schnell den Tisch und merkt so, wohin du sie schiebst."
verstecke2d lap3
& verstecke2d maus
geraet2d tab4 bei 0 0 groesse 22 art tablet zeigt apps
& ton plopp
sprecher "Bei Handy und Tablet ist es noch einfacher. Da tippst du einfach mit dem Finger auf das Glas."
sprecher "Du kannst tippen, wischen und mit zwei Fingern das Bild größer machen."
sprecher "Und manche Geräte verstehen sogar, was du sagst. Dazu später mehr!"
sprecher "Tastatur, Maus, Finger und Stimme. So sagen wir dem Computer, was er tun soll."
warte 1.5
verstecke2d tab4
kapitel "7. Nullen und Einsen" 3
hintergrund tafel in 2
sprecher "Jetzt kommt das größte Geheimnis aller Computer."
sprecher "Ein Computer kennt nur zwei Sachen."
symbol2d birne "💡" bei 22 0 groesse 8
sprecher "Strom an. Und Strom aus."
bits2d einbit bei 0 4 groesse 8 wert 1
& ton plopp
sprecher "Wie ein Lichtschalter. An ist eine Eins."
bits2d nullbit bei 0 -8 groesse 8 wert 0
& ton plopp
sprecher "Und aus ist eine Null."
verstecke2d birne
sprecher "Mehr kann ein Computer nicht. Nur Nullen und Einsen."
sprecher@6-9,10+ "So eine einzelne Null oder Eins heißt Bit."
warte 1
verstecke2d einbit
& verstecke2d nullbit
bits2d acht bei 0 0 groesse 5 wert 01000001
& ton magie
sprecher "Aber wenn man ganz viele Nullen und Einsen zusammensetzt, kann man alles damit ausdrücken."
sprecher "Buchstaben, Zahlen, Farben, Töne und Bilder."
sprecher "Diese acht Lämpchen hier bedeuten zum Beispiel den Buchstaben A."
& text "01000001 = A" 5 oben farbe gelb
sprecher@6-9,10+ "Acht Bits zusammen nennt man ein Byte."
sprecher@10+ "Ein Gigabyte sind ungefähr eine Milliarde Bytes, also acht Milliarden einzelne Bits."
warte 1
verstecke2d acht
bits2d viele bei 0 4 groesse 3 wert 0101101001011010 laufen
& bits2d viele2 bei 0 -4 groesse 3 wert 1010010110100101 laufen
& ton magie
sprecher "Im Computer blinken die ganze Zeit Milliarden solcher Lämpchen an und aus."
sprecher "Natürlich sind es keine richtigen Lampen. Es sind winzige Schalter für Strom."
sprecher "Und weil sie so unglaublich schnell schalten, kann der Computer so viele tolle Sachen machen."
warte 1.5
verstecke2d viele
& verstecke2d viele2
hintergrund zimmer in 2
kapitel "8. Der Bildschirm" 3
geraet2d tab2 bei 0 0 groesse 26 art tablet zeigt foto
& ton plopp
sprecher "Schau dir einen Bildschirm einmal ganz, ganz genau an."
sprecher "Mit einer Lupe würdest du etwas Erstaunliches sehen."
verstecke2d tab2
pixel2d px bei 0 2 groesse 24
& ton magie
sprecher "Das Bild besteht aus winzig kleinen Quadraten. Sie heißen Pixel."
sprecher "Jedes Pixel kann in einer anderen Farbe leuchten."
sprecher "Zusammen ergeben sie das ganze Bild. Hier zum Beispiel ein lachendes Gesicht."
sprecher@6-9,10+ "Ein Handy-Bildschirm hat Millionen solcher Pixel."
warte 1
verstecke2d px
pixel2d pxnah bei 0 2 groesse 24 nah
& ton magie
sprecher "Und jetzt noch näher. Jedes Pixel hat drei kleine Lämpchen."
sprecher "Ein rotes, ein grünes und ein blaues."
sprecher "Aus Rot, Grün und Blau kann man alle Farben mischen."
sprecher "Rot und Grün zusammen ergeben zum Beispiel Gelb. Und alle drei zusammen ergeben Weiß!"
sprecher@10+ "Das nennt man additive Farbmischung. Jedes Lämpchen kann in vielen Helligkeitsstufen leuchten, meist in zweihundertsechsundfünfzig."
warte 1.5
verstecke2d pxnah
geraet2d tab3 bei 0 0 groesse 26 art tablet zeigt apps
sprecher "Und wie merkt das Tablet, wenn du mit dem Finger tippst?"
warte 1.5
kreis 50 45 radius 7 farbe gelb "Tipp!" fuer 3
& ton plopp
sprecher "Unter dem Glas ist ein unsichtbares Gitter aus feinen Drähten. Darin fließt ein winziger Strom."
sprecher "Dein Finger kann auch ein kleines bisschen Strom leiten."
sprecher "Wenn du das Glas berührst, verändert sich der Strom genau an dieser Stelle."
sprecher "Und der Computer weiß sofort: Hier hat jemand getippt!"
sprecher@6-9,10+ "Darum funktioniert ein Touchscreen nicht mit dicken Handschuhen. Die leiten den Strom nicht."
sprecher@10+ "Diese Technik heißt kapazitiver Touchscreen. Er misst winzige Veränderungen der elektrischen Ladung."
warte 1.5
verstecke2d tab3
kapitel "9. Woher weiß das Tablet, wo oben ist?" 3
geraet2d td bei 0 0 groesse 22 art tablet zeigt foto
& ton plopp
sprecher "Hast du schon mal ein Tablet gedreht? Dann dreht sich das Bild mit. Wie macht es das?"
kippe2d td auf 90 in 1.5
& ton schwung
sprecher "Im Tablet steckt ein winziger Bewegungsfühler. Er spürt, wohin es nach unten geht."
sprecher "Das ist ein bisschen wie bei dir. Auch wenn du die Augen zumachst, weißt du, wo oben und unten ist."
kippe2d td auf 0 in 1.5
sprecher "Der Fühler merkt auch, wenn du das Tablet schüttelst oder kippst."
sprecher "Darum kann man manche Spiele steuern, indem man das Gerät hin und her kippt. Wie ein Lenkrad!"
sprecher@6-9,10+ "Ein Schrittzähler im Handy benutzt den gleichen Fühler. Er spürt jeden deiner Schritte."
sprecher@10+ "Dieser Sensor heißt Beschleunigungssensor. Dazu kommt oft ein Kreiselsensor, der Drehungen misst."
warte 1.5
verstecke2d td
kapitel "10. Wie bewegt sich ein Video?" 3
sprecher "Auf dem Bildschirm kann man auch Videos anschauen. Da bewegt sich alles."
sprecher "Aber weißt du was? In einem Video bewegt sich eigentlich gar nichts."
kind2d k5 bei -24 -11 groesse 12
& ton plopp
sprecher "Ein Video besteht aus ganz vielen Bildern. Eins nach dem anderen."
text "Bild 1" 1.5 oben farbe gelb
warte 1.5
bewege2d k5 zu -12 -11 in 0.1
& text "Bild 2" 1.5 oben farbe gelb
warte 1.5
bewege2d k5 zu 0 -11 in 0.1
& text "Bild 3" 1.5 oben farbe gelb
warte 1.5
sprecher "Auf jedem Bild steht das Kind ein kleines Stück weiter rechts."
bewege2d k5 zu 24 -11 in 2
& ton schwung
sprecher "Wenn die Bilder ganz schnell hintereinander kommen, sieht es so aus, als ob das Kind läuft."
sprecher "Das ist wie bei einem Daumenkino. Kennst du das? Man blättert ganz schnell durch ein kleines Heft."
sprecher "Ein Video zeigt ungefähr dreißig Bilder in einer einzigen Sekunde."
sprecher "Das ist so schnell, dass unsere Augen die einzelnen Bilder nicht mehr sehen. Wir sehen nur eine Bewegung."
sprecher@6-9,10+ "Auch Zeichentrickfilme funktionieren so. Früher hat man jedes einzelne Bild mit der Hand gemalt."
sprecher@10+ "Bei Spielen sind es oft sechzig Bilder pro Sekunde oder mehr. Dann sieht alles besonders flüssig aus."
warte 1.5
verstecke2d k5
kapitel "11. Töne und Musik" 3
geraet2d hm bei -24 0 groesse 18 art handy zeigt video
& bauteil2d ls bei 10 0 groesse 10 art lautsprecher
& ton plopp
sprecher "Aus dem Handy kann auch Musik kommen. Wie geht das eigentlich?"
sprecher "Leg mal deine Hand an deinen Hals und sag laut: Aaah."
warte 2.5
sprecher "Spürst du das Kribbeln? Dein Hals zittert ganz schnell hin und her."
sprecher "Das Zittern bringt die Luft zum Zittern. Und die zitternde Luft fliegt in dein Ohr. So hörst du einen Ton."
wellen2d von ls nach 38 0 in 5
& ton glocke
sprecher "Im Lautsprecher ist eine dünne Platte. Sie zittert ganz schnell, so wie dein Hals."
sprecher "Der Computer sagt der Platte ganz genau, wie sie zittern soll. Mit Nullen und Einsen."
sprecher "Schnelles Zittern klingt hoch. Langsames Zittern klingt tief."
sprecher "Beim Mikrofon ist es genau umgekehrt. Deine Stimme bringt eine kleine Platte zum Zittern. Und das Handy macht daraus Nullen und Einsen."
sprecher@6-9,10+ "So kann das Handy Sprachnachrichten aufnehmen und Lieder speichern."
sprecher@10+ "Ein Lied wird dafür viele tausend Mal pro Sekunde gemessen. Bei Musik meist über vierzigtausend Mal."
warte 1.5
verstecke2d hm
& verstecke2d ls
kapitel "12. Wie funktioniert Telefonieren?" 3
hintergrund erde in 2
kind2d tk bei -34 -11 groesse 12
& kind2d oma bei 34 -11 groesse 13 farbe lila
& geraet2d h1 bei -24 0 groesse 11 art handy zeigt anruf
& geraet2d h2 bei 24 0 groesse 11 art handy zeigt anruf
& mast2d m1 bei 0 -11 groesse 26
& ton plopp
sprecher "Jetzt telefoniert ein Kind mit seiner Oma. Die Oma wohnt weit weg."
& text2d "Oma" an oma 5
sprecher "Aber zwischen den beiden Handys ist doch gar kein Kabel. Wie kommt die Stimme zur Oma?"
warte 1.5
sprecher "Zuerst hört das Mikrofon deine Stimme."
sprecher "Der Computer im Handy macht daraus Nullen und Einsen."
wellen2d von h1 nach m1 in 12
& ton magie
sprecher "Dann schickt das Handy die Nullen und Einsen als unsichtbare Funkwellen los."
sprecher "Funkwellen sind so ähnlich wie Licht. Nur kann man sie nicht sehen."
sprecher "Die Wellen fliegen zum nächsten Funkmast. Den siehst du manchmal auf Dächern oder Hügeln."
& text2d "Funkmast" an m1 5
sprecher@6-9,10+ "Funkwellen sind unglaublich schnell. So schnell wie Licht: dreihunderttausend Kilometer in einer Sekunde."
wellen2d von m1 nach h2 in 10
sprecher "Der Funkmast schickt deine Stimme weiter. Durch Kabel und andere Funkmasten. Bis zum Handy von der Oma."
sprecher "Das Handy von der Oma macht aus den Nullen und Einsen wieder deine Stimme."
sprecher "Und die Oma hört: Hallo Oma!"
& ton glocke
sprecher "Und das alles passiert in einem kleinen Augenblick."
sprecher@10+ "Damit das Netz weiß, welches Handy gemeint ist, hat jedes Handy eine eigene Nummer und eine SIM-Karte."
warte 1.5
verstecke2d h1
& verstecke2d h2
& verstecke2d m1
& verstecke2d tk
& verstecke2d oma
kapitel "13. Eine Nachricht schreiben" 3
geraet2d n1 bei -26 -2 groesse 14 art handy zeigt nachricht
& geraet2d n2 bei 26 -2 groesse 14 art handy zeigt apps
& ton plopp
sprecher "Mit dem Handy kann man auch Nachrichten schreiben. Zum Beispiel an deine Freundin oder deinen Freund."
sprecher "Du tippst Buchstaben. Und vielleicht noch ein lachendes Gesicht."
sprecher "Jeder Buchstabe wird zu Nullen und Einsen. Weißt du noch, wie das geht?"
daten2d paeckchen von n1 nach n2 in 8
& ton schwung
sprecher "Dann tippst du auf Senden. Und die Nachricht fliegt los."
sprecher "Über Funkwellen, Funkmasten und das Internet. Bis zum anderen Handy."
bildschirm2d n2 zeigt nachricht
& ton glocke
sprecher "Pling! Die Nachricht ist angekommen. Und das hat nur eine Sekunde gedauert."
sprecher "Früher hat man Briefe geschrieben. Die waren manchmal mehrere Tage unterwegs."
sprecher "Man kann auch Fotos, Videos und Sprachnachrichten verschicken."
sprecher "Aber denk daran: Schick nur nette Nachrichten. Auf der anderen Seite sitzt ein echter Mensch mit Gefühlen."
sprecher@10+ "Viele Nachrichten-Programme verschlüsseln die Nachrichten. Dann kann nur der Empfänger sie lesen."
warte 1.5
verstecke2d n1
& verstecke2d n2
kapitel "14. Das Internet" 3
hintergrund weltraum in 2
planet2d erde bei 0 0 groesse 18 art erde
& ton magie
sprecher "Jetzt fliegen wir ins Weltall und schauen auf die Erde."
sprecher "Auf der ganzen Erde gibt es Milliarden Computer, Handys und Tablets."
sprecher "Und fast alle sind miteinander verbunden. Das ist das Internet."
& text "Internet = viele verbundene Computer" 5 oben farbe gelb
sprecher "Das Internet ist wie ein riesiges Spinnennetz um die ganze Welt."
sprecher "Die Fäden sind Kabel und Funkwellen."
sprecher "Sogar auf dem Meeresboden liegen lange Kabel. Von einem Land zum anderen."
sprecher@10+ "In diesen Seekabeln stecken dünne Glasfasern. Die Daten reisen darin als Lichtblitze."
warte 1
hintergrund zimmer in 2
verstecke2d erde
geraet2d lap bei -28 -6 groesse 13 art laptop zeigt internet
& geraet2d server bei 28 -6 groesse 13 art pc zeigt code
& ton plopp
sprecher "Wenn du dir ein Video anschaust, kommt es von einem großen Computer irgendwo auf der Welt."
& text2d "großer Computer" an server 5
sprecher@6-9,10+ "Diese großen Computer heißen Server. Sie stehen in riesigen Hallen, den Rechenzentren."
daten2d paeckchen von server nach lap in 14
& ton schwung
sprecher "Das Video wird in ganz viele kleine Päckchen zerteilt."
sprecher "Die Päckchen reisen durch das Internet zu dir. Wie Briefe mit der Post."
sprecher "Bei dir werden sie wieder richtig zusammengesetzt. Und du siehst das Video."
sprecher@10+ "Jedes Päckchen hat eine Absender- und eine Empfänger-Adresse, die IP-Adresse. So findet es seinen Weg."
warte 1
bauteil2d router0 bei 0 -6 groesse 5 art router
sprecher "Zu Hause kommt das Internet oft über WLAN. Das sind auch Funkwellen."
sprecher "Ein kleines Kästchen, der Router, schickt sie durch die Wohnung."
warte 1.5
verstecke2d lap
& verstecke2d server
& verstecke2d router0
kapitel "15. Unsichtbare Verbindungen" 3
geraet2d w1 bei -26 -4 groesse 14 art laptop zeigt internet
& bauteil2d router bei 2 -4 groesse 6 art router
& geraet2d w2 bei 28 -2 groesse 12 art tablet zeigt video
& ton plopp
sprecher "In vielen Wohnungen steht ein kleines Kästchen mit Lämpchen. Das ist der Router."
& text2d "Router" an router 5
wellen2d von router nach w1 in 14
& wellen2d von router nach w2 in 14
sprecher "Der Router schickt Funkwellen durch die ganze Wohnung. Das ist das WLAN."
sprecher "So bekommen Laptop, Tablet und Handy das Internet. Ganz ohne Kabel."
sprecher "Wenn du zu weit weggehst, zum Beispiel in den Garten, wird das WLAN schwächer."
sprecher "Dicke Wände schlucken nämlich einen Teil der Funkwellen."
warte 1
verstecke2d w1
& verstecke2d router
& verstecke2d w2
geraet2d bh bei -20 0 groesse 16 art handy zeigt video
& symbol2d kopfh "🎧" bei 18 0 groesse 8
& ton plopp
sprecher "Und dann gibt es noch Bluetooth."
wellen2d von bh nach kopfh in 12
sprecher "Das ist auch Funk. Aber nur für ganz kurze Strecken. Ein paar Schritte weit."
sprecher "Damit spielt das Handy Musik auf einem Lautsprecher. Oder in Kopfhörern ohne Kabel."
sprecher@6-9,10+ "Bluetooth heißt übersetzt Blauzahn. Es ist nach einem alten König aus Dänemark benannt."
sprecher@10+ "WLAN, Bluetooth und Mobilfunk benutzen alle Funkwellen, aber mit verschiedenen Frequenzen. So stören sie sich nicht."
warte 1.5
verstecke2d bh
& verstecke2d kopfh
kapitel "16. Wo bin ich? Das Navi" 3
hintergrund weltraum in 2
planet2d erde2 bei 0 -4 groesse 10 art erde
& stern2d sat1 bei -30 14 groesse 1.5 farbe weiss
& stern2d sat2 bei 0 18 groesse 1.5 farbe weiss
& stern2d sat3 bei 30 14 groesse 1.5 farbe weiss
& ton magie
sprecher "Wenn Mama oder Papa in eine fremde Stadt fahren, zeigt das Handy oft den Weg."
sprecher "Aber woher weiß das Handy, wo es gerade ist?"
warte 1
& text2d "Satellit" an sat2 5
sprecher "Hoch über der Erde, im Weltall, fliegen Satelliten. Das sind Maschinen, die um die Erde kreisen."
wellen2d von sat1 nach erde2 in 14
& wellen2d von sat2 nach erde2 in 14
& wellen2d von sat3 nach erde2 in 14
sprecher "Die Satelliten schicken die ganze Zeit Funksignale zur Erde. Darin steht: Hier bin ich, und so spät ist es gerade."
sprecher "Das Handy hört die Signale von mehreren Satelliten gleichzeitig."
sprecher "Es rechnet aus, wie weit es von jedem Satelliten weg ist. Und daraus weiß es genau, wo es ist."
sprecher@6-9,10+ "Das klappt auf wenige Meter genau. Dieses System heißt GPS."
sprecher@10+ "Die Satelliten haben sehr genaue Atomuhren an Bord. Aus der Laufzeit der Funksignale berechnet das Handy die Entfernungen."
symbol2d karte "🗺️" bei 0 2 groesse 14
& symbol2d punkt "📍" bei 3 5 groesse 6
& verstecke2d erde2
sprecher "Dann zeigt das Handy eine Karte mit einem kleinen Punkt. Der Punkt, das bist du!"
warte 1.5
verstecke2d karte
& verstecke2d punkt
& verstecke2d sat1
& verstecke2d sat2
& verstecke2d sat3
hintergrund zimmer in 2
kapitel "17. Kamera und Fotos" 3
geraet2d hk bei -18 0 groesse 18 art handy zeigt foto
& baum2d baum bei 22 -11 groesse 18 farbe gruen
& stern2d sonne bei 36 16 groesse 3 farbe gelb
sprecher "Wie macht ein Handy eigentlich ein Foto?"
warte 1
licht2d von sonne zu baum anzahl 3 faecher 4
licht2d von 20 0 zu hk anzahl 5 faecher 6
& ton magie
sprecher "Licht fällt auf den Baum. Und vom Baum fliegt Licht in die Kamera."
sprecher "In der Kamera ist ein kleiner Chip mit Millionen winzigen Lichtfängern."
sprecher "Jeder Lichtfänger misst, wie hell und welche Farbe das Licht ist."
sprecher "Daraus wird wieder ein Bild aus Pixeln. Klick! Das Foto ist fertig."
& ton plopp
sprecher "Und das Foto wird als Nullen und Einsen im Speicher aufbewahrt."
sprecher@10+ "Der Bildsensor einer Handykamera hat oft zwölf bis fünfzig Millionen Pixel, also zwölf bis fünfzig Megapixel."
warte 1.5
verstecke2d hk
& verstecke2d baum
& verstecke2d sonne
kapitel "18. Der Akku" 3
akku2d akku2 bei 0 0 groesse 20 wert 15
& ton schreck
sprecher "Oh, oh. Der Akku ist fast leer!"
sprecher "Wenn das Handy viel arbeitet, braucht es viel Strom. Dann wird der Akku leer."
sprecher "Videos und Spiele brauchen besonders viel Strom."
symbol2d stecker "🔌" bei -18 0 groesse 7
sprecher "Dann muss das Handy an das Ladekabel."
temperatur2d akku2 auf 100 in 6
& ton magie
sprecher "Beim Laden fließt Strom aus der Steckdose in den Akku. Und der Akku füllt sich wieder auf."
sprecher "Fertig! Hundert Prozent. Das Handy ist wieder satt."
& ton tada
sprecher@6-9,10+ "Akkus mögen keine große Hitze und keine Kälte. Lass ein Handy also nie in der prallen Sonne liegen."
sprecher@10+ "In den meisten Handys stecken Lithium-Ionen-Akkus. Beim Laden wandern winzige Teilchen von einer Seite zur anderen."
warte 1.5
verstecke2d akku2
& verstecke2d stecker
kapitel "19. Wo sind meine Fotos?" 3
geraet2d hc bei -26 -2 groesse 14 art handy zeigt foto
& wolke2d cloud bei 0 12 groesse 8
& geraet2d srv bei 26 -6 groesse 13 art pc zeigt code
& ton plopp
sprecher "Vielleicht hast du schon mal gehört: Das Foto ist in der Cloud."
sprecher "Cloud ist Englisch und heißt Wolke. Aber die Fotos sind natürlich nicht in einer echten Wolke!"
daten2d paeckchen von hc nach srv in 5
& ton schwung
sprecher "Die Fotos reisen durch das Internet zu großen Computern. Dort werden sie aufbewahrt."
sprecher "Das ist wie ein Schließfach. Du kannst deine Fotos von überall wieder abholen."
daten2d paeckchen von srv nach hc in 4
sprecher "Auch wenn das Handy kaputt geht oder verloren ist, sind die Fotos noch da."
sprecher@6-9,10+ "Die großen Computer stehen in Rechenzentren. Dort laufen Tausende Computer Tag und Nacht. Sie werden mit Lüftern und Wasser gekühlt."
sprecher@10+ "Weil Rechenzentren viel Strom brauchen, bauen manche Firmen sie in die Nähe von Wind- oder Sonnenkraftwerken."
warte 1.5
verstecke2d hc
& verstecke2d cloud
& verstecke2d srv
kapitel "20. Apps und Spiele" 3
geraet2d ha bei -20 0 groesse 20 art handy zeigt apps
& ton plopp
sprecher "Auf einem Handy sind ganz viele bunte Bildchen. Das sind Apps."
sprecher "Eine App ist ein Programm. Jede App kann etwas anderes."
sprecher "Eine App macht Fotos. Eine spielt Musik. Eine zeigt das Wetter. Und eine ist ein Spiel."
bildschirm2d ha zeigt spiel
& ton level
geraet2d lc bei 22 -6 groesse 13 art laptop zeigt code
& ton plopp
sprecher "Jemand hat jede App programmiert. Mit ganz vielen Befehlen."
sprecher "Bei einem Spiel steht zum Beispiel drin: Wenn der Finger tippt, dann springt die Figur."
sprecher "Und wenn die Figur einen Stern berührt, dann gibt es einen Punkt."
& ton muenze
sprecher "So entsteht aus vielen kleinen Befehlen ein ganzes Spiel."
sprecher@6-9,10+ "Programmieren kann man übrigens schon als Kind lernen. Zum Beispiel mit bunten Bausteinen auf dem Computer."
warte 1.5
verstecke2d ha
& verstecke2d lc
kapitel "21. Ein Handy, das zuhört" 3
kind2d k7 bei -16 -11 groesse 12
& geraet2d hs bei 16 -2 groesse 14 art handy zeigt apps
& ton plopp
sprecher "Manche Handys und Lautsprecher kann man einfach fragen. Zum Beispiel: Wie wird das Wetter morgen?"
wellen2d von k7 nach hs in 4
sprecher "Das Mikrofon hört deine Stimme. Und der Computer macht daraus wieder Nullen und Einsen."
sprecher "Dann sucht ein besonderes Programm heraus, welche Wörter du gesagt hast."
sprecher "Dieses Programm hat vorher ganz, ganz viele Stimmen angehört. So hat es gelernt, wie Wörter klingen."
bildschirm2d hs zeigt nachricht
& ton glocke
sprecher "Dann sucht das Handy die Antwort. Und eine Computerstimme liest sie dir vor."
sprecher "Solche lernenden Programme nennt man künstliche Intelligenz."
sprecher "Aber auch eine künstliche Intelligenz denkt nicht wie ein Mensch. Und sie macht manchmal Fehler."
sprecher "Darum ist es wichtig, selbst nachzudenken. Und Erwachsene zu fragen."
sprecher@10+ "Künstliche Intelligenz erkennt Muster in riesigen Datenmengen. Sie berechnet, welche Antwort am wahrscheinlichsten passt."
warte 1.5
verstecke2d k7
& verstecke2d hs
kapitel "22. Woraus ist ein Handy gemacht?" 3
hintergrund erde in 2
geraet2d hr bei 0 0 groesse 18 art handy
& ton plopp
sprecher "Woraus besteht eigentlich so ein Handy?"
sprecher "Aus Glas, aus Plastik und aus vielen verschiedenen Metallen."
symbol2d gold "🪙" bei 18 4 groesse 6
& ton muenze
sprecher "Sogar ein winziges bisschen Gold steckt in jedem Handy!"
verstecke2d gold
symbol2d mine "⛏️" bei -20 -4 groesse 7
sprecher "Die Metalle werden tief aus der Erde geholt. Das ist schwere Arbeit und schadet oft der Natur."
sprecher "Darum ist es gut, ein Handy lange zu benutzen. Mit einer Schutzhülle geht es nicht so schnell kaputt."
verstecke2d mine
symbol2d muell "🗑️" bei 20 -2 groesse 8
& symbol2d nein "❌" bei 20 -2 groesse 11
sprecher "Und ein altes Handy gehört nicht in den Mülleimer!"
verstecke2d muell
& verstecke2d nein
symbol2d recycling "♻️" bei 20 0 groesse 9
sprecher "Man bringt es zu einer Sammelstelle. Dort holt man die wertvollen Stoffe wieder heraus. Das nennt man Recycling."
sprecher "Aus dem alten Handy wird dann vielleicht ein Stück von einem neuen Handy."
sprecher@6-9,10+ "Ein Akku darf nie in den Hausmüll. Er kann sonst sogar Feuer fangen."
sprecher@10+ "In Handys stecken auch seltene Metalle wie Kobalt oder Lithium. Recycling hilft, diese Rohstoffe zu sparen."
warte 1.5
verstecke2d hr
& verstecke2d recycling
hintergrund zimmer in 2
kapitel "23. Können Computer krank werden?" 3
geraet2d cv bei -14 -4 groesse 16 art laptop zeigt internet
& ton plopp
sprecher "Hast du schon mal gehört, dass ein Computer einen Virus hat?"
sprecher "Ein Computer kann nicht niesen und bekommt auch kein Fieber."
virus2d cvv bei 16 4 groesse 3 farbe lila
& ton schreck
sprecher "Aber es gibt böse Programme. Sie heißen Computerviren."
sprecher "Jemand hat sie extra geschrieben, um Ärger zu machen."
bewege2d cvv zu -14 0 in 3
sprecher "So ein Programm schleicht sich heimlich in den Computer. Zum Beispiel, wenn man auf einen falschen Link klickt."
bildschirm2d cv zeigt aus
sprecher "Dann kann es Sachen kaputt machen. Oder Geheimnisse stehlen."
warte 1
abwehr2d schutz bei 16 0 groesse 4
& ton glocke
sprecher "Aber auch Computer haben eine Abwehr-Polizei. Ein Schutzprogramm."
bewege2d schutz zu -10 0 in 2
sprecher "Das Schutzprogramm sucht nach bösen Programmen und sperrt sie ein."
verstecke2d cvv
& ton tada
bildschirm2d cv zeigt internet
sprecher "Darum: Klick nie einfach auf unbekannte Sachen. Und lade nur Apps mit Mama oder Papa herunter."
sprecher@6-9,10+ "Wichtig sind auch Updates. Damit bekommt der Computer neue Schutzschilde gegen neue Tricks."
sprecher@10+ "Viele Angriffe beginnen mit gefälschten Nachrichten, die echt aussehen. Man nennt das Phishing."
warte 1.5
verstecke2d cv
& verstecke2d schutz
kapitel "24. Überall stecken Computer" 3
hintergrund erde in 2
kind2d ku bei -26 -11 groesse 12
& ton plopp
sprecher "Jetzt verrate ich dir noch etwas. Computer gibt es nicht nur in Handys und Laptops."
sprecher "Kleine Computer stecken fast überall. Man sieht sie nur nicht."
symbol2d auto "🚗" bei 0 -4 groesse 9
sprecher "In einem Auto stecken viele kleine Computer. Sie helfen beim Bremsen und zeigen, wie schnell man fährt."
verstecke2d auto
symbol2d wasch "🧺" bei 0 -4 groesse 9
sprecher "In der Waschmaschine sagt ein kleiner Computer, wie lange gewaschen wird. Und wie warm das Wasser sein soll."
verstecke2d wasch
symbol2d ampel "🚦" bei -6 -2 groesse 7
sprecher "In der Ampel. Im Fernseher. In der Spielkonsole. Und sogar in manchen Spielzeugen."
& symbol2d tv "📺" bei 6 -2 groesse 7
& symbol2d konsole "🎮" bei 18 -2 groesse 7
& symbol2d teddy "🧸" bei 30 -2 groesse 7
verstecke2d ampel
& verstecke2d tv
& verstecke2d konsole
& verstecke2d teddy
bauteil2d uc bei 12 2 groesse 9 art chip
& ton magie
sprecher "Diese kleinen Computer haben keinen Bildschirm und keine Tastatur. Aber auch sie haben einen Prozessor."
sprecher "Und auch sie machen nur genau das, was in ihrem Programm steht."
sprecher@6-9,10+ "Ein modernes Auto hat oft über fünfzig kleine Computer an Bord."
sprecher@10+ "Solche eingebauten Computer nennt man eingebettete Systeme. Sie steuern Maschinen, ohne dass man es merkt."
sprecher "Schau dich zu Hause doch mal um. Wie viele Sachen findest du, in denen ein Computer stecken könnte?"
warte 2
verstecke2d ku
& verstecke2d uc
hintergrund zimmer in 2
kapitel "25. Gut aufpassen!" 3
kind2d kind bei -10 -11 groesse 12
& geraet2d ht bei 12 -2 groesse 12 art tablet zeigt video
sprecher "Handys und Tablets machen viel Spaß. Aber man muss auch gut aufpassen."
warte 1
sprecher "Erstens: Mach Pausen!"
sprecher "Wenn du zu lange auf einen Bildschirm schaust, werden deine Augen müde."
sprecher "Schau zwischendurch aus dem Fenster in die Ferne. Das tut den Augen gut."
bildschirm2d ht zeigt aus
& ton plopp
sprecher "Und spiel lieber draußen. Klettern, rennen und toben ist gut für deinen Körper."
warte 1
symbol2d mond "🌙" bei 30 8 groesse 7
sprecher "Zweitens: Vor dem Schlafen kein Bildschirm. Das helle Licht macht dein Gehirn wieder wach."
sprecher "Dann kannst du schlechter einschlafen."
warte 1
verstecke2d mond
symbol2d schloss "🔒" bei 30 8 groesse 7
sprecher "Drittens: Schreib niemals mit Fremden im Internet. Und gib niemandem deinen Namen oder deine Adresse."
sprecher "Wenn dir etwas komisch vorkommt oder dir Angst macht, sag es sofort einem Erwachsenen."
sprecher@6-9,10+ "Passwörter sind geheim. Verrate sie niemandem, außer deinen Eltern."
sprecher@10+ "Ein gutes Passwort ist lang und nicht leicht zu erraten. Und was einmal im Internet ist, kann man oft nicht mehr löschen."
warte 1
sprecher "Und viertens: Frag immer erst Mama oder Papa, bevor du eine neue App oder ein neues Spiel benutzt."
warte 1.5
verstecke2d kind
& verstecke2d ht
& verstecke2d schloss
hintergrund tafel in 2
tafel@3-5 "Merk dir:" "Handy und Tablet sind Computer." "Innen: Prozessor, Speicher, Akku." "Computer kennen nur 0 und 1." "Pausen machen und Erwachsene fragen!" rechts 20
tafel@6-9 "Merk dir:" "Programme sind Listen von Befehlen." "Prozessor rechnet, Speicher merkt sich alles." "Alles besteht aus Bits: 0 und 1." "Bilder aus Pixeln: Rot, Grün, Blau." "Funkwellen und Internet verbinden alles." rechts 22
tafel@10+ "Merke:" "Computer verarbeiten Bits mit Milliarden Transistoren" "Programme: Befehle in Programmiersprachen" "Pixel: additive Farbmischung aus RGB" "Mobilfunk: Funkwellen und Funkmasten" "Internet: Datenpakete mit Adressen" rechts 22
sprecher "Merk dir: Handys, Tablets und Laptops sind Computer."
sprecher "Sie rechnen ganz schnell mit Nullen und Einsen. Und sie machen genau, was in ihren Programmen steht."
sprecher "Benutz sie klug, mach Pausen und hab viel Spaß damit!"
ton tada
warte 2
sprecher "Tschüss, und bis zum nächsten Mal!"
ausblenden 1.5`,
    },
    viren: {
      name: 'Wie funktionieren Viren und Krankheiten?',
      erkennen: /virus|viren|bakteri|krankheit|krank\b|krank\s+werden|\bkeime|erkaelt|schnupfen|immunsystem|ansteck/,
      kurz: `hintergrund mikro
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Kleine Keime" 3
virus2d v1 bei -20 4 groesse 4
ton plopp
sprecher "Schau mal! Ein ganz kleines Ding. Ein Virus."
sprecher "Es ist so klein, dass du es nicht sehen kannst."
bakterie2d b1 bei 20 4 groesse 4
ton plopp
sprecher "Und das ist eine Bakterie. Sie ist auch ganz klein."
warte 1
sprecher "Manche Keime machen uns krank. Dann haben wir Schnupfen."
hintergrund erde in 2
verstecke2d v1
& verstecke2d b1
kind2d kind bei -10 -11 groesse 12
niesen2d kind rechts
sprecher "Hatschi! Beim Niesen fliegen Keime durch die Luft."
sprecher "Darum niesen wir in den Arm."
warte 1
blasen2d bei -10 -6 anzahl 16 in 5
& ton plopp
sprecher "Und wir waschen die Hände mit Seife. Schrubb, schrubb!"
warte 2
hintergrund mikro in 2
abwehr2d polizei bei 0 2 groesse 6
& verstecke2d kind
ton glocke
sprecher "Dein Körper hat kleine Helfer. Wie eine Polizei."
sprecher "Sie passen auf dich auf. Dann wirst du wieder gesund."
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
      skript: `hintergrund erde
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Viren, Bakterien und Krankheiten" 3.5
kind2d kind bei -6 -11 groesse 12
ton glocke
sprecher "Hallo! Warst du schon mal krank?"
sprecher "Mit Schnupfen, Husten oder Fieber?"
thermometer2d therm bei 20 -3 groesse 14 wert 37
& ton plopp
temperatur2d therm auf 39 in 3
sprecher "Dann fühlt man sich ganz schlapp. Und man möchte nur im Bett liegen."
sprecher "Aber woher kommt das eigentlich? Wer macht uns krank?"
warte 1.5
sprecher "Heute gehen wir auf eine spannende Reise. In eine winzige, unsichtbare Welt."
verstecke2d therm
kamera2d bei -6 -3 zoom 3 in 3
& ton magie
warte 1
hintergrund mikro in 2
verstecke2d kind
kamera2d bei 0 0 zoom 1 in 0.1
kapitel "1. Die winzigen Keime" 2.5
bakterie2d mk1 bei -24 8 groesse 1.4 gut
& bakterie2d mk2 bei 20 -6 groesse 1.4 gut
& virus2d mk3 bei 8 10 groesse 1
& virus2d mk4 bei -10 -8 groesse 1
& ton plopp
sprecher "Überall um uns herum gibt es winzig kleine Dinger. Sie heißen Keime."
symbol2d mikroskop "🔬" bei 0 0 groesse 12
sprecher "Sie sind so klein, dass man sie nur mit einem Mikroskop sehen kann."
sprecher "Ein Mikroskop ist wie eine Super-Lupe. Es macht kleine Dinge riesengroß."
verstecke2d mikroskop
& verstecke2d mk1
& verstecke2d mk2
& verstecke2d mk3
& verstecke2d mk4
warte 1
sprecher "Es gibt zwei wichtige Arten von Keimen. Bakterien und Viren."
bakterie2d bak bei -18 4 groesse 5
& ton plopp
& text2d "Bakterie" an bak 5
sprecher "Das hier ist eine Bakterie."
virus2d vir bei 18 4 groesse 3
& ton plopp
& text2d "Virus" an vir 5
sprecher "Und das hier ist ein Virus."
sprecher "Beide sind unglaublich klein. Aber ein Virus ist noch viel, viel kleiner als eine Bakterie."
sprecher@6-9,10+ "Ungefähr tausend Bakterien nebeneinander sind so breit wie ein Stecknadelkopf."
sprecher@6-9,10+ "Und ein Virus ist meistens etwa hundertmal kleiner als eine Bakterie."
sprecher@10+ "Bakterien sind etwa ein bis fünf Mikrometer groß. Viren meist nur zwanzig bis dreihundert Nanometer. Ein Nanometer ist ein Millionstel Millimeter."
warte 1.5
verstecke2d vir
kamera2d bei -18 4 zoom 1.8 in 2
kapitel "2. Bakterien" 2.5
sprecher "Schauen wir uns zuerst die Bakterie genauer an."
sprecher "Eine Bakterie ist ein winziges Lebewesen. Sie ist lebendig, so wie ein Tier. Nur viel, viel kleiner."
sprecher "Sie kann fressen. Und sie kann schwimmen. Schau, mit ihrem kleinen Schwänzchen!"
bewege2d bak zu -10 6 in 3
sprecher "Und Bakterien können sich vermehren. Das geht so:"
teilen2d bak in 3
& ton magie
sprecher "Sie teilt sich einfach in zwei Hälften. Aus einer Bakterie werden zwei!"
sprecher "Und aus zwei werden vier. Und aus vier werden acht. Ganz schnell werden es ganz viele."
sprecher@6-9,10+ "Manche Bakterien können sich alle zwanzig Minuten teilen."
sprecher@10+ "Aus einer einzigen Bakterie könnten so in zehn Stunden über eine Milliarde werden, wenn genug Futter da ist."
verstecke2d bak
kamera2d bei 0 0 zoom 1 in 2
bakterie2d gut1 bei -22 6 groesse 4 gut
& bakterie2d gut2 bei -10 -4 groesse 3.5 gut
& bakterie2d gut3 bei 4 8 groesse 4 gut
& ton jubel
sprecher "Jetzt kommt eine gute Nachricht: Die meisten Bakterien sind nicht gefährlich."
sprecher "Viele sind sogar unsere Freunde!"
sprecher "In deinem Bauch wohnen ganz viele gute Bakterien. Sie helfen dir, das Essen zu verdauen."
sprecher "Und im Joghurt sind auch gute Bakterien. Lecker!"
sprecher@6-9,10+ "In deinem Körper leben ungefähr so viele Bakterien, wie du Körperzellen hast. Viele Billionen!"
warte 1
bakterie2d boese bei 22 0 groesse 4.5
& ton schreck
sprecher "Aber manche Bakterien machen Ärger. Die können uns krank machen."
sprecher@6-9,10+ "Sie können zum Beispiel eine Mittelohrentzündung oder eine Halsentzündung auslösen."
warte 1.5
verstecke2d gut1
& verstecke2d gut2
& verstecke2d gut3
& verstecke2d boese
kapitel "3. Viren" 2.5
virus2d vir2 bei -30 6 groesse 3.5
& ton plopp
sprecher "Und jetzt zu den Viren. Die sind ganz besonders."
sprecher "Ein Virus ist eigentlich nur eine kleine Hülle. Darin steckt ein Bauplan."
sprecher@6-9,10+ "Der Bauplan heißt Erbgut. Darin steht, wie man neue Viren baut."
sprecher "Ganz allein kann ein Virus nichts machen. Es kann nicht fressen und nicht wachsen."
sprecher "Ein Virus braucht eine Zelle. Sonst kann es sich nicht vermehren."
warte 1
sprecher "Weißt du, was eine Zelle ist?"
warte 1.5
zelle2d zelle bei 14 0 groesse 13
& ton plopp
& text2d "Zelle" an zelle 5
sprecher "Dein ganzer Körper ist aus winzigen Bausteinen gebaut. Sie heißen Zellen."
sprecher "Wie ein Haus aus ganz vielen Legosteinen."
sprecher@6-9,10+ "Ein Mensch besteht aus ungefähr dreißig Billionen Zellen."
warte 1
sprecher "Schau mal genau hin. Das Virus hat Stacheln."
kamera2d bei -8 4 zoom 1.6 in 2
sprecher "Die Stacheln sind wie Schlüssel."
sprecher "Und die Zelle hat kleine Schlösser auf ihrer Haut."
& kreis 60 38 radius 6 farbe gelb "Schloss" fuer 4
sprecher "Wenn ein Schlüssel in das Schloss passt, geht die Tür auf!"
bewege2d vir2 zu 2 4 in 3
& ton schwung
sprecher "Schwupp! Das Virus schlüpft in die Zelle hinein."
verstecke2d vir2
& ton plopp
kamera2d bei 14 0 zoom 1.5 in 2
sprecher "Und jetzt macht das Virus einen frechen Trick."
sprecher "Es benutzt die Zelle wie eine Kopiermaschine."
vermehren2d zelle anzahl 14 in 6
& ton magie
sprecher "Die Zelle muss jetzt immer neue Viren bauen. Eins, zwei, drei, ganz viele!"
sprecher "Die Zelle wird ganz voll."
sprecher@6-9,10+ "Das Virus hat der Zelle seinen Bauplan untergeschoben. Und die Zelle baut ihn einfach nach."
platzen2d zelle
sprecher "Und dann ... platzt die Zelle auf. Und die neuen Viren fliegen heraus!"
sprecher "Jedes neue Virus sucht sich wieder eine neue Zelle. So werden es immer mehr."
sprecher@10+ "Eine einzige befallene Zelle kann so Hunderte bis Tausende neue Viren freisetzen."
warte 1.5
kamera2d bei 0 0 zoom 1 in 2
kapitel "4. Keime sind überall" 2.5
hintergrund zimmer in 2
kind2d kz bei -16 -11 groesse 12
& geraet2d hz bei 18 -4 groesse 10 art handy
sprecher "Weißt du, wo überall Keime wohnen?"
warte 1
sprecher "Eigentlich überall! In der Luft, im Wasser, in der Erde und auf allen Sachen."
bakterie2d kb1 bei -19 -2 groesse 1.5 gut
& bakterie2d kb2 bei -13 -6 groesse 1.5 gut
& bakterie2d kb3 bei 16 4 groesse 1.5 gut
& bakterie2d kb4 bei 21 0 groesse 1.5 gut
& ton plopp
sprecher "Auf deinen Händen, auf dem Handy, auf der Türklinke und auf deinem Spielzeug."
sprecher@6-9,10+ "Allein auf deinen Händen leben gerade jetzt viele tausend Bakterien."
sprecher "Aber keine Angst! Die allermeisten Keime tun dir gar nichts."
sprecher "Nur ein paar wenige machen uns krank. Die nennt man Krankheitserreger."
sprecher "Und dein Körper ist gut gegen sie geschützt. Das schauen wir uns gleich an."
sprecher@10+ "Dass es so viele harmlose Keime um uns herum gibt, ist sogar gut. Sie trainieren das Immunsystem schon von klein auf."
warte 1.5
verstecke2d kz
& verstecke2d hz
& verstecke2d kb1
& verstecke2d kb2
& verstecke2d kb3
& verstecke2d kb4
kapitel "5. Wie bekommt man die Keime?" 2.5
sprecher "Aber wie kommen die Keime überhaupt in unseren Körper?"
warte 1.5
hintergrund erde in 2
kind2d kind1 bei -22 -11 groesse 12
& kind2d kind2 bei 14 -11 groesse 12 farbe blau
& ton plopp
sprecher "Hier sind zwei Kinder. Das eine Kind hat Schnupfen."
& zeiger von 18 30 nach 28 50 farbe orange "krank" fuer 4
sprecher "Es muss niesen. Hatschi!"
niesen2d kind1 rechts
& ton puff
warte 1
sprecher "Beim Niesen fliegen ganz viele winzige Tröpfchen durch die Luft."
niesen2d kind1 rechts
sprecher "In den Tröpfchen stecken die Viren."
sprecher "Wenn das andere Kind die Tröpfchen einatmet, können die Viren in seine Nase kommen."
sprecher@6-9,10+ "Das nennt man Tröpfcheninfektion."
warte 1
symbol2d hand "✋" bei -4 4 groesse 7
sprecher "Keime kommen auch über die Hände."
verstecke2d hand
symbol2d tuer "🚪" bei -4 -4 groesse 12
sprecher "Wenn sich ein krankes Kind die Nase putzt und dann die Türklinke anfasst, bleiben Keime daran kleben."
sprecher "Das nächste Kind fasst die Türklinke an. Und dann reibt es sich die Augen oder fasst an den Mund."
sprecher "Schwupp, sind die Keime im Körper."
sprecher@6-9,10+ "Das nennt man Schmierinfektion."
warte 1
verstecke2d tuer
symbol2d obst "🍎" bei -6 4 groesse 6
& symbol2d gemuese "🥦" bei 2 4 groesse 6
sprecher "Und manchmal sind Keime im Essen oder im Wasser. Darum waschen wir Obst und Gemüse."
sprecher@10+ "Manche Krankheiten werden auch von Tieren übertragen, zum Beispiel von Mücken oder Zecken."
warte 1.5
verstecke2d kind1
& verstecke2d kind2
& verstecke2d obst
& verstecke2d gemuese
kapitel "6. Die Schutzmauern deines Körpers" 2.5
hintergrund weiss in 2
koerper2d km bei -8 -20 groesse 38
& ton plopp
sprecher "Zum Glück kommen Keime gar nicht so leicht in deinen Körper hinein."
sprecher "Dein Körper hat nämlich Schutzmauern."
sprecher "Die erste Mauer ist deine Haut. Sie ist wie ein dicker Mantel. Da kommen Keime nicht durch."
symbol2d pflaster "🩹" bei 16 6 groesse 7
sprecher "Nur wenn du eine Wunde hast, ist die Mauer offen. Darum kommt ein Pflaster drauf."
verstecke2d pflaster
symbol2d nase "👃" bei 16 6 groesse 7
sprecher "In deiner Nase sind kleine Haare und klebriger Schleim. Der Schleim fängt Keime ein, wie ein Fliegenfänger."
symbol2d tuch "🤧" bei 28 6 groesse 7
sprecher "Darum ist Naseputzen so wichtig. Dann landen die gefangenen Keime im Taschentuch."
verstecke2d nase
& verstecke2d tuch
symbol2d traene "💧" bei 16 6 groesse 6
sprecher "Deine Tränen waschen die Augen sauber. Und in deiner Spucke sind Stoffe, die Keime kaputt machen."
verstecke2d traene
zeige2d km magen
& ton magie
sprecher "Und wenn Keime mit dem Essen kommen, wartet im Magen eine scharfe Säure auf sie."
sprecher "Die Magensäure macht die meisten Keime kaputt."
sprecher@6-9,10+ "Nur wenn ein Keim an allen Mauern vorbeikommt, muss die Abwehr-Polizei ran."
sprecher@10+ "Die Magensäure ist ungefähr so sauer wie Zitronensaft, oft sogar noch saurer."
warte 1.5
verstecke2d km
hintergrund erde in 2
kapitel "7. Warum fühlt man sich krank?" 2.5
kind2d kind3 bei -6 -11 groesse 12
thermometer2d therm2 bei 20 -3 groesse 14 wert 37
sprecher "Jetzt sind die Viren im Körper. Was passiert dann?"
sprecher "Dein Körper merkt sofort: Hier stimmt etwas nicht!"
sprecher "Und er wehrt sich."
warte 1
temperatur2d therm2 auf 39 in 3
& ton zisch
sprecher "Zuerst wird dein Körper ganz warm. Du bekommst Fieber."
sprecher "Das ist gar nicht so schlimm. Mit Fieber arbeiten deine Abwehrkräfte schneller."
sprecher@6-9,10+ "Normal sind etwa siebenunddreißig Grad. Ab achtunddreißig Grad spricht man von Fieber."
sprecher "Deine Nase läuft. Der Schnupfen spült Keime nach draußen."
sprecher "Und beim Husten schleudert dein Körper Keime aus dem Hals heraus."
sprecher "Und du bist müde. Dein Körper braucht seine ganze Kraft für den Kampf gegen die Keime."
warte 1
sprecher "Das ist wichtig: Fieber, Schnupfen und Husten zeigen, dass dein Körper arbeitet!"
& text "Dein Körper kämpft!" 4 oben farbe orange
warte 1.5
verstecke2d kind3
& verstecke2d therm2
hintergrund mikro in 2
kapitel "8. Deine Abwehr-Polizei" 2.5
abwehr2d polizei bei -20 2 groesse 6
& ton glocke
sprecher "Jetzt lernst du die Helden in deinem Körper kennen."
sprecher "Das ist eine Abwehrzelle. Sie ist wie eine kleine Polizei."
& text2d "Abwehrzelle" an polizei 5
sprecher@6-9,10+ "Diese Zellen nennt man auch weiße Blutkörperchen."
bewege2d polizei zu -6 2 in 3
sprecher "Die Abwehrzellen schwimmen mit dem Blut durch deinen ganzen Körper. Sie sind immer auf Streife."
virus2d feind1 bei 14 6 groesse 3
& virus2d feind2 bei 20 -4 groesse 3
& virus2d feind3 bei 26 8 groesse 3
& ton schreck
sprecher "Oh, da sind Viren! Die Polizei hat sie entdeckt."
bewege2d polizei zu 10 4 in 2.5
sprecher "Manche Abwehrzellen sind Fresszellen. Sie fressen die Keime einfach auf. Mampf!"
verstecke2d feind1
& ton mampf
warte 1
antikoerper2d ak1 bei 4 -8 groesse 1.6
& antikoerper2d ak2 bei 8 -10 groesse 1.6
& antikoerper2d ak3 bei 12 -8 groesse 1.6
& ton magie
sprecher "Andere Abwehrzellen bauen kleine Fänger. Sie sehen aus wie ein Y."
sprecher@3-5 "Die Fänger heißen Antikörper."
sprecher@6-9,10+ "Diese Fänger heißen Antikörper. Jeder Antikörper passt genau zu einem bestimmten Keim."
bewege2d ak1 zu 18 -2 in 2
& bewege2d ak2 zu 22 -4 in 2
& bewege2d ak3 zu 26 4 in 2
sprecher "Die Antikörper kleben sich an die Viren. Wie Handschellen!"
sprecher "Jetzt können die Viren in keine Zelle mehr hinein. Die Schlüssel sind blockiert."
verstecke2d feind2
& verstecke2d feind3
& verstecke2d ak1
& verstecke2d ak2
& verstecke2d ak3
& ton tada
sprecher "Die Polizei hat gewonnen! Du wirst wieder gesund."
warte 1.5
sprecher "Und jetzt kommt das Allerbeste."
sprecher "Deine Abwehrzellen merken sich den Keim. Sie haben ein Gedächtnis!"
sprecher "Wenn der gleiche Keim noch einmal kommt, erkennen sie ihn sofort. Und sie fangen ihn, bevor du krank wirst."
sprecher@6-9,10+ "Darum bekommt man manche Krankheiten nur einmal, zum Beispiel Windpocken."
sprecher@10+ "Dafür sind besondere Gedächtniszellen zuständig. Sie können jahrelang im Körper bleiben."
warte 1
symbol2d spritze "💉" bei 16 2 groesse 8
sprecher "Eine Impfung funktioniert so ähnlich. Sie ist wie ein Training für deine Abwehr."
sprecher "Bei der Impfung lernt deine Abwehr einen Keim kennen, ohne dass du richtig krank wirst."
sprecher "Wenn der echte Keim dann kommt, ist deine Polizei schon vorbereitet."
sprecher@10+ "Eine Impfung enthält zum Beispiel abgeschwächte Erreger, Teile davon oder einen Bauplan für ein harmloses Erkennungsstück."
warte 1.5
verstecke2d polizei
& verstecke2d spritze
kapitel "9. Ein Schnupfen, Tag für Tag" 2.5
hintergrund zimmer in 2
kind2d ks bei -10 -11 groesse 12
& thermometer2d ts bei 18 -3 groesse 14 wert 37
& ton plopp
sprecher "Schauen wir uns einmal einen ganz normalen Schnupfen an. Tag für Tag."
text "Tag 1" 5 oben farbe gelb
sprecher "Am ersten Tag kratzt es ein bisschen im Hals. Die Viren haben sich in der Nase eingenistet."
text "Tag 2" 6 oben farbe gelb
& temperatur2d ts auf 38.5 in 3
sprecher "Am zweiten Tag läuft die Nase. Vielleicht kommt Fieber dazu. Die Abwehr-Polizei kämpft jetzt mit voller Kraft."
niesen2d ks rechts
symbol2d tuch2 "🤧" bei 4 2 groesse 7
sprecher "Hatschi! Jetzt braucht man ganz viele Taschentücher."
verstecke2d tuch2
text "Tag 3 und 4" 5 oben farbe gelb
symbol2d bett "🛌" bei 4 2 groesse 8
sprecher "Am dritten und vierten Tag ist man oft ganz schlapp. Viel schlafen hilft jetzt am meisten."
verstecke2d bett
text "Tag 5 bis 7" 6 oben farbe gelb
& temperatur2d ts auf 37 in 3
sprecher "Danach wird es jeden Tag ein bisschen besser. Das Fieber geht weg."
ton tada
sprecher "Und nach ungefähr einer Woche ist man wieder fit. Die Abwehr hat gewonnen!"
sprecher@6-9,10+ "Ein Husten kann aber noch ein paar Tage länger bleiben. Die Haut in Hals und Nase muss sich erst erholen."
warte 1.5
verstecke2d ks
& verstecke2d ts
hintergrund mikro in 2
kapitel "10. Bekannte Krankheiten" 2.5
virus2d e1 bei -24 4 groesse 3
& ton plopp
& text2d "Erkältung" an e1 6
sprecher "Es gibt viele verschiedene Krankheiten. Ein paar kennst du bestimmt."
sprecher "Die häufigste ist die Erkältung. Mit Schnupfen, Husten und Halsweh. Viele Kinder haben das mehrmals im Jahr."
virus2d e2 bei -8 4 groesse 3.5 farbe rot
& ton plopp
& text2d "Grippe" an e2 6
sprecher "Die Grippe ist wie eine starke große Schwester der Erkältung. Da hat man hohes Fieber, und alles tut weh."
virus2d e3 bei 8 4 groesse 3 farbe gruen
& ton plopp
& text2d "Magen-Darm" an e3 6
sprecher "Bei einer Magen-Darm-Krankheit tut der Bauch weh. Manchmal muss man sich übergeben oder hat Durchfall."
sprecher "Dann ist eins ganz wichtig: viel trinken! Der Körper verliert nämlich viel Wasser."
virus2d e4 bei 24 4 groesse 3 farbe lila
& ton plopp
& text2d "Windpocken" an e4 6
sprecher "Und bei Windpocken bekommt man viele kleine rote Pünktchen. Die jucken ganz fürchterlich."
sprecher "Aber nicht kratzen! Sonst können kleine Narben bleiben."
sprecher@6-9,10+ "Gegen Windpocken, Masern und einige andere Kinderkrankheiten gibt es Impfungen."
sprecher@10+ "Erkältungen werden von über zweihundert verschiedenen Viren ausgelöst. Darum kann man sich immer wieder erkälten."
warte 1.5
verstecke2d e1
& verstecke2d e2
& verstecke2d e3
& verstecke2d e4
kapitel "11. Medizin gegen Bakterien" 2.5
bakterie2d bk bei -16 2 groesse 4
& virus2d vk bei 16 2 groesse 3
& ton plopp
sprecher@3-5 "Gegen böse Bakterien gibt es eine besondere Medizin. Sie heißt Antibiotikum."
sprecher@3-5 "Die bekommt man nur vom Arzt."
sprecher@6-9,10+ "Wenn Bakterien uns krank machen, gibt der Arzt manchmal ein Medikament. Es heißt Antibiotikum."
sprecher@6-9,10+ "Ein Antibiotikum hilft gegen Bakterien."
verstecke2d bk
& ton puff
sprecher "Aber Achtung: Gegen Viren hilft ein Antibiotikum nicht!"
& kreis 66 46 radius 9 farbe rot "hilft nicht" fuer 4
sprecher@3-5 "Bei einem Schnupfen helfen vor allem Ruhe, Trinken und Schlafen."
sprecher@6-9,10+ "Gegen einen Schnupfen durch Viren hilft also kein Antibiotikum. Da hilft vor allem Ruhe, Trinken und Schlafen."
sprecher@10+ "Wer Antibiotika zu oft oder falsch nimmt, hilft damit Bakterien, unempfindlich zu werden. Das nennt man Resistenz."
verstecke2d vk
warte 1
kapitel "12. Was hilft, wenn man krank ist?" 2.5
hintergrund zimmer in 2
kind2d kk bei -10 -11 groesse 12
& thermometer2d tk bei 18 -3 groesse 14 wert 38.5
& ton plopp
sprecher "Was hilft eigentlich, wenn man krank ist?"
warte 1
symbol2d h1 "🛌" bei 4 2 groesse 8
sprecher "Das Wichtigste ist Ruhe. Im Bett liegen, kuscheln und schlafen."
sprecher "Im Schlaf hat dein Körper die meiste Kraft für die Abwehr."
verstecke2d h1
symbol2d h2 "🍵" bei 4 2 groesse 8
sprecher "Trink ganz viel. Wasser oder warmen Tee. Das hilft deinem Körper und macht den Schleim flüssig."
verstecke2d h2
symbol2d h3 "📖" bei 4 2 groesse 8
sprecher "Und vielleicht liest dir jemand eine schöne Geschichte vor."
warte 1
verstecke2d h3
symbol2d h4 "🩺" bei 4 2 groesse 8
sprecher "Wenn es dir sehr schlecht geht, geht ihr zum Kinderarzt oder zur Kinderärztin."
sprecher "Die hört dich mit einem Hörrohr ab. Und schaut in deinen Hals und in deine Ohren."
verstecke2d h4
symbol2d h5 "💊" bei 4 2 groesse 8
sprecher "Manchmal bekommst du Medizin. Zum Beispiel einen Saft gegen Fieber oder Tropfen für die Nase."
sprecher "Aber Medizin gibt es nur von Erwachsenen! Nimm nie selbst etwas aus dem Schrank."
temperatur2d tk auf 37 in 4
& ton magie
sprecher "Und mit ein bisschen Zeit wirst du wieder gesund."
sprecher@6-9,10+ "Ein Fiebersaft macht die Krankheit übrigens nicht weg. Er hilft nur, dass man sich besser fühlt. Gesund macht dich deine eigene Abwehr."
warte 1.5
verstecke2d kk
& verstecke2d tk
& verstecke2d h1
& verstecke2d h2
& verstecke2d h3
& verstecke2d h4
& verstecke2d h5
kapitel "13. Wie die Menschen die Keime entdeckt haben" 2.5
hintergrund tafel in 2
sprecher "Früher wussten die Menschen nicht, dass es Keime gibt. Sie konnten sie ja nicht sehen."
symbol2d luft "🌫️" bei -12 2 groesse 8
& symbol2d geist "👻" bei 12 2 groesse 8
sprecher "Manche dachten, Krankheiten kommen von schlechter Luft. Oder von bösen Geistern."
verstecke2d luft
& verstecke2d geist
warte 1
symbol2d lupe "🔍" bei 0 2 groesse 10
sprecher "Vor ungefähr dreihundertfünfzig Jahren hat ein Mann in Holland ganz besondere Lupen gebaut."
verstecke2d lupe
bakterie2d hb bei 0 2 groesse 6 gut
& ton magie
sprecher "Er schaute damit in einen Wassertropfen. Und er sah winzige Tierchen herumschwimmen!"
sprecher "Er war einer der ersten Menschen, die Bakterien gesehen haben."
bewege2d hb zu 10 4 in 3
sprecher "Später haben Forscher herausgefunden, dass manche dieser Tierchen krank machen."
verstecke2d hb
symbol2d seife "🧼" bei 18 2 groesse 8
sprecher "Darum fingen die Ärzte an, sich gründlich die Hände zu waschen. Danach wurden viel weniger Menschen krank."
verstecke2d seife
symbol2d@6-9,10+ pilz "🍄" bei 18 2 groesse 8
sprecher@6-9,10+ "Vor ungefähr hundert Jahren entdeckte ein Forscher durch Zufall das erste Antibiotikum. Ein Schimmelpilz hatte die Bakterien in seiner Schale getötet."
sprecher@10+ "Dieses erste Antibiotikum heißt Penicillin. Seitdem hat es Millionen Menschenleben gerettet."
verstecke2d@6-9,10+ pilz
virus2d hv bei 0 2 groesse 4
& ton plopp
sprecher "Viren sind noch viel kleiner. Die konnte man erst mit ganz besonderen Mikroskopen sehen."
symbol2d forsch "🧪" bei 18 2 groesse 8
sprecher "Und heute arbeiten auf der ganzen Welt Forscherinnen und Forscher daran, neue Medizin und Impfungen zu erfinden."
warte 1.5
verstecke2d hv
& verstecke2d forsch
hintergrund erde in 2
kapitel "14. So schützt du dich" 2.5
kind2d kind4 bei -10 -11 groesse 12
sprecher "Was kannst du tun, damit Keime dich nicht so leicht erwischen?"
warte 1.5
blasen2d bei -10 -6 anzahl 20 in 6
& ton platsch
sprecher "Erstens: Hände waschen! Mit Wasser und Seife."
symbol2d s1 "🎂" bei 8 0 groesse 8
sprecher "So lange, wie du zweimal Happy Birthday singst. Schrubb, schrubb!"
sprecher@10+ "Seife zerstört bei vielen Viren die fettige Hülle. Dann sind sie kaputt."
verstecke2d s1
symbol2d s2 "🍽️" bei 8 0 groesse 8
sprecher "Besonders vor dem Essen, nach dem Klo und wenn du nach Hause kommst."
warte 1
verstecke2d s2
symbol2d s3 "🤧" bei 8 0 groesse 8
sprecher "Zweitens: Niese und huste in deine Armbeuge. Oder in ein Taschentuch."
sprecher "Dann fliegen die Tröpfchen nicht zu den anderen."
warte 1
verstecke2d s3
symbol2d s4 "🥦" bei 8 0 groesse 8
sprecher "Drittens: Gesund essen, viel trinken, draußen spielen und genug schlafen."
verstecke2d s4
symbol2d s5 "💪" bei 8 0 groesse 8
sprecher "Dann ist deine Abwehr-Polizei stark und fit."
verstecke2d s5
symbol2d s6 "🏠" bei 8 0 groesse 8
sprecher "Und viertens: Wenn du krank bist, bleibst du zu Hause und ruhst dich aus. So steckst du niemanden an."
verstecke2d s6
symbol2d@6-9,10+ s7 "💉" bei 8 0 groesse 8
sprecher@6-9,10+ "Und Impfungen helfen, viele gefährliche Krankheiten zu verhindern."
warte 1.5
verstecke2d s6
verstecke2d@6-9,10+ s7
tafel@3-5 "Merk dir:" "Keime sind winzig klein." "Bakterien und Viren können krank machen." "Deine Abwehr-Polizei kämpft dagegen." "Hände waschen schützt!" rechts 16
tafel@6-9 "Merk dir:" "Bakterien leben und teilen sich." "Viren brauchen Zellen zum Vermehren." "Antikörper fangen Keime." "Antibiotika helfen nur gegen Bakterien." "Hände waschen und in die Armbeuge niesen!" rechts 16
tafel@10+ "Merke:" "Bakterien: Lebewesen, teilen sich" "Viren: Erbgut in einer Hülle, nur mit Wirtszelle" "Übertragung: Tröpfchen, Hände, Essen, Tiere" "Immunsystem: Fresszellen, Antikörper, Gedächtnis" "Antibiotika nur gegen Bakterien" rechts 16
sprecher "Merk dir: Keime sind winzig klein. Manche machen uns krank."
sprecher "Aber dein Körper hat eine tolle Abwehr. Und mit Händewaschen hilfst du ihr."
ton tada
warte 2
sprecher "Bleib gesund, und tschüss!"
ausblenden 1.5`,
    },
    koerper: {
      name: 'Wie funktioniert unser Körper?',
      erkennen: /(unser|mein|dein|der|den|menschlich\w*)\s+koerper|koerper\s+funktion|wie\s+funktioniert\s+.*koerper|\bkoerper\b/,
      kurz: `hintergrund weiss
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Mein Körper" 3
koerper2d k bei 0 -26 groesse 48
ton glocke
sprecher "Schau! Das bist du."
zeige2d k herz
ton herzschlag
& kamera2d bei 0 6 zoom 1.8 in 2
sprecher "Das ist dein Herz. Es klopft."
ton herzschlag
warte 1
zeige2d k lunge
& ton wind
sprecher "Atme ein. Und aus. Das ist die Lunge."
kamera2d bei 0 0 zoom 1.6 in 2
zeige2d k magen
essen2d k
& ton mampf
sprecher "Mmh, ein Apfel! Er geht in den Bauch."
warte 3
kamera2d bei 0 0 zoom 1 in 2
winke2d k in 4
& sprecher "Und jetzt winken. Hallo!"
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
      skript: `hintergrund weiss
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Wie funktioniert unser Körper?" 3
koerper2d k bei 0 -26 groesse 48
ton glocke
sprecher "Hallo! Schau mal, das ist ein Mensch. So wie du!"
sprecher "Dein Körper ist wie eine große, tolle Maschine. Viele Teile arbeiten zusammen."
kamera2d bei 0 16 zoom 2.2 in 2.5
zeige2d k gehirn
& ton magie
sprecher "Hier oben in deinem Kopf ist das Gehirn. Das Gehirn ist der Chef!"
& text2d "Gehirn" an k 4
sprecher "Mit dem Gehirn denkst du, lernst du und träumst du."
kamera2d bei 0 0 zoom 1 in 2
zeige2d k nerven
sprecher "Das Gehirn schickt Nachrichten durch den ganzen Körper. Durch ganz dünne Fäden."
sprecher "Diese Fäden heißen Nerven. Die Nachrichten flitzen ganz schnell hin und her."
sprecher@6-9,10+ "Die Nachrichten sind winzige elektrische Signale. Manche sind schneller als ein Rennauto!"
sprecher@10+ "Dein Gehirn hat ungefähr 86 Milliarden Nervenzellen."
zeige2d k nerven aus
kamera2d bei 0 6 zoom 2 in 2.5
zeige2d k herz
ton herzschlag
sprecher "Das hier ist dein Herz. Es schlägt die ganze Zeit."
ton herzschlag
& ton herzschlag
sprecher "Lege mal deine Hand auf die Brust. Spürst du es klopfen?"
ton herzschlag
warte 1
sprecher "Das Herz ist eine Pumpe. Es pumpt Blut durch deinen ganzen Körper."
kamera2d bei 0 0 zoom 1 in 2
zeige2d k blut
sprecher "Das Blut fließt durch lange, dünne Röhrchen. Bis in die Zehen und wieder zurück!"
sprecher@6-9,10+ "Die Röhrchen heißen Blutgefäße oder Adern."
sprecher@6-9,10+ "Dein Herz schlägt ungefähr hunderttausendmal an einem einzigen Tag."
sprecher@10+ "Alle Blutgefäße hintereinandergelegt wären etwa 100000 Kilometer lang. Das reicht mehr als zweimal um die ganze Erde."
kamera2d bei 0 7 zoom 1.9 in 2.5
zeige2d k lunge
& ton wind
sprecher "Atme mal tief ein. Und wieder aus."
warte 1
sprecher "Beim Einatmen füllt sich deine Lunge mit Luft. Wie ein Luftballon."
sprecher "In der Luft ist Sauerstoff. Den braucht dein Körper zum Leben."
sprecher "Das Blut holt den Sauerstoff aus der Lunge ab. Und bringt ihn überall hin."
sprecher@6-9,10+ "Beim Ausatmen gibt die Lunge Kohlendioxid ab. Das braucht der Körper nicht mehr."
sprecher@10+ "In Ruhe atmet ein Erwachsener etwa zwölf- bis zwanzigmal pro Minute."
zeige2d k blut aus
kamera2d bei 0 2 zoom 1.7 in 2
zeige2d k magen
& zeige2d k darm
essen2d k
& ton mampf
sprecher "Mmh, ein leckerer Apfel! Aber wohin geht das Essen?"
sprecher "Erst kaust du es klein. Dann rutscht es durch einen Schlauch in den Magen."
sprecher@6-9,10+ "Der Schlauch heißt Speiseröhre."
sprecher "Der Magen ist wie ein Mixer. Er macht aus dem Essen einen Brei."
sprecher "Dann geht es in den Darm. Der Darm holt das Gute aus dem Essen heraus."
sprecher@6-9,10+ "Das Gute heißt Nährstoffe. Sie geben dir Kraft zum Wachsen, Spielen und Denken."
sprecher@10+ "Ausgestreckt wäre dein Darm mehrere Meter lang."
kamera2d bei 0 0 zoom 1 in 2
zeige2d k knochen
& ton plopp
sprecher "Und was hält dich aufrecht? Deine Knochen!"
sprecher "Alle Knochen zusammen heißen Skelett. Ohne Skelett wärst du wabbelig wie Wackelpudding!"
& ton lachen
sprecher@6-9,10+ "Ein Erwachsener hat ungefähr 206 Knochen."
warte 1
sprecher "An den Knochen sind Muskeln. Muskeln können ziehen. Und schon bewegst du dich."
zeige2d k nerven
sprecher "Das Gehirn sagt: Wink mal!"
winke2d k in 4
& sprecher "Und der Arm winkt. Hallo!"
warte 1
zeige2d k nerven aus
zeige2d k alles
sprecher "Gehirn, Herz, Lunge, Magen, Darm, Knochen und Muskeln. Alle arbeiten zusammen. Wie eine Mannschaft!"
& ton jubel
tafel@3-5,6-9 "Merk dir:" "Gehirn: der Chef" "Herz: die Pumpe" "Lunge: holt Luft" "Magen und Darm: machen das Essen klein" "Knochen und Muskeln: zum Bewegen" rechts 16
tafel@10+ "Merke:" "Gehirn und Nerven: Steuerung mit elektrischen Signalen" "Herz und Blutgefäße: Kreislauf" "Lunge: Sauerstoff rein, Kohlendioxid raus" "Magen und Darm: Verdauung, Nährstoffe" "Skelett und Muskeln: Halt und Bewegung" rechts 16
sprecher "Darum: viel bewegen, gesund essen und genug schlafen. Dann geht es deinem Körper gut."
ton tada
warte 2
sprecher "Tschüss! Und gib deinem Herzen einen Gruß von mir!"
ausblenden 1.5`,
    },
    klima: {
      name: 'Was ist Klima?',
      erkennen: /\bklima|klimawandel|wetter\s+und\s+klima|treibhaus/,
      kurz: `hintergrund erde
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Wetter und Klima" 3
stern2d sonne bei -38 19 groesse 4 farbe gelb
ton glocke
sprecher "Schau! Die Sonne scheint."
wolke2d w1 bei 18 14 groesse 7 regen
& ton platsch
sprecher "Jetzt regnet es. Platsch!"
sprecher "Das ist das Wetter. Es ändert sich oft."
verstecke2d w1
hintergrund wueste in 2
kaktus2d k1 bei 18 -11 groesse 9
sprecher "In der Wüste ist es heiß."
verstecke2d k1
hintergrund schnee in 2
pinguin2d p1 bei 14 -11 groesse 7
& ton plopp
sprecher "Hier ist es kalt. Hallo, Pinguin!"
verstecke2d p1
hintergrund erde in 2
baum2d baum bei 18 -11 groesse 22 farbe gruen
& ton glocke
sprecher "Wir passen gut auf unsere Erde auf."
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
      skript: `hintergrund erde
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Was ist Klima?" 3
stern2d sonne bei -38 19 groesse 4 farbe gelb
kind2d kind bei -12 -11 groesse 11
ton glocke
sprecher "Hallo! Heute geht es um das Wetter. Und um das Klima."
warte 1
sprecher "Wie ist das Wetter heute bei dir?"
wolke2d w1 bei 10 16 groesse 7
& ton wind
sprecher "Vielleicht scheint die Sonne. Vielleicht kommen Wolken."
wolke2d w2 bei 27 13 groesse 7 regen
sprecher "Und morgen regnet es vielleicht. Platsch!"
sprecher "Das Wetter ändert sich ganz schnell. Jeden Tag ist es ein bisschen anders."
& text "Wetter: so ist es heute" 5 oben farbe gelb
warte 1
verstecke2d w1
& verstecke2d w2
sprecher "Und was ist Klima?"
warte 1.5
sprecher "Klima ist, wie das Wetter an einem Ort meistens ist. Über viele, viele Jahre."
& text "Klima: so ist es meistens, viele Jahre lang" 6 oben farbe orange
sprecher "Nicht nur heute. Sondern immer wieder, jedes Jahr."
sprecher@6-9,10+ "Fachleute schauen sich dafür das Wetter von dreißig Jahren an und rechnen den Durchschnitt aus."
warte 1
verstecke2d kind
sprecher "Auf der Welt gibt es ganz verschiedene Klimas."
hintergrund wueste in 2
kaktus2d k1 bei 14 -11 groesse 9
thermometer2d therm bei 32 -2 groesse 14 wert 20
& ton wind
temperatur2d therm auf 42 in 2
sprecher "In der Wüste ist es fast immer heiß und trocken."
sprecher "Hier regnet es nur ganz selten. Kakteen mögen das!"
warte 1
verstecke2d k1
hintergrund schnee in 2
pinguin2d p1 bei 10 -11 groesse 7
& pinguin2d p2 bei 17 -11 groesse 6
& ton plopp
temperatur2d therm auf -30 in 2
sprecher "Am Südpol ist es fast immer eiskalt. Alles ist voller Schnee und Eis."
sprecher "Pinguine fühlen sich hier pudelwohl."
warte 1
verstecke2d p1
& verstecke2d p2
hintergrund erde in 2
baum2d baum bei 12 -11 groesse 20 farbe gruen
temperatur2d therm auf 15 in 2
sprecher "Und bei uns? Bei uns gibt es Frühling, Sommer, Herbst und Winter."
sprecher "Mal ist es warm, mal ist es kalt. Auch das ist ein Klima."
sprecher@6-9,10+ "Diese großen Gebiete mit ähnlichem Klima heißen Klimazonen."
warte 1
verstecke2d baum
& verstecke2d therm
sprecher "Aber warum ist es nicht überall gleich warm?"
hintergrund weltraum in 2
planet2d erde bei 14 0 groesse 13 art erde
stern2d sonne2 bei -60 0 groesse 6 farbe gelb
& verstecke2d sonne
licht2d von -44 0 richtung 0 anzahl 9 abstand 2.9
& ton magie
sprecher "Das liegt an der Sonne. Schau mal, wie ihr Licht auf die Erde trifft."
sprecher "In der Mitte scheint die Sonne ganz gerade auf die Erde. Da wird es heiß."
& zeiger von 76 30 nach 60 49 farbe gelb "heiß" fuer 5
sprecher@6-9,10+ "Diese Mitte heißt Äquator."
sprecher "Oben und unten trifft das Licht ganz schräg. Da kommt weniger Wärme an."
& zeiger von 84 10 nach 72 22 farbe hellblau "kalt" fuer 5
symbol2d lampe "🔦" bei -28 -12 groesse 6
sprecher "Wie bei einer Taschenlampe: Gerade gehalten macht sie einen kleinen, hellen Fleck. Schräg gehalten einen großen, schwachen."
sprecher@6-9,10+ "Darum ist es am Nordpol und am Südpol so kalt."
warte 2
sprecher "Jetzt passiert gerade etwas mit unserem Klima."
huelle2d decke um erde dicke 1
& ton wind
sprecher "Um die Erde liegt eine Hülle aus Luft. Sie hält die Erde schön warm. Wie eine Decke."
& text2d "Luft-Decke" an erde 5
sprecher@6-9,10+ "Das nennt man den Treibhauseffekt. Ohne ihn wäre es auf der Erde eiskalt."
licht2d von sonne2 zu erde anzahl 5 faecher 3
zickzack2d von 14 14 nach 14 22 farbe orange anzahl 2
sprecher "Die Wärme von der Sonne bleibt ein bisschen unter der Decke."
warte 1
verstecke2d lampe
symbol2d auto "🚗" bei -26 -12 groesse 6
& symbol2d fabrik "🏭" bei -16 -12 groesse 6
sprecher "Wenn Autos fahren und Fabriken arbeiten, entstehen Abgase."
sprecher@6-9,10+ "Das wichtigste davon heißt Kohlendioxid."
dicke2d decke auf 3.5 in 5
& sprecher "Die Abgase machen die Decke immer dicker."
sprecher "Mit einer zu dicken Decke wird es der Erde zu warm. So wie dir im Bett unter drei Decken!"
& ton puff
sprecher@10+ "Seit etwa hundertfünfzig Jahren ist es auf der Erde im Durchschnitt schon ungefähr eins Komma zwei Grad wärmer geworden."
diagramm@10+ "Kohlendioxid in der Luft (Teilchen pro Million)" werte 285 311 317 354 369 389 424 namen "1850" "1950" "1960" "1990" "2000" "2010" "2024" linie rechts 9
sprecher@10+ "Der Anteil von Kohlendioxid in der Luft ist von etwa zweihundertfünfundachtzig auf über vierhundertzwanzig Teilchen pro Million gestiegen. So viel gab es seit Hunderttausenden von Jahren nicht."
sprecher "Dann schmilzt Eis an den Polen. Und es gibt öfter große Hitze oder starke Unwetter."
sprecher@6-9,10+ "Diese Veränderung nennt man Klimawandel."
warte 2
hintergrund erde in 2
verstecke2d erde
& verstecke2d decke
& verstecke2d auto
& verstecke2d fabrik
& verstecke2d sonne2
kind2d kind2 bei -14 -11 groesse 11
& ton glocke
sprecher "Aber wir können helfen! Und ganz viele Menschen machen das schon."
symbol2d rad "🚲" bei 12 -4 groesse 6
sprecher "Mit dem Fahrrad fahren oder zu Fuß gehen."
bewege2d kind2 zu 6 -11 in 3
verstecke2d rad
symbol2d licht "💡" bei 12 4 groesse 6
sprecher "Das Licht ausmachen, wenn keiner im Zimmer ist."
verstecke2d licht
baum2d baum2 bei 24 -11 groesse 22 farbe gruen
& ton plopp
sprecher@0-2,3-5 "Und Bäume pflanzen. Bäume machen die Luft sauber!"
sprecher@6-9,10+ "Und Bäume pflanzen. Bäume nehmen Kohlendioxid aus der Luft auf."
sprecher@10+ "Am meisten hilft aber, weniger Kohle, Erdöl und Erdgas zu verbrennen, zum Beispiel mit Strom aus Sonne und Wind."
warte 1
tafel@3-5,6-9 "Merk dir:" "Wetter: so ist es heute." "Klima: so ist es meistens, viele Jahre." "Abgase machen die Luft-Decke dicker." "Wir alle können helfen!" rechts 14
tafel@10+ "Merke:" "Wetter: Zustand der Luft heute" "Klima: Durchschnitt über 30 Jahre" "Treibhauseffekt hält die Erde warm" "Mehr CO₂ → stärkerer Treibhauseffekt → Klimawandel" "Lösung: weniger Kohle, Öl und Gas verbrennen" rechts 16
sprecher "Merk dir: Wetter ist heute. Klima ist, wie das Wetter meistens ist."
sprecher "Und wir alle können helfen, dass es unserer Erde gut geht."
ton tada
warte 2
sprecher "Tschüss! Bis zum nächsten Mal!"
ausblenden 1.5`,
    },
    himmelblau: {
      name: 'Warum ist der Himmel blau?',
      erkennen: /himmel\w*\s+(blau|so\s+blau)|blau\w*\s+himmel|warum\s+.*himmel/,
      kurz: `hintergrund erde
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Der blaue Himmel" 3
stern2d sonne bei -38 19 groesse 4 farbe gelb
ton glocke
sprecher "Schau! Der Himmel. Er ist blau."
sprecher "Da ist die Sonne. Sie ist hell."
regenbogen2d bogen bei 15 -11 groesse 22
& ton tada
sprecher "Im Licht sind viele Farben. Wie ein Regenbogen!"
verstecke2d bogen
luft2d luft bei 10 8 breite 40 hoehe 22 anzahl 50
zickzack2d von -20 10 nach 30 6 farbe blau anzahl 4
sprecher "Das Blau hüpft durch die Luft. Hüpf, hüpf!"
sprecher "Darum ist der Himmel blau."
verstecke2d luft
bewege2d sonne zu -46 -9 in 4
& hintergrund abend in 4
sprecher "Abends wird er orange. So schön!"
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
      skript: `hintergrund erde
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Warum ist der Himmel blau?" 3
stern2d sonne bei -38 19 groesse 4 farbe gelb
ton glocke
sprecher "Hallo! Schau mal nach oben. Der Himmel ist blau!"
warte 1
sprecher "Aber warum eigentlich? Warum ist er nicht grün oder rot?"
warte 1.5
sprecher "Das Licht kommt von der Sonne."
& text2d "Sonne" an sonne 4
licht2d von sonne zu 40 -8 anzahl 3 faecher 3 farbe weiss
& ton magie
sprecher "Sonnenlicht sieht weiß aus. Aber da ist ein Geheimnis drin!"
regenbogen2d bogen bei 15 -11 groesse 22
& ton tada
sprecher "Im Sonnenlicht sind alle Farben versteckt. Wie bei einem Regenbogen!"
sprecher "Rot, Orange, Gelb, Grün und Blau."
sprecher@6-9,10+ "Ein Regenbogen entsteht, wenn Regentropfen das Licht in seine Farben aufteilen."
warte 1
verstecke2d bogen
sprecher "Jetzt schauen wir ganz nah in die Luft."
kamera2d bei 10 8 zoom 2.2 in 3
luft2d luft bei 10 8 breite 44 hoehe 24 anzahl 80
& ton wind
sprecher "Die Luft ist voller winziger Teilchen. Viel zu klein zum Sehen."
& text2d "Luft" an luft 4
sprecher@6-9,10+ "Das sind vor allem Stickstoff und Sauerstoff."
warte 1
licht2d von -14 12 richtung -3 anzahl 1 farbe rot
& sprecher "Das rote Licht fliegt fast einfach geradeaus durch."
warte 1
zickzack2d von -14 9 nach 32 5 farbe blau anzahl 4
sprecher "Aber das blaue Licht stößt immer wieder an die Teilchen."
sprecher "Pling, pling! Es hüpft hin und her. Kreuz und quer!"
sprecher "Wie ein Flummi in einem kleinen Zimmer."
sprecher@6-9,10+ "Das nennt man Streuung. Blaues Licht wird viel stärker gestreut als rotes."
sprecher@10+ "Die Streuung hängt von der Wellenlänge ab: eins durch Lambda hoch vier. Blaues Licht hat eine kürzere Wellenlänge und wird darum etwa fünfmal stärker gestreut. Das heißt Rayleigh-Streuung."
formel@10+ "Streuung ∝ 1 / λ⁴" "Rayleigh-Streuung: kurze Wellenlängen (blau) werden viel stärker gestreut" oben 8
warte 2
kamera2d bei 0 0 zoom 1 in 2.5
sprecher "So wird das blaue Licht über den ganzen Himmel verteilt."
auge2d bei 30 -4 groesse 3
& ton plopp
zickzack2d von -10 15 nach 30 -4 farbe blau anzahl 3
sprecher "Egal wohin du schaust: Von überall kommt blaues Licht in dein Auge."
sprecher "Darum sieht der ganze Himmel blau aus!"
& ton tada
warte 2
verstecke2d auge
& verstecke2d luft
sprecher "Und abends? Da wird der Himmel oft orange und rot."
bewege2d sonne zu -46 -9 in 4
& hintergrund abend in 4
sprecher "Am Abend steht die Sonne ganz tief."
sprecher "Ihr Licht muss einen viel längeren Weg durch die Luft nehmen."
licht2d von sonne zu 46 -6 anzahl 3 faecher 2 farbe orange
sprecher "Unterwegs hüpft das ganze Blau weg."
sprecher "Übrig bleiben Rot und Orange. Darum ist der Abendhimmel so schön bunt."
warte 2
hintergrund@6-9,10+ weltraum in 2.5
sprecher@6-9,10+ "Und im Weltall? Dort gibt es keine Luft."
sprecher@6-9,10+ "Ohne Luft hüpft kein Licht herum. Darum ist der Himmel im Weltall schwarz, auch wenn die Sonne scheint!"
sprecher@10+ "Astronauten sehen deshalb eine grelle Sonne vor einem schwarzen Himmel."
warte@6-9,10+ 1
hintergrund@6-9,10+ erde in 2.5
tafel@3-5,6-9 "Merk dir:" "Im Sonnenlicht sind alle Farben." "Blaues Licht hüpft in der Luft herum." "Darum ist der Himmel blau." "Abends bleiben Rot und Orange übrig." rechts 14
tafel@10+ "Merke:" "Sonnenlicht enthält alle Farben" "Rayleigh-Streuung: Blau wird ca. 5× stärker gestreut als Rot" "Darum ist der Taghimmel blau" "Langer Lichtweg am Abend: Rot und Orange bleiben" "Ohne Atmosphäre (Weltall): schwarzer Himmel" rechts 16
sprecher "Merk dir: Das blaue Licht hüpft in der Luft herum. Darum ist der Himmel blau."
ton tada
warte 2
sprecher "Tschüss! Schau doch gleich mal aus dem Fenster!"
ausblenden 1.5`,
    },
    geister: {
      name: 'Kann man durch Wände gehen wie ein Geist?',
      erkennen: /(wand|waende|wänden|mauer)\w*.*(geh|lauf|geist|durch)|geist\w*.*(wand|waende|mauer|durch)|durch\s+(die\s+)?(wand|waende|mauer)/,
      kurz: `hintergrund erde
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Der kleine Geist" 3
wand2d wand bei 6 -11 hoehe 24 breite 5
geist2d geist bei -36 2 groesse 6
ton magie
sprecher "Huiii! Ein kleiner Geist."
bewege2d geist zu 34 2 in 5
& sprecher "Er schwebt durch die Wand!"
verstecke2d geist
kind2d kind bei -34 -11 groesse 11
ton plopp
sprecher "Und du? Kannst du das auch?"
bewege2d kind zu 0.5 -11 in 2.5
ton schlag
sprecher "Bumm! Nein! Die Wand ist hart."
bewege2d kind zu -4 -11 in 0.4
warte 1
sprecher "Die Wand ist fest. Ganz fest."
sprecher "Geister gibt es nur in Geschichten."
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
      skript: `hintergrund erde
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Kann man durch Wände gehen wie ein Geist?" 3
wand2d wand bei 6 -11 hoehe 24 breite 5
geist2d geist bei -36 2 groesse 6
ton magie
sprecher "Huiii! Das ist ein kleiner Geist."
& text2d "Geist" an geist 4
sprecher "In Geschichten können Geister durch Wände schweben."
bewege2d geist zu 34 2 in 5
& ton magie
& sprecher "Schau mal, einfach mitten durch!"
warte 1
sprecher "Aber Geister gibt es nur in Geschichten."
sprecher@6-9,10+ "In Wirklichkeit hat noch nie jemand einen echten Geist gemessen oder gefilmt."
verstecke2d geist
warte 1
kind2d kind bei -34 -11 groesse 11
& ton plopp
sprecher "Und wir? Können wir auch durch eine Wand gehen?"
warte 1.5
bewege2d kind zu 0.5 -11 in 2.5
ton schlag
& ton aua
sprecher "Bumm! Aua! Nein, so klappt das nicht."
bewege2d kind zu -4 -11 in 0.4
warte 1
sprecher "Aber warum eigentlich nicht?"
warte 1.5
kamera2d bei 6 -2 zoom 3 in 3
& sprecher "Wir schauen uns die Wand ganz, ganz nah an."
atome2d wandatome bei 6 -2 spalten 4 zeilen 6 groesse 0.8 farbe orange
& ton magie
sprecher "Alles ist aus winzigen Kügelchen gemacht. Sie heißen Atome."
& text2d "Atome" an wandatome 5
sprecher "Die Wand ist aus Atomen. Deine Hand auch. Und du auch!"
sprecher "Die Atome halten sich ganz fest an den Händen. Wie Kinder im Kreis."
sprecher@6-9,10+ "Sie sind so klein, dass in einen Punkt auf dem Papier Millionen davon passen."
warte 1
atome2d handatome bei -4 -2 spalten 2 zeilen 6 groesse 0.8 farbe rosa
& text2d "deine Hand" an handatome 5
sprecher "Und hier kommen die Atome von deiner Hand."
bewege2d handatome zu 2.2 -2 in 2
sprecher "Wenn sie ganz nah an die Wand kommen, schieben sie sich weg."
bewege2d handatome zu -4 -2 in 0.6
& ton plopp
sprecher "Wie zwei Magnete, die sich nicht mögen. Pling!"
sprecher@6-9,10+ "Das macht eine unsichtbare Kraft. Sie heißt elektrische Kraft."
sprecher@10+ "Genauer: Die Elektronenhüllen stoßen sich ab. Und ein Gesetz der Quantenphysik, das Pauli-Prinzip, verbietet, dass sie ineinanderrutschen."
warte 1
verstecke2d wandatome
& verstecke2d handatome
atome2d@6-9,10+ atomleer bei 6 -2 spalten 3 zeilen 3 groesse 2.4 farbe hellblau wolke
sprecher@6-9,10+ "Jetzt etwas Spannendes: Ein Atom ist innen fast ganz leer!"
sprecher@6-9,10+ "Der Kern in der Mitte ist winzig. Drumherum flitzen Elektronen."
sprecher@6-9,10+ "Wäre ein Atom so groß wie ein Fußballstadion, wäre der Kern nur so groß wie eine Erbse."
sprecher@6-9,10+ "Trotzdem kommt nichts durch, weil sich die Elektronen so stark wegschieben."
verstecke2d@6-9,10+ atomleer
verstecke2d wand
& verstecke2d kind
kamera2d bei 0 0 zoom 1 in 2.5
kapitel "Der Trick der winzigen Teilchen" 3
hintergrund tafel in 2
sprecher "Aber jetzt kommt etwas ganz Verrücktes. Pass gut auf!"
sprecher "Ganz genau gesagt ist es gar nicht unmöglich, durch eine Wand zu gehen."
zahl2d chance "Chance ≈ 0" bei 0 12 groesse 7 farbe gelb
& ton magie
sprecher "Die Chance ist nur unglaublich winzig. Fast genau null."
verstecke2d chance
text "Tunneleffekt" 6 oben farbe gelb
sprecher "Das liegt an einem Trick der winzigen Teilchen. Er heißt Tunneleffekt."
wand2d tw bei 6 -8 hoehe 14 breite 1.2
& planet2d el bei -30 -2 groesse 2.4 art eis
& ton plopp
sprecher "Das hier ist ein Elektron. Ein winziges Teilchen aus einem Atom."
& text2d "Elektron" an el 4
bewege2d el zu 2.5 -2 in 1.2
bewege2d el zu -24 -2 in 1.2
& ton plopp
sprecher "Normalerweise prallt es an der Wand ab. Pling!"
bewege2d el zu 2.5 -2 in 1.2
bewege2d el zu -24 -2 in 1.2
& ton plopp
sprecher "Und noch mal. Pling!"
bewege2d el zu 30 -2 in 3
& ton magie
sprecher "Aber manchmal, ganz selten, ist es plötzlich auf der anderen Seite! Einfach so."
sprecher "Als hätte es einen geheimen Tunnel durch die Wand gefunden. Darum heißt das Tunneleffekt."
sprecher "Bei winzigen Teilchen passiert das wirklich. Forscher haben es ganz oft gemessen."
sprecher "In unserer großen Welt sieht man so etwas nie. Ein Ball prallt immer von der Wand ab. Nur die winzigen Teilchen können diesen Trick."
sprecher@6-9,10+ "Je dünner die Wand und je leichter das Teilchen, desto öfter klappt es."
sprecher@6-9,10+ "Ohne den Tunneleffekt würde sogar unsere Sonne nicht leuchten! Tief in der Sonne schaffen winzige Teilchen nur mit diesem Tunnel-Trick zueinander."
sprecher@10+ "Auch in jedem Handy und jedem USB-Stick wird der Tunneleffekt genutzt. So werden dort die Daten gespeichert."
verstecke2d el
& verstecke2d tw
kapitel "Und warum klappt es bei uns nicht?" 3
hintergrund erde in 2
wand2d wand2 bei 6 -11 hoehe 24 breite 5
& kind2d kind2 bei -30 -11 groesse 11
& ton plopp
sprecher "Aber warum können wir dann nicht einfach durch die Wand tunneln?"
sprecher "Du bist kein einzelnes Teilchen. Du bestehst aus unglaublich vielen Atomen."
sprecher@6-9,10+ "Ein Mensch besteht aus mehr Atomen, als es Sandkörner an allen Stränden der Welt gibt. Viel, viel mehr!"
sprecher "Damit du durch die Wand kommst, müssten alle deine Atome gleichzeitig den Tunnel-Trick schaffen. Alle auf einmal!"
symbol2d wuerfel "🎲" bei 26 8 groesse 7
sprecher "Das ist so, als müsstest du Milliarden Mal hintereinander eine Sechs würfeln. Ohne ein einziges Mal daneben."
verstecke2d wuerfel
bewege2d kind2 zu 0.5 -11 in 1.5
ton schlag
& sprecher "Aua!"
bewege2d kind2 zu -6 -11 in 0.4
bewege2d kind2 zu 0.5 -11 in 1
ton schlag
& sprecher "Aua!"
bewege2d kind2 zu -6 -11 in 0.4
sprecher "Selbst wenn du dein ganzes Leben lang gegen die Wand läufst, klappt es kein einziges Mal."
sprecher "Sogar wenn du seit dem Anfang der Welt jede Sekunde dagegen gelaufen wärst, hätte es nicht geklappt."
zahl2d chance2 "Chance ≈ 0" bei 0 14 groesse 7 farbe gelb
& ton magie
sprecher "Darum sagen Forscher: Die Chance ist nicht ganz genau null. Aber sie ist so klein, dass man sie ruhig null nennen kann."
sprecher@10+ "Man müsste die Wahrscheinlichkeit mit einer Null, einem Komma und mehr Nullen schreiben, als es Atome im ganzen Weltall gibt."
formel@10+ "Tunnelwahrscheinlichkeit ~ e^(−2·d·√(2·m·ΔE)/ħ)" "Je schwerer das Teilchen und je dicker die Wand, desto unwahrscheinlicher" oben 8
verstecke2d chance2
symbol2d tuer "🚪" bei 26 -4 groesse 10
sprecher "Also: Nimm lieber die Tür!"
warte 1.5
verstecke2d wand2
& verstecke2d kind2
& verstecke2d tuer
sprecher "Aber manche Dinge können doch durch Wände!"
wand2d fenster bei 20 -11 hoehe 24 breite 5 fenster
stern2d sonne bei -40 18 groesse 4 farbe gelb
& ton plopp
licht2d von sonne zu 46 0 anzahl 5 faecher 3
& ton magie
sprecher "Licht geht durch ein Fenster. Darum ist es drinnen hell."
symbol2d musik "🎵" bei 6 6 groesse 6
sprecher "Und Musik hört man manchmal durch die Wand. Vom Nachbarn!"
verstecke2d musik
& ton trommel
symbol2d@6-9,10+ handyw "📱" bei 6 6 groesse 6
sprecher@6-9,10+ "Auch Handywellen und Radiowellen kommen durch Wände. Darum geht das Internet im ganzen Haus."
verstecke2d@6-9,10+ handyw
warte 1
tafel@3-5,6-9 "Merk dir:" "Alles ist aus Atomen." "Atome schieben sich weg." "Winzige Teilchen können tunneln." "Bei uns ist die Chance fast 0." rechts 14
tafel@10+ "Merke:" "Materie besteht aus Atomen" "Elektronenhüllen stoßen sich ab (elektrische Kraft, Pauli-Prinzip)" "Atome sind fast leer – trotzdem undurchdringlich" "Tunneleffekt: für Elektronen messbar, für Menschen praktisch 0" rechts 16
sprecher "Merk dir: Alles ist aus Atomen. Und die schieben sich weg."
sprecher "Winzige Teilchen können manchmal durch Wände tunneln. Aber für uns ist die Chance fast genau null."
sprecher "Darum kommen wir nicht durch Wände. Das schaffen nur Geister in Geschichten!"
ton tada
warte 2
sprecher "Tschüss! Und pass auf, dass du nicht gegen eine Wand läufst!"
ausblenden 1.5`,
    },
    herbst: {
      kurz: `hintergrund erde
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Bunte Blätter" 3
stern2d sonne bei -38 19 groesse 4 farbe gelb
baum2d baum bei 14 -11 groesse 30 farbe gruen
ton glocke
sprecher "Schau! Ein Baum. Er ist grün."
warte 1
sprecher "Jetzt kommt der Herbst. Es wird kalt."
faerbe2d baum zu gelb in 3
& ton magie
sprecher "Oh! Gelb!"
faerbe2d baum zu orange in 2.5
sprecher "Orange!"
faerbe2d baum zu rot in 2.5
sprecher "Und rot! So bunt!"
warte 1
blaetterfallen2d baum anzahl 30 in 7
& ton schwung
& sprecher "Die Blätter fallen runter. Rascheln, rascheln!"
warte 2
sprecher "Im Frühling kommen neue Blätter."
faerbe2d baum zu gruen in 0.1
wachsen2d baum in 3
& ton glocke
sprecher "Grün! Tschüss!"
ausblenden 1.5`,
      name: 'Warum werden Blätter im Herbst bunt?',
      erkennen: /(blatt|blaett|laub)\w*.*(bunt|farb|faerb|herbst|gelb|rot|fall)|herbst\w*.*(blatt|blaett|laub|bunt|baum|baeum)/,
      skript: `hintergrund erde
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Warum werden Blätter im Herbst bunt?" 3
stern2d sonne bei -38 19 groesse 4 farbe gelb
baum2d baum bei 14 -11 groesse 30 farbe gruen
ton glocke
sprecher "Hallo! Schau mal, ein großer Baum."
& text2d "Baum" an baum 4
sprecher "Im Sommer hat er ganz viele grüne Blätter."
warte 1
sprecher "Weißt du, warum die Blätter grün sind?"
warte 1.5
blatt2d blatt bei -6 4 groesse 13 farbe gruen
& ton plopp
sprecher "Schau, das ist ein Blatt. Ganz nah."
sprecher "In dem Blatt ist ein grüner Farbstoff. Er heißt Blattgrün."
sprecher@6-9,10+ "Forscher nennen das Blattgrün Chlorophyll."
& text2d "Blattgrün" an blatt 5
warte 1
sprecher "Das Blattgrün ist wie eine kleine Küche."
licht2d von sonne zu blatt anzahl 5 faecher 5
& ton magie
sprecher "Mit Sonnenlicht und Wasser kocht es Essen für den Baum."
sprecher "Zucker! Davon wird der Baum groß und stark."
sprecher@3-5 "Das Kochen mit Licht hat einen lustigen Namen: Fotosynthese."
sprecher@6-9 "Das Kochen mit Licht heißt Fotosynthese. Dabei entsteht auch Sauerstoff zum Atmen."
sprecher@10+ "Dabei entsteht auch Sauerstoff, den wir atmen. Das Ganze heißt Fotosynthese."
formel@10+ "6 CO₂ + 6 H₂O + Licht → C₆H₁₂O₆ + 6 O₂" "Fotosynthese: aus Kohlendioxid und Wasser werden Zucker und Sauerstoff" oben 8
warte 2
verstecke2d blatt
sprecher "Dann kommt der Herbst."
& text "Herbst" 3 oben farbe orange
wolke2d w1 bei -18 17 groesse 7
& ton puff
sprecher "Es wird kälter. Und die Sonne scheint nicht mehr so lange."
wolke2d w2 bei 30 20 groesse 6 regen
sprecher "Es regnet öfter, und der Wind wird stärker."
warte 1
sprecher "Der Baum merkt das. Er macht sich bereit für den Winter."
sprecher "Er macht kein neues Blattgrün mehr."
faerbe2d baum zu gelb in 5
& sprecher "Das Grün verschwindet ganz langsam."
warte 1
sprecher "Und dann ... Überraschung!"
& ton tada
sprecher "Gelb und Orange kommen zum Vorschein."
sprecher "Die Farben waren die ganze Zeit schon im Blatt."
sprecher "Sie waren nur versteckt. Unter dem vielen Grün!"
sprecher@6-9,10+ "Die gelben und orangen Farbstoffe heißen Carotinoide. Die gibt es auch in Karotten!"
faerbe2d baum zu orange in 3
sprecher "Jetzt wird der Baum schon orange."
faerbe2d baum zu rot in 3
& ton magie
sprecher "Und bei manchen Bäumen werden die Blätter sogar rot."
sprecher@10+ "Rot ist ein neuer Farbstoff, den manche Bäume extra im Herbst bilden: Anthocyane. Sie schützen das Blatt, während der Baum Nährstoffe zurückholt."
sprecher "Rot, gelb und orange. Wie bunt der Baum jetzt ist!"
warte 2
sprecher "Der Baum holt sich das Gute aus den Blättern zurück."
sprecher "Er sammelt einen Vorrat für den Winter."
symbol2d hoernchen "🐿️" bei -24 -6 groesse 7
& symbol2d nuss "🌰" bei -16 -8 groesse 4
sprecher "So wie ein Eichhörnchen, das Nüsse versteckt."
verstecke2d hoernchen
& verstecke2d nuss
warte 1
blaetterfallen2d baum anzahl 34 in 9
& ton schwung
& sprecher "Dann lässt der Baum die Blätter los. Sie fallen herunter. Ganz langsam segeln sie zum Boden."
sprecher "Rascheln, rascheln! Jetzt kannst du durch das bunte Laub springen."
warte 2
sprecher "Im Winter hat der Baum keine Blätter. Er macht eine Pause. Wie ein Winterschlaf."
warte 2
sprecher "Und im Frühling?"
warte 1
faerbe2d baum zu gruen in 0.1
wachsen2d baum in 4
& ton glocke
& sprecher "Da wachsen ganz neue, grüne Blätter!"
warte 1
sprecher "Und alles fängt wieder von vorne an."
warte 1
tafel@3-5,6-9 "Merk dir:" "Blätter sind grün vom Blattgrün." "Es kocht mit Licht: Fotosynthese." "Im Herbst verschwindet das Grün." "Dann sieht man Gelb, Orange und Rot." "Im Frühling kommen neue Blätter." rechts 16
tafel@10+ "Merke:" "Chlorophyll macht Blätter grün (Fotosynthese)" "Im Herbst wird Chlorophyll abgebaut" "Carotinoide (gelb/orange) werden sichtbar" "Anthocyane (rot) werden neu gebildet" rechts 16
sprecher "Merk dir: Die Blätter sind grün vom Blattgrün."
sprecher "Im Herbst verschwindet das Grün. Dann sieht man Gelb, Orange und Rot."
sprecher "Und im Frühling wachsen neue Blätter."
ton tada
warte 2
sprecher "Tschüss, und viel Spaß im bunten Laub!"
ausblenden 1.5`,
    },
    schwarzesloch: {
      kurz: `hintergrund weltraum
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Das schwarze Loch" 3
sprecher "Schau mal! Sterne!"
stern2d riese bei 0 0 groesse 5 farbe gelb
ton plopp
sprecher "Ein großer Stern. Er leuchtet hell."
warte 1
sprecher "Oh! Der Stern wird ganz klein."
kollaps2d riese zu loch groesse 3 in 3
sprecher "Jetzt ist er schwarz. Ein schwarzes Loch!"
warte 1
sprecher "Schau, das Licht!"
licht2d von -58 0 richtung 0 anzahl 9 abstand 3.4
warte 3
sprecher "Schwupp! Das Licht fällt hinein."
ton puff
sprecher "Kein Licht kommt raus. Darum ist es schwarz."
warte 1
scheibe2d loch an in 2
& kamera2d bei 0 0 zoom 1.8 in 4
sprecher "Drumherum leuchtet es. Wie schön!"
warte 2
sprecher "Schwarzes Loch. Ganz schwarz. Tschüss!"
ton tada
ausblenden 1.5`,
      name: 'Warum ist ein schwarzes Loch schwarz?',
      erkennen: /schwarz\w*\s*loch|black\s*hole/,
      skript: `hintergrund weltraum
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Warum ist ein schwarzes Loch schwarz?" 3
kamera2d bei 0 0 zoom 0.8
ton glocke
sprecher "Hallo! Heute fliegen wir ins Weltall."
& kamera2d bei 0 0 zoom 1 in 5
sprecher "Schau mal, wie viele Sterne da sind!"
warte 1
stern2d riese bei 0 0 groesse 5 farbe gelb
ton plopp
sprecher "Das ist ein Stern. Ein ganz, ganz großer Stern."
& text2d "Stern" an riese 5
sprecher "Er leuchtet hell. Wie eine riesige Lampe."
warte 1
sprecher "Aber der Stern wird alt. Er ist müde."
sprecher "Und dann? Dann fällt er zusammen. Ganz klein!"
kollaps2d riese zu loch groesse 3 in 3.5
& kamera2d bei 0 0 zoom 1.4 in 3.5
sprecher "Huch! Wo ist der Stern hin?"
warte 1
sprecher "Jetzt ist da ein schwarzes Loch."
sprecher@6-9,10+ "Forscher sagen dazu: Der Stern ist kollabiert."
& text2d "Schwarzes Loch" an loch 5
sprecher "Ein schwarzes Loch ist wie ein riesiger Staubsauger."
sprecher "Es zieht alles zu sich hin. Sogar das Licht!"
sprecher@6-9,10+ "Das liegt an der Schwerkraft. Je mehr Masse auf kleinem Raum, desto stärker zieht sie."
sprecher@10+ "Würde man unsere Sonne zu einem schwarzen Loch zusammenpressen, wäre es nur etwa sechs Kilometer groß."
kamera2d bei 0 0 zoom 1 in 1.5
sprecher "Schau mal, da kommt Licht geflogen."
licht2d von -58 0 richtung 0 anzahl 11 abstand 3.4
warte 3
sprecher "Manches Licht fliegt außen herum."
sprecher "Aber das Licht in der Mitte ... schwupp! Es fällt hinein."
& ton puff
sprecher "Und es kommt nie wieder heraus."
sprecher@6-9,10+ "Diese Grenze heißt Ereignishorizont."
formel@10+ "v Flucht = √(2 · G · M / r)" "Am Ereignishorizont ist die Fluchtgeschwindigkeit gleich der Lichtgeschwindigkeit c" oben 8
sprecher@10+ "Am Ereignishorizont müsste man schneller als das Licht sein, um zu entkommen. Also schneller als dreihunderttausend Kilometer pro Sekunde."
& kreis 50 50 radius 15 farbe gelb "kein Weg zurück" fuer 5
warte 1
auge2d bei 44 0 groesse 3
& ton plopp
sprecher "Das hier ist ein Auge. So wie deins."
stern2d fern bei -44 26 groesse 1.4
& ton magie
sprecher "Wir sehen etwas nur, wenn Licht in unser Auge kommt."
licht2d von fern zu 44 16 anzahl 9 faecher 14
& licht2d von fern zu loch anzahl 3 faecher 2 farbe orange
warte 2.5
sprecher "Vom kleinen Stern kommt Licht zu uns. Darum sehen wir ihn."
sprecher "Aber aus dem schwarzen Loch kommt kein Licht."
sprecher "Gar keins! Darum sieht es ganz schwarz aus."
& zeiger von 32 22 nach 45 40 farbe weiss "kein Licht" fuer 5
warte 1
verstecke2d fern
& verstecke2d auge
scheibe2d loch an in 2
& kamera2d bei 0 0 zoom 2 in 4
sprecher "Um das Loch herum leuchtet es. Das ist heißes Gas."
sprecher "Es dreht sich im Kreis. Wie Wasser, das in den Abfluss läuft."
sprecher@10+ "Fachleute nennen das eine Akkretionsscheibe. Das Gas wird dort Millionen Grad heiß."
warte 2
kamera2d bei 0 0 zoom 1.2 in 2
sprecher "Weißt du, wie groß ein schwarzes Loch ist?"
warte 1.5
sprecher "Manche sind so klein wie eine Stadt."
sprecher "Aber sie sind schwerer als viele, viele Sonnen zusammen!"
& ton trommel
warte 1
symbol2d berg "⛰️" bei -28 12 groesse 7
sprecher "Stell dir vor, ein ganzer Berg wird so klein wie ein Sandkorn."
verstecke2d berg
sprecher "Genau so eng ist alles in einem schwarzen Loch zusammengedrückt."
warte 2
sprecher "Ist ein schwarzes Loch gefährlich für uns?"
warte 1.5
sprecher "Nein! Keine Angst."
& ton glocke
planet2d erde bei 40 -18 groesse 1.5 art erde
& kamera2d bei 10 0 zoom 0.8 in 3
sprecher "Das nächste schwarze Loch ist ganz, ganz weit weg."
& text2d "unsere Erde" an erde 5
sprecher "So weit, dass ein Raumschiff viele tausend Jahre fliegen müsste."
rakete2d bei 30 -18 groesse 1.2 winkel 180
& ton rakete
bewege2d rakete zu 8 -10 in 3
sprecher "Wir sind also ganz sicher hier auf der Erde."
verstecke2d rakete
warte 2
sprecher "Und weißt du was? Forscher haben ein schwarzes Loch fotografiert!"
& kamera2d bei 0 0 zoom 2.4 in 3
sprecher "Auf dem Foto sieht man einen leuchtenden Ring."
sprecher "Und in der Mitte: ein dunkler, schwarzer Fleck."
& kreis 50 50 radius 20 farbe weiss "der schwarze Fleck" fuer 5
sprecher "Genau so, wie wir es uns gedacht haben!"
sprecher@10+ "Das erste Foto gelang 2019. Dafür haben Radioteleskope auf der ganzen Welt zusammengearbeitet."
& ton jubel
verstecke2d erde
kamera2d bei 0 0 zoom 1.6 in 2
tafel@3-5,6-9 "Merk dir:" "Ein schwarzes Loch zieht alles an." "Sogar Licht." "Kein Licht kommt heraus." "Darum ist es schwarz!" rechts 14
tafel@10+ "Merke:" "Schwarzes Loch: riesige Masse auf kleinstem Raum" "Ereignishorizont: Fluchtgeschwindigkeit = Lichtgeschwindigkeit" "Kein Licht entkommt – darum schwarz" "Sichtbar ist nur das heiße Gas drumherum" rechts 16
sprecher "Merk dir: Ein schwarzes Loch zieht alles an. Sogar Licht."
sprecher "Kein Licht kommt heraus. Darum ist es schwarz!"
ton tada
warte 2
sprecher "Tschüss, bis zum nächsten Mal!"
ausblenden 1.5`,
    },
    tagundnacht: {
      kurz: `hintergrund weltraum
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Tag und Nacht" 3
stern2d sonne bei -40 0 groesse 9 farbe gelb
ton plopp
sprecher "Schau! Die Sonne. Sie ist hell."
planet2d erde bei 18 0 groesse 9 art erde
ton plopp
sprecher "Und das ist die Erde. Da wohnen wir."
licht2d von sonne zu erde anzahl 7 faecher 6
sprecher "Die Sonne scheint auf die Erde."
& zeiger von 70 25 nach 61 42 farbe gelb "Tag" fuer 5
sprecher "Hier ist es hell. Das ist Tag."
& zeiger von 92 75 nach 82 58 farbe hellblau "Nacht" fuer 5
sprecher "Hier ist es dunkel. Das ist Nacht."
drehe2d erde periode 6
sprecher "Die Erde dreht sich. Rundherum."
warte 3
sprecher "Hell: Tag. Dunkel: Nacht."
ton tada
sprecher "Gute Nacht!"
ausblenden 1.5`,
      name: 'Warum gibt es Tag und Nacht?',
      erkennen: /tag\s+und\s+nacht|nacht\s+und\s+tag|warum\s+(wird\s+es\s+)?(dunkel|nacht)/,
      skript: `hintergrund weltraum
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Warum gibt es Tag und Nacht?" 3
ton glocke
sprecher "Hallo! Weißt du, warum es abends dunkel wird?"
warte 1
stern2d sonne bei -40 0 groesse 9 farbe gelb
ton plopp
sprecher "Das ist die Sonne. Sie ist wie eine riesige Lampe."
& text2d "Sonne" an sonne 5
sprecher "Die Sonne leuchtet immer. Tag und Nacht."
warte 1
planet2d erde bei 18 0 groesse 9 art erde
ton plopp
sprecher "Und das ist unsere Erde. Da wohnen wir!"
& text2d "Erde" an erde 5
sprecher "Die Erde ist rund. Wie ein Ball."
licht2d von sonne zu erde anzahl 7 faecher 6
& ton magie
sprecher "Die Sonne scheint auf die Erde."
warte 1
sprecher "Aber schau mal genau hin!"
sprecher "Die Sonne macht nur eine Seite hell."
& zeiger von 70 25 nach 61 42 farbe gelb "hell" fuer 6
sprecher "Auf der hellen Seite ist Tag."
& text "Tag" 3 oben farbe gelb
warte 1
sprecher "Die andere Seite ist dunkel."
& zeiger von 92 75 nach 82 58 farbe hellblau "dunkel" fuer 6
sprecher "Auf der dunklen Seite ist Nacht."
& text "Nacht" 3 oben farbe hellblau
warte 1
drehe2d erde periode 6
sprecher "Und jetzt passiert etwas Tolles: Die Erde dreht sich!"
& kamera2d bei 10 0 zoom 1.3 in 3
sprecher "Sie dreht sich ganz langsam. Wie ein Karussell."
warte 2
sprecher "Wenn dein Zuhause zur Sonne zeigt, ist es Tag."
symbol2d spielen "⚽" bei 28 10 groesse 6
sprecher "Dann ist es hell, und du spielst draußen."
verstecke2d spielen
warte 1
sprecher "Wenn dein Zuhause von der Sonne weg zeigt, ist es Nacht."
symbol2d schlafen "🛌" bei 28 10 groesse 6
sprecher "Dann ist es dunkel, und du schläfst."
verstecke2d schlafen
warte 2
sprecher "Einmal ganz herum dauert einen Tag und eine Nacht."
sprecher@6-9,10+ "Genau gesagt: vierundzwanzig Stunden."
sprecher@10+ "Am Äquator dreht sich die Erde mit etwa 1670 Kilometern pro Stunde. Wir merken das nicht, weil sich alles um uns mitdreht."
formel@10+ "1 Umdrehung ≈ 24 Stunden" "Rotation der Erde um ihre eigene Achse" oben 6
warte 2
sprecher "Weißt du, warum die Sonne morgens aufgeht?"
warte 1.5
sprecher "Die Sonne bewegt sich gar nicht wirklich."
sprecher "Wir drehen uns! Und darum sieht es so aus, als ob die Sonne wandert."
& kurve 30 80 45 40 60 25 75 40 90 80 farbe gelb "So wandert die Sonne am Himmel" in 3 fuer 5
warte 2
sprecher "Das ist so, als ob du dich im Kreis drehst."
sprecher "Dann sieht es aus, als ob sich das Zimmer dreht. Aber du drehst dich!"
& ton schwung
warte 2
sprecher "Und jetzt etwas Lustiges."
sprecher "Wenn du morgens aufwachst, gehen andere Kinder gerade ins Bett!"
& zeiger von 92 75 nach 82 58 farbe hellblau "hier ist jetzt Nacht" fuer 5
sprecher "Sie wohnen auf der anderen Seite der Erde."
sprecher "Bei ihnen ist Nacht, wenn bei dir Tag ist."
warte 2
planet2d mond bei 46 -14 groesse 2.2 art mond
& ton plopp
sprecher "Und wer leuchtet in der Nacht? Der Mond!"
& text2d "Mond" an mond 5
sprecher "Der Mond leuchtet aber nicht selbst."
sprecher "Die Sonne scheint auf ihn. So wie auf einen Spiegel."
licht2d von sonne zu mond anzahl 3 faecher 2
& ton magie
warte 2.5
sprecher "Darum sehen wir ihn hell am Nachthimmel."
warte 2
tafel@3-5,6-9 "Merk dir:" "Die Sonne leuchtet immer." "Die Erde dreht sich." "Zur Sonne hin: Tag." "Von der Sonne weg: Nacht." rechts 14
tafel@10+ "Merke:" "Die Erde rotiert in 24 Stunden einmal um ihre Achse" "Die der Sonne zugewandte Seite hat Tag" "Die abgewandte Seite hat Nacht" "Der Mond reflektiert nur Sonnenlicht" rechts 16
sprecher "Merk dir: Die Erde dreht sich."
sprecher "Zur Sonne hin ist Tag. Von der Sonne weg ist Nacht."
ton tada
warte 2
sprecher "Gute Nacht und bis bald!"
ausblenden 1.5`,
    },
    umlaufbahn: {
      kurz: `hintergrund weltraum
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Der Mond" 3
planet2d erde bei 0 0 groesse 8 art erde
ton plopp
sprecher "Schau! Die Erde."
planet2d mond bei 30 0 groesse 2.2 art mond
ton plopp
sprecher "Und der Mond. Er ist klein."
umlauf2d mond um erde periode 9
sprecher "Der Mond fliegt im Kreis. Rundherum."
warte 3
sprecher "Rund und rund und rund."
warte 3
sprecher "Er fällt nicht runter. Er fliegt immer im Kreis."
ton tada
sprecher "Tschüss, Mond!"
ausblenden 1.5`,
      name: 'Warum fällt der Mond nicht auf die Erde?',
      erkennen: /mond\b.*(faellt|kreist|umlauf)|(faellt|kreist)\b.*\bmond\b|umlaufbahn|warum\s+kreist|schwerkraft\s+im\s+(all|weltall)/,
      skript: `hintergrund weltraum
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Warum fällt der Mond nicht runter?" 3
ton glocke
sprecher "Hallo! Hast du schon mal den Mond gesehen?"
warte 1
planet2d erde bei 0 0 groesse 8 art erde
ton plopp
sprecher "Das ist unsere Erde."
& text2d "Erde" an erde 4
planet2d mond bei 30 0 groesse 2.2 art mond
ton plopp
sprecher "Und das ist der Mond. Er ist viel kleiner."
& text2d "Mond" an mond 4
stern2d sonne bei -140 60 groesse 3
warte 1
sprecher "Die Erde hat eine unsichtbare Kraft. Sie heißt Schwerkraft."
sprecher "Die Schwerkraft zieht alles zur Erde hin."
& zeiger von 74 50 nach 62 50 farbe rot "zieht" fuer 5
symbol2d ball "⚽" bei -24 14 groesse 5
sprecher "Darum fällt ein Ball immer auf den Boden."
& bewege2d ball zu -24 -14 in 1.5
verstecke2d ball
sprecher@6-9,10+ "Der Mond ist ungefähr 384000 Kilometer weit weg."
sprecher@10+ "Isaac Newton hat erkannt: Dieselbe Kraft, die einen Apfel fallen lässt, hält auch den Mond auf seiner Bahn."
formel@10+ "F = G · m₁ · m₂ / r²" "Newtons Gravitationsgesetz: Je mehr Masse und je näher, desto stärker die Anziehung" oben 8
warte 1
sprecher "Die Erde zieht auch am Mond."
sprecher "Warum fällt er dann nicht herunter?"
warte 1.5
sprecher "Weil der Mond ganz schnell zur Seite fliegt!"
sprecher@6-9,10+ "Er fliegt ungefähr einen Kilometer in jeder Sekunde."
& zeiger von 80 50 nach 80 25 farbe gelb "schnell" fuer 5
& ton schwung
umlauf2d mond um erde periode 9
sprecher "Er fällt ein bisschen zur Erde. Und fliegt gleichzeitig weiter."
& kamera2d bei 0 0 zoom 0.9 in 3
sprecher "So fliegt er immer im Kreis um die Erde herum."
warte 2
sprecher "Das ist wie bei einem Ball an einer Schnur."
sprecher "Wenn du ihn schnell drehst, fliegt er im Kreis und fällt nicht runter."
warte 2
sprecher "Der Kreis heißt Umlaufbahn."
& text "Umlaufbahn" 3 oben farbe gelb
warte 2
sprecher "Wie lange braucht der Mond für eine Runde?"
warte 1.5
sprecher "Ungefähr einen Monat. Das sind etwa dreißig Tage."
& zaehler "Tage" von 0 bis 30 in 4
warte 3
sprecher "Darum sieht der Mond jede Nacht ein bisschen anders aus."
symbol2d vollmond "🌕" bei -26 12 groesse 6
& symbol2d sichel "🌙" bei 26 12 groesse 6
sprecher "Mal ist er rund wie ein Ball. Mal ist er schmal wie eine Banane."
verstecke2d vollmond
& verstecke2d sichel
& ton lachen
warte 2
sprecher "Waren schon Menschen auf dem Mond?"
warte 1.5
rakete2d bei 0 -20 groesse 1.5 winkel 90
& ton rakete
sprecher "Ja! Mit einer großen Rakete."
bewege2d rakete zu 25 10 in 4
sprecher "Die Astronauten sind ganz weit geflogen. Drei Tage lang!"
sprecher "Auf dem Mond konnten sie ganz hoch hüpfen."
& ton sprung
sprecher "Denn der Mond ist klein. Er zieht nicht so stark wie die Erde."
verstecke2d rakete
warte 2
tafel@3-5,6-9 "Merk dir:" "Die Erde zieht am Mond." "Der Mond fliegt schnell zur Seite." "Darum fliegt er im Kreis." rechts 12
tafel@10+ "Merke:" "Gravitation zieht den Mond zur Erde" "Seine Bahngeschwindigkeit (ca. 1 km/s) lässt ihn seitlich weiterfliegen" "Ergebnis: ein ständiger freier Fall – die Umlaufbahn" rechts 14
sprecher "Merk dir: Die Erde zieht am Mond. Der Mond fliegt schnell zur Seite."
sprecher "Darum fliegt er immer im Kreis und fällt nicht herunter."
ton tada
warte 2
sprecher "Tschüss, kleiner Mond!"
ausblenden 1.5`,
    },
  };
  BF.w2dHelfer = { w2d, nameOder, punkt, neuesObjekt, naturFarbe, farbe, pos, wertBei, clamp, lerp, sanft };
})();
