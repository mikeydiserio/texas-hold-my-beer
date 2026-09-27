import {rank, shuffle, suit} from '../game/cards';
import type {Card} from '../game/types';
export type Pile = {type:'tableau'|'foundation'; index:number} | {type:'waste'};
export type Source = Pile & {offset:number};
export type SolitaireState = {stock:Card[];waste:Card[];foundations:Card[][];tableau:Card[][];faceUp:Card[];moves:number};
export const solitaireRank=(c:Card)=>rank(c)===14?1:rank(c);
const red=(c:Card)=>['h','d'].includes(suit(c));
export function dealSolitaire(seed:number):SolitaireState {
  const deck=shuffle(seed).deck, tableau:Card[][]=Array.from({length:7},()=>[]),faceUp:Card[]=[];
  for(let row=0;row<7;row++)for(let col=row;col<7;col++){const c=deck.pop()!;tableau[col].push(c);if(col===row)faceUp.push(c);}
  return {stock:deck,waste:[],foundations:[[],[],[],[]],tableau,faceUp,moves:0};
}
export function pileCards(s:SolitaireState,p:Pile):Card[]{return p.type==='waste'?s.waste:p.type==='tableau'?s.tableau[p.index]??[]:s.foundations[p.index]??[];}
export function canMove(s:SolitaireState,from:Source,to:Pile) {
  if(to.type==='waste')return false;
  if(from.type!=='waste'&&from.type===to.type&&from.index===to.index)return false;
  const source=pileCards(s,from), moving=source.slice(from.offset), target=pileCards(s,to), card=moving[0];
  if(from.offset<0||!card||!moving.every(c=>s.faceUp.includes(c)))return false;
  if(from.type!=='tableau'&&from.offset!==source.length-1)return false;
  if(!moving.every((c,i)=>i===0 || (solitaireRank(moving[i-1])===solitaireRank(c)+1 && red(moving[i-1])!==red(c))))return false;
  if(to.type==='foundation')return moving.length===1 && (target.length===0?solitaireRank(card)===1:suit(card)===suit(target[0])&&solitaireRank(card)===target.length+1);
  return target.length===0?solitaireRank(card)===13:solitaireRank(target.at(-1)!)===solitaireRank(card)+1 && red(target.at(-1)!)!==red(card);
}
export function moveCards(s:SolitaireState,from:Source,to:Pile):SolitaireState {
  if(!canMove(s,from,to))return s;
  const next=structuredClone(s), source=pileCards(next,from), moving=source.splice(from.offset);
  pileCards(next,to).push(...moving);
  if(from.type==='tableau'&&source.length&&!next.faceUp.includes(source.at(-1)!))next.faceUp.push(source.at(-1)!);
  next.moves++;return next;
}
export function drawCard(s:SolitaireState):SolitaireState {
  if(!s.stock.length&&!s.waste.length)return s;
  const next=structuredClone(s);
  if(next.stock.length){const c=next.stock.pop()!;next.waste.push(c);if(!next.faceUp.includes(c))next.faceUp.push(c);}
  else {next.stock=next.waste.reverse();next.waste=[];next.faceUp=next.faceUp.filter(c=>!next.stock.includes(c));}
  next.moves++;return next;
}
export function legalMoves(s:SolitaireState):{from:Source;to:Pile}[] {
  const sources:Source[]=[];
  if(s.waste.length)sources.push({type:'waste',offset:s.waste.length-1});
  s.tableau.forEach((cards,index)=>cards.forEach((c,offset)=>{if(s.faceUp.includes(c))sources.push({type:'tableau',index,offset});}));
  const targets:Pile[]=[...s.foundations.map((_,index)=>({type:'foundation' as const,index})),...s.tableau.map((_,index)=>({type:'tableau' as const,index}))];
  return sources.flatMap(from=>targets.filter(to=>canMove(s,from,to)).map(to=>({from,to}))).filter(({from,to})=>!(from.type==='tableau'&&from.offset===0&&to.type==='tableau'&&!s.tableau[to.index].length));
}
export const isWon=(s:SolitaireState)=>s.foundations.every(p=>p.length===13);
export function safeFoundationMove(s:SolitaireState) {
  return legalMoves(s).find(({from,to})=>{
    if(to.type!=='foundation')return false;
    const c=pileCards(s,from)[from.offset],r=solitaireRank(c);
    return r<=2 || ['s','h','d','c'].filter(su=>red(`2${su}` as Card)!==red(c)).every(su=>(s.foundations.find(p=>p.length&&suit(p[0])===su)?.length??0)>=r-1);
  });
}
