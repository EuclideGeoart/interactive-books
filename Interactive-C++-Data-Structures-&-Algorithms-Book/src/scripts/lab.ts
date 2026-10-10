import { DiagramView } from './diagrams';
import { PlaybackController } from '../engine/playback';
import { asciiList } from '../visualizers/linked-list/topology';
import { initialState, makeTrace, operationLabels, validValue, type Operation } from '../visualizers/linked-list/model';
import { checkInvariants } from '../visualizers/linked-list/invariants';
import { escapeHtml } from '../components/visualizers/primitives';

for (const root of document.querySelectorAll<HTMLElement>('[data-lab]')) {
  let operation: Operation = 'insert-head';
  let value = 5;
  let phase: 'before' | 'steps' | 'after' = 'before';
  const query = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const form = query<HTMLFormElement>('[data-operation-form]');
  const field = <T extends HTMLInputElement | HTMLSelectElement>(name: string): T => form.elements.namedItem(name) as T;
  const diagram = new DiagramView(query('[data-diagram]'), initialState());
  let player = new PlaybackController(makeTrace(operation, initialState(), value), render);
  function render(): void {
    const step = player.step;
    const settled = player.index === 0 || player.index === player.total;
    diagram.update(player.state, step?.event);
    query('[data-event]').textContent = step?.event.type ?? 'BEFORE';
    query('[data-step-title]').textContent = step?.title ?? `Ready: ${operationLabels[operation].toLowerCase()}${operation === 'clear' ? '' : ` ${value}`}`;
    query('[data-step-explanation]').textContent = step?.explanation ?? 'Watch storage, links, and references change one step at a time. Select a node to inspect it.';
    query('[data-step-count]').textContent = `Step ${player.index} / ${player.total}`;
    query<HTMLInputElement>('[data-scrubber]').max = String(player.total);
    query<HTMLInputElement>('[data-scrubber]').value = String(player.index);
    query<HTMLButtonElement>('[data-action="previous"]').disabled = player.index === 0;
    query<HTMLButtonElement>('[data-action="next"]').disabled = player.index === player.total;
    query('[data-action="play"]').innerHTML = `${player.playing ? 'Ⅱ' : '▶'} <span>${player.playing ? 'Pause' : player.index === player.total ? 'Replay' : 'Play'}</span>`;
    query('[data-visits]').textContent = String(player.state.visited.length);
    query('[data-comparisons]').textContent = String(player.state.comparisons);
    query('[data-writes]').textContent = String(player.state.writes);
    root.querySelectorAll<HTMLElement>('[data-source]').forEach(line => line.classList.toggle('executing', Boolean(step?.source && line.dataset.source === step.source)));
    const executing = root.querySelector<HTMLElement>('.executing');
    query('[data-mobile-event]').textContent = step?.event.type ?? 'BEFORE';
    query('[data-mobile-code]').textContent = executing?.querySelector('code')?.textContent?.trim() ?? step?.title ?? 'Choose Play or Next to begin.';
    const viewport = query('[data-operation-code]');
    if (executing) {
      const offset = executing.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
      if (offset < viewport.scrollTop || offset + executing.offsetHeight > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = Math.max(0, offset - 60);
    }
    query('[data-code-status]').textContent = step?.source ? `${step.event.type} · highlighted line is executing` : step ? 'Function scope has ended.' : 'Click a line number to jump to its execution.';
    const invariants = checkInvariants(player.state, settled);
    const pending = invariants.filter(rule => rule.status === 'pending').length;
    const failed = invariants.filter(rule => rule.status === 'fail').length;
    query('[data-invariant-summary]').textContent = failed ? `✕ ${failed} broken invariant(s)` : pending ? `△ ${pending} temporary condition(s)` : '✓ All invariants valid';
    query('[data-invariants]').innerHTML = invariants.map(rule => `<li class="invariant-${rule.status}"><span>${rule.status === 'pass' ? '✓' : rule.status === 'pending' ? '△' : '✕'}</span><div><strong>${escapeHtml(rule.name)}</strong><small>${escapeHtml(rule.detail)}</small></div></li>`).join('');
    if (player.playing || (player.index > 0 && player.index < player.total)) phase = 'steps';
    else phase = player.index === 0 ? 'before' : 'after';
    root.querySelectorAll<HTMLElement>('[data-phase]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.phase === phase)));
    root.dataset.step = String(player.index);
    root.dataset.operation = operation;
  }
  function load(nextOperation: Operation = operation): boolean {
    if (!form.reportValidity()) return false;
    const nextValue = Number(field<HTMLInputElement>('value').value);
    const after = Number(field<HTMLInputElement>('after').value);
    const preset = field<HTMLSelectElement>('preset').value;
    let values = preset === 'empty' ? [] : preset === 'single' ? [10] : preset === 'duplicates' ? [10, 10, 20] : [10, 20, 30];
    if (preset === 'custom') {
      const raw = field<HTMLInputElement>('custom').value.trim();
      values = raw ? raw.split(',').map(part => part.trim() === '' ? NaN : Number(part)) : [];
    }
    const error = values.length > 6 ? 'Use up to 6 starting nodes so every link stays inspectable.' : [...values, nextValue, after].some(number => !validValue(number)) ? 'Use whole numbers from −999 to 999, separated by commas.' : '';
    query('[data-input-error]').hidden = !error;
    query('[data-input-error]').textContent = error;
    if (error) return false;
    player.dispose();
    operation = nextOperation;
    value = nextValue;
    query('[data-after-label]').hidden = operation !== 'insert-after';
    query('[data-value-label]').hidden = operation === 'clear';
    root.querySelectorAll<HTMLElement>('[data-operation]').forEach(element => element.setAttribute('aria-pressed', String(element.dataset.operation === operation)));
    root.querySelectorAll<HTMLElement>('[data-code-region]').forEach(element => { element.hidden = element.dataset.codeRegion !== operation; });
    const speed = Number(query<HTMLSelectElement>('[data-speed]').value);
    player = new PlaybackController(makeTrace(operation, initialState(values), value, after), render);
    player.setSpeed(speed);
    query('[data-before]').textContent = asciiList(player.trace.initial);
    query('[data-after]').textContent = asciiList(player.trace.steps.at(-1)!.state);
    render();
    return true;
  }
  form.addEventListener('submit', event => { event.preventDefault(); load(); });
  field<HTMLSelectElement>('preset').addEventListener('change', () => {
    query('[data-custom-label]').hidden = field<HTMLSelectElement>('preset').value !== 'custom';
    if (field<HTMLSelectElement>('preset').value !== 'custom') load();
  });
  root.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.operation) {
      const next = button.dataset.operation as Operation;
      const previousValue = field<HTMLInputElement>('value').value;
      field<HTMLInputElement>('value').value = ['delete', 'search'].includes(next) ? '20' : '5';
      if (!load(next)) field<HTMLInputElement>('value').value = previousValue;
    }
    if (button.dataset.action === 'reset') player.reset();
    if (button.dataset.action === 'previous') player.previous();
    if (button.dataset.action === 'next') player.next();
    if (button.dataset.action === 'play') player.playing ? player.pause() : player.play();
    if (button.dataset.phase === 'before') player.reset();
    if (button.dataset.phase === 'after') player.seek(player.total);
    if (button.dataset.phase === 'steps') player.seek(Math.max(1, Math.min(player.index, player.total - 1)));
    if (button.dataset.jump) {
      const indexes = player.trace.steps.flatMap((step, index) => step.source === button.dataset.jump ? [index + 1] : []);
      const index = indexes.find(index => index > player.index) ?? indexes[0];
      if (index !== undefined) player.seek(index);
      else query('[data-code-status]').textContent = 'This branch is not executed for the selected inputs.';
    }
  });
  query<HTMLInputElement>('[data-scrubber]').addEventListener('input', event => player.seek(Number((event.target as HTMLInputElement).value)));
  query<HTMLSelectElement>('[data-speed]').addEventListener('change', event => player.setSpeed(Number((event.target as HTMLSelectElement).value)));
  document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); });
  window.addEventListener('pagehide', () => player.dispose());
  load();
}
