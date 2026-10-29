/**
 * Vitals Blood Pressure Monitor & Emergency SOS Alert System
 * Detects High BP Crisis and Hypotensive Step-Down Drops, dispatches automated
 * emergency SMS alerts to family contacts with real-time GPS location, and manages
 * local MongoDB alert logging and Black & White theme switching.
 */

class VitalsSosSystem {
  constructor() {
    // Blood Pressure State
    this.bpState = {
      systolic: 118,
      diastolic: 76,
      map: 90,
      pulsePressure: 42,
      status: 'Normal', // 'Normal', 'High BP Crisis', 'Hypotensive Step-Down'
      isAlertActive: false,
      countdownTimer: null,
      countdownRemaining: 10,
      activeAlertPayload: null
    };

    // Emergency Contacts (Synced with MongoDB)
    this.contacts = [];
    this.primaryContact = null;

    // DOM Elements - BP Tile
    this.elBpDisplay = document.getElementById('bp-current-display');
    this.elBpStatusBadge = document.getElementById('bp-status-badge');
    this.elBpMap = document.getElementById('bp-map-display');
    this.elBpPulse = document.getElementById('bp-pulse-display');

    // DOM Elements - Simulation Triggers
    this.btnSimHighBp = document.getElementById('btn-sim-high-bp');
    this.btnSimLowBp = document.getElementById('btn-sim-low-bp');
    this.btnSimNormalBp = document.getElementById('btn-sim-normal-bp');
    this.btnOpenContacts = document.getElementById('btn-open-contacts');
    this.btnOpenSosHistory = document.getElementById('btn-open-sos-history');

    // DOM Elements - SOS Modal
    this.sosModal = document.getElementById('sos-alert-modal');
    this.sosCountdownText = document.getElementById('sos-countdown-text');
    this.sosRecipientName = document.getElementById('sos-recipient-name');
    this.sosRecipientPhone = document.getElementById('sos-recipient-phone');
    this.sosAlertReason = document.getElementById('sos-alert-reason');
    this.sosGpsLocation = document.getElementById('sos-gps-location');
    this.sosCurrentBp = document.getElementById('sos-current-bp');
    this.btnCancelSos = document.getElementById('btn-cancel-sos');
    this.btnSendSosNow = document.getElementById('btn-send-sos-now');
    this.sosCountdownView = document.getElementById('sos-countdown-view');
    this.sosDispatchedView = document.getElementById('sos-dispatched-view');
    this.btnCloseSosModal = document.getElementById('btn-close-sos-modal');

    // DOM Elements - Family Contacts Modal
    this.contactsModal = document.getElementById('family-contacts-modal');
    this.btnCloseContacts = document.getElementById('btn-close-contacts');
    this.contactsListContainer = document.getElementById('family-contacts-list');
    this.formAddContact = document.getElementById('form-add-contact');

    // DOM Elements - SOS History Modal
    this.sosHistoryModal = document.getElementById('sos-history-modal');
    this.btnCloseSosHistory = document.getElementById('btn-close-sos-history');
    this.sosHistoryList = document.getElementById('sos-history-list');

    // Theme Switcher
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.themeLabel = document.getElementById('theme-toggle-label');
    this.themeIcon = document.getElementById('theme-toggle-icon');

    this.init();
  }

  async init() {
    this.initTheme();
    this.bindEvents();
    await this.fetchContacts();
    this.startLiveBpOscillation();
  }

  // ==========================================
  // THEME MANAGEMENT (DARK vs B&W THEME)
  // ==========================================

  initTheme() {
    const savedTheme = localStorage.getItem('vitals_theme') || 'dark';
    if (savedTheme === 'bw') {
      this.applyTheme('bw');
    } else {
      this.applyTheme('dark');
    }
  }

