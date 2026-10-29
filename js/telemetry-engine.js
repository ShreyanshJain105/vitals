/**
 * Vitals High-Frequency Telemetry Engine
 * 60 FPS Multi-Channel Electromyographic (EMG) & Neural Biopotential Synthesizer
 */

class VitalsTelemetryEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`VitalsTelemetryEngine: Canvas #${canvasId} not found`);
      return;
    }
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Configuration & Options
    this.sampleRate = 2048; // Hz
    this.bufferSize = options.bufferSize || 1024;
    this.activeChannel = 'all'; // 'all', 'ch1', 'ch2', 'ch3'
    this.gain = 1.0;
    this.sweepSpeed = 1.0;
    this.isPaused = false;
    this.state = 'rest'; // 'rest', 'focus', 'overload'

    // Pre-allocated typed arrays for zero-GC 60 FPS pipeline
    this.ch1Buffer = new Float32Array(this.bufferSize); // Raw MUAP Action Potentials
    this.ch2Buffer = new Float32Array(this.bufferSize); // Differential Biopotential
    this.ch3Buffer = new Float32Array(this.bufferSize); // Neural Intent Envelope
    this.fftSpectrum = new Float32Array(24);            // 24 frequency bins (0 - 500 Hz)
    this.fftPeaks = new Float32Array(24);

    // State parameters (smoothly interpolated)
    this.currentParams = {
      baseNoise: 6.0,          // microvolts (uV)
      burstFreq: 0.8,          // bursts per second
      burstAmp: 45.0,          // uV
      cohesion: 0.35,          // rhythmic synchronization
      muapSpikeProb: 0.05,     // probability of motor unit recruitment
      colorCh1: '#00f0ff',
      colorCh2: '#8b5cf6',
      colorCh3: '#10b981',
      glowColor: 'rgba(0, 240, 255, 0.4)'
    };

    this.targetParams = { ...this.currentParams };

    // Neural burst injection accumulator
    this.injectedImpulse = 0.0;
    this.time = 0.0;
    this.rafId = null;
    this.lastFrameTime = performance.now();

    // Callbacks
    this.onMetricsTick = options.onMetricsTick || null;
    this.onNeuralBurst = options.onNeuralBurst || null;

    // Initialize dimensions and listeners
    this.handleResize = this.handleResize.bind(this);
    this.renderLoop = this.renderLoop.bind(this);

    this.initCanvas();
    window.addEventListener('resize', this.handleResize);

    // Start rendering
    this.start();
  }

  initCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 360;

    this.displayWidth = width;
    this.displayHeight = height;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.ctx.scale(dpr, dpr);
    this.dpr = dpr;
  }

  handleResize() {
    this.initCanvas();
  }

  setOperationalState(state) {
    this.state = state;
    if (state === 'rest') {
      this.targetParams = {
        baseNoise: 5.5,
        burstFreq: 0.3,
        burstAmp: 25.0,
        cohesion: 0.25,
        muapSpikeProb: 0.02,
        colorCh1: '#00f0ff',
        colorCh2: '#38bdf8',
        colorCh3: '#10b981',
        glowColor: 'rgba(0, 240, 255, 0.4)'
      };
    } else if (state === 'focus') {
      this.targetParams = {
        baseNoise: 9.0,
        burstFreq: 2.4,
        burstAmp: 110.0,
        cohesion: 0.88,
        muapSpikeProb: 0.25,
        colorCh1: '#00f0ff',
        colorCh2: '#8b5cf6',
        colorCh3: '#a855f7',
        glowColor: 'rgba(139, 92, 246, 0.5)'
      };
    } else if (state === 'overload') {
      this.targetParams = {
        baseNoise: 22.0,
        burstFreq: 6.5,
        burstAmp: 195.0,
        cohesion: 0.96,
        muapSpikeProb: 0.65,
        colorCh1: '#ef4444',
        colorCh2: '#f59e0b',
        colorCh3: '#f97316',
        glowColor: 'rgba(239, 68, 68, 0.6)'
      };
    }
  }

  setChannel(channel) {
    this.activeChannel = channel;
  }

  setGain(gain) {
    this.gain = Math.max(0.2, Math.min(gain, 4.0));
  }

  setSweepSpeed(speed) {
    this.sweepSpeed = Math.max(0.5, Math.min(speed, 3.0));
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  triggerNeuralImpulse(magnitude = 1.5) {
    this.injectedImpulse = magnitude;
    if (this.onNeuralBurst) {
      this.onNeuralBurst({
        timestamp: Date.now(),
        amplitude: (magnitude * 180 + Math.random() * 40).toFixed(1),
        durationMs: 8.4,
        confidence: 0.994
      });
    }
  }

  // Smoothly interpolate current parameters toward target parameters (prevents jarring jumps)
  updateParameters(dt) {
    const lerpRate = Math.min(dt * 3.5, 1.0);
    this.currentParams.baseNoise += (this.targetParams.baseNoise - this.currentParams.baseNoise) * lerpRate;
    this.currentParams.burstFreq += (this.targetParams.burstFreq - this.currentParams.burstFreq) * lerpRate;
    this.currentParams.burstAmp += (this.targetParams.burstAmp - this.currentParams.burstAmp) * lerpRate;
    this.currentParams.cohesion += (this.targetParams.cohesion - this.currentParams.cohesion) * lerpRate;
    this.currentParams.muapSpikeProb += (this.targetParams.muapSpikeProb - this.currentParams.muapSpikeProb) * lerpRate;

    this.currentParams.colorCh1 = this.targetParams.colorCh1;
    this.currentParams.colorCh2 = this.targetParams.colorCh2;
    this.currentParams.colorCh3 = this.targetParams.colorCh3;
    this.currentParams.glowColor = this.targetParams.glowColor;

    // Decay injected impulse
    if (this.injectedImpulse > 0.001) {
      this.injectedImpulse *= 0.91;
    } else {
      this.injectedImpulse = 0;
    }
  }

  /**
   * Synthesize high-frequency biopotential data sample by sample
   */
  generateBiopotentialStep(t) {
    const p = this.currentParams;
    
    // 1. Pink/Gaussian Thermal Noise (1/f physiological background)
    const n1 = (Math.random() - 0.5) * 2;
    const n2 = (Math.random() - 0.5) * 2;
    const thermalNoise = (n1 + n2) * 0.5 * p.baseNoise;

    // 2. Continuous Biopotential Alpha/Beta frequency waves
    const slowOsc = Math.sin(t * 8.2) * 12.0 * p.cohesion;
    const mediumOsc = Math.sin(t * 24.5 + Math.cos(t * 4.1)) * 18.0 * (p.cohesion * 0.8);
    const fastOsc = Math.cos(t * 68.3) * 8.0;

    // 3. Voluntary motor unit burst modulation (envelope)
    const envelopeRate = p.burstFreq * 3.14159;
    const rawEnvelope = Math.max(0, Math.sin(t * envelopeRate));
    const burstModulation = Math.pow(rawEnvelope, 4.0) * p.burstAmp;

    // 4. Injected voluntary impulse (spikes on user trigger)
    const impulseSpike = this.injectedImpulse * 190.0 * Math.sin(t * 120.0);

    // 5. Motor Unit Action Potentials (MUAPs) - Biphasic & Triphasic micro-discharges
    let muapSpike = 0;
    if (Math.random() < p.muapSpikeProb || this.injectedImpulse > 0.1) {
      const polarity = Math.random() > 0.4 ? 1 : -1;
      muapSpike = polarity * (40.0 + Math.random() * 90.0) * (0.5 + p.burstAmp / 100);
    }

    // Synthesize Channel 1: Primary Motor Unit Action Potential (MUAP)
    const ch1 = thermalNoise + fastOsc + (burstModulation * 0.9) + muapSpike + impulseSpike;

    // Synthesize Channel 2: Biopotential Differential (Sub-dermal electrode pair)
    const ch2 = (thermalNoise * 0.7) + slowOsc + mediumOsc + (burstModulation * 0.5) + (muapSpike * 0.35);

    // Synthesize Channel 3: Neural Intent Envelope (Smoothed rectified power)
    const ch3 = Math.abs(ch1) * 0.65 + Math.abs(ch2) * 0.35 + (this.injectedImpulse * 65.0);

    return { ch1, ch2, ch3 };
  }

  /**
   * Advance the ring buffer by sliding samples forward
   */
  updateBuffers(dt) {
    if (this.isPaused) return;

    // Calculate how many samples to advance per frame (approx 16-34 samples at 60fps)
    const samplesToGenerate = Math.max(1, Math.floor(18 * this.sweepSpeed));
    const stepDt = (dt / samplesToGenerate) * this.sweepSpeed;

    for (let s = 0; s < samplesToGenerate; s++) {
      this.time += stepDt;
      const { ch1, ch2, ch3 } = this.generateBiopotentialStep(this.time);

      // Shift buffers left
      this.ch1Buffer.copyWithin(0, 1);
      this.ch2Buffer.copyWithin(0, 1);
      this.ch3Buffer.copyWithin(0, 1);

      // Append new sample at tail
      const lastIdx = this.bufferSize - 1;
      this.ch1Buffer[lastIdx] = ch1;
      this.ch2Buffer[lastIdx] = ch2;
      this.ch3Buffer[lastIdx] = ch3;
    }

    // Update FFT frequency bands representation
    const energyLevel = (this.currentParams.burstAmp + this.injectedImpulse * 100) / 200;
    for (let i = 0; i < 24; i++) {
      const freqFactor = Math.sin((i / 24) * Math.PI);
      const targetVal = (freqFactor * energyLevel * 0.85) + (Math.random() * 0.15 * energyLevel);
      this.fftSpectrum[i] += (targetVal - this.fftSpectrum[i]) * 0.25;

      // Peak hold with decay
      if (this.fftSpectrum[i] > this.fftPeaks[i]) {
        this.fftPeaks[i] = this.fftSpectrum[i];
      } else {
        this.fftPeaks[i] *= 0.97;
      }
    }
  }

  /**
   * Draw the calibrated oscilloscope graticule
   */
  drawGraticule(w, h) {
    const ctx = this.ctx;
    const isBw = document.documentElement.classList.contains('theme-bw');

    // Deep obsidian background (ultra-high contrast OLED for both modes)
    ctx.fillStyle = isBw ? '#050507' : '#0a0a0c';
    ctx.fillRect(0, 0, w, h);

    // Minor division grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = isBw ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.05)';
    ctx.beginPath();

    const minorStepX = w / 20;
    const minorStepY = h / 10;

    for (let x = 0; x < w; x += minorStepX) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += minorStepY) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Major division grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.09)';
    ctx.beginPath();
    const majorStepX = w / 10;
    const majorStepY = h / 5;

    for (let x = 0; x < w; x += majorStepX) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += majorStepY) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center zero-voltage reference axis
    const midY = h * 0.5;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]); // reset dash

    // Calibration text markers
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.textAlign = 'left';

    const maxMicrovolts = Math.round(200 / this.gain);
    ctx.fillText(`+${maxMicrovolts} µV`, 12, 18);
    ctx.fillText(`+${Math.round(maxMicrovolts / 2)} µV`, 12, midY - majorStepY + 4);
    ctx.fillText(`0.0 µV [GND REF]`, 12, midY - 6);
    ctx.fillText(`-${Math.round(maxMicrovolts / 2)} µV`, 12, midY + majorStepY + 4);
    ctx.fillText(`-${maxMicrovolts} µV`, 12, h - 38);

    // Timebase indicator at bottom
    ctx.textAlign = 'right';
    ctx.fillText(`50 ms/div | ${this.sampleRate} S/s | 24-bit ADC`, w - 16, h - 38);
  }

  /**
   * Draw continuous multi-channel waveform paths with glowing phosphor aesthetics
   */
  drawWaveforms(w, h) {
    const ctx = this.ctx;
    const midY = h * 0.5;
    const scaleY = (h * 0.38) * (this.gain / 200.0);
    const bufLen = this.bufferSize;
    const stepX = w / bufLen;

    const renderChannel = (buffer, strokeColor, shadowColor, lineWidth = 1.6, fillGradient = null) => {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      for (let i = 0; i < bufLen; i++) {
        const x = i * stepX;
        const val = buffer[i];
        const y = midY - val * scaleY;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Optional subtle glowing baseline area fill
      if (fillGradient) {
        ctx.lineTo(w, midY);
        ctx.lineTo(0, midY);
        ctx.closePath();
        ctx.fillStyle = fillGradient;
        ctx.fill();
      }

      ctx.restore();
    };

    // Render channels according to user selection
    if (this.activeChannel === 'all' || this.activeChannel === 'ch2') {
      // Channel 2: Violet differential biopotential
      renderChannel(this.ch2Buffer, this.currentParams.colorCh2, 'rgba(139, 92, 246, 0.45)', 1.4);
    }

    if (this.activeChannel === 'all' || this.activeChannel === 'ch3') {
      // Channel 3: Neural intent smoothed envelope
      const grad = ctx.createLinearGradient(0, midY - 80, 0, midY);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      renderChannel(this.ch3Buffer, this.currentParams.colorCh3, 'rgba(16, 185, 129, 0.4)', 1.2, grad);
    }

    if (this.activeChannel === 'all' || this.activeChannel === 'ch1') {
      // Channel 1: Primary MUAP spike train (Electric Cyan)
      renderChannel(this.ch1Buffer, this.currentParams.colorCh1, this.currentParams.glowColor, 2.0);
    }

    // Lead beam / sweep head spark
    const lastX = (bufLen - 1) * stepX;
    const lastY = midY - this.ch1Buffer[bufLen - 1] * scaleY;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.currentParams.colorCh1;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw the real-time FFT spectrum strip along bottom
   */
  drawFFTSpectrum(w, h) {
    const ctx = this.ctx;
    const barCount = 24;
    const startY = h - 28;
    const maxHeight = 24;
    const totalW = Math.min(w * 0.45, 340);
    const startX = w - totalW - 16;
    const barWidth = (totalW / barCount) - 2;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(startX - 8, startY - maxHeight - 8, totalW + 16, maxHeight + 14);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.strokeRect(startX - 8, startY - maxHeight - 8, totalW + 16, maxHeight + 14);

    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.textAlign = 'right';
    ctx.fillText('FFT (0-500Hz)', startX - 12, startY - 4);

    for (let i = 0; i < barCount; i++) {
      const x = startX + i * (barWidth + 2);
      const val = Math.max(0, Math.min(this.fftSpectrum[i], 1.0));
      const barH = val * maxHeight;
      const y = startY - barH;

      // Color gradient based on frequency band (low = cyan, high = violet/crimson)
      const isHighBand = i > 16;
      ctx.fillStyle = isHighBand && this.state === 'overload' ? '#ef4444' : (i > 12 ? '#8b5cf6' : '#00f0ff');
      ctx.fillRect(x, y, barWidth, barH);

      // Peak marker line
      const peakY = startY - (this.fftPeaks[i] * maxHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, peakY, barWidth, 1.2);
    }
    ctx.restore();
  }

  renderLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1); // clamp to prevent lag spikes
    this.lastFrameTime = timestamp;

    this.updateParameters(dt);
    this.updateBuffers(dt);

    const w = this.displayWidth;
    const h = this.displayHeight;

    this.drawGraticule(w, h);
    this.drawWaveforms(w, h);
    this.drawFFTSpectrum(w, h);

    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  start() {
    if (!this.rafId) {
      this.lastFrameTime = performance.now();
      this.rafId = requestAnimationFrame(this.renderLoop);
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
  }
}

// Export for modular usage
window.VitalsTelemetryEngine = VitalsTelemetryEngine;
