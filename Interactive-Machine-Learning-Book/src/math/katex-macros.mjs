/**
 * The ONE macro table for the whole book (master plan §8.1: "consistent macros across the book").
 *
 * It is consumed by the build-time renderer (rehype-katex, for prose math) and by the runtime renderer
 * (`Formula.tsx`, for live math), so a static `\norm{\mathbf v}` and a live one are identical.
 * Keep it small: a macro earns its place only if it encodes a book-wide notation convention.
 *
 * KaTeX may MUTATE the object it is given (\gdef), so callers always pass a fresh copy:
 * `katexMacros()` returns one.
 */
const table = {
  // ‖·‖ — the Euclidean norm. Usage: \norm{\mathbf v}
  '\\norm': '\\left\\lVert #1 \\right\\rVert',
  // |·| — absolute value / magnitude of a scalar.
  '\\abs': '\\left\\lvert #1 \\right\\rvert',
  '\\R': '\\mathbb{R}',
  '\\argmin': '\\operatorname*{arg\\,min}',
  '\\argmax': '\\operatorname*{arg\\,max}',
  // Two-argument arctangent, spelled the way code spells it.
  '\\atantwo': '\\operatorname{atan2}',
};

/** @returns {Record<string, string>} a fresh copy (KaTeX may mutate it) */
export const katexMacros = () => ({ ...table });
