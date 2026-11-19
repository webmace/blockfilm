---
name: waswaere
description: Macht ein „Was wäre, wenn …?“-Erklärvideo mit Blockfilm (~/Work/blockfilm) im flachen, bunten Erklärvideo-Stil. Benutzen bei /waswaere oder wenn der Nutzer ein Was-wäre-wenn-Video, Gedankenexperiment-Video oder „Was passiert, wenn …“-Video haben möchte.
argument-hint: "<Frage> [Alter: 0-2 | 3-5 | 6-9 | 10+]"
---

# /waswaere – Was-wäre-wenn-Video mit Blockfilm

Du schreibst selbst das Drehbuch (ohne die KI-Schnittstelle von Blockfilm, das kostet den Nutzer nichts extra), prüfst es an Standbildern und lässt Blockfilm daraus ein Video machen.

Eingabe: `$ARGUMENTS`

- Die Frage ist das Thema. Rechtschreibung still korrigieren („dinosaria“ → „Dinosaurier“) und als saubere Frage formulieren: „Was wäre, wenn …?“
- Alter: steht eins dabei (`0-2`, `3-5`, `6-9`, `10+`), nimm das. Sonst immer `10+` (Wunsch des Nutzers für diesen Befehl), aber so erklärt, dass es auch Kinder von 6 bis 9 verstehen, siehe „Sprache“ unten.
- Fehlt die Frage ganz, schlag drei passende Fragen vor und frag, welche es sein soll.
- Sprich mit dem Nutzer auf Deutsch, in einfachen Worten. Er programmiert nicht selbst.

## 1. Einlesen (jedes Mal, die Befehle ändern sich oft)

- `~/Work/blockfilm/BEFEHLE.md` ganz lesen. Nur Befehle von dort benutzen.
- `~/Work/blockfilm/ki.mjs`: die Regeln in `systemText()` und der Text `laenge` für Was-wäre-wenn-Filme, dazu `ALTER` für die Zielgruppe. Diese Regeln gelten für dich genauso, mit zwei Ausnahmen: „Antworte NUR mit dem Skript“ gilt nicht, und alles über Glib gilt nicht (bei diesem Befehl gibt es weder Glib noch Fledermäuse, siehe unten).
- Als Muster für Form und Ton einen vorhandenen Film ansehen: `ls ~/Blockfilm/Skripte/KI/` und einen „Was wäre wenn …“-Film mit dem gleichen Alter lesen (falls es keinen gibt, irgendeinen).

## 2. Recherchieren

Zwei bis vier Websuchen zu dem, was Forscher zu der Frage sagen (Kinderlexika, öffentlich-rechtliche Wissensseiten, Wikipedia, NASA/ESA, Universitäten, Museen). Nur übernehmen, was mehrere Quellen bestätigen. Zahlen für Vergleiche notieren (Größe, Zeit, Temperatur). Quellen mit Titel und Adresse merken, sie kommen in die erste Zeile der Datei. Weiß man etwas nicht genau, sagt der Film das ehrlich.

## 3. Drehbuch schreiben

Aufbau eines Was-wäre-wenn-Films:

1. Aufhänger: eine neugierige Frage in den ersten zwei Sätzen, sofort mit Bild.
2. Wirklichkeit: kurz zeigen, wie es in echt ist (Kapiteltitel ohne Konjunktiv).
3. Der Schalter: „Jetzt stellen wir uns etwas vor, das in echt nicht passiert.“
4. Folgen Schritt für Schritt, von klein zu groß, jede mit eigenem Bild und Begründung. Vor jeder neuen Folge eine Frage an die Zuschauer („Was meinst du, was jetzt passiert?“), im nächsten Satz die Auflösung. Zeitangaben als Band: `text "Nach 1 Stunde" oben fuer 3`. Diese Kapitel heißen im Konjunktiv oder als Frage („Was wäre, wenn …?“, „Und wenn …?“).
5. Varianten durchspielen (plötzlich und langsam; für Menschen, Tiere, Pflanzen, Wetter).
6. Zurück in die Wirklichkeit, bei kleinen Kindern beruhigen (nur wenn es stimmt), Merke-Tafel oder gereimter Merksatz, `ausblenden 1.5`.

