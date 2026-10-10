/**
 * Formula — runtime KaTeX rendering (master plan §8.1, §8.2). Renders on the server too (KaTeX is pure JS), so
 * the canonical state is complete HTML before hydration. `data-tex` carries the source so tests can assert that
 * the formula panel shows the model's quantities.
 */
import { renderTex } from '../platform/tex';

export interface FormulaProps {
  tex: string;
  display?: boolean;
  class?: string;
}

export function Formula({ tex, display = false, class: className }: FormulaProps) {
  const Tag = display ? 'div' : 'span';
  return <Tag class={`formula${display ? ' formula-display' : ''}${className ? ` ${className}` : ''}`} data-tex={tex} dangerouslySetInnerHTML={{ __html: renderTex(tex, display) }} />;
}
