# Fretboard

Play a note on your guitar and see every spot on the neck where that pitch can be played, plus the major scale and chords that go with it. No guitar handy? Click any fret.

## How it works

- The mic comes in through `getUserMedia` and the Web Audio API, with the browser's voice processing (echo cancellation, noise suppression, auto gain) turned off.
- Each animation frame grabs 4096 samples and runs the McLeod pitch method ([pitchy](https://github.com/ianprime0509/pitchy)) to get a frequency and a clarity score.
- Frequency becomes a MIDI note with `69 + 12 * log2(f / 440)`. The leftover fraction is the cents readout.
- A median over recent readings plus a 3-frame hold keeps the display from flickering or jumping octaves.
- Fret positions are just `fret = note - openString` for each string.
- Scales, chords and note spelling come from [Tonal](https://github.com/tonaljs/tonal).

## Running it

Needs Node 20.

```
npm install
npm run dev
```

Chrome, Firefox and Safari all work. The mic needs `localhost` or https.
