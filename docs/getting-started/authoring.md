# Campaign authoring

Run `sah init my-campaign`, edit `campaign.yaml`, then run `sah validate`. Registry IDs use lowercase kebab-case. Every character, vehicle, locator, dialogue, and objective reference must resolve. `noop` exists only as a non-playable compiler fixture; planned objectives fail validation.

`sah build --dry-run --json` previews every output file. A real build clears only the selected build directory, writes files in stable order, and includes SHA-256 hashes in `sah-build-manifest.json`.
