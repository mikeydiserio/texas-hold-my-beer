'use client';
import {create} from 'zustand';
import {blackjackReducer,initialBlackjack,type BlackjackAction,type BlackjackState} from '../games/blackjack';

export const useBlackjack=create<{game:BlackjackState;act:(action:BlackjackAction)=>void}>((set)=>({
  game:initialBlackjack,
  act:action=>set(state=>({game:blackjackReducer(state.game,action)})),
}));
