/**
 * Worked examples for I.5, one trace per example. Every number is read from the domain model (`deriveFunction`, `domainOfRule`, `imageOfRule`,
 * `preimages`, `deriveComposition`, `deriveInverse`); nothing is typed in twice, so a change to the model changes the page.
 */
import { int, rational } from '../../math/quantity/rational';
import { sumValue } from '../../math/algebra/extraneous';
import { composeOps, deriveComposition, deriveInverse, fnOps } from '../../math/functions/compose';
import { domainOf } from '../../math/functions/domain';
import { deriveFunction, domainOfRule, imageOfRule, preimages } from '../../math/functions/rule';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { aligned } from '../shared/format';
import { numText, numTex, ruleTex, setText, setTex, sumForm } from './format';
import { substitutionChain } from './function-lesson';

export interface FrameView { readonly tex: string; readonly caption: string; readonly text: string }
export interface WorkedExample {
  readonly id: string;
  readonly label: string;
  readonly frames: () => readonly TraceFrame<FrameView>[];
}
type Raw = { state: FrameView };

// ---------------------------------------------------------------------------------------------- 1. evaluate
function evaluateExample(): readonly TraceFrame<FrameView>[] {
  const d = deriveFunction({ rule: 'shift', a: 2, x: -1 });
  const chain = substitutionChain(d.ops, d.evaluation);
  const out = numText(d.output);
  const p = preimages('shift', 2, rationalFromOutput(d.output));
  const other = p.kind === 'points' ? p.xs.map(s => sumValue(s)).filter(v => v !== -1) : [];
  const f: Raw[] = [
    { state: { tex: `f(x)=${ruleTex('shift', 2)}`, caption: 'A function is a rule that sends every input to exactly one output. This one says: subtract 2, then square.', text: 'the rule' } },
    { state: { tex: `f\\left(-1\\right)=${chain[0]}`, caption: 'To evaluate at x = −1, write the input where x was. The brackets matter: the whole of −1 − 2 is squared.', text: 'substitute' } },
    { state: { tex: aligned([`f\\left(-1\\right)&=${chain[0]}`, `&=${chain[1]}`]), caption: `First step inside the brackets: −1 − 2 = ${numText(d.evaluation.rows[0]!.after)}.`, text: 'subtract 2' } },
    { state: { tex: aligned([`f\\left(-1\\right)&=${chain[1]}`, `&=${chain[2]}`]), caption: `Second step: square it. (−3)² = (−3)(−3) = ${out}; the minus sign vanishes because two negatives multiply to a positive.`, text: 'square' } },
    {
      state: {
        tex: `f\\left(-1\\right)=${numTex(d.output)}`,
        caption: `The output is ${out}. Exactly one output for this input is what makes it a function. The reverse is not true: f(${other.map(v => String(v)).join(' ')}) = ${out} too, because (${other[0]} − 2)² = ${out}. Two inputs may share an output.`,
        text: 'the output',
      },
    },
  ];
  return traceFrom<FrameView>(f);
}
const rationalFromOutput = (n: ReturnType<typeof deriveFunction>['output']) => (n.kind === 'exact' && n.s.b === 1n ? n.s.u : int(0));

