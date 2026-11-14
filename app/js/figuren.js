// Blockfilm – Block-Figuren (Menschen mit 64×64-Skin-Aufbau und Tiere) und ihre Bewegungen
(function () {
  const BF = (window.BF = window.BF || {});
  const { hex, rgba } = BF;

  // ---------- Skin malen (gleiches Raster wie übliche 64×64-Skins) ----------
  function flaechen(u, v, w, h, d) {
    return {
      oben: [u + d, v, w, d], unten: [u + d + w, v, w, d],
      rechts: [u, v + d, d, h], vorne: [u + d, v + d, w, h], links: [u + d + w, v + d, d, h], hinten: [u + 2 * d + w, v + d, w, h],
    };
  }
  function malKasten(ctx, u, v, w, h, d, fn, r) {
    const F = flaechen(u, v, w, h, d);
    for (const [name, [x0, y0, ww, hh]] of Object.entries(F)) {
      for (let y = 0; y < hh; y++) for (let x = 0; x < ww; x++) {
        const c = fn(name, x, y, ww, hh);
        if (!c) continue;
        ctx.fillStyle = rgba(hex(c), 0.93 + r() * 0.12);
        ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }
    }
  }

  function skinMalen(d) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const r = BF.rng(BF.hash(JSON.stringify(d)));
    const haut = d.haut, haare = d.glatze ? d.haut : d.haare;
    const dunkel = (f, k) => '#' + new THREE.Color(f).multiplyScalar(k).getHexString();
    // Kopf
    malKasten(ctx, 0, 0, 8, 8, 8, (f, x, y) => {
      if (f === 'oben') return haare;
      if (f === 'unten') return haut;
      if (d.helm) {
        if (f !== 'vorne') return haare;
        if (y === 4 && (x === 2 || x === 5)) return d.augen;
        if (y === 4) return '#151515';
        if (y === 3 || y === 5) return dunkel(haare, 0.85);
        return haare;
      }
      if (d.maske && f === 'vorne') {
        if (y === 4 && (x === 2 || x === 5)) return '#e8e8e8';
        if (y === 4 && (x === 1 || x === 6)) return haut;
        if (y === 3) return haut;
        return '#1a1a1a';
      }
      if (f === 'hinten') return y < 6 ? haare : haut;
      if (f === 'rechts' || f === 'links') return y < 2 || (y < 4 && ((f === 'rechts' && x < 3) || (f === 'links' && x > 4))) ? haare : haut;
      // Gesicht
      if (y < 2) return haare;
      if (y === 2 && (x === 0 || x === 7)) return haare;
      if (y === 4) {
        if (x === 1) return '#f4f4f4';
        if (x === 2) return d.augen;
        if (x === 5) return d.augen;
        if (x === 6) return '#f4f4f4';
      }
      if (d.brille && (y === 3 || y === 4) && (x === 0 || x === 3 || x === 4 || x === 7 || y === 3)) return '#1d1d1d';
      if (y === 5 && (x === 3 || x === 4)) return dunkel(haut, 0.86);
      if (d.bart && y >= 5) return y === 6 && (x === 3 || x === 4) ? '#6a3a2a' : haare;
      if (y === 6 && (x === 3 || x === 4)) return '#6e3c30';
      if (y === 6 && (x === 2 || x === 5)) return dunkel(haut, 0.9);
      return haut;
    }, r);
    // Rumpf
    const hemd = d.hemd, hose = d.hose;
    malKasten(ctx, 16, 16, 8, 12, 4, (f, x, y) => {
      if (d.robe) return y === 0 && f === 'vorne' ? dunkel(hemd, 0.8) : hemd;
      if (y === 11) return dunkel(hose, 0.75);
      if (f === 'vorne' && y === 0 && x > 1 && x < 6) return haut;
      return hemd;
    }, r);
    const armB = d.duenn ? 2 : d.schmal ? 3 : 4;
    const arm = (f, x, y) => {
      if (d.robe) return y < 8 ? hemd : haut;
      if (d.duenn) return haut;
      return y < 4 && f !== 'unten' ? hemd : f === 'oben' ? hemd : haut;
    };
    malKasten(ctx, 40, 16, armB, 12, 4, arm, r);
    malKasten(ctx, 32, 48, armB, 12, 4, arm, r);
    const bein = (f, x, y) => {
      if (d.robe) return y < 10 ? hemd : d.schuhe;
      if (d.duenn) return haut;
      return y >= 10 || f === 'unten' ? d.schuhe : hose;
    };
    malKasten(ctx, 0, 16, d.duenn ? 2 : 4, 12, d.duenn ? 2 : 4, bein, r);
    malKasten(ctx, 16, 48, d.duenn ? 2 : 4, 12, d.duenn ? 2 : 4, bein, r);
    // Krone auf der Hut-Ebene
    if (d.krone) {
      malKasten(ctx, 32, 0, 8, 8, 8, (f, x, y) => {
        if (f === 'oben' || f === 'unten') return null;
        if (y === 0 && x % 2 === 0) return '#f2cc3a';
        if (y === 1) return x === 3 ? '#d02020' : '#f2cc3a';
        return null;
      }, r);
    }
    return c;
  }

  // UV-Koordinaten eines Kastens auf das Skin-Raster legen
  function kastenGeo(w, h, d, u, v, s, auf = 0, B = 64, H = 64) {
    const g = new THREE.BoxGeometry((w + auf * 2) * s, (h + auf * 2) * s, (d + auf * 2) * s);
    const F = flaechen(u, v, w, h, d);
    const reihen = [F.links, F.rechts, F.oben, F.unten, F.vorne, F.hinten];
    const uv = g.attributes.uv;
    reihen.forEach((rr, fi) => {
      const [x0, y0, ww, hh] = rr;
      const u0 = x0 / B, u1 = (x0 + ww) / B, v0 = 1 - y0 / H, v1 = 1 - (y0 + hh) / H;
      let a = [[u0, v0], [u1, v0], [u0, v1], [u1, v1]];
      if (fi === 3) a = [[u0, v1], [u1, v1], [u0, v0], [u1, v0]];
      for (let k = 0; k < 4; k++) uv.setXY(fi * 4 + k, a[k][0], a[k][1]);
    });
    uv.needsUpdate = true;
    return g;
  }

  // ---------- Gegenstände ----------
  const MATERIAL_FARBE = { holz: '#8a6a3d', stein: '#8a8a8a', eisen: '#dcdcdc', gold: '#f2d23a', diamant: '#4fe0d8', netherit: '#4a4446' };
  function gegenstand(name) {
    const g = new THREE.Group();
    if (!name) return g;
    let mat = 'eisen', art = name;
    for (const m of Object.keys(MATERIAL_FARBE)) if (name.startsWith(m) && name.length > m.length) { mat = m; art = name.slice(m.length); }
    const s = 0.042;
    const box = (w, h, d, x, y, z, farbe, leucht) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, d * s), new THREE.MeshLambertMaterial({ color: farbe, emissive: leucht ? farbe : 0x000000, emissiveIntensity: leucht ? 1 : 0 }));
      m.position.set(x * s, y * s, z * s);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    const griff = '#6b4a28', f = MATERIAL_FARBE[mat];
    switch (art) {
      case 'schwert':
        box(1, 4, 1, 0, 0, 0, griff); box(5, 1, 1.4, 0, 2.5, 0, '#3a3a3a'); box(1.6, 10, 0.7, 0, 8, 0, f); box(0.8, 1.2, 0.7, 0, 13.6, 0, f); break;
      case 'axt':
        box(1, 13, 1, 0, 3, 0, griff); box(1, 4, 4, 0, 8, 2, f); break;
      case 'spitzhacke': case 'hacke':
        box(1, 13, 1, 0, 3, 0, griff); box(1, 1.5, 10, 0, 9, 0, f); box(1, 1, 1.5, 0, 8.2, 5, f); box(1, 1, 1.5, 0, 8.2, -5, f); break;
      case 'schaufel':
        box(1, 12, 1, 0, 3, 0, griff); box(3, 4, 0.8, 0, 10.5, 0, f); break;
      case 'fackel':
        box(1, 8, 1, 0, 1, 0, griff); box(1.6, 1.6, 1.6, 0, 5.6, 0, '#ffd65a', true); break;
      case 'stock':
        box(1, 12, 1, 0, 2, 0, griff); break;
      case 'bogen':
        box(1, 5, 1, 0, 6, 1.5, '#7a5530'); box(1, 5, 1, 0, -1.5, 1.5, '#7a5530'); box(1, 4, 1, 0, 2.3, 2.5, '#7a5530'); box(0.3, 14, 0.3, 0, 2.3, 0, '#e0e0e0'); break;
      case 'blume':
        box(0.6, 6, 0.6, 0, 1, 0, '#3f8f2a'); box(2.4, 2.4, 2.4, 0, 5, 0, '#d8282a'); box(0.8, 0.8, 0.8, 0, 5, 1.3, '#f2d23a'); break;
      case 'apfel':
        box(3, 3, 3, 0, 1.5, 0, '#d42a1e'); box(0.5, 1.2, 0.5, 0, 3.6, 0, griff); break;
      case 'schild':
        box(8, 11, 1, 0, 2, 1.5, '#8a6a3d'); box(8.4, 1, 1.2, 0, 7.3, 1.5, '#9a9a9a'); box(8.4, 1, 1.2, 0, -3.3, 1.5, '#9a9a9a'); break;
      case 'buch':
        box(4, 5, 1.6, 0, 1, 0, '#6b2a20'); box(3.6, 4.6, 1.7, 0.1, 1, 0, '#f0e8d8'); break;
      case 'kuchen':
        box(5, 2.5, 5, 0, 0.5, 0, '#e8c8a0'); box(5.2, 1, 5.2, 0, 2.1, 0, '#f4f4f4'); break;
      case 'diamant':
        box(2.4, 2.4, 2.4, 0, 1, 0, '#4fe0d8', true); break;
    }
    return g;
  }

  // ---------- Mensch ----------
  function baueMensch(a, laden) {
    const d = Object.assign({}, a.def);
    const sk = (d.skala || 1) * 1.8 / 32;
    const armB = d.duenn ? 2 : d.schmal ? 3 : 4;
    const beinB = d.duenn ? 2 : 4;
    const leinwand = skinMalen(d);
    const tex = new THREE.CanvasTexture(leinwand);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5 });
    const matUeber = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const teile = [];
    const mesh = (geo, m = mat) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true; teile.push(x); return x; };

    const root = new THREE.Group();
    const kipp = new THREE.Group(); root.add(kipp);
    const huefte = new THREE.Group(); huefte.position.y = 12 * sk; kipp.add(huefte);
    const rumpf = mesh(kastenGeo(8, 12, 4, 16, 16, sk)); rumpf.position.y = 6 * sk; huefte.add(rumpf);
    const kopf = new THREE.Group(); kopf.position.y = 12 * sk; huefte.add(kopf);
    const kopfM = mesh(kastenGeo(8, 8, 8, 0, 0, sk)); kopfM.position.y = 4 * sk; kopf.add(kopfM);
    const armR = new THREE.Group(); armR.position.set(-(4 + armB / 2) * sk, 10 * sk, 0); huefte.add(armR);
    const armL = new THREE.Group(); armL.position.set((4 + armB / 2) * sk, 10 * sk, 0); huefte.add(armL);
    const armRM = mesh(kastenGeo(armB, 12, d.duenn ? 2 : 4, 40, 16, sk)); armRM.position.y = -4 * sk; armR.add(armRM);
    const armLM = mesh(kastenGeo(armB, 12, d.duenn ? 2 : 4, 32, 48, sk)); armLM.position.y = -4 * sk; armL.add(armLM);
    const beinR = new THREE.Group(); beinR.position.set(-beinB / 2 * sk, 12 * sk, 0); kipp.add(beinR);
    const beinL = new THREE.Group(); beinL.position.set(beinB / 2 * sk, 12 * sk, 0); kipp.add(beinL);
    const beinRM = mesh(kastenGeo(beinB, 12, beinB, 0, 16, sk)); beinRM.position.y = -6 * sk; beinR.add(beinRM);
    const beinLM = mesh(kastenGeo(beinB, 12, beinB, 16, 48, sk)); beinLM.position.y = -6 * sk; beinL.add(beinLM);
    // zweite Ebene (Hut, Jacke …) – nur sichtbar, wo der Skin dort Pixel hat
    const ueber = [];
    const ebene = (eltern, w, h, dd, u, v, y) => { const m = mesh(kastenGeo(w, h, dd, u, v, sk, 0.5), matUeber); m.position.y = y; eltern.add(m); ueber.push(m); };
    ebene(kopf, 8, 8, 8, 32, 0, 4 * sk);
    ebene(huefte, 8, 12, 4, 16, 32, 6 * sk);
    ebene(armR, armB, 12, 4, 40, 32, -4 * sk);
    ebene(armL, armB, 12, 4, 48, 48, -4 * sk);
    ebene(beinR, beinB, 12, beinB, 0, 32, -6 * sk);
    ebene(beinL, beinB, 12, beinB, 0, 48, -6 * sk);
    const hand = new THREE.Group(); hand.position.set(0, -9.5 * sk, 0.5 * sk); hand.rotation.x = 1.15; armR.add(hand);
    let itemName;

    if (d.skin && laden) {
      laden(d.skin).then(bild => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (bild.height === bild.width / 2) {
          ctx.drawImage(bild, 0, 0, 64, 32);
          // alte Skins: linke Seite = rechte Seite
          ctx.drawImage(c, 0, 16, 16, 16, 16, 48, 16, 16);
          ctx.drawImage(c, 40, 16, 16, 16, 32, 48, 16, 16);
        } else ctx.drawImage(bild, 0, 0, 64, 64);
        tex.image = c;
        tex.needsUpdate = true;
      }).catch(() => {});
    }

    return {
      root, mats: [mat, matUeber], teile,
      setzePose(z, t) {
        if (itemName !== z.item) {
          itemName = z.item;
          while (hand.children.length) hand.remove(hand.children[0]);
          if (z.item) hand.add(gegenstand(z.item));
        }
        root.position.set(z.x, z.y + z.sprung, z.z);
        root.rotation.y = z.yaw;
        const s = Math.max(0.001, z.sicht);
        root.scale.setScalar(s);
        root.visible = z.sicht > 0.01;
        // Grundhaltung
        let aRx = 0, aRz = 0, aRy = 0, aLx = 0, aLz = 0, aLy = 0, bRx = 0, bLx = 0, kx = 0, ky = 0, kz = 0, hx = 0, hy = 0, hz = 0, hueftY = 0;
        // leichtes Atmen / Armschwingen im Stand
        aRz = -0.03 - Math.sin(t * 1.7 + a.start.x) * 0.03; aLz = 0.03 + Math.sin(t * 1.7 + a.start.x) * 0.03;
        aRx = Math.sin(t * 1.1 + a.start.z) * 0.04; aLx = -aRx;
        if (z.gang) {
          const amp = z.gang.stil === 'laeuft' ? 1.15 : z.gang.stil === 'schleicht' ? 0.55 : z.gang.stil === 'fliegt' ? 0.1 : 0.85;
          const p = z.gang.phase * (z.rueck ? -1 : 1);
          bRx = Math.sin(p) * amp; bLx = -bRx;
          aRx = -Math.sin(p) * amp * 0.85; aLx = -aRx;
          if (z.gang.stil === 'laeuft') { hx = 0.15; }
          if (z.gang.stil === 'schleicht') { hx = 0.45; hueftY = -1.5; }
        }
        if (z.sprung > 0.05 && !z.gang) { bRx = -0.3; bLx = 0.2; aRz = -0.35; aLz = 0.35; }
        if (z.flug) { aRz = -0.5; aLz = 0.5; bRx = 0.15; bLx = -0.15; }
        if (z.item && !z.gang) aRx = -0.3;
        else if (z.item && z.gang) aRx = aRx * 0.4 - 0.3;
        // Kopf schaut irgendwo hin
        if (z.blick === 'oben') kx = -0.6;
        else if (z.blick === 'unten') kx = 0.6;
        else if (z.blick && z.blickPunkt) {
          const kp = z.blickPunkt;
          const dx = kp[0] - z.x, dz = kp[2] - z.z, dy = kp[1] - (z.y + 1.55);
          let w = Math.atan2(dx, dz) - z.yaw;
          while (w > Math.PI) w -= Math.PI * 2;
          while (w < -Math.PI) w += Math.PI * 2;
          ky = Math.max(-1.1, Math.min(1.1, w));
          kx = Math.max(-0.8, Math.min(0.8, -Math.atan2(dy, Math.hypot(dx, dz))));
        }
        for (const g of z.gesten) {
          const u = g.u, lt = g.lt;
          const ein = Math.min(1, lt / 0.15, (g.d - lt) / 0.15);
          switch (g.typ) {
            case 'winken': aRz = BF.lerp(aRz, -2.7 + Math.sin(lt * 11) * 0.35, ein); aRx = BF.lerp(aRx, 0, ein); break;
            case 'nicken': kx += Math.sin(u * Math.PI * 4) * 0.35 * ein; break;
            case 'schuetteln': ky += Math.sin(u * Math.PI * 6) * 0.5 * ein; break;
            case 'schlag': { const sw = Math.sin(Math.min(1, u * 1.2) * Math.PI); aRx = -0.4 - sw * 1.6; aRy = sw * 0.4; hy = sw * 0.25; break; }
            case 'abbauen': { const sw = Math.abs(Math.sin(lt * Math.PI * 4)); aRx = -0.6 - sw * 1.2; hy = sw * 0.15; kx = 0.25; break; }
            case 'jubeln': aRz = BF.lerp(aRz, -2.8 + Math.sin(lt * 9) * 0.2, ein); aLz = BF.lerp(aLz, 2.8 - Math.sin(lt * 9) * 0.2, ein); kx = -0.3 * ein; break;
            case 'tanzen': {
              const b = lt * Math.PI * 2 * 1.8;
              aRz = -1.2 - Math.sin(b) * 1.0; aLz = 1.2 - Math.sin(b + Math.PI) * 1.0;
              hz = Math.sin(b) * 0.15; ky = Math.sin(b * 0.5) * 0.4; bRx = Math.max(0, Math.sin(b)) * 0.6; bLx = Math.max(0, -Math.sin(b)) * 0.6;
              hueftY = -Math.abs(Math.sin(b)) * 1.2;
              break;
            }
            case 'lachen': kx = -0.35 * ein + Math.sin(lt * 25) * 0.08; hx = -0.1 * ein; aRz = -0.25; aLz = 0.25; break;
            case 'weinen': kx = 0.5 * ein; aRx = -2.0 * ein; aLx = -2.0 * ein; aRz = 0.35 * ein; aLz = -0.35 * ein; break;
            case 'zeigen': aRx = BF.lerp(aRx, -1.55, ein); break;
            case 'schreck': aRz = -2.2 * ein; aLz = 2.2 * ein; kx = -0.3 * ein; hx = -0.2 * ein; break;
            case 'reden': kx += Math.sin(lt * 18) * 0.04; aRx += Math.sin(lt * 6) * 0.15 * ein; break;
            case 'umschauen': ky = Math.sin(u * Math.PI * 2) * 0.9 * ein; break;
            case 'essen': aRx = -1.3 * ein; aRy = 0.5 * ein; kx = 0.15 + Math.sin(lt * 14) * 0.08; break;
          }
        }
        // Sitzen
        if (z.sitzen > 0) { bRx = BF.lerp(bRx, -1.5, z.sitzen); bLx = BF.lerp(bLx, -1.5, z.sitzen); hueftY += -10 * z.sitzen; bRx -= 0; }
        armR.rotation.set(aRx, aRy, aRz);
        armL.rotation.set(aLx, aLy, aLz);
        beinR.rotation.x = bRx; beinL.rotation.x = bLx;
        kopf.rotation.set(kx, ky, 0);
        huefte.rotation.set(hx, hy, hz);
        // Liegen (seitlich umkippen wie beim Umfallen) + Drehen beim Wegfliegen
        kipp.position.y = hueftY * sk + z.liegen * 2 * sk;
        kipp.rotation.set(z.spin, 0, z.liegen * Math.PI / 2);
        // rot aufblitzen bei Treffer
        const rot = z.aua > 0 ? 0.55 * z.aua : 0;
        for (const m of this.mats) m.color.setRGB(1, 1 - rot, 1 - rot);
      },
    };
  }

  // ---------- Tiere ----------
  const texCache = {};
  function farbTex(farbe, flecken, augen, extra) {
    const key = [farbe, flecken, augen, extra].join('|');
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const ctx = c.getContext('2d');
    const r = BF.rng(BF.hash(key));
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.fillStyle = rgba(hex(farbe), 0.9 + r() * 0.18); ctx.fillRect(x, y, 1, 1); }
    if (flecken) for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 6), y = Math.floor(r() * 6); ctx.fillStyle = flecken; ctx.fillRect(x, y, 2 + Math.floor(r() * 2), 2); }
    if (augen) {
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(1, 3, 1, 1); ctx.fillRect(6, 3, 1, 1);
      ctx.fillStyle = augen; ctx.fillRect(2, 3, 1, 1); ctx.fillRect(5, 3, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
    return (texCache[key] = t);
  }

  const TIER_BAU = {
    schwein: { bein: 6, rumpf: [10, 8, 16], kopf: [8, 8, 8], schnauze: [4, 3, 1] },
    kuh: { bein: 12, rumpf: [12, 10, 18], kopf: [8, 8, 6], hoerner: true },
    schaf: { bein: 12, rumpf: [10, 10, 16], kopf: [6, 6, 8], wolle: true },
    hund: { bein: 8, rumpf: [6, 6, 10], kopf: [6, 6, 5], schwanz: [2, 2, 8], ohren: true },
    katze: { bein: 6, rumpf: [4, 5, 14], kopf: [5, 4, 5], schwanz: [1, 1, 9], ohren: true },
    pferd: { bein: 16, rumpf: [10, 10, 22], kopf: [6, 6, 12], maehne: true },
    huhn: { bein: 5, rumpf: [6, 6, 8], kopf: [4, 6, 3], zweibeiner: true, schnabel: true },
    spinne: { bein: 6, rumpf: [10, 8, 12], kopf: [8, 8, 8], spinne: true },
  };
  BF.TIER_MASSE = function (a) {
    const b = TIER_BAU[a.art], s = (1 / 16) * (a.def.gross || 1) * (a.def.skala || 1);
    return { kopfY: (b.bein + b.rumpf[1] + 2) * s, kopfZ: (b.rumpf[2] / 2 + b.kopf[2] / 2) * s };
  };

  function baueTier(a) {
    const d = a.def, b = TIER_BAU[a.art];
    const s = (1 / 16) * (d.gross || 1) * (d.skala || 1);
    const mats = [];
    const lam = tex => { const m = new THREE.MeshLambertMaterial({ map: tex }); mats.push(m); return m; };
    const kasten = (w, h, dd, matArr) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, dd * s), matArr); m.castShadow = true; m.receiveShadow = true; return m; };
    const root = new THREE.Group();
    const kipp = new THREE.Group(); root.add(kipp);
    const koerper = new THREE.Group(); kipp.add(koerper);
    const [rw, rh, rl] = b.rumpf;
    const rumpfMat = lam(farbTex(d.koerper, d.flecken));
    const rumpf = kasten(rw, rh, rl, rumpfMat);
    rumpf.position.y = (b.bein + rh / 2) * s;
    koerper.add(rumpf);
    if (b.wolle) { const w = kasten(rw + 2, rh + 2, rl - 2, lam(farbTex('#ececec'))); w.position.copy(rumpf.position); koerper.add(w); }
    const kopf = new THREE.Group();
    kopf.position.set(0, (b.bein + rh - 1) * s, (rl / 2) * s);
    koerper.add(kopf);
    const [kw, kh, kl] = b.kopf;
    const seite = lam(farbTex(d.kopf)), vorne = lam(farbTex(d.kopf, null, d.augen || '#1a1a1a'));
    const kopfM = kasten(kw, kh, kl, [seite, seite, seite, seite, vorne, seite]);
    kopfM.position.set(0, kh / 2 * s - 1 * s, kl / 2 * s);
    kopf.add(kopfM);
    if (b.schnauze) { const sn = kasten(...b.schnauze, lam(farbTex(d.schnauze || '#e3807d'))); sn.position.set(0, (kh / 2 - 3) * s, (kl + 0.5) * s); kopf.add(sn); }
    if (b.hoerner) for (const x of [-4.5, 4.5]) { const h = kasten(1, 3, 1, lam(farbTex('#e8e0c8'))); h.position.set(x * s, (kh + 0) * s, (kl / 2) * s); kopf.add(h); }
    if (b.ohren) for (const x of [-kw / 2 + 1, kw / 2 - 1]) { const o = kasten(2, 2, 1, seite); o.position.set(x * s, (kh - 0.5) * s, (kl / 2 - 1) * s); kopf.add(o); }
    if (b.schnabel) { const sn = kasten(4, 2, 2, lam(farbTex('#f2b52a'))); sn.position.set(0, (kh / 2 - 0.5) * s, (kl + 1) * s); kopf.add(sn); const k = kasten(2, 2, 1, lam(farbTex('#d8282a'))); k.position.set(0, (kh / 2 - 2.5) * s, (kl + 0.5) * s); kopf.add(k); }
    if (b.maehne) { const m = kasten(2, 4, kl + 8, lam(farbTex(d.maehne || '#3a2414'))); m.position.set(0, (kh + 1) * s, (kl / 2 - 6) * s); kopf.add(m); kopf.rotation.x = -0.5; kopf.position.y += 3 * s; }
    let schwanz = null;
    if (b.schwanz) { schwanz = new THREE.Group(); schwanz.position.set(0, (b.bein + rh - 1) * s, -rl / 2 * s); const m = kasten(...b.schwanz, rumpfMat); m.position.z = -b.schwanz[2] / 2 * s; schwanz.add(m); schwanz.rotation.x = 0.7; koerper.add(schwanz); }
    const beine = [];
    const beinMat = lam(farbTex(d.beine));
    const bw = b.zweibeiner ? 1 : b.spinne ? 2 : 4;
    const pos = b.zweibeiner ? [[-1.5, 0], [1.5, 0]] : [[-(rw / 2 - bw / 2), rl / 2 - bw / 2 - 1], [rw / 2 - bw / 2, rl / 2 - bw / 2 - 1], [-(rw / 2 - bw / 2), -(rl / 2 - bw / 2 - 1)], [rw / 2 - bw / 2, -(rl / 2 - bw / 2 - 1)]];
    if (b.spinne) { pos.length = 0; for (const zz of [-4, -1.5, 1.5, 4]) for (const x of [-1, 1]) pos.push([x * rw / 2, zz]); }
    for (const [x, zz] of pos) {
      const g = new THREE.Group();
      g.position.set(x * s, b.bein * s, zz * s);
      const lang = b.spinne ? 14 : b.bein;
      const m = kasten(bw, lang, bw, beinMat);
      m.position.y = -lang / 2 * s;
      g.add(m);
      if (b.spinne) { g.rotation.z = x < 0 ? -1.0 : 1.0; g.position.y = (b.bein + 2) * s; }
      koerper.add(g);
      beine.push(g);
    }
    return {
      root, mats, teile: [],
      setzePose(z, t) {
        root.position.set(z.x, z.y + z.sprung, z.z);
        root.rotation.y = z.yaw;
        root.scale.setScalar(Math.max(0.001, z.sicht));
        root.visible = z.sicht > 0.01;
        let ph = 0, amp = 0;
        if (z.gang) { ph = z.gang.phase * 1.3; amp = z.gang.stil === 'laeuft' ? 1.0 : 0.7; }
        beine.forEach((g, i) => {
          if (b.spinne) { g.rotation.x = Math.sin(ph + i * 1.3) * amp * 0.4; return; }
          const vorne = i < 2, links = i % 2 === 1;
          g.rotation.x = Math.sin(ph + (vorne === links ? 0 : Math.PI)) * amp * 0.8;
        });
        let kx = 0, ky = 0;
        if (z.blick && z.blickPunkt) {
          const kp = z.blickPunkt;
          let w = Math.atan2(kp[0] - z.x, kp[2] - z.z) - z.yaw;
          while (w > Math.PI) w -= Math.PI * 2;
          while (w < -Math.PI) w += Math.PI * 2;
          ky = Math.max(-0.9, Math.min(0.9, w));
        }
        for (const g of z.gesten) {
          if (g.typ === 'nicken' || g.typ === 'essen') kx += Math.sin(g.u * Math.PI * 4) * 0.4;
          if (g.typ === 'schuetteln' || g.typ === 'umschauen') ky += Math.sin(g.u * Math.PI * 6) * 0.5;
          if (g.typ === 'reden' || g.typ === 'lachen') kx += Math.sin(g.lt * 16) * 0.12;
          if (g.typ === 'jubeln' || g.typ === 'tanzen') { kipp.position.y = Math.abs(Math.sin(g.lt * 9)) * 0.3; }
        }
        kopf.rotation.y = ky;
        kopf.rotation.x = (b.maehne ? -0.5 : 0) + kx;
        if (schwanz) schwanz.rotation.y = Math.sin(t * (z.gang ? 9 : 3)) * 0.4;
        kipp.rotation.set(z.spin, 0, z.liegen * Math.PI / 2);
        if (!z.gesten.some(g => g.typ === 'jubeln' || g.typ === 'tanzen')) kipp.position.y = z.liegen * (rw / 2) * s;
        const rot = z.aua > 0 ? 0.55 * z.aua : 0;
        for (const m of mats) m.color.setRGB(1, 1 - rot, 1 - rot);
      },
    };
  }

  BF.baueFigur = function (a, laden) {
    return a.tier ? baueTier(a) : baueMensch(a, laden);
  };
  BF.gegenstand = gegenstand;
})();
