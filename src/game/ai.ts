import { newDeck, random, rank, shuffle, suit } from './cards';
import { evaluate } from './evaluator';
import type { Action, Card, Observation, Personality } from './types';
const profiles: Record<Personality,{vpip:number;aggression:number;bluff:number;calling:number;risk:number}>={
  TIGHT:{vpip:.19,aggression:.45,bluff:.035,calling:.0,risk:-.035},
  LOOSE:{vpip:.43,aggression:.48,bluff:.09,calling:.11,risk:.055},
  AGGRESSIVE:{vpip:.29,aggression:.8,bluff:.14,calling:.02,risk:.04},
  PASSIVE:{vpip:.35,aggression:.2,bluff:.025,calling:.12,risk:-.025},
  BALANCED:{vpip:.26,aggression:.55,bluff:.08,calling:.04,risk:.0},
  MANIAC:{vpip:.6,aggression:.92,bluff:.25,calling:.09,risk:.12},
};
/** Samples only unknown cards, constructed from the public information boundary. */
export function estimateEquity(o:Observation,seed:number,samples=64):number {
  const known=new Set([...o.holeCards,...o.communityCards]);const unseen=newDeck().filter(c=>!known.has(c));
  let wins=0;
  for(let n=0;n<samples;n++){
    const result=shuffle(seed,unseen);seed=result.seed;const deck=result.deck;
    const board:Card[]=[...o.communityCards,...deck.splice(0,5-o.communityCards.length)];
    const score=evaluate([...o.holeCards,...board]).score;let tie=1, beaten=false;
    for(let i=0;i<o.opponents.length;i++){const other=evaluate([...deck.splice(0,2),...board]).score;if(other>score){beaten=true;break;}if(other===score)tie++;}
    if(!beaten)wins+=1/tie;
  }
  return wins/samples;
}
export function decide(o:Observation,seed:number):Action {
  const p=profiles[o.player.aiProfile],l=o.legal;
  const [noise,seed2]=random(seed),[choice]=random(seed2);
  const [hi,lo]=o.holeCards.map(rank).sort((a,b)=>b-a);
  const paired=hi===lo, suited=suit(o.holeCards[0])===suit(o.holeCards[1]);
  const position=((o.player.seat-o.dealerIndex+o.seatCount)%o.seatCount)/o.seatCount;
  const preflop=o.communityCards.length===0;
  const strength=paired?.48+hi/28:(hi+lo)/42+(suited?.07:0)+(hi-lo<=2?.055:0)-(hi-lo>5?.05:0);
  let equity=preflop?Math.pow(Math.min(.92,strength),.55+o.opponents.length*.19):estimateEquity(o,seed2,o.difficulty==='Strong'?128:o.difficulty==='Casual'?24:56);
  const ranks=o.communityCards.map(rank),suits=o.communityCards.map(suit);
  const wet=o.communityCards.length>=3&&(new Set(suits).size<=2||Math.max(...ranks)-Math.min(...ranks)<=5);
  const pressure=o.history.filter(h=>/Raise to|Bet |All-in/.test(h.text)).length;
  equity+=p.risk+(noise-.5)*(o.difficulty==='Casual'?.19:.07);
  const odds=l.callAmount/(o.pot+l.callAmount||1);
  const effective=Math.min(o.player.stack,Math.max(0,...o.opponents.map(q=>q.stack)));
  const committed=l.callAmount/Math.max(1,o.player.stack);
  const bluff=choice<p.bluff*(preflop?1:wet?.6:1.2)/(1+o.opponents.length*.25);
  const playable=!preflop||strength>(.68-p.vpip*.5-position*.045)||l.toCall<=o.bigBlind&&paired;
  const value=equity>Math.max(.47,1/(o.opponents.length+1)+.21);
  const raise=(value&&noise<p.aggression)||bluff;
  if(raise&&(l.bet||l.raise)){
    const fraction=bluff?.55:.45+equity*.5;
    const target=preflop?Math.max(l.minRaiseTo,o.bigBlind*(2.4+p.aggression)+l.toCall):o.player.currentBet+l.toCall+(o.pot+l.toCall)*fraction;
    const amount=Math.min(l.maxRaiseTo,Math.max(l.minRaiseTo,Math.round(target)));
    if(equity>.72&&effective<o.pot*1.2&&l.allIn)return {type:'ALL_IN'};
    return {type:l.bet?'BET':'RAISE',amount};
  }
  if(l.check)return {type:'CHECK'};
  const threshold=odds+Math.min(.10,pressure*.015)+committed*.05-p.calling;
  if((playable&&equity>threshold)||l.callAmount<=o.bigBlind*.25){return {type:l.call?'CALL':'ALL_IN'};}
  return {type:'FOLD'};
}
