import { expect,test } from '@playwright/test';
const cases=[['VI.1','objective-landscapes','landscapes','absolute'],['VI.2','local-global-optima','optima','flat'],['VI.3','convexity','convexity','well'],['VI.4','gradient-descent','descent','well']] as const;
for(const [id,slug,chapter,preset] of cases)test(`${id}: opening and exceptional optimizer state`,async({page})=>{
 await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="optimization-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');
 await expect(s.locator('[data-scene="profile"]')).toHaveAttribute('data-window',JSON.stringify({xMin:-3.5,xMax:3.5,yMin:-3,yMax:4}));
 await expect(s.locator('[data-part="axis-slice-loss"]')).toHaveCount(1);await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:'html{scroll-padding:0!important}.topbar{position:static!important;backdrop-filter:none!important}.skip-link{visibility:hidden!important}*{caret-color:transparent!important}'});
 const capture=async(suffix:string)=>{await page.evaluate(()=>(document.activeElement as HTMLElement|null)?.blur());await page.mouse.move(0,0);await s.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await expect(s).toHaveScreenshot(`vi-${slug}${suffix}.png`);};
 await capture('');await s.locator(`[data-preset="${preset}"]`).click();await capture(`-${preset}`);
});
