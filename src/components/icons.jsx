// Minimal Word-style SVG icon set (stroke icons, no emoji).
import React from 'react';

const base = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round'
};

const paths = {
  bold: <path d="M6 4h8a4 4 0 0 1 0 8H6z M6 12h9a4 4 0 0 1 0 8H6z" />,
  italic: <React.Fragment><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></React.Fragment>,
  underline: <path d="M6 3v7a6 6 0 0 0 12 0V3 M4 21h16" />,
  highlight: <path d="M9 11l-5 5v3h3l5-5 M9 11l4 4 M13 7l4 4 M5 21h14" />,
  h1: <React.Fragment><path d="M4 5v14 M12 5v14 M4 12h8" /><path d="M15 18l6-11 M17 14h4" /></React.Fragment>,
  h2: <React.Fragment><path d="M4 5v14 M12 5v14 M4 12h8" /><path d="M15 18h6 M15 18c4 0 4-4 2-5s-4-2-2-6h4" /></React.Fragment>,
  h3: <React.Fragment><path d="M4 5v14 M12 5v14 M4 12h8" /><path d="M15 12h3a2 2 0 0 1 0 4h-3 M15 12h3a2 2 0 0 0 0-4h-3" /></React.Fragment>,
  alignLeft: <React.Fragment><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></React.Fragment>,
  alignCenter: <React.Fragment><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></React.Fragment>,
  alignRight: <React.Fragment><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></React.Fragment>,
  alignJustify: <React.Fragment><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></React.Fragment>,
  bullets: <React.Fragment><circle cx="5" cy="6" r="1.4" /><circle cx="5" cy="12" r="1.4" /><circle cx="5" cy="18" r="1.4" /><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /></React.Fragment>,
  numbered: <React.Fragment><path d="M4 6h2 M4 12h2 M4 18h2" /><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /></React.Fragment>,
  undo: <path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3" />,
  redo: <path d="M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3" />,
  image: <React.Fragment><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 9" /></React.Fragment>,
  link: <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />,
  table: <React.Fragment><rect x="3" y="4" width="18" height="16" rx="1" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="9" y1="10" x2="9" y2="20" /><line x1="15" y1="10" x2="15" y2="20" /></React.Fragment>,
  colPlus: <React.Fragment><rect x="3" y="4" width="18" height="16" rx="1" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="16" y1="12" x2="20" y2="12" /><line x1="18" y1="10" x2="18" y2="14" /></React.Fragment>,
  rowPlus: <React.Fragment><rect x="3" y="4" width="18" height="16" rx="1" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="10" y1="16" x2="14" y2="16" /><line x1="12" y1="14" x2="12" y2="18" /></React.Fragment>,
  trash: <path d="M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6" />,
  download: <path d="M12 3v12 M6 11l6 6 6-6 M4 21h16" />,
  eye: <React.Fragment><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></React.Fragment>,
  plus: <path d="M12 5v14 M5 12h14" />,
  check: <path d="M4 12l5 5L20 6" />,
  x: <path d="M6 6l12 12 M18 6L6 18" />,
  word: <React.Fragment><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9.5 13l1.2 4.5L12 14l1.3 3.5L14.5 13" /></React.Fragment>
};

export default function Icon({ name }) {
  return <svg {...base}>{paths[name] || null}</svg>;
}
