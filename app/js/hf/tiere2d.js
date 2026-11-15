// Blockfilm – gezeichnete Tiere im Flat-Look für HyperFrames (siehe tiere.js für den Befehl tier2d).
// Ursprung = Fußpunkt, Höhe ≈ 1 = o.r, Blick nach rechts. Ersetzt auch Tier-Emojis aus symbol2d.
// HF.bewegung.tier: Blickrichtung, Laufen mit Beinen, Hüpfen (Frosch, Hase), Flattern (Vogel, Eule), Atmen, Blinzeln, Schwanzwedeln.
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const OB = HF.objektGrafik;
  const BW = (HF.bewegung = HF.bewegung || {});
  const { hell, dunkel, mische, rgba } = HF.farbe;
  const f3 = v => Math.round(v * 1000) / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ell = (x, y, rx, ry, f, rot = 0, extra = '') => `<ellipse cx="${f3(x)}" cy="${f3(y)}" rx="${f3(rx)}" ry="${f3(ry)}"${rot ? ` transform="rotate(${rot} ${f3(x)} ${f3(y)})"` : ''} fill="${f}"${extra}/>`;
  const kreis = (x, y, r, f, extra = '') => `<circle cx="${f3(x)}" cy="${f3(y)}" r="${f3(r)}" fill="${f}"${extra}/>`;
  const linie = (a, b, d, f) => `<line x1="${f3(a[0])}" y1="${f3(a[1])}" x2="${f3(b[0])}" y2="${f3(b[1])}" stroke="${f}" stroke-width="${f3(d)}" stroke-linecap="round"/>`;
  // Bein als Gruppe mit Drehpunkt an der Hüfte (data-x/y), damit es beim Laufen schwingt
  const bein = (cls, x, y0, laenge, d, f, pfote = true) => `<g class="tb ${cls}" data-x="${f3(x)}" data-y="${f3(y0)}">${linie([x, y0], [x, y0 + laenge], d, f)}${pfote ? ell(x + d * 0.35, y0 + laenge - d * 0.15, d * 0.75, d * 0.4, f) : ''}</g>`;
  const auge = (x, y, r, P) => `<g class="tauge" data-y="${f3(y)}">${kreis(x, y, r, '#fff')}${kreis(x + r * 0.2, y + r * 0.05, r * 0.6, P.schwarz)}${kreis(x + r * 0.38, y - r * 0.2, r * 0.22, '#fff')}</g>`;
  const backe = (x, y, r, P) => kreis(x, y, r, rgba(P.rot, 0.3));

  const ZEICHNE = {
    hund(P, k) {
      const f = HF.knallig ? HF.knallig({ alter: '6-9' }, '#c98a4a') : '#d9944a', d = dunkel(f, 0.12), h = hell(f, 0.14);
      return bein('fern', -0.27, -0.36, 0.36, 0.09, d) + bein('fern2', 0.2, -0.36, 0.36, 0.09, d)
        + `<g class="tschwanz" data-x="-0.4" data-y="-0.5"><path d="M-0.4 -0.5 Q-0.58 -0.56 -0.62 -0.78" stroke="${f}" stroke-width="0.08" stroke-linecap="round" fill="none"/></g>`
        + ell(-0.04, -0.46, 0.4, 0.2, f) + ell(0, -0.38, 0.3, 0.1, h)
        + bein('nah', -0.2, -0.36, 0.36, 0.09, f) + bein('nah2', 0.27, -0.36, 0.36, 0.09, f)
        + `<g class="tkopf" data-x="0.3" data-y="-0.6">${kreis(0.38, -0.72, 0.2, f)}${ell(0.55, -0.66, 0.13, 0.085, h)}${kreis(0.67, -0.69, 0.04, P.schwarz)}${ell(0.27, -0.72, 0.07, 0.15, d, 15)}${auge(0.44, -0.78, 0.052, P)}${backe(0.47, -0.66, 0.035, P)}<path d="M0.55 -0.6 Q0.6 -0.57 0.64 -0.61" stroke="${dunkel(f, 0.35)}" stroke-width="0.015" fill="none" stroke-linecap="round"/></g>`;
    },
    katze(P) {
      const f = '#f2994a', d = dunkel(f, 0.12), h = hell(f, 0.16);
      return bein('fern', -0.25, -0.34, 0.34, 0.07, d) + bein('fern2', 0.18, -0.34, 0.34, 0.07, d)
        + `<g class="tschwanz" data-x="-0.36" data-y="-0.46"><path d="M-0.36 -0.46 Q-0.62 -0.5 -0.56 -0.78 Q-0.52 -0.92 -0.42 -0.88" stroke="${f}" stroke-width="0.07" stroke-linecap="round" fill="none"/></g>`
        + ell(-0.04, -0.44, 0.35, 0.16, f) + [-0.18, -0.06, 0.06].map(x => linie([x, -0.58], [x + 0.03, -0.48], 0.035, d)).join('') + ell(0, -0.36, 0.24, 0.07, h)
        + bein('nah', -0.19, -0.34, 0.34, 0.07, f) + bein('nah2', 0.25, -0.34, 0.34, 0.07, f)
        + `<g class="tkopf" data-x="0.28" data-y="-0.58">${kreis(0.36, -0.68, 0.18, f)}<path d="M0.22 -0.78 L0.24 -0.98 L0.34 -0.84 Z" fill="${f}"/><path d="M0.38 -0.84 L0.48 -0.98 L0.5 -0.78 Z" fill="${f}"/><path d="M0.25 -0.82 L0.26 -0.92 L0.31 -0.85 Z" fill="${P.pink}"/>${auge(0.42, -0.72, 0.045, P)}${kreis(0.53, -0.64, 0.025, P.pink)}${backe(0.44, -0.62, 0.03, P)}${linie([0.5, -0.63], [0.66, -0.66], 0.008, '#fff')}${linie([0.5, -0.61], [0.66, -0.6], 0.008, '#fff')}</g>`;
    },
    vogel(P) {
      const f = P.blau, d = dunkel(f, 0.12), h = hell(f, 0.2);
      return linie([-0.04, -0.2], [-0.06, 0], 0.025, P.orange) + linie([0.06, -0.2], [0.07, 0], 0.025, P.orange) + linie([-0.1, 0], [0.02, 0], 0.02, P.orange) + linie([0.01, 0], [0.13, 0], 0.02, P.orange)
        + `<path d="M-0.26 -0.42 L-0.5 -0.5 L-0.44 -0.34 Z" fill="${d}"/>` + ell(0, -0.42, 0.3, 0.24, f) + ell(0.05, -0.34, 0.2, 0.12, h)
        + `<g class="tkopf" data-x="0.15" data-y="-0.5">${kreis(0.2, -0.6, 0.17, f)}<path d="M0.35 -0.62 L0.48 -0.58 L0.35 -0.54 Z" fill="${P.orange}"/>${auge(0.25, -0.64, 0.045, P)}${backe(0.28, -0.55, 0.028, P)}</g>`
        + `<g class="tfluegel" data-x="0.02" data-y="-0.5">${ell(-0.07, -0.44, 0.16, 0.1, d, -15)}</g>`;
    },
    huhn(P) {
      const f = '#fbfaf5', d = '#e6e1d6';
      return linie([-0.05, -0.18], [-0.06, 0], 0.03, P.orange) + linie([0.07, -0.18], [0.08, 0], 0.03, P.orange)
        + `<path d="M-0.25 -0.45 Q-0.48 -0.7 -0.32 -0.75 Q-0.36 -0.6 -0.2 -0.55 Z" fill="${d}"/>` + ell(0, -0.4, 0.3, 0.24, f)
        + `<g class="tkopf" data-x="0.18" data-y="-0.55">${ell(0.2, -0.66, 0.12, 0.15, f)}<path d="M0.12 -0.8 Q0.14 -0.9 0.19 -0.82 Q0.22 -0.92 0.26 -0.82 Q0.3 -0.88 0.3 -0.76 Z" fill="${P.rot}"/><path d="M0.3 -0.68 L0.4 -0.65 L0.3 -0.62 Z" fill="${P.orange}"/>${ell(0.3, -0.58, 0.03, 0.05, P.rot)}${auge(0.23, -0.7, 0.035, P)}</g>`
        + `<g class="tfluegel" data-x="0" data-y="-0.48">${ell(-0.05, -0.4, 0.15, 0.1, d, -10)}</g>`;
    },
    eule(P) {
      const f = '#a0673d', d = dunkel(f, 0.1), h = '#e8c99a';
      return ell(-0.08, 0, 0.06, 0.025, P.orange) + ell(0.08, 0, 0.06, 0.025, P.orange)
        + `<g class="tfluegel" data-x="-0.24" data-y="-0.6">${ell(-0.26, -0.42, 0.1, 0.24, d, 10)}</g><g class="tfluegel2" data-x="0.24" data-y="-0.6">${ell(0.26, -0.42, 0.1, 0.24, d, -10)}</g>`
        + ell(0, -0.42, 0.28, 0.4, f) + ell(0, -0.32, 0.18, 0.26, h)
        + `<path d="M-0.22 -0.72 L-0.26 -0.88 L-0.1 -0.76 Z" fill="${f}"/><path d="M0.22 -0.72 L0.26 -0.88 L0.1 -0.76 Z" fill="${f}"/>`
        + `<g class="tkopf" data-x="0" data-y="-0.6">${kreis(-0.11, -0.6, 0.11, '#fff')}${kreis(0.11, -0.6, 0.11, '#fff')}<g class="tauge" data-y="-0.6">${kreis(-0.1, -0.6, 0.065, P.orange)}${kreis(0.12, -0.6, 0.065, P.orange)}${kreis(-0.09, -0.6, 0.04, P.schwarz)}${kreis(0.13, -0.6, 0.04, P.schwarz)}</g><path d="M-0.03 -0.52 L0.03 -0.52 L0 -0.45 Z" fill="${P.orange}"/></g>`;
    },
    frosch(P) {
      const f = P.gruen, d = dunkel(f, 0.12), h = hell(f, 0.2);
      return `<g class="tb hinten" data-x="-0.18" data-y="-0.16">${ell(-0.2, -0.12, 0.17, 0.11, d)}${ell(-0.08, -0.02, 0.12, 0.035, d)}</g>`
        + ell(0, -0.22, 0.34, 0.2, f) + ell(0.05, -0.15, 0.24, 0.1, h)
        + `<g class="tb vorne" data-x="0.2" data-y="-0.16">${linie([0.2, -0.16], [0.24, 0], 0.05, f)}${ell(0.27, 0, 0.06, 0.02, f)}</g>`
        + `<g class="tkopf" data-x="0.1" data-y="-0.3">${kreis(0.08, -0.42, 0.09, f)}${kreis(0.26, -0.4, 0.09, f)}${auge(0.09, -0.44, 0.06, P)}${auge(0.27, -0.42, 0.06, P)}<path d="M0.16 -0.22 Q0.27 -0.15 0.36 -0.24" stroke="${dunkel(f, 0.3)}" stroke-width="0.02" fill="none" stroke-linecap="round"/>${backe(0.3, -0.27, 0.035, P)}</g>`;
    },
    schildkroete(P) {
      const f = P.gruen, schale = mische(P.braun, P.orange, 0.35), sh = hell(schale, 0.12), haut = hell(f, 0.05);
      let muster = '';
      for (const [x, y, r] of [[-0.18, -0.25, 0.08], [0.04, -0.3, 0.09], [0.22, -0.22, 0.07], [-0.06, -0.14, 0.06], [0.14, -0.12, 0.06]]) muster += kreis(x, y, r, sh);
      return bein('fern', -0.24, -0.12, 0.12, 0.08, dunkel(haut, 0.1), false) + bein('fern2', 0.2, -0.12, 0.12, 0.08, dunkel(haut, 0.1), false)
        + `<g class="tkopf" data-x="0.3" data-y="-0.14">${ell(0.43, -0.2, 0.13, 0.1, haut)}${auge(0.48, -0.23, 0.035, P)}<path d="M0.48 -0.15 Q0.52 -0.13 0.55 -0.16" stroke="${dunkel(haut, 0.3)}" stroke-width="0.012" fill="none"/></g>`
        + `<path d="M-0.4 -0.08 Q-0.36 -0.5 0.02 -0.5 Q0.38 -0.5 0.38 -0.08 Z" fill="${schale}"/>${muster}<path d="M-0.42 -0.08 L0.4 -0.08 L0.36 -0.02 L-0.38 -0.02 Z" fill="${dunkel(schale, 0.12)}"/>`
        + bein('nah', -0.18, -0.08, 0.08, 0.09, haut, false) + bein('nah2', 0.26, -0.08, 0.08, 0.09, haut, false) + `<path d="M-0.4 -0.06 L-0.5 -0.04 L-0.4 -0.02 Z" fill="${haut}"/>`;
    },
    eidechse(P) {
      const f = P.tuerkis, d = dunkel(f, 0.12), h = hell(f, 0.15);
      return bein('fern', -0.2, -0.1, 0.1, 0.045, d) + bein('fern2', 0.18, -0.1, 0.1, 0.045, d)
        + `<g class="tschwanz" data-x="-0.3" data-y="-0.11"><path d="M-0.3 -0.16 Q-0.6 -0.12 -0.85 -0.02 Q-0.6 -0.06 -0.3 -0.06 Z" fill="${f}"/></g>`
        + ell(0, -0.12, 0.34, 0.075, f) + [-0.15, 0, 0.15].map(x => kreis(x, -0.15, 0.025, h)).join('')
        + bein('nah', -0.15, -0.09, 0.09, 0.045, f) + bein('nah2', 0.23, -0.09, 0.09, 0.045, f)
        + `<g class="tkopf" data-x="0.3" data-y="-0.12">${ell(0.42, -0.14, 0.12, 0.07, f)}${auge(0.45, -0.17, 0.03, P)}</g>`;
    },
    hase(P) {
      const f = '#cfd3de', d = dunkel(f, 0.1), w = '#fbfbff';
      return `<g class="tb hinten" data-x="-0.18" data-y="-0.2">${ell(-0.16, -0.14, 0.15, 0.13, d)}${ell(-0.06, -0.02, 0.13, 0.035, d)}</g>`
        + kreis(-0.36, -0.36, 0.08, w) + ell(-0.04, -0.32, 0.3, 0.24, f) + ell(0.02, -0.24, 0.18, 0.12, w)
        + `<g class="tb vorne" data-x="0.18" data-y="-0.2">${linie([0.18, -0.2], [0.2, 0], 0.06, f)}</g>`
        + `<g class="tkopf" data-x="0.2" data-y="-0.5">${ell(0.2, -0.86, 0.05, 0.2, f, 8)}${ell(0.2, -0.86, 0.025, 0.14, P.pink, 8)}${ell(0.3, -0.84, 0.05, 0.19, d, 20)}${kreis(0.27, -0.58, 0.16, f)}${auge(0.32, -0.62, 0.045, P)}${kreis(0.42, -0.55, 0.025, P.pink)}${backe(0.34, -0.52, 0.03, P)}</g>`;
    },
    maus(P) {
      const f = '#a9afc0', d = dunkel(f, 0.1);
      return `<g class="tschwanz" data-x="-0.28" data-y="-0.14"><path d="M-0.28 -0.14 Q-0.55 -0.05 -0.6 -0.25 Q-0.65 -0.38 -0.52 -0.4" stroke="${P.pink}" stroke-width="0.025" fill="none" stroke-linecap="round"/></g>`
        + bein('fern', -0.12, -0.08, 0.08, 0.04, d) + bein('fern2', 0.12, -0.08, 0.08, 0.04, d)
        + `<path d="M-0.3 -0.12 Q-0.28 -0.36 0.02 -0.36 Q0.3 -0.34 0.42 -0.16 Q0.3 -0.06 -0.3 -0.06 Z" fill="${f}"/>`
        + bein('nah', -0.08, -0.07, 0.07, 0.04, f) + bein('nah2', 0.16, -0.07, 0.07, 0.04, f)
        + `<g class="tkopf" data-x="0.2" data-y="-0.2">${kreis(0.14, -0.38, 0.09, d)}${kreis(0.14, -0.38, 0.055, P.pink)}${auge(0.28, -0.24, 0.03, P)}${kreis(0.43, -0.16, 0.025, P.pink)}</g>`;
    },
  };

  OB.tier = (o, stil, id, mitte) => {
    const art = o.art || BF.emojiTier(o.text) || 'hund';
    const inhalt = (ZEICHNE[art] || ZEICHNE.hund)(stil.palette);
    const schatten = `<ellipse cx="0" cy="0.01" rx="0.42" ry="0.04" fill="rgba(0,0,0,0.16)"/>`;
    // als Ersatz für ein Emoji (Position = Mitte des Bildzeichens): etwas größer und mittig
    const um = mitte ? 'translate(0 0.6) scale(1.2)' : '';
    return { k: mitte ? 1.3 : 1.1, svg: `<g transform="${um}">${schatten}<g class="trichtung"><g class="thuepf"><g class="tatmen">${inhalt}</g></g></g></g>` };
  };

  const HUEPFER = ['frosch', 'hase'], FLIEGER = ['vogel', 'eule'];
  BW.tier = (el, o, t, F, q) => {
    const art = o.art || o._tierArt || (o._tierArt = BF.emojiTier(o.text));
    const c = el._bf || (el._bf = {
      r: el.querySelector('.trichtung'), h: el.querySelector('.thuepf'), a: el.querySelector('.tatmen'), beine: [...el.querySelectorAll('.tb')],
      sw: el.querySelector('.tschwanz'), fl: [...el.querySelectorAll('.tfluegel, .tfluegel2')], augen: [...el.querySelectorAll('.tauge')], kopf: el.querySelector('.tkopf'),
    });
    const um = (g, w) => g && g.setAttribute('transform', `rotate(${f3(w)} ${g.dataset.x || 0} ${g.dataset.y || 0})`);
    // Blickrichtung: in Laufrichtung, sonst die eingestellte
    let dir = o.dir || 1, seg = null;
    for (const s of o.segs || []) { if (s.t0 > t) break; if (s.typ === 'zu' && Math.abs(s.zu[0] - s.von[0]) > 0.01) dir = Math.sign(s.zu[0] - s.von[0]); if (s.typ === 'zu' && t < s.t1) seg = s; }
    c.r.setAttribute('transform', `scale(${dir} 1)`);
    const laeuft = !!seg, ph = laeuft ? (t - seg.t0) : 0;
    let hy = 0;
    if (laeuft && HUEPFER.includes(art)) hy = -Math.abs(Math.sin(ph * 6)) * 0.35;
    else if (laeuft && FLIEGER.includes(art)) hy = -0.25 - Math.sin(ph * 10) * 0.04;
    else if (laeuft) hy = -Math.abs(Math.sin(ph * 12)) * 0.04;
    c.h.setAttribute('transform', `translate(0 ${f3(hy)})`);
    c.a.setAttribute('transform', `translate(0 ${f3(-Math.sin(t * 2.4 + o.r) * 0.008)}) scale(1 ${f3(1 + Math.sin(t * 2.4 + o.r) * 0.015)})`);
    // Beine
    c.beine.forEach(b => {
      const cls = b.getAttribute('class');
      let w = 0;
      if (laeuft && HUEPFER.includes(art)) w = /hinten/.test(cls) ? -Math.abs(Math.sin(ph * 6)) * 40 : Math.abs(Math.sin(ph * 6)) * 25;
      else if (laeuft && !FLIEGER.includes(art)) w = Math.sin(ph * 12 + (/fern2|nah\b/.test(cls) ? Math.PI : 0)) * (art === 'schildkroete' ? 12 : 28);
      um(b, w);
    });
    // Schwanz wedeln, Flügel schlagen, Kopf nicken, blinzeln
    um(c.sw, Math.sin(t * (art === 'hund' ? (laeuft ? 14 : 7) : 2.5)) * (art === 'hund' ? 14 : 6));
    const schlag = laeuft && FLIEGER.includes(art) ? Math.sin(t * 22) * 35 : Math.sin(t * 1.7 + o.r) * 4;
    c.fl.forEach((g, i) => um(g, (i ? -1 : 1) * schlag - (laeuft && art === 'vogel' ? 20 : 0)));
    um(c.kopf, Math.sin(t * 1.3 + o.r * 2) * 4 + (laeuft ? Math.sin(ph * 12) * 3 : 0));
    const zu = ((t + o.r * 1.7) % 3.3) < 0.12;
    c.augen.forEach(a => a.setAttribute('transform', zu ? `translate(0 ${f3(+a.dataset.y)}) scale(1 0.12) translate(0 ${f3(-a.dataset.y)})` : ''));
  };
})();
