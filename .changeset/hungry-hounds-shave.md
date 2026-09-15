---
"@spezutil/richtext-editor": minor
"@spezutil/richtext-editor-react": minor
"@spezutil/richtext-editor-angular": minor
---

Add text-colour and highlight controls to the `<spez-richtext>` toolbar.

- New `color` toolbar group (enabled by default, like every other group): two
  buttons — text colour and highlight — each opening a grid of fixed swatches
  with a leading "none" swatch that clears the property. The chosen colour is
  stored as an inline `color` / `background-color` style and is preserved
  across HTML export/import.
- The palette is a fixed list, not a free colour picker, so authored content
  stays inside the host's design. Configure it via the new `colors` property
  (`ColorOption[]`; replaces the defaults — spread the exported
  `DEFAULT_COLORS` to extend them) or the simple `colors="#1f2933, #c62828"`
  attribute form.
- React wrapper accepts `colors` as a prop; the Angular wrapper adds a
  `colors` `@Input`. Both re-export `ColorOption` and `DEFAULT_COLORS`.
- Localized control labels (en/ar).
