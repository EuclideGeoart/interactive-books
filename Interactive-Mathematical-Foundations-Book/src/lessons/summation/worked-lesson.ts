/**
 * Worked examples for the summation chapter: five fixed problems, each a trace of immutable frames {tex, caption}.
 * Every number comes from the models (`deriveSum`, `gauss`, `deriveIdentities`, `deriveNested`); this module only orders the steps.
 */
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { form, mul, pow, q, sub } from '../../math/summation/rational';
import { DEFAULT_PARAMS } from '../../math/summation/sequences';
import { deriveIdentities, deriveSum, gauss, termCount } from '../../math/summation/sum';
import { deriveNested } from '../../math/summation/nested';
import { termTex } from './view';

export interface WorkState { readonly tex: string; readonly caption: string }
export interface WorkedExample { readonly id: string; readonly label: string; readonly aria: string }
export const WORKED_EXAMPLES: readonly WorkedExample[] = Object.freeze([
  { id: 'count', label: 'how many terms?', aria: 'counting the terms of a sum from 3 to 11' },
  { id: 'gauss', label: '1 + … + 10', aria: 'adding the whole numbers 1 to 10 by pairing' },
  { id: 'geometric', label: 'powers of ½', aria: 'adding powers of one half by the telescoping trick' },
  { id: 'shift', label: 'shift the index', aria: 'shifting the index of a sum of squares' },
  { id: 'triangle', label: 'swap the loops', aria: 'swapping the order of a triangular double sum' },
].map(e => Object.freeze(e)));

function countFrames(): WorkState[] {
  const m = 3;
  const n = 11;
  const count = termCount(m, n);
  const short = termCount(m, n - 1);
  const empty = deriveSum({ seq: 'identity', params: DEFAULT_PARAMS, m: 5, n: 2 });
  return [
    { tex: `\\sum_{i=${m}}^{${n}}a_i`, caption: `How many terms does this sum have? Both bounds are included: the terms are a_${m}, a_${m + 1}, …, a_${n}.` },
    { tex: `${n}-${m}=${n - m}`, caption: `Subtracting the bounds gives ${n - m}. That counts the steps between the terms, not the terms themselves.` },
    { tex: `\\underbrace{${m},\\ ${m + 1},\\ \\dots,\\ ${n}}_{${count}\\ \\text{numbers}}`, caption: `A row of ${count} posts has ${count - 1} gaps. Here ${n - m} steps join ${count} indices, because both end indices are counted.` },
    { tex: `n-m+1=${n}-${m}+1=${count}`, caption: `So there are ${count} terms. The "+ 1" is the fencepost: it counts the first term too.` },
    { tex: `\\texttt{range(${m}, ${n})}\\ \\text{has}\\ ${short}\\ \\text{values},\\qquad \\texttt{range(${m}, ${n}+1)}\\ \\text{has}\\ ${count}`, caption: `Python's range stops BEFORE its second argument, so it needs n + 1 to include the last index.` },
    { tex: `\\sum_{i=5}^{2}i=${form(empty.total!).tex}\\quad(n-m+1=${2 - 5 + 1}<0\\Rightarrow\\text{no terms})`, caption: 'When the upper bound is below the lower bound there are no terms at all, and the sum is the empty sum, 0. The count is 0, not −2.' },
  ];
}

function gaussFrames(): WorkState[] {
  const g = gauss('identity', DEFAULT_PARAMS, 1, 10)!;
  const first = g.pairs[0]!;
  const loop = deriveSum({ seq: 'identity', params: DEFAULT_PARAMS, m: 1, n: 10 });
  return [
    { tex: '\\sum_{i=1}^{10}i=1+2+3+\\cdots+10', caption: 'Add the whole numbers from 1 to 10. A loop does it one term at a time; Gauss noticed a faster way.' },
    { tex: `S=1+2+\\cdots+9+10,\\qquad S=10+9+\\cdots+2+1`, caption: 'Write the sum twice, once forwards and once backwards. Both lines equal the same S.' },
    { tex: `${g.pairs.map(p => `(${p.low}+${p.high})`).slice(0, 3).join('+')}+\\cdots=${g.pairs.map(p => form(p.sum).tex).slice(0, 3).join('+')}+\\cdots`, caption: `Pair the first term with the last: ${first.low} + ${first.high} = ${form(first.sum).text}. The second with the second last: ${g.pairs[1]!.low} + ${g.pairs[1]!.high} = ${form(g.pairs[1]!.sum).text}. Every pair has the same sum.` },
    { tex: `${g.pairs.length}\\ \\text{pairs}\\times ${form(g.pairSum).tex}=${form(mul(q(g.pairs.length), g.pairSum)).tex}`, caption: `There are ${g.pairs.length} pairs, each adding to ${form(g.pairSum).text}, so the total is ${g.pairs.length} · ${form(g.pairSum).text}.` },
    { tex: `\\sum_{i=1}^{10}i=${form(g.total).tex}=\\frac{10\\cdot11}{2}`, caption: `So the sum is ${form(g.total).text}. The formula n(n + 1)/2 is this idea: n terms, each pair adding to n + 1, and half as many pairs as terms.` },
    { tex: `\\text{loop: }\\ ${form(loop.total!).tex}\\qquad\\text{pairing: }\\ ${form(g.total).tex}`, caption: `Check: the loop adds the ten terms one at a time and also gets ${form(loop.total!).text}. The pairing and the loop must agree, and they do.` },
  ];
}

