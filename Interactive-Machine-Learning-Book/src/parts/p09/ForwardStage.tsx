import { useEffect, useRef, useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { watchScrollable } from "../../platform/overflow";
import NumberField from '../../ui/NumberField';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import TraceStepper from '../../ui/TraceStepper';
import { forwardTrace, type Activation, type ForwardState, type Input, type Row } from './model/forward';
import { derive, edit, extreme, initial, shown, withActivation, xorInput, type Mode } from './lesson';
import examples from '../../../data/p09/examples.json' with { type: 'json' };
import './stage.css';

function Rail({ label, x, w, row, a, phi, id }: { label: string; x: readonly number[]; w: readonly number[]; row: Row; a: number; phi: string; id: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => watchScrollable(wrapper.current!, `${label} contribution rail, scrollable`), [label]);
  const height = 270 + 36 * x.length, y = 45 + 36 * x.length;
  return <div ref={wrapper} class="p09-rail-scroll" data-scrollable={`${label} contribution rail, scrollable`}><figure class="p09-rail"><svg viewBox={`0 0 320 ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>{label} contribution rail</title>
    <desc id={`${id}-desc`}>{label}. Input and weights each have shape {x.length} by 1. {row.products.map((p, j) => `Term ${j + 1}: input ${x[j]}, weight ${w[j]}, product ${p}, running sum ${row.running[j]}.`).join(' ')} Dot {row.dot}, bias {row.b}, z {row.z}, {phi} output {a}.</desc>
    <g aria-hidden="true"><text x="53" y="23" text-anchor="middle">x</text><text x="160" y="23" text-anchor="middle">w</text><text x="267" y="23" text-anchor="middle">w·x</text>
      {row.products.map((p, j) => <g key={j} data-svg-term={j} data-x={x[j]} data-weight={w[j]} data-product={p} data-running={row.running[j]}>
        <text x="53" y={60 + 36 * j} text-anchor="middle">{shown(x[j]!)}</text><text x="160" y={60 + 36 * j} text-anchor="middle">{shown(w[j]!)}</text><text x="267" y={60 + 36 * j} text-anchor="middle">{shown(p)}</text>
      </g>)}
      <path d={`M267 ${y - 15} V${y + 14} H160 V${y + 32}`} />
      <rect x="18" y={y + 34} width="284" height="40" /><text x="160" y={y + 60} text-anchor="middle" data-svg-dot={row.dot}>Σ products ≈ {shown(row.dot)}</text>
      <line x1="160" y1={y + 74} x2="160" y2={y + 98} /><text x="175" y={y + 93} data-svg-bias={row.b}>+ b {shown(row.b)}</text>
      <rect x="18" y={y + 100} width="284" height="40" /><text x="160" y={y + 126} text-anchor="middle" data-svg-z={row.z}>z ≈ {shown(row.z)}</text>
      <line x1="160" y1={y + 140} x2="160" y2={y + 164} />
      <rect class="p09-output" x="18" y={y + 166} width="284" height="40" /><text x="160" y={y + 192} text-anchor="middle" data-svg-a={a}>{phi}: a ≈ {shown(a)}</text>
    </g></svg><figcaption>{label} · {x.length} × 1 input; scalar z and a</figcaption></figure></div>;
}
function Experiment({ mode }: { mode: Mode }) {
  const uid = useScopedId(), [canonical] = useState(() => initial(mode));
  const lesson = useLesson(canonical, derive), active = lesson.derived, input = active.state.input, result = active.numerical;
  const latest = useRef(active); latest.current = active;
  const [frames, setFrames] = useState<ReturnType<typeof forwardTrace> | null>(null), [index, setIndex] = useState(0);
  const [revision, revise] = useState(0), [reason, reject] = useState(''), [announcement, announce] = useState('');
  function speak(message: string) { announce(previous => message + (previous.endsWith('\u200b') ? '' : '\u200b')); }
  function accept(next: ForwardState) {
    const value = derive(next); latest.current = value; lesson.set(next); setFrames(null); setIndex(0); reject(''); speak('Changed. ' + value.speech);
  }
  function attempt(action: () => void) { try { action(); } catch (error) { reject(error instanceof Error ? error.message : 'Change rejected; previous state preserved.'); } }
  function replace(next: Input) { attempt(() => { accept({ input: next, phase: 0 }); revise(v => v + 1); }); }
  function change(field: Parameters<typeof edit>[1], i: number, j: number, value: number) {
    const next = edit(latest.current.state.input, field, i, j, value);
    accept({ input: next, phase: latest.current.state.phase });
  }
  function replay() { attempt(() => {
    const trace = forwardTrace(latest.current.state.input); setFrames(trace); setIndex(0); lesson.set(trace[0]!.state);
    latest.current = derive(trace[0]!.state); revise(v => v + 1); reject(''); speak('Forward frame 1. ' + trace[0]!.explanation);
  }); }
  function seek(i: number) {
    const frame = frames?.[i]; if (!frame) return;
    const value = derive(frame.state); latest.current = value; lesson.set(frame.state); setIndex(i); revise(v => v + 1); reject(''); speak(`Forward frame ${i + 1}. ${frame.explanation}`);
  }
  const number = (label: string, field: Parameters<typeof edit>[1], value: number, i = 0, j = 0) =>
    <NumberField key={`${revision}:${label}`} label={label} value={value} min={-1000} max={1000} onCommit={v => change(field, i, j, v)} />;
  const binary = active.binary;
  return <div class="p09-lab" data-forward-lab={mode} data-state={JSON.stringify(active.state)} data-numerical={JSON.stringify(result)} data-frame-index={active.state.phase}>
    <header class="p09-heading"><div><p>Part IX · transparent forward pass</p><h2>{mode === 'neuron' ? 'Multiply, sum, add bias, activate' : 'Inspect both layers, then remove the activation'}</h2></div>
      <button type="button" onClick={() => { replace(canonical.input); speak('Reset. ' + latest.current.speech); }}>Reset experiment</button></header>
    <p data-provenance>Hand-chosen illustrative parameters, never trained. One sample is a column; no batches, labels, fitting, loss, seed or classification threshold. Edits are local.</p>
    <p data-precision>Computations use binary64. SVG and table labels are rounded for display; full-precision stored values are in “Complete current forward record”.</p>
    <div class="p09-controls"><fieldset><legend>Input x · 2 × 1</legend>{input.x.map((v, i) => number(`x ${i + 1}`, 'x', v, i))}</fieldset>
      {input.kind === 'neuron' ? <fieldset><legend>Weights w · 2 × 1 and scalar bias</legend>{input.w.map((v, i) => number(`w ${i + 1}`, 'w', v, i))}{number('b', 'b', input.b)}</fieldset> : <>
        <fieldset><legend>W1 · 2 × 2; b1 · 2 × 1</legend>{input.W1.flatMap((row, i) => row.map((v, j) => number(`W1 ${i + 1},${j + 1}`, 'W1', v, i, j)))}{input.b1.map((v, i) => number(`b1 ${i + 1}`, 'b1', v, i))}</fieldset>
        <fieldset><legend>W2 · 1 × 2; b2 · 1 × 1</legend>{input.W2.flatMap((row, i) => row.map((v, j) => number(`W2 ${i + 1},${j + 1}`, 'W2', v, i, j)))}{input.b2.map((v, i) => number(`b2 ${i + 1}`, 'b2', v, i))}</fieldset>
      </>}
      <fieldset><legend>Activation and examples</legend><label>Activation<select value={input.activation} onChange={event => attempt(() => accept({ input: withActivation(latest.current.state.input, event.currentTarget.value as Activation), phase: latest.current.state.phase }))}>
        <option value="identity">Identity · φ(z)=z</option><option value="relu">ReLU · φ(z)=max(0,z)</option><option value="sigmoid">Stable sigmoid · φ(z)=σ(z)</option>
      </select></label><div class="p09-actions">
        {mode === 'neuron' ? <><button type="button" onClick={() => replace(extreme(-1))}>Sigmoid −1000</button><button type="button" onClick={() => replace(extreme(1))}>Sigmoid +1000</button>
          <button type="button" onClick={() => replace({ kind: "neuron", x: [0, 0], w: [.5, 2], b: 0, activation: "relu" })}>Zero neuron</button></>
          : <><button type="button" onClick={() => replace(xorInput())}>Restore hand-chosen XOR</button>{examples.binary.map(x => <button type="button" onClick={() => replace({ ...latest.current.state.input, x })}>Input ({x.join(',')})</button>)}</>}
        <button type="button" onClick={replay}>Replay forward pass</button></div></fieldset></div>
    <p data-current-frame>Forward operation {active.state.phase + 1} / {active.steps.length}. {active.steps[active.state.phase]} Complete values remain visible; replay highlights an operation, not training.</p>
    {reason && <p role="alert">{reason}</p>}{frames && <TraceStepper frames={frames.map(({ index, state, explanation }) => ({ index, state, explanation }))} index={index} onSeek={seek} />}
    <div class="p09-rails">{active.rows.map(({ label, row, a, phi }, i) => {
      const source = input.kind === 'neuron' ? input.x : i < input.W1.length ? input.x : result.kind === 'network' ? result.a1 : [];
      const weights = input.kind === 'neuron' ? input.w : i < input.W1.length ? input.W1[i]! : input.W2[i - input.W1.length]!;
      return <div data-rail={i}><Rail label={label} row={row} x={source} w={weights} a={a} phi={phi} id={`${uid}-row-${i}`} /></div>;
    })}</div>
    <div class="p09-equations">{active.formulas.map(f => <Formula key={f.label} {...f} />)}</div>
    <Inspector rows={active.inspector} />
    <div class="table-scroll" tabindex={0} role="region" aria-label="Forward contributions and running sums, scrollable" data-scrollable="Forward contributions and running sums, scrollable">
      <table><caption>Every affine row: products in input order, running sums, dot, bias, z and activated value</caption><thead><tr><th scope="col">Row</th><th scope="col">Products</th><th scope="col">Running sums</th><th scope="col">Dot</th><th scope="col">b</th><th scope="col">z</th><th scope="col">a</th></tr></thead>
      <tbody>{active.rows.map(({ label, row, a }, i) => <tr data-forward-row={i} data-products={JSON.stringify(row.products)} data-running={JSON.stringify(row.running)} data-dot={row.dot} data-bias={row.b} data-z={row.z} data-a={a}>
        <th scope="row">{label}</th><td>{row.products.map(shown).join('; ')}</td><td>{row.running.map(shown).join('; ')}</td><td>{shown(row.dot)}</td><td>{shown(row.b)}</td><td>{shown(row.z)}</td><td>{shown(a)}</td>
      </tr>)}</tbody></table></div>
    {result.kind === 'network' && <><p data-collapse-label>{active.collapseLabel}</p>
      {result.collapse.status === 'defined' ? <>
        <Inspector rows={[{ label: 'W_eff = W2 W1', value: JSON.stringify(result.collapse.W), detail: 'o × d = 1 × 2' }, { label: 'b_eff = W2 b1 + b2', value: JSON.stringify(result.collapse.b), detail: 'o × 1 = 1 × 1' },
          { label: 'Collapsed affine output', value: result.collapse.rows.map(r => shown(r.z)).join('; ') }, { label: 'Actual − collapsed', value: result.collapse.difference.map(shown).join('; '), detail: 'A difference at one point alone cannot prove general equivalence.' }]} />
        <p data-collapse-output={JSON.stringify(result.collapse.rows.map(r => r.z))}>Computed binary64 collapsed affine: {result.collapse.rows.map(r => `${shown(r.dot)} + (${shown(r.b)}) ≈ ${shown(r.z)}`).join('; ')}. Actual − collapsed: {result.collapse.difference.map(shown).join('; ')}.</p>
      </> : <p data-collapse-unavailable>Comparison unavailable: {result.collapse.reason} The actual forward pass above remains defined.</p>}
      <div class="table-scroll" tabindex={0} role="region" aria-label="Four binary inputs with current parameters, scrollable" data-scrollable="Four binary inputs with current parameters, scrollable">
        <table><caption>All four binary cases with current editable parameters · matches XOR only when these values do</caption><thead><tr><th scope="col">x</th><th scope="col">z1</th><th scope="col">h1 = a1[1]</th><th scope="col">h2 = a1[2]</th><th scope="col">z2</th><th scope="col">XOR target</th></tr></thead>
          <tbody>{binary.map((c, i) => <tr data-binary={c.x.join(',')} data-binary-status={c.status}
            data-hidden={c.status === 'defined' ? JSON.stringify(c.forward.a1) : undefined}
            data-output={c.status === 'defined' ? c.forward.output[0]!.z : undefined}
            data-reason={c.status === 'unavailable' ? c.reason : undefined}>
            <th scope="row">({c.x.join(',')})</th>
            {c.status === 'defined' ? <><td>{c.forward.hidden.map(r => shown(r.z)).join('; ')}</td><td>{shown(c.forward.a1[0]!)}</td><td>{shown(c.forward.a1[1]!)}</td><td>{shown(c.forward.output[0]!.z)}</td></>
              : <td colSpan={4}>Unavailable: {c.reason}</td>}<td>{[0, 1, 1, 0][i]}</td>
          </tr>)}</tbody></table></div></>}
    <details><summary>Complete current forward record</summary><div class="p09-record" tabindex={0} role="region" aria-label="Complete forward JSON, scrollable"><pre>{JSON.stringify({ state: active.state, numerical: result, binary: active.binary, traceEvent: frames?.[index]?.event ?? null }, null, 2)}</pre></div></details>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
  </div>;
}
export default function ForwardStage({ scope, mode }: { scope: string; mode: Mode }) { return <IdScope name={scope}><Experiment mode={mode} /></IdScope>; }
