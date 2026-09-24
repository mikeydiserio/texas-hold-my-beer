import { describe, expect, it } from 'vitest';
import { newDeck, parseCards, random } from './cards';
import { act, advance, assertInvariants, createGame, DEFAULT_CONFIG, legalActions, observe, startHand, validateConfig } from './engine';
import type { Action, Config, GameState } from './types';

const config = (playerCount: number, startingStack = 1000): Config => ({ ...DEFAULT_CONFIG, playerCount, startingStack });

/** Isolated, chip-balanced betting fixture. The full-game tests use dealt public transitions. */
function betting(stacks: number[], bets: number[], acted: (number | null)[], currentBet: number, minimumRaise = 50, actor = 0): GameState {
  const state = createGame(config(stacks.length));
  state.phase = 'FLOP';
  state.dealerIndex = stacks.length - 1;
  state.currentPlayerIndex = actor;
  state.currentBet = currentBet;
  state.minimumRaise = minimumRaise;
  state.deck = newDeck();
  state.players.forEach((p, i) => {
    p.stack = stacks[i];
    p.currentBet = bets[i];
    p.totalContribution = bets[i];
    p.actedBet = acted[i];
    p.allIn = stacks[i] === 0;
  });
  state.pot = bets.reduce((sum, n) => sum + n, 0);
  state.initialChips = stacks.reduce((sum, n) => sum + n, state.pot);
  assertInvariants(state);
  return state;
}

function callAround(state: GameState): GameState {
  let next = state;
  let actions = 0;
  while (next.currentPlayerIndex !== -1) {
    const legal = legalActions(next);
    next = act(next, { type: legal.check ? 'CHECK' : legal.call ? 'CALL' : 'ALL_IN' });
    if (++actions > 20) throw new Error('Betting round did not finish');
  }
  return next;
}

function foldToWinner(state: GameState): GameState {
  let next = state;
  while (next.phase !== 'HAND_COMPLETE') next = act(next, { type: 'FOLD' });
  return next;
}

