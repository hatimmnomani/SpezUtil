import { $isTextNode, TextNode, type DOMConversionMap } from "lexical";

/**
 * A CSS colour literal: a bare keyword (`red`, `transparent`, `currentColor`),
 * a hex triplet/quad, or an `rgb()`/`hsl()` function. Values reaching us have
 * already been through the host's CSS parser, so this is a second gate — it
 * exists to reject what a parser happily accepts for any property, `var(--x)`
 * above all, which would let imported HTML reach back into the host page's
 * cascade. Consuming apps render this HTML verbatim.
 */
const COLOR_LITERAL =
  /^(?:[a-z]+|#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?)\([0-9a-z.%,/\s+-]*\))$/i;

function isColorLiteral(value: string): boolean {
  return COLOR_LITERAL.test(value);
}

/**
 * Inline style properties carried across an HTML import, each with the guard
 * its value must pass.
 *
 * Keep this list short: every property here is a CSS injection surface, since
 * the export is persisted and re-rendered by consuming apps. `font-family`
 * predates the colour work and stays unguarded — the toolbar's font picker
 * writes quoted family stacks, which no tidy literal grammar covers.
 */
const IMPORTED_TEXT_STYLES: ReadonlyArray<
  readonly [property: string, isAllowedValue: (value: string) => boolean]
> = [
  ["font-family", () => true],
  ["color", isColorLiteral],
  ["background-color", isColorLiteral],
];

/**
 * Reads the allowlisted inline styles off an imported element. The fixed
 * property order is what makes repeated round-trips converge on one spelling
 * rather than shuffling declarations about; the values themselves are whatever
 * the CSS parser normalised them to (`#b8860b` comes back `rgb(184, 134, 11)`),
 * which is idempotent from the first import on.
 */
function collectTextStyles(element: HTMLElement): string {
  return IMPORTED_TEXT_STYLES.map(([property, isAllowedValue]) => {
    const value = element.style.getPropertyValue(property).trim();
    return value === "" || !isAllowedValue(value) ? "" : `${property}: ${value};`;
  })
    .join(" ")
    .trim();
}

/**
 * Lexical's HTML import only maps text *formats* (bold, italic, …) from
 * inline styles; it drops presentational ones like font-family and colour.
 * Wrap TextNode's importers so those survive the toolbar's export → import
 * round-trip — consumers persist the editor's HTML and re-open it to edit, so
 * whatever the import drops is silently lost on their next save.
 */
export function $importTextStyles(): DOMConversionMap {
  const importMap: DOMConversionMap = {};
  for (const [tag, importer] of Object.entries(TextNode.importDOM() ?? {})) {
    importMap[tag] = (node) => {
      const original = importer(node);
      if (original === null) return null;
      return {
        ...original,
        conversion: (element) => {
          const output = original.conversion(element);
          if (output === null || output.forChild === undefined) return output;
          const styles = collectTextStyles(element);
          if (styles === "") return output;
          const { forChild } = output;
          return {
            ...output,
            forChild: (child, parent) => {
              const result = forChild(child, parent);
              if ($isTextNode(result)) {
                // Differently-tagged ancestors (`<b style=…><span style=…>`)
                // each get a turn, so one property can end up declared twice.
                // The innermost wins, and Lexical's exporter collapses the
                // pair when it re-serialises the style — so the duplicate
                // never reaches the HTML or a later round-trip.
                result.setStyle(`${result.getStyle()} ${styles}`.trim());
              }
              return result;
            },
          };
        },
      };
    };
  }
  return importMap;
}
