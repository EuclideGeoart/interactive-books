import type { SearchEntry } from '../content/search';
import './diagram-fit';
import { escapeHtml } from '../components/visualizers/primitives';
const storage = {
  read(key: string): string | null { try { return localStorage.getItem(`cpp-book:${key}`); } catch { return null; } },
  write(key: string, value: string): void { try { localStorage.setItem(`cpp-book:${key}`, value); } catch { /* The book remains usable without persistence. */ } },
};
const themeToggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!;
function themeLabel() {
  themeToggle.setAttribute('aria-label', `Switch to ${document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'} theme`);
}
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; storage.write('theme', next); themeLabel();
});
themeLabel();
const nav = document.querySelector<HTMLDialogElement>('[data-mobile-nav]');
const navToggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
if (nav && navToggle) {
  const updateNavState = () => navToggle.setAttribute('aria-expanded', String(nav.open));
  navToggle.addEventListener('click', () => { nav.showModal(); updateNavState(); });
  nav.querySelector('[data-nav-close]')!.addEventListener('click', () => nav.close());
  nav.addEventListener('click', event => { if ((event.target as Element).closest('a')) nav.close(); });
  nav.addEventListener('close', updateNavState);
}
const outline = document.querySelector<HTMLDetailsElement>('[data-reader-outline]');
if (outline) {
  const wide = matchMedia('(min-width: 801px)');
  const updateOutline = () => { outline.open = wide.matches; };
  wide.addEventListener('change', updateOutline);
  updateOutline();
}
const chapterNumber = document.body.dataset.chapterNumber;
const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')];
// Home and contents use the shared shell without chapter progress or completion controls.
if (chapterNumber && sections.length) {
  const progressKey = `chapter-${chapterNumber}`;
  let visited = new Set<string>();
  try { const saved: unknown = JSON.parse(storage.read(progressKey) || '[]'); if (Array.isArray(saved)) visited = new Set(saved.filter(id => typeof id === 'string' && sections.some(section => section.id === id))); } catch { /* Ignore obsolete or malformed local progress. */ }
  const completeButton = document.querySelector<HTMLButtonElement>('[data-complete]')!;
  function updateProgress() {
    const percent = Math.round(visited.size / sections.length * 100);
    document.querySelector('[data-progress-label]')!.textContent = `${percent}%`;
    document.querySelector<HTMLProgressElement>('[data-reading-progress]')!.value = percent;
    completeButton.setAttribute('aria-pressed', String(percent === 100));
    completeButton.textContent = percent === 100 ? 'Chapter complete ✓' : 'Mark chapter complete ✓';
    storage.write(progressKey, JSON.stringify([...visited]));
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const section = (entry.target as HTMLElement).closest<HTMLElement>('[data-section]')!;
      visited.add(section.id);
      document.querySelectorAll('.chapter-outline a, .mobile-outline a').forEach(link => {
        if (link.getAttribute('href') === `#${section.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    updateProgress();
  }, { rootMargin: '-80px 0px -25% 0px', threshold: 0 });
  sections.forEach(section => observer.observe(section.querySelector('.section-heading')!));
  completeButton.addEventListener('click', () => { visited = new Set(sections.map(section => section.id)); updateProgress(); });
  document.querySelector('[data-reset-progress]')!.addEventListener('click', () => { visited.clear(); updateProgress(); });
  updateProgress();
}
const search = document.querySelector<HTMLDialogElement>('[data-search-dialog]')!;
const input = search.querySelector<HTMLInputElement>('input')!;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const localIndex = sections.map(section => ({ number: chapterNumber, slug: '', id: section.id, title: section.dataset.title!, text: (section.textContent || '').replace(/\s+/g, ' ') }));
const bookIndex: SearchEntry[] = JSON.parse(document.querySelector('[data-search-index]')?.textContent || '[]');
const index = [...localIndex, ...bookIndex.filter(entry => entry.number !== chapterNumber)];
function searchResults() {
  const query = input.value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const matches = index.filter(section => terms.every(term => section.text.toLowerCase().includes(term)));
  search.querySelector('[data-search-results]')!.innerHTML = matches.length ? matches.map(section => `<li><a href="${section.number === chapterNumber ? `#${section.id}` : `${base}/chapters/${section.slug}/#${section.id}`}"><span>CHAPTER ${section.number}</span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(section.text.slice(0, 140))}…</small></a></li>`).join('') : '<li class="no-results">No matching sections. Try “head”, “memory”, or “search”.</li>';
  search.querySelector('[data-search-count]')!.textContent = `${matches.length} matching sections`;
}
function openSearch() { search.showModal(); searchResults(); input.focus(); }
document.querySelector('[data-search-open]')!.addEventListener('click', openSearch);
search.querySelector('[data-search-close]')!.addEventListener('click', () => search.close());
search.addEventListener('click', event => { if ((event.target as Element).closest('a')) search.close(); });
search.addEventListener('keydown', event => {
  // A search input can otherwise consume Escape just to clear its text.
  if (event.key === 'Escape') { event.preventDefault(); search.close(); }
});
input.addEventListener('input', searchResults);
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.open ? search.close() : openSearch(); }
});

// Keep Tab inside the modal instead of letting browser chrome take focus at its edges.
for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog')) {
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('a[href], button, input')].filter(control => control.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
  });
}
