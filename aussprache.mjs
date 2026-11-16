// Blockfilm – Aussprache-Hilfe: macht aus Text etwas, das die Stimme richtig vorlesen kann
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DATEI = path.join(os.homedir(), 'Blockfilm', 'aussprache.json');

export function eigeneLesen() {
  try { return JSON.parse(fs.readFileSync(DATEI, 'utf8')); } catch { return {}; }
}
export function eigeneSchreiben(liste) {
  fs.mkdirSync(path.dirname(DATEI), { recursive: true });
  const sauber = {};
  for (const [k, v] of Object.entries(liste || {})) if (String(k).trim() && String(v).trim()) sauber[String(k).trim()] = String(v).trim();
  fs.writeFileSync(DATEI, JSON.stringify(sauber, null, 2));
  return sauber;
}

// ---------- Zahlen als Wörter ----------
const EINER = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const ZEHNER = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
function unter1000(n) {
  let s = '';
  const h = Math.floor(n / 100), r = n % 100;
  if (h) s += (h === 1 ? 'ein' : EINER[h]) + 'hundert';
  if (r) {
    if (r < 20) s += r === 1 && (h || s) ? 'eins' : EINER[r];
    else { const e = r % 10, z = Math.floor(r / 10); s += (e ? (e === 1 ? 'ein' : EINER[e]) + 'und' : '') + ZEHNER[z]; }
  }
  return s;
}
export function zahlWort(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'null';
  if (n === 1) return 'eins';
  const teile = [];
  const mrd = Math.floor(n / 1e9), mio = Math.floor((n % 1e9) / 1e6), tsd = Math.floor((n % 1e6) / 1000), rest = n % 1000;
  if (mrd) teile.push((mrd === 1 ? 'eine Milliarde' : unter1000(mrd) + ' Milliarden'));
  if (mio) teile.push((mio === 1 ? 'eine Million' : unter1000(mio) + ' Millionen'));
  let s = teile.join(' ');
  if (tsd) s += (s ? ' ' : '') + (tsd === 1 ? 'ein' : unter1000(tsd)) + 'tausend';
  if (rest) s += (tsd && !mio && !mrd ? '' : s ? ' ' : '') + (rest === 1 ? 'eins' : unter1000(rest));
  return s.trim();
}
function zahlText(roh) {
  // 300.000 / 1,5 / 3.5 / 12
  let s = roh;
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (/^\d+[,.]\d+$/.test(s)) {
    const [a, b] = s.split(/[,.]/);
    return zahlWort(+a) + ' Komma ' + b.split('').map(z => EINER[+z]).join(' ');
  }
  return zahlWort(+s);
}

