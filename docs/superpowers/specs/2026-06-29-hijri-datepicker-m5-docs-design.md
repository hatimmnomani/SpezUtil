# Hijri Datepicker M5 — Docusaurus Documentation Site

**Date:** 2026-06-29
**Status:** Approved (design)
**Scope:** A Docusaurus docs site (`apps/docs`) with live interactive demos, API reference, engine guide, and recipes; plus GitHub Pages deployment.

## 1. Goal

A public documentation site for the Digital Takeoff packages, starting with the Hijri datepicker.
Live, interactive demos (real Web Component), not screenshots.

## 2. Decisions

| Topic | Decision |
| --- | --- |
| Framework | Docusaurus 3 (classic preset, TypeScript) |
| Live demos | Real `<hijri-datepicker>` via `@spezutil/hijri-datepicker-react`, wrapped in Docusaurus `<BrowserOnly>` (client-only; the element self-registers only in the browser) |
| Deploy | GitHub Pages via a GitHub Actions workflow |
| Content | Getting started + install; API reference; calendar-engine guide; recipes with live demos |
| Location | `apps/docs` workspace package (`@spezutil/docs`, private) |

## 3. Why BrowserOnly

The picker is a client-only Custom Element; its `index.ts` guards registration with
`typeof customElements !== "undefined"`, so importing it during SSR is safe but it renders nothing
server-side. Demo components therefore render inside `<BrowserOnly>` so the element only mounts in the
browser, avoiding hydration mismatches.

## 4. Site structure

```
apps/docs/
├── docusaurus.config.ts        # url/baseUrl + GitHub Pages (organizationName/projectName)
├── sidebars.ts
├── package.json                # deps: @docusaurus/*, react, workspace packages
├── tsconfig.json
├── src/
│   ├── css/custom.css
│   └── components/HijriDemo.tsx # BrowserOnly wrapper around the React datepicker
├── static/
└── docs/
    ├── intro.md                # what this is, install, quick start (vanilla/react/angular)
    ├── datepicker/
    │   ├── getting-started.md
    │   ├── api.md              # attributes/properties, events + ChangeDetail, theming (parts/vars), isDateDisabled
    │   └── recipes.mdx         # live demos: single, range, multiple, time, min/max/disabled, RTL, theming
    └── engine/
        └── hijri-core.md       # createCalendar, Misri/Fatimid algorithm, anchors, corrections, format/parse
```

## 5. Live demo component

`src/components/HijriDemo.tsx` exports a small React component that renders the React wrapper inside
`<BrowserOnly>`, forwarding props (mode, value, start, end, enableTime, timeFormat, dir, min, max) and
logging `onChange` to a visible output area so readers see the emitted `ChangeDetail`. Recipes import
it in MDX.

## 6. Deployment

- `docusaurus.config.ts`: `url`, `baseUrl`, `organizationName`, `projectName`, `trailingSlash: false`.
  Placeholders documented for the eventual GitHub org/repo (the repo has no remote yet).
- `.github/workflows/docs.yml`: on push to `main` affecting `apps/docs` (and its deps), build the site
  and deploy to GitHub Pages via `actions/deploy-pages`.

## 7. Non-goals (M5)
- Versioned docs.
- Search (Algolia) — can add later.
- Documenting packages beyond the datepicker + engine.
- Actually enabling Pages in repo settings (needs the GitHub repo to exist; workflow is staged).

## 8. Constraints
- Docs build must pass `docusaurus build` (broken-link check on) in CI/`pnpm build`.
- Reuses workspace packages via `workspace:*`; no logic duplicated in docs.
