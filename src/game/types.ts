export type Suit = 's' | 'h' | 'd' | 'c';
export type Card = `${string}${Suit}`;
export type Phase = 'SETUP' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'HAND_COMPLETE' | 'TABLE_COMPLETE';
export type Personality = 'BALANCED' | 'TIGHT' | 'LOOSE' | 'AGGRESSIVE' | 'PASSIVE' | 'MANIAC';
export type Speed = 'Slow' | 'Normal' | 'Fast' | 'Instant';
export interface Config { playerCount: number; startingStack: number; smallBlind: number; bigBlind: number; difficulty: 'Casual' | 'Normal' | 'Strong'; }
export interface Preferences { sound: boolean; speed: Speed; reducedMotion: boolean; helper: boolean; potOdds: boolean; hints: boolean; winOdds: boolean; autoMuck: boolean; camera: 'player' | 'overhead'; }
export interface Player {
  id: string; name: string; seat: number; stack: number; holeCards: Card[];
  currentBet: number; totalContribution: number; folded: boolean; allIn: boolean;
  eliminated: boolean; isHuman: boolean; aiProfile: Personality;
  actedBet: number | null; lastAction: string;
}
export type Action = { type: 'FOLD' } | { type: 'CHECK' } | { type: 'CALL' } | { type: 'ALL_IN' } | { type: 'BET'; amount: number } | { type: 'RAISE'; amount: number };
export interface LegalActions { fold: boolean; check: boolean; call: boolean; bet: boolean; raise: boolean; allIn: boolean; toCall: number; callAmount: number; minRaiseTo: number; maxRaiseTo: number; }
export interface EvaluatedHand { score: number; category: number; name: string; description: string; bestFive: Card[]; }
export interface Pot { amount: number; eligible: number[]; contributors: number[]; }
export interface Award { playerIndex: number; amount: number; potIndex: number; refund?: boolean; }
export interface GameEvent { id: number; type: 'DEAL' | 'BET' | 'FOLD' | 'CHECK' | 'COLLECT' | 'BOARD' | 'SHOWDOWN' | 'AWARD' | 'COMPLETE'; playerIndex?: number; amount?: number; cards?: Card[]; contributions?: {playerIndex:number;amount:number}[]; }
export interface HistoryEntry { id: number; hand: number; street: Phase; text: string; }
/** A public betting decision. `to` is the actor's street total afterwards; `aggressive` marks a bet or raise. */
export interface PublicAction { seat: number; street: Phase; type: Action['type']; to: number; aggressive: boolean; }
export interface GameState {
  config: Config; phase: Phase; handNumber: number; dealerIndex: number; smallBlindIndex: number;
  bigBlindIndex: number; currentPlayerIndex: number; currentBet: number; minimumRaise: number;
  players: Player[]; communityCards: Card[]; deck: Card[]; burned: Card[]; pot: number;
  sidePots: Pot[]; awards: Award[]; results: Record<number, EvaluatedHand>;
  actionHistory: HistoryEntry[]; handActions: PublicAction[]; events: GameEvent[]; nextEventId: number;
  rng: number; largestPot: number; initialChips: number;
}
export interface Observation {
  holeCards: Card[]; communityCards: Card[]; phase: Phase; pot: number; bigBlind: number;
  player: Pick<Player, 'stack' | 'currentBet' | 'aiProfile' | 'seat'>;
  opponents: { seat: number; stack: number; currentBet: number; allIn: boolean }[];
  dealerIndex: number; seatCount: number; legal: LegalActions;
  history: HistoryEntry[]; actions: PublicAction[]; difficulty: Config['difficulty'];
}
