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
"optimization-constraints-1":["2", "-3", "1", "-1", "-1", "2", "1", "-2", "5/2"],"optimization-constraints-2":["1", "-1", "-1", "2"],"optimization-constraints-3":["5", "-2", "6", "1/5", "2/5", "107/50"],"optimization-constraints-4":["2/3", "0", "4/3", "3", "6"],"optimization-diagnostics-1":["1/20", "0", "1/20", "0", "1/800"],"optimization-diagnostics-2":["2", "9/8", "0", "81/128", "63/128"],"optimization-diagnostics-3":["5", "2/5", "6/5", "8/5", "27/10", "3/5"],"optimization-diagnostics-4":["2", "9/8", "0", "81/128"],
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

test('VI.9: requested start, real proposal, feasibility projection and penalty remain distinct',async({page},info)=>{
 await page.goto('chapters/constraints-regularization/');const s=page.locator('[data-stage="optimization-constraints"]');await expect(s).toHaveAttribute('data-hydrated','true');
 expect((await metrics(s)).selected).toMatchObject({point:[0,1],gradient:[-2,4],update:[2,-4],next:[1,-1],projection:{proposed:[2,-3],correction:[-1,2]}});
 const plot=s.locator('[data-scene="map"]');await expect(plot.locator('[data-part="feasible-region"]')).toHaveCount(1);await expect(plot.locator('[data-part="proposed-update"]')).toHaveCount(1);await expect(plot.locator('[data-part="projection-correction"]')).toHaveCount(1);
 if(info.project.name==='mobile')await touchDrag(page,plot,0,{x:2,y:2},s.locator('[data-announcement]'));else await dragHandle(page,plot,0,{x:2,y:2});
 expect((await state(s)).x).toBe(2);expect((await metrics(s)).start).toEqual([1,1]);await expect(s.locator('[data-verdict]')).toContainText('explicitly projected');
 await s.locator('[data-preset="disk"]').click();const disk=(await metrics(s)).selected;expect(disk.projection.proposed).toEqual([2,-3]);expect(Math.hypot(...disk.next)).toBeCloseTo(1,12);expect(disk.next[0]).toBeCloseTo(2/Math.sqrt(13),12);
 await s.locator('[data-preset="penalty"]').click();expect((await metrics(s)).selected).toMatchObject({loss:5,gradient:[-2,6],penalty:{lambda:1,baseLoss:4,value:1}});await expect(s.locator('[data-quantity="penalty"]')).toContainText('1');await expect(plot.locator('[data-part="feasible-region"]')).toHaveCount(0);
 const bad=await entry(s,'lambda','-1');await expect(bad).toHaveAttribute('aria-invalid','true');expect((await state(s)).lambda).toBe(1);await s.locator('[data-action="reset"]').click();expect((await state(s)).constraint).toBe('box');await scanStage(page);
});
test('VI.10: raw stopping criteria, clipping, budget and non-finite history are honest and replayable',async({page})=>{
 await page.goto('chapters/optimization-diagnostics/');const s=page.locator('[data-stage="optimization-diagnostics"]');await expect(s).toHaveAttribute('data-hydrated','true');
 expect((await metrics(s)).reason).toContain('gradient-norm threshold');expect((await metrics(s)).stopGradientNorm).toBeLessThanOrEqual(.1);
 await s.locator('[data-preset="loss-stop"]').click();expect((await metrics(s)).reason).toContain('small loss-change');expect((await metrics(s)).lastLossChange).toBeLessThanOrEqual(.5);
 await s.locator('[data-preset="budget"]').click();expect((await metrics(s)).reason).toBe('iteration budget');await s.getByRole('button',{name:/^Next/}).click();expect((await metrics(s)).selected.k).toBe(1);
 await s.locator('[data-preset="clipped"]').click();const first=(await metrics(s)).selected;expect(first.gradient).toEqual([2,4]);expect(first.clipping.scale).toBeCloseTo(1/Math.sqrt(20),12);expect(first.update[0]).toBeCloseTo(-.25/Math.sqrt(5),12);await expect(s.locator('[data-quantity="applied-gradient"]')).not.toBeEmpty();await s.getByRole('button',{name:/^Next/}).click();await s.getByRole('button',{name:/Previous/}).click();expect((await metrics(s)).selected).toEqual(first);
 await s.locator('[data-preset="nonfinite"]').click();expect((await metrics(s)).reason).toContain('non-finite');await s.getByRole('slider').press('End');expect((await metrics(s)).selected.nextEvaluation.status).toBe('non-finite');await expect(s.locator('[data-quantity="next-loss"]')).toContainText('undefined');await expect(s.locator('[data-trace-detail]')).toContainText('undefined');await scanStage(page);
 await s.locator('[data-preset="saddle-stop"]').click();expect((await metrics(s)).selected).toBeNull();await expect(s.locator('[data-verdict]')).toContainText('not a global-optimality certificate');
 await s.locator('[data-action="reset"]').click();const bad=await entry(s,'clip','-1');await expect(bad).toHaveAttribute('aria-invalid','true');expect((await state(s)).clip).toBe(0);
});

for(const [id,slug,chapter] of [['VI.9','constraints-regularization','constraints'],['VI.10','optimization-diagnostics','diagnostics']] as const)test(`${id}: five graded exercises, feedback and worked solutions`,async({page})=>{await page.goto(`chapters/${slug}/`);await exercises(page,fieldAnswers,`optimization-${chapter}-`);});
