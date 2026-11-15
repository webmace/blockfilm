// Blockfilm – gezeichnete Tiere (Hund, Katze, Vogel, Huhn, Eule, Frosch, Schildkröte, Eidechse, Hase, Maus).
//   tier2d hund bei -20 -11 [groesse 6] [links]     ein Tier auf den Boden stellen (Position = Fußpunkt)
// Andere Arten bei tier2d (z. B. trex, triceratops) bleiben Dinosaurier (wie dino2d).
// Bildzeichen dieser Tiere (symbol2d "🐦" …) werden im neuen Stil automatisch als gezeichnetes Tier gezeigt.
(function () {
  const BF = (window.BF = window.BF || {});
  const Z = (BF.zusatz = BF.zusatz || {});
  const ARTEN = ['hund', 'katze', 'vogel', 'huhn', 'eule', 'frosch', 'schildkroete', 'eidechse', 'hase', 'maus'];
  const ALIAS = { dog: 'hund', welpe: 'hund', cat: 'katze', kater: 'katze', bird: 'vogel', spatz: 'vogel', meise: 'vogel', amsel: 'vogel', henne: 'huhn', hahn: 'huhn', kueken: 'huhn', owl: 'eule', frog: 'frosch', kroete: 'frosch', schildkroete: 'schildkroete', schildi: 'schildkroete', echse: 'eidechse', gecko: 'eidechse', kaninchen: 'hase', rabbit: 'hase', mouse: 'maus', ratte: 'maus' };
  BF.TIER_ARTEN = ARTEN;
  // Emoji → gezeichnetes Tier
  BF.EMOJI_TIER = { '🐕': 'hund', '🐶': 'hund', '🦮': 'hund', '🐩': 'hund', '🐈': 'katze', '🐱': 'katze', '🐦': 'vogel', '🐤': 'vogel', '🐥': 'vogel', '🐣': 'vogel', '🐔': 'huhn', '🐓': 'huhn', '🦉': 'eule', '🐸': 'frosch', '🐢': 'schildkroete', '🦎': 'eidechse', '🐇': 'hase', '🐰': 'hase', '🐁': 'maus', '🐭': 'maus', '🐀': 'maus' };
  BF.emojiTier = function (text) {
    const z = [...String(text || '').replace(/️/g, '').trim()];
    return z.length === 1 || (z.length === 2 && z[1] === '‍') ? BF.EMOJI_TIER[z[0]] || null : null;
  };

  const dino = Z.tier2d;
  Z.tier2d = function (w, t, h) {
    // "tier2d hund …" oder "tier2d name art hund …"
    let art = null;
    const ai = w.finde(['art', 'als']);
    if (ai >= 0 && w.t[ai + 1]) { const a = BF.norm(w.t[ai + 1].s); art = ALIAS[a] || a; }
    else if (w.pk() && (ARTEN.includes(ALIAS[w.pk()] || w.pk()))) art = ALIAS[w.pk()] || w.pk();
    if (!art || !ARTEN.includes(art)) return dino(w, t, h); // Dinosaurier & Co.
    if (ai >= 0) w.t.splice(ai, 2);
    const { w2d, nameOder, punkt, neuesObjekt } = BF.w2dHelfer;
    const F = h.F;
    const gr = w.optZahl(['groesse'], { vogel: 4, maus: 3, frosch: 4, eidechse: 5, huhn: 5, eule: 5, hase: 5, katze: 6, hund: 7, schildkroete: 5 }[art]);
    const links = w.flag(['links']);
    if (w.pk() === art) w.nimm();
    // ohne eigenen Namen heißt das Tier wie seine Art ("tier2d hase" → bewege2d hase …), außer es gibt schon einen sichtbaren Hasen
    const W = w2d(F), frei = !(W.obj[art] && W.obj[art].t1 > t);
    const name = nameOder(w, frei ? art : art + Object.keys(W.obj).length);
    const p = punkt(w);
    neuesObjekt(F, { typ: 'tier', name, t0: t, p, r: gr, art, dir: links ? -1 : 1 });
    return 0;
  };
  Z.hund2d = (w, t, h) => { w.t.unshift({ s: 'hund' }); return Z.tier2d(w, t, h); };
  Z.katze2d = (w, t, h) => { w.t.unshift({ s: 'katze' }); return Z.tier2d(w, t, h); };
  Z.vogel2d = (w, t, h) => { w.t.unshift({ s: 'vogel' }); return Z.tier2d(w, t, h); };

  // alte Vorschau (ohne „Neuer Stil“): das passende Emoji zeichnen
  const EMOJI = { hund: '🐕', katze: '🐈', vogel: '🐦', huhn: '🐔', eule: '🦉', frosch: '🐸', schildkroete: '🐢', eidechse: '🦎', hase: '🐇', maus: '🐁' };
  BF.zeichne2d = BF.zeichne2d || {};
  BF.zeichne2d.tier = function (ctx, o, sx, sy, r) {
    ctx.save();
    ctx.font = `${Math.round(r * 1.2)}px "Noto Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(EMOJI[o.art] || '🐾', sx, sy);
    ctx.restore();
  };
})();
