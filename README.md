# After Hours — The Green Room

A complete, client-side 3D no-limit Texas Hold’em simulator. **Play chips only.** No accounts, backend, payments, or real-money features.

## Run

Requires Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000, choose **Take a seat**, configure 2–9 players, and play.

```sh
npm test                  # Pure engine / AI tests
npm run typecheck         # Strict TypeScript
npm run build             # Production static export in out/
npx playwright install chromium
npm run test:e2e          # Browser tests (dev server must be running)
```

The production output can be served by any static web host. Use `npm run preview` to serve it locally. Gameplay requires no application server or authentication. Preferences persist locally; refreshing returns to a clean table setup rather than restoring a partial hand.

## Controls

- **F**: fold, **C**: check/call, **R**: bet/raise the chosen amount, **A**: all-in.
- Shortcuts only operate on your turn, outside form inputs and dialogs.
- Sizing is the **total contribution for this street**, not the additional chips.
- A short all-in is available even when the stack cannot reach the minimum raise.
- The pause button pauses automated actions and street transitions.
- Inspect the table with the camera button; press it again to return to your selected view.
- Settings include pace, camera, motion, sound, made-hand helper, pot odds, win odds, hints, and automatic mucking.
- The panel under the table shows your hole cards beside the board. Your best five cards are outlined (the made part of the hand is lifted) and unused cards dim. Win/split odds, the chance to improve by the river, outs, and a tip comparing your pot share with the price of a call update each street. Odds are Monte Carlo estimates against random opponent hands, computed in a Web Worker so play never pauses.
- The accessible table view provides textual cards, stacks, bets, dealer/blind markers, and showdown hands. All betting controls are HTML.

## Architecture

`src/game` contains pure TypeScript rules, deck/seeded shuffle, exhaustive five-of-seven evaluator, betting state machine, pot calculation, and AI. No React, DOM, Three.js, timers, or system randomness enter authoritative game state.

`src/state` contains the Zustand authority and local preferences. A cryptographic seed is generated when starting a table; replaying the same seed and actions reproduces the game.

`src/three` contains procedural table, cards, chips, camera, and event-driven animation. Rendering never decides outcomes. HTML seat labels stay in the main React root; frame updates only project their visual positions.

`src/ui` contains configuration, controls, history, accessibility, optional synthesized audio, and the clock that schedules engine actions. AI postflop equity calculations and the player's win-odds helper (`src/game/odds.ts`) run in Web Workers with bounded synchronous fallbacks. Worker constructors live in `src/game/workers.ts` so Turbopack bundles them as worker entry points.

The AI receives a deliberately restricted `Observation`: its own cards, community cards, public stacks/bets/history, and legal actions. It never receives the deck, burns, other hole cards, or shuffle seed. Six personalities combine preflop strength, position, effective stacks, pot odds, board texture, betting pressure, and 24/56/128 postflop Monte Carlo samples by difficulty. It is recreational opposition, not a poker solver.

## Table rules

- Standard 52-card deck; one burn before flop, turn, and river.
- Moving dealer button skips eliminated seats. On transition to heads-up, the big blind advances from the prior big blind; the other player becomes dealer/small blind. Heads-up dealer acts first preflop and last postflop.
- A short big blind does not lower the nominal preflop bring-in.
- Minimum raises use the last full bet/raise. A short all-in does not automatically reopen action; cumulative short raises can reopen it when the amount faced reaches a full raise. A prior check can respond to an opening wager.
- No further betting into a dry side pot; remaining wagers must still be answered.
- Pots are built independently from contribution levels, including folded chips. An unmatched single-contributor layer is refunded. Ties split equally; odd chips go clockwise starting left of the button.
- At showdown all eligible hands are revealed. Uncontested hands stay private with automatic mucking enabled.
- Chip totals are integers, conserved and asserted after every action and transition.
- Fixed blinds throughout a table. Busted seats remain visible. Play continues until one funded player remains; a busted human may spectate or start again.

Betting details were checked against the [Poker Tournament Directors Association rules](https://www.pokertda.com/view-poker-tda-rules/). The moving-button convention is documented explicitly here rather than implementing a tournament dead-button system.

## Developer scenarios

In `npm run dev`, open the code icon in the left rail. The panel supports inspecting all state and the deck, pausing AI, advancing completed phases, skipping delays, restarting the hand/table, assigning human/board cards, forcing seat stacks, a three-way all-in with side pots, and running legal check/call actions to showdown. Cards use notation such as `As Ah` or `Ad Kc Kd 7s 2c`. Card editing preserves uniqueness. These tools are excluded from the production interface.

## Validation

The deterministic suite covers all hand categories, wheel straights, kickers, board-only ties, flush/full-house selection, dealer and blind rotation, heads-up play, legal actions, minimum raises, short/cumulative all-ins, genuine round completion, multiple side pots, refunds, tied pots, odd chips, elimination, AI privacy, and seeded full-table simulations.

Browser tests cover desktop and mobile, 2/3/6/9-seat configurations, real WebGL, worker AI turns, keyboard raising, history, pause, preferences, refresh, and a known side-pot showdown. Screenshots are saved under ignored `artifacts/`.

Procedural card/felt/chip textures and geometry require no remote asset fetches. The social preview is the sole generated image. Pixel ratio is capped at 1.6; one shadow-casting light and bounded geometry keep the scene lightweight. Devices without WebGL can use the complete HTML game controls and accessible table view.
