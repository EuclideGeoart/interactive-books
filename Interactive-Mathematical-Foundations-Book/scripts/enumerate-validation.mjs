import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [action = 'capture', label = 'current'] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple lowercase label');
const read = name => JSON.parse(readFileSync(`validation-results/${name}-enumeration.json`, 'utf8')).enumeration;
const key = test => `${test.project} | ${test.file} | ${test.title}`;
const normalizedKey = test => key({ ...test, title: test.title.replace('read-only checks › ', '').replace(/ › route batch \d+\/\d+$/, '') });
const digest = tests => createHash('sha256').update(tests.map(key).sort().join('\n')).digest('hex');
const same = (expected, actual, message) => assert.deepEqual([...new Set(actual)].sort(), [...new Set(expected)].sort(), message);
const visuals = test => /\/visual[^/]*\.spec\.ts$/.test(test.file);
mkdirSync('validation-results', { recursive: true });

if (action === 'capture') {
  for (const deployment of ['root', 'subpath']) {
    for (const shard of [null, ...(label === 'before' ? [] : ['1/3', '2/3', '3/3'])]) {
      const name = `${label}-${deployment}${shard ? '-shard-' + shard[0] : ''}`;
      const args = ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter', './scripts/timing-reporter.mjs'];
      if (deployment === 'subpath') args.push('--config', 'playwright.subpath.config.ts');
      if (shard) args.push('--shard', shard);
      const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, BOOK_TIMING_OUTPUT: `validation-results/${name}-enumeration.json` } });
      assert.equal(result.status, 0, 'Enumeration failed: ' + name);
      console.log(`${name}: ${read(name).length} cases (discovery only; not a test run)`);
    }
  }
} else if (action === 'compare') {
  const beforeRoot = read('before-root'), beforeSubpath = read('before-subpath');
  const root = read(label + '-root'), subpath = read(label + '-subpath');
  same(beforeRoot.map(normalizedKey), root.map(normalizedKey), 'A root behavior was lost or changed without an explicit mapping');
  same(beforeSubpath.filter(test => !visuals(test)).map(normalizedKey), subpath.map(normalizedKey), 'A subpath functional behavior was lost');
  assert.equal(subpath.filter(visuals).length, 0, 'Root-authoritative visuals still duplicated at the subpath');
  const shards = {};
  for (const [deployment, expected] of [['root', root], ['subpath', subpath]]) {
    const parts = [1, 2, 3].map(index => read(`${label}-${deployment}-shard-${index}`));
    const all = parts.flat().map(key);
    assert.equal(new Set(all).size, all.length, 'Overlapping native shards: ' + deployment);
    same(expected.map(key), all, 'Native shard union lost coverage: ' + deployment);
    shards[deployment] = { counts: parts.map(part => part.length), disjoint: true, completeUnion: true };
  }
  const result = {
    comparison: 'Phase A (6d18b60) enumeration to final T0; no full browser execution',
    startingMilestone: { root: 2364, subpath: 2322, affineNewCases: beforeRoot.filter(test => /affine composition agrees|affine translated squares/.test(test.title)).map(key) },
    before: { root: beforeRoot.length, subpath: beforeSubpath.length, rootSHA256: digest(beforeRoot), subpathSHA256: digest(beforeSubpath) },
    after: { root: root.length, subpath: subpath.length, rootSHA256: digest(root), subpathSHA256: digest(subpath) },
    unchangedNormalizedRootBehaviors: new Set(root.map(normalizedKey)).size,
    unchangedNormalizedSubpathFunctionalBehaviors: new Set(subpath.map(normalizedKey)).size,
    readOnlyMapping: { insertedNamespace: 'read-only checks', independentCasesRetained: root.filter(test => test.title.includes('read-only checks › ')).length,
      checks: [...new Set(root.filter(test => test.title.includes('read-only checks › ')).map(test => test.title.split('read-only checks › ')[1]))] },
    deploymentMapping: { previousCase: 'every internal link, script and stylesheet resolves, stays under the base path, and never leaves the origin',
      newCases: root.filter(test => test.title.includes(' › route batch ')).map(key), routeBatchSize: 8, allRoutesRequired: true },
    subpathVisualsMovedToRootOnly: beforeSubpath.filter(visuals).map(key), missingBehaviors: [], shards,
  };
  writeFileSync('documentation/T0_TEST_ENUMERATION.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} else throw new Error('Usage: npm run validation:enumerate -- capture <label> | compare <label>');
