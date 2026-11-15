// Blockfilm – Wissenschaft: Kugeln/Planeten, Atome, Moleküle, Sonnensystem, Pendel, Pfeile,
// Beschriftungen, Messlineal, Stoppuhr, Tafel, Formeln, Diagramme und Zähler
(function () {
  const BF = (window.BF = window.BF || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const sanft = u => u * u * (3 - 2 * u);
  const Z = (BF.zusatz = BF.zusatz || {});

  // ---------- Daten ----------
  const ELEMENTE = {
    wasserstoff: ['H', 1, 0], helium: ['He', 2, 2], lithium: ['Li', 3, 4], beryllium: ['Be', 4, 5], bor: ['B', 5, 6],
    kohlenstoff: ['C', 6, 6], stickstoff: ['N', 7, 7], sauerstoff: ['O', 8, 8], fluor: ['F', 9, 10], neon: ['Ne', 10, 10],
    natrium: ['Na', 11, 12], magnesium: ['Mg', 12, 12], aluminium: ['Al', 13, 14], silizium: ['Si', 14, 14], phosphor: ['P', 15, 16],
    schwefel: ['S', 16, 16], chlor: ['Cl', 17, 18], argon: ['Ar', 18, 22], kalium: ['K', 19, 20], calcium: ['Ca', 20, 20],
    eisen: ['Fe', 26, 30], kupfer: ['Cu', 29, 35], silber: ['Ag', 47, 61], gold: ['Au', 79, 118], uran: ['U', 92, 146],
  };
  const SCHALEN = [2, 8, 8, 18, 18, 32, 32];
  const PLANETEN = [
    ['merkur', 0.25, 4, 3.0], ['venus', 0.42, 5.5, 4.5], ['erde', 0.45, 7.2, 6], ['mars', 0.33, 9, 8],
    ['jupiter', 1.0, 12.5, 14], ['saturn', 0.85, 16, 20], ['uranus', 0.6, 19, 28], ['neptun', 0.58, 21.5, 36],
  ];
  const ATOM_FARBE = { H: '#f4f4f4', C: '#333333', O: '#e03a2e', N: '#3a5ae0', Na: '#9a5ae0', Cl: '#3ad04a', P: '#f08a20', S: '#f0d020' };

  // ---------- Hilfen beim Übersetzen ----------
  function objekt(F, o) {
    o.segs = o.segs || [];
    o.t1 = o.t1 === undefined ? Infinity : o.t1;
    o.skala = o.skala || 1;
    F.objekte.push(o);
    return o;
  }
  function nameOpt(w, F) {
    // optionaler Name: erstes Wort, wenn es keine Zahl und kein Schlüsselwort ist
    const n = w.pk();
    if (n && !w.istZahl() && !['bei', 'auf', 'an', 'von', 'radius', 'farbe', 'groesse', 'textur', 'name'].includes(n)) { w.nimm(); return n; }
    const nn = w.optWort(['name']);
    return nn ? BF.norm(nn) : null;
  }
  function punkt(w, h, t) {
    w.fuell();
    const z = h.zielLesen(w, t);
    if (z.p && z.p[1] === null) z.p = [z.p[0], h.W.boden(z.p[0], z.p[2], t) + 1, z.p[2]];
    return z;
  }
  const festPunkt = (h, z, t) => (z.p ? z.p.slice() : h.zielPunkt(z, t));

  // ---------- Befehle ----------
  Z.kugel = Z.planet = Z.ball = function (w, t, h) {
    const F = h.F;
    const r = w.optZahl(['radius', 'groesse'], 0.5);
    const farbe = h.farbeWert(w.optWort(['farbe'], '#e04a3a'));
    let textur = w.optWort(['textur', 'aussehen', 'als']);
    const leucht = w.flag(['leuchtet', 'leuchtend', 'hell']);
    const spur = w.flag(['spur', 'mitspur']);
    const name = nameOpt(w, F);
    if (!textur && name && PLANET_TEX[name]) textur = name;
    const p = festPunkt(h, punkt(w, h, t), t);
    objekt(F, { typ: 'kugel', name, t0: t, start: p, p: p.slice(), r, farbe, textur: textur ? BF.norm(textur) : null, leucht: leucht || textur === 'sonne', spur });
    return 0;
  };

  Z.atom = function (w, t, h) {
    const F = h.F;
    const g = w.optZahl(['groesse'], 1);
    let pr = w.optZahl(['protonen']), ne = w.optZahl(['neutronen']), el = w.optZahl(['elektronen']);
    const mitNamen = w.flag(['mitnamen', 'beschriftet', 'namen']);
    let symbol = null, el2 = null;
    const n = w.pk();
    if (n && ELEMENTE[n]) { w.nimm(); el2 = n; [symbol, pr, ne] = [ELEMENTE[n][0], pr ?? ELEMENTE[n][1], ne ?? ELEMENTE[n][2]]; }
    const name = nameOpt(w, F) || el2;
    pr = Math.round(pr ?? 6); ne = Math.round(ne ?? pr); el = Math.round(el ?? pr);
    const p = festPunkt(h, punkt(w, h, t), t);
    if (p[1] < h.W.boden(p[0], p[2], t) + 2) p[1] += 2;
    objekt(F, { typ: 'atom', name, t0: t, start: p, p: p.slice(), g, pr, ne, el, symbol, titel: el2 ? el2[0].toUpperCase() + el2.slice(1) : null, mitNamen });
    return 0;
  };

  Z.molekuel = Z.molekul = Z.molekuele = function (w, t, h) {
    const F = h.F;
    const g = w.optZahl(['groesse'], 1);
    const fest = w.flag(['still', 'fest', 'ohnedrehen']);
    const art = w.wort();
    const A = MOLEKUELE[art];
    if (!A) throw new Error(`Molekül „${art}“ kenne ich nicht: ${Object.keys(MOLEKUELE).join(', ')}`);
    const name = nameOpt(w, F) || art;
    const p = festPunkt(h, punkt(w, h, t), t);
    if (p[1] < h.W.boden(p[0], p[2], t) + 1.5) p[1] += 1.5;
    const o = objekt(F, { typ: 'molekuel', name, t0: t, start: p, p: p.slice(), g, art });
    if (!fest) o.segs.push({ typ: 'drehung', t0: t, endlos: true, tempo: 0.5 });
    return 0;
  };

  Z.sonnensystem = function (w, t, h) {
    const F = h.F;
    const g = w.optZahl(['groesse'], 1);
    const tempo = w.optZahl(['tempo', 'geschwindigkeit'], 1);
    const mitNamen = w.flag(['mitnamen', 'beschriftet', 'namen']);
    const ohneBahnen = w.flag(['ohnebahnen']);
    w.fuell();
    const c = w.istZahl() ? festPunkt(h, punkt(w, h, t), t) : [0, h.W.boden(0, 0, t) + 6, 0];
    objekt(F, { typ: 'kugel', name: 'sonne', t0: t, start: c, p: c.slice(), r: 2 * g, textur: 'sonne', leucht: true });
    const r = BF.rng(11);
    for (const [n, gr, ab, per] of PLANETEN) {
      const p = [c[0], c[1], c[2] + ab * g];
      const o = objekt(F, { typ: 'kugel', name: n, t0: t, start: p, p: p.slice(), r: gr * g, textur: n, bahnRing: !ohneBahnen, mitNamen });
      o.segs.push({ typ: 'kreis', t0: t, mitte: { objekt: 'sonne' }, r: ab * g, a0: r() * Math.PI * 2, endlos: true, periode: per / tempo, dy: 0 });
      o.segs.push({ typ: 'drehung', t0: t, endlos: true, tempo: 1.2 });
      if (n === 'erde') {
        const m = objekt(F, { typ: 'kugel', name: 'mond', t0: t, start: p, p: p.slice(), r: 0.13 * g, textur: 'mond' });
        m.segs.push({ typ: 'kreis', t0: t, mitte: { objekt: 'erde' }, r: 0.85 * g, a0: 0, endlos: true, periode: 1.6 / tempo, dy: 0 });
      }
    }
    return 0;
  };

  Z.pendel = function (w, t, h) {
    const F = h.F;
    const L = w.optZahl(['laenge', 'lang'], 4);
    const amp = w.optZahl(['winkel', 'auslenkung'], 30);
    const g = w.optZahl(['schwerkraft'], 9.81);
    const farbe = h.farbeWert(w.optWort(['farbe'], '#d8282a'));
    const name = nameOpt(w, F) || 'pendel';
    const p = festPunkt(h, punkt(w, h, t), t);
    if (p[1] < h.W.boden(p[0], p[2], t) + L + 0.6) p[1] = h.W.boden(p[0], p[2], t) + L + 0.6;
    objekt(F, { typ: 'pendel', name, t0: t, start: p, p: p.slice(), L, amp: amp * Math.PI / 180, periode: 2 * Math.PI * Math.sqrt(L / g), farbe });
    return 0;
  };

  Z.pfeil = Z.vektor = Z.kraft = function (w, t, h) {
    const F = h.F;
    const farbe = h.farbeWert(w.optWort(['farbe'], '#ff3b30'));
    const dicke = w.optZahl(['dicke'], 0.08);
    const sicht = w.dauer(Infinity);
    const txt = w.text();
    const name = w.optWort(['name']);
    const vi = w.finde(['von']);
    if (vi < 0) throw new Error('So: pfeil von x y z nach x y z');
    w.t.splice(vi, 1);
    const von = h.zielLesen(w, t);
    const ni = w.finde(['nach', 'zu', 'bis']);
    if (ni >= 0) w.t.splice(ni, 1);
    const nach = h.zielLesen(w, t);
    objekt(F, { typ: 'pfeil', name: name ? BF.norm(name) : null, t0: t, t1: t + sicht, von, nach, farbe, dicke, text: txt, start: [0, 0, 0], p: [0, 0, 0] });
    return 0;
  };

  Z.beschriftung = Z.schild = Z.etikett = Z.label = function (w, t, h) {
    const F = h.F;
    const txt = w.text();
    if (txt === null) throw new Error('Text fehlt: beschriftung "Sonne" bei 0 5 0');
    const farbe = h.farbeWert(w.optWort(['farbe'], '#ffffff'));
    const sicht = w.dauer(Infinity);
    const name = w.optWort(['name']);
    w.fuell();
    const z = h.zielLesen(w, t);
    objekt(F, { typ: 'beschriftung', name: name ? BF.norm(name) : null, t0: t, t1: t + sicht, ziel: z, text: txt, farbe, start: [0, 0, 0], p: [0, 0, 0] });
    return 0;
  };

  Z.lineal = Z.messe = Z.massband = function (w, t, h) {
    const F = h.F;
    const einheit = w.optWort(['einheit'], 'm');
    const sicht = w.dauer(Infinity);
    const name = w.optWort(['name']);
    const vi = w.finde(['von']);
    if (vi >= 0) w.t.splice(vi, 1);
    const von = h.zielLesen(w, t);
    const ni = w.finde(['nach', 'zu', 'bis']);
    if (ni >= 0) w.t.splice(ni, 1);
    const nach = h.zielLesen(w, t);
    objekt(F, { typ: 'lineal', name: name ? BF.norm(name) : null, t0: t, t1: t + sicht, von, nach, einheit, start: [0, 0, 0], p: [0, 0, 0] });
    return 0;
  };

  Z.verstecke = Z.ausblenden_objekt = function (w, t, h) {
    const F = h.F;
    const was = w.wort();
    if (was === 'alles' || was === 'alle') { for (const o of F.objekte) if (o.t1 > t) o.t1 = t + 0.3; for (const u of F.ueber) if (u.t1 > t) u.t1 = t; return 0; }
    const l = F.objekte.filter(o => o.name === was);
    if (!l.length) throw new Error(`Objekt „${was}“ gibt es nicht`);
    for (const o of l) if (o.t1 > t) o.t1 = t + 0.3;
    return 0;
  };

  // --- Einblendungen (2D) ---
  Z.tafel = function (w, t, h) {
    const F = h.F;
    let ort = 'links';
    for (const o of ['links', 'rechts', 'mitte']) if (w.flag([o])) ort = o;
    const texte = [];
    for (let s = w.text(); s !== null; s = w.text()) texte.push(s);
    if (!texte.length) throw new Error('So: tafel "Titel" "Punkt 1" "Punkt 2"');
    const d = w.dauerOderZahl(Math.max(5, texte.length * 2));
    F.ueber.push({ typ: 'tafel', t0: t, t1: t + d, titel: texte[0], punkte: texte.slice(1), ort });
    return 0;
  };
  Z.formel = Z.gleichung = function (w, t, h) {
    const F = h.F;
    const txt = w.text();
    if (txt === null) throw new Error('So: formel "E = m · c²"');
    let ort = 'mitte';
    for (const o of ['oben', 'mitte', 'unten']) if (w.flag([o])) ort = o;
    const erk = w.text();
    const d = w.dauerOderZahl(4);
    F.ueber.push({ typ: 'formel', t0: t, t1: t + d, text: txt.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\*/g, '·'), erklaerung: erk, ort });
    return 0;
  };
  Z.diagramm = Z.grafik = function (w, t, h) {
    const F = h.F;
    const titel = w.text() || '';
    const linie = w.flag(['linie', 'kurve']);
    w.flag(['balken', 'saeulen']);
    let ort = 'rechts';
    for (const o of ['links', 'rechts', 'mitte']) if (w.flag([o])) ort = o;
    const einheit = w.optWort(['einheit'], '');
    let d = w.dauer();
    const wi = w.finde(['werte', 'daten', 'zahlen']);
    if (wi < 0) throw new Error('So: diagramm "Titel" werte 3 5 9 namen "A" "B" "C"');
    const rest = new h.Worte(w.t.splice(wi));
    rest.nimm();
    const werte = [];
    while (rest.istZahl()) werte.push(rest.zahl());
    rest.flag(['namen', 'beschriftung']);
    const namen = [];
    for (let s = rest.text(); s !== null; s = rest.text()) namen.push(s);
    if (d === undefined) d = rest.dauerOderZahl(w.dauerOderZahl(5));
    if (!werte.length) throw new Error('Nach „werte“ müssen Zahlen kommen');
    F.ueber.push({ typ: 'diagramm', t0: t, t1: t + d, titel, werte, namen, linie, einheit, ort });
    return 0;
  };
  Z.zaehler = Z.anzeige = Z.wert = function (w, t, h) {
    const F = h.F;
    const titel = w.text() || '';
    const einheit = w.optWort(['einheit'], '');
    const von = w.optZahl(['von', 'start'], 0);
    const bis = w.optZahl(['bis', 'ziel', 'auf'], von);
    const lauf = w.optZahl(['in'], 2);
    const d = w.dauer(Infinity);
    const nk = w.optZahl(['nachkomma', 'stellen'], Number.isInteger(von) && Number.isInteger(bis) ? 0 : 1);
    // ein neuer Zähler mit gleichem Titel ersetzt den alten
    for (const u of F.ueber) if (u.typ === 'zaehler' && u.titel === titel && u.t1 > t) u.t1 = t;
    const alt = F.ueber.filter(u => u.typ === 'zaehler').length;
    F.ueber.push({ typ: 'zaehler', t0: t, t1: t + d, titel, einheit, von, bis, lauf, nk, platz: alt });
    return 0;
  };
  Z.stoppuhr = Z.timer = function (w, t, h) {
    const F = h.F;
    const was = w.pk();
    const offen = F.ueber.filter(u => u.typ === 'stoppuhr' && u.stopp === undefined && u.t1 > t);
    if (was === 'stopp' || was === 'stop' || was === 'halt' || was === 'anhalten') { w.nimm(); for (const u of offen) u.stopp = t; return 0; }
    if (was === 'aus' || was === 'weg') { w.nimm(); for (const u of F.ueber) if (u.typ === 'stoppuhr' && u.t1 > t) u.t1 = t; return 0; }
    w.flag(['an', 'start', 'los']);
    for (const u of F.ueber) if (u.typ === 'stoppuhr' && u.t1 > t) u.t1 = t;
    F.ueber.push({ typ: 'stoppuhr', t0: t, t1: Infinity });
    return 0;
  };
  Z.vulkan = function (w, t, h) {
    const F = h.F, W = h.W;
    const H = Math.round(w.optZahl(['hoehe'], 9));
    const ausbruch = w.flag(['ausbruch', 'bricht', 'aus']);
    const d = w.dauer(6);
    w.fuell();
    const x0 = Math.round(w.zahl()), z0 = Math.round(w.zahl());
    const y0 = W.boden(x0, z0, t);
    if (!F.objekte.some(o => o.typ === 'vulkanbau' && o.x === x0 && o.z === z0)) {
      for (let y = 0; y < H; y++) {
        const r = Math.round((H - y) * 0.9) + 1;
        for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
          const dd = Math.hypot(x, z);
          if (dd > r + 0.3) continue;
          const krater = y >= H - 2 && dd < 1.6;
          W.setze(x0 + x, y0 + y, z0 + z, krater ? (y === H - 2 ? 'lava' : null) : (dd > r - 1 && h.zufall() < 0.3 ? 'bruchstein' : 'stein'), t);
        }
      }
      F.objekte.push({ typ: 'vulkanbau', x: x0, z: z0, t0: t, t1: Infinity, segs: [], start: [0, 0, 0], p: [0, 0, 0], skala: 1 });
    }
    if (!ausbruch) return 0;
    const top = [x0, y0 + H, z0];
    F.effekte.push({ typ: 'feuer', t0: t, t1: t + d, pos: [top[0], top[1] + 0.5, top[2]], seed: 9 });
    F.wackeln.push({ t0: t, t1: t + d, staerke: 0.25 });
    h.ton(t, 'donner');
    for (let s = 0; s < d; s += 0.6) {
      F.effekte.push({ typ: 'rauch', t0: t + s, t1: t + s + 1.3, pos: [top[0], top[1] + 1.5 + (s % 1.2), top[2]], seed: 100 + Math.round(s * 10) });
      F.effekte.push({ typ: 'funken', t0: t + s, t1: t + s + 1.2, pos: [top[0], top[1] + 0.5, top[2]], seed: 200 + Math.round(s * 10) });
    }
    for (let i = 0; i < Math.round(d * 4); i++) {
      const tt = t + h.zufall() * d;
      const a = h.zufall() * Math.PI * 2, v = 3 + h.zufall() * 5;
      F.koerper.push({ t0: tt, typ: h.zufall() < 0.5 ? 'netherrack' : 'obsidian', pos: [top[0], top[1] + 0.8, top[2]], vel: [Math.cos(a) * v, 12 + h.zufall() * 8, Math.sin(a) * v], dreh: [(h.zufall() - 0.5) * 8, (h.zufall() - 0.5) * 8, (h.zufall() - 0.5) * 8] });
    }
    h.ende(t + d + 3);
    return 0;
  };

  // ---------- Aktionen benannter Objekte ----------
  BF.objektAktion = function (liste, w, t, h) {
    const verb = w.wort();
    const F = h.F;
    let dauer = 0;
    for (const o of liste) {
      const ww = new h.Worte(w.t.slice());
      dauer = Math.max(dauer, aktion(o, verb, ww, t, h, F) || 0);
    }
    return dauer;
  };
  function aktion(o, verb, w, t, h, F) {
    switch (verb) {
      case 'bewegt': case 'fliegt_zu': case 'geht': case 'rollt': case 'schwebt': case 'faehrt': {
        const d = w.dauer(2);
        w.flag(['sich']);
        const z = punkt(w, h, t);
        const ziel = festPunkt(h, z, t);
        o.segs.push({ typ: 'zu', t0: t, t1: t + d, von: o.p.slice(), zu: ziel });
        o.p = ziel;
        return d;
      }
      case 'fliegt': case 'wird': case 'startet': {
        // fliegt mit vx vy vz (Wurf) – Bahn bis zum Boden
        w.flag(['mit', 'geworfen', 'geschossen', 'geschwindigkeit']);
        const g = w.optZahl(['schwerkraft'], 9.81);
        if (!w.istZahl()) {
          const d = w.dauer(2);
          w.flag(['zu', 'nach']);
          const ziel = festPunkt(h, punkt(w, h, t), t);
          o.segs.push({ typ: 'zu', t0: t, t1: t + d, von: o.p.slice(), zu: ziel });
          o.p = ziel;
          return d;
        }
        const v = [w.zahl(), w.zahl(), w.zahl()];
        return wurfBahn(o, t, v, g, h);
      }
      case 'faellt': {
        const g = w.optZahl(['schwerkraft'], 9.81);
        return wurfBahn(o, t, [0, 0, 0], g, h);
      }
      case 'kreist': case 'umkreist': case 'umrundet': {
        const per = w.optZahl(['periode', 'umlauf']);
        const d = w.dauer();
        const runden = w.optZahl(['runden', 'mal'], 1);
        const rr = w.optZahl(['radius', 'abstand']);
        w.fuell();
        const z = h.zielLesen(w, t);
        const c = z.objekt ? F.objekte.find(x => x.name === z.objekt).p : h.zielPunkt(z, t);
        const r = rr ?? Math.max(0.5, Math.hypot(o.p[0] - c[0], o.p[2] - c[2]));
        const a0 = Math.atan2(o.p[0] - c[0], o.p[2] - c[2]);
        if (d === undefined) {
          o.segs.push({ typ: 'kreis', t0: t, mitte: z, r, a0, endlos: true, periode: per || 6, dy: o.p[1] - c[1] });
          return 0;
        }
        o.segs.push({ typ: 'kreis', t0: t, t1: t + d, mitte: z, r, a0, runden, dy: o.p[1] - c[1] });
        o.p = [c[0] + Math.sin(a0 + Math.PI * 2 * runden) * r, o.p[1], c[2] + Math.cos(a0 + Math.PI * 2 * runden) * r];
        return d;
      }
      case 'dreht': case 'rotiert': {
        w.flag(['sich']);
        const d = w.dauer();
        const runden = w.optZahl(['runden', 'mal'], 1);
        if (d === undefined) { o.segs.push({ typ: 'drehung', t0: t, endlos: true, tempo: w.optZahl(['tempo'], 1) }); return 0; }
        o.segs.push({ typ: 'drehung', t0: t, t1: t + d, runden });
        return d;
      }
      case 'stoppt': case 'haelt': { o.segs.push({ typ: 'stopp', t0: t }); return 0; }
      case 'waechst': case 'schrumpft': case 'wird_gross': {
        w.flag(['auf', 'zu']);
        const d = w.dauer(1);
        const s = w.zahl(verb === 'schrumpft' ? 0.5 : 2);
        o.segs.push({ typ: 'skala', t0: t, t1: t + d, von: o.skala, zu: s });
        o.skala = s;
        return d;
      }
      case 'verschwindet': o.t1 = t + 0.3; return 0.3;
      case 'leuchtet': o.leucht = true; return 0;
      default:
        throw new Error(`„${verb}“ kann ein Objekt nicht (bewegt, fliegt, faellt, kreist, dreht, waechst, schrumpft, stoppt, verschwindet)`);
    }
  }
  function wurfBahn(o, t, v, g, h) {
    // Flugzeit bis zum Boden ausrechnen
    const p0 = o.p.slice();
    const r = o.r || 0.3;
    let tt = 0;
    const dt = 1 / 120;
    let p = p0.slice();
    for (; tt < 20; tt += dt) {
      p = [p0[0] + v[0] * tt, p0[1] + v[1] * tt - 0.5 * g * tt * tt, p0[2] + v[2] * tt];
      if (tt > 0.02 && p[1] - r <= h.W.boden(p[0], p[2], t + tt, Math.round(p[1] + 2))) break;
    }
    const boden = h.W.boden(p[0], p[2], t + tt, Math.round(p[1] + 2));
    p[1] = boden + r;
    o.segs.push({ typ: 'wurf', t0: t, t1: t + tt, p0, v, g, ende: p });
    o.p = p;
    h.ton(t + tt, 'aufprall', { vol: 0.8 });
    return tt;
  }

  // ---------- Auswertung zur Zeit t ----------
  BF.objektZustand = function (F, o, t, tiefe = 0) {
    const p = o.start.slice();
    let s = 1, rot = 0, rotEndlos = null, stopp = false;
    for (const g of o.segs) {
      if (g.t0 > t) break;
      const u = g.t1 > g.t0 ? clamp((t - g.t0) / (g.t1 - g.t0), 0, 1) : 1;
      switch (g.typ) {
        case 'zu': for (let i = 0; i < 3; i++) p[i] = lerp(g.von[i], g.zu[i], sanft(u)); break;
        case 'wurf': {
          if (t >= g.t1) { p[0] = g.ende[0]; p[1] = g.ende[1]; p[2] = g.ende[2]; break; }
          const tt = t - g.t0;
          p[0] = g.p0[0] + g.v[0] * tt; p[1] = g.p0[1] + g.v[1] * tt - 0.5 * g.g * tt * tt; p[2] = g.p0[2] + g.v[2] * tt;
          break;
        }
        case 'kreis': {
          if (stopp) break;
          const c = tiefe > 5 ? [0, 0, 0] : mitte(F, g.mitte, t, tiefe);
          const a = g.endlos ? g.a0 + Math.PI * 2 * (t - g.t0) / g.periode : g.a0 + Math.PI * 2 * g.runden * sanft(u);
          p[0] = c[0] + Math.sin(a) * g.r; p[1] = c[1] + g.dy; p[2] = c[2] + Math.cos(a) * g.r;
          break;
        }
        case 'drehung': if (g.endlos) rotEndlos = { t0: g.t0, tempo: g.tempo }; else rot += Math.PI * 2 * g.runden * sanft(u); break;
        case 'skala': s = lerp(g.von, g.zu, sanft(u)); break;
        case 'stopp': stopp = true; rotEndlos = null; break;
      }
    }
    if (rotEndlos) rot += (t - rotEndlos.t0) * rotEndlos.tempo;
    const sicht = clamp((t - o.t0) / 0.3, 0, 1) * clamp((o.t1 - t) / 0.3, 0, 1);
    return { p, s, rot, sicht };
  };
  function mitte(F, z, t, tiefe) {
    if (z.objekt) { const o = F.objekte.find(x => x.name === z.objekt); return o ? BF.objektZustand(F, o, t, tiefe + 1).p : [0, 0, 0]; }
    return BF.zielPunkt(F, z, t);
  }
  BF.objektPos = function (F, name, t) {
    const o = F.objekte.find(x => x.name === name);
    return o ? BF.objektZustand(F, o, t).p : [0, 0, 0];
  };

  // ---------- Texturen für Planeten ----------
  const PLANET_TEX = {
    erde: (c, r) => { kugelTex(c, (u, v) => { const n = rausch(u * 6, v * 4, r); if (v < 0.1 || v > 0.9) return '#f4f8fb'; return n > 0.55 ? (n > 0.7 ? '#8a7a4a' : '#3f8f2a') : '#2a5fc0'; }); },
    mond: (c, r) => { kugelTex(c, (u, v) => { const n = rausch(u * 8, v * 6, r); return n > 0.65 ? '#7a7a7a' : n < 0.3 ? '#a8a8a8' : '#949494'; }); },
    sonne: (c, r) => { kugelTex(c, (u, v) => { const n = rausch(u * 10, v * 8, r); return n > 0.6 ? '#fff0a0' : n > 0.4 ? '#ffc840' : '#ff9a20'; }); },
    merkur: (c, r) => { kugelTex(c, (u, v) => { const n = rausch(u * 8, v * 6, r); return n > 0.6 ? '#6f6a66' : '#8f8a86'; }); },
    venus: (c, r) => { kugelTex(c, (u, v) => { const n = rausch(u * 4, v * 9, r); return n > 0.5 ? '#e8c890' : '#d8a860'; }); },
    mars: (c, r) => { kugelTex(c, (u, v) => { if (v < 0.07) return '#f0f0f0'; const n = rausch(u * 6, v * 5, r); return n > 0.6 ? '#8a3a1a' : '#c8582a'; }); },
    jupiter: (c, r) => { kugelTex(c, (u, v) => { const b = Math.sin(v * 28 + rausch(u * 4, v * 2, r) * 2); if (Math.hypot((u - 0.3) * 3, (v - 0.62) * 6) < 0.25) return '#b8442a'; return b > 0.3 ? '#d8b890' : b > -0.3 ? '#b88a5a' : '#e8d8c0'; }); },
    saturn: (c, r) => { kugelTex(c, (u, v) => { const b = Math.sin(v * 24); return b > 0.2 ? '#e8d8a0' : '#c8b070'; }); },
    uranus: (c, r) => { kugelTex(c, () => (r() > 0.5 ? '#9ae0e8' : '#8ad4dc')); },
    neptun: (c, r) => { kugelTex(c, (u, v) => (Math.sin(v * 18) > 0.6 ? '#3a5ae0' : '#2f4ac0')); },
  };
  function rausch(x, y, r) {
    // einfaches Wertrauschen über eine Tabelle
    const T = rausch.T || (rausch.T = Array.from({ length: 256 }, () => r()));
    const h = (a, b) => T[((a * 73) ^ (b * 151)) & 255];
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy) * 0.7 + h(xi * 3 + 7, yi * 3 + 1) * 0.3;
  }
  function kugelTex(c, fn) {
    const ctx = c.getContext('2d');
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { ctx.fillStyle = fn(x / c.width, y / c.height); ctx.fillRect(x, y, 1, 1); }
  }
  const texCache = {};
  function planetTextur(name) {
    if (texCache[name]) return texCache[name];
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    PLANET_TEX[name](c, BF.rng(BF.hash(name)));
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
    return (texCache[name] = t);
  }
  function farbTextur(farbe) {
    const k = 'f' + farbe;
    if (texCache[k]) return texCache[k];
    const c = document.createElement('canvas');
    c.width = 32; c.height = 16;
    const r = BF.rng(BF.hash(farbe));
    const rgb = BF.hex(farbe);
    kugelTex(c, () => BF.rgba(rgb, 0.9 + r() * 0.18));
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
    return (texCache[k] = t);
  }

  // ---------- Moleküle ----------
  const M = (atome, bindungen) => ({ atome, bindungen });
  const tet = 0.63;
  const MOLEKUELE = {
    wasser: M([['O', 0, 0, 0], ['H', 0.76, -0.59, 0], ['H', -0.76, -0.59, 0]], [[0, 1, 1], [0, 2, 1]]),
    co2: M([['C', 0, 0, 0], ['O', 1.16, 0, 0], ['O', -1.16, 0, 0]], [[0, 1, 2], [0, 2, 2]]),
    kohlendioxid: null,
    sauerstoff: M([['O', 0.6, 0, 0], ['O', -0.6, 0, 0]], [[0, 1, 2]]),
    stickstoff: M([['N', 0.55, 0, 0], ['N', -0.55, 0, 0]], [[0, 1, 3]]),
    wasserstoff: M([['H', 0.37, 0, 0], ['H', -0.37, 0, 0]], [[0, 1, 1]]),
    methan: M([['C', 0, 0, 0], ['H', tet, tet, tet], ['H', tet, -tet, -tet], ['H', -tet, tet, -tet], ['H', -tet, -tet, tet]], [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]]),
    ammoniak: M([['N', 0, 0.2, 0], ['H', 0.94, -0.2, 0], ['H', -0.47, -0.2, 0.81], ['H', -0.47, -0.2, -0.81]], [[0, 1, 1], [0, 2, 1], [0, 3, 1]]),
    kochsalz: null, salz: null, dna: null,
  };
  MOLEKUELE.kohlendioxid = MOLEKUELE.co2;
  (() => {
    const a = [], b = [];
    const idx = {};
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) { idx[[x, y, z]] = a.length; a.push([(x + y + z) % 2 === 0 ? 'Cl' : 'Na', x * 0.95, y * 0.95, z * 0.95]); }
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) { const n = idx[[x + dx, y + dy, z + dz]]; if (n !== undefined) b.push([idx[[x, y, z]], n, 1]); }
    MOLEKUELE.kochsalz = MOLEKUELE.salz = M(a, b);
    const d = [], db = [];
    const BASEN = ['#e04a3a', '#3a8ae0', '#3ad04a', '#f0c020'];
    for (let i = 0; i < 20; i++) {
      const y = (i - 10) * 0.34, w = i * 0.6;
      const i0 = d.length;
      d.push(['P', Math.cos(w) * 1.0, y, Math.sin(w) * 1.0], ['P', Math.cos(w + Math.PI) * 1.0, y, Math.sin(w + Math.PI) * 1.0]);
      d.push(['X' + BASEN[i % 4], Math.cos(w) * 0.4, y, Math.sin(w) * 0.4], ['X' + BASEN[(i + 2) % 4], Math.cos(w + Math.PI) * 0.4, y, Math.sin(w + Math.PI) * 0.4]);
      db.push([i0, i0 + 2, 1], [i0 + 1, i0 + 3, 1], [i0 + 2, i0 + 3, 1]);
      if (i > 0) db.push([i0 - 4, i0, 1], [i0 - 3, i0 + 1, 1]);
    }
    MOLEKUELE.dna = M(d, db);
  })();
  for (const k of Object.keys(MOLEKUELE)) if (!MOLEKUELE[k]) delete MOLEKUELE[k];

  // ---------- 3D aufbauen ----------
  const lam = (farbe, leucht) => new THREE.MeshLambertMaterial({ color: farbe, emissive: leucht ? farbe : 0x000000, emissiveIntensity: leucht ? 0.8 : 0 });
  const KUGEL = new THREE.SphereGeometry(1, 20, 14);
  const KUGEL_GROB = new THREE.SphereGeometry(1, 10, 8);
  const ZYL = new THREE.CylinderGeometry(1, 1, 1, 8);
  const KEGEL = new THREE.ConeGeometry(1, 1, 12);

  function bauen(o) {
    const g = new THREE.Group();
    const inhalt = new THREE.Group();
    g.add(inhalt);
    o._inhalt = inhalt;
    switch (o.typ) {
      case 'kugel': {
        const mat = o.textur && PLANET_TEX[o.textur]
          ? new THREE.MeshLambertMaterial({ map: planetTextur(o.textur), emissive: o.leucht ? 0xffffff : 0, emissiveMap: o.leucht ? planetTextur(o.textur) : null, emissiveIntensity: o.leucht ? 1 : 0 })
          : new THREE.MeshLambertMaterial({ map: farbTextur(o.farbe), emissive: o.leucht ? o.farbe : 0x000000, emissiveIntensity: o.leucht ? 0.9 : 0 });
        const m = new THREE.Mesh(KUGEL, mat);
        m.scale.setScalar(o.r);
        m.castShadow = !o.leucht; m.receiveShadow = !o.leucht;
        inhalt.add(m);
        if (o.textur === 'saturn') {
          const ring = new THREE.Mesh(new THREE.RingGeometry(o.r * 1.3, o.r * 2.1, 40), new THREE.MeshLambertMaterial({ color: 0xd8c890, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
          ring.rotation.x = -Math.PI / 2 + 0.4;
          g.add(ring);
        }
        if (o.leucht) { const l = new THREE.PointLight(o.farbe && !o.textur ? o.farbe : 0xfff0c0, 1.2, o.r * 30, 1.5); g.add(l); }
        break;
      }
      case 'atom': {
        const s = 0.16 * o.g;
        const n = Math.min(60, o.pr + o.ne);
        for (let i = 0; i < n; i++) {
          const proton = i % 2 === 0 ? i / 2 < o.pr : (i - 1) / 2 >= o.ne;
          const k = new THREE.Mesh(KUGEL_GROB, lam(proton ? '#e04040' : '#9a9a9a'));
          const y = 1 - (i / Math.max(1, n - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.399963;
          const rad = s * 1.1 * Math.cbrt(n) * 0.7;
          k.position.set(Math.cos(th) * rr * rad, y * rad, Math.sin(th) * rr * rad);
          k.scale.setScalar(s);
          inhalt.add(k);
        }
        o._elektronen = [];
        let rest = o.el;
        for (let sch = 0; rest > 0 && sch < SCHALEN.length; sch++) {
          const anzahl = Math.min(rest, SCHALEN[sch]);
          rest -= anzahl;
          const R = (0.9 + sch * 0.55) * o.g;
          const ebene = new THREE.Group();
          ebene.rotation.set(sch * 0.7 + 0.3, 0, sch * 1.1);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012 * o.g, 6, 64), new THREE.MeshBasicMaterial({ color: 0x9fb4d0, transparent: true, opacity: 0.55 }));
          ring.rotation.x = Math.PI / 2;
          ebene.add(ring);
          for (let j = 0; j < anzahl; j++) {
            const e = new THREE.Mesh(KUGEL_GROB, lam('#4aa0ff', true));
            e.scale.setScalar(0.09 * o.g);
            ebene.add(e);
            o._elektronen.push({ m: e, R, a0: (j / anzahl) * Math.PI * 2, tempo: 2.2 / (1 + sch * 0.6) });
          }
          inhalt.add(ebene);
        }
        break;
      }
      case 'molekuel': {
        const A = MOLEKUELE[o.art];
        const sk = 0.9 * o.g;
        const pos = A.atome.map(a => new THREE.Vector3(a[1], a[2], a[3]).multiplyScalar(sk));
        A.atome.forEach((a, i) => {
          const el = a[0];
          const farbe = el[0] === 'X' ? el.slice(1) : ATOM_FARBE[el] || '#c0c0c0';
          const r = (el === 'H' ? 0.28 : el === 'Cl' ? 0.42 : el === 'Na' ? 0.3 : el[0] === 'X' ? 0.18 : el === 'P' ? 0.2 : 0.4) * sk;
          const m = new THREE.Mesh(KUGEL, lam(farbe));
          m.position.copy(pos[i]); m.scale.setScalar(r); m.castShadow = true;
          inhalt.add(m);
        });
        const hoch = new THREE.Vector3(0, 1, 0);
        for (const [i, j, n] of A.bindungen) {
          const a = pos[i], b = pos[j];
          const d = new THREE.Vector3().subVectors(b, a);
          const len = d.length();
          const q = new THREE.Quaternion().setFromUnitVectors(hoch, d.clone().normalize());
          const seit = new THREE.Vector3(0, 0, 1).cross(d).normalize();
          if (seit.lengthSq() < 0.1) seit.set(0, 1, 0);
          for (let k = 0; k < n; k++) {
            const m = new THREE.Mesh(ZYL, lam('#d0d0d0'));
            m.scale.set(0.05 * sk, len, 0.05 * sk);
            m.quaternion.copy(q);
            m.position.copy(a).addScaledVector(d, 0.5).addScaledVector(seit, (k - (n - 1) / 2) * 0.13 * sk);
            inhalt.add(m);
          }
        }
        break;
      }
      case 'pendel': {
        const faden = new THREE.Mesh(ZYL, lam('#dddddd'));
        const kugel = new THREE.Mesh(KUGEL, lam(o.farbe));
        kugel.scale.setScalar(0.35); kugel.castShadow = true;
        const halter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.4), BF.blockMaterial('holz'));
        g.add(halter);
        const arm = new THREE.Group();
        faden.scale.set(0.02, o.L, 0.02); faden.position.y = -o.L / 2;
        kugel.position.y = -o.L;
        arm.add(faden, kugel);
        g.add(arm);
        o._arm = arm;
        break;
      }
      case 'pfeil': {
        const schaft = new THREE.Mesh(ZYL, lam(o.farbe, true));
        const spitze = new THREE.Mesh(KEGEL, lam(o.farbe, true));
        g.add(schaft, spitze);
        o._schaft = schaft; o._spitze = spitze;
        break;
      }
      case 'lineal': {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffd23a });
        const band = new THREE.Mesh(ZYL, mat);
        const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat), e2 = e1.clone();
        g.add(band, e1, e2);
        o._band = band; o._e1 = e1; o._e2 = e2;
        break;
      }
    }
    if (o.spur) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3));
      o._spur = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
      o._spur.frustumCulled = false;
    }
    if (o.bahnRing) {
      const z = o.segs.find(s => s.typ === 'kreis');
      if (z) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(z.r, 0.02, 4, 96), new THREE.MeshBasicMaterial({ color: 0x8090b0, transparent: true, opacity: 0.4 }));
        ring.rotation.x = Math.PI / 2;
        o._bahnRing = ring;
      }
    }
    return g;
  }

  const V = () => new THREE.Vector3();
  const tv1 = V(), tv2 = V(), tv3 = V(), HOCH = new THREE.Vector3(0, 1, 0);
  function richteAus(m, a, b, dicke) {
    tv3.subVectors(b, a);
    const len = tv3.length();
    if (len < 1e-4) { m.visible = false; return; }
    m.visible = true;
    m.scale.set(dicke, len, dicke);
    m.quaternion.setFromUnitVectors(HOCH, tv3.divideScalar(len));
    m.position.copy(a).addScaledVector(tv3, len / 2);
  }

  BF.wissen = {
    aufbauen(szene, F) {
      if (!szene.wissenGruppe) { szene.wissenGruppe = new THREE.Group(); szene.scene.add(szene.wissenGruppe); }
      const G = szene.wissenGruppe;
      while (G.children.length) G.remove(G.children[0]);
      for (const o of F.objekte || []) {
        if (o.typ === 'vulkanbau' || o.typ === 'beschriftung') continue;
        o._g = bauen(o);
        G.add(o._g);
        if (o._spur) G.add(o._spur);
        if (o._bahnRing) G.add(o._bahnRing);
      }
    },
    zeichne(szene, t) {
      const F = szene.F;
      for (const o of F.objekte || []) {
        if (!o._g) continue;
        const z = BF.objektZustand(F, o, t);
        const sichtbar = z.sicht > 0.001;
        o._g.visible = sichtbar;
        if (o._spur) o._spur.visible = sichtbar;
        if (o._bahnRing) {
          o._bahnRing.visible = sichtbar;
          const k = o.segs.find(s => s.typ === 'kreis');
          if (k) { const c = mitte(F, k.mitte, t, 0); o._bahnRing.position.set(c[0], c[1] + k.dy, c[2]); }
        }
        if (!sichtbar) continue;
        const s = z.s * (0.3 + 0.7 * sanft(z.sicht));
        switch (o.typ) {
          case 'pfeil': case 'lineal': {
            const a = BF.zielPunkt(F, o.von, t), b = BF.zielPunkt(F, o.nach, t);
            if (o.von.akteur) a[1] -= 0.4;
            if (o.nach.akteur) b[1] -= 0.4;
            tv1.set(...a); tv2.set(...b);
            const wachs = sanft(clamp((t - o.t0) / 0.5, 0, 1));
            tv2.lerpVectors(tv1, tv2, wachs);
            if (o.typ === 'pfeil') {
              const len = tv1.distanceTo(tv2);
              const sp = Math.min(len * 0.35, o.dicke * 5);
              const dir = V().subVectors(tv2, tv1).normalize();
              const mitteP = V().copy(tv2).addScaledVector(dir, -sp);
              richteAus(o._schaft, tv1, mitteP, o.dicke);
              o._spitze.visible = len > 0.01;
              o._spitze.scale.set(o.dicke * 2.4, sp, o.dicke * 2.4);
              o._spitze.quaternion.setFromUnitVectors(HOCH, dir);
              o._spitze.position.copy(mitteP).addScaledVector(dir, sp / 2);
            } else {
              richteAus(o._band, tv1, tv2, 0.03);
              o._e1.position.copy(tv1); o._e2.position.copy(tv2);
            }
            o._g.position.set(0, 0, 0);
            break;
          }
          case 'pendel': {
            o._g.position.set(...z.p);
            o._g.scale.setScalar(s);
            const tt = t - o.t0;
            o._arm.rotation.z = o.amp * Math.cos(2 * Math.PI * tt / o.periode);
            break;
          }
          default: {
            o._g.position.set(...z.p);
            o._g.scale.setScalar(s);
            o._inhalt.rotation.y = z.rot;
            if (o._elektronen) for (const e of o._elektronen) { const a = e.a0 + (t - o.t0) * e.tempo; e.m.position.set(Math.cos(a) * e.R, 0, Math.sin(a) * e.R); }
          }
        }
        if (o._spur) {
          const arr = o._spur.geometry.attributes.position.array;
          for (let i = 0; i < 60; i++) {
            const tt = Math.max(o.t0, t - (59 - i) * 0.05);
            const p = BF.objektZustand(F, o, tt).p;
            arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2];
          }
          o._spur.geometry.attributes.position.needsUpdate = true;
        }
      }
    },

    // ---------- 2D-Einblendungen ----------
    ueber(szene, t, w, h, E) {
      const F = szene.F, ctx = szene.ctx;
      const schrift = (gr, fett, art) => `${fett ? 'bold ' : ''}${Math.round(gr)}px ${art || '"Segoe UI", "Noto Sans", Arial, sans-serif'}`;
      const proj = p => { const v = new THREE.Vector3(...p).project(szene.kamera); return v.z > 1 ? null : [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h]; };
      // Beschriftungen, Lineal-Längen, Pfeil-Texte, Element-Namen
      for (const o of F.objekte || []) {
        let sicht = clamp((t - o.t0) / 0.3, 0, 1) * clamp((o.t1 - t) / 0.3, 0, 1);
        if (sicht <= 0) continue;
        let anker = null, text = null, farbe = '#ffffff', linie = false;
        if (o.typ === 'beschriftung') { anker = BF.zielPunkt(F, o.ziel, t); if (o.ziel.akteur) anker[1] += 0.5; text = o.text; farbe = o.farbe; linie = true; }
        else if (o.typ === 'lineal') {
          const a = BF.zielPunkt(F, o.von, t), b = BF.zielPunkt(F, o.nach, t);
          const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * sanft(clamp((t - o.t0) / 0.5, 0, 1));
          anker = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.3, (a[2] + b[2]) / 2];
          text = len.toFixed(len < 10 ? 2 : 1).replace('.', ',') + ' ' + o.einheit; farbe = '#ffd23a';
        } else if (o.typ === 'pfeil' && o.text) {
          const a = BF.zielPunkt(F, o.von, t), b = BF.zielPunkt(F, o.nach, t);
          anker = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.35, (a[2] + b[2]) / 2]; text = o.text; farbe = o.farbe;
          sicht *= clamp((t - o.t0 - 0.3) / 0.3, 0, 1);
        } else if ((o.typ === 'kugel' && o.mitNamen) || (o.typ === 'atom' && (o.mitNamen || o.titel))) {
          const z = BF.objektZustand(F, o, t);
          anker = [z.p[0], z.p[1] - (o.typ === 'atom' ? (0.9 + 0.55 * 2) * o.g : o.r + 0.3), z.p[2]];
          text = o.typ === 'atom' ? `${o.titel || ''} (${o.symbol || '?'}) · ${o.pr} p⁺ · ${o.ne} n · ${o.el} e⁻` : o.name[0].toUpperCase() + o.name.slice(1);
        }
        if (!anker || !text) continue;
        const s = proj(anker);
        if (!s) continue;
        ctx.save();
        ctx.globalAlpha = sicht;
        const gr = 30 * E;
        ctx.font = schrift(gr, true);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const b = ctx.measureText(text).width + gr;
        let x = s[0], y = s[1] - (linie ? 60 * E : 0);
        if (linie) { ctx.strokeStyle = farbe; ctx.lineWidth = 3 * E; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(x, y + gr * 0.7); ctx.stroke(); ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(s[0], s[1], 5 * E, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(15,18,24,0.78)';
        rund(ctx, x - b / 2, y - gr * 0.75, b, gr * 1.5, 8 * E); ctx.fill();
        ctx.fillStyle = farbe;
        ctx.fillText(text, x, y + 1);
        ctx.restore();
      }
      // Tafel, Formel, Diagramm, Zähler, Stoppuhr
      for (const u of F.ueber || []) {
        if (t < u.t0 || t >= u.t1) continue;
        if (szene.ueberLassen && szene.ueberLassen(u)) continue;
        const ein = clamp((t - u.t0) / 0.35, 0, 1) * clamp((u.t1 - t) / 0.35, 0, 1);
        ctx.save();
        ctx.globalAlpha = ein;
        if (u.typ === 'tafel') tafel(ctx, u, t, w, h, E, schrift);
        else if (u.typ === 'formel') formel(ctx, u, t, w, h, E, schrift);
        else if (u.typ === 'diagramm') diagramm(ctx, u, t, w, h, E, schrift);
        else if (u.typ === 'zaehler') zaehler(ctx, u, t, w, h, E, schrift);
        else if (u.typ === 'stoppuhr') stoppuhr(ctx, u, t, w, h, E, schrift);
        ctx.restore();
      }
    },
  };

  function rund(ctx, x, y, b, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + b, y, x + b, y + hh, r); ctx.arcTo(x + b, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + b, y, r); ctx.closePath();
  }
  function zeilenUmbruch(ctx, text, maxB) {
    const out = []; let z = '';
    for (const wo of text.split(/\s+/)) { const n = z ? z + ' ' + wo : wo; if (ctx.measureText(n).width > maxB && z) { out.push(z); z = wo; } else z = n; }
    if (z) out.push(z);
    return out;
  }
  function tafel(ctx, u, t, w, h, E, schrift) {
    const B = u.ort === 'mitte' ? w * 0.6 : w * 0.38, rand = 16 * E;
    const x = u.ort === 'links' ? w * 0.04 : u.ort === 'rechts' ? w * 0.96 - B : (w - B) / 2;
    const gT = 46 * E, gP = 34 * E;
    ctx.font = schrift(gP, false, '"Comic Sans MS", "Segoe Print", "Noto Sans", sans-serif');
    const punkte = u.punkte.map(p => zeilenUmbruch(ctx, p, B - rand * 2 - gP * 1.4));
    const H = rand * 2 + gT * 1.6 + punkte.reduce((s, l) => s + l.length * gP * 1.3 + gP * 0.4, 0);
    const y = h * 0.08;
    ctx.fillStyle = '#7a5530'; rund(ctx, x - 10 * E, y - 10 * E, B + 20 * E, H + 20 * E, 10 * E); ctx.fill();
    ctx.fillStyle = '#23402f'; rund(ctx, x, y, B, H, 6 * E); ctx.fill();
    ctx.fillStyle = '#f4f4ec'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = schrift(gT, true, '"Comic Sans MS", "Segoe Print", "Noto Sans", sans-serif');
    ctx.fillText(u.titel, x + rand, y + rand);
    ctx.strokeStyle = 'rgba(244,244,236,0.7)'; ctx.lineWidth = 2.5 * E;
    ctx.beginPath(); ctx.moveTo(x + rand, y + rand + gT * 1.15); ctx.lineTo(x + rand + Math.min(B - rand * 2, ctx.measureText(u.titel).width), y + rand + gT * 1.15); ctx.stroke();
    ctx.font = schrift(gP, false, '"Comic Sans MS", "Segoe Print", "Noto Sans", sans-serif');
    let yy = y + rand + gT * 1.6;
    punkte.forEach((zeilen, i) => {
      const k = clamp((t - u.t0 - 0.5 - i * 0.8) / 0.4, 0, 1);
      ctx.globalAlpha *= 1;
      ctx.save(); ctx.globalAlpha = ctx.globalAlpha * k;
      ctx.fillText('•', x + rand, yy);
      zeilen.forEach((z, j) => ctx.fillText(z, x + rand + gP * 1.1, yy + j * gP * 1.3));
      ctx.restore();
      yy += zeilen.length * gP * 1.3 + gP * 0.4;
    });
  }
  function formel(ctx, u, t, w, h, E, schrift) {
    const gr = 78 * E;
    ctx.font = schrift(gr, false, '"Cambria Math", "STIX Two Math", "Latin Modern Math", "DejaVu Serif", Georgia, serif');
    const b = ctx.measureText(u.text).width + gr * 1.2;
    let hh = gr * 1.6;
    const ge = 30 * E;
    if (u.erklaerung) hh += ge * 1.6;
    const x = (w - b) / 2, y = u.ort === 'oben' ? h * 0.07 : u.ort === 'unten' ? h * 0.93 - hh : (h - hh) / 2;
    const k = sanft(clamp((t - u.t0) / 0.4, 0, 1));
    ctx.translate(w / 2, y + hh / 2); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); ctx.translate(-w / 2, -(y + hh / 2));
    ctx.fillStyle = 'rgba(250,250,245,0.95)'; rund(ctx, x, y, b, hh, 14 * E); ctx.fill();
    ctx.strokeStyle = '#3a6ad0'; ctx.lineWidth = 4 * E; ctx.stroke();
    ctx.fillStyle = '#14181f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(u.text, w / 2, y + gr * 0.82);
    if (u.erklaerung) { ctx.font = schrift(ge, false); ctx.fillStyle = '#4a5160'; ctx.fillText(u.erklaerung, w / 2, y + gr * 1.6 + ge * 0.5); }
  }
  function diagramm(ctx, u, t, w, h, E, schrift) {
    const B = u.ort === 'mitte' ? w * 0.55 : w * 0.36, H = h * 0.42;
    const x = u.ort === 'links' ? w * 0.04 : u.ort === 'rechts' ? w * 0.96 - B : (w - B) / 2, y = h * 0.08;
    ctx.fillStyle = 'rgba(250,250,245,0.94)'; rund(ctx, x, y, B, H, 12 * E); ctx.fill();
    const gt = 30 * E, gl = 20 * E;
    ctx.fillStyle = '#14181f'; ctx.font = schrift(gt, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(u.titel, x + B / 2, y + 14 * E);
    const max = Math.max(...u.werte.map(Math.abs), 1e-9);
    const px = x + 46 * E, py = y + gt + 34 * E, pb = B - 66 * E, ph = H - gt - 34 * E - 50 * E;
    ctx.strokeStyle = '#8a909c'; ctx.lineWidth = 2 * E;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pb, py + ph); ctx.stroke();
    ctx.font = schrift(gl, false); ctx.fillStyle = '#4a5160'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4;
      const yy = py + ph - ph * i / 4;
      ctx.fillText((Number.isInteger(max) ? Math.round(v) : v.toFixed(1)) + (u.einheit && i === 4 ? ' ' + u.einheit : ''), px - 6 * E, yy);
      if (i) { ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pb, yy); ctx.stroke(); }
    }
    const n = u.werte.length;
    const FARBEN = ['#3a8ae0', '#e0603a', '#3ab060', '#e0b03a', '#9a5ae0', '#3ac0c0', '#e03a8a'];
    const k = sanft(clamp((t - u.t0 - 0.3) / 1.2, 0, 1));
    ctx.textAlign = 'center';
    if (u.linie) {
      ctx.strokeStyle = '#3a8ae0'; ctx.lineWidth = 4 * E; ctx.beginPath();
      const sicht = k * (n - 1);
      for (let i = 0; i < n; i++) {
        if (i > sicht + 1) break;
        let xx = px + pb * (i + 0.5) / n, yy = py + ph - ph * u.werte[i] / max;
        if (i > sicht) { const f = sicht - (i - 1); const x0 = px + pb * (i - 0.5) / n, y0 = py + ph - ph * u.werte[i - 1] / max; xx = lerp(x0, xx, f); yy = lerp(y0, yy, f); }
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      for (let i = 0; i < n && i <= sicht; i++) { ctx.fillStyle = '#3a8ae0'; ctx.beginPath(); ctx.arc(px + pb * (i + 0.5) / n, py + ph - ph * u.werte[i] / max, 6 * E, 0, 7); ctx.fill(); }
    } else {
      for (let i = 0; i < n; i++) {
        const kk = sanft(clamp((t - u.t0 - 0.3 - i * 0.12) / 0.8, 0, 1));
        const bw = pb / n * 0.66, xx = px + pb * (i + 0.5) / n - bw / 2, hh = ph * u.werte[i] / max * kk;
        ctx.fillStyle = FARBEN[i % FARBEN.length];
        ctx.fillRect(xx, py + ph - hh, bw, hh);
        ctx.fillStyle = '#14181f'; ctx.font = schrift(gl, true);
        if (kk > 0.9) ctx.fillText(String(u.werte[i]).replace('.', ','), xx + bw / 2, py + ph - hh - 12 * E);
      }
    }
    ctx.fillStyle = '#4a5160'; ctx.font = schrift(gl, false); ctx.textBaseline = 'top';
    u.namen.forEach((nm, i) => ctx.fillText(nm, px + pb * (i + 0.5) / n, py + ph + 8 * E));
  }
  function zaehler(ctx, u, t, w, h, E, schrift) {
    const k = sanft(clamp((t - u.t0) / Math.max(0.01, u.lauf), 0, 1));
    const v = lerp(u.von, u.bis, k);
    const text = v.toFixed(u.nk).replace('.', ',') + (u.einheit ? ' ' + u.einheit : '');
    const gT = 24 * E, gZ = 54 * E;
    ctx.font = schrift(gZ, true, '"JetBrains Mono", "DejaVu Sans Mono", monospace');
    const b = Math.max(ctx.measureText(text).width, 200 * E) + 40 * E;
    const hh = gT + gZ + 34 * E;
    const x = w - b - w * 0.03, y = h * 0.05 + u.platz * (hh + 14 * E);
    ctx.fillStyle = 'rgba(15,18,24,0.82)'; rund(ctx, x, y, b, hh, 12 * E); ctx.fill();
    ctx.fillStyle = '#9aa1b1'; ctx.font = schrift(gT, true); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(u.titel, x + 20 * E, y + 12 * E);
    ctx.fillStyle = '#7fe0a0'; ctx.font = schrift(gZ, true, '"JetBrains Mono", "DejaVu Sans Mono", monospace');
    ctx.fillText(text, x + 20 * E, y + 18 * E + gT);
  }
  function stoppuhr(ctx, u, t, w, h, E, schrift) {
    const z = Math.max(0, (u.stopp !== undefined ? Math.min(t, u.stopp) : t) - u.t0);
    const text = z.toFixed(2).replace('.', ',') + ' s';
    const g = 50 * E;
    ctx.font = schrift(g, true, '"JetBrains Mono", "DejaVu Sans Mono", monospace');
    const b = ctx.measureText(text).width + g * 1.6, hh = g * 1.5;
    const x = w * 0.03, y = h * 0.05;
    ctx.fillStyle = 'rgba(15,18,24,0.82)'; rund(ctx, x, y, b, hh, 12 * E); ctx.fill();
    ctx.fillStyle = u.stopp !== undefined && t >= u.stopp ? '#ffd23a' : '#ffffff';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.beginPath(); ctx.arc(x + g * 0.55, y + hh / 2, g * 0.28, 0, 7); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4 * E; ctx.stroke();
    const a = z * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x + g * 0.55, y + hh / 2); ctx.lineTo(x + g * 0.55 + Math.sin(a) * g * 0.22, y + hh / 2 - Math.cos(a) * g * 0.22); ctx.stroke();
    ctx.fillText(text, x + g * 1.0, y + hh / 2 + 2);
  }
})();
