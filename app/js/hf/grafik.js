// Blockfilm – SVG-Grafiken im Flat-Look (Kurzgesagt-artig) für HyperFrames.
// Hintergründe: mehrere Ebenen mit Parallax-Faktor. Objekte: in Einheiten um 0 0 gezeichnet (Radius 1 = o.r).
// Alles ist deterministisch (eigener Zufallsgenerator mit festem Startwert).
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const { hell, dunkel, mische, rgba } = HF.farbe;

  function zufall(seed) {
    let a = seed >>> 0 || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  HF.zufall = zufall;
  const f1 = v => Math.round(v * 10) / 10;
  const f3 = v => Math.round(v * 1000) / 1000;

  // ---------- Bausteine ----------
  // weiche Hügelkette über die Breite x0..x1 (Pixel), Grundlinie y, Höhe amp
  function huegel(x0, x1, y, amp, n, farbe, rnd, unten) {
    const schritt = (x1 - x0) / n;
    let d = `M${f1(x0)} ${f1(unten)} L${f1(x0)} ${f1(y)}`;
    let px = x0, py = y;
    for (let i = 1; i <= n; i++) {
      const x = x0 + i * schritt, yy = y - (0.35 + rnd() * 0.65) * amp * (i % 2 ? 1 : 0.55);
      d += ` Q${f1((px + x) / 2)} ${f1(Math.min(py, yy) - amp * 0.5 * rnd())} ${f1(x)} ${f1(yy)}`;
      px = x; py = yy;
    }
    d += ` L${f1(x1)} ${f1(unten)} Z`;
    return `<path d="${d}" fill="${farbe}"/>`;
  }
  // flache Berge mit heller linker Flanke
  function berge(x0, x1, y, hoehe, n, farbe, rnd) {
    let s = '';
    const b = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const mx = x0 + (i + 0.2 + rnd() * 0.6) * b, h = hoehe * (0.55 + rnd() * 0.45), br = b * (0.7 + rnd() * 0.6);
      const sp = 0.06 * br;
      s += `<path d="M${f1(mx - br)} ${f1(y)} L${f1(mx - sp)} ${f1(y - h + sp * 0.6)} Q${f1(mx)} ${f1(y - h - sp * 0.2)} ${f1(mx + sp)} ${f1(y - h + sp * 0.6)} L${f1(mx + br)} ${f1(y)} Z" fill="${farbe}"/>`;
      s += `<path d="M${f1(mx - br)} ${f1(y)} L${f1(mx - sp)} ${f1(y - h + sp * 0.6)} Q${f1(mx - sp * 0.2)} ${f1(y - h + sp * 0.1)} ${f1(mx)} ${f1(y - h + sp * 0.3)} L${f1(mx - br * 0.15)} ${f1(y)} Z" fill="${hell(farbe, 0.06)}"/>`;
    }
    return s;
  }
  function wolkenForm(x, y, r, farbe, schatten) {
    const k = [[-0.62, 0.12, 0.42], [-0.18, -0.18, 0.6], [0.38, -0.04, 0.5], [0.78, 0.16, 0.34]];
    let s = `<g>`;
    if (schatten) s += `<rect x="${f1(x - r * 1.05)}" y="${f1(y + r * 0.08)}" width="${f1(r * 2.2)}" height="${f1(r * 0.42)}" rx="${f1(r * 0.21)}" fill="${schatten}"/>`;
    for (const [dx, dy, rr] of k) s += `<circle cx="${f1(x + dx * r)}" cy="${f1(y + dy * r)}" r="${f1(rr * r)}" fill="${farbe}"/>`;
    s += `<rect x="${f1(x - r * 1.05)}" y="${f1(y)}" width="${f1(r * 2.2)}" height="${f1(r * 0.38)}" rx="${f1(r * 0.19)}" fill="${farbe}"/></g>`;
    return s;
  }
  function sterneFeld(x0, x1, y0, y1, n, rnd, gruppen) {
    // Sterne in Gruppen (für versetztes Funkeln per GSAP)
    const g = Array.from({ length: gruppen }, () => []);
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), r = 0.8 + rnd() * rnd() * 3.2;
      const z = rnd() < 0.12 ? `<path d="M${f1(x)} ${f1(y - r * 2.6)} Q${f1(x)} ${f1(y)} ${f1(x + r * 2.6)} ${f1(y)} Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y + r * 2.6)} Q${f1(x)} ${f1(y)} ${f1(x - r * 2.6)} ${f1(y)} Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y - r * 2.6)} Z" fill="#fff"/>`
        : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#fff"/>`;
      g[i % gruppen].push(z);
    }
    return g.map((l, i) => `<g class="funkeln f${i}" opacity="${f3(0.55 + 0.15 * i)}">${l.join('')}</g>`).join('');
  }

  // ---------- Hintergründe ----------
  // Jede Ebene: { par (0 = steht, 1 = bewegt sich mit der Welt), svg (Pixelkoordinaten, x von -W bis 2W, y von -H/2 bis 1.5H) }
  const ART = {
    weltraum: 'all', all: 'all', space: 'all',
    erde: 'erde', himmel: 'erde', abend: 'abend', sonnenuntergang: 'abend',
    wueste: 'wueste', urzeit: 'wueste', trias: 'wueste',
    jura: 'dschungel', kreide: 'dschungel',
    schnee: 'schnee', eiszeit: 'schnee', zimmer: 'zimmer', mikro: 'mikro', tafel: 'tafel', weiss: 'weiss', meer: 'meer',
  };
  HF.hgArt = art => ART[art] || null;

  HF.hintergrund = function (art, stil, W, H, seed, opt = {}) {
    const a = ART[art];
    if (!a) return null;
    const C = stil.hg, P = stil.palette, Fm = stil.form;
    const rnd = zufall(seed || 7);
    const s0 = W / 100, gy = H / 2 + 11 * s0; // Boden der 2D-Welt (y = -11)
    const X0 = -W, X1 = 2 * W, Y0 = -H / 2, Y1 = 1.5 * H;
    const voll = f => `<rect x="${X0}" y="${Y0}" width="${3 * W}" height="${2 * H}" fill="${f}"/>`;
    const verlauf = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
    const id = 'h' + seed;
    const E = [];
    const himmelLand = (oben, unten, bergF, boden, sonne) => {
      E.push({ par: 0, svg: `<defs>${verlauf(id + 'g', [[0, oben], [0.62, unten], [1, unten]])}</defs><rect x="${X0}" y="${Y0}" width="${3 * W}" height="${2 * H}" fill="url(#${id}g)"/>` });
      if (sonne && !opt.ohneSonne) {
        const sx = W * 0.78, sy = H * 0.2, sr = H * 0.075;
        E.push({ par: 0.04, svg: `<g class="sonne">${[3.2, 2.4, 1.7].map((k, i) => `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(sr * k)}" fill="${rgba(sonne, 0.12 + i * 0.06)}"/>`).join('')}<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(sr)}" fill="${sonne}"/><circle cx="${f1(sx - sr * 0.25)}" cy="${f1(sy - sr * 0.25)}" r="${f1(sr * 0.55)}" fill="${hell(sonne, 0.1)}"/></g>` });
      }
      if (bergF) {
        E.push({ par: 0.15, svg: berge(X0, X1, gy - H * 0.04, H * 0.36, 9, bergF[0], rnd) });
        if (Fm.details > 1) E.push({ par: 0.3, svg: berge(X0, X1, gy, H * 0.22, 12, bergF[1], rnd) });
      }
      if (Fm.details > 0) {
        let wk = '';
        for (let i = 0; i < 3 + Fm.details * 2; i++) wk += wolkenForm(X0 + rnd() * 3 * W, H * (0.08 + rnd() * 0.25), H * (0.04 + rnd() * 0.05), rgba('#ffffff', 0.92), null);
        E.push({ par: 0.08, svg: `<g class="treiben">${wk}</g>` });
      }
      E.push({ par: 0.55, svg: huegel(X0, X1, gy + H * 0.02, H * 0.08, 18, boden[0], rnd, Y1) });
      E.push({ par: 1, svg: huegel(X0, X1, gy + H * 0.035, H * 0.03, 30, boden[1], rnd, Y1) + `<rect x="${X0}" y="${f1(gy + H * 0.12)}" width="${3 * W}" height="${f1(Y1 - gy)}" fill="${boden[2] || dunkel(boden[1], 0.06)}"/>` });
    };
    if (a === 'all') {
      const [o, u] = C.all;
      E.push({ par: 0, svg: `<defs><radialGradient id="${id}r" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="${hell(o, 0.04)}"/><stop offset="1" stop-color="${u}"/></radialGradient></defs><rect x="${X0}" y="${Y0}" width="${3 * W}" height="${2 * H}" fill="url(#${id}r)"/>` });
      // weiche Nebel-Flecken (flach, mehrere Kreise mit wenig Deckkraft)
      let nb = '';
      for (let i = 0; i < 2 + Fm.details; i++) {
        const nx = X0 + rnd() * 3 * W, ny = rnd() * H, nr = H * (0.25 + rnd() * 0.35), nf = C.nebel[i % 2];
        for (let k = 0; k < 4; k++) nb += `<circle cx="${f1(nx + (rnd() - 0.5) * nr)}" cy="${f1(ny + (rnd() - 0.5) * nr * 0.6)}" r="${f1(nr * (0.5 + rnd() * 0.5))}" fill="${rgba(nf, 0.05 + 0.03 * Fm.glow)}"/>`;
      }
      E.push({ par: 0.1, svg: nb });
      E.push({ par: 0.2, svg: sterneFeld(X0, X1, Y0, Y1, Fm.sterne, rnd, 3) });
      E.push({ par: 0.35, svg: sterneFeld(X0, X1, Y0, Y1, Math.round(Fm.sterne * 0.4), rnd, 3) });
    } else if (a === 'erde') {
      himmelLand(C.himmel[0], C.himmel[1], C.berge, C.boden, P.gelb);
    } else if (a === 'abend') {
      E.push({ par: 0, svg: `<defs>${verlauf(id + 'g', [[0, C.abend[0]], [0.4, C.abend[1]], [0.68, C.abend[2]], [1, C.abend[2]]])}</defs><rect x="${X0}" y="${Y0}" width="${3 * W}" height="${2 * H}" fill="url(#${id}g)"/>` });
      const sx = W * 0.5, sy = gy - H * 0.06, sr = H * 0.13;
      E.push({ par: 0.05, svg: [2.4, 1.7, 1.25].map((k, i) => `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(sr * k)}" fill="${rgba('#fff3b0', 0.1 + i * 0.07)}"/>`).join('') + `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(sr)}" fill="#fff0a0"/>` });
      E.push({ par: 0.15, svg: berge(X0, X1, gy, H * 0.3, 9, mische(C.abend[1], C.abend[0], 0.55), rnd) });
      E.push({ par: 0.55, svg: huegel(X0, X1, gy + H * 0.02, H * 0.07, 18, dunkel(C.boden[1], 0.12), rnd, Y1) });
      E.push({ par: 1, svg: huegel(X0, X1, gy + H * 0.035, H * 0.03, 30, dunkel(C.boden[2], 0.14), rnd, Y1) });
    } else if (a === 'wueste') {
      himmelLand(hell(C.himmel[0], 0.02), C.wueste[0], [mische(C.wueste[1], C.himmel[0], 0.45), mische(C.wueste[1], C.himmel[0], 0.25)], [C.wueste[1], C.wueste[2], dunkel(C.wueste[2], 0.08)], P.gelb);
    } else if (a === 'dschungel') {
      // wie im Urwald: Berge hinten, grüne Hügel, orange Büsche vorne
      himmelLand(C.urzeit[0], hell(C.urzeit[0], 0.06), [mische(C.urzeit[0], C.urzeit[1], 0.25), mische(C.urzeit[0], C.urzeit[1], 0.5)], [C.urzeit[1], dunkel(C.urzeit[1], 0.05), dunkel(C.urzeit[1], 0.1)], null);
      let busch = '';
      for (let i = 0; i < 16; i++) {
        const bx = X0 + rnd() * 3 * W, br = H * (0.045 + rnd() * 0.045), by = gy + H * 0.005;
        const f = rnd() < 0.7 ? C.urzeit[2] : dunkel(C.urzeit[2], 0.1);
        for (let k = 0; k < 4; k++) busch += `<circle cx="${f1(bx + (k - 1.5) * br * 0.6)}" cy="${f1(by - (k % 2) * br * 0.35)}" r="${f1(br * (0.55 + (k % 2) * 0.15))}" fill="${f}"/>`;
      }
      E.splice(E.length - 1, 0, { par: 0.8, svg: busch }); // hinter dem vorderen Hügel
    } else if (a === 'schnee') {
      himmelLand(C.schnee[0], C.schnee[2], [hell(C.schnee[0], 0.08), C.schnee[2]], [C.schnee[1], C.schnee[2], hell(C.schnee[2], 0.04)], P.gelb);
    } else if (a === 'zimmer') {
      const [wand, wand2, boden] = C.zimmer;
      let s = voll(wand) + `<rect x="${X0}" y="${f1(gy - H * 0.06)}" width="${3 * W}" height="${f1(H * 0.06)}" fill="${wand2}"/>`;
      for (let x = X0; x < X1; x += W * 0.16) s += `<rect x="${f1(x)}" y="${Y0}" width="${f1(W * 0.08)}" height="${f1(gy - H * 0.06 - Y0)}" fill="${rgba(hell(wand, 0.05), 0.6)}"/>`;
      // Fenster
      const fx = W * 0.62, fy = H * 0.12, fb = W * 0.22, fh = H * 0.34;
      s += `<rect x="${f1(fx - 12)}" y="${f1(fy - 12)}" width="${f1(fb + 24)}" height="${f1(fh + 24)}" rx="${f1(14 * stil.form.rund)}" fill="${dunkel(wand2, 0.08)}"/><rect x="${f1(fx)}" y="${f1(fy)}" width="${f1(fb)}" height="${f1(fh)}" rx="${f1(8 * stil.form.rund)}" fill="${C.himmel[0]}"/>` + wolkenForm(fx + fb * 0.35, fy + fh * 0.45, fh * 0.16, '#ffffff', null) + `<rect x="${f1(fx + fb / 2 - 6)}" y="${f1(fy)}" width="12" height="${f1(fh)}" fill="${dunkel(wand2, 0.08)}"/>`;
      E.push({ par: 0.6, svg: s });
      E.push({ par: 1, svg: `<rect x="${X0}" y="${f1(gy)}" width="${3 * W}" height="${f1(Y1 - gy)}" fill="${boden}"/>` + Array.from({ length: 24 }, (_, i) => `<rect x="${f1(X0 + i * W / 8)}" y="${f1(gy)}" width="6" height="${f1(Y1 - gy)}" fill="${dunkel(boden, 0.06)}"/>`).join('') });
    } else if (a === 'mikro') {
      const [m1, m2] = C.mikro;
      let s = `<defs><radialGradient id="${id}r" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="${m1}"/><stop offset="1" stop-color="${m2}"/></radialGradient></defs><rect x="${X0}" y="${Y0}" width="${3 * W}" height="${2 * H}" fill="url(#${id}r)"/>`;
      E.push({ par: 0, svg: s });
      let b = '';
      for (let i = 0; i < 18 + Fm.details * 6; i++) { const x = X0 + rnd() * 3 * W, y = Y0 + rnd() * 2 * H, r = H * (0.02 + rnd() * 0.08); b += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${rgba(dunkel(m2, 0.05), 0.35)}"/><circle cx="${f1(x - r * 0.25)}" cy="${f1(y - r * 0.25)}" r="${f1(r * 0.45)}" fill="${rgba(hell(m1, 0.05), 0.5)}"/>`; }
      E.push({ par: 0.3, svg: `<g class="treiben">${b}</g>` });
    } else if (a === 'tafel') {
      const [t1, t2] = C.tafel;
      let s = voll(t1);
      for (let x = X0; x < X1; x += W / 24) s += `<rect x="${f1(x)}" y="${Y0}" width="2" height="${2 * H}" fill="${rgba('#ffffff', 0.05)}"/>`;
      for (let y = Y0; y < Y1; y += W / 24) s += `<rect x="${X0}" y="${f1(y)}" width="${3 * W}" height="2" fill="${rgba('#ffffff', 0.05)}"/>`;
      s += `<rect x="${X0}" y="${f1(H * 0.93)}" width="${3 * W}" height="${f1(H)}" fill="${t2}"/>`;
      E.push({ par: 0.2, svg: s });
    } else if (a === 'weiss') {
      let s = voll('#f6f4ee');
      for (let i = 0; i < 6; i++) s += `<circle cx="${f1(X0 + rnd() * 3 * W)}" cy="${f1(rnd() * H)}" r="${f1(H * (0.15 + rnd() * 0.25))}" fill="${rgba(Object.values(P)[i % 8], 0.07)}"/>`;
      E.push({ par: 0.1, svg: s });
    } else if (a === 'meer') {
      const [m0, m1, m2] = C.meer;
      E.push({ par: 0, svg: `<defs>${verlauf(id + 'g', [[0, m0], [0.55, m1], [1, m2]])}</defs><rect x="${X0}" y="${Y0}" width="${3 * W}" height="${2 * H}" fill="url(#${id}g)"/>` });
      let st = '';
      for (let i = 0; i < 7; i++) { const x = X0 + W + (i / 7) * W * 1.1; st += `<path d="M${f1(x)} ${Y0} L${f1(x + W * 0.05)} ${Y0} L${f1(x + W * 0.2)} ${f1(Y1)} L${f1(x + W * 0.1)} ${f1(Y1)} Z" fill="${rgba('#ffffff', 0.05)}"/>`; }
      E.push({ par: 0.1, svg: `<g class="treiben">${st}</g>` });
      E.push({ par: 1, svg: huegel(X0, X1, H * 0.9, H * 0.03, 30, mische(P.gelb, m2, 0.35), rnd, Y1) });
    }
    return E;
  };

  // ---------- Objekte ----------
  // Jede Funktion bekommt das Objekt o, den Stil und eine eindeutige id und liefert { k, svg }:
  // k = halbe Kantenlänge der Zeichenfläche in Vielfachen von o.r, svg = Inhalt im Bereich -k..k (Radius 1 = o.r).
  const OB = {};
  const SF = (stil, f, d) => HF.stilFarbe(stil, f || d);

  OB.stern = (o, stil, id) => {
    const f = SF(stil, o.farbe, '#ffe27a'), g = stil.form.glow;
    const ringe = [3, 2.2, 1.6].map((k, i) => `<circle r="${k}" fill="${rgba(hell(f, 0.06), (0.06 + i * 0.06) * (0.5 + g))}"/>`).join('');
    return { k: 3, svg: `<g class="glimmen">${ringe}</g><circle r="1" fill="${f}"/><circle r="0.78" cx="-0.12" cy="-0.12" fill="${hell(f, 0.12)}"/><circle r="0.3" cx="-0.36" cy="-0.36" fill="${rgba('#ffffff', 0.55)}"/>` };
  };

  OB.planet = (o, stil, id) => {
    const P = stil.palette;
    const ART = { erde: [P.blau, P.gruen], mond: ['#b9c1d6', '#8f99b3'], mars: [P.orange, dunkel(P.orange, 0.15)], jupiter: ['#f0c99a', '#c98d5c'], venus: ['#ffd99a', '#f0b060'], eis: ['#d8f0ff', '#a8d4ff'] };
    let [a, b] = ART[o.art] || ART.erde;
    if (o.farbe) { a = SF(stil, o.farbe); b = dunkel(a, 0.12); }
    const rnd = zufall(BF.hash ? BF.hash(o.name) : 11);
    let land = '';
    if (o.art === 'jupiter') for (let i = -4; i <= 4; i++) land += `<rect x="-1.2" y="${f3(i * 0.22)}" width="2.4" height="0.12" fill="${i % 2 ? b : hell(a, 0.04)}"/>`;
    else if (o.art === 'mond') for (let i = 0; i < 7; i++) { const x = (rnd() - 0.5) * 1.5, y = (rnd() - 0.5) * 1.5, r = 0.08 + rnd() * 0.18; land += `<circle cx="${f3(x)}" cy="${f3(y)}" r="${f3(r)}" fill="${b}"/><circle cx="${f3(x + r * 0.2)}" cy="${f3(y + r * 0.2)}" r="${f3(r * 0.7)}" fill="${dunkel(b, 0.05)}"/>`; }
    else for (let i = 0; i < 6; i++) { const x = (rnd() - 0.5) * 1.6, y = (rnd() - 0.5) * 1.4, r = 0.2 + rnd() * 0.28; for (let k = 0; k < 3; k++) land += `<circle cx="${f3(x + (k - 1) * r * 0.7)}" cy="${f3(y + (k % 2) * r * 0.3)}" r="${f3(r * (0.6 + (k % 2) * 0.25))}" fill="${b}"/>`; }
    const pole = o.art === 'erde' ? `<rect x="-1" y="-1" width="2" height="0.2" fill="#ffffff"/><rect x="-1" y="0.82" width="2" height="0.2" fill="#ffffff"/>` : '';
    const atmo = o.art === 'erde' ? `<circle r="1.12" fill="${rgba(hell(P.blau, 0.2), 0.25 * (0.6 + stil.form.glow))}"/>` : '';
    return {
      k: 1.25,
      svg: `<defs><clipPath id="${id}c"><circle r="1"/></clipPath></defs>${atmo}<g clip-path="url(#${id}c)"><circle r="1" fill="${a}"/><g class="drehen">${land}</g>${pole}<g class="schatten"><path d="M0 -1.05 A1.05 1.05 0 0 1 0 1.05 A0.5 1.05 0 0 0 0 -1.05 Z" fill="${rgba(dunkel(a, 0.3), 0.5)}"/><circle cx="-0.5" cy="-0.35" r="0.32" fill="${rgba('#ffffff', 0.12)}"/></g></g>`,
    };
  };

  OB.form = (o, stil, id) => {
    const f = SF(stil, o.farbe, '#4a8cff'), L = hell(f, 0.1), D = dunkel(f, 0.14), R = 0.12 + 0.18 * stil.form.rund;
    const poly = (n, r, rot = -Math.PI / 2, innen = null) => { let p = []; const m = innen ? n * 2 : n; for (let i = 0; i < m; i++) { const a = rot + i * 2 * Math.PI / m, rr = innen && i % 2 ? innen : r; p.push(`${f3(Math.cos(a) * rr)},${f3(Math.sin(a) * rr)}`); } return p.join(' '); };
    const gl = `<path d="M-0.55 -0.55 Q-0.45 -0.8 -0.1 -0.82" stroke="${rgba('#ffffff', 0.5)}" stroke-width="0.1" stroke-linecap="round" fill="none"/>`;
    let s;
    switch (o.art) {
      case 'quadrat': s = `<rect x="-1" y="-1" width="2" height="2" rx="${R}" fill="${f}"/><rect x="-1" y="0.35" width="2" height="0.65" rx="${R}" fill="${D}"/><rect x="-1" y="0.2" width="2" height="0.3" fill="${f}"/>${gl}`; break;
      case 'rechteck': s = `<rect x="-1.5" y="-0.8" width="3" height="1.6" rx="${R}" fill="${f}"/><rect x="-1.5" y="0.3" width="3" height="0.5" rx="${R}" fill="${D}"/><rect x="-1.5" y="0.2" width="3" height="0.25" fill="${f}"/>`; break;
      case 'dreieck': s = `<polygon points="0,-1.1 1.15,0.9 -1.15,0.9" fill="${f}" stroke="${f}" stroke-width="${R}" stroke-linejoin="round"/><polygon points="0,-1.1 1.15,0.9 0,0.9" fill="${D}" stroke="${D}" stroke-width="${R}" stroke-linejoin="round"/>`; break;
      case 'sechseck': s = `<polygon points="${poly(6, 1, 0)}" fill="${f}" stroke="${f}" stroke-width="${R}" stroke-linejoin="round"/><polygon points="${poly(6, 0.62, 0)}" fill="${L}"/>`; break;
      case 'stern': s = `<polygon points="${poly(5, 1.05, -Math.PI / 2, 0.48)}" fill="${f}" stroke="${f}" stroke-width="${R}" stroke-linejoin="round"/><polygon points="0,0 ${poly(5, 1.05, -Math.PI / 2, 0.48).split(' ').slice(0, 4).join(' ')}" fill="${L}"/>`; break;
      case 'wuerfel': s = `<polygon points="-1,-0.5 0,-1 1,-0.5 0,0" fill="${L}"/><polygon points="-1,-0.5 0,0 0,1.1 -1,0.6" fill="${f}"/><polygon points="1,-0.5 0,0 0,1.1 1,0.6" fill="${D}"/>`; break;
      case 'kugel': s = `<circle r="1" fill="${f}"/><path d="M1 0 A1 1 0 0 1 -1 0 A1.1 0.6 0 0 0 1 0 Z" fill="${D}"/><circle cx="-0.38" cy="-0.38" r="0.3" fill="${L}"/><circle cx="-0.45" cy="-0.45" r="0.12" fill="${rgba('#ffffff', 0.7)}"/>`; break;
      default: s = `<circle r="1" fill="${f}"/><path d="M0.95 0.3 A1 1 0 0 1 -0.95 0.3 A1.2 0.7 0 0 0 0.95 0.3 Z" fill="${D}"/><circle cx="-0.4" cy="-0.4" r="0.18" fill="${rgba('#ffffff', 0.55)}"/>`;
    }
    return { k: 1.7, svg: s };
  };

  OB.apfel = (o, stil, id) => {
    const f = SF(stil, o.farbe, '#e8412a'), D = dunkel(f, 0.12), P = stil.palette;
    return { k: 1.4, svg: `<path d="M0 -0.55 C0.55 -1 1.15 -0.6 1.05 0.15 C0.98 0.75 0.5 1.05 0 0.88 C-0.5 1.05 -0.98 0.75 -1.05 0.15 C-1.15 -0.6 -0.55 -1 0 -0.55 Z" fill="${f}"/><path d="M0 0.88 C0.5 1.05 0.98 0.75 1.05 0.15 C0.9 0.6 0.5 0.75 0 0.62 Z" fill="${D}"/><ellipse cx="-0.5" cy="-0.2" rx="0.14" ry="0.26" transform="rotate(25 -0.5 -0.2)" fill="${rgba('#ffffff', 0.5)}"/><path d="M0 -0.55 Q0.04 -0.95 0.2 -1.15" stroke="${P.braun}" stroke-width="0.13" stroke-linecap="round" fill="none"/><path d="M0.12 -0.92 Q0.5 -1.25 0.8 -0.98 Q0.45 -0.75 0.12 -0.92 Z" fill="${P.gruen}"/>` };
  };

  OB.wolke = (o, stil, id) => {
    const w = '#ffffff', sch = mische('#ffffff', stil.hg.himmel[0], 0.35);
    let regen = '';
    if (o.regen) { for (let i = 0; i < 9; i++) regen += `<rect class="tropfen" x="${f3(-0.75 + i * 0.19)}" y="${f3(0.45 + (i % 3) * 0.25)}" width="0.06" height="0.22" rx="0.03" fill="${stil.palette.blau}"/>`; }
    return { k: 1.6, svg: `<g class="regen">${regen}</g>` + wolkenForm(0, 0, 1, w, sch) };
  };

  // Figur im Flat-Look: großer runder Kopf, Bohnen-Körper, kurze Beine. Ursprung = Füße, Höhe 1 = o.r
  OB.kind = (o, stil, id) => {
    const f = SF(stil, o.farbe, '#e85a3a'), D = dunkel(f, 0.12), P = stil.palette;
    const haut = '#f6c39b', hautD = '#e6a77e', haar = '#4a2c1c', hose = mische(P.schwarz, P.blau, 0.35);
    const kr = 0.2 + 0.05 * stil.form.rund; // Kopfradius (jüngere Zielgruppe = größerer Kopf)
    const ky = -0.72 - kr * 0.9;
    const bein = (x, cls) => `<g class="bein ${cls}" transform="translate(${x} -0.3)"><rect x="-0.045" y="0" width="0.09" height="0.29" rx="0.045" fill="${hose}"/><ellipse cx="${x < 0 ? -0.02 : 0.02}" cy="0.29" rx="0.075" ry="0.04" fill="${P.schwarz}"/></g>`;
    const arm = (x, cls) => `<g class="arm ${cls}" transform="translate(${x} -0.66)"><rect x="-0.04" y="0" width="0.08" height="0.3" rx="0.04" fill="${D}"/><circle cx="0" cy="0.31" r="0.045" fill="${haut}"/></g>`;
    return {
      k: 1.25,
      svg: `<ellipse cx="0" cy="0" rx="0.24" ry="0.035" fill="rgba(0,0,0,0.18)"/>`
        + bein(-0.075, 'l') + bein(0.075, 'r') + arm(-0.18, 'l') + arm(0.18, 'r')
        + `<path d="M-0.17 -0.3 L-0.18 -0.6 Q-0.18 -0.74 0 -0.74 Q0.18 -0.74 0.18 -0.6 L0.17 -0.3 Q0 -0.26 -0.17 -0.3 Z" fill="${f}"/>`
        + `<path d="M0.05 -0.74 Q0.18 -0.74 0.18 -0.6 L0.17 -0.3 Q0.1 -0.28 0.05 -0.285 Z" fill="${D}"/>`
        + `<rect x="-0.035" y="-0.79" width="0.07" height="0.08" fill="${hautD}"/>`
        + `<g class="kopf"><circle cx="0" cy="${f3(ky)}" r="${f3(kr)}" fill="${haut}"/>`
        + `<path d="M${f3(-kr)} ${f3(ky)} A${f3(kr)} ${f3(kr)} 0 0 1 ${f3(kr)} ${f3(ky)} Q${f3(kr * 0.5)} ${f3(ky - kr * 0.45)} ${f3(-kr * 0.2)} ${f3(ky - kr * 0.3)} Q${f3(-kr * 0.7)} ${f3(ky - kr * 0.2)} ${f3(-kr)} ${f3(ky + kr * 0.15)} Z" fill="${haar}"/>`
        + `<g class="augen">${[-1, 1].map(sg => `<ellipse cx="${f3(sg * kr * 0.36)}" cy="${f3(ky + kr * 0.12)}" rx="${f3(kr * 0.11)}" ry="${f3(kr * 0.15)}" fill="${P.schwarz}"/><circle cx="${f3(sg * kr * 0.36 + kr * 0.04)}" cy="${f3(ky + kr * 0.06)}" r="${f3(kr * 0.045)}" fill="#fff"/>`).join('')}</g>`
        + [-1, 1].map(sg => `<circle cx="${f3(sg * kr * 0.62)}" cy="${f3(ky + kr * 0.42)}" r="${f3(kr * 0.13)}" fill="${rgba(P.rot, 0.35)}"/>`).join('')
        + `<path d="M${f3(-kr * 0.22)} ${f3(ky + kr * 0.42)} Q0 ${f3(ky + kr * 0.68)} ${f3(kr * 0.22)} ${f3(ky + kr * 0.42)}" stroke="${dunkel(hautD, 0.25)}" stroke-width="${f3(kr * 0.09)}" stroke-linecap="round" fill="none"/></g>`,
    };
  };

  // ---------- Blickrichtung von Bildzeichen ----------
  // Twemoji (und die meisten Emoji-Schriften) zeigen Fahrzeuge und Tiere von der Seite, fast alle nach links.
  // Bewegt sich so ein Zeichen nach rechts, wird es gespiegelt, damit das Auto nicht rückwärts fährt.
  const NACH_LINKS = new Set([...'🚗🚕🚙🚌🚎🚓🚑🚒🚐🛻🚚🚛🚜🏎🚲🛴🛵🏍🛺🚂🚃🚄🚅🚈🚝🚞🚋🚁🛶🚤🛥🛳⛴🚢🐕🐩🦮🐕‍🦺🐈🐈‍⬛🐄🐂🐃🐖🐗🐑🐏🐐🐇🐢🐌🐟🐠🐡🐬🐳🐋🦈🐊🦖🦕🐘🦣🦏🦛🦒🦓🐒🦍🦧🦆🐦🦅🐛🐜🚶🏃🐁🐀🐿🦫🐅🐆🐫🐪🦘🦙🐓🐤🐥🦜🦢🦩🦚🦤🐧🦭🦗🐉🦄🐾🦼🦽🛷']);
  const NACH_RECHTS = new Set([...'✈🛩🚀🐎🏇']);
  HF.symbolBlick = function (text) {
    const g = [...String(text || '').replace(/️/g, '')];
    if (!g.length) return 0;
    const z = g[0];
    return NACH_LINKS.has(z) ? -1 : NACH_RECHTS.has(z) ? 1 : 0; // -1 = schaut nach links, 1 = nach rechts, 0 = egal
  };
  // Spiegelung (1 oder -1) eines Bildzeichens zur Zeit t: es schaut in die Richtung, in die es sich zuletzt bewegt hat
  HF.symbolSpiegeln = function (F, o, t) {
    const blick = o._blick ?? (o._blick = HF.symbolBlick(o.text));
    if (!blick) return 1;
    let richtung = 0;
    for (const sg of o.segs || []) {
      if (sg.t0 > t) break;
      if (sg.typ === 'zu' && Math.abs(sg.zu[0] - sg.von[0]) > 0.01) richtung = Math.sign(sg.zu[0] - sg.von[0]);
      if (sg.typ === 'kreis' && BF.w2dIntern) { const a = BF.w2dIntern.pos(F, o, t), b = BF.w2dIntern.pos(F, o, Math.max(o.t0, t - 0.05)); if (Math.abs(a[0] - b[0]) > 1e-4) richtung = Math.sign(a[0] - b[0]); }
    }
    return richtung && richtung !== blick ? -1 : 1;
  };

  HF.objektGrafik = OB;
  // Welche Objekte HyperFrames selbst zeichnet (der Rest kommt vorerst aus dem alten Zeichner)
  HF.portiert = o => {
    if (!OB[o.typ] && !(o.typ === 'zahl')) return false;
    if (o.farben && o.farben.length > 1 && o.typ !== 'baum') return false; // Farbwechsel (faerbe2d) kann nur der Baum
    if (o.kollaps || o.drehPer) return false;
    return true;
  };
})();
