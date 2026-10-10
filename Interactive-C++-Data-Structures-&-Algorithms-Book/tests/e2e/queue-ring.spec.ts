import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('queue: shifting, reverse, source, bounds and policy comparison',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/chapters/06-queue-deque/');const lab=page.locator('#queue');
  await expect(lab.locator('[data-step-count]')).not.toHaveText('Step 0 / 0');
  await lab.locator('[data-operation="pop-front"]').click();
  await lab.locator('[data-jump="qo.shift"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('[20 → 20 → 30]');
  await expect(lab.locator('[data-source="qo.shift"]')).toHaveClass(/executing/);
  const intermediate=await lab.locator('[data-ascii]').textContent();
  await lab.getByRole('button',{name:'Next step',exact:true}).click();await lab.getByRole('button',{name:'Previous step',exact:true}).click();
  expect(await lab.locator('[data-ascii]').textContent()).toBe(intermediate);
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('[20 → 30]');
  await lab.locator('[data-view="memory"]').click();await lab.locator('[data-node="2"]').focus();await page.keyboard.press('Enter');
  await expect(lab.locator('[data-inspector]')).toContainText('Outside deque');await expect(lab.locator('[data-inspector]')).toContainText('30');
  await lab.getByRole('button',{name:'Reset operation',exact:true}).click();await expect(lab.locator('[data-ascii]')).toContainText('[10 → 20 → 30]');
  for(const op of ['push-back','push-front']){await lab.locator('[name="preset"]').selectOption('full');await lab.locator(`[data-operation="${op}"]`).click();await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-step-explanation]')).toContainText('Overflow');expect(await lab.locator('[data-before]').textContent()).toBe(await lab.locator('[data-after]').textContent());}
  for(const op of ['pop-front','pop-back','front','back']){await lab.locator('[name="preset"]').selectOption('empty');await lab.locator(`[data-operation="${op}"]`).click();await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-step-explanation]')).toContainText('Underflow');}
  await lab.locator('[name="preset"]').selectOption('single');await lab.locator('[data-operation="pop-back"]').click();await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('size = 0');
  await lab.locator('[name="preset"]').selectOption('custom');await lab.locator('[name="values"]').fill('1,,2');await lab.getByRole('button',{name:'Load operation'}).click();await expect(lab.locator('[data-input-error]')).toBeVisible();
  const compare=page.locator('[data-queue-comparison]');await compare.locator('[data-attempt]').selectOption('pop-back');await expect(compare.locator('[data-comparison]')).toContainText('Not exposed by Queue');await compare.locator('[data-policy]').selectOption('deque');await expect(compare.locator('[data-comparison]')).toContainText('Allowed: pop-back');
  for(const fault of ['wrong-end','wrong-shift','miss-count','empty-read']){const panel=page.locator('[data-queue-break]');await panel.locator('[data-fault]').selectOption(fault);await panel.locator('[data-break]').click();await expect(panel.locator('[data-fault-result]')).toContainText('✕');await panel.locator('[data-restore]').click();await expect(panel.locator('[data-fault-result]')).toContainText('✓');}
  expect(errors).toEqual([]);
});

