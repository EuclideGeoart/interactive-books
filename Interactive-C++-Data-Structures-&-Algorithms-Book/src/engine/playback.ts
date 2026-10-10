import type { Trace, TraceStep, MemoryState, TraceEvent } from './types';

// Playback indexes immutable semantic snapshots. Time never mutates the model.
export class PlaybackController<S = MemoryState, E = TraceEvent> {
  index = 0;
  playing = false;
  speed = 1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(public trace: Trace<S, E>, private readonly onChange: () => void = () => {}) {}
  get total(): number { return this.trace.steps.length; }
  get step(): TraceStep<S, E> | undefined { return this.trace.steps[this.index - 1]; }
  get state(): S { return this.step?.state ?? this.trace.initial; }
  seek(index: number): void {
    this.pause(false);
    this.index = Math.max(0, Math.min(this.total, Math.trunc(index)));
    this.onChange();
  }
  next(): void { this.seek(this.index + 1); }
  previous(): void { this.seek(this.index - 1); }
  reset(): void { this.seek(0); }
  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(4, speed));
    if (this.playing) { this.pause(false); this.play(); }
  }
  play(): void {
    if (this.playing || this.total === 0) return;
    if (this.index === this.total) this.index = 0;
    this.playing = true;
    this.onChange();
    this.schedule();
  }
  private schedule(): void {
    this.timer = setTimeout(() => {
      if (!this.playing) return;
      this.index++;
      if (this.index >= this.total) this.playing = false;
      this.onChange();
      if (this.playing) this.schedule();
    }, 1100 / this.speed);
  }
  pause(notify = true): void {
    clearTimeout(this.timer);
    this.playing = false;
    if (notify) this.onChange();
  }
  dispose(): void { this.pause(false); }
}
