/**
 * Vitals User Authentication & Wearable Device Pairing System
 * Manages user sessions, Web BLE/UWB device pairing, and live MongoDB telemetry synchronization.
 */

class VitalsAuthDeviceManager {
  constructor() {
    this.token = localStorage.getItem('vitals_auth_token') || null;
    this.currentUser = null;
    this.connectedDevice = null;
    this.isDeviceConnected = false;
    this.syncInterval = null;
    this.cardiacRenderer = null;

    // Live Health Metrics State
    this.healthState = {
      bpm: 72,
      hrvRmssd: 58.4,
      spo2: 98.8,
      focus: 89.2,
      stress: 22.4,
      fatigueScore: 16.0,
      fatigueLabel: 'Nominal',
      mentalReadiness: 'Optimal Flow State',
      frequencies: {
        delta: 2.1,  // 0.5-4 Hz (Rest)
        theta: 6.4,  // 4-8 Hz (Flow)
        alpha: 11.2, // 8-12 Hz (Calm focus)
        beta: 22.8,  // 13-30 Hz (Active analysis)
        gamma: 48.5  // 30-100 Hz (Motor burst)
      },
      mongoFramesLogged: 0
    };

    // DOM Elements - Navigation & Auth
    this.navAuthBtn = document.getElementById('nav-auth-btn');
    this.navUserMenu = document.getElementById('nav-user-menu');
    this.navUserName = document.getElementById('nav-user-name');
    this.navUserAvatar = document.getElementById('nav-user-avatar');
    this.navDeviceStatus = document.getElementById('nav-device-status');
    this.navLogoutBtn = document.getElementById('nav-logout-btn');

    // Auth Modal Elements
    this.authModal = document.getElementById('auth-modal');
    this.btnCloseAuth = document.getElementById('btn-close-auth');
    this.authTabLogin = document.getElementById('auth-tab-login');
    this.authTabRegister = document.getElementById('auth-tab-register');
    this.authFormLogin = document.getElementById('auth-form-login');
    this.authFormRegister = document.getElementById('auth-form-register');
    this.authErrorBox = document.getElementById('auth-error-box');

    // Device Pairing Modal Elements
    this.pairingModal = document.getElementById('pairing-modal');
    this.btnClosePairing = document.getElementById('btn-close-pairing');
    this.btnOpenPairing = document.getElementById('btn-open-pairing');
    this.deviceScanList = document.getElementById('device-scan-list');
    this.pairingProgressView = document.getElementById('pairing-progress-view');
    this.pairingProgressStep = document.getElementById('pairing-progress-step');
    this.pairingProgressBar = document.getElementById('pairing-progress-bar');
    this.pairingDeviceListView = document.getElementById('pairing-device-list-view');

    // Personal Health Dashboard Elements
    this.healthDashboardSection = document.getElementById('personal-health-dashboard');
    this.unconnectedPromptBanner = document.getElementById('unconnected-prompt-banner');
    this.connectedDevicePill = document.getElementById('connected-device-pill');
    this.btnDisconnectDevice = document.getElementById('btn-disconnect-device');
    this.btnViewMongoHistory = document.getElementById('btn-view-mongo-history');

    // MongoDB History Modal Elements
    this.mongoHistoryModal = document.getElementById('mongo-history-modal');
    this.btnCloseMongoHistory = document.getElementById('btn-close-mongo-history');
    this.mongoHistoryTableBody = document.getElementById('mongo-history-table-body');
    this.mongoHistorySummary = document.getElementById('mongo-history-summary');

    this.init();
  }

  async init() {
    this.bindEvents();
    
    // Initialize Cardiac Waveform Renderer
    this.cardiacRenderer = new VitalsCardiacRenderer('cardiac-waveform-canvas');

    // Restore existing session
    if (this.token) {
      await this.fetchCurrentUser();
    } else {
      this.updateUIForLoggedOut();
    }

    // Start live health metrics oscillator
    this.startLiveHealthSimulation();
  }

