/**
 * useLesson — the one place a lesson's mathematical state lives (master plan §6.2).
 *
 *   state (canonical, immutable)  →  derived  →  every view
 *
 * Views receive `derived`; none keeps its own copy of x, y, a formula string or an inspector value.
 * `reset` always restores the canonical state (plan §13 B).
 */
import { useCallback, useMemo, useState } from 'preact/hooks';

export interface Lesson<S, D> {
  readonly state: S;
  readonly derived: D;
  readonly isCanonical: boolean;
  set(next: S): void;
  reset(): void;
}

export function useLesson<S extends object, D>(canonical: S, derive: (state: S) => D): Lesson<S, D> {
  const [state, setState] = useState<S>(canonical);
  const derived = useMemo(() => derive(state), [state, derive]);
  const reset = useCallback(() => setState(canonical), [canonical]);
  const isCanonical = (Object.keys(canonical) as (keyof S)[]).every(key => Object.is(state[key], canonical[key]));
  return { state, derived, isCanonical, set: setState, reset };
}
