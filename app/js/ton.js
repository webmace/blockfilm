// Blockfilm – Ton: Geräusche, Stimmen und Musik werden synthetisch erzeugt
(function () {
  const BF = (window.BF = window.BF || {});
  const RATE = 44100;

  // fenster = { von, bis }: nur die Geräusche und Sätze, die in diesem Stück anfangen (für schnelle Vorschau bei langen Filmen)
  BF.renderTon = async function (F, fenster) {
    if (fenster && BF.musikAn && (F.musik || []).length) return null; // Musik geht nur am Stück
    const voll = F.dauer + 0.6;
    const von = fenster ? fenster.von : 0, bis = fenster ? Math.min(fenster.bis, voll) : voll;
    let ende = bis;
    if (fenster) {
      for (const s of F.sprache || []) { const b = BF.sprachPuffer[s.key]; if (b && s.t0 >= von && s.t0 < bis) ende = Math.max(ende, s.t0 + b.duration + 0.3); }
      for (const e of F.toene || []) if (e.t >= von && e.t < bis) ende = Math.max(ende, e.t + (e.dauer || 0) + 3.5);
      for (const c of F.clips || []) if (c.t0 >= von && c.t0 < bis) ende = Math.max(ende, c.t1 + 0.3);
      ende = Math.min(ende, voll);
    }
    const dauer = ende - von;
    const ac = new OfflineAudioContext(2, Math.max(1, Math.ceil(RATE * dauer)), RATE);
    const r = BF.rng(777);
    // Rausch-Puffer
    const rausch = ac.createBuffer(1, RATE * 2, RATE);
    const rd = rausch.getChannelData(0);
    for (let i = 0; i < rd.length; i++) rd[i] = r() * 2 - 1;
    // Hall
    const hallBuf = ac.createBuffer(2, RATE * 2.2, RATE);
    for (let c = 0; c < 2; c++) { const d = hallBuf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
    const hall = ac.createConvolver(); hall.buffer = hallBuf;
    const hallGain = ac.createGain(); hallGain.gain.value = 0.22;
    const komp = ac.createDynamicsCompressor();
    komp.threshold.value = -14; komp.ratio.value = 4; komp.attack.value = 0.003; komp.release.value = 0.2;
    const master = ac.createGain(); master.gain.value = 0.8;
    const lautFx = BF.lautGeraeusche ?? 0.45, lautStimme = BF.lautStimme ?? 0.55;
    const fx = ac.createGain(); fx.gain.value = lautFx;
    const musikBus = ac.createGain(); musikBus.gain.value = 0.32;
    fx.connect(komp); musikBus.connect(komp);
    fx.connect(hall); musikBus.connect(hall);
    hall.connect(hallGain); hallGain.connect(komp);
    komp.connect(master); master.connect(ac.destination);

    // --- Bausteine ---
    function huelle(t, a, d, peak, ziel) {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
      g.connect(ziel || fx);
      return g;
    }
    function lärm(t, dauer, filterTyp, f0, f1, peak, a = 0.005, q = 1, ziel) {
      const s = ac.createBufferSource(); s.buffer = rausch; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = filterTyp; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dauer);
      const g = huelle(t, a, dauer, peak, ziel);
      s.connect(f); f.connect(g);
      s.start(t, r() * 1.5); s.stop(t + a + dauer + 0.05);
    }
    function ton(t, dauer, typ, f0, f1, peak, a = 0.005, ziel) {
      const o = ac.createOscillator(); o.type = typ;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dauer);
      const g = huelle(t, a, dauer, peak, ziel);
      o.connect(g);
      o.start(t); o.stop(t + a + dauer + 0.05);
      return o;
    }

    const G = {
      schritt(t, o) { lärm(t, 0.07, 'bandpass', 350 + r() * 300, 250, 0.22 * o.vol, 0.003, 1.2); },
      sprung(t) { lärm(t, 0.08, 'lowpass', 900, 300, 0.25); ton(t, 0.1, 'sine', 160, 110, 0.18); },
      landen(t) { lärm(t, 0.12, 'lowpass', 600, 150, 0.35); },
      schlag(t, o) { lärm(t, 0.09, 'bandpass', 1200, 500, 0.5 * o.vol, 0.002, 1.5); ton(t, 0.14, 'sine', 130, 55, 0.45 * o.vol); },
      schwung(t) { lärm(t, 0.18, 'bandpass', 500, 2400, 0.22, 0.04, 2.5); },
      aua(t, o) { const p = 330 * (o.stimme || 1); const x = ton(t, 0.2, 'triangle', p * 1.2, p * 0.75, 0.28, 0.01); void x; lärm(t, 0.12, 'bandpass', 900, 600, 0.06, 0.005, 3); },
      plopp(t, o) { ton(t, 0.07, 'sine', 900, 280, 0.32 * o.vol); },
      bruch(t) { lärm(t, 0.16, 'bandpass', 1600, 900, 0.3, 0.002, 1.2); for (let i = 0; i < 4; i++) lärm(t + i * 0.025, 0.03, 'highpass', 3000, 3000, 0.12); },
      kratzen(t) { lärm(t, 0.05, 'bandpass', 2200 + r() * 800, 1800, 0.12, 0.002, 2); },
      explosion(t, o) {
        const v = o.vol;
        lärm(t, 2.2, 'lowpass', 1400, 140, 0.95 * v, 0.004, 0.8);
        lärm(t, 0.4, 'highpass', 1500, 600, 0.35 * v, 0.002);
        ton(t, 0.9, 'sine', 70, 32, 0.9 * v, 0.003);
        for (let i = 0; i < 10; i++) lärm(t + 0.15 + r() * 1.2, 0.05, 'bandpass', 2000 + r() * 2000, 1500, 0.06 * v, 0.002, 3);
      },
      zisch(t, o) {
        const d = o.dauer || 3;
        const s = ac.createBufferSource(); s.buffer = rausch; s.loop = true;
        const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500;
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 0.05); g.gain.setValueAtTime(0.13, t + d - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + d);
        s.connect(f); f.connect(g); g.connect(fx); s.start(t); s.stop(t + d + 0.05);
      },
      puff(t) { lärm(t, 0.28, 'bandpass', 700, 1500, 0.3, 0.01, 0.8); },
      jubel(t, o) { const p = 440 * (o.stimme || 1); [0, 0.1, 0.2].forEach((d, i) => ton(t + d, 0.12, 'triangle', p * [1, 1.26, 1.5][i], p * [1, 1.26, 1.5][i] * 1.05, 0.18)); },
      lachen(t, o) { const p = 260 * (o.stimme || 1); for (let i = 0; i < 5; i++) { const x = t + i * 0.13; ton(x, 0.08, 'sawtooth', p * (1.1 - i * 0.04), p * (0.95 - i * 0.04), 0.07); lärm(x, 0.07, 'bandpass', 1100, 900, 0.07, 0.005, 4); } },
      schreck(t, o) { ton(t, 0.18, 'triangle', 520 * (o.stimme || 1), 950 * (o.stimme || 1), 0.22); },
      stimme(t, o) {
        const rr = BF.rng((o.seed || 1) * 97 + 3);
        const p = 200 * (o.stimme || 1) * (0.85 + rr() * 0.4);
        const osc = ac.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(p, t); osc.frequency.linearRampToValueAtTime(p * (0.9 + rr() * 0.25), t + 0.07);
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650 + rr() * 900; f.Q.value = 3;
        const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2600;
        const g = huelle(t, 0.012, 0.075, 0.2 * (o.vol || 0.75));
        osc.connect(f); f.connect(f2); f2.connect(g);
        osc.start(t); osc.stop(t + 0.12);
      },
      donner(t) { lärm(t, 0.25, 'highpass', 1800, 800, 0.5, 0.002); lärm(t + 0.05, 3, 'lowpass', 500, 60, 0.9, 0.05, 0.7); ton(t, 2, 'sine', 50, 30, 0.4, 0.1); },
      rakete(t) { lärm(t, 1.2, 'bandpass', 700, 2200, 0.16, 0.05, 3); ton(t, 1.1, 'sine', 900, 2000, 0.05, 0.1); },
      knall(t) { lärm(t, 0.4, 'lowpass', 2500, 300, 0.6, 0.002); for (let i = 0; i < 18; i++) lärm(t + 0.2 + r() * 1.3, 0.025, 'highpass', 3500, 3500, 0.09 * r(), 0.001); },
      magie(t) { for (let i = 0; i < 8; i++) ton(t + i * 0.06, 0.4, 'sine', 1200 + r() * 1400, 1500 + r() * 1400, 0.06, 0.01); },
      glocke(t) { ton(t, 1.6, 'sine', 880, 880, 0.25); ton(t, 1.2, 'sine', 1760, 1760, 0.1); ton(t, 0.8, 'sine', 2640, 2640, 0.05); },
      tada(t) { [[0, 523], [0.12, 659], [0.24, 784], [0.24, 1046]].forEach(([d, f]) => ton(t + d, d ? 0.7 : 0.15, 'sawtooth', f, f, 0.08, 0.01)); },
      trommel(t) { for (let i = 0; i < 4; i++) { ton(t + i * 0.12, 0.15, 'sine', 110, 55, 0.4); lärm(t + i * 0.12, 0.05, 'lowpass', 800, 300, 0.2); } },
      fail(t) { [0, 0.3, 0.6].forEach((d, i) => ton(t + d, i === 2 ? 0.8 : 0.25, 'triangle', [392, 370, 349][i], [392, 370, 300][i], 0.2, 0.01)); },
      level(t) { [523, 659, 784, 1046].forEach((f, i) => ton(t + i * 0.07, 0.12, 'square', f, f, 0.07)); },
      muenze(t) { ton(t, 0.08, 'square', 988, 988, 0.08); ton(t + 0.08, 0.35, 'square', 1319, 1319, 0.08); },
      mampf(t) { lärm(t, 0.08, 'bandpass', 600 + r() * 400, 400, 0.18, 0.005, 2); },
      rascheln(t, o) {
        // trockenes Laub: viele kurze, knisternde Geräusche
        const v = o.vol ?? 1;
        for (let i = 0; i < 26; i++) {
          const x = t + r() * 1.1;
          lärm(x, 0.03 + r() * 0.06, 'bandpass', 2500 + r() * 3500, 1800 + r() * 2000, (0.08 + r() * 0.12) * v, 0.002, 1.5);
        }
        lärm(t, 1.1, 'highpass', 1800, 2500, 0.05 * v, 0.15, 0.7);
      },
      herzschlag(t, o) { const v = o.vol ?? 1; for (const [d, st] of [[0, 1], [0.22, 0.7]]) { ton(t + d, 0.12, 'sine', 70, 45, 0.6 * st * v, 0.005); lärm(t + d, 0.06, 'lowpass', 200, 120, 0.25 * st * v, 0.004); } },
      wind(t, o) { lärm(t, 1.8, 'bandpass', 300, 900, 0.25 * (o.vol ?? 1), 0.6, 1.2); },
      platsch(t, o) { lärm(t, 0.35, 'lowpass', 1800, 300, 0.45 * (o.vol ?? 1), 0.003); ton(t, 0.18, 'sine', 300, 90, 0.25 * (o.vol ?? 1)); for (let i = 0; i < 6; i++) lärm(t + 0.1 + r() * 0.3, 0.04, 'bandpass', 2500, 1500, 0.06, 0.002, 3); },
      bruellen(t, o) {
        // tiefes Dinosaurier-Brüllen
        const v = o.vol ?? 1;
        lärm(t, 1.4, 'lowpass', 700, 160, 0.75 * v, 0.08, 1.2);
        for (let i = 0; i < 6; i++) ton(t + i * 0.05, 1.1 - i * 0.05, 'sawtooth', 120 - i * 6, 62 - i * 3, 0.08 * v, 0.06);
        lärm(t + 0.05, 0.9, 'bandpass', 380, 220, 0.3 * v, 0.1, 2);
      },
      stampfen(t, o) { const v = o.vol ?? 1; ton(t, 0.35, 'sine', 62, 34, 0.9 * v, 0.004); lärm(t, 0.22, 'lowpass', 320, 120, 0.45 * v, 0.003); },
      grollen(t, o) { const v = o.vol ?? 1; lärm(t, 3.2, 'lowpass', 220, 90, 0.8 * v, 0.5, 0.8); ton(t, 3, 'sine', 45, 38, 0.3 * v, 0.6); },
      quieken(t, o) { const v = o.vol ?? 1; ton(t, 0.12, 'triangle', 900, 1500, 0.16 * v, 0.01); ton(t + 0.14, 0.16, 'triangle', 1300, 800, 0.14 * v, 0.01); },
      aufprall(t, o) { lärm(t, 0.09, 'lowpass', 700, 250, 0.4 * o.vol, 0.002); ton(t, 0.08, 'sine', 100, 60, 0.25 * o.vol); },
    };
    // Ton aus den eigenen Videos
    const clipBus = ac.createGain(); clipBus.gain.value = lautFx * 1.6; clipBus.connect(komp);
    for (const c of F.clips || []) {
      if (c.stand || !c.laut || c.t0 < von || c.t0 >= bis) continue;
      const buf = BF.clipPuffer[BF.clipSchluessel(c)];
      if (!buf) continue;
      const q = ac.createBufferSource(); q.buffer = buf;
      const g = ac.createGain(); g.gain.value = c.laut;
      q.connect(g); g.connect(clipBus);
      q.start(c.t0 - von, 0, Math.max(0.01, c.t1 - c.t0));
    }
    // Sprecher: echte Stimme, Musik und Video-Ton werden dabei leiser
    const sprachBus = ac.createGain(); sprachBus.gain.value = lautStimme; sprachBus.connect(komp);
    for (const s of F.sprache || []) {
      const buf = BF.sprachPuffer[s.key];
      if (!buf || s.t1 < von - 0.5 || s.t0 > ende) continue;
      if (s.t0 >= von && s.t0 < bis) { const q = ac.createBufferSource(); q.buffer = buf; q.connect(sprachBus); q.start(s.t0 - von); }
      for (const [bus, leise, normal] of [[musikBus, 0.1, 0.32], [clipBus, 0.35 * lautFx * 1.6, lautFx * 1.6], [fx, lautFx * 0.6, lautFx]]) {
        bus.gain.setTargetAtTime(leise, Math.max(0, s.t0 - 0.15 - von), 0.06);
        bus.gain.setTargetAtTime(normal, Math.max(0, s.t1 + 0.15 - von), 0.25);
      }
    }
    const liste = F.toene.slice().sort((a, b) => a.t - b.t);
    for (const e of liste) {
      if (e.t >= bis || e.t < von || e.t < 0) continue;
      const fn = G[e.art];
      if (fn) fn(e.t - von + 0.0001, Object.assign({ vol: 1 }, e));
    }

    // --- Musik ---
    const STILE = {
      froehlich: { bpm: 112, akk: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], grund: 60, arp: 'triangle', bass: true, pad: 0.04, arpLaut: 0.07 },
      ruhig: { bpm: 68, akk: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], grund: 60, piano: true, pad: 0.035 },
      spannend: { bpm: 128, akk: [[9, 12, 16], [5, 9, 12], [7, 11, 14], [4, 8, 11]], grund: 57, puls: true, pad: 0.03 },
      episch: { bpm: 88, akk: [[2, 5, 9], [10, 14, 17], [5, 9, 12], [0, 4, 7]], grund: 50, pad: 0.07, pauke: true, arp: 'sawtooth', arpLaut: 0.03 },
      traurig: { bpm: 62, akk: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]], grund: 57, piano: true, pad: 0.045 },
      gruselig: { bpm: 60, akk: [[0, 1, 6], [0, 3, 6], [11, 14, 17], [0, 1, 6]], grund: 45, pad: 0.05, ping: true },
    };
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    const mus = BF.musikAn ? F.musik.slice().sort((a, b) => a.t0 - b.t0) : []; // Musik nur, wenn eingeschaltet
    for (let i = 0; i < mus.length; i++) {
      const m = mus[i];
      if (!m.stil) continue;
      const S = STILE[m.stil];
      const t0 = m.t0, t1 = Math.min(dauer, i + 1 < mus.length ? mus[i + 1].t0 : dauer);
      const beat = 60 / S.bpm, takt = beat * 4;
      const mg = ac.createGain();
      mg.gain.setValueAtTime(0.0001, t0); mg.gain.linearRampToValueAtTime(m.laut, t0 + 0.8);
      mg.gain.setValueAtTime(m.laut, Math.max(t0 + 0.8, t1 - 1)); mg.gain.linearRampToValueAtTime(0.0001, t1);
      mg.connect(musikBus);
      const mr = BF.rng(Math.floor(t0 * 100) + 5);
      for (let tt = t0, k = 0; tt < t1; tt += takt, k++) {
        const ak = S.akk[k % S.akk.length];
        // Fläche
        for (const n of ak) {
          const o = ac.createOscillator(); o.type = S.pad > 0.05 ? 'sawtooth' : 'triangle';
          o.frequency.value = hz(S.grund + n); o.detune.value = (mr() - 0.5) * 12;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
          const g = ac.createGain();
          g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(S.pad, tt + takt * 0.25); g.gain.linearRampToValueAtTime(0.0001, tt + takt * 1.02);
          o.connect(f); f.connect(g); g.connect(mg); o.start(tt); o.stop(tt + takt * 1.05);
        }
        // Bass
        if (S.bass || S.puls) {
          const schritte = S.puls ? 8 : 4;
          for (let b = 0; b < schritte; b++) {
            const bt = tt + b * takt / schritte;
            if (bt >= t1) break;
            ton(bt, takt / schritte * 0.8, S.puls ? 'sawtooth' : 'triangle', hz(S.grund - 12 + ak[0]), hz(S.grund - 12 + ak[0]), S.puls ? 0.05 : 0.09, 0.005, mg);
          }
        }
        // Arpeggio
        if (S.arp) {
          for (let b = 0; b < 8; b++) {
            const bt = tt + b * takt / 8;
            if (bt >= t1) break;
            const n = ak[[0, 1, 2, 1, 0, 2, 1, 2][b] % ak.length] + 12;
            ton(bt, takt / 8 * 0.9, S.arp, hz(S.grund + n), hz(S.grund + n), S.arpLaut || 0.06, 0.004, mg);
          }
        }
        // ruhiges Klavier: wenige Töne, lang ausklingend
        if (S.piano) {
          for (let b = 0; b < 4; b++) {
            if (mr() < 0.35) continue;
            const bt = tt + b * beat + (mr() < 0.3 ? beat / 2 : 0);
            if (bt >= t1) break;
            const n = ak[Math.floor(mr() * ak.length)] + 12 + (mr() < 0.3 ? 12 : 0);
            ton(bt, beat * 3, 'sine', hz(S.grund + n), hz(S.grund + n), 0.11, 0.004, mg);
            ton(bt, beat * 1.5, 'triangle', hz(S.grund + n) * 2, hz(S.grund + n) * 2, 0.02, 0.004, mg);
          }
        }
        if (S.pauke) { ton(tt, 0.6, 'sine', 70, 50, 0.35, 0.003, mg); ton(tt + beat * 2.5, 0.4, 'sine', 70, 50, 0.2, 0.003, mg); }
        if (S.ping) for (let b = 0; b < 2; b++) if (mr() < 0.5) ton(tt + mr() * takt, 1.5, 'sine', 1800 + mr() * 1500, 1700, 0.03, 0.01, mg);
      }
    }
    return ac.startRendering();
  };

  BF.clipSchluessel = c => `${c.datei}|${c.von}|${(c.bis - c.von).toFixed(3)}|${c.tempo}`;

  // als WAV-Datei verpacken
  BF.wav = function (buf) {
    const n = buf.length, ch = buf.numberOfChannels;
    const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const s = (o, str) => { for (let i = 0; i < str.length; i++) out.setUint8(o + i, str.charCodeAt(i)); };
    s(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true);
    out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); s(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const daten = [];
    for (let c = 0; c < ch; c++) daten.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, daten[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
    return new Blob([out.buffer], { type: 'audio/wav' });
  };
})();
