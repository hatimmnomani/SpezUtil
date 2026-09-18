# richtext-editor annotations addon — architecture design

Status: **design only, not implemented**. This document records an agreed architecture for a future `@spezutil/richtext-editor-annotations` package so implementation can start from a settled design instead of re-litigating it. No code from this doc has been written yet.

## Why an addon, not a core feature

`@spezutil/richtext-editor` is meant to stay lightweight — it already embeds the Amiri font (~500KB) and ships zero-dependency-beyond-Lexical. A real inline comment/annotation feature needs Lexical's `MarkNode` (`@lexical/mark`, not currently installed anywhere in this monorepo), plus a comment-thread UI and a persistence contract. None of that belongs in core if most consumers don't need commenting.

## The core problem

Lexical fixes which node types exist at `createEditor()` time; nodes cannot be registered into an already-constructed `LexicalEditor` afterward. `createEditorInstance()` (`packages/richtext-editor/src/editor.ts`) is not exported, and `EDITOR_NODES` (`packages/richtext-editor/src/nodes/index.ts`) is a fixed array. So an external addon package cannot, by itself, add a new Lexical node type (like a comment mark) to an existing `<spez-richtext>` instance. One small, deliberate extension point in core is required — everything else can live entirely in the addon.

## 1. Core extension point (the only core change needed)

Add a static registry to `SpezRichtext` (`packages/richtext-editor/src/richtext-editor.ts`):

```ts
export class SpezRichtext extends HTMLElement {
  static #extraNodeSet = new Set<Klass<LexicalNode>>();

  /**
   * Registers Lexical node classes to include in every <spez-richtext>
   * editor created from this point forward. Call once, before any
   * <spez-richtext> connects — Lexical fixes node types at createEditor()
   * time; instances already connected are unaffected until they reconnect.
   * Idempotent.
   */
  static registerNodes(nodes: readonly Klass<LexicalNode>[]): void {
    for (const node of nodes) SpezRichtext.#extraNodeSet.add(node);
  }

  static get extraNodes(): readonly Klass<LexicalNode>[] {
    return [...SpezRichtext.#extraNodeSet];
  }
}
```

`connectedCallback()` passes `SpezRichtext.extraNodes` into `createEditorInstance()`:

```ts
const { editor, dispose } = createEditorInstance(editable, { extraNodes: SpezRichtext.extraNodes });
```

`editor.ts` gains a purely mechanical, type-only change — no new imports, no `@lexical/mark` dependency in core:

```ts
export function createEditorInstance(
  rootElement: HTMLElement,
  opts: { extraNodes?: readonly Klass<LexicalNode>[] } = {},
): EditorInstance {
  const editor = createEditor({
    namespace: "spez-richtext",
    nodes: [...EDITOR_NODES, ...(opts.extraNodes ?? [])],
    // ...
```

An addon calls `SpezRichtext.registerNodes([MarkNode])` once at import time — mirroring core's own `customElements.define(...)` self-registration idiom in `index.ts`. "Import the addon package" is the entire integration step for this part.

### Why a static method, not a per-instance property

A `fonts`-style instance property (e.g. `richtextEl.extraNodes = [MarkNode]`, set before first connect) was considered and rejected: `fonts` works as a settable property because changing it only rebuilds the toolbar UI — cheap and non-destructive. Nodes are baked into Lexical's `createEditor()` call once; that's an app-wide capability decision ("does this app support commenting at all"), not a per-instance one. A static registry also works identically regardless of whether `<spez-richtext>` is used directly or through the `-react`/`-angular` wrappers, since it's a class-level call, not a per-element prop threaded through every wrapper.

Calling the internal `createEditorInstance` directly from the addon was also rejected — it isn't exported, and even if it were, the addon would end up duplicating lifecycle/toolbar wiring that `richtext-editor.ts` already owns.

### Deployment risk — document prominently

Once `MarkNode` content exists in a document's serialized Lexical JSON, **every** surface that parses that JSON — not just the interactive editor — must also have `MarkNode` registered (via importing the annotations package, even with no UI wired up), or Lexical throws on load. This includes read-only viewers, PDF export paths, and search indexers. This must be called out in both the annotations package's README and a note in `CLAUDE.md`'s richtext-editor section once the addon ships, since it's the kind of cross-service gotcha that surfaces months later in an unrelated tool.

## 2. Toolbar integration — no core toolbar API changes

