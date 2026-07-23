import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeEvent, eventsInRange, mapEventFields } from "./events";
import type { CalendarEvent } from "./types";

const ev = (partial: Partial<CalendarEvent> & Pick<CalendarEvent, "start">): CalendarEvent => ({
  id: "e1",
  title: "Meeting",
  ...partial,
});

describe("normalizeEvent", () => {
  it("treats a date-only start as all-day spanning one day", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06" }));
    expect(n.allDay).toBe(true);
    expect(n.startMs).toBe(Date.UTC(2026, 6, 6));
    expect(n.endMs).toBe(Date.UTC(2026, 6, 7));
  });

  it("treats a datetime start as timed with 1h default duration", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06T09:30" }));
    expect(n.allDay).toBe(false);
    expect(n.startMs).toBe(Date.UTC(2026, 6, 6, 9, 30));
    expect(n.endMs).toBe(Date.UTC(2026, 6, 6, 10, 30));
  });

  it("uses explicit end for timed events (exclusive)", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06T09:00", end: "2026-07-06T11:15" }));
    expect(n.endMs).toBe(Date.UTC(2026, 6, 6, 11, 15));
  });

  it("treats all-day end date as inclusive", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06", end: "2026-07-08" }));
    expect(n.allDay).toBe(true);
    expect(n.endMs).toBe(Date.UTC(2026, 6, 9));
  });

  it("respects explicit allDay flag on a datetime start", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06T09:00", allDay: true }));
    expect(n.allDay).toBe(true);
    expect(n.startMs).toBe(Date.UTC(2026, 6, 6));
    expect(n.endMs).toBe(Date.UTC(2026, 6, 7));
  });

  it("clamps an inverted end to the start", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06T09:00", end: "2026-07-06T08:00" }));
    expect(n.endMs).toBeGreaterThan(n.startMs);
  });

  it("parses a start with an explicit Z suffix as that exact UTC instant", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06T09:00Z" }));
    expect(n.startMs).toBe(Date.UTC(2026, 6, 6, 9, 0));
  });

  it("parses a start with an explicit offset as that exact instant, not bare wall-clock UTC", () => {
    const n = normalizeEvent(ev({ start: "2026-07-06T23:30+05:30" }));
    // 23:30 in UTC+05:30 is 18:00 UTC — a naive Date.UTC(y,m,d,23,30) reinterpretation would be wrong.
    expect(n.startMs).toBe(Date.UTC(2026, 6, 6, 18, 0));
  });

  describe("unparseable start", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("warns once instead of throwing when start is missing or unparseable", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const n = normalizeEvent(ev({ id: "missing-1", start: undefined as unknown as string }));
      expect(Number.isNaN(n.startMs)).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain("missing-1");
      expect(warn.mock.calls[0]![0]).toContain("eventFields");
    });

    it("dedupes repeated warnings for the same event id + value", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      normalizeEvent(ev({ id: "missing-2", start: undefined as unknown as string }));
      normalizeEvent(ev({ id: "missing-2", start: undefined as unknown as string }));
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});

describe("mapEventFields", () => {
  it("renames configured fields and defaults unmapped keys to the same name", () => {
    const raw = { id: "e1", title: "Check", start_at: "2026-07-06T09:30", color: "#0b7d3e" };
    const mapped = mapEventFields(raw, { start: "start_at" });
    expect(mapped).toMatchObject({
      id: "e1",
      title: "Check",
      start: "2026-07-06T09:30",
      color: "#0b7d3e",
    });
  });

  it("attaches the original raw object as data", () => {
    const raw = { id: "e1", title: "Check", start_at: "2026-07-06T09:30", attendees: [{ id: "a" }] };
    const mapped = mapEventFields(raw, { start: "start_at" });
    expect(mapped.data).toBe(raw);
  });

  it("renames every configured field, not just start", () => {
    const raw = {
      eventId: "e1",
      name: "Check",
      begins: "2026-07-06T09:30",
      ends: "2026-07-06T10:00",
      full_day: true,
      hue: "#0b7d3e",
    };
    const mapped = mapEventFields(raw, {
      id: "eventId",
      title: "name",
      start: "begins",
      end: "ends",
      allDay: "full_day",
      color: "hue",
    });
    expect(mapped).toMatchObject({
      id: "e1",
      title: "Check",
      start: "2026-07-06T09:30",
      end: "2026-07-06T10:00",
      allDay: true,
      color: "#0b7d3e",
    });
  });
});

describe("eventsInRange", () => {
  const events = [
    normalizeEvent(ev({ id: "a", start: "2026-07-01T10:00" })),
    normalizeEvent(ev({ id: "b", start: "2026-07-05", end: "2026-07-10" })),
    normalizeEvent(ev({ id: "c", start: "2026-07-20T08:00" })),
  ];

  it("returns events overlapping the window", () => {
    const hit = eventsInRange(events, Date.UTC(2026, 6, 4), Date.UTC(2026, 6, 6));
    expect(hit.map((n) => n.event.id)).toEqual(["b"]);
  });

  it("excludes events touching only the window edges", () => {
    const hit = eventsInRange(events, Date.UTC(2026, 6, 1, 11), Date.UTC(2026, 6, 5));
    expect(hit).toEqual([]);
  });
});