  bindEvents() {
    // Auth Modal Open
    if (this.navAuthBtn) {
      this.navAuthBtn.addEventListener('click', () => this.openAuthModal('login'));
    }

    const openAuthBtns = document.querySelectorAll('.btn-trigger-auth');
    openAuthBtns.forEach(btn => {
      btn.addEventListener('click', () => this.openAuthModal('register'));
    });

    if (this.btnCloseAuth) {
      this.btnCloseAuth.addEventListener('click', () => this.closeAuthModal());
    }

    // Auth Tabs
    if (this.authTabLogin) {
      this.authTabLogin.addEventListener('click', () => this.switchAuthTab('login'));
    }
    if (this.authTabRegister) {
      this.authTabRegister.addEventListener('click', () => this.switchAuthTab('register'));
    }

    // Forms
    if (this.authFormLogin) {
      this.authFormLogin.addEventListener('submit', (e) => this.handleLogin(e));
    }
    if (this.authFormRegister) {
      this.authFormRegister.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Logout
    if (this.navLogoutBtn) {
      this.navLogoutBtn.addEventListener('click', () => this.logout());
    }

    // Pairing Modal
    if (this.btnOpenPairing) {
      this.btnOpenPairing.addEventListener('click', () => this.openPairingModal());
    }
    if (this.navDeviceStatus) {
      this.navDeviceStatus.addEventListener('click', () => {
        if (!this.currentUser) {
          this.openAuthModal('login');
        } else {
          this.openPairingModal();
        }
      });
    }
    if (this.btnClosePairing) {
      this.btnClosePairing.addEventListener('click', () => this.closePairingModal());
    }

    // Disconnect Device
    if (this.btnDisconnectDevice) {
      this.btnDisconnectDevice.addEventListener('click', () => this.disconnectDevice());
    }

    // View MongoDB History
    if (this.btnViewMongoHistory) {
      this.btnViewMongoHistory.addEventListener('click', () => this.openMongoHistoryModal());
    }
    if (this.btnCloseMongoHistory) {
      this.btnCloseMongoHistory.addEventListener('click', () => this.closeMongoHistoryModal());
    }

    // Close modals on backdrop click
    window.addEventListener('click', (e) => {
      if (e.target === this.authModal) this.closeAuthModal();
      if (e.target === this.pairingModal) this.closePairingModal();
      if (e.target === this.mongoHistoryModal) this.closeMongoHistoryModal();
    });

    // View Routing Toggles
    const btnPreviewPublic = document.getElementById('btn-preview-public');
    if (btnPreviewPublic) {
      btnPreviewPublic.addEventListener('click', () => this.togglePublicPreview(true));
    }

    const btnReturnCockpit = document.getElementById('btn-return-cockpit');
    if (btnReturnCockpit) {
      btnReturnCockpit.addEventListener('click', () => this.togglePublicPreview(false));
    }

    const navDashboardToggleBtn = document.getElementById('nav-dashboard-toggle-btn');
    if (navDashboardToggleBtn) {
      navDashboardToggleBtn.addEventListener('click', () => {
        if (this.currentUser) {
          this.showDashboardView();
        } else {
          this.openAuthModal('login');
        }
      });
    }

    const navViewPublicBtn = document.getElementById('nav-view-public-btn');
    if (navViewPublicBtn) {
      navViewPublicBtn.addEventListener('click', () => this.togglePublicPreview(true));
    }
  }

  // ==========================================
  // VIEW ROUTING: PUBLIC SITE VS AUTHENTICATED COCKPIT
  // ==========================================

  showDashboardView() {
    const publicView = document.getElementById('view-public');
    const dashboardView = document.getElementById('view-dashboard');
    const previewBanner = document.getElementById('public-preview-banner');
    const navDashboardBtn = document.getElementById('nav-dashboard-toggle-btn');
    const navPublicLinks = document.getElementById('nav-public-links');
    const navDashboardLinks = document.getElementById('nav-dashboard-links');

    if (publicView) publicView.classList.add('view-hidden');
    if (dashboardView) dashboardView.classList.remove('view-hidden');
    if (previewBanner) previewBanner.classList.add('hidden');
    if (navDashboardBtn) navDashboardBtn.classList.remove('hidden');
    
    if (navPublicLinks) {
      navPublicLinks.classList.add('hidden');
      navPublicLinks.classList.remove('lg:flex');
    }
    if (navDashboardLinks) {
      navDashboardLinks.classList.remove('hidden');
      navDashboardLinks.classList.add('lg:flex');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 80);
  }

  showPublicView() {
    const publicView = document.getElementById('view-public');
    const dashboardView = document.getElementById('view-dashboard');
    const previewBanner = document.getElementById('public-preview-banner');
    const navDashboardBtn = document.getElementById('nav-dashboard-toggle-btn');
    const navPublicLinks = document.getElementById('nav-public-links');
    const navDashboardLinks = document.getElementById('nav-dashboard-links');

    if (dashboardView) dashboardView.classList.add('view-hidden');
    if (publicView) publicView.classList.remove('view-hidden');
    if (previewBanner) previewBanner.classList.add('hidden');
    
    if (navDashboardLinks) {
      navDashboardLinks.classList.add('hidden');
      navDashboardLinks.classList.remove('lg:flex');
    }
    if (navPublicLinks) {
      navPublicLinks.classList.remove('hidden');
      navPublicLinks.classList.add('lg:flex');
    }

    if (navDashboardBtn) {
      if (this.currentUser) navDashboardBtn.classList.remove('hidden');
      else navDashboardBtn.classList.add('hidden');
    }

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 80);
  }

