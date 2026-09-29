import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontSize from './fontSizeExt.js';
import Icon from './icons.jsx';
import { useEffect, useRef, useState } from 'react';

// A4 content height per page in px (297mm - 22mm top - 22mm bottom padding at 96dpi)
const MM = 96 / 25.4;
const PAGE_CONTENT_PX = 253 * MM;
const PAD_TOP_PX = 22 * MM;

export default function DocEditor({ value, onChange, editable = true }) {
  const wrapRef = useRef(null);
  const [pageCount, setPageCount] = useState(1);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit, Underline, Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image, Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      TextStyle, Color, FontSize
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange && onChange(editor.getHTML());
      measure();
    }
  });

  const measure = () => {
    const el = wrapRef.current;
    if (!el) return;
    const contentH = Math.max(0, el.scrollHeight - PAD_TOP_PX * 2);
    setPageCount(Math.max(1, Math.ceil(contentH / PAGE_CONTENT_PX)));
  };

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value || '<p></p>');
      setTimeout(measure, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(() => { editor && editor.setEditable(editable); }, [editor, editable]);
  useEffect(() => {
    measure();
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const tool = (fn, icon, title, on) => (
    <button type="button" className={'tool' + (on ? ' on' : '')} title={title}
      onMouseDown={(e) => { e.preventDefault(); fn(); }}>
      <Icon name={icon} />
    </button>
  );

  return (
    <div>
      {editable && (
        <div className="ribbon">
          <div className="ribbon-tabs"><span className="ribbon-tab active">Home</span></div>
          <div className="ribbon-groups">
            <div className="ribbon-group">
              <div className="ribbon-controls">
                {tool(() => editor.chain().focus().toggleBold().run(), 'bold', 'Bold', editor.isActive('bold'))}
                {tool(() => editor.chain().focus().toggleItalic().run(), 'italic', 'Italic', editor.isActive('italic'))}
                {tool(() => editor.chain().focus().toggleUnderline().run(), 'underline', 'Underline', editor.isActive('underline'))}
                <label className="tool color-tool" title="Font color">
                  <span className="color-a">A</span><span className="color-bar" style={{ background: editor.getAttributes('textStyle').color || '#1f2328' }} />
                  <input type="color" value={editor.getAttributes('textStyle').color || '#1f2328'}
                    onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
                </label>
                <label className="tool color-tool" title="Highlight color">
                  <span className="hl-mark">ab</span>
                  <input type="color" defaultValue="#ffff00"
                    onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
                </label>
                <select className="tool-select" title="Font size" defaultValue=""
                  onChange={(e) => { const v = e.target.value; if (v) editor.chain().focus().setFontSize(v).run(); e.target.value = ''; }}>
                  <option value="">Size</option>
                  <option value="12px">12</option><option value="14px">14</option><option value="16px">16</option>
                  <option value="18px">18</option><option value="20px">20</option><option value="24px">24</option>
                  <option value="28px">28</option>
                </select>
              </div>
              <div className="ribbon-label">Font</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-controls">
                {tool(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'h1', 'Heading 1', editor.isActive('heading', { level: 1 }))}
                {tool(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'h2', 'Heading 2', editor.isActive('heading', { level: 2 }))}
                {tool(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'h3', 'Heading 3', editor.isActive('heading', { level: 3 }))}
              </div>
              <div className="ribbon-label">Styles</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-controls">
                {tool(() => editor.chain().focus().setTextAlign('left').run(), 'alignLeft', 'Align left', editor.isActive({ textAlign: 'left' }))}
                {tool(() => editor.chain().focus().setTextAlign('center').run(), 'alignCenter', 'Center', editor.isActive({ textAlign: 'center' }))}
                {tool(() => editor.chain().focus().setTextAlign('right').run(), 'alignRight', 'Align right', editor.isActive({ textAlign: 'right' }))}
                {tool(() => editor.chain().focus().setTextAlign('justify').run(), 'alignJustify', 'Justify', editor.isActive({ textAlign: 'justify' }))}
                {tool(() => editor.chain().focus().toggleBulletList().run(), 'bullets', 'Bullets', editor.isActive('bulletList'))}
                {tool(() => editor.chain().focus().toggleOrderedList().run(), 'numbered', 'Numbering', editor.isActive('orderedList'))}
              </div>
              <div className="ribbon-label">Paragraph</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-controls">
                <button type="button" className="tool" title="Insert image (URL)" onClick={() => {
                  const url = prompt('Image URL (or upload via Images component):'); if (url) editor.chain().focus().setImage({ src: url }).run();
                }}><Icon name="image" /></button>
                <button type="button" className="tool" title="Insert link" onClick={() => {
                  const url = prompt('Link URL:'); if (url) editor.chain().focus().setLink({ href: url }).run();
                }}><Icon name="link" /></button>
                {tool(() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(), 'table', 'Insert table')}
                {tool(() => editor.chain().focus().addColumnAfter().run(), 'colPlus', 'Add column')}
                {tool(() => editor.chain().focus().addRowAfter().run(), 'rowPlus', 'Add row')}
              </div>
              <div className="ribbon-label">Insert</div>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-controls">
                {tool(() => editor.chain().focus().undo().run(), 'undo', 'Undo')}
                {tool(() => editor.chain().focus().redo().run(), 'redo', 'Redo')}
              </div>
              <div className="ribbon-label">History</div>
            </div>
          </div>
        </div>
      )}
      <div className="a4-flow">
        <div className="a4" ref={wrapRef}>
          <EditorContent editor={editor} />
          {Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => (
            <div key={i} className="page-break" style={{ top: `calc(22mm + ${(i + 1) * 253}mm)` }}>
              <span>Page {i + 2}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
