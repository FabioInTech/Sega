import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config';

export interface HudState {
  fuelRatio: number;
  speedKph: number;
  rank: number;
  totalRacers: number;
  progressRatio: number;
  elapsedSec: number;
  trackName: string;
}

const FUEL_BAR_W = 96;
const FUEL_BAR_H = 10;

export class HUD {
  private scene: Phaser.Scene;
  private fuelBarBg: Phaser.GameObjects.Rectangle;
  private fuelBarFill: Phaser.GameObjects.Rectangle;
  private fuelLabel: Phaser.GameObjects.Text;
  private speedLabel: Phaser.GameObjects.Text;
  private rankLabel: Phaser.GameObjects.Text;
  private timeLabel: Phaser.GameObjects.Text;
  private trackLabel: Phaser.GameObjects.Text;
  private progressBarBg: Phaser.GameObjects.Rectangle;
  private progressBarFill: Phaser.GameObjects.Rectangle;
  private catchupText: Phaser.GameObjects.Text;
  private catchupTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const depth = 100;

    this.trackLabel = scene.add
      .text(VIEW_WIDTH / 2, 6, '', { fontFamily: 'monospace', fontSize: '10px', color: '#f2f2f2' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    this.fuelLabel = scene.add
      .text(6, 6, 'FUEL', { fontFamily: 'monospace', fontSize: '9px', color: '#ffd23f' })
      .setScrollFactor(0)
      .setDepth(depth);
    this.fuelBarBg = scene.add
      .rectangle(6, 17, FUEL_BAR_W, FUEL_BAR_H, 0x1a1a1a)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.6)
      .setScrollFactor(0)
      .setDepth(depth);
    this.fuelBarFill = scene.add
      .rectangle(7, 18, FUEL_BAR_W - 2, FUEL_BAR_H - 2, 0xffd23f)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    this.speedLabel = scene.add
      .text(VIEW_WIDTH - 6, 6, '0 KPH', { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    this.rankLabel = scene.add
      .text(VIEW_WIDTH - 6, 20, 'POS 1/4', { fontFamily: 'monospace', fontSize: '9px', color: '#a8e8ff' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    this.timeLabel = scene.add
      .text(6, VIEW_HEIGHT - 16, '0:00', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(depth);

    this.progressBarBg = scene.add
      .rectangle(6, VIEW_HEIGHT - 30, VIEW_WIDTH - 12, 6, 0x1a1a1a)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);
    this.progressBarFill = scene.add
      .rectangle(7, VIEW_HEIGHT - 29, 1, 4, 0x53c65f)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    this.catchupText = scene.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40, 'CATCHING UP!\n-FUEL', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff5a3c',
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setAlpha(0);
  }

  flashCatchup(): void {
    this.catchupTimer = 1.1;
  }

  update(state: HudState, dt: number): void {
    this.trackLabel.setText(state.trackName.toUpperCase());
    this.fuelBarFill.width = Math.max(0, (FUEL_BAR_W - 2) * state.fuelRatio);
    this.fuelBarFill.fillColor = state.fuelRatio < 0.25 ? 0xe8483a : 0xffd23f;
    this.speedLabel.setText(`${Math.round(state.speedKph)} KPH`);
    this.rankLabel.setText(`POS ${state.rank}/${state.totalRacers}`);
    const m = Math.floor(state.elapsedSec / 60);
    const s = Math.floor(state.elapsedSec % 60)
      .toString()
      .padStart(2, '0');
    this.timeLabel.setText(`${m}:${s}`);
    this.progressBarFill.width = Math.max(1, (VIEW_WIDTH - 14) * Phaser.Math.Clamp(state.progressRatio, 0, 1));

    if (this.catchupTimer > 0) {
      this.catchupTimer -= dt;
      this.catchupText.setAlpha(Math.min(1, this.catchupTimer * 2));
    } else {
      this.catchupText.setAlpha(0);
    }
  }

  destroy(): void {
    this.fuelBarBg.destroy();
    this.fuelBarFill.destroy();
    this.fuelLabel.destroy();
    this.speedLabel.destroy();
    this.rankLabel.destroy();
    this.timeLabel.destroy();
    this.trackLabel.destroy();
    this.progressBarBg.destroy();
    this.progressBarFill.destroy();
    this.catchupText.destroy();
  }
}
