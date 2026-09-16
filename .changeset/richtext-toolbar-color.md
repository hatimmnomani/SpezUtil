---
"@spezutil/richtext-editor": minor
---

Add text color and highlight color controls to the `<spez-richtext>` toolbar, and refine toolbar styling.

- New `color` toolbar group (between `inline` and `list`): text color and highlight color buttons, each opening a palette popover with 12 preset swatches, a native custom color picker, and a Reset action. Applied as inline `color` / `background-color` styles, preserved across HTML export/import.
- The toolbar swatch bar reflects the color under the current selection.
- Toolbar polish: keyboard focus rings, hover/active states, popovers anchored under their trigger button, `aria-expanded` on popover triggers, reduced-motion support.
- Localized labels (en/ar) for the new controls and palette color names.
