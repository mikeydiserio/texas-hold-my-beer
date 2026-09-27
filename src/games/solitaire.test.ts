import {describe,it,expect} from 'vitest';
import {newDeck} from '../game/cards';
import {canMove,dealSolitaire,drawCard,isWon,legalMoves,moveCards,safeFoundationMove,type SolitaireState} from './solitaire';
const empty=():SolitaireState=>({stock:[],waste:[],foundations:[[],[],[],[]],tableau:Array.from({length:7},()=>[]),faceUp:[],moves:0});
const all=(s:SolitaireState)=>[...s.stock,...s.waste,...s.foundations.flat(),...s.tableau.flat()];
describe('Klondike solitaire',()=>{
  it('deals 52 unique cards, seven correctly sized piles and one exposed card per pile',()=>{
    for(let seed=1;seed<=50;seed++){const s=dealSolitaire(seed);expect(s.tableau.map(p=>p.length)).toEqual([1,2,3,4,5,6,7]);expect(s.stock).toHaveLength(24);expect(s.faceUp).toEqual(s.tableau.map(p=>p.at(-1)));expect(new Set(all(s)).size).toBe(52);}
  });
  it('recycles waste in its original draw order without exposing stock cards',()=>{
    const start=dealSolitaire(42);let s=start;
    for(let i=0;i<24;i++)s=drawCard(s);
    const first=s.waste[0];expect(s.stock).toHaveLength(0);s=drawCard(s);
    expect(s.stock).toEqual(start.stock);expect(s.waste).toEqual([]);expect(s.faceUp).toEqual(start.faceUp);expect(drawCard(s).waste).toEqual([first]);
  });
  it('allows descending alternating-colour sequences and reveals the covered card',()=>{
    const s=empty();s.tableau[0]=['2s','Qh','Jc'];s.tableau[1]=['Ks'];s.faceUp=['Qh','Jc','Ks'];
    const next=moveCards(s,{type:'tableau',index:0,offset:1},{type:'tableau',index:1});
    expect(next.tableau[0]).toEqual(['2s']);expect(next.tableau[1]).toEqual(['Ks','Qh','Jc']);expect(next.faceUp).toContain('2s');expect(next.moves).toBe(1);expect(s.tableau[0]).toHaveLength(3);
  });
  it('rejects same colour, hidden cards, invalid sequences and non-kings in empty columns',()=>{
    const s=empty();s.tableau[0]=['Qs','Jh'];s.tableau[1]=['Ks'];s.faceUp=['Qs','Jh','Ks'];
    expect(canMove(s,{type:'tableau',index:0,offset:0},{type:'tableau',index:1})).toBe(false);
    expect(canMove(s,{type:'tableau',index:0,offset:1},{type:'tableau',index:2})).toBe(false);
    s.tableau[0]=['Kh','Qh'];s.faceUp=['Kh','Qh'];expect(canMove(s,{type:'tableau',index:0,offset:0},{type:'tableau',index:2})).toBe(false);
    s.faceUp=[];expect(moveCards(s,{type:'tableau',index:0,offset:0},{type:'tableau',index:2})).toBe(s);
  });
  it('builds foundations ace up in suit and only moves the top waste card',()=>{
    const s=empty();s.waste=['As','2s'];s.faceUp=['As','2s'];
    expect(canMove(s,{type:'waste',offset:0},{type:'foundation',index:0})).toBe(false);
    expect(canMove(s,{type:'waste',offset:1},{type:'foundation',index:0})).toBe(false);
    s.foundations[0]=['As'];s.waste=['2s'];
    const next=moveCards(s,{type:'waste',offset:0},{type:'foundation',index:0});expect(next.foundations[0]).toEqual(['As','2s']);expect(next.waste).toEqual([]);
    s.waste=['2h'];s.faceUp.push('2h');expect(canMove(s,{type:'waste',offset:0},{type:'foundation',index:0})).toBe(false);
  });
  it('can take a foundation card back to the tableau',()=>{
    const s=empty();s.foundations[0]=['As','2s'];s.tableau[0]=['3h'];s.faceUp=['As','2s','3h'];
    const n=moveCards(s,{type:'foundation',index:0,offset:1},{type:'tableau',index:0});expect(n.foundations[0]).toEqual(['As']);expect(n.tableau[0]).toEqual(['3h','2s']);
  });
  it('auto does not bury cards needed by lower opposite-colour ranks',()=>{
    const s=empty();s.foundations[0]=['As','2s'];s.waste=['3s'];s.faceUp=['As','2s','3s'];expect(safeFoundationMove(s)).toBeUndefined();
    s.foundations[1]=['Ah','2h'];s.foundations[2]=['Ad','2d'];expect(safeFoundationMove(s)?.to).toEqual({type:'foundation',index:0});
  });
  it('preserves all 52 cards through repeated legal moves and draws',()=>{
    let s=dealSolitaire(789);
    for(let i=0;i<200;i++){const move=legalMoves(s)[0];s=move?moveCards(s,move.from,move.to):drawCard(s);expect(all(s).sort()).toEqual(newDeck().sort());expect(s.tableau.every(p=>!p.length||s.faceUp.includes(p.at(-1)!))).toBe(true);}
  });
  it('wins only when all four foundations are complete',()=>{const s=empty();expect(isWon(s)).toBe(false);s.foundations=['s','h','d','c'].map(suit=>newDeck().filter(c=>c[1]===suit));expect(isWon(s)).toBe(true);});
});
