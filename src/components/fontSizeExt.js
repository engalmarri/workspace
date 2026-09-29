import TextStyle from '@tiptap/extension-text-style';

// Custom font-size support built on TextStyle (no external package needed).
// Mirrors the official TipTap pattern: adds a `fontSize` attribute plus
// setFontSize / unsetFontSize commands.
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style?.fontSize || null,
        renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {})
      }
    };
  },
  addCommands() {
    return {
      ...(this.parent?.() || {}),
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
    };
  }
});

export default FontSize;
