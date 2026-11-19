# Blockfilm – alle Befehle

Ein Skript ist eine Textdatei. Jede Zeile ist ein Befehl. Die Zeilen laufen **nacheinander** ab.
Umlaute darfst du schreiben oder weglassen (`fällt` = `faellt`). Text steht in "Anführungszeichen".

## Grundregeln zur Zeit

| Schreibweise | Bedeutung |
|---|---|
| `steve geht zu 5 0` | läuft, die nächste Zeile beginnt danach |
| `& alex winkt` | **&** am Anfang: gleichzeitig mit der Zeile davor |
| `warte 2` | 2 Sekunden Pause |
| `@12 text "Hallo"` | genau bei Sekunde 12 |
| `... in 3` / `... 3s` | Dauer 3 Sekunden |
| `# Kommentar` | wird ignoriert |

Text-Einblendungen, Pfeile, Kreise usw. laufen **nebenher** (blockieren nicht). Für Wartezeit `warte` benutzen.

## Erklärvideo mit eigener Aufnahme

```
film 1080p
video "meine-aufnahme.mp4" von 0:05 bis 0:20
& sprecher "Schau mal, was passiert, wenn der Sand keinen Halt hat."
& kreis 48 40 radius 10 text "Sand"
```

Tipp: Video mit dem Knopf **＋ Video/Bild** einfügen oder einfach ins Fenster ziehen.
**Strg+Klick ins Vorschaubild** fügt die Position (x y) ins Skript ein.

### video
`video "datei.mp4" [von 0:10] [bis 0:25] [tempo 0.5] [lautstaerke 0.5 | stumm]`
Spielt einen Ausschnitt. `tempo 0.25` = Zeitlupe, `tempo 2` = Zeitraffer. Die Datei wird im Skript-Ordner, in `~/Blockfilm/Material` und in `~/Videos` gesucht.

### standbild
`standbild 3` – friert das letzte Bild des vorigen Videos 3 Sekunden ein.
`standbild "datei.mp4" bei 0:12 3` – bestimmtes Bild einfrieren.

### lupe (Zoom ins Bild)
`lupe 60 40 zoom 2.5 in 1` – zoomt sanft auf Position x=60 %, y=40 %.
`lupe aus in 1` – zurück.

### zeichentrick (Cartoon-Filter)
`zeichentrick an` · `zeichentrick an in 1 staerke 1 kanten 1.5 farben 5` · `zeichentrick aus in 1`
Wirkt auf das Video **und** auf 3D-Szenen.

### sprecher (Vorlesestimme + Untertitel)
`sprecher "Das ist die Schwerkraft." "Sie zieht alles nach unten."`
Mit installierter Stimme wird vorgelesen, sonst nur Untertitel. Die Szene wartet, bis fertig gesprochen ist.
`stimme thorsten tempo 1.1` – Stimme für alle folgenden Sprecher-Zeilen. `stimme standard tempo 0.88` = gewählte Stimme, etwas langsamer.
`sprechpause 0.9` – so viele Sekunden Pause nach jedem Sprecher-Satz.
`sprecher "..." ohne untertitel`

### kapitel
`kapitel "1. Warum fällt Sand?" 2.5` – schwarze Titelkarte.

## Zeichnen und Zeigen (Positionen in Prozent: x von links, y von oben)

| Befehl | Beispiel |
|---|---|
| `kreis` | `kreis 50 40 radius 8 farbe rot text "Hier!" fuer 3` |
| `rahmen` | `rahmen 20 30 25 20 text "Truhe"` (x y breite höhe) |
| `zeiger` | `zeiger von 20 80 nach 45 50 text "Schwerkraft" farbe gelb` |
| `linie` | `linie von 30 70 nach 70 70 text "4 Blöcke"` (Messlinie) |
| `kurve` | `kurve 10 80 30 35 55 25 80 70 text "Flugbahn" in 1.5 gestrichelt` |
| `notiz` | `notiz "Sand fällt,\nKies auch!" bei 75 25` |
| `bild` | `bild "skizze.png" bei 70 30 groesse 25 fuer 4` |

