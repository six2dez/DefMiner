# Publishing DefMiner to the Caido store

Everything here was verified against the real repositories and the real build on
2026-09-04: [`caido/store`](https://github.com/caido/store) (schema and 78 live
entries) and [`caido/starterkit-plugin`](https://github.com/caido/starterkit-plugin)
(the official release workflow).

The order matters. Steps 1–3 are prerequisites you do once; step 4 is the PR that
lists the plugin; step 5 is every release after that.

---

## 0. What is already done

| | |
|---|---|
| `LICENSE` (MIT) and `package.json` `license` field | ✅ |
| `README.md` written for a store audience | ✅ |
| Help tab inside the plugin | ✅ |
| `.github/workflows/release.yml`, adapted to this repo's layout | ✅ |
| Frontend→backend link in the manifest | ✅ fixed in `c442dd6`, guarded in CI |
| Signing round-trip proven end to end | ✅ verified, including tamper rejection |

## 1. Create the public GitHub repository

The store requires `repository: "owner/repo"` and pulls release assets from it.
This repo currently has **no git remote at all**.

```bash
gh repo create DefMiner --public --source=. --remote=origin
git push -u origin main
```

`--public` is required: the store cannot fetch releases from a private repo.

### Immutable releases, and what they cost

The store **requires** the setting
([Caido's guide](https://developer.caido.io/plugins/guides/repository.html#_3-enable-immutable-releases)):
Settings → General → Releases → Immutable releases, or

```bash
gh api -X PUT repos/six2dez/DefMiner/immutable-releases
```

Turn it on **before the first release**, and know what you are agreeing to:

- A published release can never gain, lose or change an asset.
- Deleting one is still allowed — but **the tag name is burned forever**. Reusing
  it fails with `tag_name was used by an immutable release`, and the only way
  forward is a version bump.

`0.1.0` was lost exactly that way. The setting was enabled while the workflow
still published the release *before* uploading to it, so the release was created,
both uploads were rejected with `Cannot upload assets to an immutable release`
— and the job reported success with an empty, frozen release. Deleting it did
not give the number back. `0.1.1` is the first version that ever shipped.

> **Read the diff before you push.** `.planning/` contains the full development
> history — roadmaps, verification reports, threat registers. There is nothing
> secret in it, but it is verbose and it will be public. If you would rather it
> stayed private, `/gsd-pr-branch` builds a branch with those commits filtered
> out.

## 2. Generate the signing key pair

Ed25519. One key pair per plugin, so a leak costs you one plugin.

```bash
openssl genpkey -algorithm ed25519 -out private_key.pem
openssl pkey -in private_key.pem -pubout -out public_key.pem
```

The store wants the base64 body of the public key — the PEM without its header,
footer and newlines:

```bash
grep -v '^-----' public_key.pem | tr -d '\n'
```

It looks like `MCowBQYDK2VwAyEA…` (44 characters after the prefix).

Then, in the GitHub repository, add the **private** key as an Actions secret
named exactly `PRIVATE_KEY`:

```bash
gh secret set PRIVATE_KEY < private_key.pem
```

**The private key never enters this repository.** `.gitignore` should keep
`*.pem` out; verify with `git check-ignore -v private_key.pem` before committing
anything.

> A key pair was generated during this session purely to prove the round trip
> (sign the real zip, verify it, and confirm a tampered zip is rejected). It
> lives only in a scratch directory and is **not** the key you should ship —
> generate your own with the commands above, so no key that ever existed outside
> your control signs your releases.

## 3. Cut the first release

```bash
gh workflow run "🚀 Release"
```

The workflow, in order:

1. Runs `typecheck` and `lint`. **Not the test suite** — see below.
2. Runs `pnpm build`, writing `packages/dist/plugin_package.zip`.
3. Reads the version **from the built manifest**, and refuses to continue if the
   manifest id is not `defminer`, if the frontend is not linked to the backend,
   if the version is not three-part semver, or if the tag already exists.
4. Signs the zip with `PRIVATE_KEY` using
   `openssl pkeyutl -sign -rawin`.
5. Creates the release as a **draft** with `plugin_package.zip` and
   `plugin_package.zip.sig` attached — drafts stay mutable, published immutable
   releases do not accept uploads.
6. Publishes the draft, then asserts it carries exactly two assets. A green job
   over an empty release is the one failure worth failing loudly for.

The tag is the bare version — `0.1.1`, no `v` prefix — matching the starterkit.

## 4. Submit to the store

Fork [`caido/store`](https://github.com/caido/store), add one object to
`plugin_packages.json`, open a PR.

```json
{
  "id": "defminer",
  "name": "DefMiner",
  "license": "MIT",
  "description": "Passive JavaScript inventory for Caido: stores every script a target serves once by digest, reconstructs original sources from inline source maps, and retroactively scans traffic captured before it was installed.",
  "author": {
    "name": "six2dez",
    "email": "six2dez@gmail.com",
    "url": "https://github.com/six2dez"
  },
  "public_key": "PASTE_THE_BASE64_PUBLIC_KEY_HERE",
  "repository": "six2dez/DefMiner"
}
```

Every field is required by
[`schema.json`](https://github.com/caido/store/blob/main/schema.json). `id` must
match the `id` in `packages/caido.config.ts` (`defminer`), and `repository` is
`owner/repo`, not a URL.

> Caido reviews submissions and states plainly that they do not endorse store
> plugins. Expect questions; a README that is honest about what the plugin does
> *not* do makes that conversation shorter.

## 5. Releasing new versions

Once listed, you never touch `caido/store` again. To ship an update:

1. Bump `version` in **`packages/caido.config.ts`** — the single source of truth;
   the workflow reads the built manifest, so nothing else needs to agree.
2. Keep `package.json`'s version aligned if you like tidiness; nothing reads it.
3. `gh workflow run "🚀 Release"`.

The store polls the repository for new releases and picks them up.

If a release fails *after* the draft is published, that version number is spent:
immutability burns the tag whether or not the release survives. Bump again and
move on — nothing downstream pins a version.

---

## Why the workflow differs from the starterkit's

Three concrete reasons, so the next person to read it does not "fix" it back:

**Build output path.** The starterkit builds to `dist/plugin_package.zip`.
DefMiner builds to `packages/dist/` because `@caido-community/dev@0.1.7`
resolves plugin `root` relative to the build CWD and then deletes `<cwd>/dist`
before assembling the package — with `root: "."` the build deletes its own
output. The config lives at `packages/` to keep those two paths distinct.

**The root `dist/` is a different package entirely.** It holds the Phase 0
measurement probes (`parse-probe`, `redos-probe`, `mapbytes-probe`) built from
the *root* `caido.config.ts`. A workflow pointed at `dist/` would publish the
probes to the store under DefMiner's name. That is why the version step asserts
`manifest.id == "defminer"` before anything is signed.

**No `manifest.json` at the repository root.** The starterkit reads its version
with `jq -r .version manifest.json`. DefMiner's manifest is *generated* into
`packages/dist/plugin_package/` at build time from `packages/caido.config.ts`,
which is TypeScript and cannot be read with `jq`. Reading the built manifest
instead means the git tag and the shipped artifact can never disagree.

**The manifest link is asserted in CI.** `frontendPluginConfigSchema` declares
`backend` as `.nullable().optional()`, so omitting it is schema-valid: the build
succeeds, the zip is well-formed, and the manifest carries `"backend": null`.
The frontend then has no route to the backend and every RPC times out with no
error anywhere. That shipped in this repository and survived five verification
rounds, because every gate read source text or ran unit tests and none loaded
the packaged plugin. The check costs three lines.

## The six-hour hang, and why the suite is not on the release path

The first release attempt (`2026-09-04T23:11`) was killed by the Actions 6-hour
maximum. The log is unambiguous about where: `typecheck` finished in 8 s, `lint`
in 38 s, vitest printed its banner at `23:13:00.05` — and then produced **not one
further line** until the platform killed it at `05:12:08`.

It was never reproduced off the runner. The identical command completes locally
in thirteen seconds, and CI-shaped conditions (no `corpus/`, no `dist/`) make the
suite *fail* in thirteen seconds rather than hang.

The best-supported hypothesis is `tests/frontend-load.spec.ts`. It is the only
spec in the repository that spawns a **nested package manager** — `pnpm exec vite
build` — from inside a vitest worker, and a nested pnpm waiting on a store lock
held by its parent is a silent, unbounded hang that cannot happen with a warm
store. That is exactly the local/CI asymmetry. The catch: it was *already*
excluded by path on the failing run, so either the exclusion did not take on the
runner or the cause is something else again. Stated as a hypothesis rather than
a finding, because that is what it is.

Three changes followed, none of which depend on the hypothesis being right:

- **`timeout-minutes` on both jobs.** A job that hangs now fails in 15–20
  minutes. The failure mode "silent until the platform limit" is unreachable.
- **The suite moved to `ci.yml`**, on every push and PR. The upstream starterkit
  runs no tests on its release path either; a hang there is a nuisance, not the
  thing between a finished plugin and its users. `typecheck` and `lint` stay on
  the release path — they are deterministic, fast, and genuinely able to
  invalidate a build artifact.
- **The default reporter instead of `dot`.** `dot` buffers on a non-TTY, which
  is precisely why six hours of hang produced no clue about where it stopped.

## Known state at the time of writing

- The full suite is 91 files / 4,332 tests. `tests/frontend-load.spec.ts` is
  excluded from CI by glob: it is a frame-budget backstop that fails under
  parallel load and passes 12/12 in isolation, and it is the leading suspect for
  the hang above.
- `corpus/` is gitignored, so CI fetches the vendor bundles with
  `scripts/phase7/fetch-maps.sh` before running the suite. Without it 11 tests
  fail for a missing 40 MB of downloads rather than for anything real.
- The detection engine (secrets, endpoints) is **not implemented**. The README
  and the Help tab both say so. Do not let store copy imply otherwise.
