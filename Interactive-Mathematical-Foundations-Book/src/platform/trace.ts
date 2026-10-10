/**
 * Semantic traces (master plan §2.4, §6.4).
 *
 * A trace is a list of IMMUTABLE frames (deeply frozen, detached copies — see `traceFrom`) holding mathematical states/events — not screenshots, not drawing
 * commands. Navigation selects a frame; it never "undoes" a mutation.
 *
 * The cursor is pure and timer-free. Autoplay (M5, first needed by I.8 summation) lives in the stepper component
 * as an opt-in, user-started, pausable timer with the speeds below; a stepper that does not opt in has no timer at all.
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

/**
 * A deep, detached, frozen copy of `value`. Supported: primitives, arrays and plain objects (any depth, shared
 * references and cycles preserved). Anything whose contents `Object.freeze` cannot protect — Map, Set, Date,
 * typed arrays, functions, class instances — is rejected with a TypeError rather than silently left mutable.
 */
function snapshot<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (typeof value !== 'object' || value === null) {
    if (typeof value === 'function' || typeof value === 'symbol') throw new TypeError(`Trace states cannot contain a ${typeof value}`);
    return value;
  }
  const done = seen.get(value);
  if (done) return done as T;
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const item of value) copy.push(snapshot(item, seen));
    return Object.freeze(copy) as T;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new TypeError('Trace states must be plain data (arrays and plain objects); found ' + (value.constructor?.name ?? 'an exotic object'));
  const copy: Record<string, unknown> = proto === null ? Object.create(null) : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) copy[key] = snapshot((value as Record<string, unknown>)[key], seen);
  return Object.freeze(copy) as T;
}

/**
 * Builds a trace of genuinely stable historical snapshots: every frame is a deep, detached, frozen copy, so
 * neither later mutation of the objects passed in nor an attempt to edit a stored state can change history.
 */
export function traceFrom<TState, TEvent = never>(
  frames: readonly Omit<TraceFrame<TState, TEvent>, 'index'>[],
): readonly TraceFrame<TState, TEvent>[] {
  return Object.freeze(frames.map((frame, index) => snapshot({ ...frame, index }) as TraceFrame<TState, TEvent>));
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

/** Playback speeds offered by a stepper that autoplays (plan §2.4), and the pause between frames at 1×. Pure, so it is testable without timers. */
export const PLAY_SPEEDS = [0.5, 1, 2] as const;
export type PlaySpeed = (typeof PLAY_SPEEDS)[number];
export const BASE_FRAME_MS = 1400;
export const frameDelay = (speed: PlaySpeed): number => Math.round(BASE_FRAME_MS / speed);
