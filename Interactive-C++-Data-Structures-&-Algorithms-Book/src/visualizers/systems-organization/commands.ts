import { integer, invariant, recorder, type Command, type CommandsState } from './types';
export function commandsTrace(operation: string, inputs: FormData) {
  const id = integer(inputs, 'id', 0, 0, 7), generation = integer(inputs, 'generation', 1, 1, 65535), value = integer(inputs, 'value', 5, -100, 100);
  const s: CommandsState = { kind: 'commands', slots: Array.from({ length: 8 }, (_, i) => ({ generation: 1, value: i === 0 ? 10 : null })), commands: [], reports: [], cursor: 0, recorded: 0, executed: 0, failures: 0, validations: 0, flushing: false };
  const { trace, emit } = recorder(s);
  const c = (kind: number, index = -1, gen = 0, v = 0): Command => ({ kind, target: { index, generation: gen }, value: v });
  const ordered = [c(0, -1, 0, 11), c(1, 1, 1, value), c(2, 0, 1), c(1, 0, 1, value), c(0, -1, 0, 22), c(1, 0, 2, value)];
  const list = operation === 'ordered' || operation === 'record' || operation === 'replay' ? ordered : operation === 'stale' ? [c(2, id, generation), c(1, id, generation, value), c(0, -1, 0, value)] : operation === 'move' ? [c(1, id, generation, value)] : operation === 'full' ? Array.from({ length: 9 }, () => c(0, -1, 0, value)) : null;
  if (!list) throw new Error('Unknown command-buffer operation.');
  for (const command of list) { s.commands.push(command); ++s.recorded; emit('commands.record', 'Append an owned command record', 'Recording changes the buffer only. The world retains its current values and lifetimes.'); }
  if (operation === 'record') return trace;
  s.flushing = true; s.cursor = 0; s.reports = []; emit('commands.begin', 'Begin ordered best-effort flush', 'Each command executes once in record order. A failed command does not stop later commands.');
  for (const command of s.commands) {
    let code = 0, handle = { ...command.target };
    if (command.kind === 0) {
      const free = s.slots.findIndex(slot => slot.value === null && slot.generation < 65535);
      if (free < 0) code = 2;
      else { s.slots[free]!.value = command.value; handle = { index: free, generation: s.slots[free]!.generation }; emit('commands.create', 'Create a live world value', `Creation selects lowest free slot ${free}. The returned handle belongs in this command’s report.`); }
    } else {
      ++s.validations; const slot = s.slots[command.target.index]; const ok = slot && slot.value !== null && slot.generation === command.target.generation;
      emit('commands.validate', ok ? 'VALID HANDLE at execution time' : 'STALE HANDLE at execution time', `Check {${command.target.index},${command.target.generation}} immediately before mutation.`);
      if (!ok) code = 1;
      else if (command.kind === 2) { slot.value = null; ++slot.generation; emit('commands.delete', 'Destroy the value and advance generation', 'The inspector now shows no live value; metadata remains for rejecting stale handles.'); }
      else { slot.value! += command.value; emit('commands.move', 'Apply the owned delta', 'Execution uses the recorded scalar payload; it retains no borrowed pointer.'); }
    }
    s.reports.push({ command: s.cursor, code, handle }); ++s.executed; if (code) ++s.failures; ++s.cursor;
    emit('commands.report', code ? 'Record failure and continue' : 'Record success', code === 1 ? 'Stale target: no world mutation. Later records still execute.' : code === 2 ? 'World full: creation failed without changing earlier results.' : 'The report retains the result after the command buffer is cleared.');
  }
  s.commands = []; s.flushing = false; s.cursor = 0; emit('commands.end', 'Finish the stable mutation boundary', 'Records are consumed; reports remain. Replay means re-running the same log from the same initial world.');
  return trace;
}
export function commandsInvariants(s: CommandsState) {
  return [invariant('Every completed command has one report', s.executed === s.reports.length, 'Failures are completed attempts too.'),
    invariant('Failures are counted without rollback', s.failures === s.reports.filter(r => r.code !== 0).length, 'Successful earlier mutations remain in the world.'),
    invariant('Reports preserve execution order', s.reports.every((r, i) => r.command === i), 'Replay also requires the same initial generations and allocation rule.'),
    invariant('Finite generations stay valid', s.slots.every(slot => slot.generation >= 1 && slot.generation <= 65535), 'Retirement prevents wraparound in this bounded example.')];
}
