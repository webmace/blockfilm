#!/usr/bin/env node
// Blockfilm – lokaler Server: liefert das Programm aus, liest/speichert Skripte und baut Videos mit ffmpeg.
// Aufrufe:
//   node server.mjs [skript.txt]                 Programm-Fenster öffnen
//   node server.mjs --render skript.txt [-o x.mp4] [--4k]   Video ohne Fenster erstellen
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { kiSkript, kiBereit, einstellungenSchreiben, kiAussprache, kiRegie } from './ki.mjs';
import { aussprechen, eigeneLesen, eigeneSchreiben, lautschrift } from './aussprache.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HIER, 'app');
const HOME = os.homedir();
const SKRIPTE = path.join(HOME, 'Blockfilm', 'Skripte');
const VIDEOS = path.join(HOME, 'Videos', 'Blockfilm');
const BEISPIELE = path.join(HIER, 'beispiele');
fs.mkdirSync(SKRIPTE, { recursive: true });
fs.mkdirSync(VIDEOS, { recursive: true });

const args = process.argv.slice(2);
const renderModus = args.includes('--render');
const nurServer = args.includes('--server');
const nurBild = args.includes('--nurbild'); // mit --render: nur das Vorschaubild machen (-o bild.jpg)
let ausDatei = null, skriptDatei = null, extraAufl = null, renderStimme = null, renderTempo = null, renderAlter = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--render' || a === '--server') continue;
  if (a === '-o' || a === '--aus') { ausDatei = path.resolve(args[++i]); continue; }
  if (a === '--stimme') { renderStimme = args[++i]; continue; }
  if (a === '--sprechtempo') { renderTempo = args[++i]; continue; }
  if (a === '--alter') { renderAlter = args[++i]; continue; }
  if (a === '--4k') { extraAufl = '4k'; continue; }
  if (a === '--1080p') { extraAufl = '1080p'; continue; }
  if (a === '--720p') { extraAufl = '720p'; continue; }
  if (!a.startsWith('-')) skriptDatei = path.resolve(a);
}

