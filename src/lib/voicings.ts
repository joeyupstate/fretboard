import { Note } from 'tonal';
import { FRET_COUNT, STANDARD_TUNING, pitchClass } from './music';

export type Voicing = {
  frets: Record<number, number>; // string index (0 = high E) -> fret
  position: number; // lowest fretted fret, 0 if all open
};

// Widest stretch a hand comfortably covers: four frets, e.g. 5 through 8.
const MAX_SPAN = 3;
// Open strings only mix with fretted notes in open position; "0" next to fret 10 isn't a real shape.
const OPEN_POSITION_MAX = 4;

// Adjacent string groups of a given size, each listed low string first: [5,4,3], [4,3,2], ...
export function stringSets(size: number, tuning: number[] = STANDARD_TUNING): number[][] {
  const lowToHigh = tuning.map((_, i) => tuning.length - 1 - i);
  return lowToHigh.slice(0, lowToHigh.length - size + 1).map((_, k) => lowToHigh.slice(k, k + size));
}

// Every playable way to put this chord on these strings with `bass` as the lowest note:
// one chord tone per string, every tone used once, and a span a hand can reach.
export function findVoicings(
  chordNotes: string[],
  bass: string,
  strings: number[],
  tuning: number[] = STANDARD_TUNING,
  fretCount: number = FRET_COUNT,
): Voicing[] {
  const tones = chordNotes.map((n) => Note.chroma(n) as number);
  const bassChroma = Note.chroma(bass) as number;
  if (strings.length !== tones.length) return [];

  const results: Voicing[] = [];
  const chosen: number[] = [];

  const search = (k: number, used: Set<number>) => {
    if (k === strings.length) {
      const fretted = chosen.filter((f) => f > 0);
      const position = fretted.length ? Math.min(...fretted) : 0;
      const highest = fretted.length ? Math.max(...fretted) : 0;
      if (highest - position > MAX_SPAN) return;
      if (fretted.length < chosen.length && highest > OPEN_POSITION_MAX) return;
      results.push({ frets: Object.fromEntries(strings.map((s, i) => [s, chosen[i]])), position });
      return;
    }
    for (let fret = 0; fret <= fretCount; fret++) {
      const chroma = pitchClass(tuning[strings[k]] + fret);
      if (k === 0 ? chroma !== bassChroma : !tones.includes(chroma) || used.has(chroma)) continue;
      chosen.push(fret);
      search(k + 1, new Set(used).add(chroma));
      chosen.pop();
    }
  };

  search(0, new Set());
  return results.sort((a, b) => a.position - b.position);
}

// Chart notation for a voicing across all six strings, e.g. "xxx553".
export function shapeString(frets: Record<number, number>, tuning: number[] = STANDARD_TUNING): string {
  const lowToHigh = tuning.map((_, i) => tuning.length - 1 - i);
  const twoDigits = Object.values(frets).some((f) => f >= 10);
  return lowToHigh.map((i) => frets[i] ?? 'x').join(twoDigits ? '-' : '');
}
