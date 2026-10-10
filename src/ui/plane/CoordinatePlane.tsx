/**
 * CoordinatePlane — a mathematical plane (x right, y up) drawn in SVG.
 *
 * It owns exactly three things: measuring its container, the world→screen `Viewport`, and the axes/grid.
 * Everything else (arrows, labels, handles) is a child that speaks WORLD coordinates through `usePlane()`.
 *
 *  - 1 SVG unit = 1 CSS pixel, so strokes, labels and hit areas keep their size on a phone.
 *  - One uniform scale: axes can never be stretched (plan §7.3).
 *  - The server renders at `initialSize`; the client re-measures after hydration. The aspect ratio is fixed
 *    (square), so the layout does not move when that happens.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { fitViewport, niceTickStep, tickPositions, visibleWorld, worldToScreen, type WorldWindow } from '../../platform/geometry/viewport';
import { formatGiven } from '../../platform/numeric/format';
import { PlaneContext } from './PlaneContext';

export interface CoordinatePlaneProps {
  window: WorldWindow;
  /** Short accessible name for the whole figure. */
  label: string;
  /** Longer text alternative; read by assistive technology, hidden visually. */
  description: string;
  initialSize?: number;
  children?: ComponentChildren;
}

const AXIS_ARROW = 9;

function Grid({ vp }: { vp: ReturnType<typeof fitViewport> }) {
  const seen = visibleWorld(vp);
  const gridStep = niceTickStep(vp.scale, 22);
  const xs = tickPositions(seen.xMin, seen.xMax, gridStep).filter(v => v !== 0);
  const ys = tickPositions(seen.yMin, seen.yMax, gridStep).filter(v => v !== 0);
  return (
    <g class="plane-grid" aria-hidden="true">
      {xs.map(v => { const p = worldToScreen(vp, { x: v, y: 0 }); return <line key={`gx${v}`} x1={p.x} y1={0} x2={p.x} y2={vp.height} />; })}
      {ys.map(v => { const p = worldToScreen(vp, { x: 0, y: v }); return <line key={`gy${v}`} x1={0} y1={p.y} x2={vp.width} y2={p.y} />; })}
    </g>
  );
}

function Axes({ vp }: { vp: ReturnType<typeof fitViewport> }) {
  const seen = visibleWorld(vp);
  const o = worldToScreen(vp, { x: 0, y: 0 });
  const labelStep = niceTickStep(vp.scale, 34);
  // Skip ticks within 16 px of the frame: their numerals would be clipped by the plane's border.
  const EDGE = 16;
  const xTicks = tickPositions(seen.xMin, seen.xMax, labelStep).filter(v => v !== 0 && worldToScreen(vp, { x: v, y: 0 }).x > EDGE && worldToScreen(vp, { x: v, y: 0 }).x < vp.width - EDGE);
  const yTicks = tickPositions(seen.yMin, seen.yMax, labelStep).filter(v => v !== 0 && worldToScreen(vp, { x: 0, y: v }).y > EDGE && worldToScreen(vp, { x: 0, y: v }).y < vp.height - EDGE);
  const right = vp.width - 1;
  const top = 1;
  return (
    <g class="plane-axes" aria-hidden="true">
      {xTicks.map(v => { const p = worldToScreen(vp, { x: v, y: 0 }); return <g key={`tx${v}`}><line class="tick" x1={p.x} y1={o.y - 4} x2={p.x} y2={o.y + 4} /><text class="tick-label" x={p.x} y={o.y + 19} text-anchor="middle">{formatGiven(v).text}</text></g>; })}
      {yTicks.map(v => { const p = worldToScreen(vp, { x: 0, y: v }); return <g key={`ty${v}`}><line class="tick" x1={o.x - 4} y1={p.y} x2={o.x + 4} y2={p.y} /><text class="tick-label" x={o.x - 9} y={p.y} text-anchor="end" dominant-baseline="central">{formatGiven(v).text}</text></g>; })}
      <text class="tick-label" x={o.x - 9} y={o.y + 19} text-anchor="end">0</text>
      <line class="axis" x1={0} y1={o.y} x2={right - AXIS_ARROW + 2} y2={o.y} />
      <line class="axis" x1={o.x} y1={vp.height} x2={o.x} y2={top + AXIS_ARROW - 2} />
      <path class="axis-head" d={`M${right} ${o.y} l${-AXIS_ARROW} ${-4} v8 z`} />
      <path class="axis-head" d={`M${o.x} ${top} l${-4} ${AXIS_ARROW} h8 z`} />
      <text class="axis-name" x={right - 4} y={o.y - 12} text-anchor="end">x</text>
      <text class="axis-name" x={o.x + 12} y={top + 12}>y</text>
    </g>
  );
}

export function CoordinatePlane({ window, label, description, initialSize = 560, children }: CoordinatePlaneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: initialSize, height: initialSize });
  const descriptionId = useId();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const box = svg.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) return;
      const next = { width: Math.round(box.width * 100) / 100, height: Math.round(box.height * 100) / 100 };
      setSize(prev => (prev.width === next.width && prev.height === next.height ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const vp = useMemo(() => fitViewport(window, size), [window, size]);
  const context = useMemo(() => ({ vp, svgRef }), [vp]);

  return (
    <div class="plane-wrap">
      <svg ref={svgRef} class="plane" viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={label} aria-describedby={descriptionId} data-plane data-scale={vp.scale}>
        <PlaneContext.Provider value={context}>
          <Grid vp={vp} />
          <Axes vp={vp} />
          {children}
        </PlaneContext.Provider>
      </svg>
      <p id={descriptionId} class="sr-only">{description}</p>
    </div>
  );
}
