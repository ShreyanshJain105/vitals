# Vitals — Enterprise Neuromuscular & Wearable Telemetry Cockpit

An enterprise-grade, high-performance web platform and interactive neural telemetry cockpit for **Vitals** (inspired by Pison.com). Vitals connects non-invasive neuromuscular wristband hardware, real-time cardiac & biopotential frequency streams, cognitive mental health state tracking, **continuous Blood Pressure (BP) monitoring with automated Emergency Family SOS Dispatch for High BP spikes or Step-Down drops**, and stores all user and telemetry data directly into your local **MongoDB Community instance (`mongodb://127.0.0.1:27017`)**.

---

## ⚡ System Architecture

```
/
├── index.html                  # Landing page, cockpit, personal health suite & SOS engine
├── auth.html                   # Dedicated authentication portal (Sign in / Register)
├── css/
│   └── styles.css              # Cybernetic Dark Mode & MNC Black & White (.theme-bw) theme
├── js/
│   ├── sos-system.js           # Blood pressure monitoring, Family Emergency SOS & Theme controller
│   ├── auth-device.js          # User auth, BLE/UWB device pairing & MongoDB auto-sync engine
│   ├── cardiac-renderer.js     # 60 FPS HTML5 Canvas real-time EKG (P-Q-R-S-T) waveform synthesizer
│   ├── audio-synth.js          # Web Audio API biopotential acoustic sonification
│   ├── telemetry-engine.js     # 60 FPS multi-channel EMG canvas waveform synthesizer & FFT analyzer
│   ├── hardware-renderer.js    # Programmatic 3D vector/canvas wristband visualizer with live traces
│   ├── telemetry-matrix.js     # High-density numerical metrics, sparklines & event feed terminal
│   ├── state-controller.js     # Operational mode controller (Rest, Focus, Overload)
│   └── app.js                  # Modals, code sandbox tabs, fleet ingress & export features
├── server.js                   # Node.js backend with MongoDB drivers and REST API routes
└── package.json                # Dependencies (mongodb driver)
```

---

## 🚨 Blood Pressure (BP) Monitoring & Family Emergency SOS System

### 1. Continuous Arterial Pressure Telemetry
The Vitals wristband monitors pulse wave analysis (PWA) to compute continuous real-time Blood Pressure:
- **Systolic & Diastolic (mmHg)**: Nominal baseline `118 / 76 mmHg`.
- **Mean Arterial Pressure (MAP)**: $\frac{2 \times \text{Diastolic} + \text{Systolic}}{3}$.
- **Pulse Pressure**: $\text{Systolic} - \text{Diastolic}$.
- **Status Classification**:
  - `NORMAL`: Systolic 90–139, Diastolic 60–89 mmHg.
  - `HIGH BP CRISIS`: Systolic $\ge 160$ or Diastolic $\ge 100$ mmHg.
  - `HYPOTENSIVE STEP-DOWN`: Systolic $\le 90$ or Diastolic $\le 60$ mmHg (sudden syncope/collapse risk).

### 2. Automated Emergency Family SOS Protocol
When either a **High BP Spike** or a **Sudden Step-Down Drop** is detected, the automated SOS protocol triggers immediately:
- **10-Second Countdown Alarm**: Visual strobe alarm and audible alert with immediate manual override buttons:
  - *"Cancel SOS (False Alarm)"* — aborts countdown.
  - *"Send SOS Now"* — bypasses timer to dispatch immediately.
- **Automated Family Dispatch Details**:
  - Designated Family Contact (e.g. `Sarah Thorne (Spouse) - +1 (555) 234-5678`).
  - Current BP reading (`184 / 114 mmHg`) and heart rate.
  - Real-time GPS location lock (`37.7749° N, 122.4194° W (Accuracy: ±3m)`).
- **MongoDB Incident Record**: Creates a verified audit log in collection `vitals_db.sos_alerts`.
- **Family Contacts Manager**: Add and manage family members, physicians, phone numbers, and notification preferences.

### 3. Interactive SOS Simulations
In the dashboard, test the system using dedicated interactive simulation buttons:
- **"Simulate High BP Crisis (184/114)"**: Injects acute hypertensive spike $\to$ initiates emergency family dispatch.
- **"Simulate BP Step-Down (76/52)"**: Injects acute hypotensive drop $\to$ initiates emergency family dispatch.
- **"Reset to Normal BP (118/76)"**: Restores resting arterial baseline.

---

## 🌓 Black & White Theme (MNC Enterprise) vs. Obsidian Dark Mode

Click **"THEME: OBSIDIAN"** in the top navigation header to toggle between:
- **Obsidian Cyber (Dark Mode)**: Pure dark-mode cybernetic palette (`#0a0a0c` obsidian canvas, `#00f0ff` electric cyan accents, `#8b5cf6` violet gradients).
- **Monochrome Enterprise (Black & White Mode)**: Crisp, high-contrast, clinical MNC luxury white/off-white background, deep jet-black panels, stark typography, and high-visibility alerts.
- **Continuous 60 FPS Animations**: All canvas rendering pipelines (EMG waveform synthesizer, EKG cardiac trace, hardware wristband rotation/pulsing, FFT frequency bars) adapt contrast dynamically and continue running smoothly at 60 FPS with zero dropped frames.

---

## 🔐 Sign Up, Login & Wearable Device Connection

1. **Sign Up & Login**:
   - Register or sign in via the in-page modal or at **[`http://localhost:3333/auth.html`](http://localhost:3333/auth.html)**.
   - Credentials stored securely with cryptographic salting and hashing in MongoDB `vitals_db.users`.
2. **Connect Wearable**:
   - Click **"CONNECT WEARABLE"** to launch the radar scanner for nearby Vitals N1 wristbands.
   - 4-phase pairing sequence synchronizes the 2,048 Hz biopotential clock and saves the connection to MongoDB.
3. **Live Health Telemetry**:
   - Real-time frequency power decomposition ($\delta, \theta, \alpha, \beta, \gamma$).
   - Live EKG cardiac waveform (P-Q-R-S-T) with Heart Rate (BPM), HRV (RMSSD), and $SpO_2$.
   - Mental Health & Cognitive State tracking (Focus %, Stress %, Fatigue %, Readiness).
   - Telemetry frames automatically saved to `vitals_db.telemetry_logs` every 2.5 seconds.

---

## 🗄️ Local MongoDB Integration (`mongodb://127.0.0.1:27017`)

- **Database**: `vitals_db`
- **Collections**:
  - `users`: User profiles, hashed passwords, linked wearable device, emergency family contacts.
  - `devices`: Discovered and paired Vitals N1 wristbands.
  - `telemetry_logs`: Real-time biopotential, cardiac, BP, and mental health telemetry frames.
  - `sos_alerts`: Emergency SOS incidents dispatched to family contacts with GPS coordinates.

---

## 🚀 Running the Application

Ensure MongoDB Community is running (`mongodb://127.0.0.1:27017`), then:

```powershell
node server.js
```

Open in your browser:
- **Main Platform & Cockpit**: [`http://localhost:3333`](http://localhost:3333)
- **Direct Auth Portal**: [`http://localhost:3333/auth.html`](http://localhost:3333/auth.html)
