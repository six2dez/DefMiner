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

1. Runs `typecheck`, `lint` and the test suite.
2. Runs `pnpm build`, writing `packages/dist/plugin_package.zip`.
3. Reads the version **from the built manifest**, and refuses to continue if the
   manifest id is not `defminer`, if the frontend is not linked to the backend,
   if the version is not three-part semver, or if the tag already exists.
4. Signs the zip with `PRIVATE_KEY` using
   `openssl pkeyutl -sign -rawin`.
5. Creates a GitHub release tagged with the version, attaching
   `plugin_package.zip` and `plugin_package.zip.sig`.

The tag is the bare version — `0.1.0`, no `v` prefix — matching the starterkit.

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

## Known state at the time of writing

- The full suite is 91 files / 4,332 tests. `tests/frontend-load.spec.ts` is a
  frame-budget backstop that fails under parallel load and passes 12/12 in
  isolation; the release workflow excludes it explicitly rather than silently.
- The detection engine (secrets, endpoints) is **not implemented**. The README
  and the Help tab both say so. Do not let store copy imply otherwise.
