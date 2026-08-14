import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { audio } from '../systems/AudioSystem';
import { InputManager } from '../systems/InputManager';
import type { RaceResult } from '../types';

const ORDINAL = ['1ST', '2ND', '3RD', '4TH'];

export class ResultsScene extends Phaser.Scene {
  private result!: RaceResult;
  private trackIndex = 0;
  private inputManager!: InputManager;

  constructor() {
    super('Results');
  }

  init(data: { result: RaceResult; trackIndex: number }): void {
    this.result = data.result;
    this.trackIndex = data.trackIndex;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a12');
    audio.unlock();

    this.add
      .text(VIEW_WIDTH / 2, 40, 'RACE COMPLETE', { fontFamily: 'monospace', fontSize: '20px', color: '#ffd23f' })
      .setOrigin(0.5);

    this.add
      .text(VIEW_WIDTH / 2, 76, ORDINAL[this.result.position - 1] ?? `${this.result.position}TH`, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const lines = [
      `TIME: ${this.result.timeSec.toFixed(1)}s`,
      `FUEL LEFT: ${Math.round(this.result.fuelRemaining)}%`,
      `REWARD: $${this.result.currencyEarned}`
    ];
    lines.forEach((line, i) => {
      this.add
        .text(VIEW_WIDTH / 2, 118 + i * 16, line, { fontFamily: 'monospace', fontSize: '11px', color: '#a8e8ff' })
        .setOrigin(0.5);
    });

    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT - 20, 'PRESS SPACE FOR PARTS SHOP', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#53c65f'
      })
      .setOrigin(0.5);

    this.inputManager = new InputManager(this);
  }

  update(): void {
    this.inputManager.update();
    if (this.inputManager.confirmJustPressed) {
      audio.playSelect();
      this.scene.start('Shop', { trackIndex: this.trackIndex });
    }
  }
}