  togglePublicPreview(showPublic) {
    const publicView = document.getElementById('view-public');
    const dashboardView = document.getElementById('view-dashboard');
    const previewBanner = document.getElementById('public-preview-banner');
    const navPublicLinks = document.getElementById('nav-public-links');
    const navDashboardLinks = document.getElementById('nav-dashboard-links');

    if (showPublic) {
      if (dashboardView) dashboardView.classList.add('view-hidden');
      if (publicView) publicView.classList.remove('view-hidden');
      if (previewBanner) previewBanner.classList.remove('hidden');
      if (navDashboardLinks) {
        navDashboardLinks.classList.add('hidden');
        navDashboardLinks.classList.remove('lg:flex');
      }
      if (navPublicLinks) {
        navPublicLinks.classList.remove('hidden');
        navPublicLinks.classList.add('lg:flex');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (publicView) publicView.classList.add('view-hidden');
      if (dashboardView) dashboardView.classList.remove('view-hidden');
      if (previewBanner) previewBanner.classList.add('hidden');
      if (navPublicLinks) {
        navPublicLinks.classList.add('hidden');
        navPublicLinks.classList.remove('lg:flex');
      }
      if (navDashboardLinks) {
        navDashboardLinks.classList.remove('hidden');
        navDashboardLinks.classList.add('lg:flex');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 80);
  }

  // ==========================================
  // AUTHENTICATION LOGIC
  // ==========================================

  openAuthModal(tab = 'login') {
    if (this.authModal) {
      this.authModal.classList.remove('hidden');
      this.authModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
      this.switchAuthTab(tab);
      this.clearAuthError();
    }
  }

  closeAuthModal() {
    if (this.authModal) {
      this.authModal.classList.add('hidden');
      this.authModal.classList.remove('flex');
      document.body.style.overflow = '';
      this.clearAuthError();
    }
  }

  switchAuthTab(tab) {
    if (tab === 'login') {
      this.authTabLogin.className = 'flex-1 py-2 rounded-lg font-mono text-xs font-semibold bg-cyanCore text-black shadow-md transition-all';
      this.authTabRegister.className = 'flex-1 py-2 rounded-lg font-mono text-xs font-semibold text-slate-400 hover:text-white transition-all';
      this.authFormLogin.classList.remove('hidden');
      this.authFormRegister.classList.add('hidden');
    } else {
      this.authTabRegister.className = 'flex-1 py-2 rounded-lg font-mono text-xs font-semibold bg-cyanCore text-black shadow-md transition-all';
      this.authTabLogin.className = 'flex-1 py-2 rounded-lg font-mono text-xs font-semibold text-slate-400 hover:text-white transition-all';
      this.authFormRegister.classList.remove('hidden');
      this.authFormLogin.classList.add('hidden');
    }
    this.clearAuthError();
  }

  showAuthError(msg) {
    if (this.authErrorBox) {
      this.authErrorBox.innerText = msg;
      this.authErrorBox.classList.remove('hidden');
    }
  }

  clearAuthError() {
    if (this.authErrorBox) {
      this.authErrorBox.innerText = '';
      this.authErrorBox.classList.add('hidden');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    this.clearAuthError();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const btn = this.authFormLogin.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'Verifying Credentials...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('vitals_auth_token', data.token);

      this.closeAuthModal();
      this.updateUIForLoggedIn();

      // If user has no connected device yet, prompt to connect
      if (!this.currentUser.connectedDevice) {
        setTimeout(() => this.openPairingModal(), 400);
      }
    } catch (err) {
      this.showAuthError(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'AUTHENTICATE & ENTER COCKPIT';
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    this.clearAuthError();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const organization = document.getElementById('reg-org').value;
    const sector = document.getElementById('reg-sector').value;

    const btn = this.authFormRegister.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'Registering with MongoDB...';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organization, sector })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('vitals_auth_token', data.token);

      this.closeAuthModal();
      this.updateUIForLoggedIn();

      // Open device pairing modal automatically for new users!
      setTimeout(() => this.openPairingModal(), 400);
    } catch (err) {
      this.showAuthError(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'CREATE VITALS ACCOUNT';
    }
  }

  async fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!res.ok) throw new Error('Session expired');
      const data = await res.json();
      this.currentUser = data.user;
      this.updateUIForLoggedIn();
    } catch (err) {
      console.warn('Session restoration failed:', err);
      this.logout();
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    this.connectedDevice = null;
    this.isDeviceConnected = false;
    localStorage.removeItem('vitals_auth_token');
    this.stopMongoSync();
    this.updateUIForLoggedOut();
  }

