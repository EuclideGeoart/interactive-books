import { expect, test } from '@playwright/test';

test('pool exposes each storage/lifetime boundary and safely rejects foreign storage', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/chapters/04-memory-pool/');
  const lab = page.locator('#pool-lab');
  await lab.locator('[data-operation="cycle"]').click();
  await lab.locator('[data-jump="allocate.head"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('slot 0: free');
  await lab.locator('[data-node="0x1000"]').click();
  await expect(lab.locator('[data-inspector]')).toContainText('T lifetime');
  await expect(lab.locator('[data-inspector]')).toContainText('not alive');
  await lab.locator('[data-jump="construct.object"]').click();
  await expect(lab.locator('[data-inspector]')).toContainText('alive');
  await expect(lab.locator('[data-inspector]')).toContainText('inactive union member');
  await lab.locator('[data-jump="destroy.object"]').click();
  await expect(lab.locator('[data-inspector]')).toContainText('unavailable — no live object');
  const destroyed = await lab.locator('[data-svg]').innerHTML();
  await lab.locator('[data-action="previous"]').click();
  await lab.locator('[data-action="next"]').click();
  expect(await lab.locator('[data-svg]').innerHTML()).toBe(destroyed);
  await lab.locator('[data-operation="foreign"]').click();
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('Address does not belong');
  await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  expect(errors).toEqual([]);
});

