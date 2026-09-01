# Ryan im a new student at liberty

## Ryanify — Spotify-style web player

A self-contained, Spotify-inspired music web app in a single `index.html` — no build step, no dependencies, no audio files.

**Try it:** just open `index.html` in any modern browser.

### Features

- 🎨 Spotify-style dark UI: sidebar, playlist cards, track list, and bottom player bar
- ▶️ Fully working playback — tracks are synthesized live in the browser with the Web Audio API (chords, bass, kick, hi-hats, and a generative melody per track)
- ⏯️ Play/pause, next/previous, shuffle, repeat, seek bar, and volume control
- ⌨️ Spacebar toggles play/pause
- 📱 Responsive layout for smaller screens

### How it works

Each track in the catalog defines a tempo, chord progression, root note, and scale. A lookahead scheduler builds the audio graph in real time, so the whole "album" ships as data instead of MP3s.