  updateUIForLoggedIn() {
    if (!this.currentUser) return;

    if (this.navAuthBtn) this.navAuthBtn.classList.add('hidden');
    if (this.navUserMenu) this.navUserMenu.classList.remove('hidden');

    if (this.navUserName) this.navUserName.innerText = this.currentUser.name;
    if (this.navUserAvatar) {
      const initials = this.currentUser.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
      this.navUserAvatar.innerText = initials || 'V';
    }

    // Switch view to dedicated enterprise cockpit dashboard
    this.showDashboardView();

    // Connected device state
    if (this.currentUser.connectedDevice) {
      this.connectedDevice = this.currentUser.connectedDevice;
      this.isDeviceConnected = true;
      this.renderDeviceConnectedState();
      this.startMongoSync();
    } else {
      this.connectedDevice = null;
      this.isDeviceConnected = false;
      this.renderDeviceDisconnectedState();
      this.stopMongoSync();
    }
  }

  updateUIForLoggedOut() {
    if (this.navAuthBtn) this.navAuthBtn.classList.remove('hidden');
    if (this.navUserMenu) this.navUserMenu.classList.add('hidden');
    this.renderDeviceDisconnectedState();
    this.showPublicView();
  }

  // ==========================================
  // WEARABLE DEVICE PAIRING
  // ==========================================

  async openPairingModal() {
    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }

