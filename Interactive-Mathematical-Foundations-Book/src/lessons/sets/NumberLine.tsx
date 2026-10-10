/**
 * NumberLine — three stacked rows (A, B and the result) on one real line, with the test point marked. It is NOT a CoordinatePlane: there is
 * one axis and no second dimension, so a plain SVG scaled to its measured width (the same approach as `TrigGraph`) keeps the type size honest.
 *
 * Ends are drawn by SHAPE, not only colour: a filled dot is an included (closed) end, a hollow ring an excluded (open) end, and an arrow
 * an end that never stops. A single included point is one filled dot. An empty set is written out in words.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { useScopedId } from '../../ui/ids';
import { LINE_RANGE, type LinePiece, type LineRow } from './interval-lesson';

const PAD = { left: 18, right: 18 };
const ROW_Y = { a: 58, b: 112, result: 176 } as const;
const AXIS_Y = 224;
const HEIGHT = 262;
const DOT = 7;

export function NumberLine({ rows, x, label, description }: { rows: readonly LineRow[]; x: number; label: string; description: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(560);
  const descId = useScopedId();
  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const measure = () => { const w = Math.round(svg.getBoundingClientRect().width); if (w >= 160) setWidth(prev => (prev === w ? prev : w)); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const px = (t: number): number => PAD.left + ((t - LINE_RANGE.min) / (LINE_RANGE.max - LINE_RANGE.min)) * innerW;
  const wide = width >= 470;
  const ticks: number[] = [];
  for (let t = LINE_RANGE.min; t <= LINE_RANGE.max; t += wide ? 1 : 2) ticks.push(t);
  const left = PAD.left;
  const right = width - PAD.right;

  const bar = (p: LinePiece, y: number, key: string) => {
    const x1 = p.lo === null ? left : px(p.lo);
    const x2 = p.hi === null ? right : px(p.hi);
    const point = p.lo !== null && p.hi !== null && p.lo === p.hi;
    return (
      <g key={key} class="nl-piece" data-piece={`${p.loClosed ? '[' : '('}${p.lo ?? '-inf'},${p.hi ?? 'inf'}${p.hiClosed ? ']' : ')'}`}>
        {!point && <line class="nl-bar" x1={x1} y1={y} x2={x2} y2={y} />}
        {p.lo === null && <polygon class="nl-arrow" points={`${left - 2},${y} ${left + 12},${y - 8} ${left + 12},${y + 8}`} />}
        {p.hi === null && <polygon class="nl-arrow" points={`${right + 2},${y} ${right - 12},${y - 8} ${right - 12},${y + 8}`} />}
        {p.lo !== null && <circle class={`nl-end ${p.loClosed ? 'is-closed' : 'is-open'}`} data-end="left" cx={x1} cy={y} r={DOT} />}
        {p.hi !== null && !point && <circle class={`nl-end ${p.hiClosed ? 'is-closed' : 'is-open'}`} data-end="right" cx={x2} cy={y} r={DOT} />}
      </g>
    );
  };

  return (
    <div class="number-line-wrap">
      <svg ref={ref} class="number-line" viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={label} aria-describedby={descId} data-number-line>
        <g class="nl-grid" aria-hidden="true">
          {ticks.map(t => <line key={t} x1={px(t)} y1={24} x2={px(t)} y2={AXIS_Y} />)}
        </g>
        <g aria-hidden="true">
          {rows.map(r => (
            <g key={r.id} class={`nl-row role-${r.role}`} data-row={r.id}>
              <line class="nl-baseline" x1={left} y1={ROW_Y[r.id]} x2={right} y2={ROW_Y[r.id]} />
              <text class="nl-name" x={left} y={ROW_Y[r.id] - 18}>{r.label}</text>
              {r.pieces.length === 0 ? <text class="nl-empty" x={width / 2} y={ROW_Y[r.id] + 5} text-anchor="middle">∅ (empty: no numbers)</text> : r.pieces.map((p, i) => bar(p, ROW_Y[r.id], `${r.id}-${i}`))}
            </g>
          ))}
          <line class="nl-axis" x1={left} y1={AXIS_Y} x2={right} y2={AXIS_Y} />
          {ticks.map(t => <text key={t} class="nl-tick" x={px(t)} y={AXIS_Y + 22} text-anchor="middle">{t < 0 ? `−${-t}` : t}</text>)}
          <line class="nl-x-line" x1={px(x)} y1={24} x2={px(x)} y2={AXIS_Y} data-part="test-line" />
          <polygon class="nl-x-marker" data-part="test-point" points={`${px(x)},${AXIS_Y - 9} ${px(x) + 8},${AXIS_Y} ${px(x)},${AXIS_Y + 9} ${px(x) - 8},${AXIS_Y}`} />
          <text class="nl-x-label" x={Math.min(Math.max(px(x), left + 8), right - 8)} y={16} text-anchor="middle">x</text>
        </g>
      </svg>
      <p id={descId} class="sr-only">{description}</p>
    </div>
  );
}
