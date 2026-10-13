import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { registerParts } from '../src/curriculum/manifests.mjs';
import { files } from './production-state.mjs';

export function publishedParts(root = '.') {
  const manifests = {};
  for (const entry of readdirSync(join(root, 'src/parts'), { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const file = join(root, 'src/parts', entry.name, 'manifest.json');
    if (existsSync(file)) manifests[`../parts/${entry.name}/manifest.json`] = JSON.parse(readFileSync(file, 'utf8'));
  }
  return registerParts(manifests).filter(part => part.chapters.some(chapter => chapter.slug));
}

export function checkPartCoverage(root = '.') {
  const parts = publishedParts(root);
  if (!parts.length) throw new Error('No published Part exists');
  const allowed = new Set(parts.map(part => part.id));
  for (const entry of readdirSync(join(root, 'oracle'), { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name !== '__pycache__'))
    if (!allowed.has(entry.name)) throw new Error(`Unexpected oracle directory: ${entry.name}`);
  for (const part of parts) {
    if (!existsSync(join(root, 'oracle', part.id, 'manifest.json'))) throw new Error(`Missing oracle manifest: ${part.id}`);
    for (const [directory, suffix] of [['tests/unit', '.test.ts'], ['tests/e2e', '.spec.ts']])
      if (!files(join(root, directory, part.id)).some(file => file.endsWith(suffix))) throw new Error(`Missing Part suite: ${directory}/${part.id}`);
  }
  return parts;
}
