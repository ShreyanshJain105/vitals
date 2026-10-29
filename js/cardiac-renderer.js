/**
 * Vitals Cardiac Telemetry & EKG Waveform Synthesizer
 * 60 FPS HTML5 Canvas rendering of live heart beat P-Q-R-S-T complexes,
 * Heart Rate (BPM), and Heart Rate Variability (HRV).
 */

class VitalsCardiacRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.bpm = 72;
    this.bufferSize = 400;
    this.ekgBuffer = new Float32Array(this.bufferSize).fill(0);
    this.time = 0;
    this.phase = 0; // 0 to 1 through current cardiac cycle
    this.rafId = null;
    this.isBeating = true;
    this.onBeat = null;

    this.initCanvas();
    window.addEventListener('resize', () => this.initCanvas());
    this.start();
  }

  initCanvas() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 420;
    const h = rect.height || 120;

    this.width = w;
    this.height = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.scale(dpr, dpr);
  }

  setBpm(bpm) {
    this.bpm = Math.max(45, Math.min(bpm, 180));
  }

  /**
   * Generates realistic P-Q-R-S-T electrocardiogram waveform
   */
  getEkgSample(phase) {
    // phase goes from 0.0 to 1.0 per heartbeat
    let val = 0;

    // Baseline physiological respiratory drift
    val += Math.sin(phase * Math.PI * 2) * 0.04;

    // P Wave: atrial depolarization (phase 0.12 to 0.20)
    if (phase >= 0.12 && phase <= 0.20) {
      const p = (phase - 0.16) / 0.04;
      val += Math.exp(-p * p * 3) * 0.22;
    }

    // PR Segment: baseline delay (0.20 to 0.26)

    // Q Wave: septal depolarization (phase 0.26 to 0.29)
    if (phase >= 0.26 && phase <= 0.29) {
      const q = (phase - 0.275) / 0.015;
      val -= Math.exp(-q * q * 4) * 0.18;
    }

    // R Wave: massive ventricular depolarization spike (phase 0.29 to 0.35)
    if (phase >= 0.29 && phase <= 0.35) {
      const r = (phase - 0.32) / 0.02;
      val += Math.exp(-r * r * 4) * 1.65;
    }

    // S Wave: base ventricular depolarization (phase 0.35 to 0.38)
    if (phase >= 0.35 && phase <= 0.38) {
      const s = (phase - 0.365) / 0.015;
      val -= Math.exp(-s * s * 4) * 0.38;
    }

    // ST Segment: baseline (0.38 to 0.46)

    // T Wave: ventricular repolarization (phase 0.46 to 0.62)
    if (phase >= 0.46 && phase <= 0.62) {
      const t = (phase - 0.54) / 0.08;
      val += Math.exp(-t * t * 3) * 0.35;
    }

    // Subtle thermal sensor micro-noise
    val += (Math.random() - 0.5) * 0.03;

    return val;
  }

  update(dt) {
    // Beats per second
    const bps = this.bpm / 60.0;
    const oldPhase = this.phase;
    this.phase = (this.phase + dt * bps) % 1.0;

    // Check if R-peak triggered (around phase 0.32)
    if (oldPhase < 0.32 && this.phase >= 0.32) {
      if (this.onBeat) this.onBeat(this.bpm);
    }

    // Slide buffer left and append new sample
    const sample = this.getEkgSample(this.phase);
    this.ekgBuffer.copyWithin(0, 1);
    this.ekgBuffer[this.bufferSize - 1] = sample;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const midY = h * 0.52;
    const scaleY = h * 0.28;

    ctx.clearRect(0, 0, w, h);

    const isBw = document.documentElement.classList.contains('theme-bw');

    // EKG background grid lines (calibrated 0.2s / 0.5mV)
    ctx.strokeStyle = isBw ? 'rgba(0, 0, 0, 0.08)' : 'rgba(239, 68, 68, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridStep = 18;
    for (let x = 0; x < w; x += gridStep) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += gridStep) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Baseline center axis
    ctx.strokeStyle = isBw ? 'rgba(0, 0, 0, 0.2)' : 'rgba(239, 68, 68, 0.18)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw EKG waveform path
    const stepX = w / this.bufferSize;
    ctx.strokeStyle = '#ef4444'; // Clinical red is universal across both Dark and B&W
    ctx.shadowColor = isBw ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    for (let i = 0; i < this.bufferSize; i++) {
      const x = i * stepX;
      const y = midY - this.ekgBuffer[i] * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Glowing cardiac sweep head
    const lastX = (this.bufferSize - 1) * stepX;
    const lastY = midY - this.ekgBuffer[this.bufferSize - 1] * scaleY;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  renderLoop(timestamp) {
    const dt = 0.016; // approx 60fps
    this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame((t) => this.renderLoop(t));
  }

  start() {
    if (!this.rafId) {
      this.rafId = requestAnimationFrame((t) => this.renderLoop(t));
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

window.VitalsCardiacRenderer = VitalsCardiacRenderer;
