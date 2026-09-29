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
import { useEffect } from 'react';

export default function DocEditor({ value, onChange, editable = true }) {
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
    onUpdate: ({ editor }) => onChange && onChange(editor.getHTML())
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value || '<p></p>');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(() => { editor && editor.setEditable(editable); }, [editor, editable]);
  if (!editor) return null;

  const btn = (fn, label, on) => (
    <button type="button" className={on ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); fn(); }}>{label}</button>
  );
  return (
    <div>
      {editable && (
        <div className="toolbar">
          {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
          {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
          {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
          {btn(() => editor.chain().focus().toggleHighlight().run(), 'Mark', editor.isActive('highlight'))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
          {btn(() => editor.chain().focus().setTextAlign('left').run(), 'Left', editor.isActive({ textAlign: 'left' }))}
          {btn(() => editor.chain().focus().setTextAlign('center').run(), 'Center', editor.isActive({ textAlign: 'center' }))}
          {btn(() => editor.chain().focus().setTextAlign('right').run(), 'Right', editor.isActive({ textAlign: 'right' }))}
          {btn(() => editor.chain().focus().setTextAlign('justify').run(), 'Justify', editor.isActive({ textAlign: 'justify' }))}
          {btn(() => editor.chain().focus().toggleBulletList().run(), 'Bullets', editor.isActive('bulletList'))}
          {btn(() => editor.chain().focus().toggleOrderedList().run(), '1.2.3', editor.isActive('orderedList'))}
          {btn(() => editor.chain().focus().undo().run(), 'Undo')}
          {btn(() => editor.chain().focus().redo().run(), 'Redo')}
          <select defaultValue="" onChange={(e) => { const v = e.target.value; if (v) editor.chain().focus().setColor(v).run(); }} title="Text color">
            <option value="">Color</option>
            <option value="#000000">Black</option><option value="#b91c1c">Red</option>
            <option value="#2563eb">Blue</option><option value="#15803d">Green</option>
          </select>
          <button type="button" onClick={() => {
            const url = prompt('Image URL (or upload via Images component):'); if (url) editor.chain().focus().setImage({ src: url }).run();
          }}>Image</button>
          <button type="button" onClick={() => {
            const url = prompt('Link URL:'); if (url) editor.chain().focus().setLink({ href: url }).run();
          }}>Link</button>
          <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}>Table</button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>Col+</button>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>Row+</button>
          <select defaultValue="" title="Font size" onChange={(e) => { const v = e.target.value; if (v) editor.chain().focus().setFontSize(v).run(); e.target.value = ''; }}>
            <option value="">Size</option>
            <option value="12px">12</option><option value="14px">14</option><option value="16px">16</option>
            <option value="20px">20</option><option value="24px">24</option><option value="28px">28</option>
          </select>
        </div>
      )}
      <div className="a4"><EditorContent editor={editor} /></div>
    </div>
  );
}
