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
const nav = document.querySelector<HTMLDialogElement>('[data-mobile-nav]')!;
const navToggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]')!;
const isMobile = () => matchMedia('(max-width: 800px)').matches;
function updateNavState() { navToggle.setAttribute('aria-expanded', String(isMobile() ? nav.open : document.body.dataset.collapsed !== 'true')); }
navToggle.addEventListener('click', () => {
  if (isMobile()) nav.showModal();
  else document.body.dataset.collapsed = String(document.body.dataset.collapsed !== 'true');
  updateNavState();
});
nav.querySelector('[data-nav-close]')!.addEventListener('click', () => nav.close());
nav.addEventListener('click', event => { if ((event.target as Element).closest('a')) nav.close(); });
nav.addEventListener('close', updateNavState);
matchMedia('(max-width: 800px)').addEventListener('change', () => { nav.close(); updateNavState(); });
updateNavState();
const chapterNumber = document.body.dataset.chapterNumber ?? '01';
const progressKey = `chapter-${chapterNumber}`;
const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')];
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
    document.querySelectorAll('.chapter-outline a').forEach(link => {
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
