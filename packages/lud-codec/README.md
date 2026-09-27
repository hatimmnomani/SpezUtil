# @spezutil/lud-codec

Converts Lisan ud-Dawat text between how people type it for legacy fonts and Unicode.

Legacy LuD fonts (Al Kanz, Al-Fatemi, Kanz al-Marjaan) have no glyphs for letters such as ٹ ڈ ڑ ں ے.
Users type doubled Arabic letters instead (`ثث`, `طط`, `سس`, …) and the font draws them as one letter.

**LuD text is stored exactly as typed, tagged with the font it was typed in — never converted to
Unicode in place.** A caller (editor, importer) writes the typed text alongside a
`data-lud-font="<profileId>"` attribute and renders it in that same font. `toUnicode` only
*derives* a Unicode copy from that master — for search, embeddings, and Claude inputs — and that
copy is never displayed and never written back over the typed text. `toDisplay`/`toDisplayHtml` go
the other way: they render text that exists only as Unicode (Claude's output, pasted proper
Unicode Urdu) in a legacy font, with fallback for glyphs the font can't draw.

```ts
import { toUnicode, toDisplayHtml } from "@spezutil/lud-codec";

// Stored: <span data-lud-font="al-kanz">نسس</span> — exactly as the user typed it.

toUnicode("نسس", "al-kanz");        // "نے"   — a derived copy for search/embeddings/Claude, not saved over the typed text

toDisplayHtml("نے", "al-kanz");     // "نسس"  — render Unicode-only text (e.g. Claude's reply) inside font-family: AL-KANZ
```

- One JSON profile per font in `profiles/`. `al-kanz` is confirmed. `al-fatemi` and `kanz-al-marjaan`
  are **drafts** (meanings assumed from Al Kanz) and are ignored unless you pass `{ allowDraft: true }`.
- Letters a font cannot draw and has no sequence for are returned as fallback segments, which
  `toDisplayHtml` wraps in `<span class="lud-fallback">` using the profile's `fallbackFont`.
- `ـــــ` (five tatweels) is preserved verbatim.
- This package ships **no font files**. Declare the fonts yourself with `@font-face`.
- New fonts: run `tools/lud-font-probe`, have a person confirm the meanings, add
  `profiles/<id>.json` + `<id>.corpus.json`, and import the profile in `src/registry.ts`.
- The mahadalzahrawebapi C# port reads these same files; after changing a profile, re-run its
  `scripts/sync-lud-profiles.sh`.
- `registerProfile` registering an id that is already in the registry **replaces** it — this is how
  the bundled `al-kanz`/`al-fatemi`/`kanz-al-marjaan` profiles could be overridden by a caller.
  `getProfile`/`listProfiles` return deep-frozen profiles, so a caller cannot mutate a returned
  profile object (e.g. flip `status` to `"confirmed"`) to bypass the draft gate; register a new
  profile instead.
