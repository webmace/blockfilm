// Blockfilm – gezeichnete Dinge im Flat-Look (Engine: app/js/dinge.js): Hand mit Schrumpel-Rillen, Rosine, Handtuch.
// Mittelpunkt = Positionspunkt; die Hand wird über HF.bewegung.hand schrumpelig (o.schrumpel: 0 glatt … 1 schrumpelig).
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const OB = HF.objektGrafik;
  const BW = (HF.bewegung = HF.bewegung || {});
  const { hell, dunkel, rgba } = HF.farbe;
  const f3 = v => Math.round(v * 1000) / 1000;
  const ell = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${f3(x)}" cy="${f3(y)}" rx="${f3(rx)}" ry="${f3(ry)}" fill="${f}"${extra}/>`;
  const linie = (a, b, d, f, extra = '') => `<line x1="${f3(a[0])}" y1="${f3(a[1])}" x2="${f3(b[0])}" y2="${f3(b[1])}" stroke="${f}" stroke-width="${f3(d)}" stroke-linecap="round"${extra}/>`;

  // ---------- Hand (Handfläche, Finger nach oben, Daumen links) ----------
  // Finger: [x unten, y unten, x oben, y oben]
  const FINGER = [[-0.24, -0.02, -0.29, -0.62], [-0.08, -0.06, -0.09, -0.74], [0.08, -0.06, 0.1, -0.7], [0.23, -0.02, 0.29, -0.52]];
  const DAUMEN = [-0.3, 0.3, -0.6, -0.08];
  const DICKE = 0.17;
  OB.hand = (o, stil) => {
    const haut = '#f8cfae', schatten = '#eab48f', linieF = '#d99a74';
    let s = '';
    // Daumen und Finger, dann die Handfläche darüber
    const alle = [DAUMEN, ...FINGER];
    s += alle.map(([x0, y0, x1, y1], i) => linie([x0, y0], [x1, y1], i === 0 ? DICKE * 1.1 : DICKE, haut)).join('');
    s += `<path d="M-0.31 -0.06 C-0.33 0.2 -0.3 0.42 -0.16 0.52 C-0.05 0.6 0.12 0.6 0.22 0.5 C0.33 0.38 0.34 0.15 0.31 -0.06 Q0 -0.14 -0.31 -0.06 Z" fill="${haut}"/>`;
    s += `<path d="M0.16 -0.08 C0.3 -0.07 0.33 0.15 0.3 0.3 C0.28 0.42 0.22 0.5 0.12 0.55 C0.22 0.4 0.24 0.12 0.16 -0.08 Z" fill="${schatten}" opacity="0.7"/>`;
    // Handlinien
    s += `<path d="M-0.22 0.28 C-0.1 0.18 0.05 0.2 0.18 0.1" stroke="${linieF}" stroke-width="0.022" stroke-linecap="round" fill="none" opacity="0.55"/>`;
    s += `<path d="M-0.18 0.1 C-0.05 0.04 0.1 0.05 0.24 -0.02" stroke="${linieF}" stroke-width="0.02" stroke-linecap="round" fill="none" opacity="0.45"/>`;
    // Fingernägel (hellere Kuppen)
    s += FINGER.map(([x0, y0, x1, y1]) => { const a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI + 90; return ell(x1 + (x0 - x1) * 0.06, y1 + (y0 - y1) * 0.06 + 0.02, 0.045, 0.055, '#fde3d2', ` transform="rotate(${f3(a)} ${f3(x1)} ${f3(y1)})"`); }).join('');
    // Schrumpel-Rillen: quer über jede Fingerkuppe, dazu leicht rosa-lila Kuppen (erst sichtbar, wenn schrumpelig)
    let r = '';
    for (const [x0, y0, x1, y1] of [DAUMEN, ...FINGER]) {
      const lang = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / lang, uy = (y1 - y0) / lang, nx = -uy, ny = ux;
      r += `<circle cx="${f3(x1 - ux * 0.06)}" cy="${f3(y1 - uy * 0.06)}" r="0.1" fill="rgba(190,120,170,0.2)"/>`;
      for (let k = 0; k < 4; k++) {
        const d = 0.03 + k * 0.055, cx = x1 - ux * d, cy = y1 - uy * d, b = DICKE * 0.36;
        r += `<path d="M${f3(cx - nx * b)} ${f3(cy - ny * b)} Q${f3(cx + ux * 0.025)} ${f3(cy + uy * 0.025)} ${f3(cx + nx * b)} ${f3(cy + ny * b)}" stroke="${dunkel(linieF, 0.08)}" stroke-width="0.016" stroke-linecap="round" fill="none"/>`;
      }
    }
    s += `<g class="falten" opacity="0">${r}</g>`;
    void stil;
    return { k: 0.85, svg: `<g class="handG">${s}</g>` };
  };
  BW.hand = (el, o, t, F, q, I) => {
    const c = el._bf || (el._bf = { f: el.querySelector('.falten'), g: el.querySelector('.handG') });
    const v = I.wertBei(o.schrumpel || [], t, 0);
    c.f.setAttribute('opacity', f3(v));
    // beim Schrumpeln ziehen sich die Finger ein kleines bisschen zusammen
    c.g.setAttribute('transform', `scale(${f3(1 - v * 0.03)} ${f3(1 - v * 0.015)})`);
  };

  // ---------- Rosine (braun-violett, runzelig) ----------
  OB.rosine = (o, stil) => {
    const f = o.farbe ? HF.stilFarbe(stil, o.farbe) : '#6a3346', d = dunkel(f, 0.13), h = hell(f, 0.16);
    let s = `<ellipse cx="0" cy="0.4" rx="0.55" ry="0.06" fill="rgba(0,0,0,0.13)"/>`;
    // unregelmäßiger, länglicher Umriss mit Dellen
    const umriss = 'M-0.62 0.02 C-0.66 -0.2 -0.45 -0.34 -0.28 -0.3 C-0.18 -0.4 0.02 -0.38 0.12 -0.32 C0.3 -0.4 0.55 -0.3 0.6 -0.1 C0.68 0.06 0.58 0.26 0.4 0.3 C0.25 0.4 0.02 0.36 -0.1 0.32 C-0.3 0.4 -0.55 0.28 -0.62 0.02 Z';
    s += `<path d="${umriss}" fill="${f}"/>`;
    s += `<path d="M0.35 -0.33 C0.55 -0.25 0.66 0.05 0.5 0.25 C0.38 0.36 0.15 0.38 0 0.34 C0.3 0.25 0.48 0.0 0.35 -0.33 Z" fill="${d}"/>`;
    // tiefe Runzeln (dunkle Furche mit heller Kante daneben)
    const furchen = ['M-0.5 -0.08 C-0.3 -0.2 -0.1 0.02 0.1 -0.12 S0.4 -0.05 0.5 -0.18', 'M-0.52 0.14 C-0.3 0.04 -0.15 0.24 0.08 0.12 S0.35 0.22 0.48 0.08', 'M-0.2 -0.3 C-0.25 -0.15 -0.12 -0.05 -0.2 0.1', 'M0.2 -0.32 C0.12 -0.18 0.28 -0.05 0.2 0.08', 'M-0.32 0.3 C-0.2 0.2 -0.05 0.3 0.1 0.26'];
    s += furchen.map(p => `<path d="${p}" stroke="${h}" stroke-width="0.04" stroke-linecap="round" fill="none" transform="translate(-0.02 -0.025)" opacity="0.9"/><path d="${p}" stroke="${dunkel(f, 0.09)}" stroke-width="0.035" stroke-linecap="round" fill="none"/>`).join('');
    s += ell(-0.32, -0.2, 0.1, 0.04, 'rgba(255,255,255,0.3)', ' transform="rotate(-20 -0.32 -0.2)"');
    s += `<path d="M0.55 -0.12 L0.66 -0.2" stroke="#9a7a48" stroke-width="0.05" stroke-linecap="round"/>`;
    return { k: 0.75, svg: s };
  };

  // ---------- Handtuch (gefaltet, mit Streifen) ----------
  OB.handtuch = (o, stil) => {
    const f = HF.stilFarbe(stil, o.farbe || '#5aa8e8'), d = dunkel(f, 0.12), h = hell(f, 0.2);
    let s = `<ellipse cx="0" cy="0.42" rx="0.7" ry="0.06" fill="rgba(0,0,0,0.13)"/>`;
    s += `<rect x="-0.7" y="-0.3" width="1.4" height="0.7" rx="0.12" fill="${f}"/>`;
    s += `<path d="M-0.7 -0.12 Q0 -0.2 0.7 -0.12 L0.7 -0.2 Q0.7 -0.3 0.58 -0.3 L-0.58 -0.3 Q-0.7 -0.3 -0.7 -0.2 Z" fill="${h}"/>`;
    s += `<rect x="-0.7" y="0.12" width="1.4" height="0.09" fill="rgba(255,255,255,0.75)"/><rect x="-0.7" y="0.25" width="1.4" height="0.04" fill="rgba(255,255,255,0.6)"/>`;
    s += `<rect x="0.5" y="-0.3" width="0.2" height="0.7" rx="0.1" fill="${d}" opacity="0.6"/>`;
    // Frottee-Pünktchen
    for (let i = 0; i < 14; i++) s += `<circle cx="${f3(-0.6 + (i % 7) * 0.18)}" cy="${f3(-0.02 + Math.floor(i / 7) * 0.32)}" r="0.018" fill="${rgba('#ffffff', 0.25)}"/>`;
    return { k: 0.8, svg: s };
  };
})();
