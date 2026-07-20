import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zonedNowMinutes, zonedTodayUtc } from "./zone";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("zonedTodayUtc", () => {
  it("defaults to the viewer's local calendar day", () => {
    vi.setSystemTime(new Date(2026, 6, 20, 23, 30)); // local wall-clock, whatever the machine's zone is
    const today = zonedTodayUtc();
    expect(today.getUTCFullYear()).toBe(2026);
    expect(today.getUTCMonth()).toBe(6);
    expect(today.getUTCDate()).toBe(20);
  });

  it("resolves an explicit IANA zone that has already crossed local midnight backward relative to UTC", () => {
    // 00:30 UTC on 20 July — in UTC-11 (Pago Pago) that's still 13:30 on 19 July.
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 0, 30)));
    const today = zonedTodayUtc("Pacific/Pago_Pago");
    expect(today.getUTCFullYear()).toBe(2026);
    expect(today.getUTCMonth()).toBe(6);
    expect(today.getUTCDate()).toBe(19);
  });

  it("resolves an explicit IANA zone that has already crossed local midnight forward relative to UTC", () => {
    // 23:30 UTC on 20 July — in UTC+14 (Kiritimati) that's 13:30 on 21 July.
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 23, 30)));
    const today = zonedTodayUtc("Pacific/Kiritimati");
    expect(today.getUTCFullYear()).toBe(2026);
    expect(today.getUTCMonth()).toBe(6);
    expect(today.getUTCDate()).toBe(21);
  });
});

describe("zonedNowMinutes", () => {
  it("defaults to minutes since local midnight", () => {
    vi.setSystemTime(new Date(2026, 6, 20, 13, 45));
    expect(zonedNowMinutes()).toBe(13 * 60 + 45);
  });

  it("computes minutes since midnight in an explicit IANA zone", () => {
    // 00:30 UTC — in UTC-11 (Pago Pago) that's 13:30 the previous day.
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 0, 30)));
    expect(zonedNowMinutes("Pacific/Pago_Pago")).toBe(13 * 60 + 30);
  });
});
