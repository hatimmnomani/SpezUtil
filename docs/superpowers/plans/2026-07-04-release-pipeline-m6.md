# M6 Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Configure Changesets + an npm publish pipeline (provenance via dispatched CI) for the four public packages, and cut the repo to a `0.1.0` release-ready state without publishing.

**Architecture:** Changesets manages versions/changelogs. Versioning is run locally; publishing is a `workflow_dispatch` GitHub Action so npm provenance (OIDC) works. Private apps (storybook, docs) are ignored.

**Spec:** `docs/superpowers/specs/2026-07-04-release-pipeline-m6-design.md`

**Note:** Config, not TDD. Gates are `pnpm build && pnpm test` green and `npm pack --dry-run` showing correct tarball contents.

---

## Task 1: Install + configure Changesets

**Files:**
- Modify: root `package.json`
- Create: `.changeset/config.json`, `.changeset/README.md`

- [ ] **Step 1:** Add `@changesets/cli` as a root devDependency and scripts to root `package.json`:

```jsonc
// scripts (merge into existing "scripts")
"changeset": "changeset",
"version-packages": "changeset version",
"release": "turbo run build --filter=./packages/* && changeset publish"
// devDependencies (add)
"@changesets/cli": "^2.27.9"
```

- [ ] **Step 2:** Create `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@spezutil/storybook", "@spezutil/docs"]
}
```

- [ ] **Step 3:** Create `.changeset/README.md`:

```markdown
# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).
Run `pnpm changeset` to record a change; see `RELEASING.md` for the full flow.
```

- [ ] **Step 4:** `pnpm install`. Verify `pnpm changeset --help` runs (CLI resolves).

- [ ] **Step 5:** Commit: `git add -A && git commit -m "chore(release): add changesets config"`

---

## Task 2: Add publishConfig + repository to the four libs

**Files:**
- Modify: `packages/hijri-core/package.json`, `packages/hijri-datepicker/package.json`, `packages/hijri-datepicker-react/package.json`, `packages/hijri-datepicker-angular/package.json`

- [ ] **Step 1:** To EACH of the four package.json files add (keep existing fields; version stays `0.0.0`):

```jsonc
"publishConfig": { "access": "public", "provenance": true },
"repository": {
  "type": "git",
  "url": "git+https://github.com/hatimmnomani/SpezUtil.git",
  "directory": "packages/<dir>"
}
```

Where `<dir>` is the package's folder: `hijri-core`, `hijri-datepicker`, `hijri-datepicker-react`,
`hijri-datepicker-angular` respectively.

- [ ] **Step 2:** Verify each package.json is valid JSON: `node -e "require('./packages/hijri-core/package.json')"` (repeat per package) — no parse error.

- [ ] **Step 3:** Commit: `git add -A && git commit -m "chore(release): publishConfig (public + provenance) and repository fields"`

---

## Task 3: Initial changeset + version bump to 0.1.0

**Files:**
- Create: `.changeset/initial-release.md`
- (Generated) package version bumps + `CHANGELOG.md` per lib

- [ ] **Step 1:** Create `.changeset/initial-release.md`:

```markdown
---
"@spezutil/hijri-core": minor
"@spezutil/hijri-datepicker": minor
"@spezutil/hijri-datepicker-react": minor
"@spezutil/hijri-datepicker-angular": minor
---

Initial public release: zero-dependency Hijri (Fatimid/Bohra Misri) calendar engine, the
`<hijri-datepicker>` Web Component (single/range/multiple selection + single-mode time picker), and
React + Angular wrappers.
```

- [ ] **Step 2:** Check status: `pnpm changeset status`. Expected: lists all four packages releasing at `0.1.0` (minor from 0.0.0).

- [ ] **Step 3:** Apply the version bump: `pnpm changeset version`. Expected: the four libs' `version` becomes `0.1.0`; a `CHANGELOG.md` is created in each; `.changeset/initial-release.md` is consumed (deleted). Private apps unchanged (ignored).

