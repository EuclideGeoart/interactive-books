import type { Invariant, Trace, TraceStep } from '../../engine/types';

export interface SpscEvent { type: string }
export interface SpscState {
  mode: 'ring' | 'cas' | 'aba';
  slots: number[];
  read: number;
  write: number;
  producer: { index: number | null; next: number | null; observed: number | null; value: number | null; phase: string };
  consumer: { index: number | null; next: number | null; observed: number | null; value: number | null; phase: string };
  accepted: number[];
  consumed: number[];
  result: string;
  focus: string;
  atomic: { current: number | null; expected: number | null; desired: number; exchanged: boolean | null; history: number[] };
  loads: number;
  stores: number;
  reads: number;
  writes: number;
  unsafe: boolean;
}
type EventDescription = { source: string | null; title: string; explanation: string };
const event = (source: string, title: string, explanation: string): EventDescription => ({ source, title, explanation });
const local = (): SpscState['producer'] => ({ index: null, next: null, observed: null, value: null, phase: 'idle' });
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const next = (state: SpscState, index: number) => (index + 1) % state.slots.length;

export function initialSpscState(count = 4, initial: number[] = []): SpscState {
  if (!Number.isInteger(count) || count < 2 || count > 8) throw new Error('Use 2–8 physical slots. One slot is reserved.');
  if (initial.length >= count || initial.some(n => !Number.isSafeInteger(n) || Math.abs(n) > 1000000)) throw new Error('Initial queue must fit N−1 slots and contain integers in ±1,000,000.');
  const slots = Array<number>(count).fill(0);
  initial.forEach((value, index) => { slots[index] = value; });
  return { mode: 'ring', slots, read: 0, write: initial.length, producer: local(), consumer: local(), accepted: [...initial], consumed: [], result: '', focus: '', atomic: { current: null, expected: null, desired: 9, exchanged: null, history: [] }, loads: 0, stores: 0, reads: 0, writes: 0, unsafe: false };
}

// Each generator is one thread's ordered statements. The scenario chooses a
// concrete interleaving; it is not a simulator of every C++ allowed execution.
export function* pushSpsc(s: SpscState, value: number): Generator<EventDescription> {
  const p = s.producer = { ...local(), value };
  p.index = s.write; p.phase = 'load own write'; s.loads++; s.focus = 'producer'; s.result = '';
  yield event('spsc.push.own', 'Producer: load own index', 'Relaxed is sufficient for this index load: only this producer writes write.');
  p.next = next(s, p.index); p.phase = 'compute next';
  yield event('spsc.push.next', 'Compute the next ring position', 'Wrap at N physical slots. One position is reserved to distinguish full from empty.');
  p.observed = s.read; s.loads++; p.phase = 'acquire read';
  yield event('spsc.push.acquire', 'Acquire the consumer’s published read index', 'Observing the consumer’s release establishes that its earlier payload read has finished before this slot is reused.');
  const full = p.next === p.observed; p.phase = full ? 'full: no write' : 'space confirmed';
  if (full) s.result = 'Full: push rejected without changing payload or indices.';
  yield event('spsc.push.check', full ? 'Full: return false' : 'A slot is available', 'The full test is next(write) == acquired read. A full result is a try-operation outcome, not a wait.');
  if (full) return;
  s.slots[p.index] = value; s.writes++; p.phase = 'payload written, unpublished'; s.focus = `slot:${p.index}`;
  yield event('spsc.push.payload', 'Write the ordinary integer payload', 'Only the producer may write this available slot. The consumer still cannot treat it as queued.');
  s.write = p.next; s.stores++; s.accepted.push(value); p.phase = 'published'; s.focus = 'write'; s.result = `Published ${value}.`;
  yield event('spsc.push.publish', 'Release: publish the write index', 'A consumer acquire that observes this release sees the preceding payload write. Publication grants permission to read.');
}

export function* popSpsc(s: SpscState): Generator<EventDescription> {
  const c = s.consumer = local();
  c.index = s.read; c.phase = 'load own read'; s.loads++; s.focus = 'consumer'; s.result = '';
  yield event('spsc.pop.own', 'Consumer: load own index', 'Only this consumer writes read, so its own-index load needs no acquire ordering.');
  c.observed = s.write; c.phase = 'acquire write'; s.loads++;
  yield event('spsc.pop.acquire', 'Acquire the producer’s published write index', 'The consumer may only read queued payload after observing a publication that makes it available.');
  const empty = c.index === c.observed; c.phase = empty ? 'empty: no read' : 'payload available';
  if (empty) s.result = 'Empty: pop rejected; the output argument is unchanged.';
  yield event('spsc.pop.check', empty ? 'Empty: return false' : 'A published payload is available', 'The empty test is own read == acquired write. A delayed observation may conservatively report empty.');
  if (empty) return;
  c.value = s.slots[c.index]!; s.reads++; c.phase = 'payload copied, slot retained'; s.focus = `slot:${c.index}`;
  yield event('spsc.pop.payload', 'Copy the payload into the caller’s output', 'The int remains alive in the slot. Its queue membership ends only when the read index advances.');
  c.next = next(s, c.index); c.phase = 'compute next';
  yield event('spsc.pop.next', 'Compute the next read position', 'The producer still sees the old read index and must not reuse this slot.');
  s.read = c.next; s.stores++; s.consumed.push(c.value); c.phase = 'released'; s.focus = 'read'; s.result = `Consumed ${c.value}.`;
  yield event('spsc.pop.publish', 'Release: publish the read index', 'A producer acquire observing this release orders the completed payload read before the next overwrite.');
}

