/**
 * Allow-list SVG cleaner for diagram markup (Mermaid output, or whatever a host renderer returns).
 *
 * The result is stored in the document and rendered to other users, so this is an XSS boundary.
 * Both elements and attributes are allow-listed; anything unknown is dropped, whatever its case
 * or namespace. It mirrors the handbook API's `HandbookSvgSanitizer` (same element list, same
 * CSS rules, same fragment-only `href` rule) and is stricter on attributes.
 *
 * Mermaid must be rendered with `htmlLabels: false` for the same reason: `foreignObject` is not
 * on the list, so HTML labels would vanish here and again on the server.
 */

const MAX_CHARS = 2_000_000;

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

/** Same list as HandbookSvgSanitizer.Elements (handbook API). Exact case: XML is case-sensitive. */
const ELEMENTS = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan",
  "defs", "marker", "style", "title", "desc", "clipPath", "linearGradient", "radialGradient", "stop",
  "pattern", "mask", "use", "symbol", "a",
]);

/** Un-namespaced attributes Mermaid output needs. `aria-*` and `data-*` are matched by prefix. */
const ATTRIBUTES = new Set([
  // core
  "id", "class", "style", "role", "lang",
  // geometry and structure
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "fr",
  "width", "height", "d", "points", "dx", "dy", "rotate", "textLength", "lengthAdjust",
  "transform", "transform-origin", "viewBox", "preserveAspectRatio", "offset", "href",
  // markers and paint servers
  "markerWidth", "markerHeight", "markerUnits", "refX", "refY", "orient",
  "gradientUnits", "gradientTransform", "spreadMethod", "patternUnits", "patternContentUnits",
  "patternTransform", "maskUnits", "maskContentUnits", "clipPathUnits",
  // presentation
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-dasharray", "stroke-dashoffset",
  "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "opacity", "color",
  "stop-color", "stop-opacity", "clip-path", "clip-rule", "mask", "marker-start", "marker-mid", "marker-end",
  "font-family", "font-size", "font-style", "font-weight", "font-variant", "font-stretch",
  "letter-spacing", "word-spacing", "text-anchor", "text-decoration", "dominant-baseline",
  "alignment-baseline", "baseline-shift", "direction", "unicode-bidi", "writing-mode",
  "visibility", "display", "overflow", "pointer-events", "vector-effect", "paint-order",
  "shape-rendering", "text-rendering",
]);
const ATTRIBUTE_PREFIX = /^(?:aria|data)-[a-z][a-z0-9-]*$/;
const XML_ATTRIBUTES = new Set(["space", "lang"]);
const NAMESPACE_DECLARATIONS = new Set([SVG_NS, XLINK_NS, XML_NS]);

/**
 * Anything an attribute value must never carry once whitespace and control characters are gone:
 * script/data schemes, CSS `expression()`, `@import`, legacy binding properties, or a `url()`
 * that is not a same-document fragment.
 */
const UNSAFE_VALUE = /javascript:|vbscript:|data:|expression\(|@import|-moz-binding|behavior:|url\((?!['"]?#)/;

/**
 * Same rules as HandbookSvgSanitizer.UnsafeCss, plus the legacy binding properties. The url() lookahead
 * covers the optional whitespace and quote as a unit, so `url( '#id' )` cannot be re-read as external
 * by backtracking the quote away.
 */
const UNSAFE_CSS =
  /@import[^;}]*;?|expression\s*\([^)]*\)?|(?:-moz-binding|behavior)\s*:[^;}]*;?|url\((?!\s*['"]?\s*#)[^)]*\)/gi;
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const CSS_ESCAPE = /\\([0-9a-fA-F]{1,6})\s?|\\([\s\S])/g;

/** Resolves CSS escapes (`\75rl(` is `url(`) and strips comments so the regexes see what the browser sees. */
function normalizeCss(css: string): string {
  return css
    .replace(CSS_COMMENT, "")
    .replace(CSS_ESCAPE, (_match, hex: string | undefined, char: string | undefined) =>
      hex !== undefined ? String.fromCodePoint(codePointForEscape(parseInt(hex, 16))) : (char ?? ""),
    );
}

/** CSS Syntax §4.3.7: NUL, surrogates and out-of-range escapes decode to U+FFFD. */
function codePointForEscape(value: number): number {
  if (value === 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) return 0xfffd;
  return value;
}

function cleanCss(css: string): string {
  return normalizeCss(css).replace(UNSAFE_CSS, "");
}

function isUnsafeValue(value: string): boolean {
  return UNSAFE_VALUE.test(value.replace(/[\s\u0000-\u001f\u007f]+/g, "").toLowerCase());
}

/** Keeps an attribute only when its name is on the list and its value cannot load or run anything. */
function cleanAttributes(element: Element): void {
  for (const attr of [...element.attributes]) {
    const { localName: name, namespaceURI: ns, value } = attr;
    let keep: boolean;
    if (ns === XMLNS_NS) {
      keep = NAMESPACE_DECLARATIONS.has(value);
    } else if (ns === XML_NS) {
      keep = XML_ATTRIBUTES.has(name) && !isUnsafeValue(value);
    } else if (name === "href") {
      keep = (ns === null || ns === XLINK_NS) && value.startsWith("#") && !isUnsafeValue(value);
    } else if (ns !== null) {
      keep = false;
    } else if (name === "style") {
      attr.value = cleanCss(value);
      keep = true;
    } else {
      keep = (ATTRIBUTES.has(name) || ATTRIBUTE_PREFIX.test(name)) && !isUnsafeValue(value);
    }
    if (!keep) element.removeAttributeNode(attr);
  }
}

function clean(element: Element): void {
  for (const child of [...element.childNodes]) {
    switch (child.nodeType) {
      case Node.ELEMENT_NODE: {
        const el = child as Element;
        if (el.namespaceURI !== SVG_NS || !ELEMENTS.has(el.localName)) {
          el.remove();
        } else {
          clean(el);
        }
        break;
      }
      case Node.TEXT_NODE:
        break;
      case Node.CDATA_SECTION_NODE:
        // Serialized CDATA is fine in XML but not worth trusting to an HTML re-parse; plain text is escaped.
        child.replaceWith(element.ownerDocument.createTextNode(child.nodeValue ?? ""));
        break;
      default:
        // Comments and processing instructions: `<!--><script>…</script>-->` is one XML comment but an
        // HTML tokenizer closes it at `<!-->` and runs the script if the markup is ever set as innerHTML.
        child.remove();
    }
  }
  cleanAttributes(element);
  if (element.localName === "style") element.textContent = cleanCss(element.textContent ?? "");
}

/**
 * Returns cleaned `<svg…>` markup, or `""` when the input is empty, too large, unparseable, carries a
 * DOCTYPE or entity declaration, or its root is not an `svg` element in the SVG namespace.
 */
export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string" || svg.trim() === "" || svg.length > MAX_CHARS) return "";
  if (/<!(?:DOCTYPE|ENTITY)/i.test(svg)) return "";
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (
    root === null ||
    doc.doctype !== null ||
    root.localName !== "svg" ||
    root.namespaceURI !== SVG_NS ||
    doc.getElementsByTagName("parsererror").length > 0
  ) {
    return "";
  }
  clean(root);
  return new XMLSerializer().serializeToString(root);
}
