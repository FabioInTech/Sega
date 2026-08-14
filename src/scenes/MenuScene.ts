import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { audio } from '../systems/AudioSystem';
import { InputManager } from '../systems/InputManager';
import { loadSave } from '../systems/SaveData';
import { TRACKS } from '../tracks/tracksList';

export class MenuScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private selected = 0;
  private trackItems: Phaser.GameObjects.Text[] = [];
  private shopItem!: Phaser.GameObjects.Text;
  private navCooldown = 0;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a12');
    this.input.keyboard?.once('keydown', () => audio.unlock());

    this.add
      .text(VIEW_WIDTH / 2, 30, 'RETRO HOT ROD', { fontFamily: 'monospace', fontSize: '24px', color: '#ffd23f' })
      .setOrigin(0.5);
    this.add
      .text(VIEW_WIDTH / 2, 52, 'AN ORIGINAL ARCADE RACER', { fontFamily: 'monospace', fontSize: '9px', color: '#a8e8ff' })
      .setOrigin(0.5);

    const save = loadSave();
    this.add
      .text(VIEW_WIDTH / 2, 70, `CREDITS: $${save.currency}`, { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5);

    const startY = 92;
    this.trackItems = TRACKS.map((track, i) => {
      const unlocked = i <= save.trackIndex;
      const label = `${i + 1}. ${track.name.toUpperCase()}  [${track.theme.toUpperCase()}]${unlocked ? '' : '  LOCKED'}`;
      return this.add
        .text(VIEW_WIDTH / 2, startY + i * 16, label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: unlocked ? '#ffffff' : '#5a5a5a',
          padding: { x: 4, y: 2 }
        })
        .setOrigin(0.5);
    });

    this.shopItem = this.add
      .text(VIEW_WIDTH / 2, startY + TRACKS.length * 16 + 14, '> PARTS SHOP <', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#53c65f',
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5);

    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT - 24, 'UP/DOWN SELECT   SPACE START', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#888888'
      })
      .setOrigin(0.5);
    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT - 12, 'ARROWS/WASD DRIVE   SPACE CONFIRM', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#666666'
      })
      .setOrigin(0.5);

    this.inputManager = new InputManager(this);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wKey = this.input.keyboard!.addKey('W');
    this.sKey = this.input.keyboard!.addKey('S');

    this.selected = Math.min(save.trackIndex, TRACKS.length - 1);
    this.refreshHighlight();
  }

  private get optionCount(): number {
    return TRACKS.length + 1; // + shop entry
  }

  private refreshHighlight(): void {
    this.trackItems.forEach((item, i) => {
      item.setStyle({ backgroundColor: i === this.selected ? '#222233' : '' });
    });
    this.shopItem.setStyle({ backgroundColor: this.selected === TRACKS.length ? '#222233' : '' });
  }

  update(_time: number, deltaMs: number): void {
    this.inputManager.update();
    const dt = deltaMs / 1000;
    this.navCooldown -= dt;

    const up = this.cursors.up.isDown || this.wKey.isDown;
    const down = this.cursors.down.isDown || this.sKey.isDown;

    if (this.navCooldown <= 0) {
      if (down) {
        this.selected = (this.selected + 1) % this.optionCount;
        this.navCooldown = 0.16;
        this.refreshHighlight();
      } else if (up) {
        this.selected = (this.selected - 1 + this.optionCount) % this.optionCount;
        this.navCooldown = 0.16;
        this.refreshHighlight();
      }
    }

    if (this.inputManager.confirmJustPressed) {
      const save = loadSave();
      if (this.selected === TRACKS.length) {
        audio.playSelect();
        this.scene.start('Shop', { trackIndex: Math.min(save.trackIndex, TRACKS.length - 1) });
      } else if (this.selected <= save.trackIndex) {
        audio.playSelect();
        this.scene.start('Race', { trackIndex: this.selected });
      }
    }
  }
}
