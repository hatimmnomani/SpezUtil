import { describe, expect, it } from "vitest";
import { placeBar, type Box } from "./placement";

const bar = { width: 300, height: 36 };
const table: Box = { left: 20, top: 200, width: 400, height: 150 };
const cell: Box = { left: 20, top: 200, width: 100, height: 40 };
const visible = { top: 0, bottom: 800 };

describe("placeBar", () => {
  it("prefers above the table, aligned to its start", () => {
    expect(placeBar(table, cell, bar, visible, 600, false)).toEqual({ left: 20, top: 156, placement: "above" });
  });

  it("aligns to the table's end edge in RTL", () => {
    const p = placeBar(table, cell, bar, visible, 600, true);
    expect(p.left).toBe(120);
  });

  it("falls below when there is no room above", () => {
    const p = placeBar({ ...table, top: 10 }, { ...cell, top: 10 }, bar, visible, 600, false);
    expect(p.placement).toBe("below");
    expect(p.top).toBe(168);
  });

  it("clamps horizontally inside the shell", () => {
    expect(placeBar({ ...table, left: 500 }, cell, bar, visible, 600, false).left).toBe(296);
    expect(placeBar({ ...table, left: -50 }, cell, bar, visible, 600, false).left).toBe(4);
  });

  it("never covers the active cell when pinned to a tall table's visible edge", () => {
    const tall: Box = { left: 20, top: -500, width: 400, height: 3000 };
    const active: Box = { left: 20, top: 10, width: 100, height: 40 };
    const p = placeBar(tall, active, bar, visible, 600, false);
    const box = { left: p.left, top: p.top, width: bar.width, height: bar.height };
    const overlap =
      box.left < active.left + active.width && box.left + box.width > active.left &&
      box.top < active.top + active.height && box.top + box.height > active.top;
    expect(overlap).toBe(false);
    expect(p.placement).toBe("beside-cell");
  });

  it("pins to the visible top when the active cell is elsewhere", () => {
    const tall: Box = { left: 20, top: -500, width: 400, height: 3000 };
    const active: Box = { left: 20, top: 500, width: 100, height: 40 };
    const p = placeBar(tall, active, bar, visible, 600, false);
    expect(p.top).toBe(4);
  });
});
