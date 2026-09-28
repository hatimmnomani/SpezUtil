---
"@spezutil/richtext-editor": minor
"@spezutil/richtext-editor-react": minor
"@spezutil/richtext-editor-angular": minor
---

LuD text, comment marks and diagrams for `<spez-richtext>`:

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
