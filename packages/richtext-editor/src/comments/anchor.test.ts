import { beforeEach, describe, expect, it } from "vitest";
import { $createLineBreakNode, $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import { $createAnchorHeadingNode } from "../nodes/heading-node";
import { $createCommentMarkNode } from "../nodes/comment-mark-node";
import { $createLudTextNode } from "../nodes/lud-text-node";
import { $createHijriDateNode } from "../nodes/hijri-date-node";
import { makeEditor } from "../test-utils";
import { $buildAnchorIndex, $commentAnchor, isQuoteAcceptable } from "./anchor";

const M = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";

beforeEach(() => {
  document.body.innerHTML = "";
});

function seed(build: () => void) {
  const { editor } = makeEditor();
  editor.update(() => {
    $getRoot().clear();
    build();
  }, { discrete: true });
  return editor;
}

describe("anchor index (mirrors backend LexicalText.Plain)", () => {
  it("joins blocks with newlines, like CommentReanchorerTests.Plain_text_joins_blocks_with_newlines", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode("Hello "), $createTextNode("world").toggleFormat("bold")),
        $createParagraphNode().append($createTextNode("Second")),
      );
    });
    expect(editor.read(() => $buildAnchorIndex().plain)).toBe("Hello world\nSecond\n");
  });

  it("counts lud-text and linebreaks, skips hijri-date tokens, ends headings with \\n", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createAnchorHeadingNode("h2").append($createTextNode("Title")),
        $createParagraphNode().append(
          $createLudTextNode("نسس", "al-kanz"),
          $createLineBreakNode(),
          $createHijriDateNode({ year: 1447, month: 1, day: 1 }, "D MMMM YYYY"),
          $createTextNode("end"),
        ),
      );
    });
    expect(editor.read(() => $buildAnchorIndex().plain)).toBe("Title\nنسس\nend\n");
  });

  it("returns quote with exactly 32 chars of context each side", () => {
    const before = "a".repeat(40);
    const after = "b".repeat(40);
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode(before),
          $createCommentMarkNode([M]).append($createTextNode("QUOTE")),
          $createTextNode(after),
        ),
      );
    });
    expect(editor.read(() => $commentAnchor(M))).toEqual({
      markId: M,
      quotedText: "QUOTE",
      prefix: "a".repeat(32),
      suffix: "b".repeat(32),
    });
  });

  it("returns fewer context chars at page edges (suffix includes the block newline)", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append($createCommentMarkNode([M]).append($createTextNode("Only"))),
      );
    });
    expect(editor.read(() => $commentAnchor(M))).toEqual({ markId: M, quotedText: "Only", prefix: "", suffix: "\n" });
  });

  it("spans every occurrence of an id split across blocks", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode("x "), $createCommentMarkNode([M]).append($createTextNode("one"))),
        $createParagraphNode().append($createCommentMarkNode([M]).append($createTextNode("two")), $createTextNode(" y")),
      );
    });
    expect(editor.read(() => $commentAnchor(M)!.quotedText)).toBe("one\ntwo");
  });

  it("is null for an unknown id", () => {
    const editor = seed(() => $getRoot().append($createParagraphNode()));
    expect(editor.read(() => $commentAnchor(M))).toBeNull();
  });

  it("accepts 1..1000 trimmed chars", () => {
    expect(isQuoteAcceptable("  ")).toBe(false);
    expect(isQuoteAcceptable("x")).toBe(true);
    expect(isQuoteAcceptable("x".repeat(1000))).toBe(true);
    expect(isQuoteAcceptable("x".repeat(1001))).toBe(false);
  });
});
