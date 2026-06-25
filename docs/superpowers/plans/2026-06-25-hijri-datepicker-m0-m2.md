# Hijri Datepicker M0–M2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Digital Takeoff monorepo, build the zero-dependency `hijri-core` calendar engine (TDD), and ship a single-date `<hijri-datepicker>` Web Component with a Storybook playground.

**Architecture:** pnpm + Turborepo monorepo. `hijri-core` is a pure-logic, zero-dep package doing tabular Gregorian↔Hijri (Fatimid/Bohra variant) conversion with a pluggable correction layer. `hijri-datepicker` is a zero-runtime-dep Web Component that imports `hijri-core` and renders a month grid (Hijri primary, Gregorian secondary). Storybook showcases it.

**Tech Stack:** TypeScript, pnpm workspaces, Turborepo, tsup (build), vitest + jsdom (test), Storybook (web-components-vite), Changesets (later milestone). Node 24 LTS.

**Scope:** M0 (skeleton), M1 (engine), M2 (single-date component + Storybook). Range/multi/time, React/Angular wrappers, Docusaurus, and the release pipeline are deferred to follow-on plans.

---

## File Structure

```
db-software-packages/
├── package.json                         # root, private, workspace scripts
├── pnpm-workspace.yaml                  # workspace globs
├── turbo.json                           # task pipeline
├── tsconfig.base.json                   # shared TS config
├── .npmrc                               # pnpm settings
├── packages/
│   ├── hijri-core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                 # public exports
│   │       ├── types.ts                 # HijriDate, CalendarOptions, etc.
│   │       ├── jd.ts                     # Julian Day <-> Gregorian/JS Date
│   │       ├── tabular.ts                # Fatimid tabular algorithm
│   │       ├── calendar.ts              # createCalendar + correction layer
│   │       ├── format.ts                # formatHijri / parseHijri
│   │       ├── locale.ts                # month/weekday names (ar + translit)
│   │       └── corrections.json         # hand-verified overrides (starts empty)
│   └── hijri-datepicker/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts                 # registers element, exports class
│           ├── hijri-datepicker.ts      # HijriDatepicker custom element
│           ├── render.ts                # pure grid-model builder
│           └── styles.ts                # CSS string (custom props + parts)
└── apps/
    └── storybook/
        ├── package.json
        ├── .storybook/main.ts
        ├── .storybook/preview.ts
        └── stories/hijri-datepicker.stories.ts
```

Each `src` file has one responsibility. `render.ts` holds **pure** grid-model logic (no DOM) so it is unit-testable without jsdom; `hijri-datepicker.ts` only does DOM wiring.

---

## Task 1: Monorepo skeleton

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.npmrc`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 2: Create `.npmrc`**

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "digitaltakeoff-monorepo",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install`
Expected: completes, creates `pnpm-lock.yaml`, no workspace errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: monorepo skeleton (pnpm + turborepo + tsconfig)"
```

---

## Task 2: `hijri-core` package scaffold

**Files:**
- Create: `packages/hijri-core/package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `src/index.ts`

- [ ] **Step 1: Create `packages/hijri-core/package.json`**

```json
{
  "name": "@digitaltakeoff/hijri-core",
  "version": "0.0.0",
  "description": "Zero-dependency Hijri (Fatimid/Bohra) calendar engine.",
  "license": "Apache-2.0",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/hijri-core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/hijri-core/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
});
```

- [ ] **Step 4: Create `packages/hijri-core/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 5: Create placeholder `packages/hijri-core/src/index.ts`**

```ts
export {};
```

- [ ] **Step 6: Install workspace deps**

Run: `pnpm install`
Expected: `@digitaltakeoff/hijri-core` linked into workspace.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(hijri-core): package scaffold"
```

---

## Task 3: Julian Day conversions (`jd.ts`)

**Files:**
- Create: `packages/hijri-core/src/jd.ts`, `packages/hijri-core/src/jd.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/jd.test.ts
import { describe, expect, it } from "vitest";
import { dateToJd, jdToDate, gregorianToJd, jdToGregorian } from "./jd";

describe("julian day", () => {
  it("converts a known Gregorian date to JD", () => {
    // 2000-01-01 00:00 UTC == JD 2451544.5
    expect(gregorianToJd(2000, 1, 1)).toBe(2451544.5);
  });

  it("round-trips JD <-> Gregorian", () => {
    const jd = gregorianToJd(1984, 6, 17);
    expect(jdToGregorian(jd)).toEqual({ year: 1984, month: 6, day: 17 });
  });

  it("round-trips a UTC Date <-> JD", () => {
    const d = new Date(Date.UTC(2010, 2, 15)); // 2010-03-15
    expect(jdToDate(dateToJd(d)).toISOString()).toBe("2010-03-15T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @digitaltakeoff/hijri-core test`
Expected: FAIL — cannot resolve `./jd`.

- [ ] **Step 3: Implement `jd.ts`**

