import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Locator } from '@playwright/test';
const slug = 'orthogonal-least-squares', kind = 'least-squares';
async function open(page: Page) { await page.goto(`chapters/${slug}/`); const stage = page.locator(`[data-stage="completion-${kind}"]`); await expect(stage).toHaveAttribute('data-hydrated','true'); return stage; }
const state = async (s: Locator) => JSON.parse((await s.getAttribute('data-state'))!);
async function entry(s: Locator,id: string,v: string) { const input=s.locator(`[data-param="${id}"] input`);await input.fill(v);await input.press('Enter');return input; }
const answers: Record<string,string[]> = {'ls-fit':['4/3','1'],'ls-error':['2/3'],'ls-gram':['1/2','-1/2']};
test.describe('II.18: least-squares',()=>{
 test('canonical values, numeric and keyboard edits, invalid input and reset',async({page})=>{
  const s=await open(page),initial=await state(s);await s.locator('[data-param="x1"] input').press('ArrowUp');expect((await state(s)).x1).toBe(initial.x1+.5);
  await expect(s.locator('[data-announcement]')).not.toBeEmpty();await entry(s,'x1','0.25');expect((await state(s)).x1).toBe(.25);
  for(const value of ['9','0.001','NaN']){const input=await entry(s,'x1',value);await expect(input).toHaveAttribute('aria-invalid','true');expect((await state(s)).x1).toBe(.25);}
  await s.locator('[data-param="x1"] input').press('Escape');await s.locator('[data-action="reset"]').click();expect(await state(s)).toEqual(initial);
 });
 test('mouse, keyboard and actual geometry agree with the canonical model',async({page})=>{
  const s=await open(page),plot=s.locator('[data-scene="0"]'),handle=plot.locator('[data-handle]').first();await plot.locator('svg').evaluate(e=>e.scrollIntoView({block:'center'}));
  await handle.press('ArrowRight');await expect(s.locator('[data-announcement]')).not.toBeEmpty();
  const hit=(await handle.locator('.hit').boundingBox())!,box=(await plot.locator('svg').boundingBox())!,radius=Number(await plot.getAttribute('data-radius')),scale=Math.min(box.width,box.height)/(2*radius);
  const end={x:box.x+box.width/2-.5*scale,y:box.y+box.height/2-1.5*scale};await page.mouse.move(hit.x+hit.width/2,hit.y+hit.height/2);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();
  expect((await state(s)).x1).toBe(-.5);expect((await state(s)).y1??(await state(s)).x2).toBe(1.5);await expect(handle).toHaveAttribute('data-world-x','-0.5');
  const line=plot.locator('[data-part="residual-0"]'),xy=await line.evaluate(el=>{const l=el as SVGLineElement,v=new DOMPoint(l.x2.baseVal.value,l.y2.baseVal.value).matrixTransform(l.getScreenCTM()!);return{x:v.x,y:v.y};});
 expect(Math.abs(xy.x-(box.x+box.width/2-.5*scale))).toBeLessThan(1.5);expect(Math.abs(xy.y-(box.y+box.height/2-(23/14)*scale))).toBeLessThan(1.5);
 await expect(s.locator('[data-quantity="orthogonality"]')).toContainText('(0, 0)');
 });
 test('touch uses a large target, commits on release and preserves exact state',async({page,context,isMobile})=>{
  test.skip(!isMobile,'touch emulation runs on mobile');const s=await open(page),plot=s.locator('[data-scene="0"]'),handle=plot.locator('[data-handle]').first();await plot.locator('svg').evaluate(e=>e.scrollIntoView({block:'center'}));
  const hit=(await handle.locator('.hit').boundingBox())!,box=(await plot.locator('svg').boundingBox())!,radius=Number(await plot.getAttribute('data-radius')),scale=Math.min(box.width,box.height)/(2*radius);expect(hit.width).toBeGreaterThanOrEqual(44);
  const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hit.x+hit.width/2,y:hit.y+hit.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2-.5*scale,y:box.y+box.height/2-1.5*scale}]});await expect(s.locator('[data-announcement]')).toBeEmpty();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();expect((await state(s)).x1).toBe(-.5);await expect(s.locator('[data-announcement]')).not.toBeEmpty();
 });
 test('replay contains actual calculations, supports scrub and both directions',async({page})=>{
  await open(page);const work=page.locator(`[data-stage="completion-worked-${kind}"]`),trace=work.locator('[data-trace-index]');await expect(work).toHaveAttribute('data-hydrated','true');
  await work.getByRole('button',{name:/^Next/}).click();await expect(trace).toHaveAttribute('data-trace-index','1');await work.getByRole('button',{name:/Previous/}).click();await expect(trace).toHaveAttribute('data-trace-index','0');
  await work.getByRole('slider').press('ArrowRight');await expect(trace).toHaveAttribute('data-trace-index','1');await work.locator('[data-action="play"]').click();await expect(trace).toHaveAttribute('data-trace-index','2',{timeout:5000});await work.locator('[data-action="play"]').click();
 });
 test('five graded exercises accept answers and explain errors',async({page})=>{
  await open(page);const all=page.locator('[data-exercise]');await expect(all).toHaveCount(5);
  for(const e of await all.all()){const radios=e.locator('input[type="radio"]'),inputs=e.locator('[data-field]');if(await radios.count())await radios.nth(1).check();else for(const input of await inputs.all())await input.fill('999');
   await e.locator('[data-action="check"]').click();await expect(e).toHaveAttribute('data-result','incorrect');await e.locator('[data-action="show-solution"]').click();await expect(e.locator('[data-solution]')).toBeVisible();await e.locator('[data-action="reset-exercise"]').click();
   if(await radios.count())await radios.first().check();else for(const[i,v]of answers[(await e.getAttribute('data-exercise'))!]!.entries())await inputs.nth(i).fill(v);await e.locator('[data-action="check"]').click();await expect(e).toHaveAttribute('data-result','correct');
  }
 });
 test('exact fit, nonunique coefficients, dependent and zero directions remain explicit',async({page})=>{
 const s=await open(page);await expect(s.locator('[data-quantity="objective"]')).toContainText('2/3');await expect(s.locator('[data-quantity="orthogonality"]')).toContainText('(0, 0)');
 await s.locator('[data-preset="exact"]').click();await expect(s).toHaveAttribute('data-status','exact');await expect(s.locator('[data-quantity="objective"]')).toContainText('0');
 await s.locator('[data-preset="rank-deficient"]').click();await expect(s).toHaveAttribute('data-status','nonunique');await expect(s.locator('[data-verdict]')).toContainText('(-1, 1)'.replace('-','−'));
 await s.locator('[data-preset="dependent"]').click();await expect(s.locator('[data-quantity="gram-status"]')).toContainText('dependent');
 await s.locator('[data-preset="zero-vector"]').click();await expect(s.locator('[data-quantity="gram-status"]')).toContainText('zero');
 await s.locator('[data-preset="gram"]').click();await expect(s.locator('[data-quantity="orthonormal"]')).toHaveAttribute('data-status','approximate');
});
 for(const theme of ['light','dark'] as const)test.describe(theme,()=>{
  test.use({colorScheme:theme});test('exceptional and invalid states remain accessible',async({page})=>{
   const s=await open(page);await s.locator('[data-preset="dependent"]').click();const scan=async()=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);await scan();await entry(s,'x1','9');await scan();
  });
 });
});