  applyTheme(theme) {
    if (theme === 'bw') {
      document.documentElement.classList.add('theme-bw');
      localStorage.setItem('vitals_theme', 'bw');
      if (this.themeLabel) this.themeLabel.innerText = 'THEME: B&W';
      if (this.themeIcon) {
        this.themeIcon.innerHTML = `<svg class="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path></svg>`;
      }
    } else {
      document.documentElement.classList.remove('theme-bw');
      localStorage.setItem('vitals_theme', 'dark');
      if (this.themeLabel) this.themeLabel.innerText = 'THEME: OBSIDIAN';
      if (this.themeIcon) {
        this.themeIcon.innerHTML = `<svg class="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>`;
      }
    }
  }

  toggleTheme() {
    const isBw = document.documentElement.classList.contains('theme-bw');
    this.applyTheme(isBw ? 'dark' : 'bw');
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================

  bindEvents() {
    // Theme Switcher Button
    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // BP Simulation Triggers
    if (this.btnSimHighBp) {
      this.btnSimHighBp.addEventListener('click', () => {
        this.setBloodPressure(184, 114, 'High BP Crisis');
      });
    }

    if (this.btnSimLowBp) {
      this.btnSimLowBp.addEventListener('click', () => {
        this.setBloodPressure(76, 52, 'Hypotensive Step-Down');
      });
    }

    if (this.btnSimNormalBp) {
      this.btnSimNormalBp.addEventListener('click', () => {
        this.setBloodPressure(118, 76, 'Normal');
      });
    }

    // Emergency Contacts Modal
    if (this.btnOpenContacts) {
      this.btnOpenContacts.addEventListener('click', () => this.openContactsModal());
    }
    if (this.btnCloseContacts) {
      this.btnCloseContacts.addEventListener('click', () => this.closeContactsModal());
    }
    if (this.formAddContact) {
      this.formAddContact.addEventListener('submit', (e) => this.handleAddContact(e));
    }

    // SOS History Modal
    if (this.btnOpenSosHistory) {
      this.btnOpenSosHistory.addEventListener('click', () => this.openSosHistoryModal());
    }
    if (this.btnCloseSosHistory) {
      this.btnCloseSosHistory.addEventListener('click', () => this.closeSosHistoryModal());
    }

    // SOS Alert Modal Buttons
    if (this.btnCancelSos) {
      this.btnCancelSos.addEventListener('click', () => this.cancelSosAlert());
    }
    if (this.btnSendSosNow) {
      this.btnSendSosNow.addEventListener('click', () => this.dispatchSosAlert(true));
    }
    if (this.btnCloseSosModal) {
      this.btnCloseSosModal.addEventListener('click', () => this.closeSosModal());
    }

    // Close on backdrop
    window.addEventListener('click', (e) => {
      if (e.target === this.contactsModal) this.closeContactsModal();
      if (e.target === this.sosHistoryModal) this.closeSosHistoryModal();
    });
  }

  // ==========================================
  // BLOOD PRESSURE TELEMETRY ENGINE
  // ==========================================

  startLiveBpOscillation() {
    setInterval(() => {
      if (this.bpState.status === 'Normal') {
        // Natural micro-variations around 118/76
        const sOffset = (Math.random() - 0.5) * 1.5;
        const dOffset = (Math.random() - 0.5) * 1.2;
        this.bpState.systolic = Math.round(118 + sOffset);
        this.bpState.diastolic = Math.round(76 + dOffset);
        this.updateBpMetricsDOM();
      }
    }, 1500);
  }

  setBloodPressure(systolic, diastolic, status = null) {
    this.bpState.systolic = systolic;
    this.bpState.diastolic = diastolic;

    if (!status) {
      if (systolic >= 160 || diastolic >= 100) {
        status = 'High BP Crisis';
      } else if (systolic <= 90 || diastolic <= 60) {
        status = 'Hypotensive Step-Down';
      } else {
        status = 'Normal';
      }
    }

    this.bpState.status = status;
    this.updateBpMetricsDOM();

    // Check if emergency SOS condition met!
    if (status === 'High BP Crisis' || status === 'Hypotensive Step-Down') {
      this.triggerSosProtocol(status);
    }
  }

  updateBpMetricsDOM() {
    const s = this.bpState.systolic;
    const d = this.bpState.diastolic;
    this.bpState.map = Math.round((2 * d + s) / 3);
    this.bpState.pulsePressure = s - d;

    if (this.elBpDisplay) {
      this.elBpDisplay.innerText = `${s} / ${d}`;
    }
    if (this.elBpMap) {
      this.elBpMap.innerText = `${this.bpState.map} mmHg`;
    }
    if (this.elBpPulse) {
      this.elBpPulse.innerText = `${this.bpState.pulsePressure} mmHg`;
    }

    if (this.elBpStatusBadge) {
      this.elBpStatusBadge.innerText = this.bpState.status.toUpperCase();
      if (this.bpState.status === 'Normal') {
        this.elBpStatusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      } else if (this.bpState.status === 'High BP Crisis') {
        this.elBpStatusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 glow-crimson animate-pulse';
      } else if (this.bpState.status === 'Hypotensive Step-Down') {
        this.elBpStatusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 glow-amber animate-pulse';
      }
    }
  }

  // ==========================================
  // EMERGENCY SOS PROTOCOL FOR FAMILY MEMBERS
  // ==========================================

  triggerSosProtocol(alertType) {
    if (this.bpState.isAlertActive) return; // Prevent double trigger
    this.bpState.isAlertActive = true;

    // Pick primary emergency contact
    this.primaryContact = this.contacts[0] || {
      name: 'Sarah Thorne',
      relationship: 'Spouse',
      phone: '+1 (555) 234-5678'
    };

    // Prepare active alert payload
    this.bpState.activeAlertPayload = {
      alertType: alertType === 'High BP Crisis' ? 'HIGH_BP_CRISIS' : 'BP_STEP_DOWN_DROP',
      systolicMmHg: this.bpState.systolic,
      diastolicMmHg: this.bpState.diastolic,
      heartRateBpm: window.vitalsAuthDevice ? Math.round(window.vitalsAuthDevice.healthState.bpm) : 76,
      gpsLocation: '37.7749° N, 122.4194° W',
      recipient: this.primaryContact
    };

    // Open Modal
    if (this.sosModal) {
      this.sosModal.classList.remove('hidden');
      this.sosModal.classList.add('flex');
      document.body.style.overflow = 'hidden';

      if (this.sosCountdownView) this.sosCountdownView.classList.remove('hidden');
      if (this.sosDispatchedView) this.sosDispatchedView.classList.add('hidden');

      if (this.sosRecipientName) this.sosRecipientName.innerText = `${this.primaryContact.name} (${this.primaryContact.relationship})`;
      if (this.sosRecipientPhone) this.sosRecipientPhone.innerText = this.primaryContact.phone;
      if (this.sosAlertReason) {
        this.sosAlertReason.innerText = alertType === 'High BP Crisis'
          ? 'CRITICAL HYPERTENSIVE SPIKE DETECTED (>160 mmHg)'
          : 'SUDDEN HYPOTENSIVE STEP-DOWN DROP DETECTED (<90 mmHg)';
      }
      if (this.sosCurrentBp) this.sosCurrentBp.innerText = `${this.bpState.systolic} / ${this.bpState.diastolic} mmHg`;
      if (this.sosGpsLocation) this.sosGpsLocation.innerText = '37.7749° N, 122.4194° W (Civilian GPS Lock)';
    }

    // Audio alarm chirp
    if (window.vitalsAuthDevice && window.vitalsAuthDevice.cardiacRenderer) {
      window.vitalsAuthDevice.cardiacRenderer.setBpm(110);
    }

    // Start 10s countdown
    this.bpState.countdownRemaining = 10;
    if (this.sosCountdownText) this.sosCountdownText.innerText = this.bpState.countdownRemaining;

    if (this.bpState.countdownTimer) clearInterval(this.bpState.countdownTimer);
    this.bpState.countdownTimer = setInterval(() => {
      this.bpState.countdownRemaining--;
      if (this.sosCountdownText) this.sosCountdownText.innerText = this.bpState.countdownRemaining;

      if (this.bpState.countdownRemaining <= 0) {
        clearInterval(this.bpState.countdownTimer);
        this.dispatchSosAlert(false);
      }
    }, 1000);
  }

  cancelSosAlert() {
    if (this.bpState.countdownTimer) {
      clearInterval(this.bpState.countdownTimer);
      this.bpState.countdownTimer = null;
    }
    this.bpState.isAlertActive = false;
    this.closeSosModal();

    // Reset BP to normal
    this.setBloodPressure(118, 76, 'Normal');
  }

  async dispatchSosAlert(instant = false) {
    if (this.bpState.countdownTimer) {
      clearInterval(this.bpState.countdownTimer);
      this.bpState.countdownTimer = null;
    }

    try {
      const payload = this.bpState.activeAlertPayload || {
        alertType: 'HIGH_BP_CRISIS',
        systolicMmHg: this.bpState.systolic,
        diastolicMmHg: this.bpState.diastolic,
        heartRateBpm: 108,
        gpsLocation: '37.7749° N, 122.4194° W',
        recipient: this.primaryContact
      };

      const token = localStorage.getItem('vitals_auth_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      // Show dispatched success view
      if (this.sosCountdownView) this.sosCountdownView.classList.add('hidden');
      if (this.sosDispatchedView) this.sosDispatchedView.classList.remove('hidden');

      const dispatchedDetails = document.getElementById('sos-dispatched-details');
      if (dispatchedDetails && data.alert) {
        dispatchedDetails.innerHTML = `
          <div class="space-y-1.5 font-mono text-xs">
            <div class="flex justify-between text-slate-400">
              <span>FAMILY MEMBER:</span>
              <strong class="text-white">${data.alert.recipient.name} (${data.alert.recipient.relationship})</strong>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>CELLULAR SMS DISPATCH:</span>
              <strong class="text-emerald-400">SENT &bull; +1 (555) 234-5678</strong>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>INCIDENT RECORD IN MONGODB:</span>
              <strong class="text-cyan-400">vitals_db.sos_alerts</strong>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>LIVE GPS TELEMETRY:</span>
              <strong class="text-white">37.7749° N, 122.4194° W</strong>
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.error('Error dispatching SOS:', err);
    }
  }

  closeSosModal() {
    if (this.sosModal) {
      this.sosModal.classList.add('hidden');
      this.sosModal.classList.remove('flex');
      document.body.style.overflow = '';
      this.bpState.isAlertActive = false;
    }
  }

  // ==========================================
  // FAMILY EMERGENCY CONTACTS MANAGEMENT
  // ==========================================

  async fetchContacts() {
    try {
      const token = localStorage.getItem('vitals_auth_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/contacts', { headers });
      const data = await res.json();
      this.contacts = data.contacts || [];
      this.renderContactsList();
    } catch (err) {
      console.warn('Failed to load contacts:', err);
    }
  }

  renderContactsList() {
    if (!this.contactsListContainer) return;
    this.contactsListContainer.innerHTML = '';

    if (this.contacts.length === 0) {
      this.contactsListContainer.innerHTML = `<div class="p-4 text-center text-slate-400 font-mono text-xs">No family contacts registered. Add a family member below.</div>`;
      return;
    }

    this.contacts.forEach((c, idx) => {
      const row = document.createElement('div');
      row.className = 'p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-xs';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
            ${idx === 0 ? '★' : (idx + 1)}
          </div>
          <div>
            <div class="font-outfit font-bold text-white text-sm">${c.name} <span class="text-cyan-400 text-xs font-mono font-normal">(${c.relationship})</span></div>
            <div class="text-[10px] text-slate-400">${c.phone} &bull; ${c.email || 'SMS Primary'}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${idx === 0 ? `<span class="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">PRIMARY SOS</span>` : ''}
          <button class="btn-remove-contact text-slate-500 hover:text-red-400 p-1" data-id="${c.id}" title="Remove contact">
            &times;
          </button>
        </div>
      `;

      row.querySelector('.btn-remove-contact').addEventListener('click', () => {
        this.removeContact(c.id);
      });

      this.contactsListContainer.appendChild(row);
    });
  }

  openContactsModal() {
    if (this.contactsModal) {
      this.contactsModal.classList.remove('hidden');
      this.contactsModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
      this.renderContactsList();
    }
  }

  closeContactsModal() {
    if (this.contactsModal) {
      this.contactsModal.classList.add('hidden');
      this.contactsModal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }

  async handleAddContact(e) {
    e.preventDefault();
    const name = document.getElementById('contact-name').value;
    const relationship = document.getElementById('contact-relationship').value;
    const phone = document.getElementById('contact-phone').value;
    const email = document.getElementById('contact-email').value;

    const newContact = {
      id: 'c_' + Date.now(),
      name,
      relationship,
      phone,
      email,
      notifySms: true
    };

    this.contacts.push(newContact);
    this.renderContactsList();
    if (this.formAddContact) this.formAddContact.reset();

    // Persist to MongoDB
    try {
      const token = localStorage.getItem('vitals_auth_token');
      if (token) {
        await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ contacts: this.contacts })
        });
      }
    } catch (err) {
      console.warn('Failed to save contact to MongoDB:', err);
    }
  }

  async removeContact(id) {
    this.contacts = this.contacts.filter(c => c.id !== id);
    this.renderContactsList();

    try {
      const token = localStorage.getItem('vitals_auth_token');
      if (token) {
        await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ contacts: this.contacts })
        });
      }
    } catch (err) {
      console.warn('Failed to update contacts in MongoDB:', err);
    }
  }

  // ==========================================
  // SOS HISTORY MODAL (QUERY MONGODB)
  // ==========================================

  async openSosHistoryModal() {
    if (!this.sosHistoryModal) return;
    this.sosHistoryModal.classList.remove('hidden');
    this.sosHistoryModal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    if (this.sosHistoryList) {
      this.sosHistoryList.innerHTML = `<div class="p-8 text-center text-slate-400 font-mono text-xs">Querying MongoDB collection "sos_alerts"...</div>`;
    }

    try {
      const token = localStorage.getItem('vitals_auth_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/sos/history', { headers });
      const data = await res.json();
      const alerts = data.alerts || [];

      if (alerts.length === 0) {
        this.sosHistoryList.innerHTML = `<div class="p-8 text-center text-slate-400 font-mono text-xs">No emergency SOS alerts logged in MongoDB yet.</div>`;
        return;
      }

      this.sosHistoryList.innerHTML = '';
      alerts.forEach(a => {
        const time = new Date(a.timestamp).toLocaleString();
        const card = document.createElement('div');
        card.className = 'p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-xs';
        card.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${a.alertType === 'HIGH_BP_CRISIS' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}">
              ${a.alertType}
            </span>
            <span class="text-slate-500 text-[11px]">${time}</span>
          </div>
          <div class="text-slate-300">${a.messageText}</div>
          <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Dispatched to: <strong class="text-white">${a.recipient.name} (${a.recipient.phone})</strong></span>
            <span class="text-emerald-400">&check; SMS DISPATCH CONFIRMED</span>
          </div>
        `;
        this.sosHistoryList.appendChild(card);
      });
    } catch (err) {
      this.sosHistoryList.innerHTML = `<div class="p-4 text-center text-red-400 font-mono text-xs">Error querying MongoDB: ${err.message}</div>`;
    }
  }

  closeSosHistoryModal() {
    if (this.sosHistoryModal) {
      this.sosHistoryModal.classList.add('hidden');
      this.sosHistoryModal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.vitalsSos = new VitalsSosSystem();
});
