// Blockfilm – macht aus dem Ablaufplan F eine HyperFrames-Komposition (HTML + GSAP).
//   BF.hf.passt(F)              → kann der Film mit HyperFrames gebaut werden? (nur 2D-Welt, keine 3D-Blockwelt)
//   BF.hf.komponiere(F, daten)  → statisches HTML der Komposition (läuft in der App)
//   BF.hf.starte(daten)         → läuft IN der Komposition: übersetzt das Skript erneut und baut Timeline + Seek
// Positionen, Kamera und Simulationen kommen aus den bestehenden Funktionen der 2D-Welt (exakt wie bisher),
// Auftritte, Wippen, Texte und Übergänge sind GSAP-Animationen im Stil der Zielgruppe.
(function () {
  const BF = (window.BF = window.BF || {});
  const HF = (BF.hf = BF.hf || {});
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const r2 = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Skripte, die die Komposition braucht (dieselbe Engine wie die App, nur ohne Oberfläche)
  HF.SKRIPTE = ['vendor/three.min.js', 'vendor/gsap.min.js', 'js/texturen.js', 'js/skript.js', 'js/physik.js', 'js/ablauf.js', 'js/figuren.js', 'js/wissen.js', 'js/video.js', 'js/welt2d.js', 'js/urzeit.js', 'js/waswaere.js', 'js/autokorrektur.js', 'js/klartext.js', 'js/hf/stile.js', 'js/hf/twemoji-liste.js', 'js/hf/grafik.js', 'js/hf/figuren2d.js', 'js/hf/keime2d.js', 'js/hf/rest2d.js', 'js/hf/komponiere.js'];

  HF.passt = function (F) {
    if (!F || !F.w2d || !F.w2d.liste) return false;
    if (F.reihenfolge && F.reihenfolge.length) return false; // Figuren der 3D-Welt
    if (F.objekte && F.objekte.length) return false;          // 3D-Wissensobjekte
    if (F.clips && F.clips.length) return false;              // Videoclips
    if (F.koerper && F.koerper.length) return false;          // Physik-Blöcke
    return F.w2d.an.every(e => e.an);                         // 2D-Welt bleibt die ganze Zeit an
  };

  // ---------- Plan: welche Elemente es gibt (in der App und in der Komposition gleich berechnet) ----------
  HF.plane = function (F, W, H, stil) {
    const D = Math.max(0.1, F.dauer);
    const W2 = F.w2d;
    const mitLoch = W2.liste.some(o => o.typ === 'loch');
    const hgKann = art => { const a = HF.hgArt(art); return !!a && !(a === 'all' && mitLoch); }; // Gravitationslinse kann nur der alte Zeichner
    // Hintergrund-Abschnitte
    const roh = [{ t0: 0, t1: 0, art: 'weltraum' }, ...W2.hg.slice().sort((a, b) => a.t0 - b.t0)];
    const ab = [];
    for (const b of roh) {
      const letzte = ab[ab.length - 1];
      if (letzte && HF.hgArt(letzte.art) === HF.hgArt(b.art) && HF.hgArt(b.art)) continue;
      if (letzte && b.t0 <= letzte.t0 + 1e-6) { ab[ab.length - 1] = { art: b.art, t0: letzte.t0, blende: 0 }; continue; }
      ab.push({ art: b.art, t0: b.t0, blende: Math.max(0, b.t1 - b.t0) });
    }
    const hg = ab.map((b, i) => {
      const n = ab[i + 1];
      const t1 = n ? Math.min(D, n.t0 + Math.max(n.blende, 0.05)) : D;
      const mitStern = W2.liste.some(o => o.typ === 'stern' && o.t0 < t1 && (o.t1 ?? D) > b.t0);
      return { id: 'hg' + i, art: b.art, t0: b.t0, t1, blende: i ? b.blende : 0, kann: hgKann(b.art), ohneSonne: mitStern };
    }).filter(b => b.t1 > b.t0 + 1e-3 && b.kann);
    // Objekte
    const objekte = [];
    W2.liste.forEach((o, i) => {
      if (!HF.portiert(o)) return;
      const t0 = Math.max(0, o.t0), t1 = Math.min(D, o.t1 ?? D);
      if (!(t1 > t0 + 1e-3)) return;
      objekte.push({ id: 'o' + i, o, t0, t1 });
    });
    const portiert = new Set(objekte.map(e => e.o));
    // Texte und Einblendungen
    const texte = [];
    F.texte.forEach((tx, i) => {
      const t0 = Math.max(0, tx.t0), t1 = Math.min(D, tx.t1);
      if (!(t1 > t0 + 1e-3)) return;
      const art = tx.karte ? 'karte' : tx.sprecher ? 'unter' : tx.ort === 'mitte' ? 'titel' : tx.ort === 'oben' ? 'oben' : 'unten';
      texte.push({ id: 't' + i, tx, art, t0, t1 });
    });
    const ueber = [];
    (F.ueber || []).forEach((u, i) => {
      if (u.typ !== 'tafel' && u.typ !== 'formel') return;
      const t0 = Math.max(0, u.t0), t1 = Math.min(D, u.t1 ?? D);
      if (!(t1 > t0 + 1e-3)) return;
      ueber.push({ id: 'u' + i, u, t0, t1 });
    });
    const ueberSet = new Set(ueber.map(e => e.u));
    const schilder = [];
    (W2.texte || []).forEach((tx, i) => {
      const t0 = Math.max(0, tx.t0), t1 = Math.min(D, tx.t1);
      if (t1 > t0 + 1e-3) schilder.push({ id: 's' + i, tx, t0, t1 });
    });
    return { D, W, H, stil, hg, objekte, portiert, texte, ueber, ueberSet, schilder, hgKann };
  };

  // ---------- Markup ----------
  // Emoji-Text → Twemoji-Dateinamen (null, wenn nicht alles ein bekanntes Emoji ist)
  HF.emojiDateien = function (text) {
    const T = HF.TWEMOJI;
    if (!T || !text) return null;
    const teile = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(String(text))].map(x => x.segment) : Array.from(String(text));
    const out = [];
    for (const g of teile) {
      if (/^\s+$/.test(g)) continue;
      const cps = Array.from(g).map(c => c.codePointAt(0).toString(16));
      const ohne = cps.filter(c => c !== 'fe0f').join('-'), mit = cps.join('-');
      const name = T.has(ohne) ? ohne : T.has(mit) ? mit : null;
      if (!name) return null;
      out.push(name);
    }
    return out.length ? out : null;
  };
  function objektMarkup(e, stil, s0) {
    const o = e.o;
    if (o.typ === 'zahl') {
      const gr = o.r * 1.4 * s0;
      const istText = !o.ohneRand;
      const bilder = !istText && HF.emojiDateien(o.text);
      if (bilder) return `<div class="wip"><div class="zahl zsymbol zbild" style="font-size:${r2(gr)}px">${bilder.map(n => `<img src="${basisJetzt}vendor/twemoji/${n}.svg" alt="">`).join('')}</div></div>`;
      const farbe = istText ? (/^#?f{3,6}$/i.test(o.farbe) ? '#ffffff' : HF.stilFarbe(stil, o.farbe)) : null;
      return `<div class="wip"><div class="zahl${istText ? ' ztext' : ' zsymbol'}" style="font-size:${r2(gr)}px${farbe ? ';color:' + farbe : ''}">${esc(o.text)}</div></div>`;
    }
    const g = HF.objektGrafik[o.typ](o, stil, e.id);
    const px = 2 * g.k * o.r * s0;
    return `<div class="wip"><svg viewBox="${-g.k} ${-g.k} ${2 * g.k} ${2 * g.k}" width="${r2(px)}" height="${r2(px)}" style="left:${r2(-px / 2)}px;top:${r2(-px / 2)}px">${g.svg}</svg></div>`;
  }
  let basisJetzt = '';
  const worte = (text, versal) => esc(versal ? String(text).toUpperCase() : text).split(/\s+/).map(w => `<span class="wort">${w}</span>`).join(' ');

  function textMarkup(e, stil) {
    const tx = e.tx, T = stil.text;
    const farbe = /^#?f{3,6}$/i.test(tx.farbe || '#fff') ? null : HF.stilFarbe(stil, tx.farbe);
    const st = farbe ? ` style="color:${farbe}"` : '';
    if (e.art === 'karte') return `<div class="flaeche"></div><div class="kreis k1"></div><div class="kreis k2"></div><div class="band"><span${st}>${worte(tx.text, stil.schrift.versal)}</span></div>`;
    if (e.art === 'unter') return `<span class="pille">${esc(tx.text)}</span>`;
    if (e.art === 'titel') return `<div class="gross"${st}>${worte(tx.text, stil.schrift.versal)}</div>`;
    if (e.art === 'oben') return `<div class="band"><span${st}>${esc(stil.schrift.versal ? String(tx.text).toUpperCase() : tx.text)}</span></div>`;
    void T;
    return `<span class="pille"${st}>${esc(tx.text)}</span>`;
  }
  function ueberMarkup(e, stil) {
    const u = e.u;
    if (u.typ === 'tafel') return `<div class="tafel ${u.ort}"><div class="tkopf">${esc(u.titel)}</div><ul>${u.punkte.map((p, i) => `<li id="${e.id}p${i}"><b></b><span>${esc(p)}</span></li>`).join('')}</ul></div>`;
    return `<div class="formel ${u.ort}"><div class="fz">${esc(u.text)}</div>${u.erklaerung ? `<div class="fe">${esc(u.erklaerung)}</div>` : ''}</div>`;
  }

  function css(P, basis) {
    const { W, H, stil } = P, S = stil.schrift, T = stil.text, E = H / 1080 * S.groesse, R = stil.form.rund;
    const [k1, k2] = T.karte;
    return `${HF.schriftCss(basis + 'vendor/fonts/')}
html,body{margin:0;padding:0;background:#000;overflow:hidden}
#film{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#0a0d24;font-family:${S.text},sans-serif;font-weight:${S.textGewicht};color:#fff}
#film *{box-sizing:border-box}
.hg{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden}
.ebene{position:absolute;left:${-W}px;top:${-H / 2}px;width:${3 * W}px;height:${2 * H}px;transform-origin:${1.5 * W}px ${H}px}
.ebene svg{display:block;width:100%;height:100%}
.obj{position:absolute;left:0;top:0;width:0;height:0}
.pos,.pop,.wip{position:absolute;left:0;top:0;width:0;height:0}
.obj svg{position:absolute;overflow:visible}
.zahl{position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;line-height:1;font-family:${S.titel},sans-serif;font-weight:${S.titelGewicht}}
.zbild{display:flex;gap:0.08em}.zbild img{display:block;height:1.1em;width:1.1em}
.ztext{text-shadow:0 ${r2(0.06 * 30)}px 0 rgba(0,0,0,.28)}
.zsymbol{filter:drop-shadow(0 ${r2(10 * E)}px 0 rgba(0,0,0,.18))}
#leinwand{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
.txt{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
.txt.unter,.txt.unten{display:flex;align-items:flex-end;justify-content:center;padding-bottom:${r2(H * 0.05)}px}
.pille{display:inline-block;max-width:${r2(W * 0.8)}px;padding:${r2(12 * E)}px ${r2(30 * E)}px;border-radius:${r2(40 * E * R + 8 * E)}px;background:${T.unter};font-size:${r2(42 * E)}px;line-height:1.25;text-align:center}
.txt.titel{display:flex;align-items:center;justify-content:center}
.gross{max-width:${r2(W * 0.82)}px;text-align:center;font-family:${S.titel},sans-serif;font-weight:${S.titelGewicht};font-size:${r2(92 * E)}px;line-height:1.08;text-shadow:0 ${r2(8 * E)}px 0 rgba(0,0,0,.22)}
.wort{display:inline-block}
.txt.oben{padding:${r2(H * 0.07)}px 0 0 ${r2(W * 0.04)}px}
.band{display:inline-block;background:${T.band};transform:skewX(-12deg);padding:${r2(14 * E)}px ${r2(40 * E)}px;border-radius:${r2(6 * E * R)}px}
.band>span{display:inline-block;transform:skewX(12deg);font-family:${S.titel},sans-serif;font-weight:${S.titelGewicht};font-size:${r2(50 * E)}px;color:${T.bandText};letter-spacing:${S.versal ? '0.04em' : '0'}}
.txt.karte{display:flex;align-items:center;justify-content:center;overflow:hidden}
.flaeche{position:absolute;inset:0;background:linear-gradient(135deg,${k1},${k2})}
.kreis{position:absolute;border-radius:50%;background:rgba(255,255,255,.08)}
.k1{width:${r2(H * 0.9)}px;height:${r2(H * 0.9)}px;left:${r2(-H * 0.2)}px;top:${r2(-H * 0.3)}px}
.k2{width:${r2(H * 0.6)}px;height:${r2(H * 0.6)}px;right:${r2(-H * 0.1)}px;bottom:${r2(-H * 0.2)}px;background:rgba(255,255,255,.06)}
.karte .band{position:relative;padding:${r2(22 * E)}px ${r2(60 * E)}px;box-shadow:0 ${r2(14 * E)}px 0 rgba(0,0,0,.18)}
.karte .band>span{font-size:${r2(76 * E)}px}
.uebl{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
.tafel{position:absolute;top:${r2(H * 0.08)}px;width:${r2(W * 0.38)}px;background:#fff;color:${stil.palette.schwarz};border-radius:${r2(28 * E * R + 6 * E)}px;overflow:hidden;box-shadow:0 ${r2(16 * E)}px 0 rgba(0,0,0,.18)}
.tafel.links{left:${r2(W * 0.04)}px}.tafel.rechts{right:${r2(W * 0.04)}px}.tafel.mitte{left:${r2(W * 0.2)}px;width:${r2(W * 0.6)}px}
.tkopf{background:${T.band};color:#fff;font-family:${S.titel},sans-serif;font-weight:${S.titelGewicht};font-size:${r2(46 * E)}px;padding:${r2(18 * E)}px ${r2(30 * E)}px}
.tafel ul{list-style:none;margin:0;padding:${r2(18 * E)}px ${r2(30 * E)}px ${r2(24 * E)}px}
.tafel li{display:flex;gap:${r2(16 * E)}px;align-items:flex-start;font-size:${r2(36 * E)}px;line-height:1.25;margin:${r2(10 * E)}px 0}
.tafel li b{flex:none;width:${r2(22 * E)}px;height:${r2(22 * E)}px;margin-top:${r2(10 * E)}px;border-radius:${r2(11 * E * R + 2 * E)}px;background:${stil.palette.gelb}}
.formel{position:absolute;left:50%;transform:translateX(-50%);background:#fff;color:${stil.palette.schwarz};border-radius:${r2(30 * E * R + 8 * E)}px;padding:${r2(22 * E)}px ${r2(60 * E)}px;text-align:center;box-shadow:0 ${r2(14 * E)}px 0 rgba(0,0,0,.18)}
.formel.oben{top:${r2(H * 0.07)}px}.formel.mitte{top:50%;transform:translate(-50%,-50%)}.formel.unten{bottom:${r2(H * 0.14)}px}
.fz{font-family:${S.titel},sans-serif;font-weight:${S.titelGewicht};font-size:${r2(78 * E)}px;white-space:nowrap}
.fe{font-size:${r2(30 * E)}px;opacity:.75;margin-top:${r2(6 * E)}px}
.schilde{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
.sl{position:absolute;left:0;top:0}
.schild{position:absolute;left:0;top:0}
.schild>span{display:inline-block;transform:translate(-50%,-50%);white-space:nowrap;background:${stil.palette.weiss};color:${stil.palette.schwarz};font-family:${S.titel},sans-serif;font-weight:${S.titelGewicht};font-size:${r2(34 * E)}px;padding:${r2(8 * E)}px ${r2(22 * E)}px;border-radius:${r2(30 * E * R + 6 * E)}px;box-shadow:0 ${r2(6 * E)}px 0 rgba(0,0,0,.2)}
#blende,#blitz{position:absolute;inset:0;opacity:0;pointer-events:none}
#blitz{background:#fffffa}`;
  }

  // daten: { skript, sprachDauer, alter, breite, hoehe, fps, ton, basis }
  HF.komponiere = function (F, daten) {
    const W = daten.breite, H = daten.hoehe, stil = HF.stilFuer(F);
    const P = HF.plane(F, W, H, stil);
    const s0 = W / 100, D = r2(P.D);
    const basis = daten.basis || '';
    basisJetzt = basis;
    let spur = 0;
    const clip = (id, klasse, t0, t1, inhalt, extra = '') => `<div id="${id}" class="clip ${klasse}" data-start="${r2(t0)}" data-duration="${r2(Math.max(0.01, t1 - t0))}" data-track-index="${spur++}"${extra}>${inhalt}</div>`;
    const teile = [];
    P.hg.forEach((b, i) => {
      const ebenen = HF.hintergrund(b.art, stil, W, H, 101 + i, { ohneSonne: b.ohneSonne }) || [];
      teile.push(clip(b.id, 'hg', b.t0, b.t1, ebenen.map((e, k) => `<div class="ebene" id="${b.id}e${k}" data-par="${e.par}"><svg viewBox="${-W} ${-H / 2} ${3 * W} ${2 * H}" preserveAspectRatio="none">${e.svg}</svg></div>`).join('')));
    });
    for (const e of P.objekte) teile.push(clip(e.id, 'obj', e.t0, e.t1, `<div class="pos" id="${e.id}p"><div class="pop" id="${e.id}q">${objektMarkup(e, stil, s0)}</div></div>`));
    teile.push(`<canvas id="leinwand" class="clip" data-start="0" data-duration="${D}" data-track-index="${spur++}" width="${W}" height="${H}"></canvas>`);
    for (const e of P.schilder) teile.push(clip(e.id, 'schilde', e.t0, e.t1, `<svg class="sl" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><line id="${e.id}l" stroke="#ffffff" stroke-opacity="0.85" stroke-linecap="round"/><circle id="${e.id}c" r="0" fill="${stil.palette.gelb}"/></svg><div class="schild" id="${e.id}b"><span>${esc(stil.schrift.versal ? String(e.tx.text).toUpperCase() : e.tx.text)}</span></div>`));
    for (const e of P.ueber) teile.push(clip(e.id, 'uebl', e.t0, e.t1, ueberMarkup(e, stil)));
    for (const e of P.texte) teile.push(clip(e.id, 'txt ' + e.art, e.t0, e.t1, textMarkup(e, stil)));
    teile.push(clip('blende', '', 0, P.D, ''));
    teile.push(clip('blitz', '', 0, P.D, ''));
    if (daten.ton) teile.push(`<audio id="ton" class="clip" data-start="0" data-duration="${D}" data-track-index="${spur++}" data-volume="1" src="${esc(daten.ton)}"></audio>`);
    // Umgebung der App, die die Übersetzung beeinflusst (z. B. die gewählte Stimme bestimmt den Schlüssel der Sprechdauer)
    const laufDaten = { skript: daten.skript, sprachDauer: daten.sprachDauer || {}, alter: daten.alter || null, breite: W, hoehe: H, vorschau: !!daten.vorschau, stimmeWahl: BF.stimmeWahl || null, standardSkin: BF.standardSkin || null };
    return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=${W}">
<title>${esc(F.titel || 'Blockfilm')}</title>
<style>${css(P, basis)}</style></head>
<body>
<div id="film" data-composition-id="film" data-start="0" data-duration="${D}" data-width="${W}" data-height="${H}">
${teile.join('\n')}
</div>
${HF.SKRIPTE.map(s => `<script src="${basis}${s}"></script>`).join('\n')}
<script>window.BF_HF_DATEN=${JSON.stringify(laufDaten).replace(/</g, '\\u003c')};BF.hf.starte(window.BF_HF_DATEN);</script>
</body></html>`;
  };

  // ---------- Laufzeit in der Komposition ----------
  HF.starte = function (daten) {
    const W = daten.breite, H = daten.hoehe;
    BF.sprachDauer = daten.sprachDauer || {};
    BF.stimmeWahl = daten.stimmeWahl || null;
    BF.standardSkin = daten.standardSkin || null;
    if (daten.alter) HF.standardAlter = daten.alter;
    const F = BF.kompiliere(daten.skript);
    try { BF.simuliere && BF.simuliere(F); } catch (e) { console.warn(e); }
    const stil = HF.stilFuer(F);
    const P = HF.plane(F, W, H, stil);
    HF.aktiverStil = stil;
    const B = stil.bewegung;
    // Selbstprüfung: passt die neu berechnete Zeitleiste zum Markup aus der App?
    for (const e of [...P.objekte, ...P.texte]) {
      const el = document.getElementById(e.id);
      if (!el || Math.abs(+el.dataset.start - Math.round(e.t0 * 100) / 100) > 0.011) { console.error('Blockfilm: Komposition passt nicht zum Skript bei ' + e.id); break; }
    }
    const $ = id => document.getElementById(id);
    const I = BF.w2dIntern;
    const tl = gsap.timeline({ paused: true });
    const wdh = (dauer, halb) => Math.max(0, Math.floor(dauer / halb) - 1);

    // Hintergründe: Überblenden, Sterne funkeln, Wolken treiben
    for (const b of P.hg) {
      const el = $(b.id);
      if (b.blende > 0) tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: b.blende, ease: 'sine.inOut', immediateRender: false }, b.t0);
      const dauer = b.t1 - b.t0;
      el.querySelectorAll('.funkeln').forEach((g, i) => {
        const halb = 0.9 + i * 0.35;
        tl.fromTo(g, { opacity: 0.35 + 0.1 * i }, { opacity: 1, duration: halb, ease: 'sine.inOut', yoyo: true, repeat: wdh(dauer, halb), immediateRender: false }, b.t0 + i * 0.3);
      });
      el.querySelectorAll('.treiben').forEach(g => tl.fromTo(g, { x: 0 }, { x: W * 0.04 * dauer / 10, duration: dauer, ease: 'none', immediateRender: false }, b.t0));
    }
    // Objekte: Auftritt (Pop), Wippen, Abgang
    for (const e of P.objekte) {
      const q = $(e.id + 'q'), wip = q.firstElementChild, leben = e.t1 - e.t0;
      const ein = Math.min(B.dauer, leben * 0.4);
      tl.fromTo(q, { scale: 0, rotation: -B.drehen }, { scale: 1, rotation: 0, duration: ein, ease: B.ein, immediateRender: false }, e.t0);
      if (e.t1 < P.D - 0.01) tl.to(q, { scale: 0, duration: Math.min(0.32, leben * 0.3), ease: B.aus }, e.t1 - Math.min(0.32, leben * 0.3));
      const groesse = e.o.r * (W / 100);
      const halb = (1 / B.wippTempo) * (0.85 + ((e.t0 * 7.3) % 0.3));
      const n = wdh(leben - ein, halb);
      if (e.o.typ === 'pflanze' || e.o.typ === 'baum') {
        // Pflanzen wiegen sich im Wind (um den Fußpunkt)
        const schw = 1.6 + ((e.t0 * 3.1) % 0.8);
        tl.fromTo(wip, { rotation: -1.6 }, { rotation: 1.6, duration: schw, ease: 'sine.inOut', yoyo: true, repeat: wdh(leben, schw), immediateRender: false, transformOrigin: '0px 0px' }, e.t0);
      } else if (e.o.typ === 'koerper') {
        if (n > 0) tl.fromTo(wip, { scaleY: 1, transformOrigin: '0px 0px' }, { scaleY: 1.012, duration: halb * 1.6, ease: 'sine.inOut', yoyo: true, repeat: wdh(leben - ein, halb * 1.6), immediateRender: false }, e.t0 + ein);
      } else if (e.o.typ === 'dino' && !['plesiosaurus', 'ichthyosaurus', 'mosasaurus', 'flugsaurier', 'trilobit', 'fisch', 'qualle'].includes(e.o.art)) {
        if (n > 0) tl.fromTo(wip, { scaleY: 1, transformOrigin: '0px 0px' }, { scaleY: 1.02, duration: halb * 1.5, ease: 'sine.inOut', yoyo: true, repeat: wdh(leben - ein, halb * 1.5), immediateRender: false }, e.t0 + ein);
      } else       if (e.o.typ === 'kind') {
        // Atmen statt Schweben, Beine und Arme schwingen, solange die Figur geht
        if (n > 0) tl.fromTo(wip, { scaleY: 1, transformOrigin: '50% 100%' }, { scaleY: 1.025, duration: halb * 1.4, ease: 'sine.inOut', yoyo: true, repeat: wdh(leben - ein, halb * 1.4), immediateRender: false }, e.t0 + ein);
        const beine = q.querySelectorAll('.bein'), arme = q.querySelectorAll('.arm');
        for (const g of e.o.segs) {
          if (g.typ !== 'zu' || g.t1 <= g.t0) continue;
          const schritt = 0.18, k = wdh(g.t1 - g.t0, schritt);
          beine.forEach((b, i) => tl.fromTo(b, { rotation: i ? 24 : -24, svgOrigin: `${i ? 0.075 : -0.075} -0.3` }, { rotation: i ? -24 : 24, duration: schritt, ease: 'sine.inOut', yoyo: true, repeat: k, immediateRender: false }, g.t0));
          arme.forEach((b, i) => tl.fromTo(b, { rotation: i ? -18 : 18, svgOrigin: `${i ? 0.18 : -0.18} -0.66` }, { rotation: i ? 18 : -18, duration: schritt, ease: 'sine.inOut', yoyo: true, repeat: k, immediateRender: false }, g.t0));
          tl.to([...beine, ...arme], { rotation: 0, duration: 0.12, ease: 'power1.out' }, g.t1);
        }
      } else if (n > 0 && e.o.typ !== 'wolke') tl.fromTo(wip, { y: 0 }, { y: -B.wippen * groesse, duration: halb, ease: 'sine.inOut', yoyo: true, repeat: n, immediateRender: false }, e.t0 + ein);
      if (e.o.typ === 'stern') q.querySelectorAll('.glimmen').forEach(g => tl.fromTo(g, { scale: 0.92, transformOrigin: '50% 50%' }, { scale: 1.06, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: wdh(leben, 1.4), immediateRender: false }, e.t0));
      if (e.o.typ === 'wolke' && e.o.regen) q.querySelectorAll('.tropfen').forEach((tr, i) => tl.fromTo(tr, { y: 0, opacity: 1 }, { y: 0.9, opacity: 0, duration: 0.6, ease: 'none', repeat: wdh(leben, 0.6), immediateRender: false }, e.t0 + (i % 3) * 0.2));
    }
    // Einblendungen (Tafel, Formel)
    for (const e of P.ueber) {
      const el = $(e.id).firstElementChild, leben = e.t1 - e.t0;
      tl.fromTo(el, { opacity: 0, y: 40, scale: 0.88 }, { opacity: 1, y: 0, scale: 1, duration: Math.min(0.6, leben * 0.3), ease: B.ein, immediateRender: false }, e.t0);
      if (e.u.typ === 'tafel') e.u.punkte.forEach((_, i) => tl.fromTo($(e.id + 'p' + i), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.4, ease: B.texte, immediateRender: false }, e.t0 + 0.5 + i * 0.8));
      if (e.t1 < P.D - 0.01) tl.to(el, { opacity: 0, y: -20, duration: 0.3, ease: 'power2.in' }, e.t1 - 0.3);
    }
    for (const e of P.schilder) {
      const sp = $(e.id + 'b').firstElementChild, leben = e.t1 - e.t0;
      tl.fromTo(sp, { scale: 0 }, { scale: 1, duration: Math.min(0.45, leben * 0.3), ease: B.ein, immediateRender: false }, e.t0 + 0.08);
      tl.fromTo($(e.id + 'c'), { attr: { r: 0 } }, { attr: { r: 7 * H / 1080 }, duration: 0.3, ease: B.ein, immediateRender: false }, e.t0);
      if (e.t1 < P.D - 0.01) tl.to([sp, $(e.id + 'l')], { opacity: 0, duration: Math.min(0.25, leben * 0.2) }, e.t1 - Math.min(0.25, leben * 0.2));
    }
    // Texte
    for (const e of P.texte) {
      const el = $(e.id), leben = e.t1 - e.t0, aus = Math.min(0.3, leben * 0.25);
      const ende = e.t1 < P.D - 0.01;
      if (e.art === 'unter' || e.art === 'unten') {
        const p = el.firstElementChild;
        tl.fromTo(p, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: Math.min(0.22, leben * 0.3), ease: 'power2.out', immediateRender: false }, e.t0);
        if (ende) tl.to(p, { opacity: 0, duration: Math.min(0.15, leben * 0.2) }, e.t1 - Math.min(0.15, leben * 0.2));
      } else if (e.art === 'titel') {
        const w = el.querySelectorAll('.wort');
        tl.fromTo(w, { opacity: 0, y: 40, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: B.texte, stagger: Math.min(0.08, leben * 0.3 / Math.max(1, w.length)), immediateRender: false }, e.t0);
        if (ende) tl.to(el.firstElementChild, { opacity: 0, scale: 0.9, duration: aus, ease: 'power2.in' }, e.t1 - aus);
      } else if (e.art === 'oben') {
        const band = el.firstElementChild;
        tl.fromTo(band, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.45, ease: 'power3.out', immediateRender: false }, e.t0);
        tl.fromTo(band.firstElementChild, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, e.t0 + 0.2);
        if (ende) tl.to(band, { opacity: 0, x: -40, duration: aus, ease: 'power2.in' }, e.t1 - aus);
      } else if (e.art === 'karte') {
        const fl = el.querySelector('.flaeche'), band = el.querySelector('.band'), kr = el.querySelectorAll('.kreis'), w = el.querySelectorAll('.wort');
        tl.fromTo(fl, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', immediateRender: false }, e.t0);
        tl.fromTo(kr, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.1, immediateRender: false }, e.t0);
        tl.fromTo(band, { xPercent: -130 }, { xPercent: 0, duration: 0.55, ease: 'power3.out', immediateRender: false }, e.t0 + 0.1);
        tl.fromTo(w, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: B.texte, stagger: 0.06, immediateRender: false }, e.t0 + 0.3);
        if (ende) {
          tl.to(band, { xPercent: 130, duration: 0.4, ease: 'power3.in' }, e.t1 - 0.45);
          tl.to([fl, ...kr], { opacity: 0, duration: 0.3, ease: 'none' }, e.t1 - 0.3);
        }
      }
    }
    tl.set({}, {}, P.D); // Timeline ist genau so lang wie der Film
    window.__timelines = window.__timelines || {};
    window.__timelines.film = tl;

    // ---------- Seek: Kamera, Positionen, alter Zeichner, Blenden ----------
    const leinwand = $('leinwand');
    const ctx = leinwand.getContext('2d');
    const ebenen = P.hg.map(b => ({ b, l: [...$(b.id).querySelectorAll('.ebene')].map(el => ({ el, par: +el.dataset.par })) }));
    const objEl = P.objekte.map(e => ({ e, p: $(e.id + 'p'), sch: $(e.id + 'p').querySelector('.schatten') }));
    const fakeSzene = { F, ctx, kamera: typeof THREE !== 'undefined' ? new THREE.PerspectiveCamera() : null, ueberLassen: u => P.ueberSet.has(u) };
    const schildEl = P.schilder.map(e => ({ e, l: $(e.id + 'l'), c: $(e.id + 'c'), b: $(e.id + 'b') }));
    const blende = $('blende'), blitz = $('blitz');
    const sichtbar = [...document.querySelectorAll('#film .clip')].map(el => ({ el, t0: +el.dataset.start, t1: +el.dataset.start + +el.dataset.duration }));
    let letzteZeit = -1;
    function zeige(t) {
      t = clamp(Number(t) || 0, 0, P.D - 1e-4);
      letzteZeit = t;
      if (daten.vorschau) for (const s of sichtbar) s.el.style.visibility = t >= s.t0 && t < s.t1 ? 'visible' : 'hidden';
      const K = I.kamera(F, t), s = (W / 100) * K.z;
      for (const { b, l } of ebenen) {
        if (t < b.t0 || t >= b.t1) continue;
        for (const { el, par } of l) el.style.transform = `translate(${r2(-K.x * s * par)}px,${r2(K.y * s * par)}px) scale(${r2(1 + (K.z - 1) * par)})`;
      }
      const stern = F.w2d.liste.find(x => x.typ === 'stern' && t >= x.t0 && t < x.t1);
      for (const { e, p, sch } of objEl) {
        if (t < e.t0 || t >= e.t1) continue;
        const o = e.o, q = I.pos(F, o.typ === 'huelle' && F.w2d.obj[o.planet] ? F.w2d.obj[o.planet] : o, t);
        const X = W / 2 + (q[0] - K.x) * s, Y = H / 2 - (q[1] - K.y) * s;
        const rot = o.kipp ? -I.wertBei(o.kipp, t, 0) : 0;
        p.style.transform = `translate(${r2(X)}px,${r2(Y)}px) rotate(${r2(rot)}deg) scale(${r2(K.z)})`;
        if (HF.bewegung && HF.bewegung[o.typ]) HF.bewegung[o.typ](p, o, t, F, q, I);
        if (sch) {
          let lx = -0.6, ly = -0.5;
          if (stern && stern !== o) { const sp = I.pos(F, stern, t); lx = sp[0] - q[0]; ly = -(sp[1] - q[1]); }
          sch.setAttribute('transform', `rotate(${r2(Math.atan2(-ly, -lx) * 180 / Math.PI)})`);
        }
      }
      for (const sd of schildEl) {
        const tx = sd.e.tx;
        if (t < sd.e.t0 || t >= sd.e.t1) continue;
        const X = x => W / 2 + (x - K.x) * s, Y = y => H / 2 - (y - K.y) * s, E = H / 1080;
        let p = tx.an.p, rr = 0, ziel = null, richtung = [0, 1];
        if (tx.an.obj) {
          const o = F.w2d.obj[tx.an.obj]; if (!o) continue;
          p = I.pos(F, o, t); rr = (o.typ === 'loch' ? o.r * 2.8 : o.r * 1.2) * s;
          if (tx.an.stelle) {
            const amBoden = ['kind', 'baum', 'pflanze', 'kaktus', 'pinguin', 'wand', 'mast', 'vulkan', 'koerper'].includes(o.typ) || (o.typ === 'dino' && !['plesiosaurus', 'ichthyosaurus', 'mosasaurus', 'flugsaurier', 'trilobit', 'fisch', 'qualle'].includes(o.art));
            const Hh = o.r * (o.typ === 'kind' ? 1.12 : 1), h2 = o.r * 0.55, mitteY = amBoden ? Hh * 0.5 : 0;
            const off = amBoden
              ? { oben: [0, Hh * 0.97], unten: [0, Hh * 0.03], links: [-Hh * 0.3, Hh * 0.5], rechts: [Hh * 0.3, Hh * 0.5], mitte: [0, Hh * 0.5] }[tx.an.stelle]
              : { oben: [0, h2 * 0.9], unten: [0, -h2 * 0.95], links: [-h2 * 0.8, 0], rechts: [h2 * 0.8, 0], mitte: [0, 0] }[tx.an.stelle];
            const wk = o.kipp ? I.wertBei(o.kipp, t, 0) * Math.PI / 180 : 0;
            const ox = off[0] * Math.cos(wk) - off[1] * Math.sin(wk), oy = off[0] * Math.sin(wk) + off[1] * Math.cos(wk);
            ziel = [p[0] + ox, p[1] + oy];
            const mx = p[0] - mitteY * Math.sin(wk), my = p[1] + mitteY * Math.cos(wk);
            const dx = ziel[0] - mx, dy = ziel[1] - my, lang = Math.hypot(dx, dy);
            richtung = lang > 0.01 ? [dx / lang, dy / lang] : [0, 1];
          }
        }
        let x = X(p[0]), y = Y(p[1]) - rr - 46 * E, x0 = X(p[0]), y0 = Y(p[1]) - rr;
        if (ziel) { x0 = X(ziel[0]); y0 = Y(ziel[1]); x = x0 + richtung[0] * 90 * E; y = y0 - richtung[1] * 90 * E; }
        sd.l.setAttribute('x1', r2(x0)); sd.l.setAttribute('y1', r2(y0)); sd.l.setAttribute('x2', r2(x)); sd.l.setAttribute('y2', r2(y + (ziel ? 0 : 18 * E)));
        sd.l.setAttribute('stroke-width', r2(3 * E));
        sd.c.setAttribute('cx', r2(x0)); sd.c.setAttribute('cy', r2(y0)); sd.c.style.display = ziel ? '' : 'none';
        sd.b.style.transform = `translate(${r2(x)}px,${r2(y)}px)`;
      }
      BF.welt2dZeichnen(F, t, W, H, { ziel: leinwand, hgLassen: art => P.hgKann(art), objLassen: o => P.portiert.has(o), ohneTexte: true });
      if (BF.zeichne2D) BF.zeichne2D(ctx, F, t, W, H);
      if (BF.wissen) { ctx.save(); BF.wissen.ueber(fakeSzene, t, W, H, H / 1080); ctx.restore(); }
      let weiss = 0;
      for (const b of F.blitze) if (t >= b.t0 && t < b.t1) weiss += b.staerke * Math.pow(1 - (t - b.t0) / (b.t1 - b.t0), 2);
      let bl = 0, bf = 'schwarz';
      for (const b of F.blenden) { if (b.t0 > t) break; const u = b.t1 > b.t0 ? clamp((t - b.t0) / (b.t1 - b.t0), 0, 1) : 1; bl = b.von + (b.zu - b.von) * u; bf = b.farbe; }
      blitz.style.opacity = r2(Math.min(0.85, weiss));
      blende.style.background = bf === 'weiss' ? '#fff' : '#000';
      blende.style.opacity = r2(bl);
    }
    window.addEventListener('hf-seek', ev => zeige(ev.detail ? ev.detail.time : 0));
    window.__bfZeige = t => { tl.seek(t, true); zeige(t); };
    window.__bfDauer = P.D;
    window.__bfLetzteZeit = () => letzteZeit;
    zeige(0);
  };
})();
