import { distributionEvidence, breakChain, chainState, chainInvariants } from '../visualizers/chaining/model';
import { drawChain } from '../visualizers/chaining/adapter';
import { teachingHash } from '../visualizers/hashing/hash';
import { escapeHtml } from '../components/visualizers/primitives';
import { hashSvg } from '../visualizers/hashing/presentation';
for (const root of document.querySelectorAll<HTMLElement>('[data-hash-distribution]')) {
  const form = root.querySelector('form')!;
  const render = () => {
    const data = new FormData(form); const count = Number(data.get('count')); const collision = data.get('mode') === 'collision';
    const evidence = distributionEvidence(count, collision);
    root.querySelector('[data-result]')!.textContent = `${count} keys / 16 buckets: load factor ${evidence.load}. ${evidence.comparisons} actual key comparisons for ${count} successful lookups; mean ${evidence.average.toFixed(2)}, worst ${evidence.worst}. ${collision ? 'Concentrated collisions give linear lookup chains.' : 'Distribution spreads the comparisons across buckets.'}`;
    root.querySelector('[data-distribution-svg]')!.innerHTML = hashSvg(`${root.id}-chart`, 760, 440, evidence.buckets.map((bucket, i) => { const x = 30 + i * 45; const h = bucket.length / count * 310; return `<rect x="${x}" y="${350 - h}" width="28" height="${Math.max(2, h)}" fill="var(--pointer)"/><text x="${x + 14}" y="${335 - h}" text-anchor="middle" class="hash-index">${bucket.length}</text><text x="${x + 14}" y="378" text-anchor="middle" class="hash-index">${i}</text>`; }).join('') + '<text x="25" y="415" class="hash-index">Bucket index · labels above bars count entries</text>');
  };
  form.addEventListener('change', render); form.addEventListener('submit', e => e.preventDefault()); render();
}
for (const root of document.querySelectorAll<HTMLElement>('[data-hash-break]')) {
  const form = root.querySelector('form')!;
  const render = (broken: boolean) => {
    const kind = String(new FormData(form).get('fault'));
    const fundamentals = root.dataset.fundamentals === 'true';
    const state = broken ? breakChain(kind === 'equality' ? 'duplicate' : kind as 'duplicate' | 'lost-link' | 'old-bucket') : chainState([['a', 1], ['i', 2], ['q', 3]]);
    const note = !broken ? 'Valid: a, i and q are distinct keys sharing bucket 1 at capacity 8.' : fundamentals && kind === 'equality' ? `WRONG: hash(a) % 8 = hash(i) % 8 = 1, but a ≠ i. A bucket-only comparison would overwrite or return the wrong value. Full hashes are ${teachingHash('a')} and ${teachingHash('i')}.` : kind === 'old-bucket' ? 'WRONG: capacity is 16 but i is still in bucket 1; hash(i) % 16 = 9. Ordinary find would start in bucket 9 and miss it.' : kind === 'duplicate' ? 'WRONG: two nodes now represent a. Updating a must keep one key and the same size.' : 'WRONG: q.next became nullptr; a and i are still live but unreachable from their bucket.';
    root.querySelector('[data-fault-result]')!.textContent = `${note} ${broken ? 'This is a model-only fault; no invalid native C++ operation is executed.' : ''}`;
    // This diagram is an annotated experiment, not an inspector: remove interactive
    // node affordances so it does not promise an absent inspector.
    root.querySelector('[data-fault-svg]')!.innerHTML = drawChain(state, `${root.id}-fault`, 'logical', null).replace(/ data-(?:node|target|from|field)="[^"]*"| tabindex="0"| aria-pressed="[^"]*"/g, '').replaceAll('role="button"', 'role="group"').replace('Hashing state; select a bucket or entry to inspect it', 'Controlled fault topology; the findings are listed below');
    root.querySelector('[data-fault-invariants]')!.innerHTML = chainInvariants(state, true).map(rule => `<li class="invariant-${rule.status}">${rule.status === 'pass' ? '✓' : '✕'} ${escapeHtml(rule.name)}: ${escapeHtml(rule.detail)}</li>`).join('');
  };
  form.addEventListener('submit', e => { e.preventDefault(); render(true); }); root.querySelector('[data-restore]')!.addEventListener('click', () => render(false)); form.addEventListener('change', () => render(false)); render(false);
}
