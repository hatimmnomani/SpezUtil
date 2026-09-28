/**
 * Allow-list SVG cleaner for diagram markup (Mermaid output, or whatever a host renderer returns).
 *
 * The result is stored in the document and rendered to other users, so this is an XSS boundary.
 * Both elements and attributes are allow-listed; anything unknown is dropped, whatever its case
 * or namespace. It mirrors the handbook API's `HandbookSvgSanitizer` (same element list, same
 * fragment-only `href` rule) and is stricter on attributes and CSS: `<style>` is re-emitted rule by
 * rule, and a rule survives only when every selector is scoped under the root `<svg>`'s id.
 *
 * Mermaid must be rendered with `htmlLabels: false` for the same reason: `foreignObject` is not
 * on the list, so HTML labels would vanish here and again on the server.
 */

/** Longest markup accepted; svg-scope.ts applies the same cap before it parses anything. */
export const MAX_SVG_CHARS = 2_000_000;
/** Element nesting Mermaid needs is < 20; a deeper tree is not a diagram. */
const MAX_ELEMENT_DEPTH = 256;
/** Nested @media Mermaid needs is 0. */
const MAX_CSS_DEPTH = 8;

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
/**
 * Lexical reads `data-lexical-editor`, `data-lexical-decorator`, `data-lexical-slot`, … from the
 * DOM in a few internal paths; diagram markup has no reason to carry any of them.
 */
const RESERVED_DATA_ATTRIBUTE = /^data-lexical(?:-|$)/;
const XML_ATTRIBUTES = new Set(["space", "lang"]);
const NAMESPACE_DECLARATIONS = new Set([SVG_NS, XLINK_NS, XML_NS]);

/**
 * The root id a scoped stylesheet may reference: what Mermaid (`mermaid-…`) and our renderer
 * (`spez-rte-mermaid-<n>`, see renderer.ts) generate, plain id characters only so `#id` needs no escaping.
 */
const PLAIN_ROOT_ID = /^(?:mermaid|spez-rte)-[A-Za-z0-9_-]{1,64}$/;

// ---------------------------------------------------------------------------------------------
// CSS
//
// Every check below is context-free (it runs over the whole text of one selector, declaration or
// prelude, strings included) and the stylesheet is re-emitted from the validated pieces only, so
// the browser tokenises exactly the text that was checked. Structural disagreements between this
// scanner and a real CSS parser can therefore only hide rules, never expose one.
// ---------------------------------------------------------------------------------------------

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const CSS_ESCAPE = /\\([0-9a-fA-F]{1,6})\s?|\\([\s\S])/g;

/**
 * Anything in one piece of CSS that can load or run something: a `url()`/`src()` that is not a
 * same-document fragment, image and element functions, `expression()`, an absolute or
 * protocol-relative URL in a string, script/data schemes, `@import`.
 */
