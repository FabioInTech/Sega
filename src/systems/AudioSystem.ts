/**
 * All sound in this game is generated procedurally with the Web Audio API —
 * no external audio files. Keeps the project asset-free and trivially
 * "original" (no risk of reusing anyone else's recordings).
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineNoise: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private engineSubGain: GainNode | null = null;
  private engineNoiseGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  muted = false;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    this.masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);
    return this.ctx;
  }

  private makeLoopedNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
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
    // Softens the raw harmonic edge off square/sawtooth waves so short SFX
    // read as a musical blip rather than a harsh buzz.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.max(freq * 4, 1200);
    osc.connect(filter);
    filter.connect(gain);
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

  /**
   * The engine is three layered sources rather than one bare oscillator:
   * a sawtooth fundamental through a lowpass filter that opens up with RPM
   * (the classic synthesized-engine trick — brighter/rougher at high revs),
   * a sub-oscillator an octave down for body/weight, and a touch of filtered
   * noise for mechanical grit. Layering + the filter sweep is what keeps it
   * from sounding like a flat 8-bit beep.
   */
  startEngine(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.engineOsc) return;

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 400;
    this.engineFilter.Q.value = 1.2;

    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0001;
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.engineFilter);
    this.engineOsc.start();

    this.engineSubOsc = ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubGain = ctx.createGain();
    this.engineSubGain.gain.value = 0.0001;
    this.engineSubOsc.connect(this.engineSubGain);
    this.engineSubGain.connect(this.engineFilter);
    this.engineSubOsc.start();

    this.engineNoise = ctx.createBufferSource();
    this.engineNoise.buffer = this.makeLoopedNoiseBuffer(ctx);
    this.engineNoise.loop = true;
    this.engineNoiseGain = ctx.createGain();
    this.engineNoiseGain.gain.value = 0.0001;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 900;
    noiseFilter.Q.value = 0.6;
    this.engineNoise.connect(noiseFilter);
    noiseFilter.connect(this.engineNoiseGain);
    this.engineNoiseGain.connect(this.engineFilter);
    this.engineNoise.start();

    this.engineFilter.connect(this.masterGain);
  }

  updateEngine(speedRatio: number, throttle: number): void {
    if (!this.engineOsc || !this.engineSubOsc || !this.engineGain || !this.engineSubGain || !this.engineNoiseGain || !this.engineFilter || !this.ctx) return;
    const t = this.ctx.currentTime;
    const freq = 65 + speedRatio * 170 + throttle * 35;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(freq / 2, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(500 + speedRatio * 2200 + throttle * 500, t, 0.06);

    const muted = this.muted;
    this.engineGain.gain.setTargetAtTime(muted ? 0.0001 : 0.05 + speedRatio * 0.06, t, 0.08);
    this.engineSubGain.gain.setTargetAtTime(muted ? 0.0001 : 0.035 + speedRatio * 0.02, t, 0.08);
    this.engineNoiseGain.gain.setTargetAtTime(muted ? 0.0001 : 0.012 + throttle * 0.02, t, 0.1);
  }

  stopEngine(): void {
    if (this.engineOsc) {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    if (this.engineSubOsc) {
      this.engineSubOsc.stop();
      this.engineSubOsc.disconnect();
      this.engineSubOsc = null;
    }
    if (this.engineNoise) {
      this.engineNoise.stop();
      this.engineNoise.disconnect();
      this.engineNoise = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
    if (this.engineSubGain) {
      this.engineSubGain.disconnect();
      this.engineSubGain = null;
    }
    if (this.engineNoiseGain) {
      this.engineNoiseGain.disconnect();
      this.engineNoiseGain = null;
    }
    if (this.engineFilter) {
      this.engineFilter.disconnect();
      this.engineFilter = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}

export const audio = new AudioSystem();
