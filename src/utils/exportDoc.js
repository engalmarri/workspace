import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ImageRun, ExternalHyperlink
} from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

// ---------- PDF: renders a clean node with the real formatted HTML ----------
export function exportToPdf(title, html, filename) {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.innerHTML = `<div class="a4 pdf-export"><h1 style="font-size:26px">${escapeHtml(title)}</h1>${html || ''}</div>`;
  document.body.appendChild(host);
  const node = host.firstChild;
  html2pdf().set({
    margin: 0, filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(node).save().finally(() => host.remove());
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- DOCX: faithful HTML -> docx conversion ----------
const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };

function hexColor(v) {
  if (!v) return undefined;
  const m = v.match(/#([0-9a-f]{6})/i);
  return m ? m[1].toUpperCase() : undefined;
}

function pxToHalfPt(v) {
  const m = (v || '').match(/([\d.]+)px/);
  if (!m) return undefined;
  return Math.round(parseFloat(m[1]) * 72 / 96 * 2);
}

const HL_MAP = {
  '#ffff00': 'yellow', '#00ff00': 'green', '#00ffff': 'cyan',
  '#ff00ff': 'magenta', '#0000ff': 'blue', '#ff0000': 'red',
  '#000080': 'darkBlue', '#008080': 'darkCyan', '#808080': 'lightGray', '#808000': 'darkYellow'
};

function closestHighlight(css) {
  if (!css) return undefined;
  const hex = (css.match(/#[0-9a-f]{6}/i) || [])[0];
  if (hex && HL_MAP[hex.toLowerCase()]) return HL_MAP[hex.toLowerCase()];
  if (/yellow/i.test(css)) return 'yellow';
  return undefined;
}

// Collect inline runs from an element, inheriting marks from ancestors.
function collectRuns(el, marks, out) {
  if (el.nodeType === 3) {
    const text = el.textContent;
    if (text) out.push({ text, marks: { ...marks } });
    return;
  }
  if (el.nodeType !== 1) return;
  const tag = el.tagName.toLowerCase();
  const m = { ...marks };
  if (tag === 'strong' || tag === 'b') m.bold = true;
  if (tag === 'em' || tag === 'i') m.italic = true;
  if (tag === 'u') m.underline = true;
  if (tag === 's' || tag === 'strike') m.strike = true;
  if (tag === 'mark') m.highlight = closestHighlight(el.style?.backgroundColor || el.getAttribute('color')) || 'yellow';
  const style = el.style || {};
  if (style.color) { const c = hexColor(rgbToHex(style.color)); if (c) m.color = c; }
  if (style.backgroundColor && !['', 'rgba(0, 0, 0, 0)', 'transparent'].includes(style.backgroundColor)) {
    const h = closestHighlight(rgbToHex(style.backgroundColor)); if (h) m.highlight = h;
  }
  if (style.fontSize) { const s = pxToHalfPt(style.fontSize); if (s) m.size = s; }
  if (tag === 'a' && el.getAttribute('href')) m.link = el.getAttribute('href');
  if (tag === 'br') { out.push({ text: '\n', marks: { ...m } }); return; }
  if (tag === 'img') { out.push({ image: el.getAttribute('src'), marks: { ...m } }); return; }
  for (const child of el.childNodes) collectRuns(child, m, out);
}

function rgbToHex(v) {
  if (!v) return v;
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return v;
  const h = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

async function urlToImageData(src) {
  try {
    const res = await fetch(src, { mode: 'cors' });
    const blob = await res.blob();
    return await blob.arrayBuffer();
  } catch { return null; }
}

async function runsToDocxChildren(runs, images) {
  const children = [];
  for (const r of runs) {
    if (r.image) {
      const data = await urlToImageData(r.image);
      if (data) {
        children.push(new ImageRun({ data, transformation: { width: 500, height: 300 } }));
        continue;
      }
    }
    const opts = {
      text: r.text,
      bold: r.marks.bold, italics: r.marks.italic,
      underline: r.marks.underline ? {} : undefined,
      strike: r.marks.strike, color: r.marks.color,
      highlight: r.marks.highlight, size: r.marks.size
    };
    if (r.marks.link) {
      children.push(new ExternalHyperlink({ link: r.marks.link, children: [new TextRun(opts)] }));
    } else {
      children.push(new TextRun(opts));
    }
  }
  if (children.length === 0) children.push(new TextRun(''));
  return children;
}

function blockAlignment(el) {
  const a = (el.style?.textAlign || el.getAttribute('align') || '').toLowerCase();
  return ALIGN[a];
}

async function convertBlock(el, numbering, out) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    const runs = [];
    collectRuns(el, {}, runs);
    out.push(new Paragraph({
      heading: tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
      alignment: blockAlignment(el),
      children: await runsToDocxChildren(runs)
    }));
    return;
  }
  if (tag === 'li') {
    const parent = el.parentElement?.tagName.toLowerCase();
    const runs = [];
    collectRuns(el, {}, runs);
    out.push(new Paragraph({
      numbering: parent === 'ol' ? { reference: 'num-list', level: 0 } : { reference: 'bull-list', level: 0 },
      alignment: blockAlignment(el),
      children: await runsToDocxChildren(runs)
    }));
    return;
  }
  if (tag === 'ul' || tag === 'ol') {
    for (const li of el.children) {
      if (li.tagName?.toLowerCase() === 'li') await convertBlock(li, numbering, out);
    }
    return;
  }
  if (tag === 'tr') return; // handled by table
  if (tag === 'table') {
    const rows = [];
    for (const tr of el.querySelectorAll('tr')) {
      const cells = [];
      for (const td of tr.querySelectorAll('th,td')) {
        const runs = [];
        collectRuns(td, {}, runs);
        cells.push(new TableCell({
          width: { size: 100 / Math.max(1, tr.querySelectorAll('th,td').length), type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: await runsToDocxChildren(runs) })]
        }));
      }
      if (cells.length) rows.push(new TableRow({ children: cells }));
    }
    if (rows.length) out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
    return;
  }
  if (tag === 'hr') {
    out.push(new Paragraph({ children: [new TextRun('')] }));
    return;
  }
  // default: paragraph
  const runs = [];
  collectRuns(el, {}, runs);
  const hasText = runs.some((r) => (r.text && r.text.trim()) || r.image);
  out.push(new Paragraph({
    alignment: blockAlignment(el),
    children: await runsToDocxChildren(runs)
  }));
  if (!hasText && out.length) { /* keep empty paragraph as spacer */ }
}

export async function exportToDocx(pages, filename) {
  // pages: [{ title, html }]
  const children = [];
  for (const p of pages) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(p.title)] }));
    const host = document.createElement('div');
    host.innerHTML = p.html || '';
    for (const node of host.childNodes) {
      if (node.nodeType === 3) {
        if (node.textContent.trim()) {
          children.push(new Paragraph({ children: [new TextRun(node.textContent)] }));
        }
        continue;
      }
      if (node.nodeType === 1) await convertBlock(node, null, children);
    }
  }
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bull-list',
          levels: [{ level: 0, format: 'bullet', text: '\u2022', alignment: AlignmentType.LEFT }]
        },
        {
          reference: 'num-list',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }]
        }
      ]
    },
    sections: [{ children }]
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
