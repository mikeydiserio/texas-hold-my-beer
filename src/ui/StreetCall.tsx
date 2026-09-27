'use client';
import type {Phase} from '../game/types';
// Three dots that hop in turn; the timing lives in wild-hand.css (.think-dots).
export function ThinkingDots(){return <span className="think-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>;}
const CALLS:Partial<Record<Phase,string>>={FLOP:'Flop',TURN:'Turn',RIVER:'River'};
// Slams the street name over the table when its cards land. Mount it keyed by hand + phase: the
// animation plays once and ends invisible, so a remount is what replays it on the next street.
export function StreetCall({phase}:{phase:Phase}){
  const label=CALLS[phase];if(!label)return null;
  return <div className="street-call" aria-hidden="true"><span><b>{label}</b></span></div>;
}
