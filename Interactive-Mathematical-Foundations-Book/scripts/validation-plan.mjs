import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

export const families = {
  quantity: { lesson: 'quantities', units: /^quantity/, oracles: ['quantity'], browser: 'quantities' },
  coordinates: { lesson: 'coordinates', units: /^coordinates/, oracles: ['coordinates'], browser: 'coordinates' },
  vectors: { lesson: 'vectors', units: /^(vectors?-lesson|vector2|direction)/, oracles: ['vector2', 'direction'], browser: 'vectors' },
  algebra: { lesson: 'algebra', units: /^algebra/, oracles: ['algebra'], browser: 'algebra' },
  functions: { lesson: 'functions', units: /^functions/, oracles: ['functions'], browser: 'functions' },
  families: { lesson: 'families', units: /^families/, oracles: ['families'], browser: 'function-families' },
  sets: { lesson: 'sets', units: /^sets/, oracles: ['sets'], browser: 'sets-and-relations' },
  summation: { lesson: 'summation', units: /^summation/, oracles: ['summation'], browser: 'summation' },
  notation: { lesson: 'notation', units: /^notation/, oracles: ['notation'], browser: 'notation-map' },
  linear_algebra: { lesson: 'linear-algebra', units: /^linear-algebra/, oracles: ['linear_algebra'], browser: 'linear-algebra' },
  matrices: { lesson: 'linear-algebra', stage: 'MatrixStage', units: /^matri/, oracles: ['matrices'], browser: 'matrices' },
  elimination: { lesson: 'linear-algebra', stage: 'EliminationStage', units: /^elimination/, oracles: ['elimination'], browser: 'elimination' },
  eigenvalues: { lesson: 'linear-algebra', stage: 'EigenStage', units: /^eigen/, oracles: ['eigenvalues'], browser: 'eigenvalues' },
  least_squares: { lesson: 'linear-algebra', stage: 'LeastSquaresStage', units: /^least-squares/, oracles: ['least_squares'], browser: 'least-squares' },
  svd: { lesson: 'linear-algebra', stage: 'SVDStage', units: /^svd/, oracles: ['svd'], browser: 'svd' },
  optimization_landscapes: { lesson: 'optimization', kinds: ['landscapes', 'optima', 'convexity'], units: /^optimization-(objectives|landscapes|lesson|exercises)/, oracles: ['optimization_landscapes'], browser: 'optimization' },
  optimization_descent: { lesson: 'optimization', kinds: ['descent', 'rate'], units: /^optimization-(descent|dynamics|lesson|exercises)/, oracles: ['optimization_landscapes', 'optimization_dynamics'], browser: 'optimization' },
  optimization_constraints: { lesson: 'optimization', kinds: ['constraints','diagnostics'], units: /^optimization-(constraints|descent|lesson|exercises)/, oracles: ['optimization_constraints'], browser: 'optimization' },
  optimization_dynamics: { lesson: 'optimization', kinds: ['momentum', 'stochastic', 'adam'], units: /^optimization-(dynamics|lesson|exercises)/, oracles: ['optimization_dynamics'], browser: 'optimization' },
  // Part III: several families share src/lessons/calculus/; each chapter's thin wrapper stage names its family and visual kind.
  limits: { lesson: 'calculus', stages: { LimitStage: 'limits', ContinuityStage: 'continuity' }, units: /^limits/, oracles: ['limits'], browser: 'limits' },
  derivatives: { lesson: 'calculus', stages: { SecantStage: 'secant', LinearModelStage: 'linear-model', RulesStage: 'rules', ChainStage: 'chain', FiniteDifferenceStage: 'finite-difference' }, units: /^derivatives/, oracles: ['derivatives'], browser: 'derivatives' },
  multivariable: { lesson: 'calculus', stages: { PartialStage: 'partials', GradientStage: 'gradient', JacobianStage: 'jacobian', HessianStage: 'hessian' }, units: /^multivariable/, oracles: ['multivariable'], browser: 'multivariable' },
  autodiff: { lesson: 'calculus', stages: { AutodiffStage: 'autodiff' }, units: /^autodiff/, oracles: ['autodiff'], browser: 'autodiff' },
  integration: { lesson: 'calculus', stages: { RiemannStage: 'riemann', AccumulationStage: 'accumulation', QuadratureStage: 'quadrature' }, units: /^integration/, oracles: ['integration'], browser: 'integration' },
  probability_finite: { lesson: 'probability', stage: 'FiniteStage', units: /^probability-(finite|block-a)/, oracles: ['probability_finite'], browser: 'probability-finite' },
  probability_counting: { lesson: 'probability', stage: 'CountingStage', units: /^probability-counting/, oracles: ['probability_finite'], browser: 'probability-finite' },
  probability_bayes: { lesson: 'probability', stage: 'BayesStage', units: /^probability-bayes/, oracles: ['probability_finite'], browser: 'probability-finite' },
  probability_variables: { lesson: 'probability', stage: 'RandomVariableStage', units: /^probability-(variables|moments|block-b)/, oracles: ['probability_moments'], browser: 'probability-distributions' },
  probability_distributions: { lesson: 'probability', stage: 'DistributionStage', units: /^probability-(distributions|block-b)/, oracles: ['probability_distributions'], browser: 'probability-distributions' },
  probability_moments: { lesson: 'probability', stage: 'MomentsStage', units: /^probability-(moments|block-b)/, oracles: ['probability_moments'], browser: 'probability-distributions' },
  probability_joint: { lesson: 'probability', stage: 'JointStage', units: /^probability-(joint|block-c)/, oracles: ['probability_joint'], browser: 'probability-sampling' },
  probability_sampling: { lesson: 'probability', stage: 'SamplingStage', units: /^probability-(sampling|block-c)/, oracles: ['probability_sampling'], browser: 'probability-sampling' },
};
const calculusFamilies = Object.keys(families).filter(name => families[name].lesson === 'calculus');
/** Part III wrapper stage named by an MDX source, with its family and visual kind. */
const calculusStage = source => {
  for (const family of calculusFamilies) for (const [stage, kind] of Object.entries(families[family].stages))
    if (new RegExp(`lessons/calculus/${stage}['"]`).test(source)) return { family, kind };
  return undefined;
};
/** Families whose deep interactions/visuals are selected by exact chapter id rather than by whole spec file. */
const idScoped = ['matrices', 'linear_algebra', 'elimination', 'eigenvalues', 'least_squares', 'svd', ...calculusFamilies];
/** @param {string} dir @returns {string[]} */
export const walk = dir => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name).replaceAll('\\', '/');
  return entry.isDirectory() ? walk(path) : entry.isFile() ? [path] : [];
}) : [];
const text = path => readFileSync(path, 'utf8');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @returns {{id: string, slug: string, path: string, family: string | undefined, kind: string | undefined}[]} */
export function chapterCatalog() {
  return walk('src/content/chapters').filter(path => path.endsWith('.mdx')).flatMap(path => {
    const source = text(path), id = /^curriculumId: ([IVX]+\.\d+)\r?$/m.exec(source)?.[1];
    if (!id) return [];
    const lesson = /lessons\/([^/]+)\//.exec(source)?.[1];
    const calculus = lesson === 'calculus' ? calculusStage(source) : undefined;
    const optimizationKind = lesson === 'optimization' ? /<OptimizationStage chapter="([^"]+)"/.exec(source)?.[1] : undefined;
    const optimization = optimizationKind ? Object.keys(families).find(name => families[name].lesson === lesson && families[name].kinds?.includes(optimizationKind)) : undefined;
    const stageOwned = ['linear-algebra', 'probability'].includes(lesson);
    const family = optimization ?? (calculus ? calculus.family : stageOwned
      ? Object.keys(families).find(name => families[name].lesson === lesson && families[name].stage && source.includes('/' + families[name].stage)) ?? (lesson === 'linear-algebra' ? 'linear_algebra' : undefined)
      : Object.keys(families).find(name => families[name].lesson === lesson));
    const slug = posix.basename(path, '.mdx');
    const kind = optimizationKind ?? (calculus ? calculus.kind
      : (/<(?:MatrixStage|LinearStage|EliminationStage|FiniteStage|DistributionStage|MomentsStage|JointStage|SamplingStage) chapter="([^"]+)"/.exec(source)?.[1]
        ?? (family === 'eigenvalues' ? 'eigenvalues' : family === 'least_squares' ? 'least-squares' : family === 'svd' ? 'svd' : lesson === 'probability' ? slug : undefined)));
    return [{ id, slug, path, family, kind }];
  });
}

