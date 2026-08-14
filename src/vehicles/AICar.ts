import Phaser from 'phaser';
import { Vehicle } from './Vehicle';
import { TrackPath } from '../systems/TrackPath';
import type { VehicleStats } from '../types';

/**
 * Simple lookahead-steering AI: aims at a point further down the track
 * centerline (with a slow per-car lateral wander so cars don't all glue to
 * the same line), backs off the throttle before sharp curves, and applies a
 * mild rubber-band throttle multiplier so races stay close without being
 * unfair.
 */
export class AICar extends Vehicle {
  private path: TrackPath;
  private lookahead: number;
  private lanePhase: number;
  private wanderAmount: number;

  constructor(
    scene: Phaser.Scene,
    textureKey: string,
    x: number,
    y: number,
    angle: number,
    stats: VehicleStats,
    path: TrackPath,
    personalitySeed: number
  ) {
    super(scene, textureKey, x, y, angle, stats);
    this.path = path;
    this.lookahead = 140 + personalitySeed * 18;
    this.lanePhase = personalitySeed * 2.1;
    this.wanderAmount = 0.14 + (personalitySeed % 3) * 0.05;
  }

  drive(
    dt: number,
    elapsedTime: number,
    offroadTopSpeedMult: number,
    offroadGripMult: number,
    rubberBandMult: number
  ): void {
    const targetDist = this.progressDistance + this.lookahead;
    const sample = this.path.sampleAtDistance(targetDist);
    const wander = Math.sin(elapsedTime * 0.6 + this.lanePhase) * this.wanderAmount * sample.width * 0.5;
    const rx = -Math.sin(sample.angle);
    const ry = Math.cos(sample.angle);
    const tx = sample.x + rx * wander;
    const ty = sample.y + ry * wander;

    const desiredHeading = Math.atan2(ty - this.y, tx - this.x);
    let diff = desiredHeading - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const steer = Phaser.Math.Clamp(diff * 2.2, -1, 1);
    const curveSeverity = Math.min(1, Math.abs(diff) * 1.6);

    let throttle = Phaser.Math.Clamp(1 - curveSeverity * 0.7, 0.32, 1) * rubberBandMult;
    let brake = 0;
    if (curveSeverity > 0.85) {
      brake = 0.35;
      throttle = 0.2;
    }

    this.update(dt, { steer, throttle, brake }, offroadTopSpeedMult, offroadGripMult);
  }
}
