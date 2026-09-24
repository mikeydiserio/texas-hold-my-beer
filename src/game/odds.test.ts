import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluator';
import { currentHand, handOdds, keyCards, oddsTip } from './odds';
import type { Card, LegalActions } from './types';
const legal=(p:Partial<LegalActions>):LegalActions=>({fold:true,check:false,call:true,bet:false,raise:true,allIn:true,toCall:0,callAmount:0,minRaiseTo:100,maxRaiseTo:1000,...p});
describe('hand odds',()=>{
  it('estimates pocket aces heads-up near their known 85% equity',()=>{
    const odds=handOdds(['As','Ah'],[],1,99,4000);
    expect(odds.equity).toBeGreaterThan(.82);expect(odds.equity).toBeLessThan(.88);
    expect(odds.win+odds.tie+odds.lose).toBeCloseTo(1,10);
  });
  it('loses equity as more opponents join',()=>{
    expect(handOdds(['Qd','Td'],[],5,7,2000).equity).toBeLessThan(handOdds(['Qd','Td'],[],1,7,2000).equity-.3);
  });
  it('is deterministic for a seed',()=>{expect(handOdds(['9c','8c'],['7c','2d','Kh'],3,42,500)).toEqual(handOdds(['9c','8c'],['7c','2d','Kh'],3,42,500));});
  it('treats an unbeatable river hand as a certain win with nothing left to improve',()=>{
    const odds=handOdds(['As','Ks'],['Qs','Js','Ts','2d','3c'],4,1,300);
    expect(odds).toMatchObject({win:1,tie:0,lose:0,equity:1,outs:null,improveChance:0,improvements:[]});
  });
  it('splits a board-only royal flush with everyone',()=>{
    const odds=handOdds(['2c','3d'],['As','Ks','Qs','Js','Ts'],2,5,200);
    expect(odds.tie).toBe(1);expect(odds.equity).toBeCloseTo(1/3,10);
  });
  it('wins uncontested pots outright',()=>{expect(handOdds(['2c','7d'],[],0,1)).toMatchObject({win:1,equity:1,samples:0});});
  it('counts only outs that use a hole card',()=>{
    // Nine hearts complete the flush; three aces and three kings pair a hole card. Queens only pair the board.
    const odds=handOdds(['Ah','Kh'],['2h','7h','Qc'],1,3,400);
    expect(odds.outs).toBe(15);
    expect(odds.improvements.map(i=>i.name)).toContain('Flush');
    expect(odds.improvements.find(i=>i.name==='Flush')!.chance).toBeGreaterThan(.28);
  });
});
describe('made hand helpers',()=>{
  it('drops kickers from key cards',()=>{
    expect(keyCards(evaluate(['Kd','Ks','4h','4c','Qd','2s','7h'] as Card[])).sort()).toEqual(['4c','4h','Kd','Ks']);
    expect(keyCards(evaluate(['Ad','9s','4h','7c','2d'] as Card[]))).toEqual(['Ad']);
    expect(keyCards(evaluate(['5d','6d','7d','8d','9s','Kc','2c'] as Card[]))).toHaveLength(5);
  });
  it('recognises only pocket pairs as made before the flop',()=>{
    expect(currentHand(['9s','9d'],[])).toMatchObject({category:1,key:['9s','9d']});
    expect(currentHand(['As','Kd'],[])).toMatchObject({category:0,key:[]});
  });
});
describe('tips',()=>{
  const odds=(equity:number,opponents=2,outs:number|null=null)=>({win:equity,tie:0,lose:1-equity,equity,opponents,samples:1,improveChance:0,improvements:[],outs});
  it('compares equity with the price of a call',()=>{
    expect(oddsTip(odds(.5),legal({toCall:100,callAmount:100}),300)).toMatch(/calling pays off/);
    expect(oddsTip(odds(.1),legal({toCall:100,callAmount:100}),300)).toMatch(/Folding is reasonable/);
    expect(oddsTip(odds(.25),legal({toCall:100,callAmount:100}),300)).toMatch(/Close spot/);
  });
  it('suggests value bets or checks when nothing is owed',()=>{
    expect(oddsTip(odds(.8),legal({check:true,call:false}),200)).toMatch(/A bet can build the pot/);
    expect(oddsTip(odds(.2),legal({check:true,call:false}),200)).toMatch(/Checking keeps it cheap/);
    expect(oddsTip(odds(.4,2,9),legal({check:true,call:false}),200)).toMatch(/9 outs/);
  });
});
