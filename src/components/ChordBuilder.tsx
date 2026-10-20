import { STANDARD_TUNING, noteName } from '../lib/music';
import { chordsContainingAll, intervalName, nameChord, triadOf } from '../lib/theory';

type Props = {
  picks: Record<number, number>; // string index (0 = high E) -> fret
  onIsolate: (stringIndexes: number[]) => void;
  tuning?: number[];
};

export function ChordBuilder({ picks, onIsolate, tuning = STANDARD_TUNING }: Props) {
  // Walk low string to high so the first note is the bass, which is how chords get named.
  const lowToHigh = tuning.map((_, i) => tuning.length - 1 - i);
  const sounding = lowToHigh.filter((i) => picks[i] !== undefined);
  const played = sounding.map((i) => noteName(tuning[i] + picks[i]));
  const unique = [...new Set(played)];

  const usesTwoDigits = lowToHigh.some((i) => (picks[i] ?? 0) >= 10);
  const shape = lowToHigh.map((i) => picks[i] ?? 'x').join(usesTwoDigits ? '-' : '');

  // Two notes only get a name when they're a power chord; otherwise they're described as an interval.
  const matches = unique.length >= 2 ? nameChord(played) : [];
  const containing =
    unique.length >= 1
      ? chordsContainingAll(
          unique,
          matches.map((m) => m.symbol),
        )
      : [];

  // Triad shapes live on three adjacent strings, so check each set: 6-4, 5-3, 4-2, 3-1.
  const stringSets = lowToHigh.slice(0, -2).map((_, k) => lowToHigh.slice(k, k + 3));
  const triads = stringSets
    .filter((set) => set.every((i) => picks[i] !== undefined))
    .map((set) => ({ set, triad: triadOf(set.map((i) => noteName(tuning[i] + picks[i]))) }))
    .filter((t) => t.triad !== null);
  // If the whole shape is just this triad, the set card would only repeat the chord name.
  const showTriads = triads.length > 0 && !(sounding.length === 3 && triads.length === 1);

  return (
    <section className="panel panel--builder">
      <div className="card">
        <h2>Your shape</h2>
        <div className="shape">{shape}</div>
        <p className="muted">{played.length ? `Low to high: ${played.join(' · ')}` : 'All strings muted.'}</p>
        <p className="muted hint">
          Click a fret to press it, and click it again to lift your finger. Click a string at the nut to mute or unmute it.
        </p>
      </div>

      <div className="card">
        <h2>Chord name</h2>
        {matches.length > 0 ? (
          <ul className="matches">
            {matches.map((c, i) => (
              <li key={c.symbol} className={i === 0 ? 'is-best' : ''}>
                <span className="matches__symbol">{c.symbol}</span>
                <span className="matches__inversion">{c.inversion}</span>
                <span className="muted">
                  {c.name} · {c.notes.join(' ')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {unique.length < 2
              ? 'Sound at least two different notes.'
              : unique.length === 2
                ? `${unique[0]} → ${unique[1]} is a ${intervalName(unique[0], unique[1])}. Two notes make an interval; add a third for a chord.`
                : 'No common chord uses exactly these notes. Check the triads below, or mute strings you didn’t mean to ring.'}
          </p>
        )}
      </div>

      {showTriads && (
        <div className="card">
          <h2>Triads in this shape</h2>
          <ul className="triads">
            {triads.map(({ set, triad }) => (
              <li key={set.join('')}>
                <span className="triads__strings">
                  Strings {set[0] + 1}–{set[2] + 1}
                </span>
                <span className="matches__symbol">{triad!.symbol}</span>
                <span className="muted">{triad!.inversion}</span>
                <button className="chip" onClick={() => onIsolate(set)} disabled={sounding.length === 3}>
                  Isolate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {containing.length > 0 && (
        <div className="card">
          <h2>{matches.length > 0 ? 'Add a note to make' : 'Could be part of'}</h2>
          <div className="chips">
            {containing.map((c) => (
              <span key={c.symbol} className="chip is-static" title={c.name}>
                <span className="chip__symbol">{c.symbol}</span>
                <span className="chip__notes">{c.notes.join(' ')}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
