# Hijri Datepicker M4 (React + Angular Wrappers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@spezutil/hijri-datepicker-react` and `@spezutil/hijri-datepicker-angular` thin wrapper packages, plus the element changes (reflecting property accessors + exported `ChangeDetail` types) they depend on.

**Architecture:** The element gains property↔attribute reflection so framework property-bindings drive it. React wrapper uses `@lit/react` `createComponent`. Angular wrapper is a standalone component built with ng-packagr. Both expose typed props mirroring attributes + a typed change callback.

**Tech Stack:** TypeScript, tsup, vitest + jsdom, @testing-library/react, @lit/react, Angular 19 + ng-packagr.

**Spec:** `docs/superpowers/specs/2026-06-29-hijri-datepicker-m4-wrappers-design.md`

---

## Task 1: Element property reflection + exported ChangeDetail types

The element class currently has a `private mode: Mode` field, which collides with the new public
`mode` accessor — it must be renamed to `_mode` first.

**Files:**
- Modify: `packages/hijri-datepicker/src/hijri-datepicker.ts`
- Modify: `packages/hijri-datepicker/src/index.ts`
- Modify: `packages/hijri-datepicker/src/hijri-datepicker.test.ts`

- [ ] **Step 1: Append a failing reflection test** (inside the existing describe block)

```ts
  it("reflects properties to attributes", () => {
    const el = document.createElement("hijri-datepicker") as any;
    el.value = "2024-03-15";
    el.mode = "range";
    el.min = "2024-01-01";
    el.enableTime = true;
    el.timeFormat = "12";
    el.disabledWeekdays = "5,6";
    expect(el.getAttribute("value")).toBe("2024-03-15");
    expect(el.getAttribute("mode")).toBe("range");
    expect(el.getAttribute("min")).toBe("2024-01-01");
    expect(el.hasAttribute("enable-time")).toBe(true);
    expect(el.getAttribute("time-format")).toBe("12");
    expect(el.getAttribute("disabled-weekdays")).toBe("5,6");
    el.value = null;
    el.enableTime = false;
    expect(el.hasAttribute("value")).toBe(false);
    expect(el.hasAttribute("enable-time")).toBe(false);
  });
```

- [ ] **Step 2: Run, confirm fail**

Run: `pnpm --filter @spezutil/hijri-datepicker test hijri-datepicker`
Expected: FAIL (setting `el.value` is an expando, not reflected).

- [ ] **Step 3: Rename the private `mode` field**

In `hijri-datepicker.ts`, rename the private field and ALL its usages from `this.mode` to
`this._mode`, and the declaration `private mode: Mode = "single";` to `private _mode: Mode = "single";`.
(Use a careful find/replace of `this.mode` → `this._mode`; there is no other `mode` member.)

- [ ] **Step 4: Add exported detail types** (after the imports, before `const ISO`)

```ts
import type { Time } from "./time";

export interface SingleChangeDetail {
  mode: "single";
  hijri: HijriDate;
  gregorian: string;
  time?: Time;
}
export interface RangeEndpoint {
  hijri: HijriDate;
  gregorian: string;
}
export interface RangeChangeDetail {
  mode: "range";
  start: RangeEndpoint | null;
  end: RangeEndpoint | null;
}
export interface MultipleChangeDetail {
  mode: "multiple";
  hijri: HijriDate[];
  gregorian: string[];
}
export type ChangeDetail =
  | SingleChangeDetail
  | RangeChangeDetail
  | MultipleChangeDetail;
```

> Note: `Time` is already imported in the existing file via the `./time` import group — if so, add
> the missing named import there instead of a duplicate import line. Ensure `Time` is imported.

- [ ] **Step 5: Type `emit` and add reflection accessors**

Change the `emit` signature to:

```ts
  private emit(detail: ChangeDetail): void {
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, composed: true, detail })
    );
  }
```

Add a `reflect` helper and accessors as members of the class (place right after the
`public isDateDisabled?...;` line):

