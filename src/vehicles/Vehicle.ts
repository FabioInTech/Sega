import Phaser from 'phaser';
import type { VehicleStats } from '../types';

export interface DriveInput {
  steer: number; // -1..1
  throttle: number; // 0..1
  brake: number; // 0..1
}

/**
 * Arcade-style top-down car physics. Deliberately simple: direct heading
 * control from steering input, a scalar forward speed driven by
 * throttle/brake, and a velocity vector that "catches up" to the heading
 * direction at a rate set by `grip` — this lag is what produces the slight
 * slide/drift feel instead of the velocity always matching the heading
 * exactly like a rigid vector-only model.
 */
export class Vehicle {
  x: number;
  y: number;
  heading: number;
  velocity: Phaser.Math.Vector2;
  forwardSpeed = 0;
  stats: VehicleStats;
  sprite: Phaser.GameObjects.Sprite;

  pathIndex = 0;
  progressDistance = 0;
  lateralOffset = 0;
  onRoad = true;
  finished = false;
  finishTime = 0;
  disqualified = false;
  rank = 1;

  constructor(
    scene: Phaser.Scene,
    textureKey: string,
    x: number,
    y: number,
    angle: number,
    stats: VehicleStats
  ) {
    this.x = x;
    this.y = y;
    this.heading = angle;
    this.velocity = new Phaser.Math.Vector2(0, 0);
    this.stats = stats;
    this.sprite = scene.add.sprite(x, y, textureKey);
    this.sprite.setRotation(angle);
    this.sprite.setDepth(10);
  }

  get speed(): number {
    return this.velocity.length();
  }

  update(dt: number, input: DriveInput, offroadTopSpeedMult: number, offroadGripMult: number): void {
    const stats = this.stats;
    const effectiveMaxSpeed = stats.maxSpeed * offroadTopSpeedMult;

    if (input.brake > 0.05) {
      const brakeSign = this.forwardSpeed >= 0 ? -1 : 1;
      this.forwardSpeed += brakeSign * stats.braking * input.brake * dt;
      if (Math.abs(this.forwardSpeed) < 6) this.forwardSpeed = 0;
    } else if (input.throttle > 0.05) {
      this.forwardSpeed += stats.acceleration * input.throttle * dt;
    } else {
      const dragSign = this.forwardSpeed > 0 ? -1 : this.forwardSpeed < 0 ? 1 : 0;
      this.forwardSpeed += dragSign * stats.braking * 0.32 * dt;
      if (Math.abs(this.forwardSpeed) < 4) this.forwardSpeed = 0;
    }

    this.forwardSpeed = Phaser.Math.Clamp(
      this.forwardSpeed,
      -effectiveMaxSpeed * 0.32,
      effectiveMaxSpeed
    );

    // Steering responsiveness ramps up with speed then saturates — crawling
    // cars barely turn, cruising cars turn briskly, matching arcade feel.
    const speedFactor = Phaser.Math.Clamp(Math.abs(this.forwardSpeed) / (stats.maxSpeed * 0.45), 0, 1);
    const directionSign = this.forwardSpeed < 0 ? -1 : 1;
    const turnRate = 2.9 * speedFactor * directionSign;
    this.heading += input.steer * turnRate * dt;

    const grip = Phaser.Math.Clamp(stats.grip * offroadGripMult, 0.05, 1);
    const targetVX = Math.cos(this.heading) * this.forwardSpeed;
    const targetVY = Math.sin(this.heading) * this.forwardSpeed;
    const blend = Phaser.Math.Clamp(grip * 6.5 * dt, 0, 1);
    this.velocity.x += (targetVX - this.velocity.x) * blend;
    this.velocity.y += (targetVY - this.velocity.y) * blend;

    this.x += this.velocity.x * dt;
    this.y += this.velocity.y * dt;

    this.syncSprite();
  }

  applyImpulse(px: number, py: number, speedLossFactor: number): void {
    this.x += px;
    this.y += py;
    const keep = 1 - speedLossFactor;
    this.forwardSpeed *= keep;
    this.velocity.scale(keep);
  }

  teleportTo(x: number, y: number, angle: number, forwardSpeed: number): void {
    this.x = x;
    this.y = y;
    this.heading = angle;
    this.forwardSpeed = forwardSpeed;
    this.velocity.setTo(Math.cos(angle) * forwardSpeed, Math.sin(angle) * forwardSpeed);
    this.syncSprite();
  }

  syncSprite(): void {
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setRotation(this.heading);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