function geometricFrames(): WorkState[] {
  const r = q(1, 2);
  const d = deriveSum({ seq: 'geometric', params: { ...DEFAULT_PARAMS, r }, m: 0, n: 4 });
  const rs = d.total === null ? q(0) : mul(r, d.total);
  const diff = d.total === null ? q(0) : sub(d.total, rs);
  return [
    { tex: `S=\\sum_{i=0}^{4}\\left(\\tfrac12\\right)^{i}=1+\\tfrac12+\\tfrac14+\\tfrac18+\\tfrac1{16}`, caption: 'Add five powers of 1/2. The loop is easy, but the trick below works for any number of terms.' },
    { tex: `rS=\\tfrac12+\\tfrac14+\\tfrac18+\\tfrac1{16}+\\tfrac1{32}`, caption: 'Multiply S by r = 1/2. Every term moves one place along: the powers go from 0 … 4 to 1 … 5.' },
    { tex: `S-rS=1-\\tfrac1{32}=${form(diff).tex}`, caption: 'Subtract. The middle terms cancel in pairs (telescoping), leaving only the first term of S and the last term of rS.' },
    { tex: `(1-r)S=${form(diff).tex}\\ \\Rightarrow\\ S=\\frac{${form(diff).tex}}{1-\\frac12}`, caption: 'Factor S out of the left side. The step "divide by 1 − r" is allowed only when 1 − r is not 0.' },
    { tex: `S=${form(d.total!).tex}=\\frac{r^{0}-r^{5}}{1-r}`, caption: `So S = ${form(d.total!).text}. In general Σ from i = m to n of r^i = (r^m − r^(n+1)) / (1 − r). Here r^0 = ${form(pow(r, 0)).text} and r^5 = ${form(pow(r, 5)).text}.` },
    { tex: `r=1:\\ \\sum_{i=0}^{4}1^{i}=${form(deriveSum({ seq: 'geometric', params: { ...DEFAULT_PARAMS, r: q(1) }, m: 0, n: 4 }).total!).tex}`, caption: 'If r = 1 the denominator 1 − r is 0 and the formula is meaningless; but every term is 1, so the sum is just the number of terms. This case needs its own line.' },
  ];
}

function shiftFrames(): WorkState[] {
  const id = deriveIdentities(1, 4, 1, 2);
  return [
    { tex: `\\sum_{i=1}^{4}i^{2}=1+4+9+16=${form(id.shift.original).tex}`, caption: 'A sum of squares from i = 1 to 4. We want to rewrite it so that the index starts at 3.' },
    { tex: 'j=i+2\\ \\Rightarrow\\ i=j-2', caption: 'Introduce a new index j = i + 2. When i runs from 1 to 4, j runs from 3 to 6. Solve for i so the term can be rewritten.' },
    { tex: 'i=1\\mapsto j=3,\\qquad i=4\\mapsto j=6', caption: 'Both bounds move up by 2: the new bounds are 3 and 6.' },
    { tex: `\\sum_{j=3}^{6}(j-2)^{2}=1+4+9+16=${form(id.shift.shifted).tex}`, caption: 'Replace i by j − 2 in the term: i² becomes (j − 2)². Now the same four numbers are added, so the sum is unchanged.' },
    { tex: `\\sum_{j=3}^{6}j^{2}=9+16+25+36=${form(id.shift.wrong).tex}`, caption: `The common mistake: change the bounds but leave the term as j². That adds different numbers and gets ${form(id.shift.wrong).text}, not ${form(id.shift.original).text}.` },
  ];
}

function triangleFrames(): WorkState[] {
  const d = deriveNested({ kind: 'triangular', n: 3, k: 3, rule: 'table', order: 'rows-first' });
  const e = d.entries;
  const row = (i: number) => e[i - 1]!.slice(0, i).map(x => termTex(x));
  const col = (j: number) => e.slice(j - 1).map(r => termTex(r[j - 1]!));
  const m = d.swapMistake!;
  return [
    { tex: '\\sum_{i=1}^{3}\\sum_{j=1}^{i}a_{ij}', caption: 'A triangular sum: row i has the columns j = 1 up to i. Take a 3 by 3 table of numbers and add only the cells on or below the diagonal.' },
    { tex: `\\text{rows: }\\ ${row(1).join('+')}\\ \\big|\\ ${row(2).join('+')}\\ \\big|\\ ${row(3).join('+')}=${form(d.total).tex}`, caption: `Row by row: row 1 has one cell, row 2 has two, row 3 has three. The total is ${form(d.total).text}.` },
    { tex: '\\sum_{j=1}^{3}\\sum_{i=j}^{3}a_{ij}', caption: 'Now add column by column. The cells with j ≤ i, read by columns: column j starts at the diagonal i = j and goes down to i = 3. The inner bounds changed.' },
    { tex: `\\text{columns: }\\ ${col(1).join('+')}\\ \\big|\\ ${col(2).join('+')}\\ \\big|\\ ${col(3).join('+')}=${form(d.otherTotal).tex}`, caption: `The same six cells in a different order: the total is ${form(d.otherTotal).text} again.` },
    { tex: `\\sum_{j=1}^{3}\\sum_{i=1}^{j}a_{ij}=${form(m.total).tex}\\ne ${form(d.total).tex}`, caption: `The mistake: swap the loops but keep the old bounds. Then i only goes up to j, which visits the OTHER triangle (the cells with i ≤ j) and returns ${form(m.total).text}, not ${form(d.total).text}.` },
  ];
}

export function workedFrames(id: string): readonly TraceFrame<WorkState>[] {
  const states = id === 'count' ? countFrames() : id === 'gauss' ? gaussFrames() : id === 'geometric' ? geometricFrames() : id === 'shift' ? shiftFrames() : id === 'triangle' ? triangleFrames() : null;
  if (!states) throw new RangeError(`Unknown worked example: ${id}`);
  return traceFrom<WorkState>(states.map(state => ({ state })));
}
