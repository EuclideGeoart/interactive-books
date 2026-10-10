import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chapters as registeredChapters } from '../../src/content/book';

const chapters = [
  ['37-linear-search','linear-search','linear.compare'],
  ['38-binary-search','binary-search','binary.mid'],
  ['39-sorting-fundamentals','sorting-fundamentals','explore.inversion'],
  ['40-elementary-sorts','elementary-sorts','bubble.swap'],
  ['41-merge-sort','merge-sort','merge.copy'],
  ['42-quick-sort','quick-sort','quick.place'],
  ['43-heap-sort','heap-sort','heap.shrink'],
  ['44-counting-radix-sort','counting-radix-sort','counting.output'],
] as const;

async function load(lab:Locator,values:string,target?:string) {
  await lab.locator('[name="values"]').fill(values);
  if(await lab.locator('[name="preset"]').count()) await lab.locator('[name="preset"]').selectOption('custom');
  if(target!==undefined) await lab.locator('[name="target"]').fill(target);
  await lab.locator('[data-operation-form] button[type="submit"]').click();
  await expect(lab.locator('[data-input-error]')).toBeHidden();
}
for(const [slug,key,tag] of chapters) {
  test(`${slug}: mutation inspection, source scrolling and operation counts`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`/chapters/${slug}/`);
    const lab=page.locator(`[data-chapter-lab="${key}"]`).first();
    await expect(lab).toHaveAttribute('data-step','0');
    await expect(page.locator('[data-section]')).toHaveCount(13);
    const first=lab.locator('[data-sort-row="array"],[data-sort-row="input"]').first();
    await first.focus();await first.press('End');
    const last=lab.locator('[data-sort-row="array"],[data-sort-row="input"]').last();
    await expect(last).toBeFocused();await last.press('Enter');await expect(last).toBeFocused();
    await expect(lab.locator('[data-inspector]')).toContainText('original index');
    await last.press('Home');await expect(first).toBeFocused();
    await lab.locator(`[data-jump="${tag}"]`).click();
    await expect(lab.locator(`[data-source="${tag}"]`)).toHaveClass(/executing/);
    const pane=lab.locator('[data-operation-code]'), line=lab.locator(`[data-source="${tag}"]`);
    const box=await pane.boundingBox(), active=await line.boundingBox();
    expect(active!.y).toBeGreaterThanOrEqual(box!.y-1);
    expect(active!.y+active!.height).toBeLessThanOrEqual(box!.y+box!.height+1);
    const state=await lab.locator('[data-ascii]').textContent();
    await lab.locator('[data-action="previous"]').click();await lab.locator('[data-action="next"]').click();
    await expect(lab.locator('[data-ascii]')).toHaveText(state!);
    await lab.locator('[data-view="memory"]').click();
    await expect(lab.locator('[data-svg] .sorting-facts')).toHaveCount(0);
    await expect(lab.locator('.sorting-facts')).toBeVisible();
    expect(await lab.locator('[data-svg]').evaluate(canvas=>{
      const viewport=canvas.getBoundingClientRect();
      return [...canvas.querySelectorAll('[data-sort-label]')].every(label=>{
        const box=label.getBoundingClientRect();return box.left>=viewport.left&&box.right<=viewport.right;
      });
    })).toBe(true);
    await lab.locator('[data-phase="after"]').click();await expect(lab.locator('.invariant-fail')).toHaveCount(0);
    const explorer=page.locator('[data-sorting-complexity]');
    await explorer.locator('[name="size"]').fill('0');
    await explorer.getByRole('button',{name:'Measure operations'}).click();
    await expect(explorer.locator('output')).toContainText('n = 0');
    await explorer.locator('[name="size"]').fill('12');
    await explorer.getByRole('button',{name:'Measure operations'}).click();
    await expect(explorer.locator('output')).toContainText('n = 12');
    for(const theme of ['light','dark']) {
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect((await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test('linear first-match counts and binary monotonic bounds/fault guards',async({page})=>{
  await page.goto('/chapters/37-linear-search/');let lab=page.locator('[data-chapter-lab]').first();
  await load(lab,'2,1,2','2');await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('Result: 0');
  await expect(lab.locator('[data-counters]')).toContainText('comparisons 1');
  await load(lab,'','40');await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('not found');
  await expect(lab.locator('[data-counters]')).toContainText('comparisons 0');
  await page.goto('/chapters/38-binary-search/');lab=page.locator('[data-chapter-lab]').first();
  await load(lab,'1,2,2,2,3','2');await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('any match');await expect(lab.locator('.invariant-fail')).toHaveCount(0);
  await load(lab,'3,1,2','2');await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('unsorted-domain');
  await load(lab,'1','2');await lab.locator('[name="mode"]').selectOption('nonprogress');
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('[data-ascii]')).toContainText('nonprogress');
  await lab.locator('[name="mode"]').selectOption('normal');await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('.invariant-fail')).toHaveCount(0);
});
test('elementary stability and held-record shifts remain inspectable',async({page})=>{
  await page.goto('/chapters/40-elementary-sorts/');const lab=page.locator('[data-chapter-lab]').first();
  await load(lab,'2,2,1');await lab.locator('[data-operation="selection"]').click();await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('[1C, 2B, 2A]');
  await lab.locator('[data-operation="bubble"]').click();await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('[1C, 2A, 2B]');
  await lab.locator('[data-operation="insertion"]').click();await load(lab,'1,3,5,2');
  await lab.locator('[data-jump="insertion.shift"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('Held local record');
  await expect(lab.locator('[data-counters]')).toContainText('shifts 1');
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('.invariant-fail')).toHaveCount(0);
});
test('merge buffer, Lomuto faults and heap active suffix follow actual mutation phases',async({page})=>{
  await page.goto('/chapters/41-merge-sort/');let lab=page.locator('[data-chapter-lab]').first();
  await lab.locator('[data-jump="merge.output"]').click();
  await expect(lab.locator('[data-sort-storage="buffer"]')).toBeVisible();
  await expect(lab.locator('[data-counters]')).toContainText('Buffer writes 1');
  await page.goto('/chapters/42-quick-sort/');lab=page.locator('[data-chapter-lab]').first();
  for(const fault of ['bounds','pivot','no-progress']) {
    await lab.locator('[name="fault"]').selectOption(fault);await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator('.invariant-fail')).not.toHaveCount(0);
  }
  await lab.locator('[name="fault"]').selectOption('none');await load(lab,'2,2,2,2');
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('.invariant-fail')).toHaveCount(0);
  await page.goto('/chapters/43-heap-sort/');lab=page.locator('[data-chapter-lab]').first();
  await lab.locator('[data-jump="heap.shrink"]').click();
  await expect(lab.locator('[data-sort-row="heap"]')).toHaveCount(5);
  await expect(lab.locator('[data-sort-row="array"],[data-sort-row="input"]')).toHaveCount(6);
  await expect(lab.locator('[data-sort-row="array"].sort-final,[data-sort-row="input"].sort-final')).toHaveCount(1);
});
test('counting domains and stable LSD digit passes expose the failure of unstable placement',async({page})=>{
  await page.goto('/chapters/44-counting-radix-sort/');const lab=page.locator('[data-chapter-lab]').first();
  await load(lab,'3,1,2,3,0');await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('[0E, 1B, 2C, 3A, 3D]');
  const valid=await lab.locator('[data-ascii]').textContent();
  await lab.locator('[name="values"]').fill('-1,2');await lab.locator('[data-operation-form] button[type="submit"]').click();
  await expect(lab.locator('[data-input-error]')).toBeVisible();await expect(lab.locator('[data-ascii]')).toHaveText(valid!);
  await lab.locator('[name="values"]').fill('170,45,75,90,802,24,2,66');await lab.locator('[data-operation="radix"]').click();
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('.invariant-fail')).toHaveCount(0);
  await expect(lab.locator('[data-counters]')).toContainText('Passes 3');
  await load(lab,'11,12');await lab.locator('[name="unstable"]').selectOption('yes');
  await lab.locator('[data-phase="after"]').click();await expect(lab.locator('.invariant-fail')).not.toHaveCount(0);
});
test('Part VI navigation, search, progress and stopping boundary are integrated',async({page,request})=>{
  await page.goto('/chapters/36-union-find/');
  await page.getByRole('navigation',{name:'Adjacent chapters'}).locator('a[href*="37-linear-search"]').click();
  await page.locator('[data-complete]').click();
  await page.locator('[data-search-open]').click();await page.getByRole('searchbox').fill('Lomuto');
  await page.locator('[data-search-results] a[href*="42-quick-sort"]').first().click();await expect(page).toHaveURL(/42-quick-sort/);
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed','false');
  await page.goto('/chapters/37-linear-search/');await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed','true');
  await page.goto('/chapters/44-counting-radix-sort/');
  const hasConcurrentPartVII=registeredChapters.some(c=>c.number==='45');
  await expect(page.getByRole('navigation',{name:'Adjacent chapters'}).locator('a')).toHaveCount(hasConcurrentPartVII?2:1);
  if(!hasConcurrentPartVII) expect((await request.get('/chapters/45-recursion/')).status()).toBe(404);
  expect((await request.get('/chapters/00-cpp-foundations/')).ok()).toBe(true);
});
