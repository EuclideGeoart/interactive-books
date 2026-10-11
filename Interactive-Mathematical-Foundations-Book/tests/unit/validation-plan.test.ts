import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allChapters } from '../../src/curriculum/queries';
import { changedFiles, chapterCatalog, makePlan } from '../../scripts/validation-plan.mjs';
import { productionSignature } from '../../scripts/production-state.mjs';

describe('conservative change-scoped validation', () => {
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
    const shared = makePlan({ files: ['src/ui/ParameterInput.tsx'], chapters: ['II.10'] });
    expect(shared.sharedExpansion).toBe(true);
    expect(shared.completeMath).toBe(true);
    expect(shared.chapters).toHaveLength(chapterCatalog().length);
    expect(shared.interactionChapters).toEqual(['II.10']);
    expect(shared.commands.some(command => command.gate === 'all read-only chapter contracts + representative both-theme axe')).toBe(true);
    expect(shared.commands.some(command => command.gate === 'shared cross-chapter controls')).toBe(true);
    expect(shared.commands.some(command => command.gate === 'complete root browser')).toBe(false);
  });
  it('detects real untracked files as well as tracked edits', () => {
    const directory = mkdtempSync('tests/t0-untracked-');
    const file = directory + '/new-model.ts';
    try { writeFileSync(file, 'export const model = 1;\n'); expect(changedFiles()).toContain(file); }
    finally { unlinkSync(file); rmdirSync(directory); }
  });
  it('keeps documentation-only work cheap and refuses misspelled selectors', () => {
    expect(makePlan({ files: ['documentation/report.md'] }).commands).toEqual([]);
    expect(() => makePlan({ chapters: ['III.1'] })).toThrow();
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
