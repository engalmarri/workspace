import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import { stripHtml } from './diff.js';

export function exportToPdf(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) return;
  html2pdf().set({
    margin: 10, filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).save();
}

export async function exportToDocx(pages, filename) {
  // pages: [{ title, html }]
  const children = [];
  for (const p of pages) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(p.title)] }));
    const text = stripHtml(p.html || '');
    for (const para of text.split(/\n+/)) {
      if (para.trim()) children.push(new Paragraph({ children: [new TextRun(para)] }));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
