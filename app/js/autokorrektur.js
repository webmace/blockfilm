// Blockfilm – Autokorrektur für die Schreibfelder (offline)
// Verbessert ein Wort, sobald es fertig ist (Leertaste, Satzzeichen, Enter). Strg+Z macht es rückgängig.
(function () {
  const BF = (window.BF = window.BF || {});

  // feste Verbesserungen (häufige Tippfehler)
  const FEST = {
    nd: 'nicht', nich: 'nicht', nciht: 'nicht', nihct: 'nicht', ncht: 'nicht',
    wierd: 'wird', wirt: 'wird', wiert: 'wird', wird: 'wird',
    mann: 'man', dan: 'dann', wen: 'wenn', den: 'den', das: 'das', dass: 'dass',
    ch: 'ich', ihc: 'ich', icn: 'ich', sit: 'ist', its: 'ist', isst: 'isst', is: 'ist',
    sien: 'sein', sein: 'sein', und: 'und', udn: 'und', unt: 'und', nud: 'und',
    msch: 'mach', mahc: 'mach', amch: 'mach', mache: 'mache', machen: 'machen',
    erkleren: 'erklären', erkleern: 'erklären', erklern: 'erklären', erklähren: 'erklären', erkläre: 'erkläre', erklere: 'erkläre', erkleer: 'erklär', erkler: 'erklär', erklert: 'erklärt', erklerung: 'Erklärung', erklerungen: 'Erklärungen',
    weren: 'wären', wehren: 'wären', wäre: 'wäre', were: 'wäre', währe: 'wäre', wehre: 'wäre',
    gereusche: 'Geräusche', geräuche: 'Geräusche', gereusch: 'Geräusch', geräusch: 'Geräusch',
    stümme: 'Stimme', stimmme: 'Stimme', szimme: 'Stimme', stime: 'Stimme', stimmen: 'Stimmen',
    koplizirt: 'kompliziert', kompliziert: 'kompliziert', komplizirt: 'kompliziert', kopliziert: 'kompliziert',
    explusion: 'Explosion', explusionen: 'Explosionen', explosionen: 'Explosionen', explotion: 'Explosion',
    lertaste: 'Leertaste', leertaste: 'Leertaste',
    hinz: 'hinzu', hinzu: 'hinzu', hizu: 'hinzu',
    vidio: 'Video', vidoe: 'Video', viedeo: 'Video', vidios: 'Videos', viedeos: 'Videos', fideo: 'Video',
    progam: 'Programm', programm: 'Programm', proramm: 'Programm', programiren: 'programmieren', programieren: 'programmieren',
    animirt: 'animiert', animiren: 'animieren', anmation: 'Animation', animatoin: 'Animation',
    wissenschaft: 'Wissenschaft', wisenschaft: 'Wissenschaft',
    zeichentrik: 'Zeichentrick', zeichetrick: 'Zeichentrick', zeichntrick: 'Zeichentrick',
    schwarzesloch: 'schwarzes Loch', schwazes: 'schwarzes', schwarzs: 'schwarzes', schwartz: 'schwarz',
    warrum: 'warum', waum: 'warum', wraum: 'warum', wiso: 'wieso', weshlab: 'weshalb',
    himmmel: 'Himmel', himel: 'Himmel', regnbogen: 'Regenbogen', regebogen: 'Regenbogen',
    kindrevon: 'Kinder von', kinderr: 'Kinder',
    sekunde: 'Sekunde', sekunden: 'Sekunden', sekude: 'Sekunde', sekuden: 'Sekunden', skunde: 'Sekunde',
    sprecher: 'Sprecher', sprächer: 'Sprecher', sprecherin: 'Sprecherin',
    auflöung: 'Auflösung', auflössung: 'Auflösung', auflösung: 'Auflösung',
    musick: 'Musik', musiek: 'Musik', muisk: 'Musik',
    andere: 'andere', anderre: 'andere', ändere: 'ändere', endere: 'ändere',
    gut: 'gut', gutt: 'gut', einfacher: 'einfacher', einfahcer: 'einfacher', einfacer: 'einfacher',
    kurz: 'kurz', kurtz: 'kurz', lang: 'lang', lanng: 'lang',
    zeig: 'zeig', ziege: 'zeige', zieg: 'zeig', zeih: 'zeig',
    standbilt: 'Standbild', standbiled: 'Standbild', zeitlupee: 'Zeitlupe', zeitlube: 'Zeitlupe',
    pfiel: 'Pfeil', pfeiel: 'Pfeil', kries: 'Kreis', kreiss: 'Kreis', krais: 'Kreis',
    formal: 'Formel', fromel: 'Formel', tafle: 'Tafel', stopuhr: 'Stoppuhr', stoppuhr: 'Stoppuhr',
    mond: 'Mond', mont: 'Mond', sone: 'Sonne', sonnne: 'Sonne', ertde: 'Erde', erdee: 'Erde',
    kan: 'kann', kann: 'kann', solll: 'soll', wil: 'will', wilst: 'willst', gehts: 'geht es', körpa: 'Körper', koerpa: 'Körper', korper: 'Körper', körpper: 'Körper', funkioniert: 'funktioniert', funktionirt: 'funktioniert', funkionirt: 'funktioniert', funktionniert: 'funktioniert', unterschit: 'Unterschied', unterschiet: 'Unterschied', unterschid: 'Unterschied', aussprahce: 'Aussprache', klimma: 'Klima', klimer: 'Klima', geister: 'Geister', geistr: 'Geister', gesit: 'Geist', wende: 'Wände', waende: 'Wände', auserdem: 'außerdem', ausserdem: 'außerdem', altars: 'Alters', moglich: 'möglich', möglig: 'möglich', funkioniren: 'funktionieren', funktioniren: 'funktionieren', viruse: 'Viren', virusse: 'Viren', virn: 'Viren', krankheitn: 'Krankheiten', bakterin: 'Bakterien', bakteriän: 'Bakterien', bekomnt: 'bekommt', bekomt: 'bekommt', hendys: 'Handys', hendy: 'Handy', hendi: 'Handy', händy: 'Handy', händys: 'Handys', handis: 'Handys', ipads: 'iPads', ipad: 'iPad', tablett: 'Tablet', tablets: 'Tablets', komputer: 'Computer', kompjuter: 'Computer', computa: 'Computer', laptob: 'Laptop', bitet: 'bitte', btte: 'bitte', bite: 'bitte', danek: 'danke', dnake: 'danke',
  };
  // Wörter, die in Blockfilm oft vorkommen (für die Ähnlichkeitssuche)
  const WORTE = ['Video', 'Sekunde', 'Sekunden', 'Sprecher', 'Zeichentrick', 'Standbild', 'Zeitlupe', 'Explosion', 'Geräusche', 'Stimme', 'Musik', 'Kreis', 'Pfeil',
    'Tafel', 'Formel', 'Stoppuhr', 'Zähler', 'Kapitel', 'Notiz', 'Flugbahn', 'Kurve', 'Atom', 'Molekül', 'Sonnensystem', 'Vulkan', 'Pendel', 'Figur',
    'erklären', 'erkläre', 'warum', 'wieso', 'weshalb', 'schwarzes', 'schwarz', 'Loch', 'Sonne', 'Erde', 'Mond', 'Stern', 'Sterne', 'Planet', 'Himmel',
    'Regenbogen', 'Wasser', 'Regen', 'Wolken', 'Gewitter', 'Blitz', 'Schwerkraft', 'Licht', 'Weltall', 'Weltraum', 'Rakete', 'Astronaut', 'Dinosaurier',
    'ausblenden', 'einblenden', 'zweifach', 'dreifach', 'langsam', 'schneller', 'spannende', 'fröhliche', 'ruhige', 'Leertaste', 'Programm', 'Auflösung',
    'kompliziert', 'einfacher', 'hinzufügen', 'animiert', 'Animation', 'Minecraft', 'Wissenschaft', 'Kinder', 'Erklärvideo', 'Erklärung',
    'nicht', 'wird', 'werden', 'wären', 'sollen', 'können', 'machen', 'zeigen', 'danach', 'dann', 'wenn', 'gleichzeitig', 'unten', 'oben', 'links', 'rechts',
    'Mitte', 'gelben', 'roten', 'blauen', 'grünen', 'Bildschirm', 'Beispiel', 'vielleicht', 'eigentlich', 'wirklich', 'zusammen', 'immer', 'bitte', 'danke'];
  const norm = s => s.toLowerCase();
  const WORT_MAP = new Map(WORTE.map(w => [norm(w), w]));
  // richtige Wörter, die nie "verbessert" werden dürfen (sonst wird z. B. Nacht zu nicht)
  const SICHER = new Set(('dino dinos dinosaurier saurier epochen epoche erdzeitalter jura trias kreidezeit fossil fossilien mammut tunneleffekt mathe mathematik rechnen zahlen zaehlen plus minus pizza apfel aepfel formen dreieck quadrat kreis muster tag nacht licht macht acht lacht recht nicht nichts dicht sicht pflicht schicht gericht gesicht bericht wicht ' +
    'der die das den dem des ein eine einen einem einer eines und oder aber auch noch schon nur sehr mehr viel viele wenig ganz gar kein keine ' +
    'ich du er sie es wir ihr mich dich sich uns euch mein dein sein ihr unser mir dir ihm ihn ihnen wer was wie wo wann warum wieso weshalb ' +
    'ist sind war waren bin bist hat haben hatte kann können konnte will wollen soll sollen muss müssen darf dürfen mag wird werden wurde ' +
    'geht gehen ging kommt kommen kam macht machen sagt sagen sieht sehen gibt geben nimmt nehmen fällt fallen hält halten läuft laufen ' +
    'in im an am auf aus bei mit nach von vor zu zum zur über unter durch für gegen ohne um bis seit hinter neben zwischen ' +
    'hier da dort jetzt dann wenn weil dass als ob so ja nein nie immer oft manchmal heute morgen gestern ' +
    'sonne mond erde stern sterne himmel welt weltall wasser luft feuer wind regen schnee eis wolke wolken baum bäume blatt blätter blume ' +
    'haus wand wände mauer tür fenster boden hand hände kopf auge augen kind kinder mama papa mensch menschen tier tiere hund katze ' +
    'groß große großen klein kleine kleinen hell dunkel schwarz weiß rot gelb grün blau bunt warm kalt schnell langsam hart weich ' +
    'gut schön lustig toll neu alt lang kurz hoch tief weit nah leicht schwer leer voll rund fest ' +
    'atom atome kraft kräfte magnet licht schatten farbe farben loch löcher geist geister mann frau wissen lernen spielen ' +
    'sekunde minute stunde jahr jahre tage monat woche zeit film filme video bild bilder stimme ton musik kreis pfeil text tafel ' +
    'herbst winter frühling sommer morgens abends nachts tags').split(' '));
  BF.sichereWorte = SICHER;
  let themenWorte = null;
  const istSicher = klein => {
    if (SICHER.has(klein) || WORT_MAP.has(klein)) return true;
    if (!themenWorte && BF.THEMEN) {
      themenWorte = new Set();
      const quellen = Object.values(BF.THEMEN).map(t => (t.skript || '') + ' ' + (t.kurz || '')).concat(BF.KLARTEXT_BEISPIELE || []);
      for (const q of quellen) for (const w of q.toLowerCase().match(/[a-zäöüß]+/g) || []) themenWorte.add(w);
    }
    return !!themenWorte && themenWorte.has(klein);
  };

  function abstand(a, b) {
    // Damerau-Levenshtein (mit Buchstabendrehern)
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    const d = [];
    for (let i = 0; i <= m; i++) { d[i] = [i]; }
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const k = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + k);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }

  // ein einzelnes Wort verbessern (oder null, wenn alles passt)
  BF.korrigiereWort = function (wort) {
    if (!wort || /\d/.test(wort) || wort.length < 2) return null;
    let w = wort.replace(/(.)\1{2,}/g, '$1'); // machhhhh → mach
    const klein = norm(w);
    let neu = null;
    const nurKlein = { mann: 1, wen: 1, den: 1, is: 1 }; // großgeschrieben sind das echte Wörter (der Mann …)
    if (FEST[klein] !== undefined && !(nurKlein[klein] && /^[A-ZÄÖÜ]/.test(wort))) neu = FEST[klein];
    else if (WORT_MAP.has(klein)) neu = WORT_MAP.get(klein);
    else if (klein.length >= 5 && !istSicher(klein)) {
      let best = null, bd = 9, zweiter = 9;
      for (const [k, v] of WORT_MAP) {
        if (k.length < 5 || k[0] !== klein[0]) continue; // Tippfehler passieren selten am Wortanfang
        if (k.startsWith(klein) || klein.startsWith(k)) continue; // Endungen nicht "verbessern" (Stern/Sterne)
        const dd = abstand(klein, k);
        if (dd < bd) { zweiter = bd; bd = dd; best = v; } else if (dd < zweiter) zweiter = dd;
      }
      const grenze = klein.length >= 8 ? 2 : 1;
      if (best && bd <= grenze && zweiter > bd) neu = best;
    }
    if (neu === null) return w !== wort ? w : null;
    // Großschreibung vom Original übernehmen (am Satzanfang)
    if (/^[A-ZÄÖÜ]/.test(wort) && /^[a-zäöü]/.test(neu)) neu = neu[0].toUpperCase() + neu.slice(1);
    return neu === wort ? null : neu;
  };

  // ganzen Text verbessern (für den Satz-Übersetzer)
  BF.korrigiereText = function (text) {
    return text.replace(/"[^"]*"|„[^“"]*[“"]|([A-Za-zÄÖÜäöüß]+)/g, (m, wort) => {
      if (!wort) return m; // Text in Anführungszeichen bleibt, wie er ist
      const k = BF.korrigiereWort(wort);
      return k || m;
    });
  };

  // in ein Eingabefeld einbauen
  BF.autokorrekturAn = function (feld, melden) {
    let anfuehrung = false;
    feld.addEventListener('keydown', e => {
      if (BF.autokorrekturAus) return;
      if (!/^[ .,!?;:\n]$/.test(e.key === 'Enter' ? '\n' : e.key) || e.ctrlKey || e.altKey) return;
      const pos = feld.selectionStart;
      if (pos !== feld.selectionEnd) return;
      const vor = feld.value.slice(0, pos);
      anfuehrung = ((vor.match(/["„“”]/g) || []).length % 2) === 1;
      if (anfuehrung) return; // Text in Anführungszeichen nicht verändern
      const m = /([A-Za-zÄÖÜäöüß]+)$/.exec(vor);
      if (!m) return;
      const alt = m[1];
      const neu = BF.korrigiereWort(alt);
      if (!neu) return;
      feld.setSelectionRange(pos - alt.length, pos);
      document.execCommand('insertText', false, neu); // so geht Strg+Z
      if (melden) melden(alt, neu);
    });
  };
})();
