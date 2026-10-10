/**
 * Worked examples for I.2: the distance between two points, one trace per example. The first frames (displacement, squares, sum) are written
 * from the segment model (`deriveSegment`); the radical working of √(dx² + dy²) is I.1's own trace (`workedFramesFor`), reused, so the two
 * chapters never explain the same step in two different ways. The last frame goes the other way, to show the distance has no direction.
 */
import { deriveSegment, type SegmentState } from '../../math/coordinates/segment';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { aligned } from '../shared/format';
import { baseTex, rationalTex } from '../quantities/values';
import { workedFramesFor, type WorkState } from '../quantities/worked-lesson';
import { rationalForm } from '../../math/quantity/exactform';
import { neg } from '../../math/quantity/rational';

export interface DistanceExample {
  readonly id: string;
  readonly label: string;
  readonly state: SegmentState;
}
const example = (id: string, label: string, state: SegmentState): DistanceExample => Object.freeze({ id, label, state: Object.freeze(state) });
export const DISTANCE_EXAMPLES: readonly DistanceExample[] = Object.freeze([
  example('d1', '(1, 2) → (4, 6)', { ax: 1, ay: 2, bx: 4, by: 6 }),
  example('d2', '(−3, 1) → (3, −3)', { ax: -3, ay: 1, bx: 3, by: -3 }),
  example('d3', '(0.5, −1.5) → (−2, 2)', { ax: 0.5, ay: -1.5, bx: -2, by: 2 }),
  example('d4', '(−3, −2) → (2, 4)', { ax: -3, ay: -2, bx: 2, by: 4 }),
]);

export function distanceFrames(state: SegmentState): readonly TraceFrame<WorkState>[] {
  const s = deriveSegment(state);
  const pair = (x: typeof s.dx, y: typeof s.dx) => `\\left(${rationalTex(x)},\\ ${rationalTex(y)}\\right)`;
  const frames: { state: WorkState }[] = [];
  frames.push({
    state: {
      tex: aligned([`A&=${pair(s.a.x, s.a.y)}`, `B&=${pair(s.b.x, s.b.y)}`]),
      caption: 'We want the distance between the two points A and B, a length. It should not matter which point we call first.',
    },
  });
  frames.push({
    state: {
      tex: aligned([`B-A&=\\left(x_B-x_A,\\ y_B-y_A\\right)`, `&=\\left(${rationalTex(s.b.x)}-${baseTex(s.a.x)},\\ ${rationalTex(s.b.y)}-${baseTex(s.a.y)}\\right)=${pair(s.dx, s.dy)}`]),
      caption: 'Subtract coordinate by coordinate: the displacement from A to B. The legs of the right triangle between the points have lengths |dx| and |dy|.',
    },
  });
  frames.push({
    state: {
      tex: aligned([`dx^{2}&=${baseTex(s.dx)}^{2}=${rationalTex(s.dxSq)}`, `dy^{2}&=${baseTex(s.dy)}^{2}=${rationalTex(s.dySq)}`]),
      caption: 'Square each leg. A square is never negative, so the signs of dx and dy have disappeared: this is where the direction is forgotten.',
    },
  });
  frames.push({
    state: {
      tex: `dx^{2}+dy^{2}=${rationalTex(s.dxSq)}+${rationalTex(s.dySq)}=${rationalTex(s.distSq)}`,
      caption: 'Add them. This is the squared distance, by the Pythagorean theorem for the right triangle with legs |dx| and |dy| (used here as the definition of distance in coordinates; its proof is not repeated).',
    },
  });
  for (const f of workedFramesFor(s.distSq, 2)) frames.push({ state: { tex: f.state.tex, caption: f.state.caption } });
  frames.push({
    state: {
      tex: aligned([`A-B&=${pair(s.rdx, s.rdy)}=-(B-A)`, `\\sqrt{${baseTex(neg(s.dx))}^{2}+${baseTex(neg(s.dy))}^{2}}&=\\sqrt{${rationalTex(s.distSq)}}`]),
      caption: `Check the other direction: from B to A the displacement is (${rationalForm(s.rdx).text}, ${rationalForm(s.rdy).text}), every sign flipped, and squaring brings back the same ${rationalForm(s.distSq).text}. The distance is the same either way.`,
    },
  });
  return traceFrom<WorkState>(frames);
}
