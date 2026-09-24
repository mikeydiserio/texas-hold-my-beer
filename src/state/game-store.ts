'use client';
import { create } from 'zustand';
import { act, advance, createGame, DEFAULT_CONFIG, startHand } from '../game/engine';
import type { Action, Config, GameState, Preferences } from '../game/types';
export const DEFAULT_PREFS:Preferences={sound:false,speed:'Normal',reducedMotion:false,helper:true,potOdds:true,hints:true,winOdds:true,autoMuck:true,camera:'player'};
interface Store {
  game:GameState|null; handStart:GameState|null; config:Config; preferences:Preferences; paused:boolean; error:string;
  start:(config?:Config)=>void; action:(a:Action)=>void; tick:()=>void;
  setPreferences:(p:Partial<Preferences>)=>void; hydrate:()=>void; setPaused:(v:boolean)=>void;
  replaceGame:(s:GameState)=>void; restartHand:()=>void;
}
function seed(){return crypto.getRandomValues(new Uint32Array(1))[0]||1;}
export const useGame=create<Store>((set,get)=>({
  game:null,handStart:null,config:DEFAULT_CONFIG,preferences:DEFAULT_PREFS,paused:false,error:'',
  start:(config=get().config)=>{try{const game=startHand(createGame(config,seed()));set({game,handStart:structuredClone(game),config,paused:false,error:''});}catch(e){set({error:(e as Error).message});}},
  action:a=>{const s=get().game;if(!s)return;try{set({game:act(s,a),error:''});}catch(e){set({error:(e as Error).message});}},
  tick:()=>{const s=get().game;if(!s)return;try{const game=advance(s);set({game,...(game.handNumber!==s.handNumber?{handStart:structuredClone(game)}:{}),error:''});}catch(e){set({error:(e as Error).message,paused:true});}},
  setPreferences:p=>{const preferences={...get().preferences,...p};set({preferences});try{localStorage.setItem('after-hours-preferences',JSON.stringify(preferences));}catch{/* Private browsing may deny storage. */}},
  hydrate:()=>{try{const raw=JSON.parse(localStorage.getItem('after-hours-preferences')||'{}');const p:Partial<Preferences>={};for(const key of ['sound','reducedMotion','helper','potOdds','hints','winOdds','autoMuck'] as const)if(typeof raw[key]==='boolean')p[key]=raw[key];if(['Slow','Normal','Fast','Instant'].includes(raw.speed))p.speed=raw.speed;if(['player','overhead'].includes(raw.camera))p.camera=raw.camera;set({preferences:{...DEFAULT_PREFS,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,...p}});}catch{/* Defaults remain usable. */}},
  setPaused:paused=>set({paused}),replaceGame:game=>set({game,error:''}),
  restartHand:()=>{const s=get().handStart;if(s)set({game:structuredClone(s),paused:true,error:''});},
}));
