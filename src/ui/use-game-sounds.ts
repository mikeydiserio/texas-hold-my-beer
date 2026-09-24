'use client';
import {useEffect,useRef} from 'react';
import {useGame} from '../state/game-store';
export function useGameSounds(){
  const game=useGame(s=>s.game),enabled=useGame(s=>s.preferences.sound),ctx=useRef<AudioContext|null>(null),last=useRef(0);
  useEffect(()=>{const unlock=()=>{if(useGame.getState().preferences.sound){ctx.current??=new AudioContext();void ctx.current.resume();}};window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);void ctx.current?.close();ctx.current=null;};},[]);
  useEffect(()=>{if(!game)return;const events=game.events.filter(e=>e.id>last.current);last.current=game.nextEventId-1;if(!enabled||!ctx.current||ctx.current.state!=='running')return;const ac=ctx.current;
    events.slice(-4).forEach((e,i)=>{const now=ac.currentTime+i*.065;const freq={DEAL:720,BET:1450,FOLD:270,CHECK:360,COLLECT:1200,BOARD:840,SHOWDOWN:660,AWARD:990,COMPLETE:440}[e.type];const osc=ac.createOscillator(),gain=ac.createGain();osc.type=e.type==='AWARD'?'sine':'triangle';osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(freq*.6,now+.10);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(e.type==='AWARD'?.035:.025,now+.005);gain.gain.exponentialRampToValueAtTime(.0001,now+.14);osc.connect(gain);gain.connect(ac.destination);osc.start(now);osc.stop(now+.15);});
  },[game,enabled]);
}
