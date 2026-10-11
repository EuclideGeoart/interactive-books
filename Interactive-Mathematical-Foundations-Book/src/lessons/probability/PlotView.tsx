import { useScopedId } from '../../ui/ids';
import type { PlotScene } from './plot';
export default function PlotView({ scene }: { scene: PlotScene }) {
  const uid = useScopedId();
  return <figure class="prob-figure"><figcaption>{scene.title}</figcaption><svg class="prob-chart" viewBox="0 0 400 245" role="img" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-description`} data-chart={scene.kind}>
    <title id={`${uid}-title`}>{scene.title}</title><desc id={`${uid}-description`}>{scene.description}</desc>
    <path class="prob-axis" d="M30,25V202H385" />
    <text x="26" y="19" text-anchor="start">{scene.maxLabel}</text>
    {scene.area && <path class="prob-area" d={scene.area} />}
    {scene.bars.map((bar, i) => <rect key={i} class={bar.selected ? 'prob-selected' : 'prob-bar'} x={bar.x} y={bar.y} width={bar.width} height={bar.height} data-bar={bar.label} data-value={bar.value}><title>{bar.label}: approximately {bar.value}</title></rect>)}
    {scene.curve && <path class="prob-density" d={scene.curve} data-curve="primary" />}
    {scene.secondary && <path class="prob-cdf" d={scene.secondary} data-curve="comparison" />}
    {scene.meanX !== null && <line class="prob-mean" x1={scene.meanX} x2={scene.meanX} y1="26" y2="202" data-mean-marker />}
    {scene.dots.map((dot, i) => <circle key={i} class="prob-dot" cx={dot.x} cy={dot.y} r={dot.radius} style={{ fill: dot.closed ? 'var(--c-derived)' : 'var(--paper)', stroke: 'var(--c-derived)', strokeWidth: 2 }} />)}
    {scene.ticks.map((tick, i) => <text key={i} x={tick.x} y="223" text-anchor="middle">{tick.label}</text>)}
  </svg><p class="prob-axis-caption">{scene.xLabel}</p></figure>;
}
