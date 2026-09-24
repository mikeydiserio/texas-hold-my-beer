import { newDeck, random, rank } from './cards';
import { evaluate, HAND_NAMES } from './evaluator';
import type { Card, EvaluatedHand, LegalActions } from './types';

export interface Improvement { category: number; name: string; chance: number }
export interface HandOdds {
  /** Share of simulations won outright, split, or lost against random opponent holdings. */
  win: number; tie: number; lose: number;
  /** Expected share of the pot: wins plus fractional split shares. */
  equity: number;
  opponents: number; samples: number;
  /** Chance of finishing on the river with a better category than the current one. */
  improveChance: number; improvements: Improvement[];
  /** Unseen cards that improve the made hand using a hole card; null when no card is still to come. */
  outs: number | null;
}

/** Cards forming the made part of a hand, without kickers. */
export function keyCards(hand: EvaluatedHand): Card[] {
  if ([4, 5, 6, 8, 9].includes(hand.category)) return hand.bestFive;
  if (hand.category === 0) return [hand.bestFive.reduce((a, b) => rank(b) > rank(a) ? b : a)];
  const counts = new Map<number, number>();
  for (const c of hand.bestFive) counts.set(rank(c), (counts.get(rank(c)) || 0) + 1);
  return hand.bestFive.filter(c => counts.get(rank(c))! >= 2);
}

/** The strongest hand available now. Before the flop only pocket pairs count as made. */
export function currentHand(hole: Card[], board: Card[]): { category: number; name: string; bestFive: Card[]; key: Card[] } {
  if (hole.length + board.length >= 5) { const hand = evaluate([...hole, ...board]); return { ...hand, key: keyCards(hand) }; }
  const pair = hole.length === 2 && rank(hole[0]) === rank(hole[1]);
  return { category: pair ? 1 : 0, name: HAND_NAMES[pair ? 1 : 0], bestFive: [...hole], key: pair ? [...hole] : [] };
}

function countOuts(hole: Card[], board: Card[], unseen: Card[], category: number): number | null {
  if (board.length < 3 || board.length > 4) return null;
  return unseen.filter(card => {
    const hand = evaluate([...hole, ...board, card]);
    return hand.category > category && keyCards(hand).some(c => hole.includes(c));
  }).length;
}

/** Monte Carlo estimate against `opponents` random hands. Uses only the viewer's cards and the public board. */
export function handOdds(hole: Card[], board: Card[], opponents: number, seed: number, samples = 1500): HandOdds {
  const known = new Set([...hole, ...board]), pool = newDeck().filter(c => !known.has(c));
  const current = currentHand(hole, board).category, missing = 5 - board.length, need = missing + opponents * 2;
  const outs = countOuts(hole, board, pool, current);
  if (opponents <= 0) return { win: 1, tie: 0, lose: 0, equity: 1, opponents: 0, samples: 0, improveChance: 0, improvements: [], outs };
  const finals = new Array<number>(10).fill(0);
  let win = 0, tie = 0, lose = 0, equity = 0, s = seed >>> 0 || 1;
  for (let n = 0; n < samples; n++) {
    // Partial Fisher–Yates: the first `need` pool cards become a uniform random draw.
    for (let i = 0; i < need; i++) { const [r, next] = random(s); s = next; const j = i + Math.floor(r * (pool.length - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const runout = [...board, ...pool.slice(0, missing)], hero = evaluate([...hole, ...runout]);
    finals[hero.category]++;
    let ties = 1, lost = false;
    for (let o = 0; o < opponents; o++) {
      const score = evaluate([pool[missing + o * 2], pool[missing + o * 2 + 1], ...runout]).score;
      if (score > hero.score) { lost = true; break; }
      if (score === hero.score) ties++;
    }
    if (lost) lose++; else if (ties > 1) { tie++; equity += 1 / ties; } else { win++; equity++; }
  }
  const improvements = missing === 0 ? [] : finals
    .map((count, category) => ({ category, name: HAND_NAMES[category], chance: count / samples }))
    .filter(i => i.category > current && i.chance >= .02)
    .sort((a, b) => b.chance - a.chance).slice(0, 3);
  const improveChance = missing === 0 ? 0 : finals.slice(current + 1).reduce((a, b) => a + b, 0) / samples;
  return { win: win / samples, tie: tie / samples, lose: lose / samples, equity: equity / samples, opponents, samples, improveChance, improvements, outs };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
/** One short, plain-language suggestion. It is guidance against random hands, not a solver. */
export function oddsTip(odds: HandOdds, legal: LegalActions, pot: number): string {
  const draw = odds.outs && odds.outs >= 4 ? ` ${odds.outs} outs to improve.` : '';
  if (legal.toCall > 0 && legal.callAmount > 0) {
    const needed = legal.callAmount / (pot + legal.callAmount);
    if (odds.equity >= needed + .05) return `Your pot share is about ${pct(odds.equity)} and the call needs ${pct(needed)} — calling pays off over time.${draw}`;
    if (odds.equity <= needed - .05) return `The call needs ${pct(needed)} but your pot share is about ${pct(odds.equity)}. Folding is reasonable.${draw}`;
    return `Close spot: a ${pct(odds.equity)} pot share against the ${pct(needed)} this call needs.${draw}`;
  }
  const fair = 1 / (odds.opponents + 1);
  if (odds.equity >= Math.max(.55, fair + .15)) return `You’re likely ahead (${pct(odds.equity)}). A bet can build the pot.${draw}`;
  if (odds.equity < fair) return `Below an even share against ${odds.opponents} ${odds.opponents === 1 ? 'opponent' : 'opponents'}. Checking keeps it cheap.${draw}`;
  return `Middling strength (${pct(odds.equity)}). Checking to see a free card is fine.${draw}`;
}
