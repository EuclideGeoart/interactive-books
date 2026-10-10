/**
 * PowersStage — integer powers as a ladder (each step up multiplies by b), and the four rules checked in exact arithmetic on chosen
 * exponents. A rule is "silent", never false, where one of its sides does not exist (zero base).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { PowersDerived } from '../../math/quantity/powers';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { useLesson } from '../../ui/useLesson';
import { BASE_SPEC, CANONICAL_POWERS, M_SPEC, N_SPEC, POWERS_PRESETS, RULE_NAMES, RULE_SHAPES, derivePowersState, ladderRows, powersDescription, powersRows, powersSpoken, powersVerdict, ruleStatus, ruleStatusText, ruleTex, type PowersState } from './powers-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };
const BASE_GRID: Grid = { kind: 'lattice', step: 1 };
const STATUS_GLYPH = { holds: '✓', 'no-claim': '○', fails: '✗' } as const;
const STATUS_WORD = { holds: 'holds', 'no-claim': 'makes no claim', fails: 'fails' } as const;

function PowersStageInner() {
  const lesson = useLesson<PowersState, PowersDerived>(CANONICAL_POWERS, derivePowersState);
  const state = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const ladder = useMemo(() => ladderRows(d), [d]);
  const rows = useMemo(() => powersRows(d, state), [d, state]);
  const announce = (next: PowersState) => setAnnouncement(prev => `${powersSpoken(derivePowersState(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: PowersState) => { lesson.set(next); announce(next); };
  const anyFails = d.rules.some(r => ruleStatus(r) === 'fails');

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="powers" data-hydrated={hydrated} data-base={state.base} data-m={state.m} data-n={state.n}>
      <header class="stage-head">
        <h3 id={headingId}>Powers and their rules: <Formula tex="b^{m}\cdot b^{n}=b^{m+n}" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_POWERS); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {POWERS_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.base === state.base && p.state.m === state.m && p.state.n === state.n} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <figure class="ladder-figure">
            <table class="ladder" data-ladder aria-label="Powers of the base from exponent −3 to 6">
              <thead><tr><th scope="col">power</th><th scope="col">value</th><th scope="col"><span class="sr-only">step</span></th></tr></thead>
              <tbody>
                {[...ladder].reverse().map(r => (
                  <tr key={r.k} data-k={r.k} data-defined={String(r.defined)} data-marked={r.isM && r.isN ? 'mn' : r.isM ? 'm' : r.isN ? 'n' : undefined}>
                    <th scope="row"><span class="sr-only">{r.spoken}</span><span aria-hidden="true"><Formula tex={r.tex} /></span></th>
                    <td><Formula tex={r.defined ? `=${r.valueTex}` : `\\text{undefined}`} /></td>
                    <td class="mark">{r.isM && r.isN ? 'm, n' : r.isM ? 'm' : r.isN ? 'n' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <figcaption>One step up the ladder multiplies by b; one step down divides by b. Continuing the pattern past 1 is what forces b⁰ = 1 and b⁻ᵏ = 1/bᵏ.</figcaption>
          </figure>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The base and the two chosen powers" legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!anyFails && d.rules.every(r => ruleStatus(r) === 'holds'))}>{powersVerdict(d)}</p>
      <ul class="rule-list" aria-label="The four rules, checked">
        {d.rules.map(rule => {
          const status = ruleStatus(rule);
          return (
            <li key={rule.id} class="rule" data-rule={rule.id} data-status={status} data-applies={String(rule.applies)} data-equal={String(rule.equal)}>
              <div class="rule-head">
                <strong>{RULE_NAMES[rule.id]}</strong>
                <span class="rule-shape" aria-hidden="true"><Formula tex={RULE_SHAPES[rule.id]} /></span>
                <span class="rule-status"><span aria-hidden="true">{STATUS_GLYPH[status]} </span>{STATUS_WORD[status]}</span>
              </div>
              <MathScroll label={`${RULE_NAMES[rule.id]}, scrollable`}><Formula tex={ruleTex(rule, d)} display /></MathScroll>
              <p class="rule-note">{ruleStatusText(rule)}</p>
            </li>
          );
        })}
      </ul>
      <div class="stage-controls">
        <ParameterInput spec={BASE_SPEC} value={state.base} grid={BASE_GRID} onCommit={base => update({ ...state, base })} />
        <ParameterInput spec={M_SPEC} value={state.m} grid={GRID} onCommit={m => update({ ...state, m })} />
        <ParameterInput spec={N_SPEC} value={state.n} grid={GRID} onCommit={n => update({ ...state, n })} />
      </div>
      <p class="sr-only" data-description>{powersDescription(d)}</p>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function PowersStage() {
  return (
    <IdScope name={'powers'}>
      <PowersStageInner />
    </IdScope>
  );
}
