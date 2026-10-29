/**
 * Vitals State Controller & Interactive Simulation Suite
 * Synchronizes operational states (Rest, Active Focus, Overload) across
 * telemetry engine, hardware visualizer, matrix metrics, and sonification.
 */

class VitalsStateController {
  constructor(telemetryEngine, hardwareRenderer, telemetryMatrix, audioSynth) {
    this.telemetryEngine = telemetryEngine;
    this.hardwareRenderer = hardwareRenderer;
    this.telemetryMatrix = telemetryMatrix;
    this.audioSynth = audioSynth;

    this.activeState = 'rest';

    // State buttons
    this.btnRest = document.getElementById('btn-mode-rest');
    this.btnFocus = document.getElementById('btn-mode-focus');
    this.btnOverload = document.getElementById('btn-mode-overload');

    // Controls
    this.btnTriggerImpulse = document.getElementById('btn-trigger-impulse');
    this.btnFreezeStream = document.getElementById('btn-freeze-stream');
    this.sliderGain = document.getElementById('slider-gain');
    this.sliderSpeed = document.getElementById('slider-speed');
    this.valGain = document.getElementById('val-gain');
    this.valSpeed = document.getElementById('val-speed');

    // Channel buttons
    this.channelBtns = document.querySelectorAll('.channel-btn');

    // Global indicators
    this.osStatusBadge = document.getElementById('os-status-text');
    this.cockpitContainer = document.getElementById('telemetry-cockpit-section');

    this.bindEvents();
    this.applyState('rest', false);
  }

  bindEvents() {
    if (this.btnRest) {
      this.btnRest.addEventListener('click', () => this.applyState('rest'));
    }
    if (this.btnFocus) {
      this.btnFocus.addEventListener('click', () => this.applyState('focus'));
    }
    if (this.btnOverload) {
      this.btnOverload.addEventListener('click', () => this.applyState('overload'));
    }

    // Trigger voluntary neural impulse burst
    if (this.btnTriggerImpulse) {
      this.btnTriggerImpulse.addEventListener('click', () => {
        this.telemetryEngine.triggerNeuralImpulse(1.6);
        this.hardwareRenderer.emitSparks(10);
        this.audioSynth.playNeuralPulse();
        this.telemetryMatrix.pushLogEvent({
          type: 'VOLUNTARY_IMPULSE',
          category: 'NEURAL',
          message: 'Manual voluntary motor burst injected. On-chip MUAP spike recruitment verified.'
        });
      });
    }

    // Freeze / Resume stream
    if (this.btnFreezeStream) {
      this.btnFreezeStream.addEventListener('click', () => {
        const isPaused = this.telemetryEngine.togglePause();
        this.btnFreezeStream.innerHTML = isPaused ? 
          `<svg class="w-3.5 h-3.5 inline mr-1 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg> Resume Stream` :
          `<svg class="w-3.5 h-3.5 inline mr-1 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> Freeze Telemetry`;
        
        this.btnFreezeStream.className = isPaused ? 
          'px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs font-mono font-medium hover:bg-emerald-900/50 transition-all' :
          'px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300 text-xs font-mono font-medium hover:border-cyan-500/40 hover:text-cyan-400 transition-all';

        this.telemetryMatrix.pushLogEvent({
          type: isPaused ? 'STREAM_PAUSED' : 'STREAM_RESUMED',
          category: 'NEURAL',
          message: isPaused ? 'Time-domain buffer frozen for forensic review.' : 'Continuous high-speed acquisition resumed.'
        });
      });
    }

    // Channel selection
    this.channelBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ch = e.currentTarget.dataset.channel;
        this.telemetryEngine.setChannel(ch);

        this.channelBtns.forEach(b => {
          b.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40', 'glow-cyan-sm');
          b.classList.add('text-slate-400', 'border-slate-800');
        });

        e.currentTarget.classList.remove('text-slate-400', 'border-slate-800');
        e.currentTarget.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40', 'glow-cyan-sm');
      });
    });

    // Gain Slider
    if (this.sliderGain) {
      this.sliderGain.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.telemetryEngine.setGain(val);
        if (this.valGain) this.valGain.innerText = `${val.toFixed(1)}x`;
      });
    }

    // Speed Slider
    if (this.sliderSpeed) {
      this.sliderSpeed.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.telemetryEngine.setSweepSpeed(val);
        if (this.valSpeed) this.valSpeed.innerText = `${val.toFixed(1)}x`;
      });
    }
  }

  applyState(state, playAudio = true) {
    this.activeState = state;

    // Propagate to subsystems
    this.telemetryEngine.setOperationalState(state);
    this.hardwareRenderer.setOperationalState(state);
    this.telemetryMatrix.setOperationalState(state);
    if (playAudio) {
      this.audioSynth.setOperationalState(state);
    }

    // Update Mode Buttons UI
    const defaultBtnClass = 'flex-1 py-3 px-4 rounded-xl border border-slate-800/80 bg-slate-900/40 text-slate-400 font-mono text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 hover:border-slate-700';

    if (this.btnRest) {
      this.btnRest.className = defaultBtnClass;
    }
    if (this.btnFocus) {
      this.btnFocus.className = defaultBtnClass;
    }
    if (this.btnOverload) {
      this.btnOverload.className = defaultBtnClass;
    }

    if (state === 'rest' && this.btnRest) {
      this.btnRest.className = 'flex-1 py-3 px-4 rounded-xl border border-cyan-500/50 bg-cyan-950/30 text-cyan-300 font-mono text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 glow-cyan-sm';
    } else if (state === 'focus' && this.btnFocus) {
      this.btnFocus.className = 'flex-1 py-3 px-4 rounded-xl border border-violet-500/50 bg-violet-950/30 text-violet-300 font-mono text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 glow-violet';
    } else if (state === 'overload' && this.btnOverload) {
      this.btnOverload.className = 'flex-1 py-3 px-4 rounded-xl border border-red-500/50 bg-red-950/30 text-red-300 font-mono text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 glow-crimson';
    }

    // Update Cockpit Container class for ambient glow
    if (this.cockpitContainer) {
      this.cockpitContainer.classList.remove('state-rest', 'state-focus', 'state-overload');
      this.cockpitContainer.classList.add(`state-${state}`);
    }

    // Update OS Status badge in nav header
    if (this.osStatusBadge) {
      let stateLabel = 'REST BASELINE';
      let dotColor = 'bg-cyan-400';
      if (state === 'focus') {
        stateLabel = 'ACTIVE FOCUS';
        dotColor = 'bg-violet-400';
      } else if (state === 'overload') {
        stateLabel = 'OVERLOAD TEST';
        dotColor = 'bg-red-400';
      }

      this.osStatusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full ${dotColor} beacon-active inline-block mr-1.5"></span>
        <span class="text-slate-300 font-mono text-xs">Vitals OS: <strong class="text-white">${stateLabel}</strong></span>
      `;
    }
  }
}

window.VitalsStateController = VitalsStateController;
