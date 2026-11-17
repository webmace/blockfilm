// Blockfilm – Spannung für Was-wäre-wenn-Filme
//   spannung an | aus     erzwingt oder verhindert den Spannungsmodus (sonst: automatisch bei Was-wäre-wenn-Themen)
// Im Spannungsmodus: dramatische Kapitelkarten mit Tusch, Trommelwirbel bei Fragen, langsames Heranfahren der Kamera
// in ruhigen Kapiteln, Kamerawackeln bei Explosionen, Knall, Donner und Blitzen.
(function () {
  const BF = (window.BF = window.BF || {});
  const Z = (BF.zusatz = BF.zusatz || {});
  const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  // dieselbe Erkennung wie beim KI-Auftrag (ki.mjs)
  const WAS_WAERE = /(was\s+(passiert|passierte|geschieht|waere|wuerde|wird)\w*\b.{0,40}\bwenn\b|was\s+waere\s*,?\s*(wenn|ohne)|\bstell\s+(dir|euch)\s+vor\b|\bangenommen\b|gedankenexperiment|was\s+(waere|wuerde)\s+.{0,30}\b(ohne|keine?n?)\b|\bwenn\b.{0,60}\bwas\s+(dann|passiert))/;
  const WAS_WENN = /\bwas\s*,?\s*wenn\b/;
  BF.filmIstWasWaere = F => {
    if (F.spannung !== undefined) return F.spannung;
    const karte = F.texte.find(x => x.karte);
    return [F.titel, F.kiInfo && F.kiInfo.thema, karte && karte.text].some(x => { const n = norm(x); return WAS_WAERE.test(n) || WAS_WENN.test(n); });
  };
  Z.spannung = function (w, t, h) { h.F.spannung = !w.flag(['aus', 'weg', 'nein']); w.flag(['an', 'ja']); return 0; };

  BF.nachKompilieren = BF.nachKompilieren || [];
  BF.nachKompilieren.push(function spannungsModus(F) {
    if (!F.w2d || !BF.filmIstWasWaere(F)) return;
    F.spannungAktiv = true;
    // Stärke nach Zielgruppe: kleine Kinder bekommen fröhliche Spannung (nichts Gruseliges), ab 10 das volle Drama
    const alter = F.zielgruppe || (BF.hf && BF.hf.standardAlter) || '6-9';
    const stufe = F.spannungStufe = alter === '0-2' || alter === '3-5' ? 'kind' : alter === '6-9' ? 'mittel' : 'voll';
    const wackelStaerke = { kind: 0.3, mittel: 0.7, voll: 1 }[stufe];
    const W = F.w2d, sp = (F.sprache || []).slice().sort((a, b) => a.t0 - b.t0);
    const karten = F.texte.filter(x => x.karte).sort((a, b) => a.t0 - b.t0);
    // 1. Kapitelkarten: besonders gestaltet, mit Tusch (für kleine Kinder: Tada und Glitzer)
    // nur Kapitel, die etwas Ausgedachtes durchspielen, bekommen die Überschrift „Was wäre, wenn …?“
    const THEORIE = /\b(waere|waeren|wuerde|wuerden|wuerdest|haette|haetten|koennte|koennten|muesste|muessten|gaebe)\b|\bwenn\b|\bstell\s+(dir|euch)\s+vor\b|gedankenexperiment|angenommen|\bvariante\b|\btheorie\b/;
    for (const k of karten) {
      k.spannung = stufe;
      k.theorie = THEORIE.test(norm(k.text)) || WAS_WAERE.test(norm(k.text));
      if (stufe === 'kind') { F.toene.push({ t: k.t0 + 0.3, art: 'tada', vol: 0.8 }); F.toene.push({ t: k.t0 + 0.05, art: 'magie', vol: 0.7 }); }
      else { F.toene.push({ t: k.t0 + 0.3, art: 'tusch', vol: stufe === 'voll' ? 0.9 : 0.6 }); F.toene.push({ t: Math.max(0, k.t0 - 0.2), art: 'spannung', vol: stufe === 'voll' ? 0.8 : 0.45, dauer: Math.min(2.5, k.t1 - k.t0 + 0.2) }); }
    }
    // 2. Fragen ("Was passiert dann?"): Trommelwirbel zum Satzende hin, höchstens alle 12 s
    let letzte = -99;
    for (let i = 0; i < sp.length - 1; i++) {
      const s = sp[i];
      if (!/\?\s*$/.test(s.text) || s.text.length < 12 || s.t0 - letzte < 12) continue;
      const d = Math.min(1.6, s.t1 - s.t0 + 0.3);
      F.toene.push({ t: s.t1 + 0.3 - d, art: 'trommelwirbel', vol: stufe === 'kind' ? 0.45 : 0.8, dauer: d });
      letzte = s.t0;
    }
    // 3. Kamera fährt in ruhigen Kapiteln langsam heran (nur wo das Skript die Kamera nicht selbst bewegt)
    const grenzen = [0, ...karten.map(k => k.t1), F.dauer];
    for (let i = 0; i < grenzen.length - 1; i++) {
      const a = grenzen[i] + 0.5, b = (karten[i] ? karten[i].t0 : F.dauer) - 0.2;
      const ende = Math.min(b, grenzen[i + 1] - 0.2);
      if (ende - a < 6 || W.kam.some(k => k.t1 > a - 1 && k.t0 < ende + 1)) continue;
      W.kam.push({ t0: a, t1: ende - 0.7, p: [0, 1.5], zoom: 1.07 });
      W.kam.push({ t0: ende - 0.7, t1: ende, p: [0, 0], zoom: 1 });
    }
    W.kam.sort((a, b) => a.t0 - b.t0);
    // 4. Wackeln bei großen Ereignissen
    W.wackeln = W.wackeln || [];
    for (const e of F.toene) {
      const st = { explosion: 1.6, knall: 1.0, donner: 1.1, stampfen: 0.5, grollen: 0.6, tusch: 0.35 }[e.art];
      if (st) W.wackeln.push({ t0: e.t, t1: e.t + (e.art === 'grollen' ? 2.5 : 0.7), staerke: st * (e.vol ?? 1) * wackelStaerke });
    }
    for (const b of F.blitze || []) W.wackeln.push({ t0: b.t0, t1: b.t0 + 0.6, staerke: 1.2 * (b.staerke ?? 1) * wackelStaerke });
  });
})();
