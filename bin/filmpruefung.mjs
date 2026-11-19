#!/usr/bin/env node
// Blockfilm: ein Skript prüfen, ohne die KI-Schnittstelle (kostet nichts). Gedacht für Claude Code (Befehl /waswaere).
//   node bin/filmpruefung.mjs film.txt [--alter 6-9] [--bilder ordner] [--anzahl 12] [--bei 12.5,40] [--aussprache]
// Gibt aus: Übersetzungsfehler (mit Zeile), Länge, Befunde der automatischen Regie-Prüfung.
// Mit --bilder: Standbilder (1280×720, je Satz Anfang/Ende) und das Vorschaubild als JPEG in den Ordner, dazu bilder.txt.
// Mit --bei: Standbilder genau zu diesen Sekunden (statt der automatischen Auswahl).
// Mit --aussprache: Tabelle „Wort | so bekommt es die Stimme | Lautschrift“ für alle nicht alltäglichen Wörter.
// Ende-Code: 0 = übersetzt ohne Fehler, 1 = Fehler im Skript, 2 = Prüfung selbst ging nicht.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
let datei = null, alter = null, bilderOrdner = null, anzahl = 12, bei = null, mitAussprache = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--alter') alter = args[++i];
  else if (a === '--bilder') bilderOrdner = path.resolve(args[++i]);
  else if (a === '--anzahl') anzahl = Math.max(1, Math.min(26, parseInt(args[++i], 10) || 12));
  else if (a === '--bei') bei = String(args[++i]).split(',').map(Number).filter(n => Number.isFinite(n) && n >= 0);
  else if (a === '--aussprache') mitAussprache = true;
  else if (!a.startsWith('-')) datei = path.resolve(a);
}
if (!datei || !fs.existsSync(datei)) { console.error('Aufruf: node bin/filmpruefung.mjs film.txt [--alter 3-5] [--bilder ordner] [--anzahl 12] [--bei 12.5,40] [--aussprache]'); process.exit(2); }
const roh = fs.readFileSync(datei, 'utf8');
const kiZeile = roh.split('\n').find(z => z.startsWith('#KI '));
if (!alter && kiZeile) { try { alter = JSON.parse(kiZeile.slice(4)).alter || null; } catch {} }
if (!alter) alter = (/^\s*zielgruppe\s+(\S+)/m.exec(roh) || [])[1] || '6-9';

