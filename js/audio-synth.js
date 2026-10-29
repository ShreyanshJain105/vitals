/**
 * Vitals Biopotential Audio Sonification Synthesizer
 * Uses Web Audio API for acoustic representation of neural signal streams
 * Disabled/Muted by default to ensure comfort and compliance with autoplay policies
 */

class VitalsAudioSynth {
  constructor() {
    this.audioCtx = null;
    this.isMuted = true;
    this.carrierOsc = null;
    this.carrierGain = null;
    this.filterNode = null;
    this.state = 'rest';
  }

  initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Master gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Lowpass filter for natural analog physiological tone
      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(280, this.audioCtx.currentTime);
      this.filterNode.connect(this.masterGain);

      // Continuous subtle biopotential carrier drone
      this.carrierOsc = this.audioCtx.createOscillator();
      this.carrierOsc.type = 'sine';
      this.carrierOsc.frequency.setValueAtTime(55, this.audioCtx.currentTime); // 55Hz (A1)

      this.carrierGain = this.audioCtx.createGain();
      this.carrierGain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);

      this.carrierOsc.connect(this.carrierGain);
      this.carrierGain.connect(this.filterNode);
      this.carrierOsc.start();

    } catch (err) {
      console.warn('Web Audio not supported or restricted by browser:', err);
    }
  }

  toggleMute() {
    this.initAudio();
    if (!this.audioCtx) return true;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isMuted = !this.isMuted;
    const now = this.audioCtx.currentTime;

    if (this.isMuted) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.05);
    } else {
      this.masterGain.gain.setTargetAtTime(0.18, now, 0.05);
      this.playChirp(440, 0.08, 'sine');
    }

    return this.isMuted;
  }

  setOperationalState(state) {
    this.state = state;
    if (!this.audioCtx || this.isMuted) return;

    const now = this.audioCtx.currentTime;
    if (state === 'rest') {
      this.carrierOsc.frequency.setTargetAtTime(55, now, 0.2);
      this.filterNode.frequency.setTargetAtTime(240, now, 0.2);
    } else if (state === 'focus') {
      this.carrierOsc.frequency.setTargetAtTime(110, now, 0.2);
      this.filterNode.frequency.setTargetAtTime(560, now, 0.2);
      this.playChirp(660, 0.05, 'triangle');
    } else if (state === 'overload') {
      this.carrierOsc.frequency.setTargetAtTime(164.8, now, 0.2); // Tension harmonic
      this.filterNode.frequency.setTargetAtTime(980, now, 0.2);
      this.playChirp(880, 0.12, 'sawtooth');
    }
  }

  playNeuralPulse() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    // Subtle micro-click representing single motor-unit firing
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    const baseFreq = this.state === 'overload' ? 520 : (this.state === 'focus' ? 440 : 220);
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 80, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playChirp(freq = 440, duration = 0.1, type = 'sine') {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + duration);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }
}

window.VitalsAudioSynth = VitalsAudioSynth;
