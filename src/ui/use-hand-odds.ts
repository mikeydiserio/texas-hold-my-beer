'use client';
import { useEffect, useRef, useState } from 'react';
import { handOdds, type HandOdds } from '../game/odds';
import { createOddsWorker } from '../game/workers';
import type { GameState } from '../game/types';
/** Background win-odds for the human seat. Recomputes only when their cards, the board, or live opponents change. */
export function useHandOdds(game:GameState|null,enabled:boolean):HandOdds|null{
  const human=game?.players[0],live=!!game&&!!human&&enabled&&human.holeCards.length===2&&!human.folded&&!human.eliminated&&['PREFLOP','FLOP','TURN','RIVER'].includes(game.phase);
  const opponents=live?game!.players.filter(p=>!p.isHuman&&!p.folded&&!p.eliminated).length:0;
  const key=live?`${game!.handNumber}|${human!.holeCards.join('')}|${game!.communityCards.join('')}|${opponents}`:'';
  const [result,setResult]=useState<{key:string;odds:HandOdds}|null>(null),worker=useRef<Worker|null>(null),request=useRef(0);
  useEffect(()=>()=>{worker.current?.terminate();worker.current=null;},[]);
  useEffect(()=>{
    if(!key)return;
    const id=++request.current,hole=[...human!.holeCards],board=[...game!.communityCards],seed=[...key].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
    const accept=(odds:HandOdds)=>{if(id===request.current)setResult({key,odds});};
    // A smaller synchronous estimate is deferred so it never blocks the frame that changed the board.
    const fallback=()=>setTimeout(()=>accept(handOdds(hole,board,opponents,seed,300)),0);
    try{
      worker.current??=createOddsWorker();
      worker.current.onmessage=(e:MessageEvent<{id:number;odds:HandOdds}>)=>{if(e.data.id===request.current)accept(e.data.odds);};
      worker.current.onerror=()=>{worker.current?.terminate();worker.current=null;fallback();};
      worker.current.postMessage({id,hole,board,opponents,seed});
    }catch{fallback();}
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every input.
  },[key]);
  return result&&result.key===key?result.odds:null;
}