`in 1` = so lange wird gezeichnet, `fuer 3` = so lange bleibt es sichtbar.

## Erklär-Werkzeuge

| Befehl | Beispiel |
|---|---|
| `text` | `text "Hallo" 3 oben` (oben, mitte, unten) |
| `untertitel` | `untertitel "So geht das" 3` |
| `titel` | `titel "Mein Film" 3 karte` |
| `tafel` | `tafel "Merke:" "Punkt 1" "Punkt 2" rechts 8` |
| `formel` | `formel "F = m · a" "Kraft = Masse mal Beschleunigung" unten 5` |
| `diagramm` | `diagramm "Höhe" werte 3 5 9 namen "A" "B" "C" linie einheit "m" 6` |
| `zaehler` | `zaehler "Geschwindigkeit" von 0 bis 14.7 einheit "m/s" in 1.5` |
| `stoppuhr` | `stoppuhr start` · `stoppuhr stopp` · `stoppuhr aus` |
| `einblenden` / `ausblenden` | `ausblenden 1` · `einblenden 1` · `ausblenden 0.5 weiss` |

## Film-Einstellungen

```
film 1080p fps 30 titel "Mein Film"
```
Auflösungen: `4k`, `1440p`, `1080p`, `720p`, `hochkant` (1080×1920 für Shorts), `quadrat`, oder `2560x1080`.
`fps 60` · `film dauer 30` · `ende` (Film endet hier)

```
zielgruppe 3-5
```
`spannung an` / `spannung aus` – Spannungsmodus für Was-wäre-wenn-Filme (wird sonst automatisch erkannt): besondere Kapitelkarten, Trommelwirbel bei Fragen, langsames Heranfahren der Kamera, Wackeln bei Explosionen. Für 0–5 Jahre bleibt alles fröhlich (bunte Karten, Tada, kaum Wackeln), ab 10 wird es dramatisch.

Legt den Bildstil fest (`0-2`, `3-5`, `6-9`, `10+`): Farben, Schrift und wie lebhaft Dinge erscheinen und sich bewegen. Ohne diesen Befehl gilt die Auswahl in der App. Filme nur mit der 2D-Welt werden im neuen Flat-Look (wie bei Erklärvideos auf YouTube) mit HyperFrames gebaut; Filme mit der 3D-Blockwelt sehen aus wie bisher.

```
look leuchtend
```
Ein anderes Farbkleid für Filme mit der 2D-Welt: helle, knallbunte Flächen (mintgrüner Himmel, kräftig grüne Hügel, gelb-pinker Abend, leuchtendes Meer). Schrift und Bewegung bleiben wie bei der Zielgruppe. `look normal` = Farben der Zielgruppe. Steht am Anfang, direkt nach `zielgruppe`.

```
vorschaubild "Schrumpelfinger?!"
```
Das Vorschaubild (Thumbnail) für das Video, im Stil großer Wissens-Kanäle: Das wichtigste Ding in diesem Moment wird herangezoomt, die Farben werden kräftiger, der Rand dunkler, Untertitel verschwinden, und daneben stehen 1–3 Wörter in großer weißer Schrift (das letzte Wort gelb). Ein weißer Hintergrund wird durch einen tiefen Farbverlauf ersetzt. `bei 42` gibt den Moment in Sekunden an; steht die Zeile ganz am Anfang des Films, sucht Blockfilm den Moment selbst (passend zum Titel). Das Bild wird beim Export als JPEG neben das Video gelegt (`film.mp4` → `film.jpg`) und in der Film-Leiste und in „Alle Filme“ gezeigt. Ohne den Befehl wird aus dem Filmtitel ein kurzer Text gemacht.

## Musik und Töne

