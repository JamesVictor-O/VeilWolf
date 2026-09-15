# VeilWolf Product and Technical Plan

Status: implementation blueprint
Updated: 2026-09-04
Platform: Midnight Network
Primary client: responsive web/PWA

## 1. Product thesis

VeilWolf is a fast, theatrical hidden-role social deduction game in which Midnight proves that every secret action followed the rules without exposing the secret itself. Privacy is not a decorative blockchain feature: it protects role assignment, night actions, investigations, ballots, and selective reveals while keeping the match auditable.

The target session is 15–25 minutes, optimized for 6–12 friends playing remotely or in the same room. The first shippable ruleset remains the proven 9-player composition already represented in the engine: two Werewolves, five Villagers, one Doctor, and one Seer.

### Product pillars

1. **Trust the game, distrust the host.** No host or server should be able to inspect or alter hidden roles and actions.
2. **Drama without confusion.** Every phase has one obvious goal, one primary action, a visible timer, and a clear resolution.
3. **Social play first.** Conversation, suspicion, bluffing, nominations, and rematches matter more than token mechanics.
4. **Fast entry.** A player joins from a link or five-character code, chooses a name/avatar, and reaches the lobby before learning blockchain vocabulary.
5. **Delight with restraint.** Motion explains state and heightens reveals; it must never delay input or obscure information.
6. **Fair, replayable sessions.** Verifiable setup, reconnect support, anti-stall rules, post-game proof summaries, and varied role presets make rematches easy.

## 2. Experience principles

- Do not show wallets, DUST, proofs, transaction hashes, or chain jargon in the default game flow. Translate infrastructure states into player language such as “Sealing your choice” and “Choice locked.” Put technical details in an expandable proof receipt.
- Never use a global loading flag for independent actions. Each transaction gets `idle → preparing → proving → submitting → confirmed | failed` states with recovery guidance.
- The server is a relay and matchmaking coordinator, not an authority over roles or results.
- Never expose private state in URLs, analytics, logs, crash reports, replay payloads, browser notifications, or public chat.
- The game remains understandable with animation disabled, sound muted, and color removed.
- All essential controls have keyboard support, visible focus, a minimum 44×44 px touch target, and an explicit loading/error state.

## 3. Core game rules

### Launch ruleset

| Role | Team | Night ability | Information |
| --- | --- | --- | --- |
| Werewolf ×2 | Werewolves | Secretly choose a living non-wolf target; majority wolf choice wins | Knows the other wolf |
| Villager ×5 | Village | None | No private information |
| Doctor ×1 | Village | Protect one living player, including self | Knows only their own choice |
| Seer ×1 | Village | Investigate one living player | Privately learns wolf/not-wolf |

Rules to decide and encode before circuit implementation:

- Doctor cannot protect the same target on consecutive nights.
- Wolves cannot target a wolf.
- A tied wolf choice produces no kill; do not resolve ties by submission order.
- Day elimination uses a simultaneous sealed ballot. A tie produces no elimination in casual mode; ranked mode schedules a short runoff.
- Dead players become spectators and cannot chat in the living channel, vote, or act. They may use a separate dead-player channel that living players never receive.
- Village wins when all wolves are dead. Wolves win when living wolves are equal to or outnumber living non-wolves.
- Default timers: role reveal 20s, night 45s, dawn 12s, discussion 180s, nomination 30s, vote 30s, resolution 12s. Lobby owners may select relaxed or rapid presets before deployment.

### Match state machine

```text
HOME → CREATE/JOIN → LOBBY → READY CHECK → ROLE REVEAL
                                      ↓
             VICTORY ← RESOLUTION ← VOTE ← DISCUSSION ← DAWN ← NIGHT
                ↓                  ↑                         │
          PROOF SUMMARY            └──────── next round ────┘
                ↓
          REMATCH LOBBY
```

Every transition must have a single on-chain authority, a timeout policy, reconnect behavior, and idempotent client handling. No player-facing screen may advance based only on a local timer.

### Anti-stall policy

- A committed server/contract deadline determines the phase cutoff.
- The UI shows a synchronized countdown plus a “waiting for chain confirmation” grace state.
- Missing optional actions become abstentions. Missing mandatory night actions use the previously committed safe default defined by the ruleset; they never leak which role failed to act.
- Any eligible player can call permissionless phase-finalization after the deadline. The host cannot freeze a match.
- Duplicate calls and reconnect retries must be safe.

