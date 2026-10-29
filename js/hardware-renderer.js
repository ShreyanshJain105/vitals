/**
 * Vitals Hardware Visualizer
 * Programmatic Vector & Canvas Renderer for the Vitals Neuromuscular Wristband
 * Features glowing micro-circuitry, synchronized pulsing sensor arrays, and 3D interactive tilt
 */

class VitalsHardwareRenderer {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    if (!this.canvas) {
      console.error(`VitalsHardwareRenderer: Canvas #${canvasId} not found`);
      return;
    }
    this.ctx = this.canvas.getContext('2d');

    this.state = 'rest';
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.pulseTime = 0;
    this.sparks = [];
    this.activeHotspot = null;

    // Contact sensor pad positions along the band
    this.sensorPads = [
      { id: 1, angle: -0.85, label: "Sensor Ch 1: Flexor Carpi Radialis" },
      { id: 2, angle: -0.55, label: "Sensor Ch 2: Palmaris Longus" },
      { id: 3, angle: -0.25, label: "Sensor Ch 3: Flexor Digitorum Superficialis" },
      { id: 4, angle: 0.05,  label: "Sensor Ch 4: Pronator Teres" },
      { id: 5, angle: 0.35,  label: "Sensor Ch 5: Extensor Carpi Ulnaris" },
      { id: 6, angle: 0.65,  label: "Sensor Ch 6: Extensor Digitorum" },
      { id: 7, angle: 0.95,  label: "Sensor Ch 7: Extensor Carpi Radialis" },
      { id: 8, angle: 1.25,  label: "Sensor Ch 8: Brachioradialis" }
    ];

    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.renderLoop = this.renderLoop.bind(this);

