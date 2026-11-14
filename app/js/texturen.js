// Blockfilm – selbst gezeichnete 16×16-Pixeltexturen für alle Blöcke
(function () {
  const BF = (window.BF = window.BF || {});

  // kleiner Zufallsgenerator mit Startwert (immer gleiches Ergebnis)
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return (s % 100000) / 100000;
    };
  }
  BF.rng = rng;
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  BF.hash = hash;

  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  BF.hex = hex;
  function rgba(rgb, f = 1, a = 1) {
    const r = Math.max(0, Math.min(255, Math.round(rgb[0] * f)));
    const g = Math.max(0, Math.min(255, Math.round(rgb[1] * f)));
    const b = Math.max(0, Math.min(255, Math.round(rgb[2] * f)));
    return `rgba(${r},${g},${b},${a})`;
  }
  BF.rgba = rgba;

  function leinwand(n = 16) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    return c;
  }

  // Grundmuster: Farbe mit Rauschen
  function rausch(ctx, farbe, staerke, r, a = 1) {
    const rgb = hex(farbe);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      ctx.fillStyle = rgba(rgb, 1 + (r() - 0.5) * staerke, a);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  function px(ctx, x, y, farbe, f = 1, a = 1) {
    ctx.fillStyle = rgba(hex(farbe), f, a);
    ctx.fillRect(x, y, 1, 1);
  }
  function flecken(ctx, farbe, anzahl, r, groesse = 2) {
    for (let i = 0; i < anzahl; i++) {
      const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
      for (let j = 0; j < groesse + Math.floor(r() * 2); j++) {
        px(ctx, (x + Math.floor(r() * 3) - 1 + 16) % 16, (y + Math.floor(r() * 3) - 1 + 16) % 16, farbe, 0.9 + r() * 0.2);
      }
    }
  }
  function zellen(ctx, grund, rand, anzahl, r) {
    const pkt = [];
    for (let i = 0; i < anzahl; i++) pkt.push([r() * 16, r() * 16, 0.8 + r() * 0.35]);
    const id = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let best = 0, bd = 1e9;
      pkt.forEach((p, i) => {
        for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) {
          const d = (p[0] + ox - x) ** 2 + (p[1] + oy - y) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
      });
      id[y * 16 + x] = best;
    }
    const g = hex(grund);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const i = id[y * 16 + x];
      const kante = id[y * 16 + ((x + 1) % 16)] !== i || id[((y + 1) % 16) * 16 + x] !== i;
      if (kante) px(ctx, x, y, rand, 0.9 + r() * 0.2);
      else { ctx.fillStyle = rgba(g, pkt[i][2] + (r() - 0.5) * 0.12); ctx.fillRect(x, y, 1, 1); }
    }
  }
  function metall(ctx, farbe, r) {
    rausch(ctx, farbe, 0.08, r);
    for (let i = 0; i < 16; i++) {
      px(ctx, i, 0, farbe, 1.3); px(ctx, 0, i, farbe, 1.25);
      px(ctx, i, 15, farbe, 0.65); px(ctx, 15, i, farbe, 0.7);
    }
    for (let i = 3; i < 13; i++) { px(ctx, i, 3, farbe, 1.15); px(ctx, 3, i, farbe, 1.12); px(ctx, i, 12, farbe, 0.85); px(ctx, 12, i, farbe, 0.85); }
  }
  function erz(farbe) {
    return (ctx, r) => {
      TEX.stein(ctx, r);
      for (let i = 0; i < 5; i++) {
        const x = 1 + Math.floor(r() * 12), y = 1 + Math.floor(r() * 12);
        px(ctx, x, y, farbe, 1); px(ctx, x + 1, y, farbe, 0.85); px(ctx, x, y + 1, farbe, 1.15);
        if (r() > 0.5) px(ctx, x + 1, y + 1, farbe, 0.7);
      }
    };
  }

  const TEX = {
    erde(ctx, r) { rausch(ctx, '#866043', 0.3, r); flecken(ctx, '#6b4a30', 10, r); flecken(ctx, '#9b7653', 6, r, 1); },
    gras_oben(ctx, r) { rausch(ctx, '#6aa83a', 0.32, r); flecken(ctx, '#57922d', 14, r); flecken(ctx, '#7dbb47', 8, r, 1); },
    gras_seite(ctx, r) {
      TEX.erde(ctx, r);
      for (let x = 0; x < 16; x++) {
        const tief = 3 + Math.floor(r() * 3);
        for (let y = 0; y < tief; y++) px(ctx, x, y, '#6aa83a', 0.8 + r() * 0.35);
      }
    },
    schnee_seite(ctx, r) {
      TEX.erde(ctx, r);
      for (let x = 0; x < 16; x++) {
        const tief = 3 + Math.floor(r() * 3);
        for (let y = 0; y < tief; y++) px(ctx, x, y, '#f2f6f8', 0.93 + r() * 0.08);
      }
    },
    stein(ctx, r) { rausch(ctx, '#7d7d7d', 0.22, r); flecken(ctx, '#6a6a6a', 9, r); flecken(ctx, '#8f8f8f', 6, r, 1); },
    bruchstein(ctx, r) { zellen(ctx, '#7a7a7a', '#4d4d4d', 9, r); },
    bemooster(ctx, r) { zellen(ctx, '#7a7a7a', '#4d4d4d', 9, r); flecken(ctx, '#4f7a2a', 10, r, 3); },
    steinziegel(ctx, r) {
      rausch(ctx, '#7b7b7b', 0.15, r);
      for (let x = 0; x < 16; x++) { px(ctx, x, 7, '#555'); px(ctx, x, 15, '#555'); }
      for (let y = 0; y < 7; y++) { px(ctx, 0, y, '#555'); px(ctx, 15, y, '#606060'); }
      for (let y = 8; y < 15; y++) px(ctx, 7, y, '#555');
    },
    holz_seite(ctx, r) {
      for (let x = 0; x < 16; x++) {
        const f = 0.8 + r() * 0.35;
        for (let y = 0; y < 16; y++) px(ctx, x, y, '#6b5130', f * (0.92 + r() * 0.12));
      }
      for (let i = 0; i < 5; i++) { const x = Math.floor(r() * 16); for (let y = Math.floor(r() * 8); y < 16; y++) px(ctx, x, y, '#4c3920'); }
    },
    holz_oben(ctx, r) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        if (d > 6.6) px(ctx, x, y, '#5a4326', 0.9 + r() * 0.2);
        else px(ctx, x, y, Math.floor(d) % 2 ? '#b08f5a' : '#9c7b47', 0.95 + r() * 0.1);
      }
    },
    bretter(ctx, r) {
      rausch(ctx, '#a0824d', 0.12, r);
      for (let y = 3; y < 16; y += 4) for (let x = 0; x < 16; x++) px(ctx, x, y, '#6f5530');
      for (let row = 0; row < 4; row++) { const x = (row * 7 + 3) % 16; for (let y = row * 4; y < row * 4 + 3; y++) px(ctx, x, y, '#7a5f35'); }
    },
    dunkle_bretter(ctx, r) {
      rausch(ctx, '#4a3320', 0.15, r);
      for (let y = 3; y < 16; y += 4) for (let x = 0; x < 16; x++) px(ctx, x, y, '#2f2014');
      for (let row = 0; row < 4; row++) { const x = (row * 5 + 2) % 16; for (let y = row * 4; y < row * 4 + 3; y++) px(ctx, x, y, '#3a2818'); }
    },
    blaetter(ctx, r) {
      ctx.clearRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (r() < 0.16) continue;
        px(ctx, x, y, '#3f8f2a', 0.65 + r() * 0.55);
      }
    },
    sand(ctx, r) { rausch(ctx, '#dbcf9b', 0.13, r); flecken(ctx, '#c9bb84', 8, r, 1); },
    kies(ctx, r) { rausch(ctx, '#857e7b', 0.35, r); flecken(ctx, '#a19a95', 10, r); flecken(ctx, '#5f5956', 8, r); },
    schnee(ctx, r) { rausch(ctx, '#f3f8fb', 0.06, r); },
    eis(ctx, r) {
      rausch(ctx, '#9cc4f5', 0.1, r, 0.8);
      for (let i = 0; i < 6; i++) px(ctx, 3 + i, 9 - i, '#e3f0ff', 1, 0.9);
      for (let i = 0; i < 4; i++) px(ctx, 9 + i, 13 - i, '#e3f0ff', 1, 0.9);
    },
    wasser(ctx, r) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const w = Math.sin((x + y * 0.5) * 0.8) * 0.06;
        px(ctx, x, y, '#2f5ed1', 1 + w + (r() - 0.5) * 0.08, 0.72);
      }
    },
    glas(ctx, r) {
      ctx.clearRect(0, 0, 16, 16);
      for (let i = 0; i < 16; i++) { px(ctx, i, 0, '#d8eef3', 1, 0.9); px(ctx, i, 15, '#d8eef3', 1, 0.9); px(ctx, 0, i, '#d8eef3', 1, 0.9); px(ctx, 15, i, '#d8eef3', 1, 0.9); }
      for (let i = 0; i < 4; i++) { px(ctx, 3 + i, 6 - i, '#ffffff', 1, 0.7); px(ctx, 4 + i, 6 - i, '#ffffff', 1, 0.55); }
      px(ctx, 11, 12, '#ffffff', 1, 0.6); px(ctx, 12, 11, '#ffffff', 1, 0.6);
    },
    ziegel(ctx, r) {
      rausch(ctx, '#96503c', 0.2, r);
      for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) px(ctx, x, y + 3, '#b5a598', 0.95 + r() * 0.1);
      for (let row = 0; row < 4; row++) { const off = row % 2 ? 4 : 0; for (const x of [off, off + 8]) for (let y = row * 4; y < row * 4 + 3; y++) px(ctx, x % 16, y, '#b5a598'); }
    },
    obsidian(ctx, r) { rausch(ctx, '#1b1426', 0.35, r); flecken(ctx, '#3b2a5a', 6, r); flecken(ctx, '#0d0a14', 6, r); },
    lava(ctx, r) {
      rausch(ctx, '#d8581a', 0.15, r);
      flecken(ctx, '#f7a531', 14, r, 3); flecken(ctx, '#ffd35a', 6, r, 1);
    },
    leuchtstein(ctx, r) { zellen(ctx, '#d9a845', '#8f6a2a', 10, r); flecken(ctx, '#fff0a0', 8, r, 1); },
    gold(ctx, r) { metall(ctx, '#f5d33a', r); },
    eisen(ctx, r) { metall(ctx, '#d8d8d8', r); },
    diamant(ctx, r) { metall(ctx, '#5fe3dc', r); },
    smaragd(ctx, r) { metall(ctx, '#3fcf6b', r); },
    redstone(ctx, r) { metall(ctx, '#b81a0e', r); },
    kohle(ctx, r) { metall(ctx, '#232323', r); },
    kohle_erz: erz('#1a1a1a'),
    eisen_erz: erz('#d8af93'),
    gold_erz: erz('#fcee4b'),
    diamant_erz: erz('#5decf5'),
    redstone_erz: erz('#ff1d0d'),
    grundgestein(ctx, r) { rausch(ctx, '#565656', 0.6, r); flecken(ctx, '#222', 10, r, 3); },
    netherrack(ctx, r) { rausch(ctx, '#6f3534', 0.3, r); flecken(ctx, '#4f2120', 10, r); flecken(ctx, '#8a4847', 6, r, 1); },
    quarz(ctx, r) { rausch(ctx, '#ece6df', 0.05, r); },
    tnt_seite(ctx, r) {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) px(ctx, x, y, x % 4 === 0 ? '#9a2a15' : '#d33b20', 0.92 + r() * 0.12);
      for (let x = 0; x < 16; x++) for (let y = 5; y < 11; y++) px(ctx, x, y, '#efefef', 0.95 + r() * 0.05);
      const T = ['###.#..#.###', '.#..##.#..#.', '.#..#.##..#.', '.#..#..#..#.'];
      T.forEach((zeile, y) => zeile.split('').forEach((c, x) => { if (c === '#') px(ctx, x + 2, y + 6, '#1a1a1a'); }));
    },
    tnt_oben(ctx, r) {
      rausch(ctx, '#d33b20', 0.12, r);
      for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) px(ctx, x, y, '#6c6c6c', 0.9 + r() * 0.2);
      px(ctx, 7, 7, '#2a2a2a'); px(ctx, 8, 8, '#2a2a2a');
    },
    tnt_unten(ctx, r) { rausch(ctx, '#d33b20', 0.12, r); },
    buecher(ctx, r) {
      TEX.bretter(ctx, r);
      const farben = ['#7a2b20', '#2b4a7a', '#3f6b2b', '#7a6a2b', '#5a2b7a'];
      for (const y0 of [1, 9]) {
        let x = 1;
        while (x < 15) {
          const w = 1 + Math.floor(r() * 2), f = farben[Math.floor(r() * farben.length)];
          for (let xx = x; xx < Math.min(15, x + w); xx++) for (let y = y0; y < y0 + 6; y++) px(ctx, xx, y, f, 0.85 + r() * 0.3);
          x += w;
        }
      }
    },
    werkbank_oben(ctx, r) { TEX.bretter(ctx, r); for (let i = 0; i < 16; i++) { px(ctx, i, 0, '#4a3320'); px(ctx, 0, i, '#4a3320'); px(ctx, i, 15, '#4a3320'); px(ctx, 15, i, '#4a3320'); } for (let i = 2; i < 14; i++) { px(ctx, i, 7, '#6f5530'); px(ctx, 7, i, '#6f5530'); } },
    werkbank_seite(ctx, r) { TEX.bretter(ctx, r); for (let x = 0; x < 16; x++) for (let y = 0; y < 3; y++) px(ctx, x, y, '#6b5130', 0.9 + r() * 0.2); for (let y = 5; y < 12; y++) { px(ctx, 4, y, '#777'); px(ctx, 11, y, '#5a4326'); } },
    kuerbis_seite(ctx, r) { rausch(ctx, '#e38a1d', 0.12, r); for (const x of [2, 6, 10, 14]) for (let y = 0; y < 16; y++) px(ctx, x, y, '#b86a12'); },
    kuerbis_oben(ctx, r) { rausch(ctx, '#e38a1d', 0.12, r); for (let y = 6; y < 10; y++) for (let x = 7; x < 9; x++) px(ctx, x, y, '#6b5130'); },
    kuerbis_gesicht(ctx, r) {
      TEX.kuerbis_seite(ctx, r);
      for (const [x, y] of [[4, 5], [5, 5], [10, 5], [11, 5], [4, 6], [11, 6]]) px(ctx, x, y, '#3a1c05');
      for (let x = 4; x < 12; x++) px(ctx, x, 10, '#3a1c05');
      for (const x of [5, 7, 9]) px(ctx, x, 11, '#3a1c05');
    },
    ofen_vorne(ctx, r) {
      zellen(ctx, '#7a7a7a', '#4d4d4d', 9, r);
      for (let y = 8; y < 14; y++) for (let x = 4; x < 12; x++) px(ctx, x, y, '#1f1f1f');
      for (let x = 4; x < 12; x++) px(ctx, x, 7, '#3c3c3c');
    },
  };

  const WOLLE = {
    weiss: '#e9ecec', rot: '#a12722', blau: '#35399d', gruen: '#546d1b', gelb: '#f8c627', schwarz: '#141519',
    orange: '#f07613', lila: '#792aac', rosa: '#ed8dac', grau: '#3e4447', hellgrau: '#8e8e86', braun: '#724728',
    hellblau: '#3aafd9', tuerkis: '#158991', limette: '#70b919', magenta: '#bd44b3',
  };
  for (const [n, f] of Object.entries(WOLLE)) {
    TEX['wolle_' + n] = (ctx, r) => {
      rausch(ctx, f, 0.12, r);
      for (let i = 0; i < 16; i += 2) px(ctx, (i * 3) % 16, i, f, 0.85);
    };
    TEX['beton_' + n] = (ctx, r) => rausch(ctx, f, 0.04, r);
  }

  // Blocktypen: welche Textur auf welcher Seite
  // Flächen-Reihenfolge wie bei three.js BoxGeometry: +x, -x, +y(oben), -y(unten), +z(vorne), -z
  const T = {};
  function def(name, o) { T[name] = Object.assign({ fest: true, durchsichtig: false, leuchtet: false }, o); }
  def('gras', { oben: 'gras_oben', seite: 'gras_seite', unten: 'erde', farbe: '#6aa83a' });
  def('schneegras', { oben: 'schnee', seite: 'schnee_seite', unten: 'erde', farbe: '#f3f8fb' });
  def('erde', { alle: 'erde', farbe: '#866043' });
  def('stein', { alle: 'stein', farbe: '#7d7d7d' });
  def('bruchstein', { alle: 'bruchstein', farbe: '#7a7a7a' });
  def('moosstein', { alle: 'bemooster', farbe: '#6a7a5a' });
  def('steinziegel', { alle: 'steinziegel', farbe: '#7b7b7b' });
  def('holz', { oben: 'holz_oben', unten: 'holz_oben', seite: 'holz_seite', farbe: '#6b5130' });
  def('bretter', { alle: 'bretter', farbe: '#a0824d' });
  def('dunkle_bretter', { alle: 'dunkle_bretter', farbe: '#4a3320' });
  def('blaetter', { alle: 'blaetter', farbe: '#3f8f2a', alpha: true });
  def('sand', { alle: 'sand', farbe: '#dbcf9b', schwer: true });
  def('kies', { alle: 'kies', farbe: '#857e7b', schwer: true });
  def('schnee', { alle: 'schnee', farbe: '#f3f8fb' });
  def('eis', { alle: 'eis', farbe: '#9cc4f5', durchsichtig: true });
  def('wasser', { alle: 'wasser', farbe: '#2f5ed1', durchsichtig: true, fest: false });
  def('glas', { alle: 'glas', farbe: '#d8eef3', durchsichtig: true, alpha: true });
  def('ziegel', { alle: 'ziegel', farbe: '#96503c' });
  def('obsidian', { alle: 'obsidian', farbe: '#1b1426' });
  def('lava', { alle: 'lava', farbe: '#f07a20', leuchtet: true, fest: false });
  def('leuchtstein', { alle: 'leuchtstein', farbe: '#e9c060', leuchtet: true });
  def('gold', { alle: 'gold', farbe: '#f5d33a' });
  def('eisen', { alle: 'eisen', farbe: '#d8d8d8' });
  def('diamant', { alle: 'diamant', farbe: '#5fe3dc' });
  def('smaragd', { alle: 'smaragd', farbe: '#3fcf6b' });
  def('redstone', { alle: 'redstone', farbe: '#b81a0e' });
  def('kohle', { alle: 'kohle', farbe: '#232323' });
  def('kohle_erz', { alle: 'kohle_erz', farbe: '#7d7d7d' });
  def('eisen_erz', { alle: 'eisen_erz', farbe: '#7d7d7d' });
  def('gold_erz', { alle: 'gold_erz', farbe: '#7d7d7d' });
  def('diamant_erz', { alle: 'diamant_erz', farbe: '#7d7d7d' });
  def('redstone_erz', { alle: 'redstone_erz', farbe: '#7d7d7d' });
  def('grundgestein', { alle: 'grundgestein', farbe: '#565656' });
  def('netherrack', { alle: 'netherrack', farbe: '#6f3534' });
  def('quarz', { alle: 'quarz', farbe: '#ece6df' });
  def('tnt', { oben: 'tnt_oben', unten: 'tnt_unten', seite: 'tnt_seite', farbe: '#d33b20' });
  def('buecherregal', { oben: 'bretter', unten: 'bretter', seite: 'buecher', farbe: '#a0824d' });
  def('werkbank', { oben: 'werkbank_oben', unten: 'bretter', seite: 'werkbank_seite', farbe: '#a0824d' });
  def('kuerbis', { oben: 'kuerbis_oben', unten: 'kuerbis_oben', seite: 'kuerbis_seite', vorne: 'kuerbis_gesicht', farbe: '#e38a1d' });
  def('ofen', { oben: 'stein', unten: 'stein', seite: 'bruchstein', vorne: 'ofen_vorne', farbe: '#7a7a7a' });
  for (const n of Object.keys(WOLLE)) {
    def('wolle_' + n, { alle: 'wolle_' + n, farbe: WOLLE[n] });
    def('beton_' + n, { alle: 'beton_' + n, farbe: WOLLE[n] });
  }
  BF.TYPEN = T;

  // andere Namen, die man im Skript auch schreiben darf
  BF.TYP_ALIAS = {
    grasblock: 'gras', dreck: 'erde', cobblestone: 'bruchstein', cobble: 'bruchstein', stamm: 'holz', baumstamm: 'holz',
    planken: 'bretter', holzbretter: 'bretter', laub: 'blaetter', blatt: 'blaetter', glowstone: 'leuchtstein',
    golderz: 'gold_erz', eisenerz: 'eisen_erz', diamanterz: 'diamant_erz', kohleerz: 'kohle_erz', bedrock: 'grundgestein',
    sprengstoff: 'tnt', wolle: 'wolle_weiss', backstein: 'ziegel', steinziegeln: 'steinziegel', buecher: 'buecherregal',
    golderzblock: 'gold', goldblock: 'gold', eisenblock: 'eisen', diamantblock: 'diamant', smaragdblock: 'smaragd',
    luft: null, nichts: null, weg: null,
  };
  BF.typName = function (s) {
    if (s in T) return s;
    if (s in BF.TYP_ALIAS) return BF.TYP_ALIAS[s];
    if (('wolle_' + s) in T) return 'wolle_' + s;
    return undefined;
  };

  // Texturen und Materialien nur einmal bauen
  const texCache = {};
  BF.textur = function (name) {
    if (texCache[name]) return texCache[name];
    const c = leinwand();
    const ctx = c.getContext('2d');
    TEX[name](ctx, rng(hash(name)));
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.encoding = THREE.sRGBEncoding;
    texCache[name] = t;
    return t;
  };
  BF.texturLeinwand = function (name) { return BF.textur(name).image; };

  const matCache = {};
  BF.blockMaterial = function (typ) {
    if (matCache[typ]) return matCache[typ];
    const d = T[typ];
    const mk = {};
    const mat = name => {
      if (mk[name]) return mk[name];
      const o = { map: BF.textur(name) };
      if (d.alpha) { o.alphaTest = 0.5; o.side = THREE.DoubleSide; }
      if (d.durchsichtig && !d.alpha) { o.transparent = true; o.depthWrite = false; }
      if (d.durchsichtig && d.alpha) { o.transparent = true; o.alphaTest = 0.1; }
      if (d.leuchtet) { o.emissive = new THREE.Color(0xffffff); o.emissiveMap = BF.textur(name); o.emissiveIntensity = 0.9; }
      return (mk[name] = new THREE.MeshLambertMaterial(o));
    };
    const seite = d.alle || d.seite;
    const arr = [mat(seite), mat(seite), mat(d.alle || d.oben), mat(d.alle || d.unten), mat(d.vorne || seite), mat(seite)];
    matCache[typ] = arr;
    return arr;
  };
})();
