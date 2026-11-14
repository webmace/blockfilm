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

## Musik und Töne

`musik froehlich` (auch: ruhig, spannend, episch, traurig, gruselig, aus) – wird beim Sprechen leiser.
`ton explosion` (auch: schlag, plopp, sprung, landen, puff, aua, jubel, lachen, schreck, zisch, donner, rakete, knall, magie, bruch, glocke, tada, trommel, fail, level, muenze, schwung)

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

## 2D-Simulation (echte Welt)

| Befehl | Beispiel |
|---|---|
| `hintergrund` | `hintergrund weltraum` (auch: erde, tafel, weiss) · `hintergrund aus` = zurück zur 3D-Welt |
| `stern2d` | `stern2d sonne bei -40 0 groesse 9 farbe gelb` |
| `planet2d` | `planet2d erde bei 18 0 groesse 9 art erde` (mond, mars, jupiter, venus, eis) |
| `loch2d` | `loch2d loch bei 0 0 groesse 3 scheibe` (schwarzes Loch, verbiegt den Sternenhimmel) |
| `kollaps2d` | `kollaps2d riese zu loch groesse 3 in 3` (Stern fällt zum schwarzen Loch zusammen) |
| `scheibe2d` | `scheibe2d loch an in 2` (leuchtendes Gas um das Loch) |
| `licht2d` | `licht2d von -58 0 richtung 0 anzahl 11 abstand 3.4` · `licht2d von sonne zu erde anzahl 7 faecher 6` |
| `auge2d` | `auge2d bei 44 0 groesse 3` |
| `rakete2d` | `rakete2d bei 0 -20 groesse 3 winkel 90` |
| `text2d` | `text2d "Erde" an erde 4` |
| `kamera2d` | `kamera2d bei 0 0 zoom 2 in 3` |
| `bewege2d` / `umlauf2d` / `drehe2d` | `bewege2d rakete zu 0 30 in 3` · `umlauf2d mond um erde periode 8` · `drehe2d erde periode 6` |
| `verstecke2d` | `verstecke2d auge` |

Positionen: Bildmitte ist 0 0, das Bild ist 100 Einheiten breit (bei Zoom 1).
