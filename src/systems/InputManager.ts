import Phaser from 'phaser';
import type { DriveInput } from '../vehicles/Vehicle';

/**
 * Unifies keyboard (arrows / WASD) and gamepad (left stick + triggers/face
 * buttons) into a single arcade-style input reading: steer -1..1, throttle
 * 0..1, brake 0..1, plus an edge-triggered "confirm" for menus.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; space: Phaser.Input.Keyboard.Key };
  private prevConfirm = false;
  confirmJustPressed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = {
      w: kb.addKey('W'),
      a: kb.addKey('A'),
      s: kb.addKey('S'),
      d: kb.addKey('D'),
      space: kb.addKey('SPACE')
    };
    scene.input.gamepad?.once('connected', () => {
      /* no-op: presence is polled each frame via this.scene.input.gamepad.pad1 */
    });
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | undefined {
    return this.scene.input.gamepad?.pad1 ?? undefined;
  }

  read(): DriveInput {
    let steer = 0;
    let throttle = 0;
    let brake = 0;

    if (this.cursors.left.isDown || this.keys.a.isDown) steer -= 1;
    if (this.cursors.right.isDown || this.keys.d.isDown) steer += 1;
    if (this.cursors.up.isDown || this.keys.w.isDown) throttle = 1;
    if (this.cursors.down.isDown || this.keys.s.isDown) brake = 1;

    const pad = this.pad();
    if (pad) {
      const stickX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      if (Math.abs(stickX) > 0.15) steer = Phaser.Math.Clamp(steer + stickX, -1, 1);
      const rt = pad.buttons[7]?.value ?? 0; // right trigger
      const lt = pad.buttons[6]?.value ?? 0; // left trigger
      const aButton = pad.buttons[0]?.pressed ?? false;
      const bButton = pad.buttons[1]?.pressed ?? false;
      if (rt > 0.1 || aButton) throttle = Math.max(throttle, rt > 0.1 ? rt : 1);
      if (lt > 0.1 || bButton) brake = Math.max(brake, lt > 0.1 ? lt : 1);
    }

    return { steer: Phaser.Math.Clamp(steer, -1, 1), throttle: Phaser.Math.Clamp(throttle, 0, 1), brake: Phaser.Math.Clamp(brake, 0, 1) };
  }

  update(): void {
    const padConfirm = this.pad()?.buttons[0]?.pressed ?? false;
    const confirm = this.keys.space.isDown || padConfirm;
    this.confirmJustPressed = confirm && !this.prevConfirm;
    this.prevConfirm = confirm;
  }
}
