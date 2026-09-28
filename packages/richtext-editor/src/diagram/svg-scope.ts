/**
 * Gives a diagram's root `<svg>` a document-unique id before it is sanitized and stored.
 *
 * Mermaid (and our renderer) number diagrams per session, so two diagrams on one page can both
 * come out as `mermaid-1`. Their scoped `<style>` rules (`#mermaid-1 .node {…}`) would then match
 * each other, because an id selector matches every element carrying that id. Rewriting the root id
 * to a fresh ULID-based one, and every `#oldId` selector prefix with it, keeps each diagram's
 * stylesheet to itself. The id shape stays within `PLAIN_ROOT_ID` in svg-sanitize.ts, so the
 * sanitizer still keeps the scoped rules.
 *
 * The result is re-serialised from the parsed tree, which normalises markup: a child written with an
 * SVG-namespace prefix (`<svg:g>`, `<svg:script>`) comes back unprefixed (`<g>`, `<script>`), because
 * the serialiser drops a prefix whose namespace is the inherited default. That is safe only because
 * `sanitizeSvg` always runs on the output and allow-lists by local name, so `<script>` is removed
 * either way; nothing may store or render this function's result without sanitizing it. The reverse
 * also happens: with `xmlns:svg="…"` declared on the root (Inkscape emits it) the serialiser would
 * re-prefix the root itself as `<svg:svg>`, which the sanitizer rejects wholesale, so such
 * declarations are removed from the root first.
 */
import { generateMarkId } from "../comments/mark-id";
import { MAX_SVG_CHARS } from "./svg-sanitize";

const SVG_NS = "http://www.w3.org/2000/svg";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";
/** An id this module issued: `spez-rte-mermaid-` plus a 26-character ULID. */
export const DIAGRAM_ROOT_ID = /^spez-rte-mermaid-[0-9A-HJKMNP-TV-Z]{26}$/;
/** Ids that `#id` can reference in CSS without escaping; anything else is not rewritten in `<style>`. */
const PLAIN_ID = /^[A-Za-z0-9_-]+$/;

/** The mark-id module's ULID is any ULID; the prefix makes it a diagram root id. */
function newDiagramRootId(): string {
  return `spez-rte-mermaid-${generateMarkId()}`;
}

/**
 * Returns `svg` with its root id replaced by a unique `spez-rte-mermaid-<ULID>` and every
 * `#<oldId>` selector prefix in its `<style>` elements rewritten to match. A root that already has
 * a unique-form id is returned unchanged, so re-importing stored markup is idempotent. Input that
 * is not a parseable `<svg>` document is returned as is (the sanitizer rejects it next); input over
 * the sanitizer's size cap is returned as `""` without being parsed. Never throws.
 */
export function withUniqueRootId(svg: string): string {
  if (typeof svg !== "string" || svg.trim() === "") return svg;
  if (svg.length > MAX_SVG_CHARS) return "";
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    if (
      root === null ||
      root.localName !== "svg" ||
      root.namespaceURI !== SVG_NS ||
      doc.getElementsByTagName("parsererror").length > 0
    ) {
      return svg;
    }
    const oldId = root.getAttribute("id");
    if (oldId !== null && DIAGRAM_ROOT_ID.test(oldId)) return svg;
    const newId = newDiagramRootId();
    root.setAttribute("id", newId);
    // `xmlns:svg="http://www.w3.org/2000/svg"` on the root would make the serialiser emit `<svg:svg>`.
    for (const attr of [...root.attributes]) {
      if (attr.namespaceURI === XMLNS_NS && attr.localName !== "xmlns" && attr.value === SVG_NS) {
        root.removeAttributeNode(attr);
      }
    }
    if (oldId !== null && PLAIN_ID.test(oldId)) {
      // `#mermaid-1` but not `#mermaid-10` or `#mermaid-1_marker`: the next character must end the id.
      // PLAIN_ID admits no regex metacharacters, so the id is used unescaped.
      const selector = new RegExp(`#${oldId}(?![A-Za-z0-9_-])`, "g");
      for (const style of root.getElementsByTagName("style")) {
        const css = style.textContent ?? "";
        if (css.includes(`#${oldId}`)) style.textContent = css.replace(selector, `#${newId}`);
      }
    }
    return new XMLSerializer().serializeToString(root);
  } catch {
    return svg;
  }
}
