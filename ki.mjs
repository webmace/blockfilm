// Blockfilm – KI-Regisseur: Claude schreibt aus einem Thema ein fertiges Film-Skript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const EINST = path.join(os.homedir(), 'Blockfilm', 'einstellungen.json');

export function einstellungenLesen() {
  try { return JSON.parse(fs.readFileSync(EINST, 'utf8')); } catch { return {}; }
}
export function einstellungenSchreiben(neu) {
  const e = Object.assign(einstellungenLesen(), neu);
  fs.mkdirSync(path.dirname(EINST), { recursive: true });
  fs.writeFileSync(EINST, JSON.stringify(e, null, 2), { mode: 0o600 });
  try { fs.chmodSync(EINST, 0o600); } catch {} // der Schlüssel ist nur für dich lesbar
  return e;
}
export function kiBereit() {
  const e = einstellungenLesen();
  return !!(e.apiKey || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const ALTER = {
  '0-2': 'Kleinkinder von 0 bis 2 Jahren. Höchstens 4 bis 6 Wörter pro Satz. Nur ganz einfache Wörter (Ball, Sonne, groß, klein, rot). Viel Wiederholung. Freundliche Tiere und Figuren. Fröhliche Geräusche (plopp, jubel). Ruhig, aber ohne lange Pausen: nach jedem Sprecher-Satz sofort etwas zeigen; "warte" nur, wenn eine Bewegung Zeit braucht (höchstens warte 0.5). Insgesamt etwa 3 bis 4 Minuten, ungefähr 40 sehr kurze Sprecher-Sätze.',
  '3-5': 'Kinder von 3 bis 5 Jahren (Kindergarten). Höchstens 8 bis 10 Wörter pro Satz. Einfache, bildhafte Wörter und Vergleiche aus dem Kinderalltag ("so schwer wie ein Elefant", "wie ein Staubsauger"). Wichtige Wörter wiederholen. Eine freundliche Figur, die mitstaunt und Fragen stellt. Ruhiges, aber flüssiges Tempo wie in einem guten Kinder-Erklärvideo; "warte" nur, wenn eine Bewegung Zeit braucht (höchstens warte 0.5). Keine Fachwörter, und wenn doch eins nötig ist, sofort mit einem Alltagsvergleich erklären. Stelle zwischendurch Fragen an das Kind ("Weißt du, warum …?") und beantworte sie. Insgesamt etwa 4 Minuten, ungefähr 50 kurze Sprecher-Sätze, in mehrere kleine Kapitel aufgeteilt (jeweils mit einer Frage am Anfang). Am Ende den Merksatz wiederholen und Tschüss sagen.',
  '6-9': 'Grundschulkinder von 6 bis 9 Jahren. Kurze, klare Sätze, ein oder zwei Fachwörter, die sofort erklärt werden. Anschauliche Vergleiche. 2 bis 4 Minuten. Am Ende eine Merke-Tafel.',
  '10+': 'Kinder ab 10 und Erwachsene. Klare Sprache, Fachbegriffe erklärt, gern eine Formel oder ein Diagramm. 3 bis 5 Minuten.',
};

function systemText() {
  const befehle = fs.readFileSync(path.join(HIER, 'BEFEHLE.md'), 'utf8');
  return `Du bist der Regisseur von "Blockfilm", einem Programm, das aus einem Skript einen Erklärfilm macht.
Deine Aufgabe: Du bekommst ein Thema und ein Alter und schreibst ein vollständiges, fehlerfreies Blockfilm-Skript für einen kindgerechten Erklärfilm auf Deutsch.

So arbeitest du:
- Recherchiere zuerst mit der Websuche (web_search) kurz die wichtigsten Fakten zum Thema, bevorzugt auf verlässlichen Seiten (Kinderlexika wie klexikon.zum.de, Wissensseiten öffentlich-rechtlicher Sender, Wikipedia, Museen, Universitäten, NASA/ESA). Zwei bis vier Suchen reichen. Übernimm nur, was mehrere Quellen bestätigen.
- Erkläre fachlich richtig, aber so einfach, wie das Alter es verlangt. Lieber vereinfachen als falsch sein.
- Nichts Gruseliges oder Bedrohliches für kleine Kinder. Gefährliche Dinge (Feuer, Vulkan, Weltraum) freundlich und beruhigend zeigen.
- Was-wäre-wenn-Fragen ("Was passiert, wenn …?", "Was wäre ohne …?", "Stell dir vor …") sind Gedankenexperimente. Dann so aufbauen: 1. Kurz erklären, wie es in Wirklichkeit ist (mit Bild). 2. Sagen, dass wir uns jetzt etwas vorstellen, das in echt nicht (so) passiert. 3. Schritt für Schritt durchspielen, was die Folgen wären, jede Folge mit eigenem Bild, wissenschaftlich begründet (recherchiere, was Forscher dazu sagen; wenn man es nicht genau weiß, sag das ehrlich). 4. Bei beängstigenden Folgen für kleine Kinder beruhigen ("Keine Angst, das kann nicht passieren" – aber nur, wenn das stimmt). 5. Zum Schluss zurück zur Wirklichkeit und eine Merke-Tafel.
- Sag nie, dass der Film, das Video oder die Stimme vom Computer gemacht ist (kein "dieser Film ist ein Computervideo", kein "ich bin eine Computerstimme").
- Halte den Film flüssig wie ein gutes YouTube-Erklärvideo: Die Sätze folgen dicht aufeinander, ohne lange Pausen. Setze "warte" nur ein, wenn eine Animation wirklich Zeit braucht, und dann kurz (0.5).
- Der Sprecher (Befehl "sprecher") trägt die Erklärung. Jede Sprecher-Zeile ist ein kurzer Satz. Zu jeder Aussage soll im Bild etwas passieren, gleichzeitig mit "&".
- Nutze die 2D-Simulation mit ihren GEZEICHNETEN Bildern (Abschnitt "2D-Simulation" in der Befehlsliste): Kinder, Körper, Bäume, Pflanzen, Tiere, Dinosaurier, Keime, Geräte, Planeten, Mathe-Objekte und vieles mehr. Was es nicht als Zeichnung gibt, zeigst du mit symbol2d als Bildzeichen (z. B. symbol2d banane1 "🍌" bei 10 0 groesse 8).
- Bildregeln (sehr wichtig, sonst sieht der Film leer aus):
  * Zu JEDEM Sprecher-Satz ist ein passendes Bild sichtbar, das genau das zeigt, was gesagt wird. Das Bild erscheint unmittelbar VOR dem Satz, der davon spricht.
  * Male Dinge nie aus Linien, Kurven oder Kreisen. kurve, kreis und zeiger nur, um auf etwas zu zeigen oder etwas zu markieren.
  * Beschrifte Teile von Objekten mit text2d … an objekt … stelle oben/unten/links/rechts statt mit geschätzten zeiger-Positionen. Bei kippe2d gilt: positive Zahl = gegen den Uhrzeigersinn (auf 90 → Kopf links, Füße rechts).
  * Jedes Kapitel beginnt mit einem passenden hintergrund (z. B. erde, zimmer, meer, weltraum, tafel) und endet damit, dass alle Objekte des Kapitels mit verstecke2d ausgeblendet werden.
  * Auf dem Boden stehende Dinge bei y = -11, nichts Wichtiges unter y = -20 (dort stehen die Untertitel). Objekte nicht übereinander stapeln, lieber nebeneinander von x -40 bis 40.
  * Bewegung macht Filme lebendig: bewege2d, kippe2d, kamera2d (Heranzoomen), wachsen2d, faerbe2d.
  * Der Film wird im flachen, bunten Erklärvideo-Stil gezeichnet (wie bei Kurzgesagt): Bevorzuge gezeichnete Objekte (kind2d, stern2d, planet2d, wolke2d, apfel2d, form2d, zahl2d …) vor symbol2d-Bildzeichen und nutze für Zeit- oder Ortsangaben ein Band oben links mit text "Vor 6 Millionen Jahren" oben fuer 3. Jedes Kapitel bekommt eine Kapitelkarte mit kapitel "…".
  * Prüfe am Ende jeden Sprecher-Satz einmal: Was sieht das Kind in diesem Moment? Wenn das Bild leer ist oder nicht passt, ergänze ein Objekt oder symbol2d.
- Nutze die 3D-Blockwelt mit freundlichen Figuren und Tieren (figur, tier, welt, himmel, baue …) für Alltagsthemen, Tiere, Gefühle und Geschichten. Mit "ohnevideo" oder "hintergrund aus" schaltest du zurück auf die 3D-Welt.
- Benutze eine Figur namens "ich" (ohne Farben, dann trägt sie den Skin des Nutzers) als freundliche Begleitfigur, wenn es passt.
- Benutze KEINE Befehle "video", "standbild" oder "bild" (es gibt keine Dateien) und nur Befehle, die in der Befehlsliste stehen.
- Beginne mit: film 4k fps 30 titel "…", gleich danach "zielgruppe …" (das Alter aus der Anfrage: 0-2, 3-5, 6-9 oder 10+; es bestimmt den Bildstil), dann bei Kindern bis 9 Jahre "stimme standard tempo 0.95" und "sprechpause 0.5" (etwas langsamer sprechen, kurze Pausen), dann kapitel "…". Keine Musik (kein Befehl "musik").
- Setze stattdessen passende Geräusche mit "ton …" an die richtigen Stellen (z. B. plopp wenn etwas erscheint, magie bei Licht, explosion/knall/donner bei großen Ereignissen, jubel/tada am Ende, sprung, schwung, glocke). Effekte wie tnt, explosion, blitz, feuerwerk und kollaps2d machen ihre Geräusche von selbst.
- Ende mit einer kurzen Zusammenfassung (tafel bei älteren Kindern, ein gereimter Merksatz bei kleinen) und "ausblenden 1.5".
- Achte auf Zeitregeln: Zeilen laufen nacheinander, "&" am Zeilenanfang läuft gleichzeitig mit der Zeile davor. Text, tafel, formel, kreis, zeiger laufen nebenher. 2D-Positionen: Bildmitte 0 0, das Bild ist 100 Einheiten breit und etwa 56 hoch. Kreis/Zeiger-Positionen sind Prozent vom Bild.
- Text in Anführungszeichen darf selbst keine geraden Anführungszeichen enthalten.

Antworte NUR mit dem Skript in einem Codeblock, der mit \`\`\`blockfilm beginnt. Kein Text davor oder danach.

Hier ist die vollständige Befehlsliste:

${befehle}`;
}

function skriptAus(antwort) {
  const m = /```(?:blockfilm|text|txt)?\s*\n([\s\S]*?)```/.exec(antwort);
  return (m ? m[1] : antwort).trim() + '\n';
}

// Fragt Claude nach einem Skript. vorher/aenderung/fehler: für Nachbesserungen.
const STIL = {
  echt: 'Stil: ECHTE WELT. Benutze ausschließlich die 2D-Simulation mit ihren gezeichneten Objekten (alle Befehle aus dem Abschnitt "2D-Simulation", z. B. kind2d, baum2d, pflanze2d, dino2d, geraet2d, virus2d, koerper2d, planet2d, apfel2d) und symbol2d-Bildzeichen für alles andere, dazu Einblendungen (sprecher, text, tafel, formel, zeiger, kreis, diagramm). KEINE Blockwelt: keine Befehle figur, tier, welt, block, baue, tnt, explosion, kamera (3D). Der erste Befehl nach film ist "hintergrund …". Jeder Satz braucht ein echtes, passendes Bild; Kreise und Pfeile nur zum Hinzeigen.',
  minecraft: 'Stil: MINECRAFT. Benutze die 3D-Blockwelt mit Figuren, Tieren, Blöcken, Häusern und Effekten. Keine 2D-Simulation.',
  egal: 'Stil: Wähle selbst, was am besten passt.',
};

export async function kiSkript({ thema, alter = '3-5', stil = 'echt', vorher = null, aenderung = null, fehler = null }) {
  if (!kiBereit()) return { ok: false, fehler: 'Es ist noch kein API-Schlüssel eingetragen.', schluessel: true };
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const e = einstellungenLesen();
  const client = e.apiKey ? new Anthropic({ apiKey: e.apiKey }) : new Anthropic();
  // Was-wäre-wenn-Fragen werden ausführlicher: etwa 10 Minuten
  const norm = String(thema).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const wasWaere = /(was\s+(passiert|passierte|geschieht|waere|wuerde|wird)\w*\b.{0,40}\bwenn\b|was\s+waere\s*,?\s*(wenn|ohne)|\bstell\s+(dir|euch)\s+vor\b|\bangenommen\b|gedankenexperiment|was\s+(waere|wuerde)\s+.{0,30}\b(ohne|keine?n?)\b|\bwenn\b.{0,60}\bwas\s+(dann|passiert))/.test(norm);
  const laenge = wasWaere ? `\nDas ist eine Was-wäre-wenn-Frage. Der Film soll ausführlicher sein als sonst: etwa 10 Minuten lang (bei 0–2 Jahren trotzdem nur 1 Minute; bei 3–5 Jahren etwa 90 bis 100 Sprecher-Sätze, ab 6 Jahren etwa 110 bis 130), in 6 bis 8 Kapiteln. Spiel mehrere Folgen und Varianten durch (z. B. plötzlich und langsam, für Menschen, Tiere, Pflanzen, Wetter) und erkläre am Anfang, wie es in Wirklichkeit ist.` : '';
  const nachrichten = [{ role: 'user', content: `Thema: ${thema}\nZielgruppe: ${ALTER[alter] || ALTER['3-5']}\nSchreibe direkt nach der film-Zeile: zielgruppe ${ALTER[alter] ? alter : '3-5'}\n${STIL[stil] || STIL.echt}${laenge}\n\nSchreib das Blockfilm-Skript.` }];
  if (vorher) {
    nachrichten.push({ role: 'assistant', content: '```blockfilm\n' + vorher + '```' });
    let bitte = '';
    if (fehler && fehler.length) bitte += `Beim Übersetzen gab es diese Fehler:\n${fehler.map(f => `Zeile ${f.zeile}: ${f.text}`).join('\n')}\nBitte korrigiere sie.\n`;
    if (aenderung) bitte += `Bitte ändere den Film so: ${aenderung}\n`;
    nachrichten.push({ role: 'user', content: bitte + 'Gib das vollständige neue Skript zurück.' });
  }
  try {
    const system = [{ type: 'text', text: systemText(), cache_control: { type: 'ephemeral' } }];
    const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }];
    const quellen = new Map();
    let antwort;
    // Websuche läuft auf dem Server; bei "pause_turn" einfach weitermachen lassen
    for (let runde = 0; runde < 5; runde++) {
      const stream = client.beta.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 64000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system,
        tools,
        messages: nachrichten,
      });
      antwort = await stream.finalMessage();
      for (const b of antwort.content) {
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
          for (const r of b.content) if (r.type === 'web_search_result' && r.url) quellen.set(r.url, r.title || r.url);
        }
      }
      if (antwort.stop_reason !== 'pause_turn') break;
      nachrichten.push({ role: 'assistant', content: antwort.content });
    }
    if (antwort.stop_reason === 'refusal') return { ok: false, fehler: 'Die KI wollte zu diesem Thema keinen Film machen. Versuch ein anderes Thema.' };
    const text = antwort.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (!/```/.test(text) && !/^\s*film\b/m.test(text)) return { ok: false, fehler: 'Die KI ist nicht fertig geworden. Versuch es nochmal.' };
    return { ok: true, skript: skriptAus(text), quellen: [...quellen].slice(0, 12).map(([url, titel]) => ({ url, titel })), verbrauch: antwort.usage };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, fehler: 'Der API-Schlüssel stimmt nicht. Bitte in den KI-Einstellungen prüfen.', schluessel: true };
    if (err instanceof Anthropic.PermissionDeniedError) return { ok: false, fehler: 'Der Schlüssel darf dieses Modell nicht benutzen (Konto prüfen).', schluessel: true };
    if (err instanceof Anthropic.RateLimitError) return { ok: false, fehler: 'Zu viele Anfragen gerade. Warte kurz und versuch es nochmal.' };
    if (err instanceof Anthropic.BadRequestError) return { ok: false, fehler: 'Anfrage abgelehnt: ' + err.message + ' (Ist Guthaben auf dem Konto?)' };
    if (err instanceof Anthropic.APIConnectionError) return { ok: false, fehler: 'Keine Verbindung zur KI. Bist du online?' };
    if (err instanceof Anthropic.APIError) return { ok: false, fehler: `KI-Fehler ${err.status}: ${err.message}` };
    if (String(err.message || err).includes('apiKey') || String(err.message || err).includes('API key')) return { ok: false, fehler: 'Es ist noch kein API-Schlüssel eingetragen.', schluessel: true };
    throw err;
  }
}

// ---------- Regie-Prüfung: die KI schaut sich Standbilder ihres eigenen Films an und bessert nach ----------
export async function kiRegie({ thema, alter = '3-5', stil = 'echt', skript, befunde = [], bilder = [] }) {
  if (!kiBereit()) return { ok: false, fehler: 'Es ist noch kein API-Schlüssel eingetragen.', schluessel: true };
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const e = einstellungenLesen();
  const client = e.apiKey ? new Anthropic({ apiKey: e.apiKey }) : new Anthropic();
  const inhalt = [{ type: 'text', text: `Du hast diesen Erklärfilm geschrieben. Thema: ${thema}. Zielgruppe: ${ALTER[alter] || ALTER['3-5']}\n${STIL[stil] || STIL.echt}\n\nHier ist dein Skript:\n\`\`\`blockfilm\n${skript}\`\`\`\n\nJetzt bist du die Regie und prüfst den fertigen Film. Unten siehst du Standbilder aus dem gerenderten Film (jeweils mit der Zeit und dem Satz, den der Sprecher gerade sagt).${befunde.length ? `\n\nEine automatische Prüfung hat das gefunden:\n${befunde.map(b => '- ' + b).join('\n')}` : ''}` }];
  for (const b of bilder) {
    inhalt.push({ type: 'text', text: `Bild bei ${String(b.t).replace('.', ',')} s – Sprecher: „${b.satz || '(nichts)'}“` });
    inhalt.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b.daten } });
  }
  inhalt.push({ type: 'text', text: `Prüfe: Passt zu jedem Satz ein klares Bild? Ist etwas leer, verdeckt, abgeschnitten, unter den Untertiteln oder zu voll? Überdecken sich Dinge ungewollt? Ist das Bild für die Zielgruppe verständlich und lebendig (Bewegung, Kamera)? Gibt es lange Pausen? Stimmt fachlich alles?
Wenn der Film gut ist, antworte nur mit: OK
Sonst gib das vollständige verbesserte Skript in einem Codeblock, der mit \`\`\`blockfilm beginnt. Denk an die Zeitregeln: Eine Zeile mit Dauer (z. B. "wachsen2d baum in 3", "bewege2d … in 2", "warte 2") hält den Film an, bis sie fertig ist – auch wenn sie mit & an eine Zeile gehängt ist, die selbst kein Sprecher ist. Soll etwas WÄHREND eines Satzes passieren, schreib es mit & direkt unter die sprecher-Zeile. Ändere nur, was nötig ist: Text, Ablauf und Länge bleiben, die Zeile "zielgruppe" und alle Einstellungen am Anfang auch. Schreib nach dem Codeblock in 1 bis 5 kurzen Zeilen, die mit "- " beginnen, was du verbessert hast (auf Deutsch, einfach formuliert).` });
  try {
    const stream = client.beta.messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: systemText(), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: inhalt }],
    });
    const antwort = await stream.finalMessage();
    if (antwort.stop_reason === 'refusal') return { ok: false, fehler: 'Die KI wollte den Film nicht prüfen.' };
    const text = antwort.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!/```/.test(text)) return { ok: true, geaendert: false, notizen: [] };
    const neu = skriptAus(text);
    const notizen = text.replace(/```[\s\S]*?```/g, '').split('\n').map(z => z.trim()).filter(z => z.startsWith('- ')).map(z => z.slice(2)).slice(0, 6);
    return { ok: true, geaendert: neu.trim() !== skript.trim(), skript: neu, notizen, verbrauch: antwort.usage };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, fehler: 'Der API-Schlüssel stimmt nicht.', schluessel: true };
    if (err instanceof Anthropic.RateLimitError) return { ok: false, fehler: 'Zu viele Anfragen gerade.' };
    if (err instanceof Anthropic.APIConnectionError) return { ok: false, fehler: 'Keine Verbindung zur KI.' };
    if (err instanceof Anthropic.APIError) return { ok: false, fehler: `KI-Fehler ${err.status}: ${err.message}` };
    throw err;
  }
}

// ---------- Aussprache-Prüfung: die KI hört (über die Lautschrift) mit, was die Stimme sagen wird ----------
async function kiFragen(client, system, nachrichten, tools) {
  let antwort;
  for (let runde = 0; runde < 5; runde++) {
    const stream = client.beta.messages.stream({
      model: 'claude-opus-5-5', max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'medium' }, system, tools, messages: nachrichten,
    });
    antwort = await stream.finalMessage();
    if (antwort.stop_reason !== 'pause_turn') break;
    nachrichten.push({ role: 'assistant', content: antwort.content });
  }
  nachrichten.push({ role: 'assistant', content: antwort.content });
  return antwort.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}
function jsonAus(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  try { const j = JSON.parse(m ? m[0] : text); return Array.isArray(j.korrekturen) ? j.korrekturen : []; } catch { return []; }
}
const HAEUFIG = new Set('der die das und ist ein eine einen einem einer es er sie wir ihr du ich in im an am auf aus mit von zu zum zur nicht noch auch so wie was wer wo da dann wenn man hat haben sind war sein ganz viel viele sehr schon nur oder aber den dem des bei nach für über unter vor kann können muss gibt jetzt hier dort mal ja nein'.split(' '));

export async function kiAussprache(skript, { aussprechen, lautschrift, eigeneLesen, eigeneSchreiben }) {
  if (!kiBereit()) return { ok: false, fehler: 'kein Schlüssel' };
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const e = einstellungenLesen();
  const client = e.apiKey ? new Anthropic({ apiKey: e.apiKey }) : new Anthropic();
  const { sprecherTexte } = await import('./aussprache.mjs');
  const woerter = new Set();
  for (const satz of sprecherTexte(skript)) for (const w of satz.match(/[\p{L}][\p{L}\p{N}'’-]*/gu) || []) if (!HAEUFIG.has(w.toLowerCase())) woerter.add(w);
  if (!woerter.size) return { ok: true, korrekturen: [] };
  const liste = [...woerter].slice(0, 1500).map(w => [w, aussprechen(w)]);
  const ipa = await lautschrift(liste.map(([, g]) => g));
  if (!ipa.size) return { ok: false, fehler: 'Lautschrift nicht verfügbar' };
  const tabelle = liste.map(([w, g]) => `${w} | ${g} | ${ipa.get(g) || '?'}`).join('\n');
  const system = [{ type: 'text', text: `Du prüfst die Aussprache einer deutschen Vorlesestimme (Piper, eSpeak-Phoneme). Ein Kinder-Erklärfilm wird damit vertont, und kein Wort darf falsch klingen.
