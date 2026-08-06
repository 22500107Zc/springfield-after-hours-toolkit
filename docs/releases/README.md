# Publishing a release

Releases are published by manually dispatching the **Release** workflow
(`.github/workflows/release.yml`). Nothing publishes automatically — no push, no
merge, no schedule triggers it.

## How to publish

1. Go to **Actions → Release** in GitHub.
2. Click **Run workflow**.
3. Fill in three fields:

   | Field     | What to enter                                                   |
   | --------- | --------------------------------------------------------------- |
   | `version` | The tag to create, `vX.Y.Z` — e.g. `v0.1.0`                     |
   | `commit`  | The **full 40-character SHA** of the commit to release          |
   | `title`   | The release title, e.g. `Springfield After Hours Toolkit 0.1.0` |

4. Run it, and read the run summary. It prints the artifact checksums and the
   published release URL.

Or from a terminal, if you have the `gh` CLI:

```sh
gh workflow run release.yml \
  -f version=v0.1.0 \
  -f commit=6aa7cd4687a94474094fe6ca05a50a4afcc044e1 \
  -f title="Springfield After Hours Toolkit 0.1.0"
```

## Before you dispatch

Write the release notes first. The workflow reads them from
`docs/releases/<X.Y.Z>.md` **on the commit being released** — so
`v0.1.0` needs `docs/releases/0.1.0.md` to exist at that commit. The workflow
fails with a clear message if it does not, before anything is tagged.

## What the workflow refuses to do

Each of these stops the run before anything is published:

- **A version that is not `vX.Y.Z`.** No `1.0`, no `v1.0.0-beta`, no branch
  names.
- **A commit that is not a full 40-character SHA.** Releasing "whatever `main`
  points at right now" is not a thing you can ask for — you name the exact
  commit you verified.
- **A commit that is not an ancestor of `main`.** Only reviewed, merged code
  can be released.
- **A tag that already exists.** Published versions are immutable. If something
  is wrong with a release, publish a new version; never move a tag people may
  already have fetched.
- **A release that already exists** for that version.
- **A commit that does not pass its own checks.** `npm ci`, `npm run build` and
  `npm run check` all run against the commit being released, and the generated
  Lua definitions are confirmed current with `lua-defs generate --check` and
  `lua-defs check`, before the tag is created.

## Why the workflow checks out twice

The workflow checks out two things into separate directories:

- **`product/`** — the commit being released. This is what gets tested, tagged,
  and shipped. It does **not** contain the release workflow, and it must not
  need to: a release has to be reproducible from the verified product commit
  alone.
- **`packaging/`** — the ref the workflow was dispatched from. It holds the
  workflow itself and the artifact README.

Keeping them apart means release _packaging_ can be fixed or improved without
retagging the _product_. `v0.1.0` points at the commit that was verified green,
not at a later commit that happens to contain the tooling that published it.

## Artifacts

Three files are attached to every release:

| File                      | Where it comes from                                              |
| ------------------------- | ---------------------------------------------------------------- |
| `Game.meta.lua`           | The released commit, verified current before publishing          |
| `Game.meta.lua.README.md` | `docs/releases/artifacts/`, on the dispatch ref                  |
| `SHA256SUMS.txt`          | **Generated inside the workflow**, over the exact bytes uploaded |

The checksums are computed from the artifacts as uploaded, in the same job that
uploads them. They are never copied from a previous run, a person's notes, or an
earlier message — a checksum that is not derived from the artifact it describes
proves nothing.

## Verify a download

```sh
sha256sum -c SHA256SUMS.txt
```

## Security posture

- **Manual dispatch only** (`workflow_dispatch`). No push, pull request or
  schedule trigger exists.
- **`contents: write` and nothing else.** That is exactly enough to create a tag
  and a release.
- **The workflow's own `GITHUB_TOKEN`.** No personal access tokens, no
  repository secrets, nothing to leak or rotate.
- **Nothing is published to npm, and there is no VS Code Marketplace
  extension.** The toolkit is built from source; see the root
  [README](../../README.md).

## After publishing

The workflow verifies its own work before it finishes: it re-reads the release,
dereferences the annotated tag to confirm it targets the exact commit you named,
and confirms all three artifacts are attached. If any of that is wrong the run
fails loudly rather than leaving a half-published release looking fine.

## Past releases

- [0.1.0](0.1.0.md) — Game.lua Definitions and SHAR Pocket Tools
