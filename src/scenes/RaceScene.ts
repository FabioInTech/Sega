import Phaser from 'phaser';
import { AI_COUNT, VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { AICar } from '../vehicles/AICar';
import { PlayerCar } from '../vehicles/PlayerCar';
import { audio } from '../systems/AudioSystem';
import { computeReward } from '../systems/Economy';
import { InputManager } from '../systems/InputManager';
import { RaceManager, type RaceEntrant } from '../systems/RaceManager';
import { Rng } from '../systems/rng';
import { loadSave, saveGame } from '../systems/SaveData';
import { buildTrack } from '../systems/TrackGenerator';
import { TrackPath } from '../systems/TrackPath';
import { renderTrack } from '../systems/TrackRenderer';
import { AI_BASE_STATS, statsForUpgrades } from '../systems/UpgradeSystem';
import { HUD } from '../ui/HUD';
import { TRACKS } from '../tracks/tracksList';
import type { RaceResult } from '../types';

const AI_TEXTURES = ['car_rival1', 'car_rival2', 'car_rival3'];

export class RaceScene extends Phaser.Scene {
  private trackIndex = 0;
  private raceManager!: RaceManager;
  private hud!: HUD;
  private inputManager!: InputManager;
  private countdown = 3;
  private countdownText!: Phaser.GameObjects.Text;
  private collisionCooldown = 0;
  private endingHandled = false;
  private endDelayTimer = 0;
  private pendingResult: RaceResult | null = null;

  constructor() {
    super('Race');
  }

  init(data: { trackIndex: number }): void {
    this.trackIndex = data.trackIndex ?? 0;
    this.countdown = 3;
    this.endingHandled = false;
    this.pendingResult = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a12');
    this.input.keyboard?.once('keydown', () => audio.unlock());

    const config = TRACKS[this.trackIndex];
    const build = buildTrack(config);
    const path = new TrackPath(build.waypoints);
    const visuals = renderTrack(this, build);

    this.inputManager = new InputManager(this);
    const save = loadSave();
    const playerStats = statsForUpgrades(save.upgrades);

    const start = build.startGrid[0];
    const player = new PlayerCar(this, 'car_player', start.x, start.y, start.angle, playerStats, this.inputManager);

    const entrants: RaceEntrant[] = [{ vehicle: player, isPlayer: true, name: 'YOU' }];
    const rng = new Rng(config.seed + 91);
    for (let i = 0; i < AI_COUNT; i++) {
      const grid = build.startGrid[i + 1];
      const variance = 0.92 + rng.next() * 0.18;
      const stats = {
        maxSpeed: AI_BASE_STATS.maxSpeed * variance,
        acceleration: AI_BASE_STATS.acceleration * variance,
        braking: AI_BASE_STATS.braking,
        grip: AI_BASE_STATS.grip,
        bumper: AI_BASE_STATS.bumper
      };
      const ai = new AICar(this, AI_TEXTURES[i], grid.x, grid.y, grid.angle, stats, path, i + 1);
      entrants.push({ vehicle: ai, isPlayer: false, name: `RIVAL ${i + 1}` });
    }

    this.raceManager = new RaceManager(this, build, path, entrants, player, visuals.hazards, visuals.fuelPickups);
    this.hud = new HUD(this);

    this.raceManager.on('collision', () => {
      if (this.collisionCooldown <= 0) {
        audio.playCollision();
        this.collisionCooldown = 0.15;
      }
    });
    this.raceManager.on('pickup', () => audio.playPickup());
    this.raceManager.on('catchup', () => this.hud.flashCatchup());
    this.raceManager.on('finish', () => this.handleRaceEnd(false));
    this.raceManager.on('outOfFuel', () => this.handleRaceEnd(true));

    this.countdownText = this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, '3', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffd23f'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    audio.startEngine();
  }

  private handleRaceEnd(outOfFuel: boolean): void {
    if (this.endingHandled) return;
    this.endingHandled = true;
    audio.stopEngine();

    if (outOfFuel) {
      audio.playOutOfFuel();
      this.endDelayTimer = 1.6;
      this.pendingResult = null;
      return;
    }

    audio.playFinishFanfare();
    const position = this.raceManager.playerVehicle.rank;
    const total = this.raceManager.entrants.length;
    const fuelRemaining = this.raceManager.fuel.fuel;
    const currency = computeReward(position, fuelRemaining);

    const save = loadSave();
    save.currency += currency;
    save.trackIndex = Math.max(save.trackIndex, Math.min(this.trackIndex + 1, TRACKS.length - 1));
    saveGame(save);

    this.pendingResult = {
      trackId: TRACKS[this.trackIndex].id,
      position,
      totalRacers: total,
      finished: true,
      outOfFuel: false,
      timeSec: this.raceManager.elapsed,
      fuelRemaining,
      currencyEarned: currency
    };
    this.endDelayTimer = 1.4;
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.inputManager.update();
    this.collisionCooldown -= dt;

    if (this.countdown > 0) {
      this.countdown -= dt;
      const shown = Math.max(0, Math.ceil(this.countdown));
      this.countdownText.setText(shown > 0 ? String(shown) : 'GO!');
      if (this.countdown <= 0) {
        this.countdownText.setText('GO!');
        audio.playGo();
        this.time.delayedCall(500, () => this.countdownText.setVisible(false));
      }
      return;
    }

    if (this.endingHandled) {
      this.endDelayTimer -= dt;
      if (this.endDelayTimer <= 0) {
        if (this.pendingResult) {
          this.scene.start('Results', { result: this.pendingResult, trackIndex: this.trackIndex });
        } else {
          this.scene.start('GameOver', { trackIndex: this.trackIndex });
        }
      }
      return;
    }

    this.raceManager.update(dt);
    const player = this.raceManager.playerVehicle;
    audio.updateEngine(Math.abs(player.forwardSpeed) / player.stats.maxSpeed, player.lastInput.throttle);

    this.hud.update(
      {
        fuelRatio: this.raceManager.fuel.ratio,
        speedKph: Math.abs(player.forwardSpeed) * 0.9,
        rank: player.rank,
        totalRacers: this.raceManager.entrants.length,
        progressRatio: player.progressDistance / this.raceManager.build.finishDistance,
        elapsedSec: this.raceManager.elapsed,
        trackName: TRACKS[this.trackIndex].name
      },
      dt
    );
  }
}