test('ring: physical/logical identity, exact wrap, pending invariant and full policy',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/chapters/07-circular-buffer/');const lab=page.locator('#ring');
  await lab.getByRole('button',{name:'Physical storage view',exact:true}).click();
  await lab.locator('[data-jump="rp.wrap"]').click();await expect(lab.locator('[data-source="rp.wrap"]')).toHaveClass(/executing/);await expect(lab.locator('[data-svg]')).toContainText('tail: 4 → 0');await expect(lab.locator('[data-invariant-summary]')).toContainText('temporary');
  const wrapped=await lab.locator('[data-ascii]').textContent();await lab.getByRole('button',{name:'Previous step',exact:true}).click();await expect(lab.locator('[data-ascii]')).toContainText('tail = 4');await lab.getByRole('button',{name:'Next step',exact:true}).click();expect(await lab.locator('[data-ascii]').textContent()).toBe(wrapped);
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  await lab.locator('[name="preset"]').selectOption('wrapped');await lab.locator('[data-node="0"]').focus();await page.keyboard.press('Enter');await expect(lab.locator('[data-inspector]')).toContainText('40');
  await lab.getByRole('button',{name:'Logical queue view',exact:true}).click();await expect(lab.locator('[data-node="0"]')).toHaveAttribute('aria-pressed','true');await expect(lab.locator('[data-ascii]')).toContainText('Logical: [20 → 30 → 40 → 50]');
  await lab.locator('[name="preset"]').selectOption('full');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-step-explanation]')).toContainText('rejected');expect(await lab.locator('[data-before]').textContent()).toBe(await lab.locator('[data-after]').textContent());
  await lab.locator('[name="value"]').fill('60');await lab.locator('[name="policy"]').selectOption('overwrite');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('[20 → 30 → 40 → 50 → 60]');await expect(lab.locator('[data-ascii]')).toContainText('head = 0; tail = 0; count = 5');
  await lab.locator('[name="preset"]').selectOption('single');await lab.locator('[data-operation="pop"]').click();await lab.locator('[data-jump="ro.wrap"]').click();await expect(lab.locator('[data-step-explanation]')).toContainText('wrap from the last slot to zero');await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('count = 0');
  await lab.locator('[name="preset"]').selectOption('empty');for(const op of ['pop','front','back']){await lab.locator(`[data-operation="${op}"]`).click();await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-step-explanation]')).toContainText('Underflow');}
  const encoding=page.locator('[data-ring-encoding]');await encoding.locator('[data-encoding]').selectOption('sentinel');await expect(encoding.locator('[data-encoding-result]')).toContainText('5 physical slots → 4 usable positions');
  for(const fault of ['no-modulo','wrong-index','full-empty','overwrite-unread','empty-read']){const panel=page.locator('[data-ring-break]');await panel.locator('[data-fault]').selectOption(fault);await panel.locator('[data-break]').click();await expect(panel.locator('[data-fault-result]')).toContainText('✕');await panel.locator('[data-restore]').click();}
  expect(errors).toEqual([]);
});

for(const chapter of ['06-queue-deque','07-circular-buffer'])test(`${chapter}: theme accessibility, bounded SVG labels and page width`,async({page})=>{
  await page.goto(`/chapters/${chapter}/`);
  const lab=page.locator(chapter.startsWith('06')?'#queue':'#ring');
  for(const theme of ['light','dark']){
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
    await lab.locator('[name="preset"]').selectOption('full');await lab.locator('[data-view="memory"]').click();
    const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
    expect(violations).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    const clipped=await lab.locator('[data-svg] svg').evaluate(svg=>{const v=(svg as SVGSVGElement).viewBox.baseVal;return [...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x < 0 || b.y < 0 || b.x+b.width > v.width+1 || b.y+b.height > v.height+1;}).map(t=>t.textContent);});expect(clipped).toEqual([]);
  }
});

test('ring: all preset index labels remain within the SVG in both views',async({page})=>{
  await page.goto('/chapters/07-circular-buffer/');const lab=page.locator('#ring');
  for(const preset of ['wrap','wrapped','single','empty','full']){
    await lab.locator('[name="preset"]').selectOption(preset);
    for(const view of ['logical','memory']){
      await lab.locator(`[data-view="${view}"]`).click();
      for(const phase of ['before','after']){
        await lab.locator(`[data-phase="${phase}"]`).click();
        const clipped=await lab.locator('[data-svg] svg').evaluate(svg=>{const v=(svg as SVGSVGElement).viewBox.baseVal;return [...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.y<0||b.x+b.width>v.width+1||b.y+b.height>v.height+1;}).map(t=>t.textContent);});expect(clipped).toEqual([]);
      }
    }
  }
});
