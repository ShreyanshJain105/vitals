/**
 * Vitals Real-Time Telemetry Matrix & Neural Event Stream
 * Drives high-density numerical tiles, mini-sparklines, and live diagnostic event feeds
 */

class VitalsTelemetryMatrix {
  constructor(options = {}) {
    this.state = 'rest';
    this.tickInterval = null;
    this.historyLength = 30;

    // Metric histories for sparklines
    this.history = {
      bandwidth: new Array(this.historyLength).fill(2048),
      focus: new Array(this.historyLength).fill(45),
      latency: new Array(this.historyLength).fill(3.1),
      fatigue: new Array(this.historyLength).fill(15),
      snr: new Array(this.historyLength).fill(32)
    };

    // Current live values
    this.current = {
      bandwidth: 2048.0,
      focus: 45.2,
      latency: 3.12,
      fatigueVal: 16.4,
      fatigueLevel: 'Nominal',
      snr: 32.4,
      impedance: 18.2,
      gestureName: 'BASELINE IDLE (Resting Motor Tone)',
      gestureConfidence: 99.1,
      packetsStreamed: 849210
    };

    // DOM Elements
    this.elBandwidth = document.getElementById('metric-bandwidth');
    this.elFocus = document.getElementById('metric-focus');
    this.elFocusBar = document.getElementById('metric-focus-bar');
    this.elLatency = document.getElementById('metric-latency');
    this.elFatigue = document.getElementById('metric-fatigue');
    this.elFatigueBadge = document.getElementById('metric-fatigue-badge');
    this.elSnr = document.getElementById('metric-snr');
    this.elImpedance = document.getElementById('metric-impedance');
    this.elGesture = document.getElementById('metric-gesture');
    this.elGestureConfidence = document.getElementById('metric-gesture-conf');
    this.elEventFeed = document.getElementById('neural-event-feed');
    this.elPacketsCounter = document.getElementById('packets-counter');

    // Sparkline canvases
    this.sparklines = {
      bandwidth: document.getElementById('sparkline-bandwidth'),
      focus: document.getElementById('sparkline-focus'),
      latency: document.getElementById('sparkline-latency'),
      fatigue: document.getElementById('sparkline-fatigue')
    };

    // Active log filter
    this.activeFilter = 'ALL'; // 'ALL', 'GESTURES', 'NEURAL', 'ALERTS'

    this.startMetricsTicker();
    this.seedInitialEvents();
  }

  setOperationalState(state) {
    this.state = state;
    this.pushLogEvent({
      type: 'STATE_CHANGE',
      category: 'ALERTS',
      message: `System transition to [${state.toUpperCase()}_MODE] confirmed. Hardware telemetry recalibrated.`
    });
  }

