/**
 * TraceStepper — Reset / Previous / Next and direct selection over a trace of IMMUTABLE frames (plan §2.4).
 * Selecting an earlier frame shows that frame; nothing is "undone". Timer-free by default; a stepper opts in to
 * Play / Pause / Speed with `autoplay` (first used by I.8; see platform/trace.ts).
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { PLAY_SPEEDS, atEnd, atStart, frameDelay, next, previous, reset, seek, type PlaySpeed, type TraceCursor, type TraceFrame } from '../platform/trace';
import { useScopedId } from './ids';

export interface TraceStepperProps<S> {
  label: string;
  frames: readonly TraceFrame<S>[];
  cursor: TraceCursor;
  onCursor(next: TraceCursor): void;
  renderFrame(frame: TraceFrame<S>): ComponentChildren;
  /** Short text for the range input's `aria-valuetext`. */
  describeFrame(frame: TraceFrame<S>): string;
  /** Opt in to Play / Pause and a speed control. Never starts by itself; the timer exists only while playing. */
  autoplay?: boolean;
}

export function TraceStepper<S>({ label, frames, cursor, onCursor, renderFrame, describeFrame, autoplay = false }: TraceStepperProps<S>) {
  const frame = frames[cursor.index]!;
  const uid = useScopedId();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  // The only timer: one pending step while playing. It stops at the last frame, and cleanup cancels it on pause, seek, unmount.
  useEffect(() => {
    if (!autoplay || !playing) return undefined;
    if (atEnd(cursor)) { setPlaying(false); return undefined; }
    const timer = setTimeout(() => onCursor(next(cursor)), frameDelay(speed));
    return () => clearTimeout(timer);
  }, [autoplay, playing, cursor, speed]);
  return (
    <div class="trace" role="group" aria-label={label} data-trace-index={cursor.index} data-playing={autoplay ? playing : undefined}>
      <div class="trace-body" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{renderFrame(frame)}</div>
      <div class="trace-controls">
        <button type="button" onClick={() => { setPlaying(false); onCursor(reset(cursor)); }} disabled={atStart(cursor)}>Reset</button>
        <button type="button" onClick={() => onCursor(previous(cursor))} disabled={atStart(cursor)}><span aria-hidden="true">←</span> Previous</button>
        <button type="button" onClick={() => onCursor(next(cursor))} disabled={atEnd(cursor)}>Next <span aria-hidden="true">→</span></button>
        {autoplay && (
          <>
            <button type="button" data-action="play" aria-pressed={playing} onClick={() => { if (!playing && atEnd(cursor)) onCursor(reset(cursor)); setPlaying(!playing); }}>{playing ? 'Pause' : atEnd(cursor) ? 'Replay' : 'Play'}</button>
            <label class="trace-speed" for={`${uid}-speed`}>
              <span>Speed</span>
              <select id={`${uid}-speed`} value={String(speed)} onChange={event => setSpeed(Number((event.currentTarget as HTMLSelectElement).value) as PlaySpeed)}>
                {PLAY_SPEEDS.map(s => <option value={String(s)} key={s}>{s}×</option>)}
              </select>
            </label>
          </>
        )}
        <label class="trace-scrub">
          <span class="trace-count" data-trace-count>Step {cursor.index + 1} of {cursor.count}</span>
          <input type="range" min={0} max={cursor.count - 1} step={1} value={cursor.index} aria-label={`${label}: step`} aria-valuetext={`Step ${cursor.index + 1} of ${cursor.count}: ${describeFrame(frame)}`} onInput={event => onCursor(seek(cursor, Number((event.currentTarget as HTMLInputElement).value)))} />
        </label>
      </div>
    </div>
  );
}
