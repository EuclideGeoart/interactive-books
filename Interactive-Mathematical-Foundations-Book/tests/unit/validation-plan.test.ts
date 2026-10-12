import { existsSync, lstatSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allChapters } from '../../src/curriculum/queries';
import { changedFiles, chapterCatalog, environmentLink, makePlan } from '../../scripts/validation-plan.mjs';
import { productionSignature } from '../../scripts/production-state.mjs';

describe('conservative change-scoped validation', () => {
  it('Bayes changes reach only Bayes chapters; shared probability presentation reaches actual consumers', () => {
    const bayes = makePlan({ files: ['src/math/probability/bayes.ts'] });
    expect(bayes.chapters).toEqual(['IV.6']); expect(bayes.conservativeExpansion).toBe(false);
    expect(bayes.oracles).toEqual(['probability_finite']);
    const shared = makePlan({ files: ['src/lessons/probability/StageFrame.tsx'] });
    expect(shared.chapters.slice().sort()).toEqual(chapterCatalog().filter(c => c.id.startsWith('IV.')).map(c => c.id).sort());
    expect(shared.conservativeExpansion).toBe(false);
    expect(makePlan({ files: ['src/math/probability/bayes-deleted.ts'] }).commands.some(c => c.gate === 'complete root browser')).toBe(true);
  });
  it('registered probability oracles, browser families and screenshots select all named owners', () => {
    const ids = ['IV.1', 'IV.2', 'IV.3', 'IV.4', 'IV.5', 'IV.6'];
    for (const file of ['oracle/probability_finite_oracle.py', 'fixtures/probability_finite.fixtures.json', 'tests/e2e/probability-finite.spec.ts']) {
      const p = makePlan({ files: [file] }); expect(p.conservativeExpansion).toBe(false); expect(p.chapters.slice().sort()).toEqual(ids);
    }
    expect(makePlan({ files: ['tests/e2e/__screenshots__/visual-probability.spec.ts/mobile-iv-bayes-theorem-impossible.png'] }).chapters).toEqual(['IV.6']);
  });
  it('the shared distribution model selects all actual distribution consumers and their cases', () => {
    const p = makePlan({ files: ['src/math/probability/distributions.ts'] });
    expect(p.chapters.slice().sort()).toEqual(['IV.8', 'IV.9', 'IV.10', 'IV.15', 'IV.16'].sort()); expect(p.conservativeExpansion).toBe(false);
    expect(p.oracles).toEqual(['probability_distributions', 'probability_sampling']);
    const visual = new RegExp(p.commands.find(c => c.gate === 'affected root visuals')!.command.at(-1)!);
    for (const id of ['IV.8', 'IV.9', 'IV.10', 'IV.15', 'IV.16']) expect(visual.test(`${id}: opening and exceptional probability states`)).toBe(true);
  });
  it('joint and sampling ownership stays selective while unresolved probability dependencies expand', () => {
    for (const [file, ids, oracles] of [
      ['src/math/probability/joint.ts', ['IV.13', 'IV.14'], ['probability_joint']],
      ['src/math/probability/sampling.ts', ['IV.15', 'IV.16'], ['probability_sampling']],
      ['tests/e2e/probability-sampling.spec.ts', ['IV.13', 'IV.14', 'IV.15', 'IV.16'], ['probability_joint', 'probability_sampling']],
    ] as const) {
      const p = makePlan({ files: [file] }); expect(p.conservativeExpansion).toBe(false); expect(p.chapters.slice().sort()).toEqual([...ids].sort()); expect(p.oracles).toEqual([...oracles]);
    }
    expect(makePlan({ files: ['src/math/probability/missing-sampling.ts'], chapters: ['IV.16'] }).commands.some(c => c.gate === 'complete root browser')).toBe(true);
  });
  it('discovers every current published chapter without a second publication registry', () => {
    expect(chapterCatalog().map(chapter => chapter.id).sort()).toEqual(allChapters.filter(ref => ref.chapter.status === 'available').map(ref => ref.id).sort());
  });
  it('selects one requested chapter, its mathematical family and only its screenshots', () => {
    const plan = makePlan({ chapters: ['II.10'] });
    expect(plan.chapters).toEqual(['II.10']);
    expect(plan.units).toHaveLength(4);
    expect(plan.oracles).toEqual(['matrices']);
    expect(makePlan({ files: ['src/content/chapters/matrix-composition.mdx'] }).units).toContain('tests/unit/content.test.ts');
    expect(plan.commands.find(command => command.gate === 'affected root visuals')!.command.at(-1)).toBe('matrix composition:');
    expect(plan.commands.filter(command => command.deployment === 'subpath')).toEqual([]);
    expect(plan.commands.every(command => !command.deployment || command.command.includes('off'))).toBe(true);
    const partI = makePlan({ chapters: ['I.1'] });
    const grep = new RegExp(partI.commands.find(command => command.gate.startsWith('chapter contracts'))!.command.at(-1)!);
    expect(grep.test('chapters.spec.ts › I.1 Scalars')).toBe(true);
    expect(grep.test('chapters.spec.ts › II.1 Vector addition')).toBe(false);
  });
  it('selects all matrix consumers of a shared lesson, but not unrelated vector chapters', () => {
    const plan = makePlan({ files: ['src/lessons/linear-algebra/matrix-lesson.ts'] });
    expect(plan.chapters.slice().sort()).toEqual(['II.8', 'II.9', 'II.10', 'II.11', 'II.12', 'II.13'].sort());
    expect(plan.oracles).toEqual(['matrices']);
  });
  it('discovers all completion stages with their mathematical families and visual kinds', () => {
    const expected:Record<string,readonly [string,string]>={'II.14':['elimination','elimination'],'II.15':['elimination','rank'],'II.16':['elimination','inverse'],'II.17':['eigenvalues','eigenvalues'],'II.18':['least_squares','least-squares'],'II.19':['svd','svd']};
    for(const[id,[family,kind]]of Object.entries(expected))expect(chapterCatalog().find(c=>c.id===id)).toMatchObject({family,kind});
  });
  for(const[file,ids,oracles,testFiles,kinds]of [
    ['elimination.ts',['II.14','II.15','II.16','II.18','II.19'],['elimination','least_squares','svd'],['elimination','least-squares','svd'],['elimination','rank','inverse','least-squares','svd']],
    ['eigenvalues.ts',['II.17'],['eigenvalues'],['eigenvalues'],['eigenvalues']],
    ['least-squares.ts',['II.18'],['least_squares'],['least-squares'],['least-squares']],
    ['svd.ts',['II.19'],['svd'],['svd'],['svd']],
  ] as const)it(`${file}: selects actual consumers, units, oracles, browser cases and every exceptional screenshot`,()=>{
    const p=makePlan({files:[`src/math/linear-algebra/${file}`]});expect(p.conservativeExpansion).toBe(false);expect(p.chapters.slice().sort()).toEqual([...ids].sort());expect(p.oracles).toEqual([...oracles]);
    for(const name of testFiles){expect(p.units).toContain(`tests/unit/${name}.parity.test.ts`);const c=p.commands.find(c=>c.command.includes(`tests/e2e/${name}.spec.ts`))!;expect(c).toBeDefined();const grep=new RegExp(c.command.at(-1)!);for(const id of ids.filter(id=>chapterCatalog().find(c=>c.id===id)!.family===(name==='least-squares'?'least_squares':name==='elimination'?'elimination':name)))expect(grep.test(`${id}: actual interaction`)).toBe(true);}
    const visual=new RegExp(p.commands.find(c=>c.gate==='affected root visuals')!.command.at(-1)!);for(const kind of kinds)expect(visual.test(`completion ${kind}: opening and exceptional states`)).toBe(true);
    expect(visual.test('addition: opening and exceptional state')).toBe(false);
  });
  it('shared completion presentation expands to all six actual consumers without a full-suite fallback',()=>{
    for(const file of ['src/lessons/linear-algebra/CompletionStage.tsx','src/lessons/linear-algebra/completion-view.ts','src/lessons/linear-algebra/completion-exercises.ts']){
      const p=makePlan({files:[file]});expect(p.conservativeExpansion).toBe(false);expect(p.chapters.slice().sort()).toEqual(['II.14','II.15','II.16','II.17','II.18','II.19']);expect(p.oracles).toEqual(['eigenvalues','elimination','least_squares','svd']);
    }
  });
  it('completion screenshots stay selective, and unresolved new-family files still fail conservatively',()=>{
    for(const[kind,id]of [['elimination','II.14'],['rank','II.15'],['inverse','II.16'],['eigenvalues','II.17'],['least-squares','II.18'],['svd','II.19']]){
      expect(makePlan({files:[`tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-completion-${kind}-exception.png`]}).chapters).toEqual([id]);
    }
    for(const file of ['src/math/linear-algebra/svd-deleted.ts','src/math/new-spectral-family.ts'])expect(makePlan({files:[file],chapters:['II.19']}).commands.some(c=>c.gate==='complete root browser')).toBe(true);
  });
  it('known publication shell captures use shared coverage while unknown screenshots retain the full fallback',()=>{
    for(const name of ['desktop-home-fold.png','desktop-home-fold-dark.png','mobile-contents-fold.png','mobile-map.png']){
      const p=makePlan({files:[`tests/e2e/__screenshots__/visual.spec.ts/${name}`],chapters:['II.19']});expect(p.sharedExpansion).toBe(true);expect(p.completeMath).toBe(true);expect(p.commands.some(c=>c.gate==='authoritative root visuals')).toBe(true);expect(p.commands.some(c=>c.gate==='complete root browser')).toBe(false);expect(p.interactionChapters).toEqual(['II.19']);
    }
    expect(makePlan({files:['tests/e2e/__screenshots__/visual.spec.ts/mobile-unknown-new-case.png']}).commands.some(c=>c.gate==='complete root browser')).toBe(true);
    const exercises=makePlan({files:['tests/unit/completion-exercises.test.ts'],chapters:['II.19']});expect(exercises.sharedExpansion).toBe(true);expect(exercises.commands.some(c=>c.gate==='complete root browser')).toBe(false);expect(exercises.units).toContain('tests/unit/completion-exercises.test.ts');
  });
  it('limits a known affine screenshot change and expands unresolved/deleted inputs', () => {
    expect(makePlan({ files: ['tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-composition-affine.png'] }).chapters).toEqual(['II.10']);
    expect(makePlan({ files: ['src/math/quantity/deleted-helper.ts'] }).conservativeExpansion).toBe(true);
  });
  it('follows rational helpers through transitive imports instead of assuming they only affect quantities', () => {
    const plan = makePlan({ files: ['src/math/quantity/rational.ts'] });
    expect(plan.chapters).toEqual(expect.arrayContaining(['I.1', 'I.4', 'II.1', 'II.10']));
    expect(plan.oracles).toEqual(expect.arrayContaining(['quantity', 'algebra', 'linear_algebra', 'matrices']));
  });
  it('new, unknown and shared files expand rather than disappear, even with an explicit chapter', () => {
    for (const file of ['src/new-family/model.ts', 'tests/e2e/helpers.ts', '../.github/workflows/verification.yml', 'documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md']) {
      const plan = makePlan({ files: [file], chapters: ['II.10'] });
      expect(plan.conservativeExpansion).toBe(true);
      expect(plan.chapters).toHaveLength(chapterCatalog().length);
      expect(plan.completeMath).toBe(true);
      expect(plan.commands.some(command => command.gate === 'complete root browser')).toBe(true);
    }
    for (const file of ['src/ui/ParameterInput.tsx', 'tests/e2e/chapters.spec.ts']) {
      const shared = makePlan({ files: [file], chapters: ['II.10'] });
      expect(shared.sharedExpansion).toBe(true);
      expect(shared.completeMath).toBe(true);
      expect(shared.chapters).toHaveLength(chapterCatalog().length);
      expect(shared.interactionChapters).toEqual(['II.10']);
      expect(shared.commands.some(command => command.gate === 'all read-only chapter contracts + representative both-theme axe')).toBe(true);
      expect(shared.commands.some(command => command.gate === 'shared cross-chapter controls')).toBe(true);
      expect(shared.commands.some(command => command.gate === 'complete root browser')).toBe(false);
    }
  });
  it('detects real untracked files as well as tracked edits', () => {
    const directory = mkdtempSync('tests/t0-untracked-');
    const file = directory + '/new-model.ts';
    try { writeFileSync(file, 'export const model = 1;\n'); expect(changedFiles()).toContain(file); }
    finally { unlinkSync(file); rmdirSync(directory); }
  });
  it('keeps documentation-only work cheap and refuses misspelled selectors', () => {
    expect(makePlan({ files: ['documentation/report.md'] }).commands).toEqual([]);
    expect(() => makePlan({ chapters: ['VII.1'] })).toThrow();
    expect(() => makePlan({ project: 'phone' })).toThrow();
    expect(() => makePlan({ only: 'unitt' })).toThrow();
  });
  it('milestone retains complete math, both production mounts, older contracts and prefix-dependent subpath checks', () => {
    const plan = makePlan({ mode: 'milestone', chapters: ['II.10'] });
    expect(plan.completeMath).toBe(true);
    expect(plan.crossChapterContracts).toEqual(expect.arrayContaining(['I.1', 'I.3', 'I.9', 'II.1']));
    expect(plan.commands.filter(command => command.gate.includes('production verification'))).toHaveLength(2);
    const subpath = plan.commands.filter(command => command.deployment === 'subpath');
    expect(subpath).toHaveLength(1);
    expect(subpath[0]!.command).toEqual(expect.arrayContaining(['tests/e2e/navigation.spec.ts', 'tests/e2e/deployment.spec.ts']));
    expect(subpath[0]!.command).not.toContain('tests/e2e/matrices.spec.ts');
  });
  it('exhaustive preserves all root cases and every original subpath functional case', () => {
    const plan = makePlan({ mode: 'exhaustive' });
    expect(plan.commands.some(command => command.gate === 'complete root browser')).toBe(true);
    expect(plan.commands.some(command => command.gate === 'complete subpath functional browser')).toBe(true);
    expect(plan.commands.some(command => command.gate === 'authoritative root visuals')).toBe(true);
    expect(plan.commands.filter(command => command.deployment === 'subpath').every(command => !command.command.some(arg => arg.includes('visual')))).toBe(true);
  });
  it('fingerprints source and hosting prefix rather than test output', () => {
    expect(productionSignature('/')).toMatch(/^[a-f0-9]{64}$/);
    expect(productionSignature('/')).not.toBe(productionSignature('/math-foundations/'));
  });
});