    this.initCanvas();
    this.bindEvents();
    this.start();
  }

  initCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 560;
    const h = rect.height || 560;

    this.width = w;
    this.height = h;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.scale(dpr, dpr);
    this.dpr = dpr;
  }

  bindEvents() {
    window.addEventListener('resize', this.handleResize);

    if (this.container) {
      this.container.addEventListener('mousemove', this.handleMouseMove);
      this.container.addEventListener('mouseleave', this.handleMouseLeave);
    }
  }

  handleResize() {
    this.initCanvas();
  }

  handleMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to +1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    this.mouse.targetX = nx;
    this.mouse.targetY = ny;
  }

  handleMouseLeave() {
    this.mouse.targetX = 0;
    this.mouse.targetY = 0;
  }

  setOperationalState(state) {
    this.state = state;
    if (state === 'overload') {
      this.emitSparks(12);
    }
  }

  emitSparks(count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.sparks.push({
        x: this.width * 0.5 + Math.cos(angle) * 120,
        y: this.height * 0.5 + Math.sin(angle) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.04,
        color: this.state === 'overload' ? '#ef4444' : (this.state === 'focus' ? '#a855f7' : '#00f0ff')
      });
    }
  }

  /**
   * Render the hardware Vitals Band
   */
  drawHardware(cx, cy, w, h) {
    const ctx = this.ctx;
    const t = this.pulseTime;

    // Perspective transformation from mouse interaction
    const tiltX = this.mouse.x * 16;
    const tiltY = this.mouse.y * 12;

    const baseRadiusX = Math.min(w * 0.38, 200);
    const baseRadiusY = Math.min(h * 0.26, 130);

    // State palette
    let primaryGlow = 'rgba(0, 240, 255, 0.5)';
    let primaryColor = '#00f0ff';
    let pulseSpeed = 1.5;

    if (this.state === 'focus') {
      primaryGlow = 'rgba(139, 92, 246, 0.6)';
      primaryColor = '#8b5cf6';
      pulseSpeed = 3.2;
    } else if (this.state === 'overload') {
      primaryGlow = 'rgba(239, 68, 68, 0.7)';
      primaryColor = '#ef4444';
      pulseSpeed = 6.0;
    }

    const pulseIntensity = 0.5 + 0.5 * Math.sin(t * pulseSpeed);

    ctx.save();
    ctx.translate(cx + tiltX, cy + tiltY);

    // 1. Ambient Background Neural Field Glow
    const bgRadial = ctx.createRadialGradient(0, 0, 40, 0, 0, baseRadiusX * 1.5);
    bgRadial.addColorStop(0, primaryGlow.replace('0.', '0.15'));
    bgRadial.addColorStop(0.6, primaryGlow.replace('0.', '0.04'));
    bgRadial.addColorStop(1, 'rgba(10, 10, 12, 0)');
    ctx.fillStyle = bgRadial;
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);

    // 2. Wristband Outer Shell (Aerospace Grade 5 Titanium Alloy)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 14, baseRadiusX + 8, baseRadiusY + 12, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.lineWidth = 36;
    ctx.stroke();

    // Metallic beveled gradient
    const bandGrad = ctx.createLinearGradient(-baseRadiusX, -baseRadiusY, baseRadiusX, baseRadiusY);
    bandGrad.addColorStop(0, '#1e293b');
    bandGrad.addColorStop(0.3, '#0f172a');
    bandGrad.addColorStop(0.5, '#334155');
    bandGrad.addColorStop(0.7, '#0f172a');
    bandGrad.addColorStop(1, '#1e293b');

    ctx.beginPath();
    ctx.ellipse(0, 10, baseRadiusX, baseRadiusY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = bandGrad;
    ctx.lineWidth = 26;
    ctx.stroke();

    // Subtle edge highlight
    ctx.beginPath();
    ctx.ellipse(0, 7, baseRadiusX + 11, baseRadiusY + 11, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 3. Programmatic Micro-Circuitry Traces (Pulsing conductive bus lines)
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = primaryColor;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 8 * pulseIntensity;

    const circuitTracks = [
      { rX: baseRadiusX - 10, rY: baseRadiusY - 8, dash: [14, 8, 4, 8] },
      { rX: baseRadiusX + 1, rY: baseRadiusY + 1, dash: [24, 12, 6, 12] }
    ];

    circuitTracks.forEach((track, idx) => {
      ctx.setLineDash(track.dash);
      ctx.lineDashOffset = (t * 24 * (idx === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.ellipse(0, 10, track.rX, track.rY, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();

    // 4. Biopotential Dry Contact Sensor Array (8-channel micro-nodes)
    ctx.save();
    this.sensorPads.forEach((pad, index) => {
      const angle = pad.angle;
      const px = Math.cos(angle) * (baseRadiusX - 3);
      const py = Math.sin(angle) * (baseRadiusY - 2) + 10;

      // Contact pad housing (Ag/AgCl dry electrode)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Active pulsing biopotential core
      const phaseOffset = index * 0.4;
      const sensorPulse = 0.4 + 0.6 * Math.sin(t * pulseSpeed + phaseOffset);

      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 12 * sensorPulse;
      ctx.beginPath();
      ctx.arc(px, py, 3.2 * sensorPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Connecting micro-trace line to hub
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px * 0.72, py * 0.72);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * sensorPulse})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    ctx.restore();

    // 5. Central Vitals N1 Neuromorphic Core (System-on-Chip die)
    ctx.save();
    const chipW = 84;
    const chipH = 68;

    // Dark crystalline glass housing with chamfered border
    ctx.fillStyle = '#08080a';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 18 * pulseIntensity;

    // Draw rounded rect for chip housing
    this.drawRoundedRect(ctx, -chipW * 0.5, -chipH * 0.5 + 4, chipW, chipH, 8);
    ctx.fill();
    ctx.stroke();

    // Silicon Die pattern
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    this.drawRoundedRect(ctx, -chipW * 0.38, -chipH * 0.38 + 4, chipW * 0.76, chipH * 0.76, 4);
    ctx.fill();

    // Neuromorphic Core Etchings
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-chipW * 0.28, 4);
    ctx.lineTo(chipW * 0.28, 4);
    ctx.moveTo(0, -chipH * 0.28 + 4);
    ctx.lineTo(0, chipH * 0.28 + 4);
    ctx.stroke();

    // Center pulsating neural processing node
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Vitals Brand Wordmark on chip
    ctx.font = '700 8px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText('VITALS N1', 0, -chipH * 0.22 + 4);

    ctx.font = '500 6px "JetBrains Mono", monospace';
    ctx.fillStyle = primaryColor;
    ctx.fillText('512 TOPS/W', 0, chipH * 0.32 + 4);

    ctx.restore();

    // 6. Render Electrical Sparks (on bursts or overload)
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;

      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = s.life;
      ctx.beginPath();
      ctx.arc(s.x - cx, s.y - cy, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  renderLoop(timestamp) {
    // Smooth lerp mouse coordinates
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    this.pulseTime += 0.02;

    const w = this.width;
    const h = this.height;

    this.ctx.clearRect(0, 0, w, h);
    this.drawHardware(w * 0.5, h * 0.5, w, h);

    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  start() {
    if (!this.rafId) {
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
    if (this.container) {
      this.container.removeEventListener('mousemove', this.handleMouseMove);
      this.container.removeEventListener('mouseleave', this.handleMouseLeave);
    }
  }
}

// Export
window.VitalsHardwareRenderer = VitalsHardwareRenderer;
