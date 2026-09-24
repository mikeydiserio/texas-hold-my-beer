import { describe, expect, it } from 'vitest';
import { cardLabel, cardText, newDeck, parseCards, random, rank, shuffle, suit } from './cards';

describe('cards and seeded randomness', () => {
  it('creates all 52 distinct cards without sharing mutable deck arrays', () => {
    const deck = newDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    expect(deck.filter(c => suit(c) === 'h')).toHaveLength(13);
    expect(deck.filter(c => rank(c) === 14)).toEqual(['As', 'Ah', 'Ad', 'Ac']);
    deck.pop();
    expect(newDeck()).toHaveLength(52);
  });

  it('normalizes ranks, ten notation, case and whitespace', () => {
    expect(parseCards('  aS\n10H  kd\t2C ')).toEqual(['As', 'Th', 'Kd', '2c']);
    expect(cardLabel('Th')).toBe('Ten of Hearts');
    expect(cardText('Th')).toBe('10♥');
    expect(parseCards('')).toEqual([]);
  });

  it.each(['As as', 'Th 10h', '1s', 'AX', '10', 'xyz', 'AsKh'])('rejects invalid or duplicate input %s', input => {
    expect(() => parseCards(input)).toThrow('Use unique cards');
  });

  it('replays a shuffle from its seed and preserves its input', () => {
    const original = newDeck();
    const shuffled = shuffle(123456, original);
    expect(shuffle(123456)).toEqual(shuffled);
    expect(shuffle(987654).deck).not.toEqual(shuffled.deck);
    expect(shuffled.deck).not.toEqual(original);
    expect([...shuffled.deck].sort()).toEqual([...original].sort());
    expect(original).toEqual(newDeck());
    expect(shuffle(shuffled.seed).deck).not.toEqual(shuffled.deck);
  });

  it('keeps RNG values inside [0, 1) and advances deterministic state', () => {
    let seed = 17;
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const [value, next] = random(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(next).not.toBe(seed);
      seen.add(next);
      seed = next;
    }
    expect(seen.size).toBe(200);
    expect(random(0)).toEqual(random(1));
  });
});