describe('Part III calculus registration', () => {
  /** Use the actual published Probability catalog, not synthetic placeholders. */
  const withProbability = () => chapterCatalog();
  it('discovers every published calculus chapter with its family and visual kind from the wrapper stage', () => {
    const calculus = chapterCatalog().filter(c => c.id.startsWith('III.'));
    const expected: Record<string, readonly [string, string]> = { 'III.1': ['limits', 'limits'], 'III.2': ['limits', 'continuity'], 'III.3': ['derivatives', 'secant'],
      'III.4': ['derivatives', 'linear-model'], 'III.5': ['derivatives', 'rules'], 'III.6': ['derivatives', 'chain'],
      'III.7': ['multivariable', 'partials'], 'III.8': ['multivariable', 'gradient'], 'III.9': ['multivariable', 'jacobian'], 'III.10': ['autodiff', 'autodiff'], 'III.11': ['multivariable', 'hessian'],
      'III.12': ['integration', 'riemann'], 'III.13': ['integration', 'accumulation'], 'III.14': ['derivatives', 'finite-difference'], 'III.15': ['integration', 'quadrature'] };
    expect(calculus).toHaveLength(15);
    for (const [id, [family, kind]] of Object.entries(expected)) expect(calculus.find(c => c.id === id), id).toMatchObject({ family, kind });
  });
  it('a calculus model edit selects its literal consumers, units, oracles and visuals — and no Probability chapter', () => {
    const p = makePlan({ files: ['src/math/calculus/limits.ts'], catalog: withProbability() });
    expect(p.conservativeExpansion).toBe(false);
    expect(p.chapters.slice().sort()).toEqual(['III.1', 'III.2']);
    expect(p.chapters.some(id => id.startsWith('IV.'))).toBe(false);
    expect(p.oracles).toEqual(['limits']);
    expect(p.units).toEqual(expect.arrayContaining(['tests/unit/limits.test.ts', 'tests/unit/limits.parity.test.ts', 'tests/unit/limits-lesson.test.ts']));
    const visual = new RegExp(p.commands.find(c => c.gate === 'affected root visuals')!.command.at(-1)!);
    expect(visual.test('calculus limits: opening and exceptional states')).toBe(true);
    expect(visual.test('calculus continuity: opening and exceptional states')).toBe(true);
    expect(visual.test('calculus secant: opening and exceptional states')).toBe(false);
    const browser = p.commands.find(c => c.command.includes('tests/e2e/limits.spec.ts'))!;
    const grep = new RegExp(browser.command.at(-1)!);
    expect(grep.test('limits.spec.ts › III.1: limits')).toBe(true); expect(grep.test('limits.spec.ts › III.10: autodiff')).toBe(false);
  });
  it('the bivariate engine selects III.7, III.8, III.9 and III.11; the graph engine selects only III.10', () => {
    const b = makePlan({ files: ['src/math/calculus/bivariate.ts'], catalog: withProbability() });
    expect(b.conservativeExpansion).toBe(false); expect(b.chapters.slice().sort()).toEqual(['III.11', 'III.7', 'III.8', 'III.9']); expect(b.oracles).toEqual(['multivariable']);
    const a = makePlan({ files: ['src/math/calculus/autodiff.ts'], catalog: withProbability() });
    expect(a.chapters).toEqual(['III.10']); expect(a.oracles).toEqual(['autodiff']);
    expect(a.units).toEqual(expect.arrayContaining(['tests/unit/autodiff.test.ts', 'tests/unit/autodiff.parity.test.ts', 'tests/unit/autodiff-lesson.test.ts']));
    expect(a.units.some(u => u.includes('multivariable'))).toBe(false);
    const grep = new RegExp(a.commands.find(c => c.command.includes('tests/e2e/autodiff.spec.ts'))!.command.at(-1)!);
    expect(grep.test('autodiff.spec.ts › III.10: computational graphs')).toBe(true); expect(grep.test('autodiff.spec.ts › III.1: x')).toBe(false);
  });
  it('the integration engine selects III.12, III.13 and III.15; the finite-difference model reaches III.14 with its derivative consumers', () => {
    const i = makePlan({ files: ['src/math/calculus/integration.ts'], catalog: withProbability() });
    expect(i.conservativeExpansion).toBe(false); expect(i.chapters.slice().sort()).toEqual(['III.12', 'III.13', 'III.15']); expect(i.oracles).toEqual(['integration']);
    const d = makePlan({ files: ['src/math/calculus/difference.ts'], catalog: withProbability() });
    expect(d.chapters).toEqual(expect.arrayContaining(['III.3', 'III.14'])); expect(d.chapters.some(id => id.startsWith('IV.'))).toBe(false); expect(d.oracles).toEqual(['derivatives']);
    const v = new RegExp(i.commands.find(c => c.gate === 'affected root visuals')!.command.at(-1)!);
    expect(v.test('calculus riemann: opening and exceptional states')).toBe(true); expect(v.test('calculus quadrature: opening and exceptional states')).toBe(true); expect(v.test('calculus secant: opening and exceptional states')).toBe(false);
  });
  it('the shared univariate engine reaches every chapter that imports it, through the import closure', () => {
    const p = makePlan({ files: ['src/math/calculus/univariate.ts'], catalog: withProbability() });
    expect(p.conservativeExpansion).toBe(false);
    expect(p.chapters).toEqual(expect.arrayContaining(['III.1', 'III.2', 'III.3', 'III.4']));
    expect(p.chapters.some(id => id.startsWith('IV.') || id.startsWith('II.'))).toBe(false);
    expect(p.oracles).toEqual(expect.arrayContaining(['derivatives', 'limits']));
  });
  it('one wrapper stage or one lesson selects only its own chapter', () => {
    for (const [file, id] of [['src/lessons/calculus/ChainStage.tsx', 'III.6'], ['src/lessons/calculus/rules-lesson.ts', 'III.5'], ['src/lessons/calculus/continuity-lesson.ts', 'III.2']] as const) {
      const p = makePlan({ files: [file], catalog: withProbability() });
      expect(p.chapters, file).toEqual([id]); expect(p.conservativeExpansion).toBe(false);
    }
  });
  it('shared calculus presentation and test support select all calculus chapters without a full-suite fallback', () => {
    for (const file of ['src/lessons/calculus/CalculusStage.tsx', 'src/lessons/calculus/calculus-view.ts', 'src/lessons/calculus/exercises.ts', 'src/lessons/calculus/calculus.css', 'tests/unit/calculus-exercises.test.ts', 'tests/e2e/calculus-helpers.ts']) {
      const p = makePlan({ files: [file], catalog: withProbability() });
      expect(p.conservativeExpansion, file).toBe(false);
      expect(p.chapters.slice().sort(), file).toEqual(chapterCatalog().filter(c => c.id.startsWith('III.')).map(c => c.id).sort());
    }
  });
  it('calculus screenshots select exactly their chapter', () => {
    expect(makePlan({ files: ['tests/e2e/__screenshots__/visual-calculus.spec.ts/mobile-iii-calculus-secant-corner.png'] }).chapters).toEqual(['III.3']);
    expect(makePlan({ files: ['tests/e2e/__screenshots__/visual-calculus.spec.ts/desktop-iii-calculus-limits.png'] }).chapters).toEqual(['III.1']);
  });
  it('linked-worktree dependency symlinks are environment, not source; everything else still counts', () => {
    expect(environmentLink('node_modules')).toBe(existsSync('node_modules') && lstatSync('node_modules').isSymbolicLink());
    expect(environmentLink('src')).toBe(false);
    expect(environmentLink('src/node_modules')).toBe(false);
    expect(changedFiles()).not.toContain('node_modules');
  });
});

