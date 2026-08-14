import type { UpgradeLevels, VehicleStats } from '../types';

export const UPGRADE_MAX_TIER = 4;

export const BASE_STATS: VehicleStats = {
  maxSpeed: 205,
  acceleration: 160,
  braking: 255,
  grip: 0.6,
  bumper: 0.32
};

export const AI_BASE_STATS: VehicleStats = {
  maxSpeed: 198,
  acceleration: 150,
  braking: 240,
  grip: 0.58,
  bumper: 0.3
};

interface UpgradeCategoryInfo {
  key: keyof UpgradeLevels;
  label: string;
  description: string;
  baseCost: number;
  costScale: number;
}

export const UPGRADE_INFO: UpgradeCategoryInfo[] = [
  { key: 'engine', label: 'ENGINE', description: 'Acceleration', baseCost: 110, costScale: 1.55 },
  { key: 'topSpeed', label: 'TOP SPEED', description: 'Max velocity', baseCost: 130, costScale: 1.55 },
  { key: 'grip', label: 'TIRES', description: 'Cornering grip', baseCost: 120, costScale: 1.55 },
  { key: 'bumper', label: 'BUMPER', description: 'Collision resistance', baseCost: 100, costScale: 1.55 }
];

export function defaultUpgrades(): UpgradeLevels {
  return { engine: 0, topSpeed: 0, grip: 0, bumper: 0 };
}

export function upgradeCost(baseCost: number, costScale: number, currentTier: number): number {
  return Math.round(baseCost * Math.pow(costScale, currentTier));
}

export function statsForUpgrades(upg: UpgradeLevels): VehicleStats {
  return {
    maxSpeed: BASE_STATS.maxSpeed + upg.topSpeed * 21,
    acceleration: BASE_STATS.acceleration + upg.engine * 27,
    braking: BASE_STATS.braking + upg.engine * 8,
    grip: Math.min(0.92, BASE_STATS.grip + upg.grip * 0.075),
    bumper: Math.min(0.85, BASE_STATS.bumper + upg.bumper * 0.13)
  };
}
