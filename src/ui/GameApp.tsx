'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {ArrowsOutSimpleIcon,ArrowCounterClockwiseIcon,ClockCounterClockwiseIcon,CodeIcon,GearSixIcon,InfoIcon,PauseIcon,PlayIcon,PlusIcon,SpadeIcon,SpeakerHighIcon,SpeakerSlashIcon,SquaresFourIcon,TrophyIcon,XIcon} from '@phosphor-icons/react';
import {useGame} from '../state/game-store';
import {useGameClock} from './use-game-clock';
import {useGameSounds} from './use-game-sounds';
import {Button,IconButton} from './primitives';
import {ActionPanel} from './ActionPanel';
import {PlayingCard} from './PlayingCard';
import {TableSetup} from './TableSetup';
import {Help,Settings} from './Settings';
import {cardLabel} from '../game/cards';
import {Shell} from './game-styles';
import {StreetCall} from './StreetCall';
const PokerScene=dynamic(()=>import('../three/PokerScene'),{ssr:false,loading:()=> <div className="scene-loading"><SpadeIcon size={28} weight="fill"/><p>Preparing your table…</p></div>});
const DebugPanel=process.env.NODE_ENV==='development'?dynamic(()=>import('./DebugPanel'),{ssr:false}):null;
const fmt=(n:number)=>n.toLocaleString('en-US');
export default function GameApp(){
  const {game,hydrate,preferences,setPreferences,paused,setPaused,error}=useGame();
  const [modal,setModal]=useState<'setup'|'settings'|'help'|'debug'|null>(null),[history,setHistory]=useState(false),[inspect,setInspect]=useState(false);
  useGameClock();useGameSounds();useEffect(()=>hydrate(),[hydrate]);
  const result=!!game&&['SHOWDOWN','HAND_COMPLETE','TABLE_COMPLETE'].includes(game.phase);
  const awards=game?.awards.filter(a=>!a.refund)||[],winners=[...new Set(awards.map(a=>a.playerIndex))];
  const humanWins=winners.includes(0),won=(i:number)=>awards.filter(a=>a.playerIndex===i).reduce((n,a)=>n+a.amount,0);
  const winningHand=winners.length===1?game?.results[winners[0]]:null;
  const pot=game?game.pot||game.sidePots.reduce((n,p)=>n+p.amount,0):0;
  const streets=['PREFLOP','FLOP','TURN','RIVER'];const phaseIndex=game?streets.indexOf(game.phase):-1;
  const current=game?.currentPlayerIndex??-1;
  return <Shell className="wild-holdem">
    <aside className="sidebar" aria-label="Main navigation"><div className="brand-mark" aria-label="MIKEYS POKER CLUB"><SpadeIcon weight="fill"/></div><nav className="nav-icons"><IconButton $active={!history} title="Poker table" aria-label="Poker table" onClick={()=>setHistory(false)}><SquaresFourIcon/></IconButton><IconButton $active={history} title="Hand history" aria-label="Hand history" onClick={()=>setHistory(!history)}><ClockCounterClockwiseIcon/></IconButton><div className="nav-divider"/><IconButton title="How to play" aria-label="How to play" onClick={()=>setModal('help')}><InfoIcon/></IconButton><IconButton title="Settings" aria-label="Settings" onClick={()=>setModal('settings')}><GearSixIcon/></IconButton></nav><div className="sidebar-bottom">{DebugPanel&&<IconButton title="Developer tools" aria-label="Developer tools" onClick={()=>setModal('debug')}><CodeIcon/></IconButton>}<IconButton title={preferences.sound?'Mute sound':'Enable sound'} aria-label={preferences.sound?'Mute sound':'Enable sound'} onClick={()=>setPreferences({sound:!preferences.sound})}>{preferences.sound?<SpeakerHighIcon/>:<SpeakerSlashIcon/>}</IconButton></div></aside>
    <main className="main"><header className="masthead"><Link href="/" aria-label="Game menu" style={{textDecoration:'none'}} className="wordmark">MIKEYS POKER CLUB</Link><div className="masthead-right"><span className="play-money"><span className="status-dot"/>PLAY CHIPS ONLY</span><Button $small onClick={()=>setModal('setup')}><PlusIcon size={14}/> New table</Button></div></header>
      <div className="room-header"><div className="room-name"><h1>Texas Hold’em</h1><span>NO-LIMIT HOLD’EM</span></div><div className="room-info"><span>Blinds <b>{game?`${fmt(game.config.smallBlind)} / ${fmt(game.config.bigBlind)}`:'25 / 50'}</b></span><span className="seats-count">Seats <b>{game?`${game.players.filter(p=>!p.eliminated).length} / ${game.players.length}`:'6'}</b></span></div></div>
      <div className="table-wrap"><div className="scene"><PokerScene inspect={inspect}/></div><div className="street-track" aria-label="Current street">{streets.map((s,i)=><span key={s} style={{display:'contents'}}>{i>0&&<span className="separator"/>}<span className={game?.phase===s?'current':phaseIndex>i||result?'done':''}>{s==='PREFLOP'?'PRE-FLOP':s}</span></span>)}</div><span className="hand-number">{game?`HAND ${String(game.handNumber).padStart(3,'0')}`:'TABLE 01 · OPEN'}</span>
        {game&&!result?<div className="pot-display" aria-live="polite" aria-atomic="true"><span>TOTAL POT</span><strong>{fmt(pot)}</strong>{game.players.some(p=>p.allIn)&&game.sidePots.filter(p=>p.contributors.length>1).length>1&&<div className="side-pots">{game.sidePots.filter(p=>p.contributors.length>1).map((p,i)=><span key={i}>{i===0?'MAIN':`SIDE ${i}`} · {fmt(p.amount)}</span>)}</div>}</div>:null}
        {result&&game&&<div className="result-banner" role="status"><TrophyIcon size={20}/><div className="result-title">{game.phase==='TABLE_COMPLETE'?'TABLE COMPLETE':winners.length>1?(game.awards.some((a,i)=>game.awards.some((b,j)=>i!==j&&a.potIndex===b.potIndex&&!a.refund&&!b.refund))?'SPLIT POT':'POT RESULTS'):humanWins?`YOU WIN ${fmt(won(0))}`:`${game.players[winners[0]]?.name.toUpperCase()} WINS ${fmt(won(winners[0]))}`}</div>{game.phase==='TABLE_COMPLETE'?<p>{game.players.find(p=>p.stack>0)?.name} wins · {game.handNumber} hands<br/>Largest pot {fmt(game.largestPot)}</p>:winners.length>1?<p>{winners.map(i=>`${game.players[i].name} · ${fmt(won(i))}`).join('  /  ')}</p>:<p>{winningHand?`${winningHand.name} · ${winningHand.description}`:'Everyone else folded.'}</p>}{!preferences.autoMuck&&game.phase==='HAND_COMPLETE'&&!winningHand&&winners.length===1&&<div className="revealed">{game.players[winners[0]].holeCards.map(c=><PlayingCard key={c} card={c} small/>)}</div>}</div>}
        {game&&!preferences.reducedMotion&&preferences.speed!=='Instant'&&<StreetCall key={`${game.handNumber}-${game.phase}`} phase={game.phase}/>}
        {paused&&<div className="paused-label">TABLE PAUSED</div>}
        <div className="table-toolbar">{game&&<IconButton aria-label={paused?'Resume game':'Pause game'} title={paused?'Resume game':'Pause game'} onClick={()=>setPaused(!paused)}>{paused?<PlayIcon weight="fill"/>:<PauseIcon/>}</IconButton>}<IconButton $active={inspect} aria-label={inspect?'Reset camera':'Inspect table'} title={inspect?'Reset camera':'Inspect table'} onClick={()=>setInspect(!inspect)}>{inspect?<ArrowCounterClockwiseIcon/>:<ArrowsOutSimpleIcon/>}</IconButton><IconButton aria-label="Open settings" title="Settings" onClick={()=>setModal('settings')}><GearSixIcon/></IconButton></div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{game?`Hand ${game.handNumber}. ${game.phase}. Board: ${game.communityCards.map(cardLabel).join(', ')||'No cards yet'}. ${current>=0?`${game.players[current].name}'s turn.`:''}`:'Table ready. Take a seat to play.'}</div>
      {error&&<div className="error-bar" role="alert">{error}</div>}<ActionPanel onNewTable={()=>setModal('setup')}/>
      <footer className="footer"><button onClick={()=>setHistory(!history)}><ClockCounterClockwiseIcon size={13} style={{verticalAlign:'middle',marginRight:6}}/>Hand history {game&&<span>· {game.actionHistory.length} actions</span>}</button><button onClick={()=>setModal('help')}>Table guide & shortcuts</button></footer>
      {game&&<details className="accessible-table"><summary>Cards & seat details · accessible table view</summary><div className="board-cards"><span>Board</span>{game.communityCards.map(c=><PlayingCard key={c} card={c} small/>)}{!game.communityCards.length&&'No community cards yet'}</div><table><caption className="sr-only">Current table and revealed hands</caption><thead><tr><th>Player</th><th>Chips</th><th>Bet</th><th>Cards</th><th>Status</th></tr></thead><tbody>{game.players.map((p,i)=><tr key={p.id}><td>{p.name} {i===game.dealerIndex?'(D)':''}{i===game.smallBlindIndex?' (SB)':''}{i===game.bigBlindIndex?' (BB)':''}</td><td>{fmt(p.stack)}</td><td>{fmt(p.currentBet)}</td><td>{p.isHuman||game.results[i]?p.holeCards.map(cardLabel).join(', '):'Face down'}</td><td>{game.results[i]?`${game.results[i].name} — ${game.results[i].description}`:current===i?'Acting':p.lastAction||'Waiting'}</td></tr>)}</tbody></table></details>}
    </main>
    {history&&<aside className="history-panel" aria-label="Hand history"><header><h2>At the table</h2><IconButton aria-label="Close history" onClick={()=>setHistory(false)}><XIcon/></IconButton></header><div className="history-list">{game?.actionHistory.length?[...game.actionHistory].reverse().map(h=><p key={h.id} className={/^Hand #|FLOP|TURN|RIVER/.test(h.text)?'street-entry':''}>{h.text}</p>):<div className="no-history">Your hand history will appear here.</div>}</div><footer>Most recent first · this table only</footer></aside>}
    {modal==='setup'&&<TableSetup onClose={()=>setModal(null)}/>} {modal==='settings'&&<Settings onClose={()=>setModal(null)}/>} {modal==='help'&&<Help onClose={()=>setModal(null)}/>} {modal==='debug'&&DebugPanel&&<DebugPanel onClose={()=>setModal(null)}/>}
  </Shell>;
}
