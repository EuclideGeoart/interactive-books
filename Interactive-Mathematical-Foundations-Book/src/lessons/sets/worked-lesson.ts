/**
 * Worked examples for the sets chapter: four fixed problems, each a trace of immutable frames {tex, caption}.
 * Every set, count and verdict comes from the models (`deriveSets`, the interval functions, `deriveRelation`); this module only orders the steps.
 */
import { rat } from '../../math/families/rational';
import { deriveSets, maskOf } from '../../math/sets/finite';
import { fromSpec, junction, setTex, union, type IntervalSet } from '../../math/sets/intervals';
import { deriveRelation, presetState } from '../../math/sets/relations';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { braces } from './view';

export interface WorkState { readonly tex: string; readonly caption: string }
export interface WorkedExample { readonly id: string; readonly label: string; readonly aria: string }
export const WORKED_EXAMPLES: readonly WorkedExample[] = Object.freeze([
  { id: 'holes', label: '(0,1) ∪ (1,2)', aria: 'the union of open 0 to 1 and open 1 to 2, compared with a closed end' },
  { id: 'count', label: '|A ∪ B|', aria: 'counting the union of two overlapping sets' },
  { id: 'de-morgan', label: 'De Morgan', aria: 'the complement of a union, two ways' },
  { id: 'parity', label: 'same parity', aria: 'checking that same parity is an equivalence relation' },
].map(e => Object.freeze(e)));

const r = (n: number) => rat(n, 1);
const piece = (lo: number, hi: number, lc: boolean, hc: boolean): IntervalSet => fromSpec({ lo: r(lo), hi: r(hi), loClosed: lc, hiClosed: hc });

function holesFrames(): WorkState[] {
  const a = piece(0, 1, false, false);
  const b = piece(1, 2, false, false);
  const closedA = piece(0, 1, true, true);
  const u = union(a, b);
  const u2 = union(closedA, b);
  const meet = junction(a, b);
  const meet2 = junction(closedA, b);
  return [
    { tex: `A=${setTex(a)},\\qquad B=${setTex(b)}`, caption: 'Two open intervals. Open means the end is NOT included: A has every number strictly between 0 and 1, B every number strictly between 1 and 2.' },
    { tex: `1\\notin A\\ \\text{(right end, open)},\\qquad 1\\notin B\\ \\text{(left end, open)}`, caption: 'The two intervals meet at 1. Test 1 against each: it is the right end of A and the left end of B, and both ends are open, so 1 is in neither.' },
    { tex: `A\\cup B=${setTex(u)}`, caption: `A number is in the union if it is in A or in B. Since 1 is in neither, 1 is missing: the union has ${u.length} pieces${meet.kind === 'touch-gap' ? ', which touch at 1 but leave a hole there' : ''}. It is not an interval.` },
    { tex: `A'=${setTex(closedA)}\\ \\Rightarrow\\ 1\\in A'`, caption: 'Now close the right end of A. The same point 1 is now included, because a closed end belongs to the interval.' },
    { tex: `A'\\cup B=${setTex(u2)}`, caption: `The hole is filled${meet2.kind === 'touch-joined' ? ': the pieces meet at 1 and 1 belongs to one of them' : ''}, so the union is a single interval. One closed end changed the number of pieces from ${u.length} to ${u2.length}.` },
  ];
}

function countFrames(): WorkState[] {
  const d = deriveSets({ a: maskOf([1, 2, 3, 4, 5]), b: maskOf([4, 5, 6, 7]), op: 'union' });
  return [
    { tex: `A=${braces(d.A).tex},\\qquad B=${braces(d.B).tex}`, caption: 'Two overlapping sets inside the universe U = {1, 2, …, 12}. How many elements are in A ∪ B?' },
    { tex: `\\lvert A\\rvert+\\lvert B\\rvert=${d.A.length}+${d.B.length}=${d.A.length + d.B.length}`, caption: 'Adding the sizes counts every element of A and every element of B. But the elements in both are counted twice.' },
    { tex: `A\\cap B=${braces(d.intersection).tex},\\qquad \\lvert A\\cap B\\rvert=${d.intersection.length}`, caption: 'Find the elements counted twice: those in both sets.' },
    { tex: `\\lvert A\\cup B\\rvert=${d.A.length}+${d.B.length}-${d.intersection.length}=${d.inclusionExclusion.formula}`, caption: 'Subtract one copy of the overlap. This is inclusion–exclusion.' },
    { tex: `A\\cup B=${braces(d.union).tex},\\qquad \\lvert A\\cup B\\rvert=${d.union.length}`, caption: `Check by listing the union and counting directly: ${d.union.length}, the same ${d.inclusionExclusion.holds ? 'answer' : 'mismatch'}.` },
  ];
}