`musik froehlich` (auch: ruhig, spannend, episch, traurig, gruselig, aus) – wird beim Sprechen leiser.
`ton explosion` (auch: schlag, plopp, sprung, landen, puff, aua, jubel, lachen, schreck, zisch, donner, rakete, knall, magie, bruch, glocke, tada, trommel, fail, level, muenze, schwung, mampf, platsch, herzschlag, rascheln, wind, aufprall, bruellen, stampfen, grollen, quieken, schritt)
Geräuschwörter im Sprecher-Text („Mampf, mampf!“, „Platsch!“, „Bumm!“, „Boing!“, „Puff!“, „Hihi!“) werden automatisch als passendes Geräusch an genau dieser Stelle abgespielt. Das Wort wird dann nicht vorgelesen (im Untertitel steht es weiter).

## 3D-Blockwelt (Zusatz)

### Welt
`welt flach` · `welt huegel seed 3` · `welt insel` · `welt wueste` · `welt schnee` · `welt nether` · `welt leer` – Optionen: `groesse 64`, `boden sand`, `keinebaeume`, `wolken aus`
`himmel tag` (morgen, abend, nacht, gewitter, bewoelkt, nether, ende) · `himmel nacht in 5` · `regen in 5` · `schneefall in 5`

### Blöcke
`block stein 3 0 2` · `weg 3 0 2` · `fuelle bretter 0 0 0 4 3 4 [hohl]`
`baue baum 5 5` · `baue haus 0 -10 breite 7 tiefe 6` · `baue turm 8 0 hoehe 10` · `baue mauer 0 0 10 0 hoehe 3` · `baue pyramide 0 0 breite 9` · `baue saeule 0 0 hoehe 6` · `baue tntfeld 6 0 breite 3`
Blocktypen: gras, erde, stein, bruchstein, moosstein, steinziegel, holz, bretter, dunkle_bretter, blaetter, sand, kies, schnee, eis, wasser, glas, ziegel, obsidian, lava, leuchtstein, gold, eisen, diamant, smaragd, redstone, kohle, erze (kohle_erz …), grundgestein, netherrack, quarz, tnt, buecherregal, werkbank, kuerbis, ofen, wolle_rot (und andere Farben), beton_blau …

### Figuren
`figur steve bei -3 0 blick 90`
Arten: `mensch` (Standard), `zombie`, `skelett`, `ritter`, `dorfbewohner`, `hexe`, `koenig`, `pirat`, `ninja`, `roboter`
Tiere: `tier bello art hund` – schwein, kuh, schaf, hund, katze, pferd, huhn, spinne
Farben: `haut`, `haare`, `hemd`, `hose`, `schuhe`, `augen` (Name wie `rot` oder `#ff8800`) · `schmal`, `glatze`, `bart`, `brille`, `groesse 1.5`, `item schwert`
Eigener Skin: `figur alex skin "alex.png"` (64×64-Skin-Datei)
Dein Skin ist Standard: Jede Menschen-Figur ohne eigene Farben trägt automatisch `mein-skin.png` (eingestellt in `~/Blockfilm/einstellungen.json`). Im Skript ändern: `standardskin "anderer.png"` · `standardskin aus` · pro Figur: `figur bob ohneskin`

### Was Figuren können
`geht zu 5 0` · `laeuft zu alex` · `schleicht vor 3` · `geht zurueck 2` · `fliegt zu 0 8 0` · `teleportiert zu 5 5`
`springt` · `springt auf 3 1 0` · `dreht sich um` · `dreht links 90` · `schaut zu alex` · `schaut hoch`
`sagt "Hallo!"` · `ruft "Hey!"` · `fluestert "psst"` · `denkt "Hmm…"`
`winkt` · `nickt` · `schuettelt kopf` · `jubelt` · `lacht` · `weint` · `tanzt 4` · `zeigt auf 3 0 0` · `erschrickt` · `isst`
`schlaegt alex` · `schlaegt alex stark 5` (fliegt weg) · `faellt um` · `stirbt` · `steht auf` · `setzt sich` · `schlaeft 3`
`nimmt diamantschwert` (schwert, axt, spitzhacke, schaufel, fackel, bogen, blume, apfel, schild, buch, kuchen; Material: holz/stein/eisen/gold/diamant/netherit) · `steckt weg`
`baut stein 3 0 2` · `baut ab 3 0 2` · `wirft sand nach 5 0 0` · `verschwindet` · `erscheint bei 2 0`

