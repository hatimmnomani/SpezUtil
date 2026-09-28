import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./svg-sanitize";

const NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
const wrap = (inner: string, rootAttrs = ""): string => `<svg ${NS}${rootAttrs}>${inner}<rect width="1"/></svg>`;
/** A root with an id, which is what scoped <style> rules are checked against. */
const wrapId = (inner: string): string => wrap(inner, ' id="mermaid-1"');

function reparse(svg: string): Document {
  return new DOMParser().parseFromString(svg, "image/svg+xml");
}

describe("sanitizeSvg (mirrors HandbookSvgSanitizer)", () => {
  it.each(["<script>alert(1)</script>", "<foreignObject><div>x</div></foreignObject>", '<iframe src="https://x"/>'])(
    "removes %s with its content",
    (inner) => {
      const clean = sanitizeSvg(`<svg ${NS}>${inner}<rect width="1"/></svg>`);
      expect(clean).not.toMatch(/script|foreignObject|iframe/);
      expect(clean).toContain("<rect");
    },
  );

  it("strips event attributes and external or javascript hrefs, keeps fragment refs", () => {
    const clean = sanitizeSvg(
      `<svg ${NS} onload="x()"><use xlink:href="https://evil/x.svg#a"/><use href="#marker"/><a href="javascript:x"><text>t</text></a></svg>`,
    );
    expect(clean).not.toMatch(/onload|evil|javascript/);
    expect(clean).toContain('href="#marker"');
  });

  // Brief test amended under the fix-round-1 ruling: <style> rules survive only under the root's id.
  it("strips @import and external url() but keeps class rules and url(#id)", () => {
    const clean = sanitizeSvg(
      `<svg ${NS} id="mermaid-1"><style>@import url(https://x/a.css); #mermaid-1 .node rect { fill: #fff; } #mermaid-1 .e { background: url(https://x/p.png) }</style><rect style="fill:url(#g)"/></svg>`,
    );
    expect(clean).not.toContain("@import");
    expect(clean).not.toContain("https://x");
    expect(clean).toContain("#mermaid-1 .node rect");
    expect(clean).toContain("url(#g)");
  });

  it("rejects doctype, garbage and non-svg roots", () => {
    expect(sanitizeSvg('<!DOCTYPE svg [<!ENTITY x "y">]><svg/>')).toBe("");
    expect(sanitizeSvg("not svg")).toBe("");
    expect(sanitizeSvg("<html/>")).toBe("");
    expect(sanitizeSvg("")).toBe("");
  });
});

