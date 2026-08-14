import Phaser from 'phaser';
import { WORLD_EDGE_PAD } from '../config';
import type { TrackBuild } from '../types';

/**
 * Scrolls the playfield to keep the player's car centered. Smoothing is
 * time-based so it feels the same regardless of frame rate.
 */
export class CameraRig {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private smoothedX: number;
  private smoothedY: number;

  constructor(scene: Phaser.Scene, build: TrackBuild, startX: number, startY: number) {
    this.camera = scene.cameras.main;
    const pad = WORLD_EDGE_PAD;
    this.camera.setBounds(
      build.bounds.minX - pad,
      build.bounds.minY - pad,
      build.bounds.maxX - build.bounds.minX + pad * 2,
      build.bounds.maxY - build.bounds.minY + pad * 2
    );
    this.smoothedX = startX;
    this.smoothedY = startY;
    this.camera.centerOn(startX, startY);
  }

  update(targetX: number, targetY: number, dt: number): void {
    const lerp = 1 - Math.pow(0.0006, dt);
    this.smoothedX += (targetX - this.smoothedX) * lerp;
    this.smoothedY += (targetY - this.smoothedY) * lerp;
    this.camera.centerOn(this.smoothedX, this.smoothedY);
  }

  getWorldView(): Phaser.Geom.Rectangle {
    return this.camera.worldView;
  }
}
