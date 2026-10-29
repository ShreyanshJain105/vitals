# Vitals — Enterprise Neuromuscular Telemetry & Wearable Health Cockpit

[![Vitals Version](https://img.shields.io/badge/Vitals%20OS-v3.8.4--edge-00f0ff?style=for-the-badge&logo=satellite)](https://github.com/ShreyanshJain105/vitals)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-10b981?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Community%20Local-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Canvas 60FPS](https://img.shields.io/badge/Rendering-HTML5%20Canvas%2060FPS-8b5cf6?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![License](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](LICENSE)

An enterprise-grade, high-performance web platform and interactive neural telemetry cockpit inspired by non-invasive neuromuscular telemetry architectures (e.g., Pison.com). 

**Vitals** transforms raw biopotential microvolts captured at the wrist into real-time motor unit action potentials (MUAP), brain-muscle frequency band decomposition ($\delta, \theta, \alpha, \beta, \gamma$), 60 FPS electrocardiogram (EKG) cardiac telemetry, mental fatigue/stress indices, and **continuous Blood Pressure (BP) monitoring with an automated Family Emergency SOS dispatch protocol** for hypertensive spikes and hypotensive step-down drops. All user accounts, paired devices, real-time telemetry frames, and SOS incident logs are stored directly in your local **MongoDB Community instance (`mongodb://127.0.0.1:27017/vitals_db`)**.

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [System Architecture & Data Flow](#-system-architecture--data-flow)
3. [Prerequisites](#-prerequisites)
4. [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
5. [User Guide & Walkthrough](#-user-guide--walkthrough)
6. [Emergency Family SOS System](#-emergency-family-sos-system)
7. [Dual Theme Engine (Obsidian Dark vs. MNC B&W)](#-dual-theme-engine)
8. [Database Schemas (MongoDB)](#-database-schemas-mongodb)
9. [REST API Documentation](#-rest-api-documentation)
10. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🌟 Key Features

### 1. Non-Invasive Neuromuscular Wristband Pairing
- Programmatic 3D vector/canvas visualizer of the **Vitals Band** with glowing copper-etched micro-circuits and 32 dry Ag/AgCl biopotential sensor pads.
- Proximity radar scanner supporting simulated UWB and BLE 5.4 channels with real-time RSSI, battery percentages, and electrode impedance checks ($17.8\,\mathrm{k\Omega}$).
- 4-phase pairing sequence synchronizing the deterministic 2,048 Hz biopotential clock with local MongoDB provisioning.

### 2. High-Frequency Biopotential Waveform Synthesizer (60 FPS)
- Multi-channel electromyographic (EMG) canvas synthesizer locked at 60 FPS:
  - **Channel 1 (Electric Cyan)**: Motor Unit Action Potentials (MUAP) with biphasic/triphasic discharge spikes.
  - **Channel 2 (Violet)**: Sub-dermal differential biopotential tone.
  - **Channel 3 (Emerald)**: Rectified neural intent envelope.
- Built-in **24-bin FFT Spectrum Analyzer (0–500 Hz)** with real-time peak hold.
- Calibrated oscilloscope graticule with $\pm 200\,\mu\mathrm{V}$ voltage ticks and $50\,\mathrm{ms}/\mathrm{div}$ timebase dividers.

### 3. Physiological Frequency Band Decomposition
Decomposes continuous 2,048 Hz biopotential signals into 5 physiological frequency bands:
- **$\delta$ Delta (0.5–4 Hz)**: Deep restorative resting tone & neuromuscular relaxation.
- **$\theta$ Theta (4–8 Hz)**: Cognitive flow state, spatial cognition, and procedural memory.
- **$\alpha$ Alpha (8–12 Hz)**: Calm focused attention & parasympathetic autonomic balance.
- **$\beta$ Beta (13–30 Hz)**: Active analytical cognitive processing & motor planning.
- **$\gamma$ Gamma (30–100 Hz)**: High-speed voluntary reflex & alpha-motor burst discharges.

### 4. Real-Time Cardiovascular EKG Telemetry
- HTML5 `<canvas>` rendering live **P-Q-R-S-T electrocardiogram complexes** at 60 FPS with glowing phosphor sweep trails.
- Live **Heart Rate (BPM)** counter dynamically fluctuating with sympathetic/parasympathetic tone.
- **Heart Rate Variability (HRV - RMSSD in ms)**: Clinical gold standard for autonomic resilience.
- **Pulse Oximetry ($SpO_2$)**: Continuous blood oxygenation tracking (~98.8%).

### 5. Mental Health & Cognitive State Tracking
- **Cognitive Focus Index (%)**: Real-time frontal-motor coherence score (>90%).
- **Mental Stress & Anxiety Index (%)**: Derived from HRV LF/HF ratios and neuromuscular tremor micro-noise.
- **Pre-Symptomatic Mental Fatigue**: Precursor exhaustion detector with a +4.2 hour predictive horizon.
- **Mental Readiness & Mood State**: Live state indicator ("Optimal Flow State", "Calm Alertness", "Recovery Indicated").
- **Neural Entropy Quotient**: 0.14 nE (low entropy indicates high stability).

### 6. Continuous Blood Pressure & Automated Family Emergency SOS
- Monitors Arterial Pulse Wave Analysis (PWA):
  - Systolic / Diastolic readout (mmHg), Mean Arterial Pressure (MAP), Pulse Pressure.
- **Automatic Anomaly Detection**:
  - **High BP Crisis**: Systolic $\ge 160$ or Diastolic $\ge 100\,\mathrm{mmHg}$.
  - **Hypotensive Step-Down**: Systolic $\le 90$ or Diastolic $\le 60\,\mathrm{mmHg}$ (sudden syncope/collapse risk).
- **10-Second Emergency Countdown**: Audible alarm with 10s cancel button ("False Alarm") or "Send SOS Now".
- **Family Cellular Dispatch**: Automatically sends emergency SMS notification to designated family contacts with live GPS coordinates (`37.7749° N, 122.4194° W`) and logs the incident in MongoDB `vitals_db.sos_alerts`.

### 7. Dual Theme Engine
- **Obsidian Cyber (Dark Mode)**: Pure cybernetic dark palette (`#0a0a0c` obsidian canvas, `#00f0ff` cyan, `#8b5cf6` violet).
- **Monochrome Enterprise (B&W Mode)**: Clean, high-contrast, clinical MNC luxury white/off-white canvas (`#f8fafc`), deep jet-black panels, stark typography, and high-visibility alert accents.
- **Continuous Animations**: All 60 FPS canvas loops adapt their contrast and continue running smoothly.

---

## 🏛️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Hardware [Vitals N1 Hardware Simulation]
        Sensors["32 Dry Ag/AgCl Electrodes"] --> ASIC["Vitals N1 Neuromorphic Core"]
        ASIC --> TelemetryBus["2,048 Hz Telemetry Bus (UWB/BLE 5.4)"]
    end

    subgraph Client [Browser - MNC Frontend Cockpit]
        TelemetryBus --> AuthMgr["Auth & Device Pairing (auth-device.js)"]
        AuthMgr --> EMG["60 FPS EMG Waveform Canvas (telemetry-engine.js)"]
        AuthMgr --> EKG["60 FPS Cardiac EKG Canvas (cardiac-renderer.js)"]
        AuthMgr --> BP["Blood Pressure & Emergency SOS (sos-system.js)"]
        BP --> Countdown["10s Family SOS Countdown Alert"]
        Countdown --> FamilySMS["Automated Cellular Dispatch + GPS"]
    end

    subgraph Backend [Node.js Engine (server.js)]
        Client -- "REST APIs & JWT" --> Endpoints["Auth, Devices, Telemetry, SOS"]
    end

    subgraph Database [Local MongoDB Community (127.0.0.1:27017)]
        Endpoints --> UsersCol["vitals_db.users"]
        Endpoints --> DevicesCol["vitals_db.devices"]
        Endpoints --> LogsCol["vitals_db.telemetry_logs (Every 2.5s)"]
        Endpoints --> AlertsCol["vitals_db.sos_alerts"]
    end
```

---

## 💻 Prerequisites

Before running the project on your machine, ensure you have the following installed:

1. **Node.js** (v18.0.0 or higher):
   - Check version: `node -v`
   - Download if needed: [https://nodejs.org/](https://nodejs.org/)
2. **MongoDB Community Server** (v6.0 or higher running on local port `27017`):
   - Check version: `mongod --version`
   - Download if needed: [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
3. **Git**:
   - Check version: `git --version`
   - Download if needed: [https://git-scm.com/](https://git-scm.com/)
4. A modern web browser (Google Chrome, Microsoft Edge, Brave, Firefox, or Safari).

---

## 🚀 Step-by-Step Installation & Setup

Follow these exact commands to clone and run the project on any computer:

### Step 1: Clone the Repository
Open PowerShell, Terminal, or Command Prompt:

```bash
git clone https://github.com/ShreyanshJain105/vitals.git
cd vitals
```

### Step 2: Install Dependencies
Install the required Node.js packages (official `mongodb` driver):

```bash
npm install
```

### Step 3: Ensure MongoDB Service is Running
Make sure your local MongoDB service is running on `mongodb://127.0.0.1:27017`:

- **Windows**:
  ```powershell
  # Check if MongoDB service is running
  Get-Service -Name "*mongo*"

  # If stopped, start it
  Start-Service -Name "MongoDB"
  ```
- **macOS (Homebrew)**:
  ```bash
  brew services start mongodb-community
  ```
- **Linux (systemd)**:
  ```bash
  sudo systemctl start mongod
  ```

### Step 4: Start the Vitals Telemetry Server
Run the backend application server:

```bash
node server.js
```

You will see:
```
[MongoDB] Connected successfully to mongodb://127.0.0.1:27017/vitals_db
[MongoDB] Seeded initial discoverable Vitals devices.
[Vitals Server] Active at http://localhost:3333
[Vitals Server] Telemetry connected to MongoDB: mongodb://127.0.0.1:27017/vitals_db
```

### Step 5: Open in Your Browser
Open your browser and navigate to:

👉 **`http://localhost:3333`** (Main Telemetry Cockpit & Dashboard)  
👉 **`http://localhost:3333/auth.html`** (Standalone Authentication Portal)

---

## 📖 User Guide & Walkthrough

### 1. Create an Account or Log In
1. In the navigation bar, click **"SIGN IN"** (or go to `http://localhost:3333/auth.html`).
2. Switch to **"CREATE ACCOUNT"**, enter your name, email, password, and organization, and click **"REGISTER WITH LOCAL MONGODB"**.
3. Credentials are encrypted and stored in `vitals_db.users`. You are issued a JWT session.

### 2. Connect Your Wearable Device
1. Upon login, the **Wearable Pairing Modal** opens automatically (or click **"CONNECT WEARABLE"** in the header).
2. The radar will scan and discover available Vitals wristbands from MongoDB (e.g. `Vitals N1 Band [Tactical Alpha]`).
3. Click **"CONNECT"**. Watch the 4-phase pairing sequence:
   - Encrypted handshake
   - Dry-contact impedance test (17.8 kΩ OK)
   - Clock synchronization (2,048 Hz)
   - Provisioning in MongoDB
4. You will be smoothly scrolled to your live **Personal Health Telemetry Dashboard**.

### 3. Observe Live Telemetry
- **EKG Cardiac Stream**: Watch the live P-Q-R-S-T cardiac complexes rendered at 60 FPS, synchronized with your heart rate.
- **Frequency Spectrum**: Observe real-time power shifts across Delta, Theta, Alpha, Beta, and Gamma bands.
- **Mental Focus & Stress**: Review your real-time cognitive resilience metrics.
- **MongoDB Auto-Sync**: Notice the green badge: `MongoDB: vitals_db.telemetry_logs (X frames logged)`. Telemetry frames are recorded automatically every 2.5 seconds.
- Click **"View MongoDB Telemetry"** to open an interactive drawer displaying all stored frames and calculated averages (average BPM, minimum/maximum BPM, average focus score, average stress).

---

## 🚨 Emergency Family SOS System

### How it Works:
1. The wristband continuously monitors arterial blood pressure.
2. In the **Continuous Blood Pressure & Family SOS Dispatch** section, click:
   - **"Simulate High BP Crisis (184/114)"** to test a hypertensive spike.
   - **"Simulate BP Step-Down (76/52)"** to test a sudden hypotensive collapse drop.
3. The **Emergency SOS Alert Modal** will immediately trigger with a visual strobe beacon and audible alarm.
4. An automated **10-second countdown** begins before cellular SMS dispatch:
   - Displays designated family contact: `Sarah Thorne (Spouse) - +1 (555) 234-5678`.
   - Displays real-time GPS coordinates: `37.7749° N, 122.4194° W`.
   - Displays current critical biometrics.
5. Click **"SEND SOS NOW"** (or let the timer reach zero) to confirm dispatch:
   - An incident record is written into MongoDB collection `vitals_db.sos_alerts`.
   - Confirmation receipt with delivery proof is displayed.
6. Click **"Cancel (False Alarm)"** to abort the countdown.
7. Click **"Family Contacts"** to add/remove your own family members and physicians (stored in MongoDB).
8. Click **"SOS Alert Logs"** to view past incident history queried from MongoDB.

---

## 🌓 Dual Theme Engine

Click the **"THEME: OBSIDIAN" / "THEME: B&W"** button in the navigation header to toggle between:

| Feature | Obsidian Cyber (Dark) | Monochrome Enterprise (B&W) |
| :--- | :--- | :--- |
| **Canvas Background** | Deep obsidian `#0a0a0c` | Stark high-contrast clinical white `#f8fafc` |
| **Card Styling** | Dark glassmorphism with cyan/violet glow | Crisp white surfaces with 1px dark slate borders |
| **Typography** | High-contrast electric cyan and white text | Deep obsidian `#0f172a` and slate `#475569` |
| **Waveform Canvases** | Phosphor cyan/violet/emerald glow | High-contrast monochrome & clinical red EKG |
| **Animations** | Continuous 60 FPS `requestAnimationFrame` | Continuous 60 FPS `requestAnimationFrame` |

---

## 🗄️ Database Schemas (MongoDB)

All data is stored in the `vitals_db` database on your local MongoDB instance:

### 1. `users` Collection
```json
{
  "_id": "ObjectId('6ae38f...')",
  "name": "Major Alex Thorne",
  "email": "alex.thorne@defense.aero",
  "passwordHash": "a8f3b2...",
  "salt": "d4e21c...",
  "organization": "Defense Flight Systems",
  "sector": "Aerospace & Defense",
  "connectedDevice": {
    "deviceId": "VN1-8942-ALPHA",
    "name": "Vitals N1 Band (Tactical Alpha)",
    "battery": 94,
    "sensorImpedance": "17.8 kΩ",
    "pairedAt": "2026-10-30T00:00:00.000Z"
  },
  "emergencyContacts": [
    {
      "id": "c1",
      "name": "Sarah Thorne",
      "relationship": "Spouse",
      "phone": "+1 (555) 234-5678",
      "email": "sarah.thorne@family.net",
      "notifySms": true
    }
  ],
  "createdAt": "2026-10-30T00:00:00.000Z"
}
```

### 2. `devices` Collection
```json
{
  "_id": "ObjectId('6ae39a...')",
  "deviceId": "VN1-8942-ALPHA",
  "name": "Vitals N1 Band (Tactical Alpha)",
  "model": "Vitals N1 Pro Biopotential Wristband",
  "firmware": "v3.8.4-edge",
  "battery": 94,
  "rssi": -42,
  "sensorImpedance": "17.8 kΩ",
  "channels": 32,
  "status": "paired",
  "assignedUserId": "6ae38f..."
}
```

### 3. `telemetry_logs` Collection (Every 2.5s)
```json
{
  "_id": "ObjectId('6ae39c...')",
  "userId": "6ae38f...",
  "deviceId": "VN1-8942-ALPHA",
  "timestamp": "2026-10-30T00:01:15.000Z",
  "heartRateBpm": 74,
  "bpSystolic": 118,
  "bpDiastolic": 76,
  "bpStatus": "Normal",
  "hrvRmssd": 61.2,
  "spo2": 98.9,
  "bandwidthHz": 2048.0,
  "cognitiveFocus": 96.4,
  "mentalStress": 18.5,
  "neuroFatigue": "Nominal",
  "frequencies": {
    "delta": 1.2,
    "theta": 5.8,
    "alpha": 11.2,
    "beta": 24.6,
    "gamma": 54.0
  },
  "gesture": "MICRO-PINCH CONFIRMED"
}
```

### 4. `sos_alerts` Collection
```json
{
  "_id": "ObjectId('6ae39f...')",
  "userId": "6ae38f...",
  "userName": "Major Alex Thorne",
  "deviceId": "VN1-8942-ALPHA",
  "timestamp": "2026-10-30T00:02:30.000Z",
  "alertType": "HIGH_BP_CRISIS",
  "systolicMmHg": 184,
  "diastolicMmHg": 114,
  "heartRateBpm": 112,
  "gpsLocation": "37.7749° N, 122.4194° W",
  "recipient": {
    "name": "Sarah Thorne",
    "relationship": "Spouse",
    "phone": "+1 (555) 234-5678"
  },
  "deliveryStatus": "DISPATCHED_CONFIRMED",
  "smsDelivered": true
}
```

---

## 📡 REST API Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/status` | Server and MongoDB connection health check | No |
| `POST` | `/api/auth/register` | Register new user account with hashed password | No |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer) |
| `GET` | `/api/devices/scan` | Discover nearby Vitals Band devices | No |
| `POST` | `/api/devices/pair` | Pair wearable device to user in MongoDB | Yes (Bearer) |
| `POST` | `/api/devices/disconnect`| Disconnect active wearable device | Yes (Bearer) |
| `POST` | `/api/telemetry/record` | Ingest real-time telemetry frame to MongoDB | Optional |
| `GET` | `/api/telemetry/recent` | Fetch recent telemetry frames for current user | Optional |
| `GET` | `/api/telemetry/summary`| Calculate aggregate metrics (avg BPM, stress) | Optional |
| `GET` | `/api/contacts` | Fetch emergency family contacts from MongoDB | Optional |
| `POST` | `/api/contacts` | Update emergency family contacts in MongoDB | Yes (Bearer) |
| `POST` | `/api/sos/trigger` | Trigger & log emergency SOS dispatch in MongoDB | Optional |
| `GET` | `/api/sos/history` | Retrieve historical emergency SOS incident logs | Optional |

---

## 🛠️ Troubleshooting & FAQs

### Q1: `MongoDB Connection error: connect ECONNREFUSED 127.0.0.1:27017`
- **Cause**: The local MongoDB service is not running.
- **Fix**: Open PowerShell as Administrator and run:
  ```powershell
  Start-Service -Name "MongoDB"
  ```
  Or verify that `mongod` is listening on port `27017`.

### Q2: Port 3333 is already in use
- **Cause**: Another process or previous server instance is occupying port 3333.
- **Fix**: Run:
  ```powershell
  # Windows: Find process and terminate
  netstat -ano | findstr :3333
  taskkill /PID <PID_NUMBER> /F
  ```
  Then restart with `node server.js`.

### Q3: How do I test the SOS alert without real hardware?
- In the dashboard, simply click **"Simulate High BP Crisis (184/114)"** or **"Simulate BP Step-Down (76/52)"**. The emergency countdown and automated family dispatch protocol will trigger immediately!

---

## 👩‍💻 Lead Architect & Engineering Credits

- **Principal Architect & Creative Technologist**: **Trishita Kanodia**
- **Design Inspiration**: [Dribbble — AI Financial & Biometric Intelligence Website (Shot 27848306)](https://dribbble.com/shots/27848306-AI-Financial-Intelligence-Website) featuring gapless bento grid architecture, floating glassmorphic pill navigation, and continuous cybernetic obsidian visuals.
- **Dedicated User Cockpit**: Distinct logged-in enterprise dashboard view providing real-time cardiovascular EKG, 5-band frequency decomposition, automated blood pressure SOS safeguards, and direct MongoDB ingress streaming.

---

## 📜 License & Compliance

- **License**: MIT License
- **Lead Developer**: **Trishita Kanodia**
- **Compliance Pathways**: Designed following FDA 510(k) Pre-Market Notification pathways, HIPAA-compliant biometric encryption, ISO 13485 medical device quality management, and SOC2 Type II audit standards.

Developed with precision by **Trishita Kanodia** for mission-critical enterprise telemetry.
