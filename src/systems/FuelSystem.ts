import { FUEL_BASE_DRAIN_PER_SEC, FUEL_MAX, FUEL_THROTTLE_DRAIN_PER_SEC } from '../config';

export class FuelSystem {
  fuel: number = FUEL_MAX;
  empty = false;

  tick(dt: number, throttle: number, extraDrainPerSec = 0): void {
    if (this.empty) return;
    const drain = FUEL_BASE_DRAIN_PER_SEC + FUEL_THROTTLE_DRAIN_PER_SEC * throttle + extraDrainPerSec;
    this.fuel = Math.max(0, this.fuel - drain * dt);
    if (this.fuel <= 0) this.empty = true;
  }

  add(amount: number): void {
    if (this.empty) return;
    this.fuel = Math.min(FUEL_MAX, this.fuel + amount);
  }

  penalize(amount: number): void {
    if (this.empty) return;
    this.fuel = Math.max(0, this.fuel - amount);
    if (this.fuel <= 0) this.empty = true;
  }

  get ratio(): number {
    return this.fuel / FUEL_MAX;
  }
}
