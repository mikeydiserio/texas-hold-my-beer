'use client';
import {useEffect,useState} from 'react';
import styled from 'styled-components';
import {ArrowRightIcon,CheckIcon,LightbulbIcon} from '@phosphor-icons/react';
import {useGame} from '../state/game-store';
import {legalActions} from '../game/engine';
import {evaluate} from '../game/evaluator';
import {rank,RANK_NAMES} from '../game/cards';
import {currentHand,keyCards,oddsTip,type HandOdds} from '../game/odds';
import type {Card} from '../game/types';
import {Button,Eyebrow} from './primitives';
import {PlayingCard} from './PlayingCard';
import {ThinkingDots} from './StreetCall';
import {useHandOdds} from './use-hand-odds';
const Panel=styled.section`
  min-height:152px;display:grid;grid-template-columns:minmax(460px,1.15fr) minmax(440px,1.6fr);gap:32px;border-top:1px solid #ffffff12;padding:23px 34px;background:#1b1a1d;position:relative;z-index:25;
  .your-hand{display:flex;gap:19px;align-items:center}.hole-cards,.board-strip{display:flex;gap:7px;flex-shrink:0}.hand-copy h3{font-size:16px;font-weight:500;margin:9px 0 5px}.hand-copy p{margin:0;color:#b8b0a8;font-size:11px;line-height:1.5}.controls{display:flex;flex-direction:column;gap:12px;justify-content:center}.bet-sizing{display:grid;grid-template-columns:1fr 95px auto;align-items:center;gap:13px}.bet-sizing input[type=range]{width:100%;height:4px;cursor:pointer}.amount-input{background:#151417;border:1px solid #ffffff20;border-radius:5px;width:95px;color:#f3edda;padding:8px;font-size:13px;text-align:center}.shortcuts{display:flex;gap:5px}.shortcuts button{font-size:10px;min-height:30px;padding:5px 8px}.action-buttons{display:grid;grid-template-columns:.8fr 1.2fr 1.3fr;gap:9px}.action-buttons button{height:45px}.action-buttons kbd{font:9px Arial;border:1px solid currentColor;opacity:.45;border-radius:3px;padding:2px 4px;margin-left:auto}.waiting{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:15px 0}.waiting h3{font-size:17px;font-weight:400;margin:0 0 7px}.waiting p{margin:0;color:#b8b0a8;font-size:12px}.turn-note{position:absolute;right:34px;top:-28px;font-size:10px;color:#e83235;letter-spacing:.5px}.helper{display:flex;gap:16px}.helper span{font-size:10px;color:#b8b0a8}.helper b{font-weight:500;color:#d7e0d6}
  .your-hand.in-play{flex-direction:column;align-items:stretch;gap:12px;width:max-content;max-width:100%}.card-rows{display:flex;gap:18px;align-items:flex-end}.card-group{display:flex;flex-direction:column;gap:8px}.board-group{padding-left:18px;border-left:1px solid #ffffff10}
  .card-slot{width:54px;height:76px;border:1px dashed #ffffff1a;border-radius:5px;flex-shrink:0;background:#ffffff03}
  .hand-copy.in-play{display:grid;grid-template-columns:1fr auto;align-items:end;gap:4px 18px}.hand-copy.in-play h3{margin:0}.hand-copy.in-play p{grid-column:1/-1}
  .odds{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:150px}.odds-figures{display:flex;gap:12px;font-size:10px;color:#b8b0a8;letter-spacing:.4px}.odds-figures b{font-size:14px;font-weight:600;color:#f3edda;margin-left:4px}.odds-figures .split b{color:#d7e0d6;font-size:12px}.odds-bar{width:150px;height:4px;border-radius:2px;background:#ffffff12;display:flex;overflow:hidden}.odds-bar i{display:block;height:100%;transition:width .5s ease}.odds-bar .win{background:#e83235}.odds-bar .tie{background:#8fa894}.odds.pending .odds-figures{opacity:.45}
  .improve{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px 12px;font-size:10px;color:#8ea291;letter-spacing:.3px}.improve b{color:#cfdacd;font-weight:500}
  .tip{display:flex;gap:7px;align-items:flex-start;font-size:11px;line-height:1.45;color:#b9c8b8}.tip svg{color:#e83235;flex-shrink:0;margin-top:1px}
  @media(prefers-reduced-motion:reduce){.odds-bar i{transition:none}}
  @media(max-width:1100px){grid-template-columns:1fr;gap:18px}
  @media(max-width:1000px){padding:20px;.bet-sizing{grid-template-columns:1fr 80px}.shortcuts{grid-column:1/-1;justify-content:flex-end}.amount-input{width:80px}.hand-copy h3{font-size:14px}}
  @media(max-width:700px){padding:15px 17px 20px;gap:16px;grid-template-columns:1fr;.your-hand{gap:12px}.hand-copy{flex:1}.hand-copy h3{margin:5px 0}.controls{gap:10px}.bet-sizing{grid-template-columns:1fr 75px}.shortcuts{grid-row:1;grid-column:1/-1;justify-content:space-between}.shortcuts button{flex:1}.action-buttons button{padding:10px 12px;font-size:12px}.action-buttons kbd{display:none}.turn-note{top:-24px;right:16px}.waiting{padding:0}.waiting h3{font-size:15px}.your-hand .playing-card,.card-slot{width:38px;height:54px}.your-hand .playing-card b{font-size:19px}.your-hand .playing-card span{font-size:21px}.helper{justify-content:flex-end}.hand-copy p{font-size:10px}
    .card-rows{gap:10px}.board-group{padding-left:10px}.hole-cards,.board-strip{gap:4px}.hand-copy.in-play{grid-template-columns:1fr}.odds{align-items:flex-start;min-width:0}.odds-bar{width:100%}.tip{font-size:10px}}
`;
const fmt=(v:number)=>v.toLocaleString('en-US');
const pct=(v:number)=>`${Math.round(v*100)}%`;
function Odds({odds,live}:{odds:HandOdds|null;live:boolean}){
  if(!live)return null;
  if(!odds)return <div className="odds pending" aria-hidden="true"><div className="odds-figures"><span>Win <b>—</b></span></div><div className="odds-bar"/></div>;
  return <div className="odds" title={`Estimated from ${fmt(odds.samples)} simulated run-outs against ${odds.opponents} random ${odds.opponents===1?'hand':'hands'}.`}>
    <div className="odds-figures"><span>Win <b>{pct(odds.win)}</b></span>{odds.tie>=.01&&<span className="split">Split <b>{pct(odds.tie)}</b></span>}</div>
    <div className="odds-bar" role="img" aria-label={`About ${pct(odds.win)} to win${odds.tie>=.01?` and ${pct(odds.tie)} to split`:''} against ${odds.opponents} ${odds.opponents===1?'opponent':'opponents'}`}><i className="win" style={{width:pct(odds.win)}}/><i className="tie" style={{width:pct(odds.tie)}}/></div>
  </div>;
}
export function ActionPanel({onNewTable}:{onNewTable:()=>void}){
  const {game,action,preferences,paused,start}=useGame();const legal=game?legalActions(game):null;
  const [amount,setAmount]=useState(100);const myTurn=game?.currentPlayerIndex===0&&!paused;
  const odds=useHandOdds(game,preferences.winOdds||preferences.hints);
  useEffect(()=>{if(legal)setAmount(legal.minRaiseTo);},[game?.handNumber,game?.currentPlayerIndex,game?.currentBet,legal?.minRaiseTo]);
  const valid=!!legal&&Number.isSafeInteger(amount)&&amount>=legal.minRaiseTo&&amount<=legal.maxRaiseTo;
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(!myTurn||!legal||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey||e.repeat||/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement)?.tagName))return;const key=e.key.toLowerCase();if(key==='f'&&legal.fold)action({type:'FOLD'});else if(key==='c'&&(legal.check||legal.call))action({type:legal.check?'CHECK':'CALL'});else if(key==='r'&&(legal.bet||legal.raise)&&valid)action({type:legal.bet?'BET':'RAISE',amount});else if(key==='a'&&legal.allIn)action({type:'ALL_IN'});else return;e.preventDefault();};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[myTurn,legal,valid,amount,action]);
  if(!game)return <Panel><div className="your-hand"><div className="hole-cards"><PlayingCard/><PlayingCard/></div></div><div className="waiting"><p>No-limit Texas Hold’em · 2–9 players</p><Button $primary onClick={onNewTable}>Take a seat <ArrowRightIcon size={16}/></Button></div></Panel>;
  const human=game.players[0],board=game.communityCards,full=human.holeCards.length+board.length>=5;
  const hand=full?evaluate([...human.holeCards,...board]):null;
  const pre=human.holeCards.length===2?(rank(human.holeCards[0])===rank(human.holeCards[1])?`Pocket ${RANK_NAMES[rank(human.holeCards[0])]}s`:`${RANK_NAMES[Math.max(...human.holeCards.map(rank))]} high`):'Waiting for a hand';
  const winner=game.phase==='TABLE_COMPLETE'?game.players.find(p=>p.stack>0):null;
  const sizing=!!legal&&(legal.bet||legal.raise)&&myTurn;
  const amountFor=(fraction:number)=>Math.round(human.currentBet+legal!.toCall+(game.pot+legal!.toCall)*fraction);
  const live=human.holeCards.length===2&&!human.folded&&!human.eliminated&&['PREFLOP','FLOP','TURN','RIVER'].includes(game.phase);
  // Best-five highlighting: the showdown result when there is one, otherwise the hand as it stands.
  const shown=game.results[0]?{bestFive:game.results[0].bestFive,key:keyCards(game.results[0])}:live&&preferences.helper?currentHand(human.holeCards,board):null;
  const style=(c:Card)=>({highlight:!!shown?.key.includes(c),dim:!!shown&&full&&!shown.bestFive.includes(c)});
  const tip=myTurn&&legal&&preferences.hints&&odds?oddsTip(odds,legal,game.pot):null;
  return <Panel aria-label="Your cards and betting controls">
    {myTurn&&<span className="turn-note">YOUR TURN</span>}
    <div className="your-hand in-play">
      <div className="card-rows">
        <div className="card-group"><Eyebrow>{human.eliminated?'Spectating':human.folded?'You folded':'Your hand'}</Eyebrow><div className="hole-cards">{human.holeCards.length?human.holeCards.map(c=><PlayingCard key={c} card={c} {...style(c)}/>):<><PlayingCard/><PlayingCard/></>}</div></div>
        <div className="card-group board-group"><Eyebrow>The board</Eyebrow><div className="board-strip" aria-label={board.length?'Community cards':'No community cards yet'} role="group">{Array.from({length:5},(_,i)=>board[i]?<PlayingCard key={board[i]} card={board[i]} {...style(board[i])}/>:<span key={`slot-${i}`} className="card-slot" aria-hidden="true"/>)}</div></div>
      </div>
      <div className="hand-copy in-play"><h3>{preferences.helper?(hand?.name||pre):'Your private cards'}</h3>{preferences.winOdds&&<Odds odds={odds} live={live}/>}<p>{preferences.helper&&hand?hand.description:human.eliminated?'You can watch the table play out.':`${fmt(human.stack)} chips · ${Math.round(human.stack/game.config.bigBlind)} BB`}</p>
        {preferences.winOdds&&live&&odds&&odds.improvements.length>0&&<div className="improve"><span>By the river:</span>{odds.improvements.map(i=><span key={i.category}>{i.name} <b>{pct(i.chance)}</b></span>)}</div>}
      </div>
    </div>
    <div className="controls">{myTurn&&legal?<>
      <div className="bet-sizing"><input aria-label="Bet or raise size" type="range" min={legal.minRaiseTo} max={Math.max(legal.minRaiseTo,legal.maxRaiseTo)} value={Math.min(legal.maxRaiseTo,Math.max(legal.minRaiseTo,amount))} disabled={!sizing} step="1" onChange={e=>setAmount(+e.target.value)}/><input className="amount-input" aria-label="Bet or raise amount" type="number" min={legal.minRaiseTo} max={legal.maxRaiseTo} value={amount||''} disabled={!sizing} onChange={e=>setAmount(+e.target.value)}/><div className="shortcuts">{[['MIN',legal.minRaiseTo],['½ POT',amountFor(.5)],['¾ POT',amountFor(.75)],['POT',amountFor(1)]] .map(([label,value])=><Button $small key={label} disabled={!sizing||Number(value)<legal.minRaiseTo||Number(value)>legal.maxRaiseTo} onClick={()=>setAmount(Number(value))}>{label}</Button>)}<Button $small disabled={!legal.allIn} onClick={()=>action({type:'ALL_IN'})}>ALL-IN</Button></div></div>
      <div className="action-buttons"><Button disabled={!legal.fold} onClick={()=>action({type:'FOLD'})}>Fold <kbd>F</kbd></Button><Button disabled={!legal.check&&!legal.call} onClick={()=>action({type:legal.check?'CHECK':'CALL'})}>{legal.check?<><CheckIcon size={16}/> Check</>:`Call ${fmt(legal.callAmount)}`}<kbd>C</kbd></Button><Button $primary disabled={!sizing||!valid} onClick={()=>action({type:legal.bet?'BET':'RAISE',amount})}>{legal.bet?'Bet':'Raise to'} {fmt(amount)}<kbd>R</kbd></Button></div>
      <div className="helper"><span>To call <b>{fmt(legal.toCall)}</b></span>{preferences.potOdds&&legal.toCall>0&&<span>Pot odds <b>{Math.round(legal.callAmount/(game.pot+legal.callAmount)*100)}%</b></span>}{preferences.hints&&!tip&&<span>{legal.check?'You can check to see the next action.':legal.call?'Call, raise, or let this one go.':'Call for less by going all-in.'}</span>}</div>
      {tip&&<p className="tip" aria-live="polite"><LightbulbIcon size={14} weight="fill"/>{tip}</p>}
    </>:<div className="waiting"><div><h3>{winner?`${winner.name} takes the table.`:paused?'Paused.':human.eliminated?'You’re out. The table plays on.':game.currentPlayerIndex>=0?<>{game.players[game.currentPlayerIndex].name} is thinking<ThinkingDots/></>:game.phase==='SHOWDOWN'?'The cards are on the table.':game.phase==='HAND_COMPLETE'?'A new hand is on its way.':'Dealing the next street…'}</h3><p>{winner?`${game.handNumber} hands played · Largest pot ${fmt(game.largestPot)}`:paused?'Resume whenever you’re ready.':human.folded?'':''}</p></div>{(winner||human.eliminated)&&<Button $primary $small onClick={()=>start()}>Play again</Button>}</div>}</div>
  </Panel>;
}
