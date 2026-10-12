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
 'optimization-landscapes-1':['4','2','4','1','4'], 'optimization-landscapes-2':['3/2','2','-2'], 'optimization-landscapes-3':['2','2','4','16'],
 'optimization-optima-1':['-1','1','0','2','-2'],'optimization-optima-3':['0','1','0','-4','2'],
 'optimization-convexity-1':['0','2','1/2','1','1/2'],'optimization-convexity-2':['0','1','-1'],
 'optimization-descent-1':['2','4','-1/2','-1','3/2','0','9/8'],'optimization-descent-2':['3/2','9/8','0','81/128'],'optimization-descent-3':['1/2','-2','65/8'],
};
for(const [id,slug,chapter] of routes)test(`${id}: five graded exercises, feedback and worked solutions`,async({page})=>{
 await page.goto(`chapters/${slug}/`);await exercises(page,fieldAnswers,`optimization-${chapter}-`);
});
