'use client';
import Link from 'next/link';
import {ArrowUpRightIcon,SpadeIcon} from '@phosphor-icons/react';
import type {CSSProperties} from 'react';
const games=[
  {name:'Texas Hold’em',short:'Hold’em',prefix:'Texas',href:'/holdem'},
  {name:'Blackjack',short:'Blackjack',prefix:'',href:'/blackjack'},
  {name:'Solitaire',short:'Solitaire',prefix:'',href:'/solitaire'},
  {name:'Roulette',short:'Roulette',prefix:'',href:'/roulette'},
];
// Hover "line boil": each seed redraws the poster's linework slightly differently, and
// cycling through them reads as hand-drawn animation frames (see .wild-poster in wild-hand.css).
const boilFilters=<svg className="wild-boil-defs" aria-hidden="true" focusable="false">{[3,11,23].map((seed,i)=><filter id={`poster-boil-${i}`} key={seed}><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves={2} seed={seed}/><feDisplacementMap in="SourceGraphic" scale={5} xChannelSelector="R" yChannelSelector="G"/></filter>)}</svg>;
export default function GameMenu(){
  return <main className="wild-menu">
    <header className="wild-menu-header"><span className="wild-emblem" aria-hidden="true"><SpadeIcon weight="fill"/></span><h1>MIKEYS <span>POKER CLUB</span></h1><span className="wild-header-suit" aria-hidden="true">♠</span></header>
    <nav className="wild-game-menu" aria-label="Choose a game">{games.map((game,i)=><Link href={game.href} key={game.href} aria-label={game.name} className={`wild-game-link wild-game-${i}`} style={{'--game-index':i,'--poster-position':`${i*100/3}%`,'--poster-tilt':`${[-1.8,1.2,-.8,1.8][i]}deg`} as CSSProperties}><div className="wild-poster" aria-hidden="true"/><div className="wild-game-title"><h2>{game.prefix&&<span>{game.prefix}</span>}{game.short}</h2><ArrowUpRightIcon weight="bold" aria-hidden="true"/></div></Link>)}</nav>
    {boilFilters}
  </main>;
}
