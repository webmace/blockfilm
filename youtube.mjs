// Blockfilm – YouTube: Anmeldung (OAuth für Desktop-Apps) und Hochladen über die YouTube Data API v3.
// Zugangsdaten in ~/Blockfilm/einstellungen.json unter "youtube": { clientId, clientSecret, refreshToken, kanal }.
import fs from 'node:fs';
import { einstellungenLesen, einstellungenSchreiben } from './ki.mjs';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
let zugang = null; // { token, bis }

export function ytEinstellungen() { return einstellungenLesen().youtube || {}; }
function ytSpeichern(neu) { const alt = ytEinstellungen(); einstellungenSchreiben({ youtube: Object.assign({}, alt, neu) }); zugang = null; }

export function ytStatus() {
  const y = ytEinstellungen();
  return { client: !!(y.clientId && y.clientSecret), verbunden: !!y.refreshToken, kanal: y.kanal || null };
}

// Die heruntergeladene JSON-Datei aus der Google Cloud Console ({"installed": {...}}) oder Client-ID + Geheimnis
export function ytClientSetzen(text) {
  let id = null, geheim = null;
  try {
    const j = JSON.parse(text);
    const c = j.installed || j.web || j;
    id = c.client_id; geheim = c.client_secret;
  } catch {
    const m = String(text).match(/([0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com)[\s,;]+([A-Za-z0-9_-]{20,})/);
    if (m) { id = m[1]; geheim = m[2]; }
  }
  if (!id || !geheim) throw new Error('Das sieht nicht wie die OAuth-Datei aus. Füge den ganzen Inhalt der heruntergeladenen JSON-Datei ein.');
  ytSpeichern({ clientId: id, clientSecret: geheim, refreshToken: null, kanal: null });
}

export function ytAnmeldeAdresse(rueckruf) {
  const y = ytEinstellungen();
  if (!y.clientId) throw new Error('Zuerst die OAuth-Datei aus der Google Cloud einfügen.');
  const q = new URLSearchParams({ client_id: y.clientId, redirect_uri: rueckruf, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent' });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
}

async function tokenAnfrage(felder) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(felder) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Google-Anmeldung: ' + (j.error_description || j.error || r.status));
  return j;
}

export async function ytCodeEinloesen(code, rueckruf) {
  const y = ytEinstellungen();
  const j = await tokenAnfrage({ code, client_id: y.clientId, client_secret: y.clientSecret, redirect_uri: rueckruf, grant_type: 'authorization_code' });
  if (!j.refresh_token) throw new Error('Google hat keinen dauerhaften Zugang geschickt. Bitte noch einmal verbinden.');
  zugang = { token: j.access_token, bis: Date.now() + (j.expires_in - 60) * 1000 };
  ytSpeichern({ refreshToken: j.refresh_token });
  zugang = { token: j.access_token, bis: Date.now() + (j.expires_in - 60) * 1000 };
  try {
    const k = await ytApi('GET', 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true');
    const kanal = k.items && k.items[0] ? { id: k.items[0].id, name: k.items[0].snippet.title } : null;
    ytSpeichern({ kanal }); zugang = null;
    return kanal;
  } catch { return null; }
}

export function ytTrennen() { ytSpeichern({ refreshToken: null, kanal: null }); }

async function ytToken() {
  if (zugang && zugang.bis > Date.now()) return zugang.token;
  const y = ytEinstellungen();
  if (!y.refreshToken) throw new Error('Blockfilm ist noch nicht mit YouTube verbunden.');
  const j = await tokenAnfrage({ refresh_token: y.refreshToken, client_id: y.clientId, client_secret: y.clientSecret, grant_type: 'refresh_token' });
  zugang = { token: j.access_token, bis: Date.now() + (j.expires_in - 60) * 1000 };
  return zugang.token;
}

async function ytApi(methode, url, body, kopf = {}) {
  const r = await fetch(url, { method: methode, headers: Object.assign({ authorization: 'Bearer ' + await ytToken() }, body && !(body instanceof Buffer) ? { 'content-type': 'application/json' } : {}, kopf), body: body ? (body instanceof Buffer ? body : JSON.stringify(body)) : undefined });
  const text = await r.text();
  let j = {}; try { j = text ? JSON.parse(text) : {}; } catch {}
  if (!r.ok) { const e = new Error('YouTube: ' + ((j.error && j.error.message) || r.status)); e.status = r.status; e.grund = j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason; throw e; }
  return j;
}

// Video hochladen (fortsetzbares Hochladen in einem Stück), danach Vorschaubild setzen.
// Rückgabe: { id, url, bild: true|false|'Fehlertext' }
export async function ytHochladen({ datei, titel, beschreibung, tags = [], bild = null, sichtbarkeit = 'private', fuerKinder = true, fortschritt = () => {} }) {
  const groesse = fs.statSync(datei).size;
  const meta = {
    snippet: { title: String(titel).replace(/[<>]/g, '').slice(0, 100), description: String(beschreibung).replace(/[<>]/g, '').slice(0, 4900), tags: kurzeTags(tags), categoryId: '27', defaultLanguage: 'de', defaultAudioLanguage: 'de' },
    status: { privacyStatus: sichtbarkeit, selfDeclaredMadeForKids: !!fuerKinder, embeddable: true },
  };
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', headers: { authorization: 'Bearer ' + await ytToken(), 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-length': String(groesse), 'x-upload-content-type': 'video/mp4' }, body: JSON.stringify(meta),
  });
  if (!start.ok) { const t = await start.text(); throw new Error('YouTube (Hochladen starten): ' + (t.match(/"message":\s*"([^"]+)"/) || [, start.status])[1]); }
  const ort = start.headers.get('location');
  let gesendet = 0;
  const strom = fs.createReadStream(datei, { highWaterMark: 4 * 1024 * 1024 });
  strom.on('data', c => { gesendet += c.length; fortschritt(gesendet / groesse); });
  const r = await fetch(ort, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(groesse) }, body: strom, duplex: 'half' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error('YouTube (Hochladen): ' + ((j.error && j.error.message) || r.status));
  const erg = { id: j.id, url: 'https://youtu.be/' + j.id, bild: false };
  if (bild && fs.existsSync(bild)) {
    try {
      await ytApi('POST', 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=' + j.id, fs.readFileSync(bild), { 'content-type': 'image/jpeg' });
      erg.bild = true;
    } catch (e) { erg.bild = e.status === 403 ? 'Eigene Vorschaubilder gehen erst, wenn der Kanal bestätigt ist (YouTube Studio → Einstellungen → Kanal → Funktionsberechtigung, Telefonnummer bestätigen).' : e.message; }
  }
  return erg;
}

function kurzeTags(tags) {
  const out = []; let laenge = 0;
  for (const t of tags.map(x => String(x).replace(/[<>,"]/g, '').trim()).filter(Boolean)) {
    const l = t.length + (t.includes(' ') ? 2 : 0) + 1;
    if (laenge + l > 480) break;
    out.push(t); laenge += l;
  }
  return out;
}