Richtig spannend (Wunsch des Nutzers, gilt für jeden Film dieses Befehls):

- `spannung an` steht im Kopf (dramatische Kapitelkarten, Trommelwirbel bei Fragen, Kamerafahrten).
- Einstieg mitten im Geschehen, noch vor Kapitel 1: vier bis sechs Sätze, die schon das Ausgedachte zeigen („Mitternacht. Irgendetwas stimmt hier nicht.“), dann „Um das zu verstehen, drehen wir die Zeit zurück.“
- Jedes Kapitel endet mit einer offenen Frage oder Ankündigung, die ins nächste zieht („Aber schau mal nach oben. Dort wird es jetzt richtig knapp.“).
- Eine laufende Uhr: Zeitbänder (`text "Nach 1 Minute" oben fuer 3`), Countdown mit `zahl2d` und `ton trommel`, `ton herzschlag` an knappen Stellen, `ton donner` beim großen Moment.
- Vom Kleinen zum Großen steigern; die unheimlichste Frage („Und wenn es für immer so bliebe?“) kommt kurz vor dem Schluss, danach die Erleichterung.
- Kurze Sätze an den spannendsten Stellen. Trotzdem nichts erfinden und nichts schlimmer machen, als die Forschung sagt.

Länge: etwa 10 Minuten in 6 bis 8 Kapiteln (0–2 Jahre: nur etwa 1 Minute; 3–5: 90 bis 100 Sprecher-Sätze; ab 6: 110 bis 130). Stimmung: 0–5 fröhlich und lustig, nichts Gruseliges; 6–9 spannend, nicht beängstigend; 10+ darf dramatisch sein (Countdown, großer Höhepunkt).

Sprache beim Standard (`10+`, verständlich ab 6): Der Film sieht aus und klingt spannend wie für Große (Countdown, große Zahlen, Höhepunkt), aber jeder Satz ist kurz und klar, höchstens etwa 14 Wörter. Jedes Fachwort wird im selben oder nächsten Satz mit einem Vergleich aus dem Alltag erklärt („Schwerkraft – die Kraft, die alles nach unten zieht“). Große Zahlen immer mit einem Vergleich („so schwer wie 100 Elefanten“). Keine Formeln ohne Erklärung in Worten, keine Schachtelsätze. Spannend, aber nicht beängstigend; am Ende beruhigen, wenn es stimmt. Die Längen- und Dramatik-Regeln aus `ki.mjs` für `10+` gelten, die Wortwahl richtet sich nach `6-9`.

Kopf des Skripts (in dieser Reihenfolge):

```
film 4k fps 30 titel "Was wäre, wenn …?"
zielgruppe 10+
look leuchtend
maskottchen aus
menschen bleiben
stimme standard tempo 0.95
sprechpause 0.5
spannung an
kapitel "1. …" 2.5
hintergrund …
```

`look leuchtend` steht in jedem Film dieses Befehls (helle, knallbunte Farben, die der Nutzer sich ausgesucht hat). `stimme` und `sprechpause` beim Standard und bis 9 Jahre; bei ausdrücklich gewünschtem `10+` „für Große“ weglassen. Keine Musik. Genau einmal `vorschaubild "1 bis 3 Wörter"` (höchstens 18 Zeichen) direkt unter der sprecher-Zeile, in der das wichtigste Ding groß, mittig und allein zu sehen ist.

Bildstil (der flache, bunte Look großer Wissenskanäle wie Kurzgesagt, mit unseren eigenen Figuren):

