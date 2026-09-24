import { describe,it,expect } from 'vitest';
import { decide, estimateEquity } from './ai';
import { act, advance, assertInvariants, createGame, DEFAULT_CONFIG, observe, startHand } from './engine';
import { parseCards } from './cards';
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
