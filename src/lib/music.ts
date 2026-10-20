export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// MIDI numbers of the open strings, string 1 (high E) first.
export const STANDARD_TUNING = [64, 59, 55, 50, 45, 40];

export const FRET_COUNT = 22;

export type Position = {
  string: number; // 1 = high E, 6 = low E
  fret: number;
  midi: number;
  exact: boolean; // same pitch and octave as the target note
};

export function freqToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function noteName(midi: number): string {
  return NOTE_NAMES[pitchClass(midi)];
}

export function octave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

// Every spot on the neck that plays this note. Exact-pitch spots are flagged;
// the rest are the same note name in other octaves.
export function positionsFor(midi: number, tuning: number[] = STANDARD_TUNING, fretCount: number = FRET_COUNT): Position[] {
  const positions: Position[] = [];
  tuning.forEach((open, i) => {
    for (let fret = 0; fret <= fretCount; fret++) {
      const m = open + fret;
      if (pitchClass(m) === pitchClass(midi)) {
        positions.push({ string: i + 1, fret, midi: m, exact: m === midi });
      }
    }
  });
  return positions;
}
