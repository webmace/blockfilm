// Blockfilm – Maskottchen „Glib“: ein kleiner bunter Schleim, der durch die Filme begleitet.
//   maskottchen2d [name] bei x y [groesse 7] [schweben]   Glib selbst hinstellen (dann gibt es keine automatischen Auftritte)
//   maskottchen aus                                         keine automatischen Auftritte in diesem Film
// Ohne eigene Angabe erzählt Glib jeden 2D-Film: er steht in jedem Kapitel in einer freien unteren Ecke und spricht mit. Die Zeichnung im neuen Stil steht in hf/figuren2d.js (OB.schleim).
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
  // Glib erzählt: in jedem Kapitel steht er in einer freien unteren Ecke und spricht mit (Mund bewegt sich mit der Stimme).
  // Wird seine Ecke belegt, hüpft er hinaus und kommt auf der anderen Seite wieder herein.
  BF.nachKompilieren.push(function maskottchenErzaehler(F) {
    if (!F.w2d || F.maskottchenAus || (F.reihenfolge && F.reihenfolge.length)) return;
    if (F.w2d.liste.some(o => o.typ === 'schleim')) return;      // das Skript stellt Glib selbst hin
    const sp = (F.sprache || []).slice().sort((a, b) => a.t0 - b.t0);
    if (!sp.length) return;
    const karten = F.texte.filter(x => x.karte).sort((a, b) => a.t0 - b.t0);
    // Kapitel: von einer Kapitelkarte bis zur nächsten (vor der ersten Karte: Filmanfang)
    const kapitel = [];
    let ab = Math.max(0, sp[0].t0 - 0.6);
    for (const k of karten) { if (k.t0 > ab + 1) kapitel.push([ab, k.t0]); ab = Math.max(ab, k.t1); }
    kapitel.push([ab, F.dauer - 0.2]);
    const { neuesObjekt, w2d } = H();
    let erster = true;
    kapitel.forEach(([k0, k1], ki) => {
      const saetze = sp.filter(s => s.t0 >= k0 - 0.05 && s.t0 < k1);
      if (!saetze.length || k1 - k0 < 2.5) return;
      const start = k0 + 0.2, ende = k1 - 0.15;
      const schweben = SCHWEB_HG.includes(hgBei(F, start + 0.5));
      const y = schweben ? -15 : -11;
      // Ecke Satz für Satz wählen; nur wechseln, wenn die andere Ecke deutlich freier ist
      let seite = belegung(F, -42, y, start, saetze[0].t1) <= belegung(F, 42, y, start, saetze[0].t1) ? -1 : 1;
      const startSeite = seite, wechsel = [];
      for (const s of saetze.slice(1)) {
        const hier = belegung(F, seite * 42, y, s.t0, s.t1), dort = belegung(F, -seite * 42, y, s.t0, s.t1);
        if (hier > dort + 8) { seite = -seite; wechsel.push([s.t0 - 0.5, seite]); }
      }
      let akt = startSeite;
      const o = neuesObjekt(F, { typ: 'schleim', name: 'glib_erzaehler' + ki, t0: start, p: [akt * 58, y], r: 5.5, schweben, auto: true });
      o.segs.push({ typ: 'zu', t0: start, t1: start + 0.9, von: [akt * 58, y], zu: [akt * 42, y] });
      for (const [t, neu] of wechsel) {
        if (t < start + 1.2 || t > ende - 1.5) continue;
        o.segs.push({ typ: 'zu', t0: t, t1: t + 0.45, von: [akt * 42, y], zu: [akt * 58, y] });
        o.segs.push({ typ: 'zu', t0: t + 0.45, t1: t + 0.9, von: [neu * 58, y], zu: [neu * 42, y] });
        akt = neu;
      }
      o.segs.push({ typ: 'zu', t0: ende - 0.8, t1: ende, von: [akt * 42, y], zu: [akt * 58, y] });
      o.t1 = ende + 0.05;
      if (erster) { // beim ersten Auftritt kurz ein Namensschild
        w2d(F).texte.push({ t0: start + 1, t1: start + 4, text: BF.MASKOTTCHEN_NAME, an: { obj: o.name } });
        erster = false;
      }
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
