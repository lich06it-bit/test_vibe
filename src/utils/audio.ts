class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastDripTime: number = 0;
  private torchGain: GainNode | null = null;
  private torchOsc: AudioNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.torchGain) {
      this.torchGain.gain.value = 0;
    }
  }

  public playDripSound(volumeScale: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (now - this.lastDripTime < 0.08) return; // Prevent sound clipping
    this.lastDripTime = now;

    // Pitch range for droplet sound (sine wave dropping frequency rapidly)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = 800 + Math.random() * 400; // 800-1200Hz
    const endFreq = 200 + Math.random() * 100;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18 * Math.min(1, volumeScale), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public updateTorchSound(active: boolean, powerRatio: number = 1.0) {
    if (this.isMuted || !active) {
      if (this.torchGain && this.ctx) {
        this.torchGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    this.initCtx();
    if (!this.ctx) return;

    if (!this.torchGain) {
      // Create white noise for torch hiss
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 3.0;

      this.torchGain = this.ctx.createGain();
      this.torchGain.gain.value = 0;

      whiteNoise.connect(filter);
      filter.connect(this.torchGain);
      this.torchGain.connect(this.ctx.destination);
      whiteNoise.start();
      this.torchOsc = whiteNoise;
    }

    const now = this.ctx.currentTime;
    const targetVol = 0.08 * powerRatio;
    this.torchGain.gain.setTargetAtTime(targetVol, now, 0.05);
  }
}

export const soundEngine = new SoundEngine();
