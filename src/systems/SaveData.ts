import { STORAGE_KEY } from '../config';
import { defaultUpgrades } from './UpgradeSystem';
import type { SaveState } from '../types';

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    return {
      currency: parsed.currency ?? 0,
      upgrades: { ...defaultUpgrades(), ...parsed.upgrades },
      trackIndex: parsed.trackIndex ?? 0,
      bestResults: parsed.bestResults ?? {}
    };
  } catch {
    return freshSave();
  }
}

export function saveGame(state: SaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private browsing, etc.) — silently ignore
  }
}

export function freshSave(): SaveState {
  return { currency: 0, upgrades: defaultUpgrades(), trackIndex: 0, bestResults: {} };
}
