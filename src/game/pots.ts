import type { Award, EvaluatedHand, Player, Pot } from './types';
/** Every contribution level creates a pot; a sole contributor gets an uncalled refund. */
export function buildPots(players: Player[]): Pot[] {
  const levels=[...new Set(players.map(p=>p.totalContribution).filter(v=>v>0))].sort((a,b)=>a-b);
  let previous=0;
  return levels.map(level=>{
    const contributors=players.flatMap((p,i)=>p.totalContribution>=level ? [i]:[]);
    const pot={amount:(level-previous)*contributors.length,contributors,eligible:contributors.filter(i=>!players[i].folded)};
    previous=level; return pot;
  });
}
/** Odd chips go clockwise from the button to tied winners, one at a time. */
export function awardPots(pots: Pot[], results: Record<number,EvaluatedHand>, dealer: number, seats: number): Award[] {
  return pots.flatMap((pot,potIndex)=>{
    if(pot.contributors.length===1) return [{playerIndex:pot.contributors[0],amount:pot.amount,potIndex,refund:true}];
    if(!pot.eligible.length) throw new Error('Pot has no eligible player.');
    const best=Math.max(...pot.eligible.map(i=>results[i]?.score??0));
    const winners=pot.eligible.filter(i=>(results[i]?.score??0)===best).sort((a,b)=>((a-dealer-1+seats)%seats)-((b-dealer-1+seats)%seats));
    const base=Math.floor(pot.amount/winners.length), extra=pot.amount%winners.length;
    return winners.map((playerIndex,i)=>({playerIndex,amount:base+(i<extra ? 1:0),potIndex}));
  });
}
