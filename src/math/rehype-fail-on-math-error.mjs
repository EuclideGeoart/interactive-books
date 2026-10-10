/**
 * Make a malformed formula a BUILD ERROR (master plan §12.1, layer 1).
 *
 * `rehype-katex` does not stop on a bad formula: whatever `throwOnError` says, it records a vfile *message* (a warning)
 * and falls back to KaTeX's red error span, so `astro build` would succeed and ship a broken equation. This plugin runs
 * after it and throws if any message came from `rehype-katex`.
 *
 * @returns {(tree: unknown, file: { path?: string, messages: Array<{ source?: string | null, reason?: string, line?: number | null, cause?: { message?: string } }> }) => void}
 */
export default function rehypeFailOnMathError() {
  return (_tree, file) => {
    const problems = file.messages.filter(message => message.source === 'rehype-katex');
    if (problems.length === 0) return;
    const detail = problems.map(m => `  - line ${m.line ?? '?'}: ${m.cause?.message ?? m.reason}`).join('\n');
    throw new Error(`KaTeX could not render ${problems.length} formula(s) in ${file.path ?? 'a document'}:\n${detail}`);
  };
}
