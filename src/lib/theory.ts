import { Chord, Interval, Key, Note, Scale } from 'tonal';
import { noteName, pitchClass } from './music';

// How each pitch class is usually spelled as a key root (fewest accidentals).
const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const ROMAN_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

// Ordered roughly by how often guitarists reach for them.
const CHORD_SUFFIXES = ['', 'm', '5', '7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug'];

const TRIAD_ROLES = ['root', '3rd', '5th'];

export type ChordInfo = {
  symbol: string;
  name: string;
  notes: string[];
};

export type ContainingChord = ChordInfo & { role: string };

export type DiatonicChord = ChordInfo & { numeral: string };

export type Overlay = {
  label: string;
  root: string;
  notes: string[];
};

export function rootName(midi: number): string {
  return ROOT_NAMES[pitchClass(midi)];
}

// Both spellings for black-key notes, e.g. "C# / Db".
export function spellings(midi: number): string {
  const sharp = noteName(midi);
  const other = Note.enharmonic(sharp);
  return other && other !== sharp ? `${sharp} / ${other}` : sharp;
}

function chordInfo(symbol: string): ChordInfo {
  const chord = Chord.get(symbol);
  return { symbol, name: chord.name, notes: chord.notes };
}

export function chordsBuiltOn(root: string): ChordInfo[] {
  return CHORD_SUFFIXES.map((suffix) => chordInfo(root + suffix));
}

// Every major and minor triad that has this note in it, grouped by the role it plays.
export function chordsContaining(midi: number): ContainingChord[] {
  const target = pitchClass(midi);
  const found: ContainingChord[] = [];
  for (const root of ROOT_NAMES) {
    for (const suffix of ['', 'm']) {
      const chord = chordInfo(root + suffix);
      const index = chord.notes.findIndex((n) => Note.chroma(n) === target);
      if (index !== -1) found.push({ ...chord, role: TRIAD_ROLES[index] });
    }
  }
  return found.sort((a, b) => TRIAD_ROLES.indexOf(a.role) - TRIAD_ROLES.indexOf(b.role));
}

// Chord types a guitarist is most likely to mean, best first. Anything else ranks after these.
const COMMON_TYPES = [
  'major',
  'minor',
  'fifth',
  'dominant seventh',
  'major seventh',
  'minor seventh',
  'suspended fourth',
  'suspended second',
  'sixth',
  'minor sixth',
  'major add ninth',
  'dominant ninth',
  'major ninth',
  'minor ninth',
  'diminished',
  'diminished seventh',
  'half-diminished',
  'augmented',
];

// Types to try when looking for bigger chords that contain the picked notes.
const BUILDER_SUFFIXES = ['', 'm', '7', 'maj7', 'm7', 'sus4', 'sus2', '6', 'm6', 'add9', 'dim', 'aug'];

function typeRank(symbol: string): number {
  const index = COMMON_TYPES.indexOf(Chord.get(symbol).type);
  return index === -1 ? COMMON_TYPES.length : index;
}

