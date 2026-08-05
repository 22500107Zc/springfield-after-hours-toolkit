import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { registryEntrySchema, type RegistryEntry } from '@sah/schemas';

export class Registry {
  readonly entries: RegistryEntry[];
  constructor(entries: RegistryEntry[]) {
    this.entries = entries.map((entry) => registryEntrySchema.parse(entry));
  }
  static async fromFile(path: string): Promise<Registry> {
    const value: unknown = parse(await readFile(path, 'utf8'));
    return new Registry(Array.isArray(value) ? (value as RegistryEntry[]) : []);
  }
  get(kind: RegistryEntry['kind'], id: string): RegistryEntry | undefined {
    return this.entries.find((entry) => entry.kind === kind && entry.id === id);
  }
  search(kind: RegistryEntry['kind'], query: string): RegistryEntry[] {
    const needle = query.toLowerCase();
    return this.entries.filter(
      (entry) =>
        entry.kind === kind &&
        [entry.id, entry.displayName, ...entry.aliases].some((value) =>
          value.toLowerCase().includes(needle),
        ),
    );
  }
}