describe('initialization, dealing, and table positions', () => {
  it.each([2, 6, 9])('deals two distinct cards per player at a %i-player table', count => {
    const setup = createGame(config(count), 91);
    const state = startHand(setup);
    expect(state.players.map(p => p.holeCards.length)).toEqual(Array(count).fill(2));
    expect(state.deck).toHaveLength(52 - count * 2);
    expect(new Set([...state.deck, ...state.players.flatMap(p => p.holeCards)]).size).toBe(52);
    expect(state.pot).toBe(75);
    expect(state.phase).toBe('PREFLOP');
    expect(state.handNumber).toBe(1);
    expect(setup.phase).toBe('SETUP');
    expect(setup.players.every(p => p.stack === 1000 && p.holeCards.length === 0)).toBe(true);
  });

  it('starts multiway action left of the big blind and retains the big blind option', () => {
    let state = startHand(createGame(config(6)));
    expect([state.dealerIndex, state.smallBlindIndex, state.bigBlindIndex, state.currentPlayerIndex]).toEqual([0, 1, 2, 3]);
    for (let i = 0; i < 5; i++) state = act(state, { type: 'CALL' });
    expect(state.currentPlayerIndex).toBe(2);
    expect(legalActions(state)).toMatchObject({ check: true, raise: true, toCall: 0, minRaiseTo: 100 });
    state = act(state, { type: 'CHECK' });
    expect(state.currentPlayerIndex).toBe(-1);
    expect(state.pot).toBe(300);
  });

  it('uses button/small blind first preflop and big blind first postflop heads-up', () => {
    let state = startHand(createGame(config(2)));
    expect([state.dealerIndex, state.smallBlindIndex, state.bigBlindIndex, state.currentPlayerIndex]).toEqual([0, 0, 1, 0]);
    state = advance(callAround(state));
    expect(state.phase).toBe('FLOP');
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.players.map(p => p.currentBet)).toEqual([0, 0]);
    expect(state.minimumRaise).toBe(50);
  });

  it('rotates the heads-up button and blinds on the next hand', () => {
    const first = startHand(createGame(config(2)));
    const complete = act(first, { type: 'FOLD' });
    const second = startHand(complete);
    expect([second.dealerIndex, second.smallBlindIndex, second.bigBlindIndex, second.currentPlayerIndex]).toEqual([1, 1, 0, 1]);
    expect(complete.players.map(p => p.stack)).toEqual([975, 1025]);
    expect(complete.awards).toEqual([
      { playerIndex: 1, amount: 50, potIndex: 0 },
      { playerIndex: 1, amount: 25, potIndex: 1, refund: true },
    ]);
  });

  it('skips eliminated seats when advancing the dealer and blinds', () => {
    const complete = foldToWinner(startHand(createGame(config(5))));
    complete.players[0].stack += complete.players[1].stack;
    complete.players[1].stack = 0;
    const next = startHand(complete);
    expect([next.dealerIndex, next.smallBlindIndex, next.bigBlindIndex, next.currentPlayerIndex]).toEqual([2, 3, 4, 0]);
    expect(next.players[1]).toMatchObject({ eliminated: true, folded: true, holeCards: [] });
    expect(next.deck).toHaveLength(44);
  });

  it('does not repeat a big blind on transition from three players to heads-up', () => {
    const complete = foldToWinner(startHand(createGame(config(3))));
    expect(complete.bigBlindIndex).toBe(2);
    complete.players[0].stack += complete.players[1].stack;
    complete.players[1].stack = 0;
    const next = startHand(complete);
    expect([next.dealerIndex, next.smallBlindIndex, next.bigBlindIndex]).toEqual([2, 2, 0]);
    expect(next.players[1].eliminated).toBe(true);
  });

  it('ends the table when only one player still has chips', () => {
    const setup = createGame(config(3));
    setup.players[0].stack = 3000;
    setup.players[1].stack = setup.players[2].stack = 0;
    const final = startHand(setup);
    expect(final.phase).toBe('TABLE_COMPLETE');
    expect(final.currentPlayerIndex).toBe(-1);
    expect(final.players[0].stack).toBe(3000);
    expect(final.handNumber).toBe(0);
  });

  it('burns exactly one card before each street and deals from the seeded deck', () => {
    let state = startHand(createGame(config(3), 513));
    const deck = [...state.deck];
    state = advance(callAround(state));
    expect(state.communityCards).toEqual(deck.slice(1, 4));
    expect(state.burned).toEqual([deck[0]]);
    expect(state.currentPlayerIndex).toBe(1);
    state = advance(callAround(state));
    expect(state.communityCards).toEqual([...deck.slice(1, 4), deck[5]]);
    expect(state.burned).toEqual([deck[0], deck[4]]);
    state = advance(callAround(state));
    expect(state.communityCards).toEqual([...deck.slice(1, 4), deck[5], deck[7]]);
    expect(state.burned).toEqual([deck[0], deck[4], deck[6]]);
    expect(state.deck).toHaveLength(38);
    state = advance(callAround(state));
    expect(state.phase).toBe('SHOWDOWN');
    expect(Object.keys(state.results)).toHaveLength(3);
    expect(state.pot).toBe(0);
    expect(advance(state).phase).toBe('HAND_COMPLETE');
  });
});

