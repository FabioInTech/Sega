import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { audio } from '../systems/AudioSystem';
import { InputManager } from '../systems/InputManager';
import { loadSave, saveGame } from '../systems/SaveData';
import { UPGRADE_INFO, UPGRADE_MAX_TIER, upgradeCost } from '../systems/UpgradeSystem';
import { TRACKS } from '../tracks/tracksList';
import type { SaveState } from '../types';

export class ShopScene extends Phaser.Scene {
  private trackIndex = 0;
  private inputManager!: InputManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private navCooldown = 0;
  private selected = 0;
  private save!: SaveState;
  private currencyText!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private actionRows: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Shop');
  }

  init(data: { trackIndex: number }): void {
    this.trackIndex = data.trackIndex ?? 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a12');
    audio.unlock();
    this.save = loadSave();

    this.add
      .text(VIEW_WIDTH / 2, 26, 'PARTS SHOP', { fontFamily: 'monospace', fontSize: '20px', color: '#ffd23f' })
      .setOrigin(0.5);
    this.currencyText = this.add
      .text(VIEW_WIDTH / 2, 48, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5);

    const startY = 74;
    this.rows = UPGRADE_INFO.map((info, i) =>
      this.add
        .text(VIEW_WIDTH / 2, startY + i * 20, '', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ffffff',
          align: 'center',
          padding: { x: 4, y: 2 }
        })
        .setOrigin(0.5)
    );

    const nextIndex = this.trackIndex + 1;
    const nextLabel = nextIndex < TRACKS.length ? `NEXT RACE: ${TRACKS[nextIndex].name.toUpperCase()}` : 'BACK TO MENU';
    this.actionRows = [
      this.add
        .text(VIEW_WIDTH / 2, startY + UPGRADE_INFO.length * 20 + 18, nextLabel, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#53c65f',
          padding: { x: 4, y: 2 }
        })
        .setOrigin(0.5),
      this.add
        .text(VIEW_WIDTH / 2, startY + UPGRADE_INFO.length * 20 + 38, 'MAIN MENU', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#888888',
          padding: { x: 4, y: 2 }
        })
        .setOrigin(0.5)
    ];

    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT - 12, 'UP/DOWN SELECT   SPACE BUY/CONFIRM', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#666666'
      })
      .setOrigin(0.5);

    this.inputManager = new InputManager(this);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wKey = this.input.keyboard!.addKey('W');
    this.sKey = this.input.keyboard!.addKey('S');

    this.refresh();
  }

  private get optionCount(): number {
    return UPGRADE_INFO.length + this.actionRows.length;
  }

  private refresh(): void {
    this.currencyText.setText(`CREDITS: $${this.save.currency}`);
    UPGRADE_INFO.forEach((info, i) => {
      const tier = this.save.upgrades[info.key];
      const pips = '#'.repeat(tier) + '-'.repeat(UPGRADE_MAX_TIER - tier);
      const maxed = tier >= UPGRADE_MAX_TIER;
      const cost = maxed ? 0 : upgradeCost(info.baseCost, info.costScale, tier);
      const costLabel = maxed ? 'MAX' : `$${cost}`;
      this.rows[i].setText(`${info.label.padEnd(10)} [${pips}]  ${costLabel}`);
      this.rows[i].setStyle({ backgroundColor: i === this.selected ? '#222233' : '' });
      this.rows[i].setColor(maxed ? '#5a5a5a' : '#ffffff');
    });
    this.actionRows.forEach((row, i) => {
      const idx = UPGRADE_INFO.length + i;
      row.setStyle({ backgroundColor: idx === this.selected ? '#222233' : '' });
    });
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
        this.refresh();
      } else if (up) {
        this.selected = (this.selected - 1 + this.optionCount) % this.optionCount;
        this.navCooldown = 0.16;
        this.refresh();
      }
    }

    if (this.inputManager.confirmJustPressed) {
      this.handleConfirm();
    }
  }

  private handleConfirm(): void {
    if (this.selected < UPGRADE_INFO.length) {
      const info = UPGRADE_INFO[this.selected];
      const tier = this.save.upgrades[info.key];
      if (tier >= UPGRADE_MAX_TIER) return;
      const cost = upgradeCost(info.baseCost, info.costScale, tier);
      if (this.save.currency < cost) {
        audio.playCollision();
        return;
      }
      this.save.currency -= cost;
      this.save.upgrades[info.key] = tier + 1;
      saveGame(this.save);
      audio.playPickup();
      this.refresh();
      return;
    }

    const actionIndex = this.selected - UPGRADE_INFO.length;
    audio.playSelect();
    if (actionIndex === 0) {
      const nextIndex = this.trackIndex + 1;
      if (nextIndex < TRACKS.length) {
        this.scene.start('Race', { trackIndex: nextIndex });
      } else {
        this.scene.start('Menu');
      }
    } else {
      this.scene.start('Menu');
    }
  }
}