```ts
// src/jd.ts
const GREGORIAN_EPOCH = 1721425.5;
const UNIX_JD = 2440587.5;

export function isGregorianLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function gregorianToJd(year: number, month: number, day: number): number {
  return (
    GREGORIAN_EPOCH -
    1 +
    365 * (year - 1) +
    Math.floor((year - 1) / 4) -
    Math.floor((year - 1) / 100) +
    Math.floor((year - 1) / 400) +
    Math.floor(
      (367 * month - 362) / 12 +
        (month <= 2 ? 0 : isGregorianLeap(year) ? -1 : -2) +
        day
    )
  );
}

export interface YMD {
  year: number;
  month: number;
  day: number;
}

export function jdToGregorian(jd: number): YMD {
  const wjd = Math.floor(jd - 0.5) + 0.5;
  const depoch = wjd - GREGORIAN_EPOCH;
  const quadricent = Math.floor(depoch / 146097);
  const dqc = mod(depoch, 146097);
  const cent = Math.floor(dqc / 36524);
  const dcent = mod(dqc, 36524);
  const quad = Math.floor(dcent / 1461);
  const dquad = mod(dcent, 1461);
  const yindex = Math.floor(dquad / 365);
  let year = quadricent * 400 + cent * 100 + quad * 4 + yindex;
  if (!(cent === 4 || yindex === 4)) year += 1;
  const yearday = wjd - gregorianToJd(year, 1, 1);
  const leapAdj =
    wjd < gregorianToJd(year, 3, 1) ? 0 : isGregorianLeap(year) ? 1 : 2;
  const month = Math.floor(((yearday + leapAdj) * 12 + 373) / 367);
  const day = wjd - gregorianToJd(year, month, 1) + 1;
  return { year, month, day };
}

export function dateToJd(date: Date): number {
  return date.getTime() / 86400000 + UNIX_JD;
}

export function jdToDate(jd: number): Date {
  return new Date(Math.round((jd - UNIX_JD) * 86400000));
}

function mod(a: number, b: number): number {
  return a - b * Math.floor(a / b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @digitaltakeoff/hijri-core test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(hijri-core): Julian Day conversions"
```

---

## Task 4: Types (`types.ts`)

**Files:**
- Create: `packages/hijri-core/src/types.ts`

- [ ] **Step 1: Create `types.ts` (no test — declarations only)**

```ts
// src/types.ts
export interface HijriDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

/** Maps a Gregorian ISO date (yyyy-mm-dd) to its corrected Hijri value. */
export type CorrectionMap = Record<string, HijriDate>;

export interface CalendarVariantConfig {
  /** JD of 1 Muharram, year 1, for this variant. */
  epochJd: number;
  /** Cycle positions (1-30) that are leap years. */
  leapYears: number[];
}

export interface CalendarOptions {
  variant?: "bohra";
  /** Overrides layered on top of the tabular result, keyed by Gregorian ISO date. */
  corrections?: CorrectionMap;
}

export interface HijriCalendar {
  gregorianToHijri(date: Date): HijriDate;
  hijriToGregorian(h: HijriDate): Date;
  isLeapYear(year: number): boolean;
  monthLength(year: number, month: number): number;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(hijri-core): core types"
```

---

## Task 5: Tabular Fatimid algorithm (`tabular.ts`)

**Files:**
- Create: `packages/hijri-core/src/tabular.ts`, `packages/hijri-core/src/tabular.test.ts`

The Dawoodi Bohra (Fatimid/Misri) calendar uses a 30-year cycle with leap years at cycle
positions **2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29**. Odd months have 30 days, even months 29,
and month 12 has 30 days in a leap year. These parameters live in `BOHRA_VARIANT` and are passed
into the pure functions so other variants can be added later.

- [ ] **Step 1: Write the failing test**

```ts
// src/tabular.test.ts
import { describe, expect, it } from "vitest";
import {
  BOHRA_VARIANT,
  isLeapYear,
  monthLength,
  hijriToJd,
  jdToHijri,
} from "./tabular";

describe("fatimid tabular", () => {
  it("identifies leap years in the cycle", () => {
    expect(isLeapYear(BOHRA_VARIANT, 2)).toBe(true);
    expect(isLeapYear(BOHRA_VARIANT, 8)).toBe(true);
    expect(isLeapYear(BOHRA_VARIANT, 1)).toBe(false);
    expect(isLeapYear(BOHRA_VARIANT, 30)).toBe(false);
  });

  it("computes month lengths", () => {
    expect(monthLength(BOHRA_VARIANT, 1, 1)).toBe(30); // odd month
    expect(monthLength(BOHRA_VARIANT, 1, 2)).toBe(29); // even month
    expect(monthLength(BOHRA_VARIANT, 2, 12)).toBe(30); // leap year, month 12
    expect(monthLength(BOHRA_VARIANT, 1, 12)).toBe(29); // non-leap, month 12
  });

  it("round-trips hijri <-> jd for many dates", () => {
    for (let y = 1400; y <= 1460; y++) {
      for (const m of [1, 6, 12]) {
        const h = { year: y, month: m, day: 15 };
        expect(jdToHijri(BOHRA_VARIANT, hijriToJd(BOHRA_VARIANT, h))).toEqual(h);
      }
    }
  });

  it("first day of year 1 is the epoch JD", () => {
    expect(hijriToJd(BOHRA_VARIANT, { year: 1, month: 1, day: 1 })).toBe(
      BOHRA_VARIANT.epochJd
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @digitaltakeoff/hijri-core test tabular`
Expected: FAIL — cannot resolve `./tabular`.

- [ ] **Step 3: Implement `tabular.ts`**