## 4. Player journey and screens

### Onboarding

- Landing page: one-sentence promise, “Create game,” “Join game,” and a 30-second interactive explanation.
- Guest profile: nickname, generated avatar, sound/haptics preference, age-appropriate conduct acknowledgement.
- Wallet/prover boot happens progressively after the player enters the lobby. If a wallet connection is required by the selected network, explain it as the account that protects their secret.
- Tutorial is playable, not a carousel: reveal a sample role, choose a target, discuss a clue, and cast a sample vote.

### Lobby

- Share link, copyable game code, QR code, roster, connection quality, ready state, rules preset, accessibility/sound controls.
- Host can configure only pre-game options. The deployed configuration is frozen and visible to everyone.
- Start requires exact composition, every player ready, private-state backup complete, and enough fee resource for the expected match path.

### Role reveal

- Deliberate press-and-hold or tap-to-reveal prevents shoulder-surfing accidents.
- Role, team, ability, win condition, and one concise beginner tip appear together.
- Wolf teammate identity appears only for wolves.
- Hide again is always available; role data must not persist in screenshots generated by the app or notification previews.

### Night

- Full-screen atmospheric phase with role-specific instruction and eligible player grid.
- Selecting a target previews the rule consequence before confirmation.
- Confirmation has two steps only when reversal is impossible: select, then hold/tap “Lock choice.”
- Transaction feedback maps proof stages to human language. The UI does not imply success until inclusion/finality is confirmed.
- Waiting view reveals only an aggregate completion state that cannot identify which special role has or has not acted.

### Dawn and elimination

- Use a short 300–400ms transition and a non-motion alternative. Never make players wait through an unskippable cinematic.
- Show public outcome only: eliminated/saved/no death. Reveal a dead player’s role only if the chosen ruleset permits it.
- Provide an expandable proof receipt: block, contract, circuit/action, finality, and verifier result.

### Discussion and nomination

- Primary surface is the living-player circle plus voice integration status; text chat is a fallback and accessibility channel.
- Provide phase objective, timer, player notes, mute/report, nomination, seconding, and an event log.
- Private notes remain local-only and are cleared according to the player’s privacy preference.
- Chat requires rate limits, moderation hooks, block/report controls, and a clear distinction between living, spectator, and system messages.

### Vote

- Ballot is private until the configured reveal point. Selection, review, proof generation, and confirmation are distinct states.
- The UI must not reveal who is still proving or who submitted a particular target.
- Resolution visualizes the public tally and tie behavior. It never reconstructs private ballots unless the ruleset explicitly makes votes public after resolution.

### Victory and replay

- Show winner, full consensual role reveal, pivotal public events, personal achievements, and a plain-English fairness summary.
- “Play again” retains the party and settings while generating fresh role randomness and private state.
- Replay is event-based, redacted by default, and generated from public finalized events. Private actions appear only in a post-game reveal artifact if every affected rule allows disclosure.

## 5. Midnight architecture

### Public ledger state

- Match identifier and immutable ruleset hash
- Phase, round, phase deadline, player commitments, alive/dead status
- Ready/acted/voted nullifiers or completion commitments that do not reveal roles
- Action and ballot commitments
- Public resolution, winner, and append-only public event roots
- Randomness request/result or agreed shuffle transcript commitment

### Private state

- Role and team membership witness
- Role-assignment opening/proof material
- Night choices and salts
- Seer results
- Ballot choices and salts until reveal policy allows disclosure
- Local notes, device/session key material, and recovery metadata

Private state needs versioning, encrypted persistence, migration, backup/recovery UX, and explicit deletion. `localStorage` is never acceptable for production secrets.

### Circuit responsibilities

