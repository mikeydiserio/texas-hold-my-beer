import {describe,it,expect} from 'vitest';
import {BOARD_CELLS,WHEEL,boardBetAt,initialRoulette,makeSpin,numberColor,pocketAngle,randomPocket,returnMultiplier,rouletteReducer as act,spinPose,stakeTotal,validBet,type BetKey,type RouletteState} from './roulette';
describe('European roulette',()=>{
  it('has exactly one of every pocket and the correct colour distribution',()=>{
    expect([...WHEEL].sort((a,b)=>a-b)).toEqual(Array.from({length:37},(_,i)=>i));expect(WHEEL.filter(n=>numberColor(n)==='red')).toHaveLength(18);expect(WHEEL.filter(n=>numberColor(n)==='black')).toHaveLength(18);expect(numberColor(0)).toBe('green');
  });
  it('samples all 37 outcomes uniformly and rejects the biased tail',()=>{
    const counts=Array(37).fill(0);for(let i=0;i<3700;i++)counts[randomPocket(()=>i)]++;expect(counts).toEqual(Array(37).fill(100));
    const values=[0xffffffff,0xfffffffe,36];expect(randomPocket(()=>values.shift()!)).toBe(36);expect(values).toEqual([]);
    expect(randomPocket(()=>0)).toBe(0);expect(randomPocket(()=>0)).toBe(0);
  });
  it('uses fresh randomness for each spin, including animation variation',()=>{
    const values=[7,100000,200000,32,300000,400000];const read=()=>values.shift()!;
    const a=makeSpin(1,0,false,100,read),b=makeSpin(2,1,false,200,read);expect(a.number).toBe(7);expect(b.number).toBe(32);expect(a.duration).not.toBe(b.duration);expect(a.ballStart).not.toBe(b.ballStart);expect(values).toEqual([]);
  });
  it('pays straight, dozen, column and even-money bets including their stakes',()=>{
    expect(returnMultiplier('number:17',17)).toBe(36);expect(returnMultiplier('number:17',18)).toBe(0);
    expect(returnMultiplier('number:0',0)).toBe(36);
    for(let n=1;n<=36;n++){
      expect(returnMultiplier(`dozen:${Math.ceil(n/12)}`,n)).toBe(3);expect(returnMultiplier(`column:${(n-1)%3+1}`,n)).toBe(3);
      expect(returnMultiplier(numberColor(n) as BetKey,n)).toBe(2);expect(returnMultiplier(n%2?'odd':'even',n)).toBe(2);expect(returnMultiplier(n<=18?'low':'high',n)).toBe(2);
    }
    for(const key of ['red','black','even','odd','low','high','dozen:1','column:3'] as BetKey[])expect(returnMultiplier(key,0)).toBe(0);
  });
  it('rejects malformed keys and bets that cannot be funded',()=>{
    for(const key of ['number:37','number:-1','number:01','dozen:0','column:4','number:1.5','anything'])expect(validBet(key)).toBe(false);
    for(const amount of [-5,0,1,6,1005,NaN,Infinity])expect(act(initialRoulette,{type:'bet',key:'red',amount})).toBe(initialRoulette);
    expect(act(initialRoulette,{type:'bet',key:'number:37',amount:25})).toBe(initialRoulette);
  });
  it('escrows chips, undoes just the last placement, and clears without changing chip totals',()=>{
    let s=act(initialRoulette,{type:'bet',key:'red',amount:25});s=act(s,{type:'bet',key:'number:7',amount:100});expect(s.bank).toBe(875);expect(stakeTotal(s.bets)).toBe(125);
    s=act(s,{type:'undo'});expect(s.bank).toBe(975);expect(s.bets).toEqual([{key:'red',amount:25}]);s=act(s,{type:'clear'});expect(s.bank).toBe(1000);expect(s.bets).toEqual([]);
  });
  it('locks bets during a spin and settles once, against the correct spin id',()=>{
    let s=act(initialRoulette,{type:'bet',key:'number:7',amount:25});s=act(s,{type:'bet',key:'red',amount:25});s=act(s,{type:'spin',spin:makeSpin(1,0,false,100,()=>7)});
    for(const type of ['undo','clear','repeat','refill'] as const)expect(act(s,{type})).toBe(s);
    expect(act(s,{type:'bet',key:'black',amount:25})).toBe(s);expect(act(s,{type:'settle',id:2})).toBe(s);
    s=act(s,{type:'settle',id:1});expect(s.returned).toBe(950);expect(s.bank).toBe(1900);expect(s.history).toEqual([7]);expect(act(s,{type:'settle',id:1})).toBe(s);
    const cleared=act(s,{type:'clear'});expect(cleared.bank).toBe(1900);expect(cleared.bets).toEqual([]);
  });
  it('rebet reserves fresh chips; placing a new bet never replays settled stakes',()=>{
    let s=act(initialRoulette,{type:'bet',key:'red',amount:25});s=act(s,{type:'spin',spin:makeSpin(1,0,false,100,()=>0)});s=act(s,{type:'settle',id:1});expect(s.bank).toBe(975);
    const rebet=act(s,{type:'repeat'});expect(rebet.bank).toBe(950);expect(rebet.bets).toEqual([{key:'red',amount:25}]);expect(act(rebet,{type:'repeat'})).toBe(rebet);
    const next=act(s,{type:'bet',key:'black',amount:5});expect(next.bank).toBe(970);expect(next.bets).toEqual([{key:'black',amount:5}]);
  });
  it('allows a refill after losing the final chips and only then',()=>{
    const s:RouletteState={...initialRoulette,bank:0,phase:'settled',bets:[{key:'red',amount:1000}]};expect(act(s,{type:'refill'}).bank).toBe(1000);expect(act(s,{type:'refill'}).bets).toEqual([]);expect(act(initialRoulette,{type:'refill'})).toBe(initialRoulette);
  });
  it('finishes in the winning physical pocket for all 37 numbers, with continuous motion',()=>{
    for(const number of WHEEL){const spin={...makeSpin(1,.45,false,0,()=>1),number};const end=spinPose(spin,1);const relative=end.angle-end.wheel;
      expect(Math.sin(relative)).toBeCloseTo(Math.sin(pocketAngle(number)),10);expect(Math.cos(relative)).toBeCloseTo(Math.cos(pocketAngle(number)),10);expect(end.radius).toBeCloseTo(1.62,10);expect(end.height).toBeCloseTo(.235,10);
      let last=spinPose(spin,0);for(let i=1;i<=1000;i++){const pose=spinPose(spin,i/1000);expect(Number.isFinite(pose.angle)).toBe(true);expect(Math.abs(pose.radius-last.radius)).toBeLessThan(.03);expect(Math.abs(pose.angle-last.angle)).toBeLessThan(.2);last=pose;}
    }
  });
  it('maps every 3D betting cell to the same bet as its HTML control',()=>{
    expect(BOARD_CELLS).toHaveLength(49);for(const c of BOARD_CELLS){expect(boardBetAt(c.x+c.w/2,c.y+c.h/2)).toBe(c.key);expect(validBet(c.key)).toBe(true);}
    expect(boardBetAt(-.1,.3)).toBeUndefined();expect(boardBetAt(.5,1.1)).toBeUndefined();
  });
});