```ts
  private reflect(name: string, v: string | null): void {
    if (v === null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  }

  get value(): string | null { return this.getAttribute("value"); }
  set value(v: string | null) { this.reflect("value", v); }
  get start(): string | null { return this.getAttribute("start"); }
  set start(v: string | null) { this.reflect("start", v); }
  get end(): string | null { return this.getAttribute("end"); }
  set end(v: string | null) { this.reflect("end", v); }
  get mode(): string | null { return this.getAttribute("mode"); }
  set mode(v: string | null) { this.reflect("mode", v); }
  get min(): string | null { return this.getAttribute("min"); }
  set min(v: string | null) { this.reflect("min", v); }
  get max(): string | null { return this.getAttribute("max"); }
  set max(v: string | null) { this.reflect("max", v); }
  get timeFormat(): string | null { return this.getAttribute("time-format"); }
  set timeFormat(v: string | null) { this.reflect("time-format", v); }
  get disabledWeekdays(): string | null { return this.getAttribute("disabled-weekdays"); }
  set disabledWeekdays(v: string | null) { this.reflect("disabled-weekdays", v); }
  get enableTime(): boolean { return this.hasAttribute("enable-time"); }
  set enableTime(v: boolean) {
    if (v) this.setAttribute("enable-time", "");
    else this.removeAttribute("enable-time");
  }
```

> `dir` is intentionally NOT added — `HTMLElement` already provides a `dir` property that reflects to
> the `dir` attribute natively.

- [ ] **Step 6: Export types from `index.ts`**

Add to `index.ts`:

```ts
export type {
  ChangeDetail,
  SingleChangeDetail,
  RangeChangeDetail,
  MultipleChangeDetail,
  RangeEndpoint,
} from "./hijri-datepicker";
```

- [ ] **Step 7: Run tests + lint + build**

Run: `pnpm --filter @spezutil/hijri-datepicker test && pnpm --filter @spezutil/hijri-datepicker lint && pnpm --filter @spezutil/hijri-datepicker build`
Expected: all tests pass (reflection test + existing); lint clean; dist emitted with the new types in `dist/index.d.ts`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker): reflecting property accessors + exported ChangeDetail types"
```

---

## Task 2: React wrapper package

**Files:**
- Create: `packages/hijri-datepicker-react/package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `src/index.ts`, `src/index.test.tsx`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@spezutil/hijri-datepicker-react",
  "version": "0.0.0",
  "description": "React wrapper for the Hijri datepicker Web Component.",
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
  "dependencies": {
    "@lit/react": "^1.0.6",
    "@spezutil/hijri-datepicker": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "jsdom": "^25.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external: ["react", "react-dom", "@lit/react", "@spezutil/hijri-datepicker"],
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
```

- [ ] **Step 5: Create `src/index.ts`**

```ts
import * as React from "react";
import { createComponent, type EventName } from "@lit/react";
import {
  HijriDatepicker as HijriDatepickerElement,
  type ChangeDetail,
} from "@spezutil/hijri-datepicker";

export const HijriDatepicker = createComponent({
  tagName: "hijri-datepicker",
  elementClass: HijriDatepickerElement,
  react: React,
  events: {
    onChange: "change" as EventName<CustomEvent<ChangeDetail>>,
  },
});

export type {
  ChangeDetail,
  SingleChangeDetail,
  RangeChangeDetail,
  MultipleChangeDetail,
  RangeEndpoint,
} from "@spezutil/hijri-datepicker";
```

- [ ] **Step 6: Create `src/index.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { HijriDatepicker } from "./index";

describe("HijriDatepicker (React)", () => {
  it("forwards the value prop to the element", () => {
    const { container } = render(
      React.createElement(HijriDatepicker, { value: "2024-03-15" })
    );
    const el = container.querySelector("hijri-datepicker")!;
    expect(el.getAttribute("value")).toBe("2024-03-15");
  });

  it("fires a typed onChange when a day is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(
      React.createElement(HijriDatepicker, { value: "2024-03-15", onChange })
    );
    const el = container.querySelector("hijri-datepicker")!;
    const btn = el.shadowRoot!.querySelector(
      ".cell:not(.out):not([disabled])"
    ) as HTMLButtonElement;
    btn.click();
    expect(onChange).toHaveBeenCalledTimes(1);
    const detail = (onChange.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.mode).toBe("single");
    expect(typeof detail.gregorian).toBe("string");
  });
});
```

- [ ] **Step 7: Install, test, lint, build**

Run: `pnpm install`
Run: `pnpm --filter @spezutil/hijri-datepicker build` (ensure the dependency is built first)
Run: `pnpm --filter @spezutil/hijri-datepicker-react test`
Expected: 2 tests PASS.
Run: `pnpm --filter @spezutil/hijri-datepicker-react lint && pnpm --filter @spezutil/hijri-datepicker-react build`
Expected: lint clean; dist emits `index.js`, `index.cjs`, `index.d.ts`.

> If `@lit/react` types complain that the element class isn't assignable, ensure the dependency was
> built so its `dist/index.d.ts` (with the new accessors) exists. If the onChange handler receives an
> argument typed `Event`, cast via `as CustomEvent` in the test only (done above).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker-react): @lit/react wrapper with typed onChange"
```

