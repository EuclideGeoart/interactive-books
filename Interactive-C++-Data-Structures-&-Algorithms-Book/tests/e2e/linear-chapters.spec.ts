import { test, expect } from '@playwright/test';

test('stack: exact array boundary, raw values, linked lifetime and helper source', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/chapters/02-stack/');
  const lab = page.locator('#stack');
  await expect(lab.locator('[data-step-count]')).not.toHaveText('Step 0 / 0');
  await lab.locator('[data-jump="ap.increment"]').click();
  await expect(lab.locator('[data-event]')).toHaveText('SetIndex');
  await expect(lab.locator('[data-source="ap.increment"]')).toHaveClass(/executing/);
  await lab.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(lab.locator('[data-event]')).toHaveText('WriteSlot');
  await lab.getByRole('button', { name: 'Previous step', exact: true }).click();
  await expect(lab.locator('[data-event]')).toHaveText('SetIndex');
  await lab.locator('[data-operation="pop"]').click();
  await lab.locator('[data-phase="after"]').click();
  await lab.locator('[data-view="memory"]').click();
  await lab.locator('[data-node="2"]').focus(); await page.keyboard.press('Enter');
  await expect(lab.locator('[data-inspector]')).toContainText('Outside stack');
  await expect(lab.locator('[data-inspector]')).toContainText('30');
  await lab.locator('[name="implementation"]').selectOption('linked');
  await lab.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(lab.locator('[data-source="le.return"]')).toHaveClass(/executing/);
  await expect(lab.locator('[data-code-region="linked-empty"]')).toBeVisible();
  await lab.locator('[data-jump="lo.delete"]').click();
  await expect(lab.locator('[data-event]')).toHaveText('Destroy');
  await expect(lab.locator('.data-node.destroyed')).toHaveCount(1);
  await lab.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(lab.locator('.data-node.freed')).toHaveCount(1);
  await lab.getByRole('button', { name: 'Reset operation', exact: true }).click();
  await expect(lab.locator('.data-node.live')).toHaveCount(3);
  await page.locator('[data-work]').selectOption('clear');
  await expect(page.locator('[data-comparison]')).toContainText('O(n)');
  expect(errors).toEqual([]);
});

test('doubly: separate forward/backward rewiring, exact reverse and guarded broken walks', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/chapters/03-doubly-linked-list/');
  const lab=page.locator('#doubly');
  await expect(lab.locator('[data-node]').first().locator('.field-label')).toHaveText(['prev', 'data', 'next']);
  await expect(lab.locator('[data-svg] text').filter({ hasText: /^nullptr$/ })).toHaveCount(2);
  await lab.locator('[data-operation="delete-middle"]').click();
  await lab.locator('[data-jump="unlink.forward"]').click();
  await expect(lab.locator('[data-event]')).toHaveText('AssignPointer');
  await expect(lab.locator('[data-ascii]')).toContainText('head → [10 → 30]');
  await expect(lab.locator('[data-ascii]')).toContainText('tail → [30 → 20 → 10]');
  await expect(lab.locator('[data-invariant-summary]')).toContainText('temporary');
  const half=await lab.locator('[data-ascii]').textContent();
  await lab.getByRole('button',{name:'Next step',exact:true}).click();
  await lab.getByRole('button',{name:'Previous step',exact:true}).click();
  expect(await lab.locator('[data-ascii]').textContent()).toBe(half);
  await lab.locator('[data-jump="unlink.backward"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('tail → [30 → 10]');
  await lab.locator('[data-jump="unlink.delete"]').click();
  await expect(lab.locator('.data-node.destroyed')).toHaveCount(1);
  await lab.getByRole('button',{name:'Next step',exact:true}).click();
  await expect(lab.locator('.data-node.freed')).toHaveCount(1);
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  await lab.locator('[data-view="memory"]').click();
  await lab.locator('[data-node]').first().focus();await page.keyboard.press('Enter');
  await expect(lab.locator('[data-inspector]')).toContainText('prev');
  await expect(lab.locator('[data-inspector]')).toContainText('next');
  const broken=page.locator('[data-doubly-break]');
  await broken.locator('[data-break]').click();
  await expect(broken.locator('[data-broken-note]')).toContainText('Forward traversal: [10, 30] terminates');
  await expect(broken.locator('[data-broken-note]')).toContainText('ended or invalid object');
  for(const fault of ['head-prev','tail-next','lost-tail','single']){
    await broken.locator('[data-fault]').selectOption(fault);await broken.locator('[data-break]').click();
    await expect(broken.locator('.invariant-fail').first()).toBeVisible();
  }
  await broken.locator('[data-restore]').click();await expect(broken.locator('.invariant-fail')).toHaveCount(0);
  await page.locator('[data-doubly-complexity] [data-location]').selectOption('tail');
  await page.locator('[data-doubly-complexity] [data-direction]').selectOption('backward');
  await expect(page.locator('[data-work-output]')).toContainText('1 node visits');
  expect(errors).toEqual([]);
});

