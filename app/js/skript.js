// Blockfilm – übersetzt das Film-Skript (deutsche Befehle) in einen Ablaufplan
(function () {
  const BF = (window.BF = window.BF || {});

  const norm = s => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  BF.norm = norm;
  const ZAHL = /^[-+]?\d+(?:[.,]\d+)?(?:s|sek|sekunden|°|grad|x)?$/i;
  const pz = s => parseFloat(s.replace(',', '.').replace(/(sekunden|sek|s|°|grad|x)$/i, ''));
  const DAUER_FREI = /^\d+(?:[.,]\d+)?(?:s|sek|sekunden)$/i;
  const FUELL = new Set(['zu', 'nach', 'auf', 'bei', 'an', 'um', 'sich', 'den', 'die', 'das', 'der', 'dem', 'mit', 'vom', 'von', 'zum', 'zur', 'ueber', 'richtung', 'ins', 'im']);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function zerlege(zeile) {
    const out = [];
    const re = /"([^"]*)"|„([^“"]*)[“"]|“([^”"]*)[”"]|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(zeile))) {
      if (m[5] !== undefined) {
        const roh = m[5];
        const eq = roh.indexOf('=');
        if (eq > 0 && eq < roh.length - 1) { out.push({ s: roh.slice(0, eq), q: false }); out.push({ s: roh.slice(eq + 1), q: false }); }
        else out.push({ s: roh, q: false });
      } else out.push({ s: m[1] ?? m[2] ?? m[3] ?? m[4], q: true });
    }
    return out;
  }

  class Worte {
    constructor(t) { this.t = t; }
    get leer() { return this.t.length === 0; }
    pk(i = 0) { const x = this.t[i]; return x ? (x.q ? null : norm(x.s)) : null; }
    roh(i = 0) { return this.t[i] ? this.t[i].s : null; }
    nimm() { return this.t.shift(); }
    wort() { const x = this.t.shift(); return x ? norm(x.s) : null; }
    istZahl(i = 0) { const x = this.t[i]; return !!x && !x.q && ZAHL.test(x.s); }
    zahl(def) { if (this.istZahl()) return pz(this.t.shift().s); if (def === undefined) throw new Error('Hier fehlt eine Zahl' + (this.t[0] ? ` (gefunden: „${this.t[0].s}“)` : '')); return def; }
    finde(namen) { for (let i = 0; i < this.t.length; i++) { const x = this.t[i]; if (!x.q && namen.includes(norm(x.s))) return i; } return -1; }
    optZahl(namen, def) {
      for (let i = 0; i < this.t.length - 1; i++) {
        const x = this.t[i];
        if (!x.q && namen.includes(norm(x.s)) && this.istZahl(i + 1)) { const v = pz(this.t[i + 1].s); this.t.splice(i, 2); return v; }
      }
      return def;
    }
    optWort(namen, def) {
      for (let i = 0; i < this.t.length - 1; i++) {
        const x = this.t[i];
        if (!x.q && namen.includes(norm(x.s))) { const v = this.t[i + 1].s; this.t.splice(i, 2); return v; }
      }
      return def;
    }
    flag(namen) { const i = this.finde(namen); if (i >= 0) { this.t.splice(i, 1); return true; } return false; }
    dauerFrei() {
      for (let i = 0; i < this.t.length; i++) { const x = this.t[i]; if (!x.q && DAUER_FREI.test(x.s)) { this.t.splice(i, 1); return pz(x.s); } }
      return undefined;
    }
    dauer(def) { const d = this.optZahl(['in', 'dauer', 'fuer', 'lang', 'ueber', 'zeit', 'während', 'waehrend']); if (d !== undefined) return d; const f = this.dauerFrei(); return f !== undefined ? f : def; }
    dauerOderZahl(def) { const d = this.dauer(); if (d !== undefined) return d; for (let i = 0; i < this.t.length; i++) if (this.istZahl(i)) { const v = pz(this.t[i].s); this.t.splice(i, 1); return v; } return def; }
    text() { for (let i = 0; i < this.t.length; i++) if (this.t[i].q) { const s = this.t[i].s; this.t.splice(i, 1); return s; } return null; }
    fuell() { while (this.t.length && !this.t[0].q && FUELL.has(norm(this.t[0].s))) this.t.shift(); }
  }

  const SPRACH = {
    geht: 4.3, laeuft: 5.6, rennt: 5.6, sprintet: 5.6, schleicht: 1.4, fliegt: 9, kriecht: 1.2, schwimmt: 2.2,
  };
  const STANDARD_FARBEN = {
    mensch: { haut: '#d2a07c', haare: '#5a3a1c', hemd: '#d0563b', hose: '#34495e', schuhe: '#3a3a3a', augen: '#2f5d8a' },
    zombie: { haut: '#5b8a43', haare: '#466d33', hemd: '#6a5a8a', hose: '#4a4a5a', schuhe: '#3a3a3a', augen: '#1b2a12' },
    skelett: { haut: '#c8c8c8', haare: '#bdbdbd', hemd: '#c8c8c8', hose: '#c8c8c8', schuhe: '#b0b0b0', augen: '#2a2a2a', duenn: true },
    ritter: { haut: '#c69c7c', haare: '#a8adb5', hemd: '#a8adb5', hose: '#8f949b', schuhe: '#6b6f75', augen: '#3a3a3a', helm: true },
    dorfbewohner: { haut: '#b98a6a', haare: '#5a3d26', hemd: '#6d4b2f', hose: '#6d4b2f', schuhe: '#4a3320', augen: '#2f6b2a', robe: true, nase: true },
    hexe: { haut: '#b98a6a', haare: '#2b1d3d', hemd: '#3b2a5a', hose: '#3b2a5a', schuhe: '#1a1a1a', augen: '#5a2b7a', robe: true, nase: true },
    koenig: { haut: '#c69c7c', haare: '#e8c060', hemd: '#a12722', hose: '#5a1a16', schuhe: '#3a2a1a', augen: '#3b5ea0', krone: true },
    pirat: { haut: '#c69c7c', haare: '#1a1a1a', hemd: '#e9e3d5', hose: '#3a2a1a', schuhe: '#1a1a1a', augen: '#3a2a1a' },
    ninja: { haut: '#c69c7c', haare: '#1a1a1a', hemd: '#1a1a1a', hose: '#1a1a1a', schuhe: '#111', augen: '#3a3a3a', maske: true },
    roboter: { haut: '#9aa3ad', haare: '#7d868f', hemd: '#9aa3ad', hose: '#7d868f', schuhe: '#555', augen: '#ff3030' },
  };
  const TIERE = {
    schwein: { koerper: '#f0a5a2', kopf: '#f0a5a2', beine: '#e08f8c', schnauze: '#e3807d', gross: 1 },
    kuh: { koerper: '#4a3424', kopf: '#4a3424', beine: '#3a281b', flecken: '#e8e8e8', hoerner: true, gross: 1.25 },
    schaf: { koerper: '#e9ecec', kopf: '#c4b7a6', beine: '#c4b7a6', wolle: true, gross: 1.05 },
    hund: { koerper: '#d9d0c4', kopf: '#d9d0c4', beine: '#cfc5b8', schwanz: true, gross: 0.85 },
    katze: { koerper: '#e1a352', kopf: '#e1a352', beine: '#d39444', schwanz: true, gross: 0.65 },
    pferd: { koerper: '#8a5a32', kopf: '#8a5a32', beine: '#7a4e2a', maehne: '#3a2414', gross: 1.6, lang: true },
    huhn: { koerper: '#f2f2f2', kopf: '#f2f2f2', beine: '#e2a32a', schnabel: true, gross: 0.45 },
    spinne: { koerper: '#2f2a26', kopf: '#2f2a26', beine: '#1f1a17', augen: '#b31010', gross: 0.9, flach: true },
  };
  BF.FIGUR_FARBEN = STANDARD_FARBEN;
  BF.TIERE = TIERE;

  // Zeitbewusste Blockwelt (Grundwelt + Änderungen mit Zeitpunkt)
  function neueWelt() {
    const W = {
      basis: new Map(), ev: new Map(), liste: [],
      typ(x, y, z, t) {
        const k = x + ',' + y + ',' + z;
        const l = this.ev.get(k);
        if (l) { let r; for (const e of l) { if (e.t <= t) r = e; else break; } if (r) return r.typ; }
        return this.basis.get(k) || null;
      },
      fest(x, y, z, t) { const ty = this.typ(x, y, z, t); return !!ty && BF.TYPEN[ty].fest; },
      setze(x, y, z, typ, t) {
        x = Math.round(x); y = Math.round(y); z = Math.round(z);
        const k = x + ',' + y + ',' + z;
        let l = this.ev.get(k);
        if (!l) this.ev.set(k, (l = []));
        const e = { t, x, y, z, typ };
        let i = l.length;
        while (i > 0 && l[i - 1].t > t) i--;
        l.splice(i, 0, e);
        this.liste.push(e);
      },
      boden(x, z, t, vonY = 60) {
        const xi = Math.round(x), zi = Math.round(z);
        for (let y = vonY; y >= -12; y--) if (this.fest(xi, y, zi, t)) return y + 1;
        return this.leer ? 0 : -12;
      },
    };
    return W;
  }
  BF.neueWelt = neueWelt;

  // einfache Rausch-Funktion für Hügel
  function wertRausch(seed) {
    const r = BF.rng(seed * 7919 + 13);
    const g = [];
    for (let i = 0; i < 256; i++) g.push(r());
    const h = (x, z) => g[((x * 73856093) ^ (z * 19349663)) & 255];
    const glatt = t => t * t * (3 - 2 * t);
    return (x, z) => {
      const xi = Math.floor(x), zi = Math.floor(z), fx = glatt(x - xi), fz = glatt(z - zi);
      const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    };
  }

  function baum(W, x, z, t, hoehe, r, setze) {
    const y0 = W.boden(x, z, t);
    hoehe = hoehe || 4 + Math.floor(r() * 3);
    for (let y = 0; y < hoehe; y++) setze(x, y0 + y, z, 'holz');
    const top = y0 + hoehe;
    for (let dy = -2; dy <= 1; dy++) {
      const rad = dy >= 0 ? 1 : 2;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (dx === 0 && dz === 0 && dy < 0) continue;
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy >= 0 || r() < 0.5)) continue;
        setze(x + dx, top + dy, z + dz, 'blaetter', true);
      }
    }
  }

  function erzeugeWelt(F, W, o) {
    W.basis.clear();
    W.leer = false;
    const S = o.groesse, h = S / 2;
    const boden = o.boden || 'gras';
    const unter = boden === 'gras' || boden === 'schneegras' ? 'erde' : boden;
    const setzeB = (x, y, z, typ, nurLeer) => { const k = x + ',' + y + ',' + z; if (nurLeer && W.basis.has(k)) return; W.basis.set(k, typ); };
    if (o.art === 'leer') { W.leer = true; return; }
    if (o.art === 'flach') {
      for (let x = -h; x < h; x++) for (let z = -h; z < h; z++) {
        setzeB(x, -1, z, boden); setzeB(x, -2, z, unter); setzeB(x, -3, z, unter); setzeB(x, -4, z, 'stein');
      }
      return;
    }
    const n = wertRausch(o.seed);
    const r = BF.rng(o.seed * 31 + 7);
    const hoehe = (x, z) => {
      const d = Math.hypot(x, z);
      if (o.art === 'insel') {
        const rand = clamp(1 - d / (h * 0.85), 0, 1);
        return Math.round((n(x / 9, z / 9) * 4 + 1) * rand + rand * 2) - (rand <= 0 ? 4 : 0);
      }
      const mitte = clamp((d - 12) / 10, 0, 1); // Bühne in der Mitte bleibt flach
      return Math.round((n(x / 10, z / 10) * 5 + n(x / 4, z / 4) * 1.2 - 2) * mitte);
    };
    for (let x = -h; x < h; x++) for (let z = -h; z < h; z++) {
      const hh = hoehe(x, z);
      if (o.art === 'insel' && hh < 0) {
        for (let y = -4; y < -1; y++) setzeB(x, y, z, 'sand');
        setzeB(x, -1, z, 'wasser');
        continue;
      }
      const top = hh - 1;
      for (let y = -4; y <= top; y++) {
        let typ = 'stein';
        if (y === top) typ = o.art === 'insel' && hh <= 0 ? 'sand' : boden;
        else if (y >= top - 2) typ = unter;
        setzeB(x, y, z, typ);
      }
    }
    if (o.baeume !== false) {
      const anzahl = Math.floor(S * S / 90);
      const tb = (x, y, z, typ, nurLeer) => setzeB(x, y, z, typ, nurLeer);
      for (let i = 0; i < anzahl; i++) {
        const x = Math.floor(r() * (S - 4)) - h + 2, z = Math.floor(r() * (S - 4)) - h + 2;
        if (Math.hypot(x, z) < 17) continue;
        const y0 = W.boden(x, z, -1);
        const unten = W.typ(x, y0 - 1, z, -1);
        if (unten !== boden || boden === 'sand') continue;
        baum({ boden: () => y0 }, x, z, -1, 0, r, tb);
      }
    }
  }

  function mehrereZahlen(w, n) { const a = []; for (let i = 0; i < n; i++) a.push(w.zahl()); return a; }

  function farbeWert(s) {
    if (!s) return s;
    if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s)) return s[0] === '#' ? s : '#' + s;
    const n = norm(s);
    const NAMEN = {
      rot: '#b3312c', blau: '#2e4fb5', gruen: '#3f8f2a', gelb: '#e8c62a', schwarz: '#1a1a1a', weiss: '#ececec', grau: '#6d6d6d',
      braun: '#6b4a30', orange: '#e07a1f', lila: '#7b3fb0', rosa: '#e88aa8', tuerkis: '#2ea3a9', gold: '#e8c060', silber: '#b8bec6',
      blond: '#e3c56a', dunkelblau: '#1f2a6b', hellblau: '#5aa8e8', dunkelgruen: '#2a5a1f', beige: '#d8c39a', haut: '#c69c7c',
    };
    if (NAMEN[n]) return NAMEN[n];
    if (BF.TYPEN['wolle_' + n]) return BF.TYPEN['wolle_' + n].farbe;
    return s;
  }

  // ===================== Übersetzer =====================
  BF.kompiliere = function (text) {
    const F = {
      breite: 3840, hoehe: 2160, fps: 30, titel: 'Mein Blockfilm',
      weltOpt: { art: 'flach', groesse: 48, boden: 'gras', seed: 1, wolken: true, baeume: true },
      W: neueWelt(), akteure: {}, reihenfolge: [], kamera: [], fov: [], wackeln: [], himmel: [], texte: [], blenden: [],
      effekte: [], koerper: [], explosionen: [], toene: [], musik: [], blitze: [], fehler: [], dauer: 0, festeDauer: null,
      schwerkraft: 25, abprall: 0.25, standardSkin: BF.standardSkin || null,
    };
    const W = F.W;
    erzeugeWelt(F, W, F.weltOpt);
    let weltGesetzt = false;
    const zufall = BF.rng(12345);
    let T = 0, letzterStart = 0, ende = 0, anker = 0;
    let begleitAnimation = null;
    const BEGLEITBAR = new Set(['kamera2d', 'faerbe2d', 'farbe2d', 'temperatur2d', 'vermehren2d', 'teilen2d', 'dicke2d', 'wachsen2d', 'blaetterfallen2d', 'laubfallen2d', 'bewege2d', 'kippe2d', 'drift2d', 'scheibe2d', 'lupe', 'zoom', 'zeichentrick', 'himmel']);
    const warteschlange = []; // spätere Explosionen (Kettenreaktion)

    const akt = name => F.akteure[norm(name)];
    const posVon = a => ({ x: a.p.x, y: a.p.y, z: a.p.z });
    const ton = (t, art, o = {}) => F.toene.push(Object.assign({ t, art }, o));

    function zielLesen(w, t, pflicht = true) {
      w.fuell();
      if (w.istZahl()) {
        const a = [w.zahl(), w.zahl()];
        if (w.istZahl()) a.push(w.zahl());
        if (a.length === 2) return { p: [a[0], null, a[1]] };
        return { p: a };
      }
      const n = w.pk();
      if (n && F.akteure[n]) { w.nimm(); return { akteur: n }; }
      if (n && F.objekte && F.objekte.some(o => o.name === n)) { w.nimm(); return { objekt: n }; }
      if (pflicht) throw new Error('Ziel fehlt: schreib Zahlen (x z oder x y z) oder einen Figurennamen');
      return null;
    }
    function zielPunkt(z, t) {
      if (z.objekt) { const o = F.objekte.find(x => x.name === z.objekt); return o.p.slice(); }
      if (z.akteur) { const a = F.akteure[z.akteur]; return [a.p.x, a.p.y + (a.tier ? 0.7 : 1.5), a.p.z]; }
      const p = z.p;
      return [p[0], p[1] === null ? W.boden(p[0], p[2], t) + 1 : p[1], p[2]];
    }

    // ---------- Explosionen ----------
    function explodiere(x, y, z, R, t) {
      F.effekte.push({ typ: 'explosion', t0: t, t1: t + 2, pos: [x, y + 0.5, z], r: R, seed: Math.floor(zufall() * 1e6) });
      F.blitze.push({ t0: t, t1: t + 0.35, staerke: 0.55 });
      F.wackeln.push({ t0: t, t1: t + 0.9, staerke: clamp(R / 4, 0.3, 1.5) });
      F.explosionen.push({ t, pos: [x, y + 0.5, z], r: R });
      ton(t, 'explosion', { vol: clamp(R / 4, 0.5, 1.3) });
      ende = Math.max(ende, t + 2);
      const Ri = Math.ceil(R);
      for (let dx = -Ri; dx <= Ri; dx++) for (let dy = -Ri; dy <= Ri; dy++) for (let dz = -Ri; dz <= Ri; dz++) {
        const d = Math.hypot(dx, dy, dz);
        if (d > R * (0.75 + zufall() * 0.35)) continue;
        const bx = Math.round(x) + dx, by = Math.round(y) + dy, bz = Math.round(z) + dz;
        const typ = W.typ(bx, by, bz, t);
        if (!typ || typ === 'grundgestein' || typ === 'obsidian') continue;
        W.setze(bx, by, bz, null, t);
        if (typ === 'tnt') {
          const f = 0.5 + zufall() * 0.6;
          F.effekte.push({ typ: 'zuendung', t0: t, t1: t + f, pos: [bx, by, bz], flug: [dx * 0.6, 2.5, dz * 0.6] });
          warteschlange.push({ t: t + f, x: bx + dx * 0.4, y: by + 0.6, z: bz + dz * 0.4, r: 4 });
          continue;
        }
        if (!BF.TYPEN[typ].fest || F.koerper.length > 700) continue;
        if (zufall() < 0.6) {
          const len = Math.max(0.3, d);
          const s = (1 - d / (R + 1)) * 13 + 3;
          F.koerper.push({
            t0: t, typ, pos: [bx, by + 0.5, bz],
            vel: [dx / len * s + (zufall() - 0.5) * 2, dy / len * s * 0.5 + 5 + zufall() * 5, dz / len * s + (zufall() - 0.5) * 2],
            dreh: [(zufall() - 0.5) * 14, (zufall() - 0.5) * 14, (zufall() - 0.5) * 14],
          });
        }
      }
      // Figuren werden weggeschleudert
      for (const a of Object.values(F.akteure)) {
        if (!a.sichtbar) continue;
        const ax = a.p.x - x, az = a.p.z - z, ay = a.p.y + 0.9 - y;
        const d = Math.hypot(ax, ay, az);
        const RR = R * 1.8;
        if (d > RR) continue;
        const k = 1 - d / RR;
        const hl = Math.hypot(ax, az) || 1;
        const v = [ax / hl * (3 + 11 * k), 4 + 7 * k, az / hl * (3 + 11 * k)];
        schleudern(a, t + 0.02, v, k > 0.3);
      }
    }
    function abarbeiten(bis) {
      warteschlange.sort((a, b) => a.t - b.t);
      while (warteschlange.length && warteschlange[0].t <= bis) {
        const e = warteschlange.shift();
        explodiere(e.x, e.y, e.z, e.r, e.t);
        warteschlange.sort((a, b) => a.t - b.t);
      }
    }

    // Flugbahn einer Figur (Explosion, Rückstoß)
    function schleudern(a, t, v, umfallen) {
      const pts = [];
      let x = a.p.x, y = a.p.y, z = a.p.z, vx = v[0], vy = v[1], vz = v[2];
      const dt = 1 / 60;
      let n = 0;
      for (; n < 60 * 4; n++) {
        pts.push(x, y, z);
        vy -= F.schwerkraft * dt;
        const nx = x + vx * dt, nz = z + vz * dt;
        if (W.fest(Math.round(nx), Math.round(y + 0.5), Math.round(nz), t + n * dt)) { vx = -vx * 0.3; vz = -vz * 0.3; }
        else { x = nx; z = nz; }
        y += vy * dt;
        const b = W.boden(x, z, t + n * dt, Math.round(y + 1));
        if (y <= b && vy < 0) { y = b; pts.push(x, y, z); n++; break; }
      }
      const t1 = t + n / 60;
      const spin = umfallen ? (zufall() < 0.5 ? -1 : 1) * Math.PI * 2 : 0;
      a.segs.push({ typ: 'bahn', t0: t, t1, pts: new Float32Array(pts), spin });
      a.gesten.push({ typ: 'aua', t0: t, t1: t + 0.5 });
      ton(t, 'aua', { stimme: a.stimme });
      a.p = { x, y, z };
      if (umfallen && !a.liegt) {
        a.zust.push({ key: 'liegen', t0: t1 - 0.05, t1: t1 + 0.25, von: 0, zu: 1 });
        a.liegt = true;
      }
      ende = Math.max(ende, t1 + 0.5);
    }

    function figurAnlegen(w, t) {
      const nameTok = w.nimm();
      if (!nameTok) throw new Error('Name der Figur fehlt');
      const name = norm(nameTok.s);
      let art = 'mensch';
      const arten = Object.keys(STANDARD_FARBEN).concat(Object.keys(TIERE));
      const ai = w.finde(arten.concat(['art', 'typ']));
      if (ai >= 0) {
        const n = norm(w.t[ai].s);
        if (n === 'art' || n === 'typ') { art = norm(w.t[ai + 1].s); w.t.splice(ai, 2); }
        else { art = n; w.t.splice(ai, 1); }
      }
      if (!STANDARD_FARBEN[art] && !TIERE[art]) throw new Error(`Unbekannte Figurenart „${art}“`);
      const tier = !!TIERE[art];
      const def = Object.assign({}, tier ? TIERE[art] : STANDARD_FARBEN[art]);
      let eigeneFarbe = false;
      for (const k of ['haut', 'haare', 'hemd', 'hose', 'schuhe', 'augen', 'koerper', 'kopf', 'beine', 'flecken', 'farbe', 'jacke', 'shirt']) {
        const v = w.optWort([k]);
        if (v) {
          eigeneFarbe = true;
          const f = farbeWert(v);
          if (k === 'farbe') { def.koerper = def.kopf = f; def.hemd = f; }
          else if (k === 'jacke' || k === 'shirt') def.hemd = f;
          else def[k] = f;
        }
      }
      const skin = w.optWort(['skin', 'haut-datei', 'bild']);
      if (skin) def.skin = skin;
      else if (art === 'mensch' && !eigeneFarbe && F.standardSkin && !w.flag(['ohneskin', 'farben'])) def.skin = F.standardSkin;
      if (w.flag(['schmal', 'slim', 'duenn'])) def.schmal = true;
      const unsichtbar = w.flag(['unsichtbar', 'versteckt']);
      if (w.flag(['glatze'])) def.glatze = true;
      if (w.flag(['bart'])) def.bart = true;
      if (w.flag(['brille'])) def.brille = true;
      const gross = w.optZahl(['groesse', 'skala']);
      if (gross) def.skala = gross;
      const blick = w.optZahl(['blick', 'richtung', 'dreh']);
      const stimme = w.optZahl(['stimme'], tier ? 0.6 : 0.8 + (BF.hash(name) % 60) / 100);
      const item = w.optWort(['item', 'haelt', 'waffe', 'werkzeug']);
      w.fuell();
      let p = { x: 0, y: null, z: 0 };
      if (w.istZahl()) {
        const a = [w.zahl(), w.zahl()];
        if (w.istZahl()) a.push(w.zahl());
        p = a.length === 2 ? { x: a[0], y: null, z: a[1] } : { x: a[0], y: a[1], z: a[2] };
      }
      if (p.y === null) p.y = W.boden(p.x, p.z, t);
      const anzeige = nameTok.s;
      const a = {
        name, anzeige, art, tier, def, stimme,
        start: { x: p.x, y: p.y, z: p.z, yaw: ((blick || 0) * Math.PI) / 180 },
        segs: [], gesten: [], zust: [], reden: [], blicke: [], items: [], sicht: [],
        p: { x: p.x, y: p.y, z: p.z }, yaw: ((blick || 0) * Math.PI) / 180, liegt: false, sitzt: false, sichtbar: true,
      };
      if (t > 0) { a.sicht.push({ t0: -1, t1: -1, von: 0, zu: 0 }); a.sicht.push({ t0: t, t1: t + 0.3, von: 0, zu: 1 }); F.effekte.push({ typ: 'rauch', t0: t, t1: t + 1, pos: [p.x, p.y + 0.8, p.z], seed: BF.hash(name) }); ton(t, 'puff'); }
      if (item) a.items.push({ t0: -1, item: norm(item) });
      if (unsichtbar) { a.sicht.push({ t0: -1, t1: -1, von: 0, zu: 0 }); a.sichtbar = false; }
      F.akteure[name] = a;
      F.reihenfolge.push(name);
      return 0;
    }

    // Dreh-Hilfen
    const winkelZu = (a, x, z) => Math.atan2(x - a.p.x, z - a.p.z);
    function drehe(a, t, ziel, dauer) {
      let d = ziel - a.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 0.001) return;
      a.segs.push({ typ: 'dreh', t0: t, t1: t + dauer, y0: a.yaw, y1: a.yaw + d });
      a.yaw = a.yaw + d;
    }

    function laufe(a, t, ziel, stil, dauer, w) {
      const von = posVon(a);
      let zu = { x: ziel[0], y: ziel[1], z: ziel[2] };
      const dx = zu.x - von.x, dz = zu.z - von.z;
      let dist = Math.hypot(dx, dz);
      if (stil === 'fliegt') {
        if (zu.y === null) zu.y = von.y;
        dist = Math.hypot(dx, zu.y - von.y, dz);
      }
      const tempo = SPRACH[stil] || 4.3;
      if (!dauer) dauer = Math.max(0.3, dist / tempo);
      const yaw1 = dist > 0.05 ? Math.atan2(dx, dz) : a.yaw;
      let dr = yaw1 - a.yaw;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      const seg = { typ: 'weg', t0: t, t1: t + dauer, von, zu: null, yaw0: a.yaw, yaw1: a.yaw + dr, stil, tempo: dist / dauer };
      if (stil !== 'fliegt') {
        const n = Math.max(2, Math.ceil(dist * 8) + 1);
        const hs = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1);
          hs[i] = W.boden(von.x + dx * u, von.z + dz * u, t + dauer * u, Math.round(von.y + 3));
        }
        seg.hoehen = hs;
        zu.y = hs[n - 1];
      }
      seg.zu = zu;
      a.segs.push(seg);
      a.p = { x: zu.x, y: zu.y, z: zu.z };
      a.yaw = seg.yaw1;
      // Schrittgeräusche
      if (stil !== 'fliegt' && dist > 0.3) {
        const takt = stil === 'schleicht' ? 0.6 : stil === 'geht' ? 0.36 : 0.27;
        for (let s = t + 0.1; s < t + dauer; s += takt) ton(s, 'schritt', { vol: stil === 'schleicht' ? 0.3 : 0.7 });
      }
      return dauer;
    }

    function itemName(s) {
      s = norm(s);
      const map = { schwert: 1, axt: 1, spitzhacke: 1, hacke: 1, schaufel: 1, fackel: 1, stock: 1, bogen: 1, blume: 1, apfel: 1, schild: 1, diamant: 1, buch: 1, kuchen: 1 };
      for (const m of ['holz', 'stein', 'eisen', 'gold', 'diamant', 'netherit']) if (s.startsWith(m) && map[s.slice(m.length)]) return s;
      if (map[s]) return s;
      if (s === 'nichts' || s === 'weg' || s === 'leer') return null;
      throw new Error(`Unbekannter Gegenstand „${s}“`);
    }

    // ---------- Aktionen von Figuren ----------
    function figurAktion(a, w, t) {
      let verb = w.wort();
      const RICHT = { vor: 1, vorwaerts: 1, zurueck: -1, rueckwaerts: -1 };
      switch (verb) {
        case 'geht': case 'laeuft': case 'rennt': case 'sprintet': case 'schleicht': case 'kriecht': case 'schwimmt': case 'fliegt': case 'geh': case 'lauf': {
          const stil = verb === 'geh' ? 'geht' : verb === 'lauf' ? 'laeuft' : verb === 'rennt' || verb === 'sprintet' ? 'laeuft' : verb;
          const d = w.dauer();
          const r = w.pk();
          if (r && (RICHT[r] || r === 'links' || r === 'rechts')) {
            w.nimm();
            const n = w.zahl(3);
            let ang = a.yaw;
            let s = n;
            if (RICHT[r]) s = n * RICHT[r];
            if (r === 'links') ang += Math.PI / 2;
            if (r === 'rechts') ang -= Math.PI / 2;
            const ziel = [a.p.x + Math.sin(ang) * s, stil === 'fliegt' ? a.p.y : null, a.p.z + Math.cos(ang) * s];
            if (RICHT[r] === -1) {
              // rückwärts: Blickrichtung bleibt
              const yaw = a.yaw;
              const dd = laufe(a, t, ziel, stil, d, w);
              const seg = a.segs[a.segs.length - 1];
              seg.yaw1 = yaw; a.yaw = yaw; seg.rueckwaerts = true;
              return dd;
            }
            return laufe(a, t, ziel, stil, d, w);
          }
          if (w.istZahl() && !w.istZahl(1)) {
            // "geht 5" = 5 Blöcke vorwärts
            const n = w.zahl();
            return laufe(a, t, [a.p.x + Math.sin(a.yaw) * n, stil === 'fliegt' ? a.p.y : null, a.p.z + Math.cos(a.yaw) * n], stil, d, w);
          }
          const z = zielLesen(w, t);
          let p;
          if (z.akteur) {
            const b = F.akteure[z.akteur];
            const dx = b.p.x - a.p.x, dz = b.p.z - a.p.z, l = Math.hypot(dx, dz) || 1;
            const abst = Math.min(l, 1.3);
            p = [b.p.x - dx / l * abst, stil === 'fliegt' ? b.p.y : null, b.p.z - dz / l * abst];
          } else p = z.p.slice();
          if (stil === 'fliegt' && p[1] === null) p[1] = a.p.y;
          return laufe(a, t, p, stil, d, w);
        }
        case 'teleportiert': case 'beamt': case 'erscheint_bei': {
          const z = zielLesen(w, t);
          const p = zielPunkt(z, t);
          const y = z.p && z.p[1] !== null ? z.p[1] : W.boden(p[0], p[2], t);
          F.effekte.push({ typ: 'rauch', t0: t, t1: t + 1, pos: [a.p.x, a.p.y + 0.9, a.p.z], seed: 5, lila: true });
          a.segs.push({ typ: 'tele', t0: t, t1: t, zu: { x: p[0], y, z: p[2] } });
          a.p = { x: p[0], y, z: p[2] };
          F.effekte.push({ typ: 'rauch', t0: t, t1: t + 1, pos: [p[0], y + 0.9, p[2]], seed: 6, lila: true });
          ton(t, 'puff');
          return 0.2;
        }
        case 'springt': case 'huepft': {
          const h = w.optZahl(['hoehe', 'hoch'], 1.25);
          const d = w.dauer();
          const r = w.pk();
          let ziel = null;
          if (r && RICHT[r]) { w.nimm(); const n = w.zahl(2) * RICHT[r]; ziel = [a.p.x + Math.sin(a.yaw) * n, a.p.z + Math.cos(a.yaw) * n]; }
          else { const z = zielLesen(w, t, false); if (z) { const p = zielPunkt(z, t); ziel = [p[0], p[2]]; } }
          const von = posVon(a);
          if (ziel) {
            const dist = Math.hypot(ziel[0] - von.x, ziel[1] - von.z);
            const dauer = d || 0.55 + dist * 0.09;
            const yaw1 = Math.atan2(ziel[0] - von.x, ziel[1] - von.z);
            const zy = W.boden(ziel[0], ziel[1], t + dauer, Math.round(von.y + 4));
            const hoch = Math.max(h, zy - von.y + 0.8);
            a.segs.push({ typ: 'weg', t0: t, t1: t + dauer, von, zu: { x: ziel[0], y: zy, z: ziel[1] }, yaw0: a.yaw, yaw1, stil: 'sprung', tempo: 0 });
            a.segs.push({ typ: 'sprung', t0: t, t1: t + dauer, h: hoch - Math.max(0, zy - von.y) * 0.5 });
            a.p = { x: ziel[0], y: zy, z: ziel[1] };
            a.yaw = yaw1;
            ton(t, 'sprung'); ton(t + dauer, 'landen');
            return dauer;
          }
          const dauer = d || 0.3 + Math.sqrt(h) * 0.3;
          a.segs.push({ typ: 'sprung', t0: t, t1: t + dauer, h });
          ton(t, 'sprung'); ton(t + dauer, 'landen');
          return dauer;
        }
        case 'dreht': case 'wendet': {
          const d = w.dauer(0.4);
          w.flag(['sich']);
          if (w.flag(['um']) && !w.istZahl() && !w.pk()) { drehe(a, t, a.yaw + Math.PI, d); return d; }
          const zr = w.pk();
          if (zr === 'links' || zr === 'rechts') { w.nimm(); const g = w.zahl(90); drehe(a, t, a.yaw + (zr === 'links' ? 1 : -1) * g * Math.PI / 180, d); return d; }
          if (w.istZahl() && !w.istZahl(1)) { const g = w.zahl(); drehe(a, t, a.yaw - g * Math.PI / 180, d); return d; }
          if (zr === 'um') { w.nimm(); drehe(a, t, a.yaw + Math.PI, d); return d; }
          const z = zielLesen(w, t);
          const p = zielPunkt(z, t);
          drehe(a, t, winkelZu(a, p[0], p[2]), d);
          return d;
        }
        case 'schaut': case 'guckt': case 'sieht': case 'blickt': {
          const d = w.dauer(0.4);
          const r = w.pk();
          if (r === 'hoch' || r === 'oben' || r === 'nach') {
            if (r === 'nach') w.nimm();
            const r2 = w.wort();
            a.blicke.push({ t0: t, ziel: r2 === 'unten' ? 'unten' : r2 === 'geradeaus' || r2 === 'vorne' ? null : 'oben' });
            return d;
          }
          if (r === 'unten') { w.nimm(); a.blicke.push({ t0: t, ziel: 'unten' }); return d; }
          if (r === 'geradeaus' || r === 'weg') { w.nimm(); a.blicke.push({ t0: t, ziel: null }); return d; }
          if (r === 'sich' || r === 'um' || r === 'herum') { a.gesten.push({ typ: 'umschauen', t0: t, t1: t + Math.max(d, 2) }); return Math.max(d, 2); }
          const z = zielLesen(w, t);
          const p = zielPunkt(z, t);
          if (!a.liegt) drehe(a, t, winkelZu(a, p[0], p[2]), d);
          a.blicke.push({ t0: t, ziel: z });
          return d;
        }
        case 'winkt': { const d = w.dauer(1.6); a.gesten.push({ typ: 'winken', t0: t, t1: t + d }); return d; }
        case 'nickt': { const d = w.dauer(0.8); a.gesten.push({ typ: 'nicken', t0: t, t1: t + d }); return d; }
        case 'schuettelt': { const d = w.dauer(1); a.gesten.push({ typ: 'schuetteln', t0: t, t1: t + d }); return d; }
        case 'schlaegt': case 'haut': case 'greift': case 'boxt': case 'attackiert': case 'trifft': {
          w.flag(['an', 'zu']);
          const d = w.dauer(0.4);
          a.gesten.push({ typ: 'schlag', t0: t, t1: t + Math.min(d, 0.4) });
          ton(t + 0.12, 'schwung');
          const z = zielLesen(w, t, false);
          if (z && z.akteur && z.akteur !== a.name) {
            const b = F.akteure[z.akteur];
            drehe(a, t, winkelZu(a, b.p.x, b.p.z), 0.12);
            const th = t + 0.15;
            b.gesten.push({ typ: 'aua', t0: th, t1: th + 0.45 });
            ton(th, 'schlag'); ton(th + 0.02, 'aua', { stimme: b.stimme });
            const dx = b.p.x - a.p.x, dz = b.p.z - a.p.z, l = Math.hypot(dx, dz) || 1;
            const kb = w.optZahl(['stark', 'staerke', 'kraft'], 1);
            if (kb > 2.5 && !b.liegt) schleudern(b, th, [dx / l * kb * 2.2, 3 + kb, dz / l * kb * 2.2], kb > 4);
            else if (!b.liegt) {
              const von = posVon(b);
              const ziel = { x: b.p.x + dx / l * 0.7 * kb, z: b.p.z + dz / l * 0.7 * kb };
              ziel.y = W.boden(ziel.x, ziel.z, th, Math.round(von.y + 2));
              b.segs.push({ typ: 'weg', t0: th, t1: th + 0.25, von, zu: ziel, yaw0: b.yaw, yaw1: b.yaw, stil: 'rueck', tempo: 0, hoehen: new Float32Array([von.y, ziel.y]) });
              b.segs.push({ typ: 'sprung', t0: th, t1: th + 0.25, h: 0.35 });
              b.p = ziel;
            }
          }
          return d;
        }
        case 'faellt': case 'stirbt': case 'kippt': {
          w.flag(['um', 'hin']);
          const d = w.dauer(0.6);
          if (!a.liegt) { a.zust.push({ key: 'liegen', t0: t, t1: t + d, von: 0, zu: 1 }); a.liegt = true; }
          if (verb === 'stirbt') { a.gesten.push({ typ: 'aua', t0: t, t1: t + 0.6 }); ton(t, 'aua', { stimme: a.stimme }); }
          ton(t + d * 0.9, 'landen');
          return d;
        }
        case 'steht': case 'erhebt': {
          w.flag(['auf', 'sich']);
          const d = w.dauer(0.6);
          if (a.liegt) { a.zust.push({ key: 'liegen', t0: t, t1: t + d, von: 1, zu: 0 }); a.liegt = false; }
          if (a.sitzt) { a.zust.push({ key: 'sitzen', t0: t, t1: t + d, von: 1, zu: 0 }); a.sitzt = false; }
          return d;
        }
        case 'setzt': case 'sitzt': {
          w.flag(['sich', 'hin']);
          const d = w.dauer(0.5);
          if (!a.sitzt) { a.zust.push({ key: 'sitzen', t0: t, t1: t + d, von: 0, zu: 1 }); a.sitzt = true; }
          return d;
        }
        case 'schlaeft': {
          const d = w.dauer(3);
          if (!a.liegt) { a.zust.push({ key: 'liegen', t0: t, t1: t + 0.6, von: 0, zu: 1 }); a.liegt = true; }
          a.reden.push({ t0: t + 0.6, t1: t + d, text: 'Zzz…', denkt: true });
          return d;
        }
        case 'tanzt': { const d = w.dauer(3); a.gesten.push({ typ: 'tanzen', t0: t, t1: t + d }); return d; }
        case 'jubelt': case 'feiert': { const d = w.dauer(1.6); a.gesten.push({ typ: 'jubeln', t0: t, t1: t + d }); ton(t, 'jubel', { stimme: a.stimme }); return d; }
        case 'lacht': { const d = w.dauer(1.4); a.gesten.push({ typ: 'lachen', t0: t, t1: t + d }); ton(t, 'lachen', { stimme: a.stimme }); return d; }
        case 'weint': { const d = w.dauer(2); a.gesten.push({ typ: 'weinen', t0: t, t1: t + d }); return d; }
        case 'zeigt': {
          const d = w.dauer(1.5);
          const z = zielLesen(w, t, false);
          if (z) { const p = zielPunkt(z, t); drehe(a, t, winkelZu(a, p[0], p[2]), 0.3); }
          a.gesten.push({ typ: 'zeigen', t0: t, t1: t + d });
          return d;
        }
        case 'erschrickt': case 'zuckt': { const d = w.dauer(0.7); a.gesten.push({ typ: 'schreck', t0: t, t1: t + d }); a.segs.push({ typ: 'sprung', t0: t, t1: t + 0.35, h: 0.5 }); ton(t, 'schreck', { stimme: a.stimme }); return d; }
        case 'sagt': case 'ruft': case 'fluestert': case 'denkt': case 'schreit': case 'spricht': case 'fragt': {
          const txt = w.text();
          if (txt === null) throw new Error('Text in Anführungszeichen fehlt, z. B. steve sagt "Hallo!"');
          const d = w.dauer(Math.min(7, Math.max(1.6, 0.9 + txt.length * 0.055)));
          a.reden.push({ t0: t, t1: t + d, text: txt, denkt: verb === 'denkt', laut: verb === 'ruft' || verb === 'schreit', leise: verb === 'fluestert' });
          if (verb !== 'denkt') {
            a.gesten.push({ typ: 'reden', t0: t, t1: t + Math.min(d, 0.25 + txt.length * 0.06) });
            const silben = Math.max(1, Math.round(txt.replace(/[^a-zäöüß]/gi, '').length / 2.6));
            const schritt = 0.085;
            for (let i = 0; i < Math.min(silben, Math.floor((d * 0.8) / schritt)); i++) {
              ton(t + i * schritt, 'stimme', { stimme: a.stimme * (a.tier ? 0.7 : 1), seed: i + BF.hash(txt), vol: verb === 'fluestert' ? 0.35 : verb === 'ruft' || verb === 'schreit' ? 1.1 : 0.75 });
            }
          }
          return d;
        }
        case 'baut': case 'setzt_block': case 'platziert': {
          if (w.pk() === 'ab') { w.nimm(); w.t.unshift({ s: 'abbauen', q: false }); return figurAktion(a, w, t); }
          const d = w.dauer(0.4);
          let typ = null;
          if (!w.istZahl()) { const n = w.wort(); typ = BF.typName(n); if (typ === undefined) throw new Error(`Unbekannter Block „${n}“`); }
          w.fuell();
          const p = mehrereZahlen(w, 3);
          if (!typ && !w.leer) { const n = w.wort(); typ = BF.typName(n); if (typ === undefined) throw new Error(`Unbekannter Block „${n}“`); }
          if (!typ) typ = 'bruchstein';
          drehe(a, t, winkelZu(a, p[0], p[2]), 0.15);
          a.gesten.push({ typ: 'schlag', t0: t, t1: t + 0.3 });
          W.setze(p[0], p[1], p[2], typ, t + 0.15);
          ton(t + 0.15, 'plopp');
          return d;
        }
        case 'abbauen': case 'graebt': case 'mined': case 'zerstoert': case 'hackt': {
          w.flag(['ab', 'weg']);
          const d = w.dauer(1.0);
          const p = mehrereZahlen(w, 3).map(Math.round);
          drehe(a, t, winkelZu(a, p[0], p[2]), 0.15);
          a.gesten.push({ typ: 'abbauen', t0: t, t1: t + d });
          const typ = W.typ(p[0], p[1], p[2], t + d);
          for (let s = t + 0.1; s < t + d; s += 0.25) ton(s, 'kratzen');
          if (typ) {
            W.setze(p[0], p[1], p[2], null, t + d);
            F.effekte.push({ typ: 'bruch', t0: t + d, t1: t + d + 1, pos: [p[0], p[1] + 0.5, p[2]], farbe: BF.TYPEN[typ].farbe, seed: p[0] * 31 + p[2] });
            ton(t + d, 'bruch');
          }
          return d;
        }
        case 'nimmt': case 'haelt': case 'zieht': case 'zueckt': case 'holt': {
          const d = w.dauer(0.3);
          w.flag(['raus', 'heraus', 'ein', 'einen', 'eine', 'sein', 'seine', 'ihr', 'ihre']);
          const it = itemName(w.wort() || 'nichts');
          a.items.push({ t0: t, item: it });
          ton(t, 'plopp', { vol: 0.4 });
          return d;
        }
        case 'steckt': case 'legt': { w.flag(['weg', 'ab', 'ein']); a.items.push({ t0: t, item: null }); return 0.3; }
        case 'verschwindet': {
          const d = w.dauer(0.4);
          a.sicht.push({ t0: t, t1: t + d, von: 1, zu: 0 });
          F.effekte.push({ typ: 'rauch', t0: t, t1: t + 1, pos: [a.p.x, a.p.y + 0.9, a.p.z], seed: 3 });
          a.sichtbar = false; ton(t, 'puff');
          return d;
        }
        case 'erscheint': case 'taucht': {
          const d = w.dauer(0.4);
          w.flag(['auf']);
          const z = zielLesen(w, t, false);
          if (z) {
            const p = zielPunkt(z, t);
            const y = z.p && z.p[1] !== null ? z.p[1] : W.boden(p[0], p[2], t);
            a.segs.push({ typ: 'tele', t0: t, t1: t, zu: { x: p[0], y, z: p[2] } });
            a.p = { x: p[0], y, z: p[2] };
          }
          a.sicht.push({ t0: t, t1: t + d, von: 0, zu: 1 });
          F.effekte.push({ typ: 'rauch', t0: t, t1: t + 1, pos: [a.p.x, a.p.y + 0.9, a.p.z], seed: 4 });
          a.sichtbar = true; ton(t, 'puff');
          return d;
        }
        case 'wirft': {
          const n = w.wort();
          const typ = BF.typName(n);
          if (!typ) throw new Error(`Unbekannter Block „${n}“`);
          const z = zielLesen(w, t);
          const p = zielPunkt(z, t);
          const ziel = z.p && z.p[1] === null ? [p[0], p[1] - 1, p[2]] : p;
          drehe(a, t, winkelZu(a, ziel[0], ziel[2]), 0.15);
          a.gesten.push({ typ: 'schlag', t0: t, t1: t + 0.35 });
          const start = [a.p.x + Math.sin(a.yaw) * 0.6, a.p.y + 1.5, a.p.z + Math.cos(a.yaw) * 0.6];
          F.koerper.push({ t0: t + 0.15, typ, pos: start, vel: wurf(start, ziel, 2.5), dreh: [5, 3, 2] });
          ton(t + 0.12, 'schwung');
          return 0.4;
        }
        case 'isst': { const d = w.dauer(1.5); a.gesten.push({ typ: 'essen', t0: t, t1: t + d }); for (let s = t; s < t + d; s += 0.3) ton(s, 'mampf'); return d; }
        case 'wartet': return w.dauer(w.zahl(1));
        default:
          throw new Error(`„${verb}“ kenne ich nicht als Aktion für ${a.anzeige}`);
      }
    }

    function wurf(von, nach, hoehe) {
      const g = F.schwerkraft;
      const scheitel = Math.max(von[1], nach[1]) + hoehe;
      const vy = Math.sqrt(2 * g * (scheitel - von[1]));
      const tUp = vy / g, tDown = Math.sqrt(2 * Math.max(0.01, scheitel - nach[1]) / g);
      const tt = tUp + tDown;
      return [(nach[0] - von[0]) / tt, vy, (nach[2] - von[2]) / tt];
    }

    function blockLesen(w) {
      // "block stein 1 2 3" oder "block 1 2 3 stein"
      let typ, p;
      if (w.istZahl()) { p = mehrereZahlen(w, 3); const n = w.wort(); typ = BF.typName(n); if (typ === undefined) throw new Error(`Unbekannter Block „${n}“`); }
      else { const n = w.wort(); typ = BF.typName(n); if (typ === undefined) throw new Error(`Unbekannter Block „${n}“`); w.fuell(); p = mehrereZahlen(w, 3); }
      return { typ, p: p.map(Math.round) };
    }

    function setzeBlock(x, y, z, typ, t) {
      if (typ && BF.TYPEN[typ].schwer && !W.fest(x, y - 1, z, t)) {
        F.koerper.push({ t0: t, typ, pos: [x, y + 0.5, z], vel: [0, 0, 0], dreh: [0, 0, 0] });
        return;
      }
      W.setze(x, y, z, typ, t);
    }

    function bauen(w, t) {
      const was = w.wort();
      const rr = BF.rng(Math.floor(t * 1000) + 77);
      const mat = n => { const v = w.optWort([n]); if (!v) return null; const t2 = BF.typName(norm(v)); if (!t2) throw new Error(`Unbekannter Block „${v}“`); return t2; };
      const set = (x, y, z, ty, nurLeer) => { if (nurLeer && W.typ(x, y, z, t)) return; W.setze(x, y, z, ty, t); };
      if (was === 'baum') {
        const hoehe = w.optZahl(['hoehe'], 0);
        w.fuell();
        const x = Math.round(w.zahl()), z = Math.round(w.zahl());
        baum(W, x, z, t, hoehe, rr, set);
        return 0;
      }
      if (was === 'haus') {
        const B = Math.round(w.optZahl(['breite'], 7)), D = Math.round(w.optZahl(['tiefe'], 6)), H = Math.round(w.optZahl(['hoehe'], 4));
        const wand = mat('wand') || mat('material') || 'bretter', dach = mat('dach') || 'dunkle_bretter', ecke = mat('ecke') || 'holz', boden = mat('boden') || 'bretter';
        w.fuell();
        const x0 = Math.round(w.zahl()), z0 = Math.round(w.zahl());
        const y0 = W.boden(x0, z0, t);
        const xa = x0 - Math.floor(B / 2), za = z0 - Math.floor(D / 2);
        for (let x = xa; x < xa + B; x++) for (let z = za; z < za + D; z++) {
          W.setze(x, y0 - 1, z, boden, t);
          for (let y = y0; y < y0 + H; y++) {
            const rand = x === xa || x === xa + B - 1 || z === za || z === za + D - 1;
            const eckig = (x === xa || x === xa + B - 1) && (z === za || z === za + D - 1);
            if (!rand) { W.setze(x, y, z, null, t); continue; }
            const tuer = z === za + D - 1 && x === x0 && y < y0 + 2;
            const fenster = !eckig && y === y0 + 1 && ((z === za + D - 1 && Math.abs(x - x0) === 2) || ((x === xa || x === xa + B - 1) && (z - za) % 2 === 1 && z !== za && z !== za + D - 1));
            if (tuer) { W.setze(x, y, z, null, t); continue; }
            W.setze(x, y, z, eckig ? ecke : fenster ? 'glas' : wand, t);
          }
        }
        // Satteldach
        const stufen = Math.ceil(D / 2) + 1;
        for (let s = 0; s < stufen; s++) {
          for (let x = xa - 1; x <= xa + B; x++) {
            W.setze(x, y0 + H + s, za - 1 + s, dach, t);
            W.setze(x, y0 + H + s, za + D - s, dach, t);
          }
          for (const x of [xa, xa + B - 1]) for (let z = za + s; z <= za + D - 1 - s; z++) W.setze(x, y0 + H + s, z, wand, t);
        }
        W.setze(x0 + Math.floor(B / 2) - 1, y0, za + 1, 'werkbank', t);
        return 0;
      }
      if (was === 'turm') {
        const H = Math.round(w.optZahl(['hoehe'], 9)), R = Math.round(w.optZahl(['breite', 'radius'], 2));
        const m = mat('material') || 'steinziegel';
        w.fuell();
        const x0 = Math.round(w.zahl()), z0 = Math.round(w.zahl());
        const y0 = W.boden(x0, z0, t);
        for (let x = x0 - R; x <= x0 + R; x++) for (let z = z0 - R; z <= z0 + R; z++) {
          const rand = Math.abs(x - x0) === R || Math.abs(z - z0) === R;
          for (let y = y0; y < y0 + H; y++) if (rand) W.setze(x, y, z, (y - y0) % 4 === 2 && (x === x0 || z === z0) ? 'glas' : m, t);
          if (rand && (x + z) % 2 === 0) W.setze(x, y0 + H, z, m, t);
          W.setze(x, y0 + H - 1, z, m, t);
        }
        for (let y = y0; y < y0 + 2; y++) W.setze(x0, y, z0 + R, null, t);
        return 0;
      }
      if (was === 'mauer' || was === 'wand') {
        const H = Math.round(w.optZahl(['hoehe'], 3));
        const m = mat('material') || mat('aus') || 'bruchstein';
        w.fuell();
        const [x1, z1, x2, z2] = mehrereZahlen(w, 4).map(Math.round);
        const n = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
        for (let i = 0; i <= n; i++) {
          const x = Math.round(x1 + (x2 - x1) * i / (n || 1)), z = Math.round(z1 + (z2 - z1) * i / (n || 1));
          const y0 = W.boden(x, z, t);
          for (let y = 0; y < H; y++) W.setze(x, y0 + y, z, m, t);
        }
        return 0;
      }
      if (was === 'pyramide') {
        const B = Math.round(w.optZahl(['breite', 'groesse'], 9));
        const m = mat('material') || 'sand';
        w.fuell();
        const x0 = Math.round(w.zahl()), z0 = Math.round(w.zahl());
        const y0 = W.boden(x0, z0, t);
        for (let s = 0; s * 2 < B; s++) {
          const r = Math.floor(B / 2) - s;
          for (let x = x0 - r; x <= x0 + r; x++) for (let z = z0 - r; z <= z0 + r; z++) W.setze(x, y0 + s, z, m, t);
        }
        return 0;
      }
      if (was === 'turmstapel' || was === 'saeule' || was === 'stapel') {
        const H = Math.round(w.optZahl(['hoehe'], 6));
        const m = mat('material') || 'sand';
        w.fuell();
        const x0 = Math.round(w.zahl()), z0 = Math.round(w.zahl());
        const y0 = W.boden(x0, z0, t);
        for (let y = 0; y < H; y++) W.setze(x0, y0 + y, z0, m, t);
        return 0;
      }
      if (was === 'tntfeld' || was === 'tntlager') {
        const B = Math.round(w.optZahl(['breite', 'groesse'], 3));
        const H = Math.round(w.optZahl(['hoehe'], 1));
        w.fuell();
        const x0 = Math.round(w.zahl()), z0 = Math.round(w.zahl());
        const y0 = W.boden(x0, z0, t);
        const r = Math.floor(B / 2);
        for (let x = x0 - r; x <= x0 + r; x++) for (let z = z0 - r; z <= z0 + r; z++) for (let y = 0; y < H; y++) W.setze(x, y0 + y, z, 'tnt', t);
        return 0;
      }
      throw new Error(`„baue ${was}“ gibt es nicht. Möglich: baum, haus, turm, mauer, pyramide, saeule, tntfeld`);
    }

    function kameraBefehl(w, t) {
      const was = w.pk();
      const zielOpt = () => {
        const i = w.finde(['schaut', 'blick', 'blickt', 'sieht', 'guckt']);
        if (i < 0) return null;
        const rest = new Worte(w.t.splice(i));
        rest.nimm();
        return zielLesen(rest, t);
      };
      if (was === 'bei' || was === 'auf' || w.istZahl()) {
        if (was === 'bei') w.nimm();
        if (was === 'auf') { w.nimm(); const z = zielLesen(w, t); const d = w.dauer(0.6); F.kamera.push({ typ: 'blick', t0: t, t1: t + d, ziel: z }); return d; }
        const ziel = zielOpt();
        const p = mehrereZahlen(w, 3);
        F.kamera.push({ typ: 'setze', t0: t, pos: p, ziel });
        return 0;
      }
      w.nimm();
      switch (was) {
        case 'faehrt': case 'fahrt': case 'fliegt': case 'bewegt': case 'gleitet': {
          const d = w.dauer(3);
          const ziel = zielOpt();
          w.fuell();
          const p = mehrereZahlen(w, 3);
          const linear = w.flag(['linear', 'gleichmaessig']);
          F.kamera.push({ typ: 'fahrt', t0: t, t1: t + d, pos: p, ziel, linear });
          return d;
        }
        case 'folgt': case 'verfolgt': {
          const abstand = w.optZahl(['abstand', 'entfernung'], 6);
          const hoehe = w.optZahl(['hoehe'], 2.5);
          let seite = null;
          for (const s of ['hinten', 'vorne', 'links', 'rechts', 'seite', 'oben']) if (w.flag([s])) seite = s === 'seite' ? 'rechts' : s;
          w.fuell();
          const n = w.wort();
          if (!F.akteure[n] && F.objekte.some(o => o.name === n)) { F.kamera.push({ typ: 'folgt', t0: t, objekt: n, abstand, hoehe, seite: null }); return 0; }
          if (!F.akteure[n]) throw new Error(`Figur „${n}“ gibt es nicht`);
          F.kamera.push({ typ: 'folgt', t0: t, akteur: n, abstand, hoehe, seite });
          return 0;
        }
        case 'kreist': case 'dreht': case 'umkreist': {
          const d = w.dauer(6);
          const radius = w.optZahl(['radius', 'abstand'], 7);
          const hoehe = w.optZahl(['hoehe'], 3);
          const runden = w.optZahl(['runden', 'mal'], 1);
          const links = w.flag(['links']);
          w.flag(['rechts']);
          const z = zielLesen(w, t);
          F.kamera.push({ typ: 'kreist', t0: t, t1: t + d, ziel: z, radius, hoehe, runden: runden * (links ? -1 : 1) });
          return d;
        }
        case 'schaut': case 'blickt': case 'guckt': case 'sieht': case 'schwenkt': {
          const d = w.dauer(0.6);
          const z = zielLesen(w, t);
          F.kamera.push({ typ: 'blick', t0: t, t1: t + d, ziel: z });
          return d;
        }
        case 'nah': case 'nahaufnahme': case 'gesicht': case 'close': {
          const abstand = w.optZahl(['abstand'], 2.3);
          w.fuell();
          const n = w.wort();
          if (!F.akteure[n]) throw new Error(`Figur „${n}“ gibt es nicht`);
          F.kamera.push({ typ: 'nah', t0: t, akteur: n, abstand });
          return 0;
        }
        case 'schulter': case 'ueberschulter': {
          w.fuell();
          const n = w.wort();
          w.fuell();
          const m = w.wort();
          if (!F.akteure[n] || !F.akteure[m]) throw new Error('kamera schulter braucht zwei Figuren: kamera schulter steve alex');
          F.kamera.push({ typ: 'schulter', t0: t, akteur: n, ziel: m });
          return 0;
        }
        case 'ego': case 'augen': case 'sicht': {
          w.fuell();
          const n = w.wort();
          if (!F.akteure[n]) throw new Error(`Figur „${n}“ gibt es nicht`);
          F.kamera.push({ typ: 'ego', t0: t, akteur: n });
          return 0;
        }
        case 'totale': case 'weit': case 'uebersicht': {
          const sicht = Object.values(F.akteure).filter(a => a.sichtbar);
          F.kamera.push(Object.assign({ typ: 'setze', t0: t }, totale(sicht)));
          return 0;
        }
        case 'zoom': case 'fov': case 'sichtfeld': {
          const d = w.dauer(0);
          const f = w.zahl(70);
          F.fov.push({ t0: t, t1: t + d, fov: f });
          return d;
        }
        case 'wackelt': case 'wackeln': case 'bebt': {
          const d = w.dauer(0.8);
          const s = w.optZahl(['staerke', 'stark'], w.zahl(0.6));
          F.wackeln.push({ t0: t, t1: t + d, staerke: s });
          return 0;
        }
        default:
          throw new Error(`„kamera ${was}“ kenne ich nicht`);
      }
    }

    function totale(liste) {
      if (!liste.length) return { pos: [0, 7, 16], ziel: { p: [0, 1, 0] } };
      let cx = 0, cy = 0, cz = 0;
      liste.forEach(a => { cx += a.p.x; cy += a.p.y; cz += a.p.z; });
      cx /= liste.length; cy /= liste.length; cz /= liste.length;
      let r = 2;
      liste.forEach(a => { r = Math.max(r, Math.hypot(a.p.x - cx, a.p.z - cz)); });
      return { pos: [cx + r * 0.25, cy + 2.5 + r * 0.35, cz + 5 + r * 1.5], ziel: { p: [cx, cy + 1.1, cz] } };
    }

    F.objekte = []; F.ueber = []; F.zeilen = [];
    const hilfe = { F, W, Worte, zielLesen, zielPunkt, ton, farbeWert, mehrereZahlen, norm, zufall, ende: x => { ende = Math.max(ende, x); } };
    // ---------- Zeilen abarbeiten ----------
    const zeilen = text.split(/\r?\n/);
    for (let zi = 0; zi < zeilen.length; zi++) {
      let z = zeilen[zi];
      const k = z.search(/(^|\s)(#\s|\/\/)/);
      if (/^\s*#/.test(z)) z = '';
      else if (k >= 0) z = z.slice(0, k);
      z = z.trim();
      if (!z) continue;
      try {
        let parallel = false, versatz = null;
        const mv = /^[&+]\s*(\d+(?:[.,]\d+)?)\s+/.exec(z);
        if (mv) { parallel = true; versatz = parseFloat(mv[1].replace(',', '.')); z = z.slice(mv[0].length).trim(); }
        else if (z[0] === '&' || z[0] === '+') { parallel = true; z = z.slice(1).trim(); }
        const toks = zerlege(z);
        // "@5" setzt die Zeit fest
        if (toks.length && /^@/.test(toks[0].s)) {
          const s = toks.shift().s.slice(1);
          const v = s ? pz(s) : pz(toks.shift().s);
          if (isNaN(v)) throw new Error('Nach @ muss eine Zeit kommen, z. B. @5');
          T = v; letzterStart = v; anker = v;
          if (!toks.length) continue;
        }
        const w = new Worte(toks);
        let befehl = w.pk();
        if (befehl === 'gleichzeitig' || befehl === 'und' || befehl === 'dabei') { w.nimm(); parallel = true; befehl = w.pk(); }
        if (befehl === 'dann' || befehl === 'danach') { w.nimm(); befehl = w.pk(); }
        // Bild und Sprache gleichzeitig: Folgt auf eine Bewegung (Zoom, Färben, Laden …) ein Sprecher-Satz,
        // beginnt der Satz zusammen mit der Bewegung statt erst danach.
        const istSprecher = ['sprecher', 'erzaehler', 'erzaehlerin', 'vorlesen', 'sprich'].includes(befehl);
        if (!parallel && istSprecher && begleitAnimation && versatz === null) { parallel = true; letzterStart = begleitAnimation.start; }
        const start = versatz !== null ? anker + versatz : parallel ? letzterStart : T;
        if (!parallel) anker = start;
        if (BEGLEITBAR.has(befehl)) { if (!parallel || !begleitAnimation) begleitAnimation = { start }; }
        else if (!parallel || istSprecher) begleitAnimation = null;
        F.zeilen.push({ zeile: zi + 1, t: start });
        abarbeiten(start);
        let dauer = 0;
        if (!F.akteure[befehl] && BF.objektAktion && F.objekte.some(o => o.name === befehl)) {
          w.nimm();
          dauer = BF.objektAktion(F.objekte.filter(o => o.name === befehl), w, start, hilfe) || 0;
        } else if (F.akteure[befehl]) {
          w.nimm();
          dauer = figurAktion(F.akteure[befehl], w, start) || 0;
        } else {
          w.nimm();
          dauer = befehlAusfuehren(befehl, w, start) || 0;
        }
        letzterStart = start;
        const e = start + dauer;
        T = parallel ? Math.max(T, e) : e;
        ende = Math.max(ende, e);
      } catch (err) {
        F.fehler.push({ zeile: zi + 1, text: err.message });
      }
    }

    function befehlAusfuehren(befehl, w, t) {
      switch (befehl) {
        case 'film': case 'aufloesung': case 'qualitaet': case 'fps': case 'bilder': {
          if (befehl === 'fps' || befehl === 'bilder') { F.fps = clamp(Math.round(w.zahl()), 10, 120); return 0; }
          const titel = w.optWort(['titel', 'name']);
          if (titel) F.titel = titel;
          const fps = w.optZahl(['fps', 'bilder']);
          if (fps) F.fps = clamp(Math.round(fps), 10, 120);
          const d = w.optZahl(['dauer', 'laenge']);
          if (d) F.festeDauer = d;
          const b = w.optZahl(['breite']), h = w.optZahl(['hoehe']);
          if (b) F.breite = Math.round(b);
          if (h) F.hoehe = Math.round(h);
          while (!w.leer) {
            const r = w.wort();
            const P = { '4k': [3840, 2160], uhd: [3840, 2160], '2160p': [3840, 2160], '1440p': [2560, 1440], '2k': [2560, 1440], '1080p': [1920, 1080], fullhd: [1920, 1080], hd: [1280, 720], '720p': [1280, 720], '480p': [854, 480], hochkant: [1080, 1920], short: [1080, 1920], tiktok: [1080, 1920], quadrat: [1080, 1080] };
            if (P[r]) { [F.breite, F.hoehe] = P[r]; continue; }
            const m = /^(\d+)x(\d+)$/.exec(r || '');
            if (m) { F.breite = +m[1]; F.hoehe = +m[2]; continue; }
          }
          F.breite = clamp(F.breite - (F.breite % 2), 160, 7680);
          F.hoehe = clamp(F.hoehe - (F.hoehe % 2), 120, 4320);
          return 0;
        }
        case 'welt': {
          const o = Object.assign({}, F.weltOpt);
          o.groesse = Math.round(clamp(w.optZahl(['groesse', 'breite'], o.groesse), 8, 160));
          o.seed = Math.round(w.optZahl(['seed', 'samen', 'zufall'], o.seed));
          const b = w.optWort(['boden']);
          if (b) { const tt = BF.typName(norm(b)); if (!tt) throw new Error(`Unbekannter Block „${b}“`); o.boden = tt; }
          if (w.flag(['ohnebaeume', 'keinebaeume'])) o.baeume = false;
          const wk = w.optWort(['wolken']);
          if (wk) o.wolken = !['aus', 'nein', '0'].includes(norm(wk));
          const art = w.wort() || 'flach';
          const ARTEN = { flach: 'flach', huegel: 'huegel', huegelig: 'huegel', wald: 'huegel', insel: 'insel', leer: 'leer', nichts: 'leer', wueste: 'flach', schnee: 'flach', nether: 'flach' };
          if (!ARTEN[art]) throw new Error(`Weltart „${art}“ gibt es nicht (flach, huegel, insel, leer, wueste, schnee, nether)`);
          o.art = ARTEN[art];
          if (art === 'wueste' && !b) o.boden = 'sand';
          if (art === 'schnee' && !b) o.boden = 'schneegras';
          if (art === 'nether' && !b) { o.boden = 'netherrack'; F.himmel.unshift({ t0: -1, t1: -1, zu: 'nether' }); }
          F.weltOpt = o;
          erzeugeWelt(F, W, o);
          weltGesetzt = true;
          return 0;
        }
        case 'himmel': case 'tageszeit': case 'wetter': {
          const d = w.dauer(0);
          const s = w.wort();
          const H = ['tag', 'mittag', 'morgen', 'abend', 'nacht', 'sonnenuntergang', 'nether', 'ende', 'gewitter', 'bewoelkt'];
          if (!H.includes(s)) throw new Error(`Himmel „${s}“ gibt es nicht: ${H.join(', ')}`);
          F.himmel.push({ t0: t, t1: t + d, zu: s === 'mittag' ? 'tag' : s === 'sonnenuntergang' ? 'abend' : s });
          return d;
        }
        case 'regen': case 'schnee_faellt': case 'schneefall': {
          const d = w.dauer(5);
          const aus = w.flag(['aus', 'stopp']);
          F.effekte.push({ typ: befehl === 'regen' ? 'regen' : 'schneefall', t0: t, t1: aus ? t : t + d });
          return 0;
        }
        case 'standardskin': case 'meinskin': { if (w.flag(['aus', 'nein'])) { F.standardSkin = null; return 0; } const d = w.text(); if (!d) throw new Error('So: standardskin "mein-skin.png"'); F.standardSkin = d; return 0; }
        case 'schwerkraft': F.schwerkraft = w.zahl(); return 0;
        case 'abprall': case 'huepfen': F.abprall = clamp(w.zahl(), 0, 0.95); return 0;
        case 'block': case 'setze': case 'platziere': {
          const { typ, p } = blockLesen(w);
          setzeBlock(p[0], p[1], p[2], typ, t);
          if (t > 0) ton(t, 'plopp', { vol: 0.5 });
          return 0;
        }
        case 'weg': case 'entferne': case 'loesche': case 'abbau': {
          w.fuell();
          const p = mehrereZahlen(w, 3).map(Math.round);
          const typ = W.typ(p[0], p[1], p[2], t);
          W.setze(p[0], p[1], p[2], null, t);
          if (typ && t > 0) { F.effekte.push({ typ: 'bruch', t0: t, t1: t + 1, pos: [p[0], p[1] + 0.5, p[2]], farbe: BF.TYPEN[typ].farbe, seed: p[0] + p[2] * 7 }); ton(t, 'bruch'); }
          return 0;
        }
        case 'fuelle': case 'fuell': case 'quader': case 'flaeche': {
          const hohl = w.flag(['hohl']);
          const d = w.dauer(0);
          let typ;
          if (w.istZahl()) { const p = mehrereZahlen(w, 6); typ = BF.typName(w.wort()); return fuelle(p, typ, hohl, d); }
          const n = w.wort(); typ = BF.typName(n);
          if (typ === undefined) throw new Error(`Unbekannter Block „${n}“`);
          w.fuell();
          return fuelle(mehrereZahlen(w, 6), typ, hohl, d);
          function fuelle(p, ty, hohl2, dauer) {
            const [x1, y1, z1, x2, y2, z2] = p.map(Math.round);
            const xs = [Math.min(x1, x2), Math.max(x1, x2)], ys = [Math.min(y1, y2), Math.max(y1, y2)], zs = [Math.min(z1, z2), Math.max(z1, z2)];
            const anzahl = (xs[1] - xs[0] + 1) * (ys[1] - ys[0] + 1) * (zs[1] - zs[0] + 1);
            if (anzahl > 60000) throw new Error('Zu viele Blöcke auf einmal (höchstens 60000)');
            let i = 0;
            for (let y = ys[0]; y <= ys[1]; y++) for (let x = xs[0]; x <= xs[1]; x++) for (let z = zs[0]; z <= zs[1]; z++) {
              const rand = x === xs[0] || x === xs[1] || y === ys[0] || y === ys[1] || z === zs[0] || z === zs[1];
              const tt = t + (dauer ? (i++ / anzahl) * dauer : 0);
              if (hohl2 && !rand) setzeBlock(x, y, z, null, tt);
              else setzeBlock(x, y, z, ty, tt);
            }
            return dauer;
          }
        }
        case 'baue': case 'bau': return bauen(w, t);
        case 'figur': case 'tier': case 'person': case 'neu': return figurAnlegen(w, t);
        case 'kamera': case 'cam': return kameraBefehl(w, t);
        case 'warte': case 'pause': {
          // kurze Erzählpausen (bis 1,5 s) werden beim Sprechtempo "flott" mitgekürzt; längere sind Absicht
          const d = w.dauer(w.zahl(1));
          const T = BF.SPRECHTEMPO && BF.SPRECHTEMPO[BF.sprechTempoWahl];
          return T && d <= 1.5 ? d * T.warte : d;
        }
        case 'text': case 'untertitel': case 'titel': case 'ueberschrift': {
          const txt = w.text();
          if (txt === null) throw new Error('Text in Anführungszeichen fehlt');
          const d = w.dauerOderZahl(befehl === 'titel' ? 3 : Math.max(2, 1 + txt.length * 0.06));
          let ort = befehl === 'untertitel' ? 'unten' : befehl === 'titel' ? 'mitte' : 'oben';
          for (const o of ['oben', 'mitte', 'unten']) if (w.flag([o])) ort = o;
          const groesse = w.optZahl(['groesse'], befehl === 'titel' ? 2 : 1);
          const farbe = farbeWert(w.optWort(['farbe'], '#ffffff'));
          for (const alt of F.texte) if (alt.ort === ort && alt.t0 < t && alt.t1 > t) alt.t1 = t + 0.2;
          F.texte.push({ t0: t, t1: t + d, text: txt, ort, groesse, farbe, karte: befehl === 'titel' && w.flag(['schwarz', 'karte']) });
          return befehl === 'titel' ? d : 0;
        }
        case 'einblenden': case 'ausblenden': case 'schwarz': case 'weiss': {
          const d = befehl === 'schwarz' || befehl === 'weiss' ? 0 : w.dauer(1);
          const farbe = befehl === 'weiss' || w.flag(['weiss']) ? 'weiss' : 'schwarz';
          F.blenden.push({ t0: t, t1: t + d, von: befehl === 'einblenden' ? 1 : befehl === 'ausblenden' ? 0 : 1, zu: befehl === 'einblenden' ? 0 : 1, farbe });
          return d;
        }
        case 'explosion': case 'explodiert': case 'boom': {
          const r = w.optZahl(['radius', 'staerke', 'groesse'], 3.5);
          w.fuell();
          const z = zielLesen(w, t);
          const p = zielPunkt(z, t);
          explodiere(p[0], z.akteur ? p[1] - 1.2 : p[1] - (z.p[1] === null ? 1 : 0), p[2], r, t);
          return 0;
        }
        case 'tnt': case 'zuende': case 'zuendet': {
          const f = w.optZahl(['zuender', 'zuendschnur', 'nach', 'zeit'], 3);
          const r = w.optZahl(['radius', 'staerke'], 4);
          w.fuell();
          const p = mehrereZahlen(w, 3).map(Math.round);
          W.setze(p[0], p[1], p[2], null, t);
          F.effekte.push({ typ: 'zuendung', t0: t, t1: t + f, pos: p });
          ton(t, 'zisch', { dauer: f });
          warteschlange.push({ t: t + f, x: p[0], y: p[1], z: p[2], r });
          ende = Math.max(ende, t + f + 2);
          return f;
        }
        case 'rauch': case 'puff': case 'herzen': case 'funken': case 'feuer': case 'magie': case 'wolke': {
          const d = w.dauer(befehl === 'feuer' ? 3 : 1.2);
          w.fuell();
          const z = zielLesen(w, t);
          const p = zielPunkt(z, t);
          const typ = { puff: 'rauch', wolke: 'rauch' }[befehl] || befehl;
          F.effekte.push({ typ, t0: t, t1: t + d, pos: z.akteur ? [p[0], p[1] + 0.3, p[2]] : p, akteur: z.akteur, seed: Math.floor(t * 100) });
          if (typ === 'rauch') ton(t, 'puff');
          if (typ === 'magie') ton(t, 'magie');
          return 0;
        }
        case 'feuerwerk': {
          const n = Math.round(w.optZahl(['anzahl'], 1));
          const farbe = farbeWert(w.optWort(['farbe'], ''));
          w.fuell();
          const x = w.zahl(0), zz = w.zahl(0);
          for (let i = 0; i < n; i++) {
            const tt = t + i * 0.45;
            const ox = x + (n > 1 ? (zufall() - 0.5) * 8 : 0), oz = zz + (n > 1 ? (zufall() - 0.5) * 8 : 0);
            const y0 = W.boden(ox, oz, tt);
            const farben = ['#ff3b3b', '#3bff6b', '#3b8bff', '#ffd23b', '#ff3bd8', '#ffffff'];
            F.effekte.push({ typ: 'feuerwerk', t0: tt, t1: tt + 3.2, pos: [ox, y0, oz], farbe: farbe || farben[Math.floor(zufall() * farben.length)], seed: Math.floor(zufall() * 1e6) });
            ton(tt, 'rakete'); ton(tt + 1.2, 'knall');
            ende = Math.max(ende, tt + 3.2);
          }
          return 0;
        }
        case 'blitz': case 'donner': {
          w.fuell();
          const x = w.zahl(0), zz = w.zahl(0);
          const y0 = W.boden(x, zz, t);
          F.effekte.push({ typ: 'blitz', t0: t, t1: t + 0.5, pos: [x, y0, zz], seed: Math.floor(zufall() * 1e6) });
          F.blitze.push({ t0: t, t1: t + 0.3, staerke: 0.8 });
          ton(t, 'donner');
          return 0;
        }
        case 'fallen': case 'fall': case 'lasse': case 'lass': case 'faellt': {
          w.flag(['fallen']);
          const n = w.wort();
          const typ = BF.typName(n);
          if (!typ) throw new Error(`Unbekannter Block „${n}“`);
          w.fuell();
          const p = mehrereZahlen(w, 3);
          F.koerper.push({ t0: t, typ, pos: [p[0], p[1] + 0.5, p[2]], vel: [0, 0, 0], dreh: [(zufall() - 0.5) * 0.5, 0, (zufall() - 0.5) * 0.5] });
          return 0;
        }
        case 'wirf': case 'schiesse': case 'schleudere': {
          const n = w.wort();
          const typ = BF.typName(n);
          if (!typ) throw new Error(`Unbekannter Block „${n}“`);
          const hoehe = w.optZahl(['hoehe', 'bogen'], 3);
          const vi = w.finde(['von']);
          if (vi < 0) throw new Error('So: wirf stein von x y z nach x y z');
          w.t.splice(vi, 1);
          const von = [w.zahl(), w.zahl(), w.zahl()];
          const z = zielLesen(w, t);
          const p = zielPunkt(z, t);
          const nach = z.p && z.p[1] === null ? [p[0], p[1] - 1, p[2]] : p;
          F.koerper.push({ t0: t, typ, pos: von, vel: wurf(von, nach, hoehe), dreh: [(zufall() - 0.5) * 8, (zufall() - 0.5) * 8, (zufall() - 0.5) * 8] });
          ton(t, 'schwung');
          return 0;
        }
        case 'blockregen': case 'regnet': {
          const d = w.dauer(4);
          const anzahl = Math.round(clamp(w.optZahl(['anzahl', 'menge'], 40), 1, 500));
          const hoehe = w.optZahl(['hoehe'], 18);
          const n = w.wort();
          const bunt = n === 'bunt' || n === 'alles' || n === 'zufall';
          const typ = bunt ? null : BF.typName(n);
          if (!bunt && !typ) throw new Error(`Unbekannter Block „${n}“`);
          w.fuell();
          const [x1, z1, x2, z2] = w.istZahl(3) ? mehrereZahlen(w, 4) : [-6, -6, 6, 6];
          const liste = ['sand', 'kies', 'stein', 'erde', 'bretter', 'gold', 'diamant', 'tnt', 'wolle_rot', 'wolle_blau', 'wolle_gelb', 'smaragd', 'leuchtstein'];
          for (let i = 0; i < anzahl; i++) {
            const tt = t + (i / anzahl) * d + zufall() * 0.05;
            const x = x1 + zufall() * (x2 - x1), z = z1 + zufall() * (z2 - z1);
            F.koerper.push({ t0: tt, typ: typ || liste[Math.floor(zufall() * liste.length)], pos: [x, W.boden(x, z, tt) + hoehe + zufall() * 3, z], vel: [0, -2, 0], dreh: [(zufall() - 0.5) * 5, (zufall() - 0.5) * 5, (zufall() - 0.5) * 5] });
          }
          ende = Math.max(ende, t + d + 3);
          return 0;
        }
        case 'ton': case 'sound': case 'geraeusch': {
          const n = w.wort();
          const OK = ['bruellen', 'stampfen', 'grollen', 'quieken', 'mampf', 'aufprall', 'stimme', 'herzschlag', 'rascheln', 'wind', 'platsch', 'explosion', 'schlag', 'plopp', 'sprung', 'landen', 'puff', 'aua', 'jubel', 'lachen', 'schreck', 'zisch', 'donner', 'rakete', 'knall', 'magie', 'bruch', 'schritt', 'glocke', 'tada', 'trommel', 'fail', 'level', 'muenze', 'schwung'];
          if (!OK.includes(n)) throw new Error(`Ton „${n}“ gibt es nicht: ${OK.join(', ')}`);
          ton(t, n, { vol: w.optZahl(['laut', 'lautstaerke'], 1) });
          return 0;
        }
        case 'musik': {
          const s = w.wort() || 'aus';
          const ST = ['froehlich', 'ruhig', 'spannend', 'episch', 'traurig', 'gruselig', 'aus', 'stopp'];
          if (!ST.includes(s)) throw new Error(`Musik „${s}“ gibt es nicht: ${ST.join(', ')}`);
          F.musik.push({ t0: t, stil: s === 'aus' || s === 'stopp' ? null : s, laut: w.optZahl(['laut', 'lautstaerke'], 1) });
          return 0;
        }
        case 'ende': case 'schluss': F.festeDauer = t; return 0;
        default:
          if (BF.zusatz && BF.zusatz[befehl]) return BF.zusatz[befehl](w, t, hilfe);
          throw new Error(`„${befehl}“ kenne ich nicht. Ist der Name der Figur richtig geschrieben?`);
      }
    }

    abarbeiten(Infinity);
    void weltGesetzt;

    // Kamera am Anfang: Übersicht, wenn nichts anderes gesagt wurde
    F.kamera.sort((a, b) => a.t0 - b.t0);
    if (!F.kamera.length || F.kamera[0].t0 > 0 || F.kamera[0].typ === 'blick') {
      const sicht = Object.values(F.akteure).map(a => ({ p: { x: a.start.x, y: a.start.y, z: a.start.z } }));
      F.kamera.unshift(Object.assign({ typ: 'setze', t0: 0 }, totale(sicht)));
    }
    for (const a of Object.values(F.akteure)) {
      for (const k of ['segs', 'gesten', 'zust', 'reden', 'blicke', 'items', 'sicht']) a[k].sort((x, y) => x.t0 - y.t0);
      for (const s of a.segs) ende = Math.max(ende, s.t1);
    }
    F.himmel.sort((a, b) => a.t0 - b.t0);
    F.W.liste.sort((a, b) => a.t - b.t);
    F.koerper.sort((a, b) => a.t0 - b.t0);
    for (const k of F.koerper) ende = Math.max(ende, k.t0 + 2.5);
    F.dauer = F.festeDauer !== null ? F.festeDauer : Math.max(1, ende + 1);
    for (const f of BF.nachKompilieren || []) { try { f(F); } catch (e) { console.error(e); } } // z. B. Maskottchen
    return F;
  };
})();