The addon must **not** scrape `.spez-rte-toolbar`/`.spez-rte-group` from outside. `#buildToolbar()` (`richtext-editor.ts`) fully destroys and rebuilds the toolbar element on every `locale`/`toolbar`/`fonts` (and future `fontSizes`) attribute change — anything appended into it by an outside script is silently discarded on the next rebuild. That's a real correctness bug waiting to happen if relied upon, not just theoretical fragility.

Instead:

1. **Selection-driven "Add comment" bubble** — the addon owns and positions this itself (via `getClientRects()` on the current `RangeSelection`, shown when non-collapsed), independent of the toolbar lifecycle. This mirrors Lexical's own official playground `CommentPlugin`/floating-toolbar pattern.
2. **Comment-thread panel** — a separate sidebar/drawer/modal the *consuming app* mounts wherever it wants, not injected inside `<spez-richtext>`. This matches how Google Docs, Word Online, and Notion all render margin comments — a distinct panel, not inline toolbar buttons — so it's the expected shape, not a workaround.
3. Both drive entirely through the existing public `editor` getter (`dispatchCommand`, `registerCommand`, `update`, `registerUpdateListener`, `registerMutationListener`) — no further core change needed.

If a future addon genuinely needs inline-toolbar real estate, the right fix then is a small, generic (non-annotation-specific) `rte-toolbar-rebuild` CustomEvent dispatched from `#buildToolbar()` with `{ toolbar: HTMLElement }`, plus formally documenting the toolbar CSS class names as a stable contract. Not needed for this addon — don't build it speculatively.

## 3. Addon package: `@spezutil/richtext-editor-annotations`

Standard package scaffolding matching every other package in the monorepo: standalone `tsup.config.ts` (esm+cjs+dts), standalone `vitest.config.ts` (jsdom), `tsconfig.json` extending root `tsconfig.base.json`.

**Nodes:** re-export `@lexical/mark`'s stock `MarkNode` / `$createMarkNode` / `$isMarkNode` / `$wrapSelectionInMarkNode` / `$unwrapMarkNode` / `$getMarkIDs` largely as-is — this ports Lexical's own documented `CommentPlugin` reference implementation, which lowers risk since it's a known-working pattern. **Do not subclass `MarkNode`** to carry comment content/author/resolved-state directly in the serialized document — keep the `ids` array as a pure join key into external thread records. This means resolving/replying to a thread never dirties the Lexical `EditorState`/undo stack, and the document's persisted JSON stays small and stable regardless of comment activity.

**Registration:** the addon's `index.ts` calls `SpezRichtext.registerNodes([MarkNode])` as a top-level side effect on import, mirroring core's own `customElements.define` self-registration convention.

**State model** — pluggable, no persistence owned by this package (this monorepo has no backend anywhere):

```ts
interface CommentThread {
  id: string;
  quotedText: string;   // display snapshot if the range is later deleted
  comments: Array<{ id: string; author: { id: string; name: string }; body: string; createdAt: string }>;
  resolved: boolean;
  createdAt: string;
}

interface AnnotationOptions {
  getAuthor(): { id: string; name: string };
  loadThreads(): Promise<CommentThread[]>;
  saveThread(thread: CommentThread): Promise<void>;
  deleteThread?(threadId: string): Promise<void>;
}

createAnnotationController(richtextEl: SpezRichtext, options: AnnotationOptions): AnnotationController
// .addCommentAtSelection() / .resolve(id) / .reopen(id) / .reply(id, body)
// .scrollToThread(id) / .open() / .dispose()
```

Deliberately shaped like a controlled UI component (callbacks in, imperative API out), consistent with the fact that no package in this repo owns a persistence layer.

**Inline rendering:** `MarkNode.createDOM()` renders a plain `<mark>` element. Core's `theme` object (passed to `createEditor()` in `editor.ts`) intentionally defines no `mark`/`markOverlap` keys — core stays fully unaware of annotations. The addon instead mirrors the existing `registerDecoratorMounter` idiom already used for `ImageNode` in `editor.ts`: a `registerMutationListener(MarkNode, ...)` that, via `editor.getElementByKey(nodeKey)`, stamps `data-thread-ids`/`data-resolved` attributes and a `spez-rte-annotation-mark` class the addon fully owns, plus its own injected `<style>` (its own `STYLE_ID`, following the exact pattern of core's `injectGlobalStyles`).