describe('M7/M8 integration validation ownership', () => {
  it('discovers 15 Calculus and 16 Probability stages with separate families', () => {
    const catalog = chapterCatalog();
    expect(catalog).toHaveLength(allChapters.filter(c=>c.chapter.status==='available').length);
    expect(catalog.filter(chapter => chapter.id.startsWith('III.'))).toHaveLength(15);
    expect(catalog.filter(chapter => chapter.id.startsWith('IV.'))).toHaveLength(16);
    for (const chapter of catalog.filter(chapter => /^(III|IV)\./.test(chapter.id))) {
      expect(chapter.family, chapter.id).toBeTruthy();
      expect(chapter.kind, chapter.id).toBeTruthy();
    }
  });
  it('keeps autodiff and Bayes changes independent', () => {
    const calc = makePlan({ files: ['src/math/calculus/autodiff.ts'] });
    const prob = makePlan({ files: ['src/math/probability/bayes.ts'] });
    expect(calc.chapters).toEqual(['III.10']);
    expect(prob.chapters).toEqual(['IV.6']);
    expect(calc.oracles).toEqual(['autodiff']);
    expect(prob.oracles).toEqual(['probability_finite']);
    expect(calc.conservativeExpansion).toBe(false);
    expect(prob.conservativeExpansion).toBe(false);
  });
  it('selects both visual families when the shared curriculum changes', () => {
    const p = makePlan({ files: ['src/curriculum/curriculum.ts'], chapters: ['III.15', 'IV.1'], mode: 'milestone' });
    expect(p.chapters).toHaveLength(allChapters.filter(c=>c.chapter.status==='available').length);
    expect(p.completeMath).toBe(true);
    expect(p.commands.some(c => c.gate === 'complete root browser')).toBe(false);
    const visuals = p.commands.find(c => c.gate === 'authoritative root visuals');
    expect(visuals?.command).toEqual(expect.arrayContaining(['tests/e2e/visual-calculus.spec.ts', 'tests/e2e/visual-probability.spec.ts']));
  });
  it('selects exactly one chapter for each new part screenshot', () => {
    expect(makePlan({ files: ['tests/e2e/__screenshots__/visual-calculus.spec.ts/mobile-iii-calculus-limits.png'] }).chapters).toEqual(['III.1']);
    expect(makePlan({ files: ['tests/e2e/__screenshots__/visual-probability.spec.ts/mobile-iv-bayes-theorem-impossible.png'] }).chapters).toEqual(['IV.6']);
  });
});

