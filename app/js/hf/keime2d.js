// Blockfilm – Keime, Abwehr und der menschliche Körper im Flat-Look für HyperFrames.
// Geometrie und Abläufe wie im alten Zeichner (welt2d.js: keim(), koerper()); alles, was sich mit der Zeit
// verändert (Drehen, Teilen, Herzschlag, Blut, Nerven, Essen, Winken), setzt HF.bewegung[typ] bei jedem Seek.
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const OB = HF.objektGrafik;
  const BW = (HF.bewegung = HF.bewegung || {});
  const { hell, dunkel, rgba } = HF.farbe;
  const f3 = v => Math.round(v * 1000) / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ell = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${f3(x)}" cy="${f3(y)}" rx="${f3(rx)}" ry="${f3(ry)}" fill="${f}"${extra}/>`;

  // Gesicht wie im alten Zeichner (nett oder frech), Mittelpunkt x y, Größe r
  function gesicht(x, y, r, art, stil) {
    const S = stil.palette.schwarz;
    let s = '';
    for (const sg of [-1, 1]) s += ell(x + sg * r * 0.32, y - r * 0.12, r * 0.2, r * 0.25, '#ffffff') + `<circle cx="${f3(x + sg * r * 0.32 + r * 0.04)}" cy="${f3(y - r * 0.08)}" r="${f3(r * 0.11)}" fill="${S}"/><circle cx="${f3(x + sg * r * 0.32 + r * 0.08)}" cy="${f3(y - r * 0.13)}" r="${f3(r * 0.035)}" fill="#fff"/>`;
    const w = f3(Math.max(0.02, r * 0.08));
    if (art === 'frech') s += `<path d="M${f3(x - r * 0.52)} ${f3(y - r * 0.47)} L${f3(x - r * 0.14)} ${f3(y - r * 0.34)} M${f3(x + r * 0.52)} ${f3(y - r * 0.47)} L${f3(x + r * 0.14)} ${f3(y - r * 0.34)}" stroke="${S}" stroke-width="${w}" stroke-linecap="round"/>`;
    s += `<path d="M${f3(x - r * 0.24)} ${f3(y + r * 0.18)} Q${f3(x)} ${f3(y + r * (art === 'frech' ? 0.5 : 0.42))} ${f3(x + r * 0.24)} ${f3(y + r * 0.18)}" stroke="${S}" stroke-width="${w}" stroke-linecap="round" fill="${art === 'frech' ? rgba('#ffffff', 0.9) : 'none'}"/>`;
    return s;
  }

  // ---------- Virus ----------
  function virusSvg(f, stil, ohneGesicht) {
    const D = dunkel(f, 0.12), knopf = stil.palette.gelb;
    let st = '';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); st += `<line x1="${f3(c * 0.85)}" y1="${f3(s * 0.85)}" x2="${f3(c * 1.32)}" y2="${f3(s * 1.32)}" stroke="${D}" stroke-width="0.1" stroke-linecap="round"/><circle cx="${f3(c * 1.4)}" cy="${f3(s * 1.4)}" r="0.15" fill="${knopf}"/>`; }
    const koerper = `<circle r="1" fill="${f}"/><path d="M0.95 0.3 A1 1 0 0 1 -0.95 0.3 A1.2 0.7 0 0 0 0.95 0.3 Z" fill="${D}"/>${[[-0.4, 0.15, 0.13], [0.35, -0.45, 0.1], [0.2, 0.5, 0.11]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${D}"/>`).join('')}<circle cx="-0.38" cy="-0.42" r="0.2" fill="${rgba('#ffffff', 0.45)}"/>`;
    return `<g class="dreh">${st}${koerper}</g>${ohneGesicht ? '' : gesicht(0, 0.05, 0.8, 'frech', stil)}`;
  }
  OB.virus = (o, stil) => ({ k: 1.6, svg: virusSvg(HF.stilFarbe(stil, o.farbe || '#9a5ae0'), stil, o.ohneGesicht) });
  BW.virus = (el, o, t) => {
    const g = el._bf || (el._bf = el.querySelector('.dreh'));
    g.setAttribute('transform', `rotate(${f3((t * 0.4 + Math.sin(t * 3 + o.r) * 0.08) * 180 / Math.PI)})`);
  };

  // ---------- Bakterie (kann sich teilen) ----------
  OB.bakterie = (o, stil) => {
    const f = HF.stilFarbe(stil, o.farbe || (o.gut ? '#5ac85a' : '#e07a3a')), D = dunkel(f, 0.1);
    const L = 1.1, B = 0.55;
    const eine = `<path class="geissel" d="" stroke="${D}" stroke-width="0.09" stroke-linecap="round" fill="none"/><rect x="${-L}" y="${-B}" width="${2 * L}" height="${2 * B}" rx="${B}" fill="${f}"/><rect x="${-L}" y="0.05" width="${2 * L}" height="${B - 0.05}" rx="${f3(B * 0.9)}" fill="${D}"/><rect x="${-L}" y="0" width="${2 * L}" height="0.2" fill="${f}"/><ellipse cx="${f3(-L * 0.3)}" cy="${f3(-B * 0.45)}" rx="${f3(L * 0.45)}" ry="${f3(B * 0.2)}" fill="${rgba('#ffffff', 0.3)}"/>${o.ohneGesicht ? '' : gesicht(L * 0.35, 0, B * 0.9, o.gut ? 'nett' : 'frech', stil)}`;
    return { k: 2.7, svg: `<g class="teil t0"><g class="wackel">${eine}</g></g><g class="teil t1" style="display:none"><g class="wackel">${eine}</g></g>` };
  };
  BW.bakterie = (el, o, t) => {
    const c = el._bf || (el._bf = { teile: [...el.querySelectorAll('.teil')], wackel: [...el.querySelectorAll('.wackel')], geissel: [...el.querySelectorAll('.geissel')] });
    let teile = [[0, 1]];
    if (o.teilung && t >= o.teilung.t0) { const u = clamp((t - o.teilung.t0) / (o.teilung.t1 - o.teilung.t0), 0, 1); teile = [[-u * 1.15, 1 - u * 0.15], [u * 1.15, 1 - u * 0.15]]; }
    c.teile.forEach((g, i) => {
      if (!teile[i]) { g.style.display = 'none'; return; }
      g.style.display = '';
      const [dx, sk] = teile[i];
      g.setAttribute('transform', `translate(${f3(dx)} ${f3(Math.sin(t * 2 + dx) * 0.05)}) scale(${f3(sk)} 1)`);
      c.wackel[i].setAttribute('transform', `rotate(${f3(Math.sin(t * 3 + o.r) * 0.04 * 180 / Math.PI)})`);
      let d = 'M-1.1 0';
      for (let k = 0; k <= 10; k++) d += ` L${f3(-1.1 - k * 0.12)} ${f3(Math.sin(t * 10 + k) * 0.12)}`;
      c.geissel[i].setAttribute('d', d);
    });
  };

  // ---------- Zelle (mit Schlössern auf der Hülle) ----------
  OB.zelle = (o, stil) => {
    const f = HF.stilFarbe(stil, o.farbe || '#f6b8c8'), D = dunkel(f, 0.1), L = hell(f, 0.06);
    let s = `<circle r="1" fill="${D}"/><circle r="0.93" fill="${f}"/><circle cx="-0.15" cy="-0.15" r="0.6" fill="${L}"/><circle cx="0.15" cy="0.1" r="0.3" fill="${dunkel(stil.palette.lila, 0.05)}"/><circle cx="0.08" cy="0.02" r="0.12" fill="${rgba('#ffffff', 0.25)}"/>`;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; s += `<circle cx="${f3(Math.cos(a))}" cy="${f3(Math.sin(a))}" r="0.08" fill="${stil.palette.lila}"/>`; }
    if (!o.kopien) return { k: 1.2, svg: s };
    // Virus-Kopien entstehen in der Zelle; beim Platzen fliegen sie heraus
    const v = virusSvg(HF.stilFarbe(stil, '#9a5ae0'), stil, false);
    let kopien = '';
    for (let i = 0; i < o.kopien.n; i++) kopien += `<g class="kopie" style="display:none">${v}</g>`;
    return { k: 2.8, svg: `<g class="huelle">${s}</g>${kopien}` };
  };
  BW.zelle = (el, o, t) => {
    const K = o.kopien;
    if (!K) return;
    const c = el._bf || (el._bf = { h: el.querySelector('.huelle'), k: [...el.querySelectorAll('.kopie')].map(g => ({ g, d: g.querySelector('.dreh') })) });
    const platzt = K.platzen !== null && t >= K.platzen;
    c.h.setAttribute('opacity', platzt ? f3(clamp(1 - (t - K.platzen) / 0.5, 0, 1)) : 1);
    const rr = BF.rng(BF.hash(o.name) + 3);
    for (let i = 0; i < K.n; i++) {
      const da = K.t0 + (i / K.n) * (K.t1 - K.t0);
      const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * 0.65;
      const e = c.k[i];
      if (t < K.t0 || t < da) { e.g.style.display = 'none'; continue; }
      let x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (platzt) { const dt = t - K.platzen, fl = 1.3 * Math.min(dt, 1) + 0.12 * Math.max(0, dt - 1); x += Math.cos(a) * fl; y += Math.sin(a) * fl; }
      e.g.style.display = '';
      e.g.setAttribute('transform', `translate(${f3(x)} ${f3(y)}) scale(${f3(0.11 * Math.min(1, (t - da) / 0.4 + 0.2))})`);
      e.d.setAttribute('transform', `rotate(${f3(((t + i) * 0.4) * 180 / Math.PI)})`);
    }
  };

  // ---------- Abwehrzelle (mit Polizeimütze) ----------
  OB.abwehr = (o, stil) => {
    const f = o.farbe ? HF.stilFarbe(stil, o.farbe) : '#f4f6fb', D = dunkel(f, 0.08), P = stil.palette;
    let s = `<path class="blob" d="" fill="${f}"/><path class="blobS" d="" fill="${D}"/>`;
    if (!o.ohneGesicht) s += gesicht(0, 0.1, 0.7, 'nett', stil) + `<path d="M-0.55 -0.62 A0.55 0.24 0 0 1 0.55 -0.62 Z" fill="${P.blau}"/><rect x="-0.64" y="-0.66" width="1.28" height="0.14" rx="0.07" fill="${dunkel(P.blau, 0.1)}"/><circle cx="0" cy="-0.74" r="0.09" fill="${P.gelb}"/>`;
    return { k: 1.3, svg: s };
  };
  BW.abwehr = (el, o, t) => {
    const c = el._bf || (el._bf = { b: el.querySelector('.blob'), s: el.querySelector('.blobS') });
    const pfad = (k, dy) => { let d = ''; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, rr = k * (1 + Math.sin(a * 4 + t * 2) * 0.07); d += `${i ? 'L' : 'M'}${f3(Math.cos(a) * rr)} ${f3(Math.sin(a) * rr + dy)}`; } return d + 'Z'; };
    c.s.setAttribute('d', pfad(1, 0)); c.b.setAttribute('d', pfad(0.94, -0.05));
  };

  // ---------- Antikörper ----------
  OB.antikoerper = (o, stil) => {
    const f = HF.stilFarbe(stil, o.farbe || '#3ab0e8');
    return { k: 1.2, svg: `<g class="dreh"><path d="M0 1 L0 0 L-0.7 -0.8 M0 0 L0.7 -0.8" stroke="${f}" stroke-width="0.24" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="-0.7" cy="-0.8" r="0.16" fill="${hell(f, 0.12)}"/><circle cx="0.7" cy="-0.8" r="0.16" fill="${hell(f, 0.12)}"/></g>` };
  };
  BW.antikoerper = (el, o, t) => {
    const g = el._bf || (el._bf = el.querySelector('.dreh'));
    g.setAttribute('transform', `rotate(${f3(Math.sin(t * 2 + o.r * 7) * 0.3 * 180 / Math.PI)})`);
  };

  // ---------- Körper mit Organen (Ursprung = Füße, Höhe 1 = o.r; y nach oben = negative SVG-y) ----------
  // Ein Kind von vorne mit kurzer Hose. Organe liegen dort, wo sie wirklich sitzen (von vorne gesehen:
  // das Herz und der Magen liegen auf der Bildseite rechts, denn das ist die linke Seite des Kindes).
  const ORGANE = ['knochen', 'nerven', 'gehirn', 'lunge', 'blut', 'herz', 'magen', 'darm'];
  const P2 = (x, y) => `${f3(x)} ${f3(-y)}`;
  const glied = (a, b, d, f, cls = '') => `<line${cls ? ` class="${cls}"` : ''} x1="${f3(a[0])}" y1="${f3(-a[1])}" x2="${f3(b[0])}" y2="${f3(-b[1])}" stroke="${f}" stroke-width="${f3(d)}" stroke-linecap="round"/>`;
  const weg = pts => 'M' + pts.map(q => P2(q[0], q[1])).join(' L');
  // Pfad aus Befehlen mit Punkten in Körper-Koordinaten: pfad('M', [x, y], 'C', [x, y], [x, y], [x, y], …)
  const pfad = (...teile) => teile.map(p => (typeof p === 'string' ? p : P2(p[0], p[1]))).join(' ');
  const spiegel = pts => pts.map(p => (typeof p === 'string' ? p : [-p[0], p[1]]));
  const SCHULTER = [-0.128, 0.75], ARM_LANG = 0.3;
  const armBei = aw => [SCHULTER[0] - Math.sin(aw) * ARM_LANG, SCHULTER[1] - Math.cos(aw) * ARM_LANG];
  const ARM_RUHE = armBei(0.14), HAND_R = [0.168, 0.455];
  // Nerven: Rückenmark, Arme bis in die Hände, Beine bis in die Füße (alle beginnen am Rückenmark)
  const NERVEN = arm => [
    [[0, 0.875], [0, 0.82], [0, 0.47]],
    [[0, 0.745], [-0.1, 0.748], [-0.128, 0.742], arm],
    [[0, 0.745], [0.1, 0.748], [0.128, 0.742], HAND_R],
    [[0, 0.47], [-0.035, 0.44], [-0.058, 0.3], [-0.056, 0.06], [-0.088, 0.024]],
    [[0, 0.47], [0.035, 0.44], [0.058, 0.3], [0.056, 0.06], [0.088, 0.024]],
  ];
  // Blutgefäße: alle gehen vom Herzen aus
  const HERZ = [0.022, 0.665];
  const BLUT = arm => [
    [HERZ, [0.012, 0.74], [0.018, 0.8], [0.026, 0.835]],
    [HERZ, [-0.012, 0.74], [-0.018, 0.8], [-0.026, 0.835]],
    [HERZ, [0.06, 0.735], [0.128, 0.742], HAND_R],
    [HERZ, [-0.04, 0.735], [-0.128, 0.742], [arm[0], arm[1] + 0.01]],
    [HERZ, [0.006, 0.6], [0.004, 0.47], [-0.04, 0.43], [-0.062, 0.25], [-0.06, 0.05]],
    [HERZ, [0.006, 0.6], [0.004, 0.47], [0.04, 0.43], [0.062, 0.25], [0.06, 0.05]],
  ];
  // Dünndarm als Schlangenlinie im Bauch (auch der Weg für das Essen)
  const DARM = (() => { const p = [[-0.012, 0.535]]; for (let r = 0; r < 4; r++) { const y = 0.512 - r * 0.02, a = r % 2 ? 0.05 : -0.05; p.push([a, y], [-a, y]); } p.push([0.02, 0.43]); return p; })();
  const aufWeg = (w, u) => {
    const l = []; let ges = 0;
    for (let i = 1; i < w.length; i++) { const d = Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]); l.push(d); ges += d; }
    let s = clamp(u, 0, 1) * ges;
    for (let i = 0; i < l.length; i++) { if (s <= l[i] || i === l.length - 1) { const f = l[i] ? Math.min(1, s / l[i]) : 0; return [lerp(w[i][0], w[i + 1][0], f), lerp(w[i][1], w[i + 1][1], f)]; } s -= l[i]; }
    return w[w.length - 1];
  };
  // Zweige an einer Hand: drei kurze Linien in Richtung des Arms
  const fingerZweige = (von, hand, lang = 0.03) => {
    const a = Math.atan2(hand[1] - von[1], hand[0] - von[0]);
    return [-0.6, 0, 0.6].map(d => weg([hand, [hand[0] + Math.cos(a + d) * lang, hand[1] + Math.sin(a + d) * lang]])).join(' ');
  };

  OB.koerper = (o, stil, id) => {
    const P = stil.palette, haut = '#f8cfae', schatten = '#eab48f', dunkelHaut = '#d99a74';
    const hose = hell(HF.stilFarbe(stil, '#3a7bd5'), 0.22), hoseS = dunkel(hose, 0.1), haar = '#8a5a3c';
    const cid = 'kc' + String(id || o.name).replace(/[^a-zA-Z0-9_-]/g, '');
    let s = `<defs><clipPath id="${cid}"><rect x="0.035" y="-1.2" width="0.3" height="1.25"/></clipPath></defs>`;
    s += `<ellipse cx="0" cy="0.004" rx="0.17" ry="0.018" fill="rgba(0,0,0,0.14)"/>`;
    // hinterer Arm (Bildseite rechts) mit Hand
    s += glied([0.128, 0.75], HAND_R, 0.056, schatten) + `<circle cx="${f3(HAND_R[0])}" cy="${f3(-HAND_R[1])}" r="0.032" fill="${schatten}"/>`;
    // Beine mit Füßen
    const bein = [[-0.122, 0.47], 'L', [-0.004, 0.47], 'L', [-0.008, 0.42], 'C', [-0.02, 0.3], [-0.03, 0.15], [-0.032, 0.05], 'L', [-0.084, 0.05], 'C', [-0.09, 0.18], [-0.115, 0.3], [-0.122, 0.47], 'Z'];
    s += `<path d="${pfad('M', ...bein)}" fill="${haut}"/><path d="${pfad('M', ...spiegel(bein))}" fill="${schatten}"/>`;
    s += ell(-0.066, -0.026, 0.046, 0.025, haut) + ell(0.066, -0.026, 0.046, 0.025, schatten);
    // Hals, Rumpf (rechte Hälfte im Schatten)
    s += `<rect x="-0.03" y="-0.83" width="0.06" height="0.06" fill="${haut}"/><rect x="0.006" y="-0.83" width="0.024" height="0.06" fill="${schatten}"/>`;
    const rumpf = pfad('M', [-0.03, 0.795], 'C', [-0.08, 0.792], [-0.135, 0.787], [-0.14, 0.74], 'L', [-0.13, 0.66], 'C', [-0.124, 0.605], [-0.108, 0.585], [-0.108, 0.55], 'C', [-0.108, 0.52], [-0.124, 0.49], [-0.123, 0.455], 'L', [0.123, 0.455], 'C', [0.124, 0.49], [0.108, 0.52], [0.108, 0.55], 'C', [0.108, 0.585], [0.124, 0.605], [0.13, 0.66], 'L', [0.14, 0.74], 'C', [0.135, 0.787], [0.08, 0.792], [0.03, 0.795], 'Z');
    s += `<path d="${rumpf}" fill="${haut}"/><path d="${rumpf}" fill="${schatten}" clip-path="url(#${cid})"/>`;
    s += `<path d="${pfad('M', [-0.025, 0.66], 'Q', [-0.06, 0.64], [-0.085, 0.665])}" stroke="${schatten}" stroke-width="0.006" stroke-linecap="round" fill="none"/>`;
    s += `<circle cx="0" cy="-0.545" r="0.006" fill="${dunkelHaut}"/>`;
    // kurze Hose
    const hosePfad = pfad('M', [-0.124, 0.505], 'L', [0.124, 0.505], 'L', [0.121, 0.36], 'L', [0.02, 0.36], 'L', [0, 0.41], 'L', [-0.02, 0.36], 'L', [-0.121, 0.36], 'Z');
    s += `<path d="${hosePfad}" fill="${hose}"/><path d="${hosePfad}" fill="${hoseS}" clip-path="url(#${cid})"/><rect x="-0.124" y="-0.505" width="0.248" height="0.022" fill="${hoseS}"/>`;
    // vorderer Arm (winkt) mit Hand
    s += glied(SCHULTER, ARM_RUHE, 0.056, haut, 'arm') + `<circle class="hand" cx="${f3(ARM_RUHE[0])}" cy="${f3(-ARM_RUHE[1])}" r="0.032" fill="${haut}"/>`;
    // Kopf mit Ohren, Haaren und Gesicht
    s += ell(-0.079, -0.875, 0.016, 0.022, haut) + ell(0.079, -0.875, 0.016, 0.022, schatten);
    s += ell(0, -0.885, 0.078, 0.088, schatten) + ell(-0.008, -0.885, 0.07, 0.086, haut);
    s += `<path d="${pfad('M', [-0.08, 0.885], 'C', [-0.088, 0.99], [0.088, 0.99], [0.08, 0.885], 'C', [0.07, 0.93], [0.03, 0.945], [0.0, 0.925], 'C', [-0.025, 0.95], [-0.065, 0.93], [-0.08, 0.885], 'Z')}" fill="${haar}"/>`;
    s += [-1, 1].map(sg => ell(sg * 0.028, -0.872, 0.015, 0.018, '#ffffff') + `<circle cx="${f3(sg * 0.028 + 0.003)}" cy="-0.869" r="0.01" fill="${P.schwarz}"/><circle cx="${f3(sg * 0.028 + 0.006)}" cy="-0.873" r="0.0035" fill="#fff"/>`).join('');
    s += `<path d="M-0.022 -0.84 Q0 -0.82 0.022 -0.84" stroke="${dunkelHaut}" stroke-width="0.007" stroke-linecap="round" fill="none"/>` + [-1, 1].map(sg => `<circle cx="${f3(sg * 0.05)}" cy="-0.85" r="0.012" fill="${rgba(P.rot, 0.28)}"/>`).join('');

    // ---- Organe (jedes in eigener Gruppe, sichtbar über zeige2d) ----
    const O = {};
    const W = '#ffffff';
    // Skelett: Schädel, Wirbelsäule, Schlüsselbeine, Rippen, Becken, Arm- und Beinknochen
    let kn = `<ellipse cx="0" cy="-0.895" rx="0.06" ry="0.068" stroke="${W}" stroke-width="0.007" stroke-opacity="0.9" fill="none"/>`;
    for (let i = 0; i < 12; i++) kn += `<rect x="-0.008" y="${f3(-(0.79 - i * 0.027))}" width="0.016" height="0.02" rx="0.005" fill="${W}"/>`;
    kn += glied([-0.012, 0.775], [-0.115, 0.765], 0.012, W) + glied([0.012, 0.775], [0.115, 0.765], 0.012, W);
    kn += glied([0, 0.755], [0, 0.645], 0.014, W);
    for (let i = 0; i < 5; i++) { const y = 0.735 - i * 0.025; for (const sg of [-1, 1]) kn += `<path d="${pfad('M', [0, y], 'Q', [sg * 0.115, y + 0.012], [sg * 0.1, y - 0.04])}" stroke="${W}" stroke-width="0.009" stroke-linecap="round" fill="none"/>`; }
    kn += `<path d="${pfad('M', [-0.1, 0.49], 'C', [-0.06, 0.5], [-0.03, 0.47], [0, 0.47], 'C', [0.03, 0.47], [0.06, 0.5], [0.1, 0.49], 'C', [0.1, 0.45], [0.06, 0.42], [0.03, 0.425], 'L', [0, 0.44], 'L', [-0.03, 0.425], 'C', [-0.06, 0.42], [-0.1, 0.45], [-0.1, 0.49], 'Z')}" fill="${W}"/>`;
    for (const sg of [-1, 1]) kn += glied([sg * 0.062, 0.44], [sg * 0.06, 0.255], 0.016, W) + `<circle cx="${f3(sg * 0.06)}" cy="-0.25" r="0.013" fill="${W}"/>` + glied([sg * 0.06, 0.245], [sg * 0.056, 0.06], 0.014, W);
    kn += glied([0.128, 0.745], [lerp(0.128, HAND_R[0], 0.9), lerp(0.745, HAND_R[1], 0.9)], 0.013, W) + `<line class="armKnochen" stroke="${W}" stroke-width="0.013" stroke-linecap="round"/>`;
    O.knochen = kn;
    // Nerven: gelbe Leitungen mit Lichtpunkten, die Nachrichten zum Kopf und zurück tragen
    const nervStatisch = [0.72, 0.68, 0.64, 0.6, 0.56].map(y => weg([[0, y], [-0.09, y - 0.025]]) + ' ' + weg([[0, y], [0.09, y - 0.025]])).join(' ')
      + ' ' + fingerZweige([0.128, 0.742], HAND_R) + ' ' + [-1, 1].map(sg => weg([[sg * 0.056, 0.06], [sg * 0.06, 0.03], [sg * 0.1, 0.02]]) + ' ' + weg([[sg * 0.056, 0.06], [sg * 0.075, 0.018]])).join(' ')
      + ' ' + weg([[0, 0.875], [-0.03, 0.88]]) + ' ' + weg([[0, 0.875], [0.03, 0.88]]);
    O.nerven = `<g stroke="${P.gelb}" stroke-linejoin="round" stroke-linecap="round" fill="none"><path d="${nervStatisch}" stroke-width="0.004" stroke-opacity="0.85"/><path class="nf" d="" stroke-width="0.004" stroke-opacity="0.85"/>${NERVEN(ARM_RUHE).map((w, i) => `<path class="nw${i}" d="${weg(w)}" stroke-width="${i === 0 ? 0.011 : 0.007}"/>`).join('')}</g>`
      + `<circle cx="0" cy="-0.875" r="0.012" fill="${P.gelb}"/>` + NERVEN(ARM_RUHE).map((_, i) => `<circle class="nh${i}" r="0.022" fill="${rgba(P.gelb, 0.35)}"/><circle class="ns${i}" r="0.011" fill="#fff6a0"/>`).join('');
    // Gehirn: zwei Hälften mit Windungen im oberen Kopf
    let hirn = `<path d="${pfad('M', [0, 0.86], 'C', [-0.035, 0.85], [-0.065, 0.87], [-0.062, 0.9], 'C', [-0.06, 0.94], [-0.025, 0.952], [0, 0.94], 'C', [0.025, 0.952], [0.06, 0.94], [0.062, 0.9], 'C', [0.065, 0.87], [0.035, 0.85], [0, 0.86], 'Z')}" fill="#f6a5c0"/>`;
    hirn += `<path d="${pfad('M', [0, 0.94], 'L', [0, 0.862])}" stroke="#d8708e" stroke-width="0.004"/>`;
    hirn += [[-0.045, 0.915, 0.02], [-0.03, 0.89, 0.022], [-0.048, 0.88, 0.014], [0.02, 0.92, 0.02], [0.035, 0.895, 0.022], [0.025, 0.875, 0.016]].map(([x, y, r]) => `<path d="${pfad('M', [x - r / 2, y], 'q', [r / 4, 0.012], [r / 2, 0], 't', [r / 2, 0])}" stroke="#d8708e" stroke-width="0.004" stroke-linecap="round" fill="none"/>`).join('');
    hirn += ell(-0.025, -0.925, 0.018, 0.008, 'rgba(255,255,255,0.35)');
    O.gehirn = `<g transform="translate(0 -0.922) scale(0.92) translate(0 0.9)">${hirn}</g>`;
    // Lunge: Luftröhre, zwei Flügel (der linke mit Platz für das Herz)
    const lungeR = pfad('M', [-0.024, 0.75], 'C', [-0.06, 0.772], [-0.112, 0.75], [-0.117, 0.68], 'C', [-0.121, 0.63], [-0.112, 0.605], [-0.082, 0.6], 'C', [-0.05, 0.598], [-0.03, 0.608], [-0.022, 0.628], 'Z');
    const lungeL = pfad('M', [0.024, 0.75], 'C', [0.06, 0.772], [0.112, 0.75], [0.117, 0.68], 'C', [0.121, 0.63], [0.112, 0.605], [0.082, 0.6], 'C', [0.062, 0.6], [0.054, 0.62], [0.05, 0.638], 'C', [0.044, 0.66], [0.028, 0.66], [0.026, 0.69], 'Z');
    O.lunge = `<g>${glied([0, 0.81], [0, 0.73], 0.013, '#e9b0b8')}${glied([0, 0.73], [-0.035, 0.705], 0.009, '#e9b0b8')}${glied([0, 0.73], [0.035, 0.705], 0.009, '#e9b0b8')}`
      + `<g class="fluegel" data-cx="-0.07" data-cy="-0.68"><path d="${lungeR}" fill="#f38a9a"/><path d="${pfad('M', [-0.04, 0.735], 'C', [-0.08, 0.75], [-0.1, 0.72], [-0.1, 0.68])}" stroke="#ffb3be" stroke-width="0.008" stroke-linecap="round" fill="none"/></g>`
      + `<g class="fluegel" data-cx="0.07" data-cy="-0.68"><path d="${lungeL}" fill="#f07f91"/><path d="${pfad('M', [0.045, 0.735], 'C', [0.08, 0.75], [0.1, 0.72], [0.1, 0.68])}" stroke="#ffb3be" stroke-width="0.008" stroke-linecap="round" fill="none"/></g></g>`;
    // Blut: Adern (rot) und Venen (blau) mit Blutkörperchen
    O.blut = `<g>${BLUT(ARM_RUHE).map((_, i) => `<path class="bw${i}r" d="" stroke="${P.rot}" stroke-opacity="0.65" stroke-width="0.005" stroke-linejoin="round" fill="none"/><path class="bw${i}b" d="" stroke="${P.blau}" stroke-opacity="0.65" stroke-width="0.005" stroke-linejoin="round" fill="none"/>`).join('')}${Array.from({ length: BLUT(ARM_RUHE).length * 8 }, (_, i) => `<circle class="bp" r="0.008" fill="${i % 8 < 4 ? P.rot : P.blau}"/>`).join('')}</g>`;
    // Herz: zwischen den Lungenflügeln, etwas zur linken Körperseite, mit Hauptschlagader
    O.herz = `<g class="herzG"><circle cx="${HERZ[0]}" cy="${-HERZ[1]}" r="0.048" fill="${rgba(P.rot, 0.25)}"/>`
      + `<path d="${pfad('M', [0.012, 0.69], 'C', [0.008, 0.725], [0.04, 0.73], [0.042, 0.7])}" stroke="${dunkel(P.rot, 0.12)}" stroke-width="0.012" stroke-linecap="round" fill="none"/>`
      + `<path transform="translate(${HERZ[0]} ${-HERZ[1]}) rotate(-20) scale(0.09)" d="M0 0.42 C-0.55 0.05 -0.6 -0.42 -0.25 -0.5 C-0.1 -0.53 0 -0.43 0 -0.33 C0 -0.43 0.1 -0.53 0.25 -0.5 C0.6 -0.42 0.55 0.05 0 0.42 Z" fill="${dunkel(P.rot, 0.04)}"/>`
      + `<path transform="translate(${HERZ[0]} ${-HERZ[1]}) rotate(-20) scale(0.09)" d="M-0.3 -0.3 C-0.35 -0.1 -0.25 0.05 -0.15 0.12" stroke="rgba(255,255,255,0.45)" stroke-width="0.09" stroke-linecap="round" fill="none"/></g>`;
    // Magen: Speiseröhre und ein Magen in J-Form unter dem Herzen; daneben die Leber
    O.magen = `<g>${ell(-0.052, -0.58, 0.058, 0.032, '#c9705f', ` transform="rotate(-8 -0.052 -0.58)"`)}${glied([0.004, 0.83], [0.012, 0.6], 0.011, '#f0a888')}`
      + `<path d="${pfad('M', [0.006, 0.605], 'C', [0.004, 0.58], [0.03, 0.6], [0.055, 0.598], 'C', [0.097, 0.596], [0.103, 0.555], [0.088, 0.535], 'C', [0.072, 0.515], [0.03, 0.52], [0.016, 0.535], 'C', [0.006, 0.546], [0.012, 0.56], [0.022, 0.566], 'C', [0.01, 0.574], [-0.006, 0.585], [-0.004, 0.605], 'Z')}" fill="#f5a885"/>`
      + `<path d="${pfad('M', [0.035, 0.585], 'C', [0.06, 0.59], [0.08, 0.575], [0.082, 0.56])}" stroke="#ffc9ad" stroke-width="0.006" stroke-linecap="round" fill="none"/></g>`;
    // Darm: Dickdarm als Rahmen, Dünndarm als Schlangenlinie darin
    O.darm = `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${pfad('M', [-0.07, 0.43], 'L', [-0.078, 0.515], 'Q', [-0.078, 0.535], [-0.058, 0.535], 'L', [0.058, 0.535], 'Q', [0.078, 0.535], [0.078, 0.515], 'L', [0.072, 0.445], 'Q', [0.064, 0.425], [0.02, 0.428])}" stroke="#d98466" stroke-width="0.022"/>`
      + `<path d="${weg(DARM)}" stroke="#f4ae94" stroke-width="0.013"/><path d="${weg(DARM)}" stroke="#ffcdb8" stroke-width="0.004"/></g>`;
    s += ORGANE.map(n => `<g class="organ" data-organ="${n}" opacity="0">${O[n]}</g>`).join('');
    s += `<g class="essen" data-apfel="${P.rot}" style="display:none"><circle r="0.03" fill="${P.rot}"/><line x1="0" y1="-0.03" x2="0.005" y2="-0.045" stroke="${P.braun}" stroke-width="0.005"/></g>`;
    return { k: 1.05, svg: s };
  };
  BW.koerper = (el, o, t, F, q, I) => {
    const nN = NERVEN(ARM_RUHE).length, nB = BLUT(ARM_RUHE).length;
    const c = el._bf || (el._bf = {
      arm: el.querySelector('.arm'), hand: el.querySelector('.hand'), armK: el.querySelector('.armKnochen'), organe: [...el.querySelectorAll('.organ')],
      nw: Array.from({ length: nN }, (_, i) => el.querySelector('.nw' + i)), ns: Array.from({ length: nN }, (_, i) => el.querySelector('.ns' + i)), nh: Array.from({ length: nN }, (_, i) => el.querySelector('.nh' + i)), nf: el.querySelector('.nf'),
      bw: Array.from({ length: nB }, (_, i) => [el.querySelector(`.bw${i}r`), el.querySelector(`.bw${i}b`)]), bp: [...el.querySelectorAll('.bp')],
      herz: el.querySelector('.herzG'), lunge: [...el.querySelectorAll('.fluegel')], essen: el.querySelector('.essen'),
    });
    // Winken
    let wink = 0;
    for (const wk of o.winken) if (t >= wk.t0 && t < wk.t1) wink = Math.min(1, (t - wk.t0) / 0.4, (wk.t1 - t) / 0.4);
    const arm = armBei(lerp(0.14, 2.45 + Math.sin(t * 9) * 0.3, wink));
    const setz = (l, a, b) => { l.setAttribute('x1', f3(a[0])); l.setAttribute('y1', f3(-a[1])); l.setAttribute('x2', f3(b[0])); l.setAttribute('y2', f3(-b[1])); };
    setz(c.arm, SCHULTER, arm);
    if (c.hand) { c.hand.setAttribute('cx', f3(arm[0])); c.hand.setAttribute('cy', f3(-arm[1])); }
    if (c.armK) setz(c.armK, [SCHULTER[0], SCHULTER[1] - 0.005], [lerp(SCHULTER[0], arm[0], 0.9), lerp(SCHULTER[1], arm[1], 0.9)]);
    // Sichtbarkeit der Organe
    const sicht = {};
    for (const g of c.organe) { const n = g.dataset.organ, v = I.wertBei(o.organe[n] || [], t, 0); sicht[n] = v; g.setAttribute('opacity', f3(v)); }
    if (sicht.nerven > 0.01) {
      NERVEN(arm).forEach((w, i) => {
        c.nw[i].setAttribute('d', weg(w));
        // Rückenmark: Nachricht nach unten; Arme und Beine: von Händen und Füßen hinauf zum Kopf
        let u = (t * 0.7 + i * 0.27) % 1;
        if (i > 0) u = 1 - u;
        const p = aufWeg(w, u);
        for (const e of [c.ns[i], c.nh[i]]) { e.setAttribute('cx', f3(p[0])); e.setAttribute('cy', f3(-p[1])); }
      });
      if (c.nf) c.nf.setAttribute('d', fingerZweige(SCHULTER, arm));
    }
    if (sicht.blut > 0.01) {
      let n = 0;
      BLUT(arm).forEach((w, i) => {
        [[0.006, false], [-0.006, true]].forEach(([v, rueck], k) => {
          const wv = w.map(p => [p[0] + v, p[1]]);
          c.bw[i][k].setAttribute('d', weg(wv));
          for (let j = 0; j < 4; j++) {
            let u = (t * 0.3 + j / 4 + i * 0.13) % 1; if (rueck) u = 1 - u;
            const p = aufWeg(wv, u), e = c.bp[n++];
            if (e) { e.setAttribute('cx', f3(p[0])); e.setAttribute('cy', f3(-p[1])); }
          }
        });
      });
    }
    if (sicht.herz > 0.01) { const sch = 1 + Math.max(0, Math.sin(t * Math.PI * 2.4)) * 0.14; c.herz.setAttribute('transform', `translate(${HERZ[0]} ${-HERZ[1]}) scale(${f3(sch)}) translate(${-HERZ[0]} ${HERZ[1]})`); }
    if (sicht.lunge > 0.01) {
      const at = 1 + Math.sin(t * Math.PI * 0.5) * 0.06;
      c.lunge.forEach(l => { const x = +l.dataset.cx, y = +l.dataset.cy; l.setAttribute('transform', `translate(${x} ${y}) scale(${f3(1 + (at - 1) * 0.6)} ${f3(at)}) translate(${-x} ${-y})`); });
    }
    // Essen: Apfel in den Mund, dann Speiseröhre → Magen → Darm
    let zeigt = false;
    for (const e of o.essen) {
      const a = t - e;
      if (a < 0 || a > 9) continue;
      let pp;
      if (a < 1.5) pp = [lerp(0.4, 0, a / 1.5), lerp(0.95, 0.835, a / 1.5)];
      else if (a < 3) pp = [lerp(0.004, 0.012, (a - 1.5) / 1.5), lerp(0.83, 0.6, (a - 1.5) / 1.5)];
      else if (a < 5) pp = [0.055 + Math.sin(a * 6) * 0.012, 0.565];
      else pp = aufWeg(DARM, (a - 5) / 4);
      const gr = (a < 3 ? 0.03 : a < 5 ? 0.02 : 0.011) / 0.03;
      c.essen.setAttribute('transform', `translate(${f3(pp[0])} ${f3(-pp[1])}) scale(${f3(gr)})`);
      c.essen.firstElementChild.setAttribute('fill', a < 1.5 ? c.essen.dataset.apfel : '#d8b070');
      zeigt = true;
    }
    c.essen.style.display = zeigt ? '' : 'none';
  };
})();