function record(s: SpscState, steps: TraceStep<SpscState, SpscEvent>[], description: EventDescription): void {
  steps.push({ ...description, event: { type: description.source?.split('.').slice(1).join(' / ').toUpperCase() ?? 'UNSAFE MODEL' }, state: copy(s) });
}
export type SpscAction = { type: 'push'; value: number } | { type: 'pop' };
export function traceSpscActions(count: number, initial: number[], actions: SpscAction[]): Trace<SpscState, SpscEvent> {
  const s = initialSpscState(count, initial), before = copy(s), steps: TraceStep<SpscState, SpscEvent>[] = [];
  for (const action of actions) for (const e of action.type === 'push' ? pushSpsc(s, action.value) : popSpsc(s)) record(s, steps, e);
  return { initial: before, steps };
}
function integer(input: FormData, name: string, fallback: number): number {
  const raw = String(input.get(name) ?? fallback).trim();
  if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error(`${name} must be an integer.`);
  return Number(raw);
}
export function buildSpscTrace(operation: string, input: FormData): Trace<SpscState, SpscEvent> {
  const count = integer(input, 'slots', 4), value = integer(input, 'value', 42);
  if (Math.abs(value) > 1000000) throw new Error('Use a payload in ±1,000,000.');
  const raw = String(input.get('values') ?? '10,20').trim();
  const initial = raw ? raw.split(',').map(piece => {
    if (!/^-?\d+$/.test(piece.trim())) throw new Error('Separate initial integer values with commas.');
    return Number(piece.trim());
  }) : [];
  if (operation === 'push' || operation === 'pop') return traceSpscActions(count, initial, [operation === 'push' ? { type: 'push', value } : { type: 'pop' }]);
  if (operation === 'wrap') {
    initialSpscState(count);
    const actions: SpscAction[] = [{ type: 'pop' }];
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < count; i++) actions.push({ type: 'push', value: round * 10 + i + 1 });
      for (let i = 0; i < count; i++) actions.push({ type: 'pop' });
    }
    return traceSpscActions(count, [], actions);
  }
  const s = initialSpscState(count), before = copy(s), steps: TraceStep<SpscState, SpscEvent>[] = [];
  const emit = (e: EventDescription) => record(s, steps, e);
  if (operation === 'publication') {
    const producer = pushSpsc(s, value);
    // Stop after payload, before release publication. The consumer sees empty.
    for (let i = 0; i < 5; i++) emit(producer.next().value!);
    for (const e of popSpsc(s)) emit(e);
    emit(producer.next().value!);
    for (const e of popSpsc(s)) emit(e);
  } else if (operation === 'reuse') {
    // Full queue: a read has occurred, but the slot is retained until release.
    const seeded = initialSpscState(count, Array.from({ length: count - 1 }, (_, i) => i + 1));
    Object.assign(s, seeded); Object.assign(before, copy(seeded));
    const consumer = popSpsc(s);
    for (let i = 0; i < 4; i++) emit(consumer.next().value!);
    for (const e of pushSpsc(s, value)) emit(e);
    for (const e of consumer) emit(e);
    for (const e of pushSpsc(s, value)) emit(e);
  } else if (operation === 'break-publication') {
    const producer = pushSpsc(s, value);
    for (let i = 0; i < 4; i++) emit(producer.next().value!);
    s.write = s.producer.next!; s.stores++; s.unsafe = true; s.producer.phase = 'UNSAFE: published before payload'; s.focus = 'write';
    emit({ source: null, title: 'Break-It: publish before writing', explanation: 'Synthetic corruption only. This is not the canonical C++ statement order. Publishing first permits a consumer to access a payload while the producer may write it.' });
    s.consumer.observed = s.write; s.consumer.phase = 'UNSAFE: payload access has no guarantee'; s.focus = 'consumer'; s.result = 'Unsafe publication: no valid payload value can be promised. Native undefined behavior is not executed.';
    emit({ source: null, title: 'Acquire cannot publish a future write', explanation: 'Acquire only orders writes before the release it observes. A later ordinary payload write could race with a read. The diagram deliberately does not invent a predictable value for that C++ data race.' });
  } else if (operation.startsWith('cas-') || operation === 'aba') {
    if (!['cas-success', 'cas-failure', 'aba'].includes(operation)) throw new Error('Unknown atomic operation.');
    s.mode = operation === 'aba' ? 'aba' : 'cas'; before.mode = s.mode;
    s.focus = 'atomic';
    if (s.mode === 'cas') {
      s.atomic.current = 7; s.atomic.expected = operation === 'cas-success' ? 7 : 6; s.atomic.history = [7];
      emit(event('spsc.cas.init', 'Initialize one atomic integer', 'The caller supplies expected; desired is 9. This scalar example is separate from the SPSC ring.'));
      s.atomic.exchanged = s.atomic.current === s.atomic.expected;
      if (s.atomic.exchanged) { s.atomic.current = 9; s.atomic.history.push(9); s.stores++; }
      else s.atomic.expected = s.atomic.current;
      s.loads++; s.result = s.atomic.exchanged ? 'CAS succeeds: current becomes 9; expected remains 7.' : 'CAS fails: current stays 7; expected is updated from 6 to 7.';
      emit(event('spsc.cas.exchange', s.atomic.exchanged ? 'Compare equal: exchange' : 'Compare unequal: refresh expected', 'Strong compare-and-exchange atomically tests the value. Success uses acquire-release; failure performs an acquire load and updates expected. The ring itself needs no CAS.'));
    } else {
      s.atomic.desired = 3; before.atomic.desired = 3;
      s.atomic.current = 1; s.atomic.history = [1];
      emit(event('spsc.aba.init', 'Head index is A', 'A=1, B=2, replacement=3. These are scalar indices; this demonstration allocates and frees no nodes.'));
      s.atomic.expected = 1; s.loads++;
      emit(event('spsc.aba.observe', 'An observer remembers A', 'A paused stack operation might also remember a next link. Equality of the head alone cannot certify that remembered topology.'));
      s.atomic.current = 2; s.atomic.history.push(2); s.stores++;
      emit(event('spsc.aba.b', 'Intervening change: A → B', 'Another operation changes the scalar head. The observer still expects A.'));
      s.atomic.current = 1; s.atomic.history.push(1); s.stores++;
      emit(event('spsc.aba.a', 'Intervening change: B → A', 'The bits are A again, despite intervening operations. A may represent reused identity in a linked-container example.'));
      s.atomic.exchanged = true; s.atomic.current = 3; s.atomic.history.push(3); s.loads++; s.stores++;
      s.result = 'CAS succeeds after A → B → A. Equality did not detect the history.';
      emit(event('spsc.aba.exchange', 'CAS sees equal bits, not history', 'A scalar CAS is behaving correctly. A higher-level algorithm that assumes unchanged topology needs an additional identity/reclamation argument.'));
    }
  } else throw new Error('Unknown SPSC operation.');
  return { initial: before, steps };
}

