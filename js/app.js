/**
 * Vitals Application Orchestrator
 * Principal Frontend Architecture & Component Binding
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Subsystems
  const audioSynth = new VitalsAudioSynth();
  
  const telemetryEngine = new VitalsTelemetryEngine('waveform-canvas', {
    onNeuralBurst: (burst) => {
      audioSynth.playNeuralPulse();
    }
  });

  const hardwareRenderer = new VitalsHardwareRenderer('hardware-canvas', 'hardware-container');
  const telemetryMatrix = new VitalsTelemetryMatrix();
  const stateController = new VitalsStateController(telemetryEngine, hardwareRenderer, telemetryMatrix, audioSynth);

  // 2. Audio Toggle Setup
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const audioIcon = document.getElementById('audio-icon');
  const audioStatusText = document.getElementById('audio-status-text');

  if (btnAudioToggle) {
    btnAudioToggle.addEventListener('click', () => {
      const isMuted = audioSynth.toggleMute();
      if (isMuted) {
        audioIcon.innerHTML = `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>`;
        if (audioStatusText) audioStatusText.innerText = "Acoustic Stream: Muted";
        btnAudioToggle.classList.remove('border-cyan-500/40', 'bg-cyan-950/30', 'text-cyan-300');
        btnAudioToggle.classList.add('border-slate-800', 'text-slate-400');
      } else {
        audioIcon.innerHTML = `<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>`;
        if (audioStatusText) audioStatusText.innerText = "Acoustic Stream: 55Hz";
        btnAudioToggle.classList.add('border-cyan-500/40', 'bg-cyan-950/30', 'text-cyan-300');
        btnAudioToggle.classList.remove('border-slate-800', 'text-slate-400');
      }
    });
  }

  // 3. Telemetry Log Filter Tabs
  const logFilterBtns = document.querySelectorAll('.log-filter-btn');
  logFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      telemetryMatrix.setFilter(filter);

      logFilterBtns.forEach(b => {
        b.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
        b.classList.add('text-slate-400', 'border-slate-800');
      });

      e.target.classList.remove('text-slate-400', 'border-slate-800');
      e.target.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
    });
  });

  // 4. Export Telemetry Snapshot
  const btnExport = document.getElementById('btn-export-telemetry');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      telemetryMatrix.exportTelemetryJSON();
    });
  }

  // 5. Fleet Subject Selector
  const fleetPills = document.querySelectorAll('.fleet-subject-pill');
  const fleetActiveName = document.getElementById('fleet-subject-name');
  const fleetActiveRole = document.getElementById('fleet-subject-role');

  fleetPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      const subject = pill.dataset.subject;
      const role = pill.dataset.role;

      fleetPills.forEach(p => p.classList.remove('border-cyan-500/60', 'bg-cyan-950/40', 'text-white'));
      pill.classList.add('border-cyan-500/60', 'bg-cyan-950/40', 'text-white');

      if (fleetActiveName) fleetActiveName.innerText = subject;
      if (fleetActiveRole) fleetActiveRole.innerText = role;

      telemetryMatrix.pushLogEvent({
        type: 'FLEET_ROUTING',
        category: 'ALERTS',
        message: `Switched telemetry ingress channel to [${subject}]: ${role}. Stream buffer re-synced.`
      });
      telemetryEngine.triggerNeuralImpulse(1.2);
    });
  });

  // 6. Interactive SDK Code Tabs
  const codeTabs = document.querySelectorAll('.code-tab-btn');
  const codeContent = document.getElementById('code-display-block');
  const codeSnippets = {
    python: `import asyncio
from vitals_sdk import VitalsTelemetryStream, OperationalMode

async def listen_biopotential_stream():
    # Connect to Vitals N1 wristband telemetry bus via encrypted TLS 1.3
    async with VitalsTelemetryStream(device_id="vitals-band-alpha-01", sampling_rate_hz=2048) as stream:
        print(f"Connected to Vitals N1 Engine [Firmware: {stream.firmware_version}]")
        
        async for packet in stream.subscribe_raw_emg(channels=["ch1_muap", "ch2_differential"]):
            # Sub-voxel motor unit action potential (MUAP) detection
            if packet.has_motor_intent_spike():
                print(f"[MUAP Trigger] Latency: {packet.inference_latency_ms:.2f}ms | Conf: {packet.confidence * 100:.1f}%")
                
            # Pre-symptomatic cognitive fatigue telemetry
            if packet.cognitive_fatigue_index > 0.75:
                print(f"[ALERT] Pre-symptomatic central nervous exhaustion detected: {packet.fatigue_status}")

asyncio.run(listen_biopotential_stream())`,

    cpp: `#include <vitals/neural_engine.hpp>
#include <iostream>

int main() {
    // Zero-allocation, high-throughput 2,048 Hz raw EMG ingress pipeline
    vitals::HardwareConfig config{
        .device_id = "vitals-band-alpha-01",
        .adc_resolution_bits = 24,
        .dma_ring_buffer_depth = 4096,
        .zero_copy_mode = true
    };

    vitals::NeuralEngine engine(config);
    engine.Initialize();

    engine.SetGestureCallback([](const vitals::DecodedIntent& intent) {
        if (intent.confidence >= 0.99f) {
            std::cout << "[INTENT MATCH] ID: " << intent.gesture_id 
                      << " | Microcode Latency: " << intent.latency_micros << " µs\\n";
        }
    });

    engine.StartContinuousAcquisition();
    return 0;
}`,

    websocket: `// Enterprise WebSocket Real-time Ingestion Stream
const ws = new WebSocket('wss://telemetry.vitals.enterprise/v1/stream?token=JWT_AIRGAPPED_TOKEN');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: "SUBSCRIBE_TELEMETRY",
    channels: ["CH1_MUAP", "CH2_DIFF", "COGNITIVE_INDEX", "FATIGUE_PREDICTOR"],
    rate_hz: 2048,
    precision: "FLOAT32"
  }));
};

ws.onmessage = (event) => {
  const telemetryFrame = JSON.parse(event.data);
  // Latency calculation from wristband timestamp
  const roundtripMs = performance.now() - telemetryFrame.t_client_sent;
  console.log(\`Received 32-ch packet #\${telemetryFrame.seq_id} [Processing: \${telemetryFrame.latency_ms}ms]\`);
};`,

    rust: `use vitals_rs::{VitalsClient, TelemetryPacket, ChannelType};
use tokio_stream::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = VitalsClient::builder()
        .connect_uwb("00:1A:7D:DA:71:13")
        .await?;

    let mut telemetry_stream = client.stream_biopotentials(ChannelType::AllChannels).await?;

    while let Some(packet) = telemetry_stream.next().await {
        println!(
            "Bandwidth: {} Hz | Focus: {:.1}% | Motor Spike: {} µV",
            packet.sampling_rate,
            packet.cognitive_focus_index * 100.0,
            packet.peak_voltage_uv
        );
    }
    Ok(())
}`
  };

  codeTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const lang = e.currentTarget.dataset.lang;
      if (codeSnippets[lang] && codeContent) {
        codeContent.textContent = codeSnippets[lang];

        codeTabs.forEach(t => {
          t.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
          t.classList.add('text-slate-400', 'border-slate-800');
        });

        e.currentTarget.classList.remove('text-slate-400', 'border-slate-800');
        e.currentTarget.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
      }
    });
  });

  // Copy code button
  const btnCopyCode = document.getElementById('btn-copy-code');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      if (codeContent) {
        navigator.clipboard.writeText(codeContent.textContent).then(() => {
          const originalHTML = btnCopyCode.innerHTML;
          btnCopyCode.innerHTML = `<svg class="w-3.5 h-3.5 text-emerald-400 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!`;
          setTimeout(() => {
            btnCopyCode.innerHTML = originalHTML;
          }, 2000);
        });
      }
    });
  }

  // 7. Enterprise Demo Modal
  const modalDemo = document.getElementById('demo-modal');
  const btnOpenDemos = document.querySelectorAll('.btn-open-demo');
  const btnCloseDemo = document.getElementById('btn-close-demo');
  const formDemo = document.getElementById('demo-form');
  const modalFormContent = document.getElementById('modal-form-content');
  const modalSuccessContent = document.getElementById('modal-success-content');
  const btnResetDemoModal = document.getElementById('btn-reset-demo-modal');

  const openDemoModal = () => {
    if (modalDemo) {
      modalDemo.classList.remove('hidden');
      modalDemo.classList.add('flex');
      document.body.style.overflow = 'hidden';
    }
  };

  const closeDemoModal = () => {
    if (modalDemo) {
      modalDemo.classList.add('hidden');
      modalDemo.classList.remove('flex');
      document.body.style.overflow = '';
    }
  };

  btnOpenDemos.forEach(btn => btn.addEventListener('click', openDemoModal));
  if (btnCloseDemo) btnCloseDemo.addEventListener('click', closeDemoModal);

  // Close modal on backdrop click
  if (modalDemo) {
    modalDemo.addEventListener('click', (e) => {
      if (e.target === modalDemo) closeDemoModal();
    });
  }

  // Form submit handler with simulated enterprise provisioning
  if (formDemo) {
    formDemo.addEventListener('submit', (e) => {
      e.preventDefault();
      const btnSubmit = formDemo.querySelector('button[type="submit"]');
      const originalSubmitText = btnSubmit.innerHTML;

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-black inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Initializing Provisioning Enclave...
      `;

      setTimeout(() => {
        if (modalFormContent) modalFormContent.classList.add('hidden');
        if (modalSuccessContent) modalSuccessContent.classList.remove('hidden');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalSubmitText;
      }, 1200);
    });
  }

  if (btnResetDemoModal) {
    btnResetDemoModal.addEventListener('click', () => {
      if (modalSuccessContent) modalSuccessContent.classList.add('hidden');
      if (modalFormContent) modalFormContent.classList.remove('hidden');
      if (formDemo) formDemo.reset();
      closeDemoModal();
    });
  }

  // 8. Mobile Navigation Toggle
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const mobileNavMenu = document.getElementById('mobile-nav-menu');

  if (btnMobileMenu && mobileNavMenu) {
    btnMobileMenu.addEventListener('click', () => {
      mobileNavMenu.classList.toggle('hidden');
    });

    // Close menu when clicking links
    mobileNavMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNavMenu.classList.add('hidden');
      });
    });
  }

  // 9. Interactive Hardware Hotspots
  const hotspots = document.querySelectorAll('.sensor-hotspot');
  const hotspotPopover = document.getElementById('hotspot-popover');
  const popoverTitle = document.getElementById('popover-title');
  const popoverDesc = document.getElementById('popover-desc');

  const hotspotData = {
    core: {
      title: "Vitals N1 Neuromorphic Core",
      desc: "Custom on-chip neural inference ASIC consuming <1.2W with 512 TOPS/W INT8 efficiency. Processes 2,048 Hz raw EMG into intent vectors in <3ms."
    },
    sensor: {
      title: "Dry-Contact Ag/AgCl Micro-Array",
      desc: "32-channel radial contact array requiring zero skin prep or conductive gels. Features 24-bit ADCs and an unprecedented 142 dB Common Mode Rejection Ratio."
    },
    uwb: {
      title: "Deterministic UWB / BLE 5.4 Bus",
      desc: "Hardware-enclave encrypted wireless telemetry link ensuring zero dropped packets and sub-3.5ms end-to-end transport latency."
    },
    haptic: {
      title: "Resonant Linear Magnetic Actuator",
      desc: "High-bandwidth vibrotactile engine providing sub-millisecond physical confirmation impulses for decoded spatial gestures and cognitive alerts."
    }
  };

  hotspots.forEach(spot => {
    spot.addEventListener('mouseenter', (e) => {
      const type = spot.dataset.hotspot;
      if (hotspotData[type] && hotspotPopover && popoverTitle && popoverDesc) {
        popoverTitle.innerText = hotspotData[type].title;
        popoverDesc.innerText = hotspotData[type].desc;
        hotspotPopover.classList.remove('opacity-0', 'pointer-events-none');
      }
    });

    spot.addEventListener('mouseleave', () => {
      if (hotspotPopover) {
        hotspotPopover.classList.add('opacity-0', 'pointer-events-none');
      }
    });
  });

  // Log confirmation in console
  console.log("%c Vitals OS Telemetry Cockpit v3.8.4 Online ", "background: #00f0ff; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;");
});
