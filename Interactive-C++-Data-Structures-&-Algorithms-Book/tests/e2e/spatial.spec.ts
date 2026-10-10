import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.setTimeout(60000);
// Hide fixed chrome only while capturing, so it cannot cover the geometry under review.
const captureStyle='.topbar,.skip-link,.playback-controls{visibility:hidden!important}';

const chapters=[
  ['60-spatial-hashing','spatial-hash','SpatialHash'],['61-quadtrees','quadtree','Quadtree'],['62-octrees','octree','Octree'],['63-kd-trees','kd-tree','KDTree'],
  ['64-r-trees','r-tree','RTree'],['65-bounding-volume-hierarchies','bvh','BVH'],['66-broad-phase-spatial-indexing','broad-phase','BroadPhase'],
] as const;
for(const [slug,kind,header]of chapters)test(`${slug}: operations, reversal, both views, fit, keyboard/touch and themes`,async({page,request},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/chapters/${slug}/`);
  const lab=page.locator(`[data-chapter-lab="spatial-${kind}"]`);
  await expect(lab).toHaveAttribute('data-step','0');
  if(kind==='broad-phase')await lab.locator('[name="scene"]').selectOption('clustered');
  await expect(page.locator('main .chapter-section')).toHaveCount(13);
  await expect(lab.locator('.invariant-fail')).toHaveCount(0);
  const operations=await lab.locator('[data-operation]').evaluateAll(els=>els.map(el=>el.getAttribute('data-operation')!));
  for(const operation of operations){
    await lab.locator(`[data-operation="${operation}"]`).click();
    await expect(lab.locator('[data-input-error]')).toBeHidden();
    const before=await lab.locator('[data-ascii]').textContent();
    await lab.locator('[data-action="next"]').click();
    await expect(lab.locator('[data-code-region]:not([hidden]) .executing')).toHaveCount(1);
    await lab.locator('[data-action="previous"]').click();
    await expect(lab.locator('[data-ascii]')).toHaveText(before!);
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator('.invariant-fail')).toHaveCount(0);
    const after=await lab.locator('[data-ascii]').textContent();
    await lab.locator('[data-action="previous"]').click();await lab.locator('[data-action="next"]').click();
    await expect(lab.locator('[data-ascii]')).toHaveText(after!);
  }
  const query=operations.find(op=>kind==='kd-tree'?op==='nearest':/range|query|filter/.test(op))??operations[0]!;
  await lab.locator(`[data-operation="${query}"]`).click();
  const scrub=lab.locator('[data-scrubber]');
  await scrub.fill(String(Math.max(1,Math.floor(Number(await scrub.getAttribute('max'))*.75))));
  for(const view of ['logical','memory']){
    await lab.locator(`[data-view="${view}"]`).click();
    const selected=lab.locator('[data-svg] [data-node],[data-svg] [data-inspect]').first();
    await selected.focus();await selected.press('Enter');
    await expect(selected).toHaveAttribute('aria-pressed','true');await expect(selected).toBeFocused();
    await expect(lab.locator('[data-inspector]')).not.toContainText('Inspect a spatial object');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const capture=await page.addStyleTag({content:captureStyle});
    try{await expect(lab).toHaveScreenshot(`${slug}-${view}.png`,{animations:'disabled'});}
    finally{await capture.evaluate(node=>{node.parentNode?.removeChild(node);});}
  }
  await lab.locator('[data-view="logical"]').click();
  const canvas=lab.locator('[data-svg]');await expect(canvas).toHaveAttribute('data-diagram-scale','fit');
  expect(await canvas.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  const state=await lab.locator('[data-ascii]').textContent();
  await lab.locator('[data-diagram-size="actual"]').click();await expect(canvas).toHaveAttribute('data-diagram-scale','actual');
  await expect(lab.locator('[data-ascii]')).toHaveText(state!);
  if(info.project.name==='mobile')await lab.locator('[data-diagram-size="fit"]').tap();else await lab.locator('[data-diagram-size="fit"]').click();
  for(const theme of ['light','dark']){
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
    expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
    await lab.screenshot({path:info.outputPath(`${slug}-${theme}-review.png`),style:captureStyle});
  }
  const source=await request.get(`/source/chapter-${slug.slice(0,2)}/${header}.hpp`);
  expect(source.ok()).toBe(true);expect(await source.text()).not.toMatch(/@(?:trace|begin|end)/);
  expect((await request.get(`/source/chapter-${slug.slice(0,2)}/main.cpp`)).ok()).toBe(true);
  expect(errors).toEqual([]);
});
test('spatial controls reject invalid geometry without replacing a trace; point and 3D inputs work',async({page})=>{
  await page.goto('/chapters/62-octrees/');const lab=page.locator('[data-chapter-lab]');
  await lab.locator('[data-operation="point"]').click();await expect(lab.locator('[name="queryPoint"]')).toBeVisible();
  await lab.locator('[name="queryPoint"]').fill('1,1,4');await lab.locator('button[type="submit"]').click();await expect(lab.locator('[data-input-error]')).toBeHidden();
  const before=await lab.locator('[data-ascii]').textContent();await lab.locator('[name="queryPoint"]').fill('1,1,NaN');await lab.locator('button[type="submit"]').click();
  await expect(lab.locator('[data-input-error]')).toBeVisible();await expect(lab.locator('[data-ascii]')).toHaveText(before!);
  await page.goto('/chapters/66-broad-phase-spatial-indexing/');const broad=page.locator('[data-chapter-lab]');
  await broad.locator('[name="dimension"]').selectOption('3');await broad.locator('[data-operation="filter"]').click();await broad.locator('[data-phase="after"]').click();
  await expect(broad.locator('.spatial-projection')).toHaveCount(2);await expect(broad.locator('.invariant-fail')).toHaveCount(0);
  const explorer=page.locator('[data-spatial-explorer]');await explorer.locator('[name="motion"]').selectOption('moving');await expect(explorer.locator('[data-workload-comparison]')).toContainText('Refit');
  await explorer.locator('[name="scene"]').selectOption('clustered');await expect(explorer.locator('[data-explorer-error]')).toBeHidden();
});
test('Part IX navigation and search end at Chapter 66 and preserve playback controls',async({page})=>{
  await page.goto('/chapters/60-spatial-hashing/');const lab=page.locator('[data-chapter-lab]');
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await lab.locator('[data-speed]').selectOption('4');await lab.locator('[data-action="play"]').click();await page.clock.runFor(275);await expect(lab).toHaveAttribute('data-step','1');await lab.locator('[data-action="play"]').click();await page.clock.runFor(550);await expect(lab).toHaveAttribute('data-step','1');await page.clock.resume();
  await page.locator('[data-search-open]').click();await page.getByRole('searchbox').fill('broad-phase');await page.locator('[data-search-results] a[href*="66-broad-phase"]').first().click();
  const adjacent=page.getByRole('navigation',{name:'Adjacent chapters'}).locator('a');await expect(adjacent).toHaveCount(1);await expect(adjacent).toHaveAttribute('href','/chapters/65-bounding-volume-hierarchies/');
});

test('spatial mutation and pruning boundaries remain inspectable in both representations',async({page},info)=>{
  const cases=[['60-spatial-hashing','range','hash.key'],['61-quadtrees','insert','quad.split'],['62-octrees','insert','oct.split'],['63-kd-trees','nearest','kd.plane'],['64-r-trees','insert','rt.split'],['65-bounding-volume-hierarchies','refit','bvh.move'],['66-broad-phase-spatial-indexing','filter','broad.pair']];
  for(const [slug,operation,tag]of cases){
    await page.goto(`/chapters/${slug}/`);const lab=page.locator('[data-chapter-lab]');
    if(tag==='broad.pair')await lab.locator('[name="scene"]').selectOption('clustered');
    await lab.locator(`[data-operation="${operation}"]`).click();
    await lab.locator(`[data-jump="${tag}"]`).click();
    await expect(lab.locator(`[data-source="${tag}"]`)).toHaveClass(/executing/);
    await expect(lab.locator('.invariant-fail')).toHaveCount(0);
    const state=await lab.locator('[data-ascii]').textContent();
    for(const view of ['logical','memory']){
      await lab.locator(`[data-view="${view}"]`).click();
      await expect(lab.locator('[data-ascii]')).toHaveText(state!);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await lab.locator('[data-diagram]').screenshot({path:info.outputPath(`${slug}-${tag}-${view}.png`),style:captureStyle});
    }
  }
});

test('clustered and 3D scenes retain bounded layouts and inspectable coordinates',async({page},info)=>{
  for(const [slug,kind]of chapters){
    await page.goto(`/chapters/${slug}/`);
    const lab=page.locator('[data-chapter-lab]');
    await lab.locator('[name="scene"]').selectOption('clustered');
    if(kind==='broad-phase')await lab.locator('[name="dimension"]').selectOption('3');
    const operation=kind==='kd-tree'?'nearest':kind==='broad-phase'?'filter':['r-tree','bvh'].includes(kind)?'query':'range';
    await lab.locator(`[data-operation="${operation}"]`).click();
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator('[data-input-error]')).toBeHidden();
    await expect(lab.locator('.invariant-fail')).toHaveCount(0);
    const object=lab.locator('[data-svg] .spatial-object').first();
    await object.focus();await object.press('Space');
    await expect(object).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await lab.locator('[data-diagram]').screenshot({path:info.outputPath(`${slug}-clustered.png`),style:captureStyle});
  }
});
