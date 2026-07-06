# M6 — Release Pipeline (Changesets + npm publish)

**Date:** 2026-07-04
**Status:** Approved (design)
**Scope:** Set up Changesets versioning and an npm publish pipeline for the four public packages; cut the first `0.1.0` release-ready state (publish itself is user-triggered).

## 1. Goal

Reproducible, semver-correct releases of the public libraries with changelogs and npm provenance.

## 2. Public vs private packages

Publish: `@spezutil/hijri-core`, `hijri-datepicker`, `hijri-datepicker-react`, `hijri-datepicker-angular`.
Never publish (ignored / private): `@spezutil/storybook`, `@spezutil/docs`.

## 3. Decisions

| Topic | Decision |
| --- | --- |
| Tooling | Changesets (`@changesets/cli`) |
| Versioning | Run locally: `pnpm changeset` (author) → `pnpm changeset version` (bump + changelogs), committed to `main` |
| Publish | **User-triggered** GitHub Actions `workflow_dispatch` job runs `pnpm changeset publish` |
| First version | `0.1.0` (from `0.0.0` via an initial `minor` changeset) |
| Provenance | Enabled via `publishConfig.provenance: true` + CI `id-token: write` (provenance requires CI OIDC — cannot be produced by a purely local publish) |
| Access | Public scoped packages (`publishConfig.access: "public"`) |

### Why publish runs in CI even though versioning is manual
npm provenance attestations are only issued when publishing from a supported CI with OIDC (GitHub
Actions). A local `npm publish --provenance` fails outside CI. So versioning stays manual/local, and
publishing is a manually **dispatched** CI job — still user-controlled, but able to attest provenance.
A fully-local fallback (without provenance) is documented for completeness.

## 4. Package.json additions (each of the 4 libs)

```jsonc
"publishConfig": { "access": "public", "provenance": true },
"repository": {
  "type": "git",
  "url": "git+https://github.com/hatimmnomani/SpezUtil.git",
  "directory": "packages/<name>"
}
```
Versions stay `0.0.0`; `changeset version` bumps them to `0.1.0`.

## 5. `.changeset/config.json`

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

## 6. Root scripts

```jsonc
"changeset": "changeset",
"version-packages": "changeset version",
"release": "turbo run build --filter=./packages/* && changeset publish"
```

## 7. Release workflow (`.github/workflows/release.yml`)

`workflow_dispatch` only. Steps: checkout → pnpm/node (registry npmjs) → install → build the libs →
`pnpm changeset publish`. Permissions `contents: read`, `id-token: write`. Uses `secrets.NPM_TOKEN`
as `NODE_AUTH_TOKEN`. Provenance comes from `publishConfig.provenance` + `id-token`.

## 8. Deliverable state

- Changesets configured; the four libs carry `publishConfig`/`repository`.
- An initial `minor` changeset is consumed by `changeset version`, leaving the repo at **0.1.0** with
  generated `CHANGELOG.md` files.
- `RELEASING.md` documents the flow (author changeset → version → dispatch release; local fallback).
- Build + tests green at 0.1.0. Packaging verified via `npm pack --dry-run` (dist present, no source).
- **No actual publish** — that is the user's dispatch once `NPM_TOKEN` is set and the npm org exists.

## 9. Non-goals (M6)
- Actually publishing to npm (needs the user's token + org).
- Automated Version PR bot (chose manual versioning).
- Canary/snapshot releases.

## 10. Prerequisites for the user (documented, not done here)
- Create the `@spezutil` npm org (or adjust scope) and an automation `NPM_TOKEN`; add it as a
  repo secret. Push `main` to `origin`.
