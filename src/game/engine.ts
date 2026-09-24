import { cardText, newDeck, shuffle } from './cards';
import { evaluate } from './evaluator';
import { awardPots, buildPots } from './pots';
import type { Action, Card, Config, GameEvent, GameState, LegalActions, Observation, Phase, Player, Personality } from './types';
export const DEFAULT_CONFIG: Config={playerCount:6,startingStack:2500,smallBlind:25,bigBlind:50,difficulty:'Normal'};
export const BETTING_PHASES: Phase[]=['PREFLOP','FLOP','TURN','RIVER'];
const names=['You','Sofia','Theo','Mei','Jules','Nico','Amara','Leo','Isla'];
const profiles: Personality[]=['BALANCED','TIGHT','AGGRESSIVE','BALANCED','LOOSE','PASSIVE','MANIAC','TIGHT','AGGRESSIVE'];
export function validateConfig(c:Config) {
  for(const key of ['playerCount','startingStack','smallBlind','bigBlind'] as const) if(!Number.isSafeInteger(c[key])) throw new Error('Use whole numbers for players, stacks and blinds.');
  if(c.playerCount<2||c.playerCount>9) throw new Error('Choose 2–9 players.');
  if(c.smallBlind<1||c.bigBlind<c.smallBlind*2) throw new Error('The big blind must be at least twice the small blind.');
  if(c.startingStack<c.bigBlind*2||c.startingStack>1000000) throw new Error('Starting stacks must be 2 big blinds or more, up to 1,000,000.');
  if(!['Casual','Normal','Strong'].includes(c.difficulty)) throw new Error('Invalid difficulty.');
}
export function createGame(config: Config=DEFAULT_CONFIG, seed=1): GameState {
  validateConfig(config);
  return {config:{...config},phase:'SETUP',handNumber:0,dealerIndex:-1,smallBlindIndex:-1,bigBlindIndex:-1,currentPlayerIndex:-1,currentBet:0,minimumRaise:config.bigBlind,
    players:Array.from({length:config.playerCount},(_,i)=>({id:`player-${i}`,name:names[i],seat:i,stack:config.startingStack,holeCards:[],currentBet:0,totalContribution:0,folded:false,allIn:false,eliminated:false,isHuman:i===0,aiProfile:profiles[i],actedBet:null,lastAction:''})),
    communityCards:[],deck:[],burned:[],pot:0,sidePots:[],awards:[],results:{},actionHistory:[],events:[],nextEventId:1,rng:seed>>>0||1,largestPot:0,initialChips:config.startingStack*config.playerCount};
}
function emit(s:GameState,event:Omit<GameEvent,'id'>) { s.events.push({...event,id:s.nextEventId++}); s.events=s.events.slice(-100); }
function log(s:GameState,text:string) { s.actionHistory.push({id:s.nextEventId++,hand:s.handNumber,street:s.phase,text}); s.actionHistory=s.actionHistory.slice(-1000); }
function nextSeat(s:GameState,from:number,test:(p:Player)=>boolean) {
  for(let n=1;n<=s.players.length;n++){const i=(from+n+s.players.length)%s.players.length;if(test(s.players[i]))return i;} return -1;
}
const live=(p:Player)=>!p.folded&&!p.eliminated;
const actionable=(p:Player)=>live(p)&&!p.allIn;
function pay(s:GameState,i:number,amount:number) {
  const p=s.players[i]; amount=Math.min(p.stack,amount); p.stack-=amount; p.currentBet+=amount; p.totalContribution+=amount; p.allIn=p.stack===0; s.pot+=amount;
  emit(s,{type:'BET',playerIndex:i,amount}); s.sidePots=buildPots(s.players);
}
function draw(s:GameState): Card { const card=s.deck.shift(); if(!card)throw new Error('Deck exhausted.');return card; }
export function startHand(state:GameState):GameState {
  if(!['SETUP','HAND_COMPLETE'].includes(state.phase)) throw new Error('Finish the current hand first.');
  const s=structuredClone(state); const active=s.players.filter(p=>p.stack>0);
  if(active.length<2){s.phase='TABLE_COMPLETE';s.currentPlayerIndex=-1;return s;}
  const previousBB=s.bigBlindIndex;
  s.handNumber++; s.phase='PREFLOP';s.communityCards=[];s.burned=[];s.pot=0;s.awards=[];s.results={};s.sidePots=[];
  for(const p of s.players){p.eliminated=p.stack===0;p.folded=p.eliminated;p.allIn=false;p.holeCards=[];p.currentBet=0;p.totalContribution=0;p.actedBet=null;p.lastAction=p.eliminated?'Out':'';}
  // Moving button; at the transition to heads-up, advance the BB to avoid a repeated BB.
  if(active.length===2 && previousBB>=0){s.bigBlindIndex=nextSeat(s,previousBB,p=>!p.eliminated);s.dealerIndex=nextSeat(s,s.bigBlindIndex,p=>!p.eliminated);s.smallBlindIndex=s.dealerIndex;}
  else {s.dealerIndex=nextSeat(s,s.dealerIndex,p=>!p.eliminated);s.smallBlindIndex=active.length===2?s.dealerIndex:nextSeat(s,s.dealerIndex,p=>!p.eliminated);s.bigBlindIndex=nextSeat(s,s.smallBlindIndex,p=>!p.eliminated);}
  const shuffled=shuffle(s.rng);s.deck=shuffled.deck;s.rng=shuffled.seed;
  log(s,`Hand #${s.handNumber} · ${s.players[s.dealerIndex].name} has the button`);
  for(const [i,amount,label] of [[s.smallBlindIndex,s.config.smallBlind,'small blind'],[s.bigBlindIndex,s.config.bigBlind,'big blind']] as const){pay(s,i,amount);s.players[i].lastAction=label==='small blind'?'Small blind':'Big blind';log(s,`${s.players[i].name} posts ${label} ${s.players[i].currentBet}`);}
  let seat=s.dealerIndex;
  for(let round=0;round<2;round++)for(let n=0;n<active.length;n++){seat=nextSeat(s,seat,p=>!p.eliminated);const c=draw(s);s.players[seat].holeCards.push(c);emit(s,{type:'DEAL',playerIndex:seat,cards:[c]});}
  // A short big blind does not lower the nominal preflop bring-in.
  s.currentBet=s.config.bigBlind;s.minimumRaise=s.config.bigBlind;
  s.currentPlayerIndex=nextSeat(s,s.bigBlindIndex,actionable);
  finishIfReady(s,s.bigBlindIndex);assertInvariants(s);return s;
}
export function legalActions(s:GameState,index=s.currentPlayerIndex):LegalActions {
  const empty:LegalActions={fold:false,check:false,call:false,bet:false,raise:false,allIn:false,toCall:0,callAmount:0,minRaiseTo:0,maxRaiseTo:0};
  const p=s.players[index];if(!BETTING_PHASES.includes(s.phase)||index!==s.currentPlayerIndex||!p||!actionable(p))return empty;
  const toCall=Math.max(0,s.currentBet-p.currentBet), max=p.currentBet+p.stack;
  const reopened=p.actedBet===null || s.currentBet-p.actedBet>=s.minimumRaise || (p.actedBet===0&&p.currentBet===0);
  const hasOpponent=s.players.some((q,i)=>i!==index&&actionable(q));
  const min=s.currentBet===0?s.config.bigBlind:s.currentBet+s.minimumRaise;
  const canRaise=reopened&&hasOpponent&&max>s.currentBet;
  return {fold:toCall>0,check:toCall===0,call:toCall>0&&p.stack>=toCall,bet:canRaise&&s.currentBet===0&&max>=min,raise:canRaise&&s.currentBet>0&&max>=min,allIn:max<=s.currentBet||canRaise,toCall,callAmount:Math.min(p.stack,toCall),minRaiseTo:min,maxRaiseTo:max};
}
function finishIfReady(s:GameState,after:number) {
  const remaining=s.players.filter(live);
  if(remaining.length===1){settle(s,false);return;}
  const actors=s.players.filter(actionable);
  const need=(p:Player)=>actionable(p)&&(p.actedBet===null||p.currentBet<s.currentBet);
  // No meaningless betting into a dry side pot. A sole player still must answer a live wager.
  if(actors.length<=1 && (!actors.length||actors[0].currentBet>=Math.max(...remaining.map(p=>p.currentBet)))){s.currentPlayerIndex=-1;return;}
  s.currentPlayerIndex=nextSeat(s,after,need);
}
export function act(state:GameState,action:Action,index=state.currentPlayerIndex):GameState {
  const legal=legalActions(state,index);
  const key=({FOLD:'fold',CHECK:'check',CALL:'call',ALL_IN:'allIn',BET:'bet',RAISE:'raise'} as const)[action.type];
  if(!legal[key])throw new Error(`Illegal ${action.type.toLowerCase()} action.`);
  if('amount'in action && (!Number.isSafeInteger(action.amount)||action.amount<legal.minRaiseTo||action.amount>legal.maxRaiseTo))throw new Error('Raise amount is outside the legal range.');
  const s=structuredClone(state),p=s.players[index];
  if(action.type==='FOLD'){p.folded=true;p.lastAction='Fold';emit(s,{type:'FOLD',playerIndex:index});}
  else if(action.type==='CHECK'){p.lastAction='Check';emit(s,{type:'CHECK',playerIndex:index});}
  else {
    const target=action.type==='CALL'?p.currentBet+legal.callAmount:action.type==='ALL_IN'?legal.maxRaiseTo:action.amount;
    const before=s.currentBet;pay(s,index,target-p.currentBet);
    if(target>before){const increment=target-before;if(increment>=s.minimumRaise)s.minimumRaise=increment;s.currentBet=target;}
    p.lastAction=p.allIn?`All-in ${target}`:target>before?`${before===0?'Bet':'Raise to'} ${target}`:`Call ${legal.callAmount}`;
  }
  p.actedBet=s.currentBet;log(s,`${p.name} · ${p.lastAction}`);finishIfReady(s,index);assertInvariants(s);return s;
}
function settle(s:GameState,showdown:boolean) {
  s.currentPlayerIndex=-1;s.sidePots=buildPots(s.players);s.largestPot=Math.max(s.largestPot,s.pot);
  if(showdown)for(let i=0;i<s.players.length;i++)if(live(s.players[i]))s.results[i]=evaluate([...s.players[i].holeCards,...s.communityCards]);
  s.awards=awardPots(s.sidePots,s.results,s.dealerIndex,s.players.length);
  for(const a of s.awards){s.players[a.playerIndex].stack+=a.amount;log(s,`${s.players[a.playerIndex].name} ${a.refund?'receives uncalled bet':'wins'} ${a.amount}${s.results[a.playerIndex]&&!a.refund?` · ${s.results[a.playerIndex].name}, ${s.results[a.playerIndex].description}`:''}`);emit(s,{type:'AWARD',playerIndex:a.playerIndex,amount:a.amount});}
  s.pot=0;for(const p of s.players){p.currentBet=0;p.totalContribution=0;p.eliminated=p.stack===0;}
  s.phase=showdown?'SHOWDOWN':'HAND_COMPLETE';emit(s,{type:showdown?'SHOWDOWN':'COMPLETE'});
}
/** Explicit clock-independent transition. Presentation chooses when to call it. */
export function advance(state:GameState):GameState {
  if(state.phase==='SETUP'||state.phase==='HAND_COMPLETE')return startHand(state);
  const s=structuredClone(state);
  if(s.phase==='SHOWDOWN'){s.phase='HAND_COMPLETE';emit(s,{type:'COMPLETE'});return s;}
  if(!BETTING_PHASES.includes(s.phase)||s.currentPlayerIndex!==-1)throw new Error('Betting is not complete.');
  emit(s,{type:'COLLECT',amount:s.pot,contributions:s.players.flatMap((p,i)=>p.currentBet>0?[{playerIndex:i,amount:p.currentBet}]:[])});
  if(s.phase==='RIVER'){settle(s,true);assertInvariants(s);return s;}
  const count=s.phase==='PREFLOP'?3:1;s.phase=s.phase==='PREFLOP'?'FLOP':s.phase==='FLOP'?'TURN':'RIVER';
  s.burned.push(draw(s));const cards=Array.from({length:count},()=>draw(s));s.communityCards.push(...cards);
  s.currentBet=0;s.minimumRaise=s.config.bigBlind;
  for(const p of s.players){p.currentBet=0;p.actedBet=null;if(live(p)&&!p.allIn)p.lastAction='';}
  emit(s,{type:'BOARD',cards});log(s,`${s.phase} · ${cards.map(cardText).join(' ')}`);
  finishIfReady(s,s.dealerIndex);assertInvariants(s);return s;
}
/** The only AI input constructor. No other players' cards, deck, burns, or engine RNG. */
export function observe(s:GameState,index=s.currentPlayerIndex):Observation {
  const p=s.players[index];return {holeCards:[...p.holeCards],communityCards:[...s.communityCards],phase:s.phase,pot:s.pot,bigBlind:s.config.bigBlind,player:{stack:p.stack,currentBet:p.currentBet,aiProfile:p.aiProfile,seat:p.seat},opponents:s.players.flatMap((q,i)=>i!==index&&live(q)?[{seat:q.seat,stack:q.stack,currentBet:q.currentBet,allIn:q.allIn}]:[]),dealerIndex:s.dealerIndex,seatCount:s.players.length,legal:legalActions(s,index),history:s.actionHistory.filter(h=>h.hand===s.handNumber).map(h=>({...h})),difficulty:s.config.difficulty};
}
export function assertInvariants(s:GameState) {
  if(s.players.some(p=>p.stack<0||!Number.isSafeInteger(p.stack)||p.currentBet<0||p.totalContribution<p.currentBet))throw new Error('Invalid chip state.');
  if(s.players.reduce((v,p)=>v+p.stack,0)+s.pot!==s.initialChips)throw new Error('Chip conservation violated.');
  if(s.players.reduce((v,p)=>v+p.totalContribution,0)!==s.pot)throw new Error('Pot contributions do not balance.');
  const cards=[...s.deck,...s.burned,...s.communityCards,...s.players.flatMap(p=>p.holeCards)];
  if(new Set(cards).size!==cards.length || cards.some(c=>!newDeck().includes(c)))throw new Error('Duplicate or invalid card.');
  if(s.currentPlayerIndex>=0&&!actionable(s.players[s.currentPlayerIndex]))throw new Error('Invalid actor.');
}
