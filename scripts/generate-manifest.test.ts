import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '../src/sdui/components';

// Runs under Jest (not a plain node/tsx script) because react-native's own source uses
// Flow syntax that only Jest's babel-jest + jest-expo preset knows how to strip.
test('generates registry.manifest.json from the live component registry', () => {
  const manifest = {
    schemaVersion: '1.1.0',
    components: registry.list(),
  };

  expect(manifest.components.length).toBeGreaterThan(0);

  const outPath = join(__dirname, '..', 'registry.manifest.json');
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
});
