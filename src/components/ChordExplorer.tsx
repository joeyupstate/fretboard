import { useState } from 'react';
import { Fretboard } from './Fretboard';
import { NOTE_NAMES } from '../lib/music';
import { chordFormula, spellChord } from '../lib/theory';
import { findVoicings, shapeString, stringSets } from '../lib/voicings';

const CHORD_TYPES = [
  { suffix: '', label: 'Major' },
  { suffix: 'm', label: 'Minor' },
  { suffix: '6', label: 'Major 6' },
  { suffix: 'm6', label: 'Minor 6' },
  { suffix: 'maj7', label: 'Major 7' },
  { suffix: '7', label: 'Dominant 7' },
  { suffix: 'm7', label: 'Minor 7' },
  { suffix: 'm7b5', label: 'm7♭5' },
  { suffix: 'dim', label: 'Diminished' },
  { suffix: 'dim7', label: 'Dim 7' },
  { suffix: 'aug', label: 'Augmented' },
  { suffix: 'sus2', label: 'Sus2' },
  { suffix: 'sus4', label: 'Sus4' },
  { suffix: 'add9', label: 'Add9' },
  { suffix: '9', label: 'Dominant 9' },
];

const INVERSION_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion', '4th inversion'];

// Button labels show both spellings for the black keys.
const ROOT_LABELS = NOTE_NAMES.map((n, pc) => (n.includes('#') ? `${n}/${NOTE_NAMES[(pc + 1) % 12][0]}b` : n));

export function ChordExplorer() {
  const [rootPc, setRootPc] = useState(0);
  const [suffix, setSuffix] = useState('');
  const [tab, setTab] = useState<'chord' | 'inversions'>('chord');
  const [setIndex, setSetIndex] = useState<number | null>(null);
  const [inversion, setInversion] = useState(0);
  const [positionIndex, setPositionIndex] = useState(0);

  const chord = spellChord(rootPc, suffix);
  const formula = chordFormula(chord.symbol);
  const sets = stringSets(chord.notes.length);
  // Default to the highest string set (3-1 for triads, 4-1 for sevenths), where these shapes are usually learned.
  const activeSet = Math.min(setIndex ?? sets.length - 1, sets.length - 1);
  const strings = sets[activeSet] ?? [];
  const inversions = chord.notes.map((bass, i) => ({
    bass,
    name: INVERSION_NAMES[i],
    voicings: findVoicings(chord.notes, bass, strings),
  }));
  const current = inversions[Math.min(inversion, inversions.length - 1)];
  const voicing = current?.voicings[Math.min(positionIndex, current.voicings.length - 1)];

  // Any change to the chord or strings starts the shape back at its lowest position.
  const resetPosition = () => setPositionIndex(0);

  return (
    <>
      <section className="picker">
        <div className="chips" role="group" aria-label="Root note">
          {ROOT_LABELS.map((label, pc) => (
            <button
              key={label}
              className={`chip chip--note ${pc === rootPc ? 'is-active' : ''}`}
              onClick={() => {
                setRootPc(pc);
                resetPosition();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Chord type">
          {CHORD_TYPES.map((t) => (
            <button
              key={t.label}
              className={`chip ${t.suffix === suffix ? 'is-active' : ''}`}
              onClick={() => {
                setSuffix(t.suffix);
                setInversion(0);
                resetPosition();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="readout">
        <div className="readout__note readout__note--chord">{chord.symbol}</div>
        <div className="readout__meta">
          <div className="readout__spots">{chord.name}</div>
          <div>Notes: {chord.notes.join(' · ')}</div>
          <div>Formula: {formula.join(' ')}</div>
        </div>
      </section>

      <div className="modes modes--small" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'chord'}
          className={tab === 'chord' ? 'is-active' : ''}
          onClick={() => setTab('chord')}
        >
          Chord
        </button>
        <button
          role="tab"
          aria-selected={tab === 'inversions'}
          className={tab === 'inversions' ? 'is-active' : ''}
          onClick={() => setTab('inversions')}
        >
          See inversions
        </button>
      </div>

      {tab === 'chord' ? (
        <>
          <Fretboard
            activeMidi={null}
            showOctaves={false}
            onSelect={() => {}}
            overlay={{ label: chord.symbol, root: chord.notes[0], notes: chord.notes }}
          />
          <ul className="legend">
            <li>
              <span className="legend__dot is-overlay" /> Every {chord.symbol} note on the neck (ring = root)
            </li>
          </ul>
        </>
      ) : (
        <>
          <section className="controls">
            <span className="muted">Strings:</span>
            <div className="chips">
              {sets.map((set, i) => (
                <button
                  key={set.join('')}
                  className={`chip ${i === activeSet ? 'is-active' : ''}`}
                  onClick={() => {
                    setSetIndex(i);
                    resetPosition();
                  }}
                >
                  {set[0] + 1}–{set[set.length - 1] + 1}
                </button>
              ))}
            </div>
          </section>

          <Fretboard activeMidi={null} showOctaves={false} onSelect={() => {}} picks={voicing?.frets ?? {}} />

          <section className="panel">
            <div className="card">
              <h2>Inversions on strings {strings.length ? `${strings[0] + 1}–${strings[strings.length - 1] + 1}` : ''}</h2>
              <ul className="inversions">
                {inversions.map((inv, i) => (
                  <li key={inv.bass}>
                    <button
                      className={`inversions__item ${i === inversion ? 'is-active' : ''}`}
                      onClick={() => {
                        setInversion(i);
                        resetPosition();
                      }}
                      disabled={inv.voicings.length === 0}
                    >
                      <span className="matches__symbol">{inv.name}</span>
                      <span className="muted">
                        {inv.bass} in bass
                        {i > 0 && ` · ${chord.symbol}/${inv.bass}`}
                      </span>
                      <span className="inversions__shape">
                        {inv.voicings.length ? shapeString(inv.voicings[0].frets) : 'no playable shape here'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>{current ? `${current.name}${voicing ? ` · ${shapeString(voicing.frets)}` : ''}` : ''}</h2>
              {current && current.voicings.length > 0 ? (
                <>
                  <p className="muted">
                    Position {Math.min(positionIndex, current.voicings.length - 1) + 1} of {current.voicings.length}
                    {voicing && voicing.position > 0 ? ` · starts at fret ${voicing.position}` : ' · open position'}
                  </p>
                  <div className="chips stepper">
                    <button
                      className="chip"
                      onClick={() => setPositionIndex((p) => Math.max(0, p - 1))}
                      disabled={positionIndex === 0}
                    >
                      ‹ Lower
                    </button>
                    <button
                      className="chip"
                      onClick={() => setPositionIndex((p) => Math.min(current.voicings.length - 1, p + 1))}
                      disabled={positionIndex >= current.voicings.length - 1}
                    >
                      Higher ›
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">No shape within a four-fret reach on these strings. Try another string set.</p>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
