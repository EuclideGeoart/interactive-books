/**
 * UnitsStage — what units do. Two quantities, one operation: the stage shows the exponent vector of each quantity and of the result,
 * says which rule applied, and REFUSES the operations that have no meaning (m + s, √m), with the reason.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { isBinary, type Op } from '../../math/quantity/dimension';
import type { OperationDerived } from '../../math/quantity/operation';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { useLesson } from '../../ui/useLesson';
import { A_SPEC, B_SPEC, CANONICAL_UNITS, OPERATIONS, UNITS_PRESETS, UNIT_CHOICES, deriveUnits, exponentTable, unitsFormulas, unitsRows, unitsSpoken, unitsVerdict, type UnitId, type UnitsState } from './units-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };
const AXES = ['length L (m)', 'time T (s)', 'mass M (kg)'] as const;

function UnitSelect({ id, which, label, value, onChange }: { id: string; which: 'a' | 'b'; label: string; value: UnitId; onChange(next: UnitId): void }) {
  return (
    <div class="unit-field">
      <label for={id}>{label}</label>
      <select id={id} value={value} onChange={e => onChange((e.currentTarget as HTMLSelectElement).value as UnitId)} data-unit-select={which}>
        {UNIT_CHOICES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
      </select>
    </div>
  );
}

function UnitsStageInner() {
  const lesson = useLesson<UnitsState, OperationDerived>(CANONICAL_UNITS, deriveUnits);
  const state = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const selectA = `${useScopedId()}-a`;
  const selectB = `${useScopedId()}-b`;
  useEffect(() => setHydrated(true), []);
  const rows = useMemo(() => unitsRows(d, state), [d, state]);
  const table = useMemo(() => exponentTable(d), [d]);
  const formulas = useMemo(() => unitsFormulas(d, state), [d, state]);
  const announce = (next: UnitsState) => setAnnouncement(prev => `${unitsSpoken(deriveUnits(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: UnitsState) => { lesson.set(next); announce(next); };
  const binary = isBinary(state.op);
  const ok = d.outcome.ok;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="units" data-hydrated={hydrated} data-op={state.op} data-ok={String(ok)}>
      <header class="stage-head">
        <h3 id={headingId}>Units are exponents</h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_UNITS); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-op`}>Operation</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-op`}>
          {OPERATIONS.map(o => <button key={o.id} type="button" aria-pressed={state.op === o.id} data-op={o.id} onClick={() => update({ ...state, op: o.id as Op })}>{o.label}</button>)}
        </div>
      </div>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Or try one</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {UNITS_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.op === state.op && p.state.aValue === state.aValue && p.state.aUnit === state.aUnit && (!isBinary(p.state.op) || (p.state.bValue === state.bValue && p.state.bUnit === state.bUnit))} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <figure class="exponent-figure">
            <table class="exponent-table" data-exponents aria-label="Exponent vectors of the quantities and of the result">
              <thead>
                <tr><th scope="col"><span class="sr-only">Quantity</span></th>{AXES.map(a => <th scope="col" key={a}>{a}</th>)}<th scope="col">unit</th></tr>
              </thead>
              <tbody>
                {table.map(r => (
                  <tr key={r.id} data-row={r.id} data-defined={String(r.exponents[0] !== null)}>
                    <th scope="row">{r.label}</th>
                    {r.exponents.map((e, i) => <td key={i} data-axis={['L', 'T', 'M'][i]}>{e === null ? '—' : e < 0 ? `−${-e}` : String(e)}</td>)}
                    <td class="unit-cell">{r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <figcaption>Each quantity is a number and three whole-number exponents, one for each base unit.</figcaption>
          </figure>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The quantities and the result" legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(ok)}>{unitsVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${i === 0 ? 'The operation' : 'The exponents'}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls units-controls">
        <div class="quantity-controls" data-quantity="a">
          <ParameterInput spec={A_SPEC} value={state.aValue} grid={GRID} onCommit={aValue => update({ ...state, aValue })} />
          <UnitSelect id={selectA} which="a" label="Unit of a" value={state.aUnit} onChange={aUnit => update({ ...state, aUnit })} />
        </div>
        {binary && (
          <div class="quantity-controls" data-quantity="b">
            <ParameterInput spec={B_SPEC} value={state.bValue} grid={GRID} onCommit={bValue => update({ ...state, bValue })} />
            <UnitSelect id={selectB} which="b" label="Unit of b" value={state.bUnit} onChange={bUnit => update({ ...state, bUnit })} />
          </div>
        )}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function UnitsStage() {
  return (
    <IdScope name={'units'}>
      <UnitsStageInner />
    </IdScope>
  );
}
