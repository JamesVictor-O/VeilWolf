"use client";

import { generateAddress, type Address } from "@veilwolf/game-engine";

// sessionStorage is per-tab (unlike localStorage, which the mock chain
// client uses for shared game state), so opening a second browser tab
// naturally gives that tab its own player identity — this is what makes
// "open a second tab to play as player 2" work without any real auth.
const ADDRESS_KEY = "veilwolf:address";
const NICKNAME_KEY = "veilwolf:nickname";
const AVATAR_KEY = "veilwolf:avatar";
const MATCH_IDENTITY_PREFIX = "veilwolf:match-identity:";

export interface MatchIdentity {
  /** Private witness material. Never place this in public game state. */
  secret: string;
  nonce: string;
  /** Match-scoped public pseudonym derived from the private material. */
  address: Address;
}

function randomHex(bytes = 32): string {
  const value = new Uint8Array(bytes);
  window.crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deriveMatchAddress(
  gameId: string,
  secret: string,
  nonce: string,
): Promise<Address> {
  const payload = new TextEncoder().encode(
    `veilwolf:match-identity:v1|${gameId}|${secret}|${nonce}`,
  );
  const digest = await window.crypto.subtle.digest("SHA-256", payload);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `member:${hex}`;
}

export async function getOrCreateMatchIdentity(
  gameId: string,
): Promise<MatchIdentity> {
  const normalizedGameId = gameId.trim().toUpperCase();
  const key = `${MATCH_IDENTITY_PREFIX}${normalizedGameId}`;
  const saved = window.sessionStorage.getItem(key);
  if (saved) {
    const parsed = JSON.parse(saved) as MatchIdentity;
    const address = await deriveMatchAddress(
      normalizedGameId,
      parsed.secret,
      parsed.nonce,
    );
    return { ...parsed, address };
  }

  const secret = randomHex();
  const nonce = randomHex();
  const address = await deriveMatchAddress(normalizedGameId, secret, nonce);
  const identity = { secret, nonce, address };
  window.sessionStorage.setItem(key, JSON.stringify(identity));
  return identity;
}

export function getOrCreateAddress(): Address {
  let addr = window.sessionStorage.getItem(ADDRESS_KEY);
  if (!addr) {
    addr = generateAddress();
    window.sessionStorage.setItem(ADDRESS_KEY, addr);
  }
  return addr;
}

export function getStoredNickname(): string | null {
  return window.sessionStorage.getItem(NICKNAME_KEY);
}

export function setStoredNickname(nickname: string): void {
  window.sessionStorage.setItem(NICKNAME_KEY, nickname);
}

export function setStoredAvatar(avatar: number): void {
  window.sessionStorage.setItem(AVATAR_KEY, String(avatar));
}
