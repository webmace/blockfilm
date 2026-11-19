# Blockfilm

Eigenes Programm für Erklärvideos: Aus einem Drehbuch in einfachen deutschen Befehlen wird ein fertiges Video (bis 4K) mit Sprecherstimme, Untertiteln und gezeichneten Bildern im flachen, bunten Stil.

## Starten

```
npm install
bin/blockfilm                          # Programm öffnen
bin/blockfilm --render film.txt -o film.mp4 --1080p   # Video ohne Fenster bauen
```

Gebraucht werden Node.js, Chromium und ffmpeg. Die Vorlesestimme (Piper) installiert `bin/stimme-installieren`.

- Alle Befehle für Drehbücher: [BEFEHLE.md](BEFEHLE.md)
- Aufbau des Programms: [CLAUDE.md](CLAUDE.md)

## Claude-Befehl /waswaere

Im Ordner `claude-befehl/waswaere` liegt ein Befehl für Claude Code. Mit `/waswaere <Frage>` schreibt Claude ein „Was wäre, wenn …?“-Drehbuch, prüft es an Standbildern und lässt Blockfilm das Video speichern.

Einrichten (einmal):

```
ln -s ~/Work/blockfilm/claude-befehl/waswaere ~/.claude/skills/waswaere
```

Der Befehl erwartet das Programm unter `~/Work/blockfilm`.

## Fremde Bestandteile

Schriften (OFL), GSAP, three.js und Twemoji-Grafiken (CC-BY 4.0) liegen unter `app/vendor`, siehe die Lizenzdateien dort.
