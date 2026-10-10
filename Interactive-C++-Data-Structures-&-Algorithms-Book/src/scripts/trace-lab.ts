import { InspectionDiagram } from './inspection-diagram';
import { PlaybackController } from '../engine/playback';
import { escapeHtml } from '../components/visualizers/primitives';
import type { LabAdapter } from '../components/controls/lab-types';

export function mountTraceLab<S, E extends { type: string }>(root: HTMLElement, adapter: LabAdapter<S, E>): void {
  const query = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const form = query<HTMLFormElement>('[data-operation-form]');
  let operation = query('[data-operation]').dataset.operation!;
  let player: PlaybackController<S, E>;
  let diagram: InspectionDiagram<S, E>;
  function render(): void {
    const step = player.step;
    diagram.update(player.state, player.step?.event);
    query('[data-event]').textContent = step?.event.type ?? 'BEFORE';
    query('[data-step-title]').textContent = step?.title ?? 'Ready to execute';
    query('[data-step-explanation]').textContent = step?.explanation ?? 'The diagram shows the starting state. Choose Next to execute the first semantic event.';
    query('[data-step-count]').textContent = `Step ${player.index} / ${player.total}`;
    query<HTMLInputElement>('[data-scrubber]').max = String(player.total);
    query<HTMLInputElement>('[data-scrubber]').value = String(player.index);
    query<HTMLButtonElement>('[data-action="previous"]').disabled = player.index === 0;
    query<HTMLButtonElement>('[data-action="next"]').disabled = player.index === player.total;
    query('[data-action="play"]').innerHTML = `${player.playing ? 'Ⅱ' : '▶'} <span>${player.playing ? 'Pause' : player.index === player.total ? 'Replay' : 'Play'}</span>`;
    root.querySelectorAll<HTMLElement>('[data-source]').forEach(line => line.classList.toggle('executing', Boolean(step?.source && line.dataset.source === step.source)));
    const executing = root.querySelector<HTMLElement>('[data-code-region]:not([hidden]) .executing');
    query('[data-mobile-event]').textContent = step?.event.type ?? 'BEFORE';
    query('[data-mobile-code]').textContent = executing?.querySelector('code')?.textContent?.trim() ?? step?.title ?? 'Choose Play or Next to begin.';
    const viewport = query('[data-operation-code]');
    if (executing) {
      const offset = executing.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
      if (offset < viewport.scrollTop || offset + executing.offsetHeight > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = Math.max(0, offset - 50);
    }
    query('[data-code-status]').textContent = step?.source ? `${step.event.type} · highlighted line is executing` : step ? 'Semantic boundary · no C++ statement executing' : 'Click a line number to jump to its execution.';
    const rules = adapter.invariants(player.state, player.index === 0 || player.index === player.total);
    const failed = rules.filter(rule => rule.status === 'fail').length;
    const pending = rules.filter(rule => rule.status === 'pending').length;
    query('[data-invariant-summary]').textContent = failed ? `✕ ${failed} broken invariant(s)` : pending ? `△ ${pending} temporary condition(s)` : '✓ All invariants valid';
    query('[data-invariants]').innerHTML = rules.map(rule => `<li class="invariant-${rule.status}"><span>${rule.status === 'pass' ? '✓' : rule.status === 'pending' ? '△' : '✕'}</span><div><strong>${escapeHtml(rule.name)}</strong><small>${escapeHtml(rule.detail)}</small></div></li>`).join('');
    query('[data-counters]').innerHTML = (adapter.counters?.(player.state) ?? []).map(counter => `<span>${escapeHtml(counter.label)} <b>${counter.value}</b></span>`).join('');
    const phase = player.index === 0 ? 'before' : player.index === player.total ? 'after' : 'steps';
    root.querySelectorAll<HTMLElement>('[data-phase]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.phase === phase)));
    root.dataset.step = String(player.index);
    root.dataset.operation = operation;
  }
  function load(next = operation): void {
    if (!form.reportValidity()) return;
    try {
      const inputs = new FormData(form);
      const trace = adapter.build(next, inputs);
      const regions = adapter.regions(next, inputs);
      // Build/validate completely before replacing the current experiment.
      player?.dispose();
      operation = next;
      player = new PlaybackController(trace, render);
      if (!diagram) diagram = new InspectionDiagram(query('[data-diagram]'), adapter, trace.initial, root.dataset.labId!);
      else diagram.update(trace.initial, undefined, true);
      player.setSpeed(Number(query<HTMLSelectElement>('[data-speed]').value));
      query('[data-input-error]').hidden = true;
      root.querySelectorAll<HTMLElement>('[data-operation]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.operation === operation)));
      root.querySelectorAll<HTMLElement>('[data-code-region]').forEach(region => { region.hidden = !regions.includes(region.dataset.codeRegion!); });
      query('[data-before]').textContent = adapter.describe(trace.initial);
      query('[data-after]').textContent = adapter.describe(trace.steps.at(-1)?.state ?? trace.initial);
      render();
    } catch (error) {
      query('[data-input-error]').textContent = error instanceof Error ? error.message : 'Unable to load this experiment.';
      query('[data-input-error]').hidden = false;
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); load(); });
  form.addEventListener('change', event => { if ((event.target as Element).matches('select')) load(); });
  root.addEventListener('click', event => {
    const element = event.target as Element;
    const button = element.closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.operation) load(button.dataset.operation);
    if (!player) return;
    if (button.dataset.action === 'reset' || button.dataset.phase === 'before') player.reset();
    if (button.dataset.action === 'previous') player.previous();
    if (button.dataset.action === 'next') player.next();
    if (button.dataset.action === 'play') player.playing ? player.pause() : player.play();
    if (button.dataset.phase === 'after') player.seek(player.total);
    if (button.dataset.phase === 'steps') player.seek(Math.max(1, Math.min(player.index, player.total - 1)));
    if (button.dataset.jump) {
      const indices = player.trace.steps.flatMap((step, i) => step.source === button.dataset.jump ? [i + 1] : []);
      const next = indices.find(index => index > player.index) ?? indices[0];
      if (next !== undefined) player.seek(next);
      else query('[data-code-status]').textContent = 'This branch is not executed for the selected inputs.';
    }
  });
  query('[data-scrubber]').addEventListener('input', event => player?.seek(Number((event.target as HTMLInputElement).value)));
  query('[data-speed]').addEventListener('change', event => player?.setSpeed(Number((event.target as HTMLSelectElement).value)));
  document.addEventListener('visibilitychange', () => { if (document.hidden) player?.pause(); });
  window.addEventListener('pagehide', () => player?.dispose());
  load();
}
