import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { audio } from '../systems/AudioSystem';
import { InputManager } from '../systems/InputManager';

export class GameOverScene extends Phaser.Scene {
  private trackIndex = 0;
  private inputManager!: InputManager;

  constructor() {
    super('GameOver');
  }

  init(data: { trackIndex: number }): void {
    this.trackIndex = data.trackIndex ?? 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a0a0a');
    audio.unlock();

    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40, 'OUT OF FUEL', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#e8483a'
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 12, 'YOUR CAR SPUTTERED TO A STOP', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#cccccc'
      })
      .setOrigin(0.5);

    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 24, 'SPACE: RETRY RACE', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffd23f'
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 42, 'PRESS M FOR MENU', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888'
      })
      .setOrigin(0.5);

    this.inputManager = new InputManager(this);
    this.input.keyboard?.once('keydown-M', () => {
      audio.playSelect();
      this.scene.start('Menu');
    });
  }

  update(): void {
    this.inputManager.update();
    if (this.inputManager.confirmJustPressed) {
      audio.playSelect();
      this.scene.start('Race', { trackIndex: this.trackIndex });
    }
  }
}
