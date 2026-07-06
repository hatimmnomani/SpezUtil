# Releasing

Packages are versioned with [Changesets](https://github.com/changesets/changesets) and published to
npm with provenance from a manually-dispatched GitHub Actions workflow.

Published packages: `@digitaltakeoff/hijri-core`, `hijri-datepicker`, `hijri-datepicker-react`,
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

> **Note — Angular wrapper peer bump.** `@digitaltakeoff/hijri-datepicker-angular` lists
> `@digitaltakeoff/hijri-datepicker` as a `peerDependency`. Changesets force-majors a package when a
> peer dependency it declares is bumped in the same release. If that over-bumps the Angular wrapper
> beyond the intended semver (e.g. to `1.0.0` on a non-breaking release), reconcile its `version` and
> `CHANGELOG.md` heading manually before committing.

## 3. Publish (with provenance)

Trigger the **Release** workflow from the GitHub Actions tab (Run workflow). It builds the libraries
and runs `changeset publish`, publishing any package whose version is not yet on npm, with an npm
provenance attestation.

**Prerequisites:**

- An `NPM_TOKEN` automation token stored as a repo secret.
- The `@digitaltakeoff` npm org (or update the package scope).
- The workflow's `id-token: write` permission (already set) — required for provenance.

## Local fallback (no provenance)

```bash
pnpm release   # build + changeset publish, using your local npm auth
```

This publishes without a provenance attestation (provenance requires CI OIDC).
