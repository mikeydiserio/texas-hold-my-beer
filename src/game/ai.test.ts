import { describe,it,expect } from 'vitest';
import { decide, estimateEquity, preflopPercentile } from './ai';
import { act, advance, assertInvariants, createGame, DEFAULT_CONFIG, observe, startHand } from './engine';
import { parseCards } from './cards';
import type { LegalActions, Observation, PublicAction } from './types';
describe('AI information boundary and gameplay',()=>{
  it('never exposes hidden cards or deck to the policy',()=>{
    const game=startHand(createGame(DEFAULT_CONFIG,27));const o=observe(game);
    expect(o).not.toHaveProperty('deck');expect(o).not.toHaveProperty('rng');expect(o.opponents.every(p=>!('holeCards'in p))).toBe(true);
    const altered=structuredClone(game);altered.deck.reverse();altered.players.forEach((p,i)=>{if(i!==game.currentPlayerIndex)p.holeCards.reverse();});
    expect(observe(altered)).toEqual(o);expect(decide(o,18)).toEqual(decide(observe(altered),18));
  });
  it('recognizes unbeatable hands and shared board equity',()=>{
    const o=observe(startHand(createGame({...DEFAULT_CONFIG,playerCount:2},1)));
    o.communityCards=parseCards('As Ks Qs Js Ts');o.holeCards=parseCards('2h 3h');
    expect(estimateEquity(o,72,20)).toBe(.5);
    o.communityCards=parseCards('Qs Js Ts 2d 3c');o.holeCards=parseCards('As Ks');
    expect(estimateEquity(o,72,20)).toBe(1);
  });
  it('plays a seeded table through legal streets, awards and elimination',()=>{
    let game=startHand(createGame({...DEFAULT_CONFIG,playerCount:3,startingStack:200,smallBlind:25,bigBlind:50},27));
    const phases=new Set<string>();let moves=0;
    while(game.phase!=='TABLE_COMPLETE'&&moves<3000){phases.add(game.phase);game=game.currentPlayerIndex<0?advance(game):act(game,decide(observe(game),++moves*97));assertInvariants(game);moves++;}
    expect(game.phase).toBe('TABLE_COMPLETE');expect(game.players.filter(p=>p.stack>0)).toHaveLength(1);expect(game.players.reduce((n,p)=>n+p.stack,0)).toBe(600);expect(game.handNumber).toBeGreaterThan(1);expect(phases.has('SHOWDOWN')).toBe(true);
  });
});

describe('AI hand reading and table cast',()=>{
  /** A heads-up decision with a hand-built public action line. */
  function spot(hole:string,board:string,line:(me:number,them:number)=>PublicAction[],legal:Partial<LegalActions>,pot:number):Observation {
    const o=observe(startHand(createGame({...DEFAULT_CONFIG,playerCount:2},1)));
    const me=o.player.seat,them=o.opponents[0].seat;
    o.holeCards=parseCards(hole);o.communityCards=parseCards(board);o.phase=(['PREFLOP','','','FLOP','TURN','RIVER'] as const)[o.communityCards.length] as Observation['phase'];
    o.actions=line(me,them);o.pot=pot;o.player={...o.player,stack:2000,currentBet:0,aiProfile:'BALANCED'};
    o.legal={fold:false,check:false,call:false,bet:false,raise:false,allIn:true,toCall:0,callAmount:0,minRaiseTo:100,maxRaiseTo:2000,...legal};
    return o;
  }
  const act=(seat:number,street:PublicAction['street'],type:PublicAction['type'],to:number):PublicAction=>({seat,street,type,to,aggressive:type==='BET'||type==='RAISE'});
  const barrels=(me:number,them:number)=>[act(them,'PREFLOP','RAISE',150),act(me,'PREFLOP','CALL',150),act(them,'FLOP','BET',200),act(me,'FLOP','CALL',200),act(them,'TURN','BET',400),act(me,'TURN','CALL',400),act(them,'RIVER','BET',600)];
  it('ranks starting hands from aces down to seven-deuce offsuit',()=>{
    const order=['As Ah','Ks Kh','As Ks','Ad Kc','Ts 9s','7d 2c'].map(h=>preflopPercentile(parseCards(h)));
    expect([...order].sort((a,b)=>b-a)).toEqual(order);
    expect(order[0]).toBeGreaterThan(.99);expect(order[5]).toBeLessThan(.05);
  });
  it('narrows the range of an aggressive opponent instead of assuming random cards',()=>{
    const o=spot('Kh 9h','Kd 7c 2s',(me,them)=>[act(me,'PREFLOP','RAISE',150),act(them,'PREFLOP','RAISE',450),act(me,'PREFLOP','CALL',450),act(me,'FLOP','BET',300),act(them,'FLOP','RAISE',900)],{call:true,fold:true,toCall:600,callAmount:600},2100);
    expect(estimateEquity(o,5,400)).toBeLessThan(estimateEquity(o,5,400,false)-.15);
  });
  it('folds an underpair to three streets of betting but calls when reads are off',()=>{
    const o=spot('Jh Jd','As Ks Qd 7c 2h',barrels,{call:true,fold:true,raise:true,toCall:600,callAmount:600,minRaiseTo:1200},1800);
    for(let seed=1;seed<=10;seed++)expect(decide(o,seed).type).toBe('FOLD');
    expect(estimateEquity(o,3,300,false)).toBeGreaterThan(.25);
  });
  it('never folds the nuts and usually raises a river bet',()=>{
    const o=spot('As Ks','Qs Js Ts 3d 2c',barrels,{call:true,fold:true,raise:true,toCall:600,callAmount:600,minRaiseTo:1200},1800);
    const types=Array.from({length:20},(_,i)=>decide(o,i+1).type);
    expect(types).not.toContain('FOLD');expect(types.filter(t=>t==='RAISE'||t==='ALL_IN').length).toBeGreaterThan(10);
  });
  it('deals a fresh cast per table without consuming the deck seed',()=>{
    const a=createGame(DEFAULT_CONFIG,11),b=createGame(DEFAULT_CONFIG,12),again=createGame(DEFAULT_CONFIG,11);
    expect(a.players[0]).toMatchObject({name:'You',isHuman:true});
    expect(new Set(a.players.map(p=>p.name)).size).toBe(6);
    expect(again.players.map(p=>[p.name,p.aiProfile])).toEqual(a.players.map(p=>[p.name,p.aiProfile]));
    expect(b.players.map(p=>[p.name,p.aiProfile])).not.toEqual(a.players.map(p=>[p.name,p.aiProfile]));
    expect(a.rng).toBe(11);
  });
});