1. `createGame`: freeze player count, role composition, timers, reveal policy, and ruleset hash.
2. `joinGame`: prove unique eligible membership without publishing unrelated wallet identity.
3. `ready`: prove private-state initialization and prevent duplicate readiness.
4. `finalizeRoster`: close entry and anchor unbiased role-assignment randomness.
5. `claimRole`: prove possession of exactly one assignment without exposing it.
6. `submitNightAction`: prove caller is alive, has the required role capability, selects an eligible target, and has not acted twice.
7. `resolveNight`: prove the public outcome matches committed valid actions without revealing individual choices.
8. `submitBallot`: prove living membership, target eligibility, and one ballot per round.
9. `resolveVote`: prove tally/tie policy and update life state.
10. `advancePhase`: permissionless, deadline-aware, and idempotent.
11. `revealRole`: selective disclosure for elimination/end-game policy.
12. `finalizeGame`: verify the victory condition and seal the replay root.

Do not assume this circuit decomposition is feasible or efficient until it compiles and is benchmarked. The current `packages/contracts/veilwolf.compact` is a design sketch, not valid evidence of deployability.

### Client/provider boundary

Replace the current single mock client with a dependency-injected interface:

```text
UI feature → game application service → ChainClient interface
                                  ├── MockChainClient (local UX tests)
                                  └── MidnightChainClient
                                      ├── wallet connector
                                      ├── public data/indexer provider
                                      ├── private-state provider
                                      ├── proof provider
                                      └── transaction/finality monitor
```

UI components consume view models and commands, not raw ledger types. Contract-generated types stay behind the Midnight adapter. This prevents SDK version churn from spreading through the app.

### Random role assignment

This is the first protocol spike, not a later detail. The scheme must guarantee:

- correct role multiset;
- one role per roster member;
- host/server cannot bias or inspect assignment;
- a player cannot claim a different role;
- aborting one participant cannot cheaply reroll assignments;
- selective teammate knowledge is possible for wolves;
- end-game reveal can be verified when enabled.

The selected candidate is the verifiable encrypted mixnet described in
`docs/ROLE_ASSIGNMENT_PROTOCOL.md`: a canonical encrypted role deck is
sequentially shuffled and rerandomized with proofs, then opened only to each
recipient. Public-seed/index assignment was rejected because observable join
order can reveal the complete role map. The mixnet remains behind proof-speed,
key-switching, threshold, abort-recovery, and transcript-privacy gates. Do not
market “trustless roles” before those gates pass.

## 6. Security and privacy threat model

### Assets

- role secrecy, action secrecy, ballot secrecy, investigation secrecy;
- match integrity and liveness;
- identity unlinkability across matches;
- private-state availability;
- proof and transaction correctness;
- chat safety and account recovery.

### Required defenses

- Domain-separate every commitment by network, contract, match, round, phase, actor pseudonym, action type, target, and fresh salt.
- Bind proofs to immutable rules and the current ledger state to block replay and cross-game reuse.
- Use per-match pseudonyms; never use nickname or raw wallet address as authorization.
- Prevent double actions with nullifiers and contract checks, not UI flags.
- Avoid metadata leaks from completion counts, proof timing, transaction sender, payload size, logs, analytics, and WebSocket topics.
- Validate phase, liveness, role capability, target constraints, timeout, and caller authorization inside circuits/contracts.
- Make phase advancement permissionless after deadlines.
- Encrypt private state at rest and test restore/migration before public testing.
- Pin and audit Midnight dependencies; generate an SBOM; scan CI and container images.
- Add abuse controls to off-chain chat/voice without pretending those messages inherit on-chain privacy.
- Commission a Compact/privacy review before any real-value or ranked release.

### Security test families

- unit and property tests for all state transitions and invariants;
- Compact simulator tests for happy paths and every rejected action;
- differential tests: TypeScript model vs compiled contract behavior;
- adversarial multi-client tests for duplicate, reordered, delayed, and replayed transactions;
- privacy tests that inspect ledger data, indexer responses, logs, network traces, crash reports, and replays;
- timeout/liveness tests with offline host and missing special roles;
- load/proof benchmarks on low-end supported devices;
- accessibility, reduced-motion, offline/reconnect, and multi-tab isolation tests.

## 7. UI system and motion language

### Visual direction

“Moonlit village theatre,” not generic crypto dashboard: near-black blue surfaces, parchment-warm primary text, one violet/moonlight accent, restrained semantic red/green, engraved role illustrations, soft fog/noise texture, and readable modern UI typography. The game board is the visual center; chain status is subordinate.