test('pool exposes nonphysical free-list order, memory grid and keyboard inspection', async ({ page }, info) => {
  await page.goto('/chapters/04-memory-pool/'); const lab = page.locator('#pool-lab');
  await lab.locator('[data-operation="reorder"]').click();
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('freeList → 0x1080 → 0x1000 → 0x1100');
  const link = lab.locator('[data-from="0x1080"][data-target="0x1000"]');
  await link.focus(); await page.keyboard.press('Enter');
  await expect(lab.locator('[data-inspector]')).toContainText('Slot 0');
  const logical = await lab.locator('[data-node="0x1080"] rect').getAttribute('x');
  await lab.locator('[data-view="memory"]').click();
  expect(await lab.locator('[data-node="0x1080"] rect').getAttribute('x')).not.toBe(logical);
  await lab.locator('[data-svg]').screenshot({ path: `/tmp/ownership-pool-${info.project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('intrusive middle unlink preserves the object and repairs reciprocal links separately', async ({ page }, info) => {
  await page.goto('/chapters/05-intrusive-list/'); const lab = page.locator('#intrusive-lab');
  await lab.locator('[data-operation="remove-middle"]').click();
  await lab.locator('[data-jump="erase.forward"]').click();
  await expect(lab.locator('[data-invariant-summary]')).toContainText('temporary');
  await lab.locator('[data-node="0xD800"]').click();
  await expect(lab.locator('[data-inspector]')).toContainText('Node 20');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('active: head → A ⇄ C');
  await expect(lab.locator('[data-inspector]')).toContainText('External owner keeps object B alive');
  await expect(lab.locator('[data-inspector]')).toContainText('nullptr · detached');
  await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  await lab.locator('[data-svg]').screenshot({ path: `/tmp/ownership-intrusive-${info.project.name}.png` });
  await lab.locator('[data-action="reset"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('A ⇄ B ⇄ C');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('independent hooks preserve the other lists and singleton guards reject duplicate membership', async ({ page }) => {
  await page.goto('/chapters/05-intrusive-list/'); const lab = page.locator('#intrusive-lab');
  await lab.locator('[data-operation="multiple-hooks"]').click();
  await lab.locator('select[name="hook"]').selectOption('render');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('active: head → A ⇄ B ⇄ C');
  await expect(lab.locator('[data-ascii]')).toContainText('render: head → D');
  await expect(lab.locator('[data-ascii]')).toContainText('dirty: head → A ⇄ D');
  await lab.locator('select[name="preset"]').selectOption('single');
  await lab.locator('[data-operation="double-insert"]').click();
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('This hook already belongs');
  await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
});

test('ownership diagrams route links around unrelated objects and labels in both views', async ({ page }) => {
  for (const chapter of ['04-memory-pool', '05-intrusive-list']) {
    await page.goto(`/chapters/${chapter}/`);
    const lab = page.locator('[data-chapter-lab]');
    await lab.locator(`[data-operation="${chapter.startsWith('04') ? 'reorder' : 'multiple-hooks'}"]`).click();
    await lab.locator('[data-phase="after"]').click();
    for (const view of ['logical', 'memory']) {
      await lab.locator(`[data-view="${view}"]`).click();
      const collisions = await lab.locator('svg.memory-diagram').evaluate(svg => {
        const issues: string[] = [];
        const nodes = [...svg.querySelectorAll<SVGGElement>('[data-node]')];
        for (const link of svg.querySelectorAll<SVGGElement>('[data-from]')) {
          const path = link.querySelector<SVGPathElement>('.reference-arrow')!;
          const excluded = [link.dataset.from, link.dataset.target];
          const obstacles = nodes.filter(n => !excluded.includes(n.dataset.node)).flatMap(n => [...n.querySelectorAll<SVGGraphicsElement>('rect,text')]);
          // Include independent captions too; links must not cut through prose labels.
          obstacles.push(...[...svg.querySelectorAll<SVGTextElement>(':scope > text')]);
          for (let distance = 2; distance < path.getTotalLength() - 2; distance += 3) {
            const p = path.getPointAtLength(distance);
            if (obstacles.some(o => { const b = o.getBBox(); return p.x > b.x + 1 && p.x < b.x + b.width - 1 && p.y > b.y + 1 && p.y < b.y + b.height - 1; })) { issues.push(`${link.dataset.from}.${link.dataset.field} → ${link.dataset.target}`); break; }
          }
        }
        return issues;
      });
      expect(collisions).toEqual([]);
    }
  }
});

test('saved pool block and intrusive traversal current respect function scope', async ({ page }) => {
  await page.goto('/chapters/04-memory-pool/');
  const pool = page.locator('#pool-lab');
  await pool.locator('[data-jump="allocate.block"]').click();
  await expect(pool.locator('[data-reference="block"]')).toContainText('0x1000');
  await pool.locator('[data-reference="block"]').click();
  await expect(pool.locator('[data-local-reference="block"]')).toContainText('0x1000');
  await pool.locator('[data-jump="allocate.head"]').click();
  await expect(pool.locator('[data-svg] .head-empty')).toContainText('freeList → 0x1080');
  await expect(pool.locator('[data-reference="block"]')).toContainText('local block → 0x1000');
  await expect(pool.locator('[data-reference="block"]')).toHaveAttribute('data-target', '0x1000');
  await expect(pool.locator('[data-local-reference="block"]')).toContainText('0x1000');
  await pool.locator('[data-jump="allocate.return"]').click();
  await expect(pool.locator('[data-reference="block"]')).toHaveCount(1);
  await pool.locator('[data-action="next"]').click();
  await expect(pool.locator('[data-reference="block"]')).toHaveCount(0);
  await expect(pool.locator('[data-local-reference="block"]')).toHaveCount(0);
  await page.goto('/chapters/05-intrusive-list/');
  const list = page.locator('#intrusive-lab');
  await list.locator('[data-operation="forward"]').click();
  await list.locator('[data-jump="walk.start"]').click();
  const cursor = list.locator('[data-inspector] .reference-entry').filter({ hasText: 'current' });
  await expect(cursor).toHaveCount(1);
  await expect(cursor).toContainText('0xA100');
  await list.locator('[data-jump="walk.return"]').click();
  await expect(cursor).toContainText('nullptr');
  await list.locator('[data-action="next"]').click();
  await expect(cursor).toHaveCount(0);
  await expect(list.locator('[data-counters]')).toContainText('Objects visited 3');
});
