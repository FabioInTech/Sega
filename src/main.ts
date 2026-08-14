import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { MenuScene } from './scenes/MenuScene';
import { RaceScene } from './scenes/RaceScene';
import { ResultsScene } from './scenes/ResultsScene';
import { ShopScene } from './scenes/ShopScene';
import { initTouchControls } from './systems/TouchControls';

initTouchControls();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0a0a12',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT
  },
  input: {
    gamepad: true
  },
  scene: [BootScene, MenuScene, RaceScene, ResultsScene, ShopScene, GameOverScene]
});