- Nur „echte Welt“, gebaut mit HyperFrames: Nur die 2D-Welt benutzen, also die Befehle aus dem Abschnitt „2D-Simulation“ plus Einblendungen (`sprecher`, `text`, `tafel`, `formel`, `zaehler`, `diagramm`, `zeiger`, `kreis`). Keine 3D-Blockwelt (`figur`, `tier`, `welt`, `block`, `baue`, `tnt`, `kamera …`) und kein `video`, `standbild`, `bild`. Nur dann baut Blockfilm den Film mit HyperFrames im flachen Stil (die Prüfung in Schritt 4 meldet, wenn das nicht so ist).
- Die Farben wirken am besten mit hellen Hintergründen: `erde` (mintgrüner Himmel, grüne Hügel), `abend` (pink bis gelb), `jura`/`kreide` (Urwald mit orangen Büschen), `meer`, `wueste`; `weltraum` und `tafel` nur, wo es zum Inhalt gehört. Hintergründe oft wechseln, mit `in 1` weich überblenden.
- Zeit- und Ortsangaben als Band oben links in Großbuchstaben: `text "Vor 6 Millionen Jahren" oben fuer 3`.
- Gezeichnete Objekte vor `symbol2d`-Bildzeichen (höchstens etwa eins pro Filmminute).
- Zu jedem Satz ein Bild, das genau das Gesagte zeigt und kurz vor dem Satz erscheint. In jedem Satz bewegt oder verändert sich etwas (`bewege2d`, `kippe2d`, `wachsen2d`, `faerbe2d`, `kamera2d`), mit `&` direkt unter der sprecher-Zeile. Nie länger als etwa 6 Sekunden ein stilles Bild.
- Große Vergleiche und Zahlen zeigen (`zaehler`, `zahl2d`, `reihe2d`, Heranzoomen und Wegzoomen mit `kamera2d`), dazu passende Geräusche mit `ton …`.
- Jedes Kapitel: `kapitel "…"`, passender `hintergrund`, am Ende alles mit `verstecke2d alles` ausblenden (einzeln: `verstecke2d a b c`). Boden bei y = -11, nichts Wichtiges unter y = -20, Dinge nebeneinander statt übereinander.
- Keine Fledermäuse und kein Glib (Wunsch des Nutzers vom 19.11.2026: alle Fledermäuse entfernen). `maskottchen aus` steht in jedem Film, in der Ecke sitzt niemand. Kein `fledermaus2d`, kein `fledermaeuse2d`, kein `maskottchen2d`. Der Sprecher erzählt als „wir“ und spricht die Zuschauer mit „du“ an.
- Wo eine Figur etwas tut (Forscherin, Zuschauer, Leute in der Stadt), nimm gezeichnete Menschen: `kind2d name bei x -11 groesse 11 farbe blau` (verschiedene Shirt-Farben). `menschen bleiben` im Kopf sorgt dafür, dass sie nicht automatisch weggelassen werden. Sie reagieren mit `bewege2d` und `kippe2d`.
- Eigene Bilder, eigene Texte: keine Figuren, Sätze oder Szenen aus fremden Videos nachbauen (auch nicht die Vögel von Kurzgesagt). Nur der Stil ist das Vorbild.
- Nie sagen, dass Film oder Stimme vom Computer gemacht sind.
- Text in Anführungszeichen enthält selbst keine geraden Anführungszeichen. Objektnamen sind keine Befehlswörter.

Speichern unter `~/Blockfilm/Skripte/KI/<Thema ohne Satzzeichen> (<Alter>).txt`, zum Beispiel `Was wäre wenn die Sonne ausgeht (3-5).txt`. Gibt es die Datei schon, frag nicht nach, sondern häng eine 2 an den Namen. Die erste Zeile ist immer (eine Zeile, gültiges JSON), dann erscheint der Film in der Film-Leiste der App:

```
#KI {"thema": "Was wäre, wenn die Sonne ausgeht?", "alter": "3-5", "stil": "echt", "quellen": [{"url": "https://…", "titel": "…"}]}
```

## 4. Prüfen und nachbessern

```
cd ~/Work/blockfilm && nice -n 15 node bin/filmpruefung.mjs "<skript>" --bilder "<scratchpad>/pruefung" --anzahl 12
```

(dauert ein bis drei Minuten; `<scratchpad>` ist dein Scratchpad-Ordner)

