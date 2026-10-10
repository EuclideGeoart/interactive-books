/**
 * The working behind a distance, as DATA for the worked-example trace: the displacement, the squares of its legs, their sum, and the
 * radical working of √(sum) from I.1 (`radicalWork`). The trace in the lesson layer only writes these numbers.
 */
import { radicalWork, type RadicalWork } from '../quantity/worked';
import { deriveSegment, type SegmentDerived, type SegmentState } from './segment';

export interface DistanceWork {
  readonly segment: SegmentDerived;
  /** Working for √(dx² + dy²); `null` when the distance is 0 (the points coincide). */
  readonly work: RadicalWork | null;
}

export function deriveDistanceWork(state: SegmentState): DistanceWork {
  const segment = deriveSegment(state);
  return { segment, work: radicalWork(segment.distSq, 2) };
}
