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

const MAX_CHARS = 2_000_000;
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
const XML_ATTRIBUTES = new Set(["space", "lang"]);
const NAMESPACE_DECLARATIONS = new Set([SVG_NS, XLINK_NS, XML_NS]);

/** The root id a scoped stylesheet may reference: a plain CSS identifier, so `#id` needs no escaping. */
const PLAIN_ID = /^[A-Za-z_][-\w]*$/;

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
const UNSAFE_PROPERTIES = new Set(["behavior", "-ms-behavior", "-moz-binding"]);

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
      /[{}]/.test(declaration) ||
      CSS_AMBIGUOUS.test(declaration) ||
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

/** `#<rootId>` alone or followed by a combinator, class, pseudo or attribute selector. */
function isScopedSelector(selector: string, rootId: string): boolean {
  const prefix = `#${rootId}`;
  if (!selector.startsWith(prefix)) return false;
  const next = selector.charAt(prefix.length);
  return next === "" || /[\s>+~.:[]/.test(next);
}

const KEYFRAME_SELECTOR = /^(?:from|to|\d+(?:\.\d+)?%)(?:\s*,\s*(?:from|to|\d+(?:\.\d+)?%))*$/i;
const MEDIA_QUERY = /^[-\w\s(),:.%<>=/]*$/;

function cleanKeyframes(body: string): string {
  let out = "";
  forEachRule(body, (prelude, frame) => {
    if (frame === null || !KEYFRAME_SELECTOR.test(prelude)) return;
    const declarations = cleanDeclarations(frame);
    if (declarations.length > 0) out += `${prelude}{${declarations.map((d) => `${d};`).join("")}}`;
  });
  return out;
}

/**
 * Re-emits the rules of a (comment-free, escape-decoded) stylesheet that are scoped under `#rootId`.
 * Statements (`@import`, `@namespace`, `@charset`) and every @-rule other than `@media` and
 * `@keyframes` are dropped.
 */
function cleanStylesheet(css: string, rootId: string, depth: number): string {
  if (depth > MAX_CSS_DEPTH) return "";
  let out = "";
  forEachRule(css, (prelude, body) => {
    if (body === null || prelude === "" || CSS_AMBIGUOUS.test(prelude) || UNSAFE_CSS.test(prelude)) return;
    if (prelude.startsWith("@")) {
      const match = /^@(-webkit-keyframes|keyframes|media)(?:\s+([\s\S]*))?$/i.exec(prelude);
      if (match === null) return;
      const name = match[1]!.toLowerCase();
      const argument = (match[2] ?? "").trim();
      if (name === "media") {
        if (!MEDIA_QUERY.test(argument)) return;
        const inner = cleanStylesheet(body, rootId, depth + 1);
        if (inner !== "") out += `@media ${argument}{${inner}}`;
      } else {
        if (!/^[-\w]+$/.test(argument)) return;
        const frames = cleanKeyframes(body);
        if (frames !== "") out += `@${name} ${argument}{${frames}}`;
      }
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

/** Empties a `<style>` unless the root has a plain id; then keeps only the rules scoped under it. */
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
      keep = NAMESPACE_DECLARATIONS.has(value);
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
      keep = (ATTRIBUTES.has(name) || ATTRIBUTE_PREFIX.test(name)) && !isUnsafeValue(value);
    }
    if (!keep) element.removeAttributeNode(attr);
  }
}

/**
 * Removes every child that is not an allow-listed, unprefixed SVG element or a text node; returns
 * the element children that survived. A prefixed element (`svg:g`) is dropped even in the SVG
 * namespace because an HTML re-parse ignores the prefix binding and would put it elsewhere.
 */
function cleanChildren(element: Element): Element[] {
  const kept: Element[] = [];
  for (const child of [...element.childNodes]) {
    switch (child.nodeType) {
      case Node.ELEMENT_NODE: {
        const el = child as Element;
        if (el.namespaceURI !== SVG_NS || el.prefix !== null || !ELEMENTS.has(el.localName)) {
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
  const rootId = id !== null && PLAIN_ID.test(id) ? id : null;
  for (const style of styles) cleanStyleElement(style, rootId);
  return true;
}

/**
 * Returns cleaned `<svg…>` markup, or `""` when the input is empty, too large, unparseable, carries a
 * DOCTYPE or entity declaration, is nested absurdly deep, or its root is not an unprefixed `svg`
 * element in the SVG namespace. It never throws.
 */
export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string" || svg.trim() === "" || svg.length > MAX_CHARS) return "";
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
    return new XMLSerializer().serializeToString(root);
  } catch {
    return "";
  }
}
