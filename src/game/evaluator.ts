import { rank, suit, RANK_NAMES } from './cards';
import type { Card, EvaluatedHand } from './types';
export const HAND_NAMES = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];
const plural = (r:number) => r===6 ? 'Sixes' : `${RANK_NAMES[r]}s`;
function five(cards: Card[]): EvaluatedHand {
  const values = cards.map(rank).sort((a,b)=>b-a);
  const groups = [...new Set(values)].map(r=>[r,values.filter(v=>v===r).length]).sort((a,b)=>b[1]-a[1] || b[0]-a[0]);
  const flush = cards.every(c=>suit(c)===suit(cards[0]));
  const unique = [...new Set(values)];
  const straight = unique.length===5 && unique[0]-unique[4]===4 ? unique[0] : unique.join(',')==='14,5,4,3,2' ? 5 : 0;
  let category=0, tie=values, description=`${RANK_NAMES[values[0]]} high`;
  if (flush && straight) { category=straight===14 ? 9:8; tie=[straight]; description=category===9 ? 'Ace-high straight flush' : `${RANK_NAMES[straight]} high`; }
  else if (groups[0][1]===4) { category=7; tie=groups.map(g=>g[0]); description=`${plural(tie[0])} — ${RANK_NAMES[tie[1]]} kicker`; }
  else if (groups[0][1]===3 && groups[1][1]===2) { category=6; tie=groups.map(g=>g[0]); description=`${plural(tie[0])} full of ${plural(tie[1])}`; }
  else if (flush) { category=5; description=`${RANK_NAMES[values[0]]} high`; }
  else if (straight) { category=4; tie=[straight]; description=`${RANK_NAMES[straight]} high`; }
  else if (groups[0][1]===3) { category=3; tie=groups.map(g=>g[0]); description=`${plural(tie[0])} — ${RANK_NAMES[tie[1]]} kicker`; }
  else if (groups[0][1]===2 && groups[1][1]===2) { category=2; tie=groups.map(g=>g[0]); description=`${plural(tie[0])} and ${plural(tie[1])} — ${RANK_NAMES[tie[2]]} kicker`; }
  else if (groups[0][1]===2) { category=1; tie=groups.map(g=>g[0]); description=`${plural(tie[0])} — ${RANK_NAMES[tie[1]]} kicker`; }
  let score=category; for(let i=0;i<5;i++) score=score*15+(tie[i]||0);
  return {score,category,name:HAND_NAMES[category],description,bestFive:[...cards]};
}
/** Exhaustive five-card combinations: 21 at seven cards. Suits never break ties. */
export function evaluate(cards: Card[]): EvaluatedHand {
  if(cards.length<5 || cards.length>7 || new Set(cards).size!==cards.length) throw new Error('Evaluation requires 5–7 unique cards.');
  let best: EvaluatedHand | undefined;
  for(let a=0;a<cards.length-4;a++) for(let b=a+1;b<cards.length-3;b++) for(let c=b+1;c<cards.length-2;c++) for(let d=c+1;d<cards.length-1;d++) for(let e=d+1;e<cards.length;e++) {
    const hand=five([cards[a],cards[b],cards[c],cards[d],cards[e]]);
    if(!best || hand.score>best.score) best=hand;
  }
  return best!;
}
