/**
 * Worked examples for I.4, one trace per example. The balance examples are the recorded history of `deriveBalance` along `solutionPath`
 * (so the page and the hero stage write a step the same way) plus a final substitution check. The root example and the division example
 * are written from `deriveExtraneous` and `deriveFallacy`; nothing is typed in twice.
 */
import type { BalanceState, StatementSpec } from '../../math/algebra/balance';
import { deriveBalance, solutionPath, statementOf } from '../../math/algebra/balance';
import { deriveExtraneous } from '../../math/algebra/extraneous';
import { deriveFallacy } from '../../math/algebra/fallacy';
import { evalLinear } from '../../math/algebra/linear';
import { rationalForm } from '../../math/quantity/exactform';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { MINUS } from '../../platform/numeric/format';
import { aligned } from '../shared/format';
import { baseTex, rationalTex } from '../quantities/values';
import { balanceFrames, type FrameView } from './balance-lesson';
import { squaredTex, squaredText, sumForm } from './extraneous-lesson';
import { fallacyTex, fallacyText } from './fallacy-lesson';
import { shiftTex, shiftText, substitutedTex } from './format';

export interface WorkedExample {
  readonly id: string;
  readonly label: string;
  readonly frames: () => readonly TraceFrame<FrameView>[];
}

type Raw = { state: FrameView };

// ---------------------------------------------------------------------------------------------- balance examples
function balanceExample(spec: StatementSpec): readonly TraceFrame<FrameView>[] {
  const state: BalanceState = { initial: spec, steps: solutionPath(spec), trial: 0 };
  const d = deriveBalance(state);
  const frames: Raw[] = balanceFrames(d).map(f => ({ state: { tex: f.state.tex, caption: f.state.caption, text: f.state.text } }));
  const original = statementOf(spec);
  const set = d.finalSolution;
  if (set.kind === 'point') {
    const x = set.x;
    const l = evalLinear(original.l, x);
    const r = evalLinear(original.r, x);
    frames.push({
      state: {
        tex: aligned([
          `\\text{left}&=${substitutedTex(original.l, x)}=${rationalForm(l).tex}`,
          `\\text{right}&=${substitutedTex(original.r, x)}=${rationalForm(r).tex}`,
        ]),
        caption: `Check in the ORIGINAL statement, not in your last line: at x = ${rationalForm(x).text} the left side is ${rationalForm(l).text} and the right side is ${rationalForm(r).text}. They are equal, so x = ${rationalForm(x).text} is a solution.`,
        text: 'check by substitution',
      },
    });
  } else if (set.kind === 'ray') {
    const x = set.bound;
    frames.push({
      state: {
        tex: aligned([`x&=${rationalForm(x).tex}\\ \\text{is the boundary}`]),
        caption: `The boundary ${rationalForm(x).text} separates the solutions from the rest. Test one value on each side in the original statement; the boundary itself ${set.closed ? 'is a solution (the relation allows equality)' : 'is not a solution (the relation is strict)'}.`,
        text: 'check the boundary',
      },
    });
  }
  return traceFrom<FrameView>(frames);
}

// ---------------------------------------------------------------------------------------------- the extraneous root
function extraneousExample(p: number, q: number): readonly TraceFrame<FrameView>[] {
  const d = deriveExtraneous({ p, q });
  const frames: Raw[] = [];
  frames.push({
    state: {
      tex: `\\sqrt{${shiftTex(p)}}=${shiftTex(q)}`,
      caption: 'Solve for x. The radical sign means the non-negative root, so any solution must make the right-hand side non-negative as well.',
      text: 'the equation',
    },
  });
  frames.push({
    state: {
      tex: `${shiftTex(p)}=${q === 0 ? 'x^{2}' : `\\left(${shiftTex(q)}\\right)^{2}`}`,
      caption: 'Square both sides to remove the root. This step is NOT reversible: a² = b² is also true when a = −b, so squaring can add solutions that belong to −√(x + p) = x + q.',
      text: 'square both sides',
    },
  });
  frames.push({
    state: {
      tex: aligned([`${squaredTex(d)}&`, `D=4p-4q+1&=${d.discriminant}`]),
      caption: `Collect terms: ${squaredText(d)}, with discriminant D = ${d.discriminant}.`,
      text: 'the squared equation',
    },
  });
  if (d.roots.length === 0) {
    frames.push({ state: { tex: `D=${d.discriminant}<0`, caption: 'D is negative, so the squared equation has no real root, and neither has the original: there is nothing to check.', text: 'no real root' } });
    return traceFrom<FrameView>(frames);
  }
  frames.push({
    state: {
      tex: aligned(d.roots.map((r, i) => `x_{${i + 1}}&=${sumForm(r.x).tex}`)),
      caption: `The candidates, from x = (1 − 2q ± √D)/2: ${d.roots.map((r, i) => `x${i === 0 ? '₁' : '₂'} = ${sumForm(r.x).text}`).join(' and ')}. They are only candidates.`,
      text: 'the candidates',
    },
  });
  d.roots.forEach((r, i) => {
    const x = sumForm(r.x);
    const t = sumForm(r.t);
    const left = r.lhsFromRoot !== null ? `\\sqrt{${sumForm(r.radicand).tex}}=${rationalForm(r.lhsFromRoot).tex}` : `\\sqrt{${shiftTex(p)}}=\\lvert ${t.tex}\\rvert=${sumForm(r.lhs).tex}`;
    const cmp = r.status === 'valid' ? '=' : '\\ne';
    frames.push({
      state: {
        tex: aligned([`\\text{left}&:\\ ${left}`, `\\text{right}&:\\ ${shiftTex(q)}=${t.tex}`, `&\\text{left}${cmp}\\text{right}\\ \\text{for}\\ x_{${i + 1}}=${x.tex}`]),
        caption: r.status === 'valid'
          ? `Substitute x${i === 0 ? '₁' : '₂'} = ${x.text} into the ORIGINAL equation: the right side is ${t.text}, not negative, and the left side is ${sumForm(r.lhs).text}. They agree: valid.`
          : `Substitute x${i === 0 ? '₁' : '₂'} = ${x.text} into the ORIGINAL equation: the right side is ${t.text}, which is negative, while a square root is not. The left side is ${sumForm(r.lhs).text}, so the two sides are opposite in sign: extraneous. It solves −√(${shiftText(p)}) = ${shiftText(q)}.`,
        text: `check root ${i + 1}`,
      },
    });
  });
  frames.push({
    state: {
      tex: `S=\\{${d.roots.filter(r => r.status === 'valid').map(r => sumForm(r.x).tex).join(',\\ ')}\\}`,
      caption: `The solutions of the original equation: ${d.roots.filter(r => r.status === 'valid').map(r => `x = ${sumForm(r.x).text}`).join(' and ') || 'none'}. ${d.extraneousCount > 0 ? 'Squaring produced extra candidates; only substitution into the original equation tells them apart.' : 'Both candidates passed the check.'}`,
      text: 'the solutions',
    },
  });
  return traceFrom<FrameView>(frames);
}

