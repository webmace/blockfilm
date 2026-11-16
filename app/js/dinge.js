// Blockfilm – gezeichnete Dinge, für die es kein passendes Bildzeichen gibt.
//   hand2d hand1 bei 10 0 [groesse 8] [schrumpelig]   eine offene Hand (Finger nach oben)
//   schrumpel2d hand1 [aus] [in 1.5]                   Finger werden schrumpelig (Rillen an den Fingerkuppen) oder wieder glatt
//   rosine2d r1 bei 0 0 [groesse 5]                    eine Rosine (getrocknete Weintraube, braun und runzelig)
//   handtuch2d t1 bei 0 0 [groesse 8] [farbe blau]     ein gefaltetes Handtuch
// Automatisch: symbol2d mit 🖐️/✋/🤚 wird zur gezeichneten Hand; ein Bildzeichen, das „rosine“ oder „handtuch“ heißt
// oder so beschriftet ist, wird zur Rosine bzw. zum Handtuch (es gibt dafür kein richtiges Emoji).
// Die gezeichnete Hand wird von selbst schrumpelig, wenn der Sprecher von Schrumpeln, Rillen oder Falten spricht,
// und wieder glatt bei „wieder glatt“ (außer das Skript sagt es selbst mit schrumpel2d).
(function () {
  const BF = (window.BF = window.BF || {});
  const Z = (BF.zusatz = BF.zusatz || {});
  const H = () => BF.w2dHelfer;

  function ding(typ, gr0) {
    return function (w, t, h) {
      const { w2d, nameOder, punkt, neuesObjekt, naturFarbe } = H();
      const F = h.F;
      const gr = w.optZahl(['groesse'], gr0);
      const fw = w.optWort(['farbe']);
      const schrumpelig = w.flag(['schrumpelig', 'runzelig', 'faltig']);
      const name = nameOder(w, typ + Object.keys(w2d(F).obj).length);
      const o = neuesObjekt(F, { typ, name, t0: t, p: punkt(w), r: gr, farbe: fw ? naturFarbe(h, fw, null) : null, schrumpel: [] });
      if (schrumpelig) { o.schrumpel.push({ t0: t - 1, t1: t - 0.5, zu: 1 }); o.schrumpelFest = true; }
      return 0;
    };
  }
  Z.hand2d = ding('hand', 8);
  Z.rosine2d = ding('rosine', 5);
  Z.handtuch2d = Z.tuch2d = ding('handtuch', 8);
  Z.schrumpel2d = Z.schrumpeln2d = function (w, t, h) {
    const o = H().w2d(h.F).obj[w.wort()];
    if (!o || o.typ !== 'hand') throw new Error('So: schrumpel2d hand1 [aus] [in 1.5] (für eine Hand aus hand2d oder symbol2d "🖐️")');
    const aus = w.flag(['aus', 'weg', 'glatt']);
    const d = w.dauer(1.5);
    o.schrumpel = o.schrumpel || [];
    o.schrumpel.push({ t0: t, t1: t + d, zu: aus ? 0 : 1 });
    o.schrumpelFest = true;
    return 0;
  };

  const HAND = /^(🖐|✋|🤚)/u;
  const ohneZusatz = s => String(s || '').replace(/[\u{1F3FB}-\u{1F3FF}️‍]/gu, '').trim();
  const norm = s => (BF.norm ? BF.norm(s) : String(s).toLowerCase());
  const SCHRUMPEL = /schrumpel|runzel|rillen|falten|faltig|rosine/i;
  const GLATT = /wieder\s+(ganz\s+)?glatt|glatt\s+wie\s+vorher|keine\s+(rillen|falten)\s+mehr/i;

  BF.nachKompilieren = BF.nachKompilieren || [];
  BF.nachKompilieren.push(function dingeErkennen(F) {
    if (!F.w2d) return;
    const W = F.w2d;
    for (const o of W.liste) {
      if (o.typ !== 'zahl' || !o.ohneRand) continue;
      const worte = [o.name.replace(/\d+$/, ''), ...W.texte.filter(x => x.an && x.an.obj === o.name).map(x => x.text)].map(norm).join(' ');
      if (HAND.test(ohneZusatz(o.text)) && [...ohneZusatz(o.text)].length === 1) o.typ = 'hand';
      else if (/rosine/.test(worte)) o.typ = 'rosine';
      else if (/handtuch|badetuch/.test(worte)) o.typ = 'handtuch';
      else continue;
      o.schrumpel = o.schrumpel || [];
      o.vonSymbol = true;
      o.farbe = null; // Bildzeichen haben immer Weiß als Farbe; die Zeichnung nimmt ihre eigene
    }
    // Hände werden schrumpelig, wenn davon gesprochen wird, und wieder glatt bei „wieder glatt“
    const sp = (F.sprache || []).slice().sort((a, b) => a.t0 - b.t0);
    for (const o of W.liste) {
      if (o.typ !== 'hand' || o.schrumpelFest) continue;
      const ende = o.t1 ?? F.dauer;
      let an = false;
      for (const s of sp) {
        if (s.t1 < o.t0 - 0.1 || s.t0 >= ende) continue;
        const ab = Math.max(o.t0, s.t0);
        if (an && GLATT.test(s.text)) { o.schrumpel.push({ t0: ab + 0.3, t1: ab + 1.8, zu: 0 }); an = false; }
        else if (!an && SCHRUMPEL.test(s.text) && !GLATT.test(s.text)) { o.schrumpel.push({ t0: ab + 0.2, t1: ab + 1.7, zu: 1 }); an = true; }
      }
    }
  });

  // ---------- einfache Zeichnungen für die alte Vorschau (ohne „Neuer Stil“) ----------
  BF.zeichne2d = BF.zeichne2d || {};
  BF.zeichne2d.hand = function (ctx, o, sx, sy, r) {
    ctx.save(); ctx.font = `${Math.round(r * 1.4)}px "Noto Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🖐️', sx, sy); ctx.restore();
  };
  BF.zeichne2d.rosine = function (ctx, o, sx, sy, r) {
    ctx.save(); ctx.fillStyle = '#5a2e2a'; ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.6, r * 0.45, 0.3, 0, 7); ctx.fill();
    ctx.strokeStyle = '#86504a'; ctx.lineWidth = Math.max(1, r * 0.06);
    for (const d of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(sx - r * 0.35, sy + d * r); ctx.quadraticCurveTo(sx, sy + d * r - r * 0.12, sx + r * 0.35, sy + d * r); ctx.stroke(); }
    ctx.restore();
  };
  BF.zeichne2d.handtuch = function (ctx, o, sx, sy, r) {
    ctx.save(); ctx.fillStyle = o.farbe || '#5aa8e8'; ctx.fillRect(sx - r * 0.7, sy - r * 0.4, r * 1.4, r * 0.8);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(sx - r * 0.7, sy + r * 0.15, r * 1.4, r * 0.1); ctx.restore();
  };
})();
