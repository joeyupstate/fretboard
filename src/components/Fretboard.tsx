import { Note } from 'tonal';
import { FRET_COUNT, STANDARD_TUNING, noteName, pitchClass, positionsFor } from '../lib/music';
import type { Overlay } from '../lib/theory';
import { useMediaQuery } from '../lib/useMediaQuery';

type Props = {
  activeMidi: number | null;
  showOctaves: boolean;
  onSelect: (midi: number, stringIndex: number, fret: number) => void;
  overlay?: Overlay | null;
  picks?: Record<number, number> | null; // chord builder: string index -> fret
  tuning?: number[];
  fretCount?: number;
};

// Everything is laid out in two directions: "along" the neck (nut to body) and "across" the strings.
// Wide screens draw the neck left to right like tab; phones stand it up like a chord chart.
// The upright neck is shorter so a phone doesn't need a long scroll to reach the high frets.
const LENGTH = { horizontal: 1200, vertical: 960 };
const NUT = 80;
const BREADTH = { horizontal: 250, vertical: 300 };
const PAD = 34; // from the board edge to the outer strings
const LABEL_ROOM = 24; // fret numbers sit past the board on this side
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
  const vertical = useMediaQuery('(max-width: 700px)');
  const breadth = vertical ? BREADTH.vertical : BREADTH.horizontal;
  const length = vertical ? LENGTH.vertical : LENGTH.horizontal;
  const end = length - 16;

  // Map along/across to screen x/y for the current orientation.
  const xy = (along: number, across: number) => (vertical ? { x: across, y: along } : { x: along, y: across });
  const translate = (along: number, across: number) => {
    const p = xy(along, across);
    return `translate(${p.x} ${p.y})`;
  };

  const stringGap = (breadth - PAD * 2) / (tuning.length - 1);
  // Tab view puts high E on top; the upright view puts low E on the left, as you'd see the neck facing you.
  const stringAcross = (index: number) => PAD + (vertical ? tuning.length - 1 - index : index) * stringGap;

  // Real fret spacing (each fret ~5.6% narrower), stretched to fill the board.
  const fullLength = 1 - Math.pow(2, -fretCount / 12);
  const fretAlong = (fret: number) => NUT + ((end - NUT) * (1 - Math.pow(2, -fret / 12))) / fullLength;
  const noteAlong = (fret: number) => (fret === 0 ? NUT / 2 + 8 : (fretAlong(fret - 1) + fretAlong(fret)) / 2);

  const positions = activeMidi === null ? [] : positionsFor(activeMidi, tuning, fretCount);
  const shown = showOctaves ? positions : positions.filter((p) => p.exact);
  const midAcross = breadth / 2;
  const frets = Array.from({ length: fretCount + 1 }, (_, i) => i);

  // Pitch class -> spelled name for the scale or chord being shown, so labels read Bb in F major, not A#.
  const overlayNames = new Map<number, string>(overlay?.notes.map((n) => [Note.chroma(n) as number, n]) ?? []);
  const overlayRoot = overlay ? Note.chroma(overlay.root) : -1;
  const label = (midi: number) => overlayNames.get(pitchClass(midi)) ?? noteName(midi);
  const taken = new Set(shown.map((p) => `${p.string}-${p.fret}`));

  const line = (a1: number, c1: number, a2: number, c2: number) => {
    const p1 = xy(a1, c1);
    const p2 = xy(a2, c2);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  };
  const board = xy(NUT, PAD - 14);
  const boardSize = { along: end - NUT, across: breadth - PAD * 2 + 28 };
  const viewBox = vertical ? `0 0 ${breadth + LABEL_ROOM} ${length}` : `0 0 ${length} ${breadth + LABEL_ROOM}`;

  return (
    <div className="fretboard-scroll">
      <svg
        className={`fretboard ${vertical ? 'fretboard--vertical' : ''}`}
        viewBox={viewBox}
        role="img"
        aria-label="Guitar fretboard"
      >
        {/* Rosewood: lighter down the middle, darker at the edges. Only one board renders at a time, so a fixed id is safe. */}
        <defs>
          <linearGradient id="fretboard-wood" x1="0" y1="0" x2={vertical ? 1 : 0} y2={vertical ? 0 : 1}>
            <stop offset="0" className="fretboard__wood-dark" />
            <stop offset="0.5" className="fretboard__wood-light" />
            <stop offset="1" className="fretboard__wood-dark" />
          </linearGradient>
        </defs>
        <rect
          className="fretboard__wood"
          x={board.x}
          y={board.y}
          width={vertical ? boardSize.across : boardSize.along}
          height={vertical ? boardSize.along : boardSize.across}
          rx={4}
        />

        {frets
          .filter((f) => SINGLE_INLAYS.includes(f))
          .map((f) => (
            <circle key={f} className="fretboard__inlay" {...center(xy(noteAlong(f), midAcross))} r={7} />
          ))}
        {frets
          .filter((f) => DOUBLE_INLAYS.includes(f))
          .map((f) => (
            <g key={f}>
              <circle className="fretboard__inlay" {...center(xy(noteAlong(f), midAcross - stringGap))} r={7} />
              <circle className="fretboard__inlay" {...center(xy(noteAlong(f), midAcross + stringGap))} r={7} />
            </g>
          ))}

        {frets.map((f) => (
          <line
            key={f}
            className={f === 0 ? 'fretboard__nut' : 'fretboard__fret'}
            {...line(fretAlong(f), PAD - 14, fretAlong(f), breadth - PAD + 14)}
          />
        ))}

        {tuning.map((open, i) => (
          <g key={i}>
            <line
              className="fretboard__string"
              {...line(NUT - 30, stringAcross(i), end, stringAcross(i))}
              strokeWidth={1 + i * 0.45}
            />
            <text className="fretboard__label" {...xy(14, stringAcross(i))}>
              {noteName(open)}
            </text>
          </g>
        ))}

        {frets
          .filter((f) => f > 0)
          .map((f) => (
            <text key={f} className="fretboard__number" {...xy(noteAlong(f), breadth + 14)}>
              {f}
            </text>
          ))}

        {/* Invisible hit targets so the board works without a guitar. */}
        {tuning.map((open, i) =>
          frets.map((f) => (
            <circle
              key={`${i}-${f}`}
              className="fretboard__hit"
              {...center(xy(noteAlong(f), stringAcross(i)))}
              r={Math.min(stringGap / 2, 18)}
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
                transform={translate(noteAlong(f), stringAcross(i))}
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
            transform={translate(noteAlong(p.fret), stringAcross(p.string - 1))}
          >
            <circle r={14} />
            <text>{label(p.midi)}</text>
          </g>
        ))}

        {picks &&
          tuning.map((open, i) =>
            picks[i] === undefined ? (
              <text key={`mute-${i}`} className="fretboard__mute" {...xy(noteAlong(0), stringAcross(i))}>
                ×
              </text>
            ) : (
              <g
                key={`pick-${i}`}
                className={`fretboard__marker is-picked ${picks[i] === 0 ? 'is-open' : ''}`}
                transform={translate(noteAlong(picks[i]), stringAcross(i))}
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

function center(p: { x: number; y: number }) {
  return { cx: p.x, cy: p.y };
}