// ---------------------------------------------------------------------------------------------- the lost root
function fallacyExample(c: number, m: number): readonly TraceFrame<FrameView>[] {
  const d = deriveFallacy({ c, m });
  const factor = shiftTex(-c);
  const frames: Raw[] = [];
  frames.push({ state: { tex: fallacyTex(d), caption: `Solve ${fallacyText(d)}.`, text: 'the equation' } });
  frames.push({
    state: {
      tex: `\\frac{x\\left(${factor}\\right)}{${factor}}=\\frac{${baseTex(d.m)}\\left(${factor}\\right)}{${factor}}\\ \\Longrightarrow\\ x=${rationalTex(d.m)}`,
      caption: `The tempting move: divide both sides by (${shiftText(-c)}). It leaves x = ${rationalForm(d.m).text}. But a division is only allowed where the divisor is not 0.`,
      text: 'the tempting division',
    },
  });
  frames.push({
    state: {
      tex: aligned([
        `x&=${rationalTex(d.c)}:\\quad ${factor}=0`,
        `x\\left(${factor}\\right)&=${rationalTex(d.atC.left)},\\qquad ${baseTex(d.m)}\\left(${factor}\\right)=${rationalTex(d.atC.right)}`,
      ]),
      caption: `At x = ${rationalForm(d.c).text} the divisor is 0, so the step was a division by 0. And that very x makes both sides ${rationalForm(d.atC.left).text}: it IS a solution, and the division threw it away.`,
      text: 'the divisor is zero',
    },
  });
  frames.push({
    state: {
      tex: aligned([
        `x\\left(${factor}\\right)-${baseTex(d.m)}\\left(${factor}\\right)&=0`,
        `\\left(${factor}\\right)\\left(${shiftTex(-m)}\\right)&=0`,
        `x=${rationalTex(d.c)}\\ \\text{or}\\ x=${rationalTex(d.m)}&`,
      ]),
      caption: 'The safe way: move everything to one side and factor out the common factor. A product is 0 exactly when one of its factors is 0, so both cases appear.',
      text: 'factor instead of dividing',
    },
  });
  return traceFrom<FrameView>(frames);
}

// ---------------------------------------------------------------------------------------------- the catalogue
const spec = (a1: number, b1: number, rel: StatementSpec['rel'], a2: number, b2: number): StatementSpec => ({ a1, b1, rel, a2, b2 });

export const WORKED_EXAMPLES: readonly WorkedExample[] = Object.freeze([
  { id: 'w-solve', label: '3x + 2 = x + 10', frames: () => balanceExample(spec(3, 2, '=', 1, 10)) },
  { id: 'w-frac', label: '4x + 1 = x + 3', frames: () => balanceExample(spec(4, 1, '=', 1, 3)) },
  { id: 'w-neg', label: `4 ${MINUS} 2x < x + 10`, frames: () => balanceExample(spec(-2, 4, '<', 1, 10)) },
  { id: 'w-root', label: '√(x + 2) = x', frames: () => extraneousExample(2, 0) },
  { id: 'w-div', label: 'x(x − 2) = 3(x − 2)', frames: () => fallacyExample(2, 3) },
]);

export const workedById = (id: string): WorkedExample | undefined => WORKED_EXAMPLES.find(e => e.id === id);
