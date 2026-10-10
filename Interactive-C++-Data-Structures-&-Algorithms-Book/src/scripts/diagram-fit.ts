// Presentation only: keep every algorithm's viewBox, node coordinates and links.
const scalable = 'svg.tree-diagram,svg.graph-diagram,svg.heap-diagram,svg.technique-tree-svg,svg.spatial-diagram,svg.systems-diagram';
for (const canvas of document.querySelectorAll<HTMLElement>('[data-svg]')) {
  const controls = document.createElement('div');
  controls.className = 'diagram-size-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Diagram size');
  controls.innerHTML = '<button type="button" data-diagram-size="fit" aria-pressed="true">Fit diagram</button><button type="button" data-diagram-size="actual" aria-pressed="false">Actual size</button><span>Select a node to read its details.</span>';
  canvas.before(controls);
  canvas.dataset.diagramScale = 'fit';
  const update = () => {
    // Heap sort shares the sorting renderer, including when its active heap is empty.
    if (canvas.closest('[data-chapter-lab="heap-sort"],[data-structure-preview="heap-sort"]')) {
      canvas.querySelector('svg.sorting-diagram')?.classList.add('heap-diagram');
    }
    controls.hidden = !canvas.querySelector(scalable);
  };
  controls.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-diagram-size]');
    if (!button) return;
    canvas.dataset.diagramScale = button.dataset.diagramSize!;
    controls.querySelectorAll<HTMLButtonElement>('button').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    canvas.scrollTo(0, 0);
    canvas.querySelectorAll<HTMLElement>('.technique-tree-scroll').forEach(viewport => viewport.scrollTo(0, 0));
  });
  new MutationObserver(update).observe(canvas, { childList: true });
  update();
}