### Kamera
`kamera bei 0 5 12 schaut auf steve` · `kamera faehrt zu 4 3 6 schaut auf alex in 3` · `kamera folgt steve [abstand 6] [hoehe 2] [hinten|vorne|links|rechts|oben]`
`kamera kreist um steve radius 6 in 8` · `kamera nah steve` · `kamera schulter steve alex` · `kamera ego steve` · `kamera totale` · `kamera schaut auf 0 2 0 in 1` · `kamera zoom 40 in 1` · `kamera wackeln 0.8`

### Physik
`tnt 0 0 0 zuender 3` (Kettenreaktion mit anderem TNT!) · `explosion 0 1 0 radius 4` · `fallen sand 0 15 0` · `wirf stein von 0 2 0 nach 8 0 0 hoehe 4` · `blockregen bunt -5 -5 5 5 anzahl 60 in 4` · `schwerkraft 10` · `abprall 0.5`
Sand und Kies fallen von selbst, wenn darunter nichts ist.

### Effekte
`rauch bei steve` · `herzen bei alex` · `funken 0 2 0` · `feuer 0 1 0 in 3` · `magie bei steve` · `feuerwerk 0 0 anzahl 5` · `blitz 3 3`

## Wissenschaft in 3D

| Befehl | Beispiel |
|---|---|
| `kugel` | `kugel ball bei 0 8 0 radius 0.4 farbe rot spur` (Planeten: `kugel erde bei 0 3 0 radius 1`) |
| `atom` | `atom sauerstoff bei 0 3 0 mit namen` (oder `atom protonen 3 neutronen 4 elektronen 3`) |
| `molekuel` | `molekuel wasser bei 0 3 0` – wasser, co2, sauerstoff, stickstoff, wasserstoff, methan, ammoniak, kochsalz, dna |
| `sonnensystem` | `sonnensystem bei 0 0 0 mit namen tempo 1` |
| `pendel` | `pendel bei 5 0 0 laenge 4 winkel 30` |
| `pfeil` | `pfeil von 0 1 0 nach 0 4 0 farbe rot "Kraft"` (auch von/nach Figuren) |
| `beschriftung` | `beschriftung "Sonne" bei sonne` |
| `lineal` | `lineal von 0 0 0 nach 0 10 0 einheit m` |
| `vulkan` | `vulkan 0 0 hoehe 10` · `vulkan 0 0 ausbruch in 6` |
| `verstecke` | `verstecke ball` · `verstecke alles` |

Benannte Objekte bewegen: `ball faellt` · `ball fliegt mit 5 8 0` (Wurf) · `ball bewegt sich zu 3 2 0 in 2` · `erde kreist um sonne periode 8` · `ball dreht sich in 2` · `ball waechst auf 2 in 1` · `kamera folgt erde`

## 🤖 KI macht den ganzen Film

Oben im Reiter **Beschreiben**: Thema eintippen (z. B. „Warum ist der Himmel blau?“), Alter wählen (0–2, 3–5, 6–9, 10+), **Film machen** klicken.
Die KI sucht zuerst im Internet nach verlässlichen Fakten und schreibt dann den ganzen Film mit Sprecher, Bildern und Merksatz. Danach kannst du Änderungen wünschen („mach es kürzer“, „mit einem Hund“) und auf **Ändern** klicken.
Einmalig nötig: ein API-Schlüssel von Anthropic (⚙ neben dem Knopf). Ein Film kostet ungefähr 10–15 Cent.

## Einfach beschreiben (ohne Programmieren)

Im Reiter **✍️ Beschreiben** schreibst du normale Sätze. Darunter steht für jeden Satz, was daraus wurde (✓) oder ein Tipp (⚠).

Fertige Erklärfilme (ein Satz reicht):
- „Erkläre, warum ein schwarzes Loch schwarz ist.“
- „Erkläre, warum es Tag und Nacht gibt.“
- „Erkläre, warum der Mond nicht auf die Erde fällt.“

