import { describe, expect, it } from 'vitest';
import {
  avlState,
  avlTrace,
  avlInvariants,
} from '../../src/visualizers/avl/model';
import {
  redBlackState,
  redBlackTrace,
  redBlackInvariants,
} from '../../src/visualizers/red-black/model';

describe('rotation mechanics across balanced binary families', () => {
  for (const [name, values, value, sequence] of [
    ['LL', [30, 20], 10, ['right']],
    ['RR', [10, 20], 30, ['left']],
    ['LR', [30, 10], 20, ['left', 'right']],
    ['RL', [10, 30], 20, ['right', 'left']],
  ] as const)
    it(`AVL ${name} exposes each link and ordered height recomputation`, () => {
      const trace = avlTrace('insert', avlState([...values]), value);
      const rotationStarts = trace.steps
        .filter((step) => /avl\.(left|right)\.pivot/.test(step.source ?? ''))
        .map((step) => step.source!.split('.')[1]);
      expect(rotationStarts).toEqual(sequence);
      for (const direction of sequence) {
        const base = `avl.${direction}.`,
          at = trace.steps.findIndex((step) => step.source === base + 'pivot');
        const tags = trace.steps
          .slice(at)
          .filter((step) => step.source?.startsWith(base))
          .slice(0, 7)
          .map((step) => step.source);
        expect(tags).toEqual(
          [
            'pivot',
            'transfer',
            'detach',
            'attach',
            'old-height',
            'new-height',
            'return',
          ].map((suffix) => base + suffix),
        );
      }
      const after = trace.steps.at(-1)!.state;
      expect(after.nodes[after.root!]!.key).toBe(20);
      expect(
        avlInvariants(after, true).every((rule) => rule.status === 'pass'),
      ).toBe(true);
      expect(after.refs).toEqual({});
    });
  it('AVL preserves the real middle subtree instead of dropping it during a rotation', () => {
    const initial = avlState([50, 30, 70, 20, 40]);
    const trace = avlTrace('insert', initial, 10);
    const transfer = trace.steps.find(
      (step) => step.source === 'avl.right.transfer',
    )!;
    expect(transfer.state.nodes[transfer.state.refs.transfer!]!.key).toBe(40);
    const detach = trace.steps.find(
      (step) => step.source === 'avl.right.detach',
    )!;
    const x = detach.state.nodes.find((n) => n.key === 50)!;
    expect(detach.state.nodes[x.left!]!.key).toBe(40);
    const attach = trace.steps.find(
      (step) => step.source === 'avl.right.attach',
    )!;
    expect(
      attach.state.nodes[attach.state.nodes.find((n) => n.key === 30)!.right!]!
        .key,
    ).toBe(50);
    expect(attach.state.nodes[attach.state.root!]!.key).toBe(50); // caller publication is still pending
    expect(
      trace.steps.at(-1)!.state.nodes[trace.steps.at(-1)!.state.root!]!.key,
    ).toBe(30);
  });
  for (const values of [
    [30, 20],
    [10, 20],
    [30, 10],
    [10, 30],
    [50, 25, 75, 10, 30, 60, 90],
  ])
    it(`RB restores colors, parents and black heights after inserting into [${values}]`, () => {
      for (const value of [5, 20, 65, 95]) {
        const trace = redBlackTrace('insert', redBlackState(values), value),
          after = trace.steps.at(-1)!.state;
        expect(
          redBlackInvariants(after, true).every(
            (rule) => rule.status === 'pass',
          ),
        ).toBe(true);
        expect(after.refs).toEqual({});
        for (const [i, step] of trace.steps.entries()) {
          if (!step.source?.startsWith('rb.rotate.')) continue;
          const before = i ? trace.steps[i - 1]!.state : trace.initial;
          const changed: string[] = [];
          if (before.root !== step.state.root) changed.push('root');
          before.nodes.forEach((node, index) => {
            for (const field of ['left', 'right', 'parent'] as const)
              if (node[field] !== step.state.nodes[index]![field])
                changed.push(`${index}.${field}`);
          });
          expect(changed.length, step.source).toBeLessThanOrEqual(1);
        }
      }
    });
});
