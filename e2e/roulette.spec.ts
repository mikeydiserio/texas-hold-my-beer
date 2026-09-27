import {test,expect,type Page} from '@playwright/test';

async function outcome(page:Page,n:number){
  // Stub only the three game draws, restoring native randomness before route navigation.
  await page.evaluate(number=>{
    const native=crypto.getRandomValues.bind(crypto),values=[number,0x70000000,0x40000000];
    Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:(array:Uint32Array)=>{
      if(array instanceof Uint32Array&&array.length===1&&values.length){array[0]=values.shift()!;if(!values.length)Object.defineProperty(crypto,'getRandomValues',{value:native});return array;}return native(array);
    }});
  },n);
}
test('roulette renders in 3D, animates into the correct pocket, settles and rebets',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByRole('navigation',{name:'Choose a game'}).getByRole('link')).toHaveCount(4);await page.screenshot({path:'artifacts/four-games.png',fullPage:true,animations:'disabled'});
  await page.getByRole('link',{name:'Roulette',exact:true}).click();await expect(page.locator('.roulette-canvas[data-render-ready=true]')).toBeVisible({timeout:45000});await expect(page.locator('.roulette-canvas canvas')).toBeVisible();
  await page.waitForTimeout(900);const canvas=page.locator('.roulette-canvas canvas'),box=await canvas.boundingBox();
  await canvas.click({position:{x:box!.width*.66,y:box!.height*.5}});await expect(page.locator('.roulette-bank strong')).toHaveText('975');await page.getByRole('button',{name:'Clear',exact:true}).click();
  await page.getByRole('button',{name:'Bet on 17',exact:true}).click();await page.getByRole('button',{name:'Bet on Black',exact:true}).click();await expect(page.locator('.roulette-bank strong')).toHaveText('950');
  await page.getByRole('button',{name:'Undo last chip'}).click();await expect(page.locator('.roulette-bank strong')).toHaveText('975');await page.getByRole('button',{name:'Bet on Black',exact:true}).click();
  await page.screenshot({path:'artifacts/roulette-desktop.png',fullPage:true});await outcome(page,17);await page.getByRole('button',{name:'Spin · 50',exact:true}).click();await expect(page.getByRole('status')).toHaveText('No more bets');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeDisabled();
  await expect(page.locator('.roulette-canvas')).toHaveAttribute('data-ball-settled','false');await page.waitForTimeout(3000);await page.screenshot({path:'artifacts/roulette-spinning.png',fullPage:true});
  await expect(page.locator('.roulette-canvas')).toHaveAttribute('data-pocket','17',{timeout:20000});await expect(page.getByRole('status')).toContainText('Returned 950');await expect(page.locator('.roulette-bank strong')).toHaveText('1,900');
  await page.screenshot({path:'artifacts/roulette-result.png',fullPage:true});
  await page.getByRole('link',{name:'Game menu'}).click();await page.getByRole('link',{name:'Roulette',exact:true}).click();await expect(page.locator('.roulette-bank strong')).toHaveText('1,900');
  await page.getByRole('button',{name:'Rebet',exact:true}).click();await expect(page.locator('.roulette-bank strong')).toHaveText('1,850');await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.locator('.roulette-bank strong')).toHaveText('1,900');
  await page.getByRole('button',{name:'Inspect roulette table'}).click();await expect(page.getByRole('button',{name:'Reset camera'})).toBeVisible();await page.getByRole('button',{name:'Reset camera'}).click();expect(errors).toEqual([]);
});
test('mobile zero outcome, fresh outcomes, reduced motion and keyboard betting',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/roulette');await expect(page.locator('.roulette-canvas[data-render-ready=true]')).toBeVisible({timeout:45000});
  const zero=page.getByRole('button',{name:'Bet on 0',exact:true});await zero.focus();await page.keyboard.press('Enter');await outcome(page,0);await page.getByRole('button',{name:'Spin · 25'}).click();await expect(page.getByRole('status')).toContainText('Returned 900');await expect(page.locator('.roulette-canvas')).toHaveAttribute('data-pocket','0');
  await page.getByRole('button',{name:'Rebet',exact:true}).click();await outcome(page,32);await page.getByRole('button',{name:'Spin · 25'}).click();await expect(page.locator('.roulette-canvas')).toHaveAttribute('data-pocket','32');await expect(page.getByRole('status')).toContainText('No win');
  await page.screenshot({path:'artifacts/roulette-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'How to play'}).click();await expect(page.getByRole('dialog')).toContainText('repeats are possible');await page.keyboard.press('Escape');
});
