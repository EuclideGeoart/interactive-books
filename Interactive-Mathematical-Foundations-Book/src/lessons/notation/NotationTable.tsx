/**
 * NotationTable — the reference of this chapter: every symbol with how it is read, what it means, the shape of what it names, the Python that
 * writes the same thing, and where the idea is developed later. A search box and category buttons narrow the list; the count is announced and
 * an empty result says so, with a button that restores everything. The full list is rendered on the server, so it is complete without scripts.
 */
import { useEffect, useState } from 'preact/hooks';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { CATEGORIES, NOTATION } from './notation-data';
import { NO_FILTER, filterNotation, groupNotation, isFiltered, resultSentence, type CategoryFilter, type TableFilter } from './notation-table';

function NotationTableInner() {
  const [filter, setFilter] = useState<TableFilter>(NO_FILTER);
  const [hydrated, setHydrated] = useState(false);
  const headingId = useScopedId();
  const searchId = useScopedId();
  const groupLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const shown = filterNotation(filter);
  const groups = groupNotation(shown);
  const sentence = resultSentence(filter, shown.length);
  const pick = (category: CategoryFilter) => setFilter(f => ({ ...f, category }));

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="notation-table" data-hydrated={hydrated} data-shown={shown.length} data-total={NOTATION.length} data-category={filter.category}>
      <header class="stage-head">
        <h3 id={headingId}>The notation table</h3>
        <button type="button" class="button quiet" onClick={() => setFilter(NO_FILTER)} disabled={!isFiltered(filter)} data-action="clear-filters">Clear filters</button>
      </header>
      <div class="nt-search">
        <label for={searchId}>Search the table</label>
        <input id={searchId} type="search" autocomplete="off" spellcheck={false} value={filter.query} placeholder="a word such as transpose, norm, mean" onInput={ev => setFilter(f => ({ ...f, query: (ev.currentTarget as HTMLInputElement).value }))} data-search />
      </div>
      <div>
        <p class="presets-label" id={groupLabelId}>Show</p>
        <div class="presets" role="group" aria-labelledby={groupLabelId}>
          <button type="button" aria-pressed={filter.category === 'all'} data-category-button="all" onClick={() => pick('all')}>All</button>
          {CATEGORIES.map(c => <button key={c.id} type="button" aria-pressed={filter.category === c.id} data-category-button={c.id} onClick={() => pick(c.id)}>{c.title}</button>)}
        </div>
      </div>
      <p class="nt-count" role="status" aria-live="polite" data-result-count>{sentence}</p>
      {shown.length === 0 && (
        <p class="verdict" data-agree="false" data-no-match>
          <span aria-hidden="true">⚠ </span>Nothing to show for this search. <button type="button" class="button quiet" onClick={() => setFilter(NO_FILTER)} data-action="clear-filters-inline">Show everything</button>
        </p>
      )}
      {groups.map(g => (
        <section key={g.category.id} class="nt-group" aria-labelledby={`${headingId}-${g.category.id}`} data-group={g.category.id}>
          <h4 id={`${headingId}-${g.category.id}`}>{g.category.title}</h4>
          <ul class="nt-list">
            {g.entries.map(n => (
              <li key={n.id} class="nt-entry" data-entry={n.id}>
                <div class="nt-symbol"><Formula tex={n.tex} /></div>
                <dl class="nt-facts">
                  <div><dt>Read as</dt><dd>{n.reads}</dd></div>
                  <div class="nt-wide"><dt>Means</dt><dd>{n.meaning}</dd></div>
                  <div><dt>Shape</dt><dd>{n.shape}</dd></div>
                  <div><dt>Python</dt><dd>{n.python ? <code data-runs={n.runs ? 'true' : 'false'}>{n.python}</code> : <span class="nt-none">no direct equivalent</span>}</dd></div>
                  <div class="nt-wide"><dt>Developed in</dt><dd>{n.where}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

export default function NotationTable() {
  return (
    <IdScope name="notation-table">
      <NotationTableInner />
    </IdScope>
  );
}
