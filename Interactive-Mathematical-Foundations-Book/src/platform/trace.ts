/**
 * Semantic traces (master plan §2.4, §6.4).
 *
 * A trace is a list of IMMUTABLE frames holding mathematical states/events — not screenshots, not drawing
 * commands. Navigation selects a frame; it never "undoes" a mutation.
 *
 * Scope in M2: the frame type and a pure cursor. There is deliberately NO timer, autoplay or speed control
 * here: nothing in M2 needs one, and §2.4's full player (play / pause / speed) arrives with the first
 * chapter that does (I.6 summation, II.1 vector addition). A timer-free cursor also has nothing to
 * disable for `prefers-reduced-motion`.
 */

export interface TraceFrame<TState, TEvent = never> {
  readonly index: number;
  readonly state: TState;
  readonly event?: TEvent;
  readonly explanation?: string;
}

export interface TraceCursor {
  /** Index of the selected frame, always within [0, count − 1]. */
  readonly index: number;
  readonly count: number;
}

export function traceFrom<TState, TEvent = never>(
  frames: readonly Omit<TraceFrame<TState, TEvent>, 'index'>[],
): readonly TraceFrame<TState, TEvent>[] {
  return Object.freeze(frames.map((frame, index) => Object.freeze({ ...frame, index }) as TraceFrame<TState, TEvent>));
}

export function cursorAt(count: number, index = 0): TraceCursor {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('A trace has at least one frame');
  return { count, index: Math.max(0, Math.min(count - 1, Math.trunc(index))) };
}

export const seek = (c: TraceCursor, index: number): TraceCursor => cursorAt(c.count, index);
export const next = (c: TraceCursor): TraceCursor => seek(c, c.index + 1);
export const previous = (c: TraceCursor): TraceCursor => seek(c, c.index - 1);
export const reset = (c: TraceCursor): TraceCursor => seek(c, 0);
export const atStart = (c: TraceCursor): boolean => c.index === 0;
export const atEnd = (c: TraceCursor): boolean => c.index === c.count - 1;
