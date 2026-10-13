import { expect,test,type Locator,type Page } from '@playwright/test';

// All URLs are relative so the same Part suite works at root and the mounted production base.
const routes={pipeline:'what-machine-learning-learns',features:'samples-features-labels-targets',tasks:'learning-problems',split:'training-validation-testing',optimization:'parameters-loss-optimization',capacity:'underfitting-overfitting-baselines'};
const field=(root:Locator,label:string)=>root.getByRole('textbox',{name:new RegExp('^'+label)});
const shown=(v:number)=>String(Number(v.toFixed(4))+0).replace('-','−');
async function open(page:Page,kind:keyof typeof routes){
  await page.goto('chapters/'+routes[kind]+'/');
  const root=page.locator(kind==='optimization'?'[data-regression]':'[data-'+(kind==='tasks'?'task':kind)+']');
  await expect(root).toBeVisible();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  return root;
}
async function commit(root:Locator,label:string,value:string){
  await field(root,label).fill(value);await field(root,label).press('Enter');
}
async function capacitySnapshot(root:Locator){
  return root.evaluate(element=>{
    const numeric=(node:Element,name:string)=>{
      const value=node.getAttribute(name);return value==='undefined'||value==='hidden'||value===null?null:Number(value);
    };
    return {degree:Number(element.getAttribute('data-degree')),baseline:numeric(element,'data-baseline'),
      coefficients:JSON.parse(element.getAttribute('data-coefficients')!) as number[]|null,
      trainingIds:JSON.parse(element.getAttribute('data-training-ids')!) as string[],
      rows:[...element.querySelectorAll('[data-row-id]')].map(row=>({
        id:row.getAttribute('data-row-id')!,partition:row.getAttribute('data-partition')!,
        x:Number(row.getAttribute('data-x')),y:numeric(row,'data-y'),
        prediction:numeric(row,'data-prediction'),residual:numeric(row,'data-residual'),squared:numeric(row,'data-squared-error'),
      })),
      metrics:[...element.querySelectorAll('[data-value]')].map(node=>({key:node.getAttribute('data-value')!,value:numeric(node,'data-number'),text:node.textContent!})),
    };
  });
}
// Independent normal equations are used only for well-conditioned browser cases degree ≤ 2.
// Higher-degree oracle independence is covered by Fraction/SVD goldens, not by this DOM calculation.
function momentFit(rows:{x:number;y:number|null}[],degree:number){
  const d=degree+1,m=Array.from({length:d},(_,j)=>[...Array.from({length:d},(_,k)=>rows.reduce((s,r)=>s+r.x**(j+k),0)),rows.reduce((s,r)=>s+r.y!*r.x**j,0)]);
  for(let j=0;j<d;j++){
    const pivot=m[j]![j]!;
    for(let k=j;k<=d;k++)m[j]![k]=m[j]![k]!/pivot;
    for(let i=0;i<d;i++)if(i!==j){const scale=m[i]![j]!;for(let k=j;k<=d;k++)m[i]![k]=m[i]![k]!-scale*m[j]![k]!;}
  }
  return m.map(row=>row[d]!);
}
async function capacityParity(root:Locator){
  const snapshot=await capacitySnapshot(root),train=snapshot.rows.filter(r=>r.partition==='train');
  expect(snapshot.trainingIds).toEqual(train.map(r=>r.id));
  if(train.length){
    const mean=train.reduce((sum,r)=>sum+r.y!,0)/train.length;
    expect(snapshot.baseline).toBeCloseTo(mean,11);
    if(snapshot.coefficients&&snapshot.degree<=2){
      const independentlyFitted=momentFit(train,snapshot.degree);
      snapshot.coefficients.forEach((value,j)=>expect(value).toBeCloseTo(independentlyFitted[j]!,9));
    }
  }else expect(snapshot.baseline).toBeNull();
  for(const row of snapshot.rows){
    const visible=row.y!==null;if(!visible)continue;
    const cells=root.locator('[data-row-id="'+row.id+'"] td');
    await expect(cells.nth(1)).toHaveText(String(row.x));await expect(cells.nth(2)).toHaveText(String(row.y));
    if(snapshot.coefficients){
      const prediction=snapshot.coefficients.reduce((sum,c,j)=>sum+c*row.x**j,0),residual=prediction-row.y!;
      expect(row.prediction).toBeCloseTo(prediction,9);expect(row.residual).toBeCloseTo(residual,9);expect(row.squared).toBeCloseTo(residual**2,8);
      await expect(cells.nth(3)).toHaveText('≈ '+shown(row.prediction!));await expect(cells.nth(4)).toHaveText('≈ '+shown(row.residual!));
    }else{
      expect(row.prediction).toBeNull();await expect(cells.nth(3)).toHaveText('Undefined');
    }
  }
  for(const metric of snapshot.metrics){
    const partition=metric.key.split('-')[0]!,data=snapshot.rows.filter(row=>row.partition===partition);
    if(partition==='test'&&data.some(r=>r.y===null))continue;
    const squared=metric.key.includes('baseline')?
      (snapshot.baseline===null?null:data.reduce((s,r)=>s+(snapshot.baseline!-r.y!)**2,0)):
      (snapshot.coefficients===null?null:data.reduce((s,r)=>s+r.squared!,0));
    const expected=squared===null||!data.length?null:squared/data.length;
    if(expected===null)expect(metric.value).toBeNull();else expect(metric.value).toBeCloseTo(expected,9);
    if(metric.text.startsWith('Reveal'))continue;
    expect(metric.text).toBe(expected===null?'Undefined':'≈ '+shown(metric.value!));
  }
  expect(Number(await field(root,'Polynomial degree').inputValue())).toBe(snapshot.degree);
  const annotation=await root.locator('.formula annotation').textContent();
  expect(annotation).toContain('\\sum_{j=0}^{'+snapshot.degree+'}');
  expect(await root.locator('.inspector dd').nth(1).textContent()).toBe(train.length+' × '+(snapshot.degree+1));
  return snapshot;
}