describe('legal betting, minimum raises and reopened action', () => {
  it('exposes correct preflop call and total raise-to limits', () => {
    const state = startHand(createGame(config(6)));
    expect(legalActions(state)).toEqual({
      fold: true, check: false, call: true, bet: false, raise: true, allIn: true,
      toCall: 50, callAmount: 50, minRaiseTo: 100, maxRaiseTo: 1000,
    });
    expect(Object.values(legalActions(state, 4)).filter(v => v === true)).toEqual([]);
  });

  it.each([99, 1001, 100.5, Number.NaN])('rejects invalid raise-to amount %s without changing chips', amount => {
    const state = startHand(createGame(config(3)));
    const before = structuredClone(state);
    expect(() => act(state, { type: 'RAISE', amount })).toThrow('outside the legal range');
    expect(state).toEqual(before);
  });

  it('rejects checks facing a bet, out-of-turn actions, and premature advancement', () => {
    const state = startHand(createGame(config(3)));
    expect(() => act(state, { type: 'CHECK' })).toThrow('Illegal check');
    expect(() => act(state, { type: 'CALL' }, 1)).toThrow('Illegal call');
    expect(() => advance(state)).toThrow('Betting is not complete');
    expect(() => startHand(state)).toThrow('Finish the current hand');
  });

  it('requires a full increment for each raise and charges only the additional chips', () => {
    let state = betting([500, 500], [0, 0], [null, null], 0);
    expect(legalActions(state)).toMatchObject({ bet: true, raise: false, check: true, minRaiseTo: 50 });
    state = act(state, { type: 'BET', amount: 100 });
    expect(legalActions(state).minRaiseTo).toBe(200);
    state = act(state, { type: 'RAISE', amount: 250 });
    expect(state.minimumRaise).toBe(150);
    expect(legalActions(state)).toMatchObject({ toCall: 150, minRaiseTo: 400 });
    state = act(state, { type: 'CALL' });
    expect(state.players.map(p => p.stack)).toEqual([250, 250]);
    expect(state.pot).toBe(500);
    expect(state.currentPlayerIndex).toBe(-1);
  });

  it('allows an undersized all-in call but does not claim a full call is affordable', () => {
    const state = betting([30, 900], [50, 100], [null, 100], 100);
    expect(legalActions(state)).toMatchObject({ call: false, allIn: true, raise: false, toCall: 50, callAmount: 30 });
    const next = act(state, { type: 'ALL_IN' });
    expect(next.players[0]).toMatchObject({ stack: 0, currentBet: 80, totalContribution: 80, allIn: true });
    expect(next.currentBet).toBe(100);
    expect(next.currentPlayerIndex).toBe(-1);
  });

  it('does not reopen a prior bettor after a single short all-in raise', () => {
    let state = betting([900, 40, 900], [100, 100, 100], [100, null, 100], 100, 100, 1);
    expect(legalActions(state)).toMatchObject({ raise: false, allIn: true, maxRaiseTo: 140 });
    state = act(state, { type: 'ALL_IN' });
    expect(state.minimumRaise).toBe(100);
    expect(state.currentPlayerIndex).toBe(2);
    expect(legalActions(state)).toMatchObject({ call: true, raise: false, allIn: false, toCall: 40 });
    expect(() => act(state, { type: 'ALL_IN' })).toThrow('Illegal all_in');
    state = act(state, { type: 'CALL' });
    expect(state.currentPlayerIndex).toBe(0);
    expect(legalActions(state).raise).toBe(false);
    state = act(state, { type: 'CALL' });
    expect(state.currentPlayerIndex).toBe(-1);
    expect(state.pot).toBe(420);
  });

  it.each([
    [99, false, 199],
    [100, true, 200],
    [120, true, 220],
  ])('cumulative short all-ins totaling %i reopen exactly at a full raise', (extra, reopened, total) => {
    let state = betting([900, 40, extra, 900], [100, 100, 100, 100], [100, null, null, 100], 100, 100, 1);
    state = act(state, { type: 'ALL_IN' });
    state = act(state, { type: 'ALL_IN' });
    expect(state.currentBet).toBe(total);
    expect(state.minimumRaise).toBe(100);
    expect(state.currentPlayerIndex).toBe(3);
    expect(legalActions(state)).toMatchObject({ raise: reopened, allIn: reopened, toCall: extra, minRaiseTo: total + 100 });
    if (reopened) {
      state = act(state, { type: 'RAISE', amount: total + 100 });
      expect(state.players[3].currentBet).toBe(total + 100);
      expect(legalActions(state).raise).toBe(true);
    }
  });

  it('allows a player who has not acted to raise after a short all-in', () => {
    let state = betting([40, 900, 900], [100, 100, 100], [null, null, 100], 100, 100);
    state = act(state, { type: 'ALL_IN' });
    expect(legalActions(state)).toMatchObject({ raise: true, minRaiseTo: 240 });
    state = act(state, { type: 'RAISE', amount: 240 });
    expect(state.minimumRaise).toBe(100);
    expect(state.players[1].stack).toBe(760);
  });

  it('allows a checker to raise a subsequent short opening all-in', () => {
    let state = betting([900, 20, 900], [0, 0, 0], [null, null, null], 0);
    state = act(state, { type: 'CHECK' });
    state = act(state, { type: 'ALL_IN' });
    state = act(state, { type: 'CALL' });
    expect(state.currentPlayerIndex).toBe(0);
    expect(legalActions(state)).toMatchObject({ raise: true, allIn: true, toCall: 20 });
  });
});

