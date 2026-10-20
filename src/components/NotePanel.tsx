import { chordsBuiltOn, chordsContaining, diatonicChords, majorScale, rootName } from '../lib/theory';
import type { ChordInfo } from '../lib/theory';

type Props = {
  midi: number;
  showScale: boolean;
  activeChord: string | null;
  onToggleScale: () => void;
  onSelectChord: (chord: ChordInfo) => void;
};

function ChordChip({
  chord,
  active,
  tag,
  onSelect,
}: {
  chord: ChordInfo;
  active: boolean;
  tag?: string;
  onSelect: (chord: ChordInfo) => void;
}) {
  return (
    <button className={`chip ${active ? 'is-active' : ''}`} onClick={() => onSelect(chord)} title={chord.name}>
      {tag && <span className="chip__tag">{tag}</span>}
      <span className="chip__symbol">{chord.symbol}</span>
      <span className="chip__notes">{chord.notes.join(' ')}</span>
    </button>
  );
}

export function NotePanel({ midi, showScale, activeChord, onToggleScale, onSelectChord }: Props) {
  const root = rootName(midi);
  const scale = majorScale(root);
  const containing = chordsContaining(midi);

  return (
    <section className="panel">
      <div className="card">
        <div className="card__head">
          <h2>{root} major scale</h2>
          <button className={`chip ${showScale ? 'is-active' : ''}`} onClick={onToggleScale}>
            {showScale ? 'Hide on neck' : 'Show on neck'}
          </button>
        </div>
        <ol className="scale">
          {scale.map((n, i) => (
            <li key={n} className={i === 0 ? 'is-root' : ''}>
              <span className="scale__degree">{i + 1}</span>
              {n}
            </li>
          ))}
        </ol>
        <h3>Chords in the key</h3>
        <div className="chips">
          {diatonicChords(root).map((c) => (
            <ChordChip key={c.symbol} chord={c} tag={c.numeral} active={activeChord === c.symbol} onSelect={onSelectChord} />
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Chords built on {root}</h2>
        <div className="chips">
          {chordsBuiltOn(root).map((c) => (
            <ChordChip key={c.symbol} chord={c} active={activeChord === c.symbol} onSelect={onSelectChord} />
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Chords that contain {root}</h2>
        <div className="chips">
          {containing.map((c) => (
            <ChordChip key={c.symbol} chord={c} tag={c.role} active={activeChord === c.symbol} onSelect={onSelectChord} />
          ))}
        </div>
      </div>
    </section>
  );
}