test('pipeline keyboard numeric commits retain focus, repeat and tab normally',async({page})=>{
  const root=await open(page,'pipeline'),weight=field(root,'Weight w');
  await weight.focus();
  await page.keyboard.press('ArrowUp');await expect(weight).toBeFocused();
  await page.keyboard.press('ArrowUp');await expect(weight).toBeFocused();
  expect(Number(await weight.inputValue())).toBeCloseTo(.7,12);
  await expect(root).toHaveAttribute('data-weight',String(.5+.1+.1));
  await weight.fill('0.1234567');await page.keyboard.press('Enter');await expect(weight).toBeFocused();
  await page.keyboard.press('Tab');await expect(field(root,'Bias b')).toBeFocused();
  await expect(root.locator('[data-announcement]')).toContainText('Weight 0.1234567');
  await root.getByRole('combobox',{name:'Mode',exact:true}).selectOption('inference');
  await commit(root,'Query x','1.23456789');
  const predicted=.1234567*1.23456789;
  expect(Number(await root.locator('[data-value=prediction]').getAttribute('data-number'))).toBeCloseTo(predicted,12);
  await expect(root.locator('[data-value=residual]')).toHaveText('Undefined');
  await expect(root).toHaveAttribute('data-loss-scope','inference-query');
  await expect(root.locator('.p01-metrics dt')).toHaveText(['Inference query prediction','Inference query residual','Inference query loss · no observed target']);
  await expect(root.getByRole('combobox',{name:'Selected observation',exact:true})).toHaveCount(0);
  const stored=await root.locator('[data-row-id]').evaluateAll(nodes=>nodes.map(n=>({x:Number(n.getAttribute('data-x')),y:Number(n.getAttribute('data-y'))})));
  const batchMSE=stored.reduce((sum,r)=>sum+(.1234567*r.x-r.y)**2,0)/stored.length;
  expect(Number(await root.locator('[data-stored-batch-mse]').getAttribute('data-stored-batch-mse'))).toBeCloseTo(batchMSE,11);
  await expect(root.locator('[data-value=mse]')).toHaveText('Undefined');
  await expect(root.getByRole('button',{name:'Apply one update'})).toBeDisabled();
});

