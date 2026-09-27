import {newDeck, shuffle, rank} from '../game/cards';
import type {Card} from '../game/types';

export type BlackjackHand = {cards: Card[]; bet: number; done: boolean; result?: string; returned?: number};
export type BlackjackState = {
  bank: number; deck: Card[]; dealer: Card[]; hands: BlackjackHand[]; active: number;
  phase: 'betting' | 'dealing' | 'player' | 'dealer' | 'settled'; round: number;
};
export const initialBlackjack: BlackjackState = {bank:1000, deck:[], dealer:[], hands:[], active:0, phase:'betting', round:0};
export function total(cards: Card[]) {
  let value = 0, aces = 0;
  for (const card of cards) { const r = rank(card); value += r === 14 ? 11 : Math.min(r, 10); if (r === 14) aces++; }
  while (value > 21 && aces > 0) { value -= 10; aces--; }
  return {value, soft:aces > 0};
}
const natural = (cards: Card[]) => cards.length === 2 && total(cards).value === 21;
export function canDouble(s: BlackjackState) { const h=s.hands[s.active]; return s.phase==='player' && !!h && h.cards.length===2 && s.bank>=h.bet; }
export function canSplit(s: BlackjackState) { const h=s.hands[0]; return canDouble(s) && s.hands.length===1 && Math.min(rank(h.cards[0]),10)===Math.min(rank(h.cards[1]),10) && (rank(h.cards[0])===14)===(rank(h.cards[1])===14); }
export type BlackjackAction = {type:'deal'; bet:number; seed:number} | {type:'ready'|'hit'|'stand'|'double'|'split'|'dealer'|'refill'};
export function blackjackReducer(state: BlackjackState, action: BlackjackAction): BlackjackState {
  if(action.type==='refill') return state.bank<10 && ['betting','settled'].includes(state.phase)?{...initialBlackjack,round:state.round}:state;
  if(action.type==='deal') {
    if(!['betting','settled'].includes(state.phase)||!Number.isFinite(action.bet)||action.bet<10||action.bet>state.bank||action.bet%5!==0) return state;
    const deck=state.deck.length<60?shuffle(action.seed,Array.from({length:6},()=>newDeck()).flat()).deck:[...state.deck];
    const player:Card[]=[],dealer:Card[]=[];
    for(let i=0;i<2;i++){player.push(deck.pop()!);dealer.push(deck.pop()!);}
    return {...state,deck,dealer,hands:[{cards:player,bet:action.bet,done:false}],bank:state.bank-action.bet,active:0,phase:'dealing',round:state.round+1};
  }
  if(action.type==='ready') {
    if(state.phase!=='dealing')return state;
    return {...state,phase:natural(state.dealer)||natural(state.hands[0].cards)?'dealer':'player'};
  }
  if(action.type==='dealer') {
    if(state.phase!=='dealer')return state;
    const dealerValue=total(state.dealer).value;
    const needsPlay=state.hands.some(h=>total(h.cards).value<=21 && !(state.hands.length===1&&natural(h.cards)));
    if(needsPlay && dealerValue<17) {const deck=[...state.deck];return {...state,deck:deck.slice(0,-1),dealer:[...state.dealer,deck.at(-1)!]};}
    let bank=state.bank;
    const hands=state.hands.map(h=>{
      const value=total(h.cards).value, blackjack=state.hands.length===1&&natural(h.cards), dealerBlackjack=natural(state.dealer);
      let result:string, returned:number;
      if(value>21){result='Bust';returned=0;}
      else if(dealerBlackjack){result=blackjack?'Push':'Dealer blackjack';returned=blackjack?h.bet:0;}
      else if(blackjack){result='Blackjack';returned=h.bet*2.5;}
      else if(dealerValue>21||value>dealerValue){result='You win';returned=h.bet*2;}
      else if(value===dealerValue){result='Push';returned=h.bet;}
      else {result='Dealer wins';returned=0;}
      bank+=returned;return {...h,done:true,result,returned};
    });
    return {...state,bank,hands,phase:'settled'};
  }
  if(state.phase!=='player') return state;
  if(action.type==='double'&&!canDouble(state)||action.type==='split'&&!canSplit(state))return state;
  const s:BlackjackState={...state,deck:[...state.deck],hands:state.hands.map(h=>({...h,cards:[...h.cards]}))};
  const h=s.hands[s.active];
  if(action.type==='split') {
    const aces=rank(h.cards[0])===14;
    s.bank-=h.bet;s.hands=h.cards.map(c=>({cards:[c,s.deck.pop()!],bet:h.bet,done:aces}));
    s.hands.forEach(hand=>{if(total(hand.cards).value===21)hand.done=true;});
  } else if(action.type==='stand') h.done=true;
  else if(action.type==='hit'||action.type==='double') {
    if(action.type==='double'){s.bank-=h.bet;h.bet*=2;h.done=true;}
    h.cards.push(s.deck.pop()!);if(total(h.cards).value>=21)h.done=true;
  }
  const next=s.hands.findIndex(hand=>!hand.done);
  if(next<0)s.phase='dealer';else s.active=next;
  return s;
}