describe('all-ins, dry side pots, and settlement', () => {
  it('requires the sole remaining actor to answer a live wager, without permitting a dry side-pot raise', () => {
    const state = betting([150, 0], [50, 100], [null, 100], 100);
    expect(legalActions(state)).toMatchObject({ call: true, fold: true, raise: false, allIn: false, toCall: 50 });
    const called = act(state, { type: 'CALL' });
    expect(called.currentPlayerIndex).toBe(-1);
    expect(called.pot).toBe(200);
    expect(called.players[0].stack).toBe(100);
  });

  it('automatically runs out the board when both players are all-in', () => {
    let state = startHand(createGame(config(2, 100)));
    state = act(state, { type: 'ALL_IN' });
    state = act(state, { type: 'CALL' });
    expect(state.currentPlayerIndex).toBe(-1);
    for (const phase of ['FLOP', 'TURN', 'RIVER', 'SHOWDOWN']) {
      state = advance(state);
      expect(state.phase).toBe(phase);
      expect(state.currentPlayerIndex).toBe(-1);
      expect(legalActions(state).allIn).toBe(false);
    }
    expect(state.communityCards).toHaveLength(5);
    expect(state.burned).toHaveLength(3);
    expect(state.players.reduce((sum, p) => sum + p.stack, 0)).toBe(200);
    expect(state.awards.reduce((sum, a) => sum + a.amount, 0)).toBe(200);
  });

  it('does not offer checks or bets to the sole funded player on later streets', () => {
    const setup = createGame(config(2, 100));
    setup.players[0].stack = 200;
    setup.initialChips = 300;
    let state = startHand(setup);
    state = act(state, { type: 'RAISE', amount: 100 });
    state = act(state, { type: 'CALL' });
    expect(state.players[0]).toMatchObject({ stack: 100, allIn: false });
    expect(state.players[1].allIn).toBe(true);
    for (const phase of ['FLOP', 'TURN', 'RIVER', 'SHOWDOWN']) {
      state = advance(state);
      expect(state.phase).toBe(phase);
      expect(state.currentPlayerIndex).toBe(-1);
    }
    expect(state.awards.reduce((sum, a) => sum + a.amount, 0)).toBe(200);
    expect(state.players.reduce((sum, p) => sum + p.stack, 0)).toBe(300);
  });

  it('retains the nominal bring-in when the big blind posts a short stack', () => {
    const setup = createGame(config(3));
    setup.players[2].stack = 20;
    setup.players[0].stack += 980;
    let state = startHand(setup);
    expect(state.players[2]).toMatchObject({ currentBet: 20, allIn: true });
    expect(state.currentBet).toBe(50);
    expect(legalActions(state)).toMatchObject({ toCall: 50, minRaiseTo: 100 });
    state = callAround(state);
    expect(state.pot).toBe(120);
    expect(state.sidePots).toEqual([
      { amount: 60, contributors: [0, 1, 2], eligible: [0, 1, 2] },
      { amount: 60, contributors: [0, 1], eligible: [0, 1] },
    ]);
  });

  it('does not ask a heads-up small blind to add chips against a shorter all-in big blind', () => {
    const setup = createGame(config(2));
    setup.players[1].stack = 20;
    setup.players[0].stack += 980;
    let state = startHand(setup);
    expect(state.currentPlayerIndex).toBe(-1);
    expect(state.pot).toBe(45);
    while (state.phase !== 'SHOWDOWN') state = advance(state);
    expect(state.awards).toContainEqual({ playerIndex: 0, amount: 5, potIndex: 1, refund: true });
    expect(state.players.reduce((sum, p) => sum + p.stack, 0)).toBe(2000);
  });

  it('settles known-card multiple all-ins and folded dead money into separate winners', () => {
    const state = betting([0, 0, 0, 100], [50, 100, 200, 200], [50, 100, 200, 200], 200, 50, -1);
    state.phase = 'RIVER';
    state.currentPlayerIndex = -1;
    state.players[3].folded = true;
    state.communityCards = parseCards('2c 3d 7h 9s Jc');
    const holes = ['As Ah', 'Ks Kh', 'Qs Qh', 'Js Td'];
    state.players.forEach((p, i) => { p.holeCards = parseCards(holes[i]); });
    const used = new Set([...state.communityCards, ...state.players.flatMap(p => p.holeCards)]);
    state.deck = newDeck().filter(c => !used.has(c));
    const next = advance(state);
    expect(next.awards).toEqual([
      { playerIndex: 0, amount: 200, potIndex: 0 },
      { playerIndex: 1, amount: 150, potIndex: 1 },
      { playerIndex: 2, amount: 200, potIndex: 2 },
    ]);
    expect(next.players.map(p => p.stack)).toEqual([200, 150, 200, 100]);
    expect(Object.keys(next.results)).toEqual(['0', '1', '2']);
    expect(next.players.every(p => p.totalContribution === 0 && p.currentBet === 0)).toBe(true);
    expect(next.largestPot).toBe(550);
    expect(next.events.filter(e => e.type === 'AWARD').map(e => e.amount)).toEqual([200, 150, 200]);
  });
});

