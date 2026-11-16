// Blockfilm – Bildstile für HyperFrames: ein Kurzgesagt-artiger Flat-Look, je nach Zielgruppe anders ausgeprägt.
// Ein Stil legt Farben, Formen, Schrift und Bewegung fest. Die Komposition (komponiere.js) liest nur von hier.
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const Z = (BF.zusatz = BF.zusatz || {});

  // ---------- Farbwerkzeuge ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hexRgb(h) {
    h = String(h || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslHex(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    if (s === 0) return rgbHex(l * 255, l * 255, l * 255);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return rgbHex(f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255);
  }
  // Licht- und Schattentöne wie bei Kurzgesagt: nicht grau/schwarz, sondern Farbton verschieben
  const hell = (hex, k = 0.12) => { const [h, s, l] = rgbHsl(...hexRgb(hex)); return hslHex(h - 6, clamp(s + 0.04, 0, 1), clamp(l + k, 0, 0.96)); };
  const dunkel = (hex, k = 0.12) => { const [h, s, l] = rgbHsl(...hexRgb(hex)); return hslHex(h + 10, clamp(s + 0.08, 0, 1), clamp(l - k, 0.04, 1)); };
  const mische = (a, b, u) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u); };
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  HF.farbe = { hexRgb, rgbHex, rgbHsl, hslHex, hell, dunkel, mische, rgba };

  // ---------- Stile ----------
  // palette: Grundfarben, auf die alle Farben aus dem Skript abgebildet werden (nach Farbton)
  // hg: Farben der Hintergründe; form: Rundheit/Details; schrift; bewegung: GSAP-Eases und Tempo
  const STILE = {
    '0-2': {
      name: 'Bonbon', alter: '0-2',
      palette: { rot: '#ff5d7a', orange: '#ffa23a', gelb: '#ffd83a', gruen: '#4fdc6c', tuerkis: '#3fe0c8', blau: '#4cb8ff', lila: '#a98bff', pink: '#ff7ad1', braun: '#c98a5a', weiss: '#ffffff', grau: '#b8c4d6', schwarz: '#2a2f4a' },
      hg: {
        himmel: ['#7fd8ff', '#c9f1ff'], boden: ['#66d97a', '#4cc463', '#3aae54'], berge: ['#a6e7ff', '#8fd8f5'],
        all: ['#2b2f7a', '#151747'], nebel: ['#7a5cff', '#ff6fb5'], abend: ['#7a7bff', '#ff8fb1', '#ffc56b'],
        wueste: ['#ffe39a', '#ffc75a', '#f7a94a'], schnee: ['#bfe6ff', '#ffffff', '#e2f2ff'], zimmer: ['#ffe9c7', '#ffd59a', '#e8a46a'],
        mikro: ['#ffd6e6', '#ffb3cf'], tafel: ['#2fb08a', '#23906f'], meer: ['#4cc8ff', '#1f7fd8', '#1754a8'], urzeit: ['#b8ffe0', '#5be38a', '#ffb52e'],
      },
      form: { rund: 1, details: 1, glow: 0.35, schatten: 0.18, partikel: 6, sterne: 70 },
      schrift: { titel: '"Baloo 2"', text: '"Baloo 2"', titelGewicht: 800, textGewicht: 500, versal: false, groesse: 1.18 },
      bewegung: { ein: 'back.out(2.6)', aus: 'back.in(1.8)', dauer: 0.75, wippen: 0.07, wippTempo: 1.6, drehen: 8, texte: 'elastic.out(1, 0.55)' },
      text: { band: '#ff5d7a', bandText: '#ffffff', unter: 'rgba(42,47,74,0.78)', karte: ['#4cb8ff', '#a98bff'] },
    },
    '3-5': {
      name: 'Spielplatz', alter: '3-5',
      palette: { rot: '#ff4f5e', orange: '#ffb21d', gelb: '#ffe03a', gruen: '#22d660', tuerkis: '#1fd6c0', blau: '#2b6bff', lila: '#8a5cff', pink: '#ff5cae', braun: '#8b4a2b', weiss: '#ffffff', grau: '#9fb0c8', schwarz: '#1d2340' },
      hg: {
        himmel: ['#5cc4ff', '#c8eeff'], boden: ['#21d65f', '#1bbd52', '#159a43'], berge: ['#a9f7dc', '#7fe8c4'],
        all: ['#1b2370', '#0d123f'], nebel: ['#5a4cff', '#ff4fa0'], abend: ['#4b4fd6', '#ff6f91', '#ffb84a'],
        wueste: ['#ffe08a', '#ffbb3a', '#f09a2a'], schnee: ['#a8dcff', '#ffffff', '#d8ecff'], zimmer: ['#ffe2b8', '#ffc77a', '#d98a4a'],
        mikro: ['#ffc8de', '#ff9cc2'], tafel: ['#178a6b', '#106f55'], meer: ['#2bb8f5', '#1565c8', '#0d3f8f'], urzeit: ['#a8f7d2', '#24e070', '#ffb21d'],
      },
      form: { rund: 0.85, details: 2, glow: 0.45, schatten: 0.22, partikel: 10, sterne: 110 },
      schrift: { titel: '"Fredoka"', text: '"Fredoka"', titelGewicht: 700, textGewicht: 500, versal: false, groesse: 1.1 },
      bewegung: { ein: 'back.out(2.1)', aus: 'back.in(1.6)', dauer: 0.6, wippen: 0.05, wippTempo: 1.3, drehen: 6, texte: 'back.out(2)' },
      text: { band: '#2b6bff', bandText: '#ffffff', unter: 'rgba(29,35,64,0.78)', karte: ['#22d660', '#2b6bff'] },
    },
    '6-9': {
      name: 'Abenteuer', alter: '6-9',
      palette: { rot: '#ff3d6e', orange: '#ff9a1f', gelb: '#ffd21f', gruen: '#1fe08a', tuerkis: '#16d9e0', blau: '#2f7bff', lila: '#7b4dff', pink: '#ff4fc8', braun: '#7a3f2a', weiss: '#ffffff', grau: '#93a3c0', schwarz: '#171c38' },
      hg: {
        himmel: ['#5fb8ff', '#d2efff'], boden: ['#3fe0b0', '#27c79a', '#1aa580'], berge: ['#ff9ad8', '#e77ad0'],
        all: ['#161d63', '#0a0e36'], nebel: ['#4c3cff', '#ff3d9a'], abend: ['#3a3fc8', '#ff5a8a', '#ffb03a'],
        wueste: ['#ffd77a', '#ffad2a', '#e8851f'], schnee: ['#9fd2ff', '#ffffff', '#cfe6ff'], zimmer: ['#ffe0c2', '#ffb98a', '#d07a4a'],
        mikro: ['#ffb8e0', '#ff86c0'], tafel: ['#155e7a', '#0f4a61'], meer: ['#1fb0f0', '#125bc0', '#0a347f'], urzeit: ['#b8ffd8', '#21e06e', '#ffaa16'],
      },
      form: { rund: 0.7, details: 2, glow: 0.55, schatten: 0.25, partikel: 14, sterne: 150 },
      schrift: { titel: '"Nunito"', text: '"Nunito"', titelGewicht: 900, textGewicht: 700, versal: false, groesse: 1.0 },
      bewegung: { ein: 'back.out(1.8)', aus: 'back.in(1.4)', dauer: 0.55, wippen: 0.035, wippTempo: 1.1, drehen: 5, texte: 'back.out(1.7)' },
      text: { band: '#2f7bff', bandText: '#ffffff', unter: 'rgba(23,28,56,0.8)', karte: ['#ff4fc8', '#2f7bff'] },
    },
    '10+': {
      name: 'Kosmos', alter: '10+',
      palette: { rot: '#ff3b5c', orange: '#ff8a1f', gelb: '#ffcf2a', gruen: '#2bff88', tuerkis: '#12e0d0', blau: '#1f6bff', lila: '#6a3dff', pink: '#ff2d8a', braun: '#5a2f24', weiss: '#ffffff', grau: '#8a96b8', schwarz: '#0f1330' },
      hg: {
        himmel: ['#1d3a8f', '#3a7be0'], boden: ['#0d5c4a', '#0a4a3c', '#073a2f'], berge: ['#1a4a8a', '#16397a'],
        all: ['#0e1442', '#050721'], nebel: ['#3b2dff', '#ff2d8a'], abend: ['#1c1f6b', '#c8346e', '#ff8a2a'],
        wueste: ['#ffc46a', '#ff962a', '#c8641a'], schnee: ['#5a8ad8', '#e8f2ff', '#b8d2f0'], zimmer: ['#2a2f6b', '#3a3f8a', '#1f2350'],
        mikro: ['#3a1450', '#7a1f6a'], tafel: ['#0d2a3f', '#081d2d'], meer: ['#0f6fb8', '#0a3f80', '#061f4a'], urzeit: ['#a8ffe8', '#16c96a', '#ff9a12'],
      },
      form: { rund: 0.5, details: 3, glow: 0.8, schatten: 0.3, partikel: 22, sterne: 220 },
      schrift: { titel: '"Montserrat"', text: '"Montserrat"', titelGewicht: 900, textGewicht: 700, versal: true, groesse: 0.92 },
      bewegung: { ein: 'back.out(1.4)', aus: 'power2.in', dauer: 0.5, wippen: 0.02, wippTempo: 0.9, drehen: 3, texte: 'power3.out' },
      text: { band: '#1fa8ff', bandText: '#ffffff', unter: 'rgba(15,19,48,0.82)', karte: ['#0e1442', '#3b2dff'] },
    },
  };
  HF.STILE = STILE;
  HF.SCHRIFTEN = [
    ['Baloo 2', 500, 'baloo-2-latin-500-normal.woff2'], ['Baloo 2', 800, 'baloo-2-latin-800-normal.woff2'],
    ['Fredoka', 500, 'fredoka-latin-500-normal.woff2'], ['Fredoka', 700, 'fredoka-latin-700-normal.woff2'],
    ['Nunito', 700, 'nunito-latin-700-normal.woff2'], ['Nunito', 900, 'nunito-latin-900-normal.woff2'],
    ['Montserrat', 700, 'montserrat-latin-700-normal.woff2'], ['Montserrat', 900, 'montserrat-latin-900-normal.woff2'],
  ];
  HF.schriftCss = basis => HF.SCHRIFTEN.map(([n, g, f]) => `@font-face{font-family:"${n}";font-weight:${g};font-style:normal;font-display:block;src:url("${basis}${f}") format("woff2")}`).join('\n');

  const ALTER = ['0-2', '3-5', '6-9', '10+'];
  HF.standardAlter = '6-9';
  HF.stilFuer = F => STILE[(F && F.zielgruppe) || HF.standardAlter] || STILE['6-9'];

  // Farbe aus dem Skript (Hex) → passender Stil-Ton (nach Farbton, Sättigung, Helligkeit)
  const NAMEN = { pink: 'pink', rosa: 'pink', magenta: 'pink', red: 'rot', rot: 'rot', blue: 'blau', blau: 'blau', green: 'gruen', gruen: 'gruen', yellow: 'gelb', gelb: 'gelb', orange: 'orange', purple: 'lila', lila: 'lila', violett: 'lila', tuerkis: 'tuerkis', cyan: 'tuerkis', brown: 'braun', braun: 'braun', white: 'weiss', weiss: 'weiss', black: 'schwarz', schwarz: 'schwarz', grau: 'grau', gray: 'grau', grey: 'grau' };
  HF.stilFarbe = function (stil, hex) {
    if (!hex) return hex;
    if (typeof hex !== 'string' || !/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) { const n = NAMEN[BF.norm ? BF.norm(String(hex)) : String(hex).toLowerCase()]; return n ? stil.palette[n] : hex; }
    const [h, s, l] = rgbHsl(...hexRgb(hex));
    const P = stil.palette;
    if (s < 0.15 || l > 0.93 || l < 0.08) return l > 0.82 ? P.weiss : l < 0.25 ? P.schwarz : P.grau;
    if (l < 0.38 && h > 10 && h < 45) return P.braun;
    const n = h < 12 ? 'rot' : h < 38 ? 'orange' : h < 64 ? 'gelb' : h < 160 ? 'gruen' : h < 195 ? 'tuerkis' : h < 250 ? 'blau' : h < 290 ? 'lila' : h < 340 ? 'pink' : 'rot';
    // helle Pastelltöne (z. B. zartrosa Zellen) bleiben hell, dunkle bleiben dunkel
    if (l > 0.74) return mische(P[n], '#ffffff', 0.5);
    if (l < 0.3) return dunkel(P[n], 0.15);
    return P[n];
  };

  // natürliche Farbe (z. B. eines Dinos) behalten, aber knalliger machen – Stärke je nach Stil
  HF.knallig = function (stil, hex) {
    if (!hex || typeof hex !== 'string' || hex[0] !== '#') return HF.stilFarbe(stil, hex);
    const [h, s, l] = rgbHsl(...hexRgb(hex));
    const k = stil.alter === '10+' ? 0.25 : 0.35;
    return hslHex(h, clamp(s + k, 0, 0.95), clamp(l + (0.55 - l) * 0.5, 0.35, 0.68));
  };

  // Skriptbefehl: zielgruppe 3-5   (legt den Bildstil fest; ohne Befehl gilt die Auswahl in der App)
  Z.zielgruppe = function (w, t, h) {
    let a = String(w.wort() || '').replace(/jahre?$/i, '').replace(/^ab/i, '').trim();
    if (a === '10' || a === '10plus' || a === 'erwachsene') a = '10+';
    if (!ALTER.includes(a)) throw new Error('So: zielgruppe 0-2 | 3-5 | 6-9 | 10+');
    h.F.zielgruppe = a;
    return 0;
  };
})();
