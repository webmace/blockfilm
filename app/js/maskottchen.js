// Blockfilm – Maskottchen „Glib“: ein kleiner bunter Schleim, der durch die Filme begleitet.
//   maskottchen2d [name] bei x y [groesse 7] [schweben]   Glib selbst hinstellen (dann gibt es keine automatischen Auftritte)
//   maskottchen aus                                         keine automatischen Auftritte in diesem Film
// Ohne eigene Angabe taucht Glib in jedem 2D-Film nach jeder Kapitelkarte in einer freien Ecke auf und hüpft nach
// ein paar Sätzen wieder hinaus. Die Zeichnung im neuen Stil steht in hf/figuren2d.js (OB.schleim).
(function () {
  const BF = (window.BF = window.BF || {});
  const Z = (BF.zusatz = BF.zusatz || {});
  BF.MASKOTTCHEN_NAME = 'Glib';
  const H = () => BF.w2dHelfer;

  Z.maskottchen2d = Z.glib2d = Z.glibbi2d = Z.schleim2d = function (w, t, h) {
    const { w2d, nameOder, punkt, neuesObjekt } = H();
    const F = h.F;
    w2d(F);
    const gr = w.optZahl(['groesse'], 7);
    w.optWort(['farbe']); // Farbe gibt es nicht: Glib ist immer bunt
    const schweben = w.flag(['schweben', 'schwebt', 'fliegt']);
    const name = nameOder(w, 'glib');
    const p = punkt(w);
    neuesObjekt(F, { typ: 'schleim', name, t0: t, p, r: gr, schweben });
    return 0;
  };
  Z.maskottchen = function (w, t, h) { if (w.flag(['aus', 'weg', 'nein'])) h.F.maskottchenAus = true; return 0; };

  // ---------- automatische Auftritte ----------
  const SCHWEB_HG = ['weltraum', 'all', 'space', 'mikro', 'meer'];
  function hgBei(F, t) { let a = 'weltraum'; for (const b of F.w2d.hg) if (b.t0 <= t) a = b.art; return a; }
  function belegung(F, x, y, t0, t1) {
    // wie sehr eine Stelle in der Zeit [t0, t1] von anderen Objekten belegt ist
    const pos = BF.w2dIntern.pos;
    let summe = 0;
    for (const t of [t0 + 0.5, (t0 + t1) / 2, t1 - 0.3]) {
      for (const o of F.w2d.liste) {
        if (o.typ === 'schleim' || !(t >= o.t0 && t < (o.t1 ?? Infinity))) continue;
        const p = pos(F, o, t), r = Math.min(30, o.typ === 'zeitleiste' ? o.r / 2 : o.r);
        const d = Math.hypot(p[0] - x, (p[1] + r * 0.4) - (y + 4));
        summe += Math.max(0, r + 6 - d);
      }
    }
    return summe;
  }
  BF.nachKompilieren = BF.nachKompilieren || [];
  // Namensschilder der früheren Begleitfigur heißen jetzt wie das Maskottchen
  BF.nachKompilieren.push(function (F) {
    if (!F.w2d) return;
    for (const tx of F.w2d.texte) if (tx.an && tx.an.obj && F.w2d.obj[tx.an.obj] && F.w2d.obj[tx.an.obj].typ === 'schleim' && /^mia$/i.test(tx.text)) tx.text = BF.MASKOTTCHEN_NAME;
  });
  BF.nachKompilieren.push(function maskottchenAuto(F) {
    if (!F.w2d || F.maskottchenAus || (F.reihenfolge && F.reihenfolge.length)) return;
    if (F.w2d.liste.some(o => o.typ === 'schleim')) return;      // das Skript stellt Glib selbst hin
    const sp = (F.sprache || []).slice().sort((a, b) => a.t0 - b.t0);
    if (!sp.length) return;
    // Kapitelanfänge: nach jeder Kapitelkarte, sonst der Filmanfang
    const anfaenge = F.texte.filter(x => x.karte).map(x => x.t1).sort((a, b) => a - b);
    if (!anfaenge.length || sp[0].t0 < anfaenge[0] - 0.1) anfaenge.unshift(Math.max(0, sp[0].t0 - 0.6));
    const { neuesObjekt } = H();
    anfaenge.forEach((start, i) => {
      const saetze = sp.filter(s => s.t0 >= start - 0.05).slice(0, 3);
      if (!saetze.length) return;
      const naechster = anfaenge[i + 1] ?? Infinity;
      const ende = Math.min(saetze[saetze.length - 1].t1 + 0.6, naechster - 0.3, F.dauer - 0.2);
      if (ende - start < 2.5) return;
      const schweben = SCHWEB_HG.includes(hgBei(F, start + 0.5));
      const y = schweben ? -15 : -11;
      // die freiere der beiden unteren Ecken
      const links = belegung(F, -42, y, start, ende), rechts = belegung(F, 42, y, start, ende);
      const x = links <= rechts ? -42 : 42, rand = x < 0 ? -58 : 58;
      const o = neuesObjekt(F, { typ: 'schleim', name: 'glib_auto' + i, t0: start + 0.2, p: [rand, y], r: 6.5, schweben, auto: true });
      o.segs.push({ typ: 'zu', t0: start + 0.2, t1: start + 1.1, von: [rand, y], zu: [x, y] });
      o.segs.push({ typ: 'zu', t0: ende - 0.9, t1: ende, von: [x, y], zu: [rand, y] });
      o.t1 = ende + 0.05;
    });
  });

  // Mia (die frühere Begleitfigur) ist jetzt Glib
  const altKind = Z.kind2d;
  Z.kind2d = Z.mensch2d = function (w, t, h) {
    if (w.pk && w.pk() === 'mia') {
      // gleich hoch wie ein Kind wäre ein Schleim viel zu breit: kleiner machen
      const d = Z.maskottchen2d(w, t, h);
      const W = h.F.w2d, o = W.liste[W.liste.length - 1];
      if (o && o.typ === 'schleim') o.r = Math.round(o.r * 0.6 * 10) / 10;
      return d;
    }
    return altKind(w, t, h);
  };

  // ---------- einfache Zeichnung für die alte Vorschau (ohne „Neuer Stil“) ----------
  BF.zeichne2d = BF.zeichne2d || {};
  BF.zeichne2d.schleim = function (ctx, o, sx, sy, r, t) {
    const w = 1 + Math.sin(t * 2.2) * 0.03;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(r * w, r * (2 - w));
    const g = ctx.createLinearGradient(0, -0.85, 0, 0); g.addColorStop(0, '#ff7ad1'); g.addColorStop(0.5, '#a98bff'); g.addColorStop(1, '#3fe0c8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-0.55, 0); ctx.bezierCurveTo(-0.62, -0.25, -0.5, -0.8, 0, -0.84); ctx.bezierCurveTo(0.5, -0.8, 0.62, -0.25, 0.55, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-0.22, -0.62, 0.12, 0.07, -0.5, 0, 7); ctx.fill();
    for (const sg of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sg * 0.17, -0.48, 0.12, 0, 7); ctx.fill(); ctx.fillStyle = '#1d2340'; ctx.beginPath(); ctx.arc(sg * 0.17, -0.46, 0.065, 0, 7); ctx.fill(); }
    ctx.restore();
  };
})();
