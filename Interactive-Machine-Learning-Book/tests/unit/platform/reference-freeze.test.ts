import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import footprint from '../../../documentation/REFERENCE_FOOTPRINT.json';
import { findChapter } from '../../../src/curriculum/registry';

it('preserves the frozen reference while Parts extend their own manifests', () => {
  for (const [file, hash] of Object.entries(footprint.files)) expect(createHash('sha256').update(readFileSync(file)).digest('hex'), file).toBe(hash);
  expect(findChapter('III-07')?.slug).toBe(footprint.chapter.slug);
  const manifest = JSON.parse(readFileSync('oracle/p02/manifest.json', 'utf8'));
  for (const field of ['selfTests', 'goldenChecks'] as const)
    for (const file of footprint.requiredOracleEntries[field]) expect(manifest[field], `Reference oracle ${file}`).toContain(file);
});