- [ ] **Step 4:** `pnpm install` (refresh lockfile after version changes), then `pnpm build && pnpm test`. Expected: all build + all tests pass at 0.1.0.

- [ ] **Step 5:** Commit: `git add -A && git commit -m "chore(release): version packages 0.1.0"`

---

## Task 4: Release workflow + RELEASING.md

**Files:**
- Create: `.github/workflows/release.yml`, `RELEASING.md`

- [ ] **Step 1:** Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: "https://registry.npmjs.org"
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build --filter=./packages/*
      - run: pnpm changeset publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: "true"
```

- [ ] **Step 2:** Create `RELEASING.md`:

```markdown
# Releasing

Packages are versioned with [Changesets](https://github.com/changesets/changesets) and published to
npm with provenance from a manually-dispatched GitHub Actions workflow.

## 1. Record changes

For every user-facing change, add a changeset:

```bash
pnpm changeset
```

Pick the affected packages and bump type (patch/minor/major), and write a summary. Commit the
generated file in `.changeset/`.

## 2. Version

When ready to release, apply pending changesets locally:

```bash
pnpm version-packages   # = changeset version
pnpm install            # refresh the lockfile
git add -A && git commit -m "chore(release): version packages"
git push
```

This bumps versions and updates each package's `CHANGELOG.md`.

## 3. Publish (provenance)

Trigger the **Release** workflow from the GitHub Actions tab (Run workflow). It builds the libraries
and runs `changeset publish`, publishing any package whose version is not yet on npm, with npm
provenance attestation.

**Prerequisites:** an `NPM_TOKEN` automation token stored as a repo secret, and the
`@spezutil` npm org (or update the package scope). Provenance requires the workflow's
`id-token: write` permission (already set).

## Local fallback (no provenance)

```bash
pnpm release   # build + changeset publish, using your local npm auth
```

This publishes without a provenance attestation (provenance needs CI OIDC).
```

- [ ] **Step 3:** Commit: `git add -A && git commit -m "ci: release workflow and RELEASING guide"`

---

## Task 5: Verify packaging + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Dry-run the tarball for each lib to confirm contents (dist + package.json + no source/tests). From each package dir, e.g.:

```bash
pnpm --filter @spezutil/hijri-core exec npm pack --dry-run
```

Expected: the file list includes `dist/**` and `package.json` (and LICENSE/README if present), and
does NOT include `src/**` or test files. Repeat for the other three libs (the react/angular ones
include their built `dist`).

- [ ] **Step 2:** Update `README.md` `## Status`:

```markdown
Milestone M0–M6 complete: monorepo, `hijri-core` engine, `<hijri-datepicker>` (single/range/multiple
+ time), React + Angular wrappers, a Docusaurus docs site, and a Changesets release pipeline (first
`0.1.0` staged). See `RELEASING.md` to publish.
```

- [ ] **Step 3:** Add a `## Releasing` pointer under Status:

```markdown
## Releasing

Versioned with Changesets; published to npm with provenance via a dispatched GitHub Actions workflow.
See [`RELEASING.md`](./RELEASING.md).
```

- [ ] **Step 4:** `pnpm build && pnpm test` once more — all green.

- [ ] **Step 5:** Commit: `git add -A && git commit -m "docs: M6 release pipeline status + releasing pointer"`

---

## Self-Review Notes

- **Spec coverage:** changesets config + ignore private apps (Task 1); publishConfig/provenance/repository (Task 2); 0.1.0 bump + changelogs (Task 3); dispatched provenance publish workflow + RELEASING docs (Task 4); packaging dry-run + README (Task 5).
- **Provenance/manual reconciliation:** versioning local, publish via `workflow_dispatch` (documented in RELEASING.md + spec §3).
- **No publish performed:** repo left release-ready at 0.1.0; user triggers publish with their token.
- **Private apps excluded:** `ignore` in changeset config; storybook/docs already `private: true`.
```
