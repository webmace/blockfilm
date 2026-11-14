// Blockfilm – rechnet für jeden Zeitpunkt aus, wo Figuren und Kamera sind
(function () {
  const BF = (window.BF = window.BF || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const sanft = u => u * u * (3 - 2 * u);
  const sanft2 = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  BF.clamp = clamp; BF.lerp = lerp; BF.sanft = sanft;

  // ---------- Figuren ----------
  BF.akteurZustand = function (F, a, t) {
    const s0 = a.start;
    const z = { x: s0.x, y: s0.y, z: s0.z, yaw: s0.yaw, gang: null, sprung: 0, spin: 0, flug: false, liegen: 0, sitzen: 0, sicht: 1, gesten: [], rede: null, blick: null, item: null, aua: 0, rueck: false };
    for (const s of a.segs) {
      if (s.t0 > t) break;
      const u = s.t1 > s.t0 ? clamp((t - s.t0) / (s.t1 - s.t0), 0, 1) : 1;
      switch (s.typ) {
        case 'weg': {
          const uu = s.stil === 'rueck' ? sanft(u) : u;
          z.x = lerp(s.von.x, s.zu.x, uu);
          z.z = lerp(s.von.z, s.zu.z, uu);
          if (s.hoehen) {
            const n = s.hoehen.length, fi = uu * (n - 1), i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1);
            z.y = lerp(s.hoehen[i0], s.hoehen[i1], fi - i0);
          } else z.y = lerp(s.von.y, s.zu.y, s.stil === 'fliegt' ? sanft(u) : u);
          const dreh = Math.min(0.25, Math.max(0.01, s.t1 - s.t0));
          z.yaw = lerp(s.yaw0, s.yaw1, sanft(clamp((t - s.t0) / dreh, 0, 1)));
          if (t < s.t1 && s.stil !== 'rueck' && s.stil !== 'sprung' && s.tempo > 0.05) {
            z.gang = { stil: s.stil, phase: (t - s.t0) * s.tempo * 2.6, tempo: s.tempo };
            z.rueck = !!s.rueckwaerts;
          }
          if (s.stil === 'fliegt' && t < s.t1) z.flug = true;
          break;
        }
        case 'dreh': z.yaw = lerp(s.y0, s.y1, sanft(u)); break;
        case 'sprung': if (u < 1) z.sprung += 4 * s.h * u * (1 - u); break;
        case 'tele': z.x = s.zu.x; z.y = s.zu.y; z.z = s.zu.z; break;
        case 'bahn': {
          const n = s.pts.length / 3;
          const fi = clamp((t - s.t0) * 60, 0, n - 1), i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1), f = fi - i0;
          z.x = lerp(s.pts[i0 * 3], s.pts[i1 * 3], f);
          z.y = lerp(s.pts[i0 * 3 + 1], s.pts[i1 * 3 + 1], f);
          z.z = lerp(s.pts[i0 * 3 + 2], s.pts[i1 * 3 + 2], f);
          if (u < 1) { z.spin = s.spin * u; z.flug = true; }
          break;
        }
      }
    }
    for (const s of a.zust) {
      if (s.t0 > t) break;
      const u = s.t1 > s.t0 ? clamp((t - s.t0) / (s.t1 - s.t0), 0, 1) : 1;
      z[s.key] = lerp(s.von, s.zu, sanft(u));
    }
    for (const s of a.sicht) {
      if (s.t0 > t) break;
      const u = s.t1 > s.t0 ? clamp((t - s.t0) / (s.t1 - s.t0), 0, 1) : 1;
      z.sicht = lerp(s.von, s.zu, sanft(u));
    }
    for (const g of a.gesten) {
      if (g.t0 > t) break;
      if (t < g.t1) {
        if (g.typ === 'aua') z.aua = Math.max(z.aua, 1 - (t - g.t0) / (g.t1 - g.t0));
        else z.gesten.push({ typ: g.typ, u: (t - g.t0) / (g.t1 - g.t0), lt: t - g.t0, d: g.t1 - g.t0 });
      }
    }
    for (const r of a.reden) if (r.t0 <= t && t < r.t1) z.rede = r;
    for (const b of a.blicke) { if (b.t0 > t) break; z.blick = b.ziel; }
    for (const i of a.items) { if (i.t0 > t) break; z.item = i.item; }
    return z;
  };

  // Kopfposition (für Kamera und Sprechblasen)
  BF.kopfPos = function (F, a, t, zst) {
    const s = zst || BF.akteurZustand(F, a, t);
    const sk = a.def.skala || 1;
    if (a.tier) {
      const T = BF.TIER_MASSE ? BF.TIER_MASSE(a) : { kopfY: 0.8, kopfZ: 0.6 };
      return [s.x + Math.sin(s.yaw) * T.kopfZ, s.y + T.kopfY * (1 - s.liegen * 0.6) + s.sprung, s.z + Math.cos(s.yaw) * T.kopfZ];
    }
    const h = lerp(lerp(1.55, 0.95, s.sitzen), 0.3, s.liegen) * sk;
    let x = s.x, zz = s.z;
    if (s.liegen > 0) { x += Math.cos(s.yaw) * -1.4 * s.liegen * sk; zz += -Math.sin(s.yaw) * -1.4 * s.liegen * sk; }
    return [x, s.y + h + s.sprung, zz];
  };

  // ---------- Kamera ----------
  function zielPunkt(F, z, t) {
    if (!z) return null;
    if (z.objekt) return BF.objektPos(F, z.objekt, t);
    if (z.akteur) { const a = F.akteure[z.akteur]; return BF.kopfPos(F, a, t); }
    const p = z.p;
    return [p[0], p[1] === null ? F.W.boden(p[0], p[2], t) + 1 : p[1], p[2]];
  }
  BF.zielPunkt = zielPunkt;

  const vlerp = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const BASIS = { setze: 1, fahrt: 1, folgt: 1, kreist: 1, nah: 1, schulter: 1, ego: 1 };

  function kamBis(F, t, maxI) {
    // Basis-Einstellung suchen
    let bi = -1;
    for (let i = Math.min(maxI, F.kamera.length - 1); i >= 0; i--) { const s = F.kamera[i]; if (BASIS[s.typ] && s.t0 <= t) { bi = i; break; } }
    let k = bi >= 0 ? segment(F, bi, t) : { pos: [0, 7, 16], blick: [0, 1, 0] };
    // Schwenks danach
    for (let i = bi + 1; i <= Math.min(maxI, F.kamera.length - 1); i++) {
      const s = F.kamera[i];
      if (s.typ !== 'blick' || s.t0 > t) continue;
      const u = s.t1 > s.t0 ? sanft(clamp((t - s.t0) / (s.t1 - s.t0), 0, 1)) : 1;
      const z = zielPunkt(F, s.ziel, t);
      k = { pos: k.pos, blick: vlerp(k.blick, z, u), ego: k.ego };
    }
    return k;
  }
  function startVon(F, i) {
    const s = F.kamera[i];
    if (!s._start) s._start = kamBis(F, s.t0, i - 1);
    return s._start;
  }
  function einblenden(F, i, t, k, dauer = 0.7) {
    const s = F.kamera[i];
    const u = clamp((t - s.t0) / dauer, 0, 1);
    if (u >= 1) return k;
    const v = kamBis(F, t, i - 1);
    const e = sanft(u);
    return { pos: vlerp(v.pos, k.pos, e), blick: vlerp(v.blick, k.blick, e) };
  }

  function segment(F, i, t) {
    const s = F.kamera[i];
    switch (s.typ) {
      case 'setze': {
        const p = s.pos;
        let b = zielPunkt(F, s.ziel, t);
        if (!b) b = [p[0], p[1] - 1.5, p[2] - 6];
        return { pos: p.slice(), blick: b };
      }
      case 'fahrt': {
        const st = startVon(F, i);
        const ur = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
        const u = s.linear ? ur : sanft2(ur);
        const pos = vlerp(st.pos, s.pos, u);
        let b;
        if (s.ziel) b = vlerp(st.blick, zielPunkt(F, s.ziel, t), sanft(clamp(ur * 1.6, 0, 1)));
        else b = [st.blick[0] + pos[0] - st.pos[0], st.blick[1] + pos[1] - st.pos[1], st.blick[2] + pos[2] - st.pos[2]];
        return { pos, blick: b };
      }
      case 'folgt': {
        if (s.objekt) {
          const p = BF.objektPos(F, s.objekt, t);
          if (!s._dir) {
            const st = startVon(F, i);
            const p0 = BF.objektPos(F, s.objekt, s.t0);
            const dx = st.pos[0] - p0[0], dz = st.pos[2] - p0[2], l = Math.hypot(dx, dz);
            s._dir = l > 0.01 ? [dx / l, 0, dz / l] : [0, 0, 1];
          }
          return einblenden(F, i, t, { pos: [p[0] + s._dir[0] * s.abstand, p[1] + s.hoehe, p[2] + s._dir[2] * s.abstand], blick: p });
        }
        const a = F.akteure[s.akteur];
        const z = BF.akteurZustand(F, a, t);
        const kp = BF.kopfPos(F, a, t, z);
        const fuss = [z.x, z.y + (a.tier ? 0.5 : 1.1), z.z];
        let dir;
        if (s.seite) {
          // Richtung relativ zur Figur, weich nachgeführt
          let yaw = 0, n = 0;
          for (let k = 0; k < 6; k++) { const zz = BF.akteurZustand(F, a, t - k * 0.08); yaw += zz.yaw; n++; }
          yaw /= n;
          const w = { hinten: Math.PI, vorne: 0, links: Math.PI / 2, rechts: -Math.PI / 2, oben: Math.PI }[s.seite];
          dir = [Math.sin(yaw + w), 0, Math.cos(yaw + w)];
        } else {
          if (!s._dir) {
            const st = startVon(F, i);
            const z0 = BF.akteurZustand(F, a, s.t0);
            let dx = st.pos[0] - z0.x, dz = st.pos[2] - z0.z;
            const l = Math.hypot(dx, dz);
            s._dir = l > 0.01 ? [dx / l, 0, dz / l] : [0, 0, 1];
          }
          dir = s._dir;
        }
        const hoehe = s.seite === 'oben' ? s.abstand * 1.2 : s.hoehe;
        const pos = [fuss[0] + dir[0] * s.abstand, fuss[1] + hoehe, fuss[2] + dir[2] * s.abstand];
        return einblenden(F, i, t, { pos, blick: s.seite === 'oben' ? fuss : [kp[0], kp[1] - 0.3, kp[2]] });
      }
      case 'kreist': {
        const c = zielPunkt(F, s.ziel, t);
        if (s._a0 === undefined) {
          const st = startVon(F, i);
          const c0 = zielPunkt(F, s.ziel, s.t0);
          s._a0 = Math.atan2(st.pos[0] - c0[0], st.pos[2] - c0[2]);
        }
        const u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
        const a = s._a0 + Math.PI * 2 * s.runden * u;
        const pos = [c[0] + Math.sin(a) * s.radius, c[1] + s.hoehe - 1, c[2] + Math.cos(a) * s.radius];
        return einblenden(F, i, t, { pos, blick: [c[0], c[1] - 0.3, c[2]] }, 1.0);
      }
      case 'nah': {
        const a = F.akteure[s.akteur];
        const z = BF.akteurZustand(F, a, t);
        const kp = BF.kopfPos(F, a, t, z);
        const yaw = z.yaw + 0.35;
        return { pos: [kp[0] + Math.sin(yaw) * s.abstand, kp[1] + 0.15, kp[2] + Math.cos(yaw) * s.abstand], blick: [kp[0], kp[1] - 0.05, kp[2]] };
      }
      case 'schulter': {
        const a = F.akteure[s.akteur], b = F.akteure[s.ziel];
        const ka = BF.kopfPos(F, a, t), kb = BF.kopfPos(F, b, t);
        let dx = kb[0] - ka[0], dz = kb[2] - ka[2];
        const l = Math.hypot(dx, dz) || 1;
        dx /= l; dz /= l;
        return { pos: [ka[0] - dx * 1.7 - dz * 0.75, ka[1] + 0.35, ka[2] - dz * 1.7 + dx * 0.75], blick: [kb[0], kb[1] - 0.2, kb[2]] };
      }
      case 'ego': {
        const a = F.akteure[s.akteur];
        const z = BF.akteurZustand(F, a, t);
        const kp = BF.kopfPos(F, a, t, z);
        const yaw = z.yaw;
        return { pos: [kp[0] + Math.sin(yaw) * 0.3, kp[1] + 0.1, kp[2] + Math.cos(yaw) * 0.3], blick: [kp[0] + Math.sin(yaw) * 5, kp[1] - 0.4, kp[2] + Math.cos(yaw) * 5], ego: s.akteur };
      }
    }
    return { pos: [0, 7, 16], blick: [0, 1, 0] };
  }

  BF.kameraBei = function (F, t) {
    const k = kamBis(F, t, F.kamera.length - 1);
    let fov = 70;
    for (const f of F.fov) {
      if (f.t0 > t) break;
      const u = f.t1 > f.t0 ? sanft(clamp((t - f.t0) / (f.t1 - f.t0), 0, 1)) : 1;
      fov = lerp(fov, f.fov, u);
    }
    // Wackeln
    let w = 0;
    for (const s of F.wackeln) if (s.t0 <= t && t < s.t1) w += s.staerke * Math.pow(1 - (t - s.t0) / (s.t1 - s.t0), 1.5);
    let pos = k.pos.slice(), blick = k.blick.slice();
    if (w > 0) {
      const o = [Math.sin(t * 61) + Math.sin(t * 37) * 0.5, Math.sin(t * 53 + 1) + Math.sin(t * 29) * 0.5, Math.sin(t * 47 + 2) * 0.7];
      for (let i = 0; i < 3; i++) { pos[i] += o[i] * w * 0.15; blick[i] += o[i] * w * 0.25; }
    }
    return { pos, blick, fov, ego: k.ego };
  };

  // ---------- Himmel ----------
  const HIMMEL = {
    tag: { oben: '#5f8fe8', horizont: '#b4d0ff', licht: 1.0, sonne: 1.0, sonneH: 55, sonneR: 35, sterne: 0, mond: 0, wolken: 1, nebelNah: 0.55, nebelFern: 1, sonnenFarbe: '#fff4dc' },
    morgen: { oben: '#6f8fd0', horizont: '#f4ae86', licht: 0.75, sonne: 0.75, sonneH: 10, sonneR: -75, sterne: 0, mond: 0, wolken: 1, nebelNah: 0.5, nebelFern: 1, sonnenFarbe: '#ffc89a' },
    abend: { oben: '#3d4f8f', horizont: '#f0874a', licht: 0.6, sonne: 0.7, sonneH: 7, sonneR: 105, sterne: 0.15, mond: 0, wolken: 1, nebelNah: 0.5, nebelFern: 1, sonnenFarbe: '#ff9a5a' },
    nacht: { oben: '#03060f', horizont: '#0c1430', licht: 0.2, sonne: 0.14, sonneH: 50, sonneR: -30, sterne: 1, mond: 1, wolken: 0.35, nebelNah: 0.45, nebelFern: 0.9, sonnenFarbe: '#9fb4ff' },
    gewitter: { oben: '#2f3540', horizont: '#565e6a', licht: 0.45, sonne: 0.15, sonneH: 60, sonneR: 20, sterne: 0, mond: 0, wolken: 1.2, nebelNah: 0.3, nebelFern: 0.7, sonnenFarbe: '#c0c8d8' },
    bewoelkt: { oben: '#8094b0', horizont: '#c5ccd6', licht: 0.8, sonne: 0.4, sonneH: 55, sonneR: 35, sterne: 0, mond: 0, wolken: 1.4, nebelNah: 0.45, nebelFern: 0.9, sonnenFarbe: '#f0f0f0' },
    nether: { oben: '#2a0a08', horizont: '#4f160e', licht: 0.65, sonne: 0, sonneH: 60, sonneR: 0, sterne: 0, mond: 0, wolken: 0, nebelNah: 0.15, nebelFern: 0.6, sonnenFarbe: '#ff9060' },
    ende: { oben: '#0d0a14', horizont: '#1a1426', licht: 0.55, sonne: 0, sonneH: 60, sonneR: 0, sterne: 0.4, mond: 0, wolken: 0, nebelNah: 0.4, nebelFern: 1, sonnenFarbe: '#c0a0ff' },
  };
  BF.HIMMEL = HIMMEL;
  const mische = (a, b, u) => {
    const o = {};
    for (const k in a) {
      if (typeof a[k] === 'number') o[k] = lerp(a[k], b[k], u);
      else { const c = new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), u); o[k] = '#' + c.getHexString(); }
    }
    return o;
  };
  BF.himmelBei = function (F, t) {
    let h = Object.assign({}, HIMMEL.tag);
    for (const s of F.himmel) {
      if (s.t0 > t) break;
      const u = s.t1 > s.t0 ? sanft(clamp((t - s.t0) / (s.t1 - s.t0), 0, 1)) : 1;
      h = mische(h, HIMMEL[s.zu], u);
    }
    return h;
  };
})();
