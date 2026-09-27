'use client';
import {create} from 'zustand';
import {initialRoulette,makeSpin,rouletteReducer,spinPose,type RouletteState,type RouletteAction} from '../games/roulette';
export const useRoulette=create<{game:RouletteState;act:(a:RouletteAction)=>void;spin:(reduced:boolean)=>void}>((set,get)=>({
  game:initialRoulette,
  act:a=>set(s=>({game:rouletteReducer(s.game,a)})),
  spin:reduced=>{const s=get().game;if(s.phase!=='betting'||!s.bets.length)return;const rotation=s.spin?spinPose(s.spin,1).wheel%(Math.PI*2):0;get().act({type:'spin',spin:makeSpin(s.round+1,rotation,reduced)});},
}));
