'use client';
import { useEffect } from 'react';
import { observe } from '../game/engine';
import { decide } from '../game/ai';
import { createAiWorker } from '../game/workers';
import { useGame } from '../state/game-store';
import type { Action } from '../game/types';
export function useGameClock(){
  const game=useGame(s=>s.game),paused=useGame(s=>s.paused),speed=useGame(s=>s.preferences.speed);
  useEffect(()=>{
    if(!game||paused||game.phase==='TABLE_COMPLETE')return;
    const multiplier={Slow:1.6,Normal:1,Fast:.45,Instant:.03}[speed];
    let worker:Worker|undefined;let cancelled=false;
    const wait=game.phase==='SHOWDOWN'?4200:game.phase==='HAND_COMPLETE'?2600:game.currentPlayerIndex<0?1000:game.players[game.currentPlayerIndex].isHuman?-1:750+(game.nextEventId%5)*140;
    if(wait<0)return;
    const timer=setTimeout(()=>{
      if(game.currentPlayerIndex<0){useGame.getState().tick();return;}
      const observation=observe(game),seed=(game.handNumber*7919+game.nextEventId*104729+game.currentPlayerIndex*1009)>>>0;
      const submit=(action:Action)=>{if(!cancelled&&useGame.getState().game===game)useGame.getState().action(action);};
      try{worker=createAiWorker();worker.onmessage=(e:MessageEvent<Action>)=>submit(e.data);worker.onerror=()=>{worker?.terminate();submit(decide(observation,seed));};worker.postMessage({observation,seed});}
      catch{submit(decide(observation,seed));}
    },wait*multiplier);
    return()=>{cancelled=true;clearTimeout(timer);worker?.terminate();};
  },[game,paused,speed]);
}
