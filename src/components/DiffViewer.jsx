import { diffArrays } from 'diff';

// Tokenize HTML into tags / words / whitespace so formatting is preserved
// while changed words are highlighted Word-Track-Changes style.
function tokenize(html) {
  return (html || '').match(/<[^>]+>|[^\s<>]+|\s+/g) || [];
}

function buildView(original, suggested, side) {
  const a = tokenize(original);
  const b = tokenize(suggested);
  const parts = diffArrays(a, b);
  let html = '';
  for (const p of parts) {
    for (const tok of p.value) {
      if (side === 'orig' && p.added) continue;
      if (side === 'sugg' && p.removed) continue;
      if (p.added) html += `<span class="diff-add">${tok}</span>`;
      else if (p.removed) html += `<span class="diff-del">${tok}</span>`;
      else html += tok;
    }
  }
  return html;
}

// Formatted side-by-side viewer: each version keeps its own styling,
// changed/added/removed words are highlighted inline.
export default function DiffViewer({ original, suggested }) {
  const origHtml = buildView(original, suggested, 'orig');
  const suggHtml = buildView(original, suggested, 'sugg');
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 1 }}>
        <h4>Original Version</h4>
        <div className="a4-lite" dangerouslySetInnerHTML={{ __html: origHtml }} />
      </div>
      <div className="card" style={{ flex: 1 }}>
        <h4>Suggested Version</h4>
        <div className="a4-lite" dangerouslySetInnerHTML={{ __html: suggHtml }} />
      </div>
    </div>
  );
}
