import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { changedFiles, makePlan } from './validation-plan.mjs';
import { freshBuild, recordBuild } from './production-state.mjs';

const args = process.argv.slice(2);
const mode = args.shift() ?? 'focused';
const options = { mode, chapters: [] };
let base = 'HEAD', dry = false, locked = false, shard;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--dry-run') dry = true;
  else if (arg === '--locked') locked = true;
  else if (['--chapter', '--project', '--only', '--base', '--shard'].includes(arg)) {
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + arg);
    if (arg === '--chapter') options.chapters.push(value);
    else if (arg === '--base') base = value;
    else if (arg === '--shard') shard = value;
    else options[arg.slice(2)] = value;
  } else throw new Error('Unknown option: ' + arg);
}
if (shard && (!/^[1-9]\d*\/[1-9]\d*$/.test(shard) || !process.env.CI || !options.only || options.only.split(',').some(phase => !['browser', 'visual'].includes(phase))))
  throw new Error('--shard requires CI and --only browser,visual (or either phase); mathematical/production gates run once in the build job.');
if (shard && Number(shard.split('/')[0]) > Number(shard.split('/')[1])) throw new Error('Shard index exceeds shard count');
if (!dry && !locked) {
  const result = spawnSync('flock', ['/tmp/imf-heavy.lock', process.execPath, process.argv[1], mode, ...args, '--locked'], { stdio: 'inherit' });
  if (result.error) throw new Error('Local validation requires flock; run the documented native commands serially on other hosts. ' + result.error.message);
  process.exit(result.status ?? 1);
}
const manifest = makePlan({ ...options, files: changedFiles(base) });
const run = new Date().toISOString().replaceAll(/[:.]/g, '-');
const directory = `validation-results/${mode}-${run}`;
mkdirSync(directory, { recursive: true });
manifest.base = base;
manifest.shard = shard ?? null;
manifest.partial ||= Boolean(shard);
manifest.results = [];
const save = () => writeFileSync(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
save();
console.log(`Affected-test manifest: ${directory}/manifest.json`);
console.log(JSON.stringify({ mode, partial: manifest.partial, conservativeExpansion: manifest.conservativeExpansion,
  chapters: manifest.chapters, crossChapterContracts: manifest.crossChapterContracts, unitFiles: manifest.units.length, oracles: manifest.oracles,
  gates: manifest.commands.map(command => command.gate) }, null, 2));
if (dry) process.exit(0);
const runCommand = (gate, command, env = process.env) => {
  console.log(`\n${gate}: ${command.join(' ')}`);
  const start = Date.now(), result = spawnSync(command[0], command.slice(1), { stdio: 'inherit', env });
  manifest.results.push({ gate, command, status: result.status ?? 1, wallMs: Date.now() - start, error: result.error?.message });
  save();
  if (result.error || result.status !== 0) { console.error(`Failed selected gate: ${gate}. Failure screenshots are retained in ${directory}.`); process.exit(result.status ?? 1); }
};
const ensured = new Set();
function ensureProduction(deployment) {
  if (ensured.has(deployment)) return;
  const dist = deployment === 'root' ? 'dist' : 'dist-subpath', base = deployment === 'root' ? '/' : '/math-foundations/';
  const env = { ...process.env, BOOK_BASE: base };
  if (!freshBuild(dist, base)) {
    runCommand(`refresh ${deployment} production`, [process.execPath, deployment === 'root' ? 'node_modules/astro/astro.js' : 'scripts/build-subpath.mjs', ...(deployment === 'root' ? ['build'] : [])], env);
    recordBuild(dist, base);
  } else console.log(`Reusing source-matched ${deployment} production output.`);
  ensured.add(deployment);
}
for (const [index, item] of manifest.commands.entries()) {
  const deployment = item.deployment ?? (item.command[1] === 'scripts/check-dist.mjs' ? item.command[2] === 'dist' ? 'root' : 'subpath' : null);
  if (deployment) ensureProduction(deployment);
  let command = [...item.command], env = process.env;
  if (item.deployment) {
    const subpath = item.deployment === 'subpath';
    env = { ...process.env, BOOK_TEST_PORT: subpath ? '4452' : '4451', BOOK_TEST_DIST: subpath ? 'dist-subpath' : 'dist', BOOK_TEST_BASE: subpath ? '/math-foundations/' : '/' };
    command.push('--output', `${directory}/${index}-failures`);
    if (shard) command.push('--shard', shard);
  }
  runCommand(item.gate, command, env);
}
manifest.status = 'passed';
save();
console.log(`Passed ${manifest.commands.length} selected gates (${mode}${manifest.partial || shard ? ', partial coverage' : ''}). No unselected suite is claimed.`);
