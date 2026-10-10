/**
 * RelationStage — a relation R ⊆ A × B as a grid of toggle buttons (rows are elements of A, columns are elements of B), with presets, the
 * four properties of a relation on one set (each with a witness when it fails) and the "is R a function?" test.
 *
 * A pair is changed by pressing its cell, so the whole stage works from a keyboard and a screen reader. A property can be pressed to
 * outline the cells that prove or break it (a dashed outline marks a pair that SHOULD be there and is not; a solid thick one a pair that is).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Inspector } from '../../ui/Inspector';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import {
  CANONICAL_RELATION_LESSON, RELATION_PRESETS, SIZE_OPTIONS, applyPreset, cellLabel, deriveRelationLesson, equivalenceLine, functionLine, highlights, isRelated, presetIsActive,
  propertyLines, relationDescription, relationRows, relationSpoken, relationVerdict, resized, toggled,
  type FocusId, type RelationLessonDerived, type RelationLessonState,
} from './relation-lesson';

function RelationStageInner() {
  const lesson = useLesson<RelationLessonState, RelationLessonDerived>(CANONICAL_RELATION_LESSON, deriveRelationLesson);
  const { d, focus } = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  const gridDescId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const lines = useMemo(() => propertyLines(d), [d]);
  const marks = useMemo(() => highlights(d, focus), [d, focus]);
  const rows = useMemo(() => relationRows(d), [d]);
  const fn = functionLine(d);
  const verdict = relationVerdict(d);
  const commit = (next: RelationLessonState) => {
    lesson.set(next);
    const nd = deriveRelationLesson(next).d;
    setAnnouncement(prev => `${relationSpoken(nd)}${prev.endsWith('​') ? '' : '​'}`);
  };
  const A = Array.from({ length: s.n }, (_, i) => i + 1);
  const B = Array.from({ length: s.k }, (_, i) => i + 1);
  const mark = (a: number, b: number) => marks.find(m => m.a === a && m.b === b)?.kind ?? null;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="relation" data-hydrated={hydrated} data-size={d.size} data-n={s.n} data-k={s.k} data-equivalence={String(d.equivalence)} data-function={String(d.function.isFunction)} data-preset={d.preset ?? ''}>
      <header class="stage-head">
        <h3 id={headingId}>Relations: a set of pairs</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_RELATION_LESSON)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Fill the grid with the rule</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {RELATION_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={presetIsActive(s, p.id)} data-preset={p.id} onClick={() => commit(applyPreset(s, p.id))}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane relation-grid-wrap">
          <table class="relation-grid" aria-describedby={gridDescId} data-relation-grid>
            <caption>Rows: elements a of A. Columns: elements b of B. A filled cell means a is related to b.</caption>
            <thead>
              <tr>
                <td class="corner" aria-hidden="true"><span class="axis-a">a</span>↓ <span class="axis-b">b</span>→</td>
                {B.map(b => <th key={b} scope="col">{b}</th>)}
              </tr>
            </thead>
            <tbody>
              {A.map(a => (
                <tr key={a}>
                  <th scope="row">{a}</th>
                  {B.map(b => {
                    const related = isRelated(s, a, b);
                    const m = mark(a, b);
                    return (
                      <td key={b}>
                        <button type="button" class={`rel-cell${related ? ' is-related' : ''}${m ? ` is-${m}` : ''}`} aria-pressed={related} aria-label={cellLabel(a, b, related)} data-cell={`${a},${b}`} data-mark={m ?? undefined}
                          onClick={() => commit(toggled(s, a, b))}>
                          <span aria-hidden="true">{related ? '●' : m === 'missing' ? '○' : ''}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p id={gridDescId} class="sr-only">{relationDescription(d)}</p>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The relation as a set of pairs" legend="= exact" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree="true">{verdict.text}</p>
      <div class="property-block">
        <h4 id={`${headingId}-props`}>What kind of relation is it?</h4>
        <ul class="property-list" aria-labelledby={`${headingId}-props`}>
          {lines.map(p => (
            <li key={p.id} data-property={p.id} data-holds={String(p.holds)}>
              <button type="button" class="prop-name" aria-pressed={focus === p.id} disabled={p.holds === null} onClick={() => commit({ ...s, focus: (focus === p.id ? 'none' : p.id) as FocusId })} aria-label={`${p.name}: ${p.definition}. Press to outline the cells that decide it.`}>
                <span class="mark" aria-hidden="true">{p.holds === null ? '–' : p.holds ? '✓' : '✗'}</span>{p.name}
              </button>
              <span class="prop-text"><span class="prop-def">{p.definition}.</span> {p.holds === null ? '' : p.holds ? 'Holds: ' : 'Fails: '}{p.sentence}</span>
            </li>
          ))}
          <li data-property="equivalence" data-holds={String(d.equivalence)}><span class="prop-name static"><span class="mark" aria-hidden="true">{d.equivalence === null ? '–' : d.equivalence ? '✓' : '✗'}</span>Equivalence</span><span class="prop-text">{equivalenceLine(d)}</span></li>
          <li data-property="function" data-holds={String(fn.holds)}><span class="prop-name static"><span class="mark" aria-hidden="true">{fn.holds ? '✓' : '✗'}</span>Function</span><span class="prop-text">{fn.sentence}</span></li>
        </ul>
      </div>
      <div class="stage-controls">
        <SegmentedControl legend="Elements in A" name={`${headingId}-n`} options={SIZE_OPTIONS} value={String(s.n)} onChange={v => commit(resized(s, Number(v), s.k))} />
        <SegmentedControl legend="Elements in B" name={`${headingId}-k`} options={SIZE_OPTIONS} value={String(s.k)} onChange={v => commit(resized(s, s.n, Number(v)))} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function RelationStage() {
  return (
    <IdScope name="relation">
      <RelationStageInner />
    </IdScope>
  );
}
