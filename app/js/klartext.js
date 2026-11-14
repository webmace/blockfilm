// Blockfilm – Klartext: normale deutsche Sätze werden in Film-Befehle übersetzt.
// Beispiel: „Zeig mein Video von Sekunde 5 bis 12. Mach einen roten Kreis in der Mitte. Der Sprecher sagt: Das ist Sand.“
(function () {
  const BF = (window.BF = window.BF || {});
  const norm = s => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const q = s => String(s).replace(/"/g, "''").trim();

  const FARBEN = { rot: 'rot', roten: 'rot', rote: 'rot', rotes: 'rot', blau: 'blau', blauen: 'blau', blaue: 'blau', gelb: 'gelb', gelben: 'gelb', gelbe: 'gelb', gruen: 'gruen', gruenen: 'gruen', gruene: 'gruen', weiss: 'weiss', weissen: 'weiss', weisse: 'weiss', schwarz: 'schwarz', schwarzen: 'schwarz', orange: 'orange', orangen: 'orange', lila: 'lila', rosa: 'rosa', pink: 'rosa', tuerkis: 'tuerkis' };
  const ORTE = [
    [/oben\s*links|links\s*oben/, [22, 22]], [/oben\s*rechts|rechts\s*oben/, [78, 22]], [/unten\s*links|links\s*unten/, [22, 76]], [/unten\s*rechts|rechts\s*unten/, [78, 76]],
    [/(in\s+der\s+)?mitte|zentrum/, [50, 50]], [/\boben\b/, [50, 20]], [/\bunten\b/, [50, 78]], [/\blinks\b/, [22, 50]], [/\brechts\b/, [78, 50]],
  ];
  const MUSIK = { froehlich: 'froehlich', lustig: 'froehlich', gut: 'froehlich', ruhig: 'ruhig', entspannt: 'ruhig', leise: 'ruhig', spannend: 'spannend', aufregend: 'spannend', episch: 'episch', gross: 'episch', traurig: 'traurig', gruselig: 'gruselig', unheimlich: 'gruselig', horror: 'gruselig' };
  const GERAEUSCHE = ['explosion', 'schlag', 'plopp', 'sprung', 'landen', 'puff', 'aua', 'jubel', 'lachen', 'schreck', 'zisch', 'donner', 'rakete', 'knall', 'magie', 'bruch', 'glocke', 'tada', 'trommel', 'fail', 'level', 'muenze', 'schwung'];
  const ELEMENTE = ['wasserstoff', 'helium', 'lithium', 'kohlenstoff', 'stickstoff', 'sauerstoff', 'neon', 'natrium', 'magnesium', 'aluminium', 'silizium', 'chlor', 'kalium', 'calcium', 'eisen', 'kupfer', 'silber', 'gold', 'uran'];
  const MOLEKUELE = { wasser: 'wasser', h2o: 'wasser', co2: 'co2', kohlendioxid: 'co2', methan: 'methan', ammoniak: 'ammoniak', salz: 'kochsalz', kochsalz: 'kochsalz', dna: 'dna', sauerstoffmolekuel: 'sauerstoff' };

  // Zahlen als Wörter
  const ZAHLWORT = { null: 0, eins: 1, ein: 1, eine: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12, fuenfzehn: 15, zwanzig: 20, dreissig: 30, halbe: 0.5, halb: 0.5 };
  function zahlenAusWorten(s) {
    return s.replace(/\b(null|eins|einer|zwei|drei|vier|fuenf|sechs|sieben|acht|neun|zehn|elf|zwoelf|fuenfzehn|zwanzig|dreissig)\b(?=\s*(sekunde|sek|s\b|mal|fach|minute))/g, m => ZAHLWORT[m]);
  }
  function zeit(s) { // "1:05" oder "65" oder "1,5"
    if (s.includes(':')) return s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
    return parseFloat(s.replace(',', '.'));
  }
  const Z = '(\\d+(?:[.,]\\d+)?|\\d+:\\d{2}(?:[.,]\\d+)?)';

  // Sätze trennen (Anführungszeichen bleiben zusammen)
  function saetze(text) {
    const out = [];
    for (const zeile of text.split(/\n/)) {
      let akt = '', inQ = false;
      for (let i = 0; i < zeile.length; i++) {
        const c = zeile[i];
        if (c === '"' || c === '„' || c === '“' || c === '”') inQ = !inQ;
        if (!inQ && /[.!?;]/.test(c) && !/\d/.test(zeile[i + 1] || '') ) { if (akt.trim()) out.push(akt.trim()); akt = ''; continue; }
        akt += c;
      }
      if (akt.trim()) out.push(akt.trim());
    }
    // "… und dann …" / "danach" trennen
    const fein = [];
    for (const s of out) for (const t of s.split(/\s*(?:,?\s*und\s+dann|,?\s*danach|,\s*dann)\s+/i)) if (t.trim()) fein.push(t.trim());
    return fein;
  }

  function zitat(roh) {
    let m = /["„“]([^"„“”]+)["“”]?/.exec(roh);
    if (m) return m[1].trim();
    m = /:\s*(.+)$/.exec(roh);
    if (m) return m[1].trim();
    return null;
  }
  function textNachVerb(roh, verben) {
    const z = zitat(roh);
    if (z) return z;
    const re = new RegExp('\\b(' + verben.join('|') + ')\\b\\s*(,|dass)?\\s*(.+)$', 'i');
    const m = re.exec(roh);
    return m ? m[3].trim() : null;
  }
  function ort(n) {
    const m = /\b(?:bei|an|auf|position)?\s*(\d{1,3})\s*[,/ ]\s*(\d{1,3})\b(?!\s*(sek|s\b|mal|fach))/.exec(n);
    if (m && /\b(bei|position|an der stelle|punkt)\b/.test(n)) return [+m[1], +m[2]];
    for (const [re, p] of ORTE) if (re.test(n)) return p.slice();
    return null;
  }
  function farbe(n) { for (const w of n.split(/[^a-z]+/)) if (FARBEN[w]) return FARBEN[w]; return null; }
  function abSek(n) {
    const m = new RegExp('(?:bei|ab|nach|in|zu|um)\\s+(?:der\\s+)?(?:sekunde|sek\\.?|s)\\s*' + Z + '|' + '(?:nach|ab)\\s+' + Z + '\\s*(?:sekunden|sek|s)\\b').exec(n);
    return m ? zeit(m[1] || m[2]) : null;
  }
  function fuerSek(n) {
    const m = new RegExp('(?:fuer|waehrend)\\s+' + Z + '\\s*(?:sekunden|sek|s)\\b|' + Z + '\\s*(?:sekunden|sek|s)\\s*lang').exec(n);
    return m ? zeit(m[1] || m[2]) : null;
  }

  BF.klartext = function (text, opt = {}) {
    const zeilen = [];
    const bericht = [];
    let film = 'film 4k';
    let titel = null;
    let videoDa = false;
    let letztesVideo = null;
    let figurDa = false;
    let objNr = 0;
    const standardVideo = opt.standardVideo || null;
    const kopf = [];

    for (const roh of saetze(text)) {
      const n = zahlenAusWorten(norm(roh));
      const neu = [];
      let hinweis = null;
      const ab = abSek(n);
      const fuer = fuerSek(n);
      const par = (zusatz = 0) => (videoDa ? `&${(ab ?? 0) + zusatz} ` : '');
      const dauerTeil = d => (fuer ? ` fuer ${fuer}` : d ? ` fuer ${d}` : '');
      const f = farbe(n);

      // ---------- Einstellungen ----------
      if (/\b4k\b|ultra ?hd/.test(n)) { film = 'film 4k'; neu.push('(Film in 4K)'); }
      else if (/hochkant|\bshorts?\b|tiktok|handy ?format|fuers handy|fuer (das |ein )?handy\b/.test(n) && /format|video|film|als|mach/.test(n)) { film = 'film hochkant'; neu.push('(Hochkant-Format)'); }
      else if (/full ?hd|1080/.test(n) && !/video\s+["„]/.test(n)) { film = 'film 1080p'; neu.push('(Full HD)'); }
      else if (/\b720p?\b|\bhd\b/.test(n) && /format|aufloesung|qualitaet/.test(n)) { film = 'film 720p'; neu.push('(HD 720p)'); }
      if (/\btitel\b.*\b(heisst|ist|lautet)\b/.test(n) || /^(der\s+)?film\s+heisst/.test(n)) { titel = zitat(roh) || textNachVerb(roh, ['heisst', 'heißt', 'ist', 'lautet']); neu.push(`(Titel: ${titel})`); }
      if (neu.length && neu.every(x => x.startsWith('('))) { bericht.push({ satz: roh, ok: true, zeilen: neu }); continue; }

      // ---------- Fertige Themen (ganze Erklärfilme) ----------
      const thema = /(erklaer|warum|wieso|weshalb|\bwas\b|\bwie\b|thema|zeig mir|ist es moeglich|kann man|koennen wir|geht es|mach (einen |mir einen )?film|film (ueber|zu|:))/.test(n) && Object.values(BF.THEMEN || {}).find(th => th.erkennen.test(n));
      if (thema) {
        const alter = opt.alter || '3-5';
        const txt = BF.themaSkript(thema, alter);
        for (const z of txt.split('\n')) neu.push(z);
        neu.unshift('ohnevideo');
        videoDa = false;
        bericht.push({ satz: roh, ok: true, zeilen: [`(fertiger Erklärfilm: „${thema.name}“ für ${BF.ALTER_NAME[alter] || alter}, ${txt.split('\n').length} Schritte)`], hinweis: null });
        for (const z of neu) zeilen.push(z);
        continue;
      }
      if (/^(erklaer|erklaere|warum|wieso|weshalb|ist es moeglich|kann man|mach (einen |mir einen )?film)\b/.test(n) && !/\b(sprecher|sagt|sag)\b/.test(n)) {
        bericht.push({ satz: roh, ok: false, zeilen: [], hinweis: 'Dieses Thema kenne ich noch nicht. Schreib es oben ins 🤖-Feld und klick „🤖 KI-Film“, dann macht die KI den ganzen Film. Fertige Filme ohne KI gibt es zu: ' + Object.values(BF.THEMEN || {}).map(x => '„' + x.name + '“').join(', ') + '.' });
        continue;
      }
      // ---------- Musik / Geräusche ----------
      if (/\bmusik\b/.test(n)) {
        let stil = null;
        for (const w of n.split(/[^a-z]+/)) if (MUSIK[w]) stil = MUSIK[w];
        if (/\b(aus|stopp|keine|ohne|weg)\b/.test(n)) stil = 'aus';
        neu.push(`${par()}musik ${stil || 'froehlich'}`);
      } else if (/\b(geraeusch|sound|soundeffekt|effekt)\b/.test(n) || GERAEUSCHE.some(g => new RegExp(`\\b${g}s?(geraeusch|sound)\\b`).test(n))) {
        const g = GERAEUSCHE.find(g => n.includes(g)) || 'plopp';
        neu.push(`${par()}ton ${g}`);
      }
      // ---------- Video ----------
      else if (/\b(video|aufnahme|clip|gameplay|film(?!\s*heisst))\b/.test(n) && /\b(zeig|spiel|nimm|start|mein|meine|abspielen|abspiel|benutz|dann|von|bis|teil|ersten|letzten|stueck)\b/.test(n) && !/\bende\b\s*$/.test(n)) {
        let datei = (/["„]([^"„“”]+\.(?:mp4|mkv|mov|webm|avi))["“”]?/i.exec(roh) || /(\S+\.(?:mp4|mkv|mov|webm|avi))/i.exec(roh) || [])[1] || letztesVideo || standardVideo;
        if (!datei) { hinweis = 'Ich weiß nicht, welches Video. Füge zuerst eins mit „＋ Video/Bild“ hinzu.'; }
        else {
          let z = `video "${datei}"`;
          let m = new RegExp('von\\s+(?:sekunde\\s+)?' + Z + '\\s*(?:sekunden|sek|s)?\\s*bis\\s+(?:sekunde\\s+)?' + Z).exec(n);
          if (m) z += ` von ${zeit(m[1])} bis ${zeit(m[2])}`;
          else if ((m = new RegExp('(?:die\\s+)?ersten\\s+' + Z + '\\s*(?:sekunden|sek|s)').exec(n))) z += ` von 0 bis ${zeit(m[1])}`;
          else if ((m = new RegExp('ab\\s+(?:sekunde\\s+)?' + Z).exec(n))) {
            z += ` von ${zeit(m[1])}`;
            const l = new RegExp(Z + '\\s*(?:sekunden|sek|s)\\s*lang').exec(n);
            if (l) z += ` bis ${zeit(m[1]) + zeit(l[1])}`;
          }
          if (/zeitlupe|ganz langsam|super langsam/.test(n)) z += ' tempo 0.25';
          else if (/langsam|halbe geschwindigkeit/.test(n)) z += ' tempo 0.5';
          else if (/zeitraffer|doppelt so schnell|schneller|vorspulen/.test(n)) z += ' tempo 2';
          if (/ohne ton|stumm|kein ton|leise/.test(n)) z += ' stumm';
          if (/zeichentrick|cartoon|comic/.test(n)) neu.push('& zeichentrick an in 0.8');
          neu.unshift(z);
          videoDa = true; letztesVideo = datei;
        }
      }
      // ---------- Standbild / Warten / Blenden ----------
      else if (/standbild|einfrier|anhalten|halt(e|')?\s.*\ban\b|pausier|stopp?\s+(das\s+)?video/.test(n)) {
        neu.push(`standbild ${fuer || (/(\d+)\s*(sekunden|sek)/.exec(n) || [])[1] || 3}`);
      } else if (/^(warte|pause|kurz warten)|\bwarten\b/.test(n)) {
        neu.push(`warte ${fuer || (/(\d+(?:[.,]\d+)?)\s*(sekunden|sek|s)\b/.exec(n) || [])[1] || 2}`);
      } else if (/(ausblenden|abblenden|schwarz werden|zum schluss schwarz|ende des videos|^ende$|^schluss)/.test(n)) {
        neu.push('ausblenden 1');
      } else if (/einblenden|aus dem schwarz/.test(n)) {
        neu.push('einblenden 1');
      }
      // ---------- Zeichentrick ----------
      else if (/zeichentrick|cartoon|comic/.test(n)) {
        neu.push(`${par()}zeichentrick ${/\b(aus|ohne|normal|wieder echt|beenden|stopp)\b/.test(n) ? 'aus' : 'an'} in 0.8`);
      }
      // ---------- Zoom ----------
      else if (/zoom|vergroesser|ranzoom|naeher ran|heranzoom|lupe/.test(n)) {
        if (/\b(raus|aus|zurueck|weg|normal)\b/.test(n)) neu.push(`${par()}lupe aus in 0.8`);
        else {
          const p = ort(n) || [50, 50];
          const fakt = (/(\d+(?:[.,]\d+)?)\s*(fach|mal|x)\b/.exec(n) || [])[1] || (/stark|ganz nah|sehr/.test(n) ? 3 : 2);
          neu.push(`${par()}lupe ${p[0]} ${p[1]} zoom ${String(fakt).replace(',', '.')} in 1`);
          if (!ort(n)) hinweis = 'Tipp: Sag wohin, z. B. „zoom oben rechts“ oder Strg+Klick ins Bild für eine genaue Stelle.';
        }
      }
      // ---------- Sprecher ----------
      else if (/(sprecher|erzaehler|stimme|erklaer|vorlesen|lies vor|\bsag\b|\bsage\b|\bsagt\b|sprich|erzaehl)/.test(n) && !/\b(ich|meine figur|mein skin|mein charakter|steve)\b.*\bsag/.test(n)) {
        const t = textNachVerb(roh, ['sagt', 'sag', 'sage', 'spricht', 'sprich', 'erklärt', 'erklaert', 'erklär', 'erklaer', 'erzählt', 'erzaehlt', 'liest vor', 'lies vor', 'vorlesen', 'sprecher', 'erzähler', 'erzaehler']);
        if (!t) hinweis = 'Was soll gesagt werden? Schreib es in Anführungszeichen oder nach einem Doppelpunkt.';
        else neu.push(`${par()}sprecher "${q(t)}"`);
      }
      // ---------- eigene Figur (dein Skin) ----------
      else if (/\b(ich|meine figur|mein skin|mein charakter|meine person)\b.*\b(sag|sage|sagt|ruf|rufe|winke|jubel|tanz)/.test(n)) {
        if (!figurDa) { kopf.push('figur ich bei 0 0 unsichtbar'); figurDa = true; }
        const t = zitat(roh) || textNachVerb(roh, ['sage', 'sagt', 'sag', 'rufe', 'ruft']);
        const d = t ? Math.min(7, Math.max(1.6, 0.9 + t.length * 0.055)) : 2;
        const geste = /wink/.test(n) ? 'winkt' : /jubel/.test(n) ? 'jubelt' : /tanz/.test(n) ? 'tanzt 3' : null;
        if (videoDa) {
          const a0 = ab ?? 0;
          neu.push(`&${a0} kamera bei 0 1.5 4.2 schaut auf 0 1.1 0`, `&${a0} ich erscheint`);
          if (geste) neu.push(`&${a0 + 0.4} ich ${geste}`);
          if (t) neu.push(`&${a0 + 0.4} ich sagt "${q(t)}"`);
          neu.push(`&${+(a0 + 0.4 + d).toFixed(2)} ich verschwindet`);
        } else {
          neu.push('kamera bei 0 1.5 4.2 schaut auf 0 1.1 0', 'ich erscheint');
          if (t) neu.push(`ich sagt "${q(t)}"`);
          if (geste) neu.push(`& ich ${geste}`);
          neu.push('ich verschwindet');
        }
      }
      // ---------- Titel / Kapitel / Text ----------
      else if (/^(kapitel|titel|ueberschrift)|\b(kapitel|ueberschrift)\b/.test(n)) {
        const t = zitat(roh) || roh.replace(/^.*?(kapitel|titel|überschrift|ueberschrift)\s*(\d+)?\s*:?\s*/i, '').trim();
        neu.push(`kapitel "${q(t || 'Kapitel')}" ${fuer || 2.5}`);
      } else if (/\b(schreib|text|beschrift|einblend|untertitel|zeig(e)?\s+(den|das|die)?\s*(wort|text|satz))/.test(n) && zitat(roh) && !/kreis|einkreis|markier|pfeil|zeiger|notiz|zettel|tafel|formel|flugbahn|kurve|zaehl/.test(n)) {
        const t = zitat(roh);
        let o = 'oben';
        if (/\bunten\b|untertitel/.test(n)) o = 'unten';
        else if (/mitte|gross/.test(n)) o = 'mitte';
        neu.push(`${par()}text "${q(t)}" ${fuer || Math.max(2.5, 1 + t.length * 0.06)} ${o}${f ? ' farbe ' + f : ''}`);
      }
      // ---------- Kreis / Rahmen / Pfeil / Flugbahn / Notiz ----------
      else if (/kreis|einkreis|markier|umkreis/.test(n)) {
        const p = ort(n) || [50, 50];
        const t = zitat(roh);
        const gr = /gross/.test(n) ? 14 : /klein/.test(n) ? 5 : 8;
        neu.push(`${par()}kreis ${p[0]} ${p[1]} radius ${gr} farbe ${f || 'rot'}${t ? ` "${q(t)}"` : ''}${dauerTeil(3)}`);
        if (!ort(n)) hinweis = 'Der Kreis ist in der Mitte. Sag z. B. „oben links“ oder Strg+Klick ins Bild für eine genaue Stelle.';
      } else if (/pfeil|zeig(e|t)?\s+auf|deute|zeiger/.test(n)) {
        const p = ort(n) || [50, 50];
        const t = zitat(roh);
        const start = [p[0] > 50 ? p[0] - 22 : p[0] + 22, p[1] > 50 ? p[1] - 22 : p[1] + 22];
        neu.push(`${par()}zeiger von ${Math.round(start[0])} ${Math.round(start[1])} nach ${p[0]} ${p[1]} farbe ${f || 'gelb'}${t ? ` "${q(t)}"` : ''}${dauerTeil(3)}`);
        if (!ort(n)) hinweis = 'Der Pfeil zeigt auf die Mitte. Sag wohin, z. B. „Pfeil auf oben rechts“.';
      } else if (/flugbahn|kurve|bogen|parabel|weg zeigen|bahn/.test(n)) {
        const v = /von\s+(oben|unten)?\s*(links|rechts)/.exec(n);
        let pts = '15 75 35 35 60 28 85 70';
        if (v && v[2] === 'rechts') pts = '85 75 65 35 40 28 15 70';
        if (/fall|nach unten|faellt/.test(n)) pts = '50 15 50 40 50 65 50 85';
        const t = zitat(roh);
        neu.push(`${par()}kurve ${pts} farbe ${f || 'gelb'}${t ? ` "${q(t)}"` : ''} in 1.5${dauerTeil(4)}`);
      } else if (/notiz|zettel|hinweis|merkzettel/.test(n)) {
        const p = ort(n) || [78, 25];
        const t = zitat(roh) || textNachVerb(roh, ['notiz', 'zettel', 'hinweis']);
        neu.push(`${par()}notiz "${q(t || 'Notiz')}" bei ${p[0]} ${p[1]}${dauerTeil(3)}`);
      }
      // ---------- Tafel / Formel / Stoppuhr / Zähler ----------
      else if (/tafel|liste|stichpunkt|aufzaehlung|merke/.test(n)) {
        const inhalt = zitat(roh) || roh.replace(/^.*?(tafel|liste|stichpunkte|aufzählung|aufzaehlung|merke)\s*(mit)?\s*:?\s*/i, '');
        const teile = inhalt.split(/\s*[,;]\s*|\s+und\s+/).filter(Boolean);
        const titelT = teile.length > 1 ? teile.shift() : 'Merke:';
        neu.push(`${par()}tafel "${q(titelT)}" ${teile.map(t => `"${q(t)}"`).join(' ')} ${/links/.test(n) ? 'links' : 'rechts'}${fuer ? ' fuer ' + fuer : ''}`);
      } else if (/formel|gleichung/.test(n)) {
        const t = zitat(roh) || roh.replace(/^.*?(formel|gleichung)\s*:?\s*/i, '');
        neu.push(`${par()}formel "${q(t)}" unten${fuer ? ' fuer ' + fuer : ''}`);
      } else if (/stoppuhr|zeit messen|timer|zeitmessung/.test(n)) {
        neu.push(`${par()}stoppuhr ${/(stopp|stop|anhalten|halt)/.test(n) ? 'stopp' : /(aus|weg)/.test(n) ? 'aus' : 'start'}`);
      } else if (/zaehl|zaehler|zahl steigt/.test(n)) {
        const m = /von\s+(-?\d+(?:[.,]\d+)?)\s+(?:bis|auf)\s+(-?\d+(?:[.,]\d+)?)\s*([a-z/%°]*)/.exec(n);
        const t = zitat(roh) || 'Wert';
        if (m) neu.push(`${par()}zaehler "${q(t)}" von ${m[1].replace(',', '.')} bis ${m[2].replace(',', '.')}${m[3] ? ` einheit "${m[3]}"` : ''} in 2`);
        else hinweis = 'So: „Zähler von 0 bis 100 km/h“';
      }
      // ---------- 3D-Wissenschaft ----------
      else if (/\batom\b|\batome\b/.test(n)) {
        const el = ELEMENTE.find(e => n.includes(e)) || 'kohlenstoff';
        const nm = 'obj' + (++objNr), d = fuer || 6, p = par();
        neu.push(`${p}kamera bei 0 2.4 6 schaut auf 0 2 0`, `${p ? p : ''}atom ${el} ${nm} bei 0 2 0 mit namen`);
        if (videoDa) neu.push(`&${(ab ?? 0) + d} verstecke ${nm}`); else neu.push(`warte ${d}`, `verstecke ${nm}`);
      } else if (/molekuel|h2o|co2|dna/.test(n)) {
        let art = 'wasser';
        for (const w of Object.keys(MOLEKUELE)) if (n.includes(w)) art = MOLEKUELE[w];
        const nm = 'obj' + (++objNr), d = fuer || 6, p = par();
        neu.push(`${p}kamera bei 0 2.4 6 schaut auf 0 2 0`, `${p}molekuel ${art} ${nm} bei 0 2 0 groesse 1.3`);
        if (videoDa) neu.push(`&${(ab ?? 0) + d} verstecke ${nm}`); else neu.push(`warte ${d}`, `verstecke ${nm}`);
      } else if (/sonnensystem|planeten/.test(n)) {
        neu.push('ohnevideo', 'himmel nacht', 'sonnensystem bei 0 0 0 mit namen', 'kamera bei 0 18 30 schaut auf 0 0 0', `kamera faehrt zu 0 30 4 schaut auf 0 0 0 in ${fuer || 8}`);
      } else if (/explosion|tnt|sprengen|explodier/.test(n)) {
        neu.push('ohnevideo', 'baue tntfeld 0 -3 breite 3', 'baue turm -5 -4 hoehe 8', 'kamera bei -10 6 10 schaut auf -1 2 -3', 'tnt 0 0 -3 zuender 2', 'kamera wackeln 1 in 1', 'warte 3');
      } else if (/vulkan/.test(n)) {
        neu.push('ohnevideo', 'vulkan 0 0 hoehe 10', 'kamera bei -22 10 22 schaut auf 0 6 0', `vulkan 0 0 hoehe 10 ausbruch in ${fuer || 6}`);
      } else if (/pendel/.test(n)) {
        neu.push('ohnevideo', 'pendel bei 0 0 0 laenge 4 winkel 35', 'kamera bei 0 3 9 schaut auf 0 2.5 0', `warte ${fuer || 6}`);
      } else {
        hinweis = 'Das habe ich nicht verstanden. Probier Wörter wie: Video, Sprecher sagt, Kreis, Pfeil, Zoom, Zeitlupe, Standbild, Zeichentrick, Text, Tafel, Formel, Musik.';
      }
      for (const z of neu) if (!z.startsWith('(')) zeilen.push(z);
      bericht.push({ satz: roh, ok: neu.length > 0 && !(!neu.length && hinweis), zeilen: neu, hinweis });
    }
    const alles = [film + (titel ? ` titel "${q(titel)}"` : ''), ...kopf, ...zeilen];
    return { skript: alles.join('\n'), bericht };
  };

  BF.KLARTEXT_BEISPIELE = [
    'Erkläre, warum ein schwarzes Loch schwarz ist.',
    'Erkläre, warum es Tag und Nacht gibt.',
    'Erkläre, warum der Mond nicht auf die Erde fällt.',
    'Erkläre, warum Blätter im Herbst bunt werden.',
    'Erkläre, ob man wie ein Geist durch Wände gehen kann.',
    'Erkläre, warum der Himmel blau ist.',
    'Erkläre, was Klima ist.',
    'Erkläre, wie unser Körper funktioniert.',
    'Erkläre, wie Viren und Krankheiten funktionieren.',
    'Erkläre, wie Handys, Computer und Tablets funktionieren.',
    'Erkläre, wie Mathe funktioniert.',
    'Mach einen Film über Dinosaurier und die Erdzeitalter.',
    'Zeig mein Video von Sekunde 5 bis 12.',
    'Der Sprecher sagt: Hier fällt der Sand nach unten, weil er keinen Halt hat.',
    'Mach bei Sekunde 2 einen roten Kreis oben rechts mit dem Text "Sand".',
    'Bei Sekunde 4 zeigt ein gelber Pfeil auf die Mitte.',
    'Zoom bei Sekunde 3 zweifach unten links.',
    'Danach Standbild für 3 Sekunden.',
    'Zeig den Teil ab Sekunde 20 in Zeitlupe, 4 Sekunden lang.',
    'Mach es als Zeichentrick.',
    'Zeichne eine Flugbahn von links "So fliegt der Pfeil".',
    'Tafel: Merke, Sand fällt, Kies fällt, Erde bleibt liegen.',
    'Formel "F = m · g".',
    'Stoppuhr starten.',
    'Ich sage "Hallo Leute, heute erkläre ich euch die Physik in Minecraft!" und winke.',
    'Zeig ein Sauerstoff-Atom für 6 Sekunden.',
    'Kapitel "Teil 2: Wasser".',
    'Spannende Musik.',
    'Am Ende ausblenden.',
  ];
})();