Before implementation, create `brand.md` with approved tokens for color, type, radius, elevation, illustration, sound, voice, and motion. Do not continue expanding hard-coded slate/violet classes.

### Component layers

- Primitives: button, icon button, input, dialog, sheet, tooltip, progress, toast, skeleton.
- Game components: player token, player ring, role card, phase banner, phase timer, target picker, ballot, death marker, event feed.
- Trust components: proof progress, confirmation receipt, network health, reconnect banner, privacy explainer.
- Safety components: mute/report, content warning, moderation status.

### Motion rules

- 100–150ms for press/hover/focus feedback; 200–250ms for overlays; 300–400ms for phase changes.
- Animate only opacity and transform in normal UI. Do not use `transition-all`.
- Target selection causes a local response immediately; proof progress follows without blocking navigation unnecessarily.
- Phase changes use shared scene lighting/fog rather than animating every child.
- Role reveal, elimination, and victory may use one signature animation each, all skippable and reduced-motion safe.
- Sound and haptics have independent controls and never carry essential information alone.

## 8. Retention without dark patterns

### Launch retention

- one-tap rematch with the same party;
- rotating daily ruleset/prompt, without pay-to-win effects;
- cosmetic account progression for completed matches, sportsmanship, and teaching new players;
- post-match social recap and shareable redacted result card;
- party history, friend invites, and scheduled game reminders with explicit opt-in;
- lightweight achievements focused on play styles, not grinding;
- “play again” and “invite another player” as the primary post-game actions.

### Later systems

- curated role packs and custom lobbies;
- seasons with cosmetic rewards only;
- verified ranked queues after anti-collusion and disconnect policy mature;
- community-hosted tournaments and spectator broadcasts with delayed/redacted information;
- creator tools for rule presets after the core protocol is stable.

Track funnel completion, lobby fill time, match completion, phase abandonment, rematch rate, D1/D7 party return, proof failure rate, reconnect recovery, reports, and accessibility settings. Never collect private actions, roles, raw wallet addresses, or chat content for product analytics.

## 9. Target repository structure

```text
VeilWolf/
├── .agents/skills/                  # project-scoped agent guidance
├── apps/
│   ├── web/                         # Next.js player client/PWA
│   │   └── src/
│   │       ├── app/                 # routes and route boundaries only
│   │       ├── features/            # onboarding, lobby, night, day, vote, results
│   │       ├── components/          # app-level composition
│   │       ├── providers/           # wallet, query, audio, motion, telemetry
│   │       └── styles/              # tokens and global layers
│   └── relay/                       # optional chat, invites, presence; no secret authority
├── packages/
│   ├── contracts/
│   │   ├── src/                     # compiled Compact sources
│   │   ├── test/                    # simulator/invariant tests
│   │   ├── generated/               # compiler output, reproducibly generated
│   │   └── scripts/                 # compile/deploy/version checks
│   ├── game-domain/                 # pure rules, types, invariants, model tests
│   ├── game-client/                 # ChainClient port and application services
│   │   ├── mock/
│   │   └── midnight/
│   ├── ui/                          # accessible design-system primitives
│   ├── motion/                      # shared reduced-motion-safe recipes
│   ├── protocol/                    # commitments, codecs, ruleset schemas
│   ├── observability/               # privacy-safe diagnostics/analytics
│   └── config/                      # shared TS, lint, test configuration
├── e2e/                             # Playwright multi-player journeys
├── infra/                           # local devnet/proof server/indexer config
├── docs/
│   ├── PRODUCT_PLAN.md
│   ├── threat-model.md
│   ├── protocol.md
│   ├── game-rules.md
│   ├── ux-flow.md
│   └── decisions/                   # architecture decision records
├── brand.md
└── README.md
```

Migrate toward this structure incrementally. Do not perform a disruptive folder rewrite before the Midnight adapter seam and tests exist.

## 10. Delivery plan

### Phase 0 — decisions and measurable spikes (week 1)

- Pin a current compatible Compact compiler, Midnight.js/SDK, ledger, wallet, and proof-server matrix from official examples.
- Compile and test one real private-state circuit locally.
- Benchmark proving on target desktop and mobile-class hardware.
- Prototype role assignment and complete its threat model.
- Validate browser wallet/connector flow, private-state persistence, reconnect, and DUST/fee-resource UX.
- Decide vote reveal policy, death-role reveal policy, timeout defaults, tie handling, disconnect policy, and guest identity model.