test('pipeline rejects numeric errors and every historical state drives the controls and rows',async({page})=>{
  const root=await open(page,'pipeline');
  await commit(root,'Weight w','99');await expect(field(root,'Weight w')).toHaveAttribute('aria-invalid','true');
  await expect(root).toHaveAttribute('data-weight','0.5');
  await root.getByRole('button',{name:'Reset experiment'}).click();
  await root.getByRole('button',{name:'Replay pipeline'}).click();
  const nav=root.getByRole('navigation',{name:'Trace playback'});
  for(let i=0;i<5;i++){
    await expect(root).toHaveAttribute('data-frame-index',String(i));
    const weight=i===4?1.02:.5,bias=i===4?.16:0;
    expect(Number(await field(root,'Weight w').inputValue())).toBeCloseTo(weight,12);
    expect(Number(await field(root,'Bias b').inputValue())).toBeCloseTo(bias,12);
    expect(Number(await root.getAttribute('data-mse'))).toBeCloseTo(i===4?1.7064:4.1,12);
    for(const row of await root.locator('[data-row-id]').evaluateAll(nodes=>nodes.map(n=>({x:Number(n.getAttribute('data-x')),y:Number(n.getAttribute('data-y')),p:Number(n.getAttribute('data-prediction')),r:Number(n.getAttribute('data-residual'))})))){
      expect(row.p).toBeCloseTo(weight*row.x+bias,12);expect(row.r).toBeCloseTo(row.p-row.y,12);
    }
    if(i<4)await nav.getByRole('button',{name:'Next',exact:true}).click();
  }
  await commit(root,'Weight w','.75');await expect(nav).toHaveCount(0);expect(Number(await field(root,'Bias b').inputValue())).toBeCloseTo(.16,12);
});

test('feature edits retain full precision, reject fractional counts and expose absent targets',async({page})=>{
  const root=await open(page,'features');
  await commit(root,'Study time','0.123456789');
  await expect(root.locator('[data-row-id=r1] [data-feature-index="0"]')).toHaveText('0.123456789');
  await expect(root.locator('[data-announcement]')).toContainText('Study time 0.123456789 hours');
  await root.getByRole('combobox',{name:'Selected feature',exact:true}).selectOption('1');
  await commit(root,'Practice tasks','2.5');await expect(field(root,'Practice tasks')).toHaveAttribute('aria-invalid','true');
  await expect(root.locator('[data-row-id=r1] [data-feature-index="1"]')).toHaveText('0');
  await commit(root,'Sample count n','6');await commit(root,'Feature count d','3');
  await expect(root.locator('.inspector dd').nth(0)).toHaveText('6 × 3');
  await root.getByRole('combobox',{name:'Target meaning',exact:true}).selectOption('none');
  await expect(root.locator('.inspector dd').nth(2)).toHaveText('Absent');
  await expect(root.locator('[data-row-id] td:last-child')).toHaveText(Array(6).fill('Absent'));
  await root.getByRole('button',{name:'Reset experiment'}).click();
  await expect(root).toHaveAttribute('data-n','4');await expect(root).toHaveAttribute('data-d','2');
});

