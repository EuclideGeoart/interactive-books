/**
 * TrigGraph — the sine and cosine graphs over [−2π, 2π], with the current angle marked. It is NOT a CoordinatePlane: a plane keeps one scale
 * on both axes and is square, which would flatten a wave whose height is 2 and whose length is 4π. This figure scales x and y separately
 * (it is a graph of two functions of θ, not a picture of the plane) and says so in its caption.
 *
 * The curves are precomputed polylines (world units: θ in radians, height in [−1, 1]); this component only maps them to pixels.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Polyline } from '../../platform/geometry/curve';
import { useScopedId } from '../../ui/ids';
import { GRAPH_RANGE, type GraphMarkers } from './circle-lesson';

/** The label for t = m·π/2: 0, π/2, π, 3π/2, 2π and their negatives, with the typographic minus. */
export function halfPiLabel(m: number): string {
  if (m === 0) return '0';
  const sign = m < 0 ? '−' : '';
  const a = Math.abs(m);
  if (a % 2 === 0) { const n = a / 2; return `${sign}${n === 1 ? '' : n}π`; }
  return `${sign}${a === 1 ? '' : a}π/2`;
}

const HEIGHT = 200;
const PAD = { left: 14, right: 14, top: 14, bottom: 30 };

export function TrigGraph({ sin, cos, markers, label, description }: { sin: readonly Polyline[]; cos: readonly Polyline[]; markers: GraphMarkers; label: string; description: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(560);
  const descId = useScopedId();
  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const measure = () => { const w = Math.round(svg.getBoundingClientRect().width); if (w >= 120) setWidth(prev => (prev === w ? prev : w)); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const px = (t: number): number => PAD.left + ((t - GRAPH_RANGE.xMin) / (GRAPH_RANGE.xMax - GRAPH_RANGE.xMin)) * innerW;
  const py = (y: number): number => PAD.top + ((GRAPH_RANGE.yMax - y) / (GRAPH_RANGE.yMax - GRAPH_RANGE.yMin)) * innerH;
  const path = (lines: readonly Polyline[]): string => lines.map(l => l.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ')).join(' ');
  const wide = width >= 470;
  // tick positions at multiples of π/2 (wide) or π (narrow), labelled with exact multiples of π
  const stepHalfPi = wide ? 1 : 2;
  const ticks: { t: number; text: string }[] = [];
  for (let k = -4; k <= 4; k += stepHalfPi) {
    ticks.push({ t: (k * Math.PI) / 2, text: halfPiLabel(k) });
  }
  const x0 = px(0);
  const y0 = py(0);
  const inRange = markers.theta >= GRAPH_RANGE.xMin && markers.theta <= GRAPH_RANGE.xMax;

  return (
    <div class="trig-graph-wrap">
      <svg ref={ref} class="trig-graph" viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={label} aria-describedby={descId} data-trig-graph>
        <g class="tg-grid" aria-hidden="true">
          {ticks.map(t => <line key={t.t} x1={px(t.t)} y1={PAD.top} x2={px(t.t)} y2={HEIGHT - PAD.bottom} />)}
          {[-1, 1].map(h => <line key={h} x1={PAD.left} y1={py(h)} x2={width - PAD.right} y2={py(h)} />)}
        </g>
        <g class="tg-axes" aria-hidden="true">
          <line x1={PAD.left} y1={y0} x2={width - PAD.right} y2={y0} />
          <line x1={x0} y1={PAD.top} x2={x0} y2={HEIGHT - PAD.bottom} />
          {ticks.map(t => <text key={t.t} x={px(t.t)} y={HEIGHT - 10} text-anchor="middle">{t.text}</text>)}
          <text x={x0 + 5} y={py(1) - 4} text-anchor="start">1</text>
          <text x={x0 + 5} y={py(-1) + 13} text-anchor="start">−1</text>
        </g>
        <path class="tg-curve role-y" data-part="graph-sin" d={path(sin)} />
        <path class="tg-curve role-x tg-cos" data-part="graph-cos" d={path(cos)} />
        <text class="tg-label role-y" x={px(Math.PI / 2) + 7} y={py(1) - 5} aria-hidden="true">sin θ</text>
        <text class="tg-label role-x" x={px(-Math.PI) + 8} y={py(-1) + 15} aria-hidden="true">cos θ</text>
        {inRange && (
          <g aria-hidden="true">
            <line class="tg-marker-line" data-part="graph-theta" x1={px(markers.theta)} y1={PAD.top} x2={px(markers.theta)} y2={HEIGHT - PAD.bottom} />
            <circle class="marker role-y is-filled" data-part="graph-sin-point" cx={px(markers.sin.x)} cy={py(markers.sin.y)} r={5.5} />
            <circle class="marker role-x is-filled" data-part="graph-cos-point" cx={px(markers.cos.x)} cy={py(markers.cos.y)} r={5.5} />
          </g>
        )}
      </svg>
      <p id={descId} class="sr-only">{description}</p>
    </div>
  );
}
