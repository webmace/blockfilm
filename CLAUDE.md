# Blockfilm

Erklärfilm-Generator: Claude schreibt ein Skript in einer deutschen Befehlssprache (`BEFEHLE.md`), `BF.kompiliere()` (app/js/skript.js) macht daraus den Ablaufplan `F`, daraus wird ein Video.

## Start
- `node server.mjs [skript.txt]`: App-Fenster öffnen (Port 47811)
- `node server.mjs --server`: nur der Server (`BF_PORT`, Standard 47812)
- `node server.mjs --render skript.txt -o film.mp4 [--720p|--1080p|--4k]`: headless exportieren
- Es gibt keine Tests und keinen Build-Schritt. Das Frontend besteht aus einfachen IIFE-Skripten am globalen `window.BF`.

## Zwei Renderer
- **HyperFrames** (`app/js/hf/`): für Filme, die nur die 2D-Welt nutzen (`BF.hf.passt(F)`). Flat-Look im Kurzgesagt-Stil, je nach Zielgruppe.
  - `stile.js`: ein Stil pro Zielgruppe `0-2 | 3-5 | 6-9 | 10+` (Palette, Schrift, Rundheit, GSAP-Eases). Dazu der Skriptbefehl `zielgruppe`.
  - `grafik.js`: SVG-Hintergründe mit Parallax-Ebenen und SVG-Objekte. `HF.portiert(o)` sagt, welche 2D-Objekte schon als SVG existieren.
  - `rest2d.js`: alle übrigen 2D-Objekte (Akku, Atome, Auge, Bits, Blatt, Geist, Hülle, Kaktus, Kontinente, Luft, Mast, Meteor, Pinguin, Pixel, Pizza, Rakete, Regenbogen, Thermometer, Vulkan, Wand, Zeitleiste). Nur das schwarze Loch (`loch`) zeichnet bewusst weiter der alte Zeichner (Gravitationslinse).
  - `twemoji-liste.js` + `app/vendor/twemoji/`: `symbol2d`-Emojis werden als flache Twemoji-SVGs gezeigt (CC-BY 4.0, siehe `LIZENZ.txt`). Der Export kopiert nur die benutzten Dateien.
  - `tiere2d.js` (+ Engine `app/js/tiere.js`): gezeichnete Tiere (`tier2d`), ersetzen auch Tier-Emojis; Verhalten in `HF.bewegung.tier`.
  - `keime2d.js`: Virus, Bakterie (mit Teilung), Zelle, Abwehrzelle, Antikörper und der Körper mit Organen (Herz, Blut, Nerven, Lunge, Essen, Winken).
  - `figuren2d.js`: Dinos (Geometrie aus `BF.DINO_ARTEN` in urzeit.js), Meerestiere und Flugsaurier, Geräte mit Bildschirmen, Pflanzen und Bäume. Was von der Lage abhängt (Blickrichtung, Laufen, Brüllen, Bildschirmwechsel), setzt `HF.bewegung[typ](el, o, t, F, pos, I)` bei jedem Seek.
  - `komponiere.js`:
    - `HF.komponiere(F, daten)` baut in der App das statische HTML.
    - `HF.starte(daten)` läuft in der Komposition: Es übersetzt dasselbe Skript noch einmal, baut die GSAP-Timeline (`window.__timelines.film`) und hört auf `hf-seek`.
    - Positionen und Kamera kommen aus `BF.w2dIntern` (welt2d.js).
    - Noch nicht portierte Objekte, `zeichne2D`-Hilfen, Diagramme und Zähler zeichnet der alte Canvas-Zeichner in `#leinwand`.
  - Export: `/api/hf/start` (server.mjs) kopiert `app/js` + `app/vendor` in `~/.cache/blockfilm/hf/<id>/` und rendert mit `@hyperframes/producer`. Mit `BF_HF_BEHALTEN=1` bleibt der Ordner zum Untersuchen erhalten.
  - Vorschau in der App: Ein iframe (`#hfVorschau`, `srcdoc`) liegt über der Canvas und wird über `__bfZeige(t)` gesteuert.
- **Alte Engine** (three.js + Canvas2D, `szene.js`): für alles mit 3D-Blockwelt, Figuren, Physik oder Videoclips. Bilder werden einzeln an ffmpeg geschickt (`/api/video/*`).

