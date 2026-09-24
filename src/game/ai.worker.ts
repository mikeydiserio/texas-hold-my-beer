import { decide } from './ai';
import type { Observation } from './types';
self.onmessage=(event:MessageEvent<{observation:Observation;seed:number}>)=>{self.postMessage(decide(event.data.observation,event.data.seed));};
