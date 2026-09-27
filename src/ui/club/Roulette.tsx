'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import dynamic from 'next/dynamic';
import {ArrowCounterClockwiseIcon,ArrowsOutSimpleIcon,ArrowClockwiseIcon} from '@phosphor-icons/react';
import {BOARD_CELLS,betLabel,numberColor,returnMultiplier,stakeTotal,type BetKey} from '../../games/roulette';
import {useRoulette} from '../../state/roulette-store';
import {Button,IconButton} from '../primitives';
import {ClubShell,useCardSound} from './ClubShell';
const RouletteScene=dynamic(()=>import('../../three/roulette/RouletteScene'),{ssr:false,loading:()=> <div className="roulette-loading">Preparing the wheel…</div>});
const fmt=(n:number)=>n.toLocaleString('en-US');

export default function Roulette(){
  const {game:g,act,spin}=useRoulette(),sound=useCardSound();
  const [chip,setChip]=useState(25),[inspect,setInspect]=useState(false),[reduced,setReduced]=useState(false);
  const spinning=g.phase==='spinning',settled=g.phase==='settled',pending=settled?[]:g.bets,total=stakeTotal(pending);
  const amounts=new Map<BetKey,number>();pending.forEach(b=>amounts.set(b.key,(amounts.get(b.key)??0)+b.amount));
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{if(g.phase!=='spinning'||!g.spin)return;const id=g.spin.id;const timer=setTimeout(()=>act({type:'settle',id}),Math.max(0,g.spin.startedAt+g.spin.duration-Date.now())+100);return()=>clearTimeout(timer);},[g.phase,g.spin,act]);
  function bet(key:BetKey){if(spinning||g.bank<chip)return;sound.play();act({type:'bet',key,amount:chip});}
  function launch(){setInspect(false);sound.play();spin(reduced);}
  return <ClubShell title="Roulette" sound={sound} rules={<><p>European roulette. One zero, 37 pockets. Each spin uses a fresh, equally likely random result; repeats are possible.</p><ol><li>Choose a chip, then click a number or outside bet. You can place chips directly on the 3D board or use the controls below.</li><li>A single number pays 35:1. A dozen or column pays 2:1. Red / black, odd / even, and low / high pay 1:1. Winning stakes are also returned.</li><li>Zero wins only the bet on zero. All outside bets lose on zero.</li><li>Undo removes your last chip. Clear returns all unplayed chips. Rebet restores your previous bets. Bets lock when the ball is released.</li></ol><p>Play chips only. The camera button lets you rotate and zoom the table. Your table stays here when you return through the menu.</p></>}>
    <main className="roulette-room">
      <div className="roulette-topline"><div className="roulette-bank"><span>CHIPS</span><strong>{fmt(g.bank)}</strong></div><div className="roulette-history" aria-label="Recent results">{g.history.map((n,i)=><span className={`roulette-number ${numberColor(n)}`} key={`${g.round-i}`} aria-label={`${n} ${numberColor(n)}`}>{n}</span>)}</div><IconButton $active={inspect} disabled={spinning} aria-label={inspect?'Reset camera':'Inspect roulette table'} title={inspect?'Reset camera':'Inspect table'} onClick={()=>setInspect(v=>!v)}><ArrowsOutSimpleIcon/></IconButton></div>
      <div className={`roulette-scene ${spinning?'is-spinning':''}`}><RouletteScene game={g} onBet={bet} inspect={inspect}/><span className="roulette-table-type">EUROPEAN · SINGLE ZERO</span></div>
      <div className="roulette-status" role="status" aria-live="polite" aria-atomic="true">{spinning?<span className="roulette-rolling">No more bets</span>:settled&&g.spin?<><span className={`roulette-number result-number ${numberColor(g.spin.number)}`}>{g.spin.number}</span><span>{g.returned>0?`Returned ${fmt(g.returned)}`:'No win'}<small>{g.returned-g.stake>0?'+':''}{fmt(g.returned-g.stake)} chips</small></span></>:<span>{total?`${fmt(total)} on the table`:'Place your bets'}</span>}</div>
      <div className="roulette-bets" aria-label="Roulette betting board">{BOARD_CELLS.map(cell=>{
        const isNumber=cell.key.startsWith('number:'),n=Number(cell.key.split(':')[1]),amount=amounts.get(cell.key),hit=settled&&g.spin&&(isNumber?n===g.spin.number:!!amount&&returnMultiplier(cell.key,g.spin.number)>0);
        return <button key={cell.key} className={`roulette-bet ${isNumber?numberColor(n):cell.key==='red'||cell.key==='black'?cell.key:'outside'} ${hit?'winning':''}`} style={{gridColumn:`${Math.round(cell.x*14)+1} / span ${Math.round(cell.w*14)}`,gridRow:`${Math.round(cell.y*5)+1} / span ${Math.round(cell.h*5)}`} as CSSProperties} disabled={spinning||g.bank<chip} onClick={()=>bet(cell.key)} aria-label={`Bet on ${betLabel(cell.key)}${amount?`, ${amount} chips placed`:''}`}><span>{cell.key.startsWith('column:')?'2:1':betLabel(cell.key)}</span>{amount&&<b className="roulette-bet-chip">{amount}</b>}</button>;
      })}</div>
      <div className="roulette-controls"><div className="bet-selector" aria-label="Chip value">{[5,25,100,500].map(value=><button key={value} className={`bet-chip ${chip===value?'selected':''}`} disabled={spinning||g.bank<value} aria-label={`${value} chip`} aria-pressed={chip===value} onClick={()=>setChip(value)}>{value}</button>)}</div><div className="roulette-bet-tools"><IconButton title="Undo last chip" aria-label="Undo last chip" disabled={spinning||!total} onClick={()=>act({type:'undo'})}><ArrowCounterClockwiseIcon/></IconButton><Button $small disabled={spinning||!total} onClick={()=>act({type:'clear'})}>Clear</Button><Button $small disabled={spinning||!!total||!g.previous.length||stakeTotal(g.previous)>g.bank} onClick={()=>act({type:'repeat'})}><ArrowClockwiseIcon size={14}/>Rebet</Button></div><Button $primary disabled={spinning||!total} onClick={launch}>{spinning?'Spinning…':`Spin${total?` · ${fmt(total)}`:''}`}</Button>{g.bank<5&&!total&&!spinning&&<Button $small onClick={()=>act({type:'refill'})}>Refill 1,000 play chips</Button>}</div>
      <div className="club-footnote">PLAY CHIPS ONLY</div>
    </main>
  </ClubShell>;
}
