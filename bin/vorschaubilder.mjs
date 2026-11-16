#!/usr/bin/env node
// Blockfilm: Vorschaubilder (JPEG neben dem Video) für fertige Videos nachträglich bauen.
//   node bin/vorschaubilder.mjs [--neu]     --neu: auch vorhandene Bilder neu machen
// Nachtfilme: aus ~/Blockfilm/Nachtfilme/<name>.txt. KI-Filme: das KI-Skript mit passendem Namen.
// Sonst (Skript unbekannt oder 3D-Film): ein Bild aus dem Video bei etwa einem Drittel.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const HIER = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const HOME = os.homedir();
const VIDEOS = path.join(HOME, 'Videos', 'Blockfilm');
const NACHT = path.join(HOME, 'Blockfilm', 'Nachtfilme');
const KI = path.join(HOME, 'Blockfilm', 'Skripte', 'KI');
const neu = process.argv.includes('--neu');
const sicherName = n => (String(n || 'film').replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim().replace(/\s+/g, '_') || 'film').slice(0, 80);

// KI-Skripte nach dem Dateinamen, den der Export daraus macht
const kiSkripte = [];
try {
  for (const f of fs.readdirSync(KI).filter(f => f.endsWith('.txt'))) {
    const p = path.join(KI, f);
    let info = {};
    try { const z = fs.readFileSync(p, 'utf8').split('\n').find(x => x.startsWith('#KI ')); if (z) info = JSON.parse(z.slice(4)); } catch {}
    kiSkripte.push({ pfad: p, vorne: sicherName(info.thema || f.replace(/\.txt$/, '')), alter: info.alter || null });
  }
} catch {}

const videos = [];
for (const ordner of [VIDEOS, path.join(VIDEOS, 'Nachtfilme')]) {
  try { for (const f of fs.readdirSync(ordner)) if (f.endsWith('.mp4') && !f.endsWith('.teil.mp4')) videos.push(path.join(ordner, f)); } catch {}
}
const laeuft = spawnSync('ps', ['-eo', 'args='], { encoding: 'utf8' }).stdout;
for (const v of videos) {
  const bild = v.replace(/\.mp4$/i, '.jpg');
  if (!neu && fs.existsSync(bild)) continue;
  if (laeuft.includes(v)) continue; // wird gerade noch exportiert
  const name = path.basename(v, '.mp4');
  let skript = null, alter = null;
  if (path.basename(path.dirname(v)) === 'Nachtfilme' && fs.existsSync(path.join(NACHT, name + '.txt'))) skript = path.join(NACHT, name + '.txt');
  else {
    const k = kiSkripte.find(k => name.startsWith(k.vorne + '_'));
    if (k) { skript = k.pfad; alter = k.alter; }
  }
  let ok = false;
  if (skript) {
    const a = [path.join(HIER, 'server.mjs'), '--render', skript, '--nurbild', '-o', bild, ...(alter ? ['--alter', alter] : [])];
    const r = spawnSync('nice', ['-n', '10', process.execPath, ...a], { encoding: 'utf8', timeout: 600000 });
    ok = r.status === 0 && fs.existsSync(bild);
    if (!ok) console.log(`${name}: aus dem Skript ging nicht (${(r.stdout || '').trim().split('\n').pop()}), nehme ein Bild aus dem Video`);
  }
  if (!ok) {
    const d = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v], { encoding: 'utf8' }).stdout) || 10;
    spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(d * 0.33), '-i', v, '-frames:v', '1', '-vf', 'scale=1920:-2', '-q:v', '3', bild]);
    ok = fs.existsSync(bild);
  }
  console.log(`${ok ? '✓' : '✗'} ${name}${skript ? '' : ' (Bild aus dem Video)'}`);
}
