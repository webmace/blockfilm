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
  const ORGANE = ['knochen', 'nerven', 'gehirn', 'lunge', 'blut', 'herz', 'magen', 'darm'];
  const P2 = (x, y) => `${f3(x)} ${f3(-y)}`;
  const glied = (a, b, d, f, cls = '') => `<line${cls ? ` class="${cls}"` : ''} x1="${f3(a[0])}" y1="${f3(-a[1])}" x2="${f3(b[0])}" y2="${f3(-b[1])}" stroke="${f}" stroke-width="${f3(d)}" stroke-linecap="round"/>`;
  const weg = pts => 'M' + pts.map(q => P2(q[0], q[1])).join(' L');
  const NERVEN = arm => [[[0, 0.88], [0, 0.5], [-0.08, 0.06]], [[0, 0.88], [0, 0.5], [0.08, 0.06]], [[0, 0.88], [0, 0.78], [0.19, 0.78], [0.235, 0.47]], [[0, 0.88], [0, 0.78], [-0.19, 0.78], arm]];
  const BLUT = arm => [[[0.02, 0.68], [0, 0.88]], [[0.02, 0.68], [0.19, 0.76], [0.235, 0.48]], [[0.02, 0.68], [-0.19, 0.76], [arm[0], arm[1] + 0.01]], [[0.02, 0.68], [0.05, 0.5], [0.08, 0.05]], [[0.02, 0.68], [-0.05, 0.5], [-0.08, 0.05]]];
  const ARM_RUHE = [-0.19 - Math.sin(0.145) * 0.31, 0.78 - Math.cos(0.145) * 0.31];
  const aufWeg = (w, u) => { const seg = w.length - 1, k = Math.min(seg - 1, Math.floor(u * seg)), f = u * seg - k; return [lerp(w[k][0], w[k + 1][0], f), lerp(w[k][1], w[k + 1][1], f)]; };

  OB.koerper = (o, stil) => {
    const P = stil.palette, haut = '#f8cfae', schatten = '#eab48f', T = dunkel(P.blau, 0.02);
    let s = `<ellipse cx="0" cy="0.005" rx="0.2" ry="0.02" fill="rgba(0,0,0,0.15)"/>`;
    // Körper (hinterer Arm etwas dunkler)
    s += glied([0.19, 0.78], [0.235, 0.47], 0.062, schatten);
    s += glied([-0.07, 0.5], [-0.085, 0.03], 0.088, haut) + glied([0.07, 0.5], [0.085, 0.03], 0.088, schatten);
    s += `<rect x="-0.168" y="${f3(-0.815)}" width="0.336" height="0.335" rx="0.075" fill="${haut}"/><rect x="0.03" y="${f3(-0.815)}" width="0.138" height="0.335" rx="0.06" fill="${schatten}"/><rect x="0.02" y="-0.8" width="0.06" height="0.3" fill="${haut}"/>`;
    s += `<rect x="-0.03" y="-0.86" width="0.06" height="0.05" fill="${schatten}"/>` + ell(0, -0.9, 0.078, 0.093, haut) + ell(0.03, -0.9, 0.048, 0.088, schatten) + ell(0.015, -0.9, 0.05, 0.088, haut);
    s += glied([-0.19, 0.78], ARM_RUHE, 0.062, haut, 'arm');
    // Gesicht
    s += [-1, 1].map(sg => `<circle cx="${f3(sg * 0.028)}" cy="-0.912" r="0.009" fill="${P.schwarz}"/>`).join('') + `<path d="M-0.018 -0.885 Q0 -0.868 0.018 -0.885" stroke="${dunkel(schatten, 0.25)}" stroke-width="0.006" stroke-linecap="round" fill="none"/>` + [-1, 1].map(sg => `<circle cx="${f3(sg * 0.045)}" cy="-0.886" r="0.011" fill="${rgba(P.rot, 0.3)}"/>`).join('');
    // Organe (jedes in eigener Gruppe, sichtbar über zeige2d)
    const O = {};
    O.knochen = `<g stroke="#ffffff" stroke-linecap="round" fill="none">${glied([0, 0.8], [0, 0.5], 0.018, '#fff')}${[0, 1, 2, 3, 4, 5].map(i => `<path d="M-0.11 ${f3(-(0.77 - i * 0.03))} Q0 ${f3(-(0.77 - i * 0.03) + 0.025)} 0.11 ${f3(-(0.77 - i * 0.03))}" stroke-width="0.01"/>`).join('')}${glied([-0.12, 0.5], [0.12, 0.5], 0.02, '#fff')}${glied([-0.07, 0.49], [-0.08, 0.06], 0.02, '#fff')}${glied([0.07, 0.49], [0.08, 0.06], 0.02, '#fff')}${glied([0.19, 0.77], [0.23, 0.49], 0.016, '#fff')}<line class="armKnochen" stroke-width="0.016"/><ellipse cx="0" cy="-0.905" rx="0.06" ry="0.075" stroke-width="0.012"/></g>`;
    O.nerven = `<g>${[0, 1, 2, 3].map(i => `<path class="nw${i}" d="" stroke="${P.gelb}" stroke-width="0.007" stroke-linejoin="round" fill="none"/>`).join('')}${[0, 1, 2, 3].map(i => `<circle class="ns${i}" r="0.014" fill="#fff6a0"/><circle class="nh${i}" r="0.026" fill="${rgba(P.gelb, 0.35)}"/>`).join('')}</g>`;
    O.gehirn = `<g>${ell(0, -0.925, 0.056, 0.041, '#f7a8c0')}${ell(0.012, -0.918, 0.04, 0.03, '#f290b0')}${[0, 1, 2, 3, 4].map(i => `<path d="M${f3(-0.047 + i * 0.018)} ${f3(-(0.93 + (i % 2) * 0.01))} a0.012 0.012 0 0 0 0.024 0" stroke="#d8708e" stroke-width="0.004" fill="none"/>`).join('')}</g>`;
    O.lunge = `<g>${glied([0, 0.82], [0, 0.75], 0.012, '#e8a8b2')}${[-1, 1].map(sg => `<ellipse class="fluegel" cx="${f3(sg * 0.065)}" cy="-0.7" rx="0.05" ry="0.085" transform="rotate(${f3(-sg * 0.12 * 180 / Math.PI)} ${f3(sg * 0.065)} -0.7)" fill="#f38a9a"/>`).join('')}</g>`;
    O.blut = `<g>${[0, 1, 2, 3, 4].map(i => `<path class="bw${i}r" d="" stroke="${P.rot}" stroke-opacity="0.6" stroke-width="0.005" fill="none"/><path class="bw${i}b" d="" stroke="${P.blau}" stroke-opacity="0.6" stroke-width="0.005" fill="none"/>`).join('')}${Array.from({ length: 40 }, (_, i) => `<circle class="bp" r="0.009" fill="${i % 8 < 4 ? P.rot : P.blau}"/>`).join('')}</g>`;
    O.herz = `<g class="herzG"><circle cx="0.025" cy="-0.69" r="0.05" fill="${rgba(P.rot, 0.3)}"/><path d="M0.025 -0.654 C-0.023 -0.69 -0.008 -0.729 0.025 -0.705 C0.058 -0.729 0.073 -0.69 0.025 -0.654 Z" fill="${dunkel(P.rot, 0.05)}"/></g>`;
    O.magen = `<g>${glied([0.005, 0.86], [0.02, 0.62], 0.01, '#f0a888')}<ellipse cx="0.045" cy="-0.6" rx="0.055" ry="0.035" transform="rotate(${f3(0.4 * 180 / Math.PI)} 0.045 -0.6)" fill="#f5a885"/></g>`;
    let dd = `M${P2(0.02, 0.575)}`;
    for (let i = 0; i <= 24; i++) { const u = i / 24; dd += ` L${P2(Math.sin(u * Math.PI * 5) * 0.075, 0.57 - u * 0.07)}`; }
    O.darm = `<path d="${dd}" stroke="#ef9a78" stroke-width="0.016" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    s += ORGANE.map(n => `<g class="organ" data-organ="${n}" opacity="0">${O[n]}</g>`).join('');
    s += `<g class="essen" data-apfel="${P.rot}" style="display:none"><circle r="0.03" fill="${P.rot}"/><line x1="0" y1="-0.03" x2="0.005" y2="-0.045" stroke="${P.braun}" stroke-width="0.005"/></g>`;
    return { k: 1.05, svg: s };
  };
  BW.koerper = (el, o, t, F, q, I) => {
    const c = el._bf || (el._bf = {
      arm: el.querySelector('.arm'), armK: el.querySelector('.armKnochen'), organe: [...el.querySelectorAll('.organ')],
      nw: [0, 1, 2, 3].map(i => el.querySelector('.nw' + i)), ns: [0, 1, 2, 3].map(i => el.querySelector('.ns' + i)), nh: [0, 1, 2, 3].map(i => el.querySelector('.nh' + i)),
      bw: [0, 1, 2, 3, 4].map(i => [el.querySelector(`.bw${i}r`), el.querySelector(`.bw${i}b`)]), bp: [...el.querySelectorAll('.bp')],
      herz: el.querySelector('.herzG'), lunge: [...el.querySelectorAll('.fluegel')], essen: el.querySelector('.essen'),
    });
    // Winken
    let wink = 0;
    for (const wk of o.winken) if (t >= wk.t0 && t < wk.t1) wink = Math.min(1, (t - wk.t0) / 0.4, (wk.t1 - t) / 0.4);
    const aw = lerp(0.145, 2.45 + Math.sin(t * 9) * 0.3, wink);
    const arm = [-0.19 - Math.sin(aw) * 0.31, 0.78 - Math.cos(aw) * 0.31];
    const setz = (l, a, b) => { l.setAttribute('x1', f3(a[0])); l.setAttribute('y1', f3(-a[1])); l.setAttribute('x2', f3(b[0])); l.setAttribute('y2', f3(-b[1])); };
    setz(c.arm, [-0.19, 0.78], arm);
    if (c.armK) setz(c.armK, [-0.19, 0.77], [lerp(-0.19, arm[0], 0.92), lerp(0.77, arm[1], 0.92)]);
    // Sichtbarkeit der Organe
    const sicht = {};
    for (const g of c.organe) { const n = g.dataset.organ, v = I.wertBei(o.organe[n] || [], t, 0); sicht[n] = v; g.setAttribute('opacity', f3(v)); }
    if (sicht.nerven > 0.01) NERVEN(arm).forEach((w, i) => {
      c.nw[i].setAttribute('d', weg(w));
      const p = aufWeg(w, (t * 0.9 + i * 0.25) % 1);
      for (const e of [c.ns[i], c.nh[i]]) { e.setAttribute('cx', f3(p[0])); e.setAttribute('cy', f3(-p[1])); }
    });
    if (sicht.blut > 0.01) {
      let n = 0;
      BLUT(arm).forEach((w, i) => {
        [[0.008, false], [-0.008, true]].forEach(([v, rueck], k) => {
          const wv = w.map(p => [p[0] + v, p[1]]);
          c.bw[i][k].setAttribute('d', weg(wv));
          for (let j = 0; j < 4; j++) {
            let u = (t * 0.35 + j / 4 + i * 0.13) % 1; if (rueck) u = 1 - u;
            const p = aufWeg(wv, u), e = c.bp[n++];
            e.setAttribute('cx', f3(p[0])); e.setAttribute('cy', f3(-p[1]));
          }
        });
      });
    }
    if (sicht.herz > 0.01) { const sch = 1 + Math.max(0, Math.sin(t * Math.PI * 2.4)) * 0.14; c.herz.setAttribute('transform', `translate(0.025 -0.69) scale(${f3(sch)}) translate(-0.025 0.69)`); }
    if (sicht.lunge > 0.01) { const at = 1 + Math.sin(t * Math.PI * 0.5) * 0.07; c.lunge.forEach(l => { l.setAttribute('rx', f3(0.05 * at)); l.setAttribute('ry', f3(0.085 * at)); }); }
    // Essen: Apfel in den Mund, dann Speiseröhre → Magen → Darm
    let zeigt = false;
    for (const e of o.essen) {
      const a = t - e;
      if (a < 0 || a > 9) continue;
      let pp;
      if (a < 1.5) pp = [lerp(0.4, 0, a / 1.5), lerp(0.95, 0.885, a / 1.5)];
      else if (a < 3) pp = [lerp(0.005, 0.02, (a - 1.5) / 1.5), lerp(0.875, 0.62, (a - 1.5) / 1.5)];
      else if (a < 5) pp = [0.045 + Math.sin(a * 6) * 0.01, 0.6];
      else { const u = (a - 5) / 4; pp = [Math.sin(u * Math.PI * 5) * 0.075, 0.57 - u * 0.07]; }
      const gr = (a < 3 ? 0.03 : a < 5 ? 0.02 : 0.012) / 0.03;
      c.essen.setAttribute('transform', `translate(${f3(pp[0])} ${f3(-pp[1])}) scale(${f3(gr)})`);
      c.essen.firstElementChild.setAttribute('fill', a < 1.5 ? c.essen.dataset.apfel : '#d8b070');
      zeigt = true;
    }
    c.essen.style.display = zeigt ? '' : 'none';
  };
})();