function deMorganFrames(): WorkState[] {
  const d = deriveSets({ a: maskOf([1, 2, 3, 4]), b: maskOf([3, 4, 5, 6]), op: 'union' });
  const m = d.deMorgan;
  return [
    { tex: `U=\\{1,2,\\dots,12\\},\\quad A=${braces(d.A).tex},\\quad B=${braces(d.B).tex}`, caption: 'Complements need a universe. Here every set is a subset of U = {1, …, 12}.' },
    { tex: `A\\cup B=${braces(d.union).tex}\\ \\Rightarrow\\ U\\setminus(A\\cup B)=${braces(m.unionComplement).tex}`, caption: 'Left side first: form the union, then take what is left of U.' },
    { tex: `U\\setminus A=${braces(d.complementA).tex},\\qquad U\\setminus B=${braces(d.complementB).tex}`, caption: 'Right side: complement each set separately.' },
    { tex: `(U\\setminus A)\\cap(U\\setminus B)=${braces(m.complementsIntersection).tex}`, caption: 'Intersect the two complements: the elements outside A AND outside B.' },
    { tex: `U\\setminus(A\\cup B)=(U\\setminus A)\\cap(U\\setminus B)\\quad ${m.firstHolds ? '\\checkmark' : '\\times'}`, caption: 'The two sides are the same set. "Outside the union" means "outside A and outside B": complementing swaps a union for an intersection.' },
  ];
}

function parityFrames(): WorkState[] {
  const d = deriveRelation(presetState('same-parity', 5, 5));
  return [
    { tex: 'a\\,R\\,b\\iff a-b\\ \\text{is even},\\qquad A=\\{1,2,3,4,5\\}', caption: 'The relation "same parity": a is related to b when a − b is even, that is, both are odd or both are even.' },
    { tex: `R=\\{(a,b): a-b\\ \\text{even}\\}\\ \\text{has}\\ ${d.size}\\ \\text{of}\\ ${d.total}\\ \\text{pairs}`, caption: `Listing the pairs gives ${d.size} out of the ${d.total} in A × A.` },
    { tex: `a-a=0\\ \\text{is even, so}\\ a\\,R\\,a\\quad ${d.reflexive!.holds ? '\\checkmark\\ \\text{reflexive}' : ''}`, caption: 'Reflexive: every number is the same parity as itself, because a − a = 0 and 0 is even.' },
    { tex: `a-b\\ \\text{even}\\Rightarrow b-a=-(a-b)\\ \\text{even}\\quad ${d.symmetric!.holds ? '\\checkmark\\ \\text{symmetric}' : ''}`, caption: 'Symmetric: reversing the order only changes the sign of the difference, and −(an even number) is even.' },
    { tex: `a-c=(a-b)+(b-c)\\ \\text{is even}\\quad ${d.transitive!.holds ? '\\checkmark\\ \\text{transitive}' : ''}`, caption: 'Transitive: the sum of two even numbers is even.' },
    { tex: `A=${d.classes!.map(c => braces(c).tex).join('\\ \\sqcup\\ ')}`, caption: `So R is an equivalence relation, and it cuts A into ${d.classes!.length} classes with no overlap: the odd numbers and the even numbers. Every element is in exactly one class.` },
  ];
}

export function workedFrames(id: string): readonly TraceFrame<WorkState>[] {
  const states = id === 'holes' ? holesFrames() : id === 'count' ? countFrames() : id === 'de-morgan' ? deMorganFrames() : id === 'parity' ? parityFrames() : null;
  if (!states) throw new RangeError(`Unknown worked example: ${id}`);
  return traceFrom<WorkState>(states.map(state => ({ state })));
}
