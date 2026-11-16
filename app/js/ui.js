// Blockfilm – Bedienung: Editor, Vorschau, Dateien, Video-Export
(function () {
  const BF = window.BF;
  const $ = id => document.getElementById(id);
  const ta = $('text'), farbig = $('farbig'), nummern = $('nummern');
  const ausgabe = $('ausgabe');
  const szene = new BF.Szene(ausgabe);
  const S = { datei: null, zeitDatei: 0, geaendert: false, F: null, t: 0, spielt: false, tonBuf: null, tonGen: 0, gen: 0, zeichnen: true, export: false, abbruch: false };
  const BEFEHLE = ['film', 'video', 'aufloesung', 'fps', 'welt', 'himmel', 'tageszeit', 'wetter', 'regen', 'schneefall', 'schwerkraft', 'abprall', 'block', 'setze', 'weg', 'entferne', 'fuelle', 'baue', 'figur', 'tier', 'kamera', 'warte', 'pause', 'text', 'untertitel', 'titel', 'einblenden', 'ausblenden', 'schwarz', 'weiss', 'explosion', 'tnt', 'rauch', 'herzen', 'funken', 'feuer', 'magie', 'feuerwerk', 'blitz', 'fallen', 'lass', 'wirf', 'blockregen', 'ton', 'musik', 'ende', 'gleichzeitig', 'dann'];

  szene.ladeFn = pfad => new Promise((ok, nein) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => nein(new Error('Bild nicht gefunden: ' + pfad));
    const basis = S.datei ? S.datei.replace(/\/[^/]*$/, '') : '';
    img.src = '/api/datei?p=' + encodeURIComponent(pfad) + (basis ? '&basis=' + encodeURIComponent(basis) : '');
  });

  // ---------- Hilfen ----------
  const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
  const status = txt => { $('status').textContent = txt; };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  async function api(pfad, o) {
    const r = await fetch(pfad, o);
    const j = await r.json();
    if (!r.ok || j.fehler) throw new Error(j.fehler || r.statusText);
    return j;
  }
  const post = (pfad, daten) => api(pfad, { method: 'POST', body: daten instanceof Blob ? daten : JSON.stringify(daten) });

  // ---------- Editor mit Farben ----------
  function einfaerben() {
    const fig = S.F ? new Set(Object.keys(S.F.akteure).concat((S.F.objekte || []).map(o => o.name).filter(Boolean))) : new Set();
    const fehl = new Set(S.F ? S.F.fehler.map(f => f.zeile) : []);
    const zeilen = ta.value.split('\n');
    const html = zeilen.map(z => {
      const k = z.search(/(^\s*#)|(\s#\s)|\/\//);
      let code = k >= 0 ? z.slice(0, k) : z, kom = k >= 0 ? z.slice(k) : '';
      let erstes = true;
      code = code.replace(/("[^"]*"?|„[^“"]*[“"]?)|(@\S*|^\s*[&+])|(#[0-9a-fA-F]{3,6}\b)|(-?\b\d+(?:[.,]\d+)?(?:s|sek|°)?\b)|([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*)|([^"„@#\w]+)/g, (m, str, zeit, farbe, zahl, wort, rest) => {
        if (str) return `<span class="k-str">${esc(str)}</span>`;
        if (zeit) return `<span class="k-zeit">${esc(zeit)}</span>`;
        if (farbe) return `<span class="k-farbe" style="text-decoration-color:${farbe}">${esc(farbe)}</span>`;
        if (zahl) return `<span class="k-zahl">${zahl}</span>`;
        if (wort) {
          const n = BF.norm(wort);
          const war = erstes; erstes = false;
          if (fig.has(n)) return `<span class="k-fig">${esc(wort)}</span>`;
          if (war && (BEFEHLE.includes(n) || (BF.zusatz && BF.zusatz[n]))) return `<span class="k-bef">${esc(wort)}</span>`;
          return esc(wort);
        }
        return esc(rest || m);
      });
      return code + (kom ? `<span class="k-kom">${esc(kom)}</span>` : '');
    }).join('\n') + '\n';
    farbig.innerHTML = html;
    let jetzt = -1;
    if (S.F && S.F.zeilen) for (const z of S.F.zeilen) if (z.t <= S.t + 1e-6 && (S.spielt || S.t > 0)) jetzt = z.zeile;
    nummern.innerHTML = zeilen.map((_, i) => `<div class="${fehl.has(i + 1) ? 'fehl' : ''}${S.spielt && jetzt === i + 1 ? ' jetzt' : ''}">${i + 1}</div>`).join('');
    scrollSync();
  }
  function scrollSync() { farbig.scrollTop = ta.scrollTop; farbig.scrollLeft = ta.scrollLeft; nummern.scrollTop = ta.scrollTop; }
  ta.addEventListener('scroll', scrollSync);
  let tippTimer = null;
  ta.addEventListener('input', () => {
    S.geaendert = true; titelAkt();
    einfaerben();
    clearTimeout(tippTimer);
    tippTimer = setTimeout(() => { kompilieren(); try { localStorage.setItem('bf_entwurf2', ta.value); } catch {} }, 450);
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
  });
  // Klick in eine Zeile springt in der Vorschau dorthin
  const zuZeile = () => {
    if (S.spielt || !S.F || !S.F.zeilen) return;
    const zeile = ta.value.slice(0, ta.selectionStart).split('\n').length;
    let t = null;
    for (const z of S.F.zeilen) if (z.zeile <= zeile) t = z.t;
    if (t !== null && Math.abs(t - S.t) > 0.01) { S.t = Math.min(S.F.dauer, t + 0.05); S.zeichnen = true; }
  };
  ta.addEventListener('click', zuZeile);
  ta.addEventListener('keyup', e => { if (e.key.startsWith('Arrow') || e.key === 'PageUp' || e.key === 'PageDown') zuZeile(); });

  function titelAkt() {
    const n = S.datei ? S.datei.split('/').pop() : 'unbenannt';
    $('dateiname').textContent = n;
    $('dateiname').classList.toggle('geaendert', S.geaendert);
    $('dateiname').title = S.datei || 'noch nicht gespeichert';
    document.title = n + ' – Blockfilm';
  }

  // ---------- Modus: Beschreiben (normale Sätze) oder Skript ----------
  const kt = $('klartext');
  S.modus = 'text';
  S.material = [];
  function modus(m) {
    S.modus = m;
    $('tab-text').classList.toggle('an', m === 'text');
    $('tab-skript').classList.toggle('an', m === 'skript');
    $('beschreiben').hidden = m !== 'text';
    $('editor').hidden = m !== 'skript';
    $('fehler').hidden = m !== 'skript';
    if (m === 'skript') einfaerben();
  }
  $('tab-text').onclick = () => {
    if (S.modus === 'text') return;
    const hatKlartext = /^#\| /m.test(ta.value);
    if (!hatKlartext && ta.value.trim() && !confirm('Dieses Skript wurde nicht mit „Beschreiben“ erstellt. Trotzdem wechseln? (Das Skript wird dann durch deine Beschreibung ersetzt, sobald du etwas schreibst.)')) return;
    modus('text');
  };
  $('tab-skript').onclick = () => modus('skript');
  const standardVideo = () => { const v = S.material.find(f => f.video); return v ? v.name : null; };
  async function materialLaden() { try { S.material = (await api('/api/material')).dateien; } catch { S.material = []; } }
  let ktTimer = null;
  function klartextUebersetzen() {
    const r = BF.klartext(BF.korrigiereText(kt.value), { standardVideo: standardVideo(), alter: $('kiAlter').value });
    const kopf = kt.value.split('\n').map(z => '#| ' + z).join('\n');
    ta.value = kopf + '\n' + r.skript + '\n';
    S.geaendert = true; titelAkt();
    kompilieren();
    berichtZeigen(r.bericht);
    try { localStorage.setItem('bf_entwurf2', ta.value); } catch {}
  }
  function berichtZeigen(b) {
    const el = $('bericht');
    if (!b.length) { el.innerHTML = '<div class="leer">Hier siehst du gleich, was ich aus deinen Sätzen mache.</div>'; return; }
    const fehlerZeilen = S.F ? S.F.fehler.map(f => f.text) : [];
    el.innerHTML = b.map(x => {
      const ok = x.zeilen.length > 0;
      return `<div class="satz ${ok ? 'ok' : 'nein'}"><b>${ok ? '✓' : '⚠'}</b>${esc(x.satz)}${ok ? `<div class="was">→ ${esc(x.zeilen.join('\n→ '))}</div>` : ''}${x.hinweis ? `<div class="tipp">💡 ${esc(x.hinweis)}</div>` : ''}</div>`;
    }).join('') + (fehlerZeilen.length ? `<div class="satz nein"><b>⚠</b>Problem beim Umsetzen:<div class="tipp">${fehlerZeilen.map(esc).join('<br>')}</div></div>` : '');
  }
  kt.addEventListener('input', () => { clearTimeout(ktTimer); ktTimer = setTimeout(klartextUebersetzen, 500); });
  // Autokorrektur in den Schreibfeldern
  const korrekturMeldung = (alt, neu) => status(`✏️ „${alt}“ → „${neu}“   (Strg+Z macht es rückgängig)`);
  BF.autokorrekturAn(kt, korrekturMeldung);
  BF.autokorrekturAn($('kiThema'), korrekturMeldung);
  $('beispielSaetze').innerHTML = BF.KLARTEXT_BEISPIELE.map(b => `<button>${esc(b)}</button>`).join('');
  $('beispielSaetze').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    if (/^Erkläre/.test(e.target.textContent)) {
      // fertiger Erklärfilm: ersetzt die ganze Beschreibung, damit nichts anderes davor läuft
      kt.value = e.target.textContent + '\n';
      S.t = 0;
      klartextUebersetzen();
      if (S.spielt) spielen(false);
      return;
    }
    kt.focus();
    const vor = kt.value.slice(0, kt.selectionStart);
    document.execCommand('insertText', false, (vor && !vor.endsWith('\n') ? '\n' : '') + e.target.textContent + '\n');
  });
  function textInBeschreiben(z) {
    kt.focus();
    const vor = kt.value.slice(0, kt.selectionStart);
    document.execCommand('insertText', false, z);
    void vor;
  }

  // ---------- KI-Regisseur ----------
  S.ki = null;
  S.kiBereit = false;
  const kiStatus = (txt, art = '') => { const el = $('kiStatus'); el.textContent = txt; el.className = 'ki-status ' + art; };
  function kiAnsicht() {
    const an = !!S.ki;
    $('kiFertig').hidden = !an;
    kt.hidden = an;
    document.querySelector('.beispiele').hidden = an;
    $('bericht').hidden = an;
    $('kiLos').textContent = an ? '🤖 Ändern' : '🤖 KI-Film';
    $('kiThema').placeholder = an ? 'Was soll anders sein? z. B. Mach es kürzer, mit einem Hund …' : 'Was soll die KI erklären? z. B. Warum ist der Himmel blau?';
    if (an) {
      $('kiTitel').textContent = `🎬 KI-Film: „${S.ki.thema}“ (${S.ki.alter.replace('-', '–')} Jahre)`;
      $('kiQuellen').innerHTML = S.ki.quellen && S.ki.quellen.length ? '<b>Woher die KI ihr Wissen hat:</b>' + S.ki.quellen.filter(q => /^https:\/\//.test(q.url)).map(q => `<a data-url="${esc(q.url)}" title="${esc(q.url)}">🔗 ${esc(q.titel)}</a>`).join('') : '';
    }
  }
  $('kiQuellen').addEventListener('click', e => { const a = e.target.closest('a[data-url]'); if (a) post('/api/oeffnen', { pfad: a.dataset.url }); });
  async function kiPruefen() { try { S.kiBereit = (await api('/api/ki/status')).bereit; } catch { S.kiBereit = false; } }
  function kiEinstellungen(meldung) {
    $('kiDialogMeldung').textContent = meldung || (S.kiBereit ? 'Ein Schlüssel ist schon eingetragen. Du kannst ihn hier ersetzen.' : '');
    $('kiDialog').hidden = false;
    $('kiSchluessel').focus();
  }
  $('kiEinst').onclick = () => kiEinstellungen();
  // ---------- YouTube und Tagesvideo ----------
  async function ytZeigen() {
    let st; try { st = await api('/api/youtube/status'); } catch (e) { $('ytStatus').textContent = e.message; return; }
    $('ytStatus').innerHTML = st.verbunden ? `✅ Verbunden${st.kanal ? ` mit dem Kanal <b>${esc(st.kanal.name)}</b>` : ''}.` : st.client ? '🔑 Zugang gespeichert. Jetzt „Mit YouTube verbinden“ klicken.' : '⬜ Noch nicht eingerichtet.';
    $('ytTrennen').hidden = !st.verbunden;
    $('tvAn').checked = !!st.tagesvideo.an; $('tvZeit').value = st.tagesvideo.uhrzeit; $('tvAlter').value = st.tagesvideo.alter;
    $('tvListe').innerHTML = st.letzte.length ? '<b>Letzte Tagesvideos:</b><br>' + st.letzte.map(v => `${new Date(v.datum).toLocaleDateString('de-DE')}: ${esc(v.titel || v.thema || '')} ${v.url ? `<a data-url="${esc(v.url)}">▶ auf YouTube</a>` : ''}${v.fehler ? ` <span style="color:#f88">⚠ ${esc(v.fehler)}</span>` : ''}`).join('<br>') : '';
  }
  $('ytEinst').onclick = () => { $('ytDialog').hidden = false; ytZeigen(); };
  $('ytCloud').onclick = e => { e.preventDefault(); post('/api/oeffnen', { pfad: 'https://console.cloud.google.com/projectcreate' }); };
  $('tvListe').addEventListener('click', e => { const a = e.target.closest('a[data-url]'); if (a) post('/api/oeffnen', { pfad: a.dataset.url }); });
  $('ytClientSpeichern').onclick = async () => {
    const j = await post('/api/youtube/client', { text: $('ytClient').value });
    if (!j.ok) { $('ytStatus').textContent = '⚠ ' + j.fehler; return; }
    $('ytClient').value = ''; ytZeigen();
  };
  $('ytVerbinden').onclick = () => {
    const w = window.open('/api/youtube/verbinden', 'yt', 'width=560,height=720');
    const uhr = setInterval(() => { if (!w || w.closed) { clearInterval(uhr); ytZeigen(); } }, 800);
  };
  $('ytTrennen').onclick = async () => { if (confirm('Verbindung zu YouTube trennen?')) { await post('/api/youtube/trennen', {}); ytZeigen(); } };
  $('tvSpeichern').onclick = async () => {
    const j = await post('/api/tagesvideo/einstellen', { an: $('tvAn').checked, uhrzeit: $('tvZeit').value, alter: $('tvAlter').value });
    $('tvMeldung').textContent = !j.ok ? '⚠ ' + j.fehler : j.timer ? `✓ Jeden Tag um ${$('tvZeit').value} Uhr kommt ein neues Video.` : '✓ Gespeichert. Das Tagesvideo ist aus.';
  };
  $('tvJetzt').onclick = async () => {
    await post('/api/tagesvideo/jetzt', {});
    $('tvMeldung').textContent = '▶ Das Tagesvideo wird jetzt gemacht (wartet, falls gerade ein anderer Export läuft). Fortschritt unter „📋 Exporte“; am Ende kommt eine Benachrichtigung.';
  };
  $('kiSeite').onclick = () => post('/api/oeffnen', { pfad: 'https://console.anthropic.com/settings/keys' });
  $('kiSpeichern').onclick = async () => {
    const j = await post('/api/ki/schluessel', { apiKey: $('kiSchluessel').value }).catch(e => ({ ok: false, fehler: e.message }));
    if (!j.ok) { $('kiDialogMeldung').textContent = j.fehler; return; }
    $('kiSchluessel').value = '';
    S.kiBereit = j.bereit;
    $('kiDialog').hidden = true;
    kiStatus(S.kiBereit ? '✓ KI ist bereit. Schreib ein Thema und klick „🤖 KI-Film“.' : 'Schlüssel entfernt.');
  };
  function kiLaden(ki, skript) {
    S.ki = ki;
    ta.value = '#KI ' + JSON.stringify({ thema: ki.thema, alter: ki.alter, stil: ki.stil, quellen: ki.quellen || [] }) + '\n' + skript;
    S.geaendert = true; titelAkt();
    S.t = 0;
    kompilieren();
    kiAnsicht();
    try { localStorage.setItem('bf_entwurf2', ta.value); } catch {}
  }
  let kiLaeuft = false;
  const AENDERUNG = /\b(mach\w*|füg\w*|fueg\w*|änder\w*|aender\w*|ersetz\w*|kürzer|kuerzer|länger|laenger|lass\w*|nimm|zeig\w*|statt|mehr|weniger|bitte|soll\w*|noch|besser|schneller|langsamer|entfern\w*|lösch\w*|loesch\w*|weg|tausch\w*|nochmal|kannst|könntest|koenntest)\b/i;
  const FRAGE = /^(warum|wieso|weshalb|wie|was|wer|wo|wann|woher|wohin|welche\w*|kann|können|koennen|gibt es|stimmt es|stell dir vor)\b/i;
  function istNeuesThema(s) { return !AENDERUNG.test(s) && (FRAGE.test(s.trim()) || /\?\s*$/.test(s)); }
  async function kiFilm() {
    if (kiLaeuft) return;
    const eingabe = $('kiThema').value.trim();
    if (!eingabe) { kiStatus(S.ki ? 'Schreib, was anders sein soll.' : 'Schreib zuerst ein Thema, z. B. „Warum regnet es?“', 'fehler'); $('kiThema').focus(); return; }
    if (!S.kiBereit) await kiPruefen(); // gespeicherten Schlüssel noch einmal nachsehen
    if (!S.kiBereit) { kiEinstellungen(); return; }
    kiLaeuft = true;
    $('kiLos').disabled = true;
    // Eine neue Frage („Warum …?“) ist ein neuer Film, auch wenn gerade ein KI-Film offen ist; sonst würde der neue
    // Film unter dem alten Thema und Dateinamen gespeichert und überschriebe den alten.
    if (S.ki && istNeuesThema(eingabe)) { S.ki = null; kiAnsicht(); }
    const aendern = !!S.ki;
    const thema = aendern ? S.ki.thema : eingabe;
    const alter = aendern ? S.ki.alter : $('kiAlter').value;
    const stil = aendern ? (S.ki.stil || 'echt') : $('kiStil').value;
    const start = Date.now();
    let uhr = setInterval(() => kiStatus(`🔎 Die KI sucht im Internet und schreibt den Film … ${Math.round((Date.now() - start) / 1000)} s (dauert meist 30–90 Sekunden)`, 'laeuft'), 500);
    try {
      let r = await post('/api/ki', { thema, alter, stil, vorher: aendern ? skriptOhneKopf() : null, aenderung: aendern ? eingabe : null });
      if (!r.ok) { if (r.schluessel) kiEinstellungen(r.fehler); throw new Error(r.fehler); }
      // einmal automatisch nachbessern, falls das Skript Fehler hat
      const probe = BF.kompiliere(r.skript);
      if (probe.fehler.length) {
        const r2 = await post('/api/ki', { thema, alter, stil, vorher: r.skript, fehler: probe.fehler.slice(0, 15) });
        if (r2.ok) r = Object.assign(r2, { quellen: (r.quellen || []).concat(r2.quellen || []) });
      }
      // Regie-Prüfung: die KI schaut sich Standbilder ihres Films an und bessert nach
      let regie = null;
      if ($('kiRegie').checked) {
        clearInterval(uhr);
        const start3 = Date.now();
        uhr = setInterval(() => kiStatus(`🎬 Die KI schaut sich ihren Film an und bessert nach … ${Math.round((Date.now() - start3) / 1000)} s`, 'laeuft'), 500);
        try {
          // bis zu zwei Runden: die zweite nur, wenn die automatische Prüfung danach noch etwas findet
          const notizen = [];
          for (let runde = 1; runde <= 2; runde++) {
            regie = await regiePruefung(r.skript, { thema, alter, stil });
            if (regie && regie.ok && regie.geaendert) {
              let neu = regie.skript;
              let pr = BF.kompiliere(neu);
              if (pr.fehler.length) { // Nachbesserung hat Fehler: einmal reparieren lassen, sonst die alte Fassung behalten
                const r3 = await post('/api/ki', { thema, alter, stil, vorher: neu, fehler: pr.fehler.slice(0, 15) });
                neu = r3.ok ? r3.skript : null;
                pr = neu ? BF.kompiliere(neu) : null;
              }
              if (neu && pr && !pr.fehler.length) { r.skript = neu; notizen.push(...regie.notizen); }
              else { regie = { ok: false, fehler: 'Die Nachbesserung hatte Fehler, die vorige Fassung bleibt.' }; break; }
            } else break;
            if (!regieRest(r.skript, alter).length) break;
          }
          if (notizen.length) regie = { ok: true, geaendert: true, notizen };
        } catch (e) { regie = { ok: false, fehler: e.message }; }
      }
      // die KI hört nach, ob die Stimme jedes Wort richtig ausspricht (bevor die Stimme gerechnet wird)
      clearInterval(uhr);
      const start2 = Date.now();
      uhr = setInterval(() => kiStatus(`🗣 Die KI prüft, ob jedes Wort richtig ausgesprochen wird … ${Math.round((Date.now() - start2) / 1000)} s`, 'laeuft'), 500);
      let ausspr = null;
      try { ausspr = await post('/api/ki/aussprache', { skript: r.skript }); } catch {}
      kiLaden({ thema, alter, stil, quellen: r.quellen || (S.ki && S.ki.quellen) || [] }, r.skript);
      // jeder KI-Film wird gespeichert und erscheint in der Film-Leiste
      let kiAutoExport = false;
      try {
        const name = 'KI/' + ((t => t.length > 60 ? t.slice(0, 60).replace(/\s+\S*$/, '') : t)(thema.replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim()) || 'KI-Film') + ' (' + alter + ')';
        const gesp = await post('/api/schreiben', { pfad: name, text: ta.value });
        S.datei = gesp.pfad; S.zeitDatei = gesp.zeit; S.geaendert = false; titelAkt();
        filmleisteLaden();
        // jeder KI-Film wird auch gleich im Hintergrund als Video exportiert (landet in ~/Videos/Blockfilm); beim Tagesvideo exportiert der Ablauf selbst
        if (!S.tagesModus) try {
          const r = await post('/api/stapel', { filme: [{ pfad: gesp.pfad, name: thema }], aufl: $('gal-aufl').value, stimme: BF.stimmeWahl || null, tempo: BF.sprechTempoWahl || null, alter });
          if (r.neu) kiAutoExport = true;
          exporteAktualisieren();
        } catch {}
      } catch {}
      $('kiThema').value = '';
      let zusatz = '';
      if (ausspr && ausspr.ok) zusatz = ausspr.korrekturen.length ? ` 🗣 Aussprache verbessert: ${ausspr.korrekturen.slice(0, 8).map(k => `${k.wort} → ${k.schreibweise}`).join(', ')}${ausspr.korrekturen.length > 8 ? ' …' : ''} (steht jetzt unter „Aussprache“).` : ' 🗣 Aussprache geprüft: alles richtig.';
      else if (ausspr) zusatz = ' (Aussprache konnte nicht geprüft werden.)';
      if (regie && regie.ok) zusatz += regie.geaendert ? ` 🎬 Regie hat nachgebessert: ${(regie.notizen.length ? regie.notizen : ['einige Bilder verbessert']).join('; ')}.` : ' 🎬 Regie-Prüfung: alles gut.';
      else if (regie) zusatz += ` (Regie-Prüfung ging nicht: ${regie.fehler})`;
      if (kiAutoExport) zusatz += ' 💾 Das Video wird im Hintergrund exportiert und erscheint danach oben in der Leiste.';
      kiStatus(`✓ Fertig nach ${Math.round((Date.now() - start) / 1000)} Sekunden.${zusatz} Drück ▶ zum Anschauen.`);
      S.kiErgebnis = { ok: true };
    } catch (e) {
      S.kiErgebnis = { ok: false, fehler: e.message };
      kiStatus('⚠ ' + e.message, 'fehler');
    } finally {
      clearInterval(uhr);
      kiLaeuft = false;
      $('kiLos').disabled = false;
    }
  }
  // Was die automatische Prüfung an einem Skript noch findet
  function regieRest(skript, alter) {
    const alt = BF.hf.standardAlter; BF.hf.standardAlter = alter;
    try { const F = BF.kompiliere(skript); return BF.hf.passt(F) ? BF.hf.regieBefunde(F, skript) : []; } finally { BF.hf.standardAlter = alt; }
  }
  // Film übersetzen, Befunde sammeln, Komposition bauen; der Server macht Standbilder und fragt die KI
  async function regiePruefung(skript, info) {
    const altAlter = BF.hf.standardAlter;
    BF.hf.standardAlter = info.alter;
    try {
      const sprach = Object.assign({}, BF.sprachDauer);
      const F = BF.kompiliere(skript);
      if (!BF.hf.passt(F)) return null; // Filme mit 3D-Blockwelt werden (noch) nicht geprüft
      const befunde = BF.hf.regieBefunde(F, skript), momente = BF.hf.regieMomente(F, 10);
      const html = BF.hf.komponiere(F, { skript, sprachDauer: sprach, alter: info.alter, breite: 1280, hoehe: Math.round(1280 * (F.hoehe || 1080) / (F.breite || 1920)), vorschau: true, ton: null, basis: '/' });
      return await post('/api/ki/regie', Object.assign({}, info, { skript, html, momente, befunde }));
    } finally { BF.hf.standardAlter = altAlter; }
  }
  try { const v = localStorage.getItem('bf_kiRegie'); if (v !== null) $('kiRegie').checked = v === '1'; } catch {}
  $('kiRegie').addEventListener('change', () => { try { localStorage.setItem('bf_kiRegie', $('kiRegie').checked ? '1' : '0'); } catch {} });
  const skriptOhneKopf = () => ta.value.split('\n').filter(z => !z.startsWith('#KI ')).join('\n');
  $('kiLos').onclick = kiFilm;
  // Alter gilt für alle Filme: bei Änderung fertige Filme neu zusammenstellen
  try { const a = localStorage.getItem('bf_alter'); if (a) $('kiAlter').value = a; } catch {}
  $('kiAlter').addEventListener('change', () => {
    try { localStorage.setItem('bf_alter', $('kiAlter').value); } catch {}
    if (!S.ki && kt.value.trim()) { S.t = 0; klartextUebersetzen(); status('Film für ' + BF.ALTER_NAME[$('kiAlter').value] + ' zusammengestellt.'); }
  });
  $('kiThema').addEventListener('keydown', e => { if (e.key === 'Enter') kiFilm(); });
  $('kiNeu').onclick = () => { S.ki = null; kiAnsicht(); $('kiThema').focus(); kiStatus(''); };
  $('kiSelbst').onclick = () => { S.ki = null; kiAnsicht(); kt.focus(); if (kt.value.trim()) klartextUebersetzen(); };

  // ---------- Übersetzen ----------
  // Zielgruppe für den Bildstil: aus dem KI-Kopf des Films, sonst die Auswahl in der App
  function zielgruppeAusText(text) {
    const z = String(text || '').split('\n').find(x => x.startsWith('#KI '));
    if (z) try { const a = JSON.parse(z.slice(4)).alter; if (BF.hf.STILE[a]) return a; } catch {}
    const a = $('kiAlter') && $('kiAlter').value;
    return BF.hf.STILE[a] ? a : '6-9';
  }
  function kompilieren() {
    const t0 = performance.now();
    let F;
    try {
      BF.hf.standardAlter = zielgruppeAusText(ta.value);
      const sprachStand = Object.assign({}, BF.sprachDauer);
      F = BF.kompiliere(ta.value);
      S.quelle = ta.value;
      S.sprachStand = sprachStand; // genau die Sprechdauern, mit denen F berechnet wurde (für die Komposition)
      BF.simuliere(F);
    } catch (e) {
      console.error(e);
      $('fehler').innerHTML = `<div>Interner Fehler: ${esc(e.message)}</div>`;
      return;
    }
    S.F = F;
    S.gen++;
    szene.setzeFilm(F);
    if (S.t > F.dauer) S.t = 0;
    const ms = Math.round(performance.now() - t0);
    $('info').textContent = `${F.breite}×${F.hoehe} · ${F.fps} fps · ${fmt(F.dauer)} · ${Object.keys(F.akteure).length} Figuren${F.koerper.length ? ` · ${F.koerper.length} Physik-Blöcke` : ''}`;
    const fe = $('fehler');
    if (F.fehler.length) fe.innerHTML = F.fehler.map(f => `<div data-z="${f.zeile}">Zeile ${f.zeile}: ${esc(f.text)}</div>`).join('');
    else fe.innerHTML = `<div class="ok">✓ Skript in Ordnung (${ms} ms)</div>`;
    einfaerben();
    groesseAnpassen();
    S.zeichnen = true;
    S.vorb = vorbereiten(F);
    hfVorschauNeu();
    if (S.modus === 'text' && kt.value.trim() && $('bericht').dataset.k !== String(S.gen)) { $('bericht').dataset.k = String(S.gen); }
    // Ton im Hintergrund berechnen (läuft der Film gerade, alten Ton anhalten; der neue setzt nahtlos an derselben Stelle ein)
    if (S.spielt) { tonStoppen(); uhrStart = performance.now(); uhrT = S.t; }
    tonNeu();
  }
  // Ton in Stücken von 20 Sekunden berechnen: zuerst das Stück, das gerade läuft, dann die nächsten.
  // So gibt es auch bei sehr langen Filmen sofort Ton.
  const STUECK = 20;
  S.tonStuecke = [];
  const tonBereit = t => S.tonStuecke.some(x => x && t >= x.von - 0.01 && t < x.von + x.buf.duration);
  function tonNeu() {
    const F = S.F;
    const g = ++S.tonGen;
    S.tonStuecke = []; S.tonBuf = null;
    setTimeout(async () => {
      if (g !== S.tonGen || !F) return;
      const n = Math.max(1, Math.ceil((F.dauer + 0.6) / STUECK));
      const fertig = new Array(n).fill(false);
      for (let runde = 0; runde < n; runde++) {
        if (g !== S.tonGen) return;
        const ab = Math.min(n - 1, Math.max(0, Math.floor(S.t / STUECK)));
        let k = fertig.indexOf(false, ab); if (k < 0) k = fertig.indexOf(false);
        if (k < 0) break;
        fertig[k] = true;
        let buf;
        try { buf = await BF.renderTon(F, { von: k * STUECK, bis: (k + 1) * STUECK }); } catch (e) { console.warn('Ton:', e); continue; }
        if (g !== S.tonGen) return;
        if (buf === null) { // mit Musik: einmal am Stück
          try { const voll = await BF.renderTon(F); if (g === S.tonGen) { S.tonStuecke = [{ von: 0, buf: voll }]; S.tonBuf = voll; if (S.spielt) tonStarten(); } } catch (e) { console.warn('Ton:', e); }
          return;
        }
        S.tonStuecke[k] = { von: k * STUECK, buf };
        if (n === 1) S.tonBuf = buf;
        if (S.spielt) { if (tonLaeuft) stueckPlanen(S.tonStuecke[k]); else tonStarten(); }
        await new Promise(r => setTimeout(r, 0));
      }
    }, 300);
  }
  // Videos, Bilder, Sprecher-Stimme und Video-Ton laden (einmal, dann zwischengespeichert)
  const basisPfad = () => (S.datei ? S.datei.replace(/\/[^/]*$/, '') : '');
  const dekoder = () => new OfflineAudioContext(2, 1, 44100);
  async function vorbereiten(F) {
    const gen = S.gen;
    let neu = false, tonGeaendert = false;
    const b = basisPfad();
    const q = p => 'p=' + encodeURIComponent(p) + (b ? '&basis=' + encodeURIComponent(b) : '');
    const zusatzFehler = [];
    for (const d of F.brauche ? F.brauche.videos : []) {
      if (BF.videoInfo[d]) { if (BF.videoInfo[d].fehler) zusatzFehler.push(`Video „${d}“: ${BF.videoInfo[d].fehler}`); continue; }
      status(`Video „${d}“ wird vorbereitet … (beim ersten Mal kann das etwas dauern)`);
      try { BF.videoInfo[d] = await api('/api/videoinfo?' + q(d)); BF.videoElement(d); neu = true; status(`Video „${d}“ bereit (${BF.videoInfo[d].breite}×${BF.videoInfo[d].hoehe}, ${fmt(BF.videoInfo[d].dauer)})`); }
      catch (e) { BF.videoInfo[d] = { fehler: e.message }; zusatzFehler.push(`Video „${d}“: ${e.message}`); }
    }
    for (const d of F.brauche ? F.brauche.bilder : []) {
      if (BF.bilder[d]) continue;
      const img = new Image();
      img.onload = () => { S.zeichnen = true; };
      img.onerror = () => { status(`Bild „${d}“ nicht gefunden`); };
      img.src = '/api/datei?' + q(d);
      BF.bilder[d] = img;
    }
    if (!S.stimmen || !S.stimmen.piper || !S.stimmen.stimmen.length) { try { S.stimmen = await api('/api/stimmen'); stimmenMenue(); } catch {} }
    if (S.stimmen && S.stimmen.piper && S.stimmen.stimmen.length) {
      // in Zeitreihenfolge einlesen: dann kann der Film schon starten, wenn der Anfang fertig ist
      const offen = (F.sprache || []).filter(sp => !(sp.key in BF.sprachDauer) && !BF.sprachPuffer[sp.key]).sort((a, b) => a.t0 - b.t0);
      if (gen === S.gen) S.bereitBis = offen.length ? offen[0].t0 : Infinity;
      if (gen === S.gen && !offen.length && S.stimmeLaedt) { S.stimmeLaedt = false; status('🗣 Sprecher ist bereit.'); }
      if (offen.length) {
        S.stimmeLaedt = true;
        let fertig = 0, uebernommen = 0;
        const erledigt = new Set();
        const zeige = () => { if (gen === S.gen) status(`🗣 Sprecher wird eingelesen … ${fertig} von ${offen.length}${S.bereitBis - S.t > 15 && S.bereitBis < Infinity ? ' · du kannst schon ▶ drücken' : ''}`); };
        const zwischenstand = () => {
          // fertige Sätze am Stück vom Anfang → Film neu zusammensetzen (nicht während des Abspielens oder Exports)
          if (gen !== S.gen || S.export || S.spielt) return;
          let k = 0; while (k < offen.length && erledigt.has(offen[k].key)) k++;
          if (k >= offen.length || k - uebernommen < (uebernommen ? 20 : 5)) return;
          uebernommen = k;
          setTimeout(() => { if (!S.export && !S.spielt) kompilieren(); }, 0);
        };
        zeige();
        BF.sprachLaeuft = BF.sprachLaeuft || {};
        const eins = async sp => {
          // derselbe Satz wird nie doppelt eingelesen, auch wenn zwei Durchläufe gleichzeitig laufen
          if (!BF.sprachLaeuft[sp.key]) {
            BF.sprachLaeuft[sp.key] = (async () => {
              const r = await fetch('/api/sprechen', { method: 'POST', body: JSON.stringify({ text: sp.text, stimme: sp.stimme, tempo: sp.tempo }) });
              if (!r.ok) throw new Error((await r.json()).fehler);
              const buf = await dekoder().decodeAudioData(await r.arrayBuffer());
              BF.sprachPuffer[sp.key] = buf;
              BF.sprachDauer[sp.key] = buf.duration;
            })();
            BF.sprachLaeuft[sp.key].catch(() => { delete BF.sprachLaeuft[sp.key]; });
          }
          try { await BF.sprachLaeuft[sp.key]; neu = true; }
          catch (e) { BF.sprachDauer[sp.key] = sp.t1 - sp.t0; zusatzFehler.push('Sprecher: ' + e.message); }
          fertig++; erledigt.add(sp.key); zeige(); zwischenstand();
        };
        // mehrere Sätze gleichzeitig einlesen
        const liste = offen.slice();
        // Sätze, die im aktuellen Film nicht mehr vorkommen (anderer Film geladen), werden nicht mehr eingelesen
        const nochGebraucht = sp => gen === S.gen || (S.F && (S.F.sprache || []).some(x => x.key === sp.key));
        await Promise.all([0, 1, 2].map(async () => { while (liste.length) { const sp = liste.shift(); if (nochGebraucht(sp)) await eins(sp); } }));
        if (gen === S.gen) { S.stimmeLaedt = false; status('🗣 Sprecher ist bereit.'); }
      }
    }
    for (const c of F.clips || []) {
      if (c.stand || !c.laut) continue;
      const info = BF.videoInfo[c.datei];
      const key = BF.clipSchluessel(c);
      if (!info || !info.ton || BF.clipPuffer[key]) continue;
      try {
        const r = await fetch(`/api/clipton?${q(c.datei)}&von=${c.von}&dauer=${c.bis - c.von}&tempo=${c.tempo}`);
        if (!r.ok) throw new Error('Ton nicht lesbar');
        BF.clipPuffer[key] = await dekoder().decodeAudioData(await r.arrayBuffer());
        tonGeaendert = true;
      } catch (e) { zusatzFehler.push(`Ton von „${c.datei}“: ${e.message}`); }
    }
    if (gen !== S.gen) return;
    if (neu) { kompilieren(); return S.vorb; }
    if (zusatzFehler.length) $('fehler').insertAdjacentHTML('beforeend', zusatzFehler.map(f => `<div>${esc(f)}</div>`).join(''));
    if (tonGeaendert) tonNeu();
    S.zeichnen = true;
  }

  $('fehler').addEventListener('click', e => {
    const z = e.target.dataset.z;
    if (!z) return;
    const zeilen = ta.value.split('\n');
    let pos = 0;
    for (let i = 0; i < z - 1; i++) pos += zeilen[i].length + 1;
    ta.focus();
    ta.setSelectionRange(pos, pos + zeilen[z - 1].length);
    ta.scrollTop = Math.max(0, (z - 5) * 20);
  });

  // ---------- Vorschau ----------
  let anzeigeB = 0, anzeigeH = 0;
  function groesseAnpassen() {
    if (!S.F || S.export) return;
    const box = $('buehne').getBoundingClientRect();
    const fa = S.F.breite / S.F.hoehe;
    const rand = document.fullscreenElement ? 0 : 24;
    let b = box.width - rand, h = b / fa;
    if (h > box.height - rand) { h = box.height - rand; b = h * fa; }
    ausgabe.style.width = Math.floor(b) + 'px';
    ausgabe.style.height = Math.floor(h) + 'px';
    const q = (document.fullscreenElement ? Math.max(1, parseFloat($('vorschauQ').value)) : parseFloat($('vorschauQ').value)) * (window.devicePixelRatio || 1);
    anzeigeB = Math.max(160, Math.min(S.F.breite, Math.round(b * q)));
    anzeigeH = Math.round(anzeigeB / fa);
    S.zeichnen = true;
    hfLage();
  }
  window.addEventListener('resize', groesseAnpassen);

  // ---------- Vorschau im neuen Bildstil: die HyperFrames-Komposition läuft in einem iframe über dem Bild ----------
  const hfRahmen = $('hfVorschau');
  let hfBereit = false, hfTimer = null, hfGroesse = [1280, 720];
  try { const v = localStorage.getItem('bf_neuerStil'); if (v !== null) $('neuerStil').checked = v === '1'; } catch {}
  $('neuerStil').addEventListener('change', () => { try { localStorage.setItem('bf_neuerStil', $('neuerStil').checked ? '1' : '0'); } catch {} hfVorschauNeu(); });
  function hfVorschauNeu() {
    clearTimeout(hfTimer);
    hfTimer = setTimeout(() => {
      const F = S.F;
      if (!F || !$('neuerStil').checked || !BF.hf.passt(F)) { hfRahmen.hidden = true; hfBereit = false; S.zeichnen = true; return; }
      const B = 1280, H = Math.round(B * F.hoehe / F.breite / 2) * 2;
      hfGroesse = [B, H];
      hfBereit = false; // die neue Seite lädt erst noch
      hfRahmen.onload = () => { hfBereit = true; hfLage(); S.zeichnen = true; };
      hfRahmen.srcdoc = BF.hf.komponiere(F, { skript: S.quelle, sprachDauer: S.sprachStand, alter: BF.hf.standardAlter, breite: B, hoehe: H, vorschau: true, ton: null });
      hfRahmen.hidden = false;
      hfLage();
    }, 300);
  }
  function hfLage() {
    if (hfRahmen.hidden) return;
    const b = $('buehne').getBoundingClientRect(), a = ausgabe.getBoundingClientRect();
    hfRahmen.style.left = (a.left - b.left) + 'px'; hfRahmen.style.top = (a.top - b.top) + 'px';
    hfRahmen.style.width = hfGroesse[0] + 'px'; hfRahmen.style.height = hfGroesse[1] + 'px';
    hfRahmen.style.transform = `scale(${a.width / hfGroesse[0]})`;
  }
  // ---------- Vollbild ----------
  function vollbild() {
    if (document.fullscreenElement) document.exitFullscreen();
    else $('buehne').requestFullscreen().catch(e => status('Vollbild geht nicht: ' + e.message));
  }
  $('b-vollbild').onclick = vollbild;
  ausgabe.addEventListener('dblclick', e => { e.preventDefault(); vollbild(); });
  let mausTimer = null;
  document.addEventListener('fullscreenchange', () => {
    const an = !!document.fullscreenElement;
    $('b-vollbild').textContent = an ? '⛶ Vollbild aus' : '⛶ Vollbild';
    const hw = $('vbHinweis'); hw.style.opacity = 1; setTimeout(() => { hw.style.opacity = 0; }, 2500);
    setTimeout(groesseAnpassen, 50);
  });
  $('buehne').addEventListener('mousemove', () => {
    $('buehne').classList.remove('ruhig');
    clearTimeout(mausTimer);
    mausTimer = setTimeout(() => { if (document.fullscreenElement) $('buehne').classList.add('ruhig'); }, 2000);
  });
  $('vorschauQ').addEventListener('change', () => { groesseAnpassen(); try { localStorage.setItem('bf_q', $('vorschauQ').value); } catch {} });
  try { const q = localStorage.getItem('bf_q'); if (q) $('vorschauQ').value = q; } catch {}

  let ac = null, quellen = [], tonStart = 0, uhrStart = 0, uhrT = 0, tonLaeuft = false;
  function stueckPlanen(x) {
    if (!tonLaeuft || !x || !ac) return;
    const beginn = tonStart + x.von, jetzt = ac.currentTime;
    const versatz = Math.max(0, jetzt - beginn);
    if (versatz >= x.buf.duration - 0.01) return;
    const q = ac.createBufferSource();
    q.buffer = x.buf; q.connect(ac.destination);
    q.start(Math.max(jetzt, beginn), versatz);
    quellen.push(q);
    q.onended = () => { quellen = quellen.filter(y => y !== q); };
  }
  function tonStarten() {
    tonStoppen();
    if (!$('tonAn').checked || !S.tonStuecke.length) return;
    ac = ac || new AudioContext();
    if (ac.state === 'suspended') ac.resume();
    tonStart = ac.currentTime - S.t;
    tonLaeuft = true;
    for (const x of S.tonStuecke) stueckPlanen(x);
  }
  function tonStoppen() { tonLaeuft = false; for (const q of quellen) { try { q.stop(); } catch {} } quellen = []; }
  let wartetAufStimme = false;
  async function spielen(an) {
    if (!S.F) return;
    const stimmeFehlt = () => S.stimmeLaedt && (S.t >= S.F.dauer - 0.05 ? 0 : S.t) >= (S.bereitBis ?? Infinity) - 1;
    if (an && (stimmeFehlt() || (S.F.sprache && S.F.sprache.length && !tonBereit(S.t >= S.F.dauer - 0.05 ? 0 : S.t)))) {
      if (wartetAufStimme) return;
      wartetAufStimme = true;
      $('b-spielen').textContent = '⏳';
      status('⏳ Einen Moment – der Sprecher wird noch eingelesen, dann geht es los …');
      for (let i = 0; i < 600 && (stimmeFehlt() || !tonBereit(S.t >= S.F.dauer - 0.05 ? 0 : S.t)); i++) await new Promise(r => setTimeout(r, 200));
      wartetAufStimme = false;
    }
    S.spielt = an;
    $('b-spielen').textContent = an ? '⏸' : '▶';
    if (an) {
      if (S.t >= S.F.dauer - 0.05) S.t = 0;
      uhrStart = performance.now(); uhrT = S.t;
      tonStarten();
    } else tonStoppen();
    einfaerben();
  }
  $('b-spielen').onclick = () => spielen(!S.spielt);
  $('b-anfang').onclick = () => { S.t = 0; S.zeichnen = true; if (S.spielt) spielen(true); };
  try { BF.musikAn = localStorage.getItem('bf_musik') === '1'; } catch { BF.musikAn = false; }
  $('musikAn').checked = BF.musikAn;
  $('musikAn').onchange = () => { BF.musikAn = $('musikAn').checked; try { localStorage.setItem('bf_musik', BF.musikAn ? '1' : '0'); } catch {} tonNeu(); };
  for (const [id, feld, def] of [['lautStimme', 'lautStimme', 55], ['lautGeraeusche', 'lautGeraeusche', 45]]) {
    let v = def;
    try { const g = localStorage.getItem('bf_' + id); if (g !== null) v = +g; } catch {}
    $(id).value = v; BF[feld] = v / 100;
    let tm = null;
    $(id).addEventListener('input', () => {
      BF[feld] = $(id).value / 100;
      try { localStorage.setItem('bf_' + id, $(id).value); } catch {}
      clearTimeout(tm); tm = setTimeout(tonNeu, 400);
    });
  }
  // Sprechtempo (Stimme schneller, Pausen kürzer)
  try { const v = localStorage.getItem('bf_sprechtempo'); if (v && BF.SPRECHTEMPO[v]) BF.sprechTempoWahl = v; } catch {}
  $('sprechTempo').value = BF.sprechTempoWahl;
  $('sprechTempo').addEventListener('change', () => {
    BF.sprechTempoWahl = $('sprechTempo').value;
    try { localStorage.setItem('bf_sprechtempo', BF.sprechTempoWahl); } catch {}
    status('Sprechtempo geändert – der Sprecher wird neu eingelesen …');
    if (S.modus === 'text' && !S.ki && kt.value.trim()) klartextUebersetzen(); else kompilieren();
  });
  // Stimmen-Auswahl
  try { BF.stimmeWahl = localStorage.getItem('bf_stimme') || null; } catch {}
  function stimmenMenue() {
    const sel = $('stimmeWahl');
    const l = (S.stimmen && S.stimmen.anzeige) || [];
    if (!l.length) { sel.innerHTML = '<option value="">🗣 keine Stimme</option>'; sel.title = 'Stimme installieren: ! ~/Work/blockfilm/bin/stimme-installieren'; return; }
    sel.innerHTML = l.map(v => `<option value="${esc(v.id)}">🗣 ${esc(v.name)}</option>`).join('');
    if (BF.stimmeWahl && l.some(v => v.id === BF.stimmeWahl)) sel.value = BF.stimmeWahl;
    else { const th = l.find(v => v.id.includes('thorsten-high')) || l[0]; sel.value = th.id; BF.stimmeWahl = th.id; }
  }
  $('stimmeWahl').addEventListener('change', () => {
    BF.stimmeWahl = $('stimmeWahl').value || null;
    try { localStorage.setItem('bf_stimme', BF.stimmeWahl || ''); } catch {}
    status('Stimme gewechselt – der Sprecher wird neu eingelesen …');
    if (S.modus === 'text' && !S.ki && kt.value.trim()) klartextUebersetzen(); else kompilieren();
    probe();
  });
  async function probe() {
    if (!BF.stimmeWahl) { status('Noch keine Stimme installiert. Tippe: ! ~/Work/blockfilm/bin/stimme-installieren'); return; }
    try {
      const r = await fetch('/api/sprechen', { method: 'POST', body: JSON.stringify({ text: 'Hallo! So klinge ich. Wollen wir zusammen etwas entdecken?', stimme: BF.stimmeWahl, tempo: 1 }) });
      if (!r.ok) throw new Error((await r.json()).fehler);
      ac = ac || new AudioContext();
      if (ac.state === 'suspended') await ac.resume();
      const buf = await ac.decodeAudioData(await r.arrayBuffer());
      const q = ac.createBufferSource(); q.buffer = buf;
      const g = ac.createGain(); g.gain.value = (BF.lautStimme ?? 0.55) * 1.4;
      q.connect(g); g.connect(ac.destination); q.start();
    } catch (e) { status('Stimme konnte nicht abgespielt werden: ' + e.message); }
  }
  $('stimmeProbe').onclick = probe;
  // ---------- Aussprache-Wörterbuch ----------
  async function sprichProbe(text) {
    const r = await fetch('/api/sprechen', { method: 'POST', body: JSON.stringify({ text, stimme: BF.stimmeWahl, tempo: 1 }) });
    if (!r.ok) throw new Error((await r.json()).fehler);
    ac = ac || new AudioContext();
    if (ac.state === 'suspended') await ac.resume();
    const buf = await ac.decodeAudioData(await r.arrayBuffer());
    const q = ac.createBufferSource(); q.buffer = buf;
    const g = ac.createGain(); g.gain.value = (BF.lautStimme ?? 0.55) * 1.4;
    q.connect(g); g.connect(ac.destination); q.start();
  }
  function ausspracheZeile(wort = '', so = '') {
    const d = document.createElement('div');
    d.className = 'aussprache-zeile';
    d.innerHTML = `<input class="aussprache-feld a-wort" placeholder="Wort, z. B. Minecraft" value="${esc(wort)}"><span>→</span><input class="aussprache-feld a-so" placeholder="so sprechen, z. B. Meinkrafft" value="${esc(so)}"><button class="a-hoer" title="anhören">▶</button><button class="a-weg" title="löschen">🗑</button>`;
    d.querySelector('.a-hoer').onclick = async () => {
      const so2 = d.querySelector('.a-so').value.trim() || d.querySelector('.a-wort').value.trim();
      if (so2) try { await sprichProbe(so2); } catch (e) { status('Fehler: ' + e.message); }
    };
    d.querySelector('.a-weg').onclick = () => d.remove();
    $('ausspracheListe').appendChild(d);
    return d;
  }
  $('ausspracheKnopf').onclick = async () => {
    $('ausspracheListe').innerHTML = '';
    const j = await api('/api/aussprache').catch(() => ({ liste: {} }));
    const eintraege = Object.entries(j.liste || {});
    for (const [w, so] of eintraege) ausspracheZeile(w, so);
    if (!eintraege.length) ausspracheZeile();
    $('ausspracheGesprochen').textContent = '';
    $('ausspracheDialog').hidden = false;
  };
  $('ausspracheNeu').onclick = () => ausspracheZeile().querySelector('.a-wort').focus();
  const ausspracheSammeln = () => { const l = {}; for (const z of document.querySelectorAll('.aussprache-zeile')) { const w = z.querySelector('.a-wort').value.trim(), so = z.querySelector('.a-so').value.trim(); if (w && so) l[w] = so; } return l; };
  $('ausspracheSatzTest').onclick = async () => {
    try {
      await post('/api/aussprache', { liste: ausspracheSammeln() });
      const j = await post('/api/aussprache/zeigen', { text: $('ausspracheSatz').value });
      $('ausspracheGesprochen').textContent = 'Die Stimme liest: „' + j.text + '“';
      await sprichProbe($('ausspracheSatz').value);
    } catch (e) { status('Fehler: ' + e.message); }
  };
  $('ausspracheSpeichern').onclick = async () => {
    await post('/api/aussprache', { liste: ausspracheSammeln() });
    $('ausspracheDialog').hidden = true;
    // Sprecher neu einlesen, damit die neue Aussprache im Film ist
    BF.sprachDauer = {}; BF.sprachPuffer = {}; BF.sprachLaeuft = {};
    status('Aussprache gespeichert – der Sprecher wird neu eingelesen …');
    if (S.modus === 'text' && !S.ki && kt.value.trim()) klartextUebersetzen(); else kompilieren();
  };
  $('stimmeWahl').addEventListener('mousedown', async () => { try { const n = await api('/api/stimmen'); if (JSON.stringify(n.stimmen) !== JSON.stringify(S.stimmen && S.stimmen.stimmen)) { S.stimmen = n; stimmenMenue(); } } catch {} });
  $('tonAn').onchange = () => { if (S.spielt) { if ($('tonAn').checked) tonStarten(); else tonStoppen(); } };
  const regler = $('zeit');
  regler.addEventListener('input', () => {
    if (!S.F) return;
    S.t = (regler.value / 1000) * S.F.dauer;
    S.zeichnen = true;
    if (S.spielt) { uhrStart = performance.now(); uhrT = S.t; tonStarten(); }
  });
  const posProzent = e => { const r = ausgabe.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 100), Math.round((e.clientY - r.top) / r.height * 100)]; };
  ausgabe.addEventListener('click', e => {
    if (e.ctrlKey || e.metaKey) {
      const [x, y] = posProzent(e);
      if (S.modus === 'text') { textInBeschreiben(` bei ${x} ${y}`); status(`Position ${x} ${y} eingefügt`); return; }
      ta.focus();
      const vor = ta.value.slice(0, ta.selectionStart);
      document.execCommand('insertText', false, (vor && !/\s$/.test(vor) ? ' ' : '') + x + ' ' + y);
      status(`Position ${x} ${y} eingefügt`);
      return;
    }
    spielen(!S.spielt);
  });
  ausgabe.addEventListener('mousemove', e => { const [x, y] = posProzent(e); $('info').dataset.pos = `x ${x} · y ${y}`; status(`Mausposition: ${x} ${y}   (Strg+Klick fügt sie ins Skript ein)`); });

  BF.beiVideoBild = () => { S.zeichnen = true; };
  function videoAbgleich() {
    const c = BF.clipBei(S.F, S.t);
    const aktiv = c ? BF.videoElement(c.clip.datei) : null;
    for (const d of Object.keys(BF.videoInfo)) { const el = BF.videoInfo[d].url && BF.videoElement(d); if (el && el !== aktiv && !el.paused) el.pause(); }
    if (!aktiv) return;
    if (S.spielt && !c.clip.stand && c.clip.tempo > 0) {
      const r = Math.max(0.0625, Math.min(16, c.clip.tempo));
      if (aktiv.playbackRate !== r) aktiv.playbackRate = r;
      if (Math.abs(aktiv.currentTime - c.zeit) > 0.25) aktiv.currentTime = c.zeit;
      if (aktiv.paused) aktiv.play().catch(() => {});
    } else {
      if (!aktiv.paused) aktiv.pause();
      if (!aktiv.seeking && Math.abs(aktiv.currentTime - c.zeit) > 0.02) aktiv.currentTime = c.zeit;
    }
  }
  let letzteZeile = -1;
  function schleife() {
    requestAnimationFrame(schleife);
    if (!S.F || S.export) return;
    if (S.spielt) {
      if (tonLaeuft && ac && ac.state === 'running') S.t = ac.currentTime - tonStart;
      else S.t = uhrT + (performance.now() - uhrStart) / 1000;
      if (S.t >= S.F.dauer) { S.t = S.F.dauer; spielen(false); }
      else if (S.stimmeLaedt && S.t >= (S.bereitBis ?? Infinity) - 0.5 && !S.wartetWeiter) {
        // der Sprecher ist hier noch nicht eingelesen: kurz anhalten, Neues übernehmen, weiter
        S.wartetWeiter = true;
        spielen(false);
        status('⏳ Kurz warten – der Sprecher wird weiter eingelesen …');
        kompilieren();
        (async () => { await spielen(true); S.wartetWeiter = false; })();
      }
      S.zeichnen = true;
      // aktuelle Zeile im Editor markieren
      let jetzt = -1;
      for (const z of S.F.zeilen) if (z.t <= S.t) jetzt = z.zeile;
      if (jetzt !== letzteZeile) { letzteZeile = jetzt; einfaerben(); }
    }
    videoAbgleich();
    if (!S.zeichnen) return;
    S.zeichnen = false;
    const hfZeige = hfBereit && !hfRahmen.hidden && hfRahmen.contentWindow && hfRahmen.contentWindow.__bfZeige;
    if (hfZeige) { try { hfZeige(S.t); } catch (e) { console.error(e); } }
    else try { szene.zeichne(S.t, anzeigeB, anzeigeH); } catch (e) { console.error(e); status('Fehler beim Zeichnen: ' + e.message); }
    regler.value = Math.round((S.t / S.F.dauer) * 1000);
    $('zeitText').textContent = fmt(S.t) + ' / ' + fmt(S.F.dauer);
    $('laden').hidden = true;
  }

  // ---------- Dateien ----------
  async function oeffnePfad(p) {
    const j = await api('/api/lesen?p=' + encodeURIComponent(p));
    setzeText(j.text, j.pfad, j.zeit);
  }
  function setzeText(text, pfad, zeit) {
    ta.value = text;
    S.ki = null;
    const kz = text.split('\n').filter(z => z.startsWith('#| ')).map(z => z.slice(3));
    const kiZeile = text.split('\n').find(z => z.startsWith('#KI '));
    if (kiZeile) { try { S.ki = JSON.parse(kiZeile.slice(4)); } catch { S.ki = { thema: 'KI-Film', alter: '3-5' }; } modus('text'); kiAnsicht(); }
    else if (kz.length) { kt.value = kz.join('\n'); modus('text'); setTimeout(() => berichtZeigen(BF.klartext(kt.value, { standardVideo: standardVideo() }).bericht), 50); }
    else if (!text.trim()) { kt.value = ''; modus('text'); berichtZeigen([]); }
    else modus('skript');
    kiAnsicht();
    S.datei = pfad || null;
    S.zeitDatei = zeit || 0;
    S.geaendert = false;
    S.t = 0;
    titelAkt();
    kompilieren();
    try { if (pfad) localStorage.setItem('bf_datei', pfad); } catch {}
  }
  async function speichern(neu) {
    let p = S.datei;
    if (!p || neu) {
      const vorschlag = (S.F && S.F.titel !== 'Mein Blockfilm' ? S.F.titel : 'mein-film').replace(/[^\wäöüÄÖÜß\- ]/g, '').replace(/\s+/g, '-').toLowerCase();
      const n = prompt('Name für das Skript:', vorschlag);
      if (!n) return;
      p = n;
    }
    if (p.includes('/beispiele/')) { const n = prompt('Beispiele bleiben unverändert. Unter welchem Namen speichern?', p.split('/').pop().replace(/\.txt$/, '')); if (!n) return; p = n; }
    const j = await post('/api/schreiben', { pfad: p, text: ta.value });
    S.datei = j.pfad; S.zeitDatei = j.zeit; S.geaendert = false;
    titelAkt();
    status('Gespeichert: ' + j.pfad);
  }
  $('b-speichern').onclick = () => speichern(false).catch(e => status('Fehler: ' + e.message));
  $('b-neu').onclick = () => {
    if (S.geaendert && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    setzeText(S.modus === 'text' ? '' : VORLAGE, null, 0);
    kt.focus();
  };
  $('b-oeffnen').onclick = async () => {
    const j = await api('/api/liste');
    const zeile = f => `<div data-p="${esc(f.pfad)}">${esc(f.name.replace(/\.txt$/, ''))}<span>${new Date(f.zeit).toLocaleDateString('de-DE')}</span></div>`;
    $('listeEigene').innerHTML = j.eigene.map(zeile).join('') || '<p class="klein">Noch keine gespeicherten Skripte.</p>';
    $('listeBeispiele').innerHTML = j.beispiele.map(zeile).join('');
    $('oeffnen').hidden = false;
  };
  $('oeffnen').addEventListener('click', e => {
    const d = e.target.closest('[data-p]');
    if (!d) return;
    if (S.geaendert && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    $('oeffnen').hidden = true;
    oeffnePfad(d.dataset.p).catch(err => status('Fehler: ' + err.message));
  });
  $('dateiWahl').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    $('oeffnen').hidden = true;
    setzeText(await f.text(), null, 0);
    S.geaendert = true; titelAkt();
  });
  async function medienEinfuegen(f) {
    const istBild = f.type.startsWith('image/');
    status(`„${f.name}“ wird übernommen … (${(f.size / 1048576).toFixed(0)} MB)`);
    const r = await fetch('/api/hochladen?name=' + encodeURIComponent(f.name), { method: 'POST', body: f });
    const j = await r.json();
    if (!r.ok || j.fehler) throw new Error(j.fehler || 'Hochladen fehlgeschlagen');
    await materialLaden();
    if (S.modus === 'text') {
      kt.focus();
      const vor2 = kt.value;
      kt.selectionStart = kt.selectionEnd = kt.value.length;
      document.execCommand('insertText', false, (vor2 && !vor2.endsWith('\n') ? '\n' : '') + (istBild ? `Notiz "Bild ${j.name}" oben rechts.\n` : `Zeig mein Video "${j.name}".\n`));
      status(`„${j.name}“ ist jetzt in deinem Material und in der Beschreibung.`);
      return;
    }
    ta.focus();
    const vor = ta.value.slice(0, ta.selectionStart);
    const zeile = istBild ? `bild "${j.name}" bei 50 50 groesse 30 fuer 3` : `video "${j.name}"`;
    document.execCommand('insertText', false, (vor && !vor.endsWith('\n') ? '\n' : '') + zeile + '\n');
    status(`„${j.name}“ liegt jetzt in ~/Blockfilm/Material und ist im Skript eingefügt.`);
  }
  $('medienWahl').addEventListener('change', e => { const f = e.target.files[0]; if (f) medienEinfuegen(f).catch(err => status('Fehler: ' + err.message)); e.target.value = ''; });
  // Datei ins Fenster ziehen
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', async e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith('video/') || f.type.startsWith('image/') || /\.(mkv|mp4|mov|webm|avi)$/i.test(f.name))) { medienEinfuegen(f).catch(err => status('Fehler: ' + err.message)); return; }
    if (f && /text|^$/.test(f.type)) { setzeText(await f.text(), null, 0); S.geaendert = true; titelAkt(); status('Skript „' + f.name + '“ geladen – mit Speichern sichern.'); }
  });
  // Datei beobachten: wenn sie außen geändert wird (z. B. von einem anderen Editor), neu laden
  setInterval(async () => {
    if (!S.datei || S.export) return;
    try {
      const j = await api('/api/zeit?p=' + encodeURIComponent(S.datei));
      if (j.zeit && j.zeit > S.zeitDatei + 1) {
        if (!S.geaendert) { const t = S.t; await oeffnePfad(S.datei); S.t = Math.min(t, S.F.dauer); status('Skript wurde außen geändert – neu geladen.'); }
        else { $('bannerText').textContent = 'Das Skript wurde außerhalb geändert.'; $('banner').hidden = false; S.zeitDatei = j.zeit; }
      }
    } catch {}
  }, 1000);
  $('bannerJa').onclick = () => { $('banner').hidden = true; oeffnePfad(S.datei); };
  $('bannerNein').onclick = () => { $('banner').hidden = true; };

  // ---------- Hilfe ----------
  function markdown(md) {
    const out = [];
    let imCode = false, code = [], tabelle = [];
    const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const tabelleAus = () => {
      if (!tabelle.length) return;
      const reihen = tabelle.filter(r => !/^\|\s*-/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      out.push('<table>' + reihen.map((r, i) => '<tr>' + r.map(c => i === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</table>');
      tabelle = [];
    };
    for (const z of md.split('\n')) {
      if (z.startsWith('```')) {
        if (imCode) { out.push(`<pre><button class="einfuegen">einfügen</button><code>${esc(code.join('\n'))}</code></pre>`); code = []; }
        imCode = !imCode; continue;
      }
      if (imCode) { code.push(z); continue; }
      if (z.startsWith('|')) { tabelle.push(z); continue; }
      tabelleAus();
      if (z.startsWith('### ')) out.push(`<h3>${inline(z.slice(4))}</h3>`);
      else if (z.startsWith('## ')) out.push(`<h2>${inline(z.slice(3))}</h2>`);
      else if (z.startsWith('# ')) out.push(`<h1>${inline(z.slice(2))}</h1>`);
      else if (z.startsWith('- ')) out.push(`<li>${inline(z.slice(2))}</li>`);
      else if (z.trim()) out.push(`<p>${inline(z)}</p>`);
    }
    tabelleAus();
    // Abschnitte bilden (für die Suche)
    let html = '', offen = false;
    for (const o of out) {
      if (o.startsWith('<h2') || o.startsWith('<h3')) { if (offen) html += '</div>'; html += '<div class="abschnitt">'; offen = true; }
      html += o;
    }
    if (offen) html += '</div>';
    return html;
  }
  let hilfeGeladen = false;
  async function hilfe() {
    $('hilfe').hidden = false;
    if (!hilfeGeladen) {
      const md = await (await fetch('/BEFEHLE.md')).text();
      $('hilfeText').innerHTML = markdown(md);
      hilfeGeladen = true;
    }
    $('hilfeSuche').focus();
  }
  $('b-hilfe').onclick = hilfe;
  $('hilfeSuche').addEventListener('input', () => {
    const q = BF.norm($('hilfeSuche').value.trim());
    for (const a of document.querySelectorAll('.abschnitt')) a.classList.toggle('versteckt', !!q && !BF.norm(a.textContent).includes(q));
  });
  $('hilfeText').addEventListener('click', e => {
    if (!e.target.classList.contains('einfuegen')) return;
    const code = e.target.nextElementSibling.textContent;
    $('hilfe').hidden = true;
    ta.focus();
    const vor = ta.value.slice(0, ta.selectionStart);
    document.execCommand('insertText', false, (vor && !vor.endsWith('\n') ? '\n' : '') + code + '\n');
  });

  for (const b of document.querySelectorAll('[data-zu]')) b.onclick = () => { if (b.dataset.zu === 'export' && S.export) return; $(b.dataset.zu).hidden = true; };
  // Leertaste nur dann für Abspielen/Pause, wenn man gerade nicht in ein Feld schreibt
  const imSchreibfeld = () => { const el = document.activeElement; return !!el && (/^(TEXTAREA|INPUT|SELECT)$/.test(el.tagName) || el.isContentEditable); };
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); speichern(e.shiftKey).catch(err => status('Fehler: ' + err.message)); }
    else if (e.ctrlKey && e.key === 'o') { e.preventDefault(); $('b-oeffnen').click(); }
    else if (e.key === 'F1') { e.preventDefault(); hilfe(); }
    else if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); spielen(!S.spielt); }
    else if (e.key === 'Escape') { for (const id of ['hilfe', 'oeffnen']) $(id).hidden = true; if (!S.export) $('export').hidden = true; }
    else if (e.key === ' ' && !e.ctrlKey && !e.altKey && !imSchreibfeld()) { e.preventDefault(); spielen(!S.spielt); }
    else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.altKey && !imSchreibfeld()) { e.preventDefault(); vollbild(); }
  });

  // ---------- Film-Leiste: alle fertigen Filme und gespeicherten KI-Filme zum Auswählen ----------
  const FILM_ICON = { technik: '📱', viren: '🦠', koerper: '🫀', klima: '🌍', himmelblau: '🌤️', geister: '👻', herbst: '🍂', schwarzesloch: '⚫', tagundnacht: '🌗', umlaufbahn: '🌙', mathe: '➗', dinos: '🦖', erdestopp: '🌀' };
  const KURZNAME = { technik: 'Handys & Computer', viren: 'Viren', koerper: 'Körper', klima: 'Klima', himmelblau: 'Himmel blau', geister: 'Durch Wände?', herbst: 'Herbstblätter', schwarzesloch: 'Schwarzes Loch', tagundnacht: 'Tag & Nacht', umlaufbahn: 'Mond', mathe: 'Mathe', dinos: 'Dinosaurier', erdestopp: 'Erde bleibt stehen?' };
  let filmListeKI = [], filmListeVideos = [];
  async function filmleisteLaden() {
    try { filmListeKI = (await api('/api/filmliste')).ki || []; } catch { filmListeKI = []; }
    try { filmListeVideos = ((await api('/api/exporte')).fertig || []).filter(v => !v.kaputt); } catch { filmListeVideos = []; }
    filmleisteZeigen();
  }
  function videoAbspielen(datei, name) {
    if (S.spielt) spielen(false);
    $('spielerTitel').textContent = '▶ ' + name;
    $('spielerVideo').src = '/api/roh?p=' + encodeURIComponent(datei);
    $('spielerOrdner').onclick = () => post('/api/oeffnen', { pfad: datei.replace(/\/[^/]*$/, '') });
    $('spieler').hidden = false;
    $('spielerVideo').play().catch(() => {});
  }
  function filmleisteZeigen() {
    const aktTitel = S.ki ? S.ki.thema : (kt.value || '').trim();
    const fertig = Object.entries(BF.THEMEN || {}).map(([k, th]) => `<button data-thema="${k}" title="${esc(th.name)}" class="${!S.ki && aktTitel === th.name ? 'aktiv' : ''}">${FILM_ICON[k] || '🎬'} ${esc(KURZNAME[k] || th.name)}</button>`).join('');
    const ki = filmListeKI.map(f => `<button class="ki${S.datei === f.pfad ? ' aktiv' : ''}" data-pfad="${esc(f.pfad)}" title="KI-Film: ${esc(f.thema)}${f.alter ? ' (' + esc(f.alter) + ' Jahre)' : ''} – gespeichert ${new Date(f.zeit).toLocaleString('de-DE')}">🤖 ${esc(f.thema.length > 38 ? f.thema.slice(0, 36) + '…' : f.thema)}<span class="fl-weg" data-weg="${esc(f.pfad)}" title="Diesen KI-Film löschen">✕</span></button>`).join('');
    const videos = filmListeVideos.map(v => `<button class="video" data-video="${esc(v.datei)}" data-name="${esc(v.name)}" title="Fertiges Video: ${esc(v.name)} – ${new Date(v.zeit).toLocaleString('de-DE')} (${(v.groesse / 1048576).toFixed(0)} MB). Klick spielt es ab.">${v.bild ? `<img class="fl-bild" src="/api/roh?p=${encodeURIComponent(v.bild)}&z=${Math.round(v.zeit)}" alt="">` : ''}▶ ${esc(v.name.length > 38 ? v.name.slice(0, 36) + '…' : v.name)}</button>`).join('');
    $('flListe').innerHTML = (videos ? videos + '<span class="fl-trenner"></span>' : '') + (ki ? ki + '<span class="fl-trenner"></span>' : '') + fertig;
  }
  $('flListe').addEventListener('click', async e => {
    const weg = e.target.closest('[data-weg]');
    if (weg) {
      e.stopPropagation();
      if (!confirm('Diesen KI-Film löschen? Er wird aus der Leiste und von der Festplatte entfernt.')) return;
      await post('/api/filme/loeschen', { pfad: weg.dataset.weg });
      if (S.datei === weg.dataset.weg) S.datei = null;
      return filmleisteLaden();
    }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.video) return videoAbspielen(b.dataset.video, b.dataset.name);
    if (S.export) return status('Während ein Video gespeichert wird, kann kein anderer Film geladen werden.');
    if (S.geaendert && S.modus === 'skript' && !confirm('Dein Skript ist noch nicht gespeichert. Trotzdem einen anderen Film laden?')) return;
    if (b.dataset.pfad) { await oeffnePfad(b.dataset.pfad); status('🎞️ KI-Film geladen. Drück ▶ zum Anschauen.'); }
    else if (b.dataset.thema) {
      const th = BF.THEMEN[b.dataset.thema];
      S.ki = null; S.datei = null; kiAnsicht(); modus('text');
      kt.value = th.name; S.t = 0;
      klartextUebersetzen();
      status(`🎞️ „${th.name}“ geladen (${BF.ALTER_NAME[$('kiAlter').value] || ''}). Drück ▶ zum Anschauen.`);
    }
    filmleisteZeigen();
  });
  // Mausrad scrollt die Leiste seitwärts
  $('flListe').addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { $('flListe').scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  setTimeout(filmleisteLaden, 800);
  // neu fertig gewordene Videos (Hintergrund- und Nacht-Exporte) erscheinen von selbst
  setInterval(() => { if (!document.hidden) filmleisteLaden(); }, 30000);

  // ---------- Film-Übersicht: alle Filme ansehen, fertige Videos abspielen, im Hintergrund exportieren ----------
  let galDaten = { ki: [], eigene: [], videos: [], stapel: { warten: [], laeuft: null, fertig: [] } };
  const themaName = (k, alter) => `${BF.THEMEN[k].name} (${alter})`;
  function themaText(k, alter) {
    const th = BF.THEMEN[k];
    const r = BF.klartext(th.name, { standardVideo: standardVideo(), alter });
    return '#| ' + th.name + '\n' + r.skript + '\nzielgruppe ' + alter + '\n';
  }
  async function galerieLaden() {
    try { const f = await api('/api/filmliste'); galDaten.ki = f.ki || []; galDaten.eigene = f.eigene || []; } catch {}
    try { galDaten.videos = (await api('/api/exporte')).fertig || []; } catch {}
    try { galDaten.stapel = await api('/api/stapel'); } catch {}
    galerieZeigen();
  }
  function galerieZeigen() {
    const st = galDaten.stapel, alter = $('kiAlter').value;
    const zustand = (datei, name) => {
      if (st.laeuft && (st.laeuft.datei === datei || st.laeuft.name === name)) return '<span class="gal-info">⏳ wird gerade exportiert</span>';
      const i = st.warten.findIndex(w => w.datei === datei || w.name === name);
      return i >= 0 ? `<span class="gal-info">🕒 wartet (Platz ${i + 1})</span>` : '';
    };
    const karte = (titel, info, knoepfe, z) => `<div class="gal-film${z.includes('⏳') ? ' laeuft' : ''}"><div class="gal-name">${titel}</div><div class="gal-info">${info}</div>${z}<div class="gal-knoepfe">${knoepfe}</div></div>`;
    const leer = t => `<div class="gal-leer">${t}</div>`;
    $('galVideos').innerHTML = galDaten.videos.length ? galDaten.videos.map(v => karte((v.bild ? `<img class="gal-bild" src="/api/roh?p=${encodeURIComponent(v.bild)}&z=${Math.round(v.zeit)}" alt="" data-video="${esc(v.datei)}" data-name="${esc(v.name)}">` : '') + esc(v.name), `${zeitText(v.zeit)} Uhr · ${(v.groesse / 1048576).toFixed(0)} MB`,
      v.kaputt ? '<span class="gal-info">⚠ unvollständig</span>' : `<button data-video="${esc(v.datei)}" data-name="${esc(v.name)}">▶ Abspielen</button><button data-ordner="${esc(v.datei)}" title="Im Ordner zeigen">📂</button>`, '')).join('') : leer('Noch keine fertigen Videos.');
    $('galKI').innerHTML = galDaten.ki.length ? galDaten.ki.map(f => karte('🤖 ' + esc(f.thema), `${f.alter ? esc(f.alter) + ' Jahre · ' : ''}${zeitText(f.zeit)} Uhr`,
      `<button data-ansehen="${esc(f.pfad)}">▶ Ansehen</button><button data-export="${esc(f.pfad)}" data-name="${esc(f.thema)}">💾 Exportieren</button>`, zustand(f.pfad, f.thema))).join('') : leer('Noch keine KI-Filme. Schreib oben ein Thema und drück „🤖 KI-Film“.');
    $('galThemen').innerHTML = Object.entries(BF.THEMEN || {}).map(([k, th]) => karte(`${FILM_ICON[k] || '🎬'} ${esc(th.name)}`, `für ${esc(BF.ALTER_NAME[alter] || alter)}`,
      `<button data-thema="${k}">▶ Ansehen</button><button data-themaexport="${k}">💾 Exportieren</button>`, zustand(null, themaName(k, alter)))).join('');
    $('galEigene').innerHTML = galDaten.eigene.length ? galDaten.eigene.map(f => karte('✍ ' + esc(f.name.replace(/\.(txt|blockfilm|bf)$/i, '')), `${zeitText(f.zeit)} Uhr`,
      `<button data-ansehen="${esc(f.pfad)}">▶ Ansehen</button><button data-export="${esc(f.pfad)}" data-name="${esc(f.name.replace(/\.(txt|blockfilm|bf)$/i, ''))}">💾 Exportieren</button>`, zustand(f.pfad, f.name))).join('') : leer('Noch keine eigenen Skripte gespeichert.');
    const teile = [];
    if (st.laeuft) teile.push(`⏳ Exportiert gerade: <b>${esc(st.laeuft.name)}</b>`);
    if (st.warten.length) teile.push(`🕒 ${st.warten.length} ${st.warten.length === 1 ? 'Film wartet' : 'Filme warten'} <button class="klein-knopf" data-leeren="1">Warteschlange leeren</button>`);
    if (st.laeuft || st.warten.length) teile.push('<span class="gal-info">Fortschritt unter „📋 Exporte“. Du kannst währenddessen weiterarbeiten.</span>');
    $('galStapel').innerHTML = teile.join(' · ');
  }
  async function hintergrundExport(filme) {
    const r = await post('/api/stapel', { filme, aufl: $('gal-aufl').value, stimme: BF.stimmeWahl || null, tempo: BF.sprechTempoWahl || null, alter: $('kiAlter').value });
    galDaten.stapel = r; galerieZeigen(); exporteAktualisieren();
    status(r.neu ? `💾 ${r.neu} ${r.neu === 1 ? 'Film wird' : 'Filme werden'} im Hintergrund exportiert (nacheinander).` : 'Diese Filme sind schon in der Warteschlange.');
  }
  async function filmAnsehen(lade) {
    if (S.export) return status('Während ein Video gespeichert wird, kann kein anderer Film geladen werden.');
    if (S.geaendert && S.modus === 'skript' && !confirm('Dein Skript ist noch nicht gespeichert. Trotzdem einen anderen Film laden?')) return;
    $('galerie').hidden = true;
    await lade();
    filmleisteZeigen();
    S.t = 0;
    spielen(true);
  }
  $('b-galerie').onclick = () => { $('galerie').hidden = false; galerieLaden(); };
  $('gal-aufl').addEventListener('change', () => { try { localStorage.setItem('bf_galAufl', $('gal-aufl').value); } catch {} });
  try { const v = localStorage.getItem('bf_galAufl'); if (v) $('gal-aufl').value = v; } catch {}
  $('galerie').addEventListener('click', async e => {
    const b = e.target.closest('button, img[data-video]'); if (!b) return;
    const d = b.dataset, alter = $('kiAlter').value;
    if (d.video) videoAbspielen(d.video, d.name);
    else if (d.ordner) post('/api/oeffnen', { pfad: d.ordner.replace(/\/[^/]*$/, '') });
    else if (d.ansehen) filmAnsehen(async () => { await oeffnePfad(d.ansehen); });
    else if (d.thema) filmAnsehen(async () => { const th = BF.THEMEN[d.thema]; S.ki = null; S.datei = null; kiAnsicht(); modus('text'); kt.value = th.name; klartextUebersetzen(); });
    else if (d.export) hintergrundExport([{ pfad: d.export, name: d.name }]);
    else if (d.themaexport) hintergrundExport([{ text: themaText(d.themaexport, alter), name: themaName(d.themaexport, alter) }]);
    else if (d.alle === 'ki') hintergrundExport(galDaten.ki.map(f => ({ pfad: f.pfad, name: f.thema })));
    else if (d.alle === 'eigene') hintergrundExport(galDaten.eigene.map(f => ({ pfad: f.pfad, name: f.name.replace(/\.(txt|blockfilm|bf)$/i, '') })));
    else if (d.alle === 'themen') hintergrundExport(Object.keys(BF.THEMEN).map(k => ({ text: themaText(k, alter), name: themaName(k, alter) })));
    else if (d.leeren) { if (confirm('Alle wartenden Exporte entfernen? Der laufende Export läuft weiter.')) { galDaten.stapel = await post('/api/stapel/leeren', {}); galerieZeigen(); } }
  });
  // Video anhalten, wenn der Spieler geschlossen wird
  $('spieler').addEventListener('click', e => { if (e.target.id === 'spieler' || e.target.closest('[data-zu]')) { $('spielerVideo').pause(); } });
  setInterval(async () => { if ($('galerie').hidden) return; try { galDaten.stapel = await api('/api/stapel'); galerieZeigen(); } catch {} }, 3000);

  // ---------- Übersicht aller Exporte (auch Hintergrund und Nacht-Export) ----------
  const WTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const zeitText = ms => { const d = new Date(ms); return `${WTAGE[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  async function exporteAktualisieren() {
    let d;
    try { d = await api('/api/exporte'); } catch { return; }
    const n = d.laufend.length;
    $('exporteZahl').hidden = !n; $('exporteZahl').textContent = n;
    if ($('exporte').hidden) return;
    // läuft gerade
    $('exLaufend').innerHTML = n ? d.laufend.map(e => `<div class="ex-zeile">
        <span class="ex-name">${esc(e.name)}</span>
        <div class="balken"><div style="width:${e.anteil != null ? (e.anteil * 100).toFixed(1) : 0}%"></div></div>
        <span class="ex-info">${e.anteil != null ? Math.round(e.anteil * 100) + ' % · ' : ''}${e.rest ? 'noch etwa ' + esc(e.rest) : esc(e.text || 'startet …')}</span>
        ${e.pid ? `<button data-stopp="${e.pid}" title="Diesen Export abbrechen">⏹ Stopp</button>` : '<button data-zeige="1">Anzeigen</button>'}
      </div>`).join('') : '<div class="ex-leer">Gerade wird nichts gespeichert.</div>';
    // Nacht-Export
    const N = d.nacht;
    let t = '';
    const m = N.geplant && /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(N.geplant);
    if (N.aktiv) t += '<div class="ex-leer">Der Nacht-Export läuft gerade.</div>';
    else if (m) t += `<div class="ex-leer">Startet ${zeitText(new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime())} Uhr. Er wartet, bis andere Exporte fertig sind, und speichert dann alle Filme, die noch fehlen.</div>`;
    else t += '<div class="ex-leer">Kein Nacht-Export geplant.</div>';
    if (N.warteschlange.length) t += '<div class="ex-liste">' + N.warteschlange.map(w => `<span class="${w.fertig ? 'fertig' : w.laeuft ? 'laeuft' : ''}">${w.fertig ? '✓' : w.laeuft ? '⏳' : '•'} ${esc(w.name)}</span>`).join('') + '</div>';
    if (N.aktiv || m) t += '<button data-nachtstopp="1" title="Den geplanten bzw. laufenden Nacht-Export ganz abbrechen">Nacht-Export abbrechen</button>';
    $('exNacht').innerHTML = t;
    // fertige Videos
    $('exFertig').innerHTML = d.fertig.length ? d.fertig.map(f => `<div class="ex-zeile">
        <span class="ex-name">${esc(f.name)}</span>
        <span class="ex-info">${zeitText(f.zeit)} Uhr · ${(f.groesse / 1048576).toFixed(0)} MB</span>
        ${f.kaputt ? '<span class="ex-info" title="Dieser Export wurde abgebrochen. Die Datei lässt sich nicht abspielen und kann gelöscht werden.">⚠ unvollständig</span>' : `<button data-spielen="${esc(f.datei)}">▶ Abspielen</button>`}
      </div>`).join('') : '<div class="ex-leer">Noch keine fertigen Videos.</div>';
  }
  $('b-exporte').onclick = () => { $('exporte').hidden = false; exporteAktualisieren(); };
  $('ex-ordner2').onclick = async () => { try { post('/api/oeffnen', { pfad: (await api('/api/info')).videos }); } catch {} };
  $('exporte').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.spielen) post('/api/oeffnen', { pfad: b.dataset.spielen });
    else if (b.dataset.zeige) { $('exporte').hidden = true; $('export').hidden = false; }
    else if (b.dataset.stopp) { if (confirm('Diesen Export wirklich abbrechen? Das bisher Gespeicherte geht verloren.')) { await post('/api/exporte/stopp', { pid: +b.dataset.stopp }); exporteAktualisieren(); } }
    else if (b.dataset.nachtstopp) { if (confirm('Den Nacht-Export ganz abbrechen? Fertige Videos bleiben erhalten.')) { await post('/api/exporte/stopp', { nacht: true }); exporteAktualisieren(); } }
  });
  setInterval(() => { if (!$('exporte').hidden || Date.now() % 15000 < 3000) exporteAktualisieren(); }, 3000);
  setTimeout(exporteAktualisieren, 1500);

  // ---------- Video-Export ----------
  $('b-video').onclick = () => {
    if (!S.F) return;
    if (S.export) { $('export').hidden = false; return; } // läuft schon: nicht ein zweites Mal starten
    spielen(false);
    $('exportStart').hidden = false; $('exportLauf').hidden = true; $('exportFertig').hidden = true;
    $('export').hidden = false;
  };
  $('ex-los').onclick = () => {
    const a = $('ex-aufl').value, f = $('ex-fps').value;
    exportieren({
      breite: a === 'skript' ? null : +a.split('x')[0], hoehe: a === 'skript' ? null : +a.split('x')[1],
      fps: f === 'skript' ? null : +f, ton: $('ex-ton').checked,
    }).catch(e => { S.export = false; $('ex-text').textContent = 'Fehler: ' + e.message; groesseAnpassen(); });
  };
  $('ex-stopp').onclick = () => { S.abbruch = true; };

  // Nach Ruhezustand oder kurzer Störung nicht abbrechen, sondern ein paar Mal neu versuchen
  async function nochmalVersuchen(f, mal = 40) {
    for (let i = 0; ; i++) {
      try { return await f(); }
      catch (e) { if (i >= mal || S.abbruch) throw e; status('⏳ Export kurz unterbrochen (z. B. Ruhezustand) – versuche es weiter …'); await new Promise(r => setTimeout(r, 3000)); }
    }
  }
  async function exportieren(o, imHintergrund) {
    if (S.vorb) { $('ex-text').textContent = 'Bereite Videos und Stimme vor …'; let v; do { v = S.vorb; await v; } while (v !== S.vorb); }
    const F = S.F;
    for (const d of Object.keys(BF.videoInfo)) { const el = BF.videoInfo[d].url && BF.videoElement(d); if (el) el.pause(); }
    const w = o.breite || F.breite, h = o.hoehe || F.hoehe, fps = o.fps || F.fps;
    const n = Math.max(1, Math.ceil(F.dauer * fps));
    const zeige = (anteil, text) => {
      $('ex-balken').style.width = (anteil * 100).toFixed(1) + '%';
      $('ex-text').textContent = text;
      if (imHintergrund) post('/api/fortschritt', { text }).catch(() => {});
    };
    S.export = true; S.abbruch = false;
    tonStoppen();
    $('exportStart').hidden = true; $('exportLauf').hidden = false; $('exportFertig').hidden = true;
    ausgabe.style.width = ''; ausgabe.style.height = '';
    let mitTon = o.ton;
    if (mitTon) {
      zeige(0, 'Ton wird berechnet …');
      const buf = await BF.renderTon(F);
      await post('/api/video/ton', BF.wav(buf));
    }
    if (BF.hf && BF.hf.passt(F) && !o.alteEngine) return exportierenHF(o, F, w, h, fps, mitTon, zeige);
    zeige(0, 'Starte …');
    await szene.bereit();
    const start = await post('/api/video/start', { breite: w, hoehe: h, fps, name: F.titel, ton: mitTon, aus: o.aus || null });
    const t0 = performance.now();
    let unterwegs = Promise.resolve();
    const alsBild = () => new Promise(ok => ausgabe.toBlob(ok, 'image/jpeg', 0.94));
    for (let i = 0; i < n; i++) {
      if (S.abbruch) { await unterwegs; await post('/api/video/abbrechen', {}); S.export = false; zeige(0, 'Abgebrochen.'); $('exportStart').hidden = false; $('exportLauf').hidden = true; groesseAnpassen(); return { ok: false, fehler: 'abgebrochen' }; }
      const c = BF.clipBei(F, i / fps);
      if (c) await BF.videoSuchen(BF.videoElement(c.clip.datei), c.zeit, true);
      szene.zeichne(i / fps, w, h);
      // Bild einpacken lassen und gleich das nächste zeichnen (toBlob nimmt sofort eine Kopie)
      const bild = alsBild();
      const vorher = unterwegs;
      unterwegs = (async () => { const blob = await bild; await vorher; await nochmalVersuchen(() => post('/api/video/bild', blob)); })();
      if (i % 2 === 1) await vorher;
      if (i % 2 === 0 || i === n - 1) {
        const verg = (performance.now() - t0) / 1000;
        const rest = verg / (i + 1) * (n - i - 1);
        zeige((i + 1) / n, `Bild ${i + 1} von ${n} (${w}×${h}, ${fps} fps) · noch etwa ${rest > 90 ? Math.round(rest / 60) + ' min' : Math.round(rest) + ' s'}`);
      }
    }
    await unterwegs;
    zeige(1, 'Video wird fertig verpackt …');
    const erg = await nochmalVersuchen(() => post('/api/video/ende', {}));
    S.export = false;
    groesseAnpassen();
    if (!erg.ok) throw new Error(erg.fehler);
    $('exportLauf').hidden = true; $('exportFertig').hidden = false;
    $('ex-ergebnis').textContent = `${erg.datei} (${(erg.groesse / 1048576).toFixed(1)} MB)`;
    $('ex-ordnerAuf').onclick = () => post('/api/oeffnen', { pfad: erg.datei.replace(/\/[^/]*$/, '') });
    $('ex-abspielen').onclick = () => post('/api/oeffnen', { pfad: erg.datei });
    status('Video gespeichert: ' + erg.datei);
    void start;
    return erg;
  }

  // Vorschaubild (Thumbnail): dieselbe Komposition als Vorschau, der Server macht daraus ein Standbild mit Titel
  const vorschauHtml = F => BF.hf.komponiere(F, { skript: S.quelle, sprachDauer: S.sprachStand, alter: BF.hf.standardAlter, breite: 1280, hoehe: Math.round(1280 * (F.hoehe || 1080) / (F.breite || 1920)), vorschau: true, ton: null, basis: '/' });
  async function nurVorschaubild(aus) {
    if (S.vorb) { let v; do { v = S.vorb; await v; } while (v !== S.vorb); }
    if (!(BF.hf && BF.hf.passt(S.F))) return { ok: false, fehler: 'Film nutzt die 3D-Welt, dafür gibt es kein Vorschaubild aus der Komposition' };
    return post('/api/vorschaubild', { html: vorschauHtml(S.F), aus });
  }

  // Export über HyperFrames: Komposition bauen, Server rendert mit @hyperframes/producer
  async function exportierenHF(o, F, w, h, fps, mitTon, zeige) {
    zeige(0, 'Baue Komposition (neuer Bildstil) …');
    const html = BF.hf.komponiere(F, { skript: S.quelle, sprachDauer: S.sprachStand, alter: BF.hf.standardAlter, breite: w, hoehe: h, ton: mitTon ? 'ton.wav' : null });
    const start = await post('/api/hf/start', { html, bildHtml: vorschauHtml(F), fps, name: F.titel, ton: mitTon, aus: o.aus || null });
    if (!start.ok) { S.export = false; groesseAnpassen(); throw new Error(start.fehler); }
    let st;
    for (;;) {
      await new Promise(r => setTimeout(r, 700));
      if (S.abbruch) await post('/api/hf/abbrechen', {});
      try { st = await api('/api/hf/status'); } catch { continue; }
      if (st.fertig) break;
      zeige(st.anteil || 0, st.text + ` (${w}×${h}, ${fps} fps)`);
    }
    S.export = false;
    groesseAnpassen();
    if (!st.ok && st.fehler === 'abgebrochen') { zeige(0, 'Abgebrochen.'); $('exportStart').hidden = false; $('exportLauf').hidden = true; return { ok: false, fehler: 'abgebrochen' }; }
    if (!st.ok) throw new Error(st.fehler);
    zeige(1, 'Fertig');
    $('exportLauf').hidden = true; $('exportFertig').hidden = false;
    $('ex-ergebnis').textContent = `${st.datei} (${(st.groesse / 1048576).toFixed(1)} MB)`;
    $('ex-ordnerAuf').onclick = () => post('/api/oeffnen', { pfad: st.datei.replace(/\/[^/]*$/, '') });
    $('ex-abspielen').onclick = () => post('/api/oeffnen', { pfad: st.datei });
    status('Video gespeichert: ' + st.datei);
    return { ok: true, datei: st.datei, groesse: st.groesse };
  }

  // ---------- Start ----------
  const VORLAGE = `# Mein erster Blockfilm
film 1080p fps 30 titel "Mein Film"
welt huegel
himmel tag
musik froehlich

figur steve bei -4 0
figur alex art mensch hemd gruen haare blond schmal bei 4 0 blick -90

kamera totale
steve winkt
steve sagt "Hey Alex! Schau mal, was ich gebaut habe!"
alex dreht sich zu steve
alex sagt "Oh, was denn?"
kamera faehrt zu 0 4 9 schaut auf 0 1 -4 in 2
tnt 0 0 -4 zuender 2.5
& steve zeigt auf 0 0 -4
alex erschrickt
alex sagt "Wow!!"
& steve jubelt
`;

  const START_TEXT = () => {
    const v = standardVideo();
    const zeilen = ['Erkläre, warum ein schwarzes Loch schwarz ist.'];
    const r = BF.klartext(zeilen.join('\n'), { standardVideo: v });
    return zeilen.map(z => '#| ' + z).join('\n') + '\n' + r.skript + '\n';
  };
  (async () => {
    $('ex-ordner').textContent = '~/Videos/Blockfilm';
    let info = {};
    try { info = await api('/api/info'); } catch {}
    if (info.einstellungen && info.einstellungen.standardSkin) BF.standardSkin = info.einstellungen.standardSkin;
    await materialLaden();
    try { S.stimmen = await api('/api/stimmen'); } catch { S.stimmen = { piper: false, stimmen: [] }; }
    stimmenMenue();
    if (info.render) { // Hintergrund-Export: Einstellungen aus der App übernehmen
      if (info.renderStimme) BF.stimmeWahl = info.renderStimme;
      if (info.renderTempo && BF.SPRECHTEMPO[info.renderTempo]) BF.sprechTempoWahl = info.renderTempo;
      if (info.renderAlter && BF.hf.STILE[info.renderAlter]) $('kiAlter').value = info.renderAlter;
    }
    if (info.videos) $('ex-ordner').textContent = info.videos;
    const q = new URLSearchParams(location.search);
    if (info.text !== null && info.text !== undefined && info.datei) setzeText(info.text, info.datei, 0);
    else if (q.get('p')) await oeffnePfad(q.get('p')).catch(() => setzeText(VORLAGE, null, 0));
    else {
      let entwurf = null, datei = null;
      try { entwurf = localStorage.getItem('bf_entwurf2'); datei = localStorage.getItem('bf_datei'); } catch {}
      if (entwurf && !/^#(\| |KI )/m.test(entwurf)) entwurf = null; // alte Profi-Entwürfe nicht automatisch öffnen
      if (datei) await oeffnePfad(datei).catch(() => setzeText(entwurf || VORLAGE, null, 0));
      else setzeText(entwurf || START_TEXT(), null, 0);
      if (entwurf && datei && entwurf !== ta.value) { /* Entwurf gehört zu einer anderen Datei */ }
    }
    if (S.datei) { try { const j = await api('/api/zeit?p=' + encodeURIComponent(S.datei)); S.zeitDatei = j.zeit; } catch {} }
    groesseAnpassen();
    requestAnimationFrame(schleife);
    window.BF_UI = { S, szene, exportieren, kompilieren };
    // gespeicherten KI-Schlüssel beim Start erkennen (dann fragt die App nicht jedes Mal danach)
    kiPruefen().then(() => { if (!S.kiBereit) kiStatus('Tipp: Mit ⚙ richtest du die KI ein. Dann schreibt „🤖 KI-Film“ ganze Filme zu jedem Thema.'); });
    if (q.get('tagesvideo')) {
      // Tagesvideo: Thema holen, KI-Film schreiben (wie mit dem Knopf), in 4K speichern, dann lädt der Server ihn hoch
      let auftrag = null;
      const fertig = o => post('/api/tagesvideo/fertig', Object.assign({ thema: auftrag && auftrag.thema, alter: auftrag && auftrag.alter }, o));
      try {
        auftrag = await api('/api/tagesvideo/auftrag');
        if (!auftrag.ok) throw new Error(auftrag.fehler);
        S.tagesModus = true; S.ki = null; kiAnsicht();
        $('kiAlter').value = auftrag.alter; $('kiStil').value = 'echt'; $('kiRegie').checked = true;
        $('kiThema').value = auftrag.thema;
        await kiFilm();
        if (!S.kiErgebnis || !S.kiErgebnis.ok) throw new Error((S.kiErgebnis && S.kiErgebnis.fehler) || 'Die KI konnte keinen Film schreiben.');
        const ueberT = { '1080p': [1920, 1080], '720p': [1280, 720] }[info.aufl] || [3840, 2160]; // Standard 4K, zum Testen --720p
        const erg = await exportieren({ breite: ueberT[0], hoehe: ueberT[1], ton: true, aus: auftrag.aus }, true);
        if (!erg.ok) throw new Error(erg.fehler || 'Export ging nicht');
        await fertig({ ok: true, video: erg.datei, skript: S.datei });
      } catch (e) {
        await fertig({ ok: false, fehler: e.message, skript: S.datei || null });
      }
    } else if (q.get('render')) {
      // Kommandozeilen-Modus: Video ohne Fenster bauen
      const ueber = { '4k': [3840, 2160], '1080p': [1920, 1080], '720p': [1280, 720] }[info.aufl] || [null, null];
      try {
        const erg = info.nurBild ? await nurVorschaubild(info.aus) : await exportieren({ breite: ueber[0], hoehe: ueber[1], ton: true, aus: info.aus }, true);
        await post('/api/fertig', { ok: erg.ok, datei: erg.datei, fehler: erg.fehler, fehlerListe: S.F.fehler });
      } catch (e) {
        await post('/api/fertig', { ok: false, fehler: e.message, fehlerListe: S.F ? S.F.fehler : [] });
      }
    }
  })();
})();