Sätze, die verstanden werden: „Zeig mein Video von Sekunde 5 bis 12“, „in Zeitlupe“, „Der Sprecher sagt: …“, „Mach bei Sekunde 2 einen roten Kreis oben rechts“, „Pfeil auf die Mitte“, „Zoom zweifach unten links“, „Standbild für 3 Sekunden“, „Mach es als Zeichentrick“, „Tafel: Merke, Punkt 1, Punkt 2“, „Formel "E = m · c²"“, „Stoppuhr starten“, „Spannende Musik“, „Ich sage "Hallo" und winke“, „Zeig ein Sauerstoff-Atom“, „Am Ende ausblenden“.
Strg+Klick ins Vorschaubild fügt „bei x y“ ein.

## 2D-Simulation (echte Welt) – gezeichnete Bilder

**So wird ein Film schön:** Zu JEDEM Sprecher-Satz gehört ein echtes Bild, das genau das zeigt, worüber gesprochen wird.
Benutze die gezeichneten Objekte unten und `symbol2d` (Bildzeichen). Linien, Kreise und Pfeile (`kurve`, `kreis`, `zeiger`) sind nur zum Zeigen auf etwas, nie, um Dinge zu malen.
Jede Szene beginnt mit einem passenden `hintergrund`. Am Ende eines Kapitels alle Objekte mit `verstecke2d` ausblenden.

**Positionen:** Bildmitte ist 0 0, x geht von -50 (links) bis 50 (rechts), y von -28 (unten) bis 28 (oben). Der Boden liegt bei y = -11: Figuren, Bäume, Pflanzen, Tiere und Dinos stellst du mit `bei x -11` auf den Boden (die Position ist ihr Fußpunkt). Unter y = -20 stehen die Untertitel, dort nichts Wichtiges hinstellen.
**Namen:** Jedes Objekt bekommt einen eigenen Namen (z. B. `banane1`). Namen dürfen keine Befehlswörter sein (nicht: links, rechts, baby, leer, fossil, skelett, gut, nah, wolke).
**Bewegen:** `bewege2d name zu x y in 3` (Tiere laufen dabei), `kippe2d name auf 90 in 1` (drehen), `kamera2d bei x y zoom 2 in 2` (heranzoomen; danach `kamera2d bei 0 0 zoom 1 in 2`).
**Drehen mit kippe2d:** positive Zahl = gegen den Uhrzeigersinn. Eine aufrechte Figur liegt nach `kippe2d name auf 90` mit dem Kopf nach links und den Füßen nach rechts, nach `kippe2d name auf -90` mit dem Kopf nach rechts und den Füßen nach links. Soll etwas mit den Füßen zu einem Ziel rechts zeigen, nimm also 90.
**Beschriften:** Teile eines Objekts beschriftest du mit `text2d "Füße" an astro 4 stelle unten` (stelle: oben, unten, links, rechts, mitte – das dreht mit, wenn das Objekt gekippt ist). Das ist viel genauer als ein `zeiger`. Wenn du doch einen `zeiger` oder `kreis` brauchst (Prozent-Angaben), rechne so um: Prozent-x = 50 + x, Prozent-y = 50 − 1,78 · y.

### Maskottchen Glib
`maskottchen2d glib bei -30 -11 groesse 7` – unser Maskottchen: ein kleiner bunter Schleim. Er wackelt, blinzelt, schaut zum Neuesten im Bild, bewegt den Mund, wenn gesprochen wird, und hüpft bei `bewege2d glib zu …`. Mit `schweben` schwebt er (z. B. im Weltraum oder unter Wasser). Ohne eigenes `maskottchen2d` erzählt Glib den Film: er steht in jedem Kapitel in einer freien unteren Ecke und spricht mit; `maskottchen aus` schaltet das ab.
Glib passt sich der Umgebung an: unter Wasser (`meer`) fährt er U-Boot, im Weltraum trägt er einen Helm, im Schnee Mütze und Schal, in der Wüste Sonnenhut und Brille, in der Urzeit einen Forscherhut, unter dem Mikroskop sitzt er in einer Blase. Als Erzähler läuft er zwischen den Sätzen herum und hüpft bei Ausrufen.
Glib ist die Sprecherstimme: `sprecher`-Sätze stehen in der Ich-Form („Hallo! Ich bin Glib.“, „Ich frage mich: Warum …?“). Sätze wie „Glib fragt: …“ oder „Glib badet …“ werden automatisch umgeschrieben („Warum …?“, „Ich bade …“), außer bei `maskottchen aus`.
Menschenfiguren (`kind2d`), die nichts tun und im Text nicht vorkommen, werden weggelassen (`menschen bleiben` schaltet das ab).
Dinge, die es nur einmal gibt (Mond, Sonne, Erde, Mars …), stehen nie doppelt im Bild: kommt ein neuer Mond dazu, verschwindet der alte.