```ts
// src/tabular.ts
import type { CalendarVariantConfig, HijriDate } from "./types";

// Astronomical epoch: Thursday 15 July 622 CE (Julian) == JD 1948439.5.
// Validated/adjusted against anchor dates in Task 8.
export const BOHRA_VARIANT: CalendarVariantConfig = {
  epochJd: 1948439.5,
  leapYears: [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29],
};

export function isLeapYear(v: CalendarVariantConfig, year: number): boolean {
  const pos = mod(year - 1, 30) + 1;
  return v.leapYears.includes(pos);
}

export function monthLength(
  v: CalendarVariantConfig,
  year: number,
  month: number
): number {
  if (month === 12) return isLeapYear(v, year) ? 30 : 29;
  return month % 2 === 1 ? 30 : 29;
}

export function daysBeforeYear(v: CalendarVariantConfig, year: number): number {
  const y = year - 1;
  const fullCycles = Math.floor(y / 30);
  const remainder = mod(y, 30);
  let leapsInRemainder = 0;
  for (let pos = 1; pos <= remainder; pos++) {
    if (v.leapYears.includes(pos)) leapsInRemainder++;
  }
  const leaps = fullCycles * v.leapYears.length + leapsInRemainder;
  return y * 354 + leaps;
}

function daysBeforeMonth(
  v: CalendarVariantConfig,
  year: number,
  month: number
): number {
  let days = 0;
  for (let m = 1; m < month; m++) days += monthLength(v, year, m);
  return days;
}

export function hijriToJd(v: CalendarVariantConfig, h: HijriDate): number {
  return (
    v.epochJd + daysBeforeYear(v, h.year) + daysBeforeMonth(v, h.year, h.month) + (h.day - 1)
  );
}

export function jdToHijri(v: CalendarVariantConfig, jd: number): HijriDate {
  const dayCount = Math.floor(jd - v.epochJd);
  let year = Math.floor(dayCount / 354.3667) + 1;
  if (year < 1) year = 1;
  while (daysBeforeYear(v, year) > dayCount) year--;
  while (daysBeforeYear(v, year + 1) <= dayCount) year++;
  let remaining = dayCount - daysBeforeYear(v, year);
  let month = 1;
  while (month < 12 && remaining >= monthLength(v, year, month)) {
    remaining -= monthLength(v, year, month);
    month++;
  }
  return { year, month, day: remaining + 1 };
}

function mod(a: number, b: number): number {
  return a - b * Math.floor(a / b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @digitaltakeoff/hijri-core test tabular`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(hijri-core): Fatimid tabular algorithm"
```

---

## Task 6: Calendar + correction layer (`calendar.ts`)

**Files:**
- Create: `packages/hijri-core/src/corrections.json`, `packages/hijri-core/src/calendar.ts`, `packages/hijri-core/src/calendar.test.ts`

- [ ] **Step 1: Create empty `corrections.json`**

```json
{}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/calendar.test.ts
import { describe, expect, it } from "vitest";
import { createCalendar } from "./calendar";

