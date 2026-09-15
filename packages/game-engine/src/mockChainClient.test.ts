import { describe, expect, it } from "vitest";
import { generateAddress, mockChainClient } from "./mockChainClient";

describe("mock simulation flow", () => {
  it("lets one human progress through a complete round with simulated players", async () => {
    const host = generateAddress();
    const { gameState: created } = await mockChainClient.createGame({
      host,
      hostNickname: "Host",
    });

    const { gameState: filled } = await mockChainClient.fillWithSimulatedPlayers({
      gameId: created.gameId,
      actor: host,
    });
    expect(filled.players).toHaveLength(9);
    expect(
      filled.players.filter((player) => player.address.startsWith("simulated:")),
    ).toHaveLength(8);

    const { gameState: night } = await mockChainClient.startGame({
      gameId: created.gameId,
      actor: host,
    });
    expect(night.phase).toBe("NIGHT");
    expect(
      night.players
        .filter((player) => player.address.startsWith("simulated:"))
        .every((player) => player.hasActedThisNight),
    ).toBe(true);

    const hostState = await mockChainClient.getPrivateState(created.gameId, host);
    if (hostState?.role && hostState.role !== "VILLAGER") {
      const candidates = night.players.filter(
        (player) => player.isAlive && player.address !== host,
      );
      let target = candidates[0];
      if (hostState.role === "WEREWOLF") {
        for (const candidate of candidates) {
          const candidateState = await mockChainClient.getPrivateState(
            created.gameId,
            candidate.address,
          );
          if (candidateState?.role !== "WEREWOLF") {
            target = candidate;
            break;
          }
        }
      }
      expect(target).toBeDefined();
      await mockChainClient.submitNightAction({
        gameId: created.gameId,
        actor: host,
        target: target!.address,
      });
    }

    expect(await mockChainClient.allEligibleActed(created.gameId)).toBe(true);
    const { gameState: dawn } = await mockChainClient.resolveDawn({
      gameId: created.gameId,
    });
    expect(dawn.phase).toBe("DAWN");

    await mockChainClient.advanceToDay({ gameId: created.gameId });
    const { gameState: voting } = await mockChainClient.advanceToVote({
      gameId: created.gameId,
    });
    expect(voting.phase).toBe("VOTE");
    const voteTarget = voting.players.find(
      (player) => player.isAlive && player.address !== host,
    );
    expect(voteTarget).toBeDefined();
    await mockChainClient.submitVote({
      gameId: created.gameId,
      voter: host,
      target: voteTarget!.address,
    });
    expect(await mockChainClient.allEligibleVoted(created.gameId)).toBe(true);

    const { gameState: nextRound } = await mockChainClient.revealVotes({
      gameId: created.gameId,
    });
    expect(["NIGHT", "ENDED"]).toContain(nextRound.phase);
  });
});
