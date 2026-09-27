import type {Card as CardValue} from '../../game/types';
import {cardLabel, SUIT_SYMBOLS, suit} from '../../game/cards';
const Crown=()=><svg viewBox="0 0 100 76" aria-hidden="true"><path d="M4 58 9 14 30 36 50 2 70 36 91 14 96 58Z"/><rect x="4" y="63" width="92" height="11"/></svg>;
export function Card({card,down=false}:{card:CardValue;down?:boolean}) {
  const symbol=SUIT_SYMBOLS[suit(card)],label=card[0]==='T'?'10':card[0],face=card[0]==='A'?'ace':'JQK'.includes(card[0])?'court':'pip';
  return <span className={`club-card face-${face} ${down?'is-down':''} ${['h','d'].includes(suit(card))?'is-red':''}`} role="img" aria-label={down?'Face-down card':cardLabel(card)}>
    <span className="card-flipper"><span className="card-front"><span className="card-corner"><b>{label}</b><i>{symbol}</i></span>{face==='court'?<span className="card-court"><Crown/><b>{label}</b></span>:<span className="card-pip">{symbol}</span>}<span className="card-corner card-corner-bottom"><b>{label}</b><i>{symbol}</i></span></span><span className="card-reverse"><span>♠</span></span></span>
  </span>;
}
