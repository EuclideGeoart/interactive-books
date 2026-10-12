import { expect,test } from '@playwright/test';
import { entry,metrics,state,worldToSvg,dragHandle,touchDrag,scanStage,exercises } from './calculus-helpers';
const routes=[['VI.1','objective-landscapes','landscapes'],['VI.2','local-global-optima','optima'],['VI.3','convexity','convexity'],['VI.4','gradient-descent','descent']] as const;
for(const [id,slug,chapter] of routes)test(`${id}: parameters, replay, exceptional values and reset`,async({page})=>{
 await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="optimization-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');
 await s.locator('[data-preset="well"]').click();await expect(s.locator('[data-verdict]')).not.toBeEmpty();
 if(chapter==='convexity'){await entry(s,'left','-1');await entry(s,'right','1');await expect(s.locator('[data-verdict]')).toContainText('negative gap');}
 else{await entry(s,'x','1.25');expect((await state(s)).x).toBe(1.25);const handle=s.locator('[data-handle]').first();await handle.focus();await handle.press('ArrowRight');expect((await state(s)).x).toBe(1.5);}
 await s.locator('[data-preset="log"]').click();await expect(s.locator('[data-verdict]')).toContainText('requires x > 0');await s.locator('[data-action="reset"]').click();expect((await state(s)).objective).toBe('quadratic');
 const input=await entry(s,chapter==='convexity'?'t':'x','99');await expect(input).toHaveAttribute('aria-invalid','true');
 await scanStage(page);
});
test('VI.4: inspector, real path, table and accessible description agree on the selected iteration',async({page})=>{
 await page.goto('chapters/gradient-descent/');const s=page.locator('[data-stage="optimization-descent"]');await expect(s).toHaveAttribute('data-hydrated','true');
 expect((await metrics(s)).selected).toMatchObject({point:[2,1],gradient:[2,4],next:[1.5,0]});
 await s.getByRole('button',{name:/^Next/}).click();const m=await metrics(s);expect(m.selected).toMatchObject({k:1,point:[1.5,0],next:[1.125,0]});
 const plot=s.locator('[data-scene="map"]'),shaft=plot.locator('[data-part="actual-update"] line').first();
 const tip=/^M([^ ]+) ([^ ]+)/.exec((await plot.locator('[data-part="actual-update"] path').getAttribute('d'))!)!;
 const line={from:{x:Number(await shaft.getAttribute('x1')),y:Number(await shaft.getAttribute('y1'))},to:{x:Number(tip[1]),y:Number(tip[2])}};expect(line.from.x).toBeCloseTo((await worldToSvg(plot,{x:1.5,y:0})).x,2);expect(line.to.x).toBeCloseTo((await worldToSvg(plot,{x:1.125,y:0})).x,2);
 await expect(s.locator('[data-quantity="point"]')).toContainText('1.5');await expect(s.locator('[data-trace-detail]')).toContainText('Iteration 1');
 await s.getByRole('button',{name:/Previous/}).click();expect((await metrics(s)).selected.point).toEqual([2,1]);
});
test('VI.1: pointer and touch commit the same parameters with a commit-only announcement',async({page},info)=>{
 await page.goto('chapters/objective-landscapes/');const s=page.locator('[data-stage="optimization-landscapes"]');await expect(s).toHaveAttribute('data-hydrated','true');const plot=s.locator('[data-scene="map"]');
 if(info.project.name==='mobile')await touchDrag(page,plot,0,{x:1,y:1},s.locator('[data-announcement]'));else await dragHandle(page,plot,0,{x:1,y:1});
 expect((await state(s)).x).toBe(1);await expect(s.locator('[data-announcement]')).not.toBeEmpty();
});

