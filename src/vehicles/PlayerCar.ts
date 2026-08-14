import Phaser from 'phaser';
import { Vehicle, type DriveInput } from './Vehicle';
import { InputManager } from '../systems/InputManager';
import type { VehicleStats } from '../types';

export class PlayerCar extends Vehicle {
  private input: InputManager;
  lastInput: DriveInput = { steer: 0, throttle: 0, brake: 0 };

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number, angle: number, stats: VehicleStats, input: InputManager) {
    super(scene, textureKey, x, y, angle, stats);
    this.input = input;
  }

  drive(dt: number, offroadTopSpeedMult: number, offroadGripMult: number): void {
    this.lastInput = this.input.read();
    this.update(dt, this.lastInput, offroadTopSpeedMult, offroadGripMult);
  }
}
