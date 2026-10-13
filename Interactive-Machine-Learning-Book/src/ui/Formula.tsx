import katex from 'katex';
import { katexMacros } from '../math/katex-macros.mjs';

export default function Formula({ tex, label }: { tex: string; label: string }) {
  const html = katex.renderToString(tex, { throwOnError: true, strict: 'error', macros: katexMacros(), output: 'htmlAndMathml' });
  return <div class="formula" role="group" aria-label={label} data-formula-label={label}><span dangerouslySetInnerHTML={{ __html: html }} /></div>;
}
