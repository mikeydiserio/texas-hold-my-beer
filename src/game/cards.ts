import type { Card, Suit } from './types';
export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
export const SUITS: Suit[] = ['s','h','d','c'];
export const SUIT_SYMBOLS = {s:'♠', h:'♥', d:'♦', c:'♣'};
export const SUIT_NAMES = {s:'Spades', h:'Hearts', d:'Diamonds', c:'Clubs'};
export const RANK_NAMES = ['','','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Jack','Queen','King','Ace'];
export const rank = (c: Card) => RANKS.indexOf(c[0]) + 2;
export const suit = (c: Card) => c[1] as Suit;
export const cardLabel = (c: Card) => `${RANK_NAMES[rank(c)]} of ${SUIT_NAMES[suit(c)]}`;
export const cardText = (c: Card) => `${c[0] === 'T' ? '10' : c[0]}${SUIT_SYMBOLS[suit(c)]}`;
export function newDeck(): Card[] { return SUITS.flatMap(s => RANKS.map(r => `${r}${s}` as Card)); }
export function random(seed: number): [number, number] {
  let x = (seed || 1) >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return [(x >>> 0) / 4294967296, x >>> 0];
}
export function shuffle(seed: number, cards = newDeck()): { deck: Card[]; seed: number } {
  const deck = [...cards];
  for (let i=deck.length-1; i>0; i--) { const [r, next] = random(seed); seed = next; const j = Math.floor(r*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
  return { deck, seed };
}
export function parseCards(text: string): Card[] {
  const cards = text.trim().split(/\s+/).filter(Boolean).map(c => c.replace(/^10/, 'T').slice(0,-1).toUpperCase()+c.slice(-1).toLowerCase()) as Card[];
  if (cards.some(c=>!newDeck().includes(c)) || new Set(cards).size!==cards.length) throw new Error('Use unique cards such as As Kh Td 2c.');
  return cards;
}