// ---------------------------------------------------------------------------------------------- 2. domain of a square root
function domainExample(): readonly TraceFrame<FrameView>[] {
  const domain = domainOfRule('root', 3);
  const edge = deriveFunction({ rule: 'root', a: 3, x: -3 });
  const below = deriveFunction({ rule: 'root', a: 3, x: -4 });
  const f: Raw[] = [
    { state: { tex: `f(x)=${ruleTex('root', 3)}`, caption: 'Find the domain: every input for which the machine can finish. The square root can only be taken of a number that is not negative.', text: 'the rule' } },
    { state: { tex: 'x+3\\ge 0', caption: 'So what is under the root must be at least 0.', text: 'the condition' } },
    { state: { tex: aligned(['x+3&\\ge 0', 'x&\\ge -3']), caption: 'Subtract 3 from both sides (the same operation on both sides, as in the chapter on equations and inequalities; subtracting does not reverse the inequality).', text: 'solve' } },
    { state: { tex: `\\text{domain}=${setTex(domain)}`, caption: `The domain is ${setText(domain)}: all numbers from −3 upwards, including −3.`, text: 'the domain' } },
    {
      state: {
        tex: aligned([`f\\left(-3\\right)&=${numTex(edge.output)}`, `f\\left(-4\\right)&=\\sqrt{-1}\\ \\text{(not real)}`]),
        caption: `Check the edge. At x = −3 the radicand is 0 and f(−3) = ${numText(edge.output)}: defined, so −3 belongs. At x = −4 the machine refuses (${below.output.kind === 'undefined' ? 'the radicand is −1' : ''}), so −4 does not.`,
        text: 'check the edge',
      },
    },
  ];
  return traceFrom<FrameView>(f);
}

// ---------------------------------------------------------------------------------------------- 3. image of -2x^2
function imageExample(): readonly TraceFrame<FrameView>[] {
  const image = imageOfRule('stretch', -2);
  const p = preimages('stretch', -2, rational(-8n));
  const xs = p.kind === 'points' ? p.xs.map(s => sumForm(s).text) : [];
  const f: Raw[] = [
    { state: { tex: `f(x)=${ruleTex('stretch', -2)}`, caption: 'Find the image: every output the machine can give. Square first, then multiply by −2.', text: 'the rule' } },
    { state: { tex: 'x^{2}\\ge 0', caption: 'A square is never negative, and every non-negative number is a square. After the first step the values are exactly [0, ∞).', text: 'after squaring' } },
    { state: { tex: aligned(['x^{2}&\\ge 0', '-2x^{2}&\\le 0']), caption: 'Multiplying by −2 reverses the inequality (the reversal rule): the values are now ≤ 0, and every number ≤ 0 is reached.', text: 'multiply by −2' } },
    { state: { tex: `\\text{image}=${setTex(image)}`, caption: `The image is ${setText(image)}. The codomain is all of ℝ, but the image is smaller: f is not onto ℝ. The outputs 1 and 5 never appear.`, text: 'the image' } },
    {
      state: {
        tex: aligned(['-2x^{2}&=-8', 'x^{2}&=4', `x&=${xs.join(',\\ \\text{or}\\ ')}`]),
        caption: `Check one value: the output −8 is reached, by the two inputs ${xs.join(' and ')}. To show a number is in the image, find an input that produces it.`,
        text: 'check a value',
      },
    },
  ];
  return traceFrom<FrameView>(f);
}

// ---------------------------------------------------------------------------------------------- 4. composition
function compositionExample(): readonly TraceFrame<FrameView>[] {
  const d = deriveComposition({ f: 'sq', g: 'lin', x: 3 });
  const gx = d.fg.rows[fnOps('lin').length - 1]!.after;
  const fx = d.gf.rows[fnOps('sq').length - 1]!.after;
  const dom = domainOf(composeOps('rt', 'lin'));
  const f: Raw[] = [
    { state: { tex: aligned(['f(x)&=x^{2}', 'g(x)&=2x-1']), caption: 'f ∘ g means g first, then f: the output of g is the input of f. Compute both orders at x = 3.', text: 'two machines' } },
    { state: { tex: aligned([`g(3)&=2\\cdot 3-1=${numTex(gx)}`, `f\\left(g(3)\\right)&=f\\left(${numTex(gx)}\\right)=${numTex(d.fg.output)}`]), caption: `g first: 2·3 − 1 = ${numText(gx)}. Then f squares it: ${numText(gx)}² = ${numText(d.fg.output)}.`, text: 'g then f' } },
    { state: { tex: aligned([`f(3)&=3^{2}=${numTex(fx)}`, `g\\left(f(3)\\right)&=g\\left(${numTex(fx)}\\right)=${numTex(d.gf.output)}`]), caption: `f first: 3² = ${numText(fx)}. Then g: 2·${numText(fx)} − 1 = ${numText(d.gf.output)}.`, text: 'f then g' } },
    { state: { tex: `f(g(3))=${numTex(d.fg.output)}\\ne ${numTex(d.gf.output)}=g(f(3))`, caption: 'The two orders give different outputs: composition is not commutative. As formulas, f(g(x)) = (2x − 1)² and g(f(x)) = 2x² − 1.', text: 'the order matters' } },
    {
      state: {
        tex: `\\text{dom}(\\sqrt{\\cdot}\\circ g)=${setTex(dom)}`,
        caption: `Domains need care. With f = √x after g = 2x − 1, the machine refuses whenever 2x − 1 < 0, so the composite accepts only x ≥ 1/2: its domain is ${setText(dom)}, smaller than the domain of g.`,
        text: 'the domain of a composite',
      },
    },
  ];
  return traceFrom<FrameView>(f);
}

