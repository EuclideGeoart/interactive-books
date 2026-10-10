/**
 * Exercise definitions shared by every chapter after I.3 (the Vectors chapter keeps its own, unchanged, copy of these types).
 * An exercise is pure, serializable data plus a pure `grade` function looked up BY ID on the island, so nothing non-serializable crosses
 * the Astro island boundary. No exercise is cosmetic multiple choice: each asks the reader to predict, calculate, construct or choose
 * between explanations, and a wrong answer that matches a known misconception gets a hint that names it.
 */
export type ExerciseKind = 'calculation' | 'prediction' | 'explanation' | 'construction';
export interface Choice { readonly id: string; readonly label: string }
export interface Field { readonly id: string; readonly label: string }
export interface Result { readonly correct: boolean; readonly message: string }
export type Answer = Readonly<Record<string, string>>;
export interface Exercise {
  readonly id: string;
  readonly kind: ExerciseKind;
  readonly title: string;
  readonly prompt: string;
  readonly choices?: readonly Choice[];
  readonly fields?: readonly Field[];
  readonly solution: string;
  grade(answer: Answer): Result;
}

/** Parse a plain decimal typed by a reader (accepts the typographic minus). `null` when it is not a finite decimal. */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const text = raw.trim().replace(/−/g, '-');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Parse a rational such as `3`, `-2.5`, `7/2` or `-1/3` into an exact numerator/denominator (denominator > 0), or `null`. */
export function parseRational(raw: string | undefined): { num: bigint; den: bigint } | null {
  if (raw === undefined) return null;
  const text = raw.trim().replace(/−/g, '-').replace(/\s+/g, '');
  const m = /^([+-]?)(\d+)(?:\.(\d+))?(?:\/(\d+))?$/.exec(text);
  if (!m) return null;
  const frac = m[3] ?? '';
  let num = BigInt(m[2]! + frac);
  let den = 10n ** BigInt(frac.length);
  if (m[4] !== undefined) { const d = BigInt(m[4]); if (d === 0n) return null; den *= d; }
  if (m[1] === '-') num = -num;
  const g = gcd(num < 0n ? -num : num, den);
  return g === 0n ? { num, den } : { num: num / g, den: den / g };
}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));

export const ok = (message: string): Result => ({ correct: true, message });
export const no = (message: string): Result => ({ correct: false, message });
export const NEED_NUMBERS: Result = { correct: false, message: 'Enter a number in every box (for example 7, -2.5 or 3/4).' };

/** Grade a multiple-choice answer: `feedback[id]` is the message for choice `id` (the correct one's message explains why it is right). */
export function pick(answer: Answer, correct: string, feedback: Readonly<Record<string, string>>): Result {
  const chosen = answer.choice;
  if (!chosen) return no('Choose an answer first.');
  return chosen === correct ? ok(feedback[correct] ?? 'Correct.') : no(feedback[chosen] ?? 'Not quite.');
}

export const byId = (list: readonly Exercise[], id: string): Exercise | undefined => list.find(e => e.id === id);
