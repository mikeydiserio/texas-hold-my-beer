'use client';
import {cardLabel,SUIT_SYMBOLS,suit} from '../game/cards';
import type {Card} from '../game/types';
export function PlayingCard({card,small=false,highlight=false,dim=false}:{card?:Card;small?:boolean;highlight?:boolean;dim?:boolean}){return <span className={`playing-card ${small?'small':''} ${card&&(suit(card)==='h'||suit(card)==='d')?'red':''} ${highlight?'highlight':''} ${dim?'dim':''} ${!card?'back':''}`} aria-label={card?cardLabel(card):'Face-down card'} role="img">{card?<><b>{card[0]==='T'?'10':card[0]}</b><span>{SUIT_SYMBOLS[suit(card)]}</span></>:<span>♠</span>}</span>;}