Du bekommst eine Tabelle: Wort im Text | so bekommt die Stimme es | Lautschrift (IPA), so wird es wirklich gesprochen.
Suche jedes Wort, das falsch klingen würde: falsche Betonung, falsche Vokallänge, englische oder andere Fremdwörter, die deutsch gelesen werden, Namen, Marken, Abkürzungen, Zusammensetzungen, die falsch getrennt werden.
Ein Wort ist richtig, wenn es so klingt, wie ein deutscher Muttersprachler es normalerweise sagt (englische Lehnwörter also so, wie man sie in Deutschland ausspricht).
Wenn du bei einem Namen oder Fremdwort unsicher bist, schau mit der Websuche nach, wie man es ausspricht.
Für jedes falsche Wort schreibst du eine Ersatz-Schreibweise in normaler deutscher Rechtschreibung, die die Stimme richtig liest (zum Beispiel "Bluetooth" → "Bluhtuhs", "Orange" → "O-rangsch", "Satelliten" → "Satte-lieten"). Bindestriche trennen Wortteile, ein "h" nach dem Vokal macht ihn lang, ein doppelter Konsonant macht ihn kurz. Keine IPA-Zeichen in der Ersatz-Schreibweise.
Antworte nur mit JSON: {"korrekturen":[{"wort":"Wort genau wie im Text","schreibweise":"Ersatz"}]}. Wenn alles stimmt: {"korrekturen":[]}.` }];
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }];
  const nachrichten = [{ role: 'user', content: 'Prüfe diese Wörter:\n' + tabelle }];
  try {
    let korr = jsonAus(await kiFragen(client, system, nachrichten, tools)).filter(k => k && k.wort && k.schreibweise && woerter.has(k.wort));
    if (korr.length) {
      // Gegenprobe: so klingen die Ersatz-Schreibweisen wirklich
      const neu = await lautschrift(korr.map(k => k.schreibweise));
      nachrichten.push({ role: 'user', content: 'So spricht die Stimme deine Ersatz-Schreibweisen jetzt:\n' + korr.map(k => `${k.wort} → ${k.schreibweise} | ${neu.get(k.schreibweise) || '?'}`).join('\n') + '\nKlingt jetzt alles richtig? Verbessere, was noch nicht stimmt, und gib die vollständige endgültige JSON-Liste zurück.' });
      const zwei = jsonAus(await kiFragen(client, system, nachrichten, tools)).filter(k => k && k.wort && k.schreibweise && woerter.has(k.wort));
      if (zwei.length) korr = zwei;
    }
    if (korr.length) {
      const d = eigeneLesen();
      for (const k of korr) d[k.wort] = k.schreibweise;
      eigeneSchreiben(d);
    }
    return { ok: true, korrekturen: korr.map(k => ({ wort: k.wort, schreibweise: k.schreibweise })), gepruefteWoerter: liste.length };
  } catch (err) {
    return { ok: false, fehler: String(err.message || err) };
  }
}
