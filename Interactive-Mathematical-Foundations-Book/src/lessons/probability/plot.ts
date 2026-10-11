import { approx } from './view';
export interface PlotPoint { x: number; y: number }
export interface PlotBar { x: number; y: number; width: number; height: number; label: string; value: number; selected: boolean }
export interface PlotScene {
  title: string; description: string; kind: string; bars: readonly PlotBar[]; curve: string; secondary: string; area: string;
  meanX: number | null; dots: readonly (PlotPoint & { radius: number; closed: boolean })[];
  ticks: readonly { x: number; label: string }[]; maxLabel: string; minLabel?: string; xLabel: string;
}
/** Drawing conversion only; input values are already derived probabilities, densities or observations. */
export function plotScene(options: { title: string; description: string; kind: string; xMin: number; xMax: number; yMax: number; yMin?: number;
  bars?: readonly { x: number; value: number; selected?: boolean; width?: number }[]; curve?: readonly PlotPoint[]; secondary?: readonly PlotPoint[];
  area?: readonly PlotPoint[]; dots?: readonly (PlotPoint & { radius?: number; closed?: boolean })[]; mean?: number; ticks?: readonly number[]; xLabel: string }): PlotScene {
  const x = (value: number) => 30 + (value - options.xMin) / (options.xMax - options.xMin) * 350;
  const yMin = options.yMin ?? 0;
  const y = (value: number) => 202 - (value - yMin) / (options.yMax - yMin) * 170;
  const path = (points: readonly PlotPoint[] = []) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x)},${y(p.y)}`).join(' ');
  return { title: options.title, description: options.description, kind: options.kind,
    bars: (options.bars ?? []).map(bar => ({ x: x(bar.x - (bar.width ?? .8) / 2), y: y(bar.value), width: (bar.width ?? .8) / (options.xMax - options.xMin) * 350, height: 202 - y(bar.value), value: bar.value, selected: bar.selected ?? false, label: String(bar.x) })),
    curve: path(options.curve), secondary: path(options.secondary), area: options.area?.length ? path(options.area) + ' Z' : '',
    meanX: options.mean === undefined ? null : x(options.mean), dots: (options.dots ?? []).map(p => ({ x: x(p.x), y: y(p.y), radius: p.radius ?? 4, closed: p.closed ?? true })),
    ticks: (options.ticks ?? [options.xMin, (options.xMin + options.xMax) / 2, options.xMax]).map(value => ({ x: x(value), label: approx(value) })), maxLabel: approx(options.yMax), ...(yMin !== 0 ? { minLabel: approx(yMin) } : {}), xLabel: options.xLabel };
}
