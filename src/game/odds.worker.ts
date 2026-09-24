import { handOdds } from './odds';
import type { Card } from './types';
self.onmessage=(event:MessageEvent<{id:number;hole:Card[];board:Card[];opponents:number;seed:number}>)=>{const {id,hole,board,opponents,seed}=event.data;self.postMessage({id,odds:handOdds(hole,board,opponents,seed)});};