test('task decisions use semantic target codes and grade misconceptions',async({page})=>{
  const root=await open(page,'tasks');
  await root.getByRole('combobox',{name:'Problem',exact:true}).selectOption('binary-code');
  await root.getByRole('combobox',{name:'Learning task',exact:true}).selectOption('regression');
  await expect(root).toHaveAttribute('data-correct','false');
  await root.getByRole('combobox',{name:'Learning task',exact:true}).selectOption('classification');
  await expect(root).toHaveAttribute('data-correct','true');
  await root.getByRole('combobox',{name:'Problem',exact:true}).selectOption('proportion');
  await root.getByRole('combobox',{name:'Learning task',exact:true}).selectOption('regression');
  await expect(root).toHaveAttribute('data-correct','true');
  const question=page.locator('[data-exercise=iii03-q1]');
  await question.getByRole('radio',{name:'Regression because storage is numeric',exact:true}).check();
  await question.getByRole('button',{name:'Check answer'}).click();await expect(question.getByRole('status')).toContainText('Try again.');
  await question.getByRole('radio',{name:'Classification because the targets are category identifiers',exact:true}).check();
  await question.getByRole('button',{name:'Check answer'}).click();await expect(question.getByRole('status')).toContainText('Correct.');
});

test('group assignment preserves IDs and exposes leakage, seed replay and empty means',async({page})=>{
  const root=await open(page,'split'),handle=root.locator('[data-sample-id=g1-a]');
  await handle.focus();await page.keyboard.press('ArrowLeft');
  await expect(root.locator('[data-row-id=g1-a]')).toHaveAttribute('data-partition','validation');
  await expect(root.locator('[data-row-id=g1-b]')).toHaveAttribute('data-partition','validation');
  await expect(root.locator('[data-sample-id=g1-a]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');await expect(root.locator('[data-row-id=g1-a]')).toHaveAttribute('data-partition','train');
  await root.getByRole('checkbox',{name:'Keep groups together (repartitions)',exact:true}).uncheck();
  await root.getByRole('combobox',{name:'Destination for g1-a',exact:true}).selectOption('validation');
  await expect(root.locator('[data-leakage]')).toContainText('g1');
  await root.getByRole('button',{name:'Replay seeds'}).click();
  const nav=root.getByRole('navigation',{name:'Trace playback'});
  for(let i=0;i<4;i++){
    await expect(root).toHaveAttribute('data-frame-index',String(i));
    expect(Number(await field(root,'Split seed').inputValue())).toBe(42+i);
    await expect(root.locator('[data-row-id]')).toHaveCount(12);
    if(i<3)await nav.getByRole('button',{name:'Next',exact:true}).click();
  }
  await root.getByRole('combobox',{name:'Destination for g1-a',exact:true}).selectOption('test');
  await expect(nav).toHaveCount(0);
  const ids=await root.locator('[data-row-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-row-id')!));
  for(const id of ids)await root.getByRole('combobox',{name:'Destination for '+id,exact:true}).selectOption('validation');
  await expect(root).toHaveAttribute('data-baseline','undefined');
  await expect(root.locator('[data-value=train-mse]')).toHaveText('Undefined');
  await root.getByRole('button',{name:'Reset experiment'}).click();await expect(root).toHaveAttribute('data-seed','42');
});

test('pointer assignment and numeric destination fit the same active capacity rows',async({page})=>{
  const root=await open(page,'capacity'),before=await capacityParity(root);
  const handle=root.locator('[data-sample-id=p1]'),zone=root.locator('[data-partition-zone=validation]');
  await handle.scrollIntoViewIfNeeded();const h=(await handle.boundingBox())!;
  // Dropping on the visible destination header avoids depending on a tall zone center off-screen.
  const header=zone.getByRole('heading',{level:3});await header.scrollIntoViewIfNeeded();const z=(await header.boundingBox())!;
  await handle.scrollIntoViewIfNeeded();const start=(await handle.boundingBox())!;
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();
  await page.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:5});await page.mouse.up();
  await expect(root.locator('[data-row-id=p1]')).toHaveAttribute('data-partition','validation');
  const after=await capacityParity(root);expect(after.trainingIds).not.toContain('p1');expect(after.coefficients).not.toEqual(before.coefficients);
  expect(after.rows.map(r=>[r.id,r.x,r.y])).toEqual(before.rows.map(r=>[r.id,r.x,r.y]));
  await root.getByRole('combobox',{name:'Selected ID',exact:true}).selectOption('p1');
  await commit(root,'Partition index','0');await expect(root.locator('[data-row-id=p1]')).toHaveAttribute('data-partition','train');
  await capacityParity(root);
  expect(h.width).toBeGreaterThanOrEqual(44);
});

