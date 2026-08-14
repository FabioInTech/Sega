import Phaser from 'phaser';
import { PLAYER_COLORS } from '../config';
import { generateAllSceneryTextures, generateCarTexture, generateFuelPickupTexture, generateGroundTileTexture, generateParticleTextures } from '../systems/TextureFactory';
import { TRACKS } from '../tracks/tracksList';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateCarTexture(this, 'car_player', PLAYER_COLORS.player, 0xffe066);
    generateCarTexture(this, 'car_rival1', PLAYER_COLORS.rival1, 0xdff2ff);
    generateCarTexture(this, 'car_rival2', PLAYER_COLORS.rival2, 0x3a2c00);
    generateCarTexture(this, 'car_rival3', PLAYER_COLORS.rival3, 0x0a2e0f);

    generateParticleTextures(this);
    generateFuelPickupTexture(this);
    generateAllSceneryTextures(this);

    const themes = new Set(TRACKS.map((t) => t.theme));
    for (const theme of themes) generateGroundTileTexture(this, theme);

    this.scene.start('Menu');
  }
}
