const POSITION_REWARD = [150, 100, 60, 30];

export function computeReward(position: number, fuelRemaining: number): number {
  const base = POSITION_REWARD[position - 1] ?? 20;
  const fuelBonus = Math.round(fuelRemaining * 0.55);
  return base + fuelBonus;
}