### Fledermäuse (unsere Figuren statt Menschen)
`fledermaus2d bob bei -15 -11 groesse 8` – eine Fledermaus (Position = Füße). Alle sind dunkel, fast schwarz, mit großen weißen Augen. Zusätze: `links`, `fliegt` (schwebt mit Flügelschlag), `haengt` (kopfüber; die Position ist dann die Stelle, an der sie hängt). Mit `bewege2d bob zu 20 5 in 3` fliegt sie los. Sie blinzelt und schaut zum Neuesten im Bild.
`fledermaeuse2d schwarm anzahl 6 bei 0 12 abstand 11 groesse 5 fliegt` – eine ganze Gruppe; sie heißen `schwarm1` … `schwarm6` (einzeln bewegen und mit `verstecke2d` ausblenden).
`maskottchen fledermaus` – ganz am Anfang des Films: Der Erzähler in der Ecke ist eine Fledermaus statt Glib (ohne Namensschild). Der Sprecher redet dann nicht von Glib.

### Tiere
`tier2d hund bei -20 -11 groesse 7` – gezeichnete Tiere: `hund`, `katze`, `vogel`, `huhn`, `eule`, `frosch`, `schildkroete`, `eidechse`, `hase`, `maus`. Ohne eigenen Namen heißt das Tier wie seine Art (`bewege2d hund zu 10 -11 in 2`). Sie atmen, blinzeln, laufen mit Beinen in ihre Richtung; Frosch und Hase hüpfen, Vögel flattern, der Hund wedelt. Tier-Emojis bei `symbol2d` (🐦 🐸 🐢 …) werden automatisch als gezeichnetes Tier gezeigt. Andere Arten bei `tier2d` sind Dinosaurier (wie `dino2d`).

### Hintergründe
`hintergrund erde` (Himmel und Wiese) · `weltraum` · `abend` (Sonnenuntergang) · `wueste` · `schnee` · `zimmer` (drinnen) · `mikro` (unter dem Mikroskop) · `tafel` (Schultafel) · `weiss` · `meer` (unter Wasser) · `urzeit` · `jura` · `kreide` · `staub` · `eiszeit` · `erdschichten`. Mit `hintergrund jura in 2` wird weich übergeblendet.

### Bildzeichen für alles, was es nicht als Zeichnung gibt
| Befehl | Beispiel |
|---|---|
| `symbol2d` | `symbol2d banane1 "🍌" bei 10 0 groesse 8` – jedes Emoji geht: 🍌 🍎 🥕 🐝 🐶 🐱 🦋 🌻 🌧️ ⚡ 🔥 💧 🚗 🚀 🏠 🏰 📱 💡 🔬 🧪 🥚 🦴 🌋 ☀️ 🌙 ⭐ 🎵 🧼 🩹 💊 … |
| `zahl2d` | `zahl2d z1 "3 + 2 = 5" bei 0 10 groesse 8 farbe gelb` (große Zahlen und Rechnungen) |
| `text2d` | `text2d "Banane" an banane1 5` (Schild an einem Objekt, 5 Sekunden) · `text2d "Kopf" an kind 5 stelle oben` (an eine Stelle des Objekts) |