test('capacity numeric commits preserve focus and reject bad degree/seed/partition',async({page})=>{
  const root=await open(page,'capacity'),degree=field(root,'Polynomial degree');
  await degree.focus();await page.keyboard.press('ArrowDown');await expect(degree).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect(degree).toBeFocused();
  await expect(root).toHaveAttribute('data-degree','0');await capacityParity(root);
  for(const [label,value] of [['Polynomial degree','2.5'],['Noise seed','4294967296'],['Partition index','.5']]){
    await commit(root,label!,value!);await expect(field(root,label!)).toHaveAttribute('aria-invalid','true');
  }
  await expect(root).toHaveAttribute('data-degree','0');await expect(root.locator('[data-row-id=p1]')).toHaveAttribute('data-partition','train');
  await root.getByRole('button',{name:'Reset experiment'}).click();await expect(root.locator('[aria-invalid=true]')).toHaveCount(0);
});

test('capacity replay drives every frame and edits begin at the displayed memberships',async({page})=>{
  const root=await open(page,'capacity');
  await root.getByRole('combobox',{name:'Destination for p1',exact:true}).selectOption('validation');
  const training=(await capacityParity(root)).trainingIds;
  await root.getByRole('button',{name:'Replay degrees 0, 2, 8'}).click();
  const nav=root.getByRole('navigation',{name:'Trace playback'});
  for(const [i,degree] of [0,2,8].entries()){
    const state=await capacityParity(root);
    expect(state.degree).toBe(degree);expect(state.trainingIds).toEqual(training);
    await expect(root).toHaveAttribute('data-frame-index',String(i));
    if(i<2)await nav.getByRole('button',{name:'Next',exact:true}).click();
  }
  await nav.getByRole('button',{name:'Previous',exact:true}).click();
  await commit(root,'Noise amplitude','0.25');await expect(nav).toHaveCount(0);
  const state=await capacityParity(root);expect(state.degree).toBe(2);expect(state.trainingIds).toEqual(training);
  await expect(root.locator('[data-announcement]')).toContainText('degree 2');
});

test('empty and deficient training memberships retain observations and display actual reasons',async({page})=>{
  const root=await open(page,'capacity');
  const ids=await root.locator('[data-row-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-row-id')!));
  for(const id of ids)await root.getByRole('combobox',{name:'Destination for '+id,exact:true}).selectOption('validation');
  await expect(root.locator('[data-fit-reason]')).toContainText('empty');await capacityParity(root);
  await root.getByRole('combobox',{name:'Destination for p9',exact:true}).selectOption('train');
  await expect(root.locator('[data-fit-reason]')).toContainText('distinct');await capacityParity(root);
  await commit(root,'Polynomial degree','0');await expect(root.locator('[data-fit-reason]')).toHaveCount(0);
  const state=await capacityParity(root);expect(state.coefficients).toEqual([1.5]);await expect(root.locator('[data-row-id]')).toHaveCount(17);
});

test('seeded memberships, honest/leaked baseline and validation-only selection remain distinct',async({page})=>{
  const root=await open(page,'capacity');
  await root.getByRole('button',{name:'Seeded memberships',exact:true}).click();
  await expect(root.locator('[data-value=test-mse]')).toHaveText('Reveal after choosing');
  await root.getByRole('button',{name:'Reveal test evaluation',exact:true}).click();
  const snapshot=await capacityParity(root);expect(snapshot.rows.filter(r=>r.partition==='test')).toHaveLength(4);
  await root.getByRole('checkbox',{name:'Compare a deliberately leaked whole-target baseline',exact:true}).check();
  await expect(root.locator('[data-leak-comparison]')).toContainText('Invalid comparison');
  const whole=snapshot.rows.reduce((sum,r)=>sum+r.y!,0)/snapshot.rows.length;
  const validation=snapshot.rows.filter(r=>r.partition==='validation'),leaked=validation.reduce((sum,r)=>sum+(whole-r.y!)**2,0)/validation.length;
  expect(Number(await root.locator('[data-leaked-partition=validation]').getAttribute('data-number'))).toBeCloseTo(leaked,11);
  await root.getByRole('button',{name:'Choose degree by validation',exact:true}).click();
  await expect(root).toHaveAttribute('data-degree','2');
  await expect(root.locator('[data-value=test-mse]')).toHaveText('Reveal after choosing');
  await capacityParity(root);
});

