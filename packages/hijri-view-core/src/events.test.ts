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

  describe("durationMinutes", () => {
    it("derives end from durationMinutes when end is absent", () => {
      const n = normalizeEvent(ev({ start: "2026-07-06T10:00", durationMinutes: 90 }));
      expect(n.allDay).toBe(false);
      expect(n.startMs).toBe(Date.UTC(2026, 6, 6, 10, 0));
      expect(n.endMs).toBe(Date.UTC(2026, 6, 6, 11, 30));
    });

    it("matches the endMs of an equivalent explicit end", () => {
      const withDuration = normalizeEvent(ev({ start: "2026-07-06T10:00", durationMinutes: 90 }));
      const withEnd = normalizeEvent(
        ev({ start: "2026-07-06T10:00", end: "2026-07-06T11:30" })
      );
      expect(withDuration.endMs).toBe(withEnd.endMs);
      expect(withDuration.startMs).toBe(withEnd.startMs);
    });

    it("prefers an explicit end over durationMinutes when both are present", () => {
      const n = normalizeEvent(
        ev({ start: "2026-07-06T10:00", end: "2026-07-06T10:20", durationMinutes: 90 })
      );
      expect(n.endMs).toBe(Date.UTC(2026, 6, 6, 10, 20));
    });

    it("ignores a zero durationMinutes and falls back to the 1h default", () => {
      const n = normalizeEvent(ev({ start: "2026-07-06T10:00", durationMinutes: 0 }));
      expect(n.endMs).toBe(Date.UTC(2026, 6, 6, 11, 0));
    });

    it("ignores a negative durationMinutes and falls back to the 1h default", () => {
      const n = normalizeEvent(ev({ start: "2026-07-06T10:00", durationMinutes: -30 }));
      expect(n.endMs).toBe(Date.UTC(2026, 6, 6, 11, 0));
    });

    it("ignores durationMinutes on an all-day event", () => {
      const n = normalizeEvent(ev({ start: "2026-07-06", durationMinutes: 90 }));
      expect(n.allDay).toBe(true);
      expect(n.endMs).toBe(Date.UTC(2026, 6, 7));
    });

    it("falls back to the 1h default (not durationMinutes) when end is present but invalid", () => {
      // Pinning the current, intentional behaviour: "explicit end wins" is read literally as
      // "end is present", not "end is present and valid" — an inverted/invalid end does not
      // fall through to durationMinutes, it falls through to the same +1h default as no end at
      // all. See the fix-report note for the reasoning.
      const n = normalizeEvent(
        ev({ start: "2026-07-06T10:00", end: "2026-07-06T09:00", durationMinutes: 90 })
      );
      expect(n.endMs).toBe(Date.UTC(2026, 6, 6, 11, 0));
    });
  });

  describe("variant sanitising", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("keeps a variant made only of lowercase letters, digits and hyphens", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const n = normalizeEvent(ev({ start: "2026-07-06T09:00", variant: "draft-v2" }));
      expect(n.event.variant).toBe("draft-v2");
      expect(warn).not.toHaveBeenCalled();
    });

    it("drops a variant containing disallowed characters and warns once", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const n = normalizeEvent(ev({ id: "bad-1", start: "2026-07-06T09:00", variant: "<img>" }));
      expect(n.event.variant).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain("bad-1");
      expect(warn.mock.calls[0]![0]).toContain("<img>");
    });

    it("drops an empty-string variant", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const n = normalizeEvent(ev({ start: "2026-07-06T09:00", variant: "" }));
      expect(n.event.variant).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it("drops an uppercase variant and does not mutate the original event object", () => {
      const original = ev({ id: "bad-2", start: "2026-07-06T09:00", variant: "Not Ok" });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const n = normalizeEvent(original);
      expect(n.event.variant).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(original.variant).toBe("Not Ok");
    });

    it("drops a variant with disallowed whitespace/punctuation and dedupes repeated warnings", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const n1 = normalizeEvent(ev({ id: "bad-3", start: "2026-07-06T09:00", variant: "Bad!" }));
      const n2 = normalizeEvent(ev({ id: "bad-3", start: "2026-07-06T09:00", variant: "Bad!" }));
      expect(n1.event.variant).toBeUndefined();
      expect(n2.event.variant).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it("leaves an absent variant untouched", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const n = normalizeEvent(ev({ start: "2026-07-06T09:00" }));
      expect(n.event.variant).toBeUndefined();
      expect(warn).not.toHaveBeenCalled();
    });
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

  it("copies the new P3 fields (durationMinutes, subtitle, tag, style, variant) by name", () => {
    const raw = {
      id: "e1",
      title: "Check",
      start: "2026-07-06T09:30",
      durationMinutes: 45,
      subtitle: "Room 4B",
      tag: "meeting",
      style: "outline",
      variant: "draft",
    };
    const mapped = mapEventFields(raw, {});
    expect(mapped).toMatchObject({
      durationMinutes: 45,
      subtitle: "Room 4B",
      tag: "meeting",
      style: "outline",
      variant: "draft",
    });
  });

  describe("function-valued fields", () => {
    it("calls a mapped function with the raw object and uses its return value", () => {
      const TONES: Record<string, string> = { holiday: "#2F6E54", meeting: "#B47A18" };
      const raw = { id: "e1", title: "Check", start: "2026-07-06T09:30", event_type: "holiday" };
      const mapped = mapEventFields(raw, {
        color: (r) => TONES[r.event_type as string] ?? "#000",
      });
      expect(mapped.color).toBe("#2F6E54");
    });

    it("passes the raw object, not a partially-mapped one, to the function", () => {
      const raw = { id: "e1", title: "Check", start: "2026-07-06T09:30", event_type: "meeting" };
      let seen: Record<string, unknown> | undefined;
      mapEventFields(raw, {
        color: (r) => {
          seen = r;
          return "#000";
        },
      });
      expect(seen).toBe(raw);
    });

    it("mixes string and function mappings in the same call", () => {
      const raw = { eventId: "e1", title: "Check", start: "2026-07-06T09:30", event_type: "vip" };
      const mapped = mapEventFields(raw, {
        id: "eventId",
        variant: (r) => `type-${r.event_type}`,
      });
      expect(mapped.id).toBe("e1");
      expect(mapped.variant).toBe("type-vip");
    });

    it("propagates an exception thrown by a mapping function", () => {
      const raw = { id: "e1", title: "Check", start: "2026-07-06T09:30" };
      expect(() =>
        mapEventFields(raw, {
          color: () => {
            throw new Error("boom");
          },
        })
      ).toThrow("boom");
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
