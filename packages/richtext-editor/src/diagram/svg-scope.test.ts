import { describe, expect, it } from "vitest";
import { MAX_SVG_CHARS, sanitizeSvg } from "./svg-sanitize";
import { DIAGRAM_ROOT_ID, withUniqueRootId } from "./svg-scope";

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const idOf = (svg: string): string | null =>
  new DOMParser().parseFromString(svg, "image/svg+xml").documentElement.getAttribute("id");

describe("withUniqueRootId", () => {
  it("replaces a Mermaid root id with a fresh spez-rte-mermaid ULID and rewrites #id selectors", () => {
    const out = withUniqueRootId(
      `<svg ${NS} id="mermaid-1"><style>#mermaid-1 .node{fill:red}#mermaid-1{color:blue}#mermaid-10 .x{fill:green}</style><rect/></svg>`,
    );
    const id = idOf(out)!;
    expect(id).toMatch(DIAGRAM_ROOT_ID);
    expect(out).toContain(`#${id} .node{fill:red}`);
    expect(out).toContain(`#${id}{color:blue}`);
    // `#mermaid-10` is a different id and must not be touched by the `#mermaid-1` rewrite.
    expect(out).toContain("#mermaid-10 .x{fill:green}");
    expect(out).not.toContain("#mermaid-1 ");
  });

  it("gives two diagrams that both came out as mermaid-1 distinct ids", () => {
    const svg = `<svg ${NS} id="mermaid-1"><style>#mermaid-1 rect{fill:red}</style><rect/></svg>`;
    const a = idOf(withUniqueRootId(svg));
    const b = idOf(withUniqueRootId(svg));
    expect(a).not.toBe(b);
  });

  it("assigns an id when the root has none", () => {
    expect(idOf(withUniqueRootId(`<svg ${NS}><rect/></svg>`))).toMatch(DIAGRAM_ROOT_ID);
  });

  it("keeps an id that is already in the unique form, so re-importing stored svg is a no-op", () => {
    const svg = `<svg ${NS} id="spez-rte-mermaid-01ARZ3NDEKTSV4RRFFQ69G5FAV"><style>#spez-rte-mermaid-01ARZ3NDEKTSV4RRFFQ69G5FAV rect{fill:red}</style><rect/></svg>`;
    expect(withUniqueRootId(svg)).toBe(svg);
  });

  it("does not rewrite selectors for an id that would need CSS escaping", () => {
    const out = withUniqueRootId(`<svg ${NS} id="a b"><style>#a b rect{fill:red}</style><rect/></svg>`);
    expect(idOf(out)).toMatch(DIAGRAM_ROOT_ID);
    expect(out).toContain("#a b rect{fill:red}");
  });

  it("returns the input unchanged when it is not a parseable svg document", () => {
    for (const bad of ["", "<div/>", "<svg", "<svg><rect></svg>"]) {
      expect(withUniqueRootId(bad)).toBe(bad);
    }
  });

  it("rejects input over the sanitizer's size cap before parsing it", () => {
    const huge = `<svg ${NS}>${"a".repeat(MAX_SVG_CHARS)}</svg>`;
    expect(withUniqueRootId(huge)).toBe("");
    expect(sanitizeSvg(withUniqueRootId(huge))).toBe("");
  });

  it.each([
    ["prefix declared on the root", `<svg ${NS} xmlns:svg="${NS.slice(7, -1)}" id="mermaid-1"><svg:script>a()</svg:script><svg:g><rect/></svg:g></svg>`],
    ["prefix declared on the child", `<svg ${NS} id="mermaid-1"><svg:script xmlns:svg="${NS.slice(7, -1)}">a()</svg:script><g><rect/></g></svg>`],
  ])("re-serialisation unprefixes <svg:script> (%s); the sanitizer then removes it by local name", (_name, stored) => {
    // The node's cleaning pipeline is sanitizeSvg(withUniqueRootId(svg)); see diagram-node.ts cleanDiagramSvg.
    const rescoped = withUniqueRootId(stored);
    expect(rescoped).not.toContain("<svg:"); // neither the child nor a re-prefixed root
    expect(rescoped).toMatch(/^<svg /);
    const clean = sanitizeSvg(rescoped);
    expect(clean).not.toMatch(/script|a\(\)/);
    expect(clean).toContain("<rect");
    expect(idOf(clean)).toMatch(DIAGRAM_ROOT_ID);
  });
});

/** The node's exact pipeline (diagram-node.ts cleanDiagramSvg). */
const clean = (svg: string): string => sanitizeSvg(withUniqueRootId(svg));
const SVG = NS.slice(7, -1);

describe("cleaning pipeline keeps the root unprefixed", () => {
  it.each(['svg:onload="a()"', 'svg:href="javascript:a()"', 'svg:foo="1"'])(
    "an SVG-namespaced root attribute (%s) plus xmlns:svg cannot re-prefix the root through an invented xmlns:ns1",
    (attr) => {
      const out = clean(`<svg ${NS} xmlns:svg="${SVG}" id="mermaid-1" ${attr}><rect/></svg>`);
      expect(out).toMatch(/^<svg /);
      expect(out).not.toMatch(/onload|javascript|foo|ns1|xmlns:svg/);
      expect(out).toContain("<rect");
      expect(clean(out)).toBe(out);
    },
  );

  it("a crafted unique-form id skips rescoping, and the sanitizer alone still drops xmlns:svg", () => {
    const input = `<svg ${NS} xmlns:svg="${SVG}" id="spez-rte-mermaid-01ARZ3NDEKTSV4RRFFQ69G5FAV" svg:onload="a()"><rect/></svg>`;
    expect(withUniqueRootId(input)).toBe(input); // the id is kept, so nothing is stripped here
    const out = clean(input);
    expect(out).toMatch(/^<svg /);
    expect(out).not.toMatch(/onload|ns1|xmlns:svg/);
    expect(out).toContain("<rect");
    expect(clean(out)).toBe(out);
  });

  it("an Inkscape-style drawing (xmlns:svg on the root, prefixed children, foreign attributes) still renders", () => {
    const inkscape = `<svg ${NS} xmlns:svg="${SVG}" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" id="svg1" inkscape:version="1.3"><svg:g inkscape:label="Layer 1"><svg:rect width="1" height="1"/></svg:g></svg>`;
    const out = clean(inkscape);
    expect(out).toMatch(/^<svg /);
    expect(out).not.toMatch(/inkscape|<svg:/);
    expect(out).toContain('<rect width="1" height="1"/>');
    expect(idOf(out)).toMatch(DIAGRAM_ROOT_ID);
    expect(clean(out)).toBe(out);
  });

  it("rewrites #id selectors inside a prefixed <svg:style> too", () => {
    const out = clean(
      `<svg ${NS} xmlns:svg="${SVG}" id="mermaid-1"><svg:style>#mermaid-1 rect{fill:red}</svg:style><rect/></svg>`,
    );
    const id = idOf(out)!;
    expect(id).toMatch(DIAGRAM_ROOT_ID);
    expect(out).toContain(`<style>#${id} rect{fill:red;}</style>`);
  });
});
