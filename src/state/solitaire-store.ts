'use client';
import {create} from 'zustand';
import {dealSolitaire,type SolitaireState} from '../games/solitaire';

type Session={
  game:SolitaireState|null;
  history:SolitaireState[];
  deal:number;
  set:(game:SolitaireState)=>void;
  fresh:()=>void;
  undo:()=>void;
};
export const useSolitaire=create<Session>((set)=>({
  game:null,history:[],deal:0,
  set:game=>set(state=>game===state.game?{}:{game,history:state.game?[...state.history.slice(-199),state.game]:[]}),
  fresh:()=>set(state=>({game:dealSolitaire(crypto.getRandomValues(new Uint32Array(1))[0]),history:[],deal:state.deal+1})),
  undo:()=>set(state=>state.history.length?{game:state.history.at(-1)!,history:state.history.slice(0,-1)}:{}),
}));