### Natur, Wetter, Menschen
| Befehl | Beispiel |
|---|---|
| `kind2d` | `kind2d kind bei -16 -11 groesse 12` (Kind; `farbe blau` = anderes Shirt) · `niesen2d kind rechts` |
| `hand2d` | `hand2d hand1 bei 10 0 groesse 8 [schrumpelig]` (offene Hand) · `schrumpel2d hand1 [aus] [in 1.5]` (Fingerkuppen bekommen Rillen bzw. werden wieder glatt). `symbol2d` mit 🖐️/✋/🤚 wird automatisch zu dieser Hand; sie wird von selbst schrumpelig, wenn der Sprecher von Schrumpeln, Rillen oder Falten spricht, und wieder glatt bei „wieder glatt“. |
| `rosine2d` / `handtuch2d` | `rosine2d r1 bei 0 0 groesse 5` · `handtuch2d t1 bei 0 0 groesse 8 farbe blau` (dafür gibt es kein passendes Emoji; ein Bildzeichen mit dem Namen oder der Beschriftung „Rosine“/„Handtuch“ wird automatisch so gezeichnet) |
| `koerper2d` | `koerper2d k bei 0 -26 groesse 48` (Mensch von vorne) · `zeige2d k herz` (gehirn, nerven, herz, blut, lunge, magen, darm, knochen, alles) · `essen2d k` · `winke2d k in 3` |
| `baum2d` | `baum2d baum bei 16 -11 groesse 20 farbe gruen` · `faerbe2d baum zu gelb in 3` · `blaetterfallen2d baum anzahl 30 in 7` · `wachsen2d baum in 3` |
| `pflanze2d` | `pflanze2d p1 art farn bei -20 -11 groesse 8` (farn, palmfarn, nadelbaum, schachtelhalm, blume, gras, busch) |
| `blatt2d` | `blatt2d blatt bei -6 4 groesse 13 farbe gruen` (ein großes Blatt) |
| `wolke2d` | `wolke2d w1 bei 0 14 groesse 8` (mit `regen` regnet sie) |
| `regenbogen2d` | `regenbogen2d bogen bei 15 -11 groesse 22` |
| `kaktus2d` / `pinguin2d` | `kaktus2d k1 bei 18 -11 groesse 9` · `pinguin2d p1 bei 14 -11 groesse 7` |
| `thermometer2d` | `thermometer2d t bei 18 -3 groesse 14 wert 25` · `temperatur2d t auf 39 in 3` |
| `stern2d` / `planet2d` | `stern2d sonne bei -40 14 groesse 6 farbe gelb` · `planet2d erde bei 18 0 groesse 9 art erde` (mond, mars, jupiter, venus, eis) |
| `licht2d` | `licht2d von sonne zu baum anzahl 5 faecher 4` (Lichtstrahlen; „zu“ einem Objekt: die Strahlen enden dort und leuchten auf. Weißes Licht wird in Glas und Wasser gebrochen und fächert sich in Regenbogenfarben auf, an schwarzen Löchern biegt es sich) |
| `prisma2d` | `prisma2d prisma bei 0 2 groesse 10` – Glas-Prisma: `licht2d von sonne zu prisma anzahl 3 faecher 1` zeigt, wie weißes Licht in Farben zerfällt |
| `tropfen2d` | `tropfen2d tropfen bei 10 2 groesse 8` – großer Wassertropfen: Licht geht hinein, wird hinten gespiegelt und kommt als Regenbogen-Fächer zurück |
| `luft2d` / `atome2d` | `luft2d luft bei 10 8 breite 40 hoehe 22 anzahl 50` (Luftteilchen) · `atome2d a bei 6 -2 spalten 4 zeilen 6 groesse 0.8 farbe orange` |
| `wand2d` / `geist2d` | `wand2d wand bei 6 -11 hoehe 24 breite 5` (mit `fenster` aus Glas) · `geist2d geist bei -36 2 groesse 6` |
| `vulkan2d` | `vulkan2d v bei -26 -11 groesse 18` · `ausbruch2d v in 6` |
| `meteor2d` | `meteor2d stein von -45 30 nach 30 -12 in 6` (Asteroid mit Einschlag) |
| `rakete2d` / `auge2d` | `rakete2d r bei 0 -20 groesse 3 winkel 90` · `auge2d a bei 44 0 groesse 3` |

