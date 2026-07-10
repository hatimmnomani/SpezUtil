# Releasing

Packages are versioned with [Changesets](https://github.com/changesets/changesets) and published to
npm with provenance from a manually-dispatched GitHub Actions workflow.

Published package families:

- Hijri internals: `@spezutil/hijri-core`, `@spezutil/hijri-view-core`
- Datepicker: `@spezutil/hijri-datepicker`, `@spezutil/hijri-datepicker-react`,
  `@spezutil/hijri-datepicker-angular`
- Calendar: `@spezutil/hijri-calendar`, `@spezutil/hijri-calendar-react`,
  `@spezutil/hijri-calendar-angular`
- Rich-text editor: `@spezutil/richtext-editor`, `@spezutil/richtext-editor-react`,
  `@spezutil/richtext-editor-angular`

The `storybook` and `docs` apps are private and never published.

## 1. Record changes

For every user-facing change, add a changeset:

```bash
pnpm changeset
```

Pick the affected packages and bump type (patch/minor/major), write a summary, and commit the
generated file in `.changeset/`.

## 2. Version

When ready to release, inspect the calculated release before changing any files:

```bash
pnpm changeset status
```

Confirm the package list and every target version. In particular, new packages intended to start at
`0.1.0` must not already be set to `0.1.0` before a minor changeset is applied, or Changesets will
calculate `0.2.0`.

Once the status matches the intended release, apply pending changesets locally:

```bash
pnpm version-packages   # = changeset version
pnpm install            # refresh the lockfile
```

This bumps versions and updates each package's `CHANGELOG.md`. Review the diff, then:

```bash
git add -A && git commit -m "chore(release): version packages"
git push
```

> **Note — peer dependency bumps.** Angular wrappers declare their corresponding Web Component as a
> peer dependency, and `@spezutil/richtext-editor` has an optional datepicker peer. Changesets can
> force-major a package when a peer is bumped in the same release. If the status shows an unintended
> major, fix the changeset or dependency range before running `pnpm version-packages`; do not repair
> the generated versions after the fact.

## 3. Publish (with provenance)

Trigger the **Release** workflow from the GitHub Actions tab (Run workflow). It builds the libraries
and runs `pnpm -r publish` (which honors each package's `publishConfig`, including the Angular
wrapper's ng-packagr `dist` directory, and rewrites `workspace:*` deps to real versions) with an npm
provenance attestation.

Before dispatching, compare workspace versions with npm and run `pnpm publish --dry-run` in every
package expected to be released. The recursive publish command skips versions that already exist in
the registry, so the unpublished-version list must exactly match the approved release scope.

> **Why `pnpm publish`, not `changeset publish`:** `changeset publish` shells out to `npm`, which
> ignores `publishConfig.directory` — so the ng-packagr Angular package would ship its source. `pnpm`
> honors `directory` and publishes the built `dist`. Changesets is still used for versioning.

**Prerequisites:**

- An `NPM_TOKEN` automation token stored as a repo secret.
- The `@spezutil` npm org (or update the package scope).
- The workflow's `id-token: write` permission (already set) — required for provenance.

## Local publish (no provenance)

```bash
pnpm release   # build + pnpm -r publish, using your local npm auth
```

No provenance attestation (that requires CI OIDC). Your npm account must allow non-interactive
publishing — either set 2FA to **Authorization only**, or use an **Automation** token:

1. npmjs.com → Access Tokens → Generate New Token → **Automation** (bypasses 2FA).
2. `npm config set //registry.npmjs.org/:_authToken <TOKEN>`
3. `pnpm release`