// Tonal writes major as "CM" and "CMadd9"; guitarists write "C" and "Cadd9".
export function displaySymbol(symbol: string): string {
  return symbol.replace(/^([A-G][#b]*)M(?=add|\/|$)/, '$1');
}

const INTERVAL_NAMES: Record<string, string> = {
  '1P': 'unison',
  '2m': 'minor 2nd',
  '2M': 'major 2nd',
  '3m': 'minor 3rd',
  '3M': 'major 3rd',
  '4P': 'perfect 4th',
  '4A': 'tritone',
  '5d': 'tritone',
  '5P': 'perfect 5th',
  '5A': 'minor 6th',
  '6m': 'minor 6th',
  '6M': 'major 6th',
  '7m': 'minor 7th',
  '7M': 'major 7th',
};

// Name the gap from the lower note up to the higher one, e.g. C -> E = "major 3rd".
export function intervalName(from: string, to: string): string {
  const interval = Interval.distance(from, to);
  return INTERVAL_NAMES[interval] ?? interval;
}

// Which chord tone is in the bass decides the inversion.
function inversionOf(symbol: string): string {
  const [head, bass] = symbol.split('/');
  if (!bass) return 'root position';
  const tonic = Chord.get(head).tonic;
  if (!tonic) return `${bass} in bass`;
  const interval = Interval.distance(tonic, bass);
  if (interval.startsWith('3')) return '1st inversion (3rd in bass)';
  if (interval.startsWith('5')) return '2nd inversion (5th in bass)';
  if (interval.startsWith('7') || interval === '6M') return '3rd inversion (7th in bass)';
  // Add/sus tones in the bass: name the chord tone (a 2nd in an add9 chord is called the 9th).
  const degree = interval.startsWith('2') && head.includes('9') ? 9 : Number(interval[0]);
  const ordinal = degree === 2 ? '2nd' : `${degree}th`;
  return `${ordinal} in bass`;
}

export type NamedChord = ChordInfo & { inversion: string };

function describe(symbol: string): NamedChord {
  const spelled = respell(symbol);
  return { ...chordInfo(spelled), symbol: displaySymbol(spelled), inversion: inversionOf(spelled) };
}

// Minor chords follow their relative keys, so guitarists write C#m, F#m and G#m.
const MINOR_ROOT_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

// Re-spell the root the way it's usually written (Bb, not A#), keeping the bass note in tune with it.
function respell(symbol: string): string {
  const chord = Chord.get(symbol);
  if (!chord.tonic) return symbol;
  const [head, bass] = symbol.split('/');
  const names = chord.quality === 'Minor' || chord.quality === 'Diminished' ? MINOR_ROOT_NAMES : ROOT_NAMES;
  const root = names[Note.chroma(chord.tonic) as number];
  let out = root + head.slice(chord.tonic.length);
  if (bass) {
    const spelled = Chord.get(out).notes.find((n) => Note.chroma(n) === Note.chroma(bass)) ?? bass;
    out += `/${spelled}`;
  }
  return out;
}

// Name a set of notes, bass note first. Rare readings (like "Em#5" for a C/E) are dropped when a
// common name fits, and root position wins over a slash chord.
export function nameChord(notes: string[]): NamedChord[] {
  const found = Chord.detect(notes);
  const common = found.filter((s) => typeRank(s) < COMMON_TYPES.length);
  return (common.length ? common : found)
    .sort((a, b) => Number(a.includes('/')) - Number(b.includes('/')) || typeRank(a) - typeRank(b))
    .map(describe);
}

const TRIAD_TYPES = ['major', 'minor', 'diminished', 'augmented'];

// A three-note voicing (bass first) that forms a plain triad, or null. Doubled notes don't count.
export function triadOf(notes: string[]): NamedChord | null {
  if (new Set(notes.map((n) => Note.chroma(n))).size !== 3) return null;
  const symbol = Chord.detect(notes).find((s) => TRIAD_TYPES.includes(Chord.get(s).type));
  return symbol ? describe(symbol) : null;
}

// Bigger chords that include every picked note: what you could be building toward.
export function chordsContainingAll(notes: string[], exclude: string[] = [], limit = 12): ChordInfo[] {
  const wanted = new Set(notes.map((n) => Note.chroma(n)));
  const found: ChordInfo[] = [];
  for (const suffix of BUILDER_SUFFIXES) {
    for (const root of ROOT_NAMES) {
      const chord = chordInfo(respell(root + suffix));
      const chromas = new Set(chord.notes.map((n) => Note.chroma(n)));
      const coversAll = [...wanted].every((c) => chromas.has(c));
      if (coversAll && chromas.size > wanted.size) found.push({ ...chord, symbol: displaySymbol(chord.symbol) });
    }
  }
  return found
    .filter((c) => !exclude.some((e) => e.split('/')[0] === c.symbol))
    .sort((a, b) => a.notes.length - b.notes.length)
    .slice(0, limit);
}

export function majorScale(root: string): string[] {
  return Scale.get(`${root} major`).notes;
}

export function diatonicChords(root: string): DiatonicChord[] {
  return Key.majorKey(root).triads.map((symbol, i) => ({ ...chordInfo(symbol), numeral: ROMAN_NUMERALS[i] }));
}
