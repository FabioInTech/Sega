export type Theme = 'city' | 'highway' | 'countryside' | 'desert' | 'snow';

export interface Waypoint {
  x: number;
  y: number;
  angle: number; // radians, direction of travel at this point
  width: number; // road width at this point (world px)
  cumDist: number; // arc-length distance from track start
}

export interface FuelPickupDef {
  distance: number;
  offset: number;
}

export interface HazardDef {
  distance: number;
  offset: number;
  type: string;
}

export interface SceneryDef {
  distance: number;
  offset: number;
  type: string;
}

export interface ForkZone {
  startDistance: number;
  endDistance: number;
}

export interface TrackConfig {
  id: string;
  name: string;
  theme: Theme;
  seed: number;
  length: number; // approximate total arc-length
  curviness: number; // 0..1, higher = tighter/more frequent turns
  roadWidth: number; // base width
  hazardDensity: number; // 0..1
  sceneryDensity: number; // 0..1
  forkCount: number;
  finishFraction: number; // 0..1 fraction of length where the finish line sits
}

export interface TrackBuild {
  config: TrackConfig;
  waypoints: Waypoint[];
  totalLength: number;
  finishDistance: number;
  fuelPickups: FuelPickupDef[];
  hazards: HazardDef[];
  scenery: SceneryDef[];
  forks: ForkZone[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  startGrid: { x: number; y: number; angle: number }[];
}

export interface VehicleStats {
  maxSpeed: number; // world px/sec
  acceleration: number; // px/sec^2
  braking: number; // px/sec^2
  grip: number; // 0..1, how quickly velocity aligns with heading
  bumper: number; // 0..1, collision resistance (higher = less speed lost/pushed)
}

export interface UpgradeLevels {
  engine: number; // acceleration
  topSpeed: number;
  grip: number;
  bumper: number;
}

export interface SaveState {
  currency: number;
  upgrades: UpgradeLevels;
  trackIndex: number;
  bestResults: Record<string, number>; // trackId -> best finish position
}

export interface RaceResult {
  trackId: string;
  position: number;
  totalRacers: number;
  finished: boolean;
  outOfFuel: boolean;
  timeSec: number;
  fuelRemaining: number;
  currencyEarned: number;
}