// ---------------------------------------------------------------------------------------------- 5. inverse
function inverseExample(): readonly TraceFrame<FrameView>[] {
  const d = deriveInverse({ fn: 'lin', x: 3, restrict: true });
  const y = numTex(d.forward.output);
  const squareTwin = deriveInverse({ fn: 'sq', x: 3, restrict: false });
  const f: Raw[] = [
    { state: { tex: 'y=2x-1', caption: 'To invert a function, solve y = f(x) for x. The machine multiplies by 2, then subtracts 1.', text: 'the machine' } },
    { state: { tex: aligned(['y&=2x-1', 'y+1&=2x']), caption: 'Undo the last step first: add 1 to both sides.', text: 'undo the subtraction' } },
    { state: { tex: aligned(['y+1&=2x', 'x&=\\frac{y+1}{2}']), caption: 'Then undo the multiplication: divide both sides by 2. The steps are undone in reverse order.', text: 'undo the multiplication' } },
    { state: { tex: 'f^{-1}(y)=\\frac{y+1}{2}', caption: 'The inverse adds 1, then halves. Its input is the OUTPUT of f, so its domain is the image of f.', text: 'the inverse' } },
    {
      state: {
        tex: aligned([`f\\left(3\\right)&=2\\cdot 3-1=${y}`, `f^{-1}\\left(${y}\\right)&=\\frac{${y}+1}{2}=${numTex(d.backward!.output)}`]),
        caption: `Check the round trip: f(3) = ${numText(d.forward.output)}, and f⁻¹ sends ${numText(d.forward.output)} back to ${numText(d.backward!.output)}. The inverse undoes the machine exactly.`,
        text: 'the round trip',
      },
    },
    {
      state: {
        tex: aligned(['f(x)&=x^{2}', `f(3)&=f(-3)=${numTex(squareTwin.forward.output)}`]),
        caption: 'Not every function can be undone. x² sends 3 and −3 to the same output 9, so a backward machine would not know which to return. Restricted to x ≥ 0 it has an inverse: the square root.',
        text: 'no inverse',
      },
    },
  ];
  return traceFrom<FrameView>(f);
}

export const WORKED_EXAMPLES: readonly WorkedExample[] = Object.freeze([
  { id: 'evaluate', label: 'evaluate (x − 2)²', frames: evaluateExample },
  { id: 'domain', label: 'domain of √(x + 3)', frames: domainExample },
  { id: 'image', label: 'image of −2x²', frames: imageExample },
  { id: 'compose', label: 'compose x² and 2x − 1', frames: compositionExample },
  { id: 'inverse', label: 'invert 2x − 1', frames: inverseExample },
]);
export const workedById = (id: string): WorkedExample | undefined => WORKED_EXAMPLES.find(e => e.id === id);