describe("createCalendar", () => {
  it("round-trips gregorian <-> hijri", () => {
    const cal = createCalendar();
    const d = new Date(Date.UTC(2024, 0, 15));
    const h = cal.gregorianToHijri(d);
    expect(cal.hijriToGregorian(h).toISOString()).toBe(d.toISOString());
  });

  it("applies a correction override keyed by gregorian ISO date", () => {
    const cal = createCalendar({
      corrections: { "2024-01-15": { year: 1445, month: 7, day: 3 } },
    });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2024, 0, 15)));
    expect(h).toEqual({ year: 1445, month: 7, day: 3 });
  });

  it("exposes leap-year and month-length helpers", () => {
    const cal = createCalendar();
    expect(cal.isLeapYear(2)).toBe(true);
    expect(cal.monthLength(1, 1)).toBe(30);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @digitaltakeoff/hijri-core test calendar`
Expected: FAIL — cannot resolve `./calendar`.

- [ ] **Step 4: Implement `calendar.ts`**

```ts
// src/calendar.ts
import { dateToJd, jdToDate } from "./jd";
import {
  BOHRA_VARIANT,
  hijriToJd,
  isLeapYear,
  jdToHijri,
  monthLength,
} from "./tabular";
import defaultCorrections from "./corrections.json";
import type { CalendarOptions, CorrectionMap, HijriCalendar, HijriDate } from "./types";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function createCalendar(options: CalendarOptions = {}): HijriCalendar {
  const v = BOHRA_VARIANT;
  const corrections: CorrectionMap = {
    ...(defaultCorrections as CorrectionMap),
    ...(options.corrections ?? {}),
  };

  return {
    gregorianToHijri(date: Date): HijriDate {
      const override = corrections[toIsoDate(date)];
      if (override) return { ...override };
      const jd = dateToJd(new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      )));
      return jdToHijri(v, jd);
    },
    hijriToGregorian(h: HijriDate): Date {
      return jdToDate(hijriToJd(v, h));
    },
    isLeapYear(year: number): boolean {
      return isLeapYear(v, year);
    },
    monthLength(year: number, month: number): number {
      return monthLength(v, year, month);
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @digitaltakeoff/hijri-core test calendar`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(hijri-core): calendar factory with correction layer"
```

---

## Task 7: Locale + formatting (`locale.ts`, `format.ts`)

**Files:**
- Create: `packages/hijri-core/src/locale.ts`, `packages/hijri-core/src/format.ts`, `packages/hijri-core/src/format.test.ts`

- [ ] **Step 1: Create `locale.ts`**

```ts
// src/locale.ts
export const translitMonthNames: string[] = [
  "Moharram al-Haraam",
  "Safar al-Muzaffar",
  "Rabi al-Awwal",
  "Rabi al-Aakhar",
  "Jumada al-Ula",
  "Jumada al-Ukhra",
  "Rajab al-Asab",
  "Shaban al-Karim",
  "Ramadan al-Moazzam",
  "Shawwal al-Mukarram",
  "Zilqadah al-Haraam",
  "Zilhaj al-Haraam",
];

export const arMonthNames: string[] = [
  "محرم الحرام",
  "صفر المظفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الأخرى",
  "رجب الأصب",
  "شعبان الكريم",
  "رمضان المعظم",
  "شوال المكرم",
  "ذو القعدة الحرام",
  "ذو الحجة الحرام",
];

export const weekdayNames: string[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
```

- [ ] **Step 2: Write the failing test**

```ts
// src/format.test.ts
import { describe, expect, it } from "vitest";
import { formatHijri, parseHijri } from "./format";

describe("format", () => {
  it("formats with tokens", () => {
    const s = formatHijri({ year: 1445, month: 9, day: 3 }, "D MMMM YYYY");
    expect(s).toBe("3 Ramadan al-Moazzam 1445");
  });

  it("formats numeric pattern with zero padding", () => {
    expect(formatHijri({ year: 1445, month: 9, day: 3 }, "DD/MM/YYYY")).toBe(
      "03/09/1445"
    );
  });

  it("parses a numeric pattern", () => {
    expect(parseHijri("03/09/1445", "DD/MM/YYYY")).toEqual({
      year: 1445,
      month: 9,
      day: 3,
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @digitaltakeoff/hijri-core test format`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 4: Implement `format.ts`**

```ts
// src/format.ts
import { translitMonthNames } from "./locale";
import type { HijriDate } from "./types";

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

export function formatHijri(h: HijriDate, pattern: string): string {
  return pattern.replace(/YYYY|MMMM|MM|DD|M|D/g, (token) => {
    switch (token) {
      case "YYYY":
        return String(h.year);
      case "MMMM":
        return translitMonthNames[h.month - 1] ?? String(h.month);
      case "MM":
        return pad(h.month, 2);
      case "M":
        return String(h.month);
      case "DD":
        return pad(h.day, 2);
      case "D":
        return String(h.day);
      default:
        return token;
    }
  });
}

export function parseHijri(input: string, pattern: string): HijriDate {
  const tokens: string[] = [];
  const regexSrc = pattern.replace(/YYYY|MM|DD/g, (token) => {
    tokens.push(token);
    return token === "YYYY" ? "(\\d{1,4})" : "(\\d{1,2})";
  });
  const match = new RegExp("^" + regexSrc + "$").exec(input);
  if (!match) throw new Error(`Cannot parse "${input}" with pattern "${pattern}"`);
  const out: HijriDate = { year: 0, month: 1, day: 1 };
  tokens.forEach((token, i) => {
    const value = Number(match[i + 1]);
    if (token === "YYYY") out.year = value;
    else if (token === "MM") out.month = value;
    else if (token === "DD") out.day = value;
  });
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @digitaltakeoff/hijri-core test format`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(hijri-core): locale data and format/parse"
```

---

## Task 8: Anchor-date calibration + public exports

This task validates the engine against **authoritative anchor dates** and wires public exports.
The anchor pairs are gathered live from https://www.mumineencalendar.com/ during execution
(legitimate external-data step — do not invent values). For each anchor, read the Gregorian date
and the Hijri date it shows, then add the pair to the fixture. If the default `epochJd` does not
reproduce the anchors, adjust `BOHRA_VARIANT.epochJd` by the integer day offset that makes the
nearest anchor match; residual mismatches go into `corrections.json` keyed by Gregorian ISO date.

**Files:**
- Create: `packages/hijri-core/src/anchors.test.ts`
- Modify: `packages/hijri-core/src/tabular.ts` (epoch only, if needed), `packages/hijri-core/src/corrections.json` (if needed)
- Modify: `packages/hijri-core/src/index.ts`

- [ ] **Step 1: Gather anchors from the source**

Open https://www.mumineencalendar.com/. Record at least 6 Gregorian→Hijri pairs spread across
different months/years (include a known event date such as the start of Ramadan, and at least one
month boundary). Note each as `{ greg: "YYYY-MM-DD", hijri: { year, month, day } }`.

- [ ] **Step 2: Write the anchor test using the gathered pairs**

```ts
// src/anchors.test.ts
import { describe, expect, it } from "vitest";
import { createCalendar } from "./calendar";

// Pairs verified from https://www.mumineencalendar.com/ (filled in Step 1).
const ANCHORS: { greg: string; hijri: { year: number; month: number; day: number } }[] = [
  // e.g. { greg: "2024-03-11", hijri: { year: 1445, month: 9, day: 1 } },
];

describe("anchor calibration", () => {
  const cal = createCalendar();
  it("has anchors to test", () => {
    expect(ANCHORS.length).toBeGreaterThanOrEqual(6);
  });
  for (const a of ANCHORS) {
    it(`maps ${a.greg} correctly`, () => {
      const [y, m, d] = a.greg.split("-").map(Number);
      const got = cal.gregorianToHijri(new Date(Date.UTC(y, m - 1, d)));
      expect(got).toEqual(a.hijri);
    });
  }
});
```

- [ ] **Step 3: Run, then calibrate**

Run: `pnpm --filter @digitaltakeoff/hijri-core test anchors`
If anchors fail by a constant integer day offset, adjust `BOHRA_VARIANT.epochJd` in `tabular.ts`
by that offset and re-run. For any anchor still off after epoch alignment, add an entry to
`corrections.json` (key = Gregorian ISO date, value = the Hijri object from the source).
Repeat until all anchor tests PASS.

- [ ] **Step 4: Write the public exports in `index.ts`**

```ts
// src/index.ts
export { createCalendar } from "./calendar";
export {
  BOHRA_VARIANT,
  isLeapYear,
  monthLength,
  hijriToJd,
  jdToHijri,
} from "./tabular";
export { formatHijri, parseHijri } from "./format";
export { arMonthNames, translitMonthNames, weekdayNames } from "./locale";
export {
  dateToJd,
  jdToDate,
  gregorianToJd,
  jdToGregorian,
} from "./jd";
export type {
  HijriDate,
  HijriCalendar,
  CalendarOptions,
  CalendarVariantConfig,
  CorrectionMap,
} from "./types";
```

- [ ] **Step 5: Build and run full test suite**

Run: `pnpm --filter @digitaltakeoff/hijri-core build && pnpm --filter @digitaltakeoff/hijri-core test`
Expected: build emits `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(hijri-core): anchor calibration and public API"
```

---

## Task 9: `hijri-datepicker` package scaffold

**Files:**
- Create: `packages/hijri-datepicker/package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `src/index.ts`

- [ ] **Step 1: Create `packages/hijri-datepicker/package.json`**

```json
{
  "name": "@digitaltakeoff/hijri-datepicker",
  "version": "0.0.0",
  "description": "Zero-dependency Hijri date picker Web Component.",
  "license": "Apache-2.0",
  "type": "module",
  "sideEffects": ["**/*.css", "./dist/index.js"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@digitaltakeoff/hijri-core": "workspace:*"
  },
  "devDependencies": {
    "jsdom": "^25.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

> Note: `sideEffects` lists the entry because the package registers a custom element on import.
> Tree-shaking still works for `hijri-core`; consumers wanting the class without auto-registration
> import from the class export (provided in Task 10).

- [ ] **Step 2: Create `packages/hijri-datepicker/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/hijri-datepicker/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
});
```

- [ ] **Step 4: Create `packages/hijri-datepicker/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 5: Create placeholder `src/index.ts`**

```ts
export {};
```

- [ ] **Step 6: Install + commit**

Run: `pnpm install`
```bash
git add -A
git commit -m "chore(hijri-datepicker): package scaffold"
```

---

## Task 10: Pure grid-model builder (`render.ts`)

The grid model is pure data (no DOM) describing the weeks/cells for a given Hijri month, so it is
unit-testable in plain Node-style tests under jsdom.

**Files:**
- Create: `packages/hijri-datepicker/src/render.ts`, `packages/hijri-datepicker/src/render.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/render.test.ts
import { describe, expect, it } from "vitest";
import { createCalendar } from "@digitaltakeoff/hijri-core";
import { buildMonthModel } from "./render";

describe("buildMonthModel", () => {
  const cal = createCalendar();

  it("returns 6 weeks of 7 cells", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {});
    expect(model.weeks.length).toBe(6);
    for (const week of model.weeks) expect(week.length).toBe(7);
  });

  it("flags cells inside vs outside the target month", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {});
    const inMonth = model.weeks.flat().filter((c) => c.inCurrentMonth);
    expect(inMonth.length).toBe(cal.monthLength(1445, 9));
    expect(inMonth[0].hijri.day).toBe(1);
  });

  it("marks selected and disabled cells", () => {
    const selected = { year: 1445, month: 9, day: 5 };
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      selected,
      isDisabled: (h) => h.day === 7,
    });
    const cells = model.weeks.flat();
    expect(cells.some((c) => c.selected && c.hijri.day === 5)).toBe(true);
    expect(cells.some((c) => c.disabled && c.hijri.day === 7 && c.inCurrentMonth)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @digitaltakeoff/hijri-datepicker test render`
Expected: FAIL — cannot resolve `./render`.

- [ ] **Step 3: Implement `render.ts`**

```ts
// src/render.ts
import type { HijriCalendar, HijriDate } from "@digitaltakeoff/hijri-core";

export interface DayCell {
  hijri: HijriDate;
  gregorian: Date;
  inCurrentMonth: boolean;
  selected: boolean;
  disabled: boolean;
  isToday: boolean;
}

export interface MonthModel {
  year: number;
  month: number;
  weeks: DayCell[][];
}

export interface BuildOptions {
  selected?: HijriDate | null;
  isDisabled?: (h: HijriDate, g: Date) => boolean;
  today?: Date;
}

function sameHijri(a: HijriDate, b: HijriDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function buildMonthModel(
  cal: HijriCalendar,
  view: { year: number; month: number },
  opts: BuildOptions
): MonthModel {
  const firstGreg = cal.hijriToGregorian({ year: view.year, month: view.month, day: 1 });
  // Week starts Sunday (getUTCDay: 0=Sun). Back up to the first Sunday on/before day 1.
  const startOffset = firstGreg.getUTCDay();
  const gridStart = addDaysUtc(firstGreg, -startOffset);
  const todayHijri = opts.today ? cal.gregorianToHijri(opts.today) : null;

  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const g = addDaysUtc(gridStart, w * 7 + d);
      const hijri = cal.gregorianToHijri(g);
      week.push({
        hijri,
        gregorian: g,
        inCurrentMonth: hijri.year === view.year && hijri.month === view.month,
        selected: opts.selected ? sameHijri(hijri, opts.selected) : false,
        disabled: opts.isDisabled ? opts.isDisabled(hijri, g) : false,
        isToday: todayHijri ? sameHijri(hijri, todayHijri) : false,
      });
    }
    weeks.push(week);
  }
  return { year: view.year, month: view.month, weeks };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @digitaltakeoff/hijri-datepicker test render`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(hijri-datepicker): pure month-grid model builder"
```

---

## Task 11: Styles (`styles.ts`)

**Files:**
- Create: `packages/hijri-datepicker/src/styles.ts`

- [ ] **Step 1: Create `styles.ts` (CSS string for the shadow root)**

```ts
// src/styles.ts
export const styles = `
:host {
  --dtp-bg: #fff;
  --dtp-fg: #1a1a1a;
  --dtp-muted: #9aa0a6;
  --dtp-accent: #0b7d3e;
  --dtp-accent-fg: #fff;
  --dtp-radius: 8px;
  display: inline-block;
  font-family: system-ui, sans-serif;
  color: var(--dtp-fg);
}
.cal { background: var(--dtp-bg); border: 1px solid #e0e0e0; border-radius: var(--dtp-radius); padding: 8px; width: 280px; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.header button { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 6px; color: var(--dtp-fg); }
.header button:hover { background: #f0f0f0; }
.title { font-weight: 600; text-align: center; }
.title small { display: block; font-weight: 400; color: var(--dtp-muted); font-size: 11px; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dow { text-align: center; font-size: 11px; color: var(--dtp-muted); padding: 4px 0; }
.cell { aspect-ratio: 1; border: none; background: none; cursor: pointer; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; color: var(--dtp-fg); }
.cell:hover:not([disabled]) { background: #f0f0f0; }
.cell .greg { font-size: 9px; color: var(--dtp-muted); }
.cell.out { color: var(--dtp-muted); opacity: 0.5; }
.cell.today { outline: 1px solid var(--dtp-accent); }
.cell[aria-selected="true"] { background: var(--dtp-accent); color: var(--dtp-accent-fg); }
.cell[aria-selected="true"] .greg { color: var(--dtp-accent-fg); }
.cell[disabled] { cursor: not-allowed; opacity: 0.3; }
:host([dir="rtl"]) .cal { direction: rtl; }
`;
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(hijri-datepicker): component styles"
```

---

## Task 12: The Web Component — render + selection (`hijri-datepicker.ts`)

**Files:**
- Create: `packages/hijri-datepicker/src/hijri-datepicker.ts`, `packages/hijri-datepicker/src/hijri-datepicker.test.ts`
- Modify: `packages/hijri-datepicker/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/hijri-datepicker.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import "./index";
import type { HijriDatepicker } from "./hijri-datepicker";

function mount(attrs: Record<string, string> = {}): HijriDatepicker {
  const el = document.createElement("hijri-datepicker") as HijriDatepicker;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe("<hijri-datepicker>", () => {
  beforeAll(() => {
    expect(customElements.get("hijri-datepicker")).toBeTruthy();
  });

  it("renders a grid of day cells in its shadow root", () => {
    const el = mount({ value: "2024-03-15" });
    const cells = el.shadowRoot!.querySelectorAll(".cell");
    expect(cells.length).toBe(42);
  });

  it("emits a change event with hijri + gregorian detail on click", () => {
    const el = mount({ value: "2024-03-15" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const inMonth = el.shadowRoot!.querySelector(
      '.cell:not(.out):not([disabled])'
    ) as HTMLButtonElement;
    inMonth.click();
    expect(detail).toBeTruthy();
    expect(detail.hijri).toMatchObject({ year: expect.any(Number) });
    expect(typeof detail.gregorian).toBe("string");
  });

  it("respects min/max by disabling out-of-range cells", () => {
    const el = mount({ value: "2024-03-15", min: "2024-03-10", max: "2024-03-20" });
    const disabled = el.shadowRoot!.querySelectorAll(".cell[disabled]");
    expect(disabled.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @digitaltakeoff/hijri-datepicker test hijri-datepicker`
Expected: FAIL — element not defined.

- [ ] **Step 3: Implement `hijri-datepicker.ts`**

```ts
// src/hijri-datepicker.ts
import {
  createCalendar,
  formatHijri,
  translitMonthNames,
  weekdayNames,
  type HijriCalendar,
  type HijriDate,
} from "@digitaltakeoff/hijri-core";
import { buildMonthModel, type DayCell } from "./render";
import { styles } from "./styles";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoUtc(s: string | null): Date | null {
  if (!s || !ISO.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class HijriDatepicker extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["value", "min", "max", "dir", "disabled-weekdays"];
  }

  private cal: HijriCalendar = createCalendar();
  private root: ShadowRoot;
  private view: { year: number; month: number };
  private selected: HijriDate | null = null;

  /** Optional custom predicate; cells for which it returns true are disabled. */
  public isDateDisabled?: (hijri: HijriDate, gregorian: Date) => boolean;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    const todayHijri = this.cal.gregorianToHijri(new Date());
    this.view = { year: todayHijri.year, month: todayHijri.month };
  }

  connectedCallback(): void {
    this.syncFromValue();
    this.render();
  }

  attributeChangedCallback(): void {
    if (!this.root) return;
    this.syncFromValue();
    this.render();
  }

  private syncFromValue(): void {
    const v = parseIsoUtc(this.getAttribute("value"));
    if (v) {
      this.selected = this.cal.gregorianToHijri(v);
      this.view = { year: this.selected.year, month: this.selected.month };
    } else {
      this.selected = null;
    }
  }

  private buildDisabledFn(): (h: HijriDate, g: Date) => boolean {
    const min = parseIsoUtc(this.getAttribute("min"));
    const max = parseIsoUtc(this.getAttribute("max"));
    const dowAttr = this.getAttribute("disabled-weekdays");
    const disabledDows = dowAttr
      ? dowAttr.split(",").map((n) => Number(n.trim()))
      : [];
    return (h, g) => {
      if (min && g.getTime() < min.getTime()) return true;
      if (max && g.getTime() > max.getTime()) return true;
      if (disabledDows.includes(g.getUTCDay())) return true;
      if (this.isDateDisabled && this.isDateDisabled(h, g)) return true;
      return false;
    };
  }

  private navigate(delta: number): void {
    let { year, month } = this.view;
    month += delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    this.view = { year, month };
    this.render();
  }

  private select(cell: DayCell): void {
    if (cell.disabled) return;
    this.selected = cell.hijri;
    this.setAttribute("value", toIso(cell.gregorian));
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { hijri: cell.hijri, gregorian: toIso(cell.gregorian) },
      })
    );
    this.render();
  }

  private render(): void {
    const model = buildMonthModel(this.cal, this.view, {
      selected: this.selected,
      isDisabled: this.buildDisabledFn(),
      today: new Date(),
    });

    const headerGreg = this.cal.hijriToGregorian({
      year: this.view.year,
      month: this.view.month,
      day: 1,
    });
    const title = `${translitMonthNames[this.view.month - 1]} ${this.view.year}`;
    const subtitle = headerGreg.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    this.root.innerHTML = `<style>${styles}</style>
      <div class="cal" role="application" aria-label="Hijri date picker">
        <div class="header">
          <button type="button" part="nav-prev" aria-label="Previous month" data-nav="-1">‹</button>
          <div class="title">${title}<small>${subtitle}</small></div>
          <button type="button" part="nav-next" aria-label="Next month" data-nav="1">›</button>
        </div>
        <div class="grid" role="grid">
          ${weekdayNames.map((d) => `<div class="dow" role="columnheader">${d.slice(0, 2)}</div>`).join("")}
          ${model.weeks
            .flat()
            .map((cell, i) => {
              const cls = [
                "cell",
                cell.inCurrentMonth ? "" : "out",
                cell.isToday ? "today" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const label = `${formatHijri(cell.hijri, "D MMMM YYYY")} (${toIso(cell.gregorian)})`;
              return `<button type="button" part="day" class="${cls}" role="gridcell"
                data-i="${i}" aria-selected="${cell.selected}" aria-label="${label}"
                ${cell.disabled ? "disabled" : ""}>
                <span class="hijri">${cell.hijri.day}</span>
                <span class="greg">${cell.gregorian.getUTCDate()}</span>
              </button>`;
            })
            .join("")}
        </div>
      </div>`;

    const flat = model.weeks.flat();
    this.root.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => this.navigate(Number(btn.dataset.nav)));
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((btn) => {
      btn.addEventListener("click", () => this.select(flat[Number(btn.dataset.i)]));
    });
  }
}
```

- [ ] **Step 4: Implement `index.ts` (registration)**

```ts
// src/index.ts
import { HijriDatepicker } from "./hijri-datepicker";

export { HijriDatepicker } from "./hijri-datepicker";
export type { DayCell, MonthModel } from "./render";

if (typeof customElements !== "undefined" && !customElements.get("hijri-datepicker")) {
  customElements.define("hijri-datepicker", HijriDatepicker);
}

declare global {
  interface HTMLElementTagNameMap {
    "hijri-datepicker": HijriDatepicker;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @digitaltakeoff/hijri-datepicker test`
Expected: PASS (render + component tests).

- [ ] **Step 6: Build and commit**

Run: `pnpm --filter @digitaltakeoff/hijri-datepicker build`
Expected: emits `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`.
```bash
git add -A
git commit -m "feat(hijri-datepicker): single-date web component with constraints"
```

---

## Task 13: Keyboard navigation + a11y

**Files:**
- Modify: `packages/hijri-datepicker/src/hijri-datepicker.ts`
- Modify: `packages/hijri-datepicker/src/hijri-datepicker.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
// append to src/hijri-datepicker.test.ts
it("moves focus with arrow keys and selects with Enter", () => {
  const el = mount({ value: "2024-03-15" });
  const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
  let detail: any = null;
  el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));

  grid.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
  );
  const focused = el.shadowRoot!.activeElement as HTMLButtonElement;
  expect(focused?.classList.contains("cell")).toBe(true);

  focused.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  expect(detail).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @digitaltakeoff/hijri-datepicker test hijri-datepicker`
Expected: FAIL — no focus moves / no key handling.

- [ ] **Step 3: Add keyboard handling to `render()`**

Add this block at the end of `render()` in `hijri-datepicker.ts`, after the existing
`querySelectorAll("[data-i]")` wiring:

```ts
    // Roving tabindex: only the selected (or first enabled) cell is tabbable.
    const dayButtons = Array.from(
      this.root.querySelectorAll<HTMLButtonElement>("[data-i]")
    );
    const initialIdx =
      dayButtons.findIndex((b) => b.getAttribute("aria-selected") === "true") !==
      -1
        ? dayButtons.findIndex((b) => b.getAttribute("aria-selected") === "true")
        : dayButtons.findIndex((b) => !b.disabled);
    dayButtons.forEach((b, i) => (b.tabIndex = i === initialIdx ? 0 : -1));

    const moveFocus = (from: number, delta: number): void => {
      let i = from + delta;
      while (i >= 0 && i < dayButtons.length && dayButtons[i].disabled) i += delta;
      const target = dayButtons[i];
      if (target) {
        dayButtons.forEach((b) => (b.tabIndex = -1));
        target.tabIndex = 0;
        target.focus();
      }
    };

    const grid = this.root.querySelector(".grid") as HTMLElement;
    grid.addEventListener("keydown", (e: KeyboardEvent) => {
      const current = this.root.activeElement as HTMLButtonElement | null;
      const idx = current ? dayButtons.indexOf(current) : initialIdx;
      const deltas: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: 7,
        ArrowUp: -7,
      };
      if (e.key in deltas) {
        e.preventDefault();
        moveFocus(idx === -1 ? initialIdx : idx, deltas[e.key]);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (idx >= 0) this.select(flat[Number(dayButtons[idx].dataset.i)]);
      }
    });
```

> `flat` is already in scope from Step 12. Keep the existing click wiring; this only adds
> keyboard support and roving tabindex.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @digitaltakeoff/hijri-datepicker test hijri-datepicker`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(hijri-datepicker): keyboard navigation and roving tabindex"
```

---

## Task 14: Storybook playground

**Files:**
- Create: `apps/storybook/package.json`, `.storybook/main.ts`, `.storybook/preview.ts`, `stories/hijri-datepicker.stories.ts`

- [ ] **Step 1: Create `apps/storybook/package.json`**

```json
{
  "name": "@digitaltakeoff/storybook",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "storybook dev -p 6006 --no-open",
    "build": "storybook build",
    "lint": "echo \"no lint\""
  },
  "dependencies": {
    "@digitaltakeoff/hijri-datepicker": "workspace:*"
  },
  "devDependencies": {
    "@storybook/addon-a11y": "^8.3.0",
    "@storybook/addon-essentials": "^8.3.0",
    "@storybook/web-components-vite": "^8.3.0",
    "storybook": "^8.3.0",
    "lit-html": "^3.2.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `apps/storybook/.storybook/main.ts`**

```ts
import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: { name: "@storybook/web-components-vite", options: {} },
};
export default config;
```

- [ ] **Step 3: Create `apps/storybook/.storybook/preview.ts`**

```ts
import type { Preview } from "@storybook/web-components";

const preview: Preview = {
  parameters: {
    controls: { matchers: { date: /Date$/ } },
  },
};
export default preview;
```

- [ ] **Step 4: Create `apps/storybook/stories/hijri-datepicker.stories.ts`**

```ts
import { html } from "lit-html";
import "@digitaltakeoff/hijri-datepicker";

export default {
  title: "Components/HijriDatepicker",
  argTypes: {
    value: { control: "text" },
    min: { control: "text" },
    max: { control: "text" },
    dir: { control: "radio", options: ["ltr", "rtl"] },
  },
};

interface Args {
  value?: string;
  min?: string;
  max?: string;
  dir?: string;
}

const Template = (args: Args) => html`
  <hijri-datepicker
    value=${args.value ?? ""}
    min=${args.min ?? ""}
    max=${args.max ?? ""}
    dir=${args.dir ?? "ltr"}
  ></hijri-datepicker>
`;

export const Default = Template.bind({});
(Default as any).args = { value: "2024-03-15" };

export const WithRangeLimits = Template.bind({});
(WithRangeLimits as any).args = { value: "2024-03-15", min: "2024-03-10", max: "2024-03-25" };

export const RightToLeft = Template.bind({});
(RightToLeft as any).args = { value: "2024-03-15", dir: "rtl" };
```

- [ ] **Step 5: Build hijri packages, then verify Storybook builds**

Run: `pnpm --filter @digitaltakeoff/hijri-core build && pnpm --filter @digitaltakeoff/hijri-datepicker build && pnpm install && pnpm --filter @digitaltakeoff/storybook build`
Expected: `storybook-static/` produced with no errors.

- [ ] **Step 6: Smoke-test dev server (optional manual)**

Run: `pnpm --filter @digitaltakeoff/storybook dev`
Open http://localhost:6006 — the three stories render a working picker; clicking a day updates it;
the a11y addon shows no critical violations. Stop the server when done.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(storybook): hijri-datepicker stories with a11y addon"
```

---

## Task 15: Root verification + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the full monorepo pipeline**

Run: `pnpm build && pnpm test`
Expected: all packages build; all vitest suites PASS.

- [ ] **Step 2: Create `README.md`**

```markdown
# Digital Takeoff UI Packages

Tree-shakeable, low-dependency UI packages for community software. Framework-agnostic
Web Components with optional React/Angular wrappers.

## Packages

| Package | Description |
| --- | --- |
| `@digitaltakeoff/hijri-core` | Zero-dependency Hijri (Fatimid/Bohra) calendar engine. |
| `@digitaltakeoff/hijri-datepicker` | `<hijri-datepicker>` Web Component (Hijri primary, Gregorian secondary). |

## Develop

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @digitaltakeoff/storybook dev   # component playground at :6006
```

## License

Apache-2.0
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: root README and developer instructions"
```

---

## Self-Review Notes

- **Spec coverage:** Engine (tabular + correction layer + locale/format) → Tasks 3–8. Web Component
  with Hijri-primary/Greg-secondary, single-date, min/max/disabled, keyboard/a11y, RTL, CSS parts →
  Tasks 10–13. Storybook → Task 14. Monorepo/tooling → Tasks 1–2, 9, 15. Deferred per scope:
  range/multi/time (M3), React/Angular wrappers (M4), Docusaurus (M5), Changesets/CI/publish (M6).
- **Type consistency:** `HijriDate`, `HijriCalendar`, `CalendarVariantConfig`, `CorrectionMap`
  defined in Task 4 and used consistently in Tasks 5–13. `buildMonthModel`/`DayCell`/`MonthModel`
  defined in Task 10 and used in Task 12. Variant functions take `CalendarVariantConfig` first arg
  throughout.
- **External-data step:** Task 8 gathers anchor dates from mumineencalendar.com at execution time —
  this is intentional (authoritative source), not a placeholder.
```
