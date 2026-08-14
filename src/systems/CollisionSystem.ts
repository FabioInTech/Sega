import { Vehicle } from '../vehicles/Vehicle';
import type { HazardInstance } from './TrackRenderer';

const CAR_RADIUS = 9;

export interface CollisionEvent {
  x: number;
  y: number;
  strength: number;
}

export function resolveCarCollisions(vehicles: Vehicle[]): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const a = vehicles[i];
      const b = vehicles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const minDist = CAR_RADIUS * 2;
      if (distSq >= minDist * minDist || distSq < 1e-6) continue;

      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      const relSpeed = Math.abs(a.forwardSpeed) + Math.abs(b.forwardSpeed);

      const lossA = clamp(0.16 * (1 - a.stats.bumper) + relSpeed * 0.00025, 0.04, 0.4);
      const lossB = clamp(0.16 * (1 - b.stats.bumper) + relSpeed * 0.00025, 0.04, 0.4);

      a.applyImpulse((-nx * overlap) / 2, (-ny * overlap) / 2, lossA);
      b.applyImpulse((nx * overlap) / 2, (ny * overlap) / 2, lossB);

      if (relSpeed > 30) {
        events.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, strength: relSpeed });
      }
    }
  }
  return events;
}

export function resolveHazardCollisions(vehicles: Vehicle[], hazards: HazardInstance[]): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  for (const v of vehicles) {
    for (const h of hazards) {
      const dx = v.x - h.x;
      const dy = v.y - h.y;
      const distSq = dx * dx + dy * dy;
      const minDist = CAR_RADIUS + h.radius;
      if (distSq >= minDist * minDist || distSq < 1e-6) continue;

      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      const loss = clamp(0.32 * (1 - v.stats.bumper * 0.7), 0.15, 0.55);
      v.applyImpulse(nx * overlap, ny * overlap, loss);

      if (Math.abs(v.forwardSpeed) > 25) {
        events.push({ x: h.x, y: h.y, strength: Math.abs(v.forwardSpeed) });
      }
    }
  }
  return events;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