---

## Task 3: Angular wrapper package (ng-packagr)

**Files:**
- Create: `packages/hijri-datepicker-angular/package.json`, `ng-package.json`, `tsconfig.lib.json`, `src/public-api.ts`, `src/hijri-datepicker.component.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@spezutil/hijri-datepicker-angular",
  "version": "0.0.0",
  "description": "Angular wrapper for the Hijri datepicker Web Component.",
  "license": "Apache-2.0",
  "scripts": {
    "build": "ng-packagr -p ng-package.json",
    "lint": "tsc --noEmit -p tsconfig.lib.json",
    "test": "echo \"angular: ng-packagr build is the verification gate\""
  },
  "peerDependencies": {
    "@angular/core": ">=17",
    "@angular/common": ">=17",
    "@spezutil/hijri-datepicker": "workspace:*"
  },
  "dependencies": {
    "tslib": "^2.6.0"
  },
  "devDependencies": {
    "@angular/common": "^19.2.0",
    "@angular/compiler": "^19.2.0",
    "@angular/compiler-cli": "^19.2.0",
    "@angular/core": "^19.2.0",
    "@spezutil/hijri-datepicker": "workspace:*",
    "ng-packagr": "^19.2.0",
    "rxjs": "^7.8.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `ng-package.json`**

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "dist",
  "lib": {
    "entryFile": "src/public-api.ts"
  }
}
```

- [ ] **Step 3: Create `tsconfig.lib.json`** (standalone — does NOT extend the base to avoid Angular/TS option conflicts)

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "useDefineForClassFields": false
  },
  "angularCompilerOptions": {
    "strictTemplates": true,
    "compilationMode": "partial"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create `src/hijri-datepicker.component.ts`**

```ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import "@spezutil/hijri-datepicker";
import type { ChangeDetail } from "@spezutil/hijri-datepicker";

@Component({
  selector: "hijri-datepicker-ng",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <hijri-datepicker
      [value]="value"
      [start]="start"
      [end]="end"
      [mode]="mode"
      [min]="min"
      [max]="max"
      [dir]="dir"
      [enableTime]="enableTime"
      [timeFormat]="timeFormat"
      [disabledWeekdays]="disabledWeekdays"
      (change)="onChange($event)"
    ></hijri-datepicker>
  `,
})
export class HijriDatepickerComponent {
  @Input() value: string | null = null;
  @Input() start: string | null = null;
  @Input() end: string | null = null;
  @Input() mode: string | null = null;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() dir: string | null = null;
  @Input() enableTime = false;
  @Input() timeFormat: string | null = null;
  @Input() disabledWeekdays: string | null = null;

  @Output() change = new EventEmitter<ChangeDetail>();

