import type { LabAdapter } from '../../components/controls/lab-types';
import { hashCell, hashSvg, hashInspector } from '../hashing/presentation';
import { referenceArrow } from '../../components/visualizers/primitives';
import { teachingHash } from '../hashing/hash';
import { hashTrace, type HashState, type HashEvent } from './model';
export const hashFundamentalsAdapter: LabAdapter<HashState, HashEvent> = {
  build(_op, f) { return hashTrace(String(f.get('key') ?? 'a'), String(f.get('other') ?? 'i'), Number(f.get('capacity') ?? 8)); },
  draw(s, id, view, selected) {
    let content = '';
    const items = [
      { name: 'key', value: s.key, note: `bytes read: ${s.position}`, x: 20, y: 60 },
      { name: 'hash', value: String(s.hash), note: 'uint32 wrap', x: 245, y: 60 },
      { name: 'bucket', value: s.bucket === null ? 'pending' : String(s.bucket), note: 'hash mod capacity', x: 470, y: 60 },
      { name: 'capacity', value: String(s.capacity), note: 'positive bucket count', x: 245, y: 235 },
    ];
    for (const { name, value, note, x, y } of items) content += hashCell({ id: name, index: view === 'memory' ? `${name} · scalar` : name, x, y, status: 'value', lines: [value, note], selected: selected === name, active: name === (s.bucket === null ? 'hash' : 'bucket') });
    content += referenceArrow('M200 110 H245', id);
    content += referenceArrow('M425 110 H470', id);
    // Capacity is an independent input; its lane stays between the columns.
    content += referenceArrow('M425 285 H447 V135 H470', id);
    const otherHash = teachingHash(s.other); const collision = s.key !== s.other && s.bucket === otherHash % s.capacity;
    content += hashCell({ id: 'comparison', index: collision ? 'COLLISION · distinct keys' : 'comparison key', x: 470, y: 235, status: collision ? 'collision' : 'value', lines: [s.other, `hash ${otherHash}`, `bucket ${otherHash % s.capacity}`], selected: selected === 'comparison' });
    return hashSvg(id, 670, 380, content);
  },
  inspect(s, selected) { return hashInspector(selected === 'comparison' ? s.other : s.key, [['key', selected === 'comparison' ? s.other : s.key], ['hash', selected === 'comparison' ? teachingHash(s.other) : s.hash], ['capacity', s.capacity], ['bucket', selected === 'comparison' ? teachingHash(s.other) % s.capacity : s.bucket ?? 'pending'], ['result', s.result]]); },
  describe: s => `${s.key}: hash ${s.hash}, capacity ${s.capacity}, bucket ${s.bucket ?? 'pending'}. ${s.result}. Comparison ${s.other}: hash ${teachingHash(s.other)}, bucket ${teachingHash(s.other) % s.capacity}.`,
  invariants: s => [{ name: 'Deterministic prefix hash', status: s.hash === teachingHash(s.key.slice(0, s.position)) ? 'pass' : 'fail', detail: 'Same bytes and policy always produce the same uint32 value.' }, { name: 'Index is within capacity', status: s.bucket === null || (s.bucket >= 0 && s.bucket < s.capacity) ? 'pass' : 'fail', detail: 'A collision is normal; it is not a broken invariant.' }],
  regions: () => ['hash', 'mapping'], counters: s => [{ label: 'Bytes hashed', value: s.position }, { label: 'Capacity', value: s.capacity }],
};
