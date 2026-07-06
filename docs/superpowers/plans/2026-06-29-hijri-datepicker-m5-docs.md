# Hijri Datepicker M5 (Docusaurus Docs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Docusaurus 3 docs site at `apps/docs` with live interactive picker demos, API reference, engine guide, and recipes, plus a GitHub Pages deploy workflow.

**Architecture:** `apps/docs` is a private workspace package. Docs are Markdown/MDX. Live demos render the real Web Component via `@spezutil/hijri-datepicker-react` inside Docusaurus `<BrowserOnly>` (client-only). The verification gate for every content task is a clean `docusaurus build` (broken links throw).

**Tech Stack:** Docusaurus 3.6 (classic preset, TypeScript), React 18, MDX, workspace packages.

**Spec:** `docs/superpowers/specs/2026-06-29-hijri-datepicker-m5-docs-design.md`

**Note:** Docs are prose, not TDD. "Verify" = `pnpm --filter @spezutil/docs build` succeeds with no broken-link errors.

---

## Task 1: Scaffold the Docusaurus app

**Files:**
- Create: `apps/docs/package.json`, `docusaurus.config.ts`, `sidebars.ts`, `tsconfig.json`, `turbo.json`, `src/css/custom.css`, `static/.gitkeep`, `docs/intro.md`

- [ ] **Step 1: `apps/docs/package.json`**

```json
{
  "name": "@spezutil/docs",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "docusaurus start",
    "build": "docusaurus build",
    "serve": "docusaurus serve",
    "lint": "echo \"docs: build is the gate\""
  },
  "dependencies": {
    "@docusaurus/core": "^3.6.0",
    "@docusaurus/preset-classic": "^3.6.0",
    "@mdx-js/react": "^3.0.0",
    "clsx": "^2.1.1",
    "prism-react-renderer": "^2.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@spezutil/hijri-core": "workspace:*",
    "@spezutil/hijri-datepicker-react": "workspace:*"
  },
  "devDependencies": {
    "@docusaurus/module-type-aliases": "^3.6.0",
    "@docusaurus/tsconfig": "^3.6.0",
    "@docusaurus/types": "^3.6.0",
    "typescript": "~5.6.0"
  }
}
```

- [ ] **Step 2: `apps/docs/docusaurus.config.ts`**

```ts
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";

// NOTE: organizationName/projectName/url/baseUrl are placeholders for GitHub Pages.
// Update them when the GitHub repo exists.
const config: Config = {
  title: "Digital Takeoff UI",
  tagline: "Hijri datepicker and community UI packages",
  url: "https://digitaltakeoff.github.io",
  baseUrl: "/db-sotware-packages/",
  organizationName: "digitaltakeoff",
  projectName: "db-sotware-packages",
  trailingSlash: false,
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  i18n: { defaultLocale: "en", locales: ["en"] },
  presets: [
    [
      "classic",
      {
        docs: { routeBasePath: "/", sidebarPath: "./sidebars.ts" },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: "Digital Takeoff UI",
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
      ],
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

- [ ] **Step 3: `apps/docs/sidebars.ts`**

```ts
import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    {
      type: "category",
      label: "Datepicker",
      items: ["datepicker/getting-started", "datepicker/api", "datepicker/recipes"],
    },
    {
      type: "category",
      label: "Engine",
      items: ["engine/hijri-core"],
    },
  ],
};

export default sidebars;
```

- [ ] **Step 4: `apps/docs/tsconfig.json`**

```json
{
  "extends": "@docusaurus/tsconfig",
  "compilerOptions": { "baseUrl": "." },
  "exclude": [".docusaurus", "build"]
}
```

- [ ] **Step 5: `apps/docs/turbo.json`** (Docusaurus outputs to `build/`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["build/**", ".docusaurus/**"] }
  }
}
```

- [ ] **Step 6: `apps/docs/src/css/custom.css`**

```css
:root {
  --ifm-color-primary: #0b7d3e;
  --ifm-color-primary-dark: #0a7138;
  --ifm-color-primary-darker: #096a34;
  --ifm-color-primary-darkest: #07572b;
  --ifm-color-primary-light: #0c8944;
  --ifm-color-primary-lighter: #0d9048;
  --ifm-color-primary-lightest: #0fa352;
}
[data-theme="dark"] {
  --ifm-color-primary: #34c77b;
}
.hijri-demo pre {
  margin-top: 8px;
  font-size: 12px;
}
```

- [ ] **Step 7: `apps/docs/static/.gitkeep`** (empty file)

- [ ] **Step 8: `apps/docs/docs/intro.md`**

