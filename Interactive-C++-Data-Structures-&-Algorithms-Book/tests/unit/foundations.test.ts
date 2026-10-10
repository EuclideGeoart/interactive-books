import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { alignUp, floorCell, initial, step } from '../../src/visualizers/foundations/model';
import { chapters } from '../../src/content/book';
import { sourceLines } from '../../src/engine/source';

describe('Chapter 0 mechanics', () => {
  it('guards a null pointer and keeps borrowing distinct from ownership', () => {
    let state = step(initial('pointer'), 'b');
    expect(state.pointer).toBe('B');
    state = step(state, 'null');
    state = step(state, 'read');
    expect(state.tag).toBe('guard-null');
    expect(state.message).toContain('invalid');
  });

  it('replaces an owning pointer field through a pointer-to-pointer', () => {
    const state = step(step(initial('slot'), 'address'), 'replace');
    expect(state.root).toBe('B');
    expect(state.tag).toBe('replace-slot');
  });

  it('separates storage reservation, live lifetime, destruction and release', () => {
    let state = initial('lifetime');
    state = step(state, 'construct');
    expect(state.phase).toBe('unallocated');
    for (const [action, phase] of [['allocate', 'storage'], ['construct', 'live'], ['destroy', 'destroyed'], ['release', 'unallocated']] as [string, string][]) {
      state = step(state, action);
      expect(state.phase).toBe(phase);
    }
  });

  it('shows vector growth and invalidates old handles only on reallocation', () => {
    let state = initial('vector');
    state = step(state, 'push');
    expect(state.values).toEqual([10, 20, 30]);
    expect(state.capacity).toBeGreaterThanOrEqual(3);
    expect(state.generation).toBe(1);
    state = step(state, 'push');
    expect(state.generation).toBe(1);
    state = step(state, 'pop');
    expect(state.values).toEqual([10, 20, 30]);
  });

  it('makes copies independent and moves leave the source empty', () => {
    let state = step(initial('copy'), 'construct');
    state = step(state, 'copy');
    expect(state.ownerA && state.ownerB).toBe(true);
    state = step(state, 'move');
    expect([state.ownerA, state.ownerB, state.ownerC]).toEqual([false, true, true]);
    state = step(state, 'destroy');
    expect([state.ownerA, state.ownerB, state.ownerC]).toEqual([false, false, false]);
  });

  it('calculates aligned positions and negative spatial cells', () => {
    expect(alignUp(5, 4)).toBe(8);
    expect(alignUp(8, 4)).toBe(8);
    expect(() => alignUp(5, 3)).toThrow();
    expect(floorCell(-1, 4)).toBe(-1);
    expect(floorCell(5, 4)).toBe(1);
    expect(() => floorCell(0, 0)).toThrow();
    const live = step(initial('alignment'), 'construct');
    expect(step(live, 'next').address).toBe(live.address);
  });

  it('distinguishes input rejection from a broken internal invariant', () => {
    expect(step(initial('contracts'), 'full').tag).toBe('guard');
    expect(step(initial('contracts'), 'broken').tag).toBe('invariant');
    expect(step(initial('contracts'), 'valid').tag).toBe('mutate');
  });

  it('distinguishes erase from reallocation and zero from absence', () => {
    expect(step(initial('iterators'), 'erase').handle).toBe('after-erase');
    expect(step(initial('iterators'), 'grow').handle).toBe('after-growth');
    expect(step(initial('optional'), 'empty').optional).toBeNull();
    expect(step(initial('optional'), 'zero').optional).toBe(0);
  });

  it('keeps source regions and trace tags backed by the canonical C++', () => {
    const source = readFileSync('cpp/chapter-00/CppFoundations.hpp', 'utf8');
    for (const region of ['pointer', 'owning-slot', 'lifetime', 'new-delete', 'copy-move', 'vector-growth', 'iterator-erase', 'alignment', 'contracts', 'optional-view', 'integer', 'atomic-preview'])
      expect(sourceLines(source, region).length).toBeGreaterThan(2);
    for (const tag of ['point-a', 'point-b', 'point-null', 'guard-null', 'address-slot', 'replace-slot', 'allocate', 'construct', 'destroy', 'release', 'construct-a', 'copy', 'move', 'destroy-owners', 'grow', 'erase-middle', 'align-up', 'invariant', 'guard', 'mutate', 'present', 'absent', 'midpoint', 'wrap-index', 'guard-index', 'floor-cell'])
      expect(source).toContain(`@trace ${tag}`);
  });

  it('puts Chapter 0 before Chapter 1 and keeps forward links real', () => {
    expect(chapters[0]?.number).toBe('00');
    expect(chapters[1]?.number).toBe('01');
    const content = readFileSync('src/content/chapters/00-cpp-foundations.mdx', 'utf8');
    for (const [, list] of content.matchAll(/<UsedLater numbers=\{\[([^\]]+)\]\}/g))
      for (const [, number] of (list ?? '').matchAll(/'([^']+)'/g))
        expect(chapters.some(chapter => chapter.number === number)).toBe(true);
    expect((content.match(/id="lesson-\d+"/g) ?? []).length).toBe(28);
  });

  it('covers the final reading gaps and adds only the seven selected reverse links', () => {
    const foundations = readFileSync('src/content/chapters/00-cpp-foundations.mdx', 'utf8');
    for (const term of ['<code>if</code>', '<code>while</code>', '<code>for</code>', '<code>break</code>', '<code>return</code>', '<code>auto</code>', '<code>explicit</code>', 'default argument', 'private BinaryTree', 'virtual destructor', 'std::pair', 'std::tuple', 'using Entry ='])
      expect(foundations).toContain(term);
    const reverse = new Map([
      ['01-singly-linked-list.mdx', '02'], ['04-memory-pool.mdx', '09'], ['16-b-trees.mdx', '12'],
      ['23-unordered-map.mdx', '17'], ['53-object-pools.mdx', '09'], ['59-lock-free-introduction.mdx', '24'],
      ['60-spatial-hashing.mdx', '21'],
    ]);
    for (const [file, lesson] of reverse) {
      const content = readFileSync(`src/content/chapters/${file}`, 'utf8');
      expect(content).toContain(`CppPrerequisite lesson="${lesson}"`);
    }
  });
});
