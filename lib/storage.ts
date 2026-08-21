
import type { GameState } from "./types";

const KEY = "chaoso-vakarelis-state-v1";

export const emptyState: GameState = { players: [], logs: [], usedMissionIds: [] };

export function loadState(): GameState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : emptyState;
  } catch {
    return emptyState;
  }
}

export function saveState(state: GameState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