const freierPort = () => new Promise((ok, nein) => { const s = net.createServer(); s.on('error', nein); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const zeit = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

let serverProc = null, browser = null;
async function aufraeumen() {
  if (browser) await browser.close().catch(() => {});
  if (serverProc) try { serverProc.kill('SIGTERM'); } catch {}
}
process.on('SIGINT', () => aufraeumen().then(() => process.exit(130)));
process.on('SIGTERM', () => aufraeumen().then(() => process.exit(143)));

async function aussprache(skript) {
  const { sprecherTexte, aussprechen, lautschrift } = await import(path.join(HIER, 'aussprache.mjs'));
  const HAEUFIG = new Set('der die das und ist ein eine einen einem einer es er sie wir ihr du ich in im an am auf aus mit von zu zum zur nicht noch auch so wie was wer wo da dann wenn man hat haben sind war sein ganz viel viele sehr schon nur oder aber den dem des bei nach für über unter vor kann können muss gibt jetzt hier dort mal ja nein'.split(' '));
  const woerter = new Set();
  for (const satz of sprecherTexte(skript)) for (const w of satz.match(/[\p{L}][\p{L}\p{N}'’-]*/gu) || []) if (!HAEUFIG.has(w.toLowerCase())) woerter.add(w);
  const liste = [...woerter].map(w => [w, aussprechen(w)]);
  const ipa = await lautschrift(liste.map(([, g]) => g));
  console.log(`\nAUSSPRACHE (${liste.length} Wörter): Wort | so bekommt es die Stimme | Lautschrift`);
  if (!ipa.size) { console.log('  (Lautschrift nicht verfügbar – ist die Stimme installiert?)'); return; }
  for (const [w, g] of liste) console.log(`  ${w} | ${g} | ${ipa.get(g) || '?'}`);
  console.log('Falsch klingende Wörter: Ersatz-Schreibweise in ~/Blockfilm/aussprache.json eintragen ({"Wort": "Ersatz"}).');
}

let code = 0;
try {
  const port = await freierPort();
  serverProc = spawn('nice', ['-n', '15', process.execPath, path.join(HIER, 'server.mjs'), '--server'], { env: { ...process.env, BF_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, nein) => {
    const uhr = setTimeout(() => nein(new Error('Der Blockfilm-Server startet nicht.')), 20000);
    serverProc.stdout.on('data', d => { if (String(d).includes('läuft auf')) { clearTimeout(uhr); ok(); } });
    serverProc.on('exit', c => { clearTimeout(uhr); nein(new Error('Server beendet (Code ' + c + ')')); });
  });
  const { default: puppeteer } = await import('puppeteer-core');
  const chromium = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(p => fs.existsSync(p));
  browser = await puppeteer.launch({ executablePath: chromium, args: ['--no-sandbox', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const basis = `http://127.0.0.1:${port}`;
  const app = await browser.newPage();
  // keine Stimme rechnen lassen (das wäre teuer und ist für die Prüfung unnötig)
  await app.setRequestInterception(true);
  app.on('request', r => (/\/api\/(sprechen|ki|stapel|schreiben|hf|video|tagesvideo)/.test(new URL(r.url()).pathname) ? r.abort() : r.continue()));
  await app.goto(basis + '/', { waitUntil: 'load', timeout: 60000 });
  await app.waitForFunction(() => window.BF_UI && window.BF && BF.hf && BF.kompiliere, { timeout: 60000 });
  const erg = await app.evaluate((roh, alter, anzahl, bei) => {
    const skript = roh.split('\n').filter(z => !z.startsWith('#KI ')).join('\n');
    BF.hf.standardAlter = alter;
    const F = BF.kompiliere(skript);
    const o = { fehler: F.fehler || [], dauer: F.dauer, saetze: (F.sprache || []).length, kapitel: (F.kapitel || []).length || undefined, flach: BF.hf.passt(F), wasWaere: BF.filmIstWasWaere ? !!BF.filmIstWasWaere(F) : undefined, befunde: [], momente: [], html: null };
    if (o.fehler.length || !o.flach) return o;
    o.befunde = BF.hf.regieBefunde(F, skript);
    const sp = F.sprache || [];
    o.momente = bei && bei.length
      ? bei.map(t => { const s = sp.find(x => t >= x.t0 && t <= x.t1); return { t, satz: s ? s.text : '', teil: '' }; })
      : BF.hf.regieMomente(F, anzahl);
    o.html = BF.hf.komponiere(F, { skript, sprachDauer: Object.assign({}, BF.sprachDauer), alter, breite: 1280, hoehe: Math.round(1280 * (F.hoehe || 1080) / (F.breite || 1920)), vorschau: true, ton: null, basis: '/' });
    return o;
  }, roh, alter, anzahl, bei);

  console.log(`FILM: ${path.basename(datei)} · Zielgruppe ${alter} · ${erg.saetze} Sprecher-Sätze · etwa ${zeit(erg.dauer)} min geschätzt (mit echter Stimme ungefähr ${zeit(erg.dauer * 0.8)})`);
  if (erg.fehler.length) {
    code = 1;
    console.log(`\nFEHLER BEIM ÜBERSETZEN (${erg.fehler.length}):`);
    for (const f of erg.fehler.slice(0, 40)) console.log(`  Zeile ${f.zeile + (kiZeile ? 1 : 0)}: ${f.text}`);
  } else {
    console.log('\nÜbersetzt ohne Fehler.');
    if (!erg.flach) console.log('ACHTUNG: Der Film nutzt nicht nur die 2D-Welt (3D-Blockwelt, Figuren oder Videoclips). Dann gibt es keinen flachen Erklärvideo-Look und keine Standbilder. Für Was-wäre-wenn-Filme nur 2D-Befehle benutzen.');
    console.log(erg.befunde.length ? `\nBEFUNDE DER AUTOMATISCHEN PRÜFUNG (${erg.befunde.length}):` : '\nAutomatische Prüfung: nichts gefunden.');
    for (const b of erg.befunde.slice(0, 40)) console.log('  - ' + b);
  }

  if (bilderOrdner && erg.html && erg.momente.length) {
    fs.mkdirSync(bilderOrdner, { recursive: true });
    for (const f of fs.readdirSync(bilderOrdner)) if (/^(bild-\d+|vorschaubild)\.jpg$|^bilder\.txt$/.test(f)) fs.rmSync(path.join(bilderOrdner, f), { force: true });
    const seite = await browser.newPage();
    await seite.setViewport({ width: 1280, height: 720 });
    await seite.setRequestInterception(true);
    seite.on('request', r => (new URL(r.url()).pathname === '/hf-pruefung.html' ? r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: erg.html }) : r.continue()));
    await seite.goto(basis + '/hf-pruefung.html', { waitUntil: 'load', timeout: 60000 });
    await seite.evaluate(() => document.fonts.ready);
    await seite.waitForFunction(() => typeof window.__bfZeige === 'function', { timeout: 30000 });
    const liste = [];
    let n = 0;
    for (const m of erg.momente) {
      await seite.evaluate(t => window.__bfZeige(t), Number(m.t) || 0);
      const name = `bild-${String(++n).padStart(2, '0')}.jpg`;
      await seite.screenshot({ path: path.join(bilderOrdner, name), type: 'jpeg', quality: 70 });
      liste.push(`${name} · ${zeit(m.t)} (${m.t} s)${m.teil ? ' · ' + m.teil + ' des Satzes' : ''} · Sprecher: „${m.satz || '(nichts)'}“`);
    }
    try {
      // frisch laden: sonst bleiben auf der Zeichenfläche Reste vom letzten Standbild stehen (Zähler, Funkwellen)
      await seite.goto(basis + '/hf-pruefung.html', { waitUntil: 'load', timeout: 60000 });
      await seite.evaluate(() => document.fonts.ready);
      await seite.waitForFunction(() => typeof window.__bfVorschaubild === 'function', { timeout: 30000 });
      if (await seite.evaluate(() => typeof window.__bfVorschaubild === 'function')) {
        const info = await seite.evaluate(() => window.__bfVorschaubild());
        await seite.evaluate(() => document.fonts.ready);
        await new Promise(r => setTimeout(r, 300));
        await seite.screenshot({ path: path.join(bilderOrdner, 'vorschaubild.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1280, height: 720 } });
        liste.push(`vorschaubild.jpg · Vorschaubild (Moment ${info && info.t != null ? Math.round(info.t * 10) / 10 + ' s' : '?'}, Text „${(info && info.text) || ''}“)`);
      }
    } catch (e) { liste.push('(Vorschaubild ging nicht: ' + e.message + ')'); }
    fs.writeFileSync(path.join(bilderOrdner, 'bilder.txt'), liste.join('\n') + '\n');
    console.log(`\nSTANDBILDER in ${bilderOrdner}:`);
    for (const z of liste) console.log('  ' + z);
  }
  if (mitAussprache) await aussprache(roh);
} catch (e) {
  console.error('Prüfung ging nicht: ' + (e && e.message || e));
  code = 2;
}
await aufraeumen();
process.exit(code);