/**
 * A linked worktree shares the canonical checkout's installed dependencies through two untracked SYMLINKS at the book root. `.gitignore`'s
 * `node_modules/` and `.venv/` patterns match directories only, so Git lists the links as untracked. They are environment, not source:
 * skip exactly these two paths (only when they are symbolic links), and nothing else.
 */
export const environmentLink = path => ['node_modules', '.venv'].includes(path) && existsSync(path) && lstatSync(path).isSymbolicLink();
export function changedFiles(base = 'HEAD') {
  const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const options = { cwd: gitRoot, encoding: 'utf8' };
  const tracked = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', base, '--', '.'], options);
  const untracked = execFileSync('git', ['ls-files', '--full-name', '--others', '--exclude-standard', '-z', '--', '.'], options);
  return [...new Set((tracked + untracked).split('\0').filter(Boolean).map(path => relative(process.cwd(), resolve(gitRoot, path)).replaceAll('\\', '/')))]
    .filter(path => !environmentLink(path)).sort();
}

// Follow literal local imports, including ?raw samples. Unrecognised inputs expand to all coverage below.
function dependencies() {
  const files = new Set([...walk('src'), ...walk('tests/unit'), ...walk('code'), ...walk('fixtures')]);
  const imports = new Map();
  for (const file of files) {
    if (!/\.(ts|tsx|mjs|astro|mdx|css)$/.test(file)) continue;
    const targets = [];
    for (const match of text(file).matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|@import\s*)['"]([^'"]+)['"]/g)) {
      if (!match[1].startsWith('.')) continue;
      const stem = posix.normalize(posix.join(posix.dirname(file), match[1].split('?')[0]));
      const target = [stem, ...['.ts', '.tsx', '.mjs', '.astro', '.mdx', '.css', '/index.ts', '/index.tsx'].map(ext => stem + ext)].find(path => files.has(path));
      if (target) targets.push(target);
    }
    imports.set(file, targets);
  }
  return root => {
    const seen = new Set();
    const visit = file => { if (seen.has(file)) return; seen.add(file); for (const next of imports.get(file) ?? []) visit(next); };
    visit(root);
    return seen;
  };
}

