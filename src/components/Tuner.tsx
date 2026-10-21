import { useState } from 'react';
import { STANDARD_TUNING, midiToFreq, noteName, octave } from '../lib/music';
import { useNoteDetector } from '../lib/useNoteDetector';

// Within this many cents counts as in tune; most tuners use about 5.
const IN_TUNE_CENTS = 5;
// Below this input level the string has stopped ringing.
const SILENT_RMS = 0.002;

type Target = { stringIndex: number; midi: number; freq: number };

const TARGETS: Target[] = STANDARD_TUNING.map((midi, stringIndex) => ({ stringIndex, midi, freq: midiToFreq(midi) }));

const centsBetween = (freq: number, target: number) => 1200 * Math.log2(freq / target);

export function Tuner() {
  const { status, error, note, debug, devices, deviceId, start, stop } = useNoteDetector();
  // null = auto: tune toward whichever string the note is closest to.
  const [locked, setLocked] = useState<number | null>(null);

  const listening = status === 'listening';
  const ringing = listening && (debug?.rms ?? 0) >= SILENT_RMS;
  const freq = note?.frequency ?? null;

  const target =
    locked !== null
      ? TARGETS[locked]
      : freq !== null
        ? TARGETS.reduce((best, t) => (Math.abs(centsBetween(freq, t.freq)) < Math.abs(centsBetween(freq, best.freq)) ? t : best))
        : null;

  const cents = freq !== null && target ? Math.round(centsBetween(freq, target.freq)) : null;
  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE_CENTS;
  // The needle stops at the ends of the gauge; the text still reports how far off a badly tuned string is.
  const needle = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const verdict =
    cents === null ? '' : inTune ? 'In tune' : cents < 0 ? `Tune up ↑ (${-cents}¢ flat)` : `Tune down ↓ (${cents}¢ sharp)`;

  return (
    <>
      <section className="controls controls--center">
        <button
          className={`button ${listening ? 'is-on' : ''}`}
          onClick={() => (listening ? stop() : start())}
          disabled={status === 'starting'}
        >
          {listening ? 'Stop tuner' : status === 'starting' ? 'Starting…' : 'Start tuner'}
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
      </section>
      {error && <p className="error">{error}</p>}

      <section className={`tuner ${inTune ? 'is-in-tune' : ''} ${ringing ? '' : 'is-idle'}`} aria-live="polite">
        <div className="tuner__target">
          {target ? `String ${target.stringIndex + 1} · ${noteName(target.midi)}${octave(target.midi)}` : 'Standard tuning'}
        </div>

        <svg className="tuner__gauge" viewBox="0 0 300 170" aria-hidden="true">
          {/* Ticks every 10 cents across a half circle; the center tick marks perfect pitch. */}
          {Array.from({ length: 11 }, (_, i) => {
            const angle = ((i - 5) / 5) * 70;
            const long = i === 5;
            return (
              <line
                key={i}
                className={`tuner__tick ${long ? 'is-center' : ''}`}
                x1="150"
                y1={long ? 22 : 32}
                x2="150"
                y2="50"
                transform={`rotate(${angle} 150 160)`}
              />
            );
          })}
          <path className="tuner__zone" d={arc(150, 160, 125, -7, 7)} />
          <line
            className="tuner__needle"
            x1="150"
            y1="160"
            x2="150"
            y2="40"
            transform={`rotate(${(needle / 50) * 70} 150 160)`}
          />
          <circle className="tuner__hub" cx="150" cy="160" r="7" />
          <text className="tuner__scale" x="38" y="150">
            −50
          </text>
          <text className="tuner__scale" x="262" y="150">
            +50
          </text>
        </svg>

        <div className="tuner__note">
          {note ? noteName(note.midi) : ''}
          <span className="readout__octave">{note ? octave(note.midi) : ''}</span>
        </div>
        <div className="tuner__verdict">
          {!listening ? 'Start the tuner, then pluck one string' : cents === null ? 'Pluck a string' : verdict}
        </div>
        {freq !== null && target && (
          <div className="muted">
            {freq.toFixed(1)} Hz · target {target.freq.toFixed(1)} Hz
          </div>
        )}
      </section>

      <section className="tuner__strings">
        <button className={`chip ${locked === null ? 'is-active' : ''}`} onClick={() => setLocked(null)}>
          Auto
        </button>
        {/* Low E first, the order you'd tune in */}
        {[...TARGETS].reverse().map((t) => (
          <button
            key={t.stringIndex}
            className={`chip chip--note ${locked === t.stringIndex ? 'is-active' : ''} ${target?.stringIndex === t.stringIndex && inTune ? 'is-good' : ''}`}
            onClick={() => setLocked(t.stringIndex)}
            title={`String ${t.stringIndex + 1}`}
          >
            {noteName(t.midi)}
            <span className="chip__tag">{octave(t.midi)}</span>
          </button>
        ))}
      </section>
      <p className="muted hint">
        Auto picks the closest string. Lock a string if it's tuned far enough off that Auto guesses the wrong one.
      </p>
    </>
  );
}

// SVG arc along a circle, angles in degrees with 0 straight up.
function arc(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${cx + r * Math.cos(rad)} ${cy + r * Math.sin(rad)}`;
  };
  return `M ${point(fromDeg)} A ${r} ${r} 0 0 1 ${point(toDeg)}`;
}
