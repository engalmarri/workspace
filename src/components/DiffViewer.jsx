import { diffText } from '../utils/diff.js';

// Side-by-side change viewer: Original | Suggested with highlighted differences.
export default function DiffViewer({ original, suggested }) {
  const render = (parts, cls) => (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((p, i) => {
        if (cls === 'orig' && p.added) return null;
        if (cls === 'sugg' && p.removed) return null;
        const hot = p.added || p.removed;
        return <span key={i} className={hot ? (p.added ? 'diff-add' : 'diff-del') : ''}>{p.value}</span>;
      })}
    </div>
  );
  const parts = diffText(original, suggested);
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 1 }}><h4>Original Version</h4>{render(parts, 'orig')}</div>
      <div className="card" style={{ flex: 1 }}><h4>Suggested Version</h4>{render(parts, 'sugg')}</div>
    </div>
  );
}
