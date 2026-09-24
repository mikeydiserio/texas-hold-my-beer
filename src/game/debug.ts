import {newDeck,parseCards} from './cards';
import {act,advance,assertInvariants,BETTING_PHASES,createGame,legalActions,startHand} from './engine';
import type {GameState} from './types';
export function assignCards(state:GameState,holeText:string,boardText:string):GameState{
  if(!BETTING_PHASES.includes(state.phase))throw new Error('Assign cards during a betting street.');
  const holes=parseCards(holeText),board=parseCards(boardText);if(holes.length!==2||board.length!==state.communityCards.length)throw new Error(`Enter 2 hole cards and ${state.communityCards.length} board cards for this street.`);
  const s=structuredClone(state);s.players[0].holeCards=holes;s.communityCards=board;
  const requested=[...holes,...board];if(new Set(requested).size!==requested.length)throw new Error('Hole and board cards must be unique.');
  const reserved=new Set(requested);const available=newDeck().filter(c=>!reserved.has(c));
  for(let i=1;i<s.players.length;i++)s.players[i].holeCards=s.players[i].holeCards.map(c=>{const card=!reserved.has(c)?c:available.find(x=>!reserved.has(x))!;reserved.add(card);return card;});
  s.burned=s.burned.map(c=>{const card=!reserved.has(c)?c:available.find(x=>!reserved.has(x))!;reserved.add(card);return card;});s.deck=newDeck().filter(c=>!reserved.has(c));assertInvariants(s);return s;
}
export function forceStacks(state:GameState,text:string):GameState{
  const stacks=text.split(/[ ,]+/).map(Number);if(stacks.length!==state.players.length||stacks.some(n=>!Number.isSafeInteger(n)||n<0||n>1000000)||stacks.filter(n=>n>0).length<2)throw new Error('Enter one non-negative whole stack per seat, with at least two players funded.');
  const s=createGame(state.config,state.rng);s.players.forEach((p,i)=>p.stack=stacks[i]);s.initialChips=stacks.reduce((a,b)=>a+b,0);return startHand(s);
}
export function allInScenario(state:GameState):GameState{
  let s=createGame({...state.config,playerCount:3,startingStack:2500,smallBlind:25,bigBlind:50},1873);[300,900,2500].forEach((v,i)=>s.players[i].stack=v);s.initialChips=3700;s=startHand(s);
  while(s.currentPlayerIndex>=0){const l=legalActions(s);s=act(s,{type:l.allIn?'ALL_IN':l.call?'CALL':'CHECK'});}return s;
}
export function runToShowdown(state:GameState):GameState{
  let s=state;for(let i=0;i<100&&BETTING_PHASES.includes(s.phase);i++){if(s.currentPlayerIndex<0)s=advance(s);else{const l=legalActions(s);s=act(s,{type:l.check?'CHECK':l.call?'CALL':'ALL_IN'});}}return s;
}
