// Blockfilm – 3D-Szene: Welt, Figuren, Physik-Blöcke, Partikel, Himmel und 2D-Einblendungen
(function () {
  const BF = (window.BF = window.BF || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const ZUF = BF.rng(99);
  const ZUF_TAB = new Float32Array(8192);
  for (let i = 0; i < ZUF_TAB.length; i++) ZUF_TAB[i] = ZUF();
  const zr = (seed, i) => ZUF_TAB[((seed * 131 + i * 7919) >>> 0) % ZUF_TAB.length];

  class Szene {
    constructor(ausgabe) {
      this.ausgabe = ausgabe;
      this.ctx = ausgabe.getContext('2d');
      this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setPixelRatio(1);
      this.scene = new THREE.Scene();
      this.kamera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 1200);
      this.ladeFn = null;
      this.ladeListe = [];
      this.schattenGroesse = 2048;
      this._aufbauFest();
    }

    _aufbauFest() {
      const S = this.scene;
      // Himmelskuppel mit Farbverlauf
      this.himmelMat = new THREE.ShaderMaterial({
        uniforms: { oben: { value: new THREE.Color() }, horizont: { value: new THREE.Color() } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 oben; uniform vec3 horizont; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.05,0.0,1.0); vec3 c = mix(horizont, oben, pow(h,0.7)); if(vP.y<0.0) c = horizont*0.85; gl_FragColor = vec4(c,1.0); }',
        side: THREE.BackSide, depthWrite: false, fog: false,
      });
      this.kuppel = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), this.himmelMat);
      this.kuppel.renderOrder = -10;
      S.add(this.kuppel);
      // Sonne / Mond als Quadrat
      this.sonne = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ color: 0xfff6c0, fog: false, transparent: true, depthWrite: false }));
      this.sonne.renderOrder = -9;
      S.add(this.sonne);
      // Sterne
      const sp = [];
      const r = BF.rng(7);
      for (let i = 0; i < 1600; i++) {
        const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        sp.push(Math.cos(th) * s * 850, Math.abs(u) * 850, Math.sin(th) * s * 850);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      this.sterneMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
      this.sterne = new THREE.Points(sg, this.sterneMat);
      this.sterne.renderOrder = -8;
      S.add(this.sterne);
      // Licht
      this.hemi = new THREE.HemisphereLight(0xffffff, 0x5a4a3a, 0.6);
      S.add(this.hemi);
      this.amb = new THREE.AmbientLight(0xffffff, 0.25);
      S.add(this.amb);
      this.sonnenLicht = new THREE.DirectionalLight(0xffffff, 0.9);
      this.sonnenLicht.castShadow = true;
      const sc = this.sonnenLicht.shadow.camera;
      sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 220;
      this.sonnenLicht.shadow.mapSize.set(2048, 2048);
      this.sonnenLicht.shadow.bias = -0.0006;
      this.sonnenLicht.shadow.normalBias = 0.03;
      S.add(this.sonnenLicht);
      S.add(this.sonnenLicht.target);
      S.fog = new THREE.Fog(0xb4d0ff, 50, 110);
      this._nebel = S.fog;
      // Wolken
      this.wolken = new THREE.Group();
      const wr = BF.rng(3);
      const pos = [];
      for (let gx = -20; gx < 20; gx++) for (let gz = -20; gz < 20; gz++) {
        const n = Math.sin(gx * 0.7 + Math.sin(gz * 0.3) * 2) + Math.sin(gz * 0.55 + gx * 0.2) + wr() * 0.6;
        if (n > 1.0) pos.push([gx * 12, gz * 12]);
      }
      const wg = new THREE.BoxGeometry(12, 4, 12);
      this.wolkenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false, depthWrite: false });
      for (const ox of [0, -480]) {
        const im = new THREE.InstancedMesh(wg, this.wolkenMat, pos.length);
        const m = new THREE.Matrix4();
        pos.forEach((p, i) => { m.makeTranslation(p[0] + ox, 0, p[1]); im.setMatrixAt(i, m); });
        im.renderOrder = -5;
        this.wolken.add(im);
      }
      this.wolken.position.y = 60;
      S.add(this.wolken);
      // Partikel (beleuchtet und leuchtend)
      const pg = new THREE.BoxGeometry(1, 1, 1);
      this.partLicht = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: 0xffffff }), 5000);
      this.partLeucht = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 5000);
      for (const p of [this.partLicht, this.partLeucht]) { p.instanceMatrix.setUsage(THREE.DynamicDrawUsage); p.setColorAt(0, new THREE.Color()); p.count = 0; p.frustumCulled = false; S.add(p); }
      this.partLicht.castShadow = true;
      // gezündetes TNT
      this.tntMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), BF.blockMaterial('tnt'), 128);
      this.tntBlitz = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, fog: false }), 128);
      for (const m of [this.tntMesh, this.tntBlitz]) { m.count = 0; m.frustumCulled = false; m.castShadow = true; S.add(m); }
      this.weltGruppe = new THREE.Group(); S.add(this.weltGruppe);
      this.figurGruppe = new THREE.Group(); S.add(this.figurGruppe);
      this.koerperGruppe = new THREE.Group(); S.add(this.koerperGruppe);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    }

    setzeFilm(F) {
      this.F = F;
      // alte Figuren weg
      while (this.figurGruppe.children.length) this.figurGruppe.remove(this.figurGruppe.children[0]);
      while (this.koerperGruppe.children.length) { const c = this.koerperGruppe.children[0]; this.koerperGruppe.remove(c); c.dispose && c.dispose(); }
      this.figuren = {};
      this.ladeListe = [];
      const laden = pfad => {
        const p = this.ladeFn ? this.ladeFn(pfad) : Promise.reject(new Error('kein Lader'));
        this.ladeListe.push(p.catch(() => {}));
        return p;
      };
      for (const n of F.reihenfolge) {
        const a = F.akteure[n];
        const f = BF.baueFigur(a, laden);
        this.figuren[n] = f;
        this.figurGruppe.add(f.root);
      }
      // Physik-Blöcke: ein InstancedMesh je Blocktyp
      this.koerperArten = {};
      for (const k of F.koerper) (this.koerperArten[k.typ] = this.koerperArten[k.typ] || []).push(k);
      this.koerperMeshes = {};
      const geo = new THREE.BoxGeometry(1, 1, 1);
      for (const [typ, liste] of Object.entries(this.koerperArten)) {
        const im = new THREE.InstancedMesh(geo, BF.blockMaterial(typ), liste.length);
        im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0;
        this.koerperMeshes[typ] = im;
        this.koerperGruppe.add(im);
      }
      this.blockStand = -1;
      this.blockKarte = null;
      if (BF.wissen) BF.wissen.aufbauen(this, F);
      this.wolken.visible = F.weltOpt.wolken;
    }

    bereit() { return Promise.all(this.ladeListe); }

    // ---------- Blockwelt ----------
    _welt(t) {
      const F = this.F, L = F.W.liste;
      let lo = 0, hi = L.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (L[m].t <= t) lo = m + 1; else hi = m; }
      const n = lo;
      if (n === this.blockStand) return;
      if (!this.blockKarte || n < this.blockStand) {
        this.blockKarte = new Map(F.W.basis);
        this.blockStand = 0;
      }
      for (let i = this.blockStand; i < n; i++) {
        const e = L[i];
        const k = e.x + ',' + e.y + ',' + e.z;
        if (e.typ) this.blockKarte.set(k, e.typ); else this.blockKarte.delete(k);
      }
      this.blockStand = n;
      this._weltMeshes();
    }

    _weltMeshes() {
      const G = this.weltGruppe;
      while (G.children.length) { const c = G.children[0]; G.remove(c); c.dispose && c.dispose(); }
      const K = this.blockKarte, T = BF.TYPEN;
      const proTyp = {};
      const verdeckt = (typ, x, y, z) => {
        const n = K.get(x + ',' + y + ',' + z);
        if (!n) return false;
        const d = T[n];
        if (n === typ) return true;
        return !(d.durchsichtig || d.alpha);
      };
      for (const [k, typ] of K) {
        const [x, y, z] = k.split(',').map(Number);
        if (verdeckt(typ, x + 1, y, z) && verdeckt(typ, x - 1, y, z) && verdeckt(typ, x, y + 1, z) && verdeckt(typ, x, y - 1, z) && verdeckt(typ, x, y, z + 1) && verdeckt(typ, x, y, z - 1)) continue;
        (proTyp[typ] = proTyp[typ] || []).push(x, y, z);
      }
      const geo = this._blockGeo || (this._blockGeo = new THREE.BoxGeometry(1, 1, 1));
      const m = this._m;
      for (const [typ, p] of Object.entries(proTyp)) {
        const n = p.length / 3;
        const d = T[typ];
        const im = new THREE.InstancedMesh(geo, BF.blockMaterial(typ), n);
        for (let i = 0; i < n; i++) { m.makeTranslation(p[i * 3], p[i * 3 + 1] + 0.5, p[i * 3 + 2]); im.setMatrixAt(i, m); }
        im.castShadow = !d.durchsichtig || d.alpha;
        im.receiveShadow = true;
        if (d.durchsichtig && !d.alpha) im.renderOrder = 2;
        im.frustumCulled = false;
        G.add(im);
      }
    }

    // ---------- Partikel ----------
    _partikel(t, kamPos) {
      const F = this.F;
      const L = this.partLicht, E = this.partLeucht;
      let nl = 0, ne = 0;
      const m = this._m, q = this._q, p = this._p, s = this._s, c = this._c;
      q.identity();
      const add = (leucht, x, y, z, gr, farbe, sx, sy, sz) => {
        const im = leucht ? E : L;
        const i = leucht ? ne : nl;
        if (i >= 5000 || gr <= 0.001) return;
        p.set(x, y, z); s.set(sx || gr, sy || gr, sz || gr);
        m.compose(p, q, s);
        im.setMatrixAt(i, m);
        c.set(farbe);
        im.setColorAt(i, c);
        if (leucht) ne++; else nl++;
      };
      const g = F.schwerkraft;
      for (const e of F.effekte) {
        if (t < e.t0 || t > e.t1 + 2.5) continue;
        const a = t - e.t0;
        const [cx, cy, cz] = e.pos || [0, 0, 0];
        const sd = e.seed || 1;
        switch (e.typ) {
          case 'explosion': {
            if (a > 2.2) break;
            const R = e.r;
            for (let i = 0; i < 26 && a < 0.55; i++) {
              const u = zr(sd, i) * 2 - 1, th = zr(sd, i + 50) * 6.283, sq = Math.sqrt(1 - u * u);
              const d = R * 0.7 * (1 - Math.exp(-a * 9)) * (0.4 + zr(sd, i + 90) * 0.6);
              const k = a / 0.55;
              add(true, cx + Math.cos(th) * sq * d, cy + u * d * 0.7 + 0.3, cz + Math.sin(th) * sq * d, (0.9 - k * 0.7) * (0.5 + zr(sd, i + 130)), k < 0.3 ? '#fff6c8' : k < 0.6 ? '#ffb340' : '#d0501a');
            }
            for (let i = 0; i < 46; i++) {
              const u = zr(sd, i + 200) * 2 - 1, th = zr(sd, i + 300) * 6.283, sq = Math.sqrt(1 - u * u);
              const leben = 1.2 + zr(sd, i + 400) * 1.0;
              if (a > leben) continue;
              const k = a / leben;
              const d = R * (0.5 + zr(sd, i + 500) * 0.6) * (1 - Math.exp(-a * 4));
              const grau = 0.95 - k * 0.45;
              c.setRGB(grau, grau, grau);
              add(false, cx + Math.cos(th) * sq * d, cy + Math.abs(u) * d * 0.6 + a * 1.4, cz + Math.sin(th) * sq * d, (0.5 + zr(sd, i + 600) * 0.6) * (1 - k * k) * (0.6 + a), '#' + c.getHexString());
            }
            break;
          }
          case 'rauch': {
            if (a > 1.3) break;
            for (let i = 0; i < 20; i++) {
              const th = zr(sd, i) * 6.283, d = 0.2 + zr(sd, i + 30) * 0.5 + a * 0.6;
              const k = a / 1.3;
              add(false, cx + Math.cos(th) * d, cy + (zr(sd, i + 60) - 0.5) * 1.4 + a * 0.9, cz + Math.sin(th) * d, (0.25 + zr(sd, i + 90) * 0.25) * (1 - k), e.lila ? '#b07ae0' : k < 0.4 ? '#f2f2f2' : '#bdbdbd');
            }
            break;
          }
          case 'herzen': {
            for (let i = 0; i < 7; i++) {
              const st = i * 0.15, aa = a - st;
              if (aa < 0 || aa > 1.6 || e.t0 + st > e.t1) continue;
              const k = aa / 1.6;
              const ox = (zr(sd, i) - 0.5) * 1.2, oz = (zr(sd, i + 10) - 0.5) * 1.2;
              const sz = 0.22 * (1 - k * k);
              const y = cy + 0.4 + aa * 0.9;
              add(true, cx + ox - sz * 0.25, y, cz + oz, sz * 0.55, '#ff3050'); add(true, cx + ox + sz * 0.25, y, cz + oz, sz * 0.55, '#ff3050'); add(true, cx + ox, y - sz * 0.3, cz + oz, sz * 0.55, '#e81c3c');
            }
            break;
          }
          case 'funken': {
            if (a > 1.2) break;
            for (let i = 0; i < 34; i++) {
              const th = zr(sd, i) * 6.283, v = 2 + zr(sd, i + 40) * 4, vy = 2 + zr(sd, i + 80) * 5;
              add(true, cx + Math.cos(th) * v * a, cy + vy * a - 0.5 * g * 0.5 * a * a, cz + Math.sin(th) * v * a, 0.09 * (1 - a / 1.2), zr(sd, i + 120) > 0.5 ? '#ffe680' : '#ffb030');
            }
            break;
          }
          case 'magie': {
            const dauer = e.t1 - e.t0;
            if (a > dauer + 0.8) break;
            for (let i = 0; i < 40; i++) {
              const st = (i / 40) * dauer, aa = a - st;
              if (aa < 0 || aa > 0.8) continue;
              const th = i * 2.4 + aa * 4;
              const r = 0.6 + aa * 0.3;
              add(true, cx + Math.cos(th) * r, cy - 0.8 + aa * 2 + (i % 5) * 0.2, cz + Math.sin(th) * r, 0.1 * (1 - aa / 0.8), i % 3 ? '#c070ff' : '#70f0ff');
            }
            break;
          }
          case 'feuer': {
            for (let j = 0; j < 80; j++) {
              const st = j * 0.04;
              const aa = a - st;
              const slot = Math.floor(a / 0.04) - j;
              if (aa < 0 || aa > 0.9 || e.t0 + st > e.t1) continue;
              void slot;
              const k = aa / 0.9;
              const ox = (zr(sd, j) - 0.5) * 0.9, oz = (zr(sd, j + 300) - 0.5) * 0.9;
              add(true, cx + ox * (1 - k * 0.5), cy - 0.9 + aa * 1.6, cz + oz * (1 - k * 0.5), 0.26 * (1 - k), k < 0.3 ? '#fff0a0' : k < 0.6 ? '#ffa030' : '#c8401a');
            }
            break;
          }
          case 'bruch': {
            if (a > 0.9) break;
            for (let i = 0; i < 16; i++) {
              const th = zr(sd, i) * 6.283, v = 1 + zr(sd, i + 20) * 2.2, vy = 2 + zr(sd, i + 40) * 3;
              c.set(e.farbe).multiplyScalar(0.75 + zr(sd, i + 60) * 0.5);
              add(false, cx + Math.cos(th) * v * a, Math.max(cy - 0.5, cy + vy * a - 0.5 * g * a * a), cz + Math.sin(th) * v * a, 0.12 * (1 - a / 1.2), '#' + c.getHexString());
            }
            break;
          }
          case 'feuerwerk': {
            const hoch = 18 + zr(sd, 1) * 6;
            if (a < 1.2) {
              const k = a / 1.2;
              const y = cy + hoch * (1 - (1 - k) * (1 - k));
              add(true, cx, y, cz, 0.18, '#fff0c0');
              for (let i = 1; i < 8; i++) add(true, cx + (zr(sd, i) - 0.5) * 0.2, y - i * 0.35, cz + (zr(sd, i + 9) - 0.5) * 0.2, 0.1 * (1 - i / 8), '#ffb040');
            } else if (a < 3.2) {
              const aa = a - 1.2, k = aa / 2;
              for (let i = 0; i < 90; i++) {
                const u = zr(sd, i + 100) * 2 - 1, th = zr(sd, i + 200) * 6.283, sq = Math.sqrt(1 - u * u);
                const d = 8 * (1 - Math.exp(-aa * 2.5));
                const funkel = (Math.floor(aa * 20 + i) % 3) ? 1 : 0.5;
                add(true, cx + Math.cos(th) * sq * d, cy + hoch + u * d - aa * aa * 1.5, cz + Math.sin(th) * sq * d, 0.22 * (1 - k) * funkel, i % 4 ? e.farbe : '#ffffff');
              }
            }
            break;
          }
          case 'blitz': {
            if (a > 0.45 || (a > 0.1 && a < 0.18)) break;
            let x = cx, y = cy + 70, z = cz;
            for (let i = 0; i < 22; i++) {
              const nx = cx + (zr(sd, i) - 0.5) * 6 * (1 - i / 22), nz = cz + (zr(sd, i + 40) - 0.5) * 6 * (1 - i / 22), ny = cy + 70 * (1 - (i + 1) / 22);
              const dx = nx - x, dy = ny - y, dz = nz - z;
              const len = Math.hypot(dx, dy, dz);
              this._q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
              p.set((x + nx) / 2, (y + ny) / 2, (z + nz) / 2); s.set(0.25, len, 0.25);
              m.compose(p, this._q, s);
              if (ne < 5000) { E.setMatrixAt(ne, m); c.set('#e8f0ff'); E.setColorAt(ne, c); ne++; }
              x = nx; y = ny; z = nz;
            }
            q.identity();
            break;
          }
          case 'regen': case 'schneefall': {
            const ende = e.t1 + 1;
            if (t > ende) break;
            const st = clamp(a / 1, 0, 1) * clamp((ende - t) / 1, 0, 1);
            const n = Math.floor((e.typ === 'regen' ? 900 : 600) * st);
            const H = 24;
            const schnee = e.typ !== 'regen';
            const kx = Math.floor(kamPos[0] / 40) * 40, kz = Math.floor(kamPos[2] / 40) * 40;
            for (let i = 0; i < n; i++) {
              const bx = zr(7, i) * 40, bz = zr(8, i) * 40;
              const tempo = schnee ? 2 + zr(9, i) : 18 + zr(9, i) * 6;
              let x = kx + bx, z = kz + bz;
              if (x - kamPos[0] > 20) x -= 40; if (x - kamPos[0] < -20) x += 40;
              if (z - kamPos[2] > 20) z -= 40; if (z - kamPos[2] < -20) z += 40;
              const y = kamPos[1] + 12 - ((t * tempo + zr(10, i) * H) % H);
              if (schnee) add(true, x + Math.sin(t + i) * 0.4, y, z, 0.09, '#ffffff');
              else add(true, x, y, z, 0.03, '#9ab8e8', 0.03, 0.55, 0.03);
            }
            break;
          }
          case 'zuendung': break;
        }
      }
      // TNT, das gerade zündet
      let nt = 0, nb = 0;
      for (const e of F.effekte) {
        if (e.typ !== 'zuendung' || t < e.t0 || t >= e.t1) continue;
        const a = t - e.t0, rest = e.t1 - t;
        const [x, y, z] = e.pos;
        let ox = 0, oy = 0, oz = 0;
        if (e.flug) { const k = Math.min(a, 0.6); ox = e.flug[0] * k; oz = e.flug[2] * k; oy = Math.max(0, e.flug[1] * k - 0.5 * 12 * k * k); }
        const sc = rest < 0.25 ? 1 + (0.25 - rest) * 0.6 : 1;
        p.set(x + ox, y + 0.5 + oy, z + oz); s.set(sc, sc, sc);
        m.compose(p, q, s);
        this.tntMesh.setMatrixAt(nt++, m);
        if (Math.floor(a / 0.2) % 2 === 1) { this.tntBlitz.setMatrixAt(nb++, m); }
        if (Math.floor(a * 12) % 2 === 0) add(false, x + ox, y + 1.2 + oy + (a * 3 % 1) * 0.5, z + oz, 0.12, '#cfcfcf');
      }
      this.tntMesh.count = nt; this.tntBlitz.count = nb;
      this.tntMesh.instanceMatrix.needsUpdate = true; this.tntBlitz.instanceMatrix.needsUpdate = true;
      L.count = nl; E.count = ne;
      for (const im of [L, E]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    }

    // ---------- ein Bild zeichnen ----------
    zeichne(t, w, h) {
      const F = this.F;
      if (!F) return;
      if (this.renderer.domElement.width !== w || this.renderer.domElement.height !== h) this.renderer.setSize(w, h, false);
      if (this.ausgabe.width !== w || this.ausgabe.height !== h) { this.ausgabe.width = w; this.ausgabe.height = h; }
      const sm = w * h > 5e6 ? 4096 : 2048;
      if (sm !== this.schattenGroesse) {
        this.schattenGroesse = sm;
        this.sonnenLicht.shadow.mapSize.set(sm, sm);
        if (this.sonnenLicht.shadow.map) { this.sonnenLicht.shadow.map.dispose(); this.sonnenLicht.shadow.map = null; }
      }
      this._welt(t);
      const K = BF.kameraBei(F, t);
      // Figuren
      const zst = {};
      for (const n of F.reihenfolge) {
        const a = F.akteure[n];
        const z = BF.akteurZustand(F, a, t);
        if (z.blick && typeof z.blick === 'object') z.blickPunkt = BF.zielPunkt(F, z.blick, t);
        this.figuren[n].setzePose(z, t);
        if (K.ego === n) this.figuren[n].root.visible = false;
        zst[n] = z;
      }
      // Physik-Blöcke
      for (const [typ, liste] of Object.entries(this.koerperArten)) {
        const im = this.koerperMeshes[typ];
        let i = 0;
        for (const k of liste) {
          if (k.t0 > t) break;
          if (!BF.koerperLage(k, t, this._p, this._q)) continue;
          this._s.set(1, 1, 1);
          this._m.compose(this._p, this._q, this._s);
          im.setMatrixAt(i++, this._m);
        }
        im.count = i;
        im.instanceMatrix.needsUpdate = true;
      }
      // Himmel und Licht
      const H = BF.himmelBei(F, t);
      this.himmelMat.uniforms.oben.value.set(H.oben);
      this.himmelMat.uniforms.horizont.value.set(H.horizont);
      const weit = Math.max(70, F.weltOpt.groesse * 1.4) * H.nebelFern;
      const nebel = this._nebel || this.scene.fog;
      nebel.color.set(H.horizont);
      nebel.near = weit * H.nebelNah;
      nebel.far = weit;
      this.hemi.color.set(H.oben).lerp(new THREE.Color(1, 1, 1), 0.6);
      this.hemi.groundColor.set('#6a5a48');
      this.hemi.intensity = 0.55 * H.licht;
      this.amb.intensity = 0.3 * H.licht + 0.05;
      this.sonnenLicht.color.set(H.sonnenFarbe);
      this.sonnenLicht.intensity = 0.95 * H.sonne;
      this.sterneMat.opacity = H.sterne;
      this.sterne.visible = H.sterne > 0.01;
      this.wolkenMat.opacity = 0.8 * Math.min(1, H.wolken);
      this.wolkenMat.color.set(H.horizont).lerp(new THREE.Color(1, 1, 1), 0.55 * H.licht + 0.2);
      const hw = H.sonneH * Math.PI / 180, rw = H.sonneR * Math.PI / 180;
      const sdir = new THREE.Vector3(Math.cos(hw) * Math.sin(rw), Math.sin(hw), Math.cos(hw) * Math.cos(rw));
      // Kamera
      // Kamera nie in Blöcken oder unter dem Boden
      if (!K.ego) {
        const bx = Math.round(K.pos[0]), bz = Math.round(K.pos[2]);
        const by = Math.floor(K.pos[1]);
        if (F.W.fest(bx, by, bz, t) || F.W.fest(bx, by - 1, bz, t) && K.pos[1] - by < 0.3) {
          let y = by;
          while (y < by + 40 && F.W.fest(bx, y, bz, t)) y++;
          K.pos[1] = Math.max(K.pos[1], y + 0.4);
        }
      }
      const cam = this.kamera;
      cam.aspect = w / h;
      cam.fov = K.fov;
      cam.far = 1200;
      cam.position.set(...K.pos);
      cam.lookAt(...K.blick);
      cam.updateProjectionMatrix();
      this.kuppel.position.copy(cam.position);
      this.sterne.position.copy(cam.position);
      this.sterne.rotation.y = t * 0.004;
      this.sonne.position.copy(cam.position).addScaledVector(sdir, 700);
      this.sonne.lookAt(cam.position);
      this.sonne.material.color.set(H.mond > 0.5 ? '#e8ecf4' : H.sonnenFarbe).lerp(new THREE.Color('#ffffff'), 0.3);
      this.sonne.material.opacity = H.sonne > 0.05 ? 1 : 0;
      this.sonne.scale.setScalar(H.mond > 0.5 ? 0.7 : 1);
      this.wolken.position.x = ((t * 1.2) % 480) + Math.floor(cam.position.x / 480) * 480;
      this.wolken.position.z = Math.floor(cam.position.z / 480) * 480;
      const ziel = new THREE.Vector3(...K.blick);
      ziel.x = Math.round(ziel.x / 4) * 4; ziel.z = Math.round(ziel.z / 4) * 4; ziel.y = Math.round(ziel.y);
      this.sonnenLicht.target.position.copy(ziel);
      this.sonnenLicht.position.copy(ziel).addScaledVector(sdir, 100);
      this._partikel(t, K.pos);
      if (BF.wissen) BF.wissen.zeichne(this, t);
      // eigenes Video als Hintergrund (3D-Figuren und Objekte bleiben davor sichtbar)
      const clip = BF.clipBei ? BF.clipBei(F, t) : null;
      const el = clip ? BF.videoElement(clip.clip.datei) : null;
      const mitClip = !!clip; // solange ein Clip läuft, nie die leere 3D-Welt zeigen
      const bildDa = !!(el && el.readyState >= 2);
      const mit2d = !mitClip && BF.welt2dAktiv && BF.welt2dAktiv(F, t);
      const mitVideo = mitClip || mit2d;
      for (const o of [this.kuppel, this.sonne, this.sterne, this.wolken, this.weltGruppe]) o.visible = mitVideo ? false : o._sichtbar !== false;
      if (!mitVideo) { this.sterne.visible = H.sterne > 0.01; this.wolken.visible = F.weltOpt.wolken; }
      this.scene.fog = mitVideo ? null : this._nebel;
      if (mit2d) {
        const lw = BF.welt2dZeichnen(F, t, w, h);
        // bei neuer Größe (z. B. Vollbild) neuen Bildspeicher anlegen – sonst bleibt das alte Bild hängen
        if (this._w2Tex && (this._w2Groesse !== w + 'x' + h)) { this._w2Tex.dispose(); this._w2Tex = null; }
        if (!this._w2Tex) { this._w2Tex = new THREE.CanvasTexture(lw); this._w2Tex.encoding = THREE.sRGBEncoding; this._w2Groesse = w + 'x' + h; }
        this._w2Tex.needsUpdate = true;
        this.scene.background = this._w2Tex;
        this.hemi.intensity = 0.6; this.amb.intensity = 0.35; this.sonnenLicht.intensity = 0.9;
      } else if (mitVideo && !bildDa && !(this._vidTex && this._vidTex.image === el)) {
        this.scene.background = this._schwarz || (this._schwarz = new THREE.Color(0x000000)); // Video lädt noch
      } else if (mitVideo) {
        if (!this._vidTex || this._vidTex.image !== el) {
          if (this._vidTex) this._vidTex.dispose();
          this._vidTex = new THREE.VideoTexture(el);
          this._vidTex.encoding = THREE.sRGBEncoding;
        }
        const tex = this._vidTex;
        if (bildDa) tex.needsUpdate = true; // sonst letztes Bild stehen lassen
        // "füllen": Bild beschneiden statt verzerren
        const va = (el.videoWidth || 16) / (el.videoHeight || 9), fa = w / h;
        if (va > fa) { tex.repeat.set(fa / va, 1); tex.offset.set((1 - fa / va) / 2, 0); }
        else { tex.repeat.set(1, va / fa); tex.offset.set(0, (1 - va / fa) / 2); }
        tex.updateMatrix();
        this.scene.background = tex;
        this.hemi.intensity = 0.6; this.amb.intensity = 0.35; this.sonnenLicht.intensity = 0.9;
      } else this.scene.background = null;
      // erst in ein Zwischenbild rendern, dann Filter (Zeichentrick) und Lupe anwenden
      if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
        if (this.rt) this.rt.dispose();
        this.rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
      }
      this.renderer.setRenderTarget(this.rt);
      this.renderer.render(this.scene, cam);
      this.renderer.setRenderTarget(null);
      const P = this._nachPass();
      const fi = BF.filterBei ? BF.filterBei(F, t) : { wert: 0, kanten: 1, farben: 6 };
      const lu = BF.lupeBei ? BF.lupeBei(F, t) : { x: 50, y: 50, z: 1 };
      P.u.bild.value = this.rt.texture;
      P.u.pixel.value.set(1 / w, 1 / h);
      P.u.toon.value = fi.wert; P.u.kanten.value = fi.kanten; P.u.stufen.value = fi.farben;
      P.u.zoom.value = lu.z;
      P.u.mitte.value.set(lu.x / 100, 1 - lu.y / 100);
      this.renderer.render(P.szene, P.kam);
      const ctx = this.ctx;
      ctx.drawImage(this.renderer.domElement, 0, 0, w, h);
      this._ueberlagerung(t, w, h, zst);
      if (BF.zeichne2D) BF.zeichne2D(ctx, F, t, w, h);
    }

    _nachPass() {
      if (this._P) return this._P;
      const u = {
        bild: { value: null }, pixel: { value: new THREE.Vector2() }, toon: { value: 0 }, kanten: { value: 1 }, stufen: { value: 6 },
        zoom: { value: 1 }, mitte: { value: new THREE.Vector2(0.5, 0.5) },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms: u, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
          uniform sampler2D bild; uniform vec2 pixel; uniform float toon, kanten, stufen, zoom; uniform vec2 mitte;
          varying vec2 vUv;
          vec3 holen(vec2 p){ return pow(max(texture2D(bild, clamp(p, 0.0, 1.0)).rgb, 0.0), vec3(1.0/2.2)); }
          float hell(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
          void main(){
            // Lupe: Mittelpunkt wandert sanft mit, Rand bleibt im Bild
            vec2 m = mitte;
            float halb = 0.5 / zoom;
            m = clamp(m, vec2(halb), vec2(1.0 - halb));
            vec2 p = m + (vUv - 0.5) / zoom;
            vec3 c = holen(p);
            if (toon > 0.001) {
              vec2 d = pixel / zoom * 1.5;
              // weichzeichnen, aber Kanten erhalten
              vec3 summe = vec3(0.0); float gew = 0.0;
              for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) {
                vec3 s = holen(p + vec2(float(i), float(j)) * d);
                float g = exp(-dot(s - c, s - c) * 18.0);
                summe += s * g; gew += g;
              }
              vec3 glatt = summe / gew;
              // Farben in Stufen (flache Cartoon-Flächen), kräftiger
              float l = hell(glatt);
              float lq = floor(l * stufen + 0.5) / stufen;
              vec3 farbe = glatt * (lq / max(l, 0.02));
              vec3 grau = vec3(hell(farbe));
              farbe = mix(grau, farbe, 1.35);
              // schwarze Umrisse (Sobel)
              float tl = hell(holen(p + vec2(-1.0, 1.0) * d)), tm = hell(holen(p + vec2(0.0, 1.0) * d)), tr = hell(holen(p + vec2(1.0, 1.0) * d));
              float ml = hell(holen(p + vec2(-1.0, 0.0) * d)), mr = hell(holen(p + vec2(1.0, 0.0) * d));
              float bl = hell(holen(p + vec2(-1.0, -1.0) * d)), bm = hell(holen(p + vec2(0.0, -1.0) * d)), br = hell(holen(p + vec2(1.0, -1.0) * d));
              float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
              float gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
              float kante = smoothstep(0.18, 0.42, length(vec2(gx, gy)) * kanten);
              farbe = mix(farbe, vec3(0.06, 0.05, 0.08), kante * 0.9);
              c = mix(c, clamp(farbe, 0.0, 1.0), clamp(toon, 0.0, 1.0));
            }
            gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
            #include <encodings_fragment>
          }`,
      });
      const szene = new THREE.Scene();
      szene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
      this._P = { u, szene, kam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
      return this._P;
    }

    // ---------- 2D: Sprechblasen, Texte, Blenden ----------
    _ueberlagerung(t, w, h, zst) {
      const F = this.F, ctx = this.ctx;
      const E = h / 1080;
      // Sprechblasen
      const blasen = [];
      for (const n of F.reihenfolge) {
        const z = zst[n], r = z.rede;
        if (!r || z.sicht < 0.5) continue;
        const a = F.akteure[n];
        const kp = BF.kopfPos(F, a, t, z);
        const v = new THREE.Vector3(kp[0], kp[1] + 0.45, kp[2]).project(this.kamera);
        if (v.z > 1) continue;
        blasen.push({ x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, r, a, alter: t - r.t0, rest: r.t1 - t });
      }
      if (BF.wissen) BF.wissen.ueber(this, t, w, h, E);
      for (const b of blasen) this._blase(b, w, h, E);
      // Texte
      for (const tx of F.texte) {
        if (t < tx.t0 || t >= tx.t1) continue;
        const ein = clamp((t - tx.t0) / 0.35, 0, 1) * clamp((tx.t1 - t) / 0.35, 0, 1);
        if (tx.karte) { ctx.fillStyle = `rgba(0,0,0,${ein})`; ctx.fillRect(0, 0, w, h); }
        this._text(tx, w, h, E, ein);
      }
      // Blitze (weiß) und Blenden
      let weiss = 0;
      for (const b of F.blitze) if (t >= b.t0 && t < b.t1) weiss += b.staerke * Math.pow(1 - (t - b.t0) / (b.t1 - b.t0), 2);
      let blende = 0, bf = 'schwarz';
      for (const b of F.blenden) {
        if (b.t0 > t) break;
        const u = b.t1 > b.t0 ? clamp((t - b.t0) / (b.t1 - b.t0), 0, 1) : 1;
        blende = BF.lerp(b.von, b.zu, u); bf = b.farbe;
      }
      if (weiss > 0) { ctx.fillStyle = `rgba(255,255,250,${Math.min(0.85, weiss)})`; ctx.fillRect(0, 0, w, h); }
      if (blende > 0) { ctx.fillStyle = bf === 'weiss' ? `rgba(255,255,255,${blende})` : `rgba(0,0,0,${blende})`; ctx.fillRect(0, 0, w, h); }
    }

    _zeilen(ctx, text, maxB) {
      const worte = text.split(/\s+/);
      const zeilen = [];
      let z = '';
      for (const wo of worte) {
        const n = z ? z + ' ' + wo : wo;
        if (ctx.measureText(n).width > maxB && z) { zeilen.push(z); z = wo; } else z = n;
      }
      if (z) zeilen.push(z);
      return zeilen;
    }

    _blase(b, w, h, E) {
      const ctx = this.ctx;
      const gr = Math.round((b.r.laut ? 40 : b.r.leise ? 30 : 34) * E);
      ctx.font = `${b.r.laut ? 'bold ' : ''}${gr}px "Segoe UI", "Noto Sans", Arial, sans-serif`;
      const zeilen = this._zeilen(ctx, b.r.text, w * 0.32);
      const lh = gr * 1.25;
      const breit = Math.max(...zeilen.map(z => ctx.measureText(z).width)) + gr * 1.1;
      const hoch = zeilen.length * lh + gr * 0.7;
      const pop = clamp(b.alter / 0.18, 0, 1) * clamp(b.rest / 0.15, 0, 1);
      if (pop <= 0) return;
      const sc = 0.6 + 0.4 * BF.sanft(pop);
      let x = clamp(b.x, breit / 2 + 10 * E, w - breit / 2 - 10 * E);
      let y = clamp(b.y - 30 * E - hoch, 10 * E, h - hoch - 10 * E);
      ctx.save();
      ctx.globalAlpha = pop;
      ctx.translate(x, y + hoch);
      ctx.scale(sc, sc);
      ctx.translate(-x, -(y + hoch));
      const r = 18 * E;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.strokeStyle = 'rgba(20,20,20,0.9)';
      ctx.lineWidth = 3.5 * E;
      ctx.beginPath();
      if (b.r.denkt) {
        ctx.ellipse(x, y + hoch / 2, breit / 2 + 8 * E, hoch / 2 + 6 * E, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        for (const [k, rr] of [[0.35, 9], [0.7, 6]]) {
          ctx.beginPath();
          ctx.arc(BF.lerp(x, b.x, k), BF.lerp(y + hoch + 8 * E, b.y, k), rr * E, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      } else {
        const l = x - breit / 2, o = y;
        ctx.moveTo(l + r, o);
        ctx.arcTo(l + breit, o, l + breit, o + hoch, r);
        ctx.arcTo(l + breit, o + hoch, l, o + hoch, r);
        const sx = clamp(b.x, l + r * 2, l + breit - r * 2);
        ctx.lineTo(sx + 12 * E, o + hoch);
        ctx.lineTo(BF.lerp(sx, b.x, 0.5), Math.min(b.y, o + hoch + 26 * E));
        ctx.lineTo(sx - 12 * E, o + hoch);
        ctx.arcTo(l, o + hoch, l, o, r);
        ctx.arcTo(l, o, l + breit, o, r);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#151515';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (b.r.leise) ctx.font = `italic ${gr}px "Segoe UI", "Noto Sans", Arial, sans-serif`;
      zeilen.forEach((z, i) => ctx.fillText(z, x, y + gr * 0.35 + lh * (i + 0.5)));
      // Name klein über der Blase
      ctx.font = `bold ${Math.round(gr * 0.6)}px "Segoe UI", "Noto Sans", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3 * E;
      ctx.strokeText(b.a.anzeige, x - breit / 2 + ctx.measureText(b.a.anzeige).width / 2 + 6 * E, y - gr * 0.45);
      ctx.fillText(b.a.anzeige, x - breit / 2 + ctx.measureText(b.a.anzeige).width / 2 + 6 * E, y - gr * 0.45);
      ctx.restore();
    }

    _text(tx, w, h, E, ein) {
      const ctx = this.ctx;
      const gr = Math.round((tx.ort === 'mitte' ? 60 : tx.ort === 'oben' ? 56 : 44) * E * tx.groesse);
      ctx.save();
      ctx.globalAlpha = ein;
      ctx.font = `bold ${gr}px "Segoe UI", "Noto Sans", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const zeilen = this._zeilen(ctx, tx.text, w * 0.85);
      const lh = gr * 1.2;
      let y0 = tx.ort === 'mitte' ? h / 2 - (zeilen.length - 1) * lh / 2 : tx.ort === 'oben' ? h * 0.1 : h * 0.86 - (zeilen.length - 1) * lh;
      if (tx.ort === 'unten') {
        const breit = Math.max(...zeilen.map(z => ctx.measureText(z).width)) + gr;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(w / 2 - breit / 2, y0 - lh / 2 - gr * 0.15, breit, lh * zeilen.length + gr * 0.3);
      }
      const schatten = Math.max(2, gr / 12);
      zeilen.forEach((z, i) => {
        const y = y0 + i * lh;
        ctx.fillStyle = 'rgba(40,40,40,0.9)';
        ctx.fillText(z, w / 2 + schatten, y + schatten);
        ctx.fillStyle = tx.farbe;
        ctx.fillText(z, w / 2, y);
      });
      ctx.restore();
    }
  }
  BF.Szene = Szene;
})();
