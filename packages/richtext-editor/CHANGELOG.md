# @spezutil/richtext-editor

## 0.4.0

### Minor Changes

- 797ceeb: Add font size, subscript/superscript/inline code, indent/outdent, clear formatting, and an optional word/character count to the `<spez-richtext>` toolbar.

  - New font-size `<select>` in the `font` toolbar group, applied as an inline `font-size` style (preserved across HTML export/import). Configurable via the `fontSizes` property/attribute and new `DEFAULT_FONT_SIZES` / `FontSizeOption` exports, mirroring the existing `fonts` API.
  - New subscript, superscript, and inline-code toggle buttons in the `inline` group, plus a `.spez-rte-code` style for inline code.
  - New `indent` toolbar group (indent/outdent buttons, `INDENT_CONTENT_COMMAND` / `OUTDENT_CONTENT_COMMAND`); Tab / Shift+Tab now indent/outdent inside the editor.
  - New "Clear formatting" button that removes all active text formats and inline styles from the selection.
  - New opt-in `word-count` boolean attribute that renders a live word/character count status line below the editor.
  - Localized labels (en/ar) for all of the above.

## 0.3.0

### Minor Changes

- 555dec6: Add text color and highlight color controls to the `<spez-richtext>` toolbar, and refine toolbar styling.

  - New `color` toolbar group (between `inline` and `list`): text color and highlight color buttons, each opening a palette popover with 12 preset swatches, a native custom color picker, and a Reset action. Applied as inline `color` / `background-color` styles, preserved across HTML export/import.
  - The toolbar swatch bar reflects the color under the current selection.
  - Toolbar polish: keyboard focus rings, hover/active states, popovers anchored under their trigger button, `aria-expanded` on popover triggers, reduced-motion support.
  - Localized labels (en/ar) for the new controls and palette color names.

## 0.2.1

### Patch Changes

- Updated dependencies [5d1d377]
  - @spezutil/hijri-core@0.2.0

## 0.2.0

### Minor Changes

- 0534a7a: Replace the embedded Al-Kanz Arabic font with Amiri (SIL Open Font License 1.1).

  Al-Kanz was removed because no redistribution license exists for it. Amiri is
  OFL-1.1 licensed, which permits embedding and redistribution; the license text
  ships in the repository at `assets/fonts/OFL-Amiri.txt`.

  The default value of the Arabic font CSS custom properties
  (`--hcal-font-family-arabic`, `--dtp-font-family-arabic`,
  `--rte-font-family-arabic`, `--rte-font-family`) changes from `"Al-Kanz", …` to
  `"Amiri", …`. Consumers who relied on the embedded Al-Kanz should load their own
  licensed copy and override the custom property.

- 0534a7a: Add a font-family selector to the `<spez-richtext>` toolbar.

  - New `font` toolbar group: end users apply a font to the selected text
    (inline `font-family` style, preserved across HTML export/import).
  - Configurable via the new `fonts` property (`FontOption[]`; replaces the
    defaults — spread the exported `DEFAULT_FONTS` to extend them) or the simple
    `fonts="Amiri, Tahoma"` attribute form.
  - React wrapper accepts `fonts` as a prop; the Angular wrapper adds a `fonts`
    `@Input`. Both re-export `FontOption` and `DEFAULT_FONTS`.
  - Localized control labels (en/ar).

## 0.1.0

### Minor Changes

- Initial public release of the `<spez-richtext>` Web Component, including localized formatting,
  RTL auto-direction, ayat and transliteration blocks, Hijri date tokens, links, images, tables,
  Lexical JSON and HTML persistence, and the embedded Al-Kanz font.