## Maskottchen Glib
- `app/js/maskottchen.js` (Engine, beide Renderer): Befehl `maskottchen2d` (Typ `schleim`), `maskottchen aus`, Glib als Erzähler: in jedem Kapitel fest in einer freien unteren Ecke, unabhängig von der Kamera (Hook `BF.nachKompilieren`, Objekte mit `auto: true`). `kind2d mia` wird zu Glib (kleiner).
- Zeichnung und Verhalten im neuen Stil: `OB.schleim` / `HF.bewegung.schleim` in `hf/figuren2d.js`. Wird beim Heranzoomen räumlicher (Tiefe, Glanz, Bläschen-Parallaxe).
- Glibs Platz (`belegung` in maskottchen.js) wird im Bild gemessen (mit Kamera), auch Zeiger zählen; sind beide Ecken belegt, hüpft er kurz aus dem Bild.
- Merk-Tafeln am Rand schieben das Bild zur Seite (`tafelSchub` in welt2d.js `kamera()`), nur so weit wie nötig. Zähler ohne Dauer verschwinden 7 s nach dem Zählen bzw. an der nächsten Kapitel- oder Merkkarte (wissen.js). Namensschilder bleiben im Bild und über den Untertiteln (komponiere.js).
- Einmalige Dinge (Mond, Sonne, Erde …, gleicher Name): `neuesObjekt` (welt2d.js) blendet das alte aus, wenn ein neues dazukommt.
- Glib ist die Erzählstimme: `BF.vorKompilieren` (Hook in skript.js, läuft vor dem Übersetzen) schreibt in maskottchen.js Sprechersätze über Glib in die Ich-Form um (`BF.glibIchForm`). Die Zeilenzahl bleibt dabei gleich.
- ⚫/🕳-Bildzeichen, die „Loch“ heißen oder so beschriftet sind, werden zum echten schwarzen Loch (`typ 'loch'`, dinge.js). Gibt es im Film ein Loch, malt der alte Zeichner den Weltraum (Gravitationslinse); seine Leinwand liegt dann unter den SVG-Dingen (`P.mitLoch`), sonst darüber.
- `app/js/dinge.js` + `hf/dinge2d.js`: gezeichnete Hand (mit Schrumpel-Rillen, `o.schrumpel`), Rosine und Handtuch. Hand-Emojis und Bildzeichen mit dem Namen oder der Beschriftung „Rosine“/„Handtuch“ werden automatisch dazu.
- `hf/keime2d.js` `OB.koerper`: Kind von vorne mit kurzer Hose. Organe liegen anatomisch richtig (Herz und Magen auf der Bildseite rechts), die Nerven gehen vom Gehirn über das Rückenmark bis in Finger und Zehen.
- SVG-Klassennamen nicht doppelt vergeben: `.schatten` ist für Planeten reserviert (wird zur Sonne gedreht).

## Spannung (Was-wäre-wenn)
- `app/js/spannung.js`: erkennt Was-wäre-wenn-Filme (`BF.filmIstWasWaere`: Titel, KI-Thema, erste Kapitelkarte; Achtung, `BF.istWasWaere` aus klartext.js ist etwas anderes), Stufe nach Zielgruppe (`kind`/`mittel`/`voll`). Karten mit `tx.spannung`, Geräusche `trommelwirbel`/`tusch`/`spannung` (ton.js), 2D-Kamerawackeln `F.w2d.wackeln` (welt2d.js `kamera()`).

