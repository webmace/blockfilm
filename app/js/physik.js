// Blockfilm – Physik: fallende, fliegende und abprallende Blöcke
// Alles wird einmal vorausberechnet (60 Bilder pro Sekunde), damit Vorschau und Video gleich aussehen.
(function () {
  const BF = (window.BF = window.BF || {});
  const R = 0.5;

  const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q1 = new THREE.Quaternion();
  function einrasten(q) {
    // nächstgelegene "gerade" Drehung (Block liegt flach)
    const m = _m1.makeRotationFromQuaternion(q);
    const e = m.elements;
    const spalten = [[e[0], e[1], e[2]], [e[4], e[5], e[6]], [e[8], e[9], e[10]]];
    const benutzt = new Set();
    const neu = [];
    for (const s of spalten) {
      let best = -1, bw = -1;
      for (let a = 0; a < 3; a++) if (!benutzt.has(a) && Math.abs(s[a]) > bw) { bw = Math.abs(s[a]); best = a; }
      benutzt.add(best);
      const v = [0, 0, 0];
      v[best] = Math.sign(s[best]) || 1;
      neu.push(v);
    }
    const m2 = _m2.set(
      neu[0][0], neu[1][0], neu[2][0], 0,
      neu[0][1], neu[1][1], neu[2][1], 0,
      neu[0][2], neu[1][2], neu[2][2], 0,
      0, 0, 0, 1);
    if (m2.determinant() < 0) return _q1.copy(q);
    return _q1.setFromRotationMatrix(m2);
  }

  BF.simuliere = function (F) {
    const K = F.koerper;
    if (!K.length) return;
    const W0 = F.W;
    const NK = (x, y, z) => ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024);
    const basisFest = new Set();
    for (const [k, typ] of W0.basis) if (BF.TYPEN[typ].fest) { const [x, y, z] = k.split(',').map(Number); basisFest.add(NK(x, y, z)); }
    const evN = new Map();
    for (const [k, l] of W0.ev) { const [x, y, z] = k.split(',').map(Number); evN.set(NK(x, y, z), l); }
    const W = {
      fest(x, y, z, t) {
        const k = NK(x, y, z);
        const l = evN.get(k);
        if (l) { let r; for (const e of l) { if (e.t <= t) r = e; else break; } if (r) return !!r.typ && BF.TYPEN[r.typ].fest; }
        return basisFest.has(k);
      },
    };
    const g = F.schwerkraft, e = F.abprall;
    const fEnde = Math.ceil((F.dauer + 0.1) * 60);
    const fStart = Math.floor(K[0].t0 * 60);
    const ex = F.explosionen.slice().sort((a, b) => a.t - b.t);
    let exI = 0;
    while (exI < ex.length && ex[exI].t < fStart / 60) exI++;

    const zuf = BF.rng(4242);
    const B = K.map((k, i) => {
      const f0 = Math.max(fStart, Math.ceil(k.t0 * 60 - 1e-6));
      k.f0 = f0;
      k.n = Math.max(1, fEnde - f0 + 1);
      k.bahn = new Float32Array(k.n * 7);
      const q = new THREE.Quaternion();
      return { k, an: false, schlaf: false, p: new THREE.Vector3(...k.pos), v: new THREE.Vector3(...k.vel), q, w: new THREE.Vector3(...k.dreh), ruhe: 0, kontakt: false, letzterTon: -1, weg: false, i };
    });
    let naechster = 0;
    const aktiv = [];
    let letzterTon = -1;
    const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), cp = new THREE.Vector3();
    const dt = 1 / 120;

    function weltKontakt(b, t) {
      let kontakt = false;
      const p = b.p;
      const x0 = Math.round(p.x - R), x1 = Math.round(p.x + R);
      const z0 = Math.round(p.z - R), z1 = Math.round(p.z + R);
      const y0 = Math.floor(p.y - R), y1 = Math.floor(p.y + R);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (!W.fest(x, y, z, t)) continue;
        cp.set(Math.max(x - 0.5, Math.min(p.x, x + 0.5)), Math.max(y, Math.min(p.y, y + 1)), Math.max(z - 0.5, Math.min(p.z, z + 0.5)));
        tmpV.subVectors(p, cp);
        let d = tmpV.length();
        if (d >= R) continue;
        if (d < 1e-5) { tmpV.set(0, 1, 0); d = 0; } else tmpV.divideScalar(d);
        p.addScaledVector(tmpV, R - d);
        const vn = b.v.dot(tmpV);
        if (vn < 0) {
          if (-vn > 3.5 && t - b.letzterTon > 0.15 && t - letzterTon > 0.03) {
            F.toene.push({ t, art: 'aufprall', vol: Math.min(1, -vn / 14) });
            b.letzterTon = t; letzterTon = t;
          }
          b.v.addScaledVector(tmpV, -(1 + (-vn > 2 ? e : 0)) * vn);
          // Reibung
          const vd = b.v.dot(tmpV);
          tmpV2.copy(b.v).addScaledVector(tmpV, -vd);
          b.v.addScaledVector(tmpV2, -0.12);
        }
        kontakt = true;
      }
      return kontakt;
    }

    for (let f = fStart; f <= fEnde; f++) {
      const tf = f / 60;
      while (naechster < B.length && B[naechster].k.f0 <= f) { B[naechster].an = true; aktiv.push(B[naechster]); naechster++; }
      // Bild speichern
      for (const b of aktiv) {
        const i = (f - b.k.f0) * 7;
        const a = b.k.bahn;
        a[i] = b.p.x; a[i + 1] = b.weg ? -1000 : b.p.y; a[i + 2] = b.p.z;
        a[i + 3] = b.q.x; a[i + 4] = b.q.y; a[i + 5] = b.q.z; a[i + 6] = b.q.w;
      }
      for (let sub = 0; sub < 2; sub++) {
        const t = tf + sub * dt;
        // Explosionen stoßen Blöcke weg
        while (exI < ex.length && ex[exI].t <= t) {
          const E = ex[exI++];
          for (const b of aktiv) {
            if (b.k.t0 >= E.t - 1e-6 && Math.abs(b.k.t0 - E.t) < 1e-3) continue; // eigene Trümmer haben schon Schwung
            tmpV.set(b.p.x - E.pos[0], b.p.y - E.pos[1], b.p.z - E.pos[2]);
            const d = tmpV.length();
            const RR = E.r * 1.7;
            if (d > RR) continue;
            const k = (1 - d / RR) * 16;
            tmpV.normalize();
            b.v.addScaledVector(tmpV, k);
            b.v.y += k * 0.4 + 2;
            b.w.set((zuf() - 0.5) * 12, (zuf() - 0.5) * 12, (zuf() - 0.5) * 12);
            b.schlaf = false; b.ruhe = 0;
          }
        }
        for (const b of aktiv) {
          if (b.schlaf || b.weg) continue;
          b.v.y -= g * dt;
          b.v.multiplyScalar(0.999);
          b.p.addScaledVector(b.v, dt);
          if (b.p.y < -40) { b.weg = true; continue; }
          b.kontakt = weltKontakt(b, t);
        }
        // Blöcke untereinander (Gitter-Suche)
        const gitter = new Map();
        for (const b of aktiv) {
          if (b.weg) continue;
          const k = NK(Math.floor(b.p.x), Math.floor(b.p.y), Math.floor(b.p.z));
          let l = gitter.get(k);
          if (!l) gitter.set(k, (l = []));
          l.push(b);
        }
        for (const b of aktiv) {
          if (b.weg) continue;
          const bx = Math.floor(b.p.x), by = Math.floor(b.p.y), bz = Math.floor(b.p.z);
          for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
            const l = gitter.get(NK(bx + dx, by + dy, bz + dz));
            if (!l) continue;
            for (const c of l) {
              if (c.i <= b.i) continue;
              tmpV.subVectors(b.p, c.p);
              let d = tmpV.length();
              if (d >= 2 * R || d < 1e-6) continue;
              tmpV.divideScalar(d);
              const pen = 2 * R - d;
              const bw = b.schlaf ? 0 : 1, cw = c.schlaf ? 0 : 1;
              const sum = bw + cw || 1;
              b.p.addScaledVector(tmpV, pen * bw / sum);
              c.p.addScaledVector(tmpV, -pen * cw / sum);
              const rel = b.v.dot(tmpV) - c.v.dot(tmpV);
              if (rel < 0) {
                const imp = -(1 + e * 0.5) * rel / 2;
                if (!b.schlaf) b.v.addScaledVector(tmpV, imp);
                if (!c.schlaf) c.v.addScaledVector(tmpV, -imp);
                if (-rel > 3) { b.schlaf = false; c.schlaf = false; b.ruhe = c.ruhe = 0; }
                if (tmpV.y > 0.6) b.kontakt = true;
                if (tmpV.y < -0.6) c.kontakt = true;
              }
            }
          }
        }
        // Drehen und Einschlafen
        for (const b of aktiv) {
          if (b.schlaf || b.weg) continue;
          const wl = b.w.length();
          if (wl > 1e-4) {
            tmpQ.setFromAxisAngle(tmpV.copy(b.w).divideScalar(wl), wl * dt);
            b.q.premultiply(tmpQ).normalize();
          }
          if (b.kontakt) {
            b.w.multiplyScalar(0.9);
            if (b.v.length() < 2) b.q.slerp(einrasten(b.q), 0.12);
            if (b.v.length() < 0.25 && wl < 0.3) {
              b.ruhe += dt;
              if (b.ruhe > 0.35) { b.schlaf = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0); b.q.copy(einrasten(b.q)); }
            } else b.ruhe = 0;
          } else b.ruhe = 0;
        }
        // Schlafende Blöcke ohne Halt wieder wecken (z. B. wenn darunter etwas explodiert)
        if (f % 6 === 0 && sub === 0) {
          for (const b of aktiv) {
            if (!b.schlaf) continue;
            const x = Math.round(b.p.x), z = Math.round(b.p.z), y = Math.floor(b.p.y - R - 0.05);
            let halt = W.fest(x, y, z, t);
            if (!halt) for (const c of aktiv) if (c !== b && !c.weg && Math.abs(c.p.x - b.p.x) < 0.9 && Math.abs(c.p.z - b.p.z) < 0.9 && b.p.y - c.p.y > 0.6 && b.p.y - c.p.y < 1.1) { halt = true; break; }
            if (!halt) { b.schlaf = false; b.ruhe = 0; }
          }
        }
      }
    }
  };

  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  // Lage eines Körpers zu Zeit t (null = noch nicht da)
  BF.koerperLage = function (k, t, pos, quat) {
    if (!k.bahn) return false;
    const fz = t * 60 - k.f0;
    if (fz < 0) return false;
    const i0 = Math.min(k.n - 1, Math.floor(fz)), i1 = Math.min(k.n - 1, i0 + 1);
    const u = Math.min(1, fz - i0);
    const a = k.bahn, A = i0 * 7, Bb = i1 * 7;
    if (a[A + 1] < -500) return false;
    pos.set(a[A] + (a[Bb] - a[A]) * u, a[A + 1] + (a[Bb + 1] - a[A + 1]) * u, a[A + 2] + (a[Bb + 2] - a[A + 2]) * u);
    qa.set(a[A + 3], a[A + 4], a[A + 5], a[A + 6]);
    qb.set(a[Bb + 3], a[Bb + 4], a[Bb + 5], a[Bb + 6]);
    quat.copy(qa).slerp(qb, u);
    return true;
  };
})();