export function queuedSlots(s: SpscState): number[] {
  const out: number[] = [];
  for (let index = s.read; index !== s.write && out.length < s.slots.length; index = next(s, index)) out.push(index);
  return out;
}
export function spscInvariants(s: SpscState): Invariant[] {
  if (s.mode !== 'ring') return [{ name: 'Scalar atomic example', status: 'pass', detail: 'No nodes are reclaimed. CAS value equality is separate from historical identity.' }];
  const queued = queuedSlots(s).map(i => s.slots[i]);
  const expected = s.accepted.slice(s.consumed.length);
  return [
    { name: 'Indices stay in physical storage', status: [s.read, s.write].every(i => i >= 0 && i < s.slots.length) ? 'pass' : 'fail', detail: `N=${s.slots.length}; usable capacity=${s.slots.length - 1}.` },
    { name: 'Payload before publication', status: s.unsafe ? 'fail' : 'pass', detail: s.unsafe ? 'A write index was published without its prior payload write. Reading would be unsafe.' : 'Only published payloads are available; pending writes remain private to the producer.' },
    { name: 'FIFO and reserved-slot membership', status: JSON.stringify(queued) === JSON.stringify(expected) && s.consumed.every((v, i) => v === s.accepted[i]) ? 'pass' : 'fail', detail: s.unsafe ? 'The synthetic fault advertises a queue entry with no established payload.' : 'Published, unreleased entries match successful pushes minus released pops.' },
    { name: 'Storage lifetime differs from queue membership', status: 'pass', detail: 'Every int remains alive; leaving the queue does not destroy its slot object.' },
  ];
}
