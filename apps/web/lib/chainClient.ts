import {
  mockChainClient,
  type ChainClient,
} from "@veilwolf/game-engine";

/**
 * The sole client binding for the web app.
 *
 * The Midnight adapter will replace this binding after its compiled contract,
 * provider, private-state recovery, and transcript-privacy tests pass. Keeping
 * the choice here prevents generated SDK types from leaking into UI features.
 */
export const chainClient: ChainClient = mockChainClient;
