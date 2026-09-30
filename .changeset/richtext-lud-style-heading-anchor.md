---
"@spezutil/richtext-editor": patch
---

Fix two ways the handbook's saved JSON failed to round-trip.

- A `lud-text` node with no `style` key (the backend's minimal shape `{type, version, text, ludFont, format, detail, mode}`) or a null style no longer throws in `updateFromJSON` and blanks the editor. The style defaults to the node's `ludFont` profile family; a profile this build does not know keeps its text and gets no family, as before. A style the JSON carries is kept unchanged.
- Headings keep their `anchor` key. `EDITOR_NODES` now registers `AnchorHeadingNode` (still type `heading`, still matched by `$isHeadingNode`) in place of the stock `HeadingNode`, which dropped `anchor` on the first save. The anchor round-trips verbatim, renders as the heading's `id` (sanitised to the handbook slug charset), survives a heading-level change from the toolbar, is not copied onto a heading split off by Enter, and contributes no text. Headings without an anchor save exactly as before. Code that creates headings in an editor using `EDITOR_NODES` should use the new `$createAnchorHeadingNode`; the stock `$createHeadingNode` builds a class the editor no longer registers.