const TYPEN = { '.webp': 'image/webp', '.gif': 'image/gif', '.wav': 'audio/wav', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

function koerper(req) {
  return new Promise((ok, nein) => {
    const teile = [];
    req.on('data', d => teile.push(d));
    req.on('end', () => ok(Buffer.concat(teile)));
    req.on('error', nein);
  });
}
const json = (res, o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
const pfadAus = (p, basis) => {
  if (!p) return null;
  if (p.startsWith('~/')) p = path.join(HOME, p.slice(2));
  return path.resolve(basis || SKRIPTE, p);
};

const MATERIAL = path.join(HOME, 'Blockfilm', 'Material');
fs.mkdirSync(MATERIAL, { recursive: true });
const CACHE = path.join(HOME, '.cache', 'blockfilm');
// Datei suchen: absolut, neben dem Skript, im Material-Ordner, in ~/Videos, im Home-Ordner
function findeDatei(p, basis) {
  if (!p) throw new Error('kein Dateiname');
  if (p.startsWith('~/')) p = path.join(HOME, p.slice(2));
  const kandidaten = path.isAbsolute(p) ? [p] : [basis && path.join(basis, p), path.join(MATERIAL, p), path.join(SKRIPTE, p), path.join(HOME, 'Videos', p), path.join(HOME, p), path.join(BEISPIELE, p)].filter(Boolean);
  for (const k of kandidaten) if (fs.existsSync(k)) return k;
  throw new Error(`Datei „${p}“ nicht gefunden (gesucht in: Skript-Ordner, ${MATERIAL}, ~/Videos)`);
}
function lauf(cmd, a) {
  return new Promise((ok, nein) => {
    const pr = spawn(cmd, a, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    pr.stdout.on('data', d => { out += d; });
    pr.stderr.on('data', d => { err += d; });
    pr.on('close', c => (c === 0 ? ok(out) : nein(new Error(err.slice(-400) || cmd + ' Fehler ' + c))));
  });
}
const proxyLaeuft = {};
async function videoInfo(datei) {
  const st = fs.statSync(datei);
  const j = JSON.parse(await lauf('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', datei]));
  const v = j.streams.find(x => x.codec_type === 'video');
  if (!v) throw new Error('In der Datei ist kein Video');
  const a = j.streams.find(x => x.codec_type === 'audio');
  const dauer = parseFloat(j.format.duration || v.duration || 0);
  const [fz, fn] = (v.avg_frame_rate || '30/1').split('/').map(Number);
  const direkt = /\.(mp4|m4v|mov|webm)$/i.test(datei) && ['h264', 'vp8', 'vp9', 'av1'].includes(v.codec_name) && /^yuvj?420p$/.test(v.pix_fmt || '');
  let url = '/api/roh?p=' + encodeURIComponent(datei);
  if (!direkt) {
    // in ein abspielbares MP4 umwandeln (einmalig, wird zwischengespeichert)
    const ziel = path.join(CACHE, 'proxy', Buffer.from(datei + st.mtimeMs).toString('base64url').slice(-60) + '.mp4');
    if (!fs.existsSync(ziel)) {
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      if (!proxyLaeuft[ziel]) proxyLaeuft[ziel] = lauf('ffmpeg', ['-y', '-v', 'error', '-i', datei, '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-g', '15', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', ziel + '.tmp.mp4']).then(() => fs.renameSync(ziel + '.tmp.mp4', ziel));
      await proxyLaeuft[ziel];
    }
    url = '/api/roh?p=' + encodeURIComponent(ziel);
  }
  return { pfad: datei, dauer, breite: v.width, hoehe: v.height, fps: fn ? fz / fn : 30, ton: !!a, url, umgewandelt: !direkt };
}
function dateiMitBereich(req, res, f) {
  const st = fs.statSync(f);
  const typ = TYPEN[path.extname(f).toLowerCase()] || (/\.(mp4|m4v|mov)$/i.test(f) ? 'video/mp4' : /\.webm$/i.test(f) ? 'video/webm' : 'application/octet-stream');
  const r = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (r) {
    const start = r[1] ? parseInt(r[1]) : 0, ende = r[2] ? parseInt(r[2]) : st.size - 1;
    res.writeHead(206, { 'content-type': typ, 'content-range': `bytes ${start}-${ende}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': ende - start + 1 });
    fs.createReadStream(f, { start, end: ende }).pipe(res);
  } else {
    res.writeHead(200, { 'content-type': typ, 'accept-ranges': 'bytes', 'content-length': st.size });
    fs.createReadStream(f).pipe(res);
  }
}

let video = null; // laufender Export

// ---------- Sprachausgabe (Piper, offline) ----------
const PIPER_ORDNER = path.join(HOME, '.local', 'share', 'blockfilm', 'piper');
const PIPER = path.join(PIPER_ORDNER, 'piper', 'piper');
const STIMMEN = path.join(PIPER_ORDNER, 'stimmen');
const TTS_CACHE = path.join(HOME, '.cache', 'blockfilm', 'sprache');
const STIMM_NAMEN = {
  'thorsten-high': 'Thorsten (Mann, klar)', 'thorsten-medium': 'Thorsten (Mann)', 'kerstin': 'Kerstin (Frau)', 'ramona': 'Ramona (Frau)',
  'karlsson': 'Karlsson (Mann, tief)', 'pavoque': 'Pavoque (Mann)', 'eva_k': 'Eva (Frau, einfach)',
};
const GEFUEHLE = { amused: 'fröhlich', neutral: 'ruhig', surprised: 'staunend', whisper: 'flüsternd', sleepy: 'müde' };
function stimmenListe() {
  // Dateinamen; Stimmen mit mehreren Sprechern (z. B. thorsten_emotional) als "datei#sprecher"
  const out = [];
  let dateien = [];
  try { dateien = fs.readdirSync(STIMMEN).filter(f => f.endsWith('.onnx')).map(f => f.replace(/\.onnx$/, '')); } catch { return []; }
  for (const d of dateien.sort()) {
    let karte = null;
    try { karte = JSON.parse(fs.readFileSync(path.join(STIMMEN, d + '.onnx.json'), 'utf8')).speaker_id_map; } catch {}
    if (karte && Object.keys(karte).length > 1) { for (const sp of Object.keys(karte)) if (GEFUEHLE[sp]) out.push(d + '#' + sp); }
    else out.push(d);
  }
  return out;
}
function stimmenAnzeige() {
  return stimmenListe().map(id => {
    const [d, sp] = id.split('#');
    let name = Object.entries(STIMM_NAMEN).find(([k]) => d.includes(k));
    name = name ? name[1] : d.replace(/^de_DE-/, '');
    if (d.includes('thorsten_emotional')) name = 'Thorsten ' + (GEFUEHLE[sp] || sp);
    return { id, name };
  });
}
function stimmeFinden(name) {
  const l = stimmenListe();
  if (!l.length) return null;
  if (name) { if (l.includes(name)) return name; const n = name.toLowerCase(); const f = l.find(s => s.toLowerCase().includes(n)); if (f) return f; }
  return l.find(s => s.includes('thorsten-high')) || l.find(s => s.includes('thorsten')) || l[0];
}
function sprechen(text, stimme, tempo) {
  return new Promise((ok, nein) => {
    const st = stimmeFinden(stimme);
    if (!fs.existsSync(PIPER) || !st) return nein(new Error('Piper ist nicht installiert'));
    fs.mkdirSync(TTS_CACHE, { recursive: true });
    text = aussprechen(text); // Zahlen, Abkürzungen, eigene Wörter
    const key = crypto.createHash('sha1').update(`${st}|${tempo}|${text}`).digest('hex');
    const roh = path.join(TTS_CACHE, key + '.wav');            // so, wie Piper es liefert
    const ziel = path.join(TTS_CACHE, key + '-knapp.wav');     // Stille am Anfang und Ende abgeschnitten
    if (fs.existsSync(ziel)) return ok(ziel);
    const kuerzen = () => { try { stilleAbschneiden(roh, ziel); ok(ziel); } catch (e) { ok(roh); } };
    if (fs.existsSync(roh)) return kuerzen();
    const [datei, sprecher] = st.split('#');
    let sprecherId = null;
    if (sprecher) { try { sprecherId = JSON.parse(fs.readFileSync(path.join(STIMMEN, datei + '.onnx.json'), 'utf8')).speaker_id_map[sprecher]; } catch {} }
    const tmp = roh + '.tmp.wav';
    const pr = piperProzess(datei, tempo || 1);
    pr.warte.set(tmp, { ok: () => { try { fs.renameSync(tmp, roh); kuerzen(); } catch (e) { nein(e); } }, nein });
    const zeile = { text: text.replace(/\s+/g, ' '), output_file: tmp };
    if (sprecherId !== null && sprecherId !== undefined) zeile.speaker_id = sprecherId;
    pr.proc.stdin.write(JSON.stringify(zeile) + '\n');
  });
}
// Piper hängt vor und nach jedem Satz Stille an (zusammen oft 0,3–0,5 s). Die schneiden wir ab,
// damit die Sätze flüssig aufeinander folgen; die Pause dazwischen regelt dann allein "sprechpause".
function stilleAbschneiden(von, nach, schwelle = 450, vorne = 0.03, hinten = 0.07) {
  const b = fs.readFileSync(von);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('kein WAV');
  let pos = 12, fmt = null, daten = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4), len = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') fmt = { kanaele: b.readUInt16LE(pos + 10), rate: b.readUInt32LE(pos + 12), bits: b.readUInt16LE(pos + 22) };
    if (id === 'data') { daten = { start: pos + 8, len: Math.min(len, b.length - pos - 8) }; break; }
    pos += 8 + len + (len % 2);
  }
  if (!fmt || !daten || fmt.bits !== 16) throw new Error('WAV-Format nicht unterstützt');
  const schritt = 2 * fmt.kanaele, n = Math.floor(daten.len / schritt);
  const laut = i => { for (let k = 0; k < fmt.kanaele; k++) if (Math.abs(b.readInt16LE(daten.start + i * schritt + k * 2)) > schwelle) return true; return false; };
  let a = 0; while (a < n && !laut(a)) a++;
  let e = n - 1; while (e > a && !laut(e)) e--;
  if (a >= e) { fs.copyFileSync(von, nach); return; }
  a = Math.max(0, a - Math.round(vorne * fmt.rate)); e = Math.min(n - 1, e + Math.round(hinten * fmt.rate));
  const pcm = b.subarray(daten.start + a * schritt, daten.start + (e + 1) * schritt);
  const kopf = Buffer.alloc(44);
  kopf.write('RIFF', 0); kopf.writeUInt32LE(36 + pcm.length, 4); kopf.write('WAVE', 8); kopf.write('fmt ', 12);
  kopf.writeUInt32LE(16, 16); kopf.writeUInt16LE(1, 20); kopf.writeUInt16LE(fmt.kanaele, 22); kopf.writeUInt32LE(fmt.rate, 24);
  kopf.writeUInt32LE(fmt.rate * schritt, 28); kopf.writeUInt16LE(schritt, 32); kopf.writeUInt16LE(16, 34); kopf.write('data', 36); kopf.writeUInt32LE(pcm.length, 40);
  const tmp = nach + '.tmp';
  fs.writeFileSync(tmp, Buffer.concat([kopf, pcm]));
  fs.renameSync(tmp, nach);
}
// Mehrere Piper-Prozesse pro Stimme, damit mehrere Sätze gleichzeitig eingelesen werden (4 Kerne → bis zu 3)
const piperPool = new Map();
const PIPER_MAX = Math.max(1, Math.min(3, os.cpus().length - 1));
function piperProzess(datei, tempo) {
  const k = datei + '|' + tempo;
  const liste = (piperPool.get(k) || []).filter(p => !p.tot);
  piperPool.set(k, liste);
  const frei = liste.slice().sort((a, b) => a.warte.size - b.warte.size)[0];
  if (frei && (frei.warte.size === 0 || liste.length >= PIPER_MAX)) return frei;
  // insgesamt nie mehr als PIPER_MAX Prozesse: untätige Prozesse anderer Stimmen/Tempi beenden
  const alle = [...piperPool.values()].flat().filter(p => !p.tot);
  if (alle.length >= PIPER_MAX) {
    const untaetig = alle.find(p => p.warte.size === 0 && !liste.includes(p));
    if (untaetig) { untaetig.tot = true; try { untaetig.proc.kill(); } catch {} }
    else if (frei) return frei;
  }
  // in der App mit normaler Priorität (man wartet darauf), beim Export im Hintergrund niedriger
  const proc = spawn('nice', ['-n', renderModus ? '15' : '0', PIPER, '--model', path.join(STIMMEN, datei + '.onnx'), '--json-input', '--length_scale', String(1 / tempo), '--sentence_silence', '0.15'], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pr = { proc, warte: new Map(), tot: false, puffer: '', fehler: '' };
  proc.stdout.on('data', d => {
    pr.puffer += d.toString();
    let i;
    while ((i = pr.puffer.indexOf('\n')) >= 0) {
      const zeile = pr.puffer.slice(0, i).trim();
      pr.puffer = pr.puffer.slice(i + 1);
      const w = pr.warte.get(zeile);
      if (w) { pr.warte.delete(zeile); w.ok(); }
    }
  });
  proc.stderr.on('data', d => { pr.fehler = (pr.fehler + d).slice(-500); });
  proc.stdin.on('error', () => {});
  proc.on('close', () => {
    pr.tot = true;
    for (const w of pr.warte.values()) w.nein(new Error('Piper-Fehler: ' + pr.fehler.slice(-300)));
    pr.warte.clear();
  });
  liste.push(pr);
  return pr;
}
process.on('exit', () => { for (const l of piperPool.values()) for (const pr of l) try { pr.proc.kill(); } catch {} });
let tonDatei = null;

// ---------- Hintergrund-Exporte nacheinander (Film-Übersicht) ----------
// Jeder Film wird mit "server.mjs --render" in einem eigenen Prozess gebaut; so erscheint er auch in der Export-Übersicht.
const stapel = { warten: [], laeuft: null, fertig: [] };
const STAPEL_ORDNER = path.join(CACHE, 'stapel');
const sicherName = n => (String(n || 'film').replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim().replace(/\s+/g, '_') || 'film').slice(0, 80);
function stapelHinzu(o) {
  const aufl = ['720p', '1080p', '4k'].includes(o.aufl) ? o.aufl : '1080p';
  let n = 0;
  for (const f of (o.filme || []).slice(0, 100)) {
    let datei = f.pfad ? path.resolve(String(f.pfad)) : null;
    if (!datei && f.text) {
      fs.mkdirSync(STAPEL_ORDNER, { recursive: true });
      datei = path.join(STAPEL_ORDNER, sicherName(f.name) + '.txt');
      fs.writeFileSync(datei, String(f.text));
    }
    if (!datei || !fs.existsSync(datei)) continue;
    if (stapel.warten.some(w => w.datei === datei)) continue; // wartet schon (liest das Skript erst beim Start, also die neueste Fassung)
    const stempel = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    stapel.warten.push({ datei, name: String(f.name || path.basename(datei, '.txt')), ziel: path.join(VIDEOS, `${sicherName(f.name)}_${stempel}.mp4`), aufl, stimme: o.stimme || null, tempo: o.tempo || null, alter: o.alter || null });
    n++;
  }
  stapelWeiter();
  return n;
}
function stapelWeiter() {
  if (stapel.laeuft || !stapel.warten.length) return;
  const j = stapel.laeuft = stapel.warten.shift();
  const a = [path.join(HIER, 'server.mjs'), '--render', j.datei, '-o', j.ziel, '--' + j.aufl];
  if (j.stimme) a.push('--stimme', j.stimme);
  if (j.tempo) a.push('--sprechtempo', j.tempo);
  if (j.alter) a.push('--alter', j.alter);
  // niedrigste Priorität für CPU und Festplatte, damit die App flüssig bleibt
  const proc = spawn('nice', ['-n', '19', 'ionice', '-c', '3', process.execPath, ...a], { stdio: 'ignore', cwd: HIER });
  proc.on('exit', code => {
    stapel.fertig.unshift({ name: j.name, ziel: j.ziel, ok: code === 0 });
    stapel.fertig.length = Math.min(stapel.fertig.length, 30);
    stapel.laeuft = null;
    stapelWeiter();
  });
}
function stapelStatus() {
  return { laeuft: stapel.laeuft && { name: stapel.laeuft.name, datei: stapel.laeuft.datei }, warten: stapel.warten.map(w => ({ name: w.name, datei: w.datei })), fertig: stapel.fertig.slice(0, 10) };
}

// ---------- Regie-Prüfung: Standbilder der Komposition mit Chromium (Puppeteer) ----------
const regieSeiten = new Map();
async function regieBilder(html, momente) {
  if (!html || !momente.length) return [];
  const id = crypto.randomBytes(6).toString('hex');
  regieSeiten.set(id, html);
  const { default: puppeteer } = await import('puppeteer-core');
  const b = await puppeteer.launch({ executablePath: chromiumPfad(), args: ['--no-sandbox', '--hide-scrollbars'] });
  try {
    const seite = await b.newPage();
    await seite.setViewport({ width: 1280, height: 720 });
    await seite.goto(`http://127.0.0.1:${server.address().port}/hf-regie/${id}.html`, { waitUntil: 'load', timeout: 60000 });
    await seite.evaluate(() => document.fonts.ready);
    await seite.waitForFunction(() => typeof window.__bfZeige === 'function', { timeout: 30000 });
    const out = [];
    for (const m of momente) {
      await seite.evaluate(t => window.__bfZeige(t), Number(m.t) || 0);
      const daten = await seite.screenshot({ type: 'jpeg', quality: 72, encoding: 'base64' });
      out.push({ t: m.t, satz: String(m.satz || '').slice(0, 300), daten });
    }
    return out;
  } finally {
    regieSeiten.delete(id);
    await b.close().catch(() => {});
  }
}

// ---------- Vorschaubild (Thumbnail): ein Standbild der Komposition mit großem Titel, als JPEG neben dem Video ----------
const bildZuVideo = v => String(v).replace(/(\.teil)?\.mp4$/i, '') + '.jpg';
async function vorschaubildMachen(html, ziel) {
  const id = crypto.randomBytes(6).toString('hex');
  regieSeiten.set(id, html);
  const { default: puppeteer } = await import('puppeteer-core');
  const b = await puppeteer.launch({ executablePath: chromiumPfad(), args: ['--no-sandbox', '--hide-scrollbars'] });
  try {
    const seite = await b.newPage();
    const m = /data-width="(\d+)" data-height="(\d+)"/.exec(html), w = m ? +m[1] : 1280, h = m ? +m[2] : 720;
    await seite.setViewport({ width: w, height: h, deviceScaleFactor: 1920 / w });
    await seite.goto(`http://127.0.0.1:${server.address().port}/hf-regie/${id}.html`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForFunction(() => typeof window.__bfVorschaubild === 'function', { timeout: 30000 });
    const info = await seite.evaluate(() => window.__bfVorschaubild());
    await seite.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 300));
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    await seite.screenshot({ path: ziel, type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: w, height: h } });
    if (process.env.BF_DEBUG) console.log(JSON.stringify(info));
    return { ok: true, datei: ziel, ...info };
  } finally {
    regieSeiten.delete(id);
    await b.close().catch(() => {});
  }
}

// ---------- HyperFrames: Komposition in einen Projektordner schreiben und mit @hyperframes/producer rendern ----------
let hfJob = null;
const HF_ORDNER = path.join(CACHE, 'hf');
function chromiumPfad() {
  for (const p of [process.env.PRODUCER_HEADLESS_SHELL_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']) if (p && fs.existsSync(p)) return p;
  return null;
}
async function hfStarten(o) {
  const fps = Math.max(1, Math.round(Number(o.fps) || 30));
  const name = (o.name || 'blockfilm').replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim().replace(/\s+/g, '_') || 'blockfilm';
  const stempel = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const ziel = o.aus ? path.resolve(o.aus) : path.join(VIDEOS, `${name}_${stempel}.mp4`);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  // Projektordner: index.html + die Engine-Skripte, Schriften und der fertig gemischte Ton
  const ordner = path.join(HF_ORDNER, `${stempel}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(ordner, { recursive: true });
  fs.writeFileSync(path.join(ordner, 'index.html'), String(o.html || ''));
  fs.cpSync(path.join(APP, 'js'), path.join(ordner, 'js'), { recursive: true });
  fs.cpSync(path.join(APP, 'vendor'), path.join(ordner, 'vendor'), { recursive: true, filter: q => !q.includes(path.sep + 'twemoji') });
  // von den Emoji-Grafiken nur die, die der Film wirklich benutzt
  const emojis = new Set([...String(o.html || '').matchAll(/vendor\/twemoji\/([0-9a-f-]+)\.svg/g)].map(m => m[1]));
  if (emojis.size) {
    fs.mkdirSync(path.join(ordner, 'vendor', 'twemoji'), { recursive: true });
    for (const n of emojis) { const q = path.join(APP, 'vendor', 'twemoji', n + '.svg'); if (fs.existsSync(q)) fs.copyFileSync(q, path.join(ordner, 'vendor', 'twemoji', n + '.svg')); }
  }
  if (o.ton && tonDatei && fs.existsSync(tonDatei)) fs.copyFileSync(tonDatei, path.join(ordner, 'ton.wav'));
  if (!process.env.PRODUCER_HEADLESS_SHELL_PATH) { const c = chromiumPfad(); if (c) process.env.PRODUCER_HEADLESS_SHELL_PATH = c; }
  // schneller: Grafikkarte benutzen, wenn sie geht (sonst fällt HyperFrames auf die CPU zurück), und mehrere Bilder parallel
  if (!process.env.PRODUCER_BROWSER_GPU_MODE) process.env.PRODUCER_BROWSER_GPU_MODE = 'auto';
  const worker = Number(process.env.BF_HF_WORKER) || Math.max(1, Math.min(3, os.cpus().length - 1));
  const { createRenderJob, executeRenderJob } = await import('@hyperframes/producer');
  // höchste Qualität: Bilder verlustfrei aufnehmen (JPEG 100) und mit sehr niedriger CRF kodieren (BF_HF_CRF, Standard 12)
  const entwurf = o.qualitaet === 'entwurf';
  const job = createRenderJob({ fps: { num: fps, den: 1 }, quality: entwurf ? 'draft' : 'high', ...(entwurf ? {} : { crf: Number(process.env.BF_HF_CRF) || 12 }), format: 'mp4', workers: worker });
  const abbruch = new AbortController();
  const J = hfJob = { ziel, ordner, abbruch, start: Date.now(), anteil: 0, text: 'Starte …', bild: null, bilder: null, fertig: false, ok: null, fehler: null, abgebrochen: false };
  executeRenderJob(job, ordner, ziel, (j, msg) => {
    const m = /frame (\d+)\s*\/\s*(\d+)/i.exec(msg || '');
    if (m) { J.bild = +m[1]; J.bilder = +m[2]; }
    const p = Number(j && j.progress);
    if (Number.isFinite(p)) J.anteil = Math.max(J.anteil, Math.min(1, p / 100));
    J.text = String(msg || '');
  }, abbruch.signal).then(async () => {
    if (o.bildHtml) { J.text = 'Vorschaubild …'; try { await vorschaubildMachen(String(o.bildHtml), bildZuVideo(ziel)); } catch (e) { console.error('Vorschaubild ging nicht:', e.message); } }
    J.ok = true; J.anteil = 1;
  }).catch(e => {
    J.ok = false; J.fehler = J.abgebrochen ? 'abgebrochen' : String(e && e.message || e);
    if (J.abgebrochen) try { fs.rmSync(ziel, { force: true }); } catch {}
  }).finally(() => {
    J.fertig = true;
    if (!process.env.BF_HF_BEHALTEN) try { fs.rmSync(ordner, { recursive: true, force: true }); } catch {}
  });
  return { ok: true, datei: ziel };
}
function hfStatus() {
  const J = hfJob;
  if (!J) return { aktiv: false };
  const verg = (Date.now() - J.start) / 1000;
  const rest = J.anteil > 0.03 && !J.fertig ? verg / J.anteil * (1 - J.anteil) : null;
  let groesse = null;
  if (J.fertig && J.ok) try { groesse = fs.statSync(J.ziel).size; } catch {}
  const text = J.fertig ? (J.ok ? 'Fertig' : 'Fehler: ' + J.fehler)
    : J.bild ? `Bild ${J.bild} von ${J.bilder}${rest !== null ? ' · noch etwa ' + (rest > 90 ? Math.round(rest / 60) + ' min' : Math.round(rest) + ' s') : ''}`
    : /encod|assembl|mux/i.test(J.text) ? 'Video wird fertig verpackt …' : 'Bereite vor …';
  return { aktiv: !J.fertig, fertig: J.fertig, ok: J.ok, fehler: J.fehler, anteil: J.anteil, text, datei: J.ziel, groesse };
}

function liste(ordner) {
  try {
    return fs.readdirSync(ordner).filter(f => /\.(txt|blockfilm|bf)$/i.test(f)).map(f => {
      const p = path.join(ordner, f);
      return { name: f, pfad: p, zeit: fs.statSync(p).mtimeMs };
    }).sort((a, b) => b.zeit - a.zeit);
  } catch { return []; }
}

async function anfrage(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/api/info') {
      let text = null;
      if (skriptDatei && fs.existsSync(skriptDatei)) text = fs.readFileSync(skriptDatei, 'utf8');
      let einst = {}; try { einst = JSON.parse(fs.readFileSync(path.join(HOME, 'Blockfilm', 'einstellungen.json'), 'utf8')); } catch {}
      return json(res, { einstellungen: einst, datei: skriptDatei, text, render: renderModus, nurBild, aus: ausDatei, aufl: extraAufl, renderStimme, renderTempo, renderAlter, skripte: SKRIPTE, videos: VIDEOS, material: MATERIAL });
    }
    if (p === '/api/aussprache' && req.method === 'GET') return json(res, { liste: eigeneLesen() });
    if (p === '/api/aussprache' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      return json(res, { ok: true, liste: eigeneSchreiben(o.liste) });
    }
    if (p === '/api/aussprache/zeigen' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      return json(res, { text: aussprechen(String(o.text || '').slice(0, 2000)) });
    }
    if (p === '/api/ki/status') return json(res, { bereit: kiBereit() });
    if (p === '/api/ki/schluessel' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      const k = String(o.apiKey || '').trim();
      if (k && !/^sk-ant-/.test(k)) return json(res, { ok: false, fehler: 'Das sieht nicht wie ein Anthropic-Schlüssel aus (er beginnt mit sk-ant-).' });
      einstellungenSchreiben({ apiKey: k || undefined });
      return json(res, { ok: true, bereit: kiBereit() });
    }
    if (p === '/api/ki/aussprache' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      return json(res, await kiAussprache(String(o.skript || ''), { aussprechen, lautschrift, eigeneLesen, eigeneSchreiben }));
    }
    if (p === '/api/ki' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      if (!String(o.thema || '').trim()) return json(res, { ok: false, fehler: 'Bitte schreib ein Thema.' });
      const erg = await kiSkript({ thema: String(o.thema).slice(0, 500), alter: o.alter, stil: o.stil, vorher: o.vorher || null, aenderung: o.aenderung ? String(o.aenderung).slice(0, 500) : null, fehler: o.fehler || null });
      // danach prüft die KI, ob die Stimme jedes Wort richtig ausspricht (Korrekturen landen in ~/Blockfilm/aussprache.json)
      if (erg.ok && erg.skript && o.aussprache === true) {
        try { erg.aussprache = await kiAussprache(erg.skript, { aussprechen, lautschrift, eigeneLesen, eigeneSchreiben }); } catch (e) { erg.aussprache = { ok: false, fehler: String(e.message || e) }; }
      }
      return json(res, erg);
    }
    if (p === '/api/vorschaubild' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      try { return json(res, await vorschaubildMachen(String(o.html || ''), path.resolve(String(o.aus)))); } catch (e) { return json(res, { ok: false, fehler: String(e.message || e) }); }
    }
    if (p.startsWith('/hf-regie/')) {
      // Komposition für die Regie-Prüfung (nur kurz im Speicher)
      const html = regieSeiten.get(p.slice(10).replace(/\.html$/, ''));
      if (!html) return json(res, { fehler: 'nicht gefunden' }, 404);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(html);
    }
    if (p === '/api/ki/regie' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      let bilder = [];
      try { bilder = await regieBilder(String(o.html || ''), (o.momente || []).slice(0, 12)); }
      catch (e) { console.error('Regie-Standbilder:', e.message); }
      return json(res, Object.assign(await kiRegie({ thema: String(o.thema || '').slice(0, 500), alter: o.alter, stil: o.stil, skript: String(o.skript || ''), befunde: (o.befunde || []).slice(0, 30).map(String), bilder }), { bilder: bilder.length }));
    }
    if (p === '/api/stimmen') return json(res, { piper: fs.existsSync(PIPER), stimmen: stimmenListe(), anzeige: stimmenAnzeige() });
    if (p === '/api/sprechen' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      const f = await sprechen(String(o.text || '').slice(0, 2000), o.stimme, o.tempo || 1);
      res.writeHead(200, { 'content-type': 'audio/wav' });
      return res.end(fs.readFileSync(f));
    }
    if (p === '/api/videoinfo') {
      const f = findeDatei(url.searchParams.get('p'), url.searchParams.get('basis'));
      return json(res, await videoInfo(f));
    }
    if (p === '/api/roh') {
      const f = path.resolve(url.searchParams.get('p'));
      if (!/\.(mp4|m4v|mov|webm|mkv|avi|wav|mp3|ogg|png|jpe?g|gif|webp)$/i.test(f)) return json(res, { fehler: 'Dateityp nicht erlaubt' }, 403);
      return dateiMitBereich(req, res, f);
    }
    if (p === '/api/clipton') {
      // Ton eines Video-Ausschnitts als WAV (mit Tempo-Änderung)
      const f = findeDatei(url.searchParams.get('p'), url.searchParams.get('basis'));
      const von = Number(url.searchParams.get('von') || 0), dauer = Number(url.searchParams.get('dauer') || 1), tempo = Number(url.searchParams.get('tempo') || 1);
      const ziel = path.join(CACHE, 'ton', Buffer.from(`${f}|${fs.statSync(f).mtimeMs}|${von}|${dauer}|${tempo}`).toString('base64url').slice(-70) + '.wav');
      if (!fs.existsSync(ziel)) {
        fs.mkdirSync(path.dirname(ziel), { recursive: true });
        const filter = [];
        let tt = tempo;
        while (tt < 0.5) { filter.push('atempo=0.5'); tt /= 0.5; }
        while (tt > 2) { filter.push('atempo=2'); tt /= 2; }
        filter.push('atempo=' + tt.toFixed(4));
        await lauf('ffmpeg', ['-y', '-v', 'error', '-ss', String(von), '-t', String(dauer), '-i', f, '-vn', '-af', filter.join(','), '-ar', '44100', '-ac', '2', ziel]);
      }
      return dateiMitBereich(req, res, ziel);
    }
    if (p === '/api/hochladen' && req.method === 'POST') {
      const name = path.basename(url.searchParams.get('name') || 'video.mp4').replace(/[^\wäöüÄÖÜß.\- ]/g, '_');
      const ziel = path.join(MATERIAL, name);
      await new Promise((ok, nein) => { const ws = fs.createWriteStream(ziel); req.pipe(ws); ws.on('finish', ok); ws.on('error', nein); });
      return json(res, { pfad: ziel, name });
    }
    if (p === '/api/material') {
      const l = fs.readdirSync(MATERIAL).filter(f => /\.(mp4|m4v|mov|webm|mkv|avi|png|jpe?g|gif|webp)$/i.test(f)).map(f => ({ name: f, video: !/\.(png|jpe?g|gif|webp)$/i.test(f), zeit: fs.statSync(path.join(MATERIAL, f)).mtimeMs })).sort((a, b) => b.zeit - a.zeit);
      return json(res, { ordner: MATERIAL, dateien: l });
    }
    if (p === '/api/liste') return json(res, { eigene: liste(SKRIPTE), beispiele: liste(BEISPIELE) });
    if (p === '/api/filmliste') {
      // gespeicherte KI-Filme (Blockfilm/Skripte/KI) und eigene Skripte für die Film-Leiste
      const ki = liste(path.join(SKRIPTE, 'KI')).map(e => {
        let info = {};
        try { const z = fs.readFileSync(e.pfad, 'utf8').split('\n').find(x => x.startsWith('#KI ')); if (z) info = JSON.parse(z.slice(4)); } catch {}
        return { pfad: e.pfad, zeit: e.zeit, thema: info.thema || e.name.replace(/\.txt$/, ''), alter: info.alter || '' };
      });
      return json(res, { ki, eigene: liste(SKRIPTE) });
    }
    if (p === '/api/filme/loeschen' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      const f = path.resolve(String(o.pfad || ''));
      if (!f.startsWith(path.join(SKRIPTE, 'KI') + path.sep) || !/\.txt$/.test(f)) return json(res, { ok: false, fehler: 'Nur gespeicherte KI-Filme können hier gelöscht werden.' });
      try { fs.rmSync(f); } catch (e) { return json(res, { ok: false, fehler: e.message }); }
      return json(res, { ok: true });
    }
    if (p === '/api/lesen') {
      const f = pfadAus(url.searchParams.get('p'));
      const st = fs.statSync(f);
      return json(res, { pfad: f, text: fs.readFileSync(f, 'utf8'), zeit: st.mtimeMs });
    }
    if (p === '/api/zeit') {
      const f = pfadAus(url.searchParams.get('p'));
      try { return json(res, { zeit: fs.statSync(f).mtimeMs }); } catch { return json(res, { zeit: 0 }); }
    }
    if (p === '/api/schreiben' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      let f = pfadAus(o.pfad);
      if (!/\.(txt|blockfilm|bf)$/i.test(f)) f += '.txt';
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, o.text);
      return json(res, { pfad: f, zeit: fs.statSync(f).mtimeMs });
    }
    if (p === '/api/datei') {
      // Bilder (z. B. Skins) relativ zum Skript laden
      const f = findeDatei(url.searchParams.get('p'), url.searchParams.get('basis'));
      const daten = fs.readFileSync(f);
      res.writeHead(200, { 'content-type': TYPEN[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      return res.end(daten);
    }
    if (p === '/api/exporte' && req.method === 'GET') return json(res, await exporteLesen());
    // Warteschlange für Hintergrund-Exporte aus der Film-Übersicht
    if (p === '/api/stapel' && req.method === 'GET') return json(res, stapelStatus());
    if (p === '/api/stapel' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      const n = stapelHinzu(o);
      return json(res, { ok: true, neu: n, ...stapelStatus() });
    }
    if (p === '/api/stapel/leeren' && req.method === 'POST') { stapel.warten.length = 0; return json(res, { ok: true, ...stapelStatus() }); }
    if (p === '/api/exporte/stopp' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      if (o.nacht) { // ganzen Nacht-Export abbrechen (der laufende Film wird mit gestoppt)
        await new Promise(ok => execFile('systemctl', ['--user', 'stop', 'blockfilm-nachtfilme.service', 'blockfilm-nachtfilme.timer'], () => ok()));
      }
      const laufend = (await exporteLesen()).laufend;
      const ziel = laufend.find(e => e.pid === Number(o.pid));
      if (o.pid && !ziel) return json(res, { ok: false, fehler: 'Dieser Export läuft nicht (mehr).' });
      if (ziel) try { process.kill(ziel.pid, 'SIGTERM'); } catch (e) { return json(res, { ok: false, fehler: e.message }); }
      return json(res, { ok: true });
    }
    if (p === '/api/oeffnen' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      spawn('xdg-open', [o.pfad], { detached: true, stdio: 'ignore' }).unref();
      return json(res, { ok: true });
    }
    if (p === '/api/video/ton' && req.method === 'POST') {
      const daten = await koerper(req);
      tonDatei = path.join(os.tmpdir(), `blockfilm-ton-${process.pid}.wav`);
      fs.writeFileSync(tonDatei, daten);
      return json(res, { ok: true });
    }
    if (p === '/api/video/start' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      if (video) { try { video.proc.kill('SIGKILL'); } catch {} video = null; }
      const name = (o.name || 'blockfilm').replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim().replace(/\s+/g, '_') || 'blockfilm';
      const stempel = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const ziel = o.aus ? path.resolve(o.aus) : path.join(VIDEOS, `${name}_${stempel}.mp4`);
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      const a = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(o.fps), '-c:v', 'mjpeg', '-i', '-'];
      if (o.ton && tonDatei) a.push('-i', tonDatei);
      a.push('-map', '0:v');
      if (o.ton && tonDatei) a.push('-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
      const pix = o.breite * o.hoehe;
      a.push('-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', pix > 5e6 ? 'faster' : 'medium', '-crf', pix > 5e6 ? '20' : '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ziel);
      const proc = spawn('nice', ['-n', '10', 'ffmpeg', ...a], { stdio: ['pipe', 'ignore', 'pipe'] });
      let fehler = '';
      proc.stderr.on('data', d => { fehler += d.toString(); });
      const fertig = new Promise(ok => proc.on('close', code => ok({ code, fehler })));
      proc.stdin.on('error', () => {});
      video = { proc, ziel, fertig, bilder: 0 };
      return json(res, { ok: true, datei: ziel });
    }
    if (p === '/api/video/bild' && req.method === 'POST') {
      const daten = await koerper(req);
      if (!video) return json(res, { ok: false, fehler: 'kein Export aktiv' }, 400);
      const v = video;
      if (!v.proc.stdin.write(daten)) await new Promise(ok => v.proc.stdin.once('drain', ok));
      v.bilder++;
      return json(res, { ok: true });
    }
    if (p === '/api/video/ende' && req.method === 'POST') {
      if (!video) return json(res, { ok: false, fehler: 'kein Export aktiv' }, 400);
      const v = video;
      v.proc.stdin.end();
      const erg = await v.fertig;
      video = null;
      if (erg.code !== 0) return json(res, { ok: false, fehler: erg.fehler || 'ffmpeg-Fehler ' + erg.code });
      const groesse = fs.statSync(v.ziel).size;
      return json(res, { ok: true, datei: v.ziel, groesse, bilder: v.bilder });
    }
    if (p === '/api/video/abbrechen' && req.method === 'POST') {
      if (video) { try { video.proc.kill('SIGKILL'); fs.rmSync(video.ziel, { force: true }); } catch {} video = null; }
      return json(res, { ok: true });
    }
    // ---------- Export mit HyperFrames (2D-Filme im neuen Bildstil) ----------
    if (p === '/api/hf/start' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      if (hfJob && !hfJob.fertig) return json(res, { ok: false, fehler: 'Es läuft schon ein Export.' });
      return json(res, await hfStarten(o));
    }
    if (p === '/api/hf/status') return json(res, hfStatus());
    if (p === '/api/hf/abbrechen' && req.method === 'POST') {
      if (hfJob && !hfJob.fertig) { hfJob.abgebrochen = true; hfJob.abbruch.abort(); }
      return json(res, { ok: true });
    }
    if (p === '/api/fortschritt' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      if (renderModus) {
        process.stdout.write(`\r${o.text}            `);
        try { fs.mkdirSync(EXPORT_STATUS, { recursive: true }); fs.writeFileSync(path.join(EXPORT_STATUS, process.pid + '.json'), JSON.stringify({ pid: process.pid, skript: skriptDatei, ziel: ausDatei, text: o.text, start: renderStart, zeit: Date.now() })); } catch {}
      }
      return json(res, { ok: true });
    }
    if (p === '/api/fertig' && req.method === 'POST') {
      const o = JSON.parse((await koerper(req)).toString('utf8'));
      json(res, { ok: true });
      if (renderModus) {
        process.stdout.write('\n');
        if (o.fehlerListe && o.fehlerListe.length) for (const f of o.fehlerListe) console.log(`  Zeile ${f.zeile}: ${f.text}`);
        if (o.ok) console.log(`Fertig: ${o.datei}`);
        else console.log(`Fehler: ${o.fehler}`);
        beenden(o.ok ? 0 : 1);
      }
      return;
    }
    // statische Dateien
    let f = p === '/' ? '/index.html' : decodeURIComponent(p);
    if (f === '/BEFEHLE.md') f = path.join(HIER, 'BEFEHLE.md');
    else f = path.join(APP, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
    if (!f.startsWith(APP) && !f.endsWith('BEFEHLE.md')) return json(res, { fehler: 'nein' }, 403);
    const daten = fs.readFileSync(f);
    res.writeHead(200, { 'content-type': TYPEN[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(daten);
  } catch (e) {
    json(res, { fehler: String(e.message || e) }, 500);
  }
}

let browser = null;
// ---------- Übersicht über alle Exporte (auch die im Hintergrund) ----------
const EXPORT_STATUS = path.join(os.homedir(), '.cache', 'blockfilm', 'exporte');
const renderStart = Date.now();
const NACHT_SKRIPTE = path.join(os.homedir(), 'Blockfilm', 'Nachtfilme');
const ausfuehren = (cmd, a) => new Promise(ok => execFile(cmd, a, { timeout: 4000 }, (e, out) => ok(e ? '' : String(out))));
function fortschrittAus(text) {
  const m = /Bild (\d+) von (\d+)/.exec(text || '');
  const rest = /noch etwa ([\d]+ (?:min|s))/.exec(text || '');
  return { anteil: m ? +m[1] / +m[2] : null, bild: m ? +m[1] : null, bilder: m ? +m[2] : null, rest: rest ? rest[1] : null };
}
function filmName(datei) {
  const n = path.basename(String(datei || '')).replace(/\.teil\.mp4$|\.mp4$|\.txt$/g, '');
  const th = { geister: 'Geister / durch Wände', himmelblau: 'Warum ist der Himmel blau?', umlaufbahn: 'Warum fällt der Mond nicht herunter?', koerper: 'Wie funktioniert unser Körper?', tagundnacht: 'Tag und Nacht', schwarzesloch: 'Schwarzes Loch', herbst: 'Bunte Blätter im Herbst', klima: 'Was ist Klima?', mathe: 'Wie funktioniert Mathe?', viren: 'Viren und Krankheiten', dinos: 'Dinosaurier und Erdzeitalter', erdestopp: 'Was, wenn die Erde stehen bleibt?', technik: 'Handys, Computer und Tablets' };
  return th[n] || n;
}
// fertige MP4 (mit +faststart) haben den Index "moov" ganz vorne; abgebrochene haben ihn nicht
const heilCache = new Map();
function videoHeil(datei, st) {
  const k = datei + '|' + st.mtimeMs + '|' + st.size;
  if (heilCache.has(k)) return heilCache.get(k);
  let ok = false;
  try { const fd = fs.openSync(datei, 'r'); const b = Buffer.alloc(Math.min(st.size, 1 << 20)); fs.readSync(fd, b, 0, b.length, 0); fs.closeSync(fd); ok = b.includes('moov'); } catch {}
  heilCache.set(k, ok);
  return ok;
}
async function exporteLesen() {
  const laufend = [];
  // 1. Exporte ohne Fenster (Kommandozeile, Nacht-Export)
  const ps = await ausfuehren('ps', ['-eo', 'pid=,etimes=,args=']);
  for (const z of ps.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(z);
    if (!m || !/server\.mjs/.test(m[3]) || !/--render/.test(m[3])) continue;
    const pid = +m[1], args = m[3].split(/\s+/);
    const oi = args.indexOf('-o');
    const ziel = oi >= 0 ? args[oi + 1] : null;
    const skript = args[args.indexOf('--render') + 1];
    let text = '';
    try { text = JSON.parse(fs.readFileSync(path.join(EXPORT_STATUS, pid + '.json'), 'utf8')).text; } catch {}
    if (!text && ziel) {
      const ordner = path.dirname(ziel), name = path.basename(ziel).replace(/\.teil\.mp4$|\.mp4$/, '');
      for (const log of [path.join(ordner, '.' + name + '-lauf.txt'), path.join(ordner, '.letzter-lauf.txt')]) {
        try { const st = fs.statSync(log); if (Date.now() - st.mtimeMs > 120000) continue; const t = fs.readFileSync(log, 'utf8'); text = t.slice(-400).split('\r').filter(x => x.trim()).pop() || ''; if (text) break; } catch {}
      }
    }
    laufend.push({ pid, art: 'hintergrund', name: filmName(ziel || skript), ziel, skript, seit: +m[2], text: text.trim(), ...fortschrittAus(text) });
  }
  // 2. Export im App-Fenster
  if (video) laufend.push({ pid: null, art: 'fenster', name: 'Export im Blockfilm-Fenster', ziel: video.ziel || null, text: 'läuft im Fenster', anteil: null });
  if (hfJob && !hfJob.fertig && !renderModus) { const st = hfStatus(); laufend.push({ pid: null, art: 'fenster', name: 'Export im Blockfilm-Fenster (neuer Bildstil)', ziel: hfJob.ziel, text: st.text, anteil: st.anteil, ...fortschrittAus(st.text) }); }
  // 3. Nacht-Export
  const naechster = (await ausfuehren('systemctl', ['--user', 'show', 'blockfilm-nachtfilme.timer', '-p', 'NextElapseUSecRealtime', '--value'])).trim();
  const dienstAktiv = (await ausfuehren('systemctl', ['--user', 'is-active', 'blockfilm-nachtfilme.service'])).trim() === 'active';
  const ausOrdner = path.join(VIDEOS, 'Nachtfilme');
  let warteschlange = [];
  try {
    const reihenfolge = ['himmelblau', 'geister', 'erdestopp', 'umlaufbahn', 'koerper', 'tagundnacht', 'schwarzesloch', 'herbst', 'klima', 'mathe', 'viren', 'dinos', 'technik'];
    const da = fs.readdirSync(NACHT_SKRIPTE).filter(f => f.endsWith('.txt')).map(f => f.slice(0, -4));
    warteschlange = reihenfolge.filter(n => da.includes(n)).map(n => ({ datei: n, name: filmName(n), fertig: fs.existsSync(path.join(ausOrdner, n + '.mp4')), laeuft: laufend.some(e => e.ziel && path.basename(e.ziel).startsWith(n + '.')) }));
  } catch {}
  // 4. fertige Videos
  const fertig = [];
  for (const ordner of [VIDEOS, ausOrdner, path.join(VIDEOS, 'KI')]) {
    try {
      for (const f of fs.readdirSync(ordner)) {
        if (!f.endsWith('.mp4') || f.endsWith('.teil.mp4')) continue;
        const st = fs.statSync(path.join(ordner, f));
        const bild = bildZuVideo(path.join(ordner, f));
        fertig.push({ datei: path.join(ordner, f), name: filmName(f), groesse: st.size, zeit: st.mtimeMs, kaputt: !videoHeil(path.join(ordner, f), st), bild: fs.existsSync(bild) ? bild : null });
      }
    } catch {}
  }
  fertig.sort((a, b) => b.zeit - a.zeit);
  return { laufend, nacht: { geplant: naechster && naechster !== 'n/a' ? naechster : null, aktiv: dienstAktiv, warteschlange }, fertig: fertig.slice(0, 30) };
}

function beenden(code = 0) {
  if (browser) try { browser.kill('SIGTERM'); } catch {}
  if (video) try { video.proc.kill('SIGKILL'); } catch {}
  if (hfJob && !hfJob.fertig) try { hfJob.abgebrochen = true; hfJob.abbruch.abort(); } catch {}
  if (renderModus) try { fs.rmSync(path.join(EXPORT_STATUS, process.pid + '.json'), { force: true }); } catch {}
  if (tonDatei) try { fs.rmSync(tonDatei, { force: true }); } catch {}
  setTimeout(() => process.exit(code), 200);
}
process.on('SIGINT', () => beenden(130));
process.on('SIGTERM', () => beenden(143));

const PORT = renderModus ? 0 : nurServer ? Number(process.env.BF_PORT || 47812) : 47811;
const server = http.createServer(anfrage);
server.on('error', e => {
  if (e.code === 'EADDRINUSE' && (nurServer || renderModus)) { console.error('Port belegt – Server läuft schon.'); process.exit(1); }
  if (e.code === 'EADDRINUSE') {
    // läuft schon: nur ein weiteres Fenster öffnen
    oeffneFenster(47811, true);
    setTimeout(() => process.exit(0), 1500);
  } else { console.error(e); process.exit(1); }
});
server.listen(PORT, '127.0.0.1', () => {
  const port = server.address().port;
  if (renderModus) {
    if (!skriptDatei) { console.error('Bitte ein Skript angeben: blockfilm --render mein-film.txt'); process.exit(2); }
    console.log(`Blockfilm rendert ${skriptDatei} …`);
    const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'blockfilm-render-'));
    browser = spawn('chromium', ['--headless=new', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profil}`, ...(process.env.BF_SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist']), '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `http://127.0.0.1:${port}/?render=1`], { stdio: 'ignore' });
    browser.on('exit', () => { fs.rmSync(profil, { recursive: true, force: true }); });
  } else if (nurServer) {
    console.log(`Blockfilm-Server läuft auf http://127.0.0.1:${port}/`);
  } else {
    oeffneFenster(port, false);
  }
});

function oeffneFenster(port, nurFenster) {
  const profil = path.join(HOME, '.local', 'share', 'blockfilm', 'profil');
  fs.mkdirSync(profil, { recursive: true });
  if (!nurFenster) {
    // Rechtschreibprüfung im App-Fenster auf Deutsch stellen (vor dem Start des Browsers)
    try {
      const pf = path.join(profil, 'Default', 'Preferences');
      fs.mkdirSync(path.dirname(pf), { recursive: true });
      let pr = {};
      try { pr = JSON.parse(fs.readFileSync(pf, 'utf8')); } catch {}
      pr.spellcheck = Object.assign({}, pr.spellcheck, { dictionaries: ['de-DE'], dictionary: '', use_spelling_service: false });
      pr.intl = Object.assign({}, pr.intl, { accept_languages: 'de-DE,de' });
      pr.browser = Object.assign({}, pr.browser, { enable_spellchecking: true });
      fs.writeFileSync(pf, JSON.stringify(pr));
    } catch {}
  }
  let url = `http://127.0.0.1:${port}/`;
  if (skriptDatei) url += '?p=' + encodeURIComponent(skriptDatei);
  const b = spawn('chromium', [`--app=${url}`, `--user-data-dir=${profil}`, '--no-first-run', '--no-default-browser-check', '--class=blockfilm', '--lang=de', '--window-size=1500,900', '--autoplay-policy=no-user-gesture-required'], { stdio: 'ignore', detached: nurFenster });
  if (nurFenster) { b.unref(); return; }
  browser = b;
  b.on('exit', () => { server.close(); beenden(0); });
}
