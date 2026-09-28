import { describe, expect, it } from "vitest";
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
});
