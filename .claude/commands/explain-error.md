---
description: Explain a validation diagnostic and what to do about it
argument-hint: '<diagnostic code>   e.g. SAH2001'
allowed-tools: Bash(node packages/cli/dist/bin.js:*), Read, Grep
---

Explain diagnostic `$1`.

1. Run `node packages/cli/dist/bin.js explain $1 --json`.
2. If the user has a campaign open, find where it actually fires and quote the
   offending line.
3. Explain the _reason_ the toolkit treats it this way, not just the rule. Most
   of these codes exist to stop a mod being generated that loads in the game and
   then silently cannot be completed.