test('doubly: routing avoids unrelated node frames and labels in both views',async({page})=>{
  await page.goto('/chapters/03-doubly-linked-list/');const lab=page.locator('#doubly');
  await lab.locator('[name="preset"]').selectOption('custom');await lab.locator('[name="values"]').fill('1,2,3,4,5,6');
  await lab.getByRole('button',{name:'Load operation'}).click();await lab.locator('[data-phase="after"]').click();
  for(const view of ['logical','memory']){
    await lab.locator(`[data-view="${view}"]`).click();
    const collisions=await lab.locator('[data-svg]').evaluate(root=>{
      const hits:string[]=[];
      const nodes=[...root.querySelectorAll<SVGGElement>('[data-node]')];
      for(const link of root.querySelectorAll<SVGGElement>('[data-from]')){
        const path=link.querySelector<SVGPathElement>('.reference-arrow')!;
        for(const node of nodes){
          if([link.dataset.from,link.dataset.target].includes(node.dataset.node))continue;
          for(const shape of node.querySelectorAll<SVGGraphicsElement>('rect,text')){
            const box=shape.getBBox();
            for(let d=0;d<path.getTotalLength();d+=3){const p=path.getPointAtLength(d);if(p.x>box.x+1&&p.x<box.x+box.width-1&&p.y>box.y+1&&p.y<box.y+box.height-1){hits.push(`${link.dataset.from}.${link.dataset.field} crosses ${node.dataset.node}`);break;}}
          }
        }
      }
      return hits;
    });expect(collisions).toEqual([]);
  }
});

test('linear edge controls: array overflow, empty underflow, single endpoints and both traversals',async({page})=>{
  await page.goto('/chapters/02-stack/');const stack=page.locator('#stack');
  await stack.locator('[name="preset"]').selectOption('full');await stack.locator('[data-phase="after"]').click();
  await expect(stack.locator('[data-step-explanation]')).toContainText('Overflow');
  expect(await stack.locator('[data-before]').textContent()).toBe(await stack.locator('[data-after]').textContent());
  await stack.locator('[name="preset"]').selectOption('empty');await stack.locator('[data-operation="top"]').click();await stack.locator('[data-phase="after"]').click();
  await expect(stack.locator('[data-step-explanation]')).toContainText('Underflow');
  await page.goto('/chapters/03-doubly-linked-list/');const list=page.locator('#doubly');
  for(const preset of ['empty','single','duplicates']){
    await list.locator('[name="preset"]').selectOption(preset);
    for(const operation of ['push-front','push-back','delete-head','delete-tail','delete-middle','forward','backward','clear']){
      await list.locator(`[data-operation="${operation}"]`).click();await list.locator('[data-phase="after"]').click();
      await expect(list.locator('[data-invariant-summary]')).toContainText('All invariants valid');
      if(preset==='single'&&['delete-head','delete-tail','clear'].includes(operation))await expect(list.locator('[data-ascii]')).toContainText('head → [] → nullptr; tail → [] → nullptr');
      if(preset==='duplicates'&&operation==='forward')await expect(list.locator('[data-step-explanation]')).toHaveText('[10, 20, 20, 30]');
      if(preset==='duplicates'&&operation==='backward')await expect(list.locator('[data-step-explanation]')).toHaveText('[30, 20, 20, 10]');
    }
  }
});