Exit gate: a two-player private action reaches finality on local devnet, restores after reload, leaks no secret through inspected public/indexer data, and meets the provisional latency budget.

### Phase 1 — vertical slice (weeks 2–3)

- Keep the existing TypeScript state machine as the executable rules model.
- Implement real create/join/ready/start and one night-action circuit path.
- Add dependency-injected mock/Midnight client adapters.
- Build one polished flow: join → role reveal → night choice → dawn result.
- Add transaction stage UI, error recovery, reconnect, redacted logging, and accessible motion.
- Add differential contract/model tests and multi-browser E2E coverage.

Exit gate: three separate clients finish the slice twice, including one disconnect/reconnect, with no manual state repair.

### Phase 2 — complete casual match (weeks 4–6)

- Implement all four roles, discussion, nominations, sealed voting, tie policy, victory, selective reveal, and rematch.
- Add permissionless timeout finalization and spectator isolation.
- Complete brand/design tokens, responsive player board, sound/haptics, tutorial, skeleton/error/offline states.
- Add encrypted private-state backup and recovery test.
- Run structured playtests for clarity, fun, downtime, proof latency, and social safety.

Exit gate: 20 full external playtest matches, ≥85% completion, no critical privacy/integrity issue, and median phase-transition delay within the agreed budget.

### Phase 3 — testnet beta (weeks 7–9)

- Deploy to the chosen public Midnight environment with reproducible scripts.
- Add privacy-safe observability, status page, moderation operations, incident runbook, dependency/SBOM checks, and load tests.
- Conduct a dedicated privacy/security review and fix all critical/high findings.
- Add shareable recap, party history, rematch loop, invitations, and opt-in reminders.

Exit gate: 100 invited players, successful restore/reconnect drills, stable proof infrastructure, supportable moderation load, and no unresolved high-severity finding.

### Phase 4 — launch and expansion

- Ship casual public rooms first.
- Add custom presets and new roles behind versioned ruleset hashes.
- Add ranked play only after collusion, sybil, disconnect, and moderation systems are measured in production.
- Introduce cosmetic progression and seasons without economic or power advantages.

## 11. Immediate backlog

### P0

1. Replace the illustrative `pragma language_version >= 0.13` contract with a compiler-pinned project generated from a current official template.
2. Write `docs/threat-model.md` and decide the role-assignment protocol.
3. Split `ChainClient` into port + mock/Midnight adapters and model transaction stages explicitly.
4. Add contract simulator tests and differential model/contract tests.
5. Replace plaintext mock secrets in browser storage for any non-local environment.
6. Remove public completion fields that can correlate a night action with a special role.
7. Add deterministic deadline, tie, abstention, duplicate-call, and permissionless-finalization rules.

### P1

1. Establish `brand.md` and tokenized light/dark/high-contrast themes.
2. Create the persistent game shell: phase header, timer, player ring, status/reconnect region, primary-action dock.
3. Replace page-level “Loading…” text with skeleton, empty, offline, proving, finality, and recovery states.
4. Add Playwright multi-context E2E tests for nine players.
5. Add tutorial, rules reference, player notes, mute/report, and spectator boundaries.
6. Add proof receipts and a privacy-safe replay event schema.

### P2

1. Rematch party, recap cards, achievements, and opt-in invitations.
2. Voice-room integration and moderation tooling.
3. Additional balanced role packs and custom lobby presets.
4. Ranked/tournament research after casual metrics are healthy.

## 12. Definition of done

A feature is done only when:

- rules and privacy behavior are documented;
- domain, contract, adapter, and E2E tests cover success and abuse paths;
- loading, empty, error, retry, offline, reconnect, and timeout states exist;
- keyboard, screen-reader, 375/768/1280px, reduced-motion, muted-sound, and contrast checks pass;
- secrets are absent from public state, URLs, analytics, logs, errors, and replay data;
- proof latency and transaction finality are measured, not assumed;
- UX copy avoids blockchain jargon while an inspectable proof receipt remains available;
- the implementation passes typecheck, lint, tests, build, dependency audit, and privacy review.
