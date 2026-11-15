// Blockfilm – Was-wäre-wenn-Filme (Gedankenexperimente). Werden nur bei Was-wäre-wenn-Fragen gewählt.
(function () {
  const BF = window.BF;
  if (!BF.THEMEN) return;
  BF.THEMEN.erdestopp = {
    name: 'Was passiert, wenn die Erde aufhört, sich zu drehen?',
    wasWaere: true,
    erkennen: /erde\w*.{0,40}(aufhoer|aufhaer|stopp|stehen\s*bleib|stillsteh|anhalt|nicht\s+mehr\s+dreh|aufgehoert)|(aufhoer|stopp|stehen\s*bleib|stillsteh|anhalt).{0,40}erde|erde\w*.{0,20}(dreht\s+sich\s+nicht|ohne\s+drehung)/,
    kurz: `hintergrund weltraum
stimme standard tempo 0.82
sprechpause 1.3
kapitel "Die Erde dreht sich" 3
stern2d sonne bei -40 10 groesse 6 farbe gelb
planet2d erde bei 10 0 groesse 14 art erde
drehe2d erde periode 6
& ton magie
sprecher "Schau mal! Das ist die Erde."
sprecher "Sie dreht sich. Rundherum, wie ein Karussell."
symbol2d karussell "🎠" bei 34 14 groesse 7
sprecher "Hell ist Tag. Dunkel ist Nacht."
verstecke2d karussell
symbol2d mond "🌙" bei 34 14 groesse 6
sprecher "Am Tag spielen wir. In der Nacht schlafen wir."
sprecher "Die Erde dreht sich immer weiter. Jeden Tag."
ton tada
sprecher "Tschüss!"
ausblenden 1.5`,
    skript: `hintergrund weltraum
stimme standard tempo 0.88
sprechpause 0.9
kapitel "Was passiert, wenn die Erde aufhört, sich zu drehen?" 4
stern2d sonne bei -44 10 groesse 6 farbe gelb
planet2d erde bei 8 0 groesse 15 art erde
drehe2d erde periode 6
& ton magie
sprecher "Hallo! Schau mal, das ist unsere Erde."
sprecher "Die Erde dreht sich die ganze Zeit. Wie ein Kreisel."
sprecher "Einmal ganz herum dauert einen Tag und eine Nacht."
symbol2d kreisel "🌀" bei 34 14 groesse 6
sprecher "Wir merken davon gar nichts. Denn alles dreht sich mit: die Häuser, die Bäume, die Luft, das Meer und du."
verstecke2d kreisel
sprecher@6-9,10+ "Dabei ist die Erde unglaublich schnell! Am Äquator dreht sie sich mit über tausendsechshundert Kilometern in der Stunde. Schneller als ein Flugzeug!"
warte 1
text "Gedankenexperiment" 6 oben farbe gelb
symbol2d denken "🤔" bei 34 12 groesse 8
sprecher "Heute machen wir ein Gedankenexperiment. Das heißt: Wir stellen uns etwas vor, das in echt nicht passiert."
sprecher "Was wäre, wenn die Erde plötzlich aufhören würde, sich zu drehen?"
warte 1.5
verstecke2d denken
symbol2d ruhig "😊" bei 34 12 groesse 8
sprecher "Aber keine Angst! Das kann in Wirklichkeit nicht passieren. Es gibt nichts, was die Erde einfach anhalten könnte."
warte 1
verstecke2d ruhig
& verstecke2d erde
& verstecke2d sonne
kapitel "1. Warum dreht sich die Erde überhaupt?" 3
sprecher "Aber warum dreht sich die Erde eigentlich? Wer hat sie angeschubst?"
warte 1
hintergrund weltraum in 2
wolke2d staub1 bei -12 4 groesse 10
& wolke2d staub2 bei 12 -2 groesse 9
& wolke2d staub3 bei 0 10 groesse 8
& ton magie
sprecher "Vor sehr, sehr langer Zeit gab es noch keine Erde. Nur eine riesige Wolke aus Staub und Gas."
umlauf2d staub1 um staub2 periode 8
sprecher "Diese Wolke drehte sich ganz langsam. Und dann zog sie sich immer mehr zusammen."
symbol2d tanz "⛸️" bei 30 10 groesse 9
sprecher "Kennst du Eiskunstläufer? Wenn sie bei einer Pirouette die Arme anziehen, drehen sie sich plötzlich viel schneller."
sprecher "Genau so wurde die Staubwolke immer schneller, je kleiner sie wurde."
verstecke2d tanz
& verstecke2d staub1
& verstecke2d staub2
& verstecke2d staub3
stern2d sonne0 bei -30 0 groesse 6 farbe gelb
& planet2d erde0 bei 14 0 groesse 9 art erde
drehe2d erde0 periode 4
sprecher "Aus der Wolke wurden die Sonne und die Planeten. Und alle haben das Drehen einfach behalten."
sprecher "Im Weltall gibt es nichts, was sie bremst. Darum dreht sich die Erde seit Milliarden Jahren immer weiter."
sprecher@6-9,10+ "Fast alle Planeten drehen sich übrigens in dieselbe Richtung. Weil sie alle aus derselben Wolke stammen."
warte 1
verstecke2d sonne0
& verstecke2d erde0
kapitel "2. Woher wissen wir, dass sie sich dreht?" 3
hintergrund abend in 2
stern2d st1 bei -30 16 groesse 1.2 farbe weiss
& stern2d st2 bei -10 20 groesse 1 farbe weiss
& stern2d st3 bei 14 17 groesse 1.3 farbe weiss
& stern2d st4 bei 30 21 groesse 1 farbe weiss
sprecher "Wir spüren das Drehen nicht. Woher wissen wir dann, dass es stimmt?"
bewege2d st1 zu -20 22 in 8
& bewege2d st2 zu 0 24 in 8
& bewege2d st3 zu 24 22 in 8
& bewege2d st4 zu 40 24 in 8
sprecher "Schau nachts lange in den Himmel. Dann siehst du, wie die Sterne ganz langsam wandern."
sprecher "In Wirklichkeit wandern nicht die Sterne. Wir drehen uns unter ihnen weg."
symbol2d satellit "🛰️" bei 26 6 groesse 8
sprecher "Und Astronauten haben die Erde von oben fotografiert. Auf den Bildern sieht man, wie sie sich dreht."
sprecher@6-9,10+ "Vor über hundertfünfzig Jahren hat ein Forscher in Paris ein riesiges Pendel aufgehängt. Es schwang immer in dieselbe Richtung, aber der Boden drehte sich darunter weg. So konnte man das Drehen der Erde zum ersten Mal sehen."
warte 1
verstecke2d st1
& verstecke2d st2
& verstecke2d st3
& verstecke2d st4
& verstecke2d satellit
kapitel "3. Wie bei einer Vollbremsung" 3
hintergrund erde in 2
symbol2d bus "🚌" bei -44 -6 groesse 12
& symbol2d fahrgast "🧍" bei -44 -4 groesse 5
& ton schwung
bewege2d bus zu -2 -6 in 3
& bewege2d fahrgast zu -2 -4 in 3
sprecher "Stell dir vor, du stehst in einem Bus. Der Bus fährt schnell."
ton aufprall
bewege2d fahrgast zu 14 -4 in 0.6
& kippe2d fahrgast auf -40 in 0.5
sprecher "Und dann bremst der Bus ganz plötzlich. Hui! Du rutschst nach vorne."
sprecher "Dein Körper will einfach weiterfahren, auch wenn der Bus schon steht."
symbol2d gurt "🚗" bei 30 6 groesse 8
sprecher "Darum schnallen wir uns im Auto immer an!"
sprecher@6-9,10+ "Dass Dinge in Bewegung bleiben wollen, nennt man Trägheit."
sprecher "Genau so wäre es, wenn die Erde plötzlich stehen bleiben würde."
warte 1
verstecke2d bus
& verstecke2d fahrgast
& verstecke2d gurt
kapitel "4. Alles würde weiterrasen" 3
baum2d baum bei -24 -11 groesse 18 farbe gruen
& symbol2d haus "🏠" bei 22 -6 groesse 10
& wolke2d w1 bei -30 14 groesse 7
& wolke2d w2 bei 4 18 groesse 6
sprecher "Die Erde würde anhalten. Aber alles, was nicht ganz fest mit ihr verbunden ist, würde weitersausen."
bewege2d w1 zu 60 14 in 2
& bewege2d w2 zu 70 18 in 2
& ton wind
& symbol2d wind "💨" bei -6 6 groesse 9
sprecher "Zuerst die Luft! Es gäbe einen riesigen Sturm. Viel stärker als jeder Sturm, den es je gegeben hat."
& ton wind
sprecher@6-9,10+ "Am Äquator wäre der Wind schneller als ein Düsenflugzeug. Bäume und Häuser könnten das nicht aushalten."
verstecke2d wind
symbol2d welle "🌊" bei 0 2 groesse 12
& ton platsch
sprecher "Auch das Wasser in den Meeren würde weiterschwappen. Wie das Wasser in der Badewanne, wenn du ganz schnell aufstehst."
symbol2d wanne "🛁" bei 30 10 groesse 7
sprecher "Riesige Wellen würden über das Land rollen."
sprecher "Das wäre sehr gefährlich. Darum ist es gut, dass das nicht passieren kann!"
warte 1.5
verstecke2d baum
& verstecke2d haus
& verstecke2d welle
& verstecke2d wanne
kapitel "5. Und wenn sie ganz langsam anhält?" 3
symbol2d schnecke "🐌" bei 0 -6 groesse 10
sprecher "Jetzt stellen wir uns etwas anderes vor. Die Erde wird ganz, ganz langsam immer langsamer. Über viele tausend Jahre."
sprecher "Dann gäbe es keinen Sturm. Alles hätte Zeit, langsamer zu werden."
verstecke2d schnecke
hintergrund weltraum in 2
stern2d sonne2 bei 0 0 groesse 6 farbe gelb
planet2d erde2 bei 17 0 groesse 5 art erde
sprecher "Aber etwas wäre sehr seltsam. Die Erde fliegt ja immer noch um die Sonne. Einmal im Jahr."
umlauf2d erde2 um sonne2 periode 16
& ton schwung
sprecher "Wenn sie sich selbst nicht mehr dreht, schaut immer dieselbe Seite zur Sonne. Ein halbes Jahr lang."
sprecher "Erst wenn die Erde auf der anderen Seite der Sonne ist, wird es auf der anderen Seite hell."
zahl2d jahr "1 Tag = 1 Jahr" bei 0 18 groesse 6 farbe gelb
sprecher "Ein einziger Tag würde also ein ganzes Jahr dauern!"
warte 1
verstecke2d jahr
& verstecke2d sonne2
& verstecke2d erde2
hintergrund erde in 2
stern2d sonne3 bei -44 6 groesse 6 farbe gelb
bewege2d sonne3 zu 44 6 in 14
& kind2d kind bei -10 -11 groesse 12
& thermometer2d heiss bei 20 -3 groesse 14 wert 25
sprecher "Ein halbes Jahr lang wäre es hell. Die Sonne würde ganz, ganz langsam über den Himmel wandern."
temperatur2d heiss auf 60 in 6
& ton zisch
sprecher "Und weil sie so lange scheint, würde es immer heißer und heißer."
sprecher "Danach käme ein halbes Jahr lang die Nacht."
verstecke2d sonne3
hintergrund weltraum in 2
symbol2d mond2 "🌙" bei -30 14 groesse 7
& temperatur2d heiss auf -50 in 6
sprecher "Eine Nacht, die monatelang dauert! Dabei würde es eiskalt."
sprecher "Pflanzen und Tiere hätten es sehr schwer. Sie mögen es, wenn sich Tag und Nacht schnell abwechseln."
sprecher@6-9,10+ "Auch das Meer würde wandern. Weil sich die Erde dreht, ist sie am Äquator ein kleines bisschen dicker, wie ein leicht platt gedrückter Ball. Ohne Drehung würde das Wasser zu den Polen fließen."
sprecher@10+ "Dann gäbe es zwei riesige Ozeane im Norden und im Süden. Und dazwischen einen breiten Kontinent rund um den Äquator."
warte 1.5
verstecke2d kind
& verstecke2d heiss
& verstecke2d mond2
kapitel "6. Was wäre mit Tieren und Pflanzen?" 3
hintergrund erde in 2
symbol2d blume "🌻" bei -28 -6 groesse 9
& ton plopp
sprecher "Viele Tiere und Pflanzen haben eine innere Uhr. Sie wissen, wann Morgen und wann Abend ist."
sprecher "Manche Blumen öffnen ihre Blüten morgens und schließen sie abends."
symbol2d eule "🦉" bei -6 4 groesse 9
sprecher "Eulen schlafen am Tag und jagen in der Nacht."
symbol2d vogel "🐦" bei 16 8 groesse 8
sprecher "Und Vögel singen, wenn die Sonne aufgeht."
sprecher "Wenn ein Tag ein ganzes Jahr dauern würde, käme ihre innere Uhr völlig durcheinander."
symbol2d schlaf "😴" bei 32 -4 groesse 8
sprecher "Auch wir Menschen. Wann sollen wir schlafen, wenn es monatelang hell ist?"
sprecher@6-9,10+ "Forscher vermuten: Viele Tiere und Pflanzen müssten in Höhlen, ins Meer oder an die Grenze zwischen Tag und Nacht ziehen. Dort wäre es nicht zu heiß und nicht zu kalt."
warte 1
verstecke2d blume
& verstecke2d eule
& verstecke2d vogel
& verstecke2d schlaf
kapitel "7. Was wäre mit dem Wetter?" 3
wolke2d wo1 bei -26 12 groesse 8
& wolke2d wo2 bei 10 16 groesse 7
& ton wind
sprecher "Auch unser Wetter hängt mit dem Drehen der Erde zusammen."
sprecher "Weil sich die Erde dreht, wehen die großen Winde in Kurven um die Erde herum."
symbol2d wirbel "🌀" bei 26 2 groesse 9
sprecher "Darum drehen sich große Stürme wie ein Strudel im Kreis."
sprecher "Ohne Drehen gäbe es solche wirbelnden Stürme nicht mehr."
sprecher "Der Wind würde einfach geradeaus wehen. Von der heißen Tagseite zur kalten Nachtseite."
sprecher@6-9,10+ "Diese Ablenkung durch das Drehen nennt man Corioliskraft."
warte 1
verstecke2d wo1
& verstecke2d wo2
& verstecke2d wirbel
kapitel "8. Und wenn sie sich schneller drehen würde?" 3
hintergrund weltraum in 2
planet2d erde5 bei 0 0 groesse 13 art erde
drehe2d erde5 periode 1.2
& ton schwung
sprecher "Und jetzt andersherum: Was wäre, wenn sich die Erde viel schneller drehen würde?"
sprecher "Dann wären Tag und Nacht ganz kurz. Vielleicht nur ein paar Stunden."
sprecher "Kaum aufgestanden, wäre es schon wieder dunkel!"
sprecher "Die Winde wären viel stärker. Es wäre fast immer stürmisch."
sprecher@6-9,10+ "Und die Erde würde noch platter werden. Wie ein Pizzateig, den man in der Luft dreht."
& symbol2d pizza "🍕" bei 26 10 groesse 8
sprecher@10+ "Würde sich die Erde in weniger als anderthalb Stunden einmal drehen, würden Dinge am Äquator sogar schwerelos und könnten davonschweben."
warte 1
verstecke2d erde5
& verstecke2d pizza
kapitel "9. Ein Leben mit einem Jahres-Tag" 3
hintergrund zimmer in 2
kind2d kind7 bei -20 -11 groesse 12
& ton plopp
sprecher "Stell dir mal vor, wie dein Leben wäre, wenn ein Tag ein ganzes Jahr dauert."
symbol2d torte "🎂" bei 4 -2 groesse 8
sprecher "Du hättest jeden Tag Geburtstag! Denn ein Tag wäre ja so lang wie ein Jahr."
sprecher "Das klingt lustig. Aber es gäbe nur einen einzigen Sonnenaufgang im Jahr."
verstecke2d torte
symbol2d uhr "⏰" bei 4 -2 groesse 8
sprecher "Die Menschen müssten sich ganz neu überlegen, wann sie schlafen und wann sie arbeiten."
sprecher "Wahrscheinlich würden alle nach der Uhr leben. Und die Fenster im Sommer-Tag dunkel machen, damit man schlafen kann."
verstecke2d uhr
symbol2d lampe "💡" bei 4 -2 groesse 8
sprecher "Und in der langen Nacht bräuchte man monatelang Licht und Heizung."
sprecher "Gemüse müsste in großen Gewächshäusern mit Lampen wachsen."
sprecher@6-9,10+ "Ein bisschen so ist es heute schon in der Nähe vom Nordpol. Dort scheint im Sommer wochenlang die Sonne, und im Winter bleibt es wochenlang dunkel."
warte 1
verstecke2d kind7
& verstecke2d lampe
kapitel "10. Planeten, die sich fast nicht drehen" 3
hintergrund weltraum in 2
stern2d sonne6 bei -36 0 groesse 6 farbe gelb
& planet2d venus bei 10 0 groesse 11 art venus
drehe2d venus periode 40
& ton magie
sprecher "Gibt es so etwas wirklich? Ja! Schau mal, das ist die Venus. Unser Nachbarplanet."
& text2d "Venus" an venus 5
sprecher "Die Venus dreht sich unglaublich langsam."
sprecher "Ein Tag auf der Venus dauert länger als ein ganzes Jahr auf der Venus!"
sprecher "Und sie dreht sich sogar andersherum als die Erde. Dort geht die Sonne im Westen auf."
sprecher "Auf der Venus ist es aber überall glühend heiß. Viel heißer als in einem Backofen."
sprecher@6-9,10+ "Das liegt an ihrer dicken Lufthülle. Sie hält die Wärme fest wie eine riesige Decke."
planet2d merkur bei 32 -10 groesse 4 art mond
& text2d "Merkur" an merkur 5
sprecher "Auch der Merkur dreht sich sehr langsam. Ein Tag dort dauert fast sechs Monate."
sprecher "Er hat fast keine Luft. Darum ist es auf der Tagseite brütend heiß und auf der Nachtseite eiskalt."
sprecher "Genau so ähnlich wäre es auf einer Erde, die sich nicht mehr dreht."
warte 1
verstecke2d sonne6
& verstecke2d venus
& verstecke2d merkur
kapitel "11. Drei Fragen von Kindern" 3
hintergrund tafel in 2
symbol2d frage1 "❓" bei -30 10 groesse 9
& ton plopp
sprecher "Zum Schluss noch drei Fragen, die Kinder oft stellen."
sprecher "Erste Frage: Würden wir von der Erde herunterfallen, wenn sie sich nicht mehr dreht?"
warte 1.5
symbol2d apfel "🍎" bei -6 12 groesse 6
bewege2d apfel zu -6 -8 in 1.2
& ton aufprall
sprecher "Nein! Uns hält die Schwerkraft fest. Die zieht alles nach unten, ganz egal, ob sich die Erde dreht oder nicht."
verstecke2d apfel
symbol2d waage "⚖️" bei 12 2 groesse 8
sprecher "Zweite Frage: Wären wir dann schwerer oder leichter?"
warte 1.5
sprecher "Ein ganz kleines bisschen schwerer! Das Drehen schleudert uns nämlich ein winziges bisschen nach außen. Aber das würde man kaum merken."
verstecke2d waage
symbol2d mond7 "🌙" bei 30 10 groesse 8
sprecher "Dritte Frage: Gäbe es dann noch den Mond?"
warte 1.5
sprecher "Ja! Der Mond würde weiter um die Erde kreisen. Er braucht das Drehen der Erde nicht."
sprecher@6-9,10+ "Wir würden ihn sogar viel seltener auf- und untergehen sehen. Denn das Auf- und Untergehen kommt auch vom Drehen der Erde."
warte 1
verstecke2d frage1
& verstecke2d mond7
kapitel "12. Zum Glück dreht sie sich weiter" 3
stern2d sonne4 bei -44 8 groesse 6 farbe gelb
planet2d erde4 bei 0 0 groesse 13 art erde
& planet2d mond4 bei 26 8 groesse 3 art mond
drehe2d erde4 periode 6
umlauf2d mond4 um erde4 periode 14
& ton magie
sprecher "Zum Glück dreht sich die Erde einfach weiter. Seit Milliarden von Jahren."
sprecher "Aber wusstest du das? Sie wird ganz, ganz langsam ein winziges bisschen langsamer."
sprecher "Daran ist der Mond schuld. Er zieht am Wasser der Meere. Das bremst die Erde ein klitzekleines bisschen."
sprecher "Ein Tag wird dadurch in hundert Jahren nur ungefähr zwei Tausendstel Sekunden länger. Das merkt niemand."
symbol2d dino "🦖" bei 30 -10 groesse 7
sprecher@6-9,10+ "Zur Zeit der Dinosaurier war ein Tag darum ungefähr eine halbe Stunde kürzer als heute."
verstecke2d dino
sprecher@10+ "Bis die Erde ganz stehen bleiben würde, würde es viel länger dauern, als unsere Sonne überhaupt leuchten wird. Es passiert also nie."
warte 1.5
verstecke2d sonne4
& verstecke2d erde4
& verstecke2d mond4
hintergrund tafel in 2
tafel@3-5 "Merk dir:" "Die Erde dreht sich wie ein Kreisel." "Plötzlich anhalten: alles rutscht weiter." "Langsam anhalten: 1 Tag = 1 Jahr." "Keine Sorge: Das passiert nicht!" rechts 18
tafel@6-9 "Merk dir:" "Die Erde dreht sich in 24 Stunden einmal." "Plötzlicher Stopp: Trägheit, Sturm, Riesenwellen" "Langsamer Stopp: ein Tag dauert ein Jahr" "Der Mond bremst die Erde ganz wenig." "Die Erde hört nicht auf, sich zu drehen." rechts 20
tafel@10+ "Merke:" "Äquator: über 1600 km/h" "Trägheit: Luft und Wasser bewegen sich weiter" "Ohne Drehung: Tag = Jahr, Wasser zu den Polen" "Gezeitenreibung: + ca. 2 ms pro Tag in 100 Jahren" "Ein kompletter Stopp passiert nie" rechts 20
sprecher "Merk dir: Die Erde dreht sich wie ein Kreisel. Würde sie plötzlich anhalten, würde alles weiterrutschen. Wie im Bus."
sprecher "Würde sie ganz langsam anhalten, dann würde ein Tag ein ganzes Jahr dauern."
sprecher "Aber keine Sorge: Das passiert nicht. Die Erde dreht sich weiter, jeden Tag und jede Nacht."
ton tada
warte 2
sprecher "Tschüss! Und genieß den nächsten Sonnenaufgang!"
ausblenden 1.5`,
  };
})();
