'use client';
import {useState} from 'react';
import {ArrowRightIcon,SpadeIcon} from '@phosphor-icons/react';
import {useGame} from '../state/game-store';
import {validateConfig} from '../game/engine';
import type {Config} from '../game/types';
import {Modal} from './Modal';
import {Button,Field} from './primitives';
export function TableSetup({onClose}:{onClose:()=>void}){
  const store=useGame(),[config,setConfig]=useState(store.config),[error,setError]=useState('');
  const update=(p:Partial<Config>)=>setConfig({...config,...p});
  return <Modal title={store.game?'A fresh table.':'Your seat is waiting.'} subtitle="Set the stakes, meet your opponents, and settle in." onClose={onClose}>
    <form onSubmit={e=>{e.preventDefault();try{validateConfig(config);store.start(config);onClose();}catch(err){setError((err as Error).message);}}}>
      <div className="two-col"><Field>Players, including you<select value={config.playerCount} onChange={e=>update({playerCount:+e.target.value})}>{[2,3,4,5,6,7,8,9].map(n=><option key={n} value={n}>{n} players{n===2?' · heads-up':n===6?' · classic':''}</option>)}</select></Field><Field>AI difficulty<select value={config.difficulty} onChange={e=>update({difficulty:e.target.value as Config['difficulty']})}>{['Casual','Normal','Strong'].map(s=><option key={s}>{s}</option>)}</select></Field></div>
      <Field>Starting chips per player<input type="number" min={config.bigBlind*2} max={1000000} step="1" required value={config.startingStack||''} onChange={e=>update({startingStack:+e.target.value})}/><div className="preset-row">{[1000,2500,5000,10000].map(n=><Button key={n} type="button" $small $primary={config.startingStack===n} onClick={()=>update({startingStack:n})}>{n.toLocaleString()}</Button>)}</div></Field>
      <div className="two-col"><Field>Small blind<input type="number" min="1" step="1" required value={config.smallBlind||''} onChange={e=>update({smallBlind:+e.target.value})}/></Field><Field>Big blind<input type="number" min={config.smallBlind*2} step="1" required value={config.bigBlind||''} onChange={e=>update({bigBlind:+e.target.value})}/></Field></div>
      <Field>Game pace<select value={store.preferences.speed} onChange={e=>store.setPreferences({speed:e.target.value as typeof store.preferences.speed})}>{['Slow','Normal','Fast','Instant'].map(s=><option key={s}>{s}</option>)}</select></Field>
      {error&&<p className="error" role="alert">{error}</p>}<div className="modal-footer"><p><SpadeIcon size={14} style={{verticalAlign:'middle'}}/> Play chips only.<br/>No accounts. Just poker.</p><Button $primary type="submit">Take a seat <ArrowRightIcon size={17}/></Button></div>
    </form>
  </Modal>;
}