  onChange(event: Event): void {
    this.change.emit((event as CustomEvent<ChangeDetail>).detail);
  }
}
```

- [ ] **Step 5: Create `src/public-api.ts`**

```ts
export { HijriDatepickerComponent } from "./hijri-datepicker.component";
export type {
  ChangeDetail,
  SingleChangeDetail,
  RangeChangeDetail,
  MultipleChangeDetail,
  RangeEndpoint,
} from "@spezutil/hijri-datepicker";
```

- [ ] **Step 6: Install + build**

Run: `pnpm install`
Run: `pnpm --filter @spezutil/hijri-datepicker build` (dependency first)
Run: `pnpm --filter @spezutil/hijri-datepicker-angular build`
Expected: ng-packagr completes, producing `packages/hijri-datepicker-angular/dist/` with FESM + types + a `package.json`. The partial-AOT compilation of the component template is the correctness gate.

> If ng-packagr errors that the entry `package.json` is missing build fields, that's fine —
> ng-packagr writes its own dist `package.json`. If it complains about the workspace dep `version`,
> ensure the dependency package built first (its `dist` exists). If a TS version peer warning appears
> from `@angular/compiler-cli`, it is non-fatal (`.npmrc` has `strict-peer-dependencies=false`).

- [ ] **Step 7: Verify dist output exists**

Run: `ls packages/hijri-datepicker-angular/dist`
Expected: contains `package.json`, `fesm2022/` (or similar), and `index.d.ts` / typings.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker-angular): standalone component wrapper (ng-packagr)"
```

---

## Task 4: Full verification + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a turbo outputs override for the Angular package** (ng-packagr writes to `dist`, already covered by the global `dist/**` output, so no change needed) — verify by running the full pipeline:

Run: `pnpm install && pnpm build && pnpm test`
Expected: all packages build (including both wrappers via ng-packagr/tsup); all vitest suites pass.
Record totals. If the Angular `build` is slow under turbo, that is expected for ng-packagr.

- [ ] **Step 2: Update `README.md` packages table** — add the two wrapper rows under the existing table:

```markdown
| `@spezutil/hijri-datepicker-react` | React wrapper (`@lit/react`) with typed props + `onChange`. |
| `@spezutil/hijri-datepicker-angular` | Angular standalone component wrapper. |
```

- [ ] **Step 3: Add framework usage examples** after the `### Modes` block:

```markdown
### React

\`\`\`tsx
import { HijriDatepicker, type ChangeDetail } from "@spezutil/hijri-datepicker-react";

<HijriDatepicker
  mode="range"
  start="2024-03-10"
  end="2024-03-18"
  onChange={(e) => console.log((e as CustomEvent<ChangeDetail>).detail)}
/>;
\`\`\`

### Angular

\`\`\`ts
import { HijriDatepickerComponent } from "@spezutil/hijri-datepicker-angular";

// standalone: add HijriDatepickerComponent to a component's imports, then:
// <hijri-datepicker-ng mode="multiple" value="2024-03-05,2024-03-12"
//   (change)="onChange($event)"></hijri-datepicker-ng>
\`\`\`
```

(Use real triple-backticks in the file.)

- [ ] **Step 4: Update the `## Status` section**

Replace the Status body with:

```markdown
Milestone M0–M4 complete: monorepo, `hijri-core` engine, `<hijri-datepicker>` (single/range/multiple
+ time), and React + Angular wrappers. Docusaurus docs and the npm release pipeline are planned
follow-on milestones.
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "docs: document React + Angular wrappers; M4 status"
```

---

## Self-Review Notes

- **Spec coverage:** reflecting accessors + ChangeDetail types (Task 1); React `@lit/react` wrapper
  with typed onChange (Task 2); Angular standalone component via ng-packagr (Task 3); verification +
  README (Task 4).
- **Naming collision handled:** private `mode` field renamed to `_mode` before adding the public
  `mode` accessor (Task 1 Step 3).
- **`dir` not reflected:** native `HTMLElement.dir` already covers it (noted in Task 1 Step 5).
- **Angular gate:** ng-packagr partial-AOT build is the verification gate; runtime TestBed deferred to
  avoid heavy zone/jsdom setup (documented in spec §5 and Task 3).
- **Type consistency:** both wrappers import `ChangeDetail` from `@spezutil/hijri-datepicker`;
  the React event prop is typed `EventName<CustomEvent<ChangeDetail>>`, the Angular `@Output` is
  `EventEmitter<ChangeDetail>`.
```
