import Phaser from 'phaser';
import {
  CATCHUP_MARGIN,
  CATCHUP_RESPAWN_BEHIND,
  FUEL_PICKUP_AMOUNT,
  PLAYER_BEHIND_DISTANCE,
  PLAYER_BEHIND_DRAIN_PER_SEC
} from '../config';
import { AICar } from '../vehicles/AICar';
import { PlayerCar } from '../vehicles/PlayerCar';
import { Vehicle } from '../vehicles/Vehicle';
import { CameraRig } from './CameraRig';
import { resolveCarCollisions, resolveHazardCollisions } from './CollisionSystem';
import { FuelSystem } from './FuelSystem';
import { TrackPath } from './TrackPath';
import type { FuelPickupInstance, HazardInstance } from './TrackRenderer';
import type { TrackBuild } from '../types';

export interface RaceEntrant {
  vehicle: Vehicle;
  isPlayer: boolean;
  name: string;
}

const PICKUP_RADIUS = 14;

export class RaceManager extends Phaser.Events.EventEmitter {
  readonly path: TrackPath;
  readonly build: TrackBuild;
  readonly entrants: RaceEntrant[];
  readonly playerVehicle: PlayerCar;
  readonly fuel = new FuelSystem();
  readonly hazards: HazardInstance[];
  readonly fuelPickups: FuelPickupInstance[];
  readonly cameraRig: CameraRig;

  elapsed = 0;
  raceOver = false;
  outOfFuel = false;
  playerFinished = false;
  finishOrder: Vehicle[] = [];

  constructor(
    scene: Phaser.Scene,
    build: TrackBuild,
    path: TrackPath,
    entrants: RaceEntrant[],
    playerVehicle: PlayerCar,
    hazards: HazardInstance[],
    fuelPickups: FuelPickupInstance[]
  ) {
    super();
    this.build = build;
    this.path = path;
    this.entrants = entrants;
    this.playerVehicle = playerVehicle;
    this.hazards = hazards;
    this.fuelPickups = fuelPickups;
    this.cameraRig = new CameraRig(scene, build, playerVehicle.x, playerVehicle.y);

    for (const e of entrants) {
      const proj = this.path.project(e.vehicle.x, e.vehicle.y, 0);
      e.vehicle.pathIndex = proj.index;
      e.vehicle.progressDistance = proj.distance;
      e.vehicle.onRoad = true;
    }
  }

  update(dt: number): void {
    if (this.raceOver) return;
    this.elapsed += dt;

    for (const e of this.entrants) {
      const v = e.vehicle;
      const topSpeedMult = v.onRoad ? 1 : 0.55;
      const gripMult = v.onRoad ? 1 : 0.6;

      if (v instanceof PlayerCar) {
        v.drive(dt, topSpeedMult, gripMult);
      } else if (v instanceof AICar) {
        const rubberBand = this.rubberBandFor(v);
        v.drive(dt, this.elapsed, topSpeedMult, gripMult, rubberBand);
      }
    }

    const vehicles = this.entrants.map((e) => e.vehicle);
    const collisions = resolveCarCollisions(vehicles);
    const hazardHits = resolveHazardCollisions(vehicles, this.hazards);
    if (collisions.length > 0) this.emit('collision', collisions[0]);
    if (hazardHits.length > 0) this.emit('collision', hazardHits[0]);

    for (const e of this.entrants) {
      const v = e.vehicle;
      const proj = this.path.project(v.x, v.y, v.pathIndex);
      v.pathIndex = proj.index;
      v.progressDistance = proj.distance;
      v.lateralOffset = proj.offset;
      v.onRoad = Math.abs(proj.offset) <= proj.width / 2 + 4;
    }

    const ranked = [...vehicles].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progressDistance - a.progressDistance;
    });
    ranked.forEach((v, i) => (v.rank = i + 1));

    const leader = ranked[0];
    this.cameraRig.update(this.playerVehicle.x, this.playerVehicle.y, dt);

    this.handleCatchup(vehicles);
    this.handleFuel(dt, leader);
    if (this.outOfFuel) return; // running out of gas ends the run outright — skip finish checks this frame
    this.handlePickups();
    this.handleFinish(vehicles);
  }

  private rubberBandFor(car: AICar): number {
    const leaderProgress = Math.max(...this.entrants.map((e) => e.vehicle.progressDistance));
    const gap = leaderProgress - car.progressDistance;
    if (gap > 260) return 1.18;
    if (gap < -200) return 0.86;
    return 1.0;
  }

  // Repositions AI cars that have fallen off the (player-centered) screen so
  // the pack stays visible and competitive. The player is never teleported —
  // the camera always follows them, so they can never go offscreen this way.
  private handleCatchup(vehicles: Vehicle[]): void {
    const view = this.cameraRig.getWorldView();
    const minX = view.x - CATCHUP_MARGIN;
    const maxX = view.x + view.width + CATCHUP_MARGIN;
    const minY = view.y - CATCHUP_MARGIN;
    const maxY = view.y + view.height + CATCHUP_MARGIN;

    for (const v of vehicles) {
      if (v === this.playerVehicle || v.finished) continue;
      const offscreen = v.x < minX || v.x > maxX || v.y < minY || v.y > maxY;
      if (!offscreen) continue;

      const targetDistance = Math.max(0, this.playerVehicle.progressDistance - CATCHUP_RESPAWN_BEHIND);
      const sample = this.path.sampleAtDistance(targetDistance);
      v.teleportTo(sample.x, sample.y, sample.angle, v.stats.maxSpeed * 0.55);
      const proj = this.path.project(v.x, v.y, v.pathIndex);
      v.pathIndex = proj.index;
      v.progressDistance = proj.distance;
    }
  }

  private handleFuel(dt: number, leader: Vehicle): void {
    if (!this.fuel.empty) {
      const gap = leader.progressDistance - this.playerVehicle.progressDistance;
      const laggingBehind = gap > PLAYER_BEHIND_DISTANCE;
      this.fuel.tick(dt, this.playerVehicle.lastInput.throttle, laggingBehind ? PLAYER_BEHIND_DRAIN_PER_SEC : 0);
      if (laggingBehind) this.emit('catchup');
    }
    if (this.fuel.empty && !this.outOfFuel) {
      this.outOfFuel = true;
      this.raceOver = true;
      this.emit('outOfFuel');
    }
  }

  private handlePickups(): void {
    for (const p of this.fuelPickups) {
      if (p.collected) continue;
      const dx = this.playerVehicle.x - p.x;
      const dy = this.playerVehicle.y - p.y;
      if (dx * dx + dy * dy <= PICKUP_RADIUS * PICKUP_RADIUS) {
        p.collected = true;
        p.sprite.destroy();
        this.fuel.add(FUEL_PICKUP_AMOUNT);
        this.emit('pickup');
      }
    }
  }

  private handleFinish(vehicles: Vehicle[]): void {
    for (const v of vehicles) {
      if (v.finished || v.progressDistance < this.build.finishDistance) continue;
      v.finished = true;
      v.finishTime = this.elapsed;
      this.finishOrder.push(v);
      if (v === this.playerVehicle) {
        this.playerFinished = true;
        this.raceOver = true;
        this.emit('finish');
      }
    }
  }
}
