import {test,expect} from '@playwright/test';
import {cardLabel} from '../src/game/cards';
import {dealSolitaire,legalMoves,pileCards} from '../src/games/solitaire';
import {blackjackReducer,initialBlackjack,total,canSplit} from '../src/games/blackjack';
test('menu opens every game; blackjack deals, resolves, and keeps the table on navigation',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  let seed=1;while(true){const g=blackjackReducer(initialBlackjack,{type:'deal',bet:50,seed});if(total(g.dealer).value!==21&&total(g.hands[0].cards).value!==21)break;seed++;}
  await page.addInitScript(seed=>{const native=crypto.getRandomValues.bind(crypto);Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:(array:Uint32Array)=>{if(array instanceof Uint32Array&&array.length===1){array[0]=seed;Object.defineProperty(crypto,'getRandomValues',{value:native});return array;}return native(array);}});},seed);
  await page.goto('/');await expect(page.getByRole('navigation',{name:'Choose a game'}).getByRole('link')).toHaveCount(4);
  await page.screenshot({path:'artifacts/menu-desktop.png',fullPage:true,animations:'disabled'});
  await page.getByRole('link',{name:'Blackjack',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Blackjack'})).toBeVisible();
  await page.getByRole('button',{name:'Bet 50 chips'}).click();await page.getByRole('button',{name:'Deal · 50'}).click();
  await expect(page.locator('.bj-balance')).toContainText('950');
  await expect(page.locator('.dealer-hand .club-card.is-down')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Stand',exact:true})).toBeEnabled();
  await page.screenshot({path:'artifacts/blackjack-desktop.png',fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Stand',exact:true}).click();
  await expect(page.locator('.bj-outcome')).toBeVisible({timeout:15000});await expect(page.locator('.dealer-hand .club-card.is-down')).toHaveCount(0);
  const balance=await page.locator('.bj-balance strong').innerText();
  await page.getByRole('link',{name:'Game menu'}).click();await page.getByRole('link',{name:'Blackjack',exact:true}).click();await expect(page.locator('.bj-balance strong')).toHaveText(balance);
  await page.getByRole('link',{name:'Game menu'}).click();await page.getByRole('link',{name:'Texas Hold’em',exact:true}).click();await expect(page.getByRole('button',{name:'Take a seat',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Game menu'}).click();await expect(page.getByRole('link',{name:'Solitaire',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('solitaire draw, undo, click moves, drag, hints, help and new deal',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  let seed=1;while(!legalMoves(dealSolitaire(seed)).some(m=>m.from.type==='tableau'&&m.to.type==='tableau'))seed++;
  await page.addInitScript(seed=>{const native=crypto.getRandomValues.bind(crypto);Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:(array:Uint32Array)=>{if(array instanceof Uint32Array&&array.length===1){array[0]=seed;Object.defineProperty(crypto,'getRandomValues',{value:native});return array;}return native(array);}});},seed);
  await page.goto('/solitaire');await expect(page.getByRole('button',{name:'Draw card, 24 remaining'})).toBeVisible();
  await page.screenshot({path:'artifacts/solitaire-desktop.png',fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Draw card, 24 remaining'}).click();await expect(page.getByRole('button',{name:'Draw card, 23 remaining'})).toBeVisible();
  await page.getByRole('link',{name:'Game menu'}).click();await page.getByRole('link',{name:'Solitaire',exact:true}).click();await expect(page.getByRole('button',{name:'Draw card, 23 remaining'})).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByRole('button',{name:'Draw card, 24 remaining'})).toBeVisible();
  const game=dealSolitaire(seed),move=legalMoves(game).find(m=>m.from.type==='tableau'&&m.to.type==='tableau')!;
  const card=pileCards(game,move.from)[move.from.offset],targetCards=pileCards(game,move.to),target=page.locator(`[data-card="${targetCards.at(-1)}"]`),source=page.locator(`[data-card="${card}"]`);
  await source.click();await target.click();await expect(page.locator('.solitaire-stats')).toContainText('1 move');
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('.solitaire-stats')).toContainText('0 moves');
  await page.waitForTimeout(450);const from=await source.boundingBox(),to=await target.boundingBox();
  await page.mouse.move(from!.x+from!.width/2,from!.y+12);await page.mouse.down();await page.mouse.move(to!.x+to!.width/2,to!.y+to!.height/2,{steps:14});await page.mouse.up();
  await expect(page.locator('.solitaire-stats')).toContainText('1 move');
  await page.keyboard.press('Control+z');await expect(page.locator('.solitaire-stats')).toContainText('0 moves');
  await page.getByRole('button',{name:'Hint',exact:true}).click();await expect(page.getByRole('status')).toContainText('Move');
  await page.getByRole('button',{name:'How to play'}).click();await expect(page.getByRole('dialog')).toContainText('Draw-one Klondike');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'New deal',exact:true}).click();await page.getByRole('button',{name:'Keep playing'}).click();await expect(source).toHaveAttribute('aria-label',`${cardLabel(card)}, column ${(move.from as {index:number}).index+1}`);
  await page.getByRole('button',{name:'New deal',exact:true}).click();await page.getByRole('button',{name:'Deal again'}).click();await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();expect(errors).toEqual([]);
});
test('mobile menu and games fit the viewport with reduced motion',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  for(const route of ['/','/blackjack','/solitaire']){await page.goto(route);await page.screenshot({path:`artifacts/${route.slice(1)||'menu'}-mobile.png`,fullPage:true,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.getByRole('button',{name:'Draw card, 24 remaining'}).click();await expect(page.getByRole('button',{name:'Draw card, 23 remaining'})).toBeVisible();
  await page.getByRole('link',{name:'Game menu'}).click();await page.getByRole('link',{name:'Blackjack',exact:true}).click();await page.getByRole('button',{name:'Deal · 25'}).click();await expect(page.locator('.player-hand .bj-card-deal')).toHaveCount(2);
});
test('blackjack split and double play both hands with the correct wagers',async({page})=>{
  let seed=1;
  while(true){let g=blackjackReducer(initialBlackjack,{type:'deal',bet:25,seed});g=blackjackReducer(g,{type:'ready'});if(canSplit(g)){g=blackjackReducer(g,{type:'split'});if(g.phase==='player'&&g.active===0&&g.hands.every(h=>!h.done))break;}seed++;}
  await page.addInitScript(seed=>{const native=crypto.getRandomValues.bind(crypto);Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:(array:Uint32Array)=>{if(array instanceof Uint32Array&&array.length===1){array[0]=seed;Object.defineProperty(crypto,'getRandomValues',{value:native});return array;}return native(array);}});},seed);
  await page.goto('/blackjack');await page.getByRole('button',{name:'Deal · 25'}).click();await expect(page.getByRole('button',{name:'Split',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Split',exact:true}).click();await expect(page.locator('.player-hand')).toHaveCount(2);await expect(page.locator('.bj-balance strong')).toHaveText('950');
  await page.getByRole('button',{name:'Double',exact:true}).click();await expect(page.locator('.player-hand').first().locator('.wager-chip')).toHaveText('50');await expect(page.locator('.player-hand').nth(1)).toHaveClass(/active-hand/);await expect(page.locator('.bj-balance strong')).toHaveText('925');
  await page.getByRole('button',{name:'Stand',exact:true}).click();await expect(page.locator('.bj-outcome')).toBeVisible({timeout:15000});await expect(page.getByRole('button',{name:/Deal ·/})).toBeVisible();
});
