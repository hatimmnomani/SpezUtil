# @spezutil/richtext-editor-react

## 0.2.0

### Minor Changes

- 0534a7a: Add a font-family selector to the `<spez-richtext>` toolbar.

  - New `font` toolbar group: end users apply a font to the selected text
    (inline `font-family` style, preserved across HTML export/import).
  - Configurable via the new `fonts` property (`FontOption[]`; replaces the
    defaults — spread the exported `DEFAULT_FONTS` to extend them) or the simple
    `fonts="Amiri, Tahoma"` attribute form.
  - React wrapper accepts `fonts` as a prop; the Angular wrapper adds a `fonts`
    `@Input`. Both re-export `FontOption` and `DEFAULT_FONTS`.
  - Localized control labels (en/ar).

### Patch Changes

- Updated dependencies [0534a7a]
- Updated dependencies [0534a7a]
  - @spezutil/richtext-editor@0.2.0

## 0.1.0

### Minor Changes

- Initial public release of the typed React wrapper for `@spezutil/richtext-editor`.

### Patch Changes

- Updated dependencies
  - `@spezutil/richtext-editor@0.1.0`
