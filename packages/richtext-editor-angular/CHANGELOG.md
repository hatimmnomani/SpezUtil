# @spezutil/richtext-editor-angular

## 0.3.0

### Minor Changes

- 34d79ba: LuD text, comment marks and diagrams for `<spez-richtext>`:

  - `lud-text` node (text stored exactly as typed, `ludFont` = lud-codec profile id or `unicode`), `<span data-lud-font>` HTML, and an opt-in `lud` toolbar font picker; Google Docs paste in a LuD font keeps the typed text.
  - `CommentMarkNode` (`comment-mark`, ULID `ids`), `addCommentMark`/`removeCommentMark`/`focusCommentMark`, `highlightMarks`/`activeMark`, `comment-requested`/`comment-clicked` events, opt-in `comment` toolbar button; works in read-only.
  - `DiagramNode` (Mermaid `source` + rendered `svg` + `drawioKey`), lazy Mermaid with `htmlLabels: false`, `insertDiagram`/`updateDiagram`, `diagram-edit-requested`, opt-in `diagram` toolbar button.
  - The default toolbar is unchanged; new groups are opt-in. Wrappers expose the new inputs and events.
  - `@spezutil/richtext-editor-angular` now requires `@spezutil/richtext-editor >=0.5.0 <2.0.0` as its
    peer: the component binds `highlightMarks`/`activeMark`/`fontSizes`, listens to the three new events
    and delegates `addCommentMark`/`insertDiagram`/`updateDiagram` to the element, none of which exist
    on 0.4.x. (The React wrapper depends on the editor directly, so its range moves with this release.)
  - `contract/handbook-nodes.json` ships the node JSON contract shared with the handbook API.

  **Release note:** `@spezutil/richtext-editor` now depends on `@spezutil/lud-codec`, which is not yet
  published to the registry (see `.changeset/lud-codec-initial.md`). Run `changeset version` and
  publish once so `lud-codec` and `richtext-editor` (plus the `richtext-editor-react` /
  `richtext-editor-angular` wrappers) release together — publishing `richtext-editor` alone would
  leave its `lud-codec` dependency unresolvable.

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

## 0.1.0

### Minor Changes

- Initial public release of the standalone Angular wrapper for `@spezutil/richtext-editor`.

### Patch Changes

- Updated dependencies
  - `@spezutil/richtext-editor@0.1.0`
