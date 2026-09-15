# VeilWolf Threat Model

Status: pre-implementation review
Last reviewed: 2026-09-04

## Scope

This document covers match creation, pseudonymous membership, role assignment, night actions, voting, phase finalization, selective role reveal, private-state storage, replay output, and the off-chain presence/chat relay.

The mock client is a local UX harness and is explicitly outside the production trust boundary. It stores all secrets in plaintext and must never be enabled in a public deployment.

## Trust boundaries

| Component | Trusted for | Not trusted for |
| --- | --- | --- |
| Compact contract and verifier | Enforcing encoded invariants | Protecting values deliberately disclosed to the ledger |
| Player wallet/prover | Holding that player's secrets | Reporting an honest role or action unless the circuit proves it |
| Midnight ledger/indexer | Finalized public state and availability | Hiding transaction timing, entry point, arguments, or ledger writes |
| Relay service | Presence, invitations, delivery of moderated chat | Roles, ballots, night targets, final match outcome |
| Host | Choosing pre-game settings before they are frozen | Assigning roles, resolving phases, inspecting secrets, freezing play |
| Web client | Rendering verified state | Authoritative validation or durable secret storage by itself |

## Protected assets

- Correct role multiset and unbiased, one-per-player assignment
- Role, teammate, night-target, investigation, and ballot confidentiality
- One valid action per eligible player per phase
- Correct resolution, victory, and selective-reveal policy
- Match liveness if the host disconnects
- Unlinkability of a player's identities between matches
- Availability and recoverability of local private state
- Separation of living, dead, spectator, and moderation channels

## Adversaries

- Malicious host attempting to bias roles, inspect secrets, or stall
- Player spoofing a role, acting twice, targeting an ineligible player, or replaying a proof
- Colluding players correlating network timing and public state changes
- Relay operator inspecting messages or selectively withholding them
- Passive ledger/indexer observer reconstructing roles from circuit choice, timing, or action counts
- Compromised browser extension, dependency, analytics SDK, log collector, or shared device
- Griefer disconnecting at a mandatory phase or repeatedly forcing failed transactions

## Mandatory invariants

1. A match configuration and ruleset hash are immutable after roster finalization.
2. Each roster commitment maps to exactly one valid role assignment from the fixed multiset.
3. Role capability is proven in zero knowledge; it is never accepted as a client-provided enum.
4. Every action is bound to network, contract, match, ruleset, round, phase, actor secret, action type, target, and fresh nonce.
5. A phase-scoped nullifier prevents duplicate action and cross-match/cross-round replay.
6. Night and vote targets are witness values, never circuit arguments.
7. Target eligibility, liveness, role capability, phase, and deadline are asserted by the circuit.
8. Split wolf targets result in no kill for the launch ruleset.
9. Villagers never emit a distinguishable night transaction merely to signal completion.
10. Any player can finalize an expired phase; host authorization is not required.
11. Public completion data cannot identify which player has a special role.
12. Private-state export/import is encrypted, authenticated, versioned, and recovery-tested.

## Privacy budget

### Intentionally public

- Match contract, frozen ruleset hash, public phase/round/deadline
- Pseudonymous roster commitments and public alive/dead outcome
- That a contract circuit was called and when
- Phase outcome, winner, and permitted selective reveals
- Nullifiers and commitments that are domain-separated and unlinkable to raw identity

### Never intentionally public

- Raw wallet address as game identity
- Role or team before the configured reveal
- Individual night target, investigation result, or ballot
- Which special role has not acted
- Commitment nonce, per-match secret, recovery key, or private-state blob
- Private notes, living/dead chat crossover, or moderation evidence outside its restricted system

## Attack review

| Threat | Control | Verification |
| --- | --- | --- |
| Host chooses favorable shuffle | Multi-party/chain-entropy assignment protocol with abort resistance | Statistical and adversarial protocol tests |
| Player claims another role | Role-membership proof bound to roster and ruleset | Negative simulator tests |
| Double action/vote | Phase-scoped nullifier set | Replay and concurrent-submit tests |
| Guessing small-domain commitment | `persistentCommit` with fresh 32-byte nonce | Ledger brute-force review |
| Cross-purpose key linking | Unique, versioned domain separator per hash/commit/nullifier | Static domain registry test |
| Target visible in transaction | Target sourced only from witness | Transcript/indexer inspection test |
| Timing reveals role | Relayed/batched submission policy and non-identifying progress | Traffic-analysis playtest |
| Host disconnect freezes game | Permissionless deadline finalizer | Host-offline E2E test |
| Stale proof drains fees | Short validity window, ledger-state binding, preflight and retry limits | Reordering/failure tests |
| Secret reaches telemetry | Allowlisted event schema with no arbitrary payloads | Automated log/network scan |
| XSS steals private state | Strict CSP, no unsafe script, audited dependencies, isolated encrypted provider | Browser security test |
| Replay leaks post-game actions | Public-event replay by default; private reveal opt-in and policy-bound | Snapshot/redaction tests |

## Open blockers

- Implement and benchmark the verifiable encrypted mixnet specified in
  `docs/ROLE_ASSIGNMENT_PROTOCOL.md`. Its threshold and recovery policy block
  any claim of trustless role assignment.
- Decide whether night-action metadata needs a relayer/batcher to prevent sender and timing correlation.
- Select browser private-state persistence and recovery design; the SDK's in-memory example is insufficient.
- Define timeout-safe behavior when a special role never acts without revealing which role is absent.
- Validate transaction guaranteed/fallible phase placement so a failed call cannot leave partial consequential state or enable DUST griefing.
- Pin the official compatibility matrix across Compact, runtime, ledger, Midnight.js, wallet SDK, proof server, node, and indexer.

## Implemented privacy spike

`packages/contracts/private-action.compact` now validates private roster
membership and the action commitment/nullifier primitive independently of the
playable mock:

- player secret and roster nonce are committed into a private Merkle roster;
- a join nullifier prevents one per-match secret from filling multiple seats;
- the lobby freezes only when exactly nine private commitments exist;
- night actions require a valid private path to the frozen roster root;
- role, target, nonce, membership secret, and path are witness-only inputs;
- a `persistentCommit` binds game, turn, role, target, and fresh nonce;
- a separately domain-separated nullifier binds game, turn, and player secret;
- repeated use of the same player secret in the same round is rejected;
- only the commitment-tree growth, nullifier, and aggregate action count are public.

This does **not** yet prove invite uniqueness, assigned-role capability, target
liveness, or the full dawn tally. Those remain explicit blockers and must be
composed into the final circuit before the playable client can make a
trustless-gameplay claim. In particular, a join nullifier prevents duplicate
use of one secret; it does not stop one human from generating several secrets.

## Release gates

- No production build imports `mockChainClient` directly.
- Differential tests agree between the TypeScript model and compiled contract for every transition.
- A public-transcript audit finds no role, target, ballot, or investigation disclosure.
- A host-offline match advances and finishes.
- Duplicate, reordered, expired, and cross-match proofs are rejected.
- Private state restores on a fresh browser profile without exposing plaintext at rest.
- All critical/high findings from an independent Compact and privacy review are closed.