describe("sanitizeSvg allow-list (XSS boundary)", () => {
  it("rejects empty, oversized and non-string input", () => {
    expect(sanitizeSvg("   ")).toBe("");
    expect(sanitizeSvg(`<svg ${NS}>${" ".repeat(2_000_001)}</svg>`)).toBe("");
    expect(sanitizeSvg(undefined as unknown as string)).toBe("");
  });

  it("rejects an svg root outside the SVG namespace and an <svg> without a namespace", () => {
    expect(sanitizeSvg('<svg xmlns="http://www.w3.org/1999/xhtml"><rect/></svg>')).toBe("");
    expect(sanitizeSvg("<svg><rect/></svg>")).toBe("");
  });

  it("rejects a prefixed root, which an HTML re-parse would put in the HTML namespace (I2)", () => {
    expect(sanitizeSvg(`<svg:svg xmlns:svg="http://www.w3.org/2000/svg" ${NS}><rect/></svg:svg>`)).toBe("");
    expect(sanitizeSvg(`<svg:svg xmlns:svg="http://www.w3.org/2000/svg"><svg:rect/></svg:svg>`)).toBe("");
  });

  it("rejects DOCTYPE and ENTITY declarations in any case or position", () => {
    expect(sanitizeSvg(`<!doctype svg><svg ${NS}/>`)).toBe("");
    expect(sanitizeSvg(`<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd"><svg ${NS}/>`)).toBe("");
    expect(sanitizeSvg(`<svg ${NS}><!ENTITY x "y"></svg>`)).toBe("");
  });

  it.each([
    "<embed src='https://x'/>",
    "<object data='https://x'/>",
    "<image href='https://x/p.png'/>",
    "<image href='data:image/png;base64,AAAA'/>",
    "<animate attributeName='href' to='javascript:alert(1)'/>",
    "<set attributeName='onload' to='alert(1)'/>",
    "<SCRIPT>alert(1)</SCRIPT>",
    "<sCrIpT>alert(1)</sCrIpT>",
    "<FOREIGNOBJECT><div/></FOREIGNOBJECT>",
    "<filter id='f'><feImage href='https://x'/></filter>",
    "<xhtml:script xmlns:xhtml='http://www.w3.org/1999/xhtml'>alert(1)</xhtml:script>",
    "<svg:script xmlns:svg='http://www.w3.org/2000/svg'>alert(1)</svg:script>",
    "<g><g><script>alert(1)</script><animate/></g></g>",
  ])("removes non-allow-listed element %s wherever it sits", (inner) => {
    const clean = sanitizeSvg(wrap(inner));
    expect(clean.toLowerCase()).not.toMatch(/script|embed|object|image|animate|<set|foreignobject|filter|alert|https:/);
    expect(clean).toContain("<rect");
  });

  it("drops prefixed elements even in the SVG namespace (I2): an HTML re-parse ignores the prefix", () => {
    const clean = sanitizeSvg(
      `<svg ${NS}><svg:g xmlns:svg="http://www.w3.org/2000/svg"><svg:circle r="1"/></svg:g><g><path d="M0 0"/></g></svg>`,
    );
    expect(clean).not.toMatch(/svg:g|circle/);
    expect(clean).toContain('<path d="M0 0"/>');
  });

  it.each(["onload", "ONLOAD", "OnClick", "onmouseover", "onbegin", "onerror"])(
    "removes %s event attributes on any element",
    (name) => {
      const clean = sanitizeSvg(wrap(`<g ${name}="alert(1)"><text ${name}="alert(1)">t</text></g>`, ` ${name}="alert(1)"`));
      expect(clean).not.toMatch(/\son[a-z]*=/i);
      expect(clean).not.toContain("alert");
      expect(clean).toContain("<text>t</text>");
    },
  );

  it("removes attributes that are not on the allow-list", () => {
    const clean = sanitizeSvg(
      wrap(
        `<a href="#x" target="_blank" formaction="https://x" xlink:actuate="onLoad" xlink:title="t" tabindex="0"><text>t</text></a><rect cursor="url(https://x)" filter="url(#f)" contenteditable="true"/>`,
      ),
    );
    expect(clean).not.toMatch(/target|formaction|actuate|xlink:title|tabindex|cursor|filter|contenteditable|https:/);
    expect(clean).toContain('href="#x"');
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "java&#x09;script:alert(1)",
    "java&#10;script:alert(1)",
    " javascript:alert(1)",
    "\tjavascript:alert(1)",
    "jav&#x61;script:alert(1)",
    "vbscript:msgbox(1)",
    "VbScript:msgbox(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "data:image/svg+xml,%3Csvg%20onload%3Dalert(1)%3E",
    "https://evil.example/x.svg#a",
    "//evil.example/x.svg#a",
    "/x.svg#a",
    "x.svg#a",
    "",
  ])("drops href/xlink:href %j on <a> and <use>, in both namespaces", (value) => {
    const clean = sanitizeSvg(
      wrap(`<a href="${value}"><text>t</text></a><use xlink:href="${value}"/><use href="${value}"/><a xlink:href="${value}"><text>u</text></a>`),
    );
    expect(clean.toLowerCase()).not.toMatch(/href|script|data:|evil|alert|msgbox|x\.svg/);
    expect(clean).toContain("<text>t</text>");
    expect(clean).toContain("<text>u</text>");
  });

  it("keeps fragment hrefs on every allow-listed element that takes one", () => {
    const clean = sanitizeSvg(
      wrap(
        `<defs><linearGradient id="g"/><linearGradient id="h" href="#g"/><pattern id="p" xlink:href="#g"/></defs><use href="#m"/><a xlink:href="#top"><text>t</text></a>`,
      ),
    );
    expect(clean).toContain('href="#g"');
    expect(clean).toContain('href="#m"');
    expect(clean).toContain('href="#top"');
  });

  it.each([
    'fill="url(javascript:alert(1))"',
    'fill="url(https://x/p.svg#f)"',
    'fill="url(&quot;https://x/p.svg&quot;)"',
    'fill="url( \'https://x/p.svg\' )"',
    'fill="url(https://x/p.svg#f"',
    'fill="\\75rl(https://x/p.svg#f)"',
    'fill="\\75 rl(https://x/p.svg#f)"',
    'fill="u\\0072l(https://x/p.svg#f)"',
    'fill="image-set(&quot;https://x/p.png&quot; 1x)"',
    'fill="-webkit-image-set(&quot;https://x/p.png&quot; 1x)"',
    'fill="image(&quot;https://x/p.png&quot;)"',
    'fill="src(&quot;https://x/p.svg&quot;)"',
    'stroke="url(data:image/svg+xml,x)"',
    'marker-end="url(//x/m.svg#a)"',
    'clip-path="url(https://x/c.svg#c)"',
    'mask="url(javascript:x)"',
    'class="javascript:alert(1)"',
    'id="data:text/html,x"',
    'aria-label="vbscript:x"',
    'data-id="expression(alert(1))"',
    'transform="url(https://x)"',
  ])("drops presentational attribute %s whose value smuggles a scheme or an external load", (attr) => {
    const clean = sanitizeSvg(wrap(`<path d="M0 0" ${attr}/>`));
    expect(clean.toLowerCase()).not.toMatch(/javascript|https:|data:|alert|vbscript|expression|image|src\(|\/\/x|\\/);
    expect(clean).toContain('<path d="M0 0"/>');
  });

  it("keeps presentational attributes whose value is a plain value or a url(#id)", () => {
    const clean = sanitizeSvg(
      wrap(
        `<path d="M0 0" fill="url(#g)" stroke="#333" stroke-width="2" marker-end="url(#a_flowchart-v2-pointEnd)" clip-path="url(#c)" mask="url( '#m' )" class="edge-thickness-normal" data-id="A" aria-roledescription="flowchart-v2" role="graphics-document document" transform="translate(1, 2)"/>`,
      ),
    );
    expect(clean).toContain('fill="url(#g)"');
    expect(clean).toContain('stroke="#333"');
    expect(clean).toContain('stroke-width="2"');
    expect(clean).toContain('marker-end="url(#a_flowchart-v2-pointEnd)"');
    expect(clean).toContain('clip-path="url(#c)"');
    expect(clean).toContain(`mask="url( '#m' )"`);
    expect(clean).toContain('class="edge-thickness-normal"');
    expect(clean).toContain('data-id="A"');
    expect(clean).toContain('aria-roledescription="flowchart-v2"');
    expect(clean).toContain('role="graphics-document document"');
    expect(clean).toContain('transform="translate(1, 2)"');
  });

  it.each([
    ["fill:url(javascript:alert(1));stroke:#000", 'style="stroke:#000"', /javascript|alert/],
    ["background:url(https://x/p.png);fill:#fff", 'style="fill:#fff"', /https:/],
    ["background:url(  'https://x/p.png'  );fill:#fff", 'style="fill:#fff"', /https:/],
    ["background:url(https://x/p.png", 'style=""', /https:|url\(/],
    ["fill:#fff;background:url(https://x/p.png", 'style="fill:#fff"', /https:|url\(/],
    ['background:image-set("https://x/p.png" 1x);fill:#fff', 'style="fill:#fff"', /https:|image/],
    ['background:-webkit-image-set("https://x/p.png" 1x);fill:#fff', 'style="fill:#fff"', /https:|image/],
    ['background:image("https://x/p.png");fill:#fff', 'style="fill:#fff"', /https:|image/],
    ['background:src("https://x/p.png");fill:#fff', 'style="fill:#fff"', /https:|src/],
    ['content:"https://x/p.png";fill:#fff', 'style="fill:#fff"', /https:/],
    ['content:"//x/p.png";fill:#fff', 'style="fill:#fff"', /\/\/x/],
    ["width:expression(alert(1));fill:#fff", 'style="fill:#fff"', /expression|alert/],
    ["width:expression (alert(1));fill:#fff", 'style="fill:#fff"', /expression|alert/],
    ["background:\\75rl(https://x/p.png);fill:#fff", 'style="fill:#fff"', /https:|url\(/],
    ["background:\\75 rl(https://x/p.png);fill:#fff", 'style="fill:#fff"', /https:|url\(/],
    ["background:u\\0072l(https://x/p.png);fill:#fff", 'style="fill:#fff"', /https:|url\(/],
    ["background:url(/**/https://x/p.png);fill:#fff", 'style="fill:#fff"', /https:/],
    ["behavior:url(#default#time2);fill:#fff", 'style="fill:#fff"', /behavior/],
    ["-moz-binding:url(https://x/b.xml#a);fill:#fff", 'style="fill:#fff"', /binding|https:/],
    // `color:red}body{display:none` is one declaration whose value holds a {} block: invalid in a browser too.
    ["fill:#fff;color:red}body{display:none", 'style="fill:#fff"', /body|display|color/],
    // layout-escape properties (round 2, item 4)
    ["position:fixed;fill:#fff", 'style="fill:#fff"', /position|fixed/],
    ["position: Sticky !important;fill:#fff", 'style="fill:#fff"', /position|sticky/],
    ["position:var(--p);fill:#fff", 'style="fill:#fff"', /position|var/],
    ["z-index:2147483647;fill:#fff", 'style="fill:#fff"', /z-index/],
    ["Z-INDEX:1;fill:#fff", 'style="fill:#fff"', /z-index/i],
    ["inset:0;fill:#fff", 'style="fill:#fff"', /inset/],
    ["inset-block-start:0;fill:#fff", 'style="fill:#fff"', /inset/],
    ["top:0;left:0;right:0;bottom:0;fill:#fff", 'style="fill:#fff"', /top|left|right|bottom/],
    ["position:absolute;fill:#fff", 'style="position:absolute;fill:#fff"', /never/],
    // `<` anywhere in a declaration (round 2, item 5)
    // a `<` that survived would come back as &lt; inside the attribute value
    ["content:'</style><script>x</script>';fill:#fff", 'style="fill:#fff"', /&lt;|script/],
    ["fill:#fff;width:<1", 'style="fill:#fff"', /&lt;/],
    ["fill:url(#g);stroke:url( '#s' )", `style="fill:url(#g);stroke:url( '#s' )"`, /never/],
    ["max-width: 300px; background-color: white;", 'style="max-width: 300px;background-color: white"', /never/],
  ])("cleans style attribute %j declaration by declaration", (style, kept, gone) => {
    const clean = sanitizeSvg(wrap(`<rect style="${style.replace(/"/g, "&quot;").replace(/</g, "&lt;")}"/>`));
    expect(clean).toContain(kept);
    expect(clean).not.toMatch(gone);
  });

  it.each([
    "@import url(https://x/a.css);",
    "@import 'https://x/a.css';",
    "@IMPORT url(https://x/a.css);",
    "@\\69mport url(https://x/a.css);",
    "@font-face{font-family:x;src:url(https://x/f.woff)}",
    "@namespace x url(https://x);",
    "@supports (display:grid){#mermaid-1 .z{background:url(https://x/p.png)}}",
    "#mermaid-1 .e{background:url(https://x/p.png)}",
    "#mermaid-1 .e{background:url('//x/p.png')}",
    "#mermaid-1 .e{background:url(data:image/svg+xml,x)}",
    "#mermaid-1 .e{background:url(javascript:alert(1))}",
    "#mermaid-1 .e{background:\\75rl(https://x/p.png)}",
    "#mermaid-1 .e{background:url(/**/https://x/p.png)}",
    '#mermaid-1 .e{background:image-set("https://x/p.png" 1x)}',
    '#mermaid-1 .e{background:-webkit-image-set("https://x/p.png" 1x)}',
    '#mermaid-1 .e{background:image("https://x/p.png")}',
    '#mermaid-1 .e{background:src("https://x/p.png")}',
    '#mermaid-1 .e{content:"https://x/p.png"}',
    "#mermaid-1 .e{width:expression(alert(1))}",
    "#mermaid-1 .e{behavior:url(#default#time2)}",
    "#mermaid-1 .e{-moz-binding:url(https://x/b.xml#a)}",
    "@media screen{#mermaid-1 .e{background:url(https://x/p.png)}}",
    "@keyframes k{from{background:url(https://x/p.png)}}",
    "@keyframes k{from{opacity:0}}",
    "#mermaid-1 .e{position:fixed;top:0;left:0;z-index:9999}",
    "#mermaid-1 .e{inset:0;position:sticky}",
    "#mermaid-1 .e{content:'</style><script>alert(1)</script>'}",
    "#mermaid-1 .e<x{fill:red}",
  ])("cleans <style> content %j while keeping the surrounding scoped rules", (bad) => {
    // `<` is text inside <style>, so the XML source carries it as &lt;.
    const clean = sanitizeSvg(
      wrapId(`<style>#mermaid-1 .node rect{fill:#ECECFF;} ${bad.replace(/</g, "&lt;")} #mermaid-1 .edge{stroke:url(#g);}</style>`),
    );
    expect(clean).toContain("#mermaid-1 .node rect{fill:#ECECFF;}");
    expect(clean).toContain("#mermaid-1 .edge{stroke:url(#g);}");
    expect(clean.toLowerCase()).not.toMatch(
      /@import|@font-face|@namespace|@supports|@keyframes|https:|\/\/x|data:|javascript|alert|expression|behavior|binding|image|src\(|position|z-index|inset|top|left|script|&lt;|<x/,
    );
  });

  it.each([
    "#mermaid-1~body",
    "#mermaid-1 ~ *",
    "#mermaid-1+*",
    "#mermaid-1 + body",
    "#mermaid-1:hover~.x",
    "#mermaid-1:not(.z) ~ *",
    "#mermaid-1.c ~ *",
    "#mermaid-1[data-id] ~ *",
    "#mermaid-1||.x",
    "#mermaid-1 || .x",
    "#mermaid-1 .a, #mermaid-1 ~ body",
  ])("rejects a rule whose first combinator after the root compound is a sibling one: %s (round 2)", (selector) => {
    const clean = sanitizeSvg(wrapId(`<style>${selector}{display:none;fill:red} #mermaid-1 .ok{fill:#000}</style>`));
    expect(clean).not.toMatch(/display|fill:red|body|~|\+|\|\|/);
    expect(clean).toContain("<style>#mermaid-1 .ok{fill:#000;}</style>");
  });

  it("keeps sibling and child combinators once inside the SVG, and pseudo-classes on the root (round 2)", () => {
    const clean = sanitizeSvg(
      wrapId(
        "<style>#mermaid-1 .a ~ .b{fill:red} #mermaid-1 .a+.b{fill:red} #mermaid-1>.a~.b{fill:red} #mermaid-1:hover .a{fill:red} #mermaid-1:not(.z) > .a{fill:red} #mermaid-1.c .a{fill:red} #mermaid-1[data-id='a ~ b'] .a{fill:red}</style>",
      ),
    );
    expect(clean).toContain("#mermaid-1 .a ~ .b{fill:red;}");
    expect(clean).toContain("#mermaid-1 .a+.b{fill:red;}");
    expect(clean).toContain("#mermaid-1&gt;.a~.b{fill:red;}");
    expect(clean).toContain("#mermaid-1:hover .a{fill:red;}");
    expect(clean).toContain("#mermaid-1:not(.z) &gt; .a{fill:red;}");
    expect(clean).toContain("#mermaid-1.c .a{fill:red;}");
    expect(clean).toContain("#mermaid-1[data-id='a ~ b'] .a{fill:red;}");
  });

  it("an unterminated url() in <style> is dropped, not emitted as a fetch that runs to EOF (I1a)", () => {
    // A browser's bad-url token also swallows what follows, so only the rule before it can be expected back.
    const clean = sanitizeSvg(wrapId("<style>#mermaid-1 .z{fill:red}#mermaid-1 .a{background:url(https://x/p.png}#mermaid-1 .b{fill:#000}</style>"));
    expect(clean).not.toMatch(/https:|url\(|#000/);
    expect(clean).toContain("<style>#mermaid-1 .z{fill:red;}</style>");
  });

  it("scopes <style>: keeps only rules whose every selector starts with the root id (I3)", () => {
    const clean = sanitizeSvg(
      wrap(
        "<style>body{display:none} input[value^=a]{background:url(#x)} #mermaid-r .node{fill:red} #mermaid-r .a, .b{fill:blue} #mermaid-r-x .c{fill:green} #mermaid-rx{fill:green} #mermaid-r{font-size:16px} #mermaid-r>.d, #mermaid-r .e{fill:#000}</style>",
        ' id="mermaid-r"',
      ),
    );
    // `>` is text inside <style>, so the XML serializer writes it as &gt;.
    expect(clean).toContain("<style>#mermaid-r .node{fill:red;}#mermaid-r{font-size:16px;}#mermaid-r&gt;.d,#mermaid-r .e{fill:#000;}</style>");
    expect(clean).not.toMatch(/body|input|display|\.b\{|#mermaid-r-x|#mermaid-rx|green|blue/);
  });

  it.each(["", ' id="m"', ' id="m x"', ' id="1m"', ' id="mermaid-"', ' id="mermaid_1"', ' id="Mermaid-1"', ` id="mermaid-${"a".repeat(65)}"`])(
    "drops every <style> rule when the root id is missing or is not mermaid-/spez-rte- plus 1-64 id chars: %j (I3, round 2)",
    (idAttr) => {
      const rootId = /id="([^"]*)"/.exec(idAttr)?.[1] ?? "x";
      const clean = sanitizeSvg(wrap(`<style>#${rootId} .a{fill:red}</style>`, idAttr));
      expect(clean).toContain("<style/>");
      expect(clean).toContain("<rect");
    },
  );

  it.each(["mermaid-1", "mermaid-abc_DEF-9", "spez-rte-mermaid-42", `spez-rte-${"a".repeat(64)}`])(
    "keeps scoped rules under the accepted root id %s (round 2)",
    (rootId) => {
      const clean = sanitizeSvg(wrap(`<style>#${rootId} .a{fill:red}</style>`, ` id="${rootId}"`));
      expect(clean).toContain(`<style>#${rootId} .a{fill:red;}</style>`);
    },
  );

  it("keeps @media with scoped, clean content and drops @keyframes and every other @-rule (I3, round 2)", () => {
    const clean = sanitizeSvg(
      wrapId(
        "<style>@media (max-width: 600px){#mermaid-1 .a{fill:red} body{display:none}} @media print{body{display:none}} @keyframes edge-animation-frame{from{stroke-dashoffset:0;} to{stroke-dashoffset:10;}} @-webkit-keyframes k{0%{opacity:0} 100%{opacity:1}} @font-face{font-family:x;src:url(https://x/f.woff)} @page{margin:0} @supports (display:grid){#mermaid-1 .a{fill:red}} @media (400px &lt; width){#mermaid-1 .a{fill:red}}</style>",
      ),
    );
    expect(clean).toContain("<style>@media (max-width: 600px){#mermaid-1 .a{fill:red;}}</style>");
    expect(clean).not.toMatch(/keyframes|body|display|font-face|https:|@page|@supports|margin|opacity|dashoffset|&lt;|400px/);
  });

  it("drops comments and processing instructions and unwraps CDATA (HTML re-parse safety)", () => {
    const clean = sanitizeSvg(
      `<?xml version="1.0"?><?xml-stylesheet href="https://x/a.css"?><svg ${NS} id="mermaid-1"><!--><script>alert(1)</script>--><style><![CDATA[#mermaid-1 .a{fill:#000}]]></style><?pi x?><text>t<!-- c --></text></svg>`,
    );
    expect(clean).not.toMatch(/<!--|<\?|CDATA|script|alert|https:/);
    expect(clean).toContain("#mermaid-1 .a{fill:#000;}");
    expect(clean).toContain("<text>t</text>");
  });

  it("keeps only the svg, xlink and xml namespace declarations", () => {
    const clean = sanitizeSvg(
      `<svg ${NS} xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xml:space="preserve" xml:lang="ar"><text xml:space="preserve">t</text></svg>`,
    );
    expect(clean).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(clean).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(clean).toContain('xml:space="preserve"');
    expect(clean).toContain('xml:lang="ar"');
    expect(clean).not.toMatch(/xhtml|xml-events|ev:/);
  });

  it("escapes text so markup inside labels cannot re-open as tags", () => {
    const clean = sanitizeSvg(wrap("<text>a &lt;script&gt;alert(1)&lt;/script&gt; b</text>"));
    expect(clean).toContain("&lt;script&gt;");
    expect(clean).not.toContain("<script>");
  });

  it('returns "" instead of throwing on absurd element nesting depth', () => {
    const deep = `<svg ${NS}>${"<g>".repeat(1_000)}<rect/>${"</g>".repeat(1_000)}</svg>`;
    expect(sanitizeSvg(deep)).toBe("");
    const ok = `<svg ${NS}>${"<g>".repeat(60)}<rect/>${"</g>".repeat(60)}</svg>`;
    expect(sanitizeSvg(ok)).toContain("<rect/>");
  });

  it("drops absurdly nested <style> blocks instead of throwing", () => {
    const deep = wrapId(`<style>${"@media screen{".repeat(200)}#mermaid-1 .a{fill:red}${"}".repeat(200)}</style>`);
    const clean = sanitizeSvg(deep);
    expect(clean).not.toContain("fill:red");
    expect(clean).toContain("<rect");
  });

  it("returns re-parseable, idempotent SVG for a Mermaid-shaped document", () => {
    const mermaid = `<svg id="mermaid-1" width="100%" viewBox="0 0 300 100" role="graphics-document document" aria-roledescription="flowchart-v2" class="flowchart" style="max-width: 300px; background-color: white;" ${NS}><style>#mermaid-1{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#333;}#mermaid-1 .node rect{fill:#ECECFF;stroke:#9370DB;}#mermaid-1 .edgePath .path{stroke:#333333;}#mermaid-1 :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}#mermaid-1 .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}</style><g><marker id="mermaid-1_flowchart-v2-pointEnd" class="marker flowchart-v2" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><g class="root"><g class="edgePaths"><path d="M62,50L100,50" id="L_A_B_0" class="edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link" style="" marker-end="url(#mermaid-1_flowchart-v2-pointEnd)"/></g><g class="nodes"><g class="node default" id="flowchart-A-0" transform="translate(35, 50)" data-id="A" data-node="true" data-et="node" data-look="classic"><rect class="basic label-container" style="" x="-27" y="-27" width="54" height="54"/><g class="label" style="" transform="translate(-19, -12)"><rect/><text><tspan x="0" dy="1em">A</tspan></text></g></g></g></g></g></svg>`;
    const clean = sanitizeSvg(mermaid);
    expect(clean.startsWith("<svg")).toBe(true);
    expect(clean).toContain('viewBox="0 0 300 100"');
    expect(clean).toContain('#mermaid-1{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#333;}');
    expect(clean).toContain("#mermaid-1 .node rect{fill:#ECECFF;stroke:#9370DB;}");
    expect(clean).toContain("#mermaid-1 .edgePath .path{stroke:#333333;}");
    expect(clean).toContain('#mermaid-1 :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}');
    // @keyframes names are document-global, so Mermaid's decorative edge animation is dropped (round 2).
    expect(clean).not.toMatch(/keyframes|edge-animation-frame/);
    expect(clean).toContain(
      "#mermaid-1 .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}",
    );
    expect(clean).toContain('style="stroke-width: 1;stroke-dasharray: 1, 0"');
    expect(clean).toContain('marker-end="url(#mermaid-1_flowchart-v2-pointEnd)"');
    expect(clean).toContain('markerUnits="userSpaceOnUse"');
    expect(clean).toContain('data-look="classic"');
    expect(clean).toContain('<tspan x="0" dy="1em">A</tspan>');
    const doc = reparse(clean);
    expect(doc.getElementsByTagName("parsererror").length).toBe(0);
    expect(doc.documentElement.localName).toBe("svg");
    expect(sanitizeSvg(clean)).toBe(clean);
  });

  it("output of a hostile document is still re-parseable and idempotent", () => {
    const hostile = `<svg ${NS} id="mermaid-1" onload="x()"><!--><script>x</script>--><style>@import url(https://x);#mermaid-1 .a{fill:url(#g)}body{x:url(https://x}</style><a href="javascript:x"><text>t</text></a><use xlink:href="#m" xlink:actuate="onLoad"/></svg>`;
    const clean = sanitizeSvg(hostile);
    expect(reparse(clean).getElementsByTagName("parsererror").length).toBe(0);
    expect(sanitizeSvg(clean)).toBe(clean);
    expect(clean).toContain("#mermaid-1 .a{fill:url(#g);}");
  });
});