// ---------- Wörter, die die Stimme von sich aus falsch betont (geprüft mit der Lautschrift von Piper) ----------
// Diese Regeln laufen vor den eigenen Wörtern: "weg" (= fort) kurz wie "weck", am Satzanfang ("Weg ist er!")
// und in Verben ("weggehen", "wegnehmen"); "der Weg" und "wegen" bleiben, wie sie sind.
const VORHER = [
  [/(^|[.!?:;]\s+|["„»(]\s*)Weg(?=\s+(?:ist|sind|war|waren|damit|da|hier|mit|und|vom|von|weg)\b|\s*[!,.?]|$)/g, (m, vor) => vor + 'Weck'],
  // „weg“ (fort) ist kurz wie „weck“; die Stimme liest es sonst manchmal lang wie „der Weg“. Das gilt auch in
  // Zusammensetzungen (wegfliegen, weghüpfen, hinweg). „wegen“ und das Nomen „Weg“ bleiben lang.
  [/\b(hin|vor|darüber|drüber|über|hin-)?weg(?!en\b|e\b|es\b|ung)(?=$|[^a-zäöüß]|[a-zäöüß])/g, (m, vor) => (vor ? vor.replace(/-$/, '') + ' ' : '') + 'weck'],
  [/\bWegweiser/g, 'Wehgweiser'],
];
const WOERTER = [
  [/\b([Oo])range(n|ne|nen|ner|nes|ns|s)?\b/g, (m, o, e) => (e ? 'O-rangsche' + { n: 'n', ne: 'ne', nen: 'nen', ner: 'ner', nes: 'nes', ns: 'ns', s: 's' }[e] : 'O-rangsch')],
  [/\b([Oo])rangen(\w+)/g, (m, o, rest) => 'O-rangschen' + rest],
  [/\bGlib(s)?\b/g, (m, e) => 'Glipp' + (e || '')], // unser Maskottchen, kurzes i wie in „glibberig“
  [/\bMinecraft\b/g, 'Meinkräft'], [/\bYouTube\b/gi, 'Jutjub'], [/\bCartoon\b/g, 'Kartuhn'], [/\bComputer\b/g, 'Kompjuter'],
  [/\bIsaac Newton\b/g, 'Eisäck Njuten'], [/\bNewtons?\b/g, m => (m.endsWith('s') ? 'Njutens' : 'Njuten')],
  [/\b(F|Ph)otosynthese\b/g, 'Fotosün-tehse'],
  [/\bNordpol(e|en|s)?\b/g, (m, e) => 'Nordpohl' + (e || '')], [/\bSüdpol(e|en|s)?\b/g, (m, e) => 'Sühdpohl' + (e || '')],
  [/\bEisbär(en)?\b/g, (m, e) => 'Eis-bär' + (e || '')], [/\bErdöl(s)?\b/g, (m, e) => 'Erd-öl' + (e || '')],
  [/\bPinguin(e|en)?\b/g, (m, e) => 'Pinggu-ien' + (e || '')], [/\bWüste(n)?\b/g, (m, e) => 'Wühste' + (e || '')],
  [/\bKohlendioxid(s)?\b/g, (m, e) => 'Kohlen-di-oxid' + (e || '')],
  [/\bBauplan\b/g, 'Bau-plan'], [/\bMilliarde\b/g, 'Mil-jarde'], [/\bMillionstel\b/g, 'Mil-jonstel'], [/\bMittelohrentzündung\b/g, 'Mittelohr-entzündung'],
  [/\bHalsentzündung\b/g, 'Halls-entzündung'], [/\bHals\b/g, 'Halls'], [/\bHändewaschen\b/g, 'Hände-waschen'], [/\bkaputt\b/g, 'ka-putt'],
  [/\bHatschi\b/g, 'Hatschie'], [/\bHappy Birthday\b/gi, 'Häppi Börsdei'], [/\bLebewesen\b/g, 'Lebe-wesen'],
  [/\bFresszellen\b/g, 'Fress-zellen'], [/\bAntikörper(n)?\b/g, (m, e) => 'Anti-körper' + (e || '')], [/\bTröpfcheninfektion\b/g, 'Tröpfchen-infektion'],
  [/\bSchmierinfektion\b/g, 'Schmier-infektion'], [/\bErbgut\b/g, 'Erb-gut'], [/\bZellkern\b/g, 'Zell-kern'], [/\bJoghurt\b/g, 'Jogurt'],
  [/\bStecknadelkopf\b/g, 'Stecknahdel-kopf'], [/\bMasern\b/g, 'Mahsern'], [/\bBlutkörperchen\b/g, 'Bluht-körperchen'],
  [/\bBlutgefäß(e|en)?\b/g, (m, e) => 'Bluht-gefäß' + (e || '')], [/\bAdern\b/g, 'Ahdern'], [/\bSpeiseröhre\b/g, 'Speise-röhre'], [/\bMilliarden\b/g, 'Mil-jarden'],
  [/\bChlorophyll\b/g, 'Kloro-füll'], [/\bCarotinoide\b/g, 'Karotino-iede'], [/\bAnthocyane\b/g, 'Anto-zü-ahne'],
  [/\bPauli\b/g, 'Pauli'], [/\bJeans\b/g, 'Dschiens'], [/\bBaby\b/g, 'Bebi'], [/\bBabys\b/g, 'Bebis'],
  [/\bHandykamera\b/g, 'Händi-kamera'], [/\bHandys\b/g, 'Händis'], [/\bTablet(s)?\b/g, (m, e) => 'Täblet' + (e || '')], [/\bBits\b/g, 'Bitts'],
  [/\bGigabytes?\b/g, 'Gigabeit'], [/\bServer(n)?\b/g, (m, e) => 'Sörwer' + (e || '')], [/\bTouchscreens?\b/g, 'Tatsch-skrihn'], [/\bPython\b/g, 'Peiton'],
  [/\bJava\b/g, 'Dschawa'], [/\bScratch\b/g, 'Skrätsch'], [/\bApps\b/g, 'Äpps'], [/\bApp\b/g, 'Äpp'], [/\bSIM-Karte(n)?\b/g, (m, e) => 'Simm-Karte' + (e || '')],
  [/\bKamera(s)?\b/g, (m, e) => 'Kammera' + (e || '')], [/\bLadekabel\b/g, 'Lade-kabel'], [/\bSeekabel(n)?\b/g, (m, e) => 'See-kabel' + (e || '')], [/\bKabel(n)?\b/g, (m, e) => 'Kahbel' + (e || '')],
  [/\bLadung\b/g, 'Lahdung'], [/\bFunkwellen\b/g, 'Funk-wellen'], [/\bGlasfaser(n)?\b/g, (m, e) => 'Glas-faser' + (e || '')], [/\bNotizzettel\b/g, 'Notiz-zettel'],
  [/\bWunderkisten\b/g, 'Wunder-kisten'], [/\bBildsensor\b/g, 'Bild-sensor'], [/\bKochrezept\b/g, 'Koch-rezept'], [/\bmiteinander\b/g, 'mit-einander'],
  [/\bBluetooth\b/g, 'Bluhtuhs'], [/\bCloud\b/g, 'Klaud'], [/\bRecycling\b/g, 'Ri-seikling'], [/\bPenicillin\b/g, 'Penizillin'], [/\bSatelliten\b/g, 'Satte-lieten'],
  [/\bKinderärztin\b/g, 'Kinder-ärztin'], [/\bHörrohr\b/g, 'Hör-rohr'], [/\bKrankheitserreger\b/g, 'Krankheits-erreger'], [/\bElektronenmikroskop(en|e)?\b/g, (m, e) => 'Elektronen-mikroskop' + (e || '')],
  [/\biPads?\b/g, m => (m.endsWith('s') ? 'Eipäds' : 'Eipäd')], [/\bPhishing\b/g, 'Fisching'], [/\bPersonal (Computer|Kompjuter)\b/g, 'Pörsenel Kompjuter'],
  [/\bMathematik\b/g, 'Mathema-tiek'], [/\bRaketen\b/g, 'Ra-kehten'], [/\bMaßband\b/g, 'Mahs-band'], [/\bdazwischen\b/g, 'da-zwischen'], [/\bMalnehmen\b/g, 'Mahlnehmen'],
  [/\bDinosaurier(n)?\b/g, (m, e) => 'Dino-sauri-er' + (e || '')], [/\bTyrannosaurus\b/g, 'Türanno-saurus'], [/\bTriceratops\b/g, 'Tri-zeh-ratops'],
  [/\bVelociraptor(en)?\b/g, (m, e) => 'Welozi-raptor' + (e || '')], [/\bPteranodon\b/g, 'Peteranodon'], [/\bDiplodocus\b/g, 'Di-plodokus'], [/\bPangäa\b/g, 'Pan-gäa'],
  [/\bQuetzalcoatlus\b/g, 'Ketsal-koatlus'], [/\bEuropasaurus\b/g, 'Europa-saurus'], [/\bRichard Owen\b/g, 'Ritschard Ouen'], [/\bSäugetiere(n)?\b/g, (m, e) => 'Säuge-tiere' + (e || '')],
  [/\b(Meso|Paläo|Käno)zoikum\b/g, (m, a) => a + 'zo-ikum'], [/\bSauropoden\b/g, 'Sauro-poden'], [/\bArgentinosaurus\b/g, 'Argentino-saurus'], [/\bTrilobiten\b/g, 'Trilo-bihten'],
  [/\bAmmoniten\b/g, 'Ammo-nihten'], [/\bTrici\b/g, 'Trizi'],
  [/\bVollbremsung\b/g, 'Voll-bremsung'], [/\bBadewanne\b/g, 'Bade-wanne'], [/\bmonatelang\b/g, 'monate-lang'], [/\bklitzekleine(s|n|r)?\b/g, (m, e) => 'klitze-kleine' + (e || '')], [/\bGezeitenreibung\b/g, 'Gezeiten-reibung'],
  [/\bPirouette(n)?\b/g, (m, e) => 'Piru-ette' + (e || '')], [/\bCorioliskraft\b/g, 'Korjohlis-kraft'], [/\bAstronaut(en|in|innen)?\b/g, (m, e) => 'Astro-naut' + (e || '')],
  [/\bStromkreis\b/g, 'Strom-kreis'], [/\bMobilfunk\b/g, 'Mobiel-funk'],
];

// ---------- Abkürzungen, Zeichen, Einheiten ----------
const ERSETZEN = [
  [/\bz\.\s?B\./g, 'zum Beispiel'], [/\bd\.\s?h\./g, 'das heißt'], [/\bu\.\s?a\./g, 'unter anderem'], [/\busw\./g, 'und so weiter'],
  [/\bbzw\./g, 'beziehungsweise'], [/\bca\./g, 'circa'], [/\bNr\./g, 'Nummer'], [/\bevtl\./g, 'eventuell'], [/\bggf\./g, 'gegebenenfalls'],
  [/\bDr\./g, 'Doktor'], [/\bProf\./g, 'Professor'], [/\bSt\./g, 'Sankt'], [/\bMio\./g, 'Millionen'], [/\bMrd\./g, 'Milliarden'],
  [/\bkm\/s\b/g, 'Kilometer pro Sekunde'], [/\bkm\/h\b/g, 'Kilometer pro Stunde'], [/\bm\/s²/g, 'Meter pro Sekunde zum Quadrat'], [/\bm\/s\b/g, 'Meter pro Sekunde'],
  [/°C\b/g, ' Grad Celsius'], [/°/g, ' Grad'], [/%/g, ' Prozent'], [/€/g, ' Euro'], [/\$/g, ' Dollar'],
  [/\bkm\b/g, 'Kilometer'], [/\bcm\b/g, 'Zentimeter'], [/\bmm\b/g, 'Millimeter'], [/\bkg\b/g, 'Kilogramm'], [/\bmin\b/g, 'Minuten'],
  [/\bKI\b/g, 'Ka I'], [/\bNASA\b/g, 'Nasa'], [/\bESA\b/g, 'Esa'], [/\bDNA\b/g, 'D N A'], [/\bDNS\b/g, 'D N S'], [/\bUSA\b/g, 'U S A'], [/\bTV\b/g, 'Fernsehen'],
  [/\bH₂O\b|\bH2O\b/g, 'H zwei O'], [/\bCO₂\b|\bCO2\b/g, 'C O zwei'], [/\bO₂\b|\bO2\b/g, 'O zwei'],
  [/²/g, ' hoch zwei'], [/³/g, ' hoch drei'], [/½/g, 'ein halb'], [/¼/g, 'ein viertel'], [/¾/g, 'drei viertel'],
  [/\s=\s|=/g, ' ist gleich '], [/\s[·×*]\s|[·×]/g, ' mal '], [/\s\+\s/g, ' plus '], [/\s[−-]\s(?=\d)/g, ' minus '], [/\s\/\s/g, ' geteilt durch '],
  [/\s>\s/g, ' ist größer als '], [/\s<\s/g, ' ist kleiner als '], [/\s≈\s/g, ' ist ungefähr '], [/→/g, ', dann '],
  [/\.{3}|…/g, ', '], [/\s[–—]\s/g, ', '], [/&/g, ' und '], [/#/g, ' Nummer '],
];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function aussprechen(text) {
  let s = String(text);
  // 1. feste Vorab-Regeln, dann eigene Wörter (ganze Wörter)
  for (const [re, ers] of VORHER) s = s.replace(re, ers);
  const eigene = eigeneLesen();
  for (const [wort, so] of Object.entries(eigene).sort((a, b) => b[0].length - a[0].length)) {
    // Großschreibung am Wortanfang zählt ("Weg" ≠ "weg"); ein kleingeschriebener Eintrag gilt auch am Satzanfang
    const erst = wort[0], rest = escapeRe(wort.slice(1));
    const anfang = erst === erst.toLowerCase() ? `[${escapeRe(erst)}${escapeRe(erst.toUpperCase())}]` : escapeRe(erst);
    s = s.replace(new RegExp('(^|[^\\p{L}])' + anfang + rest + '(?=$|[^\\p{L}])', 'gu'), (m, vor) => vor + (m.slice(vor.length)[0] !== erst && erst === erst.toLowerCase() ? so[0].toUpperCase() + so.slice(1) : so));
  }
  // 2. Wörter mit falscher Betonung, dann Abkürzungen und Zeichen
  for (const [re, ers] of WOERTER) s = s.replace(re, ers);
  for (const [re, ers] of ERSETZEN) s = s.replace(re, ers);
  // 3. Ordnungszahlen am Satzanfang wie "1." als "Erstens"
  s = s.replace(/(^|\n)\s*(\d+)\.\s/g, (m, a, n) => a + zahlWort(+n) + 'tens, ');
  // 4. Jahreszahlen 1100–1999 wie "neunzehnhundertneunundsechzig"
  s = s.replace(/\b(1[1-9])(\d{2})\b(?![.,]\d)/g, (m, a, b) => /\d{4}/.test(m) && +m >= 1100 ? zahlWort(+a) + 'hundert' + (+b ? unter1000(+b) : '') : m);
  // 5. restliche Zahlen
  s = s.replace(/\d{1,3}(?:\.\d{3})+|\d+[,.]\d+|\d+/g, z => ' ' + zahlText(z) + ' ');
  return s.replace(/\s+/g, ' ').replace(/\s([,.!?])/g, '$1').trim();
}

// ---------- Lautschrift: was die Stimme wirklich sagt (eSpeak-Phoneme über piper_phonemize) ----------
import { spawn } from 'node:child_process';
const PIPER_DIR = path.join(os.homedir(), '.local', 'share', 'blockfilm', 'piper', 'piper');
export function lautschrift(woerter) {
  return new Promise(ok => {
    const liste = [...new Set(woerter.map(w => String(w).replace(/\s+/g, ' ').trim()).filter(Boolean))];
    const erg = new Map();
    if (!liste.length) return ok(erg);
    let proc;
    try {
      proc = spawn('nice', ['-n', '15', path.join(PIPER_DIR, 'piper_phonemize'), '-l', 'de', '--espeak_data', path.join(PIPER_DIR, 'espeak-ng-data')], { env: { ...process.env, LD_LIBRARY_PATH: PIPER_DIR }, stdio: ['pipe', 'pipe', 'ignore'] });
    } catch { return ok(erg); }
    let aus = '';
    proc.stdout.on('data', d => { aus += d; });
    proc.on('error', () => ok(erg));
    proc.on('close', () => {
      const zeilen = aus.split('\n').filter(z => z.trim());
      zeilen.forEach((z, i) => { try { const j = JSON.parse(z); erg.set(liste[i], j.phonemes.join('')); } catch {} });
      ok(erg);
    });
    proc.stdin.end(liste.join('\n') + '\n');
  });
}
// Alle Sprecher-Texte aus einem Skript holen
export function sprecherTexte(skript) {
  const t = [];
  for (const z of String(skript).split('\n')) {
    const m = z.match(/^\s*&?\s*(?:&\d+(?:\.\d+)?\s+)?(sprecher|erzaehler|erzähler|erzaehlerin|erzählerin|vorlesen|sprich)(@[^\s]*)?\s+(.*)$/i);
    if (!m) continue;
    for (const q of m[3].matchAll(/"([^"]*)"|„([^“"]*)[“"]/g)) t.push(q[1] ?? q[2]);
  }
  return t;
}