describe('Statistics validation ownership',()=>{
 it('data models reach exactly their chapter consumers, with owned mathematical and browser checks',()=>{const p=makePlan({files:['src/math/statistics/data.ts']});expect(p.conservativeExpansion).toBe(false);expect(p.chapters.slice().sort()).toEqual(['V.1','V.2','V.3','V.4']);expect(p.oracles).toEqual(['statistics_data']);expect(p.units).toContain('tests/unit/statistics-data.parity.test.ts');const c=p.commands.find(x=>x.command.includes('tests/e2e/statistics-data.spec.ts'))!;expect(c).toBeDefined();expect(new RegExp(c.command.at(-1)!).test('V.4: actual estimates')).toBe(true);expect(p.chapters.some(id=>id.startsWith('IV.')||id.startsWith('VI.'))).toBe(false);});
 it('Statistics stages, oracle ownership, screenshot names and missing files remain selective or conservative',()=>{for(const file of ['oracle/statistics_data_oracle.py','fixtures/statistics_data.fixtures.json','tests/e2e/statistics-data.spec.ts'])expect(makePlan({files:[file]}).chapters.slice().sort()).toEqual(['V.1','V.2','V.3','V.4']);expect(makePlan({files:['tests/e2e/__screenshots__/visual-statistics.spec.ts/mobile-v-data-spread-single.png']}).chapters).toEqual(['V.2']);expect(makePlan({files:['src/math/statistics/deleted.ts']}).conservativeExpansion).toBe(true);});
});
