import { Chord, Key, Note, Scale } from 'tonal';
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

export function majorScale(root: string): string[] {
  return Scale.get(`${root} major`).notes;
}

export function diatonicChords(root: string): DiatonicChord[] {
  return Key.majorKey(root).triads.map((symbol, i) => ({ ...chordInfo(symbol), numeral: ROMAN_NUMERALS[i] }));
}
