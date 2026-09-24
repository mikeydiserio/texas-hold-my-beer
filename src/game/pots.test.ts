import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { createGame, DEFAULT_CONFIG } from './engine';
import { evaluate } from './evaluator';
import { awardPots, buildPots } from './pots';

function players(contributions: number[], folded: number[] = []) {
  return createGame({ ...DEFAULT_CONFIG, playerCount: contributions.length }).players.map((p, i) => ({
    ...p, totalContribution: contributions[i], folded: folded.includes(i),
  }));
}
const result = (cards: string) => evaluate(parseCards(cards));

describe('side pots and integer awards', () => {
  it('builds successive contribution tiers with folded money but no folded eligibility', () => {
    const pots = buildPots(players([50, 100, 200, 200], [3]));
    expect(pots).toEqual([
      { amount: 200, contributors: [0, 1, 2, 3], eligible: [0, 1, 2] },
      { amount: 150, contributors: [1, 2, 3], eligible: [1, 2] },
      { amount: 200, contributors: [2, 3], eligible: [2] },
    ]);
    expect(pots.reduce((sum, pot) => sum + pot.amount, 0)).toBe(550);
  });

  it('awards different main and side-pot winners using only eligible hands', () => {
    const pots = buildPots(players([50, 100, 200, 200], [3]));
    const awards = awardPots(pots, {
      0: result('As Ah Ad Ac Ks'),
      1: result('Ks Kh Kd Qc Qs'),
      2: result('Js Jh 9c 7s 2d'),
      3: result('As Ks Qs Js Ts'),
    }, 0, 4);
    expect(awards).toEqual([
      { playerIndex: 0, amount: 200, potIndex: 0 },
      { playerIndex: 1, amount: 150, potIndex: 1 },
      { playerIndex: 2, amount: 200, potIndex: 2 },
    ]);
    expect(awards.some(a => a.playerIndex === 3)).toBe(false);
  });

  it('returns unmatched excess to its contributor separately from winnings', () => {
    const pots = buildPots(players([50, 150, 300], [0]));
    expect(awardPots(pots, {
      1: result('As Ah Ad Ac Ks'),
      2: result('Js Jh 9c 7s 2d'),
    }, 0, 3)).toEqual([
      { playerIndex: 1, amount: 150, potIndex: 0 },
      { playerIndex: 1, amount: 200, potIndex: 1 },
      { playerIndex: 2, amount: 150, potIndex: 2, refund: true },
    ]);
  });

  it.each([
    [0, [{ playerIndex: 1, amount: 8, potIndex: 0 }, { playerIndex: 0, amount: 7, potIndex: 0 }]],
    [1, [{ playerIndex: 0, amount: 8, potIndex: 0 }, { playerIndex: 1, amount: 7, potIndex: 0 }]],
  ])('splits tied pots, starting odd chips clockwise after dealer %i', (dealer, expected) => {
    const tie = result('As Ks Qs Js Ts');
    expect(awardPots(buildPots(players([5, 5, 5], [2])), { 0: tie, 1: tie }, dealer, 3)).toEqual(expected);
  });

  it('assigns each of multiple odd chips once in seat order, skipping non-winners', () => {
    const tie = result('As Ks Qs Js Ts');
    const awards = awardPots([{ amount: 11, contributors: [0, 1, 2, 3, 4], eligible: [0, 2, 4] }], { 0: tie, 2: tie, 4: tie }, 2, 5);
    expect(awards).toEqual([
      { playerIndex: 4, amount: 4, potIndex: 0 },
      { playerIndex: 0, amount: 4, potIndex: 0 },
      { playerIndex: 2, amount: 3, potIndex: 0 },
    ]);
  });

  it('handles a fold win without requiring showdown cards', () => {
    expect(awardPots(buildPots(players([25, 50], [0])), {}, 0, 2)).toEqual([
      { playerIndex: 1, amount: 50, potIndex: 0 },
      { playerIndex: 1, amount: 25, potIndex: 1, refund: true },
    ]);
    expect(buildPots(players([0, 0]))).toEqual([]);
  });

  it('rejects a contested pot with no eligible player', () => {
    expect(() => awardPots([{ amount: 100, contributors: [0, 1], eligible: [] }], {}, 0, 2)).toThrow('no eligible player');
  });
});
