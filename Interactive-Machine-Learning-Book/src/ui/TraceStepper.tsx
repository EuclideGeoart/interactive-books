import { atEnd, atStart, cursorAt, next, previous, type TraceFrame } from '../platform/trace';
export default function TraceStepper<S>({ frames, index, onSeek }: { frames: readonly TraceFrame<S>[]; index: number; onSeek(index: number): void }) {
  const cursor = cursorAt(frames.length, index);
  return <nav class="trace-stepper" aria-label="Trace playback">
    <button disabled={atStart(cursor)} onClick={() => onSeek(0)}>First</button>
    <button disabled={atStart(cursor)} onClick={() => onSeek(previous(cursor).index)}>Previous</button>
    <span>Frame {cursor.index + 1} / {cursor.count}</span>
    <button disabled={atEnd(cursor)} onClick={() => onSeek(next(cursor).index)}>Next</button>
    <p>{frames[cursor.index]?.explanation}</p>
  </nav>;
}
