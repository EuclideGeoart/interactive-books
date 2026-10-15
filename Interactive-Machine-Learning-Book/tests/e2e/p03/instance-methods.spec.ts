import { expect,test,type Locator,type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const golden=JSON.parse(readFileSync(new URL('../../../fixtures/p03/instance-probabilistic.json',import.meta.url),'utf8')) as {
  cases:{bayes:{name:string;expected:{rows:{posterior:number|null}[];prediction:string|null}}[]};
};
const routes={neighbors:'k-nearest-neighbors',metrics:'distance-metrics-dimensionality',bayes:'naive-bayes'};
const field=(root:Locator,label:string)=>root.getByRole('textbox',{name:new RegExp('^'+label)});
const shown=(n:number)=>'≈ '+String(Number(n.toFixed(4))+0).replace('-','−');
async function open(page:Page,kind:keyof typeof routes){
  await page.goto('chapters/'+routes[kind]+'/');
  const root=page.locator('[data-'+kind+']');await expect(root).toBeVisible();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);return root;
}
async function commit(root:Locator,label:string,value:string){await field(root,label).fill(value);await field(root,label).press('Enter');}
async function neighborsParity(root:Locator){
  const state=await root.evaluate(node=>({
    x:Number(node.getAttribute('data-query-x')),y:Number(node.getAttribute('data-query-y')),k:Number(node.getAttribute('data-k')),
    rows:[...node.querySelectorAll('[data-row-id]')].map(row=>({id:row.getAttribute('data-row-id')!,x:Number(row.getAttribute('data-x')),y:Number(row.getAttribute('data-y')),
      category:row.getAttribute('data-category')!,target:Number(row.getAttribute('data-target')),distance:Number(row.getAttribute('data-distance')),selected:row.getAttribute('data-selected')==='true'})),
  }));
  // This helper exercises L2/unit-scale paths; the metric case below has its own independent literal.
  const ordered=state.rows.map(r=>({...r,expected:Math.hypot(r.x-state.x,r.y-state.y)})).sort((a,b)=>a.expected-b.expected||(a.id<b.id?-1:a.id>b.id?1:0));
  expect(state.rows.map(r=>r.id)).toEqual(ordered.map(r=>r.id));
  for(const row of ordered){
    expect(Math.abs(row.distance-row.expected)).toBeLessThanOrEqual(1e-12);
    await expect(root.locator('[data-row-id="'+row.id+'"] td').nth(3)).toHaveText(shown(row.distance));
  }
  const selected=state.k<=state.rows.length?ordered.slice(0,state.k):[];
  expect(state.rows.filter(r=>r.selected).map(r=>r.id)).toEqual(selected.map(r=>r.id));
  await expect(root).toHaveAttribute('data-selected-ids',JSON.stringify(selected.map(r=>r.id)));
  if(selected.length){
    const average=selected.reduce((n,r)=>n+r.target,0)/selected.length;
    expect(Number(await root.getAttribute('data-regression'))).toBeCloseTo(average,12);
    await expect(root.locator('[data-value=regression]')).toHaveText(shown(average));
    const a=selected.filter(r=>r.category==='A').length,b=selected.length-a;
    await expect(root).toHaveAttribute('data-classification',a>=b?'A':'B');
  }else{
    await expect(root).toHaveAttribute('data-regression','undefined');
    await expect(root.locator('[data-undefined-reason]')).toContainText('exceeds');
  }
}
async function pointerLocation(root:Locator,x:number,y:number){
  const plot=root.locator('[data-query-plane]');await plot.scrollIntoViewIfNeeded();
  const box=(await plot.boundingBox())!;
  return {x:box.x+(320+80*x)*box.width/640,y:box.y+(320-80*y)*box.height/640};
}
async function startDrag(page:Page,root:Locator,x:number,y:number){
  const handle=root.locator('[data-query-handle]');await handle.scrollIntoViewIfNeeded();const box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  const to=await pointerLocation(root,x,y);await page.mouse.move(to.x,to.y,{steps:5});
}
test('query numeric and keyboard edits retain focus and fine precision with exact ranking',async({page})=>{
  const root=await open(page,'neighbors'),x=field(root,'Query x');
  await x.focus();await page.keyboard.press('ArrowUp');await expect(x).toBeFocused();
  await page.keyboard.press('ArrowUp');await expect(x).toBeFocused();expect(Number(await x.inputValue())).toBeCloseTo(.2,14);
  await x.fill('-1.23456789');await page.keyboard.press('Enter');await expect(x).toBeFocused();
  await page.keyboard.press('Tab');await expect(field(root,'Query y')).toBeFocused();
  const handle=root.locator('[data-query-handle]');await handle.focus();await page.keyboard.press('ArrowRight');
  expect(Number(await root.getAttribute('data-query-x'))).toBe(-1.23456789+.1);
  await expect(handle).toBeFocused();expect(await handle.getAttribute('aria-label')).toContain('x '+(-1.23456789+.1)+', y 0.');
  await neighborsParity(root);
  await commit(root,'Query x','99');await expect(x).toHaveAttribute('aria-invalid','true');
  expect(Number(await root.getAttribute('data-query-x'))).toBe(-1.23456789+.1);
});
test('pointer query movement commits lattice coordinates and announces only its final result',async({page})=>{
  const root=await open(page,'neighbors');await startDrag(page,root,1.5,0);
  await expect(root.locator('[data-announcement]')).toHaveText('');
  await page.mouse.up();await expect(root).toHaveAttribute('data-query-x','1.5');
  await neighborsParity(root);await expect(root).toHaveAttribute('data-regression','10');
  await expect(root.locator('[data-announcement]')).toContainText('Drag finished.');
});
test('numeric commits invalidate held drag speech and capture before release or cancel',async({page})=>{
  const root=await open(page,'neighbors');
  for(const ending of ['release','cancel']){
    await root.getByRole('button',{name:'Reset experiment',exact:true}).click();
    await startDrag(page,root,-1.3,.2);
    const x=field(root,'Query x');await x.focus();await x.fill('1.23456789');await page.keyboard.press('Enter');
    await expect(x).toBeFocused();await expect(root).toHaveAttribute('data-query-x','1.23456789');
    await expect.poll(()=>root.locator('[data-query-handle]').evaluate(node=>(node as SVGCircleElement).hasPointerCapture(1))).toBe(false);
    const spoken=await root.locator('[data-announcement]').textContent();expect(spoken).toContain('Query x 1.23456789');
    if(ending==='cancel')await root.locator('[data-query-handle]').dispatchEvent('pointercancel',{pointerId:1,isPrimary:true});
    await page.mouse.up();
    await expect(root.locator('[data-announcement]')).toHaveText(spoken!);
    await expect(root).toHaveAttribute('data-query-x','1.23456789');await neighborsParity(root);
  }
});
test('duplicates, k>n, exact vote ties and every historical query are explicit',async({page})=>{
  const root=await open(page,'neighbors');
  await root.getByRole('button',{name:'Conflicting duplicates',exact:true}).click();
  await expect(root.locator('[data-duplicates]')).toContainText('s4, s7');
  await expect(root).toHaveAttribute('data-regression','4');await expect(root.locator('[data-votes]')).toContainText('Tie:');
  await commit(root,'Neighbor count k','8');await neighborsParity(root);
  await expect(root.locator('[data-votes]')).toContainText('No neighbors selected.');
  await expect(root.locator('[data-votes]')).toContainText('k exceeds');
  await expect(root.locator('[data-votes]')).not.toContainText('exactly k selected rows');
  await root.getByRole('button',{name:'Reset experiment',exact:true}).click();
  await root.getByRole('button',{name:'Replay query path',exact:true}).click();
  const nav=root.getByRole('navigation',{name:'Trace playback'});
  for(const [i,x] of [0,-1.5,0,1.5].entries()){
    await expect(root).toHaveAttribute('data-frame-index',String(i));
    expect(Number(await field(root,'Query x').inputValue())).toBe(x);
    await neighborsParity(root);
    if(i<3)await nav.getByRole('button',{name:'Next',exact:true}).click();
  }
  await field(root,'Query x').focus();await page.keyboard.press('Tab');await expect(nav).toBeVisible();
  await commit(root,'Query y','.123456789');await expect(nav).toHaveCount(0);expect(Number(await field(root,'Query x').inputValue())).toBe(1.5);
});
test('reset discards a held query drag before further movement or release',async({page})=>{
  const root=await open(page,'neighbors');await startDrag(page,root,1.5,0);
  const reset=root.getByRole('button',{name:'Reset experiment',exact:true});await reset.focus();await page.keyboard.press('Enter');
  const target=await pointerLocation(root,2,2);await page.mouse.move(target.x,target.y);await page.mouse.up();
  await expect(root).toHaveAttribute('data-query-x','0');await expect(root).toHaveAttribute('data-query-y','0');await neighborsParity(root);
});
test('metrics expose scaling, prefix reproducibility, line counterexample and dimension replay',async({page})=>{
  const root=await open(page,'metrics');
  await root.getByRole('combobox',{name:'Metric',exact:true}).selectOption('L1');
  await commit(root,'x reference scale','2');await commit(root,'y reference scale','0.5');
  expect(Number(await root.getAttribute('data-pair-distance'))).toBe(3);
  await root.getByRole('button',{name:'Reset experiment',exact:true}).click();
  const before=await root.locator('[data-dimension-row]').evaluateAll(nodes=>nodes.map(n=>JSON.parse(n.getAttribute('data-features')!) as number[]));
  await commit(root,'Dimension d','32');
  const after=await root.locator('[data-dimension-row]').evaluateAll(nodes=>nodes.map(n=>JSON.parse(n.getAttribute('data-features')!) as number[]));
  expect(after.map(row=>row.slice(0,2))).toEqual(before);
  await root.getByRole('combobox',{name:'Distribution',exact:true}).selectOption('line');
  const read=()=>root.locator('[data-dimension-row]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-distance'))));
  const line=await read();await commit(root,'Dimension d','1');expect(await read()).toEqual(line);
  await root.getByRole('button',{name:'Replay dimensions',exact:true}).click();
  const nav=root.getByRole('navigation',{name:'Trace playback'});
  for(const [i,d] of [1,1,2,8,32].entries()){
    await expect(root).toHaveAttribute('data-frame-index',String(i));expect(Number(await field(root,'Dimension d').inputValue())).toBe(d);
    expect(await read()).toEqual(line);
    if(i<4)await nav.getByRole('button',{name:'Next',exact:true}).click();
  }
  await commit(root,'Dimension d','2.5');await expect(field(root,'Dimension d')).toHaveAttribute('aria-invalid','true');
  await expect(root).toHaveAttribute('data-dimension','32');
});
test('Bayes literal posterior, exact ties, impossible support and positive underflow stay distinct',async({page})=>{
  const root=await open(page,'bayes'),canonical=golden.cases.bayes.find(c=>c.name==='canonical')!.expected;
  for(const [j,id] of ['A','B'].entries()){
    const row=root.locator('[data-class-id='+id+']');
    expect(Number(await row.getAttribute('data-posterior'))).toBeCloseTo(canonical.rows[j]!.posterior!,12);
  }
  await root.getByRole('button',{name:'Exact-score tie',exact:true}).click();
  await expect(root).toHaveAttribute('data-exact-tie','true');await expect(root).toHaveAttribute('data-prediction','A');
  await expect(root.locator('[data-class-id]')).toHaveCount(2);
  for(const id of ['A','B'])await expect(root.locator('[data-class-id='+id+']')).toHaveAttribute('data-posterior','0.5');
  await root.getByRole('button',{name:'All-impossible evidence',exact:true}).click();
  await expect(root.locator('[data-undefined-reason]')).toContainText('zero probability');
  await expect(root.locator('progress')).toHaveCount(0);await expect(root).toHaveAttribute('data-prediction','undefined');
  await expect(root).toHaveAttribute('data-score-order','undefined');
  await expect(root.locator('[data-decision]')).toContainText('No class decision is defined.');
  await expect(root.locator('[data-decision]')).toContainText('zero probability');
  await expect(root.locator('[data-decision]')).not.toContainText('Choose by exact model-score ordering');
  await root.getByRole('button',{name:'Tiny positive likelihoods',exact:true}).click();
  await expect(root.locator('[data-underflow]')).toContainText('Finite log scores');
  expect(Number(await root.locator('[data-class-id=A]').getAttribute('data-posterior'))).toBeCloseTo(.4,12);
  await expect(root).toHaveAttribute('data-prediction','B');
  await root.getByRole('button',{name:'Empty class without smoothing',exact:true}).click();
  await expect(root.locator('[data-undefined-reason]')).toContainText('required likelihood');
  await expect(root.locator('[data-decision]')).toContainText('required likelihood');
});
test('Bayes replay, numeric focus, zero priors and invalid count preserve exact displayed state',async({page})=>{
  const root=await open(page,'bayes'),alpha=field(root,'Smoothing alpha');
  await alpha.focus();await page.keyboard.press('ArrowUp');await expect(alpha).toBeFocused();
  await page.keyboard.press('ArrowUp');await expect(alpha).toBeFocused();expect(Number(await alpha.inputValue())).toBeCloseTo(1.2,14);
  await root.getByRole('button',{name:'Reset experiment',exact:true}).click();
  await root.getByRole('button',{name:'Replay evidence ledger',exact:true}).click();
  const nav=root.getByRole('navigation',{name:'Trace playback'});
  for(const [i,mask] of [[true,true],[false,false],[true,false],[true,true]].entries()){
    await expect(root).toHaveAttribute('data-frame-index',String(i));await expect(root).toHaveAttribute('data-observed',JSON.stringify(mask));
    expect(await root.getByRole('checkbox',{name:/Observe feature 1/}).isChecked()).toBe(mask[0]);
    expect(await root.getByRole('checkbox',{name:/Observe feature 2/}).isChecked()).toBe(mask[1]);
    if(i<3)await nav.getByRole('button',{name:'Next',exact:true}).click();
  }
  await commit(root,'Class A observations','3');await expect(field(root,'Class A observations')).toHaveAttribute('aria-invalid','true');await expect(nav).toBeVisible();
  await commit(root,'Class A prior weight','0');await expect(nav).toHaveCount(0);
  await expect(root.locator('[data-class-id=A]')).toHaveAttribute('data-posterior','0');
  await commit(root,'Class B prior weight','0');await expect(root.locator('[data-undefined-reason]')).toContainText('prior weights');
  await expect(root.locator('[data-decision]')).toContainText('prior weights');
});
test('physical query geometry, plot text, themes, narrow widths and reduced motion remain meaningful',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const kind of ['neighbors','metrics','bayes'] as const){
    const root=await open(page,kind);
    for(const theme of ['light','dark']){
      await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
      const viewport=page.viewportSize()!;
      const widths=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth}));
      expect(widths.scrollWidth).toBeLessThanOrEqual(viewport.width);expect(widths.innerWidth).toBeLessThanOrEqual(viewport.width);
      if(kind!=='bayes'){
        await expect.poll(()=>root.locator('.p03-ticks text').evaluateAll(nodes=>nodes.every(node=>{
          const svg=node.closest('svg')!,font=Number.parseFloat(getComputedStyle(node).fontSize);
          return font*svg.getBoundingClientRect().width/640>=13.99&&node.getBoundingClientRect().height>=11;
        }))).toBe(true);
        const geometry=await root.locator('[data-query-handle]').evaluate(node=>{
          const circle=node as SVGCircleElement,box=node.getBoundingClientRect(),plot=node.closest('svg')!.getBoundingClientRect();
          return {cx:Number(circle.getAttribute('cx')),cy:Number(circle.getAttribute('cy')),paintedX:box.x+box.width/2,paintedY:box.y+box.height/2,
            width:box.width,height:box.height,plot:{x:plot.x,y:plot.y,width:plot.width,height:plot.height}};
        });
        const x=Number(await root.getAttribute('data-query-x')),y=Number(await root.getAttribute('data-query-y'));
        expect(Math.abs(geometry.cx-(320+80*x))).toBeLessThanOrEqual(1e-9);
        expect(Math.abs(geometry.cy-(320-80*y))).toBeLessThanOrEqual(1e-9);
        expect(Math.abs(geometry.paintedX-(geometry.plot.x+(320+80*x)*geometry.plot.width/640))).toBeLessThanOrEqual(.02);
        expect(Math.abs(geometry.paintedY-(geometry.plot.y+(320-80*y)*geometry.plot.height/640))).toBeLessThanOrEqual(.02);
        expect(geometry.width).toBeGreaterThanOrEqual(44);expect(geometry.height).toBeGreaterThanOrEqual(44);
        expect(await root.locator('[data-query-handle]').evaluate(n=>getComputedStyle(n).touchAction)).toBe('none');
        expect(await root.locator('[data-query-plane]').evaluate(n=>getComputedStyle(n).touchAction)).toBe('auto');
      }
      expect(await root.evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
    }
    const exercise=page.locator('[data-exercise]').first();
    await exercise.getByRole('radio').first().check();await exercise.getByRole('button',{name:'Check answer'}).click();
    await expect(exercise.getByRole('status')).toContainText('Correct.');
  }
});
