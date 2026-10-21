import { Note } from 'tonal';
import { FRET_COUNT, STANDARD_TUNING, noteName, pitchClass, positionsFor } from '../lib/music';
import type { Overlay } from '../lib/theory';

type Props = {
  activeMidi: number | null;
  showOctaves: boolean;
  onSelect: (midi: number, stringIndex: number, fret: number) => void;
  overlay?: Overlay | null;
  picks?: Record<number, number> | null; // chord builder: string index -> fret
  tuning?: number[];
  fretCount?: number;
};

const WIDTH = 1200;
const HEIGHT = 250;
const PAD_Y = 34;
const NUT_X = 80;
const END_X = WIDTH - 16;
const SINGLE_INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_INLAYS = [12, 24];

export function Fretboard({
  activeMidi,
  showOctaves,
  onSelect,
  overlay = null,
  picks = null,
  tuning = STANDARD_TUNING,
  fretCount = FRET_COUNT,
}: Props) {
  const stringGap = (HEIGHT - PAD_Y * 2) / (tuning.length - 1);
  const stringY = (index: number) => PAD_Y + index * stringGap;

  // Real fret spacing (each fret ~5.6% narrower), stretched to fill the board.
  const fullLength = 1 - Math.pow(2, -fretCount / 12);
  const fretX = (fret: number) => NUT_X + ((END_X - NUT_X) * (1 - Math.pow(2, -fret / 12))) / fullLength;
  const noteX = (fret: number) => (fret === 0 ? NUT_X / 2 + 8 : (fretX(fret - 1) + fretX(fret)) / 2);

  const positions = activeMidi === null ? [] : positionsFor(activeMidi, tuning, fretCount);
  const shown = showOctaves ? positions : positions.filter((p) => p.exact);
  const midY = (stringY(0) + stringY(tuning.length - 1)) / 2;
  const frets = Array.from({ length: fretCount + 1 }, (_, i) => i);

  // Pitch class -> spelled name for the scale or chord being shown, so labels read Bb in F major, not A#.
  const overlayNames = new Map<number, string>(overlay?.notes.map((n) => [Note.chroma(n) as number, n]) ?? []);
  const overlayRoot = overlay ? Note.chroma(overlay.root) : -1;
  const label = (midi: number) => overlayNames.get(pitchClass(midi)) ?? noteName(midi);
  const taken = new Set(shown.map((p) => `${p.string}-${p.fret}`));

  return (
    <div className="fretboard-scroll">
      <svg className="fretboard" viewBox={`0 0 ${WIDTH} ${HEIGHT + 24}`} role="img" aria-label="Guitar fretboard">
        {/* Rosewood: lighter down the middle, darker at the edges. Only one board renders at a time, so a fixed id is safe. */}
        <defs>
          <linearGradient id="fretboard-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="fretboard__wood-dark" />
            <stop offset="0.5" className="fretboard__wood-light" />
            <stop offset="1" className="fretboard__wood-dark" />
          </linearGradient>
        </defs>
        <rect
          className="fretboard__wood"
          x={NUT_X}
          y={PAD_Y - 14}
          width={END_X - NUT_X}
          height={HEIGHT - PAD_Y * 2 + 28}
          rx={4}
        />

        {frets
          .filter((f) => SINGLE_INLAYS.includes(f))
          .map((f) => (
            <circle key={f} className="fretboard__inlay" cx={noteX(f)} cy={midY} r={7} />
          ))}
        {frets
          .filter((f) => DOUBLE_INLAYS.includes(f))
          .map((f) => (
            <g key={f}>
              <circle className="fretboard__inlay" cx={noteX(f)} cy={midY - stringGap} r={7} />
              <circle className="fretboard__inlay" cx={noteX(f)} cy={midY + stringGap} r={7} />
            </g>
          ))}

        {frets.map((f) => (
          <line
            key={f}
            className={f === 0 ? 'fretboard__nut' : 'fretboard__fret'}
            x1={fretX(f)}
            x2={fretX(f)}
            y1={PAD_Y - 14}
            y2={HEIGHT - PAD_Y + 14}
          />
        ))}

        {tuning.map((open, i) => (
          <g key={i}>
            <line
              className="fretboard__string"
              x1={NUT_X - 30}
              x2={END_X}
              y1={stringY(i)}
              y2={stringY(i)}
              strokeWidth={1 + i * 0.45}
            />
            <text className="fretboard__label" x={14} y={stringY(i)}>
              {noteName(open)}
            </text>
          </g>
        ))}

        {frets
          .filter((f) => f > 0)
          .map((f) => (
            <text key={f} className="fretboard__number" x={noteX(f)} y={HEIGHT + 14}>
              {f}
            </text>
          ))}

        {/* Invisible hit targets so the board works without a guitar. */}
        {tuning.map((open, i) =>
          frets.map((f) => (
            <circle
              key={`${i}-${f}`}
              className="fretboard__hit"
              cx={noteX(f)}
              cy={stringY(i)}
              r={Math.min(stringGap / 2, 16)}
              onClick={() => onSelect(open + f, i, f)}
            >
              <title>{`${noteName(open + f)} · string ${i + 1}, ${f === 0 ? 'open' : `fret ${f}`}`}</title>
            </circle>
          )),
        )}

        {tuning.map((open, i) =>
          frets
            .filter((f) => overlayNames.has(pitchClass(open + f)) && !taken.has(`${i + 1}-${f}`))
            .map((f) => (
              <g
                key={`overlay-${i}-${f}`}
                className={`fretboard__overlay ${pitchClass(open + f) === overlayRoot ? 'is-root' : ''}`}
                transform={`translate(${noteX(f)} ${stringY(i)})`}
              >
                <circle r={11} />
                <text>{label(open + f)}</text>
              </g>
            )),
        )}

        {shown.map((p) => (
          <g
            key={`${p.string}-${p.fret}`}
            className={`fretboard__marker ${p.exact ? 'is-exact' : 'is-octave'}`}
            transform={`translate(${noteX(p.fret)} ${stringY(p.string - 1)})`}
          >
            <circle r={14} />
            <text>{label(p.midi)}</text>
          </g>
        ))}

        {picks &&
          tuning.map((open, i) =>
            picks[i] === undefined ? (
              <text key={`mute-${i}`} className="fretboard__mute" x={noteX(0)} y={stringY(i)}>
                ×
              </text>
            ) : (
              <g
                key={`pick-${i}`}
                className={`fretboard__marker is-picked ${picks[i] === 0 ? 'is-open' : ''}`}
                transform={`translate(${noteX(picks[i])} ${stringY(i)})`}
              >
                <circle r={14} />
                <text>{noteName(open + picks[i])}</text>
              </g>
            ),
          )}
      </svg>
    </div>
  );
}