  startMetricsTicker() {
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 120);
  }

  tick() {
    this.current.packetsStreamed += Math.floor(18 + Math.random() * 8);

    if (this.state === 'rest') {
      const bwVariance = (Math.random() - 0.5) * 0.6;
      this.current.bandwidth = +(2048.0 + bwVariance).toFixed(1);

      this.current.focus += ((44.0 + (Math.random() - 0.5) * 3.5) - this.current.focus) * 0.15;
      this.current.latency += ((2.95 + (Math.random() - 0.5) * 0.3) - this.current.latency) * 0.2;
      this.current.fatigueVal += ((14.5 + Math.random() * 4.0) - this.current.fatigueVal) * 0.1;
      this.current.fatigueLevel = 'Nominal';

      this.current.snr = +(32.8 + (Math.random() - 0.5) * 1.2).toFixed(1);
      this.current.impedance = +(17.4 + (Math.random() - 0.5) * 0.4).toFixed(1);
      this.current.gestureName = 'BASELINE IDLE (Resting Motor Tone)';
      this.current.gestureConfidence = +(99.2 + Math.random() * 0.6).toFixed(1);

    } else if (this.state === 'focus') {
      const bwVariance = (Math.random() - 0.5) * 1.4;
      this.current.bandwidth = +(2048.0 + bwVariance).toFixed(1);

      this.current.focus += ((95.4 + (Math.random() - 0.5) * 2.8) - this.current.focus) * 0.15;
      this.current.latency += ((3.22 + (Math.random() - 0.5) * 0.45) - this.current.latency) * 0.2;
      this.current.fatigueVal += ((26.0 + Math.random() * 5.0) - this.current.fatigueVal) * 0.1;
      this.current.fatigueLevel = 'Nominal';

      this.current.snr = +(35.4 + (Math.random() - 0.5) * 1.5).toFixed(1);
      this.current.impedance = +(16.2 + (Math.random() - 0.5) * 0.3).toFixed(1);

      const focusGestures = [
        'MICRO-PINCH [Sub-voxel index flex]',
        'NEURAL INTENT [Pointer lock]',
        'ISOMETRIC MOTOR ENGAGEMENT',
        'SPATIAL WRIST ROLL (<3ms)'
      ];
      this.current.gestureName = focusGestures[Math.floor(Date.now() / 2000) % focusGestures.length];
      this.current.gestureConfidence = +(98.8 + Math.random() * 1.0).toFixed(1);

    } else if (this.state === 'overload') {
      const bwVariance = (Math.random() - 0.5) * 4.2;
      this.current.bandwidth = +(2047.2 + bwVariance).toFixed(1);

      this.current.focus += ((64.0 + (Math.random() - 0.5) * 14.0) - this.current.focus) * 0.2;
      this.current.latency += ((8.45 + (Math.random() - 0.5) * 2.8) - this.current.latency) * 0.25;
      this.current.fatigueVal += ((89.0 + Math.random() * 7.0) - this.current.fatigueVal) * 0.15;
      this.current.fatigueLevel = this.current.fatigueVal > 85 ? 'Critical' : 'Elevated';

      this.current.snr = +(19.4 + (Math.random() - 0.5) * 3.5).toFixed(1);
      this.current.impedance = +(24.1 + (Math.random() - 0.5) * 1.8).toFixed(1);
      this.current.gestureName = 'STRESS TREMOR [Pre-symptomatic Overload]';
      this.current.gestureConfidence = +(84.2 + Math.random() * 6.0).toFixed(1);
    }

    // Push into history buffers
    this.pushHistory('bandwidth', this.current.bandwidth);
    this.pushHistory('focus', this.current.focus);
    this.pushHistory('latency', this.current.latency);
    this.pushHistory('fatigue', this.current.fatigueVal);
    this.pushHistory('snr', this.current.snr);

    // Update DOM
    this.renderDOM();
    this.renderSparklines();

    // Periodically push random telemetry events (approx every 3-5 seconds)
    if (Math.random() < 0.12) {
      this.emitPeriodicEvent();
    }
  }

  pushHistory(metric, val) {
    if (this.history[metric]) {
      this.history[metric].shift();
      this.history[metric].push(val);
    }
  }

  renderDOM() {
    if (this.elBandwidth) this.elBandwidth.innerText = `${this.current.bandwidth} Hz`;
    if (this.elFocus) this.elFocus.innerText = `${this.current.focus.toFixed(1)}%`;
    if (this.elFocusBar) this.elFocusBar.style.width = `${Math.min(100, Math.max(0, this.current.focus))}%`;
    if (this.elLatency) this.elLatency.innerText = `${this.current.latency.toFixed(2)} ms`;
    if (this.elFatigue) this.elFatigue.innerText = `${this.current.fatigueVal.toFixed(0)}%`;
    if (this.elSnr) this.elSnr.innerText = `${this.current.snr} dB`;
    if (this.elImpedance) this.elImpedance.innerText = `${this.current.impedance} kΩ`;
    if (this.elGesture) this.elGesture.innerText = this.current.gestureName;
    if (this.elGestureConfidence) this.elGestureConfidence.innerText = `${this.current.gestureConfidence}%`;
    if (this.elPacketsCounter) this.elPacketsCounter.innerText = this.current.packetsStreamed.toLocaleString();

    // Update Fatigue Badge style
    if (this.elFatigueBadge) {
      this.elFatigueBadge.innerText = this.current.fatigueLevel.toUpperCase();
      this.elFatigueBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider transition-colors ';
      if (this.current.fatigueLevel === 'Nominal') {
        this.elFatigueBadge.className += 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      } else if (this.current.fatigueLevel === 'Elevated') {
        this.elFatigueBadge.className += 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      } else {
        this.elFatigueBadge.className += 'bg-red-500/20 text-red-400 border border-red-500/30 glow-crimson';
      }
    }
  }

  renderSparklines() {
    this.drawSparkline(this.sparklines.bandwidth, this.history.bandwidth, '#00f0ff');
    this.drawSparkline(this.sparklines.focus, this.history.focus, this.state === 'overload' ? '#f59e0b' : '#8b5cf6');
    this.drawSparkline(this.sparklines.latency, this.history.latency, this.state === 'overload' ? '#ef4444' : '#00f0ff');
    this.drawSparkline(this.sparklines.fatigue, this.history.fatigue, this.current.fatigueLevel === 'Critical' ? '#ef4444' : (this.current.fatigueLevel === 'Elevated' ? '#f59e0b' : '#10b981'));
  }

  drawSparkline(canvas, data, strokeColor) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!data || data.length < 2) return;

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = (max - min) || 1;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();

    const step = w / (data.length - 1);
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const normalized = (data[i] - min) / range;
      const y = h - (normalized * (h - 6) + 3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  seedInitialEvents() {
    const initialEvents = [
      { type: 'SYS_BOOT', category: 'NEURAL', message: 'Vitals N1 Neuromorphic Core initialized. Deterministic clock locked at 2,048 Hz.' },
      { type: 'CALIBRATION', category: 'NEURAL', message: '32-channel dry Ag/AgCl impedance check: 18.2 kΩ [Optimal CMRR: 142.4 dB].' },
      { type: 'GESTURE_READY', category: 'GESTURES', message: 'Sub-voxel motor unit classifier loaded. Inference latency benchmarked: 3.12ms.' },
      { type: 'STREAM_LOCK', category: 'NEURAL', message: 'Air-gapped TLS 1.3 telemetry stream active. Zero-packet drop protocol established.' }
    ];

    initialEvents.forEach(evt => this.pushLogEvent(evt, false));
  }

  emitPeriodicEvent() {
    const timestamp = new Date().toISOString().substring(11, 23);

    if (this.state === 'rest') {
      const msgs = [
        { type: 'MOTOR_BASELINE', category: 'NEURAL', message: `Quiet tonic firing verified. Alpha motor recruitment variance < 4.2 µV.` },
        { type: 'REST_IDLE', category: 'GESTURES', message: `No active voluntary motor displacement. Cognitive load: Minimal.` },
        { type: 'IMPEDANCE_CHECK', category: 'NEURAL', message: `Electrode array thermal noise stabilized at 5.4 µV RMS.` }
      ];
      this.pushLogEvent(msgs[Math.floor(Math.random() * msgs.length)]);
    } else if (this.state === 'focus') {
      const msgs = [
        { type: 'MUAP_SPIKE', category: 'NEURAL', message: `Synchronized alpha-motor burst on Channel 1: 124.6 µV peak [MUAP triphasic].` },
        { type: 'MICRO_INTENT', category: 'GESTURES', message: `Sub-voxel micro-pinch intent confirmed. On-chip microcode latency: 2.84ms.` },
        { type: 'COGNITIVE_COHESION', category: 'NEURAL', message: `Frontal-motor beta coherence peak at 28.4 Hz. Cognitive focus: 96.2%.` }
      ];
      this.pushLogEvent(msgs[Math.floor(Math.random() * msgs.length)]);
    } else if (this.state === 'overload') {
      const msgs = [
        { type: 'TREMOR_WARNING', category: 'ALERTS', message: `High-frequency neuromuscular jitter (>14 Hz) detected. Exhaustion precursor.` },
        { type: 'LATENCY_DEVIATION', category: 'ALERTS', message: `Motor recruitment phase jitter elevated to 8.6ms. Buffer depth nominal.` },
        { type: 'CRITICAL_FATIGUE', category: 'ALERTS', message: `Continuous biopotential variance exceeding ergonomic threshold. Recommend relief pause.` }
      ];
      this.pushLogEvent(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }

  pushLogEvent(evt, animate = true) {
    if (!this.elEventFeed) return;

    const timeStr = new Date().toISOString().substring(11, 23);
    const li = document.createElement('div');
    li.setAttribute('data-category', evt.category);
    if (!li.dataset) li.dataset = {};
    li.dataset.category = evt.category;
    li.className = 'py-1.5 px-2.5 rounded font-mono text-xs flex items-start gap-2 border-b border-slate-800/40 hover:bg-white/[0.02] transition-colors';

    let badgeColor = 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40';
    if (evt.category === 'GESTURES') badgeColor = 'text-violet-400 bg-violet-950/40 border-violet-800/40';
    if (evt.category === 'ALERTS') badgeColor = 'text-amber-400 bg-amber-950/40 border-amber-800/40';

    li.innerHTML = `
      <span class="text-slate-500 shrink-0 text-[10px] select-none">${timeStr}</span>
      <span class="px-1.5 py-0.2 rounded border text-[9px] font-semibold tracking-wider ${badgeColor} shrink-0">${evt.type}</span>
      <span class="text-slate-300 break-all">${evt.message}</span>
    `;

    // Check filter
    if (this.activeFilter !== 'ALL' && this.activeFilter !== evt.category) {
      li.style.display = 'none';
    }

    this.elEventFeed.insertBefore(li, this.elEventFeed.firstChild);

    // Keep feed trimmed to 60 elements max to avoid DOM creep
    while (this.elEventFeed.children.length > 60) {
      this.elEventFeed.removeChild(this.elEventFeed.lastChild);
    }
  }

  setFilter(filter) {
    this.activeFilter = filter;
    if (!this.elEventFeed) return;
    Array.from(this.elEventFeed.children).forEach(child => {
      const cat = (child.dataset && child.dataset.category) || child.getAttribute('data-category');
      if (filter === 'ALL' || cat === filter) {
        child.style.display = 'flex';
      } else {
        child.style.display = 'none';
      }
    });
  }

  exportTelemetryJSON() {
    const exportPacket = {
      timestamp: new Date().toISOString(),
      system: 'Vitals N1 Enterprise Biopotential Telemetry Node',
      firmware: 'v3.8.4-edge-neuromorphic',
      telemetry: {
        operational_state: this.state,
        sampling_rate_hz: 2048,
        bandwidth_current_hz: this.current.bandwidth,
        cognitive_focus_index_percent: +this.current.focus.toFixed(2),
        interface_latency_ms: +this.current.latency.toFixed(2),
        neuro_fatigue_index: {
          score_percent: +this.current.fatigueVal.toFixed(1),
          status: this.current.fatigueLevel
        },
        signal_to_noise_ratio_db: this.current.snr,
        electrode_impedance_kohm: this.current.impedance,
        decoded_gesture: {
          label: this.current.gestureName,
          confidence_percent: this.current.gestureConfidence
        },
        total_packets_streamed: this.current.packetsStreamed
      },
      channels: {
        ch1_muap_history: this.history.bandwidth.slice(-10),
        ch2_differential_history: this.history.focus.slice(-10),
        ch3_envelope_history: this.history.latency.slice(-10)
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPacket, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vitals-telemetry-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    this.pushLogEvent({
      type: 'EXPORT_SNAPSHOT',
      category: 'NEURAL',
      message: `Diagnostic telemetry payload compiled & exported to local JSON archive.`
    });
  }

  destroy() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

window.VitalsTelemetryMatrix = VitalsTelemetryMatrix;
