# Plugins: the contract, and why there is no loader

`@sah/plugin-sdk` defines a typed plugin contract. It does **not** load or
execute anything, and that is a deliberate decision rather than an unfinished
feature.

## The problem

A plugin for this toolkit would contribute _game facts_ — registry records
asserting that a locator exists, that a command takes certain arguments, that a
capability is supported.

The toolkit makes exactly one promise: it will not let unverified game content
into a build. A plugin system that can inject registry records is a plugin
system that can break that promise. Shipping a loader before that is solved
would trade the project's core guarantee for convenience.

## What a plugin may contribute

```ts
interface SahPlugin {
  metadata: PluginMetadata;
  registryContributions?: PluginRegistryContribution[];
  validators?: PluginValidator[];
  cliCommands?: PluginCliCommand[];
  mcpTools?: PluginMcpTool[];
}
```

Note the type of a contributed record's status:

```ts
verificationStatus: Exclude<VerificationStatus, 'verified'>;
```

A plugin can report what it has observed. It cannot certify a game fact on the
toolkit's behalf. That is enforced by the type system, not by convention.

## What a loader must satisfy before it is written

1. **Explicit opt-in per project.** Plugins are named in configuration.
   Discovery by scanning `node_modules` is not acceptable.
2. **Provenance attribution.** Every plugin-contributed record carries the
   plugin's identity in its provenance, so a build manifest shows exactly which
   third party asserted what.
3. **No execution during validate or build** unless the project enabled that
   plugin.
4. **No filesystem access outside the campaign workspace.** The same sandbox the
   MCP server uses.
5. **No silent overrides.** A plugin redefining a built-in registry record
   produces a diagnostic, not a quiet substitution.

Until all five hold, `PLUGIN_SYSTEM_STATUS.status` stays `planned` and no
third-party code runs.

## Prototyping today

You can write a plugin object against the interface and test it in isolation.
What you cannot do is have the toolkit load it. If you are building something
that needs this, open an issue — a concrete use case is the most useful input
for designing the sandbox.
