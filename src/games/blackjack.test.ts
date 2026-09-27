import {describe,it,expect} from 'vitest';
import {blackjackReducer as act,initialBlackjack,total,canDouble,canSplit,type BlackjackState} from './blackjack';
import type {Card} from '../game/types';
function hand(cards:Card[],dealer:Card[],deck:Card[]=[]):BlackjackState{return {...initialBlackjack,bank:975,phase:'player',hands:[{cards,bet:25,done:false}],dealer,deck};}
describe('blackjack',()=>{
  it('values aces without busting and identifies soft totals',()=>{
    expect(total(['As','Ah','9c'])).toEqual({value:21,soft:true});
    expect(total(['As','Ah','9c','Kd'])).toEqual({value:21,soft:false});
    expect(total(['As','6h'])).toEqual({value:17,soft:true});
  });
  it('deals alternating cards, deducts the wager once, and blocks mid-hand bets',()=>{
    const s=act(initialBlackjack,{type:'deal',bet:25,seed:1});
    expect(s.bank).toBe(975);expect(s.deck).toHaveLength(308);expect(s.dealer).toHaveLength(2);expect(s.hands[0].cards).toHaveLength(2);
    expect(act(s,{type:'deal',bet:25,seed:2})).toBe(s);
    expect(act(s,{type:'hit'})).toBe(s);
  });
  it.each([NaN,Infinity,-5,0,9,12,1005])('rejects invalid wager %s',bet=>expect(act(initialBlackjack,{type:'deal',bet,seed:1})).toBe(initialBlackjack));
  it('pays a natural at 3:2 and pushes against a dealer natural',()=>{
    const s={...hand(['As','Kh'],['Tc','9h']),phase:'dealer' as const};
    const win=act(s,{type:'dealer'});expect(win.bank).toBe(1037.5);expect(win.hands[0].result).toBe('Blackjack');
    expect(act({...s,dealer:['Ac','Th']},{type:'dealer'}).bank).toBe(1000);
    expect(act(win,{type:'dealer'})).toBe(win);
  });
  it('dealer stands on soft 17 but draws on 16',()=>{
    const s={...hand(['Ts','8h'],['Ac','6h'],['5c']),phase:'dealer' as const};
    expect(act(s,{type:'dealer'}).bank).toBe(1025);
    const hit=act({...s,dealer:['Tc','6h']},{type:'dealer'});
    expect(hit.dealer).toEqual(['Tc','6h','5c']);expect(hit.phase).toBe('dealer');expect(act(hit,{type:'dealer'}).bank).toBe(975);
  });
  it('a bust loses even if the dealer would also bust',()=>{
    const s=hand(['Ts','8h'],['Tc','6h'],['Kh','8s']);
    const hit=act(s,{type:'hit'});expect(hit.phase).toBe('dealer');
    const result=act(hit,{type:'dealer'});expect(result.bank).toBe(975);expect(result.hands[0].result).toBe('Bust');expect(result.dealer).toEqual(s.dealer);
  });
  it('double takes exactly one card and settles the doubled stake',()=>{
    const s=hand(['5s','6h'],['Tc','9h'],['Kh']);
    expect(canDouble(s)).toBe(true);const doubled=act(s,{type:'double'});
    expect(doubled.bank).toBe(950);expect(doubled.hands[0].bet).toBe(50);expect(doubled.hands[0].cards).toHaveLength(3);expect(doubled.phase).toBe('dealer');
    expect(act(doubled,{type:'dealer'}).bank).toBe(1050);
  });
  it('splits tens by value, advances to the second hand, and prohibits resplitting',()=>{
    const s=hand(['Ts','Qh'],['Tc','9h'],['2h','3h','5h']);
    expect(canSplit(s)).toBe(true);let split=act(s,{type:'split'});
    expect(split.bank).toBe(950);expect(split.hands.map(h=>h.cards)).toEqual([['Ts','5h'],['Qh','3h']]);expect(canSplit(split)).toBe(false);
    split=act(split,{type:'stand'});expect(split.active).toBe(1);expect(split.phase).toBe('player');
    split=act(split,{type:'stand'});expect(split.phase).toBe('dealer');
    expect(act(split,{type:'dealer'}).bank).toBe(950);
  });
  it('split aces receive one card each and a split 21 pays only 1:1',()=>{
    const split=act(hand(['As','Ah'],['Tc','9h'],['Kh','Qs']),{type:'split'});
    expect(split.phase).toBe('dealer');expect(split.hands.every(h=>h.done)).toBe(true);
    const won=act(split,{type:'dealer'});expect(won.bank).toBe(1050);expect(won.hands.every(h=>h.result==='You win')).toBe(true);
  });
  it('does not allow double or split without enough chips',()=>{
    const s={...hand(['8s','8h'],['Tc','9h']),bank:20};expect(canDouble(s)).toBe(false);expect(canSplit(s)).toBe(false);expect(act(s,{type:'double'})).toBe(s);expect(act(s,{type:'split'})).toBe(s);
  });
  it('conserves every card through many complete rounds',()=>{
    let s=initialBlackjack;
    for(let i=1;i<100;i++){
      if(s.bank<10)s=act(s,{type:'refill'});
      const cardsAvailable=s.deck.length<60?312:s.deck.length;
      s=act(s,{type:'deal',bet:10,seed:i});s=act(s,{type:'ready'});
      let guard=0;while(s.phase!=='settled'&&guard++<40)s=act(s,{type:s.phase==='dealer'?'dealer':total(s.hands[s.active].cards).value<17?'hit':'stand'});
      expect(s.phase).toBe('settled');expect(s.bank).toBeGreaterThanOrEqual(0);expect(s.hands.every(h=>h.result)).toBe(true);
      expect(s.deck.length+s.dealer.length+s.hands.reduce((n,h)=>n+h.cards.length,0)).toBe(cardsAvailable);
    }
  });
});
