# Connected-map compatibility

Campaigns can declare that they target an externally installed connected-map
mod. This repository does **not** contain, mirror, extract or redistribute any
such mod.

## Declaring the target

```yaml
campaign:
  compatibility:
    connectedMap:
      profile: fully-connected-map
      provider: user # always. The toolkit never bundles it.
      status: unverified
```

## Current profile status

Both recorded profiles are placeholders with status `unverified`:

- **Fully Connected Map** — no map ids, no locators, no locator mappings
- **Full Game Plus** — no behavioural claims

They are deliberately empty. Populating them by guessing would be exactly the
failure the toolkit exists to prevent, and the map ids and locator mappings a
connected-map mod introduces are precisely the kind of thing nobody should
infer.

See [`data/registries/compatibility-profiles.yaml`](../../data/registries/compatibility-profiles.yaml).

## Populating a profile

This needs someone with the mod installed.

1. Point the toolkit at your installation:

   ```sh
   export SAH_CONNECTED_MAP_PATH=/path/to/your/install
   sah doctor        # confirms it is found
   ```

   The toolkit reads nothing from it unless you explicitly ask it to.

2. Inspect the mod's **configuration and script metadata** — `Meta.ini`,
   `CustomFiles.ini`, Lua scripts. These describe how the mod is put together.

3. Record findings with provenance, using `sourceType: user-supplied-mod-file`
   and describing the file precisely (mod name, version, path within the mod).
   Status should be `community-reported` or `experimental` unless the mod's own
   documentation states it.

4. **Never copy the mod's assets into this repository.** You are recording
   identifiers and relationships — facts about how the mod is structured — not
   redistributing content.

## Attribution

A compatibility profile requires an `attribution` field. Crediting the people
whose work a campaign depends on is not optional.
