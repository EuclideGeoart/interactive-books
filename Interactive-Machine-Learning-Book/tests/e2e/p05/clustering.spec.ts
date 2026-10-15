import { test, expect, type Page, type Locator } from '@playwright/test';
import { deriveLab, initialLab, type LabState } from '../../../src/parts/p05/lesson';
const routes = { lloyd:'k-means', failures:'clustering-initialization-failures', alternatives:'hierarchical-density-clustering' };
async function open(page: Page, mode: keyof typeof routes) {
  await page.goto('chapters/'+routes[mode]+'/');
  const root = page.locator('[data-p05]'); await expect(root).toBeVisible(); await expect(page.locator('astro-island[ssr]')).toHaveCount(0); return root;
}
const field = (root: Locator,label: string) => root.getByRole('textbox',{name:new RegExp('^'+label)});
async function commit(root: Locator,label: string,value: string) { await field(root,label).fill(value); await field(root,label).press('Enter'); }
async function state(root: Locator): Promise<LabState> { return JSON.parse((await root.getAttribute('data-state'))!); }
async function parity(root: Locator) {
  const s = await state(root), a = deriveLab(s);
  expect(Number(await root.getAttribute('data-objective'))).toBeCloseTo(a.lloyd.objective,12);
  expect(Number(await root.getAttribute('data-proposed-objective'))).toBeCloseTo(a.lloyd.proposedObjective,12);
  expect(JSON.parse((await root.getAttribute('data-labels'))!)).toEqual(a.lloyd.labels);
  for (const p of a.points) {
    const node = root.locator(`[data-point-id="${p.id}"]`);
    expect(Number(await node.getAttribute('data-cx'))).toBe(p.cx); expect(Number(await node.getAttribute('data-cy'))).toBe(p.cy);
    expect(Number(await node.getAttribute('data-x'))).toBe(p.x[0]); expect(Number(await node.getAttribute('data-y'))).toBe(p.x[1]);
  }
  if (await root.getAttribute('data-mode') !== 'alternatives') {
    for (const [i,p] of a.points.entries()) {
      const row = root.locator(`[data-row-id="${p.id}"]`), line = root.locator(`[data-assignment-link="${p.id}"]`), center = a.centers[a.lloyd.labels[i]!]!;
      expect(JSON.parse((await row.getAttribute('data-distances'))!)).toEqual(a.lloyd.distances[i]); await expect(row).toHaveAttribute('data-assignment',String(a.lloyd.labels[i]));
      expect(Number(await line.getAttribute('x1'))).toBe(p.cx); expect(Number(await line.getAttribute('y1'))).toBe(p.cy);
      expect(Number(await line.getAttribute('x2'))).toBe(center.cx); expect(Number(await line.getAttribute('y2'))).toBe(center.cy);
    }
    for (const c of a.lloyd.clusters) await expect(root.locator(`[data-cluster="${c.index}"]`)).toHaveAttribute('data-mean',JSON.stringify(c.mean));
  } else {
    for (const [i,p] of a.points.entries()) {
      const row = root.locator(`[data-density-id="${p.id}"]`);
      await expect(row).toHaveAttribute('data-neighbors',JSON.stringify(a.density.neighborhoods[i])); await expect(row).toHaveAttribute('data-kind',p.kind); await expect(row).toHaveAttribute('data-label',String(p.densityLabel));
      await expect(row.locator('td').nth(0)).toHaveText(String(p.x[0])); await expect(row.locator('td').nth(1)).toHaveText(String(p.x[1]));
    }
    for (const [i,m] of a.hierarchy.merges.entries()) await expect(root.locator(`[data-merge="${i}"]`)).toHaveAttribute('data-height',String(m.height));
  }
}
async function plotLocation(root: Locator,x: number,y: number) {
  const plot = root.locator('[data-cluster-plane]'); await plot.scrollIntoViewIfNeeded(); const box = (await plot.boundingBox())!;
  return { x:box.x+(280+42*x)*box.width/560,y:box.y+(280-42*y)*box.height/560 };
}
async function dragCenter(page: Page,root: Locator,x: number,y: number,finish=true) {
  const plot = root.locator('[data-cluster-plane]'); await plot.scrollIntoViewIfNeeded();
  const box = (await root.locator('[data-handle="0"]').boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
  const end = await plotLocation(root,x,y); await page.mouse.move(end.x,end.y,{steps:5}); if (finish) await page.mouse.up();
}
test('literal distance→assignment→mean objective and browser/model/geometry parity',async({page})=>{
  const root = await open(page,'lloyd'); await expect(root).toHaveAttribute('data-objective','8'); await expect(root).toHaveAttribute('data-proposed-objective','4'); await parity(root);
  await root.getByRole('button',{name:'Assign nearest',exact:true}).click(); await expect(root).toHaveAttribute('data-labels','[0,0,1,1]');
  await root.getByRole('button',{name:'Update means',exact:true}).click(); await expect(root).toHaveAttribute('data-objective','4'); expect((await state(root)).lloyd.centers).toEqual([[-2,0],[2,0]]); await parity(root);
  await root.getByRole('button',{name:'Assign nearest',exact:true}).click(); await root.getByRole('button',{name:'Update means',exact:true}).click(); expect((await state(root)).lloyd.stopped).toBe(true);
  await expect(root.getByRole('button',{name:'Assign nearest',exact:true})).toBeDisabled();
});
test('numeric, repeated keyboard and pointer centroid edits share the same actual state',async({page})=>{
  const root = await open(page,'lloyd'); await commit(root,'Handle x','-1.23456789');
  const handle = root.locator('[data-handle="0"]'); await handle.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await expect(handle).toBeFocused();
  expect((await state(root)).lloyd.centers[0]![0]).toBe(-1.23456789+.1+.1); await parity(root);
  await dragCenter(page,root,-2.5,.5); expect((await state(root)).lloyd.centers[0]).toEqual([-2.5,.5]); await parity(root);
  await commit(root,'Handle x','-2.5'); await commit(root,'Handle y','.5'); expect((await state(root)).lloyd.centers[0]).toEqual([-2.5,.5]);
  await root.getByRole('button',{name:'Reset experiment'}).click(); expect(await state(root)).toEqual(initialLab('lloyd')); await parity(root);
});
test('invalid shapes through discrete fields and nonzero-underflow input preserve displayed state',async({page})=>{
  const root = await open(page,'lloyd'), initial = await state(root);
  for (const [label,value] of [['k','0'],['k','1.5'],['Seed','-1'],['Scale x','0'],['Handle x','99'],['Handle y','1e-200'],['Handle x','NaN'],['Handle x','']]) {
    await commit(root,label!,value!); await expect(field(root,label!)).toHaveAttribute('aria-invalid','true'); expect(await state(root)).toEqual(initial); await parity(root);
    await root.getByRole('button',{name:'Reset experiment'}).click();
  }
  await commit(root,'Seed','0'); await root.getByRole('button',{name:'Initialize from seed'}).click(); expect((await state(root)).lloyd.centers).toEqual([[-3,0],[-1,0]]);
  await commit(root,'k','1'); expect((await state(root)).lloyd.centers).toHaveLength(1); await parity(root);
});
test('complete replay selects history and every edit starts from the displayed frame',async({page})=>{
  const root = await open(page,'lloyd'); await root.getByRole('button',{name:'Replay Lloyd steps'}).click(); await expect(root.locator('[data-current-frame]')).toContainText('1 / 5');
  await root.getByRole('button',{name:'Next',exact:true}).click(); await root.getByRole('button',{name:'Next',exact:true}).click(); const displayed = await state(root); expect(displayed.lloyd.centers).toEqual([[-2,0],[2,0]]);
  await commit(root,'Handle x','-1.5'); const edited = await state(root); expect(edited.lloyd.centers).toEqual([[-1.5,0],[2,0]]); expect(edited.lloyd.points).toEqual(displayed.lloyd.points); expect(edited.lloyd.phase).toBe('ready'); await expect(root.locator('.trace-stepper')).toHaveCount(0); await parity(root);
  await root.getByRole('button',{name:'Replay Lloyd steps'}).click(); await root.getByRole('button',{name:'Next',exact:true}).click(); await root.getByRole('button',{name:'First',exact:true}).click(); await expect(root).toHaveAttribute('data-state',JSON.stringify(edited));
});
test('reset during held drag invalidates late pointer movement',async({page})=>{
  const root = await open(page,'lloyd'); await dragCenter(page,root,-2,.5,false);
  // Invoke the actual reset button while a pointer remains captured.
  await root.getByRole('button',{name:'Reset experiment'}).evaluate(button=>(button as HTMLButtonElement).click());
  const to = await plotLocation(root,-1,1); await page.mouse.move(to.x,to.y); await page.mouse.up(); expect(await state(root)).toEqual(initialLab('lloyd')); await parity(root);
});
test('true local fixed points, retained empties, coincident IDs and unit sensitivity are inspectable',async({page})=>{
  const root = await open(page,'failures');
  for (const [name,objective] of [['Horizontal local minimum','16'],['Vertical groups','4'],['Empty cluster','2'],['Coincident observations','0']]) {
    await root.getByRole('button',{name:name!,exact:true}).click(); await expect(root).toHaveAttribute('data-objective',objective!); await parity(root);
    await root.getByRole('button',{name:'Assign nearest',exact:true}).click(); await root.getByRole('button',{name:'Update means',exact:true}).click(); expect((await state(root)).lloyd.stopped).toBe(true);
    if (name === 'Empty cluster' || name === 'Coincident observations') await expect(root.locator('[data-empty="true"]').first()).toContainText('Undefined; retain');
  }
  await root.getByRole('button',{name:'Horizontal local minimum'}).click(); await commit(root,'Scale x','10'); expect(Number(await root.getAttribute('data-objective'))).toBeCloseTo(.16,12); await parity(root);
});
test('actual linkage merges and explicit density core/border/noise/shared-border traversal',async({page})=>{
  const root = await open(page,'alternatives'); await expect(root.getByRole('combobox',{name:'Edit handles'})).toHaveValue('point'); await expect(root.locator('[data-handle="0"]')).toHaveAttribute('aria-label',/^Observation/);
  await parity(root); await expect(root.locator('[data-density-id="s5"]')).toHaveAttribute('data-kind','border'); await expect(root.locator('[data-density-id="s6"]')).toHaveAttribute('data-kind','noise');
  await expect(root.locator('.p05-border')).toHaveCount(1); await expect(root.locator('.p05-noise')).toHaveCount(1);
  await root.getByRole('combobox',{name:'Selected handle'}).selectOption('4'); await expect(root.locator('[data-selected-label]')).toHaveText('s5 · border');
  await root.getByRole('combobox',{name:'Linkage'}).selectOption('complete'); await parity(root); await root.getByRole('button',{name:'Replay actual merges'}).click();
  await root.getByRole('button',{name:'Next',exact:true}).click(); await commit(root,'Epsilon','.2'); await expect(root.locator('.trace-stepper')).toHaveCount(0); await parity(root);
  await root.getByRole('button',{name:'Shared border',exact:true}).click(); await parity(root); await expect(root.locator('[data-density-id="s9"]')).toHaveAttribute('data-kind','border'); await expect(root.locator('[data-density-id="s9"]')).toHaveAttribute('data-label','0');
  await root.getByRole('button',{name:'Reset experiment'}).click(); await expect(root.getByRole('combobox',{name:'Edit handles'})).toHaveValue('point'); expect(await state(root)).toEqual(initialLab('alternatives'));
});
test('physical touch keeps centroid capture across multiple moves while background touch still scrolls',async({page})=>{
  const root = await open(page,'lloyd'), start = await plotLocation(root,-3,0);
  const coordinates = [[-2.5,0],[-1,0],[0,1]] as const;
  const locations = [];
  for (const [x,y] of coordinates) locations.push(await plotLocation(root,x,y));
  const handle = root.locator('[data-handle="0"]'), captured = (await handle.elementHandle())!;
  await captured.evaluate(node=>{
    node.setAttribute('data-native-cancels','0');
    node.addEventListener('pointerdown',event=>node.setAttribute('data-native-pointer-id',String((event as PointerEvent).pointerId)));
    node.addEventListener('pointercancel',()=>node.setAttribute('data-native-cancels',String(Number(node.getAttribute('data-native-cancels'))+1)));
    node.addEventListener('touchstart',event=>queueMicrotask(()=>node.setAttribute('data-native-touch-prevented',String(event.defaultPrevented))));
  });
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
    for (const [i,location] of locations.entries()) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...location,id:1}]});
      await expect.poll(async()=>(await state(root)).lloyd.centers[0]).toEqual(coordinates[i]);
      await expect.poll(()=>captured.evaluate(node=>node.isConnected && node.hasPointerCapture(Number(node.getAttribute('data-native-pointer-id'))))).toBe(true);
      await expect(handle).toHaveAttribute('data-native-cancels','0');
      await expect(handle).toHaveAttribute('data-native-touch-prevented','true');
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>captured.evaluate(node=>node.hasPointerCapture(Number(node.getAttribute('data-native-pointer-id'))))).toBe(false);
    await expect(handle).toHaveAttribute('data-native-cancels','0'); await parity(root);
    const background = await plotLocation(root,-4,-3), plot = root.locator('[data-cluster-plane]');
    expect(await plot.evaluate(node=>getComputedStyle(node).touchAction)).toBe('auto');
    await plot.evaluate(node=>node.addEventListener('touchstart',event=>queueMicrotask(()=>node.setAttribute('data-background-touch-prevented',String(event.defaultPrevented)))));
    const scrollBefore = await page.evaluate(()=>window.scrollY);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...background,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:background.x,y:background.y-80,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(plot).toHaveAttribute('data-background-touch-prevented','false');
    await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(scrollBefore);
    expect((await state(root)).lloyd.centers[0]).toEqual([0,1]);
  } finally { await cdp.detach(); }
});
for (const mode of Object.keys(routes) as (keyof typeof routes)[]) test(`${mode} physical plot labels, bounded tables, controls and both themes`,async({page})=>{
  const root = await open(page,mode);
  for (const theme of ['light','dark']) {
    await page.evaluate(value=>document.documentElement.dataset.theme=value,theme); await parity(root);
    const geometry = await root.locator('[data-cluster-plane]').evaluate(svg=>{
      const transform = (svg as SVGSVGElement).getScreenCTM()!;
      return {labels:[...svg.querySelectorAll('text')].map(text=>parseFloat(getComputedStyle(text).fontSize)*Math.hypot(transform.a,transform.b)),
        handles:[...svg.querySelectorAll('[data-handle]')].map(handle=>{const r=handle.getBoundingClientRect();return {width:r.width,height:r.height};})};
    });
    expect(geometry.labels.length).toBeGreaterThan(0); geometry.labels.forEach(size=>expect(size).toBeGreaterThanOrEqual(13.99)); geometry.handles.forEach(box=>{expect(box.width).toBeGreaterThanOrEqual(43.99);expect(box.height).toBeGreaterThanOrEqual(43.99);});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const controls = await root.locator('input,select,button').evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect(),parent=node.closest('[data-p05]')!.getBoundingClientRect();return {height:rect.height,left:rect.left-parent.left,right:parent.right-rect.right};}));
    controls.forEach(c=>{expect(c.height).toBeGreaterThanOrEqual(43.99);expect(c.left).toBeGreaterThanOrEqual(-1);expect(c.right).toBeGreaterThanOrEqual(-1);});
    for (const table of await page.locator('.chapter-content table').all()) {
      expect(await table.evaluate(node=>{const wrapper=node.closest('.table-scroll');return !!wrapper && getComputedStyle(wrapper).overflowX==='auto';})).toBe(true);
    }
  }
});
for (const input of ['pointer','touch'] as const) test(`${input} selects the chosen coincident centroid or observation without losing its capture node`,async({page})=>{
  const root = await open(page,'failures');
  const cdp = input === 'touch' ? await page.context().newCDPSession(page) : null;
  if (cdp) await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  try {
    for (const kind of ['center','point'] as const) for (const chosen of [0,1]) {
      await root.getByRole('button',{name:'Coincident observations',exact:true}).click();
      await root.getByRole('combobox',{name:'Edit handles'}).selectOption(kind);
      await root.getByRole('combobox',{name:'Selected handle'}).selectOption(String(chosen));
      const before = await state(root), start = await plotLocation(root,1,1), end = await plotLocation(root,1.5,1.5);
      const hit = await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.getAttribute('data-handle'),start);
      expect(hit).toBe(String(chosen));
      const captured = (await root.locator(`[data-handle="${chosen}"]`).elementHandle())!;
      if (cdp) {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});
      } else {
        await page.mouse.move(start.x,start.y); await page.mouse.down();
        await page.mouse.move(end.x,end.y,{steps:5});
      }
      // Retain the DOM node that received pointer-down through every numerical rerender.
      expect(await captured.evaluate((node,index)=>node.isConnected && node===node.ownerDocument.querySelector(`[data-p05] [data-handle="${index}"]`),chosen)).toBe(true);
      if (cdp) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); else await page.mouse.up();
      const after = await state(root);
      if (kind === 'center') {
        expect(after.lloyd.centers).toEqual(before.lloyd.centers.map((c,i)=>i===chosen?[1.5,1.5]:c));
        expect(after.lloyd.points).toEqual(before.lloyd.points);
      } else {
        expect(after.lloyd.points).toEqual(before.lloyd.points.map((p,i)=>i===chosen?{...p,x:[1.5,1.5]}:p));
        expect(after.lloyd.centers).toEqual(before.lloyd.centers);
      }
      await parity(root);
    }
  } finally { if (cdp) await cdp.detach(); }
});
