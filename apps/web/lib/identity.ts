"use client";

import { generateAddress, type Address } from "@veilwolf/game-engine";

// sessionStorage is per-tab (unlike localStorage, which the mock chain
// client uses for shared game state), so opening a second browser tab
// naturally gives that tab its own player identity — this is what makes
// "open a second tab to play as player 2" work without any real auth.
const ADDRESS_KEY = "veilwolf:address";
const NICKNAME_KEY = "veilwolf:nickname";

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