## Film-Übersicht und Hintergrund-Exporte
- Vorschaubild: Befehl `vorschaubild "Titel" [bei t]` (app/js/vorschaubild.js, setzt `F.vorschaubild`). `window.__bfVorschaubild()` (komponiere.js) wählt den Moment (sonst automatisch passend zum Titel), blendet Texte aus, zoomt auf das Hauptmotiv, ersetzt weiße Hintergründe, blendet Angeschnittenes und Dinge hinter dem Text aus und setzt 1–3 Wörter groß daneben (`HF.kurzTitel` als Ersatz). `vorschaubildMachen()` (server.mjs) macht daraus `<video>.jpg` (1920×1080) nach jedem HF-Export (`bildHtml` bei `/api/hf/start`). Nur das Bild: `server.mjs --render skript.txt --nurbild -o bild.jpg`.
- KI-Knopf: Ist ein KI-Film offen, bedeutet die Eingabe eine Änderung. Eine neue Frage („Warum …?“ ohne Änderungswörter, `istNeuesThema` in ui.js) startet trotzdem einen neuen Film, sonst würde der alte unter seinem Thema überschrieben.
- Film-Leiste oben (`#flListe`): zuerst die fertigen Videos (aus `/api/exporte`, Klick spielt sie im `#spieler` ab, wird alle 30 s neu geladen), dann KI-Filme, dann Themen-Filme.
- Jeder neue oder geänderte KI-Film wird nach dem Speichern automatisch in die Export-Warteschlange `/api/stapel` gestellt (Auflösung aus `#gal-aufl`).
- Button „🎬 Alle Filme“ (`#galerie`, ui.js): fertige Videos (Abspielen im `#spieler`), KI-Filme, Themen-Filme, eigene Skripte; jeweils Ansehen oder Exportieren.
- Nachtfilme: `~/Blockfilm/Nachtfilme/*.txt` sind aus `BF.THEMEN` erzeugt (`film`-Zeile + `vorschaubild` + `ohnevideo` + `BF.themaSkript(th, '3-5')`); nach Änderungen an den Themen neu erzeugen. `bin/nachtfilme` baut fehlende Videos (danach auch alle KI-Filme nach `~/Videos/Blockfilm/KI/`), `bin/nachbessern name …` baut einzelne neu.
- Exporte von dort gehen in die Warteschlange `/api/stapel` (server.mjs). Sie laufen nacheinander als eigene Prozesse `server.mjs --render … --stimme … --sprechtempo … --alter …`. Themen-Filme werden vorher als Skript nach `~/.cache/blockfilm/stapel/` geschrieben.

## KI-Regie-Prüfung
Nach dem Schreiben eines KI-Films (Schalter „🎬 Regie“, nur für Filme mit der 2D-Welt):
- `app/js/hf/regie.js`: `HF.regieBefunde(F, skript)` findet automatisch leere Bilder, Objekte außerhalb oder unter den Untertiteln, Überdeckungen, lange Pausen (mit den Zeilen, die sie verursachen), volle Bilder und Emojis ohne Grafik. `HF.regieMomente` wählt die Zeitpunkte für Standbilder.
- `/api/ki/regie` (server.mjs) rendert die Komposition mit Puppeteer, macht Standbilder (1280×720 JPEG) und ruft `kiRegie()` (ki.mjs) mit Bildern und Befunden auf. Antwort: `OK` oder ein verbessertes Skript mit kurzen Notizen.
- `kiFilm()` (ui.js) macht höchstens zwei Runden. Die zweite gibt es nur, wenn die automatische Prüfung danach noch etwas findet. Hat die Nachbesserung Übersetzungsfehler, bleibt die vorige Fassung.

## Regeln für die Komposition
- Deterministisch: kein `Date.now()`, kein `Math.random()` (stattdessen `HF.zufall(seed)` / `BF.rng`), keine Timer, kein `repeat: -1`. Alles muss allein von der Zeit abhängen.
- Die App und die Komposition müssen dasselbe `F` berechnen. Was die Übersetzung beeinflusst, kommt deshalb in `laufDaten`: Skript, Sprechdauern zum Zeitpunkt des Kompilierens (`S.sprachStand`), `BF.stimmeWahl`, Zielgruppe. Passt etwas nicht, meldet `HF.starte` „Komposition passt nicht zum Skript“ in der Konsole.
- Neues 2D-Objekt im neuen Stil: in `grafik.js` `OB.<typ> = (o, stil, id) => ({ k, svg })` anlegen. Gezeichnet wird in Einheiten von `o.r` um den Positionspunkt, der Bereich geht von -k bis k. Farben immer über `HF.stilFarbe` / `stil.palette`.
- In SVG-`style`-Attributen keine doppelten Anführungszeichen (Schriftnamen wie `"Nunito"` vorher in `'` umwandeln).
- Schriften liegen lokal in `app/vendor/fonts` (OFL), GSAP in `app/vendor/gsap.min.js`. Die App läuft offline, also keine CDNs.

## Standbilder zum Testen
Eine Komposition mit `vorschau: true` bauen und mit Puppeteer (`node_modules/puppeteer-core`, Chromium unter `/usr/bin/chromium`) laden. Dann `window.__bfZeige(t)` aufrufen und einen Screenshot machen.