### Tiere und Dinosaurier
| Befehl | Beispiel |
|---|---|
| `dino2d` | `dino2d rex art trex bei -18 -11 groesse 14` – Arten: trex, allosaurus, raptor, spinosaurus, klein, plateosaurus, parasaurolophus, langhals, diplodocus, triceratops, stegosaurus, ankylosaurus, dimetrodon, urvogel, mammut; im Wasser oder in der Luft (Position = Körpermitte): plesiosaurus, ichthyosaurus, mosasaurus, fisch, qualle, trilobit, flugsaurier. Zusätze: `links` (schaut nach links), `baby`, `skelett` |
| `bruelle2d` / `blick2d` | `bruelle2d rex` · `blick2d rex links` |
| `zeitleiste2d` | `zeitleiste2d zl bei 0 10 breite 86` (Erdzeitalter; `nurdinos`, `zahlen`) · `zeitpunkt2d zl auf jura in 1.5` |
| `kontinente2d` | `kontinente2d k bei 0 0 groesse 18 art pangaea` (pangaea, jura, kreide, heute) · `drift2d k auf heute in 5` |

### Keime und Körper
| Befehl | Beispiel |
|---|---|
| `virus2d` / `bakterie2d` | `virus2d v1 bei 18 4 groesse 3` · `bakterie2d b1 bei -18 4 groesse 5` (`gut` = freundlich) · `teilen2d b1 in 3` |
| `zelle2d` | `zelle2d z bei 14 0 groesse 13` · `vermehren2d z anzahl 14 in 6` · `platzen2d z` |
| `abwehr2d` / `antikoerper2d` | `abwehr2d polizei bei -20 2 groesse 6` · `antikoerper2d ak bei 4 -8 groesse 1.6` |
| `blasen2d` | `blasen2d bei -10 -6 anzahl 16 in 5` (Seifenblasen) |

### Technik
| Befehl | Beispiel |
|---|---|
| `geraet2d` | `geraet2d handy bei -16 2 groesse 18 art handy` (handy, tablet, laptop, pc) · `bildschirm2d handy zeigt foto` (apps, foto, anruf, spiel, video, nachricht, internet, code, aus) |
| `bauteil2d` | `bauteil2d chip bei 10 4 groesse 9 art chip` (chip, speicher, kamera, lautsprecher, platine, router) |
| `akku2d` / `bits2d` / `pixel2d` | `akku2d akku bei 0 0 groesse 18 wert 10` (`temperatur2d akku auf 100 in 5` lädt ihn) · `bits2d b bei 0 0 groesse 5 wert 01000001` · `pixel2d px bei 0 2 groesse 24` (`nah` = rote, grüne, blaue Lämpchen) |
| `mast2d` / `wellen2d` | `mast2d m bei 0 -11 groesse 26` · `wellen2d von handy nach m in 8` (Funkwellen) · `daten2d paeckchen von a nach b in 8` |

### Mathe
| Befehl | Beispiel |
|---|---|
| `apfel2d` / `reihe2d` | `apfel2d a1 bei -16 0 groesse 5` · `reihe2d s anzahl 12 bei -15 13 abstand 9 zeile 4 art stern groesse 3` (Namen s1 … s12) |
| `form2d` | `form2d f bei 0 0 groesse 6 art dreieck farbe gelb` (kreis, dreieck, quadrat, rechteck, sechseck, stern, wuerfel, kugel) |
| `pizza2d` | `pizza2d pizza bei 0 0 groesse 12 teile 4` · `pizzaweg2d pizza anzahl 1` |

### Ausblenden
`verstecke2d name` blendet ein Objekt aus. Mehrere auf einmal: `verstecke2d baum1 hase wolke1`. Eine ganze Gruppe (`leute1` … `leute6`): `verstecke2d leute`. Alles im Bild: `verstecke2d alles`. Mit `hintergrund aus` geht es zurück zur 3D-Welt.
