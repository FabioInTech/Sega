import { TRACK_STEP } from '../config';
import { Rng } from './rng';
import { TrackPath } from './TrackPath';
import type { ForkZone, FuelPickupDef, HazardDef, SceneryDef, TrackBuild, TrackConfig, Waypoint } from '../types';

const HAZARDS_BY_THEME: Record<string, string[]> = {
  city: ['trafficCone', 'oilDrum', 'barrier'],
  highway: ['barrier', 'oilDrum', 'roadwork'],
  countryside: ['hayBale', 'tractor', 'fencePost'],
  desert: ['rock', 'cactusHazard', 'oilDrum'],
  snow: ['icePatch', 'snowbank', 'pineFallen']
};

const SCENERY_BY_THEME: Record<string, string[]> = {
  city: ['building', 'streetlamp', 'sign'],
  highway: ['billboard', 'streetlamp', 'bush'],
  countryside: ['tree', 'silo', 'fence'],
  desert: ['cactus', 'rock', 'deadTree'],
  snow: ['pine', 'snowman', 'rock']
};

export function buildTrack(config: TrackConfig): TrackBuild {
  const rng = new Rng(config.seed);
  const waypoints = generateWaypoints(config, rng);
  const totalLength = waypoints[waypoints.length - 1].cumDist;
  const path = new TrackPath(waypoints);

  const fuelPickups = generateFuelPickups(config, rng, totalLength);
  const hazards = generateHazards(config, rng, totalLength);
  const scenery = generateScenery(config, rng, totalLength);
  const forks = generateForks(config, rng, totalLength);

  // widen the road through fork zones so the fork reads as a real branch
  for (const wp of waypoints) {
    for (const f of forks) {
      if (wp.cumDist >= f.startDistance && wp.cumDist <= f.endDistance) {
        wp.width *= 1.7;
      }
    }
  }

  const bounds = computeBounds(waypoints);
  const startGrid = generateStartGrid(path);

  return {
    config,
    waypoints,
    totalLength,
    finishDistance: totalLength * config.finishFraction,
    fuelPickups,
    hazards,
    scenery,
    forks,
    bounds,
    startGrid
  };
}

function generateWaypoints(config: TrackConfig, rng: Rng): Waypoint[] {
  const steps = Math.ceil(config.length / TRACK_STEP);
  const waypoints: Waypoint[] = [];

  let x = 0;
  let y = 0;
  let angle = -Math.PI / 2; // travel "up" the world initially
  let curvature = 0; // radians per step, smoothed
  let straightRemaining = rng.range(6, 14);
  let targetCurvature = 0;

  const maxCurvature = 0.05 + config.curviness * 0.09;
  const maxHeadingDeviation = Math.PI * 0.42; // keep the road from doubling back on itself

  let cumDist = 0;

  for (let i = 0; i <= steps; i++) {
    const width = config.roadWidth * (0.85 + 0.15 * Math.sin(i * 0.13 + config.seed));
    waypoints.push({ x, y, angle, width, cumDist });

    straightRemaining--;
    if (straightRemaining <= 0) {
      // pick a new curve target: either straighten out or bank into a turn
      if (rng.chance(0.35)) {
        targetCurvature = 0;
      } else {
        const sign = rng.chance(0.5) ? 1 : -1;
        targetCurvature = sign * rng.range(maxCurvature * 0.35, maxCurvature);
      }
      straightRemaining = rng.range(5, 16);
    }

    // smooth curvature toward target (avoids jerky turns)
    curvature += (targetCurvature - curvature) * 0.18;

    // gently pull heading back toward vertical if it's straying too far
    const deviation = normalizeAngle(angle + Math.PI / 2);
    if (Math.abs(deviation) > maxHeadingDeviation) {
      curvature -= Math.sign(deviation) * 0.01;
    }

    angle += curvature;
    x += Math.cos(angle) * TRACK_STEP;
    y += Math.sin(angle) * TRACK_STEP;
    cumDist += TRACK_STEP;
  }

  return waypoints;
}

function normalizeAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function generateFuelPickups(config: TrackConfig, rng: Rng, totalLength: number): FuelPickupDef[] {
  const pickups: FuelPickupDef[] = [];
  const spacing = 480;
  for (let d = spacing * 0.6; d < totalLength - 200; d += spacing) {
    const jitter = rng.range(-90, 90);
    const offset = rng.range(-1, 1) * (config.roadWidth * 0.28);
    pickups.push({ distance: d + jitter, offset });
  }
  return pickups;
}

function generateHazards(config: TrackConfig, rng: Rng, totalLength: number): HazardDef[] {
  const hazards: HazardDef[] = [];
  const types = HAZARDS_BY_THEME[config.theme];
  const spacing = 260 / Math.max(0.2, config.hazardDensity);
  for (let d = 350; d < totalLength - 250; d += spacing) {
    if (!rng.chance(0.55)) continue;
    const offset = rng.range(-1, 1) * (config.roadWidth * 0.32);
    hazards.push({ distance: d + rng.range(-40, 40), offset, type: rng.pick(types) });
  }
  return hazards;
}

function generateScenery(config: TrackConfig, rng: Rng, totalLength: number): SceneryDef[] {
  const scenery: SceneryDef[] = [];
  const types = SCENERY_BY_THEME[config.theme];
  const spacing = 90 / Math.max(0.2, config.sceneryDensity);
  for (let d = 40; d < totalLength - 40; d += spacing) {
    const side = rng.chance(0.5) ? -1 : 1;
    const offset = side * (config.roadWidth * 0.5 + rng.range(20, 90));
    scenery.push({ distance: d + rng.range(-20, 20), offset, type: rng.pick(types) });
  }
  return scenery;
}

function generateForks(config: TrackConfig, rng: Rng, totalLength: number): ForkZone[] {
  const forks: ForkZone[] = [];
  for (let i = 0; i < config.forkCount; i++) {
    const start = rng.range(totalLength * 0.2, totalLength * 0.85);
    forks.push({ startDistance: start, endDistance: start + rng.range(220, 340) });
  }
  return forks;
}

function computeBounds(waypoints: Waypoint[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const wp of waypoints) {
    const pad = wp.width;
    minX = Math.min(minX, wp.x - pad);
    minY = Math.min(minY, wp.y - pad);
    maxX = Math.max(maxX, wp.x + pad);
    maxY = Math.max(maxY, wp.y + pad);
  }
  return { minX, minY, maxX, maxY };
}

function generateStartGrid(path: TrackPath): { x: number; y: number; angle: number }[] {
  const sample = path.sampleAtDistance(20);
  const fx = Math.cos(sample.angle);
  const fy = Math.sin(sample.angle);
  const rx = -fy;
  const ry = fx;
  const lanes = [-0.32, -0.11, 0.11, 0.32];
  return lanes.map((l, i) => ({
    x: sample.x + rx * sample.width * l,
    y: sample.y + ry * sample.width * l - i * 4,
    angle: sample.angle
  }));
}
