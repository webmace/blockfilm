// Blockfilm – weitere 2D-Objekte im Flat-Look für HyperFrames: Dinosaurier (und Urzeit-Tiere), Geräte, Pflanzen, Bäume.
// Geometrie wie im alten Zeichner (urzeit.js / welt2d.js), aber flach: keine Konturen, Licht- und Schattenflächen.
// Bewegungen, die von der Lage abhängen (Laufen, Blickrichtung, Brüllen, Bildschirm), setzt HF.bewegung[typ] bei jedem Seek.
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const OB = HF.objektGrafik;
  const { hell, dunkel, mische, rgba } = HF.farbe;
  const f3 = v => Math.round(v * 1000) / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const BW = (HF.bewegung = HF.bewegung || {});
  const SF = (stil, f, d) => HF.stilFarbe(stil, f || d);

  // ---------- Dinosaurier ----------
  const SCHWIMMER = ['plesiosaurus', 'ichthyosaurus', 'mosasaurus', 'flugsaurier', 'trilobit', 'fisch', 'qualle'];
  const linie = (a, b, d, f, cls = '') => `<line${cls ? ` class="${cls}"` : ''} x1="${f3(a[0])}" y1="${f3(a[1])}" x2="${f3(b[0])}" y2="${f3(b[1])}" stroke="${f}" stroke-width="${f3(d)}" stroke-linecap="round"/>`;
  const ell = (x, y, rx, ry, f, rot = 0, extra = '') => `<ellipse cx="${f3(x)}" cy="${f3(y)}" rx="${f3(Math.max(0.001, rx))}" ry="${f3(Math.max(0.001, ry))}"${rot ? ` transform="rotate(${f3(rot * 180 / Math.PI)} ${f3(x)} ${f3(y)})"` : ''} fill="${f}"${extra}/>`;
  function schwanzPfad(pts) {
    const oben = [], unten = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      oben.push([pts[i][0] + nx * pts[i][2] / 2, pts[i][1] + ny * pts[i][2] / 2]); unten.push([pts[i][0] - nx * pts[i][2] / 2, pts[i][1] - ny * pts[i][2] / 2]);
    }
    let d = `M${f3(oben[0][0])} ${f3(oben[0][1])}`;
    for (let i = 1; i < oben.length; i++) { const m = oben[i - 1]; d += ` Q${f3(m[0])} ${f3(m[1])} ${f3((m[0] + oben[i][0]) / 2)} ${f3((m[1] + oben[i][1]) / 2)} L${f3(oben[i][0])} ${f3(oben[i][1])}`; }
    for (let i = unten.length - 1; i >= 0; i--) d += ` L${f3(unten[i][0])} ${f3(unten[i][1])}`;
    return d + ' Z';
  }
  function auge(x, y, gr, boese, stil) {
    let s = ell(x, y, gr, gr, '#ffffff') + ell(x + gr * 0.25, y, gr * 0.55, gr * 0.62, stil.palette.schwarz) + ell(x + gr * 0.42, y + gr * 0.25, gr * 0.18, gr * 0.18, '#ffffff');
    if (boese) s += linie([x - gr * 1.1, y + gr * 1.3], [x + gr * 1.2, y + gr * 0.8], gr * 0.5, stil.palette.schwarz);
    return s;
  }

  OB.dino = (o, stil, id) => {
    if (SCHWIMMER.includes(o.art)) return schwimmer(o, stil, id);
    const D = BF.DINO_ARTEN[o.art];
    if (o.skelett) return skelett(o, D, stil, id);
    const k = HF.knallig(stil, o.farbe || D.farbe);
    const fern = dunkel(k, 0.14), bauch = hell(k, 0.16), fleck = dunkel(k, 0.07), bein = dunkel(k, 0.05);
    const P = stil.palette, horn = '#fbf0d6';
    const [kx, ky, krx, kry, krot] = D.koerper;
    const g = o.baby ? 0.55 : 1;
    let s = '';
    // Schatten am Boden (in Bildkoordinaten, vor der Spiegelung)
    const breit = (D.schwanz ? Math.abs(D.schwanz[D.schwanz.length - 1][0]) : 0.5) * 0.5 + krx;
    // Beine hinten (weiter weg, dunkler)
    const beinPaar = (b, farbe, cls) => {
      const [hx, hy, fx, d] = b;
      return `<g class="${cls}">${linie([hx, hy], [fx, d * 0.4], d, farbe)}${ell(fx + 0.02, d * 0.25, d * 0.7, d * 0.32, farbe)}</g>`;
    };
    const zweiBein = (ver, farbe, cls) => {
      const [hx, hy, fx, d] = D.bein;
      return `<g class="${cls}">${ell(hx + ver, hy, d * 1.1, d * 1.5, farbe, 0.3)}${linie([hx + ver + 0.03, hy - d], [fx + ver, 0.03], d * 0.6, farbe)}${ell(fx + ver + 0.04, 0.02, d * 0.7, d * 0.25, farbe)}</g>`;
    };
    if (D.zwei) s += zweiBein(0.05, fern, 'b-fern');
    else { s += beinPaar([D.hinten[0] + 0.05, D.hinten[1], D.hinten[2] + 0.05, D.hinten[3]], fern, 'b-hf'); s += beinPaar([D.vorne[0] + 0.05, D.vorne[1], D.vorne[2] + 0.05, D.vorne[3]], fern, 'b-vf'); }
    // Schwanz (wackelt um seinen Ansatz)
    const S0 = D.schwanz[0];
    let sw = `<path d="${schwanzPfad(D.schwanz)}" fill="${k}"/>`;
    const E = D.schwanz[D.schwanz.length - 1], V = D.schwanz[D.schwanz.length - 2];
    if (D.federn) sw += ell((E[0] + V[0]) / 2, (E[1] + V[1]) / 2, 0.18, 0.05, SF(stil, D.federn), Math.atan2(E[1] - V[1], E[0] - V[0]));
    if (D.platten) for (let i = 0; i < 2; i++) sw += linie([E[0] + 0.05 + i * 0.07, E[1] + 0.01], [E[0] - 0.02 + i * 0.1, E[1] + 0.13], 0.025, horn);
    if (D.panzer) sw += ell(E[0] - 0.04, E[1], 0.09, 0.07, dunkel(k, 0.12));
    s += `<g class="schwanz" data-x="${S0[0]}" data-y="${S0[1]}">${sw}</g>`;
    // Segel und Rückenplatten
    if (D.segel) {
      const n = 7, h = D.flach ? 0.32 : 0.36, segel = HF.knallig(stil, D.segel);
      let d = `M${f3(kx - krx * 0.7)} ${f3(ky + kry * 0.6)}`;
      for (let i = 0; i <= n; i++) { const u = i / n; d += ` L${f3(kx - krx * 0.7 + u * krx * 1.4)} ${f3(ky + kry * 0.7 + Math.sin(u * Math.PI) * h)}`; }
      s += `<path d="${d} L${f3(kx + krx * 0.7)} ${f3(ky + kry * 0.6)} Z" fill="${segel}"/>`;
      for (let i = 1; i < n; i++) { const u = i / n, x = kx - krx * 0.7 + u * krx * 1.4; s += linie([x, ky + kry * 0.6], [x, ky + kry * 0.7 + Math.sin(u * Math.PI) * h * 0.92], 0.012, dunkel(segel, 0.1)); }
    }
    if (D.platten) {
      const pl = HF.knallig(stil, D.platten);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.2 + i * 0.1), x = kx + Math.cos(a) * krx * 0.95, y = ky + Math.sin(a) * kry * 0.95, q = 0.09 + Math.sin(i / 6 * Math.PI) * 0.08;
        s += `<path d="M${f3(x - q * 0.6)} ${f3(y - 0.02)} L${f3(x)} ${f3(y + q * 1.5)} L${f3(x + q * 0.6)} ${f3(y - 0.02)} Z" fill="${i % 2 ? pl : dunkel(pl, 0.08)}" stroke="${i % 2 ? pl : dunkel(pl, 0.08)}" stroke-width="0.02" stroke-linejoin="round"/>`;
      }
    }
    // Körper: Grundfläche, heller Bauch, ein paar Flecken
    let kp = ell(0, 0, krx, kry, k);
    kp += `<clipPath id="${id}k"><ellipse rx="${f3(krx)}" ry="${f3(kry)}"/></clipPath><g clip-path="url(#${id}k)">${ell(krx * 0.1, -kry * 0.75, krx * 0.95, kry * 0.6, bauch)}${[0, 1, 2, 3].map(i => ell(-krx * 0.45 + i * krx * 0.28, kry * 0.5 - (i % 2) * kry * 0.12, krx * 0.07, kry * 0.11, fleck)).join('')}</g>`;
    if (D.panzer) { for (let i = 0; i < 6; i++) { const a = Math.PI * (0.15 + i * 0.14), x = Math.cos(a) * krx * 0.97, y = Math.sin(a) * kry * 0.97; kp += `<path d="M${f3(x - 0.035)} ${f3(y - 0.01)} L${f3(x + Math.cos(a) * 0.04)} ${f3(y + 0.09)} L${f3(x + 0.035)} ${f3(y - 0.01)} Z" fill="${horn}"/>`; } }
    if (D.mammut) for (let i = 0; i < 18; i++) { const x = -krx * 0.85 + (i % 9) * krx * 0.21, y = (i < 9 ? -0.05 : 0.12) * kry * 4; kp += linie([x, y], [x - 0.02, y - 0.08], 0.018, dunkel(k, 0.1)); }
    s += `<g class="koerper" transform="translate(${f3(kx)} ${f3(ky)}) rotate(${f3(krot * 180 / Math.PI)})">${kp}</g>`;
    // Arm
    if (D.arm) {
      const [a, b, d] = D.arm;
      let arm = linie(a, b, d, dunkel(k, 0.04));
      if (D.federn) arm += ell((a[0] + b[0]) / 2 - 0.02, (a[1] + b[1]) / 2 - 0.04, 0.09, 0.035, SF(stil, D.federn), -0.9);
      if (D.vogel) arm += `<path d="M${f3(a[0])} ${f3(a[1])} L${f3(b[0] - 0.12)} ${f3(b[1] - 0.05)} L${f3(b[0] + 0.05)} ${f3(b[1])} Z" fill="${SF(stil, D.federn)}"/>`;
      s += `<g class="arm" data-x="${a[0]}" data-y="${a[1]}">${arm}</g>`;
    }
    // Beine vorne
    if (D.zwei) s += zweiBein(0, bein, 'b-nah');
    else { s += beinPaar(D.hinten, bein, 'b-hn'); s += beinPaar(D.vorne, bein, 'b-vn'); }
    // Hals und Kopf (nicken zusammen)
    let kopf = '';
    if (D.hals) { const [a, b, d] = D.hals; s += `<path class="hals" d="M${f3(a[0])} ${f3(a[1])} Q${f3(a[0] + (b[0] - a[0]) * 0.2)} ${f3(b[1])} ${f3(b[0])} ${f3(b[1])}" stroke="${k}" stroke-width="${f3(d)}" stroke-linecap="round" fill="none"/>`; }
    const [hx, hy, hrx, hry] = D.kopf;
    if (D.horn) kopf += ell(hx - hrx * 0.7, hy + hry * 0.6, hrx * 0.6, hry * 1.7, dunkel(k, 0.06), -0.4) + [0, 1, 2, 3, 4].map(i => { const a = -0.6 + i * 0.5; return ell(hx - hrx * 0.7 + Math.cos(a + 1.4) * hrx * 0.62, hy + hry * 0.6 + Math.sin(a + 1.4) * hry * 1.7, 0.018, 0.018, horn); }).join('');
    if (D.kamm) kopf += linie([hx, hy + hry * 0.5], [hx - hrx * 2.2, hy + hry * 2.2], hry * 0.7, HF.knallig(stil, D.kamm));
    if (D.mammut) kopf += `<path class="ruessel" d="M${f3(hx + hrx * 0.6)} ${f3(hy - hry * 0.2)} Q${f3(hx + hrx * 1.2)} ${f3(hy - hry * 1.4)} ${f3(hx + hrx * 0.9)} ${f3(hy - hry * 2.6)}" stroke="${k}" stroke-width="0.08" stroke-linecap="round" fill="none"/><path d="M${f3(hx + hrx * 0.4)} ${f3(hy - hry * 0.6)} Q${f3(hx + hrx * 2.2)} ${f3(hy - hry * 1.6)} ${f3(hx + hrx * 1.9)} ${f3(hy - hry * 0.2)}" stroke="${horn}" stroke-width="0.035" stroke-linecap="round" fill="none"/>`;
    if (D.fleisch) {
      // Unterkiefer (klappt beim Brüllen auf), Maul, Oberkopf mit Zähnen
      const jx = hx - hrx * 0.6, jy = hy - hry * 0.1;
      let zaehne = '';
      for (let i = 0; i < 5; i++) { const x = hrx * (0.2 + i * 0.28); zaehne += `<path d="M${f3(jx + x)} ${f3(jy - hry * 0.05)} L${f3(jx + x + 0.012)} ${f3(jy + hry * 0.1)} L${f3(jx + x + 0.025)} ${f3(jy - hry * 0.05)} Z" fill="#fff"/>`; }
      kopf += `<g class="kiefer" data-x="${f3(jx)}" data-y="${f3(jy)}">${ell(jx + hrx * 0.75, jy - hry * 0.35, hrx * 0.85, hry * 0.42, dunkel(k, 0.08))}${zaehne}</g>`;
      kopf += `<g class="rachen" opacity="0">${ell(hx + hrx * 0.1, hy - hry * 0.3, hrx * 0.6, hry * 0.3, dunkel(P.rot, 0.25))}</g>`;
      kopf += ell(hx, hy + hry * 0.1, hrx, hry * 0.75, k, D.krokodil ? 0 : 0.05);
      for (let i = 0; i < 6; i++) { const x = hx - hrx * 0.3 + i * hrx * 0.24; kopf += `<path d="M${f3(x)} ${f3(hy - hry * 0.55)} L${f3(x + 0.01)} ${f3(hy - hry * 0.78)} L${f3(x + 0.02)} ${f3(hy - hry * 0.55)} Z" fill="#fff"/>`; }
      kopf += ell(hx - hrx * 0.2, hy + hry * 0.6, hrx * 0.5, hry * 0.25, hell(k, 0.08)) + auge(hx - hrx * 0.2, hy + hry * 0.35, hry * 0.24, D.augenbraue || o.art === 'trex', stil);
    } else {
      kopf += ell(hx, hy, hrx, hry, k, 0.05) + ell(hx - hrx * 0.1, hy + hry * 0.4, hrx * 0.6, hry * 0.35, hell(k, 0.08));
      if (D.horn) {
        for (const [x0, y0, x1, y1, d] of [[hx - hrx * 0.1, hy + hry * 0.6, hx + hrx * 1.1, hy + hry * 1.9, 0.03], [hx + hrx * 0.7, hy + hry * 0.4, hx + hrx * 0.95, hy + hry * 1.0, 0.022]]) kopf += `<path d="M${f3(x0 - d)} ${f3(y0)} L${f3(x1)} ${f3(y1)} L${f3(x0 + d)} ${f3(y0 - d * 0.5)} Z" fill="${horn}"/>`;
        kopf += `<path d="M${f3(hx + hrx * 0.85)} ${f3(hy - hry * 0.1)} L${f3(hx + hrx * 1.25)} ${f3(hy - hry * 0.4)} L${f3(hx + hrx * 0.8)} ${f3(hy - hry * 0.7)} Z" fill="${dunkel(k, 0.2)}"/>`;
      }
      kopf += `<path class="mund" d="M${f3(hx + hrx * 0.95)} ${f3(hy - hry * 0.2)} Q${f3(hx + hrx * 0.4)} ${f3(hy - hry * 0.55)} ${f3(hx - hrx * 0.1)} ${f3(hy - hry * 0.3)}" stroke="${dunkel(k, 0.3)}" stroke-width="0.014" stroke-linecap="round" fill="none"/>`;
      kopf += auge(hx + hrx * 0.15, hy + hry * 0.3, hry * 0.3, false, stil);
    }
    const nx = D.hals ? D.hals[0][0] : hx - hrx, ny = D.hals ? D.hals[0][1] : hy;
    s += `<g class="kopf" data-x="${f3(nx)}" data-y="${f3(ny)}">${kopf}</g>`;
    return {
      k: 1.75,
      svg: `<ellipse cx="0" cy="0.01" rx="${f3(breit * g)}" ry="${f3(0.035 * g)}" fill="rgba(0,0,0,0.16)"/><g class="richtung"><g transform="scale(${g} ${-g})">${s}</g></g>`,
    };
  };

  // Skelett / Fossil: Knochen mit dunklerer Kante (flacher Schatten statt Unschärfe), gleiche Gelenke wie der lebende Dino
  function skelett(o, D, stil, id) {
    const K = '#f6edd6', KS = '#8a6e4e';
    const kn = (a, b, d) => linie(a, b, d + 0.014, KS) + linie(a, b, d, K);
    const g = o.baby ? 0.55 : 1;
    const [kx, ky, krx, kry, krot] = D.koerper;
    let s = '';
    const beinPaar = (b, ver, cls) => `<g class="${cls}">${kn([b[0] + ver, b[1]], [b[2] + ver, 0.02], 0.024)}<circle cx="${f3(b[2] + ver)}" cy="0.02" r="0.02" fill="${K}"/></g>`;
    const zweiBein = (ver, cls) => { const [hx, hy, fx] = D.bein; return `<g class="${cls}">${kn([hx + ver, hy], [hx + ver + 0.05, hy * 0.5], 0.025)}${kn([hx + ver + 0.05, hy * 0.5], [fx + ver, 0.02], 0.022)}<circle cx="${f3(hx + ver + 0.05)}" cy="${f3(hy * 0.5)}" r="0.018" fill="${K}"/></g>`; };
    if (D.zwei) s += zweiBein(0.05, 'b-fern'); else { s += beinPaar(D.hinten, 0.05, 'b-hf'); s += beinPaar(D.vorne, 0.05, 'b-vf'); }
    // Schwanz: Wirbelsäule mit Wirbeln
    const P = D.schwanz;
    let sw = `<polyline points="${P.map(q => f3(q[0]) + ',' + f3(q[1])).join(' ')}" stroke="${KS}" stroke-width="0.034" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="${P.map(q => f3(q[0]) + ',' + f3(q[1])).join(' ')}" stroke="${K}" stroke-width="0.02" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    for (let i = 0; i < 10; i++) { const u = i / 10, a = P[0], b = P[P.length - 1]; const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u; sw += kn([x, y - 0.03 * (1 - u * 0.6)], [x, y + 0.03 * (1 - u * 0.6)], 0.012); }
    s += `<g class="schwanz" data-x="${P[0][0]}" data-y="${P[0][1]}">${sw}</g>`;
    // Rumpf: Wirbelsäule und Rippen
    let r = `<path d="M${f3(-krx)} ${f3(kry * 0.4)} Q0 ${f3(kry * 0.9)} ${f3(krx)} ${f3(kry * 0.4)}" stroke="${KS}" stroke-width="0.036" stroke-linecap="round" fill="none"/><path d="M${f3(-krx)} ${f3(kry * 0.4)} Q0 ${f3(kry * 0.9)} ${f3(krx)} ${f3(kry * 0.4)}" stroke="${K}" stroke-width="0.022" stroke-linecap="round" fill="none"/>`;
    for (let i = 0; i < 9; i++) { const x = -krx * 0.75 + i * krx * 0.19; for (const [f, w] of [[KS, 0.026], [K, 0.014]]) r += `<path d="M${f3(x)} ${f3(kry * 0.6)} Q${f3(x + 0.06)} ${f3(-kry * 0.2)} ${f3(x)} ${f3(-kry * 0.7)}" stroke="${f}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`; }
    s += `<g class="koerper" transform="translate(${f3(kx)} ${f3(ky)}) rotate(${f3(krot * 180 / Math.PI)})">${r}</g>`;
    if (D.arm) s += `<g class="arm" data-x="${D.arm[0][0]}" data-y="${D.arm[0][1]}">${kn(D.arm[0], D.arm[1], 0.018)}</g>`;
    if (D.zwei) s += zweiBein(0, 'b-nah'); else { s += beinPaar(D.hinten, 0, 'b-hn'); s += beinPaar(D.vorne, 0, 'b-vn'); }
    if (D.hals) { const [a, b] = D.hals; for (const [f, w] of [[KS, 0.034], [K, 0.02]]) s += `<path d="M${f3(a[0])} ${f3(a[1])} Q${f3(a[0] + (b[0] - a[0]) * 0.2)} ${f3(b[1])} ${f3(b[0])} ${f3(b[1])}" stroke="${f}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`; }
    // Schädel mit Augenhöhle (und Zähnen bei Fleischfressern)
    const [hx, hy, hrx, hry] = D.kopf;
    let kopf = ell(hx, hy, hrx + 0.008, hry + 0.008, KS) + ell(hx, hy, hrx, hry, K) + ell(hx + hrx * 0.1, hy + hry * 0.25, hry * 0.28, hry * 0.24, KS) + ell(hx + hrx * 0.55, hy - hry * 0.05, hry * 0.12, hry * 0.1, KS);
    if (D.fleisch) for (let i = 0; i < 5; i++) { const x = hx - hrx * 0.3 + i * hrx * 0.28; kopf += `<path d="M${f3(x)} ${f3(hy - hry * 0.7)} L${f3(x + 0.012)} ${f3(hy - hry * 0.98)} L${f3(x + 0.024)} ${f3(hy - hry * 0.7)} Z" fill="${K}"/>`; }
    if (D.horn) kopf += `<path d="M${f3(hx - hrx * 0.1 - 0.03)} ${f3(hy + hry * 0.6)} L${f3(hx + hrx * 1.1)} ${f3(hy + hry * 1.9)} L${f3(hx - hrx * 0.1 + 0.03)} ${f3(hy + hry * 0.6 - 0.015)} Z" fill="${K}" stroke="${KS}" stroke-width="0.008"/>`;
    const nx = D.hals ? D.hals[0][0] : hx - hrx, ny = D.hals ? D.hals[0][1] : hy;
    s += `<g class="kopf" data-x="${f3(nx)}" data-y="${f3(ny)}">${kopf}</g>`;
    return { k: 1.75, svg: `<g class="richtung"><g transform="scale(${g} ${-g})">${s}</g></g>` };
  }

  function schwimmer(o, stil, id) {
    const k = HF.knallig(stil, o.farbe || { plesiosaurus: '#4a7a9a', ichthyosaurus: '#5a8ab0', mosasaurus: '#3a6a5a', flugsaurier: '#b0784a', trilobit: '#8a6a4a', fisch: '#e8a040', qualle: '#e0a0e0' }[o.art]);
    const d = dunkel(k, 0.12), h = hell(k, 0.16);
    let s = '';
    if (o.art === 'flugsaurier') {
      s += `<g class="fluegel f2"><path d="M-0.02 0.02 L-0.14 0.9 L0.18 0.03 Z" fill="${dunkel(k, 0.2)}"/></g>`;
      s += ell(0, 0, 0.22, 0.07, k) + `<path d="M0.18 0.04 L0.6 -0.02 L0.18 -0.03 Z" fill="${k}"/><path d="M0.2 0.05 L-0.05 0.2 L0.15 0.02 Z" fill="${HF.stilFarbe(stil, '#ff6a4a')}"/>`;
      s += `<g class="fluegel f1"><path d="M-0.08 0.02 L-0.2 0.9 L0.12 0.03 Z" fill="${d}"/></g>` + auge(0.2, 0.03, 0.028, false, stil);
    } else if (o.art === 'plesiosaurus') {
      s += ell(0.15, -0.2, 0.05, 0.16, d, -0.6) + ell(-0.18, -0.2, 0.05, 0.16, d, -0.6);
      s += ell(0, 0, 0.32, 0.13, k) + ell(0.02, -0.05, 0.26, 0.07, h);
      s += `<path d="M0.25 0.04 Q0.55 0.25 0.85 0.22" stroke="${k}" stroke-width="0.07" stroke-linecap="round" fill="none"/><path d="M-0.3 0.03 L-0.55 -0.02 L-0.3 -0.05 Z" fill="${k}"/>`;
      s += ell(0.9, 0.22, 0.08, 0.045, k) + auge(0.9, 0.24, 0.02, false, stil);
    } else if (o.art === 'ichthyosaurus' || o.art === 'mosasaurus' || o.art === 'fisch') {
      const lang = o.art === 'mosasaurus' ? 0.6 : o.art === 'fisch' ? 0.3 : 0.42;
      s += `<g class="flosse" data-x="${-lang * 0.95}" data-y="0"><path d="M${-lang * 0.95} 0 L${-lang * 0.95 - 0.2} 0.18 L${-lang * 0.95 - 0.12} 0 L${-lang * 0.95 - 0.2} -0.16 Z" fill="${d}"/></g>`;
      if (o.art !== 'fisch') s += `<path d="M-0.05 0.1 L-0.15 0.24 L0.08 0.1 Z" fill="${d}"/>`;
      s += ell(0, 0, lang, 0.13, k) + ell(0.02, -0.06, lang * 0.85, 0.06, h);
      if (o.art !== 'fisch') s += `<path d="M${f3(lang * 0.8)} 0.05 L${f3(lang + (o.art === 'mosasaurus' ? 0.2 : 0.3))} -0.01 L${f3(lang * 0.8)} -0.06 Z" fill="${k}"/>`;
      s += auge(lang * 0.75, 0.04, 0.028, o.art === 'mosasaurus', stil);
    } else if (o.art === 'trilobit') {
      s += ell(0, 0, 0.3, 0.2, k);
      for (let i = 0; i < 7; i++) { const x = -0.22 + i * 0.065; s += linie([x, -0.16], [x, 0.16], 0.014, d); }
      s += ell(0.22, 0, 0.1, 0.17, h) + auge(0.24, 0.08, 0.028, false, stil);
    } else if (o.art === 'qualle') {
      s += `<path d="M-0.25 0 A0.25 0.25 0 0 1 0.25 0 Z" fill="${rgba(k, 0.85)}"/>` + ell(-0.06, 0.12, 0.08, 0.05, rgba('#ffffff', 0.4));
      for (let i = 0; i < 6; i++) { const x = -0.2 + i * 0.08; s += `<path class="tentakel" d="M${f3(x)} 0 Q${f3(x + (i % 2 ? 0.05 : -0.05))} -0.25 ${f3(x)} -0.5" stroke="${k}" stroke-width="0.02" stroke-linecap="round" fill="none"/>`; }
    }
    return { k: 1.1, svg: `<g class="richtung"><g transform="scale(1 -1)">${s}</g></g>` };
  }

  // Blickrichtung, Laufen, Brüllen, Atmen – wie im alten Zeichner aus der Zeit berechnet
  BW.dino = (el, o, t, F, q, I) => {
    const c = el._bf || (el._bf = {
      r: el.querySelector('.richtung'), sw: el.querySelector('.schwanz'), kopf: el.querySelector('.kopf'), kiefer: el.querySelector('.kiefer'), rachen: el.querySelector('.rachen'),
      beine: [...el.querySelectorAll('[class^="b-"]')], arm: el.querySelector('.arm'), fl: [...el.querySelectorAll('.fluegel')], flosse: el.querySelector('.flosse'),
    });
    let dir = o.dir;
    for (const b of o.blick) if (t >= b.t) dir = b.dir;
    const pv = I.pos(F, o, Math.max(o.t0, t - 0.08));
    const dx = q[0] - pv[0], laeuft = Math.abs(dx) > 0.01;
    if (laeuft) dir = dx > 0 ? 1 : -1;
    c.r.setAttribute('transform', `scale(${dir} 1)`);
    const um = (g, a) => g && g.setAttribute('transform', `rotate(${f3(a)} ${g.dataset.x || 0} ${g.dataset.y || 0})`);
    if (SCHWIMMER.includes(o.art)) {
      if (o.art === 'flugsaurier') for (const f of c.fl) f.setAttribute('transform', `scale(1 ${f3(Math.sin(t * 5))})`);
      if (c.flosse) um(c.flosse, Math.sin(t * 3) * 14);
      return;
    }
    const ph = laeuft ? t * 9 : 0;
    // Beine schwingen beim Laufen (nah und fern gegenläufig)
    c.beine.forEach(b => {
      const gegen = /fern|hf|vn/.test(b.getAttribute('class')) ? Math.PI : 0;
      const w = laeuft ? Math.sin(ph + gegen) * 16 : 0;
      const ref = b.firstElementChild; // Hüftpunkt: Anfang des Beins
      const x = ref.getAttribute('x1') || ref.getAttribute('cx'), y = ref.getAttribute('y1') || ref.getAttribute('cy');
      b.setAttribute('transform', `rotate(${f3(w)} ${x} ${y})`);
    });
    um(c.sw, Math.sin(t * 1.6) * 3);
    if (c.arm && laeuft) um(c.arm, Math.sin(ph) * 10); else um(c.arm, 0);
    let maul = 0;
    for (const b of o.bruell) if (t >= b && t < b + 1.4) maul = Math.sin(clamp((t - b) / 1.4, 0, 1) * Math.PI);
    const nick = Math.sin(t * 1.3 + o.r) * 1.5 + (laeuft ? Math.sin(ph * 2) * 1.2 : 0) + maul * 6;
    um(c.kopf, nick);
    if (c.kiefer) um(c.kiefer, -maul * 28);
    if (c.rachen) c.rachen.setAttribute('opacity', maul > 0.05 ? 1 : 0);
    if (maul) c.r.setAttribute('transform', `translate(${f3(Math.sin(t * 60) * 0.004 * maul)} 0) scale(${dir} 1)`);
  };

  // ---------- Maskottchen „Glib“: kleiner bunter Schleim (Ursprung = Fußpunkt, Höhe ≈ 0,85 · o.r) ----------
  // Beim Heranzoomen wird er "ein bisschen 3D": Rundungs-Schatten, Glanz und Bläschen im Inneren mit Parallaxe.
  const SCHLEIM_FORM = 'M-0.56 0 C-0.66 -0.06 -0.62 -0.3 -0.55 -0.42 C-0.46 -0.68 -0.26 -0.84 0 -0.85 C0.26 -0.84 0.46 -0.68 0.55 -0.42 C0.62 -0.3 0.66 -0.06 0.56 0 C0.5 0.035 0.42 0.02 0.36 0.04 C0.3 0.06 0.24 0.02 0.12 0.03 C0 0.045 -0.12 0.01 -0.24 0.035 C-0.36 0.06 -0.46 0.03 -0.56 0 Z';
  OB.schleim = (o, stil, id) => {
    const P = stil.palette, a = P.pink, b = P.lila, c = P.tuerkis;
    const bl = [[-0.28, -0.22, 0.07, P.gelb], [0.25, -0.3, 0.05, P.weiss], [0.05, -0.12, 0.045, P.gelb], [-0.12, -0.66, 0.035, P.weiss], [0.32, -0.12, 0.06, P.orange], [-0.36, -0.42, 0.04, P.tuerkis]];
    return {
      k: 1.3,
      svg: `<defs>
<linearGradient id="${id}g" x1="0" y1="-0.85" x2="0" y2="0.05" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${hell(a, 0.05)}"/><stop offset="0.5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
<radialGradient id="${id}r" cx="-0.18" cy="-0.55" r="0.95" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.8" stop-color="${dunkel(b, 0.3)}" stop-opacity="0.15"/><stop offset="1" stop-color="${dunkel(b, 0.35)}" stop-opacity="0.55"/></radialGradient>
<clipPath id="${id}c"><path d="${SCHLEIM_FORM}"/></clipPath></defs>
<ellipse class="bodenschatten" cx="0" cy="0.03" rx="0.6" ry="0.07" fill="rgba(0,0,0,0.2)"/>
<g class="huepf">
<g class="aus aus-uboot" style="display:none"><g class="schraube" transform="translate(-1.02 -0.3)"><ellipse rx="0.05" ry="0.2" fill="${P.grau}"/><ellipse rx="0.2" ry="0.05" fill="${dunkel(P.grau, 0.1)}"/></g><path d="M-0.95 -0.3 L-1.0 -0.3" stroke="${P.grau}" stroke-width="0.06"/><rect x="0.25" y="-1.25" width="0.06" height="0.42" fill="${dunkel(P.gelb, 0.15)}"/><rect x="0.25" y="-1.27" width="0.18" height="0.07" rx="0.03" fill="${dunkel(P.gelb, 0.15)}"/></g>
<g class="aus aus-helm aus-blase" style="display:none"><circle cx="0" cy="-0.42" r="0.72" fill="${rgba(P.tuerkis, 0.1)}"/></g>
<g class="wackel">
<path d="${SCHLEIM_FORM}" fill="url(#${id}g)"/>
<g clip-path="url(#${id}c)"><g class="blasen">${bl.map(([x, y, r, f]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" opacity="0.75"/><circle cx="${f3(x - r * 0.3)}" cy="${f3(y - r * 0.3)}" r="${f3(r * 0.35)}" fill="#fff" opacity="0.7"/>`).join('')}</g>
<g class="tiefe"><path d="${SCHLEIM_FORM}" fill="url(#${id}r)"/><path d="M-0.5 -0.05 C-0.3 0.02 0.3 0.02 0.5 -0.05 L0.6 0.1 L-0.6 0.1 Z" fill="${rgba(dunkel(c, 0.25), 0.45)}"/></g></g>
<path class="rand" d="M-0.47 -0.5 C-0.38 -0.72 -0.2 -0.8 0 -0.81" stroke="#fff" stroke-opacity="0.35" stroke-width="0.03" stroke-linecap="round" fill="none"/>
<ellipse class="glanz" cx="-0.24" cy="-0.62" rx="0.13" ry="0.075" transform="rotate(-28 -0.24 -0.62)" fill="#fff" opacity="0.8"/><circle class="glanz2" cx="-0.07" cy="-0.73" r="0.03" fill="#fff" opacity="0.8"/>
<g class="gesicht">
${[-1, 1].map(sg => `<g class="auge" transform="translate(${f3(sg * 0.17)} -0.47)"><ellipse rx="0.125" ry="0.14" fill="#fff"/><g class="pupille"><circle r="0.07" fill="${P.schwarz}"/><circle cx="0.025" cy="-0.03" r="0.024" fill="#fff"/></g></g>`).join('')}
${[-1, 1].map(sg => `<ellipse cx="${f3(sg * 0.33)}" cy="-0.3" rx="0.07" ry="0.04" fill="${rgba(P.rot, 0.35)}"/>`).join('')}
<g class="mund" transform="translate(0 -0.28)"><ellipse class="mo" rx="0.08" ry="0.03" fill="${dunkel(P.rot, 0.35)}"/><ellipse class="zunge" cy="0.015" rx="0.045" ry="0.012" fill="${P.pink}"/></g>
<g class="aus aus-muetze" style="display:none"><path d="M-0.3 -0.72 Q0 -1.08 0.3 -0.72 Z" fill="${P.rot}"/><rect x="-0.33" y="-0.76" width="0.66" height="0.09" rx="0.045" fill="#fff"/><circle cx="0" cy="-0.98" r="0.075" fill="#fff"/><path d="M-0.4 -0.18 Q0 -0.06 0.4 -0.18 L0.38 -0.1 Q0 0.02 -0.38 -0.1 Z" fill="${P.rot}"/><rect x="0.2" y="-0.16" width="0.09" height="0.26" rx="0.03" fill="${P.rot}" transform="rotate(-10 0.24 -0.12)"/></g>
<g class="aus aus-hut" style="display:none"><ellipse cx="0" cy="-0.79" rx="0.5" ry="0.08" fill="${mische(P.gelb, P.braun, 0.35)}"/><path d="M-0.26 -0.8 Q-0.24 -1.06 0 -1.06 Q0.24 -1.06 0.26 -0.8 Z" fill="${mische(P.gelb, P.braun, 0.25)}"/><rect x="-0.25" y="-0.86" width="0.5" height="0.06" fill="${P.rot}"/><g transform="translate(0 -0.47)"><rect x="-0.32" y="-0.07" width="0.26" height="0.15" rx="0.06" fill="${P.schwarz}"/><rect x="0.06" y="-0.07" width="0.26" height="0.15" rx="0.06" fill="${P.schwarz}"/><rect x="-0.07" y="-0.03" width="0.14" height="0.03" fill="${P.schwarz}"/></g></g>
<g class="aus aus-forscher" style="display:none"><ellipse cx="0" cy="-0.8" rx="0.46" ry="0.07" fill="${mische(P.braun, P.gelb, 0.45)}"/><path d="M-0.27 -0.81 Q-0.27 -1.05 0 -1.06 Q0.27 -1.05 0.27 -0.81 Z" fill="${mische(P.braun, P.gelb, 0.55)}"/><rect x="-0.27" y="-0.87" width="0.54" height="0.05" fill="${dunkel(P.braun, 0.1)}"/></g>
</g>
<g class="aus aus-uboot" style="display:none"><path d="M-0.95 -0.3 Q-0.95 0.1 -0.3 0.12 L0.55 0.12 Q1.05 0.1 1.05 -0.28 Q1.0 -0.62 0.55 -0.62 L0.42 -0.62 Q0.3 -0.98 0 -0.98 Q-0.3 -0.98 -0.42 -0.62 L-0.6 -0.62 Q-0.95 -0.62 -0.95 -0.3 Z M-0.4 -0.42 A0.4 0.4 0 1 0 0.4 -0.42 A0.4 0.4 0 1 0 -0.4 -0.42 Z" fill-rule="evenodd" fill="${P.gelb}"/><circle cx="0" cy="-0.42" r="0.4" fill="none" stroke="${dunkel(P.gelb, 0.15)}" stroke-width="0.06"/><circle cx="0" cy="-0.42" r="0.4" fill="${rgba(P.tuerkis, 0.18)}"/><path d="M-0.95 -0.12 Q0 0.2 1.0 -0.12 L1.02 -0.06 Q0 0.26 -0.95 -0.06 Z" fill="${dunkel(P.gelb, 0.15)}"/>${[0.62, 0.82].map(x => `<circle cx="${x}" cy="-0.3" r="0.07" fill="${P.tuerkis}" stroke="${dunkel(P.gelb, 0.15)}" stroke-width="0.025"/>`).join('')}<path d="M-0.28 -0.7 Q-0.18 -0.78 -0.08 -0.76" stroke="#fff" stroke-opacity="0.7" stroke-width="0.04" stroke-linecap="round" fill="none"/></g>
<g class="aus aus-helm" style="display:none"><circle cx="0" cy="-0.42" r="0.72" fill="none" stroke="${rgba('#ffffff', 0.85)}" stroke-width="0.04"/><path d="M-0.42 -0.88 Q-0.2 -1.06 0.12 -1.06" stroke="#fff" stroke-opacity="0.8" stroke-width="0.07" stroke-linecap="round" fill="none"/><rect x="-0.5" y="0.02" width="1" height="0.12" rx="0.06" fill="${P.grau}"/><line x1="0.4" y1="-0.98" x2="0.52" y2="-1.2" stroke="${P.grau}" stroke-width="0.03"/><circle class="antenne" cx="0.53" cy="-1.22" r="0.045" fill="${P.rot}"/></g>
<g class="aus aus-blase" style="display:none"><circle cx="0" cy="-0.42" r="0.72" fill="none" stroke="${rgba('#ffffff', 0.7)}" stroke-width="0.025"/><ellipse cx="-0.35" cy="-0.82" rx="0.14" ry="0.07" transform="rotate(-35 -0.35 -0.82)" fill="#fff" opacity="0.6"/></g>
</g></g>`,
    };
  };
  // Ausrüstung je nach Umgebung (Hintergrund)
  const AUSRUESTUNG = { meer: 'uboot', weltraum: 'helm', all: 'helm', space: 'helm', schnee: 'muetze', eiszeit: 'muetze', wueste: 'hut', urzeit: 'forscher', trias: 'forscher', jura: 'forscher', kreide: 'forscher', mikro: 'blase' };
  BW.schleim = (el, o, t, F, q, I) => {
    const c = el._bf || (el._bf = {
      h: el.querySelector('.huepf'), w: el.querySelector('.wackel'), bl: el.querySelector('.blasen'), tiefe: el.querySelector('.tiefe'), glanz: el.querySelector('.glanz'),
      augen: [...el.querySelectorAll('.auge')], pup: [...el.querySelectorAll('.pupille')], mo: el.querySelector('.mo'), zunge: el.querySelector('.zunge'), schatten: el.querySelector('.bodenschatten'),
    });
    const K = o.auto ? { x: 0, y: 0, z: 1 } : I.kamera(F, t); // der Erzähler steht fest im Bild
    let hgArt = 'weltraum'; for (const b of F.w2d.hg) if (b.t0 <= t) hgArt = b.art;
    const aus = AUSRUESTUNG[hgArt] || '';
    if (el._aus !== aus) { el._aus = aus; el.querySelectorAll('.aus').forEach(g => { g.style.display = aus && g.classList.contains('aus-' + aus) ? '' : 'none'; }); }
    if (aus === 'uboot') { const sr = el._schraube || (el._schraube = el.querySelector('.schraube')); sr.setAttribute('transform', `translate(-1.02 -0.3) scale(1 ${f3(Math.cos(t * 14))})`); }
    // Hüpfen beim Laufen, sonst sanft schweben oder wackeln
    let hy = 0, quetsch = Math.sin(t * 2.2 + o.r) * 0.035;
    const seg = (o.segs || []).find(s => s.typ === 'zu' && t >= s.t0 && t < s.t1);
    if (seg) { const ph = Math.abs(Math.sin((t - seg.t0) * 9)); hy = -ph * 0.22; quetsch = (1 - ph) * 0.12 - 0.04; }
    else if (o.schweben || aus === 'uboot' || aus === 'helm') hy = -0.12 + Math.sin(t * 1.8 + o.r) * 0.05;
    else {
      // im Stehen ab und zu ein kleiner Hopser, bei Sätzen mit "!" ein Freudensprung
      const ph = (t + o.r * 0.7) % 4.2;
      if (ph < 0.45) { const u = Math.sin(ph / 0.45 * Math.PI); hy = -u * 0.12; quetsch = -u * 0.05; }
      const ruf = (F.sprache || []).find(s => t >= s.t0 && t < s.t0 + 0.7 && /!/.test(s.text));
      if (ruf) { const u = Math.sin((t - ruf.t0) / 0.7 * Math.PI); hy = Math.min(hy, -u * 0.3); quetsch = -u * 0.08; }
    }
    c.h.setAttribute('transform', `translate(0 ${f3(hy)})`);
    c.w.setAttribute('transform', `scale(${f3(1 + quetsch)} ${f3(1 - quetsch)})`);
    c.schatten.setAttribute('rx', f3(0.6 * (1 + hy * 0.8)));
    // "ein bisschen 3D" beim Heranzoomen: Schatten und Glanz kräftiger, Bläschen verschieben sich räumlich
    const z = clamp((K.z - 1) / 0.8, 0, 1);
    c.tiefe.setAttribute('opacity', f3(0.45 + 0.55 * z));
    c.glanz.setAttribute('opacity', f3(0.7 + 0.3 * z));
    const px = clamp((q[0] - K.x) / 50, -1, 1), py = clamp((q[1] - K.y) / 28, -1, 1);
    c.bl.setAttribute('transform', `translate(${f3(-px * 0.06 * (0.3 + z))} ${f3(py * 0.04 * (0.3 + z))})`);
    // Blinzeln
    const zu = ((t + o.r * 1.3) % 3.7) < 0.13;
    c.augen.forEach((a, i) => a.setAttribute('transform', `translate(${i ? 0.17 : -0.17} -0.47) scale(1 ${zu ? 0.12 : 1})`));
    // schaut zum neuesten Ding im Bild
    let ziel = null;
    for (const x of F.w2d.liste) if (x !== o && x.typ !== 'schleim' && t >= x.t0 && t < (x.t1 ?? Infinity) && (!ziel || x.t0 > ziel.t0)) ziel = x;
    let dx = 0, dy = 0;
    if (ziel) { const p = I.pos(F, ziel, t), l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; dx = (p[0] - q[0]) / l * 0.04; dy = -(p[1] - q[1] - 6) / l * 0.03; }
    c.pup.forEach(pu => pu.setAttribute('transform', `translate(${f3(dx)} ${f3(clamp(dy, -0.04, 0.04))})`));
    // Mund bewegt sich, wenn gesprochen wird
    const spricht = (F.sprache || []).some(s => t >= s.t0 && t < s.t1);
    const auf = spricht ? 0.02 + Math.abs(Math.sin(t * 13)) * 0.06 : 0.025;
    c.mo.setAttribute('ry', f3(auf)); c.zunge.setAttribute('opacity', spricht ? 1 : 0);
  };

  // ---------- Geräte: Handy, Tablet, Laptop, PC mit wechselnden Bildschirmen ----------
  const BILDER = ['apps', 'foto', 'anruf', 'spiel', 'video', 'nachricht', 'internet', 'code', 'aus'];
  function bildschirm(bild, x, y, b, h, stil, id) {
    const P = stil.palette, m = Math.min(b, h), FARB = [P.rot, P.orange, P.gelb, P.gruen, P.tuerkis, P.pink, P.lila, P.blau];
    let s = `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" fill="url(#${id}v)"/>`;
    if (bild === 'aus') return `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" fill="${dunkel(P.schwarz, 0.04)}"/><path d="M${f3(x + b * 0.15)} ${f3(y)} L${f3(x + b * 0.4)} ${f3(y)} L${f3(x + b * 0.1)} ${f3(y + h)} L${f3(x)} ${f3(y + h)} L${f3(x)} ${f3(y + h * 0.5)} Z" fill="rgba(255,255,255,0.05)"/>`;
    if (bild === 'apps') {
      const sp = 4, ze = Math.max(3, Math.round(h / b * 4)), gr = Math.min(b / sp, h / (ze + 1)) * 0.62;
      for (let i = 0; i < sp; i++) for (let j = 0; j < ze; j++) s += `<rect class="app" x="${f3(x + b * (i + 0.5) / sp - gr / 2)}" y="${f3(y + h * 0.08 + j * gr * 1.45)}" width="${f3(gr)}" height="${f3(gr)}" rx="${f3(gr * 0.28)}" fill="${FARB[(i * 3 + j * 5) % FARB.length]}"/>`;
    } else if (bild === 'foto') {
      s = `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h * 0.62)}" fill="${stil.hg.himmel[0]}"/><rect x="${f3(x)}" y="${f3(y + h * 0.6)}" width="${f3(b)}" height="${f3(h * 0.4)}" fill="${P.gruen}"/><circle cx="${f3(x + b * 0.75)}" cy="${f3(y + h * 0.22)}" r="${f3(m * 0.1)}" fill="${P.gelb}"/><rect x="${f3(x + b * 0.25)}" y="${f3(y + h * 0.42)}" width="${f3(b * 0.06)}" height="${f3(h * 0.2)}" fill="${P.braun}"/><circle cx="${f3(x + b * 0.28)}" cy="${f3(y + h * 0.38)}" r="${f3(m * 0.13)}" fill="${dunkel(P.gruen, 0.1)}"/>`;
    } else if (bild === 'anruf') {
      s = `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" fill="${P.schwarz}"/><circle cx="${f3(x + b / 2)}" cy="${f3(y + h * 0.33)}" r="${f3(m * 0.17)}" fill="#f6c39b"/><path d="M${f3(x + b / 2 - m * 0.17)} ${f3(y + h * 0.33 - m * 0.02)} A${f3(m * 0.17)} ${f3(m * 0.17)} 0 0 1 ${f3(x + b / 2 + m * 0.17)} ${f3(y + h * 0.33 - m * 0.02)} Z" fill="#4a2c1c"/><circle class="puls" cx="${f3(x + b / 2)}" cy="${f3(y + h * 0.78)}" r="${f3(m * 0.1)}" fill="${P.gruen}"/>`;
    } else if (bild === 'spiel') {
      s = `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" fill="${dunkel(P.gruen, 0.12)}"/>`;
      for (let i = 0; i < 6; i++) s += `<rect class="stein" x="${f3(x + (i * 0.17) * b)}" y="${f3(y + h * (0.15 + (i % 3) * 0.28))}" width="${f3(b * 0.12)}" height="${f3(b * 0.12)}" rx="${f3(b * 0.025)}" fill="${FARB[i]}"/>`;
    } else if (bild === 'video') {
      const c = m * 0.17;
      s = `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" fill="${P.schwarz}"/><circle cx="${f3(x + b / 2)}" cy="${f3(y + h / 2)}" r="${f3(c * 1.5)}" fill="${P.rot}"/><path d="M${f3(x + b / 2 - c * 0.45)} ${f3(y + h / 2 - c * 0.7)} L${f3(x + b / 2 + c * 0.75)} ${f3(y + h / 2)} L${f3(x + b / 2 - c * 0.45)} ${f3(y + h / 2 + c * 0.7)} Z" fill="#fff"/>`;
    } else if (bild === 'nachricht' || bild === 'internet') {
      s = `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" fill="#f4f6fa"/>`;
      for (let i = 0; i < 5; i++) { const l = i % 2 === 0; s += `<rect class="blase" x="${f3(x + (l ? b * 0.06 : b * 0.38))}" y="${f3(y + h * (0.08 + i * 0.18))}" width="${f3(b * 0.56)}" height="${f3(h * 0.12)}" rx="${f3(h * 0.05)}" fill="${l ? '#dde3ee' : P.gruen}"/>`; }
    } else if (bild === 'code') {
      s = `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" fill="${P.schwarz}"/>`;
      for (let i = 0; i < 9; i++) s += `<rect x="${f3(x + b * 0.06 + (i % 3) * b * 0.06)}" y="${f3(y + h * (0.08 + i * 0.1))}" width="${f3(b * (0.25 + ((i * 37) % 40) / 100))}" height="${f3(h * 0.05)}" rx="${f3(h * 0.025)}" fill="${FARB[(i * 3) % FARB.length]}"/>`;
    }
    return s;
  }
  OB.geraet = (o, stil, id) => {
    const P = stil.palette, gehaeuse = mische(P.schwarz, P.blau, 0.18), kante = hell(gehaeuse, 0.08);
    const genutzt = [...new Set(o.bilder.map(b => BILDER.includes(b.bild) ? b.bild : 'apps'))];
    const schirme = (x, y, b, h, r) => `<defs><linearGradient id="${id}v" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.blau}"/><stop offset="1" stop-color="${P.lila}"/></linearGradient><clipPath id="${id}s"><rect x="${f3(x)}" y="${f3(y)}" width="${f3(b)}" height="${f3(h)}" rx="${f3(r)}"/></clipPath></defs><g clip-path="url(#${id}s)">${genutzt.map(bi => `<g class="bild" data-bild="${bi}">${bildschirm(bi, x, y, b, h, stil, id)}</g>`).join('')}<path d="M${f3(x + b * 0.55)} ${f3(y)} L${f3(x + b)} ${f3(y)} L${f3(x + b)} ${f3(y + h * 0.35)} Z" fill="rgba(255,255,255,0.08)"/></g>`;
    let s;
    if (o.art === 'laptop' || o.art === 'pc' || o.art === 'computer') {
      const b = 1.6, h = 1;
      s = `<rect x="${-b / 2}" y="${-h}" width="${b}" height="${h}" rx="0.07" fill="${gehaeuse}"/>` + schirme(-b / 2 + 0.06, -h + 0.06, b - 0.12, h - 0.12, 0.03);
      if (o.art === 'laptop') s += `<path d="M${f3(-b * 0.6)} 0.12 L${f3(b * 0.6)} 0.12 L${b / 2} 0 L${-b / 2} 0 Z" fill="${P.grau}" stroke="${P.grau}" stroke-width="0.03" stroke-linejoin="round"/><rect x="-0.16" y="0.03" width="0.32" height="0.04" rx="0.02" fill="${dunkel(P.grau, 0.1)}"/>`;
      else s += `<rect x="-0.08" y="0" width="0.16" height="0.25" fill="${kante}"/><rect x="-0.4" y="0.25" width="0.8" height="0.07" rx="0.035" fill="${gehaeuse}"/>`;
    } else {
      const hoch = o.art !== 'tablet', b = hoch ? 0.5 : 0.78, h = hoch ? 1 : 1.05;
      s = `<rect x="${-b / 2}" y="${-h / 2}" width="${b}" height="${h}" rx="${f3(b * 0.14)}" fill="${gehaeuse}"/><rect x="${f3(b / 2 - 0.012)}" y="${f3(-h * 0.25)}" width="0.02" height="${f3(h * 0.12)}" rx="0.01" fill="${kante}"/>` + schirme(-b / 2 + b * 0.06, -h / 2 + b * 0.1, b * 0.88, h - b * 0.2, b * 0.05) + `<circle cx="0" cy="${f3(-h / 2 + b * 0.05)}" r="${f3(b * 0.025)}" fill="${kante}"/>`;
    }
    return { k: 1.05, svg: s };
  };
  BW.geraet = (el, o, t) => {
    const c = el._bf || (el._bf = { bilder: [...el.querySelectorAll('.bild')], puls: el.querySelector('.puls'), steine: [...el.querySelectorAll('.stein')] });
    let bild = o.bilder[0].bild; for (const b of o.bilder) if (b.t0 <= t) bild = b.bild;
    if (!BILDER.includes(bild)) bild = 'apps';
    for (const g of c.bilder) g.style.display = g.dataset.bild === bild ? '' : 'none';
    if (bild === 'anruf' && c.puls) c.puls.setAttribute('transform', `scale(${f3(1 + Math.sin(t * 6) * 0.08)})`), c.puls.style.transformOrigin = 'center', c.puls.style.transformBox = 'fill-box';
    if (bild === 'spiel') c.steine.forEach((st, i) => st.setAttribute('transform', `translate(${f3(((t * 0.12 + i * 0.17) % 1 - i * 0.17) * (o.art === 'laptop' || o.art === 'pc' ? 1.48 : o.art === 'tablet' ? 0.69 : 0.44))} 0)`));
  };

  // ---------- Pflanzen (Ursprung = Fußpunkt, Höhe 1 = o.r) ----------
  OB.pflanze = (o, stil, id) => {
    const P = stil.palette;
    const gr = o.farbe ? HF.stilFarbe(stil, o.farbe) : { blume: P.pink }[o.art] || P.gruen;
    const g1 = dunkel(gr, 0.08), g2 = hell(gr, 0.08), braun = P.braun;
    let s = '';
    const blattForm = (x0, y0, x1, y1, breite, farbe) => { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1; return `<path d="M${f3(x0)} ${f3(y0)} Q${f3(mx + nx / l * breite)} ${f3(my + ny / l * breite)} ${f3(x1)} ${f3(y1)} Q${f3(mx - nx / l * breite)} ${f3(my - ny / l * breite)} ${f3(x0)} ${f3(y0)} Z" fill="${farbe}"/>`; };
    if (o.art === 'farn') {
      for (let i = 0; i < 7; i++) { const a = -1.1 + i * (2.2 / 6), ex = Math.sin(a) * 0.7, ey = -Math.cos(a) * 0.85; s += blattForm(0, 0, ex, ey, 0.12, i % 2 ? g1 : gr); s += blattForm(0, 0, ex * 0.95, ey * 0.95, 0.03, g2); }
    } else if (o.art === 'gras') {
      for (let i = 0; i < 9; i++) { const a = -1 + i * 0.25, ex = Math.sin(a) * 0.55, ey = -Math.cos(a) * (0.6 + (i % 3) * 0.15); s += `<path d="M${f3(-0.03 + i * 0.008)} 0 Q${f3(ex * 0.3)} ${f3(ey * 0.6)} ${f3(ex)} ${f3(ey)} Q${f3(ex * 0.3 + 0.05)} ${f3(ey * 0.6)} ${f3(0.04 + i * 0.008)} 0 Z" fill="${i % 2 ? g1 : gr}"/>`; }
    } else if (o.art === 'palmfarn') {
      s += `<path d="M-0.08 0 L-0.06 -0.55 L0.06 -0.55 L0.08 0 Z" fill="${braun}"/>`;
      for (let i = 1; i < 6; i++) s += `<rect x="-0.075" y="${f3(-i * 0.1)}" width="0.15" height="0.025" rx="0.012" fill="${dunkel(braun, 0.08)}"/>`;
      for (let i = 0; i < 8; i++) { const a = -1.5 + i * (3 / 7), ex = Math.sin(a) * 0.55, ey = -0.55 - Math.cos(a) * 0.4; s += blattForm(0, -0.55, ex, ey + 0.05, 0.09, i % 2 ? g1 : gr); }
    } else if (o.art === 'nadelbaum') {
      s += `<rect x="-0.045" y="-0.25" width="0.09" height="0.25" fill="${braun}"/>`;
      for (let i = 0; i < 4; i++) { const y = -0.18 - i * 0.2, b = 0.32 - i * 0.06; s += `<path d="M${f3(-b)} ${f3(y)} L0 ${f3(y - 0.36)} L${f3(b)} ${f3(y)} Z" fill="${gr}" stroke="${gr}" stroke-width="0.04" stroke-linejoin="round"/><path d="M0 ${f3(y - 0.36)} L${f3(b)} ${f3(y)} L0 ${f3(y)} Z" fill="${g1}" stroke="${g1}" stroke-width="0.04" stroke-linejoin="round"/>`; }
    } else if (o.art === 'schachtelhalm') {
      for (let i = 0; i < 4; i++) { const x = -0.15 + i * 0.1, h = 0.8 + (i % 2) * 0.15; s += `<rect x="${f3(x - 0.02)}" y="${f3(-h)}" width="0.04" height="${f3(h)}" rx="0.02" fill="${i % 2 ? g1 : gr}"/>`; for (let j = 1; j < 7; j++) s += linie([x - 0.045, -j * 0.12], [x + 0.045, -j * 0.12 - 0.03], 0.014, dunkel(gr, 0.15)); }
    } else if (o.art === 'blume') {
      s += `<path d="M0 0 L0 -0.6" stroke="${P.gruen}" stroke-width="0.045" stroke-linecap="round"/>` + blattForm(0, -0.2, 0.22, -0.32, 0.06, P.gruen);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; s += ell(Math.cos(a) * 0.1, -0.62 + Math.sin(a) * 0.1, 0.085, 0.055, i % 2 ? gr : hell(gr, 0.06), a); }
      s += ell(0, -0.62, 0.06, 0.06, P.gelb);
    } else if (o.art === 'busch') {
      for (let i = 0; i < 6; i++) s += ell(-0.3 + i * 0.12, -0.2 - Math.sin(i * 2) * 0.08, 0.2, 0.18, i % 2 ? g1 : gr);
      for (let i = 0; i < 3; i++) s += ell(-0.2 + i * 0.16, -0.3 - Math.sin(i * 2) * 0.06, 0.08, 0.06, g2);
    }
    return { k: 1.05, svg: s };
  };

  // Baum: Krone aus vielen Blasen. Herbst: faerbe2d färbt um, blaetterfallen2d lässt Blätter fallen (Blasen verschwinden)
  const BAUM_BLASEN = 26;
  function baumFarbe(o, stil, t) {
    let c = HF.stilFarbe(stil, o.farben[0].zu);
    for (const f of o.farben) {
      if (f.t0 > t) break;
      const u = f.t1 > f.t0 ? clamp((t - f.t0) / (f.t1 - f.t0), 0, 1) : 1;
      c = mische(c, HF.stilFarbe(stil, f.zu), u * u * (3 - 2 * u));
    }
    return c;
  }
  const herbstTone = stil => [stil.palette.gelb, stil.palette.orange, stil.palette.rot, mische(stil.palette.orange, stil.palette.gelb, 0.5)];
  function blasenFarben(f, stil) {
    const [h] = HF.farbe.rgbHsl(...HF.farbe.hexRgb(f));
    const herbst = h < 72, H = herbstTone(stil);
    return Array.from({ length: BAUM_BLASEN }, (_, i) => {
      let c = (i % 3 === 0) ? hell(f, 0.06) : (i % 3 === 1) ? f : dunkel(f, 0.06);
      if (herbst) c = mische(c, H[i % 4], 0.35);
      return c;
    });
  }
  OB.baum = (o, stil, id) => {
    const P = stil.palette, braun = P.braun;
    const rnd = HF.zufall(BF.hash ? BF.hash(o.name) : 3);
    const kY = -0.68, kR = 0.36;
    let s = `<path d="M-0.06 0 L-0.035 ${kY} L0.035 ${kY} L0.06 0 Z" fill="${braun}"/><path d="M0.0 0 L0.01 ${kY} L0.035 ${kY} L0.06 0 Z" fill="${dunkel(braun, 0.1)}"/>`;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, l = kR * (0.6 + rnd() * 0.5); s += linie([0, kY + kR * 0.3], [Math.cos(a) * l, kY + kR * 0.3 + Math.sin(a) * l], 0.022, braun); }
    const f = baumFarbe(o, stil, -1), farben = blasenFarben(f, stil);
    const blasen = [];
    for (let i = 0; i < BAUM_BLASEN; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * kR; blasen.push([Math.cos(a) * d * 1.1, kY + Math.sin(a) * d * 0.82, kR * (0.24 + rnd() * 0.12)]); }
    // von unten nach oben zeichnen, damit die oberen Blasen (im Licht) vorne liegen
    const reihe = blasen.map((b, i) => [b, i]).sort((x, y) => y[0][1] - x[0][1]);
    s += `<g class="krone">${reihe.map(([[x, y, r], i]) => `<g class="bl" data-i="${i}"><circle cx="${f3(x)}" cy="${f3(y + r * 0.12)}" r="${f3(r)}" fill="${dunkel(farben[i], 0.1)}"/><circle cx="${f3(x)}" cy="${f3(y)}" r="${f3(r * 0.94)}" fill="${farben[i]}"/></g>`).join('')}</g>`;
    // fallende Blätter (für blaetterfallen2d)
    let n = 0; for (const fa of o.fallen || []) n += fa.n;
    for (let i = 0; i < n; i++) s += `<path class="fallblatt" d="M-0.03 0 Q0 -0.025 0.03 0 Q0 0.025 -0.03 0 Z" fill="${P.orange}" style="display:none"/>`;
    return { k: 1.05, svg: s };
  };
  BW.baum = (el, o, t) => {
    const dyn = o.farben.length > 1 || (o.kahl && o.kahl.length) || o.fallen;
    if (!dyn) return;
    const stil = HF.aktiverStil;
    const c = el._bf || (el._bf = { bl: [...el.querySelectorAll('.bl')], fall: [...el.querySelectorAll('.fallblatt')], letzte: '' });
    const f = baumFarbe(o, stil, t);
    if (f !== c.letzte) {
      c.letzte = f;
      const farben = blasenFarben(f, stil);
      for (const g of c.bl) { const i = +g.dataset.i; g.firstElementChild.setAttribute('fill', dunkel(farben[i], 0.1)); g.lastElementChild.setAttribute('fill', farben[i]); }
    }
    const I = BF.w2dIntern;
    const kahl = o.kahl && o.kahl.length ? I.wertBei(o.kahl, t, 0) : 0;
    for (const g of c.bl) g.style.display = +g.dataset.i / BAUM_BLASEN < kahl ? 'none' : '';
    // fallende Blätter wie im alten Zeichner (in Einheiten der Baumhöhe)
    let k = 0;
    const H = herbstTone(stil), kY = -0.68, kR = 0.36;
    for (const fa of o.fallen || []) {
      const rf = BF.rng(BF.hash(o.name) + 7);
      for (let i = 0; i < fa.n; i++, k++) {
        const st = fa.t0 + (i / fa.n) * (fa.t1 - fa.t0);
        const a = rf() * Math.PI * 2, d = Math.sqrt(rf()) * kR, pick = rf(), sw = rf();
        const e = c.fall[k];
        if (!e) continue;
        if (t < st) { e.style.display = 'none'; continue; }
        const alter = t - st, x0 = Math.cos(a) * d, y0 = kY + Math.sin(a) * d * 0.8;
        const fallH = -y0 + 0.02 * (pick - 0.5) * 8, fy = Math.min(fallH, alter * 0.12), liegt = fy >= fallH;
        const fx = x0 + (liegt ? Math.sin(fallH / 0.12 * 2.2 + sw * 6) : Math.sin(alter * 2.2 + sw * 6)) * 0.06;
        const rot = (liegt ? 1.3 + sw : Math.sin(alter * 3 + sw * 5) * 0.8) * 180 / Math.PI;
        e.style.display = '';
        e.setAttribute('transform', `translate(${f3(fx)} ${f3(y0 + fy)}) rotate(${f3(rot)})`);
        e.setAttribute('fill', mische(f, H[Math.floor(pick * 4)], 0.6));
      }
    }
  };

  // ---------- Bauteile: Chip, Router, Speicher, Kamera, Lautsprecher, Platine, SIM ----------
  OB.bauteil = (o, stil, id) => {
    const P = stil.palette, dunkelG = mische(P.schwarz, P.blau, 0.18), gold = mische(P.gelb, P.orange, 0.3), platine = dunkel(P.gruen, 0.18);
    const a = o.art;
    let s = '';
    if (a === 'router') {
      s = linie([-0.6, -0.2], [-0.7, -1.1], 0.07, dunkelG) + linie([0.6, -0.2], [0.7, -1.1], 0.07, dunkelG) + `<rect x="-1" y="-0.3" width="2" height="0.6" rx="0.14" fill="#f4f6fa"/><rect x="-1" y="0.05" width="2" height="0.25" rx="0.12" fill="${P.grau}"/>`;
      for (let i = 0; i < 5; i++) s += `<circle class="led" cx="${f3(-0.6 + i * 0.3)}" cy="-0.05" r="0.07" fill="${P.gruen}"/>`;
    } else if (a === 'chip' || a === 'prozessor') {
      for (let i = 0; i < 6; i++) { const q = -0.5 + (i + 0.5) / 6; for (const [x1, y1, x2, y2] of [[q, -0.5, q, -0.66], [q, 0.5, q, 0.66], [-0.5, q, -0.66, q], [0.5, q, 0.66, q]]) s += linie([x1, y1], [x2, y2], 0.045, gold); }
      s += `<rect x="-0.5" y="-0.5" width="1" height="1" rx="0.07" fill="${dunkelG}"/><rect class="kern" x="-0.3" y="-0.3" width="0.6" height="0.6" rx="0.05" fill="${gold}"/><circle cx="-0.38" cy="-0.38" r="0.04" fill="${hell(dunkelG, 0.15)}"/>`;
    } else if (a === 'speicher' || a === 'arbeitsspeicher') {
      s = `<rect x="-1" y="-0.25" width="2" height="0.5" rx="0.05" fill="${platine}"/>`;
      for (let i = 0; i < 6; i++) s += `<rect x="${f3(-0.9 + i * 0.31)}" y="-0.15" width="0.22" height="0.3" rx="0.03" fill="${dunkelG}"/>`;
      for (let i = 0; i < 16; i++) s += `<rect x="${f3(-0.95 + i * 0.12)}" y="0.2" width="0.06" height="0.05" fill="${gold}"/>`;
    } else if (a === 'kamera') {
      s = `<rect x="-0.6" y="-0.6" width="1.2" height="1.2" rx="0.22" fill="${dunkelG}"/><circle r="0.42" fill="${P.schwarz}"/><circle r="0.27" fill="${P.blau}"/><circle r="0.12" fill="${dunkel(P.blau, 0.25)}"/><circle cx="-0.09" cy="-0.09" r="0.07" fill="rgba(255,255,255,0.7)"/>`;
    } else if (a === 'lautsprecher') {
      s = `<g class="wellen">${[1, 2, 3].map(i => `<path d="M${f3(0.5 + Math.cos(-0.6) * (0.3 + i * 0.25))} ${f3(Math.sin(-0.6) * (0.3 + i * 0.25))} A${f3(0.3 + i * 0.25)} ${f3(0.3 + i * 0.25)} 0 0 1 ${f3(0.5 + Math.cos(0.6) * (0.3 + i * 0.25))} ${f3(Math.sin(0.6) * (0.3 + i * 0.25))}" stroke="${P.grau}" stroke-width="0.06" stroke-linecap="round" fill="none"/>`).join('')}</g><circle r="0.6" fill="${dunkelG}"/><circle class="membran" r="0.25" fill="${P.grau}"/><circle cx="-0.07" cy="-0.07" r="0.08" fill="${hell(P.grau, 0.15)}"/>`;
    } else if (a === 'platine') {
      s = `<rect x="-1" y="-0.7" width="2" height="1.4" rx="0.06" fill="${platine}"/>`;
      const rp = BF.rng ? BF.rng(4) : HF.zufall(4);
      for (let i = 0; i < 14; i++) { const y = -0.6 + rp() * 1.2, x = -0.2 + rp() * 0.4, y2 = y + (rp() - 0.5) * 0.3; s += `<path d="M-0.95 ${f3(y)} L${f3(x)} ${f3(y)} L0.95 ${f3(y2)}" stroke="${gold}" stroke-width="0.025" fill="none" stroke-linejoin="round"/>`; }
      s += `<rect x="-0.25" y="-0.25" width="0.5" height="0.5" rx="0.05" fill="${dunkelG}"/>`;
    } else {
      s = `<rect x="-0.6" y="-0.4" width="1.2" height="0.8" rx="0.1" fill="#eef0f4"/><path d="M0.6 -0.4 L0.6 -0.15 L0.35 -0.4 Z" fill="${P.grau}"/><rect x="-0.35" y="-0.2" width="0.45" height="0.4" rx="0.06" fill="${gold}"/>`;
    }
    return { k: 1.3, svg: s };
  };
  BW.bauteil = (el, o, t) => {
    if (o.art === 'router') el.querySelectorAll('.led').forEach((l, i) => l.setAttribute('opacity', Math.sin(t * 6 + i * 1.7) > -0.2 ? 1 : 0.25));
    else if (o.art === 'chip' || o.art === 'prozessor') { const k = el.querySelector('.kern'); if (k) k.setAttribute('opacity', f3(0.45 + 0.55 * Math.abs(Math.sin(t * 4)))); }
    else if (o.art === 'lautsprecher') { const m = el.querySelector('.membran'); if (m) m.setAttribute('r', f3(0.25 * (1 + Math.sin(t * 20) * 0.08))); const w = el.querySelector('.wellen'); if (w) w.setAttribute('transform', `translate(${f3((t * 0.5) % 0.25)} 0)`); }
  };
})();