    if (this.pairingModal) {
      this.pairingModal.classList.remove('hidden');
      this.pairingModal.classList.add('flex');
      document.body.style.overflow = 'hidden';

      // Reset views
      if (this.pairingProgressView) this.pairingProgressView.classList.add('hidden');
      if (this.pairingDeviceListView) this.pairingDeviceListView.classList.remove('hidden');

      await this.scanForDevices();
    }
  }

  closePairingModal() {
    if (this.pairingModal) {
      this.pairingModal.classList.add('hidden');
      this.pairingModal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }

  async scanForDevices() {
    if (!this.deviceScanList) return;
    this.deviceScanList.innerHTML = `
      <div class="py-8 text-center space-y-3 font-mono text-xs text-slate-400">
        <div class="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
        <div>Scanning local UWB / BLE 5.4 biopotential frequencies...</div>
      </div>
    `;

    try {
      const res = await fetch('/api/devices/scan');
      const data = await res.json();
      const devices = data.discoveredDevices || [];

      if (devices.length === 0) {
        this.deviceScanList.innerHTML = `<div class="p-6 text-center font-mono text-xs text-slate-400">No Vitals Band discovered in proximity. Ensure device is powered on.</div>`;
        return;
      }

      this.deviceScanList.innerHTML = '';
      devices.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between transition-all group';
        card.innerHTML = `
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm">
              N1
            </div>
            <div>
              <div class="font-outfit font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">${dev.name}</div>
              <div class="font-mono text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>ID: ${dev.deviceId}</span>
                <span>&bull;</span>
                <span class="text-emerald-400">Battery: ${dev.battery}%</span>
                <span>&bull;</span>
                <span>32-Ch Dry Ag/AgCl</span>
              </div>
            </div>
          </div>
          <button class="btn-pair-device px-4 py-2 rounded-xl bg-cyanCore hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-all active:scale-95 glow-cyan-sm" data-id="${dev.deviceId}">
            CONNECT
          </button>
        `;

        card.querySelector('.btn-pair-device').addEventListener('click', () => {
          this.executeDevicePairing(dev);
        });

        this.deviceScanList.appendChild(card);
      });
    } catch (err) {
      this.deviceScanList.innerHTML = `<div class="p-4 text-center text-red-400 font-mono text-xs">Error scanning devices: ${err.message}</div>`;
    }
  }

  async executeDevicePairing(device) {
    if (this.pairingDeviceListView) this.pairingDeviceListView.classList.add('hidden');
    if (this.pairingProgressView) this.pairingProgressView.classList.remove('hidden');

    const steps = [
      { text: `Initiating UWB handshake with ${device.deviceId}...`, progress: 25 },
      { text: `Running 32-channel dry Ag/AgCl impedance calibration (17.8 kΩ OK)...`, progress: 55 },
      { text: `Synchronizing 2,048 Hz biopotential clock & PTP timebase...`, progress: 85 },
      { text: `Device linked! Provisioning user telemetry channel in MongoDB...`, progress: 100 }
    ];

    for (let i = 0; i < steps.length; i++) {
      if (this.pairingProgressStep) this.pairingProgressStep.innerText = steps[i].text;
      if (this.pairingProgressBar) this.pairingProgressBar.style.width = `${steps[i].progress}%`;
      await new Promise(r => setTimeout(r, 450));
    }

    try {
      const res = await fetch('/api/devices/pair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ deviceId: device.deviceId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pair device');

      this.connectedDevice = data.device;
      this.isDeviceConnected = true;
      this.currentUser.connectedDevice = data.device;

      await new Promise(r => setTimeout(r, 600));
      this.closePairingModal();
      this.renderDeviceConnectedState();
      this.startMongoSync();

      // Smooth scroll to personal health dashboard
      if (this.healthDashboardSection) {
        this.healthDashboardSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      alert(`Pairing Error: ${err.message}`);
      if (this.pairingProgressView) this.pairingProgressView.classList.add('hidden');
      if (this.pairingDeviceListView) this.pairingDeviceListView.classList.remove('hidden');
    }
  }

  async disconnectDevice() {
    if (!confirm('Disconnect your active Vitals Band wearable?')) return;
    try {
      await fetch('/api/devices/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      this.connectedDevice = null;
      this.isDeviceConnected = false;
      if (this.currentUser) this.currentUser.connectedDevice = null;
      this.stopMongoSync();
      this.renderDeviceDisconnectedState();
    } catch (err) {
      alert('Error disconnecting device: ' + err.message);
    }
  }

  renderDeviceConnectedState() {
    // Nav Status Pill
    if (this.navDeviceStatus) {
      this.navDeviceStatus.className = 'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-[11px] cursor-pointer hover:border-cyan-400 transition-colors shadow-sm shrink-0 whitespace-nowrap';
      this.navDeviceStatus.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-cyan-400 beacon-active shrink-0"></span>
        <span class="whitespace-nowrap">${this.connectedDevice ? this.connectedDevice.deviceId : 'VN1 BAND'} [CONNECTED]</span>
      `;
    }

    // Dashboard Banners
    if (this.unconnectedPromptBanner) this.unconnectedPromptBanner.classList.add('hidden');
    if (this.connectedDevicePill) {
      this.connectedDevicePill.classList.remove('hidden');
      const devNameEl = document.getElementById('connected-device-name-display');
      if (devNameEl && this.connectedDevice) {
        devNameEl.innerText = `${this.connectedDevice.name} (${this.connectedDevice.deviceId})`;
      }
    }
  }

  renderDeviceDisconnectedState() {
    if (this.navDeviceStatus) {
      this.navDeviceStatus.className = 'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono text-[11px] cursor-pointer hover:border-cyan-400/50 hover:text-cyan-300 transition-colors shrink-0 whitespace-nowrap';
      this.navDeviceStatus.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
        <span class="whitespace-nowrap">NO WEARABLE PAIRED &bull; CLICK TO CONNECT</span>
      `;
    }

    if (this.unconnectedPromptBanner) this.unconnectedPromptBanner.classList.remove('hidden');
    if (this.connectedDevicePill) this.connectedDevicePill.classList.add('hidden');
  }

  // ==========================================
  // LIVE HEALTH TELEMETRY ENGINE
  // ==========================================

  startLiveHealthSimulation() {
    // Tick loop updating health parameters every 100ms
    setInterval(() => {
      this.tickHealthMetrics();
    }, 120);
  }

  tickHealthMetrics() {
    // Heart Rate Jitter around 70-76 BPM (or higher when stressed)
    const bpmTarget = this.isDeviceConnected ? (71 + Math.sin(Date.now() / 4000) * 4 + (Math.random() - 0.5) * 1.5) : 72;
    this.healthState.bpm += (bpmTarget - this.healthState.bpm) * 0.15;

    // Update cardiac canvas renderer with current BPM
    if (this.cardiacRenderer) {
      this.cardiacRenderer.setBpm(this.healthState.bpm);
    }

    // Heart Rate Variability (RMSSD in ms)
    this.healthState.hrvRmssd += ((58.2 + (Math.random() - 0.5) * 2.8) - this.healthState.hrvRmssd) * 0.1;

    // Cognitive Focus %
    this.healthState.focus += ((91.4 + Math.sin(Date.now() / 6000) * 3.5 + (Math.random() - 0.5) * 1.5) - this.healthState.focus) * 0.12;

    // Mental Stress / Anxiety %
    this.healthState.stress += ((21.5 + (Math.random() - 0.5) * 2.0) - this.healthState.stress) * 0.1;

    // Mental Fatigue %
    this.healthState.fatigueScore += ((16.2 + (Math.random() - 0.5) * 1.0) - this.healthState.fatigueScore) * 0.05;

    // Frequencies (Hz energy shares)
    this.healthState.frequencies.delta = +(1.8 + Math.random() * 0.4).toFixed(1);
    this.healthState.frequencies.theta = +(6.2 + Math.random() * 0.8).toFixed(1);
    this.healthState.frequencies.alpha = +(11.4 + Math.random() * 0.9).toFixed(1);
    this.healthState.frequencies.beta = +(23.1 + Math.random() * 1.5).toFixed(1);
    this.healthState.frequencies.gamma = +(52.4 + Math.random() * 3.2).toFixed(1);

    // Update DOM readouts
    const elBpm = document.getElementById('health-bpm');
    const elHrv = document.getElementById('health-hrv');
    const elSpo2 = document.getElementById('health-spo2');
    const elFocus = document.getElementById('health-focus');
    const elStress = document.getElementById('health-stress');
    const elFatigue = document.getElementById('health-fatigue');
    const elMentalState = document.getElementById('health-mental-state');

    if (elBpm) elBpm.innerText = Math.round(this.healthState.bpm);
    if (elHrv) elHrv.innerText = `${this.healthState.hrvRmssd.toFixed(1)} ms`;
    if (elSpo2) elSpo2.innerText = `${this.healthState.spo2}%`;
    if (elFocus) elFocus.innerText = `${this.healthState.focus.toFixed(1)}%`;
    if (elStress) elStress.innerText = `${this.healthState.stress.toFixed(0)}%`;
    if (elFatigue) elFatigue.innerText = `${this.healthState.fatigueScore.toFixed(0)}%`;
    if (elMentalState) elMentalState.innerText = this.healthState.mentalReadiness;

    // Frequency power bars
    const barDelta = document.getElementById('freq-bar-delta');
    const barTheta = document.getElementById('freq-bar-theta');
    const barAlpha = document.getElementById('freq-bar-alpha');
    const barBeta = document.getElementById('freq-bar-beta');
    const barGamma = document.getElementById('freq-bar-gamma');

    if (barDelta) barDelta.style.width = `${Math.min(100, this.healthState.frequencies.delta * 22)}%`;
    if (barTheta) barTheta.style.width = `${Math.min(100, this.healthState.frequencies.theta * 10)}%`;
    if (barAlpha) barAlpha.style.width = `${Math.min(100, this.healthState.frequencies.alpha * 7)}%`;
    if (barBeta) barBeta.style.width = `${Math.min(100, this.healthState.frequencies.beta * 3.5)}%`;
    if (barGamma) barGamma.style.width = `${Math.min(100, this.healthState.frequencies.gamma * 1.5)}%`;
  }

  // ==========================================
  // MONGODB TELEMETRY SYNC
  // ==========================================

  startMongoSync() {
    this.stopMongoSync();
    // Record telemetry frame into MongoDB every 2.5 seconds
    this.syncInterval = setInterval(() => {
      this.syncTelemetryFrameToMongo();
    }, 2500);

    // Initial immediate sync
    this.syncTelemetryFrameToMongo();
  }

  stopMongoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncTelemetryFrameToMongo() {
    if (!this.isDeviceConnected || !this.currentUser) return;

    try {
      const payload = {
        heartRateBpm: Math.round(this.healthState.bpm),
        hrvRmssd: +this.healthState.hrvRmssd.toFixed(1),
        spo2: this.healthState.spo2,
        bandwidthHz: 2048.0,
        cognitiveFocus: +this.healthState.focus.toFixed(1),
        mentalStress: +this.healthState.stress.toFixed(1),
        neuroFatigue: 'Nominal',
        neuroFatigueScore: +this.healthState.fatigueScore.toFixed(0),
        mentalReadiness: this.healthState.mentalReadiness,
        frequencies: this.healthState.frequencies,
        gesture: 'CONTINUOUS WEAR'
      };

      const res = await fetch('/api/telemetry/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.healthState.mongoFramesLogged++;
        const badge = document.getElementById('mongo-sync-indicator');
        if (badge) {
          badge.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-emerald-400 beacon-active"></span>
            <span>MongoDB: <strong class="text-white">vitals_db.telemetry_logs</strong> (${this.healthState.mongoFramesLogged} frames logged)</span>
          `;
        }
      }
    } catch (err) {
      console.warn('MongoDB sync tick failed:', err);
    }
  }

  // ==========================================
  // MONGODB HISTORY MODAL & ANALYTICS
  // ==========================================

  async openMongoHistoryModal() {
    if (!this.mongoHistoryModal) return;
    this.mongoHistoryModal.classList.remove('hidden');
    this.mongoHistoryModal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    if (this.mongoHistoryTableBody) {
      this.mongoHistoryTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400 font-mono text-xs">
            Querying local MongoDB collection "telemetry_logs"...
          </td>
        </tr>
      `;
    }

    try {
      const headers = this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
      const [logsRes, summaryRes] = await Promise.all([
        fetch('/api/telemetry/recent?limit=25', { headers }).then(r => r.json()),
        fetch('/api/telemetry/summary', { headers }).then(r => r.json())
      ]);

      const logs = logsRes.logs || [];
      const summary = summaryRes.summary || {};

      // Render summary banner
      if (this.mongoHistorySummary) {
        this.mongoHistorySummary.innerHTML = `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-[10px] text-slate-400">AVG HEART RATE</div>
              <div class="text-lg font-bold text-white mt-0.5">${summary.avgBpm ? Math.round(summary.avgBpm) : 72} BPM</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-[10px] text-slate-400">AVG COGNITIVE FOCUS</div>
              <div class="text-lg font-bold text-cyan-400 mt-0.5">${summary.avgFocus ? summary.avgFocus.toFixed(1) : 90}%</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-[10px] text-slate-400">AVG STRESS SCORE</div>
              <div class="text-lg font-bold text-violet-400 mt-0.5">${summary.avgStress ? summary.avgStress.toFixed(1) : 20}%</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-[10px] text-slate-400">TOTAL FRAMES IN DB</div>
              <div class="text-lg font-bold text-emerald-400 mt-0.5">${logsRes.totalCount || 0}</div>
            </div>
          </div>
        `;
      }

      // Render logs table
      if (this.mongoHistoryTableBody) {
        if (logs.length === 0) {
          this.mongoHistoryTableBody.innerHTML = `
            <tr>
              <td colspan="6" class="py-6 text-center text-slate-400 font-mono text-xs">
                No telemetry frames recorded in MongoDB yet. Connect your wearable to begin recording.
              </td>
            </tr>
          `;
          return;
        }

        this.mongoHistoryTableBody.innerHTML = '';
        logs.forEach(log => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          const tr = document.createElement('tr');
          tr.className = 'border-b border-slate-800/60 font-mono text-xs hover:bg-slate-800/30 transition-colors';
          tr.innerHTML = `
            <td class="py-2.5 px-3 text-slate-400">${time}</td>
            <td class="py-2.5 px-3 text-cyan-300">${log.deviceId}</td>
            <td class="py-2.5 px-3 text-red-400 font-bold">${log.heartRateBpm} BPM</td>
            <td class="py-2.5 px-3 text-slate-200">${log.hrvRmssd} ms</td>
            <td class="py-2.5 px-3 text-cyan-400 font-semibold">${log.cognitiveFocus}%</td>
            <td class="py-2.5 px-3 text-emerald-400">${log.mentalStress}% [Nominal]</td>
          `;
          this.mongoHistoryTableBody.appendChild(tr);
        });
      }
    } catch (err) {
      if (this.mongoHistoryTableBody) {
        this.mongoHistoryTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="py-6 text-center text-red-400 font-mono text-xs">
              Failed to query MongoDB: ${err.message}
            </td>
          </tr>
        `;
      }
    }
  }

  closeMongoHistoryModal() {
    if (this.mongoHistoryModal) {
      this.mongoHistoryModal.classList.add('hidden');
      this.mongoHistoryModal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.vitalsAuthDevice = new VitalsAuthDeviceManager();
});
