// Blockfilm – die übrigen 2D-Objekte im Flat-Look für HyperFrames:
// Akku, Atome, Auge, Bits, Blatt, Geist, Hülle (Atmosphäre), Kaktus, Kontinente, Luft, Funkmast, Meteor, Pinguin,
// Pixel, Pizza, Rakete, Regenbogen, Thermometer, Vulkan, Wand, Zeitleiste.
// Ursprünge wie im alten Zeichner (Mitte oder Fußpunkt); was sich mit der Zeit ändert, setzt HF.bewegung[typ].
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const OB = HF.objektGrafik;
  const BW = (HF.bewegung = HF.bewegung || {});
  const { hell, dunkel, mische, rgba } = HF.farbe;
  const f3 = v => Math.round(v * 1000) / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const sanft = u => u * u * (3 - 2 * u);
  const ell = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${f3(x)}" cy="${f3(y)}" rx="${f3(rx)}" ry="${f3(ry)}" fill="${f}"${extra}/>`;
  const rect = (x, y, b, h, r, f, extra = '') => `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" rx="${f3(r)}" fill="${f}"${extra}/>`;
  const schrift = (stil, gr) => `font-family:${stil.schrift.titel.replace(/"/g, "'")},sans-serif;font-weight:${stil.schrift.titelGewicht};font-size:${f3(gr)}px`;
  const wertBei = (l, t, s) => BF.w2dIntern.wertBei(l, t, s);
  const zwischen = (el, sel) => el.querySelector(sel);

  // ---------- Akku ----------
  OB.akku = (o, stil) => {
    const P = stil.palette, b = 0.55, h = 1;
    return { k: 0.75, svg: rect(-b / 2, -h / 2, b, h, b * 0.14, '#eef0f6') + rect(-b * 0.2, -h / 2 - 0.07, b * 0.4, 0.09, 0.03, P.grau) + `<rect class="fuell" x="${f3(-b / 2 + b * 0.1)}" width="${f3(b * 0.8)}" rx="${f3(b * 0.07)}" fill="${P.gruen}"/>` + rect(-b / 2, -h / 2, b * 0.25, h, b * 0.12, 'rgba(255,255,255,0.35)') + `<text class="wert" x="0" y="0.04" text-anchor="middle" dominant-baseline="middle" fill="${P.schwarz}" style="${schrift(stil, 0.16)}"></text>` };
  };
  BW.akku = (el, o, t) => {
    const P = HF.aktiverStil.palette, w = clamp(wertBei(o.werte, t, o.werte[0].zu), 0, 100), b = 0.55, h = 1;
    const f = zwischen(el, '.fuell'), fh = (h - b * 0.2) * w / 100;
    f.setAttribute('y', f3(h / 2 - b * 0.1 - fh)); f.setAttribute('height', f3(Math.max(0.001, fh)));
    f.setAttribute('fill', w > 50 ? P.gruen : w > 20 ? P.orange : P.rot);
    zwischen(el, '.wert').textContent = Math.round(w) + ' %';
  };

  // ---------- Atome (Gitter; mit "wolke" als Elektronenwolke) ----------
  OB.atome = (o, stil) => {
    const f = HF.stilFarbe(stil, o.farbe || '#8fb8ff'), d = 2.3, P = stil.palette;
    let s = '';
    for (let i = 0; i < o.sp; i++) for (let j = 0; j < o.ze; j++) {
      const x = (i - (o.sp - 1) / 2) * d, y = (j - (o.ze - 1) / 2) * d;
      if (!o.wolke) { if (i < o.sp - 1) s += `<line x1="${f3(x + 0.9)}" y1="${f3(y)}" x2="${f3(x + d - 0.9)}" y2="${f3(y)}" stroke="${rgba('#ffffff', 0.6)}" stroke-width="0.14" stroke-linecap="round"/>`; if (j < o.ze - 1) s += `<line x1="${f3(x)}" y1="${f3(y + 0.9)}" x2="${f3(x)}" y2="${f3(y + d - 0.9)}" stroke="${rgba('#ffffff', 0.6)}" stroke-width="0.14" stroke-linecap="round"/>`; }
      s += `<g class="at" data-i="${i}" data-j="${j}" data-x="${f3(x)}" data-y="${f3(y)}">` + (o.wolke
        ? `<circle r="1" fill="${rgba(f, 0.25)}"/><circle r="0.7" fill="${rgba(f, 0.25)}"/><circle r="0.09" fill="${P.rot}"/><circle class="el" r="0.08" fill="${P.blau}"/><circle class="el" r="0.08" fill="${P.blau}"/>`
        : `<circle r="0.9" fill="${f}"/><path d="M0.85 0.3 A0.9 0.9 0 0 1 -0.85 0.3 A1.1 0.6 0 0 0 0.85 0.3 Z" fill="${dunkel(f, 0.12)}"/><circle cx="-0.3" cy="-0.3" r="0.22" fill="${rgba('#ffffff', 0.55)}"/>`) + '</g>';
    }
    return { k: Math.max(o.sp, o.ze) * 1.15 + 0.4, svg: s };
  };
  BW.atome = (el, o, t) => {
    const at = el._bf || (el._bf = [...el.querySelectorAll('.at')]);
    for (const g of at) {
      const i = +g.dataset.i, j = +g.dataset.j;
      const x = +g.dataset.x + Math.sin(t * 5 + i * 1.7 + j) * 0.06, y = +g.dataset.y + Math.cos(t * 4.3 + j * 2.1 + i) * 0.06;
      g.setAttribute('transform', `translate(${f3(x)} ${f3(y)})`);
      if (o.wolke) g.querySelectorAll('.el').forEach((e, k) => { const a = t * (3 + k) + i + j * 2 + k * 3; e.setAttribute('cx', f3(Math.cos(a) * 0.75)); e.setAttribute('cy', f3(Math.sin(a * 1.3) * 0.6)); });
    }
  };

  // ---------- Auge (blinzelt ab und zu) ----------
  OB.auge = (o, stil) => {
    const P = stil.palette, form = 'M-1.6 0 Q0 -1.3 1.6 0 Q0 1.3 -1.6 0 Z';
    return { k: 1.7, svg: `<g class="lid"><path d="${form}" fill="#fbfbf8"/><clipPath id="au${o.name}"><path d="${form}"/></clipPath><g clip-path="url(#au${o.name})"><circle cx="-0.35" r="0.62" fill="${P.blau}"/><circle cx="-0.35" r="0.42" fill="${dunkel(P.blau, 0.12)}"/><circle cx="-0.4" r="0.3" fill="${P.schwarz}"/><circle cx="-0.22" cy="-0.2" r="0.11" fill="#fff"/><path d="M-1.6 0 Q0 -1.3 1.6 0 L1.6 -1 L-1.6 -1 Z" fill="${rgba(P.schwarz, 0.08)}"/></g></g>` };
  };
  BW.auge = (el, o, t) => { const g = el._bf || (el._bf = zwischen(el, '.lid')); g.setAttribute('transform', Math.sin(t * 0.9) > 0.985 ? 'scale(1 0.06)' : ''); };

  // ---------- Bits (Nullen und Einsen) ----------
  OB.bits = (o, stil) => {
    const n = o.wert.length || 8, P = stil.palette;
    let s = '';
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 1.3; s += `<g class="bit" data-i="${i}" transform="translate(${f3(x)} 0)"><circle class="glow" r="0.75" fill="${rgba(P.gelb, 0.25)}"/><circle class="kn" r="0.5" fill="${P.gelb}"/><text class="z" y="0.04" text-anchor="middle" dominant-baseline="middle" style="${schrift(stil, 0.55)}"></text></g>`; }
    return { k: n * 0.65 + 0.4, svg: s };
  };
  BW.bits = (el, o, t) => {
    const P = HF.aktiverStil.palette, c = el._bf || (el._bf = [...el.querySelectorAll('.bit')]);
    c.forEach((g, i) => {
      let an = o.wert[i] === '1';
      if (o.laufen) an = Math.sin(t * 3 + i * 1.7 + Math.floor(t * 2) * 2.3) > 0;
      if (g._an === an) return;
      g._an = an;
      g.querySelector('.kn').setAttribute('fill', an ? P.gelb : mische(P.schwarz, P.blau, 0.25));
      g.querySelector('.glow').setAttribute('opacity', an ? 1 : 0);
      const z = g.querySelector('.z'); z.textContent = an ? '1' : '0'; z.setAttribute('fill', an ? P.schwarz : P.grau);
    });
  };

  // ---------- Blatt (kann sich umfärben) ----------
  const blattForm = 'M0 -1 C0.75 -0.6 0.7 0.5 0 0.85 C-0.7 0.5 -0.75 -0.6 0 -1 Z';
  OB.blatt = (o, stil) => {
    const f = HF.stilFarbe(stil, o.farben[0].zu);
    return { k: 1.3, svg: `<g class="dreh"><line x1="0" y1="0.8" x2="0" y2="1.18" stroke="${dunkel(f, 0.2)}" stroke-width="0.07" stroke-linecap="round"/><path class="fl" d="${blattForm}" fill="${f}"/><path class="fd" d="M0 -1 C0.75 -0.6 0.7 0.5 0 0.85 Z" fill="${dunkel(f, 0.08)}"/><path class="ad" d="M0 -0.85 L0 0.75 M0 -0.2 L0.35 -0.45 M0 0.15 L-0.35 -0.1 M0 0.4 L0.3 0.2" stroke="${hell(f, 0.12)}" stroke-width="0.05" stroke-linecap="round" fill="none"/></g>` };
  };
  BW.blatt = (el, o, t) => {
    const stil = HF.aktiverStil, c = el._bf || (el._bf = { d: zwischen(el, '.dreh'), fl: zwischen(el, '.fl'), fd: zwischen(el, '.fd'), ad: zwischen(el, '.ad'), letzte: '' });
    c.d.setAttribute('transform', `rotate(${f3((Math.sin(t * 1.3) * 0.08 - 0.4) * 180 / Math.PI)})`);
    let f = HF.stilFarbe(stil, o.farben[0].zu);
    for (const k of o.farben) { if (k.t0 > t) break; const u = k.t1 > k.t0 ? sanft(clamp((t - k.t0) / (k.t1 - k.t0), 0, 1)) : 1; f = mische(f, HF.stilFarbe(stil, k.zu), u); }
    if (f !== c.letzte) { c.letzte = f; c.fl.setAttribute('fill', f); c.fd.setAttribute('fill', dunkel(f, 0.08)); c.ad.setAttribute('stroke', hell(f, 0.12)); }
  };

  // ---------- Geist (wird in Wänden durchsichtig) ----------
  OB.geist = (o, stil) => ({ k: 1.2, svg: `<g class="schweb"><circle r="1.05" cy="0.1" fill="${rgba('#cfe0ff', 0.25)}"/><path class="leib" d="" fill="#ffffff"/>${[-0.28, 0.28].map(x => ell(x, -0.25, 0.12, 0.18, stil.palette.schwarz)).join('')}${ell(0, 0.12, 0.14, 0.1, stil.palette.schwarz)}${[-1, 1].map(sg => ell(sg * 0.5, -0.02, 0.1, 0.06, rgba(stil.palette.pink, 0.4))).join('')}</g>` });
  BW.geist = (el, o, t, F, q, I) => {
    const c = el._bf || (el._bf = { s: zwischen(el, '.schweb'), l: zwischen(el, '.leib') });
    let inWand = false;
    for (const wd of F.w2d.liste) if (wd.typ === 'wand' && t >= wd.t0 && t < wd.t1) { const wp = I.pos(F, wd, t); if (Math.abs(q[0] - wp[0]) < wd.breite / 2 + o.r * 0.5) inWand = true; }
    c.s.setAttribute('opacity', inWand ? 0.45 : 0.95);
    c.s.setAttribute('transform', `translate(0 ${f3(Math.sin(t * 2.2) * 0.08)})`);
    let d = 'M-0.8 -0.2 A0.8 0.8 0 0 1 0.8 -0.2 L0.8 0.8';
    for (let i = 0; i < 4; i++) { const x1 = 0.8 - (i + 0.5) * 0.4, x2 = 0.8 - (i + 1) * 0.4; d += ` Q${f3(x1)} ${f3(0.55 + 0.2 * Math.sin(t * 6 + i))} ${f3(x2)} 0.8`; }
    c.l.setAttribute('d', d + ' Z');
  };

  // ---------- Hülle (Atmosphäre um einen Planeten; wird dicker) ----------
  OB.huelle = (o, stil) => {
    const max = Math.max(...o.dicken.map(d => d.zu));
    return { k: 1 + max * 1.2 / o.r + 0.1, svg: `<defs><radialGradient id="hu${o.name}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1"><stop class="s0" offset="0.9"/><stop class="s1" offset="1" stop-opacity="0"/></radialGradient></defs><circle class="ring" r="1" fill="url(#hu${o.name})"/>` };
  };
  BW.huelle = (el, o, t) => {
    const c = el._bf || (el._bf = { g: el.querySelector('radialGradient'), s0: zwischen(el, '.s0'), s1: zwischen(el, '.s1'), r: zwischen(el, '.ring') });
    const dk = wertBei(o.dicken, t, o.dicken[0].zu), aussen = 1 + dk * 1.2 / o.r, grau = clamp((dk - 1) / 3, 0, 1);
    const farbe = `rgb(${Math.round(120 + 80 * grau)},${Math.round(180 + 10 * grau)},${Math.round(255 - 120 * grau)})`;
    c.r.setAttribute('r', f3(aussen)); c.g.setAttribute('r', f3(aussen));
    c.s0.setAttribute('offset', f3(1 / aussen)); c.s0.setAttribute('stop-color', farbe); c.s0.setAttribute('stop-opacity', 0.6);
    c.s1.setAttribute('stop-color', farbe);
  };

  // ---------- Kaktus (Fußpunkt) ----------
  OB.kaktus = (o, stil) => {
    const g = stil.palette.gruen, d = dunkel(g, 0.1);
    const arm = (x, y, b, h, f) => rect(x, y, b, h, b / 2, f);
    return { k: 1.05, svg: arm(-0.12, -1, 0.24, 1, g) + arm(0.02, -1, 0.1, 1, d) + arm(-0.42, -0.7, 0.18, 0.36, g) + arm(-0.42, -0.45, 0.32, 0.14, g) + arm(0.24, -0.85, 0.18, 0.4, d) + arm(0.1, -0.55, 0.32, 0.14, d) + [[-0.05, -0.8], [0.04, -0.5], [-0.06, -0.25], [-0.33, -0.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.018" fill="${hell(g, 0.25)}"/>`).join('') + ell(0, -1.02, 0.06, 0.045, stil.palette.pink) };
  };

  // ---------- Kontinente (Erdkugel mit wandernden Kontinenten) ----------
  OB.kontinente = (o, stil) => {
    const P = stil.palette;
    let land = '';
    for (let i = 0; i < 8; i++) land += `<ellipse class="la" fill="${P.gruen}"/><ellipse class="lb" fill="${hell(P.gruen, 0.1)}"/>`;
    return { k: 1.15, svg: `<clipPath id="ko${o.name}"><circle r="1"/></clipPath><circle r="1.06" fill="${rgba(hell(P.blau, 0.2), 0.35)}"/><g clip-path="url(#ko${o.name})"><circle r="1" fill="${P.blau}"/>${land}<path d="M0 -1.05 A1.05 1.05 0 0 1 0 1.05 A0.5 1.05 0 0 0 0 -1.05 Z" fill="${rgba(dunkel(P.blau, 0.3), 0.45)}"/></g>` };
  };
  BW.kontinente = (el, o, t) => {
    const L = BF.LAND_STUFEN, c = el._bf || (el._bf = { a: [...el.querySelectorAll('.la')], b: [...el.querySelectorAll('.lb')] });
    let land = L[o.stufen[0].art].map(e => e.slice());
    for (const st of o.stufen.slice(1)) { if (t < st.t0) break; const u = sanft(clamp((t - st.t0) / Math.max(0.01, st.t1 - st.t0), 0, 1)); const z = L[st.art]; land = land.map((e, i) => e.map((v, j) => v + (z[i][j] - v) * u)); }
    land.forEach(([x, y, rx, ry], i) => {
      const a = c.a[i], b = c.b[i];
      a.setAttribute('cx', f3(x)); a.setAttribute('cy', f3(-y)); a.setAttribute('rx', f3(rx)); a.setAttribute('ry', f3(ry));
      b.setAttribute('cx', f3(x - rx * 0.2)); b.setAttribute('cy', f3(-(y + ry * 0.2))); b.setAttribute('rx', f3(rx * 0.55)); b.setAttribute('ry', f3(ry * 0.5));
    });
  };

  // ---------- Luft (viele kleine Teilchen) ----------
  OB.luft = (o, stil) => {
    const rr = BF.rng(BF.hash(o.name));
    let s = '';
    for (let i = 0; i < o.n; i++) { const x = (rr() - 0.5) * o.breite / o.r, y = (rr() - 0.5) * o.hoehe / o.r; s += `<circle class="tl" data-x="${f3(x)}" data-y="${f3(y)}" r="${f3(0.28 / o.r)}" fill="${rgba('#ffffff', 0.9)}"/>`; }
    return { k: Math.max(o.breite, o.hoehe) / 2 / o.r + 0.3, svg: s };
  };
  BW.luft = (el, o, t) => {
    const c = el._bf || (el._bf = [...el.querySelectorAll('.tl')]);
    c.forEach((e, i) => { e.setAttribute('cx', f3(+e.dataset.x + Math.sin(t * 1.3 + i) * 0.4 / o.r)); e.setAttribute('cy', f3(+e.dataset.y + Math.cos(t * 1.1 + i * 2) * 0.4 / o.r)); });
  };

  // ---------- Funkmast (Fußpunkt) ----------
  OB.mast = (o, stil) => {
    const P = stil.palette, g = mische(P.grau, P.blau, 0.15);
    let s = `<path d="M-0.18 0 L0 -1 L0.18 0" stroke="${g}" stroke-width="0.03" stroke-linejoin="round" fill="none"/>`;
    for (let i = 1; i < 6; i++) { const y = -i / 6, b = 0.18 * (1 - i / 6); s += `<path d="M${f3(-b)} ${f3(y)} L${f3(b)} ${f3(y - 1 / 12)} M${f3(b)} ${f3(y)} L${f3(-b)} ${f3(y - 1 / 12)}" stroke="${g}" stroke-width="0.018" fill="none"/>`; }
    s += rect(-0.12, -0.92, 0.08, 0.2, 0.02, '#eef0f6') + rect(0.04, -0.92, 0.08, 0.2, 0.02, '#eef0f6') + `<circle class="lampe" cx="0" cy="-1" r="0.035" fill="${P.rot}"/>`;
    return { k: 1.05, svg: s };
  };
  BW.mast = (el, o, t) => { const l = el._bf || (el._bf = zwischen(el, '.lampe')); l.setAttribute('opacity', Math.sin(t * 4) > 0 ? 1 : 0.25); };

  // ---------- Meteor (Feuerschweif, dann Einschlag) ----------
  OB.meteor = (o, stil) => {
    const P = stil.palette, vx = o.nach[0] - o.von[0], vy = o.nach[1] - o.von[1], l = Math.hypot(vx, vy) || 1, ex = -vx / l, ey = vy / l;
    let schweif = '';
    for (let i = 12; i >= 0; i--) { const u = i / 12; schweif += `<circle cx="${f3(ex * u * 6)}" cy="${f3(ey * u * 6)}" r="${f3(1 - u * 0.7)}" fill="${mische(P.gelb, P.rot, u)}" opacity="${f3((1 - u) * 0.85)}"/>`; }
    schweif += `<circle r="0.8" fill="${P.braun}"/><circle cx="0.2" cy="0.25" r="0.35" fill="${dunkel(P.braun, 0.1)}"/><circle cx="-0.2" cy="-0.2" r="0.25" fill="${hell(P.braun, 0.1)}"/>`;
    let knall = `<circle class="kf" r="1" fill="${P.gelb}"/><circle class="kf2" r="0.6" fill="#fff6d0"/>`;
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; knall += `<circle class="staub" data-a="${f3(a)}" r="1" fill="${mische(P.braun, P.grau, 0.4)}"/>`; }
    return { k: 17, svg: `<g class="flug">${schweif}</g><g class="knall" style="display:none">${knall}</g>` };
  };
  BW.meteor = (el, o, t) => {
    const c = el._bf || (el._bf = { f: zwischen(el, '.flug'), k: zwischen(el, '.knall'), kf: zwischen(el, '.kf'), kf2: zwischen(el, '.kf2'), st: [...el.querySelectorAll('.staub')] });
    const vor = t < o.ziel;
    c.f.style.display = vor ? '' : 'none'; c.k.style.display = vor ? 'none' : '';
    if (vor) return;
    const u = clamp((t - o.ziel) / 5, 0, 1), R = 2 + u * 14;
    c.kf.setAttribute('r', f3(R)); c.kf.setAttribute('opacity', f3((1 - u) * 0.9));
    c.kf2.setAttribute('r', f3(R * 0.45)); c.kf2.setAttribute('opacity', f3((1 - u) * 0.95));
    for (const s of c.st) { const a = +s.dataset.a; s.setAttribute('cx', f3(Math.cos(a) * R * 0.8)); s.setAttribute('cy', f3(-Math.abs(Math.sin(a)) * R * 0.6)); s.setAttribute('r', f3(R * 0.35)); s.setAttribute('opacity', f3(Math.min(0.6, u * 1.2) * (1 - u * 0.3))); }
  };

  // ---------- Pinguin (Fußpunkt, watschelt) ----------
  OB.pinguin = (o, stil) => {
    const P = stil.palette, k = mische(P.schwarz, P.blau, 0.15);
    return { k: 1.1, svg: `<g class="watschel">${ell(0, -0.5, 0.32, 0.5, k)}${ell(0, -0.42, 0.22, 0.38, '#f6f7fb')}${ell(0, -0.95, 0.2, 0.2, k)}${ell(0.07, -0.98, 0.05, 0.05, '#fff')}<circle cx="0.08" cy="-0.98" r="0.025" fill="${P.schwarz}"/><path d="M0.14 -0.95 L0.3 -0.92 L0.14 -0.89 Z" fill="${P.orange}"/>${ell(-0.3, -0.5, 0.07, 0.25, dunkel(k, 0.05), ' transform="rotate(12 -0.3 -0.5)"')}${ell(-0.1, -0.02, 0.1, 0.04, P.orange)}${ell(0.1, -0.02, 0.1, 0.04, P.orange)}${ell(0.1, -0.86, 0.04, 0.025, rgba(P.pink, 0.5))}</g>` };
  };
  BW.pinguin = (el, o, t) => { const g = el._bf || (el._bf = zwischen(el, '.watschel')); g.setAttribute('transform', `rotate(${f3(Math.sin(t * 4) * 0.08 * 180 / Math.PI)})`); };

  // ---------- Pixel (Smiley aus Pixeln; "nah" zeigt die Lämpchen) ----------
  OB.pixel = (o, stil) => {
    const BILD = ['..YYYY..', '.YYYYYY.', 'YYBYYBYY', 'YYYYYYYY', 'YRYYYYRY', 'YYRRRRYY', '.YYYYYY.', '..YYYY..'];
    const FARBE = { Y: [255, 210, 50], B: [30, 30, 60], R: [220, 60, 60], '.': [240, 240, 245] };
    const n = 8, d = 1 / n;
    let s = '';
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const c = FARBE[BILD[j][i]], x = -0.5 + i * d, y = -0.5 + j * d;
      if (o.nah) { s += rect(x, y, d, d, 0, '#111'); [[255, 0, 0], [0, 255, 0], [0, 0, 255]].forEach((k, q) => { s += rect(x + d * (0.08 + q * 0.31), y + d * 0.1, d * 0.25, d * 0.8, d * 0.06, `rgba(${k[0]},${k[1]},${k[2]},${f3(0.15 + 0.85 * c[q] / 255)})`); }); }
      else s += rect(x, y, d * 0.94, d * 0.94, d * 0.15, `rgb(${c[0]},${c[1]},${c[2]})`);
    }
    return { k: 0.6, svg: s };
  };

  // ---------- Pizza (für Brüche; Stücke verschwinden) ----------
  OB.pizza = (o, stil) => {
    const n = o.teile, P = stil.palette, rr = BF.rng(n * 31 + 7);
    let s = `<circle r="1.06" fill="rgba(0,0,0,0.12)" cy="0.04"/>`;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n, gross = a1 - a0 > Math.PI ? 1 : 0;
      const tort = (r, f) => n === 1 ? `<circle r="${r}" fill="${f}"/>` : `<path d="M0 0 L${f3(Math.cos(a0) * r)} ${f3(Math.sin(a0) * r)} A${r} ${r} 0 ${gross} 1 ${f3(Math.cos(a1) * r)} ${f3(Math.sin(a1) * r)} Z" fill="${f}"/>`;
      let st = tort(1, mische(P.orange, P.gelb, 0.4)) + tort(0.86, P.rot) + tort(0.8, '#ffe39a');
      for (let k = 0; k < 2; k++) { const a = a0 + (a1 - a0) * (0.3 + 0.4 * rr()), d = 0.35 + 0.35 * rr(); st += `<circle cx="${f3(Math.cos(a) * d)}" cy="${f3(Math.sin(a) * d)}" r="0.09" fill="${dunkel(P.rot, 0.12)}"/>`; }
      if (n > 1) st += `<path d="M0 0 L${f3(Math.cos(a0))} ${f3(Math.sin(a0))}" stroke="${dunkel(P.orange, 0.15)}" stroke-width="0.025"/>`;
      s += `<g class="stueck" data-i="${i}">${st}</g>`;
    }
    return { k: 1.15, svg: s };
  };
  BW.pizza = (el, o, t) => {
    const c = el._bf || (el._bf = [...el.querySelectorAll('.stueck')]);
    let weg = 0; for (const e of o.weg) if (t >= e.t) weg = e.n;
    c.forEach((g, i) => { g.style.display = i < weg ? 'none' : ''; });
  };

  // ---------- Rakete (Mitte; zeigt in Richtung "winkel") ----------
  OB.rakete = (o, stil) => {
    const P = stil.palette, w = '#eef0f6';
    return { k: 2.5, svg: `<g transform="rotate(${f3(-(o.winkel - 90))})"><path class="flamme" d="" fill="${P.orange}"/><path class="flamme2" d="" fill="${P.gelb}"/><path d="M-0.5 0.4 L-0.95 1.2 L-0.5 1 Z" fill="${P.rot}"/><path d="M0.5 0.4 L0.95 1.2 L0.5 1 Z" fill="${dunkel(P.rot, 0.1)}"/><path d="M0 -1.6 Q0.7 -0.6 0.5 1 L-0.5 1 Q-0.7 -0.6 0 -1.6 Z" fill="${w}"/><path d="M0 -1.6 Q0.7 -0.6 0.5 1 L0.1 1 Q0.3 -0.6 0 -1.6 Z" fill="${dunkel(w, 0.08)}"/><path d="M0 -1.6 Q0.32 -1.15 0.38 -0.95 L-0.38 -0.95 Q-0.32 -1.15 0 -1.6 Z" fill="${P.rot}"/><circle cy="-0.4" r="0.27" fill="${dunkel(P.blau, 0.1)}"/><circle cy="-0.4" r="0.2" fill="${P.tuerkis}"/><circle cx="-0.06" cy="-0.46" r="0.06" fill="rgba(255,255,255,0.7)"/></g>` };
  };
  BW.rakete = (el, o, t) => {
    const c = el._bf || (el._bf = { a: zwischen(el, '.flamme'), b: zwischen(el, '.flamme2') });
    const L = 2.2 + Math.sin(t * 30) * 0.2;
    c.a.setAttribute('d', `M-0.35 1 Q-0.2 ${f3(1 + L * 0.5)} 0 ${f3(L)} Q0.2 ${f3(1 + L * 0.5)} 0.35 1 Z`);
    c.b.setAttribute('d', `M-0.18 1 Q-0.1 ${f3(1 + L * 0.3)} 0 ${f3(1 + (L - 1) * 0.6)} Q0.1 ${f3(1 + L * 0.3)} 0.18 1 Z`);
  };

  // ---------- Glas-Prisma und großer Wassertropfen (Licht wird darin gebrochen, siehe bahn() in welt2d.js) ----------
  OB.prisma = (o, stil, id) => {
    const glas = mische(stil.palette.tuerkis, '#ffffff', 0.55);
    return { k: 1.3, svg: `<path d="M0 -1.1 L1.15 0.9 L-1.15 0.9 Z" fill="${rgba(glas, 0.45)}" stroke="${rgba('#ffffff', 0.85)}" stroke-width="0.05" stroke-linejoin="round"/><path d="M0 -1.1 L1.15 0.9 L0.3 0.9 Z" fill="${rgba(dunkel(glas, 0.15), 0.25)}"/><path d="M-0.18 -0.6 L-0.62 0.2" stroke="#fff" stroke-opacity="0.75" stroke-width="0.07" stroke-linecap="round"/><path d="M-0.3 0.45 L-0.42 0.66" stroke="#fff" stroke-opacity="0.6" stroke-width="0.05" stroke-linecap="round"/>` };
  };
  OB.tropfen = (o, stil, id) => {
    const w = mische(stil.palette.blau, '#ffffff', 0.45);
    return { k: 1.1, svg: `<circle r="1" fill="${rgba(w, 0.4)}" stroke="${rgba('#ffffff', 0.85)}" stroke-width="0.04"/><path d="M0.95 0.3 A1 1 0 0 1 -0.95 0.3 A1.2 0.7 0 0 0 0.95 0.3 Z" fill="${rgba(dunkel(w, 0.2), 0.25)}"/><ellipse cx="-0.42" cy="-0.45" rx="0.2" ry="0.12" transform="rotate(-35 -0.42 -0.45)" fill="#fff" opacity="0.75"/><circle cx="-0.15" cy="-0.68" r="0.05" fill="#fff" opacity="0.7"/>` };
  };

  // ---------- Regenbogen ----------
  OB.regenbogen = (o, stil) => {
    const P = stil.palette, F = [P.rot, P.orange, P.gelb, P.gruen, P.blau, P.lila], d = 0.07;
    return { k: 1.05, svg: F.map((f, i) => { const r = 1 - i * d - d / 2; return `<path d="M${f3(-r)} 0 A${f3(r)} ${f3(r)} 0 0 1 ${f3(r)} 0" stroke="${f}" stroke-width="${f3(d + 0.004)}" fill="none" opacity="0.92"/>`; }).join('') };
  };

  // ---------- Thermometer (Mitte; Wert ändert sich mit temperatur2d) ----------
  OB.thermometer = (o, stil) => {
    const P = stil.palette, b = 0.16, y = -0.5;
    return { k: 1.05, svg: rect(-b / 2, y, b, 0.85, b / 2, '#f4f6fa') + `<circle cy="${f3(y + 0.9)}" r="${f3(b * 0.85)}" fill="#f4f6fa"/><circle class="kugel" cy="${f3(y + 0.9)}" r="${f3(b * 0.6)}" fill="${P.rot}"/><rect class="saeule" x="${f3(-b * 0.22)}" width="${f3(b * 0.44)}" rx="${f3(b * 0.22)}" fill="${P.rot}"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${f3(b * 0.5 - 0.035)}" y="${f3(y + 0.12 + i * 0.15)}" width="0.035" height="0.012" fill="${P.grau}"/>`).join('')}<text class="wert" x="${f3(b)}" text-anchor="start" dominant-baseline="middle" fill="#ffffff" stroke="${rgba(P.schwarz, 0.6)}" stroke-width="0.02" paint-order="stroke" style="${schrift(stil, 0.12)}"></text>` };
  };
  BW.thermometer = (el, o, t) => {
    const P = HF.aktiverStil.palette, c = el._bf || (el._bf = { k: zwischen(el, '.kugel'), s: zwischen(el, '.saeule'), w: zwischen(el, '.wert') });
    const wert = wertBei(o.werte, t, o.werte[0].zu), y = -0.5, anteil = clamp((wert + 40) / 90, 0.03, 1), fh = 0.8 * anteil;
    const farbe = wert >= 25 ? P.rot : wert >= 10 ? P.orange : wert >= 0 ? P.gruen : P.blau;
    c.k.setAttribute('fill', farbe); c.s.setAttribute('fill', farbe);
    c.s.setAttribute('y', f3(y + 0.88 - fh)); c.s.setAttribute('height', f3(fh + 0.02));
    c.w.setAttribute('y', f3(y + 0.88 - fh)); c.w.textContent = (Math.round(wert * 10) / 10).toString().replace('.', ',') + ' °C';
  };

  // ---------- Vulkan (Fußpunkt; raucht, bricht aus) ----------
  OB.vulkan = (o, stil) => {
    const P = stil.palette, berg = mische(P.braun, P.lila, 0.25);
    let rauch = '';
    for (let i = 0; i < 14; i++) rauch += `<ellipse class="rauch" fill="${mische(P.grau, P.braun, 0.3)}"/>`;
    let lava = '';
    for (let i = 0; i < 18; i++) lava += `<circle class="brocken" r="0.025" fill="${P.orange}"/>`;
    return { k: 2.2, svg: `<g class="rauchG">${rauch}</g><path d="M-0.75 0 L-0.12 -0.6 L0.12 -0.6 L0.75 0 Z" fill="${berg}" stroke="${berg}" stroke-width="0.04" stroke-linejoin="round"/><path d="M0 -0.6 L0.12 -0.6 L0.75 0 L0.2 0 Z" fill="${dunkel(berg, 0.1)}"/><path d="M-0.12 -0.6 L-0.04 -0.5 L0.04 -0.56 L0.12 -0.6 Z" fill="${hell(berg, 0.08)}"/><ellipse class="glut" cx="0" cy="-0.6" rx="0.12" ry="0.03" fill="${P.orange}"/><g class="ausbruch" style="display:none"><path d="M-0.05 -0.6 Q-0.2 -0.35 -0.35 -0.05" stroke="${P.orange}" stroke-width="0.04" stroke-linecap="round" fill="none"/><path d="M0.06 -0.6 Q0.24 -0.35 0.42 -0.05" stroke="${P.orange}" stroke-width="0.04" stroke-linecap="round" fill="none"/>${lava}</g>` };
  };
  BW.vulkan = (el, o, t) => {
    const c = el._bf || (el._bf = { r: [...el.querySelectorAll('.rauch')], g: zwischen(el, '.glut'), a: zwischen(el, '.ausbruch'), b: [...el.querySelectorAll('.brocken')] });
    const aus = o.ausbruch.find(a => t >= a.t0 && t < a.t1 + 3);
    const rr = BF.rng(9);
    c.r.forEach((e, i) => {
      const ph = (t * (aus ? 0.5 : 0.15) + rr()) % 1;
      e.setAttribute('cx', f3(0.02 + Math.sin(i * 1.7 + t * 0.3) * 0.1 * ph + ph * 0.25)); e.setAttribute('cy', f3(-(0.6 + ph * (aus ? 1.1 : 0.6))));
      e.setAttribute('rx', f3(0.08 + ph * 0.25)); e.setAttribute('ry', f3(0.07 + ph * 0.2)); e.setAttribute('opacity', f3((1 - ph) * (aus ? 0.75 : 0.4)));
    });
    c.g.setAttribute('opacity', f3(aus ? 1 : 0.55 + Math.sin(t * 2) * 0.1));
    c.a.style.display = aus ? '' : 'none';
    if (aus) {
      const rr2 = BF.rng(17);
      c.b.forEach((e, i) => { const a = -0.6 + rr2() * 1.2, v = rr2(), tt = (t * 2 + i / 18) % 1; e.setAttribute('cx', f3(Math.sin(a) * tt * 0.6)); e.setAttribute('cy', f3(-(0.6 + tt * (0.8 * v + 0.3) - tt * tt * 0.5))); e.setAttribute('opacity', f3(1 - tt)); });
    }
  };

  // ---------- Wand (Fußpunkt; Ziegel, optional mit Fenster) ----------
  OB.wand = (o, stil) => {
    const P = stil.palette, b = o.breite / o.r, f = mische(P.rot, P.braun, 0.35), fuge = hell(f, 0.25);
    const n = Math.max(4, Math.round(o.r / 1.5)), zh = 1 / n;
    let s = rect(-b / 2, -1, b, 1, 0, f) + rect(b * 0.1, -1, b * 0.4, 1, 0, dunkel(f, 0.06));
    for (let i = 0; i < n; i++) { const y = -1 + i * zh; s += `<line x1="${f3(-b / 2)}" y1="${f3(y)}" x2="${f3(b / 2)}" y2="${f3(y)}" stroke="${fuge}" stroke-width="0.012"/>`; if (i % 2) s += `<line x1="0" y1="${f3(y)}" x2="0" y2="${f3(Math.min(0, y + zh))}" stroke="${fuge}" stroke-width="0.012"/>`; else for (const vx of [-b / 4, b / 4]) s += `<line x1="${f3(vx)}" y1="${f3(y)}" x2="${f3(vx)}" y2="${f3(Math.min(0, y + zh))}" stroke="${fuge}" stroke-width="0.012"/>`; }
    if (o.fenster) s += rect(-b / 2 - 0.01, -0.75, b + 0.02, 0.35, 0, rgba(stil.hg.himmel[0], 0.7), ` stroke="#f4f6fa" stroke-width="0.03"`);
    return { k: Math.max(1, b / 2) + 0.05, svg: s };
  };

  // ---------- Zeitleiste der Erdzeitalter (Mitte; Breite = o.r) ----------
  OB.zeitleiste = (o, stil) => {
    const n = o.liste.length, hh = 4.2 / o.r, b = 1 / n;
    let s = '';
    o.liste.forEach((e, i) => {
      const x = -0.5 + i * b, f = HF.knallig(stil, e.f);
      s += rect(x + 0.003, -hh / 2, b - 0.006, hh, hh * 0.3, f) + rect(x + 0.003, 0, b - 0.006, hh / 2, hh * 0.3, dunkel(f, 0.08)) + rect(x + 0.003, 0, b - 0.006, hh * 0.15, 0, dunkel(f, 0.08));
      s += `<text x="${f3(x + b / 2)}" y="${f3(hh * 0.05)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" style="${schrift(stil, hh * 0.4)}">${e.n}</text>`;
      if (o.zahlen) s += `<text x="${f3(x + b)}" y="${f3(hh * 0.95)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" stroke="${rgba(stil.palette.schwarz, 0.5)}" stroke-width="${f3(hh * 0.05)}" paint-order="stroke" style="${schrift(stil, hh * 0.3)}">${e.bis}</text>`;
    });
    s += `<path class="marke" d="M0 ${f3(-hh * 0.55)} L${f3(-hh * 0.35)} ${f3(-hh * 1.1)} L${f3(hh * 0.35)} ${f3(-hh * 1.1)} Z" fill="${stil.palette.rot}" stroke="#fff" stroke-width="${f3(hh * 0.06)}" stroke-linejoin="round" style="display:none"/>`;
    return { k: 0.56, svg: s };
  };
  BW.zeitleiste = (el, o, t) => {
    const m = el._bf || (el._bf = zwischen(el, '.marke'));
    const w = wertBei(o.marke, t, -1);
    m.style.display = w >= 0 ? '' : 'none';
    if (w >= 0) m.setAttribute('transform', `translate(${f3(-0.5 + w / o.liste.length)} 0)`);
  };
})();