describe('validation, privacy and long-game invariants', () => {
  it.each([
    { ...config(2, 4), smallBlind: 1, bigBlind: 2 },
    { ...config(9, 1000000) },
  ])('accepts exact lower and upper configuration boundaries', options => {
    const state = createGame(options);
    expect(state.players).toHaveLength(options.playerCount);
    expect(state.initialChips).toBe(options.startingStack * options.playerCount);
    expect(startHand(state).phase).toBe('PREFLOP');
  });

  it.each([
    { playerCount: 1 }, { playerCount: 10 }, { playerCount: 2.5 },
    { smallBlind: 0 }, { bigBlind: 49 }, { startingStack: 99 },
    { startingStack: 1000001 }, { startingStack: Number.POSITIVE_INFINITY },
  ])('rejects invalid configuration %j', override => {
    expect(() => validateConfig({ ...config(6), ...override })).toThrow();
  });

  it('returns only public opponent information and detached observation data', () => {
    const state = startHand(createGame(config(6), 92));
    const view = observe(state);
    expect(view.holeCards).toEqual(state.players[state.currentPlayerIndex].holeCards);
    expect(view.opponents).toHaveLength(5);
    expect(Object.keys(view.opponents[0]).sort()).toEqual(['allIn', 'currentBet', 'seat', 'stack']);
    expect(view).not.toHaveProperty('deck');
    expect(view).not.toHaveProperty('rng');
    expect(view).not.toHaveProperty('burned');
    view.holeCards.pop();
    view.history[0].text = 'modified';
    expect(state.players[state.currentPlayerIndex].holeCards).toHaveLength(2);
    expect(state.actionHistory[0].text).not.toBe('modified');
  });

  it('excludes folded opponents from the decision view while preserving public action history', () => {
    let state = startHand(createGame(config(6), 92));
    state = act(state, { type: 'FOLD' });
    const view = observe(state);
    expect(view.opponents.map(p => p.seat)).toEqual([0, 1, 2, 5]);
    expect(view.history.at(-1)?.text).toBe('Mei · Fold');
    expect(state.players[3].holeCards).toHaveLength(2);
  });

  it('detects chip imbalance, duplicate cards, and an invalid actor', () => {
    const chips = startHand(createGame(config(3)));
    chips.players[0].stack++;
    expect(() => assertInvariants(chips)).toThrow('Chip conservation');
    const cards = startHand(createGame(config(3)));
    cards.deck[0] = cards.players[0].holeCards[0];
    expect(() => assertInvariants(cards)).toThrow('Duplicate or invalid card');
    const actor = startHand(createGame(config(3)));
    actor.players[actor.currentPlayerIndex].folded = true;
    expect(() => assertInvariants(actor)).toThrow('Invalid actor');
  });

  function playTournament(seed: number, count: number) {
    let state = createGame(config(count, 200), seed);
    let policySeed = seed + 99;
    let steps = 0;
    while (state.phase !== 'TABLE_COMPLETE' && steps < 20000) {
      if (state.currentPlayerIndex < 0) state = advance(state);
      else {
        const legal = legalActions(state);
        const [roll, next] = random(policySeed);
        policySeed = next;
        let action: Action;
        if (legal.allIn && roll < 0.4) action = { type: 'ALL_IN' };
        else if (legal.fold && roll < 0.55) action = { type: 'FOLD' };
        else if (legal.raise && roll > 0.9) action = { type: 'RAISE', amount: legal.minRaiseTo };
        else if (legal.bet && roll > 0.9) action = { type: 'BET', amount: legal.minRaiseTo };
        else action = { type: legal.check ? 'CHECK' : legal.call ? 'CALL' : 'ALL_IN' };
        state = act(state, action);
      }
      assertInvariants(state);
      expect(state.players.reduce((sum, p) => sum + p.stack, state.pot)).toBe(count * 200);
      steps++;
    }
    expect(steps).toBeLessThan(20000);
    expect(state.phase).toBe('TABLE_COMPLETE');
    expect(state.players.filter(p => p.stack > 0)).toHaveLength(1);
    expect(Math.max(...state.players.map(p => p.stack))).toBe(count * 200);
    return state;
  }

  it.each([[1, 2], [19, 6], [88, 9], [1234, 4], [987654, 8]])('finishes reproducible seeded tournament %i with %i seats without losing a chip', (seed, count) => {
    expect(playTournament(seed, count)).toEqual(playTournament(seed, count));
  });
});
