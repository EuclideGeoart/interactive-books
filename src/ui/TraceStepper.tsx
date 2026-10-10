/**
 * TraceStepper — Reset / Previous / Next and direct selection over a trace of IMMUTABLE frames (plan §2.4).
 * Selecting an earlier frame shows that frame; nothing is "undone". Deliberately timer-free: Play / Pause /
 * Speed arrive with the first chapter that needs them (see platform/trace.ts).
 */
import type { ComponentChildren } from 'preact';
import { atEnd, atStart, next, previous, reset, seek, type TraceCursor, type TraceFrame } from '../platform/trace';

export interface TraceStepperProps<S> {
  label: string;
  frames: readonly TraceFrame<S>[];
  cursor: TraceCursor;
  onCursor(next: TraceCursor): void;
  renderFrame(frame: TraceFrame<S>): ComponentChildren;
  /** Short text for the range input's `aria-valuetext`. */
  describeFrame(frame: TraceFrame<S>): string;
}

export function TraceStepper<S>({ label, frames, cursor, onCursor, renderFrame, describeFrame }: TraceStepperProps<S>) {
  const frame = frames[cursor.index]!;
  return (
    <div class="trace" role="group" aria-label={label} data-trace-index={cursor.index}>
      <div class="trace-body" aria-live="polite" aria-atomic="true">{renderFrame(frame)}</div>
      <div class="trace-controls">
        <button type="button" onClick={() => onCursor(reset(cursor))} disabled={atStart(cursor)}>Reset</button>
        <button type="button" onClick={() => onCursor(previous(cursor))} disabled={atStart(cursor)}><span aria-hidden="true">←</span> Previous</button>
        <button type="button" onClick={() => onCursor(next(cursor))} disabled={atEnd(cursor)}>Next <span aria-hidden="true">→</span></button>
        <label class="trace-scrub">
          <span class="trace-count" data-trace-count>Step {cursor.index + 1} of {cursor.count}</span>
          <input type="range" min={0} max={cursor.count - 1} step={1} value={cursor.index} aria-label={`${label}: step`} aria-valuetext={`Step ${cursor.index + 1} of ${cursor.count}: ${describeFrame(frame)}`} onInput={event => onCursor(seek(cursor, Number((event.currentTarget as HTMLInputElement).value)))} />
        </label>
      </div>
    </div>
  );
}
