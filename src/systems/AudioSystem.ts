/**
 * All sound in this game is generated procedurally with the Web Audio API —
 * no external audio files. Keeps the project asset-free and trivially
 * "original" (no risk of reusing anyone else's recordings).
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  muted = false;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  }

  /** Must be called from a user gesture (keydown/click) to satisfy autoplay policies. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private tone(freq: number, duration: number, type: OscillatorType, gainValue: number, glideTo?: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private noiseBurst(duration: number, gainValue: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  playCollision(): void {
    this.noiseBurst(0.18, 0.5);
    this.tone(90, 0.12, 'square', 0.25, 60);
  }

  playPickup(): void {
    this.tone(660, 0.08, 'square', 0.2, 990);
    setTimeout(() => this.tone(990, 0.1, 'square', 0.18), 70);
  }

  playCountdownBeep(): void {
    this.tone(440, 0.12, 'square', 0.22);
  }

  playGo(): void {
    this.tone(880, 0.22, 'square', 0.25, 1320);
  }

  playSelect(): void {
    this.tone(520, 0.05, 'square', 0.15);
  }

  playFinishFanfare(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.22), i * 110));
  }

  playOutOfFuel(): void {
    this.tone(220, 0.5, 'sawtooth', 0.25, 60);
  }

  startEngine(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.engineOsc) return;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0001;
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();
  }

  updateEngine(speedRatio: number, throttle: number): void {
    if (!this.engineOsc || !this.engineGain || !this.ctx) return;
    const freq = 70 + speedRatio * 180 + throttle * 30;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    const targetGain = this.muted ? 0.0001 : 0.05 + speedRatio * 0.05;
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
  }

  stopEngine(): void {
    if (this.engineOsc) {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}

export const audio = new AudioSystem();
