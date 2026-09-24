'use client';
import {useState} from 'react';
import {useGame} from '../state/game-store';
import {allInScenario,assignCards,forceStacks,runToShowdown} from '../game/debug';
import {Button,Field} from './primitives';
import {Modal} from './Modal';
export default function DebugPanel({onClose}:{onClose:()=>void}){
  const {game,replaceGame,paused,setPaused,tick,restartHand,start,preferences,setPreferences}=useGame();const [hole,setHole]=useState(game?.players[0].holeCards.join(' ')||''),[board,setBoard]=useState(game?.communityCards.join(' ')||''),[stacks,setStacks]=useState(game?.players.map(p=>p.stack+p.totalContribution).join(', ')||''),[error,setError]=useState('');
  if(process.env.NODE_ENV!=='development')return null;
  const run=(fn:()=>void)=>{try{fn();setError('');}catch(e){setError((e as Error).message);}};
  return <Modal title="Developer table." subtitle="Development only. Scenario tools replace the current hand." onClose={onClose}>
    <div className="preset-row"><Button $small onClick={()=>setPaused(!paused)}>{paused?'Resume AI':'Pause AI'}</Button><Button $small disabled={!game||game.currentPlayerIndex>=0} onClick={()=>run(tick)}>Advance phase</Button><Button $small onClick={()=>setPreferences({speed:preferences.speed==='Instant'?'Normal':'Instant',reducedMotion:preferences.speed!=='Instant'})}>{preferences.speed==='Instant'?'Normal delays':'Skip animation delays'}</Button><Button $small onClick={restartHand}>Restart hand</Button><Button $small onClick={()=>start()}>Restart table</Button></div>
    {game&&<><div className="two-col" style={{marginTop:20}}><Field>Your hole cards<input value={hole} onChange={e=>setHole(e.target.value)} placeholder="As Ah"/></Field><Field>Board ({game.communityCards.length} cards)<input value={board} onChange={e=>setBoard(e.target.value)} placeholder="Ad Kc Kd"/></Field></div><Button $small style={{marginTop:10}} onClick={()=>run(()=>replaceGame(assignCards(game,hole,board)))}>Assign cards</Button><Field style={{marginTop:18}}>Stacks, clockwise from you<input value={stacks} onChange={e=>setStacks(e.target.value)}/></Field><div className="preset-row" style={{marginTop:10}}><Button $small onClick={()=>run(()=>{setPaused(true);replaceGame(forceStacks(game,stacks));})}>Force stacks</Button><Button $small onClick={()=>run(()=>{setPaused(true);replaceGame(allInScenario(game));})}>Force 3-way all-in</Button><Button $small onClick={()=>run(()=>{setPaused(true);replaceGame(runToShowdown(game));})}>Run to showdown</Button></div><details style={{marginTop:20}}><summary>Complete engine state & deck</summary><pre style={{fontSize:10,overflow:'auto',maxHeight:280}}>{JSON.stringify(game,null,2)}</pre></details></>}{error&&<p className="error" role="alert">{error}</p>}
  </Modal>;
}
