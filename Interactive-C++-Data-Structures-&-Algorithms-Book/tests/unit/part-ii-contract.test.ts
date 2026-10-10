import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LabAdapter } from '../../src/components/controls/lab-types';
import { sourceLines, cleanSource } from '../../src/engine/source';
import { PlaybackController } from '../../src/engine/playback';
import { queueAdapter } from '../../src/visualizers/queue/adapter';
import { queueOperations } from '../../src/visualizers/queue/model';
import { ringAdapter } from '../../src/visualizers/ring-buffer/adapter';
import { ringOperations } from '../../src/visualizers/ring-buffer/model';
import { priorityAdapter } from '../../src/visualizers/priority-queue/adapter';
import { priorityOperations } from '../../src/visualizers/priority-queue/model';
import { heapAdapter } from '../../src/visualizers/binary-heap/adapter';
import { heapOperations } from '../../src/visualizers/binary-heap/model';

function contract<S, E extends { type: string }>(chapter: string, header: string, adapter: LabAdapter<S, E>, operations: readonly string[], variants: Record<string, string>[]) {
  describe(`${chapter}: accepted lab and source contract`, () => {
    const source = readFileSync(`cpp/chapter-${chapter}/${header}`, 'utf8');
    it('downloads preserve canonical line numbers and contain no teaching markers', () => {
      const clean = cleanSource(source);
      expect(clean).not.toMatch(/@(trace|begin|end)/);
      expect(clean.split('\n')).toHaveLength(source.split('\n').length);
      for (const line of sourceLines(source).filter(line => line.tag)) expect(clean.split('\n')[line.number - 1]?.trim()).toBe(line.text.trim());
    });
    for (const fields of variants) for (const operation of operations) {
      it(`${operation} ${JSON.stringify(fields)}: deterministic reversible snapshots, source coverage and final invariants`, () => {
        const form = new FormData();
        Object.entries(fields).forEach(([key, value]) => form.set(key, value));
        const trace = adapter.build(operation, form);
        expect(adapter.build(operation, form)).toEqual(trace);
        const visible = adapter.regions(operation, form).flatMap(region => sourceLines(source, region));
        for (const step of trace.steps) if (step.source) expect(visible.filter(line => line.tag === step.source), step.source).toHaveLength(1);
        const player = new PlaybackController(trace);
        const saved = JSON.stringify(trace);
        player.seek(player.total);
        expect(adapter.invariants(player.state, true).filter(rule => rule.status === 'fail')).toEqual([]);
        for (let i = player.total; i > 0; i--) {
          expect(player.state).toEqual(trace.steps[i - 1]!.state);
          player.previous();
        }
        expect(player.state).toEqual(trace.initial);
        expect(JSON.stringify(trace)).toBe(saved);
        player.dispose();
      });
    }
    it('rejects invalid operation and integer input before returning a trace', () => {
      expect(() => adapter.build('invalid-operation', new FormData())).toThrow();
      const form = new FormData(); form.set('value', '12.5');
      expect(() => adapter.build(operations[0]!, form)).toThrow();
      form.set('value', '1000');
      expect(() => adapter.build(operations[0]!, form)).toThrow();
    });
  });
}

contract('06', 'QueueDeque.hpp', queueAdapter, queueOperations, ['standard', 'empty', 'single', 'full'].map(preset => ({ preset })));
contract('07', 'RingBuffer.hpp', ringAdapter, ringOperations, ['wrap', 'wrapped', 'empty', 'single', 'full'].flatMap(preset => ['reject', 'overwrite'].map(policy => ({ preset, policy }))));
contract('08', 'PriorityQueue.hpp', priorityAdapter, priorityOperations, ['standard', 'empty', 'single', 'ties'].flatMap(preset => ['higher', 'lower'].map(mode => ({ preset, mode }))));
contract('09', 'BinaryHeap.hpp', heapAdapter, heapOperations, ['standard', 'empty', 'single', 'ties'].flatMap(preset => ['max', 'min'].map(mode => ({ preset, mode }))));