test('plot labels, physical geometry, both themes and reduced motion remain readable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const root=await open(page,'capacity');await capacityParity(root);
  await expect(root.locator('[data-capacity-plane]')).toHaveAttribute('viewBox','0 0 640 400');
  for(const theme of ['light','dark']){
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await expect.poll(()=>root.locator('.p01-ticks text').evaluateAll(nodes=>nodes.every(node=>{
      const plot=node.closest('svg')!,scale=plot.getBoundingClientRect().width/640;
      const font=Number.parseFloat(getComputedStyle(node).fontSize);
      return font*scale>=13.99&&node.getBoundingClientRect().height>=11;
    }))).toBe(true);
  }
  const points=await root.locator('[data-point-id]').evaluateAll(nodes=>nodes.map(node=>{
    const box=node.getBoundingClientRect(),plot=node.closest('svg')!.getBoundingClientRect();
    return {id:node.getAttribute('data-point-id')!,x:(box.x+box.width/2-plot.x)*640/plot.width,y:(box.y+box.height/2-plot.y)*400/plot.height};
  }));
  const state=await capacitySnapshot(root);
  for(const point of points){
    const row=state.rows.find(row=>row.id===point.id)!;
    expect(point.x).toBeCloseTo(48+(row.x+1.1)*544/2.2,4);
    expect(point.y).toBeCloseTo(352-(row.y!+3)*304/7,4);
  }
  expect(await root.locator('[data-sample-id]').evaluateAll(nodes=>nodes.every(n=>{const box=n.getBoundingClientRect();return box.width>=44&&box.height>=44;}))).toBe(true);
  expect(await root.locator('[data-sample-id=p1]').evaluate(node=>getComputedStyle(node).touchAction)).toBe('none');
  expect(await root.locator('[data-capacity-plane]').evaluate(node=>getComputedStyle(node).touchAction)).toBe('auto');
  expect(await root.evaluate(node=>node.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
});

test('reset cancels a held membership drag before pointer release',async({page})=>{
  const root=await open(page,'capacity'),handle=root.locator('[data-sample-id=p1]');
  await handle.scrollIntoViewIfNeeded();const box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  const reset=root.getByRole('button',{name:'Reset experiment'});await reset.focus();await page.keyboard.press('Enter');
  const destination=root.locator('[data-partition-zone=validation]').getByRole('heading',{level:3});await destination.scrollIntoViewIfNeeded();
  const zone=(await destination.boundingBox())!;
  await page.mouse.move(zone.x+zone.width/2,zone.y+zone.height/2);await page.mouse.up();
  await expect(root.locator('[data-row-id=p1]')).toHaveAttribute('data-partition','train');await capacityParity(root);
});

test('III-05 reuses the accepted affine update with one required distinct island scope',async({page})=>{
  const root=await open(page,'optimization');
  await root.getByRole('button',{name:'Apply one update',exact:true}).click();
  expect(Number(await root.getAttribute('data-weight'))).toBeCloseTo(1.02,12);
  expect(Number(await root.getAttribute('data-bias'))).toBeCloseTo(.16,12);
  expect(Number(await root.getAttribute('data-mse'))).toBeCloseTo(1.7064,12);
  await expect(page.locator('[data-exercise]')).toHaveCount(5);
  await expect(page.locator('.code-file')).toHaveCount(2);
  expect(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);})).toEqual([]);
});
