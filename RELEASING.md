# Releasing

Packages are versioned with [Changesets](https://github.com/changesets/changesets) and published to
npm with provenance from a manually-dispatched GitHub Actions workflow.

Published packages: `@spezutil/hijri-core`, `hijri-datepicker`, `hijri-datepicker-react`,
`hijri-datepicker-angular`. The `storybook` and `docs` apps are private and never published.

## 1. Record changes

For every user-facing change, add a changeset:

```bash
pnpm changeset
```

Pick the affected packages and bump type (patch/minor/major), write a summary, and commit the
generated file in `.changeset/`.

## 2. Version

When ready to release, apply pending changesets locally:

```bash
pnpm version-packages   # = changeset version
pnpm install            # refresh the lockfile
```

This bumps versions and updates each package's `CHANGELOG.md`. Review the diff, then:

```bash
git add -A && git commit -m "chore(release): version packages"
git push
```

> **Note — Angular wrapper peer bump.** `@spezutil/hijri-datepicker-angular` lists
> `@spezutil/hijri-datepicker` as a `peerDependency`. Changesets force-majors a package when a
> peer dependency it declares is bumped in the same release. If that over-bumps the Angular wrapper
> beyond the intended semver (e.g. to `1.0.0` on a non-breaking release), reconcile its `version` and
> `CHANGELOG.md` heading manually before committing.

## 3. Publish (with provenance)

Trigger the **Release** workflow from the GitHub Actions tab (Run workflow). It builds the libraries
and runs `pnpm -r publish` (which honors each package's `publishConfig`, including the Angular
wrapper's ng-packagr `dist` directory, and rewrites `workspace:*` deps to real versions) with an npm
provenance attestation.

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
