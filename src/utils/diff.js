import { diffWords } from 'diff';

// Returns token-level diff parts between original and suggested HTML/text.
export function diffText(original, suggested) {
  const a = stripHtml(original || '');
  const b = stripHtml(suggested || '');
  return diffWords(a, b);
}

export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

export function youtubeEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
