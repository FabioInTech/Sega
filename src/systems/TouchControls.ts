/**
 * Lightweight on-screen touch controls so the game is playable on phones/
 * tablets, where there's no physical keyboard. Implemented as plain DOM
 * buttons layered over the canvas (not Phaser game objects) so they work
 * the same regardless of which scene is active, and use Pointer Events so
 * mouse, touch, and pen all behave the same way.
 */
export interface TouchInputState {
  left: boolean;
  right: boolean;
  throttle: boolean;
  brake: boolean;
  confirm: boolean;
}

export const touchInput: TouchInputState = {
  left: false,
  right: false,
  throttle: false,
  brake: false,
  confirm: false
};

let initialized = false;

function isTouchCapable(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function initTouchControls(): void {
  if (initialized) return;
  initialized = true;
  if (!isTouchCapable()) return;

  const style = document.createElement('style');
  style.textContent = `
    .rhr-touch-btn {
      position: fixed;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      color: #fff;
      background: rgba(255,255,255,0.14);
      border: 2px solid rgba(255,255,255,0.35);
      border-radius: 50%;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      z-index: 1000;
    }
    .rhr-touch-btn.active { background: rgba(255,255,255,0.34); }
    .rhr-steer { width: 15vmin; height: 15vmin; font-size: 6vmin; bottom: 4vmin; }
    .rhr-left { left: 3vmin; }
    .rhr-right { left: 20vmin; }
    .rhr-pedal { width: 16vmin; height: 16vmin; font-size: 4.2vmin; bottom: 4vmin; }
    .rhr-brake { right: 3vmin; }
    .rhr-gas { right: 21vmin; background: rgba(120,255,140,0.22); }
    .rhr-confirm {
      left: 50%;
      transform: translateX(-50%);
      bottom: 4vmin;
      width: 22vmin;
      height: 9vmin;
      border-radius: 8px;
      font-size: 3.6vmin;
      background: rgba(255,210,63,0.28);
    }
    .rhr-rotate-hint {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2000;
      background: rgba(10,10,18,0.85);
      color: #ffd23f;
      font-family: 'Courier New', monospace;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 6px 12px;
      font-size: 3vmin;
      pointer-events: none;
    }
    @media (orientation: portrait) {
      .rhr-rotate-hint { display: flex; }
    }
  `;
  document.head.appendChild(style);

  const hint = document.createElement('div');
  hint.className = 'rhr-rotate-hint';
  hint.textContent = 'ROTATE YOUR DEVICE TO LANDSCAPE FOR THE FULL SCREEN';
  document.body.appendChild(hint);

  const makeButton = (className: string, label: string, onDown: () => void, onUp: () => void): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = `rhr-touch-btn ${className}`;
    el.textContent = label;
    const down = (e: Event) => {
      e.preventDefault();
      el.classList.add('active');
      onDown();
    };
    const up = (e: Event) => {
      e.preventDefault();
      el.classList.remove('active');
      onUp();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    document.body.appendChild(el);
    return el;
  };

  makeButton(
    'rhr-steer rhr-left',
    '◀',
    () => (touchInput.left = true),
    () => (touchInput.left = false)
  );
  makeButton(
    'rhr-steer rhr-right',
    '▶',
    () => (touchInput.right = true),
    () => (touchInput.right = false)
  );
  makeButton(
    'rhr-pedal rhr-brake',
    'BRK',
    () => (touchInput.brake = true),
    () => (touchInput.brake = false)
  );
  makeButton(
    'rhr-pedal rhr-gas',
    'GAS',
    () => (touchInput.throttle = true),
    () => (touchInput.throttle = false)
  );
  makeButton(
    'rhr-confirm',
    'SPACE',
    () => (touchInput.confirm = true),
    () => (touchInput.confirm = false)
  );
}
