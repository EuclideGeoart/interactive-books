/**
 * Venn — two overlapping circles inside the universe rectangle, with the twelve elements of U placed in the region they belong to.
 * It is a schematic picture (areas are not to scale) and says so in its description; it is NOT a plane. The highlighted regions are the
 * ones the chosen operation selects, and the selected elements are also drawn bold, so the result never relies on colour alone.
 */
import { useScopedId } from '../../ui/ids';
import type { SetsDerived } from '../../math/sets/finite';
import { VENN, opInfo, setsDescription, vennTokens, type Region } from './sets-lesson';

const REGIONS: readonly Region[] = ['onlyA', 'both', 'onlyB', 'neither'];

export function Venn({ d }: { d: SetsDerived }) {
  const base = useScopedId();
  const descId = `${base}-desc`;
  const clipA = `${base}-clip-a`;
  const notA = `${base}-not-a`;
  const notB = `${base}-not-b`;
  const neither = `${base}-neither`;
  const chosen = new Set<Region>(opInfo(d.state.op).regions);
  const { width, height, ax, bx, cy, r } = VENN;
  const tokens = vennTokens(d);
  return (
    <div class="venn-wrap">
      <svg class="venn" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Venn diagram of A and B inside the universe U" aria-describedby={descId} data-venn data-regions={REGIONS.filter(x => chosen.has(x)).join(',')}>
        <defs>
          <clipPath id={clipA}><circle cx={ax} cy={cy} r={r} /></clipPath>
          <mask id={notA}><rect width={width} height={height} fill="white" /><circle cx={ax} cy={cy} r={r} fill="black" /></mask>
          <mask id={notB}><rect width={width} height={height} fill="white" /><circle cx={bx} cy={cy} r={r} fill="black" /></mask>
          <mask id={neither}><rect width={width} height={height} fill="white" /><circle cx={ax} cy={cy} r={r} fill="black" /><circle cx={bx} cy={cy} r={r} fill="black" /></mask>
        </defs>
        <rect class="venn-universe" x={1} y={1} width={width - 2} height={height - 2} />
        <g aria-hidden="true">
          {chosen.has('neither') && <rect class="venn-fill" data-region="neither" x={1} y={1} width={width - 2} height={height - 2} mask={`url(#${neither})`} />}
          {chosen.has('onlyA') && <circle class="venn-fill" data-region="onlyA" cx={ax} cy={cy} r={r} mask={`url(#${notB})`} />}
          {chosen.has('onlyB') && <circle class="venn-fill" data-region="onlyB" cx={bx} cy={cy} r={r} mask={`url(#${notA})`} />}
          {chosen.has('both') && <circle class="venn-fill" data-region="both" cx={bx} cy={cy} r={r} clip-path={`url(#${clipA})`} />}
          <circle class="venn-circle role-x" cx={ax} cy={cy} r={r} />
          <circle class="venn-circle role-y" cx={bx} cy={cy} r={r} />
          <text class="venn-name" x={14} y={22}>U</text>
          <text class="venn-name role-x" x={ax - 104} y={cy - 62}>A</text>
          <text class="venn-name role-y" x={bx + 104} y={cy - 62} text-anchor="end">B</text>
          {tokens.map(t => (
            <g key={t.element} class={`venn-token${t.selected ? ' is-selected' : ''}`} data-element={t.element} data-region={t.region} data-selected={t.selected}>
              <circle cx={t.x} cy={t.y} r={VENN.token} />
              <text x={t.x} y={t.y + 5} text-anchor="middle">{t.element}</text>
            </g>
          ))}
        </g>
      </svg>
      <p id={descId} class="sr-only">{setsDescription(d)}</p>
      <p class="venn-caption">Schematic: the areas are not to scale. The box is the universe U = {'{'}1, 2, …, 12{'}'}.</p>
    </div>
  );
}
