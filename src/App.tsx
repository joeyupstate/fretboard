import { useEffect, useState } from 'react';
import { Fretboard } from './components/Fretboard';
import { NotePanel } from './components/NotePanel';
import { midiToFreq, noteName, octave, pitchClass, positionsFor } from './lib/music';
import { majorScale, rootName, spellings } from './lib/theory';
import type { ChordInfo, Overlay } from './lib/theory';
import { useNoteDetector } from './lib/useNoteDetector';

type Selection = { midi: number; source: 'mic' | 'click' };

// A chosen chord belongs to the note it was picked from, so it clears when a different note comes in.
type ChordPick = { chord: ChordInfo; pitchClass: number };

export default function App() {
  const { status, error, note, debug, devices, deviceId, start, stop } = useNoteDetector();
  const level = debug?.rms ?? 0;
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showOctaves, setShowOctaves] = useState(true);
  const [showScale, setShowScale] = useState(false);
  const [chordPick, setChordPick] = useState<ChordPick | null>(null);

  useEffect(() => {
    if (note) setSelection({ midi: note.midi, source: 'mic' });
  }, [note]);

  const listening = status === 'listening';
  const exactSpots = selection ? positionsFor(selection.midi).filter((p) => p.exact) : [];
  const fromMic = selection?.source === 'mic' && note;

  const activeChord = selection && chordPick?.pitchClass === pitchClass(selection.midi) ? chordPick.chord : null;
  let overlay: Overlay | null = null;
  if (activeChord) {
    overlay = { label: activeChord.symbol, root: activeChord.notes[0], notes: activeChord.notes };
  } else if (selection && showScale) {
    const root = rootName(selection.midi);
    overlay = { label: `${root} major scale`, root, notes: majorScale(root) };
  }

  const selectChord = (chord: ChordInfo) => {
    if (!selection) return;
    setChordPick(activeChord?.symbol === chord.symbol ? null : { chord, pitchClass: pitchClass(selection.midi) });
  };

  return (
    <main className="app">
      <header className="app__header">
        <h1>Fretboard</h1>
        <p>Play a note and see everywhere it lives on the neck. No guitar handy? Click a fret.</p>
      </header>

      <section className="controls">
        <button className={`button ${listening ? 'is-on' : ''}`} onClick={() => (listening ? stop() : start())} disabled={status === 'starting'}>
          {listening ? 'Stop listening' : status === 'starting' ? 'Starting…' : 'Start listening'}
        </button>
        {devices.length > 0 && (
          <select className="select" value={deviceId} onChange={(e) => start(e.target.value)} aria-label="Input device">
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Unnamed input'}
              </option>
            ))}
          </select>
        )}
        <div className="level" aria-hidden="true">
          {/* sqrt scale so quiet input still visibly moves the bar */}
          <div className="level__bar" style={{ width: `${Math.min(Math.sqrt(level) * 250, 100)}%` }} />
        </div>
        <label className="toggle">
          <input type="checkbox" checked={showOctaves} onChange={(e) => setShowOctaves(e.target.checked)} />
          Show other octaves
        </label>
      </section>
      {error && <p className="error">{error}</p>}
      {debug && (
        <p className="debug">
          {debug.inputLabel} · audio {debug.contextState} @ {debug.sampleRate}Hz · level {debug.rms.toFixed(4)} · raw{' '}
          {debug.rawFrequency.toFixed(1)}Hz · clarity {debug.clarity.toFixed(2)}
        </p>
      )}

      <section className="readout" aria-live="polite">
        {selection ? (
          <>
            <div className="readout__note">
              {noteName(selection.midi)}
              <span className="readout__octave">{octave(selection.midi)}</span>
            </div>
            <div className="readout__meta">
              <div>
                {spellings(selection.midi)} · {(fromMic ? note.frequency : midiToFreq(selection.midi)).toFixed(1)} Hz · MIDI{' '}
                {selection.midi}
              </div>
              {fromMic && (
                <div className="cents">
                  <div className="cents__track">
                    <div className="cents__needle" style={{ left: `${50 + note.cents}%` }} />
                  </div>
                  <span>
                    {note.cents > 0 ? '+' : ''}
                    {note.cents}¢
                  </span>
                </div>
              )}
              <div className="readout__spots">
                Same pitch at:{' '}
                {exactSpots.map((p) => `string ${p.string} ${p.fret === 0 ? 'open' : `fret ${p.fret}`}`).join(' · ')}
              </div>
            </div>
          </>
        ) : (
          <div className="readout__empty">{listening ? 'Listening… play a single note' : 'Start listening or click a fret'}</div>
        )}
      </section>

      <Fretboard
        activeMidi={selection?.midi ?? null}
        showOctaves={showOctaves}
        onSelect={(midi) => setSelection({ midi, source: 'click' })}
        overlay={overlay}
      />

      <ul className="legend">
        <li><span className="legend__dot is-exact" /> Same pitch</li>
        {showOctaves && <li><span className="legend__dot is-octave" /> Same note, other octave</li>}
        {overlay && <li><span className="legend__dot is-overlay" /> {overlay.label}</li>}
      </ul>

      {selection && (
        <NotePanel
          midi={selection.midi}
          showScale={showScale}
          activeChord={activeChord?.symbol ?? null}
          onToggleScale={() => setShowScale((on) => !on)}
          onSelectChord={selectChord}
        />
      )}
    </main>
  );
}
