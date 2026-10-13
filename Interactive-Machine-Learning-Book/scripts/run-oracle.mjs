import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkPartCoverage } from './part-inventory.mjs';
const part = process.argv[2];
if (part && !/^p0[1-9]$/.test(part)) throw new Error('Oracle selection must be p01..p09');
const localPython = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
const python = process.env.BOOK_PYTHON ?? (existsSync(localPython) ? resolve(localPython) : 'python3');
const parts = checkPartCoverage().filter(owner => !part || owner.id === part);
if (!parts.length) throw new Error('No oracle Part selected');
let checks = 0;
for (const owner of parts) {
  const directory = `oracle/${owner.id}`;
  const manifest = JSON.parse(readFileSync(`${directory}/manifest.json`, 'utf8'));
  for (const [field, args] of [['selfTests', []], ['goldenChecks', ['--check']]]) {
    if (!Array.isArray(manifest[field]) || manifest[field].length === 0) throw new Error(`${directory} needs ${field}`);
    for (const file of manifest[field]) {
      if (typeof file !== 'string' || !/^[a-zA-Z0-9_]+\.py$/.test(file) || !existsSync(`${directory}/${file}`)) throw new Error(`Invalid oracle file: ${file}`);
      const result = spawnSync(python, ['-B', `${directory}/${file}`, ...args], { stdio: 'inherit', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
      if (result.error) throw result.error;
      if (result.status !== 0) process.exit(result.status ?? 1);
      checks++;
    }
  }
}
console.log(`Independent oracle commands passed: ${checks} across ${parts.length} Part(s).`);
