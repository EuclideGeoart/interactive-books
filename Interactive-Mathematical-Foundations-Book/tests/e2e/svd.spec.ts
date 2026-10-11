import AxeBuilder from '@axe-core/playwright';
import {expect,test,type Page,type Locator} from '@playwright/test';
async function open(page:Page){await page.goto('chapters/singular-value-decomposition/');const stage=page.locator('[data-stage="completion-svd"]');await expect(stage).toHaveAttribute('data-hydrated','true');return stage;}
const state=async(s:Locator)=>JSON.parse((await s.getAttribute('data-state'))!);
async function entry(s:Locator,id:string,v:string){const input=s.locator(`[data-param="${id}"] input`);await input.fill(v);await input.press('Enter');return input;}
const answers:Record<string,string[]>={'svd-values':['3','1'],'svd-error':['1'],'svd-recover':['2','0']};
test.describe('II.19: SVD',()=>{
 test('four factor views, exact classification and approximate inspectors share canonical state',async({page})=>{
  const s=await open(page);await expect(s.locator('[data-scene]')).toHaveCount(4);await expect(s).toHaveAttribute('data-rank','2');await expect(s).toHaveAttribute('data-result-x','4');await expect(s).toHaveAttribute('data-result-y','1');
  for(const id of ['sigma-1','sigma-2','U','Vt','reconstruction-error','u-orthogonality','v-orthogonality'])await expect(s.locator(`[data-quantity="${id}"]`)).toHaveAttribute('data-status','approximate');
  await expect(s.locator('[data-part="rank-one-image"]')).toHaveCount(1);await expect(s.locator('[data-part="discarded-component"]')).toHaveCount(1);
  const initial=await state(s);await s.locator('[data-param="x1"] input').press('ArrowUp');expect((await state(s)).x1).toBe(1.5);await expect(s.locator('[data-announcement]')).not.toBeEmpty();
  await entry(s,'a12','0.25');expect((await state(s)).a12).toBe(.25);await expect(s).toHaveAttribute('data-result-x','4.75');
  for(const value of ['9','0.001','NaN','1/0']){const input=await entry(s,'a12',value);await expect(input).toHaveAttribute('aria-invalid','true');expect((await state(s)).a12).toBe(.25);}
  await s.locator('[data-param="a12"] input').press('Escape');await s.locator('[data-action="reset"]').click();expect(await state(s)).toEqual(initial);
 });
 test('mouse and keyboard synchronize all factor geometry with direct multiplication',async({page})=>{
  const s=await open(page),plot=s.locator('[data-scene="0"]'),handle=plot.locator('[data-handle]');await plot.locator('svg').evaluate(e=>e.scrollIntoView({block:'center'}));
  await handle.press('ArrowRight');await expect(s.locator('[data-announcement]')).not.toBeEmpty();
  const hit=(await handle.locator('.hit').boundingBox())!,box=(await plot.locator('svg').boundingBox())!,radius=Number(await plot.getAttribute('data-radius')),scale=Math.min(box.width,box.height)/(2*radius);
  await page.mouse.move(hit.x+hit.width/2,hit.y+hit.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-.5*scale,box.y+box.height/2-1.5*scale,{steps:8});await page.mouse.up();
  expect((await state(s)).x1).toBe(-.5);expect((await state(s)).x2).toBe(1.5);await expect(s).toHaveAttribute('data-result-x','0');await expect(s).toHaveAttribute('data-result-y','1.5');
  const output=s.locator('[data-scene="3"]'),actual=await output.locator('[data-part="vector-3"] path').evaluate(el=>{const p=el as SVGPathElement,q=p.getPointAtLength(0),v=new DOMPoint(q.x,q.y).matrixTransform(p.getScreenCTM()!);return{x:v.x,y:v.y};});
  const finalBox=(await output.locator('svg').boundingBox())!,r=Number(await output.getAttribute('data-radius')),k=Math.min(finalBox.width,finalBox.height)/(2*r);
  expect(Math.abs(actual.x-(finalBox.x+finalBox.width/2))).toBeLessThan(1.5);expect(Math.abs(actual.y-(finalBox.y+finalBox.height/2-1.5*k))).toBeLessThan(1.5);
  expect(new Set(await s.locator('[data-scene]').evaluateAll(es=>es.map(e=>e.getAttribute('data-radius')))).size).toBe(1);
 });
 test('touch commits once on release through a 44px target',async({page,context,isMobile})=>{
  test.skip(!isMobile,'touch emulation runs on mobile');const s=await open(page),plot=s.locator('[data-scene="0"]'),handle=plot.locator('[data-handle]');await plot.locator('svg').evaluate(e=>e.scrollIntoView({block:'center'}));
  const hit=(await handle.locator('.hit').boundingBox())!,box=(await plot.locator('svg').boundingBox())!,radius=Number(await plot.getAttribute('data-radius')),scale=Math.min(box.width,box.height)/(2*radius);expect(hit.width).toBeGreaterThanOrEqual(44);
  const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hit.x+hit.width/2,y:hit.y+hit.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2-.5*scale,y:box.y+box.height/2-1.5*scale}]});await expect(s.locator('[data-announcement]')).toBeEmpty();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();expect((await state(s)).x1).toBe(-.5);expect((await state(s)).x2).toBe(1.5);await expect(s.locator('[data-announcement]')).not.toBeEmpty();
 });
 test('semantic replay inspects each intermediate vector, scrubs and reverses',async({page})=>{
  await open(page);const work=page.locator('[data-stage="completion-worked-svd"]'),trace=work.locator('[data-trace-index]');await expect(work).toHaveAttribute('data-hydrated','true');
  for(const title of ['Input: the unit circle','1. Vᵀ: rotate / reflect','2. Σ: perpendicular scaling','3. U: rotate / reflect']){await work.getByRole('button',{name:/^Next/}).click();await expect(work.locator('[data-trace-index] h3')).toHaveText(title);}
  await work.getByRole('button',{name:/Previous/}).click();await expect(trace).toHaveAttribute('data-trace-index','3');await work.getByRole('slider').press('ArrowLeft');await expect(trace).toHaveAttribute('data-trace-index','2');
  await work.locator('[data-action="play"]').click();await expect(trace).toHaveAttribute('data-trace-index','3',{timeout:5000});await work.locator('[data-action="play"]').click();
 });
 test('zero, rank one, repeated, reflection and ill-conditioned cases stay truthful',async({page})=>{
  const s=await open(page);await s.locator('[data-preset="rank-one"]').click();await expect(s).toHaveAttribute('data-rank','1');await expect(s.locator('[data-verdict]')).toContainText('segment');await expect(s.locator('[data-quantity="sigma-2"]')).toContainText('0');
  await s.locator('[data-preset="zero"]').click();await expect(s).toHaveAttribute('data-rank','0');await expect(s.locator('[data-verdict]')).toContainText('origin');await expect(s.locator('[data-quantity="recovered"]')).toHaveAttribute('data-status','approximate');
  for(const preset of ['repeated','reflection']){await s.locator(`[data-preset="${preset}"]`).click();await expect(s.locator('[data-verdict]')).toContainText('not mathematically unique');await expect(s).toHaveAttribute('data-status','verified');}
  await s.locator('[data-preset="near"]').click();await expect(s).toHaveAttribute('data-rank','2');await expect(s.locator('[data-verdict]')).toContainText('Ill-conditioned');await expect(s.locator('[data-quantity="sigma-2"]')).not.toContainText('≈0');
 });
 test('five graded exercises explain mistakes and accept independent literal answers',async({page})=>{
  await open(page);const all=page.locator('[data-exercise]');await expect(all).toHaveCount(5);
  for(const e of await all.all()){const radios=e.locator('input[type="radio"]'),inputs=e.locator('[data-field]');if(await radios.count())await radios.nth(1).check();else for(const input of await inputs.all())await input.fill('999');
   await e.locator('[data-action="check"]').click();await expect(e).toHaveAttribute('data-result','incorrect');await e.locator('[data-action="show-solution"]').click();await expect(e.locator('[data-solution]')).toBeVisible();await e.locator('[data-action="reset-exercise"]').click();
   if(await radios.count())await radios.first().check();else for(const[i,v]of answers[(await e.getAttribute('data-exercise'))!]!.entries())await inputs.nth(i).fill(v);await e.locator('[data-action="check"]').click();await expect(e).toHaveAttribute('data-result','correct');
  }
 });
 for(const theme of ['light','dark']as const)test.describe(theme,()=>{
  test.use({colorScheme:theme});test('singular, ill-conditioned and invalid states remain accessible',async({page})=>{
   const s=await open(page),scan=async()=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);
   for(const preset of ['rank-one','near']){await s.locator(`[data-preset="${preset}"]`).click();await scan();}await entry(s,'a11','9');await scan();
  });
 });
});