- Ende-Code 1: Übersetzungsfehler mit Zeilennummer. Beheben und noch einmal prüfen, bis keine mehr da sind.
- „Befunde“: leere Bilder, Dinge außerhalb oder unter den Untertiteln, Überdeckungen, Standbilder, zu viele Bildzeichen. Beheben.
- Die Standbilder (`bild-01.jpg` …, Liste in `bilder.txt`) und `vorschaubild.jpg` mit Read ansehen. Fragen dabei: Zeigt das Bild genau, was der Satz sagt? Ist es am Satzanfang schon da und nicht zu früh? Ist etwas leer, verdeckt, abgeschnitten, zu voll? Macht das Vorschaubild neugierig, ist das Hauptding groß und mittig?
- Einzelne Stellen noch einmal ansehen: `--bei 42,95.5` (Sekunden) statt `--anzahl`.
- Höchstens drei Runden. Ändere nur, was nötig ist.
- Meldet die Prüfung, dass der Film nicht nur die 2D-Welt nutzt: die 3D-Befehle entfernen.

Eine Dauer-Zeile (`bewege2d … in 2`, `wachsen2d … in 3`, `warte 2`) hält den Film an, bis sie fertig ist. Soll etwas während eines Satzes passieren, steht es mit `&` direkt unter der sprecher-Zeile (der nächste Satz beginnt, wenn Satz und Bewegung fertig sind, also Bewegungen nicht viel länger als den Satz machen). Steht eine Bewegung ohne `&` direkt VOR einer sprecher-Zeile, laufen beide gemeinsam los.

Erfahrungen aus dem ersten Film: Bildzeichen von Autos schauen nach links, also nach links fahren lassen. Es gibt keine gezeichneten Häuser, Autos, Flugzeuge: dafür `symbol2d` (zählt zu den Bildzeichen, die Prüfung mahnt ab etwa einem pro Minute, ein paar mehr sind in Ordnung). Spielt ein Kapitel in einer Welt ohne Lebewesen, stehen dort auch keine Figuren. Kahler Boden: `hintergrund wueste`. `licht2d` ist nur ein kurzer Lichtblitz: vor jedem Satz, in dem das Licht zu sehen sein soll, die Zeile wiederholen. `reihe2d … bei x y` beginnt links bei x (bei 8 Stück mit Abstand 9 also etwa bei -32) und baut sich Stück für Stück auf, darum höchstens etwa 16 Stück. Vor dem nächsten Bild die Kamera zurückstellen (`kamera2d bei 0 0 zoom 1 in 0.5`), wenn das Kapitel herangezoomt endet.

## 5. Aussprache

```
cd ~/Work/blockfilm && node bin/filmpruefung.mjs "<skript>" --aussprache
```

Die Tabelle zeigt in Lautschrift, wie die Stimme jedes Wort spricht. Such Wörter, die falsch klingen würden (Fremdwörter, Namen, Fachwörter, falsche Betonung oder Vokallänge). Für jedes davon eine Ersatz-Schreibweise in normaler Rechtschreibung in `~/Blockfilm/aussprache.json` eintragen (`"Bluetooth": "Bluhtuhs"`; Bindestrich trennt Wortteile, `h` nach dem Vokal macht ihn lang, Doppelkonsonant kurz), vorhandene Einträge behalten. Danach noch einmal mit `--aussprache` gegenprüfen. Meldet die Tabelle „Lautschrift nicht verfügbar“, diesen Schritt überspringen und es dem Nutzer sagen.

## 6. Video speichern

```
~/Work/blockfilm/bin/filmexport "<skript>" <alter>
```

Als Hintergrund-Befehl starten (`run_in_background`). Das Skript wartet selbst, bis kein anderer Export läuft, und speichert dann in 4K nach `~/Videos/Blockfilm/KI/<Name>.mp4`, das Vorschaubild als `<Name>.jpg` daneben. Der Fortschritt steht in der App unter „📋 Exporte“. Ein 10-Minuten-Film in 4K braucht auf diesem Rechner mehrere Stunden; will der Nutzer es schneller, `--1080p` oder `--720p` anhängen. Nie einen laufenden Export abbrechen und die App nicht neu starten.

## 7. Bescheid sagen

Kurz und in einfachen Worten: Titel und Länge des Films, drei bis fünf Dinge, die im Film passieren, wo das Skript liegt, wo das Video landet und dass es im Hintergrund gespeichert wird (mit Hinweis auf „📋 Exporte“). Ansehen kann er den Film schon vorher in der App: Er steht oben in der Film-Leiste (bei offener App mit F5 neu laden). Wenn der Export fertig oder fehlgeschlagen ist, sag es ihm.
