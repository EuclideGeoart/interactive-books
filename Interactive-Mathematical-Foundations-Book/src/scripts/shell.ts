/**
 * Page chrome behaviour: theme toggle, the book-map dialog (+ structural filter), outline highlighting, and
 * keyboard access to scrolling regions. Each feature is independent and null-safe: a page that lacks an
 * element simply skips that feature (nothing here throws on import).
 */
import { labelDuplicates, watchScrollable } from '../platform/overflow';

const storage = {
  get(key: string): string | null { try { return localStorage.getItem(`mf:${key}`); } catch { return null; } },
  set(key: string, value: string): void { try { localStorage.setItem(`mf:${key}`, value); } catch { /* the book works without persistence */ } },
};

// ----------------------------------------------------------------------------------------------- theme
const themeToggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const currentTheme = (): 'light' | 'dark' => {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
const syncThemeToggle = () => themeToggle?.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
themeToggle?.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  storage.set('theme', next);
  syncThemeToggle();
});
syncThemeToggle();

// ----------------------------------------------------------------------------------------------- book map
const map = document.querySelector<HTMLDialogElement>('[data-map]');
if (map) {
  const filter = map.querySelector<HTMLInputElement>('[data-map-filter]');
  const closeButton = map.querySelector<HTMLButtonElement>('[data-map-close]');
  const count = map.querySelector<HTMLElement>('[data-map-count]');
  const items = [...map.querySelectorAll<HTMLElement>('.chapter-item')];
  const parts = [...map.querySelectorAll<HTMLElement>('.part')];

  const applyFilter = () => {
    const terms = (filter?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const item of items) {
      const part = item.closest<HTMLElement>('.part');
      const haystack = `${item.textContent ?? ''} ${part?.querySelector('h3')?.textContent ?? ''}`.toLowerCase();
      const match = terms.every(term => haystack.includes(term));
      item.hidden = !match;
      if (match) shown++;
    }
    for (const part of parts) part.hidden = [...part.querySelectorAll('.chapter-item')].every(li => (li as HTMLElement).hidden);
    if (count) count.textContent = terms.length ? `${shown} matching chapters` : '';
  };
  filter?.addEventListener('input', applyFilter);

  document.querySelectorAll<HTMLElement>('[data-map-open]').forEach(button =>
    button.addEventListener('click', () => {
      map.showModal();
      // On touch devices focusing a text field opens the keyboard; start on the close button there.
      (matchMedia('(pointer: fine)').matches ? filter : closeButton)?.focus();
    }),
  );
  closeButton?.addEventListener('click', () => map.close());
  map.addEventListener('click', event => {
    const target = event.target as Element;
    if (target === map || target.closest('a')) map.close(); // backdrop click or navigation
  });
}

// ----------------------------------------------------------------------------------------------- outline
const outlineLinks = [...document.querySelectorAll<HTMLAnchorElement>('.chapter-outline a[href^="#"]')];
if (outlineLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(outlineLinks.map(link => [decodeURIComponent(link.hash.slice(1)), link]));
  const headings = [...byId.keys()].map(id => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      outlineLinks.forEach(link => link.removeAttribute('aria-current'));
      byId.get(entry.target.id)?.setAttribute('aria-current', 'location');
    }
  }, { rootMargin: '-72px 0px -65% 0px', threshold: 0 });
  headings.forEach(heading => observer.observe(heading));
}

// ----------------------------------------------------------------------------------------------- scrolling regions
// Names must be unique among landmarks, so repeated regions are numbered ("Equation 2, scrollable").
const equations = [...document.querySelectorAll<HTMLElement>('main .katex-display')].filter(el => !el.closest('.math-scroll'));
equations.forEach(el => { el.dataset.scrollable = 'Equation, scrollable'; });
const regions = [...equations, ...document.querySelectorAll<HTMLElement>('[data-scrollable]:not(.katex-display)')];
for (const [el, label] of labelDuplicates(regions, 'Scrollable region')) watchScrollable(el, label);
