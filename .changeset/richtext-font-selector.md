---
"@spezutil/richtext-editor": minor
"@spezutil/richtext-editor-react": minor
"@spezutil/richtext-editor-angular": minor
---

Add a font-family selector to the `<spez-richtext>` toolbar.

- New `font` toolbar group: end users apply a font to the selected text
  (inline `font-family` style, preserved across HTML export/import).
- Configurable via the new `fonts` property (`FontOption[]`; replaces the
  defaults — spread the exported `DEFAULT_FONTS` to extend them) or the simple
  `fonts="Amiri, Tahoma"` attribute form.
- React wrapper accepts `fonts` as a prop; the Angular wrapper adds a `fonts`
  `@Input`. Both re-export `FontOption` and `DEFAULT_FONTS`.
- Localized control labels (en/ar).
