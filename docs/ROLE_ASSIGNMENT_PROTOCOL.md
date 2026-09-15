# VeilWolf Private Role Assignment Protocol

Status: staged implementation; private roster and anonymous assignment-key
registration are implemented, while the encrypted shuffle and role opening
remain behind the feasibility gate

## Objective

Distribute the fixed nine-card role deck—two Werewolves, five Villagers, one
Doctor, and one Seer—so that:

- every frozen-roster member receives exactly one role;
- the deck contains exactly the configured multiset;
- no host, relay, or other player learns another player's role;
- no participant can select or predict their own role;
- later Compact circuits can prove role capability without disclosing role;
- aborts cannot let a participant repeatedly reroll an unfavorable deck.

The playable mock does not provide these guarantees. Its `Math.random` shuffle
remains a UX harness only.

## Selected design: verifiable encrypted mixnet deck

The preferred protocol is a nine-party verifiable shuffle followed by
recipient-scoped threshold opening. It is selected over a public-seed shuffle
because public randomness combined with observable roster insertion order would
let an indexer reconstruct every role.

### 1. Private roster and keys

Each player generates, locally and per match:

- a 32-byte membership secret;
- a fresh roster commitment nonce;
- an encryption key pair;
- a signing/authentication key scoped to the protocol transcript.

`joinPrivateRoster` inserts a randomized membership commitment into a Merkle
tree. The raw wallet address, membership secret, nonce, and encryption secret
key never become circuit arguments or ledger fields. The roster freezes at
exactly nine commitments.

### 2. Canonical encrypted deck

The contract fixes the public plaintext composition by ruleset hash:

```text
[WEREWOLF, WEREWOLF,
 VILLAGER, VILLAGER, VILLAGER, VILLAGER, VILLAGER,
 DOCTOR, SEER]
```

These values are encrypted under a match-scoped aggregate key. The ruleset
hash, roster root, network identifier, contract address, and match identifier
are bound into every proof transcript.

### 3. Sequential shuffle and rerandomization

Eligible roster members may each transform the encrypted deck once. For every
accepted step, a zero-knowledge shuffle proof establishes that:

- the output contains exactly the input ciphertexts;
- only their order and encryption randomness changed;
- no card was added, removed, duplicated, or replaced;
- the step is bound to the previous deck root and protocol round;
- a shuffle nullifier prevents a second step from the same member.

The private permutation and rerandomizers remain witnesses. If at least one
participating shuffler is honest and erases that randomness, no other party can
reconstruct the final permutation.

### 4. Recipient-scoped role opening

Final deck position is bound to a hidden roster leaf through a proven
permutation, not to publicly observable join order. Participants produce
verifiable key-switch/decryption shares for one recipient at a time. Shares are
encrypted to that recipient and delivered through the relay; their correctness
is proven against the final deck commitment.

The recipient learns one role and stores a local role credential containing:

- match and frozen-roster root;
- final deck root and hidden assigned position;
- role value and opening material;
- ruleset hash and protocol version.

Later night-action or vote circuits prove that this credential opens a card in
the final deck and that the card permits the requested capability. The role,
deck position, membership leaf, and opening remain witnesses.

### 5. Completion and erasure

The assignment phase completes only after nine distinct assignment nullifiers
are accepted. Clients erase shuffle permutations, rerandomizers, and temporary
decryption shares after verifying their credential. Durable private storage
keeps only the membership material and role credential needed for gameplay and
recovery.

## Abort and reroll policy

- Each protocol stage has a public deadline and monotonically increasing round.
- An absent shuffler may be skipped; confidentiality still holds if at least one
  completed shuffle was honest.
- Once the first valid shuffle is accepted, cancelling and recreating the same
  roster requires a publicly visible abort and cooldown. This prevents silent
  host rerolls.
