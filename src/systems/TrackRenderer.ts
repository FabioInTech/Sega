import Phaser from 'phaser';
import { WORLD_EDGE_PAD } from '../config';
import type { TrackBuild } from '../types';
import { generateAllSceneryTextures, generateFuelPickupTexture, generateGroundTileTexture, sceneryTextureSize, themeRoadColor } from './TextureFactory';

const EDGE_COLORS: Record<string, [number, number]> = {
  city: [0xf2f2f2, 0xd6432f],
  highway: [0xf2f2f2, 0xf2c31c],
  countryside: [0xf2e6b8, 0xf2e6b8],
  desert: [0xf2e6b8, 0xf2e6b8],
  snow: [0x445566, 0x445566]
};

export interface HazardInstance {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  radius: number;
}

export interface FuelPickupInstance {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  collected: boolean;
}

export interface TrackVisual {
  hazards: HazardInstance[];
  fuelPickups: FuelPickupInstance[];
}

export function renderTrack(scene: Phaser.Scene, build: TrackBuild): TrackVisual {
  const theme = build.config.theme;
  generateGroundTileTexture(scene, theme);
  generateAllSceneryTextures(scene);
  generateFuelPickupTexture(scene);

  const { minX, minY, maxX, maxY } = build.bounds;
  const padding = WORLD_EDGE_PAD;
  const groundW = maxX - minX + padding * 2;
  const groundH = maxY - minY + padding * 2;
  const ground = scene.add.tileSprite(minX - padding, minY - padding, groundW, groundH, `ground_${theme}`);
  ground.setOrigin(0, 0);
  ground.setDepth(0);

  const roadColor = themeRoadColor(theme);
  const [edgeColor, edgeColor2] = EDGE_COLORS[theme] ?? [0xffffff, 0xffffff];
  const g = scene.add.graphics();
  g.setDepth(1);

  const wps = build.waypoints;
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i];
    const b = wps[i + 1];
    const quad = segmentQuad(a, b);
    g.fillStyle(roadColor, 1);
    g.fillPoints(quad, true);
  }

  // edge rumble strips
  g.lineStyle(3, edgeColor, 0.9);
  strokeEdge(g, wps, 1);
  g.lineStyle(3, edgeColor2, 0.9);
  strokeEdge(g, wps, -1);

  // dashed centerline (skip through fork zones, drawn separately)
  g.fillStyle(0xffffff, 0.85);
  for (let i = 0; i < wps.length - 1; i += 2) {
    const wp = wps[i];
    if (inForkZone(build, wp.cumDist)) continue;
    const dx = Math.cos(wp.angle) * 8;
    const dy = Math.sin(wp.angle) * 8;
    g.fillRect(wp.x - 1.5, wp.y - 1.5, 3, 3);
    void dx;
    void dy;
  }

  // fork median markers
  g.fillStyle(0xf2c31c, 0.9);
  for (const fork of build.forks) {
    for (let d = fork.startDistance; d < fork.endDistance; d += 26) {
      const s = sampleForDraw(build, d);
      g.fillRect(s.x - 1.5, s.y - 3, 3, 6);
    }
  }

  // start/finish lines
  drawFlagLine(g, build, 20, 0x111111, 0xffffff);
  drawFlagLine(g, build, build.finishDistance, 0x111111, 0xf2c31c);

  const hazards: HazardInstance[] = [];
  for (const h of build.hazards) {
    const s = sampleForDraw(build, h.distance);
    const rx = -Math.sin(s.angle);
    const ry = Math.cos(s.angle);
    const x = s.x + rx * h.offset;
    const y = s.y + ry * h.offset;
    const sprite = scene.add.sprite(x, y, `scenery_${h.type}`);
    sprite.setDepth(5);
    const size = sceneryTextureSize(h.type);
    hazards.push({ sprite, x, y, radius: Math.max(size.w, size.h) * 0.32 });
  }

  const sceneryDepth = 4;
  for (const s of build.scenery) {
    const sample = sampleForDraw(build, s.distance);
    const rx = -Math.sin(sample.angle);
    const ry = Math.cos(sample.angle);
    const x = sample.x + rx * s.offset;
    const y = sample.y + ry * s.offset;
    const sprite = scene.add.sprite(x, y, `scenery_${s.type}`);
    sprite.setDepth(sceneryDepth);
  }

  const fuelPickups: FuelPickupInstance[] = [];
  for (const f of build.fuelPickups) {
    const sample = sampleForDraw(build, f.distance);
    const rx = -Math.sin(sample.angle);
    const ry = Math.cos(sample.angle);
    const x = sample.x + rx * f.offset;
    const y = sample.y + ry * f.offset;
    const sprite = scene.add.sprite(x, y, 'fuelPickup');
    sprite.setDepth(6);
    scene.tweens.add({ targets: sprite, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
    fuelPickups.push({ sprite, x, y, collected: false });
  }

  return { hazards, fuelPickups };
}

function inForkZone(build: TrackBuild, distance: number): boolean {
  return build.forks.some((f) => distance >= f.startDistance && distance <= f.endDistance);
}

function sampleForDraw(build: TrackBuild, distance: number): { x: number; y: number; angle: number; width: number } {
  const d = Phaser.Math.Clamp(distance, 0, build.totalLength);
  const idx = Phaser.Math.Clamp(Math.round(d / 24), 0, build.waypoints.length - 1);
  return build.waypoints[idx];
}

function segmentQuad(a: { x: number; y: number; angle: number; width: number }, b: { x: number; y: number; angle: number; width: number }): Phaser.Geom.Point[] {
  const arx = -Math.sin(a.angle);
  const ary = Math.cos(a.angle);
  const brx = -Math.sin(b.angle);
  const bry = Math.cos(b.angle);
  const aw = a.width / 2;
  const bw = b.width / 2;
  return [
    new Phaser.Geom.Point(a.x - arx * aw, a.y - ary * aw),
    new Phaser.Geom.Point(b.x - brx * bw, b.y - bry * bw),
    new Phaser.Geom.Point(b.x + brx * bw, b.y + bry * bw),
    new Phaser.Geom.Point(a.x + arx * aw, a.y + ary * aw)
  ];
}

function strokeEdge(g: Phaser.GameObjects.Graphics, wps: TrackBuild['waypoints'], side: 1 | -1): void {
  g.beginPath();
  for (let i = 0; i < wps.length; i++) {
    const wp = wps[i];
    const rx = -Math.sin(wp.angle);
    const ry = Math.cos(wp.angle);
    const x = wp.x + rx * (wp.width / 2) * side;
    const y = wp.y + ry * (wp.width / 2) * side;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokePath();
}

function drawFlagLine(g: Phaser.GameObjects.Graphics, build: TrackBuild, distance: number, colorA: number, colorB: number): void {
  const s = sampleForDraw(build, distance);
  const rx = -Math.sin(s.angle);
  const ry = Math.cos(s.angle);
  const half = s.width / 2;
  const squares = 8;
  for (let i = 0; i < squares; i++) {
    const t0 = -half + (i / squares) * s.width;
    const t1 = -half + ((i + 1) / squares) * s.width;
    const color = i % 2 === 0 ? colorA : colorB;
    g.fillStyle(color, 1);
    const p1x = s.x + rx * t0 - Math.cos(s.angle) * 4;
    const p1y = s.y + ry * t0 - Math.sin(s.angle) * 4;
    const p2x = s.x + rx * t1 - Math.cos(s.angle) * 4;
    const p2y = s.y + ry * t1 - Math.sin(s.angle) * 4;
    const p3x = s.x + rx * t1 + Math.cos(s.angle) * 4;
    const p3y = s.y + ry * t1 + Math.sin(s.angle) * 4;
    const p4x = s.x + rx * t0 + Math.cos(s.angle) * 4;
    const p4y = s.y + ry * t0 + Math.sin(s.angle) * 4;
    g.fillPoints(
      [new Phaser.Geom.Point(p1x, p1y), new Phaser.Geom.Point(p2x, p2y), new Phaser.Geom.Point(p3x, p3y), new Phaser.Geom.Point(p4x, p4y)],
      true
    );
  }
}
