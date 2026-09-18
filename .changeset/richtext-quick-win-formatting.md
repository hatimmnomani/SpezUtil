---
"@spezutil/richtext-editor": minor
---

Add font size, subscript/superscript/inline code, indent/outdent, clear formatting, and an optional word/character count to the `<spez-richtext>` toolbar.

- New font-size `<select>` in the `font` toolbar group, applied as an inline `font-size` style (preserved across HTML export/import). Configurable via the `fontSizes` property/attribute and new `DEFAULT_FONT_SIZES` / `FontSizeOption` exports, mirroring the existing `fonts` API.
- New subscript, superscript, and inline-code toggle buttons in the `inline` group, plus a `.spez-rte-code` style for inline code.
- New `indent` toolbar group (indent/outdent buttons, `INDENT_CONTENT_COMMAND` / `OUTDENT_CONTENT_COMMAND`); Tab / Shift+Tab now indent/outdent inside the editor.
- New "Clear formatting" button that removes all active text formats and inline styles from the selection.
- New opt-in `word-count` boolean attribute that renders a live word/character count status line below the editor.
- Localized labels (en/ar) for all of the above.