- A player who withholds a required opening share creates a liveness failure.
  An `n-of-n` threshold maximizes confidentiality but lets one player stall;
  a lower threshold improves recovery but lets that many colluding players
  decrypt roles. The launch threshold must not be chosen until playtest and
  adversarial requirements are explicit.
- No production claim of trustless assignment is allowed until the chosen
  threshold, recovery path, and encrypted-share transport are implemented and
  independently reviewed.

## Why simpler protocols were rejected

| Candidate | Rejection reason |
| --- | --- |
| Host-side shuffle | Host can inspect and bias every assignment. |
| Public VRF seed mapped to join index | Join ordering and transaction metadata reveal the role map. |
| Commit/reveal seed mapped to join index | Joint entropy prevents unilateral bias but does not hide roles from observers who know insertion order. |
| Independent `hash(secret) % role` | Does not guarantee the exact role multiset and permits grinding. |
| Central encrypted dealer | Dealer can inspect all roles and becomes a trusted availability dependency. |
| TEE-only dealer | Moves trust to hardware/vendor attestation and retains a catastrophic compromise point. |

## Threat analysis

| Threat | Required control | Verification |
| --- | --- | --- |
| Host chooses assignments | Canonical deck plus proof-preserving mixnet | Adversarial host tests and transcript audit |
| Player replaces or duplicates a card | Shuffle proof preserves encrypted multiset | Negative circuit tests for malformed decks |
| Player grinds their role | Commitment before assignment and no public index mapping | Repeated-run statistical tests |
| All shufflers collude | Explicit assumption: at least one honest completed shuffle | Documented trust statement and collusion test |
| Last participant aborts | Deadlines, skip rule, visible abort/cooldown | Host-offline and selective-abort tests |
| Share recipient learns other roles | Recipient-scoped encrypted shares | Cross-recipient decryption negative tests |
| Threshold coalition decrypts deck | Threshold chosen from explicit confidentiality/liveness policy | Coalition tests for every threshold boundary |
| Join timing links a roster leaf | Relayed submissions, batching, and hidden position permutation | Indexer and network timing review |
| Credential replay across matches | Bind network, contract, match, ruleset, roster root, and deck root | Cross-match and cross-network replay tests |
| Browser compromise steals a role | Encrypted private state, strict CSP, minimal dependencies | Storage inspection and XSS exercises |

## Compact implementation plan

1. ✅ Keep the implemented `rosterCommitments` Merkle tree and join nullifiers.
2. ✅ Freeze an exact nine-member roster into a distinct assignment phase.
3. ✅ Require each member to anonymously register exactly one randomized,
   match-scoped encryption-key commitment before night can begin.
4. Add an immutable ruleset hash and bind a frozen roster-root snapshot into
   every assignment transcript.
5. Prototype the encrypted-card representation with Compact elliptic-curve
   primitives and benchmark one nine-card shuffle proof.
6. Implement deck-step nullifiers and previous-root binding.
7. Prototype recipient-scoped key switching and benchmark nine openings.
8. Implement the private role credential and connect it to
   `submitPrivateNightAction`.
9. Inspect the public transcript and indexer output for role, position, leaf,
   target, and cross-purpose-linkage leakage.
10. Run malicious-host, collusion, abort, replay, and recovery test suites.

## Feasibility gates

The protocol remains a design until all of these are measured:

- Compact can express and prove a nine-card shuffle within the latency budget;
- the selected curve/encryption construction is compatible with the current
  Midnight runtime and receives cryptographic review;
- encrypted share delivery survives refresh and reconnect without exposing
  shares to the relay;
- the chosen threshold has an acceptable, documented collusion assumption;
- assignment plus first action works in three isolated browser profiles;
- an inspected public transcript cannot reconstruct the roster-to-role map.

If the shuffle or key-switch proof is too slow, the fallback is not a trusted
host. The fallback is a separately reviewed threshold assignment service with a
clearly disclosed trust model while the permissionless protocol remains
experimental.
