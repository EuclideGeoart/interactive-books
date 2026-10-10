import { context, record, rule, type Context } from './trace';
export interface ArenaBlock { begin: number; size: number; alignment: number; padding: number }
export interface ArenaState extends Context {
  kind: 'arena'; capacity: number; offset: number; padding: number; allocations: number; resets: number;
  candidate: number; requested: number; alignment: number; blocks: ArenaBlock[];
}
export function arenaTrace(operation: string, inputs: FormData) {
  const raw = String(inputs.get('requests') ?? '5:1,8:4,7:8');
  const requests = raw.split(',').map(token => {
    if (!/^\s*\d+\s*:\s*\d+\s*$/.test(token)) throw new Error('Use size:alignment pairs, such as 5:1,8:4.');
    return token.split(':').map(Number) as [number, number];
  });
  if (requests.length > 8 || requests.some(pair => pair.some(n => !Number.isSafeInteger(n) || n > 256))) throw new Error('Use at most eight requests with values in 0..256.');
  const s: ArenaState = { ...context(), kind: 'arena', capacity: 64, offset: 0, padding: 0, allocations: 0, resets: 0, candidate: 0, requested: 0, alignment: 1, blocks: [] };
  const { trace, emit } = record(s);
  const allocate = (size: number, alignment: number) => {
    if (size === 0 || alignment === 0 || alignment > 16 || (alignment & (alignment - 1)) !== 0) {
      emit('arena.reject', 'Reject invalid request', 'Require size > 0 and power-of-two alignment no larger than backing alignment 16.'); return;
    }
    s.requested = size; s.alignment = alignment; s.candidate = Math.ceil(s.offset / alignment) * alignment;
    emit('arena.align', 'Round offset upward', `Offset ${s.offset} aligns to ${s.candidate}; padding would be ${s.candidate - s.offset} bytes.`);
    if (size > 64 - s.candidate) { emit('arena.exhausted', 'Preserve bump pointer', `Request does not fit; offset remains ${s.offset}. No reservation occurred.`); return; }
    const padding = s.candidate - s.offset;
    s.blocks.push({ begin: s.candidate, size, alignment, padding }); s.padding += padding; ++s.allocations; s.offset = s.candidate + size; s.active = s.blocks.length - 1;
    emit('arena.reserve', 'Advance bump pointer', `Reserve [${s.candidate}, ${s.offset}); these bytes contain no object constructed by the arena.`);
  };
  if (operation === 'exhaustion') { allocate(64, 1); allocate(1, 1); }
  else {
    for (const [size, alignment] of requests) allocate(size, alignment);
    if (operation === 'reset') {
      s.offset = s.padding = s.candidate = s.requested = 0; s.blocks = []; s.active = null; ++s.resets;
      emit('arena.reset', 'Bulk reset raw storage', 'Every previous span is invalid for arena use. No destructors run; old bytes are not live values.');
      allocate(...requests[0]!);
    } else if (operation === 'break-it') {
      s.broken = true;
      // Force a known misaligned block even if the input uses alignment one.
      s.blocks.push({ begin: 3, size: 4, alignment: 4, padding: 0 }); s.offset = Math.max(7, s.offset); s.active = s.blocks.length - 1;
      emit(null, 'Break-It: skip alignment', 'A simulated four-aligned reservation begins at byte 3. No native object is constructed at that address.');
    } else if (operation !== 'allocate') throw new Error('Unknown arena operation.');
  }
  return trace;
}
export function arenaInvariants(s: ArenaState) {
  let end = 0;
  const disjoint = s.blocks.every(b => { const valid = b.begin >= end && b.padding === b.begin - end; end = b.begin + b.size; return valid; });
  return [rule('Offset stays within backing storage', s.offset >= 0 && s.offset <= s.capacity, `offset ${s.offset} / capacity ${s.capacity}`),
    rule('Reservations honor alignment', s.blocks.every(b => b.begin % b.alignment === 0 && b.alignment <= 16), 'Backing alignment is 16; supported alignments are 1, 2, 4, 8, 16.'),
    rule('Reservations and padding partition the used prefix', disjoint && end === s.offset && s.padding === s.blocks.reduce((sum,b) => sum + b.padding,0), 'Blocks never overlap; padding is charged exactly once.'),
    rule('Raw-byte reset has no destructor policy', true, 'Callers own any explicit object construction and destruction.')];
}
