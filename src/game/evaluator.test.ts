import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { evaluate } from './evaluator';

const hand = (cards: string) => evaluate(parseCards(cards));

describe('best-five poker evaluation', () => {
  const categories = [
    ['As Jd 9h 5c 3s', 'High Card'],
    ['As Ah Jd 5c 3s', 'One Pair'],
    ['As Ah Jd Jc 3s', 'Two Pair'],
    ['As Ah Ad Jc 3s', 'Three of a Kind'],
    ['9s 8h 7d 6c 5s', 'Straight'],
    ['As Js 9s 5s 3s', 'Flush'],
    ['As Ah Ad Jc Js', 'Full House'],
    ['As Ah Ad Ac Js', 'Four of a Kind'],
    ['9s 8s 7s 6s 5s', 'Straight Flush'],
    ['As Ks Qs Js Ts', 'Royal Flush'],
  ];

  it.each(categories.map(([cards, name], category) => ({ cards, name, category })))('recognizes $name', ({ cards, name, category }) => {
    const result = hand(cards);
    expect(result.name).toBe(name);
    expect(result.category).toBe(category);
    expect(new Set(result.bestFive)).toEqual(new Set(parseCards(cards)));
  });

  it('orders every hand category above the preceding one', () => {
    const scores = categories.map(([cards]) => hand(cards).score);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
  });

  it.each([
    ['As Kd Qh 9c 5s', 'As Kd Qh 9c 4s'],
    ['As Ah Kd Qc Js', 'Ac Ad Ks Qh Ts'],
    ['As Ah Kd Kc Qs', 'Ac Ad Ks Kh Js'],
    ['As Ah Ad Kc Qs', 'Ac As Ad Kh Js'],
    ['As Js 9s 7s 5s', 'Ah Jh 9h 7h 4h'],
    ['9s 9h 9d 9c As', '9s 9h 9d 9c Ks'],
    ['Ks Kh Kd 2c 2s', 'Qs Qh Qd Ac As'],
    ['Ks Kh Kd Qc Qs', 'Ks Kh Kd Jc Js'],
    ['As Ah 3d 3c Ks', 'Ks Kh Qd Qc As'],
  ])('resolves rank and kicker ordering: %s beats %s', (winner, loser) => {
    expect(hand(winner).score).toBeGreaterThan(hand(loser).score);
  });

  it('treats the wheel as five-high, below a six-high straight', () => {
    const wheel = hand('As 2h 3d 4c 5s Kh Qh');
    expect(wheel.name).toBe('Straight');
    expect(wheel.description).toBe('Five high');
    expect(wheel.score).toBeLessThan(hand('2s 3h 4d 5c 6s').score);
    expect(hand('As 2s 3s 4s 5s').category).toBe(8);
  });

  it('uses the higher trips when two triplets form competing full houses', () => {
    const result = hand('As Ah Ad Ks Kh Kd 2c');
    expect(result.name).toBe('Full House');
    expect(result.description).toBe('Aces full of Kings');
    expect(result.score).toBe(hand('As Ah Ad Ks Kh').score);
  });

  it('evaluates the requested two-hole-card full-house example', () => {
    const result = hand('As Ah Ad Kc Kd 7s 2c');
    expect(result.name).toBe('Full House');
    expect(result.description).toBe('Aces full of Kings');
    expect(new Set(result.bestFive)).toEqual(new Set(parseCards('As Ah Ad Kc Kd')));
  });

  it('chooses the highest straight when seven cards contain three possible straights', () => {
    const result = hand('3s 4h 5d 6c 7s 8h 9d');
    expect(result.name).toBe('Straight');
    expect(result.description).toBe('Nine high');
    expect(new Set(result.bestFive)).toEqual(new Set(parseCards('5d 6c 7s 8h 9d')));
  });

  it('chooses the top five from seven suited cards', () => {
    const result = hand('As Ks Js 9s 7s 4s 2s');
    expect(result.name).toBe('Flush');
    expect(new Set(result.bestFive)).toEqual(new Set(parseCards('As Ks Js 9s 7s')));
    expect(result.score).toBeGreaterThan(hand('Ah Kh Jh 9h 6h').score);
  });

  it('does not wrap an ace around the middle of a straight', () => {
    const result = hand('Qs Kh Ad 2c 3s');
    expect(result.name).toBe('High Card');
    expect(result.description).toBe('Ace high');
  });

  it('selects the two highest pairs and the best remaining kicker from three pairs', () => {
    const result = hand('As Ah Ks Kh Qs Qh 2d');
    expect(result.name).toBe('Two Pair');
    expect(result.description).toBe('Aces and Kings — Queen kicker');
    expect(result.score).toBe(hand('As Ah Ks Kh Qs').score);
  });

  it('selects a board-only royal flush and does not use suits to break a tie', () => {
    const board = 'As Ks Qs Js Ts';
    const first = hand(`${board} 2h 3d`);
    const second = hand(`${board} 9c 9d`);
    expect(first.score).toBe(second.score);
    expect(new Set(first.bestFive)).toEqual(new Set(parseCards(board)));
    expect(hand('As Ah Kd Qc Js').score).toBe(hand('Ac Ad Kh Qs Jc').score);
  });

  it('ignores unused sixth and seventh kickers and input order', () => {
    const result = hand('As Ah Kd Qc Js 3h 2d');
    expect(result.score).toBe(hand('As Ah Kd Qc Js 9h 8d').score);
    expect(evaluate(parseCards('As Ah Kd Qc Js 3h 2d').reverse()).score).toBe(result.score);
    expect(result.bestFive).not.toContain('3h');
    expect(result.bestFive).not.toContain('2d');
  });

  it.each(['As Kh Qd Jc', 'As Kh Qd Jc Ts 9h 8d 7c'])('rejects unsupported card counts: %s', cards => {
    expect(() => hand(cards)).toThrow('Evaluation requires');
  });

  it('rejects duplicate cards even if callers bypass the parser', () => {
    expect(() => evaluate(['As', 'As', 'Kd', 'Qh', 'Js'])).toThrow('unique cards');
  });
});