const UNSAFE_CSS =
  /(?:url|src)\s*\((?!\s*['"]?\s*#)|(?:image-set|image|element|expression|cross-fade|paint)\s*\(|:\/\/|['"]\s*\/\/|javascript:|vbscript:|data:|@import/i;
/**
 * A piece that still carries a backslash after one round of escape decoding (`\5c` decodes to one),
 * or a comment delimiter, would be decoded or split differently by the browser: rejected outright.
 */
const CSS_AMBIGUOUS = /\\|\/\*|\*\//;
/** Selectors and declarations may not carry `<` either: nothing in a diagram sheet needs it. */
const CSS_REJECT = /[\\<]|\/\*|\*\//;
/** Legacy binding properties, and layout-escape properties that could place a box outside the SVG. */
const UNSAFE_PROPERTIES = new Set([
  "behavior", "-ms-behavior", "-moz-binding",
  "z-index", "inset", "top", "left", "right", "bottom",
]);
/** `position` is kept only for values that cannot leave the diagram's box. */
const SAFE_POSITION = /^(?:static|relative|absolute)(?:\s*!important)?$/i;

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

/**
 * Index of the first character in `stops` at brace and paren depth 0 outside a string, from `from`,
 * or -1. Strings end at their quote or at a newline (a bad-string), as in a browser.
 */
function scanTo(css: string, from: number, stops: string): number {
  let braces = 0;
  let parens = 0;
  let quote = "";
  for (let i = from; i < css.length; i++) {
    const ch = css[i]!;
    if (quote !== "") {
      if (ch === quote || ch === "\n") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") parens++;
    else if (ch === ")") parens = Math.max(0, parens - 1);
    else if (ch === "{" && (braces > 0 || parens > 0 || !stops.includes("{"))) braces++;
    else if (ch === "}" && braces > 0) braces--;
    else if (braces === 0 && parens === 0 && stops.includes(ch)) return i;
  }
  return -1;
}

/** Index of the `}` closing the block opened at `open`, or the text length when unterminated. */
function closeOf(css: string, open: number): number {
  const end = scanTo(css, open + 1, "}");
  return end === -1 ? css.length : end;
}

function splitTopLevel(css: string, separator: string): string[] {
  const parts: string[] = [];
  let from = 0;
  for (;;) {
    const at = scanTo(css, from, separator);
    if (at === -1) {
      parts.push(css.slice(from));
      return parts;
    }
    parts.push(css.slice(from, at));
    from = at + 1;
  }
}

/** Walks `prelude{body}` and `prelude;` statements; `body` is null for a statement. */
function forEachRule(css: string, visit: (prelude: string, body: string | null) => void): void {
  let i = 0;
  while (i < css.length) {
    const at = scanTo(css, i, "{;");
    if (at === -1) return;
    const prelude = css.slice(i, at).trim();
    if (css[at] === ";") {
      visit(prelude, null);
      i = at + 1;
      continue;
    }
    const close = closeOf(css, at);
    visit(prelude, css.slice(at + 1, close));
    i = close + 1;
  }
}

/** Declarations of one block, each kept verbatim (trimmed) or dropped whole. */
function cleanDeclarations(block: string): string[] {
  const kept: string[] = [];
  for (const piece of splitTopLevel(block, ";")) {
    const declaration = piece.trim();
    const match = /^(-{0,2}[a-zA-Z_][-\w]*)\s*:([\s\S]*)$/.exec(declaration);
    if (match === null) continue;
    const property = match[1]!.toLowerCase();
    if (
      UNSAFE_PROPERTIES.has(property) ||
      property.startsWith("inset-") ||
      (property === "position" && !SAFE_POSITION.test(match[2]!.trim())) ||
      /[{}]/.test(declaration) ||
      CSS_REJECT.test(declaration) ||
      UNSAFE_CSS.test(declaration)
    ) {
      continue;
    }
    kept.push(declaration);
  }
  return kept;
}

function cleanStyleAttribute(value: string): string {
  return cleanDeclarations(normalizeCss(value)).join(";");
}

/** The only things that may follow `#<rootId>` inside its own compound. `focus-within` before `focus`. */
const ROOT_PSEUDO_CLASSES = /^(?::(?:hover|focus-within|focus|active))*/;

/**
 * A selector that can only match inside the root. The root compound is not parsed but matched
 * literally: exactly `#<rootId>`, optionally followed by allow-listed pseudo-classes — no classes,
 * attribute selectors, functional pseudo-classes, quotes or brackets, which is what let
 * `#id:not([x='('])~*` hide a sibling combinator from a depth walker. After that compound the
 * selector must end, or its first combinator must be descendant (whitespace) or child (`>`);
 * `~`, `+` and `||` there would reach outside the SVG. Further compounds and combinators
 * (`#id .a ~ .b`, `#id [data-x="]"]`) are free: they can only match inside the root.
 */
function isScopedSelector(selector: string, rootId: string): boolean {
  const prefix = `#${rootId}`;
  if (!selector.startsWith(prefix)) return false;
  const afterId = selector.slice(prefix.length);
  const rest = afterId.slice(ROOT_PSEUDO_CLASSES.exec(afterId)![0].length);
  if (rest === "") return true;
  const first = rest.charAt(0);
  if (first !== ">" && !/\s/.test(first)) return false; // `#idx`, `#id.c`, `#id[x]`, `#id:not(…)`, `#id~…`
  const combinator = rest.trimStart().charAt(0);
  return combinator !== "+" && combinator !== "~" && combinator !== "|";
}

const MEDIA_QUERY = /^[-\w\s(),:.%=/]*$/;

/** Every `(` closed by a later `)` and never a `)` first: a browser turns anything else into "not all", so drop it instead. */
function hasBalancedParens(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === "(") depth++;
    else if (ch === ")" && --depth < 0) return false;
  }
  return depth === 0;
}

/**
 * Re-emits the rules of a (comment-free, escape-decoded) stylesheet that are scoped under `#rootId`.
 * Statements (`@import`, `@namespace`, `@charset`) and every @-rule other than `@media` are dropped;
 * `@keyframes` too, because animation names are document-global.
 */
function cleanStylesheet(css: string, rootId: string, depth: number): string {
  if (depth > MAX_CSS_DEPTH) return "";
  let out = "";
  forEachRule(css, (prelude, body) => {
    if (body === null || prelude === "" || CSS_REJECT.test(prelude) || UNSAFE_CSS.test(prelude)) return;
    if (prelude.startsWith("@")) {
      const match = /^@media(?:\s+([\s\S]*))?$/i.exec(prelude);
      if (match === null) return;
      const query = (match[1] ?? "").trim();
      if (!MEDIA_QUERY.test(query) || !hasBalancedParens(query)) return;
      const inner = cleanStylesheet(body, rootId, depth + 1);
      if (inner !== "") out += `@media ${query}{${inner}}`;
      return;
    }
    if (/[;{}]/.test(prelude)) return;
    const selectors = splitTopLevel(prelude, ",").map((s) => s.trim());
    if (!selectors.every((s) => isScopedSelector(s, rootId))) return;
    const declarations = cleanDeclarations(body);
    if (declarations.length > 0) out += `${selectors.join(",")}{${declarations.map((d) => `${d};`).join("")}}`;
  });
  return out;
}

/** Empties a `<style>` unless the root has an accepted id; then keeps only the rules scoped under it. */
function cleanStyleElement(style: Element, rootId: string | null): void {
  style.textContent = rootId === null ? "" : cleanStylesheet(normalizeCss(style.textContent ?? ""), rootId, 0);
}

// ---------------------------------------------------------------------------------------------
// Attributes and elements
// ---------------------------------------------------------------------------------------------

/**
 * Presentation attributes are CSS-parsed by the browser, escapes included, so the value is decoded
 * the same way before the check; whitespace and control characters are removed so `java\tscript:`
 * and entity-obfuscated forms are seen for what they are.
 */
function isUnsafeValue(value: string): boolean {
  const decoded = normalizeCss(value);
  if (CSS_AMBIGUOUS.test(decoded)) return true;
  return UNSAFE_CSS.test(decoded.replace(/[\s\u0000-\u001f\u007f]+/g, ""));
}

/** Keeps an attribute only when its name is on the list and its value cannot load or run anything. */
function cleanAttributes(element: Element): void {
  for (const attr of [...element.attributes]) {
    const { localName: name, namespaceURI: ns, value } = attr;
    let keep: boolean;
    if (ns === XMLNS_NS) {
      // Only the default declaration may name the SVG namespace. A prefixed one (`xmlns:svg`, or an
      // `xmlns:ns1` a serialiser invented for a namespaced attribute we then drop) would make the
      // final serialisation re-prefix the root as `<ns1:svg>`: a prefixed root renders blank and is
      // rejected on reload. Prefixed xlink and xml declarations are harmless.
      keep = name === "xmlns" ? NAMESPACE_DECLARATIONS.has(value) : value === XLINK_NS || value === XML_NS;
    } else if (ns === XML_NS) {
      keep = XML_ATTRIBUTES.has(name) && !isUnsafeValue(value);
    } else if (name === "href") {
      keep = (ns === null || ns === XLINK_NS) && value.startsWith("#") && !isUnsafeValue(value);
    } else if (ns !== null) {
      keep = false;
    } else if (name === "style") {
      attr.value = cleanStyleAttribute(value);
      keep = true;
    } else {
      keep =
        (ATTRIBUTES.has(name) || (ATTRIBUTE_PREFIX.test(name) && !RESERVED_DATA_ATTRIBUTE.test(name))) &&
        !isUnsafeValue(value);
    }
    if (!keep) element.removeAttributeNode(attr);
  }
}

/**
 * `<title>` and `<desc>` are HTML integration points: under `innerHTML` the HTML parser re-parses
 * their children in the HTML namespace, so they may hold text only. An element child is dropped
 * with its content, exactly like a non-allow-listed element anywhere else.
 */
const TEXT_ONLY_ELEMENTS = new Set(["title", "desc"]);

/**
 * Removes every child that is not an allow-listed, unprefixed SVG element or a text node; returns
 * the element children that survived. A prefixed element (`svg:g`) is dropped even in the SVG
 * namespace because an HTML re-parse ignores the prefix binding and would put it elsewhere.
 */
function cleanChildren(element: Element): Element[] {
  const kept: Element[] = [];
  const textOnly = TEXT_ONLY_ELEMENTS.has(element.localName);
  for (const child of [...element.childNodes]) {
    switch (child.nodeType) {
      case Node.ELEMENT_NODE: {
        const el = child as Element;
        if (textOnly || el.namespaceURI !== SVG_NS || el.prefix !== null || !ELEMENTS.has(el.localName)) {
          el.remove();
        } else {
          kept.push(el);
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
  return kept;
}

/** Iterative walk (no recursion to overflow); false when the tree is deeper than a diagram can be. */
function cleanTree(root: Element): boolean {
  const styles: Element[] = [];
  const stack: Array<{ element: Element; depth: number }> = [{ element: root, depth: 0 }];
  while (stack.length > 0) {
    const { element, depth } = stack.pop()!;
    if (depth > MAX_ELEMENT_DEPTH) return false;
    for (const child of cleanChildren(element)) stack.push({ element: child, depth: depth + 1 });
    cleanAttributes(element);
    if (element.localName === "style") styles.push(element);
  }
  const id = root.getAttribute("id");
  const rootId = id !== null && PLAIN_ROOT_ID.test(id) ? id : null;
  for (const style of styles) cleanStyleElement(style, rootId);
  return true;
}

/**
 * Returns cleaned `<svg…>` markup, or `""` when the input is empty, too large, unparseable, carries a
 * DOCTYPE or entity declaration, is nested absurdly deep, or its root is not an unprefixed `svg`
 * element in the SVG namespace. It never throws.
 */
export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string" || svg.trim() === "" || svg.length > MAX_SVG_CHARS) return "";
  if (/<!(?:DOCTYPE|ENTITY)/i.test(svg)) return "";
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    if (
      root === null ||
      doc.doctype !== null ||
      root.localName !== "svg" ||
      root.prefix !== null ||
      root.namespaceURI !== SVG_NS ||
      doc.getElementsByTagName("parsererror").length > 0
    ) {
      return "";
    }
    if (!cleanTree(root)) return "";
    const out = new XMLSerializer().serializeToString(root);
    // The root must serialise unprefixed, whatever the attribute pass let through: `<ns1:svg>` would
    // render blank now and fail the `root.prefix` check above on reload.
    return /^<svg\s/.test(out) ? out : "";
  } catch {
    return "";
  }
}