function familyOfFile(path) {
  const base = posix.basename(path);
  if (/^src\/(lessons|math)\/optimization\//.test(path)) {
    if (base === 'objectives.ts') return 'optimization_landscapes';
    if (base === 'descent.ts') return 'optimization_descent';
    if (base === 'constraints.ts') return 'optimization_constraints';
    if (base === 'dynamics.ts') return 'optimization_dynamics';
    return null;
  }
  if (/^src\/(lessons|math)\/calculus\//.test(path)) {
    // Shared calculus presentation/models return null: their literal importers decide the affected chapters.
    const stage = calculusFamilies.find(name => Object.keys(families[name].stages).some(s => base.startsWith(s + '.')));
    if (stage) return stage;
    return calculusFamilies.find(name => base.startsWith(name + '-') || base.startsWith(name + '.')) ?? null;
  }
  if (path.startsWith('tests/unit/')) return Object.keys(families).find(name => families[name].units.test(base));
  if (path.startsWith('tests/e2e/')) return Object.keys(families).find(name => base === families[name].browser + '.spec.ts');
  if (/^(oracle|fixtures)\//.test(path)) return Object.keys(families).find(name => families[name].oracles.some(oracle => base.startsWith(oracle + '.') || base === oracle + '_oracle.py' || base === 'test_' + oracle + '_oracle.py'));
  if (/^src\/(lessons|math)\/linear-algebra\//.test(path)) {
    if (/^(completion|Completion)|\.css$/.test(base)) return null;
    if (/^(elimination|Elimination)/.test(base)) return 'elimination';
    if (/^(eigen|Eigen)/.test(base)) return 'eigenvalues';
    if (/^(least-squares|LeastSquares)/.test(base)) return 'least_squares';
    if (/^(svd|SVD)/.test(base)) return 'svd';
    return /^(matri|Matri)/.test(base) ? 'matrices' : 'linear_algebra';
  }
  if (/^src\/(lessons|math)\/probability\//.test(path)) {
    if (/^(finite|Finite)/.test(base)) return 'probability_finite';
    if (/^(counting|Counting)/.test(base)) return 'probability_counting';
    if (/^(bayes|Bayes)/.test(base)) return 'probability_bayes';
    if (/^(distributions|Distribution)/.test(base)) return 'probability_distributions';
    if (/^(variables|RandomVariable)/.test(base)) return 'probability_variables';
    if (/^(moments|Moments)/.test(base)) return 'probability_moments';
    if (/^(joint|Joint)/.test(base)) return 'probability_joint';
    if (/^(sampling|Sampling)/.test(base)) return 'probability_sampling';
    return null;
  }
  return Object.keys(families).find(name => path.startsWith('src/lessons/' + families[name].lesson + '/') ||
    path.startsWith('src/math/' + (name === 'vectors' ? 'vector2' : name) + '/'));
}

/** @param {{mode?: string, files?: string[], chapters?: string[], only?: string, project?: string, catalog?: ReturnType<typeof chapterCatalog>}} [options] */
export function makePlan({ mode = 'focused', files = [], chapters = [], only, project, catalog = chapterCatalog() } = {}) {
  if (!['focused', 'milestone', 'exhaustive'].includes(mode)) throw new Error('Unknown validation mode: ' + mode);
  if (project && !['desktop', 'tablet', 'mobile'].includes(project)) throw new Error('Unknown project: ' + project);
  const phases = only ? only.split(',') : ['math', 'browser', 'visual', ...(mode !== 'focused' ? ['production'] : [])];
  if (phases.some(phase => !['math', 'browser', 'visual', 'production'].includes(phase))) throw new Error('Unknown --only phase');
  const selected = new Set(), groups = new Set(), units = new Set(), reasons = [];
  let broad = mode === 'exhaustive', shared = false;
  const unitFiles = walk('tests/unit').filter(path => path.endsWith('.test.ts'));
  const closure = dependencies();
  const chapterDeps = new Map(catalog.map(chapter => [chapter.id, closure(chapter.path)]));
  for (const value of chapters) {
    const chapter = catalog.find(item => item.id === value || item.slug === value);
    if (!chapter) throw new Error('Unknown or unpublished chapter: ' + value);
    selected.add(chapter.id);
    if (chapter.family) groups.add(chapter.family); else broad = true;
    reasons.push(`${chapter.id}: explicitly requested (additive, never hides detected changes)`);
  }
  for (const file of files) {
    if (file === 'documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md') {
      broad = true;
      reasons.push(`${file}: executable curriculum authority; expanded to all coverage`);
    } else
    if (/^(documentation\/|README\.md$|.*\.md$)/.test(file)) { reasons.push(`${file}: documentation only`); continue; }
    if (/^(src\/content\/|code\/|oracle\/|fixtures\/)/.test(file)) units.add('tests/unit/content.test.ts');
    if (file.startsWith('tests/e2e/__screenshots__/') && file.endsWith('.png')) {
      if(file.startsWith('tests/e2e/__screenshots__/visual.spec.ts/')&&/^(desktop|tablet|mobile)-(home-fold(?:-dark)?|contents-fold|map)\.png$/.test(posix.basename(file))){
        shared=true;reasons.push(`${file}: known publication/shell visual; all math/contracts and authoritative root visuals`);continue;
      }
      const image = posix.basename(file).replace(/^(desktop|tablet|mobile)-/, '');
      const targets = catalog.filter(chapter => image.startsWith(`part-i-${chapter.slug}.`) ||
        image.startsWith(`iv-${chapter.slug}.`) || image.startsWith(`iv-${chapter.slug}-`) ||
        image.startsWith(`vi-${chapter.slug}.`) || image.startsWith(`vi-${chapter.slug}-`) ||
        (chapter.kind && calculusFamilies.includes(chapter.family) && (image.startsWith(`iii-calculus-${chapter.kind}.`) || image.startsWith(`iii-calculus-${chapter.kind}-`))) ||
        (chapter.kind && !calculusFamilies.includes(chapter.family) && !chapter.family?.startsWith('probability_') && image.startsWith(`ii-${chapter.family === 'matrices' ? 'matrix-' : ['elimination', 'eigenvalues', 'least_squares', 'svd'].includes(chapter.family) ? 'completion-' : ''}${chapter.kind}`)) ||
        (chapter.slug === 'vectors' && image.startsWith('chapter-')));
      if (targets.length) {
        for (const chapter of targets) { selected.add(chapter.id); if (chapter.family) groups.add(chapter.family); }
        reasons.push(`${file}: affected platform-specific visual cases`);
        continue;
      }
    }
    if ((/^tests\/unit\/calculus-[\w-]+\.test\.ts$/.test(file) || file === 'tests/e2e/calculus-helpers.ts') && existsSync(file)) {
      if (file.startsWith('tests/unit/')) units.add(file);
      for (const chapter of catalog.filter(item => calculusFamilies.includes(item.family) || (file === 'tests/e2e/calculus-helpers.ts' && item.family?.startsWith('optimization_')))) { selected.add(chapter.id); groups.add(chapter.family); }
      reasons.push(`${file}: shared Part III test support; all calculus chapters`);
      continue;
    }
    if (!existsSync(file)) { broad = true; reasons.push(`${file}: deleted/unresolved file; expanded conservatively`); }
    if (/^(src\/(ui|platform|shell|curriculum|pages)\/|src\/styles\/(?!chapters\/)|public\/)/.test(file) || [
      '../.gitignore', 'astro.config.mjs', 'vitest.config.ts',
      'scripts/validation-plan.mjs', 'scripts/measure-probability-input.mjs',
      'tests/unit/validation-plan.test.ts', 'tests/unit/curriculum.test.ts', 'tests/unit/completion-exercises.test.ts',
      'tests/e2e/chapters.spec.ts', 'tests/e2e/visual-linear-algebra.spec.ts',
      'tests/e2e/visual-calculus.spec.ts', 'tests/e2e/visual-probability.spec.ts', 'tests/e2e/visual-optimization.spec.ts',
    ].includes(file)) {
      shared = true;
      reasons.push(`${file}: known shared infrastructure; all math/contracts, representative interactions/axe, all root visuals`);
      continue;
    }
    const matches = catalog.filter(chapter => chapterDeps.get(chapter.id).has(file));
    for (const chapter of matches) { selected.add(chapter.id); if (chapter.family) groups.add(chapter.family); else broad = true; }
    for (const unit of unitFiles) if (closure(unit).has(file)) units.add(unit);
    const own = familyOfFile(file);
    const owners = /^(oracle|fixtures)\//.test(file) ? Object.keys(families).filter(name => families[name].oracles.some(oracle => posix.basename(file).startsWith(oracle + '.') || posix.basename(file) === oracle + '_oracle.py' || posix.basename(file) === 'test_' + oracle + '_oracle.py'))
      : file.startsWith('tests/e2e/') ? Object.keys(families).filter(name => posix.basename(file) === families[name].browser + '.spec.ts') : own ? [own] : [];
    for (const owner of owners) groups.add(owner);
    if (matches.length === 0 && owners.length) for (const chapter of catalog.filter(item => owners.includes(item.family))) selected.add(chapter.id);
    if (file.startsWith('tests/unit/') && unitFiles.includes(file)) units.add(file);
    if (matches.length || owners.length) { reasons.push(`${file}: ${matches.length ? matches.map(item => item.id).join(', ') : owners.join(', ')}`); continue; }
    // Baselines are platform-specific; an unknown screenshot still gets the conservative complete visual gate.
    broad = true;
    reasons.push(`${file}: shared/unknown input; expanded to all mathematical and browser coverage`);
  }
  if (mode === 'milestone' && selected.size === 0 && files.length === 0) broad = true;
  const direct = catalog.filter(chapter => selected.has(chapter.id));
  if (broad || shared) { for (const chapter of catalog) selected.add(chapter.id); for (const name of Object.keys(families)) groups.add(name); }
  for (const unit of unitFiles) if (broad || [...groups].some(group => families[group].units.test(posix.basename(unit)))) units.add(unit);
  const completeMath = mode !== 'focused' || broad || shared;
  const oracles = completeMath ? walk('oracle').filter(path => /\/(?!(test_))[^/]+_oracle\.py$/.test(path)).map(path => posix.basename(path).replace('_oracle.py', '')).sort()
    : [...new Set([...groups].flatMap(group => families[group].oracles))].sort();
  const affected = catalog.filter(chapter => selected.has(chapter.id));
  const interactions = shared && !broad ? direct : affected;
  const representative = mode === 'milestone' || shared ? catalog.filter(chapter =>
    ['I.1', 'I.3', 'I.9', 'II.1', ...(shared ? ['II.10'] : [])].includes(chapter.id) && !interactions.some(item => item.id === chapter.id)) : [];
  /** @type {{gate: string, command: string[], deployment?: string}[]} */
  const commands = [];
  const node = (gate, script, args = []) => commands.push({ gate, command: [process.execPath, script, ...args] });
  const playwright = (gate, files, grep, subpath = false) => {
    const args = ['node_modules/@playwright/test/cli.js', 'test', ...files.map(file => 'tests/e2e/' + file), '--trace', 'off'];
    if (subpath) args.push('--config', 'playwright.subpath.config.ts');
    if (project) args.push('--project', project);
    if (grep) args.push('--grep', grep);
    commands.push({ gate, deployment: subpath ? 'subpath' : 'root', command: [process.execPath, ...args] });
  };
  if (phases.includes('math') && (completeMath || units.size)) {
    if (mode !== 'focused') node('complete type/content check', 'node_modules/astro/astro.js', ['check']);
    node(completeMath ? 'complete units' : 'focused units', 'node_modules/vitest/vitest.mjs', ['run', ...(completeMath ? [] : [...units].sort())]);
    if (oracles.length) node(completeMath ? 'complete oracle + freshness' : 'focused oracle + freshness', 'scripts/run-oracle.mjs', completeMath ? [] : oracles);
  }
  if (phases.includes('production')) {
    node('root production verification', 'scripts/check-dist.mjs', ['dist', '/']);
    node('subpath production verification', 'scripts/check-dist.mjs', ['dist-subpath', '/math-foundations/']);
  }
  if (phases.includes('browser')) {
    if (mode === 'exhaustive' || broad) playwright('complete root browser', [], '^(?!.*visual[^/]*\\.spec\\.ts)');
    else if (interactions.length || representative.length) {
      const ids = [...interactions, ...representative].map(chapter => escape(chapter.id));
      playwright(shared ? 'all read-only chapter contracts + representative both-theme axe' : 'chapter contracts + both-theme full-page axe', ['chapters.spec.ts'], `${shared ? 'read-only checks|' : ''}(?:^|\\s)(?:${ids.join('|')})(?: |:)|Part I publication`);
      for (const group of new Set(interactions.map(chapter => chapter.family))) {
        if (!group) continue;
        const entries = interactions.filter(chapter => chapter.family === group);
        const grep = idScoped.includes(group) || group.startsWith('probability_') || group.startsWith('optimization_') ? '(?:^|\\s)(?:' + entries.map(chapter => escape(chapter.id) + '(?::| )').join('|') + ')|publication' : undefined;
        playwright('affected chapter interactions: ' + group, [families[group].browser + '.spec.ts'], grep);
      }
      if (mode === 'milestone' || shared) playwright('shared cross-chapter controls', ['vectors.spec.ts', 'quantities.spec.ts'], 'keyboard|Arrow|rejected|reset|announc');
    }
    if ((mode === 'milestone' || shared) && !broad) playwright('root shared shell, navigation, accessibility and deployment', ['smoke.spec.ts', 'stage.spec.ts', 'navigation.spec.ts', 'a11y.spec.ts', 'deployment.spec.ts']);
    if (mode === 'exhaustive') playwright('complete subpath functional browser', [], undefined, true);
    else if (mode === 'milestone') playwright('subpath prefix-dependent navigation, assets, anchors, routes and hydration', ['navigation.spec.ts', 'deployment.spec.ts'], undefined, true);
  }
  if (phases.includes('visual') && (affected.length || broad)) {
    const visualSpecs = ['visual.spec.ts', 'visual-part-i.spec.ts', 'visual-linear-algebra.spec.ts', 'visual-calculus.spec.ts', 'visual-probability.spec.ts', 'visual-optimization.spec.ts'];
    if (broad || shared) playwright('authoritative root visuals', visualSpecs);
    else {
      const patterns = affected.map(chapter => calculusFamilies.includes(chapter.family) ? `calculus ${escape(chapter.kind)}:`
        : (chapter.family?.startsWith('probability_') || chapter.family?.startsWith('optimization_')) ? `${escape(chapter.id)}:`
        : chapter.family === 'matrices' ? `matrix ${escape(chapter.kind)}:`
        : ['elimination', 'eigenvalues', 'least_squares', 'svd'].includes(chapter.family) ? `completion ${escape(chapter.kind)}:`
        : chapter.family === 'linear_algebra' ? `${escape(chapter.kind)}: opening` : chapter.slug === 'vectors' ? 'vectors chapter' : escape(chapter.slug) + ' — opening');
      playwright('affected root visuals', visualSpecs, patterns.join('|'));
    }
  }
  return { mode, partial: Boolean(only || project), files, reasons, conservativeExpansion: broad || shared, sharedExpansion: shared,
    chapters: affected.map(chapter => chapter.id), crossChapterContracts: representative.map(chapter => chapter.id),
    interactionChapters: interactions.map(chapter => chapter.id),
    completeMath, units: completeMath ? unitFiles.sort() : [...units].sort(), oracles, project: project ?? 'desktop,tablet,mobile', phases, commands };
}
