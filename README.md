# VeilWolf 🐺

A hidden-role social deduction game (Werewolf/Mafia) built on **Midnight
Network**. This is a hackathon MVP: the full 9-player game loop —
create → join → start → night → dawn → day → vote → elimination →
victory → replay — is playable locally against a mocked chain layer, built
so that layer is a clean drop-in replacement once the real Midnight Compact
TS SDK is ready.

The build-ready product, protocol, security, UX, retention, repository, and
delivery blueprint lives in [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md).

## Quickstart

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` in one tab to create a game as the host. To
add a second player, open the app in a **second browser tab** (not just a
new window with the same tab — see [Multi-tab play](#multi-tab-play) below)
and join with the game code shown in the lobby. VeilWolf needs 9 players to
start, so for a full local playtest either open 9 tabs, or shrink
`ROLE_COMPOSITION` / `MIN_PLAYERS` in
`packages/game-engine/src/types.ts` for a quick smoke test.

### Multi-tab play

Player identity lives in `sessionStorage` (per-tab), while game state lives
in `localStorage` (shared across tabs on the same origin) — that's what
lets two tabs see the same game as two different players. Open the second
tab fresh (new tab, type/paste the URL) rather than "duplicate tab", since
some browsers copy `sessionStorage` into duplicated tabs and you'd end up
playing as the same player twice.

## Monorepo layout

```
veilwolf/
├── apps/
│   └── web/                       # Next.js 15 (App Router) frontend
├── packages/
│   ├── contracts/                 # Compact contract source (not compiled)
│   │   └── veilwolf.compact
│   ├── game-engine/                # Pure TS state machine + mock chain client
│   │   ├── src/types.ts
│   │   ├── src/stateMachine.ts
│   │   └── src/mockChainClient.ts
│   └── ui/                         # Shared React components
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## What's mocked

The playable match still uses the local mock client, but the repository now
contains a compiler-checked Compact privacy spike for night actions. The mock
remains in place while the rest of the on-chain lifecycle is implemented.

- **`packages/game-engine/src/stateMachine.ts`** is the entire game logic —
  pure, synchronous, I/O-free functions (`createGame`, `joinGame`,
  `startGame`, `submitNightAction`, `resolveDawn`, `submitVote`,
  `revealVotes`, `checkVictory`, plus a couple of day-phase helpers). This
  is meant to double as the *spec* for what the real Compact circuits in
  `packages/contracts/veilwolf.compact` need to reproduce in zero-knowledge.
- **`packages/game-engine/src/mockChainClient.ts`** wraps the state machine
  behind an async `ChainClient` interface — `createGame`, `joinGame`,
  `submitNightAction`, `subscribe`, etc. — shaped exactly like what a real
  Midnight SDK client would expose (submit a transaction, await inclusion,
  read back updated state). "Transactions" here are just local reducer
  calls behind an artificial ~250ms delay, and persistence is
  `localStorage` so two browser tabs on the same machine can play as two
  different players without a backend.
- **Role assignment lives on the mock "server."** The private-action spike
  does not yet prove membership in an assigned role, so `mockChainClient` is
  still trusted with every player's role and
  night-action targets in the clear (see the big comment at the top of that
  file). A real Midnight contract would never let a server see a player's
  role — it would only ever see commitments and proofs. This is the single
  biggest thing that changes when the real integration lands.
- **Identity is a random UUID**, generated per browser tab
  (`sessionStorage`) — there's no wallet.
- **"Last words" on the elimination screen are client-local** (not synced
  across tabs) — a narrative flourish, not gameplay state.

## Real integration points

When it's time to wire in the real Midnight Compact TS SDK:

1. **`packages/contracts/veilwolf.compact`** sketches the target contract
   shape: public `ledger` fields mirroring `GameState`, `witness`
   declarations for role/target data mirroring `PrivateState`, and one
   `circuit` per `stateMachine.ts` function. It is *not* compiled and
   hasn't been validated against a real `compactc` — treat it as a spec
   to check against the current language docs, not working source.
   **`packages/contracts/private-action.compact`** is working source: it
   compiles with Compact compiler 0.34.0 / language 0.26, builds a nine-seat
   private Merkle roster, requires membership proofs for night actions, keeps
   role and target in witnesses, and rejects reuse with domain-separated join
   and action nullifiers. Its simulator tests cover roster privacy/freezing,
   duplicate joins, non-member actions, valid submission, invalid role, empty
   target, duplicate action, and closed-night rejection. The selected role
   protocol and its unresolved threshold tradeoff are documented in
   `docs/ROLE_ASSIGNMENT_PROTOCOL.md`.
2. **Replace `mockChainClient.ts`.** Nothing else should need to change.
   `apps/web` and `packages/ui` only ever import the `ChainClient`
   interface and `useGameStore` (`apps/web/lib/store.ts`) — never
   `stateMachine.ts` directly. Implement the same `ChainClient` methods
   against real contract calls (submit tx → await block inclusion → read
   ledger state) and the whole frontend keeps working unmodified.
3. **`types.ts`'s `GameState` / `PrivateState` split already models the
   public/private boundary** a real Compact contract needs: `GameState`
   never contains a role, a vote target, or a night-action target in the
   clear — those only exist in each player's own `PrivateState`, exactly
   like Midnight's private local state / witnesses.

## Three Week-1 spikes

Before investing in real ZK circuits, de-risk these three things in
parallel, each as a throwaway spike outside this repo's main flow:

1. **Proof generation speed in-browser.** A night-action or vote submission
   needs a proof generated client-side inside a normal play cadence (a few
   seconds, not tens of seconds). Spike: get any non-trivial Compact
   circuit proving in a browser tab on mid-range hardware and measure wall
   time. This determines whether real-time werewolf night actions are
   viable at all, or whether the UX needs to change (e.g. longer night
   phases, background pre-proving).
2. **Turnkey embedded wallet + Compact SDK integration.** Players shouldn't
   need a seed phrase to join a party game. Spike: get a Turnkey embedded
   wallet signing and submitting a transaction through the Midnight Compact
   TS SDK end-to-end, so `mockChainClient`'s UUID-based fake identity can
   be replaced with a real (but frictionless) wallet.
3. **VRF availability on the Midnight testnet.** Role assignment needs
   verifiable randomness that no single party (including the host) can
   bias — `startGame`'s `shuffle()` in `stateMachine.ts` is a placeholder
   for this. Spike: confirm what VRF or verifiable-randomness primitive is
   actually available on the Midnight testnet today, and whether it's
   usable from a circuit or only off-chain.

## Tooling

- pnpm workspaces + Turborepo
- TypeScript everywhere, strict mode
- Next.js 15 (App Router)
- Tailwind CSS
- Zustand for client game state
- Vitest for `packages/game-engine` unit tests (`pnpm --filter @veilwolf/game-engine test`)