```markdown
---
slug: /
title: Digital Takeoff UI
---

# Digital Takeoff UI

Tree-shakeable, low-dependency UI packages for community software. The first component is a
feature-rich **Hijri date picker** where the Hijri (Dawoodi Bohra / Misri) date is primary and the
Gregorian date is secondary.

## Packages

| Package | Description |
| --- | --- |
| `@spezutil/hijri-core` | Zero-dependency Hijri calendar engine. |
| `@spezutil/hijri-datepicker` | `<hijri-datepicker>` Web Component. |
| `@spezutil/hijri-datepicker-react` | React wrapper. |
| `@spezutil/hijri-datepicker-angular` | Angular standalone component. |

## Install

```bash
# Web Component (vanilla)
npm i @spezutil/hijri-datepicker

# React
npm i @spezutil/hijri-datepicker-react react react-dom

# Angular
npm i @spezutil/hijri-datepicker-angular
```

Continue to [Getting started](/datepicker/getting-started).
```

- [ ] **Step 9: Install + build**

Run: `pnpm install`
Run: `pnpm --filter @spezutil/hijri-core build && pnpm --filter @spezutil/hijri-datepicker build && pnpm --filter @spezutil/hijri-datepicker-react build`
Run: `pnpm --filter @spezutil/docs build`
Expected: Docusaurus build succeeds, emits `apps/docs/build/`. (The sidebar references pages created in later tasks — for THIS task, temporarily the sidebar will fail broken-link/missing-doc checks. To keep Task 1 self-contained, comment out the `datepicker` and `engine` categories in `sidebars.ts`, leaving only `"intro"`, then build. Re-enable them in Task 3 when those pages exist.)

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(docs): scaffold Docusaurus site"
```

---

## Task 2: Live demo component + recipes page

**Files:**
- Create: `apps/docs/src/components/HijriDemo.tsx`, `apps/docs/src/components/HijriDemoClient.tsx`, `apps/docs/docs/datepicker/recipes.mdx`

- [ ] **Step 1: `src/components/HijriDemoClient.tsx`** (imported only in the browser)

```tsx
import React, { useState } from "react";
import { HijriDatepicker } from "@spezutil/hijri-datepicker-react";

export interface HijriDemoProps {
  mode?: string;
  value?: string;
  start?: string;
  end?: string;
  min?: string;
  max?: string;
  enableTime?: boolean;
  timeFormat?: string;
  dir?: string;
}

export default function HijriDemoClient(props: HijriDemoProps): JSX.Element {
  const [out, setOut] = useState("(no selection yet)");
  return (
    <div className="hijri-demo">
      <HijriDatepicker
        {...props}
        onChange={(e: Event) =>
          setOut(JSON.stringify((e as CustomEvent).detail))
        }
      />
      <pre>{out}</pre>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/HijriDemo.tsx`** (SSR-safe wrapper)

```tsx
import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import type { HijriDemoProps } from "./HijriDemoClient";

export default function HijriDemo(props: HijriDemoProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading demo…</div>}>
      {() => {
        const Client = require("./HijriDemoClient").default;
        return <Client {...props} />;
      }}
    </BrowserOnly>
  );
}
```

- [ ] **Step 3: `docs/datepicker/recipes.mdx`**

```mdx
---
title: Recipes
---

import HijriDemo from "@site/src/components/HijriDemo";

# Recipes

Every demo below is the real Web Component. Selecting a date logs the emitted `ChangeDetail`.

## Single date

<HijriDemo value="2024-03-15" />

```html
<hijri-datepicker value="2024-03-15"></hijri-datepicker>
```

## Range

<HijriDemo mode="range" start="2024-03-10" end="2024-03-18" />

```html
<hijri-datepicker mode="range" start="2024-03-10" end="2024-03-18"></hijri-datepicker>
```

## Multiple dates

<HijriDemo mode="multiple" value="2024-03-05,2024-03-12,2024-03-20" />

## Time picker (12-hour)

<HijriDemo value="2024-03-15" enableTime timeFormat="12" />

## Min / max constraints

<HijriDemo value="2024-03-15" min="2024-03-10" max="2024-03-25" />

## Right-to-left

<HijriDemo value="2024-03-15" dir="rtl" />

## Theming

