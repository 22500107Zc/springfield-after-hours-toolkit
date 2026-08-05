# Security policy

## Reporting

Report suspected vulnerabilities privately through GitHub's security advisory
process for this repository, rather than opening a public issue. Include what
you did, what happened, and what you expected.

There is no bounty. This is a volunteer fan project.

## Threat model

This is a local development tool, so the interesting risks are not network
attacks. They are:

### 1. A language model with filesystem access

The MCP server's caller is a model. Its inputs are treated as untrusted:

- Every path resolves through a sandbox confined to one workspace root.
  Traversal, absolute paths (both POSIX and Windows flavours), UNC prefixes and
  null bytes are refused.
- A configured game or Mod Launcher path is placed on a forbidden list, so no
  tool reaches it even by accident.
- **No MCP tool writes files.** Scaffolding tools return content for the client
  to write through its own reviewed edit flow.
- `compile_campaign` defaults to a dry run.
- No tool returns environment variables or credentials.

### 2. Credentials leaking into a repository

- `ANTHROPIC_API_KEY` is read from the environment only. It is never part of
  configuration, so it cannot be committed in a config file.
- `sah doctor` and `sah config` report _presence_, never value.
- The AI package redacts credential-shaped strings from prompts before anything
  leaves the machine.
- `.env`, `*.key` and `secrets/` are git-ignored.
- CI fails the build if a credential-shaped string is committed.

### 3. A build writing outside where it was told to

- Every generated path is resolved against the output directory and refused if
  it escapes.
- Asset copies are refused if the source is outside the campaign.
- The toolkit never writes to a game installation. It has no code path that does.

### 4. Untrusted plugin code

Not yet a risk, because **there is no plugin loader**. The contract is typed and
the requirements a loader must satisfy are documented in
`packages/plugin-sdk/src/index.ts`. Until those are met, no third-party code runs.

### 5. Supply chain

- Upstream Lua is fetched from pinned commits and verified against per-file
  SHA-256 hashes recorded in `data/upstream/upstream.lock.json`. A hash mismatch
  refuses to write the file.
- npm dependencies are pinned via `package-lock.json`; CI installs with `npm ci`.
- CI needs no secrets.

## What is not protected

- The toolkit does not sandbox the Lua it generates. That Lua runs inside the
  game via the Mod Launcher, under whatever protections the Launcher provides.
- Campaign YAML is trusted input. It is your own project file. Do not run
  `sah build` on a campaign from an untrusted source without reading it first —
  in particular its `assetDirectories`, which cause files to be copied.
- `npm run upstream:fetch` makes network requests, by design. It is never run
  automatically.

## Reporting something that is not a vulnerability

If you find a registry record that is wrong — a locator that does not exist, a
command with the wrong arity — that is not a security issue but it is a serious
correctness bug for this project. Open a normal issue with your source.
