/**
 * ProductStage — A × B as a table of ordered pairs, next to B × A.
 *
 * Membership of A and B (subsets of {1, …, 6}) is chosen with native toggle buttons; the tables are read-only HTML tables (row and column
 * headers, one cell per ordered pair), so the whole stage works from a keyboard and a screen reader.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FormulaScroll } from '../families/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { productItems } from '../../math/sets/product';
import {
  CANONICAL_PRODUCT, PRODUCT_PRESETS, PRODUCT_VALUES, cellKey, deriveProduct, productChipLabel, productDescription, productFormulas, productPresetMatches, productRows,
  productSpoken, productTables, productVerdict, toggleProduct, type PairTable, type ProductDerived, type ProductState,
} from './product-lesson';

function Table({ t }: { t: PairTable }) {
  const empty = t.rows.length === 0 || t.columns.length === 0;
  return (
    <table class={`pair-table role-${t.id === 'product' ? 'primary' : 'derived'}`} data-table={t.id}>
      <caption>{t.caption}</caption>
      {empty ? (
        <tbody><tr><td class="pair-empty">∅: no pairs, because one of the two sets is empty.</td></tr></tbody>
      ) : (
        <>
          <thead>
            <tr>
              <td class="corner" aria-hidden="true" />
              {t.columns.map(c => <th key={c} scope="col">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {t.rows.map(r => (
              <tr key={r}>
                <th scope="row">{r}</th>
                {t.columns.map(c => {
                  const extra = t.extra.has(cellKey(r, c));
                  const witness = t.witness !== null && t.witness[0] === r && t.witness[1] === c;
                  return <td key={c} class={`pair${extra ? ' is-extra' : ''}${witness ? ' is-witness' : ''}`} data-pair={`${r},${c}`} data-extra={extra}>({r}, {c}){extra ? <span class="sr-only"> (only in this product)</span> : null}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </>
      )}
    </table>
  );
}

function ProductStageInner() {
  const lesson = useLesson<ProductState, ProductDerived>(CANONICAL_PRODUCT, deriveProduct);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const tables = useMemo(() => productTables(d), [d]);
  const rows = useMemo(() => productRows(d), [d]);
  const formulas = useMemo(() => productFormulas(d), [d]);
  const verdict = productVerdict(d);
  const commit = (next: ProductState) => {
    lesson.set(next);
    setAnnouncement(prev => `${productSpoken(deriveProduct(next))}${prev.endsWith('​') ? '' : '​'}`);
  };
  const chips = (set: 'A' | 'B') => {
    const mask = set === 'A' ? s.a : s.b;
    const members = productItems(mask);
    return PRODUCT_VALUES.map(v => {
      const member = members.includes(v);
      return <button key={v} type="button" class="chip" aria-pressed={member} aria-label={productChipLabel(set, v, member)} data-set={set} data-element={v}
        onClick={() => commit(set === 'A' ? { ...s, a: toggleProduct(s.a, v) } : { ...s, b: toggleProduct(s.b, v) })}>{v}</button>;
    });
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="product" data-hydrated={hydrated} data-count={d.pairs.length} data-commutes={String(d.commutes)} data-a={d.A.join(',')} data-b={d.B.join(',')}>
      <header class="stage-head">
        <h3 id={headingId}>Ordered pairs: A × B and B × A</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_PRODUCT)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Or start from</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {PRODUCT_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={productPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="chip-rows">
        <fieldset class="chip-set role-x" data-chip-set="A"><legend>Elements of <span class="chip-name">A</span></legend><div class="chips">{chips('A')}</div></fieldset>
        <fieldset class="chip-set role-y" data-chip-set="B"><legend>Elements of <span class="chip-name">B</span></legend><div class="chips">{chips('B')}</div></fieldset>
      </div>
      <div class="pair-tables" role="group" aria-label="The two products as tables of ordered pairs" aria-describedby={`${headingId}-desc`}>
        {tables.map(t => <Table key={t.id} t={t} />)}
      </div>
      <p id={`${headingId}-desc`} class="sr-only">{productDescription(d)}</p>
      <p class="verdict" data-verdict data-agree={verdict.caution ? 'false' : 'true'}>{verdict.text}</p>
      <div class="stage-readout"><Inspector rows={rows} label="Sizes of A, B and A × B" legend="= exact" /></div>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function ProductStage() {
  return (
    <IdScope name="product">
      <ProductStageInner />
    </IdScope>
  );
}