The element exposes CSS custom properties and `::part()` selectors. See the
[API reference](/datepicker/api#theming).
```

- [ ] **Step 4: Build**

Run: `pnpm --filter @spezutil/docs build`
Expected: build succeeds; the recipes route renders (demos are client-only via BrowserOnly, so they
prerender as the fallback and hydrate in the browser). If the build fails importing the wrapper during
SSR, confirm `HijriDemoClient` is only referenced through `require()` inside `BrowserOnly` (never a
top-level import in `HijriDemo.tsx` or the MDX).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(docs): live BrowserOnly demo component + recipes page"
```

---

## Task 3: Content pages (getting started, API, engine)

**Files:**
- Create: `apps/docs/docs/datepicker/getting-started.md`, `apps/docs/docs/datepicker/api.md`, `apps/docs/docs/engine/hijri-core.md`
- Modify: `apps/docs/sidebars.ts` (re-enable the categories commented out in Task 1)

- [ ] **Step 1: Re-enable the full sidebar** (restore `sidebars.ts` to the version in Task 1 Step 3 with both categories active).

- [ ] **Step 2: `docs/datepicker/getting-started.md`**

```markdown
---
title: Getting started
---

# Getting started

## Vanilla JS

```html
<script type="module">
  import "@spezutil/hijri-datepicker";
</script>

<hijri-datepicker value="2024-03-15" min="2024-01-01" max="2024-12-31"></hijri-datepicker>

<script>
  document.querySelector("hijri-datepicker").addEventListener("change", (e) => {
    console.log(e.detail); // { mode: "single", hijri, gregorian }
  });
</script>
```

## React

```tsx
import { HijriDatepicker, type ChangeDetail } from "@spezutil/hijri-datepicker-react";

export function Example() {
  return (
    <HijriDatepicker
      mode="range"
      start="2024-03-10"
      end="2024-03-18"
      onChange={(e) => console.log((e as CustomEvent<ChangeDetail>).detail)}
    />
  );
}
```

## Angular

```ts
import { Component } from "@angular/core";
import { HijriDatepickerComponent, type ChangeDetail } from "@spezutil/hijri-datepicker-angular";

@Component({
  standalone: true,
  imports: [HijriDatepickerComponent],
  template: `<hijri-datepicker-ng mode="multiple" value="2024-03-05,2024-03-12"
    (change)="onChange($event)"></hijri-datepicker-ng>`,
})
export class ExampleComponent {
  onChange(detail: ChangeDetail) {
    console.log(detail);
  }
}
```

See [Recipes](/datepicker/recipes) for live demos and the [API reference](/datepicker/api).
```

- [ ] **Step 3: `docs/datepicker/api.md`**

```markdown
---
title: API reference
---

# API reference

## Modes

Set with the `mode` attribute/property: `single` (default), `range`, or `multiple`.

## Attributes & properties

Every attribute has a matching reflected property (e.g. `el.value`, `el.enableTime`).

| Attribute | Property | Type | Applies to | Description |
| --- | --- | --- | --- | --- |
| `value` | `value` | ISO date, datetime, or comma list | single, multiple | Selected date; datetime when time enabled; comma-separated list in multiple mode. |
| `start` | `start` | ISO date | range | Range start. |
| `end` | `end` | ISO date | range | Range end. |
| `mode` | `mode` | `single \| range \| multiple` | all | Selection mode. |
| `min` | `min` | ISO date | all | Earliest selectable date. |
| `max` | `max` | ISO date | all | Latest selectable date. |
| `disabled-weekdays` | `disabledWeekdays` | comma list (0=Sun..6=Sat, UTC) | all | Disabled weekdays. |
| `enable-time` | `enableTime` | boolean | single | Show the time picker. |
| `time-format` | `timeFormat` | `12 \| 24` | single | Time display format. |
| `dir` | `dir` | `ltr \| rtl` | all | Text direction. |

### `isDateDisabled` (property only)

```ts
el.isDateDisabled = (hijri, gregorian) => gregorian.getUTCDay() === 5; // disable Fridays
```

## Events

The element fires a `change` `CustomEvent` whose `detail` depends on the mode:

```ts
// single
{ mode: "single"; hijri: HijriDate; gregorian: string; time?: { hour: number; minute: number } }
// range
{ mode: "range"; start: { hijri; gregorian } | null; end: { hijri; gregorian } | null }
// multiple
{ mode: "multiple"; hijri: HijriDate[]; gregorian: string[] }
```

## Theming

Style via CSS custom properties on the host:

| Variable | Purpose |
| --- | --- |
| `--dtp-bg` | Calendar background. |
| `--dtp-fg` | Foreground text. |
| `--dtp-muted` | Muted / secondary text. |
| `--dtp-accent` | Selection / range accent. |
| `--dtp-accent-fg` | Text on accent. |
| `--dtp-radius` | Corner radius. |

`::part()` hooks: `day`, `nav-prev`, `nav-next`, `time`.

```css
hijri-datepicker {
  --dtp-accent: #7c3aed;
}
hijri-datepicker::part(day) {
  font-weight: 600;
}
```
```

- [ ] **Step 4: `docs/engine/hijri-core.md`**

```markdown
---
title: hijri-core engine
---

# hijri-core

`@spezutil/hijri-core` is the zero-dependency calendar engine behind the picker. Use it
directly for conversions and formatting.

```ts
import { createCalendar, formatHijri, parseHijri } from "@spezutil/hijri-core";

const cal = createCalendar();
const h = cal.gregorianToHijri(new Date(Date.UTC(2024, 2, 15)));
formatHijri(h, "D MMMM YYYY"); // e.g. "5 Ramadan al-Moazzam 1445"
cal.hijriToGregorian(h); // back to a Date
```

## The Misri / Fatimid algorithm

The Dawoodi Bohra calendar is a fixed **tabular** calendar, fully determined by a leap-year cycle and
an epoch:

- 30-year cycle with leap years at positions **2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29**.
- Odd months are 30 days, even months 29; in a leap year the 12th month (Zilhaj) has 30 days.
- Epoch: 1 Muharram, year 1 corresponds to 15 July 622 CE, calibrated against authoritative anchor
  dates (Lokhandwala Misri conversion tables).

## Correction layer

`createCalendar({ corrections })` accepts overrides keyed by Gregorian ISO date, layered on top of
the tabular result for any date that must match an authoritative source exactly:

```ts
const cal = createCalendar({
  corrections: { "2024-01-15": { year: 1445, month: 7, day: 3 } },
});
```

## Formatting tokens

`formatHijri` supports `YYYY`, `MMMM` (month name), `MM`, `M`, `DD`, `D`. `parseHijri` parses the
numeric tokens (`YYYY`, `MM`, `DD`).
```

- [ ] **Step 5: Build (broken links throw)**

Run: `pnpm --filter @spezutil/docs build`
Expected: succeeds; all sidebar entries resolve; no broken internal links (`/datepicker/api#theming`,
`/datepicker/recipes`, `/datepicker/getting-started`, `/` all exist).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "docs: getting started, API reference, and engine guide pages"
```

---

## Task 4: GitHub Pages deploy workflow

**Files:**
- Create: `.github/workflows/docs.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - "apps/docs/**"
      - "packages/**"
      - ".github/workflows/docs.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build --filter @spezutil/docs...
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "ci: GitHub Pages deploy workflow for docs"
```

> Note: the workflow is staged; it runs once the repo is pushed to GitHub and Pages is enabled in repo
> settings (Settings → Pages → Source: GitHub Actions). Update `organizationName`/`projectName`/`url`/
> `baseUrl` in `docusaurus.config.ts` to the real repo if different.

---

## Task 5: Full verification + README link

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Full pipeline**

Run: `pnpm build && pnpm test`
Expected: all packages + the docs site build; all tests pass.

- [ ] **Step 2: Add a Docs section to `README.md`** (after the `## Develop` section)

```markdown
## Documentation

The docs site (Docusaurus) lives in `apps/docs`:

```bash
pnpm --filter @spezutil/docs dev     # local docs at http://localhost:3000
pnpm --filter @spezutil/docs build   # static build in apps/docs/build
```

It is deployed to GitHub Pages by `.github/workflows/docs.yml` on pushes to `main`.
```

- [ ] **Step 3: Update the `## Status` section**

```markdown
Milestone M0–M5 complete: monorepo, `hijri-core` engine, `<hijri-datepicker>` (single/range/multiple
+ time), React + Angular wrappers, and a Docusaurus docs site with live demos. The npm release
pipeline (Changesets) is the remaining planned milestone.
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: link the documentation site; M5 status"
```

---

## Self-Review Notes

- **Spec coverage:** scaffold + config + GitHub Pages fields (Task 1); BrowserOnly live demos (Task 2);
  getting started / API / engine content (Task 3); Pages workflow (Task 4); verification + README
  (Task 5). All four requested content areas covered.
- **SSR safety:** the Web Component is only referenced through `require()` inside `<BrowserOnly>`
  (Task 2), avoiding SSR execution; the element's registration is already guarded by a
  `typeof customElements` check.
- **Broken-link gate:** `onBrokenLinks: "throw"` — Task 3 verifies every internal link resolves.
- **Turbo:** `apps/docs/turbo.json` maps outputs to `build/` so the docs build is cached and ordered
  after dependency builds.
```