const fieldAnswers:Record<string,string[]>={
"optimization-rate-1":["9/10", "3/5", "9/5", "3/5", "117/50"],"optimization-rate-2":["1", "-1", "5/2", "2"],"optimization-rate-4":["1/4", "0", "1/2", "1", "1/2"],"optimization-momentum-1":["2", "4", "3/2", "0"],"optimization-momentum-2":["31/10", "16/5", "-31/40", "-4/5", "29/40", "-4/5", "4937/3200"],"optimization-momentum-3":["4/5", "-8/5", "-1/5", "2/5"],"optimization-stochastic-1":["5/4", "-7/4", "-1"],"optimization-stochastic-2":["1083814273", "1", "378494188", "0"],"optimization-stochastic-3":["-1/2", "0", "1/20", "0", "1863/1600"],"optimization-stochastic-4":["-1/2", "1/2", "21/20", "9/20", "203/1600"],"optimization-adam-1":["1/5", "1/250", "2", "4", "4", "16"],"optimization-adam-2":["-1/6", "-1/5", "11/6", "4/5"],"optimization-adam-3":["-1/50", "1999/250000", "-2/19", "4"],
 'optimization-landscapes-1':['4','2','4','1','4'], 'optimization-landscapes-2':['3/2','2','-2'], 'optimization-landscapes-3':['2','2','4','16'],
 'optimization-optima-1':['-1','1','0','2','-2'],'optimization-optima-3':['0','1','0','-4','2'],
 'optimization-convexity-1':['0','2','1/2','1','1/2'],'optimization-convexity-2':['0','1','-1'],
 'optimization-descent-1':['2','4','-1/2','-1','3/2','0','9/8'],'optimization-descent-2':['3/2','9/8','0','81/128'],'optimization-descent-3':['1/2','-2','65/8'],
};
for(const [id,slug,chapter] of routes)test(`${id}: five graded exercises, feedback and worked solutions`,async({page})=>{
 await page.goto(`chapters/${slug}/`);await exercises(page,fieldAnswers,`optimization-${chapter}-`);
});

const dynamicsRoutes=[['VI.5','learning-rate-convergence','rate','boundary'],['VI.6','momentum','momentum','overshoot'],['VI.7','stochastic-mini-batch-descent','stochastic','full'],['VI.8','adam','adam','zero']] as const;
for(const [id,slug,chapter,preset] of dynamicsRoutes) {
 test(`${id}: dynamics state, immutable replay, keyboard, boundaries and reset`,async({page})=>{
  await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="optimization-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');
  const first=(await metrics(s)).selected;await s.getByRole('button',{name:/^Next/}).click();expect((await metrics(s)).selected.k).toBe(1);await s.getByRole('button',{name:/Previous/}).click();expect((await metrics(s)).selected).toEqual(first);
  const handle=s.locator('[data-handle]').first();await handle.focus();await handle.press('ArrowLeft');expect((await state(s)).x).toBe((chapter==='stochastic'?0:2)-.25);
  await s.locator(`[data-preset="${preset}"]`).click();
  if(chapter==='rate')await expect(s.locator('[data-verdict]')).toContainText('nondecaying mode');
  if(chapter==='momentum')await expect(s.locator('[data-quantity="velocity"]')).not.toBeEmpty();
  if(chapter==='stochastic'){expect((await metrics(s)).selected.batch).toMatchObject({indices:[0,1,2,3],before:42,after:42});await s.locator('[data-preset="mini"]').click();expect((await metrics(s)).selected.batch.indices).toEqual([1,0]);await s.getByRole('button',{name:/^Next/}).click();expect((await metrics(s)).selected.batch).toMatchObject({indices:[2,0],before:378494188,after:955863294});await s.getByRole('button',{name:/Previous/}).click();expect((await metrics(s)).selected.batch.indices).toEqual([1,0]);}
  if(chapter==='adam'){expect((await metrics(s)).selected.adam).toMatchObject({time:1,mhat:[0,0],vhat:[0,0],update:[0,0]});await s.locator('[data-preset="change-sign"]').click();await s.getByRole('button',{name:/^Next/}).click();expect((await metrics(s)).selected.gradient.every((g:number)=>g<0)).toBe(true);}
  await entry(s,'eta','.2');const input=await entry(s,'eta','0');await expect(input).toHaveAttribute('aria-invalid','true');await s.locator('[data-action="reset"]').click();expect((await state(s)).eta).toBe(chapter==='stochastic'?.1:.25);await scanStage(page);
 });
 test(`${id}: five graded exercises, feedback and worked solutions`,async({page})=>{await page.goto(`chapters/${slug}/`);await exercises(page,fieldAnswers,`optimization-${chapter}-`);});
}
