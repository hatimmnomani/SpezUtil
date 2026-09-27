import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toDisplay, toDisplayHtml, toUnicode } from "./codec";

interface CorpusCase { name: string; typed: string; unicode: string; display: string; html: string; confirmed: boolean }
interface Corpus { profile: string; allowDraft: boolean; cases: CorpusCase[] }

const dir = new URL("../profiles/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".corpus.json"));

describe("corpus files", () => {
  it("exist for every bundled profile", () => {
    expect(files.sort()).toEqual(["al-fatemi.corpus.json", "al-kanz.corpus.json", "kanz-al-marjaan.corpus.json"]);
  });
});

for (const file of files) {
  const corpus = JSON.parse(readFileSync(new URL(file, dir), "utf8")) as Corpus;
  const opts = { allowDraft: corpus.allowDraft, onWarning: () => {} };
  describe(`corpus ${corpus.profile}`, () => {
    it.each(corpus.cases.map((c) => [c.name, c] as const))("%s", (_n, c) => {
      expect(toUnicode(c.typed, corpus.profile, opts)).toBe(c.unicode);
      expect(toUnicode(c.unicode, corpus.profile, opts)).toBe(c.unicode);
      expect(toDisplay(c.unicode, corpus.profile, opts).map((s) => s.text).join("")).toBe(c.display);
      expect(toDisplayHtml(c.unicode, corpus.profile, opts)).toBe(c.html);
    });
  });
}
