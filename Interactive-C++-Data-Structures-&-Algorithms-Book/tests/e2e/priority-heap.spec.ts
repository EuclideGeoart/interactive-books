import { test, expect } from '@playwright/test';

test('priority: ADT direction, FIFO ties, guarded empty reads and exact reverse', async ({ page }) => {
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/chapters/08-priority-queue/');const lab=page.locator('#priority');
  await expect(lab.locator('[data-step-count]')).not.toHaveText('Step 0 / 0');
  await lab.locator('[data-operation="extract"]').click();
  await expect(lab.locator('[data-code-region="priority-best"]')).toBeVisible();
  await lab.locator('[data-jump="pe.save"]').click();const saved=await lab.locator('[data-ascii]').textContent();
  await lab.getByRole('button',{name:'Next step',exact:true}).click();await expect(lab.locator('[data-svg] [data-node]')).toHaveCount(3);
  await lab.getByRole('button',{name:'Previous step',exact:true}).click();expect(await lab.locator('[data-ascii]').textContent()).toBe(saved);
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('returned 30 (priority 9)');
  await lab.locator('[name="mode"]').selectOption('lower');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('returned 20 (priority 2)');
  await lab.locator('[name="preset"]').selectOption('ties');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('returned 10 (priority 5)');
  await lab.locator('[data-view="memory"]').click();await expect(lab.locator('[data-svg]')).toContainText('Actual vector order');
  await lab.locator('[name="preset"]').selectOption('empty');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('Underflow');await expect(lab.locator('[data-svg] [data-node]')).toHaveCount(0);
  await lab.getByRole('button',{name:'Reset operation',exact:true}).click();await expect(lab.locator('[data-step-count]')).toContainText('Step 0 /');
  expect(errors).toEqual([]);
});

test('heap: atomic dual-view swaps, keyboard selection stays in each view, source and reverse', async ({ page }) => {
  await page.goto('/chapters/09-binary-heap/');const lab=page.locator('#heap');
  for(const view of ['array','tree']) {
    const cell=lab.locator(`[data-node="${view}:2"]`);await cell.focus();await page.keyboard.press('Enter');await expect(cell).toBeFocused();
    await expect(lab.locator('[data-node="tree:2"]')).toHaveAttribute('aria-pressed','true');await expect(lab.locator('[data-node="array:2"]')).toHaveAttribute('aria-pressed','true');
    await expect(lab.locator('[data-inspector]')).toContainText('Index 2 · value 60');
  }
  await lab.locator('[data-jump="hu.swap"]').click();await expect(lab.locator('[data-event]')).toHaveText('Swap');
  for(const view of ['array','tree']) {await expect(lab.locator(`[data-node="${view}:2"] .node-value`)).toHaveText('95');await expect(lab.locator(`[data-node="${view}:6"] .node-value`)).toHaveText('60');}
  await expect(lab.locator('[data-source="hu.swap"]')).toHaveClass(/executing/);await expect(lab.locator('[data-invariant-summary]')).toContainText('temporary');
  const swap=await lab.locator('[data-ascii]').textContent();await lab.getByRole('button',{name:'Previous step',exact:true}).click();
  await expect(lab.locator('[data-node="tree:2"] .node-value')).toHaveText('60');await expect(lab.locator('[data-node="array:2"] .node-value')).toHaveText('60');
  await lab.getByRole('button',{name:'Next step',exact:true}).click();expect(await lab.locator('[data-ascii]').textContent()).toBe(swap);
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-node="tree:0"] .node-value')).toHaveText('95');await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  await lab.getByRole('button',{name:'Reset operation',exact:true}).click();await expect(lab.locator('[data-svg] [data-node]')).toHaveCount(12);
});

test('heap: move-last boundary, singleton, min order, build and invalid custom input', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/chapters/09-binary-heap/');const lab=page.locator('#heap');
  await lab.locator('[data-operation="extract"]').click();await lab.locator('[data-jump="he.move"]').click();
  for(const view of ['tree','array']) {await expect(lab.locator(`[data-node="${view}:0"] .node-value`)).toHaveText('20');await expect(lab.locator(`[data-node="${view}:5"] .node-value`)).toHaveText('20');}
  await lab.getByRole('button',{name:'Next step',exact:true}).click();await expect(lab.locator('[data-svg] [data-node]')).toHaveCount(10);
  await lab.locator('[name="preset"]').selectOption('single');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-svg] [data-node]')).toHaveCount(0);await expect(lab.locator('[data-ascii]')).toContainText('returned 10');
  await lab.locator('[name="preset"]').selectOption('empty');await lab.locator('[data-operation="peek"]').click();await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('Underflow');
  await lab.locator('[name="mode"]').selectOption('min');await lab.locator('[name="preset"]').selectOption('standard');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('returned 10');
  await lab.locator('[data-operation="build"]').click();await lab.locator('[name="preset"]').selectOption('unordered');await lab.locator('[data-jump="hb.assign"]').click();await expect(lab.locator('[data-invariant-summary]')).toContainText('temporary');
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');await expect(lab.locator('[data-node="array:0"] .node-value')).toHaveText('10');
  await lab.locator('[name="preset"]').selectOption('custom');await lab.locator('[name="values"]').fill('1,,2');await lab.getByRole('button',{name:'Load operation'}).click();await expect(lab.locator('[data-input-error]')).toContainText('comma-separated');
  expect(errors).toEqual([]);
});

for(const chapter of ['08-priority-queue','09-binary-heap']) test(`${chapter}: complexity, controlled faults, completion and responsive bounds`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`/chapters/${chapter}/`);
  const heap=chapter.startsWith('09'), root=page.locator(heap?'[data-heap-break]':'[data-priority-break]');
  for(const fault of heap?['early','child','parent']:['fifo','ties','direction']) {await root.locator('[data-fault]').selectOption(fault);await root.locator('[data-break]').click();if(heap)await expect(root.locator('.invariant-fail')).toHaveCount(1);else await expect(root.locator('[data-verdict]')).toContainText('Policy broken');}
  await root.locator('[data-restore]').click();if(heap)await expect(root.locator('.invariant-fail')).toHaveCount(0);else await expect(root.locator('[data-verdict]')).toContainText('restored');
  const explorer=page.locator(heap?'[data-heap-explorer]':'[data-priority-explorer]');await explorer.locator('[data-size]').fill('31');
  await expect(explorer.locator('output')).toContainText(heap?'height 4':'31 entries');
  await page.locator('[data-complete]').click();await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed','true');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);expect(overflow).toBe(false);expect(errors).toEqual([]);
});
