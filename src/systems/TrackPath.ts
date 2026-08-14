import { TRACK_STEP } from '../config';
import type { Waypoint } from '../types';

export interface PathSample {
  x: number;
  y: number;
  angle: number;
  width: number;
}

export interface PathProjection {
  distance: number;
  offset: number; // signed lateral offset from centerline (+ = right of travel direction)
  index: number;
  angle: number;
  width: number;
}

/**
 * Wraps a uniformly arc-length-spaced waypoint list and provides fast
 * sampling / nearest-point projection. Waypoints are generated at a fixed
 * step (TRACK_STEP) so distance -> index lookups are near O(1).
 */
export class TrackPath {
  readonly waypoints: Waypoint[];
  readonly totalLength: number;

  constructor(waypoints: Waypoint[]) {
    this.waypoints = waypoints;
    this.totalLength = waypoints[waypoints.length - 1].cumDist;
  }

  sampleAtDistance(distance: number): PathSample {
    const d = Math.max(0, Math.min(this.totalLength, distance));
    const approxIndex = Math.floor(d / TRACK_STEP);
    let i = Math.max(0, Math.min(this.waypoints.length - 2, approxIndex));
    // refine in case step spacing drifted slightly during generation
    while (i < this.waypoints.length - 2 && this.waypoints[i + 1].cumDist < d) i++;
    while (i > 0 && this.waypoints[i].cumDist > d) i--;
    const a = this.waypoints[i];
    const b = this.waypoints[Math.min(i + 1, this.waypoints.length - 1)];
    const span = Math.max(1e-6, b.cumDist - a.cumDist);
    const t = Math.max(0, Math.min(1, (d - a.cumDist) / span));
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      angle: lerpAngle(a.angle, b.angle, t),
      width: a.width + (b.width - a.width) * t
    };
  }

  /** Project a world point onto the path, searching near `hintIndex` for performance. */
  project(x: number, y: number, hintIndex = 0): PathProjection {
    const n = this.waypoints.length;
    const windowRadius = 22;
    let lo = Math.max(0, hintIndex - windowRadius);
    let hi = Math.min(n - 1, hintIndex + windowRadius);

    // If the hint is stale (car teleported / first frame), fall back to a full scan.
    if (hi - lo < windowRadius) {
      lo = 0;
      hi = n - 1;
    }

    let bestIndex = lo;
    let bestDistSq = Infinity;
    for (let i = lo; i <= hi; i++) {
      const wp = this.waypoints[i];
      const dx = wp.x - x;
      const dy = wp.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestIndex = i;
      }
    }

    const wp = this.waypoints[bestIndex];
    const next = this.waypoints[Math.min(bestIndex + 1, n - 1)];
    const prev = this.waypoints[Math.max(bestIndex - 1, 0)];

    // project onto the segment leaving this waypoint for a smoother sub-step estimate
    const segA = bestIndex < n - 1 ? wp : prev;
    const segB = bestIndex < n - 1 ? next : wp;
    const segDx = segB.x - segA.x;
    const segDy = segB.y - segA.y;
    const segLenSq = Math.max(1e-6, segDx * segDx + segDy * segDy);
    const t = Math.max(0, Math.min(1, ((x - segA.x) * segDx + (y - segA.y) * segDy) / segLenSq));
    const px = segA.x + segDx * t;
    const py = segA.y + segDy * t;
    const distance = segA.cumDist + (segB.cumDist - segA.cumDist) * t;
    const angle = lerpAngle(segA.angle, segB.angle, t);
    const width = segA.width + (segB.width - segA.width) * t;

    // signed lateral offset: cross product of forward dir and (point - projected point)
    const fx = Math.cos(angle);
    const fy = Math.sin(angle);
    const rx = x - px;
    const ry = y - py;
    const offset = fx * ry - fy * rx;

    return { distance, offset, index: bestIndex, angle, width };
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
