/**
 * SetLine — a set of real numbers drawn on a number line from −8 to 8: a thick bar for each interval, a filled dot for an end that belongs to the set,
 * a hollow dot for an end that does not, and an arrow where the set runs on past the edge. Presentation only: the set is the model's `IntervalSet`.
 */
import { toNumber } from '../../math/quantity/rational';
import type { Interval, IntervalSet } from '../../math/functions/interval';

const LO = -8;
const HI = 8;
const W = 640;
const H = 64;
const LEFT = 28;
const RIGHT = W - 28;
const AXIS = 36;
const px = (v: number): number => LEFT + ((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * (RIGHT - LEFT);

function Bar({ i, role }: { i: Interval; role: string }) {
  const lo = i.lo === null ? LO : toNumber(i.lo);
  const hi = i.hi === null ? HI : toNumber(i.hi);
  const point = i.lo !== null && i.hi !== null && lo === hi;
  return (
    <g class={`setline-part role-${role}`} data-interval>
      {!point && <line class="setline-bar" x1={px(lo)} y1={AXIS} x2={px(hi)} y2={AXIS} />}
      {i.lo === null && <path class="setline-arrow" d={`M${px(LO) - 2} ${AXIS} l12 -8 v16 z`} />}
      {i.hi === null && <path class="setline-arrow" d={`M${px(HI) + 2} ${AXIS} l-12 -8 v16 z`} />}
      {i.lo !== null && <circle class={`setline-end ${i.loClosed ? 'is-filled' : 'is-open'}`} cx={px(lo)} cy={AXIS} r="6.5" />}
      {i.hi !== null && !point && <circle class={`setline-end ${i.hiClosed ? 'is-filled' : 'is-open'}`} cx={px(hi)} cy={AXIS} r="6.5" />}
    </g>
  );
}

export function SetLine({ set, label, role = 'x', name }: { set: IntervalSet; label: string; role?: 'x' | 'y' | 'primary'; name: string }) {
  const ticks: number[] = [];
  for (let v = LO; v <= HI; v += 2) ticks.push(v);
  return (
    <svg class="setline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} data-setline={name} preserveAspectRatio="xMidYMid meet">
      <line class="setline-axis" x1={LEFT - 12} y1={AXIS} x2={RIGHT + 12} y2={AXIS} />
      {ticks.map(v => (
        <g key={v} aria-hidden="true">
          <line class="setline-tick" x1={px(v)} y1={AXIS - 5} x2={px(v)} y2={AXIS + 5} />
          <text class="setline-num" x={px(v)} y={AXIS + 22} text-anchor="middle">{v < 0 ? `−${-v}` : v}</text>
        </g>
      ))}
      {set.map((i, k) => <Bar key={k} i={i} role={role} />)}
    </svg>
  );
}
