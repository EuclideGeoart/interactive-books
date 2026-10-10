/** WorkedExampleStage — five worked solutions, step by step: evaluate, domain, image, composition and inverse. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { cursorAt, reset as resetCursor, type TraceCursor } from '../../platform/trace';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { MathScroll } from '../../ui/MathScroll';
import { TraceStepper } from '../../ui/TraceStepper';
import { WORKED_EXAMPLES, workedById } from './worked-lesson';

function WorkedExampleStageInner() {
  const [pick, setPick] = useState(WORKED_EXAMPLES[0]!.id);
  const example = workedById(pick)!;
  const frames = useMemo(() => example.frames(), [example]);
  const [cursor, setCursor] = useState<TraceCursor>(() => cursorAt(frames.length));
  const [hydrated, setHydrated] = useState(false);
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const choose = (id: string) => {
    setPick(id);
    setCursor(resetCursor(cursorAt(workedById(id)!.frames().length)));
  };
  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="worked" data-hydrated={hydrated} data-example={example.id}>
      <header class="stage-head"><h3 id={headingId}>Worked examples: solve, then check</h3></header>
      <div>
        <p class="presets-label">Choose a problem</p>
        <div class="example-picks" role="group" aria-label="Choose a problem">
          {WORKED_EXAMPLES.map(e => <button key={e.id} type="button" aria-pressed={e.id === pick} data-example={e.id} onClick={() => choose(e.id)}>{e.label}</button>)}
        </div>
      </div>
      <TraceStepper
        label={`Worked example ${example.label}`} frames={frames} cursor={cursor} onCursor={setCursor}
        renderFrame={f => (<><MathScroll label="Working at this step, scrollable"><Formula tex={f.state.tex} display /></MathScroll><p class="trace-caption">{f.state.caption}</p></>)}
        describeFrame={f => f.state.text}
      />
    </section>
  );
}

export default function WorkedExampleStage() {
  return (
    <IdScope name={'worked'}>
      <WorkedExampleStageInner />
    </IdScope>
  );
}
