// Blockfilm – Urzeit: Dinosaurier, Urzeit-Pflanzen, Vulkane, Asteroid, Zeitleiste der Erdzeitalter, Urkontinente
// Wird nach welt2d.js geladen und hängt sich mit eigenen Befehlen und Zeichnungen an.
(function () {
  const BF = window.BF;
  const Z = BF.zusatz;
  const H = BF.w2dHelfer;
  const { w2d, nameOder, punkt, neuesObjekt, naturFarbe, pos, clamp, sanft } = H;
  BF.zeichne2d = BF.zeichne2d || {};
  BF.hintergruende2d = BF.hintergruende2d || {};

  // ---------- Farben ----------
  function hexZuRgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function schatt(h, f) { const [r, g, b] = hexZuRgb(h); const k = v => Math.round(clamp(f >= 1 ? v + (255 - v) * (f - 1) : v * f, 0, 255)); return `rgb(${k(r)},${k(g)},${k(b)})`; }

  // ---------- Dinosaurier ----------
  // Alle Maße in "Körperhöhen" (1 = groesse). x nach vorne, y nach oben, 0 0 = Boden unter der Körpermitte.
  const DINOS = {
    trex: { name: 'T-Rex', farbe: '#5f8a3c', zwei: true, fleisch: true,
      koerper: [0, 0.56, 0.4, 0.22, 0.18], hals: [[0.28, 0.66], [0.46, 0.8], 0.17], kopf: [0.62, 0.84, 0.24, 0.13], schwanz: [[-0.3, 0.6, 0.17], [-0.7, 0.55, 0.1], [-1.1, 0.46, 0]],
      bein: [-0.04, 0.5, 0.02, 0.15], arm: [[0.3, 0.52], [0.4, 0.44], 0.035] },
    allosaurus: { name: 'Allosaurus', farbe: '#a0603a', zwei: true, fleisch: true, augenbraue: true,
      koerper: [0, 0.55, 0.38, 0.2, 0.15], hals: [[0.28, 0.63], [0.45, 0.76], 0.14], kopf: [0.6, 0.78, 0.21, 0.11], schwanz: [[-0.3, 0.58, 0.15], [-0.7, 0.52, 0.08], [-1.1, 0.44, 0]],
      bein: [-0.04, 0.49, 0.02, 0.13], arm: [[0.28, 0.5], [0.42, 0.38], 0.045] },
    raptor: { name: 'Velociraptor', farbe: '#a8743c', zwei: true, fleisch: true, federn: '#6a4a8a',
      koerper: [0, 0.5, 0.3, 0.14, 0.1], hals: [[0.22, 0.56], [0.36, 0.72], 0.08], kopf: [0.47, 0.75, 0.15, 0.07], schwanz: [[-0.24, 0.52, 0.09], [-0.7, 0.55, 0.04], [-1.05, 0.56, 0]],
      bein: [-0.02, 0.44, 0.04, 0.08], arm: [[0.22, 0.48], [0.38, 0.36], 0.035] },
    spinosaurus: { name: 'Spinosaurus', farbe: '#6a7c9c', zwei: true, fleisch: true, segel: '#d8704a', krokodil: true,
      koerper: [0, 0.56, 0.42, 0.2, 0.1], hals: [[0.3, 0.62], [0.5, 0.74], 0.14], kopf: [0.7, 0.76, 0.3, 0.08], schwanz: [[-0.32, 0.58, 0.15], [-0.75, 0.5, 0.09], [-1.15, 0.4, 0]],
      bein: [-0.04, 0.5, 0.02, 0.14], arm: [[0.3, 0.5], [0.42, 0.4], 0.05] },
    klein: { name: 'früher Dinosaurier', farbe: '#9aa448', zwei: true, fleisch: true,
      koerper: [0, 0.5, 0.28, 0.13, 0.1], hals: [[0.2, 0.55], [0.36, 0.76], 0.07], kopf: [0.45, 0.8, 0.14, 0.065], schwanz: [[-0.24, 0.52, 0.08], [-0.65, 0.5, 0.04], [-1.0, 0.46, 0]],
      bein: [-0.02, 0.44, 0.03, 0.07], arm: [[0.2, 0.46], [0.32, 0.36], 0.03] },
    plateosaurus: { name: 'Plateosaurus', farbe: '#b08a5a', zwei: true,
      koerper: [0, 0.52, 0.36, 0.2, 0.08], hals: [[0.28, 0.6], [0.48, 0.92], 0.1], kopf: [0.56, 0.95, 0.11, 0.065], schwanz: [[-0.3, 0.54, 0.14], [-0.7, 0.46, 0.08], [-1.1, 0.36, 0]],
      bein: [-0.04, 0.46, 0.02, 0.12], arm: [[0.28, 0.5], [0.38, 0.3], 0.045] },
    parasaurolophus: { name: 'Parasaurolophus', farbe: '#5a8ab8', zwei: true, kamm: '#e0a040',
      koerper: [0, 0.55, 0.4, 0.22, 0.05], hals: [[0.3, 0.64], [0.46, 0.82], 0.12], kopf: [0.56, 0.86, 0.15, 0.08], schwanz: [[-0.35, 0.58, 0.15], [-0.75, 0.5, 0.08], [-1.1, 0.42, 0]],
      bein: [-0.04, 0.48, 0.02, 0.14], arm: [[0.3, 0.5], [0.4, 0.3], 0.05] },
    langhals: { name: 'Brachiosaurus', farbe: '#7c90a4', vier: true,
      koerper: [0, 0.44, 0.44, 0.2, 0.12], hals: [[0.32, 0.54], [0.62, 1.05], 0.12], kopf: [0.68, 1.08, 0.11, 0.065], schwanz: [[-0.38, 0.44, 0.13], [-0.8, 0.34, 0.07], [-1.15, 0.24, 0]],
      vorne: [0.28, 0.4, 0.3, 0.1], hinten: [-0.26, 0.38, -0.25, 0.11] },
    diplodocus: { name: 'Diplodocus', farbe: '#8c9c66', vier: true,
      koerper: [0, 0.42, 0.42, 0.18, 0.0], hals: [[0.34, 0.48], [0.95, 0.72], 0.1], kopf: [1.02, 0.73, 0.1, 0.055], schwanz: [[-0.38, 0.44, 0.12], [-0.95, 0.36, 0.06], [-1.6, 0.2, 0]],
      vorne: [0.26, 0.36, 0.27, 0.09], hinten: [-0.24, 0.38, -0.24, 0.1] },
    triceratops: { name: 'Triceratops', farbe: '#b8743c', vier: true, horn: true,
      koerper: [0, 0.4, 0.44, 0.24, 0], kopf: [0.56, 0.4, 0.2, 0.14], schwanz: [[-0.42, 0.42, 0.13], [-0.85, 0.3, 0]],
      vorne: [0.24, 0.3, 0.26, 0.11], hinten: [-0.26, 0.3, -0.26, 0.12] },
    stegosaurus: { name: 'Stegosaurus', farbe: '#6a9c58', vier: true, platten: '#e0783c',
      koerper: [-0.04, 0.42, 0.44, 0.24, -0.05], hals: [[0.32, 0.38], [0.5, 0.26], 0.09], kopf: [0.57, 0.24, 0.11, 0.065], schwanz: [[-0.45, 0.42, 0.12], [-0.85, 0.36, 0.05], [-1.08, 0.32, 0]],
      vorne: [0.28, 0.3, 0.3, 0.085], hinten: [-0.26, 0.36, -0.26, 0.12] },
    ankylosaurus: { name: 'Ankylosaurus', farbe: '#8c7c58', vier: true, panzer: true,
      koerper: [0, 0.33, 0.5, 0.19, 0], kopf: [0.56, 0.3, 0.13, 0.09], schwanz: [[-0.5, 0.32, 0.1], [-0.95, 0.28, 0.035]],
      vorne: [0.3, 0.22, 0.31, 0.085], hinten: [-0.3, 0.22, -0.3, 0.095] },
    dimetrodon: { name: 'Dimetrodon', farbe: '#8c5c4c', vier: true, segel: '#c87a4a', fleisch: true, flach: true,
      koerper: [0, 0.26, 0.42, 0.13, 0], kopf: [0.52, 0.28, 0.17, 0.08], schwanz: [[-0.4, 0.26, 0.09], [-0.85, 0.16, 0.04], [-1.15, 0.08, 0]],
      vorne: [0.26, 0.2, 0.32, 0.07], hinten: [-0.26, 0.2, -0.32, 0.075] },
    urvogel: { name: 'Archaeopteryx', farbe: '#5c6c90', zwei: true, vogel: true, federn: '#3c8a8a',
      koerper: [0, 0.46, 0.22, 0.15, 0.25], hals: [[0.15, 0.55], [0.26, 0.68], 0.07], kopf: [0.32, 0.72, 0.1, 0.07], schwanz: [[-0.18, 0.44, 0.06], [-0.55, 0.38, 0.03], [-0.8, 0.34, 0]],
      bein: [0, 0.36, 0.03, 0.05], arm: [[0.1, 0.5], [0.02, 0.3], 0.03] },
    mammut: { name: 'Mammut', farbe: '#7c4c2c', vier: true, mammut: true,
      koerper: [0, 0.55, 0.42, 0.3, 0.05], kopf: [0.42, 0.72, 0.2, 0.22], schwanz: [[-0.42, 0.62, 0.04], [-0.55, 0.42, 0]],
      vorne: [0.24, 0.42, 0.25, 0.12], hinten: [-0.24, 0.42, -0.24, 0.12] },
  };
  BF.DINO_ARTEN = DINOS; // auch für den HyperFrames-Zeichner (hf/grafik.js)
  const SCHWIMMER = ['plesiosaurus', 'ichthyosaurus', 'mosasaurus', 'flugsaurier', 'trilobit', 'fisch', 'qualle'];
  const ALLE_ARTEN = Object.keys(DINOS).concat(SCHWIMMER);
  const ALIAS = { tyrannosaurus: 'trex', 't-rex': 'trex', rex: 'trex', velociraptor: 'raptor', brachiosaurus: 'langhals', brontosaurus: 'langhals', langhalssaurier: 'langhals', archaeopteryx: 'urvogel', pteranodon: 'flugsaurier', ichthyo: 'ichthyosaurus', plesio: 'plesiosaurus', mosa: 'mosasaurus', coelophysis: 'klein', eoraptor: 'klein', parasaurus: 'parasaurolophus', anky: 'ankylosaurus', stego: 'stegosaurus', trice: 'triceratops' };

  Z.dino2d = Z.saurier2d = Z.tier2d = function (w, t, h) {
    const F = h.F;
    let art = BF.norm(w.optWort(['art', 'als'], 'trex'));
    art = ALIAS[art] || art;
    if (!ALLE_ARTEN.includes(art)) throw new Error('Dinosaurier-Arten: ' + ALLE_ARTEN.join(', '));
    const gr = w.optZahl(['groesse'], 10);
    const fw = w.optWort(['farbe']);
    const FLAGS = ['links', 'skelett', 'knochen', 'fossil', 'baby', 'jung'];
    const name = w.pk() && !FLAGS.includes(BF.norm(w.pk())) ? nameOder(w, art + Object.keys(w2d(F).obj).length) : art + Object.keys(w2d(F).obj).length;
    const links = w.flag(['links']);
    const skelett = w.flag(['skelett', 'knochen', 'fossil']);
    const baby = w.flag(['baby', 'jung']);
    const p = punkt(w);
    const def = DINOS[art];
    neuesObjekt(F, { typ: 'dino', name, t0: t, p, r: gr, art, farbe: fw ? naturFarbe(h, fw, null) : def ? def.farbe : null, dir: links ? -1 : 1, blick: [], bruell: [], skelett, baby });
    return 0;
  };
  Z.bruelle2d = Z.bruellen2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'dino') throw new Error('So: bruelle2d rex');
    o.bruell.push(t);
    h.ton(t, o.r < 6 || o.baby ? 'quieken' : 'bruellen', { vol: clamp(o.r / 12, 0.4, 1) });
    return 0;
  };
  Z.blick2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'dino') throw new Error('So: blick2d rex links');
    const links = w.flag(['links']); w.flag(['rechts']);
    o.blick.push({ t, dir: links ? -1 : 1 });
    return 0;
  };

  // kleine Helfer zum Zeichnen in Körper-Einheiten (y nach oben)
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rot || 0, 0, Math.PI * 2); }
  function strich(ctx, a, b, dicke, farbe) { ctx.strokeStyle = farbe; ctx.lineWidth = dicke; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  function schwanzForm(ctx, pts, wackel) {
    // spitz zulaufender Schwanz aus Punkten [x, y, dicke]
    const P = pts.map((q, i) => [q[0], q[1] + (i ? Math.sin(wackel + i) * 0.02 * i : 0), q[2]]);
    const oben = [], unten = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      oben.push([P[i][0] + nx * P[i][2] / 2, P[i][1] + ny * P[i][2] / 2]); unten.push([P[i][0] - nx * P[i][2] / 2, P[i][1] - ny * P[i][2] / 2]);
    }
    ctx.beginPath(); ctx.moveTo(oben[0][0], oben[0][1]);
    for (let i = 1; i < oben.length; i++) { const m = oben[i - 1]; ctx.quadraticCurveTo(m[0], m[1], (m[0] + oben[i][0]) / 2, (m[1] + oben[i][1]) / 2); ctx.lineTo(oben[i][0], oben[i][1]); }
    for (let i = unten.length - 1; i >= 0; i--) ctx.lineTo(unten[i][0], unten[i][1]);
    ctx.closePath();
    return P;
  }
  function auge(ctx, x, y, gr, boese) {
    ctx.fillStyle = '#ffffff'; ell(ctx, x, y, gr, gr); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ell(ctx, x + gr * 0.25, y, gr * 0.55, gr * 0.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; ell(ctx, x + gr * 0.4, y + gr * 0.25, gr * 0.18, gr * 0.18); ctx.fill();
    if (boese) { ctx.strokeStyle = '#2a2a1a'; ctx.lineWidth = gr * 0.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - gr * 1.1, y + gr * 1.3); ctx.lineTo(x + gr * 1.2, y + gr * 0.8); ctx.stroke(); }
  }

  function dinoZeichnen(ctx, o, sx, sy, r, t, s, E, F, p) {
    const art = o.art;
    if (SCHWIMMER.includes(art)) return schwimmerZeichnen(ctx, o, sx, sy, r, t, E, F, p);
    const D = DINOS[art];
    // Blickrichtung: eingestellt, oder automatisch in Laufrichtung
    let dir = o.dir;
    for (const b of o.blick) if (t >= b.t) dir = b.dir;
    const pv = pos(F, o, Math.max(o.t0, t - 0.08));
    const dx = p[0] - pv[0];
    const laeuft = Math.abs(dx) > 0.01;
    if (laeuft) dir = dx > 0 ? 1 : -1;
    const ph = laeuft ? t * 9 : 0;
    // Brüllen: Maul auf, kleines Zittern
    let maul = 0;
    for (const b of o.bruell) if (t >= b && t < b + 1.4) maul = Math.sin(clamp((t - b) / 1.4, 0, 1) * Math.PI);
    const atmen = Math.sin(t * 2.2 + o.r) * 0.012;
    const k = D.farbe && o.farbe ? o.farbe : D.farbe;
    const haut = o.skelett ? 'rgba(0,0,0,0)' : k;
    const fern = o.skelett ? 'rgba(0,0,0,0)' : schatt(k, 0.72);
    const bauch = schatt(k, 1.35);
    const knochen = '#efe6d2';
    ctx.save();
    if (o.skelett) { ctx.shadowColor = 'rgba(50,35,20,0.9)'; ctx.shadowBlur = 5 * E; }
    ctx.translate(sx + (maul ? Math.sin(t * 60) * r * 0.004 : 0), sy);
    const gr = o.baby ? r * 0.55 : r;
    ctx.scale(dir * gr, -gr);
    const [kx, ky, krx, kry, krot] = D.koerper;
    const lw = 0.012;
    const kontur = o.skelett ? knochen : 'rgba(0,0,0,0.28)';
    // Beine (hinten = weiter weg, dunkler)
    const fuss = (bx, phase) => [bx + (laeuft ? Math.sin(ph + phase) * 0.07 : 0), laeuft ? Math.max(0, Math.cos(ph + phase)) * 0.05 : 0];
    const beinPaar = (b, phaseA, farbeFern) => {
      for (const [ver, farbe, phase] of [[0.05, farbeFern, phaseA + Math.PI], [0, haut, phaseA]]) {
        const f = fuss(b[2] + ver, phase);
        if (o.skelett) { strich(ctx, [b[0] + ver, b[1]], f, 0.025, knochen); continue; }
        strich(ctx, [b[0] + ver, b[1]], [f[0], f[1] + b[3] * 0.4], b[3], farbe);
        ctx.fillStyle = farbe; ell(ctx, f[0] + 0.02, f[1] + b[3] * 0.25, b[3] * 0.7, b[3] * 0.32); ctx.fill();
      }
    };
    const zweiBein = (ver, farbe, phase) => {
      const [hx, hy, fx, dicke] = D.bein;
      const f = fuss(fx + ver, phase);
      if (o.skelett) { strich(ctx, [hx + ver, hy], [hx + ver + 0.05, hy * 0.5], 0.025, knochen); strich(ctx, [hx + ver + 0.05, hy * 0.5], f, 0.022, knochen); return; }
      ctx.fillStyle = farbe; ell(ctx, hx + ver, hy, dicke * 1.1, dicke * 1.5, 0.3); ctx.fill();
      if (ver === 0) { ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke(); }
      strich(ctx, [hx + ver + 0.03, hy - dicke], [f[0], f[1] + 0.03], dicke * 0.6, farbe);
      ctx.fillStyle = farbe; ell(ctx, f[0] + 0.04, f[1] + 0.02, dicke * 0.7, dicke * 0.25); ctx.fill();
    };
    if (D.zwei) {
      zweiBein(0.05, fern, Math.PI);
    } else {
      beinPaar(D.hinten, 0, fern);
      beinPaar(D.vorne, Math.PI, fern);
    }
    // Schwanz
    ctx.fillStyle = haut;
    const P = schwanzForm(ctx, D.schwanz, t * 1.6);
    if (!o.skelett) { ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke(); }
    else { ctx.strokeStyle = knochen; ctx.lineWidth = 0.02; ctx.beginPath(); P.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); for (let i = 0; i < 10; i++) { const u = i / 10, a = P[0], b = P[P.length - 1]; const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u; strich(ctx, [x, y - 0.03], [x, y + 0.03], 0.012, knochen); } }
    if (D.federn && !o.skelett) { ctx.fillStyle = D.federn; const e = P[P.length - 1], v = P[P.length - 2]; ell(ctx, (e[0] + v[0]) / 2, (e[1] + v[1]) / 2, 0.18, 0.05, Math.atan2(e[1] - v[1], e[0] - v[0])); ctx.fill(); }
    if (D.platten && !o.skelett) { // Stacheln am Schwanzende
      const e = P[P.length - 1];
      for (let i = 0; i < 2; i++) strich(ctx, [e[0] + 0.05 + i * 0.07, e[1] + 0.01], [e[0] - 0.02 + i * 0.1, e[1] + 0.13], 0.025, '#e8dcc0');
    }
    if (D.panzer && !o.skelett) { const e = P[P.length - 1]; ctx.fillStyle = schatt(k, 0.8); ell(ctx, e[0] - 0.04, e[1], 0.09, 0.07); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke(); }
    // Segel (Spinosaurus, Dimetrodon)
    if (D.segel && !o.skelett) {
      ctx.fillStyle = D.segel; ctx.beginPath();
      const n = 7; ctx.moveTo(kx - krx * 0.7, ky + kry * 0.6);
      for (let i = 0; i <= n; i++) { const u = i / n, x = kx - krx * 0.7 + u * krx * 1.4; ctx.lineTo(x, ky + kry * 0.7 + Math.sin(u * Math.PI) * (D.flach ? 0.32 : 0.36)); }
      ctx.lineTo(kx + krx * 0.7, ky + kry * 0.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = schatt(D.segel, 0.7); ctx.lineWidth = 0.008;
      for (let i = 1; i < n; i++) { const u = i / n, x = kx - krx * 0.7 + u * krx * 1.4; strich(ctx, [x, ky + kry * 0.6], [x, ky + kry * 0.7 + Math.sin(u * Math.PI) * (D.flach ? 0.32 : 0.36)], 0.008, schatt(D.segel, 0.7)); }
    }
    // Rückenplatten (Stegosaurus) hinter dem Körper
    if (D.platten && !o.skelett) {
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.2 + i * 0.1), x = kx + Math.cos(a) * krx * 0.95, y = ky + Math.sin(a) * kry * 0.95, gr2 = 0.09 + Math.sin(i / 6 * Math.PI) * 0.08;
        ctx.fillStyle = i % 2 ? D.platten : schatt(D.platten, 0.85);
        ctx.beginPath(); ctx.moveTo(x - gr2 * 0.6, y - 0.02); ctx.lineTo(x, y + gr2 * 1.5); ctx.lineTo(x + gr2 * 0.6, y - 0.02); ctx.closePath(); ctx.fill();
      }
    }
    // Körper
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(krot); ctx.scale(1, 1 + atmen);
    if (o.skelett) {
      ctx.strokeStyle = knochen; ctx.lineWidth = 0.022; ctx.beginPath(); ctx.moveTo(-krx, kry * 0.4); ctx.quadraticCurveTo(0, kry * 0.9, krx, kry * 0.4); ctx.stroke();
      for (let i = 0; i < 9; i++) { const x = -krx * 0.75 + i * krx * 0.19; ctx.lineWidth = 0.014; ctx.beginPath(); ctx.moveTo(x, kry * 0.6); ctx.quadraticCurveTo(x + 0.06, -kry * 0.2, x, -kry * 0.7); ctx.stroke(); }
    } else {
      const g = ctx.createLinearGradient(0, kry, 0, -kry);
      g.addColorStop(0, schatt(k, 1.1)); g.addColorStop(0.6, k); g.addColorStop(1, bauch);
      ctx.fillStyle = g; ell(ctx, 0, 0, krx, kry); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke();
      // Muster: Flecken
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (let i = 0; i < 5; i++) { ell(ctx, -krx * 0.5 + i * krx * 0.25, kry * 0.45, krx * 0.07, kry * 0.12); ctx.fill(); }
      if (D.panzer) { ctx.fillStyle = '#e8dcc0'; for (let i = 0; i < 6; i++) { ctx.beginPath(); const a = Math.PI * (0.15 + i * 0.14), x = Math.cos(a) * krx * 0.97, y = Math.sin(a) * kry * 0.97; ctx.moveTo(x - 0.035, y - 0.01); ctx.lineTo(x + Math.cos(a) * 0.04, y + 0.09); ctx.lineTo(x + 0.035, y - 0.01); ctx.fill(); } ctx.fillStyle = schatt(k, 0.82); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { ell(ctx, -krx * 0.7 + i * krx * 0.28 + j * krx * 0.14, kry * (0.2 + j * 0.45), 0.045, 0.035); ctx.fill(); } }
      if (D.mammut) { ctx.strokeStyle = schatt(k, 0.7); ctx.lineWidth = 0.01; for (let i = 0; i < 26; i++) { const x = -krx * 0.9 + (i % 13) * krx * 0.14, y = (i < 13 ? -0.1 : 0.12) * kry * 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 0.02, y - 0.08); ctx.stroke(); } }
    }
    ctx.restore();
    // Arme (Zweibeiner)
    if (D.arm) {
      const [a, b, d] = D.arm;
      const wink = laeuft ? Math.sin(ph) * 0.03 : 0;
      strich(ctx, a, [b[0], b[1] + wink], o.skelett ? 0.018 : d, o.skelett ? knochen : schatt(k, 0.9));
      if (D.federn && !o.skelett) { ctx.fillStyle = D.federn; ell(ctx, (a[0] + b[0]) / 2 - 0.02, (a[1] + b[1]) / 2 - 0.04, 0.09, 0.035, -0.9); ctx.fill(); }
      if (D.vogel && !o.skelett) { ctx.fillStyle = D.federn; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] - 0.12, b[1] - 0.05); ctx.lineTo(b[0] + 0.05, b[1]); ctx.closePath(); ctx.fill(); }
    }
    if (D.zwei) zweiBein(0, haut, 0);
    // Hals
    let kopf = D.kopf.slice();
    const nick = Math.sin(t * 1.3 + o.r) * 0.012 + (laeuft ? Math.sin(ph * 2) * 0.01 : 0);
    kopf[1] += nick;
    if (D.hals) {
      const [a, b, d] = D.hals;
      const bb = [b[0], b[1] + nick];
      if (o.skelett) {
        ctx.strokeStyle = knochen; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + (bb[0] - a[0]) * 0.2, bb[1], bb[0], bb[1]); ctx.stroke();
      } else {
        ctx.strokeStyle = haut; ctx.lineCap = 'round'; ctx.lineWidth = d;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + (bb[0] - a[0]) * 0.2, bb[1], bb[0], bb[1]); ctx.stroke();
      }
    }
    // Kopf
    const [hx, hy, hrx, hry] = kopf;
    if (D.horn && !o.skelett) { // Nackenschild hinter dem Kopf
      ctx.fillStyle = schatt(k, 0.9); ell(ctx, hx - hrx * 0.7, hy + hry * 0.6, hrx * 0.6, hry * 1.7, -0.4); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke();
      ctx.fillStyle = '#f2e6c8'; for (let i = 0; i < 5; i++) { const a = -0.6 + i * 0.5; ell(ctx, hx - hrx * 0.7 + Math.cos(a + 1.4) * hrx * 0.62, hy + hry * 0.6 + Math.sin(a + 1.4) * hry * 1.7, 0.015, 0.015); ctx.fill(); }
    }
    if (D.kamm && !o.skelett) { strich(ctx, [hx, hy + hry * 0.5], [hx - hrx * 2.2, hy + hry * 2.2], hry * 0.7, D.kamm); }
    if (D.mammut && !o.skelett) {
      // Rüssel und Stoßzähne
      ctx.strokeStyle = haut; ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx + hrx * 0.6, hy - hry * 0.2); ctx.quadraticCurveTo(hx + hrx * 1.2, hy - hry * 1.4, hx + hrx * 0.9 + Math.sin(t * 1.5) * 0.03, hy - hry * 2.6); ctx.stroke();
      ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(hx + hrx * 0.4, hy - hry * 0.6); ctx.quadraticCurveTo(hx + hrx * 2.2, hy - hry * 1.6, hx + hrx * 1.9, hy - hry * 0.2); ctx.stroke();
    }
    if (o.skelett) {
      ctx.strokeStyle = knochen; ctx.lineWidth = 0.018; ell(ctx, hx, hy, hrx, hry); ctx.stroke();
      ctx.fillStyle = knochen; ell(ctx, hx + hrx * 0.25, hy + hry * 0.3, hry * 0.25, hry * 0.25); ctx.stroke();
    } else {
      ctx.fillStyle = haut;
      if (D.fleisch) {
        const auf = maul * 0.5;
        // Unterkiefer
        ctx.save(); ctx.translate(hx - hrx * 0.6, hy - hry * 0.1); ctx.rotate(-auf);
        ctx.fillStyle = schatt(k, 0.85); ell(ctx, hrx * 0.75, -hry * 0.35, hrx * 0.85, hry * 0.42); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke();
        if (maul > 0.05) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const x = hrx * (0.2 + i * 0.28); ctx.beginPath(); ctx.moveTo(x, -hry * 0.05); ctx.lineTo(x + 0.012, hry * 0.1); ctx.lineTo(x + 0.025, -hry * 0.05); ctx.fill(); } }
        ctx.restore();
        if (maul > 0.05) { ctx.fillStyle = '#7a1a1a'; ell(ctx, hx + hrx * 0.1, hy - hry * 0.3, hrx * 0.6, hry * 0.25 + auf * 0.06); ctx.fill(); }
        ctx.fillStyle = haut;
        ell(ctx, hx, hy + hry * 0.1, hrx, hry * 0.75, D.krokodil ? 0 : 0.05); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke();
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const x = hx - hrx * 0.3 + i * hrx * 0.24; ctx.beginPath(); ctx.moveTo(x, hy - hry * 0.55); ctx.lineTo(x + 0.01, hy - hry * 0.78); ctx.lineTo(x + 0.02, hy - hry * 0.55); ctx.fill(); }
        auge(ctx, hx - hrx * 0.2, hy + hry * 0.35, hry * 0.22, D.augenbraue || art === 'trex');
      } else {
        ell(ctx, hx, hy, hrx, hry, 0.05); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = lw; ctx.stroke();
        if (D.horn) {
          for (const [x0, y0, x1, y1, d] of [[hx - hrx * 0.1, hy + hry * 0.6, hx + hrx * 1.1, hy + hry * 1.9, 0.03], [hx + hrx * 0.7, hy + hry * 0.4, hx + hrx * 0.95, hy + hry * 1.0, 0.022]]) {
            ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.moveTo(x0 - d, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0 + d, y0 - d * 0.5); ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = '#6a5a4a'; ctx.beginPath(); ctx.moveTo(hx + hrx * 0.85, hy - hry * 0.1); ctx.lineTo(hx + hrx * 1.25, hy - hry * 0.4); ctx.lineTo(hx + hrx * 0.8, hy - hry * 0.7); ctx.fill();
        }
        // Mund
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(hx + hrx * 0.95, hy - hry * 0.2); ctx.quadraticCurveTo(hx + hrx * 0.4, hy - hry * (0.55 + maul * 0.6), hx - hrx * 0.1, hy - hry * 0.3); ctx.stroke();
        auge(ctx, hx + hrx * 0.15, hy + hry * 0.3, hry * 0.3, false);
      }
    }
    ctx.restore();
  }

  // Meerestiere und Flugsaurier (Position = Körpermitte, sie schweben)
  function schwimmerZeichnen(ctx, o, sx, sy, r, t, E, F, p) {
    let dir = o.dir;
    for (const b of o.blick) if (t >= b.t) dir = b.dir;
    const pv = pos(F, o, Math.max(o.t0, t - 0.08));
    const dx = p[0] - pv[0];
    if (Math.abs(dx) > 0.01) dir = dx > 0 ? 1 : -1;
    const k = o.farbe || { plesiosaurus: '#4a7a9a', ichthyosaurus: '#5a8ab0', mosasaurus: '#3a6a5a', flugsaurier: '#b0784a', trilobit: '#8a6a4a', fisch: '#e8a040', qualle: '#e0a0e0' }[o.art];
    const kontur = 'rgba(0,0,0,0.3)';
    ctx.save(); ctx.translate(sx, sy); ctx.scale(dir * r, -r);
    const wel = Math.sin(t * 3);
    if (o.art === 'flugsaurier') {
      const fl = Math.sin(t * 5);
      for (const [ver, f] of [[0.06, schatt(k, 0.65)], [0, schatt(k, 0.85)]]) { ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(-0.08 + ver, 0.02); ctx.lineTo(-0.2 + ver, 0.85 * fl + 0.05); ctx.lineTo(0.12 + ver, 0.03); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = k; ell(ctx, 0, 0, 0.22, 0.07); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.18, 0.04); ctx.lineTo(0.6, -0.02); ctx.lineTo(0.18, -0.03); ctx.fill(); // Schnabel
      ctx.beginPath(); ctx.moveTo(0.2, 0.05); ctx.lineTo(-0.05, 0.2); ctx.lineTo(0.15, 0.02); ctx.fill(); // Kamm
      auge(ctx, 0.2, 0.03, 0.025, false);
    } else if (o.art === 'plesiosaurus') {
      ctx.fillStyle = schatt(k, 0.8);
      for (const [x, ph] of [[0.15, 0], [-0.18, 1.5]]) { ctx.save(); ctx.translate(x, -0.08); ctx.rotate(-0.6 + Math.sin(t * 2.5 + ph) * 0.4); ell(ctx, 0, -0.12, 0.05, 0.16); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = k; ell(ctx, 0, 0, 0.32, 0.13); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = 0.01; ctx.stroke();
      ctx.strokeStyle = k; ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0.25, 0.04); ctx.quadraticCurveTo(0.55, 0.25 + wel * 0.03, 0.85, 0.22); ctx.stroke();
      ctx.fillStyle = k; ctx.beginPath(); ctx.moveTo(-0.3, 0.03); ctx.lineTo(-0.55, -0.02 + wel * 0.03); ctx.lineTo(-0.3, -0.05); ctx.fill();
      ell(ctx, 0.9, 0.22, 0.08, 0.045); ctx.fill(); auge(ctx, 0.9, 0.24, 0.018, false);
    } else if (o.art === 'ichthyosaurus' || o.art === 'mosasaurus' || o.art === 'fisch') {
      const lang = o.art === 'mosasaurus' ? 0.6 : o.art === 'fisch' ? 0.3 : 0.42;
      ctx.fillStyle = schatt(k, 0.8);
      ctx.save(); ctx.translate(-lang * 0.95, 0); ctx.rotate(wel * 0.25); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.2, 0.18); ctx.lineTo(-0.12, 0); ctx.lineTo(-0.2, -0.16); ctx.closePath(); ctx.fill(); ctx.restore();
      if (o.art !== 'fisch') { ctx.beginPath(); ctx.moveTo(-0.05, 0.1); ctx.lineTo(-0.15, 0.24); ctx.lineTo(0.08, 0.1); ctx.fill(); }
      ell(ctx, 0.12, -0.12, 0.1, 0.035, 0.6 + wel * 0.2); ctx.fill();
      const g = ctx.createLinearGradient(0, 0.14, 0, -0.14); g.addColorStop(0, k); g.addColorStop(1, schatt(k, 1.4));
      ctx.fillStyle = g; ell(ctx, 0, 0, lang, 0.13); ctx.fill(); ctx.strokeStyle = kontur; ctx.lineWidth = 0.01; ctx.stroke();
      if (o.art !== 'fisch') { ctx.fillStyle = k; ctx.beginPath(); ctx.moveTo(lang * 0.8, 0.05); ctx.lineTo(lang + (o.art === 'mosasaurus' ? 0.2 : 0.3), -0.01); ctx.lineTo(lang * 0.8, -0.06); ctx.fill(); }
      if (o.art === 'mosasaurus') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { ctx.beginPath(); const x = lang * 0.8 + i * 0.04; ctx.moveTo(x, -0.01); ctx.lineTo(x + 0.01, -0.04); ctx.lineTo(x + 0.02, -0.01); ctx.fill(); } }
      auge(ctx, lang * 0.75, 0.04, 0.025, o.art === 'mosasaurus');
    } else if (o.art === 'trilobit') {
      ctx.fillStyle = k; ell(ctx, 0, 0, 0.3, 0.2); ctx.fill(); ctx.strokeStyle = schatt(k, 0.6); ctx.lineWidth = 0.012; ctx.stroke();
      for (let i = 0; i < 7; i++) { const x = -0.22 + i * 0.065; ctx.beginPath(); ctx.moveTo(x, -0.17); ctx.lineTo(x, 0.17); ctx.stroke(); }
      ctx.fillStyle = schatt(k, 1.2); ell(ctx, 0.22, 0, 0.1, 0.17); ctx.fill(); auge(ctx, 0.24, 0.08, 0.025, false);
      for (let i = 0; i < 6; i++) strich(ctx, [-0.18 + i * 0.07, -0.18], [-0.2 + i * 0.07 + Math.sin(t * 8 + i) * 0.02, -0.26], 0.01, schatt(k, 0.6));
    } else if (o.art === 'qualle') {
      ctx.fillStyle = BF.rgba ? BF.rgba(BF.hex(k), 1, 0.7) : k; ctx.beginPath(); ctx.arc(0, 0, 0.25, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = k; ctx.lineWidth = 0.015;
      for (let i = 0; i < 6; i++) { const x = -0.2 + i * 0.08; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + Math.sin(t * 2 + i) * 0.06, -0.25, x, -0.5); ctx.stroke(); }
    }
    ctx.restore();
  }
  BF.zeichne2d.dino = dinoZeichnen;

  // ---------- Pflanzen ----------
  Z.pflanze2d = Z.farn2d = function (w, t, h) {
    const F = h.F;
    const art = BF.norm(w.optWort(['art', 'als'], 'farn'));
    if (!['farn', 'palmfarn', 'nadelbaum', 'schachtelhalm', 'blume', 'gras', 'busch'].includes(art)) throw new Error('Pflanzen: farn, palmfarn, nadelbaum, schachtelhalm, blume, gras, busch');
    const gr = w.optZahl(['groesse'], 8);
    const fw = w.optWort(['farbe']);
    const name = nameOder(w, art + Object.keys(w2d(F).obj).length);
    neuesObjekt(F, { typ: 'pflanze', name, t0: t, p: punkt(w), r: gr, art, farbe: fw ? naturFarbe(h, fw, null) : null });
    return 0;
  };
  BF.zeichne2d.pflanze = function (ctx, o, sx, sy, r, t) {
    const gruen = o.farbe || { farn: '#3c8a3a', palmfarn: '#4a8a2a', nadelbaum: '#2a6a3a', schachtelhalm: '#6a9a3a', blume: '#e8508a', gras: '#5a9a3a', busch: '#3a7a3a' }[o.art];
    const wind = Math.sin(t * 1.2 + o.p[0]) * 0.04;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(r, -r);
    ctx.lineCap = 'round';
    if (o.art === 'farn' || o.art === 'gras') {
      const n = o.art === 'farn' ? 7 : 9;
      for (let i = 0; i < n; i++) {
        const a = -1.1 + i * (2.2 / (n - 1)) + wind;
        const ex = Math.sin(a) * 0.7, ey = Math.cos(a) * 0.9;
        ctx.strokeStyle = schatt(gruen, 0.8 + (i % 2) * 0.25); ctx.lineWidth = o.art === 'farn' ? 0.025 : 0.035;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ex * 0.3, ey * 1.05, ex, ey * 0.75); ctx.stroke();
        if (o.art === 'farn') for (let j = 1; j < 8; j++) { const u = j / 8, x = ex * 0.3 * 2 * u * (1 - u) + ex * u * u, y = ey * 1.05 * 2 * u * (1 - u) + ey * 0.75 * u * u, l = 0.12 * (1 - u * 0.7); ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l * 0.7, y + l * 0.4); ctx.moveTo(x, y); ctx.lineTo(x - l * 0.7, y + l * 0.4); ctx.stroke(); }
      }
    } else if (o.art === 'palmfarn') {
      ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.moveTo(-0.08, 0); ctx.lineTo(-0.06, 0.55); ctx.lineTo(0.06, 0.55); ctx.lineTo(0.08, 0); ctx.fill();
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 0.01; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-0.07, i * 0.1); ctx.lineTo(0.07, i * 0.1 + 0.03); ctx.stroke(); }
      for (let i = 0; i < 8; i++) { const a = -1.5 + i * (3 / 7) + wind; const ex = Math.sin(a) * 0.55, ey = 0.55 + Math.cos(a) * 0.45; ctx.strokeStyle = schatt(gruen, 0.85 + (i % 2) * 0.2); ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, 0.55); ctx.quadraticCurveTo(ex * 0.5, ey + 0.15, ex, ey - 0.05); ctx.stroke(); }
    } else if (o.art === 'nadelbaum') {
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-0.04, 0, 0.08, 0.25);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = schatt(gruen, 0.85 + i * 0.08); ctx.beginPath(); const y = 0.18 + i * 0.2, b = 0.32 - i * 0.06; ctx.moveTo(-b + wind * 0.3, y); ctx.lineTo(wind, y + 0.35); ctx.lineTo(b + wind * 0.3, y); ctx.closePath(); ctx.fill(); }
    } else if (o.art === 'schachtelhalm') {
      for (let i = 0; i < 4; i++) { const x = -0.15 + i * 0.1; ctx.strokeStyle = gruen; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + wind, 0.8 + (i % 2) * 0.15); ctx.stroke(); ctx.strokeStyle = schatt(gruen, 0.6); ctx.lineWidth = 0.012; for (let j = 1; j < 7; j++) { const y = j * 0.12; ctx.beginPath(); ctx.moveTo(x - 0.04, y); ctx.lineTo(x + 0.04 + wind * y, y + 0.03); ctx.stroke(); } }
    } else if (o.art === 'blume') {
      ctx.strokeStyle = '#3a8a3a'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wind, 0.6); ctx.stroke();
      ctx.fillStyle = gruen; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ell(ctx, wind + Math.cos(a) * 0.1, 0.62 + Math.sin(a) * 0.1, 0.08, 0.05, a); ctx.fill(); }
      ctx.fillStyle = '#ffd040'; ell(ctx, wind, 0.62, 0.06, 0.06); ctx.fill();
    } else if (o.art === 'busch') {
      ctx.fillStyle = gruen; for (let i = 0; i < 6; i++) { ell(ctx, -0.3 + i * 0.12, 0.2 + Math.sin(i * 2) * 0.08, 0.2, 0.18); ctx.fill(); }
    }
    ctx.restore();
  };

  // ---------- Vulkan ----------
  Z.vulkan2d = function (w, t, h) {
    const F = h.F;
    const gr = w.optZahl(['groesse'], 16);
    const name = nameOder(w, 'vulkan');
    neuesObjekt(F, { typ: 'vulkan', name, t0: t, p: punkt(w), r: gr, ausbruch: [] });
    return 0;
  };
  Z.ausbruch2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'vulkan') throw new Error('So: ausbruch2d vulkan in 6');
    const d = w.dauer(6);
    o.ausbruch.push({ t0: t, t1: t + d });
    h.ton(t, 'grollen'); h.ton(t + 0.4, 'explosion', { vol: 0.5 });
    return 0;
  };
  BF.zeichne2d.vulkan = function (ctx, o, sx, sy, r, t) {
    const aus = o.ausbruch.find(a => t >= a.t0 && t < a.t1 + 3);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(r, -r);
    // Rauch
    const rr = BF.rng(9);
    for (let i = 0; i < 14; i++) {
      const ph = ((t * (aus ? 0.5 : 0.15) + rr()) % 1);
      const x = 0.02 + Math.sin(i * 1.7 + t * 0.3) * 0.1 * ph + ph * 0.25, y = 0.6 + ph * (aus ? 1.1 : 0.6);
      ctx.fillStyle = `rgba(${aus ? 70 : 140},${aus ? 65 : 135},${aus ? 60 : 130},${(1 - ph) * (aus ? 0.65 : 0.35)})`;
      ell(ctx, x, y, 0.08 + ph * 0.25, 0.07 + ph * 0.2); ctx.fill();
    }
    // Berg
    const g = ctx.createLinearGradient(0, 0.6, 0, 0); g.addColorStop(0, '#6a4a3a'); g.addColorStop(1, '#4a3428');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-0.75, 0); ctx.lineTo(-0.12, 0.6); ctx.lineTo(0.12, 0.6); ctx.lineTo(0.75, 0); ctx.closePath(); ctx.fill();
    // Lava
    const glut = aus ? 1 : 0.35 + Math.sin(t * 2) * 0.1;
    ctx.fillStyle = `rgba(255,${Math.round(110 + 60 * glut)},40,${0.6 + glut * 0.4})`; ell(ctx, 0, 0.6, 0.12, 0.03); ctx.fill();
    if (aus) {
      ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 0.04; ctx.lineCap = 'round';
      for (const x of [-0.05, 0.06]) { ctx.beginPath(); ctx.moveTo(x, 0.6); ctx.quadraticCurveTo(x * 4, 0.35, x * 7, 0.05); ctx.stroke(); }
      const rr2 = BF.rng(Math.floor(t * 8));
      for (let i = 0; i < 18; i++) { const a = -0.6 + rr2() * 1.2, v = rr2(); const tt = (t * 2 + i / 18) % 1; ctx.fillStyle = `rgba(255,${120 + Math.round(rr2() * 100)},40,${1 - tt})`; ell(ctx, Math.sin(a) * tt * 0.6, 0.6 + tt * (0.8 * v + 0.3) - tt * tt * 0.5, 0.025, 0.025); ctx.fill(); }
    }
    ctx.restore();
  };

  // ---------- Asteroid ----------
  Z.meteor2d = Z.asteroid2d = function (w, t, h) {
    const F = h.F, W = w2d(F);
    const name = nameOder(w, 'meteor');
    const d = w.dauer(4);
    const lies = () => { if (w.pk() && W.obj[w.pk()]) return W.obj[w.wort()].p.slice(); return [w.zahl(), w.zahl()]; };
    const vi = w.finde(['von']); if (vi >= 0) w.t.splice(vi, 1);
    const von = lies();
    const ni = w.finde(['nach', 'zu', 'bis']); if (ni >= 0) w.t.splice(ni, 1);
    const nach = lies();
    const gr = 3;
    const o = neuesObjekt(F, { typ: 'meteor', name, t0: t, p: von.slice(), r: gr, von, nach, ziel: t + d });
    o.t1 = t + d + 5;
    o.segs.push({ typ: 'zu', t0: t, t1: t + d, von, zu: nach });
    o.pAkt = nach;
    F.blitze.push({ t0: t + d, t1: t + d + 0.8, staerke: 1 });
    h.ton(t, 'rakete'); h.ton(t + d, 'explosion', { vol: 1 }); h.ton(t + d + 0.2, 'grollen');
    return 0;
  };
  BF.zeichne2d.meteor = function (ctx, o, sx, sy, r, t, s, E, F) {
    const vx = o.nach[0] - o.von[0], vy = o.nach[1] - o.von[1], l = Math.hypot(vx, vy) || 1;
    if (t < o.ziel) {
      // Feuerschweif
      const ex = -vx / l, ey = vy / l;
      for (let i = 12; i >= 0; i--) {
        const u = i / 12;
        ctx.fillStyle = `rgba(255,${Math.round(220 - u * 150)},${Math.round(80 - u * 60)},${(1 - u) * 0.8})`;
        ctx.beginPath(); ctx.arc(sx + ex * u * r * 6, sy + ey * u * r * 6, r * (1 - u * 0.7), 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a6a5a'; ctx.beginPath(); ctx.arc(sx - r * 0.2, sy - r * 0.2, r * 0.3, 0, 7); ctx.fill();
    } else {
      // Einschlag: Feuerball und Staubwolke
      const u = clamp((t - o.ziel) / 5, 0, 1);
      const R = r * (2 + u * 14);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
      g.addColorStop(0, `rgba(255,240,180,${(1 - u) * 0.95})`); g.addColorStop(0.35, `rgba(255,140,40,${(1 - u) * 0.8})`); g.addColorStop(1, `rgba(90,70,60,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(80,70,62,${Math.min(0.6, u * 1.2) * (1 - u * 0.3)})`;
      for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * R * 0.8, sy - Math.abs(Math.sin(a)) * R * 0.6, R * 0.35, 0, 7); ctx.fill(); }
    }
  };

  // ---------- Zeitleiste der Erdzeitalter ----------
  const EPOCHEN = [
    { k: 'erdaltertum', n: 'Erdaltertum', f: '#8a7ad0', bis: 'vor 252 Mio.' },
    { k: 'trias', n: 'Trias', f: '#e0944a', bis: 'vor 201 Mio.' },
    { k: 'jura', n: 'Jura', f: '#3ea86a', bis: 'vor 145 Mio.' },
    { k: 'kreide', n: 'Kreide', f: '#4a8ad8', bis: 'vor 66 Mio.' },
    { k: 'erdneuzeit', n: 'Erdneuzeit', f: '#d0b440', bis: 'heute' },
  ];
  Z.zeitleiste2d = function (w, t, h) {
    const F = h.F;
    const breite = w.optZahl(['breite'], 80);
    const nurDinos = w.flag(['nurdinos', 'dinos']);
    const zahlen = w.flag(['zahlen', 'jahre']);
    const name = nameOder(w, 'zeitleiste');
    neuesObjekt(F, { typ: 'zeitleiste', name, t0: t, p: punkt(w), r: breite, liste: nurDinos ? EPOCHEN.slice(1, 4) : EPOCHEN, zahlen, marke: [{ t0: -1, t1: -1, zu: -1 }] });
    return 0;
  };
  Z.zeitpunkt2d = Z.epoche2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'zeitleiste') throw new Error('So: zeitpunkt2d zeitleiste auf jura in 2');
    w.flag(['auf', 'zu', 'bei']);
    const ziel = BF.norm(w.wort() || '');
    const d = w.dauer(1.5);
    let idx = o.liste.findIndex(e => e.k === ziel);
    let wert;
    if (ziel === 'heute') wert = o.liste.length - 0.02;
    else if (ziel === 'aus' || ziel === 'weg') wert = -1;
    else if (idx < 0) throw new Error('Zeitpunkte: ' + o.liste.map(e => e.k).join(', ') + ', heute');
    else wert = idx + 0.5;
    o.marke.push({ t0: t, t1: t + d, zu: wert });
    h.ton(t, 'schwung', { vol: 0.5 });
    return 0;
  };
  BF.zeichne2d.zeitleiste = function (ctx, o, sx, sy, r, t, s, E) {
    const n = o.liste.length, B = r, hh = Math.max(26 * E, s * 4.2), x0 = sx - B / 2;
    ctx.save();
    ctx.font = `bold ${Math.round(hh * 0.42)}px "Segoe UI", "Noto Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    o.liste.forEach((e, i) => {
      const x = x0 + i * B / n;
      ctx.fillStyle = e.f; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 2 * E, sy - hh / 2, B / n - 4 * E, hh, hh * 0.25) : ctx.rect(x, sy - hh / 2, B / n, hh); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3 * E; ctx.strokeText(e.n, x + B / n / 2, sy); ctx.fillText(e.n, x + B / n / 2, sy);
      if (o.zahlen) { ctx.font = `${Math.round(hh * 0.3)}px "Segoe UI", "Noto Sans", sans-serif`; ctx.fillStyle = '#ffffff'; ctx.strokeText(e.bis, x + B / n, sy + hh * 0.85); ctx.fillText(e.bis, x + B / n, sy + hh * 0.85); ctx.font = `bold ${Math.round(hh * 0.42)}px "Segoe UI", "Noto Sans", sans-serif`; }
    });
    const m = BF.w2dHelfer.wertBei(o.marke, t, -1);
    if (m >= 0) {
      const mx = x0 + m * B / n, my = sy - hh * 0.75;
      ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.moveTo(mx, my + hh * 0.2); ctx.lineTo(mx - hh * 0.35, my - hh * 0.35); ctx.lineTo(mx + hh * 0.35, my - hh * 0.35); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * E; ctx.stroke();
    }
    ctx.restore();
  };

  // ---------- Urkontinente (Erdkugel mit wandernden Kontinenten) ----------
  // Reihenfolge: Nordamerika, Südamerika, Europa, Afrika, Asien, Indien, Australien, Antarktis
  const LAND = {
    pangaea: [[-0.22, 0.32, 0.28, 0.2], [-0.2, -0.18, 0.2, 0.28], [0.02, 0.42, 0.2, 0.15], [0.06, 0.02, 0.27, 0.3], [0.28, 0.44, 0.28, 0.17], [0.2, -0.32, 0.12, 0.12], [0.26, -0.48, 0.15, 0.11], [0.04, -0.58, 0.25, 0.14]],
    jura: [[-0.34, 0.4, 0.27, 0.2], [-0.26, -0.24, 0.19, 0.27], [-0.02, 0.5, 0.19, 0.14], [0.03, -0.06, 0.25, 0.29], [0.32, 0.5, 0.28, 0.17], [0.24, -0.42, 0.11, 0.11], [0.36, -0.6, 0.14, 0.1], [0.05, -0.74, 0.25, 0.13]],
    kreide: [[-0.45, 0.4, 0.26, 0.2], [-0.35, -0.28, 0.17, 0.27], [0.0, 0.5, 0.17, 0.13], [0.06, -0.08, 0.22, 0.29], [0.4, 0.45, 0.3, 0.18], [0.33, -0.2, 0.09, 0.11], [0.5, -0.56, 0.14, 0.1], [0.0, -0.86, 0.3, 0.11]],
    heute: [[-0.55, 0.38, 0.25, 0.22], [-0.4, -0.3, 0.15, 0.28], [0.0, 0.5, 0.15, 0.12], [0.08, -0.05, 0.2, 0.3], [0.42, 0.45, 0.32, 0.2], [0.36, 0.08, 0.08, 0.1], [0.6, -0.45, 0.15, 0.1], [0.0, -0.9, 0.35, 0.1]],
  };
  BF.LAND_STUFEN = LAND; BF.EPOCHEN = EPOCHEN; // auch für den HyperFrames-Zeichner
  Z.kontinente2d = Z.urkontinent2d = function (w, t, h) {
    const F = h.F;
    const art = BF.norm(w.optWort(['art', 'als'], 'pangaea'));
    if (!LAND[art]) throw new Error('Kontinente: pangaea, jura, kreide, heute');
    const gr = w.optZahl(['groesse'], 14);
    const name = nameOder(w, 'kontinente');
    neuesObjekt(F, { typ: 'kontinente', name, t0: t, p: punkt(w), r: gr, stufen: [{ t0: -1, t1: -1, art }] });
    return 0;
  };
  Z.drift2d = function (w, t, h) {
    const o = w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'kontinente') throw new Error('So: drift2d kontinente auf jura in 4');
    w.flag(['auf', 'zu']);
    const art = BF.norm(w.wort() || '');
    if (!LAND[art]) throw new Error('Kontinente: pangaea, jura, kreide, heute');
    const d = w.dauer(4);
    o.stufen.push({ t0: t, t1: t + d, art });
    return d;
  };
  BF.zeichne2d.kontinente = function (ctx, o, sx, sy, r, t) {
    let land = LAND[o.stufen[0].art].map(e => e.slice());
    for (const st of o.stufen.slice(1)) {
      if (t < st.t0) break;
      const u = sanft(clamp((t - st.t0) / Math.max(0.01, st.t1 - st.t0), 0, 1));
      const ziel = LAND[st.art];
      land = land.map((e, i) => e.map((v, j) => v + (ziel[i][j] - v) * u));
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.clip();
    const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r); g.addColorStop(0, '#4a8ae0'); g.addColorStop(1, '#1a4a9a');
    ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    for (const [x, y, rx, ry] of land) {
      ctx.fillStyle = '#5a9a3a'; ctx.beginPath(); ctx.ellipse(sx + x * r, sy - y * r, rx * r, ry * r, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7aaa4a'; ctx.beginPath(); ctx.ellipse(sx + (x - rx * 0.2) * r, sy - (y + ry * 0.2) * r, rx * r * 0.55, ry * r * 0.5, 0, 0, 7); ctx.fill();
    }
    const sch = ctx.createLinearGradient(sx - r, sy, sx + r, sy); sch.addColorStop(0, 'rgba(0,0,0,0)'); sch.addColorStop(0.7, 'rgba(0,0,20,0.15)'); sch.addColorStop(1, 'rgba(0,0,20,0.55)');
    ctx.fillStyle = sch; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(140,190,255,0.5)'; ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.arc(sx, sy, r * 1.03, 0, 7); ctx.stroke();
  };

  // ---------- Hintergründe ----------
  const himmelBoden = (ctx, w, h, oben, mitte, b1, b2) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, oben); g.addColorStop(0.69, mitte); g.addColorStop(0.7, b1); g.addColorStop(1, b2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  BF.hintergruende2d.urzeit = (ctx, w, h) => himmelBoden(ctx, w, h, '#e8a860', '#f6dca0', '#9a7a48', '#6a5430');
  BF.hintergruende2d.trias = BF.hintergruende2d.urzeit;
  BF.hintergruende2d.jura = (ctx, w, h) => { himmelBoden(ctx, w, h, '#6aa8c8', '#cfe8d8', '#4a8a3a', '#2a5a22'); };
  BF.hintergruende2d.kreide = (ctx, w, h) => { himmelBoden(ctx, w, h, '#7ab0e0', '#e8f0d8', '#6a9a3a', '#4a7a2a'); };
  BF.hintergruende2d.staub = (ctx, w, h, t) => { himmelBoden(ctx, w, h, '#3a3430', '#6a5e54', '#4a4238', '#2e2a24'); ctx.fillStyle = 'rgba(120,110,100,0.15)'; for (let i = 0; i < 40; i++) { const x = ((i * 137 + t * 20) % w), y = (i * 71) % (h * 0.7); ctx.fillRect(x, y, 3, 3); } };
  BF.hintergruende2d.eiszeit = (ctx, w, h) => himmelBoden(ctx, w, h, '#8ab0d0', '#e0ecf4', '#f2f6fa', '#d0dce8');
  BF.hintergruende2d.meer = (ctx, w, h, t, E) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a9ad0'); g.addColorStop(0.6, '#1a5a9a'); g.addColorStop(1, '#0a2a5a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 6; i++) { const x = (i * 0.2 + Math.sin(t * 0.3 + i) * 0.03) * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w * 0.08, 0); ctx.lineTo(x + w * 0.2, h); ctx.lineTo(x + w * 0.1, h); ctx.fill(); }
    ctx.fillStyle = '#c8b080'; ctx.fillRect(0, h * 0.9, w, h * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 18; i++) { const x = (i * 97) % w, y = h - ((t * 40 * E + i * 53) % h); ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 5 * E, y, (2 + (i % 3)) * E, 0, 7); ctx.fill(); }
  };
  BF.hintergruende2d.erdschichten = (ctx, w, h) => {
    const farben = ['#7ab0e0', '#6a9a3a', '#8a6a4a', '#b08a5a', '#9a7a5a', '#c0a070', '#8a7060', '#a08868', '#6a5a4a'];
    const grenzen = [0, 0.18, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92, 1];
    for (let i = 0; i < farben.length; i++) { ctx.fillStyle = farben[i]; ctx.fillRect(0, grenzen[i] * h, w, (grenzen[i + 1] - grenzen[i]) * h + 1); }
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 120; i++) ctx.fillRect((i * 173) % w, h * 0.22 + ((i * 89) % (h * 0.78)), 4, 3);
  };
})();

// ---------- Fertiger Erklärfilm: Dinosaurier und Erdzeitalter ----------
(function () {
  const BF = window.BF;
  if (!BF.THEMEN) return;
  BF.THEMEN.dinos = {
    name: 'Dinosaurier und die Erdzeitalter',
    erkennen: /dino|saurier|t-?rex|tyrannosaur|urzeit|urwelt|erdzeitalter|erdzeit|epoche|kreidezeit|jurazeit|\btrias\b|\bjura\b|fossil|mammut|urvogel/,
    kurz: `hintergrund jura
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Dinos!" 3
dino2d rex art trex bei -18 -11 groesse 14
& ton stampfen
sprecher "Schau mal! Ein Dinosaurier!"
bruelle2d rex
sprecher "Roooar! Das ist ein T-Rex."
warte 1
dino2d lang art langhals bei 20 -11 groesse 24
& ton stampfen
sprecher "Und das ist ein Dino mit einem ganz langen Hals."
sprecher "Er ist riesig! Größer als ein Haus."
warte 1
verstecke2d rex
& verstecke2d lang
symbol2d ei "🥚" bei 0 -6 groesse 10
sprecher "Und hier ist ein Ei."
dino2d babytri art triceratops bei 0 -11 groesse 6 baby
& verstecke2d ei
& ton quieken
sprecher "Knack! Ein Dino-Baby!"
warte 1
sprecher "Hallo, kleiner Dino!"
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
    skript: `hintergrund zimmer
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Dinosaurier und die Erdzeitalter" 4
kind2d kind bei -16 -11 groesse 12
& ton glocke
sprecher "Hallo! Heute machen wir eine riesige Reise. Eine Reise in die Vergangenheit."
symbol2d knochen "🦴" bei 12 -6 groesse 9
& ton plopp
sprecher "Stell dir vor, du gräbst im Garten. Und plötzlich findest du einen riesigen Knochen!"
sprecher "Von wem könnte der wohl sein?"
warte 1.5
verstecke2d knochen
dino2d rex0 art trex bei 18 -11 groesse 14 skelett
& ton magie
sprecher "Vielleicht von einem Dinosaurier!"
sprecher "Dinosaurier sind Tiere, die vor sehr, sehr langer Zeit auf der Erde gelebt haben."
sprecher "Heute gibt es sie nicht mehr. Aber wir wissen trotzdem ganz viel über sie."
sprecher "Wie sahen sie aus? Was haben sie gegessen? Und warum sind sie verschwunden?"
sprecher "Das alles finden wir heute heraus. Steig ein in unsere Zeitmaschine!"
& ton tada
warte 1.5
verstecke2d kind
& verstecke2d rex0
kapitel "1. Wie lange ist das her?" 3
hintergrund tafel in 2
symbol2d oma "👵" bei -20 4 groesse 9
& symbol2d kind2 "🧒" bei 0 4 groesse 7
sprecher "Weißt du, wie alt deine Oma ist? Vielleicht siebzig Jahre."
sprecher "Das ist schon ziemlich lange. Aber die Dinosaurier sind viel, viel älter."
symbol2d burg "🏰" bei 20 4 groesse 9
sprecher "Ritter und Burgen gab es vor ungefähr tausend Jahren. Das ist noch viel länger her."
sprecher "Aber die Dinosaurier lebten vor Millionen von Jahren."
verstecke2d oma
& verstecke2d kind2
& verstecke2d burg
zahl2d mio "1 000 000" bei 0 4 groesse 9 farbe gelb
& ton magie
sprecher "Eine Million, das ist eine Eins mit sechs Nullen. Eine riesige Zahl!"
sprecher "Wenn du jede Sekunde eine Zahl sagst, brauchst du fast zwölf Tage, bis du bei einer Million bist. Ohne Pause!"
sprecher "Und die letzten Dinosaurier lebten vor sechsundsechzig Millionen Jahren."
sprecher "Das ist so lange her, dass man es sich gar nicht richtig vorstellen kann."
sprecher@10+ "Die ersten Dinosaurier gab es sogar schon vor etwa zweihundertdreißig Millionen Jahren."
warte 1.5
verstecke2d mio
kapitel "2. Die Erdzeitalter" 3
zeitleiste2d zl bei 0 10 breite 86
& ton plopp
sprecher "Forscher teilen die Geschichte der Erde in Abschnitte ein. Sie heißen Erdzeitalter."
sprecher "Das ist so ähnlich wie die Kapitel in einem Buch."
sprecher "Hier siehst du eine Zeitleiste. Links ist ganz früher. Und rechts ist heute."
zeitpunkt2d zl auf erdaltertum in 1.5
sprecher "Ganz links ist das Erdaltertum. Da gab es noch keine Dinosaurier."
zeitpunkt2d zl auf trias in 1.5
sprecher "Dann kommen drei Zeitalter, in denen die Dinosaurier lebten."
sprecher "Die Trias."
zeitpunkt2d zl auf jura in 1.5
sprecher "Der Jura."
zeitpunkt2d zl auf kreide in 1.5
sprecher "Und die Kreidezeit."
sprecher "Diese drei zusammen nennt man auch das Erdmittelalter. Oder das Zeitalter der Dinosaurier."
zeitpunkt2d zl auf erdneuzeit in 1.5
sprecher "Und danach kommt die Erdneuzeit. Da leben wir heute."
sprecher@6-9,10+ "Jedes Zeitalter hat viele Millionen Jahre gedauert. Viel länger, als es Menschen gibt."
sprecher@10+ "Die Fachwörter dafür sind Paläozoikum, Mesozoikum und Känozoikum."
warte 1.5
zeitpunkt2d zl auf erdaltertum in 1.5
sprecher "Jetzt reisen wir einmal durch alle Zeitalter. Wir fangen ganz vorne an."
& ton magie
warte 1
verstecke2d zl
kapitel "3. Ganz am Anfang: Leben im Meer" 3
hintergrund meer in 2
sprecher "Am Anfang war die Erde ganz anders als heute. Es gab noch keine Tiere an Land."
sprecher "Alles Leben war im Meer."
dino2d q1 art qualle bei -20 10 groesse 13
& dino2d q2 art qualle bei 24 14 groesse 10
& ton plopp
sprecher "Die ersten Tiere waren winzig klein und weich. Manche sahen aus wie Quallen."
dino2d tr1 art trilobit bei -10 -13 groesse 9
& dino2d tr2 art trilobit bei 12 -14 groesse 8
& ton plopp
sprecher "Später krabbelten Trilobiten über den Meeresboden. Sie sahen ein bisschen aus wie Asseln."
bewege2d tr1 zu 0 -13 in 4
sprecher "Trilobiten hatten schon Augen. Und einen harten Panzer."
dino2d f1 art fisch bei -40 0 groesse 11
& dino2d f2 art fisch bei -46 5 groesse 9
bewege2d f1 zu 30 2 in 6
& bewege2d f2 zu 24 6 in 6
sprecher "Und dann kamen die ersten Fische."
sprecher "Fische waren die ersten Tiere mit einer Wirbelsäule. So wie du!"
sprecher@6-9,10+ "Eine Wirbelsäule ist eine Kette aus Knochen im Rücken. Fühl mal an deinem Rücken!"
sprecher@10+ "Die ersten Lebewesen gab es vor über drei Milliarden Jahren. Lange Zeit waren es nur winzige Einzeller."
warte 1.5
verstecke2d q1
& verstecke2d q2
& verstecke2d tr1
& verstecke2d tr2
& verstecke2d f1
& verstecke2d f2
kapitel "4. Raus aus dem Wasser" 3
hintergrund urzeit in 2
pflanze2d s1 art schachtelhalm bei -30 -11 groesse 9
& pflanze2d s2 art farn bei -18 -11 groesse 8
& pflanze2d s3 art schachtelhalm bei 28 -11 groesse 10
& ton plopp
sprecher "Irgendwann wuchsen die ersten Pflanzen an Land. Am Ufer und in Sümpfen."
symbol2d kaefer "🪲" bei -6 -8 groesse 4
& symbol2d libelle "🦋" bei 6 6 groesse 5
sprecher "Dann kamen kleine Krabbeltiere und riesige Libellen."
sprecher@6-9,10+ "Manche Libellen waren damals so groß wie eine Taube!"
symbol2d frosch "🐸" bei 14 -9 groesse 5
sprecher "Und dann wagten sich die ersten Tiere aus dem Wasser an Land. Sie konnten im Wasser und an Land leben. So wie heute Frösche."
symbol2d echse "🦎" bei -10 -9 groesse 5
sprecher "Aus ihnen wurden später Tiere mit einer harten, schuppigen Haut. Sie legten Eier mit einer festen Schale."
sprecher "Dafür brauchten sie kein Wasser mehr. Jetzt konnten sie überall an Land leben."
verstecke2d kaefer
& verstecke2d libelle
& verstecke2d frosch
& verstecke2d echse
dino2d dim art dimetrodon bei -40 -11 groesse 9
bewege2d dim zu -4 -11 in 5
& ton schritt
sprecher "Schau mal, wer da kommt! Das ist der Dimetrodon. Er hatte ein großes Segel auf dem Rücken."
sprecher "Er sieht aus wie ein Dinosaurier. Aber er war gar keiner!"
sprecher "Er lebte noch vor den Dinosauriern. Im Erdaltertum."
sprecher@6-9,10+ "Mit dem Segel konnte er sich vielleicht in der Sonne aufwärmen. Wie mit einer Solaranlage."
sprecher@10+ "Dimetrodon ist sogar näher mit den Säugetieren verwandt als mit den Dinosauriern. Also auch ein bisschen mit uns."
warte 1.5
verstecke2d dim
& verstecke2d s1
& verstecke2d s2
& verstecke2d s3
kapitel "5. Das große Sterben" 3
vulkan2d v1 bei -26 -11 groesse 18
& vulkan2d v2 bei 20 -11 groesse 22
sprecher "Am Ende des Erdaltertums passierte etwas sehr Schlimmes."
ausbruch2d v1 in 8
& ausbruch2d v2 in 8
sprecher "Riesige Vulkane brachen aus. Viele tausend Jahre lang."
sprecher "Die Luft wurde schmutzig. Und das Meer wurde viel zu warm."
sprecher "Die meisten Tiere und Pflanzen starben aus. Man nennt das das große Sterben."
sprecher "Aber nicht alle! Ein paar Tiere überlebten."
sprecher "Und aus diesen Überlebenden entstanden ganz neue Tiere. Zum Beispiel die Dinosaurier!"
sprecher@6-9,10+ "Fast neun von zehn Tierarten im Meer verschwanden damals."
sprecher@10+ "Dieses Massenaussterben vor etwa zweihundertzweiundfünfzig Millionen Jahren war das größte in der Erdgeschichte."
warte 1.5
verstecke2d v1
& verstecke2d v2
kapitel "6. Die Trias: Die ersten Dinosaurier" 3
hintergrund weltraum in 2
kontinente2d erde bei 0 0 groesse 18 art pangaea
& ton magie
sprecher "Jetzt sind wir in der Trias. Schau dir die Erde an."
sprecher "Damals gab es nur ein einziges, riesiges Land. Ein Superkontinent!"
sprecher "Er heißt Pangäa. Das bedeutet: die ganze Erde."
sprecher "Man hätte damals von einem Ende der Welt zum anderen laufen können."
sprecher@6-9,10+ "Mitten in Pangäa war es sehr heiß und trocken. Es gab große Wüsten."
warte 1
verstecke2d erde
hintergrund trias in 2
pflanze2d t1 art palmfarn bei -32 -11 groesse 9
& pflanze2d t2 art nadelbaum bei 30 -11 groesse 14
& pflanze2d t3 art farn bei 14 -11 groesse 6
dino2d klein1 art klein bei -50 -11 groesse 11
bewege2d klein1 zu -6 -11 in 4
& ton schritt
sprecher "Und da! Einer der ersten Dinosaurier."
sprecher "Die ersten Dinosaurier waren noch gar nicht so groß. Ungefähr so groß wie ein Hund."
sprecher "Sie liefen schnell auf zwei Beinen und jagten kleine Tiere."
bruelle2d klein1
sprecher@6-9,10+ "Einer der frühesten heißt Eoraptor. Das bedeutet: früher Räuber."
dino2d plat art plateosaurus bei 50 -11 groesse 15 links
bewege2d plat zu 18 -11 in 5
& ton stampfen
sprecher "Bald gab es auch größere Dinosaurier. Der Plateosaurus fraß Pflanzen."
sprecher "Er konnte sich auf die Hinterbeine stellen und die Blätter von den Bäumen holen."
sprecher@6-9,10+ "Er war schon so lang wie ein Auto. Und damit einer der ersten großen Pflanzenfresser."
dino2d flug1 art flugsaurier bei -40 18 groesse 9
bewege2d flug1 zu 40 22 in 8
sprecher "Und am Himmel flogen die ersten Flugsaurier."
symbol2d maus "🐭" bei 2 -9 groesse 4
sprecher "Schau mal, ganz klein da unten! Das ist eines der ersten Säugetiere."
sprecher "Es war so klein wie eine Maus. Und es kam nur nachts aus seinem Versteck."
sprecher "Säugetiere sind Tiere, deren Babys Milch trinken. So wie Hunde, Katzen und auch wir Menschen."
warte 1.5
verstecke2d klein1
& verstecke2d plat
& verstecke2d flug1
& verstecke2d maus
& verstecke2d t1
& verstecke2d t2
& verstecke2d t3
kapitel "7. Was ist eigentlich ein Dinosaurier?" 3
hintergrund tafel in 2
sprecher "Moment mal. Was ist eigentlich ein Dinosaurier genau?"
symbol2d echse2 "🦎" bei -22 2 groesse 9
& ton plopp
sprecher "Eine Eidechse hat ihre Beine an der Seite. Sie krabbelt mit dem Bauch nah am Boden."
dino2d d7 art klein bei 18 -6 groesse 14
& ton plopp
sprecher "Ein Dinosaurier hatte seine Beine gerade unter dem Körper. So wie ein Pferd oder wie du."
sprecher "Damit konnte er schneller und ausdauernder laufen."
sprecher "Alle Dinosaurier lebten an Land. Und alle legten Eier."
verstecke2d echse2
& verstecke2d d7
symbol2d nein1 "❌" bei 0 4 groesse 12
sprecher "Und jetzt kommt eine Überraschung: Die Flugsaurier waren keine Dinosaurier!"
sprecher "Und die großen Saurier im Meer auch nicht."
sprecher "Sie waren nur Verwandte. So wie Cousins."
sprecher@6-9,10+ "Das Wort Dinosaurier bedeutet übrigens: schreckliche Echse."
sprecher@10+ "Den Namen hat sich vor fast zweihundert Jahren der englische Forscher Richard Owen ausgedacht."
warte 1.5
verstecke2d nein1
kapitel "8. Der Jura: Die Zeit der Riesen" 3
hintergrund weltraum in 2
kontinente2d erde2 bei 0 0 groesse 18 art pangaea
sprecher "Jetzt reisen wir weiter in den Jura."
drift2d erde2 auf jura in 5
& ton grollen
sprecher "Schau! Der große Kontinent bricht langsam auseinander. Dazwischen entsteht Meer."
sprecher "Das passiert ganz, ganz langsam. Nur so schnell, wie deine Fingernägel wachsen."
sprecher "Jetzt regnet es mehr. Und überall wachsen riesige Wälder."
warte 1
verstecke2d erde2
hintergrund jura in 2
pflanze2d j1 art nadelbaum bei -36 -11 groesse 16
& pflanze2d j2 art farn bei -24 -11 groesse 8
& pflanze2d j3 art palmfarn bei 34 -11 groesse 11
& pflanze2d j4 art farn bei 24 -11 groesse 7
sprecher "Im Jura lebten die größten Tiere, die jemals an Land gelaufen sind."
dino2d brachio art langhals bei 60 -11 groesse 30 links
bewege2d brachio zu 16 -11 in 6
& ton stampfen
sprecher "Hörst du das? Bumm, bumm, bumm!"
& text2d "Brachiosaurus" an brachio 5
sprecher "Das ist der Brachiosaurus. Ein Langhals-Dinosaurier."
symbol2d haus "🏠" bei -16 -6 groesse 10
sprecher "Er war so hoch wie ein Haus mit vier Stockwerken."
sprecher "Mit seinem langen Hals kam er an die höchsten Blätter. Wie eine Giraffe."
sprecher "Er fraß den ganzen Tag lang Pflanzen. Hunderte Kilo jeden Tag!"
& ton mampf
sprecher@6-9,10+ "Er hatte keine Kauzähne. Er riss die Blätter ab und schluckte sie einfach herunter."
sprecher@10+ "Brachiosaurus wog wahrscheinlich so viel wie acht bis zehn Elefanten."
verstecke2d haus
dino2d diplo art diplodocus bei -60 -11 groesse 18
bewege2d diplo zu -22 -11 in 6
& ton stampfen
& text2d "Diplodocus" an diplo 5
sprecher "Und das ist der Diplodocus. Er hatte einen besonders langen Schwanz."
sprecher "Er war so lang wie zwei Busse hintereinander."
sprecher@6-9,10+ "Mit seinem Schwanz konnte er vielleicht knallen wie mit einer Peitsche."
sprecher "Diese Langhals-Dinos hießen Sauropoden. Sie waren die Riesen der Urzeit."
warte 1.5
verstecke2d brachio
& verstecke2d diplo
kapitel "9. Stegosaurus und Allosaurus" 3
dino2d stego art stegosaurus bei -50 -11 groesse 14
bewege2d stego zu -10 -11 in 5
& ton stampfen
sprecher "Hier kommt ein Dino mit großen Platten auf dem Rücken."
& text2d "Stegosaurus" an stego 5
sprecher "Das ist der Stegosaurus."
sprecher "Am Schwanz hatte er vier spitze Stacheln. Damit konnte er sich verteidigen."
sprecher "Aber sein Kopf war ganz klein. Und sein Gehirn war nur so groß wie eine Walnuss."
symbol2d nuss "🥜" bei 6 4 groesse 5
sprecher "Trotzdem kam er gut zurecht. Er fraß niedrige Pflanzen."
sprecher@6-9,10+ "Wozu die Platten genau gut waren, weiß man nicht sicher. Vielleicht zum Angeben. Oder um sich zu wärmen."
verstecke2d nuss
dino2d allo art allosaurus bei 55 -11 groesse 14 links
bewege2d allo zu 24 -11 in 4
& ton stampfen
sprecher "Oh, oh. Wer kommt denn da?"
bruelle2d allo
& text2d "Allosaurus" an allo 5
sprecher "Das ist der Allosaurus. Ein Fleischfresser mit scharfen Zähnen."
sprecher "Er war der gefährlichste Jäger im Jura."
sprecher "Aber der Stegosaurus schwingt seinen Stachelschwanz. Das tut weh!"
& ton schwung
bewege2d allo zu 50 -11 in 3
sprecher "Der Allosaurus läuft lieber davon."
sprecher@10+ "Forscher haben tatsächlich einen Allosaurus-Knochen gefunden, in dem ein Loch von einem Stegosaurus-Stachel war."
warte 1.5
verstecke2d stego
& verstecke2d allo
& verstecke2d j1
& verstecke2d j2
& verstecke2d j3
& verstecke2d j4
kapitel "10. Im Meer der Saurier" 3
hintergrund meer in 2
dino2d plesio art plesiosaurus bei -50 6 groesse 26
bewege2d plesio zu -16 8 in 6
sprecher "Auch im Meer lebten große Saurier. Schau mal!"
& text2d "Plesiosaurus" an plesio 5
sprecher "Das ist der Plesiosaurus. Er hatte einen langen Hals und vier Flossen wie Paddel."
sprecher "Damit ist er durch das Wasser geflogen wie ein Unterwasser-Vogel."
dino2d ichthy art ichthyosaurus bei 50 -8 groesse 22 links
bewege2d ichthy zu 18 -10 in 5
& text2d "Ichthyosaurus" an ichthy 5
sprecher "Und das ist ein Fischsaurier. Er sah aus wie ein Delfin."
sprecher "Er konnte sehr schnell schwimmen und fing Fische und Tintenfische."
sprecher "Und weißt du was? Er legte keine Eier. Er bekam lebende Babys. Mitten im Wasser!"
symbol2d schnecke "🐚" bei -24 -14 groesse 7
sprecher "Am Meeresboden gab es auch Ammoniten. Das waren Tiere mit einem schneckenförmigen Haus."
sprecher@6-9,10+ "Versteinerte Ammoniten findet man heute noch ganz oft. Vielleicht sogar beim Wandern."
sprecher "Aber denk dran: Die Meeressaurier waren keine Dinosaurier. Nur Verwandte."
warte 1.5
verstecke2d plesio
& verstecke2d ichthy
& verstecke2d schnecke
kapitel "11. Der Urvogel" 3
hintergrund jura in 2
pflanze2d u1 art nadelbaum bei 20 -11 groesse 18
dino2d urv art urvogel bei -10 -11 groesse 9
& ton quieken
kamera2d bei -8 -5 zoom 2.2 in 2
sprecher "Jetzt schauen wir uns ein ganz besonderes Tier an."
& text2d "Archaeopteryx" an urv 5
sprecher "Das ist der Urvogel. Er heißt Archaeopteryx."
sprecher "Er hatte Federn und Flügel. Wie ein Vogel."
sprecher "Aber er hatte auch Zähne im Maul, Krallen an den Flügeln und einen langen Schwanz mit Knochen drin. Wie ein Dinosaurier!"
sprecher "Er war halb Vogel und halb Dinosaurier."
sprecher@6-9,10+ "Er war ungefähr so groß wie eine Taube und konnte wahrscheinlich ein Stück weit flattern."
sprecher "Merk dir den Urvogel gut. Später erfährst du, warum er so wichtig ist."
warte 1.5
verstecke2d urv
& verstecke2d u1
kamera2d bei 0 0 zoom 1 in 0.1
kapitel "12. Die Kreidezeit" 3
hintergrund weltraum in 2
kontinente2d erde3 bei 0 0 groesse 18 art jura
sprecher "Weiter geht die Reise. Jetzt kommt die Kreidezeit."
drift2d erde3 auf kreide in 5
sprecher "Die Kontinente wandern immer weiter auseinander."
sprecher "Langsam sieht die Erde schon fast so aus wie heute."
sprecher@6-9,10+ "Die Kreidezeit heißt so, weil damals viel Kreide entstanden ist. Aus winzigen Meerestierchen."
warte 1
verstecke2d erde3
hintergrund kreide in 2
pflanze2d k1 art blume bei -30 -11 groesse 5
& pflanze2d k2 art blume bei -24 -11 groesse 4 farbe gelb
& pflanze2d k3 art blume bei 26 -11 groesse 5 farbe lila
& pflanze2d k4 art busch bei 34 -11 groesse 8
& ton magie
sprecher "Und jetzt passiert etwas Wunderschönes: Die ersten Blumen blühen!"
symbol2d biene "🐝" bei -26 -2 groesse 4
sprecher "Mit den Blumen kamen auch die Bienen."
sprecher "Vorher gab es auf der ganzen Welt keine einzige Blume. Stell dir das mal vor!"
sprecher "In der Kreidezeit lebten die berühmtesten Dinosaurier. Lass uns ein paar kennenlernen."
warte 1.5
verstecke2d biene
kapitel "13. Der T-Rex" 3
dino2d rex art trex bei 60 -11 groesse 20 links
bewege2d rex zu 14 -11 in 6
& ton stampfen
sprecher "Bumm. Bumm. Bumm. Spürst du den Boden zittern?"
bruelle2d rex
sprecher "Roooar! Das ist der berühmteste Dinosaurier von allen."
& text2d "Tyrannosaurus Rex" an rex 5
sprecher "Der Tyrannosaurus Rex. Kurz: T-Rex. Das bedeutet: König der Tyrannenechsen."
sprecher "Er war so lang wie ein Bus und so schwer wie ein großer Lastwagen."
symbol2d banane "🍌" bei -16 0 groesse 7
sprecher "Seine Zähne waren so groß wie Bananen. Und er hatte ungefähr sechzig davon!"
sprecher "Er konnte so fest zubeißen wie kein anderes Landtier jemals."
verstecke2d banane
sprecher "Aber schau mal seine Arme an. Die waren winzig klein!"
sprecher "Damit konnte er nicht einmal seinen Mund erreichen."
sprecher "Dafür hatte er eine super Nase. Er konnte Futter von ganz weit weg riechen."
sprecher@6-9,10+ "Man weiß gar nicht genau, wie Dinosaurier geklungen haben. Vielleicht haben sie gar nicht gebrüllt, sondern eher gebrummt wie ein Krokodil."
sprecher@10+ "Der T-Rex lebte ganz am Ende der Kreidezeit, vor etwa achtundsechzig bis sechsundsechzig Millionen Jahren, in Nordamerika."
warte 1.5
kapitel "14. Triceratops und Ankylosaurus" 3
dino2d trike art triceratops bei -55 -11 groesse 13
bewege2d trike zu -20 -11 in 5
& ton stampfen
& text2d "Triceratops" an trike 5
sprecher "Aber der T-Rex hatte es nicht leicht. Schau, wer da kommt: der Triceratops!"
sprecher "Triceratops heißt: Drei-Horn-Gesicht."
sprecher "Er hatte drei spitze Hörner und einen großen Knochenschild am Nacken."
sprecher "Damit konnte er sich gut gegen den T-Rex wehren."
bewege2d trike zu -14 -11 in 1
& ton stampfen
sprecher "Er senkt den Kopf und zeigt seine Hörner. Komm mir bloß nicht zu nah!"
bewege2d rex zu 28 -11 in 2
sprecher "Der T-Rex überlegt es sich lieber noch einmal."
dino2d anky art ankylosaurus bei 0 -11 groesse 9
& ton plopp
& text2d "Ankylosaurus" an anky 5
sprecher "Und dieser hier war wie ein Panzer auf vier Beinen. Der Ankylosaurus."
sprecher "Sein Rücken war voller Knochenplatten und Stacheln."
sprecher "Und am Schwanz hatte er eine dicke Keule aus Knochen. Damit konnte er kräftig zuschlagen!"
& ton schlag
sprecher@6-9,10+ "Triceratops und Ankylosaurus waren Pflanzenfresser. Sie mussten sich nur verteidigen, wenn ein Jäger kam."
warte 1.5
verstecke2d rex
& verstecke2d trike
& verstecke2d anky
& verstecke2d k1
& verstecke2d k2
& verstecke2d k3
& verstecke2d k4
kapitel "15. Noch mehr Dinos der Kreidezeit" 3
dino2d rap1 art raptor bei -50 -11 groesse 7
& dino2d rap2 art raptor bei -58 -11 groesse 6
bewege2d rap1 zu -14 -11 in 3
& bewege2d rap2 zu -24 -11 in 3
& ton schritt
& text2d "Velociraptor" an rap1 5
sprecher "Hier kommen zwei Velociraptoren. Sie waren klein, aber sehr flink."
sprecher "Ein Velociraptor war nur so groß wie ein Truthahn. Und er hatte Federn!"
sprecher "An jedem Fuß hatte er eine große, gebogene Kralle."
sprecher@6-9,10+ "In vielen Filmen sind Velociraptoren riesig und haben keine Federn. Aber in echt sahen sie eher aus wie gefährliche Vögel."
verstecke2d rap1
& verstecke2d rap2
dino2d para art parasaurolophus bei 50 -11 groesse 14 links
bewege2d para zu 16 -11 in 4
& ton stampfen
& text2d "Parasaurolophus" an para 5
sprecher "Und das ist der Parasaurolophus. Er hatte eine lange Röhre auf dem Kopf."
sprecher "Durch die Röhre konnte er tröten. Wie mit einer Trompete!"
& ton quieken
sprecher "So haben sich die Tiere in der Herde vielleicht etwas zugerufen."
dino2d spino art spinosaurus bei -55 -11 groesse 16
bewege2d spino zu -18 -11 in 5
& ton stampfen
& text2d "Spinosaurus" an spino 5
sprecher "Und hier kommt der Spinosaurus. Er hatte ein riesiges Segel auf dem Rücken."
sprecher "Er war sogar noch länger als der T-Rex."
sprecher "Mit seiner langen Schnauze fing er am liebsten Fische. Wie ein Krokodil."
warte 1.5
verstecke2d para
& verstecke2d spino
kapitel "16. Hatten Dinos Federn?" 3
dino2d fed art raptor bei -8 -11 groesse 12
& ton plopp
sprecher "Früher dachten alle, Dinosaurier hätten nur eine schuppige Haut. Wie Eidechsen."
sprecher "Aber dann fanden Forscher versteinerte Dinos mit Federn!"
sprecher "Viele kleine Dinosaurier hatten Federn. Manche sahen aus wie flauschige Küken."
sprecher "Die Federn hielten sie warm. Und vielleicht konnten sie damit auch angeben. Wie ein Pfau."
symbol2d pfau "🦚" bei 22 -4 groesse 9
sprecher@6-9,10+ "Sogar ein Verwandter vom T-Rex, der Yutyrannus, hatte ein Federkleid."
verstecke2d pfau
sprecher "Und welche Farbe hatten die Dinosaurier?"
warte 1.5
sprecher "Das ist eine richtig schwierige Frage. Farben werden nämlich nicht zu Stein."
sprecher "Aber bei ein paar Fossilien haben Forscher winzige Farbkörnchen in den Federn entdeckt."
dino2d farb1 art klein bei 22 -11 groesse 8 farbe rot
& ton magie
sprecher "So wissen wir zum Beispiel, dass ein kleiner Dino einen rot-braunen Kopf hatte. Und einen gestreiften Schwanz."
sprecher "Bei den meisten Dinos wissen wir es aber nicht. Darum malt jeder sie ein bisschen anders."
sprecher "Wenn du einen Dino malst, darfst du dir die Farben also selbst aussuchen!"
warte 1.5
verstecke2d fed
& verstecke2d farb1
kapitel "17. Im Meer und in der Luft" 3
hintergrund meer in 2
dino2d mosa art mosasaurus bei 60 0 groesse 32 links
bewege2d mosa zu 6 -2 in 6
& text2d "Mosasaurus" an mosa 5
sprecher "Im Meer der Kreidezeit schwamm ein riesiger Jäger. Der Mosasaurus."
sprecher "Er war so lang wie ein Wal und hatte ein riesiges Maul voller Zähne."
sprecher "Vor ihm hatten alle anderen Meerestiere Angst."
warte 1
verstecke2d mosa
hintergrund kreide in 2
dino2d pter art flugsaurier bei -50 12 groesse 24
bewege2d pter zu 40 18 in 9
& ton schwung
& text2d "Pteranodon" an pter 5
sprecher "Und am Himmel segelte der Pteranodon. Ein großer Flugsaurier."
sprecher "Von einer Flügelspitze bis zur anderen war er so breit wie ein kleines Flugzeug."
sprecher "Er hatte keine Federn. Seine Flügel waren aus Haut. Wie bei einer Fledermaus."
sprecher "Er segelte über das Meer und schnappte sich Fische."
sprecher@10+ "Der größte bekannte Flugsaurier, Quetzalcoatlus, war so groß wie eine Giraffe, wenn er auf dem Boden stand."
warte 1.5
verstecke2d pter
kapitel "18. Wie lebten die Dinosaurier?" 3
symbol2d nest "🪹" bei -6 -9 groesse 12
& symbol2d ei1 "🥚" bei -10 -6 groesse 4
& symbol2d ei2 "🥚" bei -5 -5 groesse 4
& symbol2d ei3 "🥚" bei 0 -6 groesse 4
& ton plopp
sprecher "Alle Dinosaurier sind aus Eiern geschlüpft."
sprecher "Manche Mütter bauten ein Nest und passten gut auf die Eier auf."
verstecke2d ei2
dino2d babytri art triceratops bei 10 -11 groesse 8 baby
& ton quieken
sprecher "Knack! Ein Baby schlüpft!"
sprecher "Dino-Babys waren ganz klein. Selbst die riesigen Langhälse waren am Anfang nicht größer als eine Katze."
sprecher@6-9,10+ "Ein Langhals-Baby musste dann sehr schnell wachsen. Manchmal mehrere Kilo an einem einzigen Tag."
verstecke2d nest
& verstecke2d ei1
& verstecke2d ei3
& verstecke2d babytri
dino2d h1 art triceratops bei -30 -11 groesse 11
& dino2d h2 art triceratops bei -12 -11 groesse 10
& dino2d h3 art triceratops bei 6 -11 groesse 12
& ton stampfen
sprecher "Viele Pflanzenfresser lebten in großen Herden. So waren sie sicherer."
sprecher "Pflanzenfresser hatten Zähne zum Abrupfen und Zermahlen von Pflanzen."
verstecke2d h1
& verstecke2d h2
& verstecke2d h3
dino2d jaeger art allosaurus bei 0 -11 groesse 14
& ton plopp
sprecher "Fleischfresser hatten scharfe, spitze Zähne wie Messer."
bruelle2d jaeger
sprecher "An den Zähnen erkennen Forscher sofort, was ein Dino gegessen hat."
sprecher "Übrigens: Die meisten Dinosaurier waren Pflanzenfresser. Und viele waren nicht größer als ein Hund."
warte 1.5
verstecke2d jaeger
kapitel "19. Ein Tag im Leben von Klein-Trici" 3
pflanze2d g1 art farn bei -34 -11 groesse 7
& pflanze2d g2 art busch bei 32 -11 groesse 8
& pflanze2d g3 art blume bei 22 -11 groesse 4
dino2d mama art triceratops bei -20 -11 groesse 14
& dino2d trici art triceratops bei 2 -11 groesse 5 baby
& ton quieken
sprecher "Jetzt erzähle ich dir eine kleine Geschichte. Von einem Triceratops-Baby."
& text2d "Trici" an trici 5
sprecher "Es heißt Trici. Trici ist erst ein paar Wochen alt."
sprecher "Am Morgen geht die Sonne auf. Trici gähnt und streckt sich."
bewege2d trici zu 18 -11 in 3
& ton schritt
sprecher "Dann trabt Trici zu den Farnen und Blumen. Hmm, Frühstück!"
& ton mampf
sprecher "Mampf, mampf. Trici rupft die zarten Blätter ab."
sprecher "Mama passt die ganze Zeit gut auf. Sie ist groß und stark."
dino2d flugg art flugsaurier bei -50 20 groesse 10
bewege2d flugg zu 50 22 in 8
sprecher "Über ihnen segelt ein Flugsaurier vorbei. Trici schaut staunend nach oben."
warte 1
dino2d raeuber art raptor bei 55 -11 groesse 7 links
bewege2d raeuber zu 34 -11 in 3
& ton schreck
sprecher "Oh! Da raschelt es im Gebüsch. Ein Velociraptor!"
bewege2d trici zu -6 -11 in 2
sprecher "Trici rennt schnell zu Mama."
bewege2d mama zu 4 -11 in 2
& ton stampfen
sprecher "Mama stellt sich vor Trici und senkt ihre großen Hörner."
bruelle2d mama
bewege2d raeuber zu 60 -11 in 2
sprecher "Der kleine Räuber bekommt einen Schreck und rennt weg. Puh!"
sprecher "Am Nachmittag trifft Trici die anderen Triceratops aus der Herde. Sie spielen zusammen."
sprecher "Und am Abend kuschelt sich Trici an Mama und schläft ein. Gute Nacht, Trici!"
sprecher@6-9,10+ "Ob Triceratops-Mütter wirklich so auf ihre Babys aufgepasst haben, weiß man nicht genau. Bei manchen Dinos hat man aber Nester mit Eltern gefunden."
warte 1.5
verstecke2d mama
& verstecke2d trici
& verstecke2d flugg
& verstecke2d g1
& verstecke2d g2
& verstecke2d g3
kapitel "20. Was konnten Dinos sehen, riechen und hören?" 3
hintergrund kreide in 2
dino2d sinn art trex bei 0 -11 groesse 18
& ton stampfen
sprecher "Wie haben Dinosaurier ihre Welt wahrgenommen?"
symbol2d auge "👀" bei -22 10 groesse 7
sprecher "Der T-Rex hatte Augen, die nach vorne schauten. So wie bei dir."
sprecher "Damit konnte er gut abschätzen, wie weit etwas weg ist. Das ist wichtig beim Jagen."
verstecke2d auge
symbol2d nase "👃" bei -22 10 groesse 7
sprecher "Seine Nase war riesig. Er konnte Futter riechen, das kilometerweit weg war."
verstecke2d nase
symbol2d ohr "👂" bei -22 10 groesse 7
sprecher "Und er konnte ganz tiefe Töne gut hören. Zum Beispiel das Stampfen von großen Tieren."
& ton stampfen
sprecher@6-9,10+ "Woher wissen Forscher das? Sie schauen sich den Schädel genau an. Darin sieht man, wie groß das Gehirn war und welche Teile besonders groß waren."
verstecke2d ohr
dino2d sinn2 art triceratops bei 26 -11 groesse 11
sprecher "Pflanzenfresser hatten ihre Augen oft an der Seite vom Kopf."
sprecher "So konnten sie fast rundherum schauen. Und sahen sofort, wenn ein Jäger kam."
sprecher "Ein Pferd oder ein Hase macht das heute genauso."
warte 1.5
verstecke2d sinn
& verstecke2d sinn2
kapitel "21. Ein Tag am Wasserloch" 3
hintergrund jura in 2
symbol2d wasser "💧" bei 0 -9 groesse 6
& pflanze2d wl1 art palmfarn bei -34 -11 groesse 10
& pflanze2d wl2 art nadelbaum bei 34 -11 groesse 15
sprecher "Alle Tiere brauchen Wasser. Auch die Dinosaurier."
dino2d wd1 art diplodocus bei -60 -11 groesse 14
bewege2d wd1 zu -20 -11 in 6
& ton stampfen
sprecher "Am Wasserloch trafen sich viele verschiedene Dinos. Zuerst kommt ein Diplodocus und trinkt."
dino2d wd2 art stegosaurus bei 60 -11 groesse 10 links
bewege2d wd2 zu 16 -11 in 5
& ton stampfen
sprecher "Dann kommt ein Stegosaurus. Die beiden lassen sich in Ruhe. Beide fressen ja nur Pflanzen."
dino2d wd3 art flugsaurier bei -40 20 groesse 9
bewege2d wd3 zu 40 16 in 8
sprecher "Ein Flugsaurier fliegt tief über das Wasser."
sprecher "Plötzlich heben alle den Kopf. Was ist da los?"
warte 1
dino2d wd4 art allosaurus bei 70 -11 groesse 13 links
bewege2d wd4 zu 44 -11 in 3
& ton schreck
sprecher "Ein Allosaurus schaut aus dem Wald!"
bewege2d wd1 zu -40 -11 in 3
& bewege2d wd2 zu 30 -11 in 3
sprecher "Die Pflanzenfresser bleiben ganz nah beieinander. Zusammen sind sie stark."
bewege2d wd4 zu 70 -11 in 3
sprecher "Der Allosaurus merkt das. Er hat heute keine Lust auf Ärger und geht wieder."
sprecher "Puh! Und alle trinken in Ruhe weiter."
sprecher@6-9,10+ "Forscher haben an manchen Stellen viele Dino-Spuren rund um alte Wasserlöcher gefunden. Dort war wirklich viel los."
warte 1.5
verstecke2d wd1
& verstecke2d wd2
& verstecke2d wd3
& verstecke2d wd4
& verstecke2d wasser
& verstecke2d wl1
& verstecke2d wl2
kapitel "22. Das Ende der Dinosaurier" 3
dino2d e1 art trex bei -24 -11 groesse 14
& dino2d e2 art triceratops bei 10 -11 groesse 10
& pflanze2d e3 art nadelbaum bei 32 -11 groesse 14
sprecher "Die Dinosaurier lebten über hundertfünfzig Millionen Jahre lang auf der Erde."
sprecher "Aber dann, vor sechsundsechzig Millionen Jahren, passierte etwas Unglaubliches."
meteor2d stein von -45 30 nach 30 -12 in 6
sprecher "Ein riesiger Brocken aus dem Weltall raste auf die Erde zu. Ein Asteroid."
sprecher "Er war so groß wie ein ganzer Berg."
warte 1.5
sprecher "Bumm! Er schlug in die Erde ein."
hintergrund staub in 3
sprecher "Eine riesige Wolke aus Staub und Rauch flog bis in den Himmel."
sprecher "Der Staub verdeckte die Sonne. Viele Monate lang wurde es dunkel und kalt."
verstecke2d e3
sprecher "Ohne Sonnenlicht konnten die Pflanzen nicht mehr wachsen."
verstecke2d e2
sprecher "Die Pflanzenfresser fanden nichts mehr zu fressen."
verstecke2d e1
sprecher "Und dann fanden auch die Fleischfresser nichts mehr."
sprecher "So sind die großen Dinosaurier ausgestorben."
sprecher@6-9,10+ "Wahrscheinlich haben auch riesige Vulkanausbrüche in Indien dabei mitgeholfen."
sprecher@10+ "Den Krater des Asteroiden hat man in Mexiko gefunden. Er ist rund hundertachtzig Kilometer breit."
warte 1.5
sprecher "Das klingt traurig. Aber die Geschichte ist noch nicht zu Ende!"
kapitel "23. Die Dinosaurier leben weiter!" 3
hintergrund erde in 3
symbol2d vogel1 "🐦" bei -20 4 groesse 8
& symbol2d vogel2 "🐔" bei 10 -6 groesse 9
& ton jubel
sprecher "Nicht alle Dinosaurier sind verschwunden. Ein paar kleine haben überlebt."
sprecher "Weißt du, welche? Die Vögel!"
sprecher "Vögel stammen von Dinosauriern ab. Eigentlich sind Vögel sogar Dinosaurier!"
sprecher "Weißt du noch, der Urvogel? Er zeigt, wie aus Dinosauriern Vögel geworden sind."
sprecher "Wenn du also eine Amsel siehst oder ein Huhn, dann siehst du einen kleinen Dinosaurier."
sprecher@6-9,10+ "Schau dir mal die Füße von einem Huhn genau an. Die sehen fast aus wie Dino-Füße!"
warte 1.5
verstecke2d vogel1
& verstecke2d vogel2
kapitel "24. Wer hat noch überlebt?" 3
hintergrund erde in 2
symbol2d kroko "🐊" bei -22 -8 groesse 10
& ton plopp
sprecher "Nicht nur die Vögel haben überlebt. Auch andere Tiere aus der Dino-Zeit gibt es noch heute."
sprecher "Zum Beispiel die Krokodile! Krokodile gab es schon, als die Dinosaurier lebten."
symbol2d kroete "🐢" bei 0 -8 groesse 9
sprecher "Auch Schildkröten sind uralt. Sie haben die Dinosaurier gesehen."
symbol2d hai "🦈" bei 22 -2 groesse 9
sprecher "Und im Meer schwammen damals schon Haie."
symbol2d frosch2 "🐸" bei 34 -9 groesse 6
sprecher "Frösche, Eidechsen, Schlangen und viele Insekten gab es auch schon."
sprecher "Sie alle waren klein genug, um sich zu verstecken. Und sie brauchten nicht viel Futter."
sprecher "Darum haben sie die dunkle, kalte Zeit nach dem Asteroiden überstanden."
sprecher@6-9,10+ "Viele Tiere haben sich im Boden eingegraben oder lebten im Wasser. Dort war es geschützter."
warte 1.5
verstecke2d kroko
& verstecke2d kroete
& verstecke2d hai
& verstecke2d frosch2
kapitel "25. Nach den Dinosauriern" 3
hintergrund tafel in 2
zeitleiste2d zl2 bei 0 10 breite 86
zeitpunkt2d zl2 auf erdneuzeit in 2
sprecher "Jetzt sind wir in der Erdneuzeit."
sprecher "Ohne die großen Dinosaurier hatten die Säugetiere plötzlich viel Platz."
sprecher "Aus den kleinen, mausgroßen Säugetieren wurden ganz verschiedene Tiere. Große und kleine."
verstecke2d zl2
hintergrund eiszeit in 2
dino2d mammut art mammut bei -50 -11 groesse 14
bewege2d mammut zu -10 -11 in 6
& ton stampfen
& text2d "Mammut" an mammut 5
sprecher "Viel später kam die Eiszeit. Da war es sehr kalt."
sprecher "Damals lebten Mammuts. Sie hatten ein dickes, zotteliges Fell gegen die Kälte."
sprecher "Und lange, gebogene Stoßzähne."
kind2d mensch bei 26 -11 groesse 12
sprecher "Und ganz am Ende kamen die Menschen."
sprecher "Die ersten Menschen haben Mammuts gesehen. Aber nie einen Dinosaurier!"
sprecher "Zwischen den letzten Dinosauriern und den ersten Menschen liegen über sechzig Millionen Jahre."
sprecher@6-9,10+ "In manchen Filmen kämpfen Menschen gegen Dinosaurier. Aber das ist nur ausgedacht."
warte 1.5
verstecke2d mammut
& verstecke2d mensch
kapitel "26. Woher wissen wir das alles?" 3
hintergrund erdschichten in 2
sprecher "Aber woher wissen wir das alles? Es war ja niemand dabei."
dino2d fossilrex art trex bei 6 -14 groesse 12 skelett
& ton magie
sprecher "Die Antwort steckt in der Erde. In den Steinen."
sprecher "Wenn ein Dinosaurier gestorben ist, wurde er manchmal ganz schnell von Schlamm oder Sand zugedeckt."
sprecher "Im Laufe von Millionen Jahren wurden seine Knochen zu Stein. Das nennt man Fossil."
sprecher "Die Erde besteht aus vielen Schichten. Wie eine riesige Torte."
sprecher "Je tiefer eine Schicht liegt, desto älter ist sie."
sprecher "Auch Fußspuren, Eier und sogar versteinerter Dino-Kot wurden gefunden!"
sprecher@6-9,10+ "Versteinerter Kot heißt Koprolith. Daran sieht man, was ein Dino gegessen hat."
verstecke2d fossilrex
hintergrund kreide in 2
kind2d forscherin bei -20 -11 groesse 12
& symbol2d pinsel "🖌️" bei -10 -6 groesse 5
& symbol2d hammer "⛏️" bei -4 -8 groesse 5
sprecher "Menschen, die Fossilien suchen und erforschen, heißen Paläontologen."
sprecher "Sie graben ganz vorsichtig. Mit kleinen Hämmern und Pinseln."
sprecher "Manchmal dauert es Jahre, bis ein ganzes Skelett ausgegraben ist."
verstecke2d pinsel
& verstecke2d hammer
dino2d museum art langhals bei 18 -11 groesse 24 skelett
& ton glocke
sprecher "Danach setzen sie die Knochen zusammen wie ein riesiges Puzzle."
sprecher "Und im Museum kannst du die Skelette dann anschauen. Das ist wirklich toll!"
sprecher@10+ "Aus der Form der Knochen, der Muskelansätze und der Zähne können Forscher berechnen, wie schwer ein Tier war und wie schnell es laufen konnte."
warte 1.5
verstecke2d forscherin
& verstecke2d museum
kapitel "27. Spuren im Stein" 3
hintergrund urzeit in 2
symbol2d spur1 "👣" bei -30 -14 groesse 5
& symbol2d spur2 "👣" bei -18 -16 groesse 5
& symbol2d spur3 "👣" bei -6 -14 groesse 5
& ton plopp
sprecher "Forscher finden nicht nur Knochen. Manchmal finden sie auch Fußspuren."
sprecher "Ein Dino ist durch weichen Schlamm gelaufen. Der Schlamm wurde hart und später zu Stein."
dino2d spurdino art allosaurus bei 20 -11 groesse 12
sprecher "An den Spuren sieht man, wie groß der Dino war und wie schnell er gelaufen ist."
sprecher "Manchmal sieht man sogar, dass viele Dinos zusammen gelaufen sind. Als Herde."
sprecher@6-9,10+ "Es gibt Stellen, da findet man hunderte Dino-Spuren nebeneinander. Wie auf einem Dino-Spielplatz."
warte 1.5
verstecke2d spur1
& verstecke2d spur2
& verstecke2d spur3
& verstecke2d spurdino
kapitel "28. Dinosaurier in Deutschland" 3
hintergrund jura in 2
sprecher "Auch bei uns in Deutschland haben Forscher Dinosaurier gefunden!"
dino2d de1 art plateosaurus bei -26 -11 groesse 13
& ton plopp
sprecher "Im Süden von Deutschland fand man ganz viele Skelette vom Plateosaurus. Den kennst du schon aus der Trias."
dino2d de2 art urvogel bei 4 -11 groesse 7
& ton quieken
sprecher "In Bayern hat man den Urvogel gefunden. In ganz feinem Kalkstein."
sprecher "Darin waren sogar die Federn zu sehen!"
dino2d de3 art langhals bei 26 -11 groesse 9
& ton plopp
sprecher "Und in Niedersachsen lebte ein kleiner Langhals-Dino. Er heißt Europasaurus."
sprecher "Er war viel kleiner als seine riesigen Verwandten. Nur so groß wie ein Pferd."
sprecher "Er lebte nämlich auf einer Insel. Und auf Inseln gab es nicht so viel Futter."
sprecher@10+ "Dass Tiere auf Inseln mit der Zeit kleiner werden, nennt man Inselverzwergung."
sprecher "Vielleicht gibt es ja auch in einem Museum in deiner Nähe Dino-Knochen zu sehen."
warte 1.5
verstecke2d de1
& verstecke2d de2
& verstecke2d de3
kapitel "29. Dino-Rekorde" 3
hintergrund jura in 2
dino2d riese art langhals bei 0 -11 groesse 40
& ton stampfen
sprecher "Zum Schluss noch ein paar Dino-Rekorde!"
sprecher "Die allergrößten Dinosaurier waren Langhälse. Manche waren so lang wie drei Busse."
sprecher@6-9,10+ "Einer der größten heißt Argentinosaurus. Er wog wahrscheinlich so viel wie fünfzehn Elefanten."
verstecke2d riese
dino2d mini art klein bei -6 -11 groesse 4
& ton quieken
sprecher "Die kleinsten Dinosaurier waren nur so groß wie ein Huhn."
dino2d schnell art klein bei -40 -11 groesse 9
bewege2d schnell zu 40 -11 in 2
& ton schwung
sprecher "Die schnellsten konnten so schnell rennen wie ein Auto in der Stadt."
sprecher "Und die klügsten Dinos waren kleine Jäger mit großen Augen und großem Gehirn."
sprecher@10+ "Bis heute wurden über tausend verschiedene Dinosaurier-Arten entdeckt. Und jedes Jahr kommen neue dazu."
warte 1.5
verstecke2d mini
& verstecke2d schnell
kapitel "30. Wie groß im Vergleich zu dir?" 3
hintergrund kreide in 2
kind2d ich bei -36 -11 groesse 12
& ton plopp
& text2d "du" an ich 6
sprecher "Wie groß warst du eigentlich im Vergleich zu den Dinosauriern?"
dino2d v1 art raptor bei -24 -11 groesse 7
sprecher "Ein Velociraptor wäre dir nur bis zum Bauch gegangen."
dino2d v2 art triceratops bei -6 -11 groesse 15
& ton stampfen
sprecher "Ein Triceratops war so groß wie ein Auto."
dino2d v3 art trex bei 18 -11 groesse 24
& ton stampfen
sprecher "Neben einem T-Rex hättest du gerade mal bis zu seinem Knie gereicht."
sprecher "Und ein Brachiosaurus? Neben dem wärst du so klein wie eine Maus neben einem Elefanten!"
warte 1.5
verstecke2d ich
& verstecke2d v1
& verstecke2d v2
& verstecke2d v3
kapitel "31. Dino-Quiz" 3
hintergrund tafel in 2
sprecher "Jetzt machen wir ein Quiz! Ich zeige dir einen Dino. Und du sagst, wie er heißt."
dino2d qz1 art stegosaurus bei 0 -8 groesse 14
& ton plopp
sprecher "Wer ist das? Er hat Platten auf dem Rücken und Stacheln am Schwanz."
warte 4
& ton tada
sprecher "Richtig! Das ist der Stegosaurus."
verstecke2d qz1
dino2d qz2 art triceratops bei 0 -8 groesse 13
& ton plopp
sprecher "Und wer ist das? Er hat drei Hörner."
warte 4
& ton tada
sprecher "Super! Das ist der Triceratops."
verstecke2d qz2
dino2d qz3 art trex bei 0 -8 groesse 16
& ton plopp
sprecher "Und dieser hier? Er hat riesige Zähne und winzige Arme."
warte 4
& ton tada
sprecher "Genau! Das ist der T-Rex."
verstecke2d qz3
dino2d qz4 art flugsaurier bei 0 4 groesse 12
& ton plopp
sprecher "Und jetzt eine Fangfrage: Ist das ein Dinosaurier?"
warte 4
& ton tada
sprecher "Nein! Das ist ein Flugsaurier. Er war nur ein Verwandter der Dinosaurier."
verstecke2d qz4
symbol2d qz5 "🐔" bei 0 -2 groesse 14
& ton plopp
sprecher "Und die letzte Frage: Ist ein Huhn ein Dinosaurier?"
warte 4
& ton tada
sprecher "Ja! Vögel stammen von den Dinosauriern ab. Du bist ein echter Dino-Profi!"
warte 1.5
verstecke2d qz5
kapitel "32. Unsere Zeitreise noch einmal" 3
hintergrund tafel in 2
zeitleiste2d zr bei 0 16 breite 86
sprecher "Zum Schluss reisen wir noch einmal ganz schnell durch alle Zeitalter."
zeitpunkt2d zr auf erdaltertum in 1.5
& dino2d zr1 art trilobit bei 0 -4 groesse 12
sprecher "Im Erdaltertum lebten Trilobiten und die ersten Fische im Meer. Dann kamen Tiere an Land."
verstecke2d zr1
zeitpunkt2d zr auf trias in 1.5
& dino2d zr2 art klein bei 0 -12 groesse 14
sprecher "In der Trias gab es Pangäa. Und die ersten, noch kleinen Dinosaurier."
verstecke2d zr2
zeitpunkt2d zr auf jura in 1.5
& dino2d zr3 art langhals bei 0 -16 groesse 24
sprecher "Im Jura lebten die riesigen Langhälse, der Stegosaurus und der Urvogel."
verstecke2d zr3
zeitpunkt2d zr auf kreide in 1.5
& dino2d zr4 art trex bei 0 -16 groesse 22
sprecher "In der Kreidezeit blühten die ersten Blumen. Und der T-Rex und der Triceratops lebten."
verstecke2d zr4
meteor2d zrm von -45 30 nach 25 -8 in 2
sprecher "Dann kam der Asteroid. Und die großen Dinosaurier starben aus."
zeitpunkt2d zr auf erdneuzeit in 1.5
& dino2d zr5 art mammut bei 0 -16 groesse 18
sprecher "In der Erdneuzeit wurden die Säugetiere groß. Es gab Mammuts. Und schließlich uns Menschen."
verstecke2d zr5
symbol2d zr6 "🐦" bei 0 -4 groesse 12
sprecher "Und die Vögel? Die sind die Dinosaurier, die bis heute überlebt haben."
warte 1.5
verstecke2d zr6
& verstecke2d zr
hintergrund tafel in 2
tafel@3-5 "Merk dir:" "Dinos lebten vor Millionen Jahren." "Trias, Jura, Kreidezeit" "Sie schlüpften aus Eiern." "Ein Asteroid beendete ihre Zeit." "Vögel sind kleine Dinos!" rechts 22
tafel@6-9 "Merk dir:" "Erdaltertum, Erdmittelalter, Erdneuzeit" "Dinos: Trias, Jura, Kreidezeit" "Pangäa brach auseinander." "Asteroid vor 66 Mio. Jahren" "Fossilien verraten alles." "Vögel stammen von Dinos ab." rechts 24
tafel@10+ "Merke:" "Paläozoikum, Mesozoikum, Känozoikum" "Trias 252, Jura 201, Kreide 145 Mio." "Pangäa zerbrach in Laurasia und Gondwana" "Aussterben vor 66 Mio. Jahren" "Fossilien in Gesteinsschichten" "Vögel sind lebende Dinosaurier" rechts 24
sprecher "Merk dir: Die Dinosaurier lebten vor vielen Millionen Jahren. In der Trias, im Jura und in der Kreidezeit."
sprecher "Sie schlüpften aus Eiern, manche waren riesig und manche ganz klein."
sprecher "Ein Asteroid hat ihre Zeit beendet. Aber in den Vögeln leben sie bis heute weiter."
ton tada
warte 2
sprecher "Tschüss! Und wenn du das nächste Mal einen Vogel siehst, dann sag mal: Hallo, kleiner Dino!"
ausblenden 1.5`,
  };
})();
