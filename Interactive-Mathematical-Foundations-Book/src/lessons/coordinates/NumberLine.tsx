/**
 * NumberLine — a one-dimensional "plane": a horizontal line with a scale, drawn in SVG, that provides the same PlaneContext as
 * CoordinatePlane so the shared DragPoint, Segment, Arrow, DimensionLine and PlaneLabel work on it unchanged.
 *
 * Why not CoordinatePlane: that component is a square coordinate plane with BOTH axes (a y-axis would cut the line at 0). This one draws
 * a single axis, with a flat aspect ratio (set in coordinates.css), and the same uniform scale: 1 world unit is the same number of pixels
 * everywhere, so distances on the line are truthful.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { fitViewport, niceTickStep, tickPositions, visibleWorld, worldToScreen } from '../../platform/geometry/viewport';
import { formatGiven } from '../../platform/numeric/format';
import { useScopedId } from '../../ui/ids';
import { PlaneContext } from '../../ui/plane/PlaneContext';

export interface NumberLineProps {
  window: { readonly xMin: number; readonly xMax: number };
  label: string;
  description: string;
  children?: ComponentChildren;
}

const HEAD = 9;
const AXIS_FROM_TOP = 0.42;
const INITIAL = { width: 560, height: 262 };

export function NumberLine({ window, label, description, children }: NumberLineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState(INITIAL);
  const descriptionId = useScopedId();

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

  // The width decides the scale. The window is made exactly as tall as the plane, with the axis 42 % of the way down: the dimension line and
  // the labels above the axis need less room than the signed-step arrow and its label below it.
  const vp = useMemo(() => {
    const worldHeight = (size.height * (window.xMax - window.xMin)) / size.width;
    return fitViewport({ xMin: window.xMin, xMax: window.xMax, yMin: -(1 - AXIS_FROM_TOP) * worldHeight, yMax: AXIS_FROM_TOP * worldHeight }, size);
  }, [window.xMin, window.xMax, size]);
  const context = useMemo(() => ({ vp, svgRef }), [vp]);
  const seen = visibleWorld(vp);
  const o = worldToScreen(vp, { x: 0, y: 0 });
  const labelStep = niceTickStep(vp.scale, 34);
  const EDGE = 16;
  const unitTicks = tickPositions(seen.xMin, seen.xMax, 1);
  const labelled = tickPositions(seen.xMin, seen.xMax, Math.max(1, labelStep)).filter(v => {
    const x = worldToScreen(vp, { x: v, y: 0 }).x;
    return x > EDGE && x < vp.width - EDGE;
  });
  const right = vp.width - 1;

  return (
    <div class="plane-wrap">
      <svg ref={svgRef} class="plane numberline" viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={label} aria-describedby={descriptionId} data-plane data-numberline data-scale={vp.scale}>
        <PlaneContext.Provider value={context}>
          <g class="plane-grid" aria-hidden="true">
            {unitTicks.filter(v => v !== 0).map(v => { const p = worldToScreen(vp, { x: v, y: 0 }); return <line key={`g${v}`} x1={p.x} y1={0} x2={p.x} y2={vp.height} />; })}
          </g>
          <g class="plane-axes" aria-hidden="true">
            {unitTicks.map(v => { const p = worldToScreen(vp, { x: v, y: 0 }); return <line key={`t${v}`} class="tick" x1={p.x} y1={o.y - 5} x2={p.x} y2={o.y + 5} />; })}
            {labelled.map(v => { const p = worldToScreen(vp, { x: v, y: 0 }); return <text key={`l${v}`} class="tick-label" x={p.x} y={o.y + 21} text-anchor="middle">{formatGiven(v).text}</text>; })}
            <line class="axis" x1={0} y1={o.y} x2={right - HEAD + 2} y2={o.y} />
            <path class="axis-head" d={`M${right} ${o.y} l${-HEAD} ${-4} v8 z`} />
          </g>
          {children}
        </PlaneContext.Provider>
      </svg>
      <p id={descriptionId} class="sr-only">{description}</p>
    </div>
  );
}