**package.json shape:**
- `dependencies`: `@lexical/mark` (`^0.47.0`, version-matches every other `@lexical/*` package already pinned in `richtext-editor`) — the one genuinely new bundle addition, which is the entire point of this architecture.
- `peerDependencies`: `@spezutil/richtext-editor` (matching its published semver range), `lexical` (`^0.47.0`), and any `@lexical/*` family the addon's own code imports directly (e.g. `@lexical/utils` for `mergeRegister`, `@lexical/selection` for reading selection-range info) — all **required**, not `optional: true`. Peer, not regular dependency, because Lexical's node-identity/`instanceof` checks require the exact same `lexical` module instance the running editor (created by core) uses; a duplicated, non-deduped copy would break at runtime in subtle ways. Declaring peer forces a single shared copy across core + addon.
- Unlike the `@spezutil/hijri-datepicker` optional-peer precedent (a genuinely optional nice-to-have), no `peerDependenciesMeta.optional` here — every peer is load-bearing; there's no graceful-degradation story for `@spezutil/richtext-editor` itself being absent.
- `devDependencies`: `@spezutil/richtext-editor` (`workspace:^`), `lexical`, the used `@lexical/*` packages, `jsdom`, `tsup`, `typescript`, `vitest`.

**Overlapping-marks / background-color conflict:** `MarkNode` is an inline `ElementNode` wrapping `TextNode` children, producing `<mark><span style="background-color:X">text</span></mark>` when a user has also applied the core toolbar's highlight-color tool. A `background-color` on the outer `<mark>` would be fully occluded by the inner span's own background — the comment highlight would visually disappear wherever a manual highlight already exists. This needs an actual design decision, not just code: use a non-background visual treatment for marks (e.g. `border-bottom`/`box-shadow`/wavy underline, Word-style) so it composites independently of any inner span background.

## 4. Honest complexity assessment

This is a **multi-phase initiative**, not a small bolt-on:

- **Low risk, small (~1-2 days):** the core `registerNodes` extension point + tests + docs; addon package scaffolding; basic `MarkNode` wrap/unwrap wiring (low-risk because it closely ports Lexical's own documented reference implementation).
- **Medium:** the pluggable persistence/controller interface — needs real design for optimistic UI, save-failure/retry handling, and orphaned-thread policy (what happens to a thread when the text spanned by its mark gets deleted and the mark node disappears?).
- **Medium-to-large, genuinely non-trivial UI engineering:**
  - Positioning a comments panel/margin markers against wrapped, multi-line, or multi-block mark ranges, kept scroll-synced as content above them is edited — the classic "margin comments" reflow problem every major editor (Google Docs, Word Online) has invested real engineering into; no shortcut exists.
  - Overlapping marks: `@lexical/mark`'s `ids` array natively supports multiple simultaneous IDs per mark node (helps the data model), but the *visual* treatment for 2+ overlapping comment ranges (stacked underlines, click disambiguation) still needs real design work.
  - Resolve/reopen state transitions and their interaction with undo/redo (should resolving a thread be undoable via the editor's own history stack, given it's deliberately kept outside `EditorState`? Almost certainly not — but that's an explicit UX decision to make, not a default to fall into).
  - The background-color rendering conflict above.
  - Cross-surface risk from §1 (every JSON-consuming surface needs `MarkNode` registered) has organizational/rollout implications beyond this package's own code.
- **Testing:** jsdom/vitest covers node wrap/unwrap/transform logic well (matches this repo's existing test patterns), but positioning/overlap/reflow behavior needs visual regression coverage (the repo already has Playwright screenshot-testing precedent per `CLAUDE.md`) or dedicated manual QA.

## Recommended phasing (when this work is scheduled)

1. Core extension point + addon skeleton + basic wrap/unwrap + persistence interface.
2. Comment panel UI, selection bubble, resolve/reopen, orphaned-thread handling.
3. Polish: overlap visuals, background-color conflict resolution, accessibility, optional `-react`/`-angular` wrapper packages mirroring `richtext-editor-react`/`richtext-editor-angular`, visual regression tests.

## Critical files (for whoever picks this up)

- `packages/richtext-editor/src/richtext-editor.ts` — add `registerNodes`/`extraNodes` static API here.
- `packages/richtext-editor/src/editor.ts` — `createEditorInstance()` needs the `opts.extraNodes` merge.
- `packages/richtext-editor/src/nodes/index.ts` — `EDITOR_NODES` reference point.
- `packages/richtext-editor/src/hijri-insert.ts` — precedent for optional-peer, feature-detected integration (different mechanism, same spirit).
- `packages/richtext-editor/package.json` — where the new `SpezRichtext.registerNodes` API surface should be documented in the README's API table.
- `CLAUDE.md` — needs a note on the deployment risk once this ships.
