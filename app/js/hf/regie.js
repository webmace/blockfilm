// Blockfilm – Regie-Prüfung: findet in einem fertig übersetzten Film automatisch Schwachstellen,
// und wählt die Momente aus, von denen Standbilder für die KI gemacht werden.
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const AM_BODEN = ['kind', 'schleim', 'baum', 'pflanze', 'kaktus', 'pinguin', 'wand', 'mast', 'vulkan', 'koerper'];
  const SCHWIMMER = ['plesiosaurus', 'ichthyosaurus', 'mosasaurus', 'flugsaurier', 'trilobit', 'fisch', 'qualle'];
  const steht = o => AM_BODEN.includes(o.typ) || (o.typ === 'dino' && !SCHWIMMER.includes(o.art));
  const zeit = t => t.toFixed(1).replace('.', ',') + ' s';
  const kurz = s => (s.length > 60 ? s.slice(0, 57) + '…' : s);

  // ungefährer Kreis um ein Objekt (Mitte und Radius in Einheiten der 2D-Welt)
  function kreis(F, o, t) {
    const p = BF.w2dIntern.pos(F, o, t);
    if (o.typ === 'atome') return { x: p[0], y: p[1], r: Math.max(o.sp, o.ze) * o.r * 1.15 };
    if (o.typ === 'luft') return { x: p[0], y: p[1], r: Math.max(o.breite, o.hoehe) / 2 };
    if (o.typ === 'zeitleiste') return { x: p[0], y: p[1], r: o.r / 2 };
    if (o.typ === 'wand') return { x: p[0], y: p[1] + o.r / 2, r: o.r / 2 };
    if (o.typ === 'zahl') return { x: p[0], y: p[1], r: o.r * 0.7 * Math.max(1, String(o.text).length * (o.ohneRand ? 1 : 0.55)) };
    if (o.typ === 'dino' && steht(o)) return { x: p[0], y: p[1] + o.r * 0.5, r: o.r * (o.baby ? 0.4 : 0.75) };
    if (steht(o)) return { x: p[0], y: p[1] + o.r / 2, r: o.r / 2 };
    return { x: p[0], y: p[1], r: o.r };
  }
  const sichtbar = (F, t) => F.w2d.liste.filter(o => t >= o.t0 && t < (o.t1 ?? Infinity) - 0.35);

  HF.regieBefunde = function (F, skript) {
    const zeilenText = skript ? String(skript).split('\n') : null;
    const B = [];
    if (!F.w2d) return B;
    const sp = F.sprache || [];
    const kamera = t => BF.w2dIntern.kamera(F, t);
    // 1. Sätze, zu denen nichts zu sehen ist
    for (const s of sp) {
      const t = (s.t0 + s.t1) / 2;
      const objekte = sichtbar(F, t).length;
      const einblendung = (F.ueber || []).some(u => t >= u.t0 && t < u.t1) || F.texte.some(x => !x.sprecher && t >= x.t0 && t < x.t1);
      if (!objekte && !einblendung) B.push(`Leeres Bild bei ${zeit(t)}: zum Satz „${kurz(s.text)}“ ist nichts zu sehen.`);
    }
    // 2. Objekte außerhalb des Bildes oder im Untertitel-Bereich (nur ohne Kamerafahrt geprüft)
    const gemeldet = new Set();
    for (const o of F.w2d.liste) {
      const ende = Math.min(o.t1 ?? F.dauer, F.dauer);
      for (const t of [o.t0 + 0.5, (o.t0 + ende) / 2]) {
        if (t >= ende || gemeldet.has(o)) continue;
        const K = kamera(t);
        if (Math.abs(K.z - 1) > 0.05 || Math.abs(K.x) > 1 || Math.abs(K.y) > 1) continue;
        const k = kreis(F, o, t);
        if (k.x - k.r * 0.5 > 50 || k.x + k.r * 0.5 < -50 || k.y - k.r * 0.5 > 28 || k.y + k.r * 0.5 < -28) { B.push(`„${o.name}“ (${o.typ}) liegt bei ${zeit(t)} außerhalb des Bildes (x ${k.x.toFixed(0)}, y ${k.y.toFixed(0)}).`); gemeldet.add(o); }
        else if (Math.abs(k.x) + k.r > 54) { B.push(`„${o.name}“ (${o.typ}) wird bei ${zeit(t)} am Bildrand abgeschnitten (x ${k.x.toFixed(0)}).`); gemeldet.add(o); }
        else if (!steht(o) && k.y - k.r * 0.3 < -20) { B.push(`„${o.name}“ (${o.typ}) liegt bei ${zeit(t)} im Untertitel-Bereich (y ${k.y.toFixed(0)}); der Untertitel verdeckt es.`); gemeldet.add(o); }
      }
    }
    // 3. Objekte, die sich stark überdecken, und zu volle Bilder (zur Mitte jedes Satzes)
    const paare = new Set();
    let voll = 0;
    for (const s of sp) {
      const t = (s.t0 + s.t1) / 2;
      const l = sichtbar(F, t).filter(o => !['huelle', 'luft', 'loch'].includes(o.typ) && !o.auto);
      if (l.length > 10 && voll < 3) { B.push(`Sehr volles Bild bei ${zeit(t)}: ${l.length} Objekte gleichzeitig. Ältere mit verstecke2d ausblenden.`); voll++; }
      const k = l.map(o => [o, kreis(F, o, t)]);
      for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
        const [a, ka] = k[i], [b, kb] = k[j];
        const d = Math.hypot(ka.x - kb.x, ka.y - kb.y), klein = Math.min(ka.r, kb.r);
        if (d < Math.max(ka.r, kb.r) * 0.5 + klein * 0.4) {
          const n = [a.name, b.name].sort().join('|');
          if (paare.has(n)) continue;
          paare.add(n);
          B.push(`„${a.name}“ und „${b.name}“ überdecken sich bei ${zeit(t)} (Abstand ${d.toFixed(0)}).`);
        }
      }
    }
    // 4. lange Stille zwischen zwei Sätzen
    for (let i = 1; i < sp.length; i++) {
      const g = sp[i].t0 - sp[i - 1].t1;
      const karte = F.texte.some(x => x.karte && x.t0 < sp[i].t0 && x.t1 > sp[i - 1].t1);
      if (g > 2.5 && !karte) {
        // welche Zeilen in der Lücke liegen (die halten den Film an)
        const drin = zeilenText ? (F.zeilen || []).filter(z => z.t >= sp[i - 1].t0 + 0.01 && z.t < sp[i].t0 - 0.01).map(z => (zeilenText[z.zeile - 1] || '').trim()).filter(z => z && !z.startsWith('#')) : [];
        B.push(`Lange Pause (${g.toFixed(1).replace('.', ',')} s) vor „${kurz(sp[i].text)}“ bei ${zeit(sp[i].t0)}.${drin.length ? ` Diese Zeilen halten den Film dort an: ${drin.slice(-4).map(z => '„' + kurz(z) + '“').join(', ')}.` : ''}`);
      }
    }
    // 5. Bildzeichen, für die es keine flache Grafik gibt (erscheinen dann als Text)
    for (const o of F.w2d.liste) if (o.typ === 'zahl' && o.ohneRand && HF.emojiDateien && !HF.emojiDateien(o.text)) B.push(`symbol2d „${o.name}“ mit „${o.text}“: dafür gibt es keine Grafik. Ein einzelnes übliches Emoji wählen.`);
    // 6. zu viele Bildzeichen (Emoji-Sticker): höchstens etwa eins pro Minute
    const sticker = F.w2d.liste.filter(o => o.typ === 'zahl' && o.ohneRand && !(BF.emojiTier && BF.emojiTier(o.text)));
    const erlaubt = Math.max(3, Math.round((F.dauer || 0) / 60));
    if (sticker.length > erlaubt) B.push(`Zu viele Bildzeichen (symbol2d): ${sticker.length}, erlaubt sind etwa ${erlaubt}. Ersetze die meisten durch gezeichnete, bewegte Objekte (z. B. ${sticker.slice(0, 6).map(o => `„${o.name}“ ${o.text}`).join(', ')}) oder lass sie weg.`);
    // 7. Stellen, an denen sich nichts bewegt (Standbild trotz Sprecher)
    const bewegt = (a, b) => {
      if (F.w2d.liste.some(o => (o.t0 > a - 0.3 && o.t0 < b) || (o.t1 > a && o.t1 < b))) return true;
      const k1 = kamera(a), k2 = kamera(b);
      if (Math.abs(k1.x - k2.x) + Math.abs(k1.y - k2.y) > 0.5 || Math.abs(k1.z - k2.z) > 0.03) return true;
      for (const o of sichtbar(F, a)) {
        if (o.typ === 'schleim' || o.auto) continue;
        for (const t of [(a + b) / 2, b]) { const p = BF.w2dIntern.pos(F, o, a), q = BF.w2dIntern.pos(F, o, t); if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.8) return true; }
      }
      return (F.ueber || []).some(u => u.t0 > a - 0.3 && u.t0 < b) || F.texte.some(x => !x.sprecher && x.t0 > a - 0.3 && x.t0 < b);
    };
    let still = null, stillGemeldet = 0;
    for (let i = 0; i <= sp.length; i++) {
      const s = sp[i];
      if (s && !bewegt(s.t0, s.t1)) { if (!still) still = { t0: s.t0, satz: s.text }; still.t1 = s.t1; continue; }
      if (still && still.t1 - still.t0 > 7 && stillGemeldet < 6) { B.push(`Standbild von ${zeit(still.t0)} bis ${zeit(still.t1)} (ab „${kurz(still.satz)}“): da bewegt sich nichts. Lass etwas passieren (bewege2d, kippe2d, wachsen2d, kamera2d heranzoomen oder schwenken, etwas erscheint oder verschwindet).`); stillGemeldet++; }
      still = null;
    }
    return B.slice(0, 30);
  };

  // Momente für Standbilder: gleichmäßig über die Sätze verteilt, dazu jeder Moment mit einem Befund
  HF.regieMomente = function (F, anzahl = 10) {
    const sp = F.sprache || [];
    const m = [];
    if (!sp.length) return [{ t: Math.min(2, F.dauer / 2), satz: '' }];
    for (let i = 0; i < anzahl; i++) {
      const s = sp[Math.min(sp.length - 1, Math.round((i + 0.5) * sp.length / anzahl - 0.5))];
      // je Satz zwei Bilder: kurz nach dem Anfang und kurz vor dem Ende – so sieht die Regie, ob das Bild rechtzeitig zum Ton kommt
      if (m.some(x => x.satz === s.text && Math.abs(x.t - s.t0) < s.t1 - s.t0 + 0.5)) continue;
      const r = x => Math.round(x * 10) / 10, lang = s.t1 - s.t0 > 1.6;
      const a = r(lang ? s.t0 + 0.5 : (s.t0 + s.t1) / 2), e = r(s.t1 - 0.3);
      m.push({ t: a, satz: s.text, teil: lang ? 'Anfang' : 'Mitte' });
      if (lang) m.push({ t: e, satz: s.text, teil: 'Ende' });
    }
    return m;
  };
})();
