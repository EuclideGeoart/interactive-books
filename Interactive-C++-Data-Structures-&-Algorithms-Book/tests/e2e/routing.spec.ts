import { test, expect, type Locator } from '@playwright/test';

async function collisions(lab: Locator) {
  return lab.locator('[data-svg] svg').evaluate(svg => {
    const objects = [...svg.querySelectorAll<SVGGElement>('[data-node]')].map(node => ({ id: node.dataset.node, box: node.querySelector<SVGRectElement>('rect')!.getBBox() }));
    const labels = [...svg.querySelectorAll<SVGTextElement>('text')].map(text => ({ owner: text.closest<SVGGElement>('[data-node]')?.dataset.node, text: text.textContent, box: text.getBBox() }));
    const hits: string[] = [];
    for (const link of svg.querySelectorAll<SVGGElement>('[data-from]')) {
      const path = link.querySelector<SVGPathElement>('.reference-arrow')!;
      const length = path.getTotalLength();
      const endpoints = [link.dataset.from, link.dataset.target];
      const obstacles = [...objects.filter(node => !endpoints.includes(node.id)).map(node => ({ name: `node ${node.id}`, box: node.box })), ...labels.filter(label => !label.owner || !endpoints.includes(label.owner)).map(label => ({ name: `label ${label.text}`, box: label.box }))];
      for (const obstacle of obstacles) {
        const box = obstacle.box;
        for (let at = 2; at < length - 2; at += 2) {
          const p = path.getPointAtLength(at);
          if (p.x > box.x + 1 && p.x < box.x + box.width - 1 && p.y > box.y + 1 && p.y < box.y + box.height - 1) {
            hits.push(`${link.getAttribute('aria-label')} crosses ${obstacle.name}`); break;
          }
        }
      }
    }
    return hits;
  });
}

for (const [slug, key] of [['03-doubly-linked-list', 'doubly'], ['04-memory-pool', 'pool'], ['05-intrusive-list', 'intrusive']]) {
  test(`${key}: links avoid unrelated nodes and labels in both views`, async ({ page }) => {
    await page.goto(`/chapters/${slug}/`);
    const lab = page.locator(`[data-chapter-lab="${key}"]`);
    await expect(lab).toHaveAttribute('data-step', '0');
    if (key === 'doubly') {
      await lab.locator('[name="preset"]').selectOption('custom');
      await lab.locator('[name="values"]').fill('10,20,30,40,50,60');
      await lab.locator('[data-operation-form]').evaluate((form: HTMLFormElement) => form.requestSubmit());
    }
    if (key === 'pool') {
      await lab.locator('[name="capacity"]').selectOption('6');
      await lab.locator('[data-operation="reorder"]').click();
    }
    if (key === 'intrusive') await lab.locator('[data-operation="multiple-hooks"]').click();
    for (const view of ['logical', 'memory']) {
      await lab.locator(`[data-view="${view}"]`).click();
      const max = Number(await lab.locator('[data-scrubber]').getAttribute('max'));
      // Check every small semantic state, including half-rewired links and insertion publication.
      for (let i = 0; i <= max; i++) {
        await lab.locator('[data-scrubber]').evaluate((input: HTMLInputElement, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }, i);
        expect(await collisions(lab), `${key} ${view} step ${i}`).toEqual([]);
      }
      const pointer = lab.locator('[data-from]').first();
      if (await pointer.count()) {
        const label = await pointer.getAttribute('aria-label');
        await pointer.focus(); await pointer.press('Enter');
        await expect(lab.getByRole('button', { name: label!, exact: true })).toBeFocused();
      }
    }
  });
}
