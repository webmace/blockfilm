// Blockfilm – Fledermäuse: dunkle, flache Figuren für Erklärfilme (statt Menschen) und als Erzähler statt Glib.
//   fledermaus2d [name] bei x y [groesse 7] [farbe blau] [links] [fliegt] [haengt]   eine Fledermaus (Position = Füße; mit „haengt“ = Stelle, an der sie hängt)
//   fledermaeuse2d name anzahl 6 bei x y [abstand 8] [groesse 5] [fliegt]              eine ganze Gruppe: name1 … nameN, alle dunkel wie echte Fledermäuse
//   maskottchen fledermaus                                                              der Erzähler in der Ecke ist eine Fledermaus (statt des Schleims)
// Beim Bewegen (bewege2d) fliegen sie mit Flügelschlag, im Stehen legen sie die Flügel an, blinzeln und schauen zum Neuesten im Bild.
(function () {
  const BF = (window.BF = window.BF || {});
  const Z = (BF.zusatz = BF.zusatz || {});
  const HF = (BF.hf = BF.hf || {});
  const OB = HF.objektGrafik;
  const BW = (HF.bewegung = HF.bewegung || {});
  const { hell, dunkel, rgba } = HF.farbe;
  const f3 = v => Math.round(v * 1000) / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

  // ---------- Befehle ----------
  function eine(F, name, t, p, gr, opt) {
    return BF.w2dHelfer.neuesObjekt(F, Object.assign({ typ: 'fledermaus', name, t0: t, p, r: gr }, opt));
  }
  Z.fledermaus2d = function (w, t, h) {
    const { w2d, nameOder, punkt } = BF.w2dHelfer;
    const F = h.F;
    const gr = w.optZahl(['groesse'], 7);
    const farbe = w.optWort(['farbe']) || null;
    const opt = { farbe, dir: w.flag(['links']) ? -1 : 1, fliegt: w.flag(['fliegt', 'fliegen', 'schweben', 'schwebt']), haengt: w.flag(['haengt', 'haengen', 'kopfueber']) };
    const name = nameOder(w, 'fledermaus' + Object.keys(w2d(F).obj).length);
    eine(F, name, t, punkt(w), gr, opt);
    return 0;
  };
  Z.fledermaeuse2d = Z.schwarm2d = function (w, t, h) {
    const { w2d, nameOder, punkt } = BF.w2dHelfer;
    const F = h.F;
    const gr = w.optZahl(['groesse'], 5);
    const n = clamp(Math.round(w.optZahl(['anzahl'], 5)), 1, 24);
    const ab = w.optZahl(['abstand'], gr * 1.5);
    const opt = { dir: w.flag(['links']) ? -1 : 1, fliegt: w.flag(['fliegt', 'fliegen', 'schweben', 'schwebt']), haengt: w.flag(['haengt', 'haengen', 'kopfueber']) };
    const name = nameOder(w, 'schwarm' + Object.keys(w2d(F).obj).length);
    const p = punkt(w);
    for (let i = 0; i < n; i++) {
      // im Flug leicht versetzt (wie ein Schwarm), am Boden in einer Reihe
      const dy = opt.fliegt ? ((i * 37) % 7 - 3) * gr * 0.18 : 0;
      eine(F, name + (i + 1), t + i * 0.08, [p[0] + (i - (n - 1) / 2) * ab, p[1] + dy], gr * (0.9 + ((i * 53) % 5) * 0.05), Object.assign({}, opt));
    }
    return 0;
  };
  // maskottchen fledermaus | maskottchen schleim | maskottchen aus
  const altMaskottchen = Z.maskottchen;
  Z.maskottchen = function (w, t, h) {
    if (w.flag(['fledermaus', 'fledermaeuse'])) { h.F.maskottchenArt = 'fledermaus'; return 0; }
    if (w.flag(['schleim', 'glib'])) { h.F.maskottchenArt = null; return 0; }
    return altMaskottchen(w, t, h);
  };
  // nach dem Übersetzen: Der Erzähler (und jedes maskottchen2d) wird zur Fledermaus, das Namensschild „Glib“ entfällt
  BF.nachKompilieren = BF.nachKompilieren || [];
  BF.nachKompilieren.push(function fledermausErzaehler(F) {
    if (!F.w2d || F.maskottchenArt !== 'fledermaus') return;
    const namen = new Set();
    for (const o of F.w2d.liste) if (o.typ === 'schleim') { o.art = 'fledermaus'; namen.add(o.name); if (o.auto) o.r = 9; }
    F.w2d.texte = F.w2d.texte.filter(x => !(x.an && namen.has(x.an.obj) && x.text === BF.MASKOTTCHEN_NAME));
  });

  // ---------- Zeichnung ----------
  // Ursprung = Füße, Höhe ≈ 1 = o.r, von vorne. Flügel hängen an den Schultern (Drehpunkt ±0.2 / -0.52).
  const fluegel = (sg, f, d) => {
    const x = v => f3(sg * v);
    return `<g class="ffl" data-sg="${sg}"><path d="M${x(0.18)} -0.56 L${x(0.98)} -0.86 Q${x(0.9)} -0.62 ${x(0.94)} -0.42 Q${x(0.76)} -0.52 ${x(0.66)} -0.3 Q${x(0.54)} -0.44 ${x(0.42)} -0.26 Q${x(0.32)} -0.38 ${x(0.18)} -0.3 Z" fill="${d}"/>`
      + `<path d="M${x(0.2)} -0.54 L${x(0.94)} -0.42 M${x(0.2)} -0.54 L${x(0.66)} -0.3 M${x(0.2)} -0.54 L${x(0.42)} -0.26" stroke="${f}" stroke-width="0.022" stroke-linecap="round" fill="none"/>`
      + `<path d="M${x(0.18)} -0.56 L${x(0.98)} -0.86" stroke="${f}" stroke-width="0.05" stroke-linecap="round"/></g>`;
  };
  OB.fledermaus = (o, stil, id) => {
    const P = stil.palette;
    const erz = o.typ === 'schleim';
    // nicht bunt: alle Fledermäuse sind dunkel (fast schwarz, leicht bläulich), jede einen Hauch anders; „farbe …“ nur auf ausdrücklichen Wunsch
    const ton = (hash(o.name) % 4) * 0.018;
    const f = o.farbe ? HF.stilFarbe(stil, o.farbe) : hell(P.schwarz, 0.03 + ton), d = o.farbe ? dunkel(f, 0.16) : hell(f, 0.09), h = hell(f, o.farbe ? 0.16 : 0.13);
    const rand = o.farbe ? '' : ` stroke="${rgba('#ffffff', 0.28)}" stroke-width="0.018"`;
    const ohr = sg => `<path d="M${f3(sg * 0.24)} -0.6 L${f3(sg * 0.33)} -1.0 L${f3(sg * 0.04)} -0.7 Z" fill="${f}"/><path d="M${f3(sg * 0.23)} -0.68 L${f3(sg * 0.29)} -0.9 L${f3(sg * 0.12)} -0.72 Z" fill="${o.farbe ? rgba(P.pink, 0.85) : h}"/>`;
    const auge = sg => `<g class="fauge" data-x="${f3(sg * 0.105)}"><ellipse rx="0.092" ry="0.105" fill="#fff"/><g class="fpup"><circle r="0.052" fill="${P.schwarz}"/><circle cx="0.018" cy="-0.022" r="0.018" fill="#fff"/></g></g>`;
    return {
      k: 1.5,
      svg: `<ellipse class="fschatten" cx="0" cy="0.02" rx="0.34" ry="0.045" fill="rgba(0,0,0,0.18)"/>
<g class="fdreh"><g class="fhuepf"><g class="fricht">
${fluegel(-1, f, d)}${fluegel(1, f, d)}
<ellipse cx="-0.09" cy="-0.02" rx="0.075" ry="0.035" fill="${d}"/><ellipse cx="0.09" cy="-0.02" rx="0.075" ry="0.035" fill="${d}"/>
${ohr(-1)}${ohr(1)}
<ellipse cx="0" cy="-0.4" rx="0.29" ry="0.36" fill="${f}"${rand}/>
<ellipse cx="0" cy="-0.27" rx="0.17" ry="0.19" fill="${h}"/>
<ellipse cx="-0.2" cy="-0.36" rx="0.05" ry="0.03" fill="${rgba(P.rot, 0.35)}"/><ellipse cx="0.2" cy="-0.36" rx="0.05" ry="0.03" fill="${rgba(P.rot, 0.35)}"/>
${auge(-1)}${auge(1)}
<ellipse cx="0" cy="-0.405" rx="0.028" ry="0.02" fill="${o.farbe ? dunkel(f, 0.3) : P.orange}"/>
<g transform="translate(0 -0.34)"><ellipse class="fmund" rx="0.07" ry="0.022" fill="${dunkel(P.rot, 0.35)}"/><path d="M-0.045 -0.012 L-0.03 0.035 L-0.015 -0.012 Z M0.015 -0.012 L0.03 0.035 L0.045 -0.012 Z" fill="#fff"/></g>
</g></g></g>`,
    };
  };

  BW.fledermaus = (el, o, t, F, q, I) => {
    const c = el._bf || (el._bf = {
      dreh: el.querySelector('.fdreh'), h: el.querySelector('.fhuepf'), r: el.querySelector('.fricht'), fl: [...el.querySelectorAll('.ffl')],
      augen: [...el.querySelectorAll('.fauge')], pup: [...el.querySelectorAll('.fpup')], mund: el.querySelector('.fmund'), schatten: el.querySelector('.fschatten'),
    });
    const erz = o.typ === 'schleim';
    let hg = 'weltraum'; for (const b of F.w2d.hg) if (b.t0 <= t) hg = b.art;
    // Blick- und Flugrichtung
    let dir = o.dir || 1, seg = null;
    for (const s of o.segs || []) { if (s.t0 > t) break; if (s.typ === 'zu' && Math.abs(s.zu[0] - s.von[0]) > 0.01) dir = Math.sign(s.zu[0] - s.von[0]); if (s.typ === 'zu' && t < s.t1) seg = s; }
    const haengt = !!o.haengt && !seg;
    const fliegt = !haengt && (!!seg || o.fliegt || o.schweben || (erz && ['weltraum', 'all', 'space', 'mikro', 'meer'].includes(hg)));
    c.dreh.setAttribute('transform', haengt ? 'rotate(180)' : '');
    c.r.setAttribute('transform', seg ? `rotate(${f3(dir * 8)} 0 -0.4)` : '');
    // Flügel: im Flug schlagen, sonst angelegt
    const ph = t * (seg ? 17 : 11) + o.r * 3;
    c.fl.forEach(g => {
      const sg = +g.dataset.sg, px = sg * 0.2, py = -0.52;
      const w = fliegt ? Math.sin(ph) * 32 - 6 : 62 + Math.sin(t * 1.6 + o.r) * 3, sx = fliegt ? 1 : 0.5;
      g.setAttribute('transform', `translate(${px} ${py}) rotate(${f3(sg * w)}) scale(${sx} 1) translate(${-px} ${-py})`);
    });
    let hy = 0;
    if (fliegt) hy = -0.3 - Math.sin(ph) * 0.05 + Math.sin(t * 1.3 + o.r) * 0.04;
    else if (!haengt) {
      // im Stehen ab und zu ein Hopser, bei Ausrufen ein Freudensprung (nur der Erzähler)
      const p2 = (t + o.r * 0.7) % 4.6;
      if (p2 < 0.4) hy = -Math.sin(p2 / 0.4 * Math.PI) * 0.1;
      const ruf = erz && (F.sprache || []).find(s => t >= s.t0 && t < s.t0 + 0.7 && /!/.test(s.text));
      if (ruf) hy = Math.min(hy, -Math.sin((t - ruf.t0) / 0.7 * Math.PI) * 0.28);
    } else hy = Math.sin(t * 1.4 + o.r) * 0.015;
    c.h.setAttribute('transform', `translate(0 ${f3(hy)})`);
    c.schatten.setAttribute('opacity', haengt || fliegt ? 0 : 1);
    c.schatten.setAttribute('rx', f3(0.34 * (1 + hy * 0.9)));
    // blinzeln, zum neuesten Ding schauen
    const zu = ((t + o.r * 1.3) % 3.9) < 0.13;
    c.augen.forEach(a => a.setAttribute('transform', `translate(${a.dataset.x} -0.5) scale(1 ${zu ? 0.12 : 1})`));
    let ziel = null;
    for (const x of F.w2d.liste) if (x !== o && x.typ !== 'schleim' && x.typ !== 'fledermaus' && t >= x.t0 && t < (x.t1 ?? Infinity) && (!ziel || x.t0 > ziel.t0)) ziel = x;
    let dx = seg ? dir * 0.03 : 0, dy = 0;
    if (ziel && !seg) { const p = I.pos(F, ziel, t), l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; dx = (p[0] - q[0]) / l * 0.035; dy = -(p[1] - q[1] - 5) / l * 0.03; }
    const kopf = haengt ? -1 : 1;
    c.pup.forEach(pu => pu.setAttribute('transform', `translate(${f3(dx * kopf)} ${f3(clamp(dy, -0.035, 0.035) * kopf)})`));
    // der Erzähler bewegt den Mund, wenn gesprochen wird
    const spricht = erz && (F.sprache || []).some(s => t >= s.t0 && t < s.t1);
    c.mund.setAttribute('ry', f3(spricht ? 0.02 + Math.abs(Math.sin(t * 13)) * 0.05 : 0.022));
  };

  // Der Schleim-Erzähler wird zur Fledermaus, wenn der Film „maskottchen fledermaus“ sagt
  const altOB = OB.schleim, altBW = BW.schleim;
  OB.schleim = (o, stil, id) => (o.art === 'fledermaus' ? OB.fledermaus(o, stil, id) : altOB(o, stil, id));
  BW.schleim = (el, o, t, F, q, I) => (o.art === 'fledermaus' ? BW.fledermaus(el, o, t, F, q, I) : altBW(el, o, t, F, q, I));

  // alte Vorschau (ohne neuen Stil): Bildzeichen
  BF.zeichne2d = BF.zeichne2d || {};
  BF.zeichne2d.fledermaus = function (ctx, o, sx, sy, r) {
    ctx.save();
    ctx.font = `${Math.round(r * 1.2)}px "Noto Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('🦇', sx, sy);
    ctx.restore();
  };
})();
