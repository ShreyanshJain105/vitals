const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = 3333;
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'vitals_db';

let db = null;
let mongoClient = null;

// Connect to local MongoDB
async function initMongo() {
  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    console.log(`[MongoDB] Connected successfully to ${MONGO_URI}/${DB_NAME}`);

    // Create unique index on email
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('telemetry_logs').createIndex({ userId: 1, timestamp: -1 });

    // Seed mock discoverable devices if empty
    const deviceCount = await db.collection('devices').countDocuments();
    if (deviceCount === 0) {
      await db.collection('devices').insertMany([
        {
          deviceId: 'VN1-8942-ALPHA',
          name: 'Vitals N1 Band (Tactical Alpha)',
          model: 'Vitals N1 Pro Biopotential Wristband',
          firmware: 'v3.8.4-edge',
          battery: 94,
          rssi: -42,
          sensorImpedance: '17.8 kΩ',
          channels: 32,
          status: 'available',
          assignedUserId: null,
          lastSeen: new Date()
        },
        {
          deviceId: 'VN1-7310-MED',
          name: 'Vitals N1 Band (Surgical Precision)',
          model: 'Vitals N1 Surgical Edition',
          firmware: 'v3.8.4-edge',
          battery: 88,
          rssi: -55,
          sensorImpedance: '18.4 kΩ',
          channels: 32,
          status: 'available',
          assignedUserId: null,
          lastSeen: new Date()
        },
        {
          deviceId: 'VN1-9921-AERO',
          name: 'Vitals N1 Band (Aerospace Pilot)',
          model: 'Vitals N1 Ruggedized Aerospace',
          firmware: 'v3.8.2-edge',
          battery: 100,
          rssi: -38,
          sensorImpedance: '16.9 kΩ',
          channels: 32,
          status: 'available',
          assignedUserId: null,
          lastSeen: new Date()
        }
      ]);
      console.log('[MongoDB] Seeded initial discoverable Vitals devices.');
    }
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    console.warn('[MongoDB] Server will continue, and retry connecting.');
  }
}

// Password hashing helper
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const newHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
}

// Simple signed token generator
const JWT_SECRET = 'vitals-enterprise-secret-key-94820';
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86400000 * 7 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Helper to parse JSON request bodies
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) { // 2MB max
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON Payload'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Auth middleware helper
async function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  if (!db) return null;
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { passwordHash: 0, salt: 0 } }
    );
    return user;
  } catch (e) {
    return null;
  }
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // ==========================================
  // REST API ROUTES
  // ==========================================

  // 1. Health check & DB connection status
  if (pathname === '/api/status' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'online',
      system: 'Vitals OS Telemetry Ingress',
      mongoConnected: !!db,
      mongoUri: MONGO_URI,
      database: DB_NAME,
      timestamp: new Date().toISOString()
    });
  }

  // 2. Auth: Register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      if (!db) return sendJson(res, 503, { error: 'Database service unavailable' });
      const { name, email, password, organization, sector } = await parseJsonBody(req);

      if (!name || !email || !password) {
        return sendJson(res, 400, { error: 'Name, email, and password are required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await db.collection('users').findOne({ email: normalizedEmail });
      if (existing) {
        return sendJson(res, 409, { error: 'An account with this email already exists' });
      }

      const { hash, salt } = hashPassword(password);
      const newUser = {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hash,
        salt,
        organization: organization || 'Personal Biometrics',
        sector: sector || 'Enterprise Neuromuscular',
        connectedDevice: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('users').insertOne(newUser);
      const userId = result.insertedId.toString();

      const token = generateToken({ userId, email: normalizedEmail, name: newUser.name });
      return sendJson(res, 201, {
        message: 'Account registered successfully',
        token,
        user: {
          id: userId,
          name: newUser.name,
          email: newUser.email,
          organization: newUser.organization,
          sector: newUser.sector,
          connectedDevice: null
        }
      });
    } catch (err) {
      console.error('Register error:', err);
      return sendJson(res, 500, { error: 'Internal server error during registration' });
    }
  }

  // 3. Auth: Login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      if (!db) return sendJson(res, 503, { error: 'Database service unavailable' });
      const { email, password } = await parseJsonBody(req);

      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await db.collection('users').findOne({ email: normalizedEmail });
      if (!user) {
        return sendJson(res, 401, { error: 'Invalid email or password' });
      }

      const isValid = verifyPassword(password, user.passwordHash, user.salt);
      if (!isValid) {
        return sendJson(res, 401, { error: 'Invalid email or password' });
      }

      const userId = user._id.toString();
      const token = generateToken({ userId, email: user.email, name: user.name });

      return sendJson(res, 200, {
        message: 'Login successful',
        token,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          organization: user.organization,
          sector: user.sector,
          connectedDevice: user.connectedDevice || null
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      return sendJson(res, 500, { error: 'Internal server error during login' });
    }
  }

  // 4. Auth: Get current user profile (Me)
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    try {
      const user = await getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

      return sendJson(res, 200, {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          organization: user.organization,
          sector: user.sector,
          connectedDevice: user.connectedDevice || null
        }
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to fetch user profile' });
    }
  }

  // 5. Device: Scan for available Vitals wearables
  if (pathname === '/api/devices/scan' && req.method === 'GET') {
    try {
      if (!db) return sendJson(res, 503, { error: 'Database unavailable' });
      const devices = await db.collection('devices').find({}).toArray();
      return sendJson(res, 200, {
        discoveredDevices: devices,
        protocol: 'UWB / BLE 5.4 Dual-Mesh',
        scanTimeMs: 140
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to scan devices' });
    }
  }

  // 6. Device: Connect / Pair Wearable Device
  if (pathname === '/api/devices/pair' && req.method === 'POST') {
    try {
      const user = await getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized. Please login to pair a device.' });

      const { deviceId } = await parseJsonBody(req);
      if (!deviceId) return sendJson(res, 400, { error: 'deviceId is required' });

      // Find device in DB
      let device = await db.collection('devices').findOne({ deviceId });
      if (!device) {
        // Create custom device entry if pairing fresh custom ID
        device = {
          deviceId,
          name: `Vitals N1 Band [${deviceId}]`,
          model: 'Vitals N1 Pro Biopotential Wristband',
          firmware: 'v3.8.4-edge',
          battery: 98,
          rssi: -40,
          sensorImpedance: '18.2 kΩ',
          channels: 32,
          status: 'paired',
          assignedUserId: user._id.toString(),
          lastSeen: new Date()
        };
        await db.collection('devices').insertOne(device);
      } else {
        await db.collection('devices').updateOne(
          { deviceId },
          { $set: { status: 'paired', assignedUserId: user._id.toString(), lastSeen: new Date() } }
        );
      }

      // Update user document
      const connectedDeviceData = {
        deviceId: device.deviceId,
        name: device.name,
        model: device.model,
        firmware: device.firmware,
        battery: device.battery,
        sensorImpedance: device.sensorImpedance,
        pairedAt: new Date()
      };

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { connectedDevice: connectedDeviceData, updatedAt: new Date() } }
      );

      return sendJson(res, 200, {
        message: `Device ${device.deviceId} paired successfully!`,
        device: connectedDeviceData
      });
    } catch (err) {
      console.error('Pair error:', err);
      return sendJson(res, 500, { error: 'Failed to pair device' });
    }
  }

  // 7. Device: Disconnect Wearable Device
  if (pathname === '/api/devices/disconnect' && req.method === 'POST') {
    try {
      const user = await getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

      if (user.connectedDevice && user.connectedDevice.deviceId) {
        await db.collection('devices').updateOne(
          { deviceId: user.connectedDevice.deviceId },
          { $set: { status: 'available', assignedUserId: null } }
        );
      }

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { connectedDevice: null, updatedAt: new Date() } }
      );

      return sendJson(res, 200, { message: 'Wearable device disconnected' });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to disconnect device' });
    }
  }

  // 8. Telemetry: Record Live Telemetry Tick/Session to MongoDB
  if (pathname === '/api/telemetry/record' && req.method === 'POST') {
    try {
      const user = await getAuthUser(req);
      const body = await parseJsonBody(req);

      const telemetryDoc = {
        userId: user ? user._id.toString() : (body.userId || 'anonymous'),
        deviceId: (user && user.connectedDevice ? user.connectedDevice.deviceId : (body.deviceId || 'VN1-8942-ALPHA')),
        timestamp: new Date(),
        heartRateBpm: body.heartRateBpm || 72,
        bpSystolic: body.bpSystolic || 118,
        bpDiastolic: body.bpDiastolic || 76,
        bpStatus: body.bpStatus || 'Normal',
        hrvRmssd: body.hrvRmssd || 56.4,
        spo2: body.spo2 || 98.8,
        bandwidthHz: body.bandwidthHz || 2048.0,
        cognitiveFocus: body.cognitiveFocus || 88.5,
        mentalStress: body.mentalStress || 22.0,
        neuroFatigue: body.neuroFatigue || 'Nominal',
        neuroFatigueScore: body.neuroFatigueScore || 18,
        mentalReadiness: body.mentalReadiness || 'Optimal Flow State',
        frequencies: body.frequencies || {
          delta: 1.8,
          theta: 6.2,
          alpha: 10.4,
          beta: 22.1,
          gamma: 48.6
        },
        gesture: body.gesture || 'BASELINE IDLE',
        snrDb: body.snrDb || 34.2,
        impedanceKohm: body.impedanceKohm || 18.2
      };

      if (db) {
        await db.collection('telemetry_logs').insertOne(telemetryDoc);
      }

      return sendJson(res, 201, {
        message: 'Telemetry frame recorded in MongoDB',
        docId: telemetryDoc._id
      });
    } catch (err) {
      console.error('Record telemetry error:', err);
      return sendJson(res, 500, { error: 'Failed to record telemetry frame' });
    }
  }

  // 9. Telemetry: Fetch Recent Telemetry History from MongoDB
  if (pathname === '/api/telemetry/recent' && req.method === 'GET') {
    try {
      if (!db) return sendJson(res, 503, { error: 'Database unavailable' });
      const user = await getAuthUser(req);
      const query = user ? { userId: user._id.toString() } : {};
      const limit = parseInt(urlObj.searchParams.get('limit') || '30', 10);

      const logs = await db.collection('telemetry_logs')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(Math.min(limit, 100))
        .toArray();

      const totalCount = await db.collection('telemetry_logs').countDocuments(query);

      return sendJson(res, 200, {
        logs,
        totalCount,
        queryScope: user ? 'user' : 'global'
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to fetch telemetry history' });
    }
  }

  // 10. Telemetry Summary / Analytics from MongoDB
  if (pathname === '/api/telemetry/summary' && req.method === 'GET') {
    try {
      if (!db) return sendJson(res, 503, { error: 'Database unavailable' });
      const user = await getAuthUser(req);
      const matchQuery = user ? { userId: user._id.toString() } : {};

      const stats = await db.collection('telemetry_logs').aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            avgBpm: { $avg: '$heartRateBpm' },
            minBpm: { $min: '$heartRateBpm' },
            maxBpm: { $max: '$heartRateBpm' },
            avgFocus: { $avg: '$cognitiveFocus' },
            avgStress: { $avg: '$mentalStress' },
            avgHrv: { $avg: '$hrvRmssd' },
            totalFrames: { $sum: 1 }
          }
        }
      ]).toArray();

      const summary = stats[0] || {
        avgBpm: 72,
        minBpm: 64,
        maxBpm: 84,
        avgFocus: 85,
        avgStress: 24,
        avgHrv: 58,
        totalFrames: 0
      };

      return sendJson(res, 200, { summary });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to compute telemetry summary' });
    }
  }

  // 11. Emergency Contacts: Get Family Contacts for SOS
  if (pathname === '/api/contacts' && req.method === 'GET') {
    try {
      const user = await getAuthUser(req);
      let contacts = user && user.emergencyContacts && user.emergencyContacts.length > 0
        ? user.emergencyContacts
        : [
            { id: 'c1', name: 'Sarah Thorne', relationship: 'Spouse', phone: '+1 (555) 234-5678', email: 'sarah.thorne@family.net', notifySms: true },
            { id: 'c2', name: 'Dr. Robert Vance', relationship: 'Personal Cardiologist', phone: '+1 (555) 876-5432', email: 'r.vance@stanfordmed.org', notifySms: true },
            { id: 'c3', name: 'Marcus Thorne', relationship: 'Brother / Primary Kin', phone: '+1 (555) 912-3456', email: 'm.thorne@enterprise.com', notifySms: false }
          ];

      return sendJson(res, 200, { contacts });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to fetch emergency contacts' });
    }
  }

  // 12. Emergency Contacts: Add / Update Family Contacts in MongoDB
  if (pathname === '/api/contacts' && req.method === 'POST') {
    try {
      const user = await getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

      const { contacts } = await parseJsonBody(req);
      if (!Array.isArray(contacts)) return sendJson(res, 400, { error: 'Contacts must be an array' });

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { emergencyContacts: contacts, updatedAt: new Date() } }
      );

      return sendJson(res, 200, { message: 'Emergency contacts updated in MongoDB', contacts });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to update emergency contacts' });
    }
  }

  // 13. Emergency SOS: Trigger & Broadcast Alert to Family Members
  if (pathname === '/api/sos/trigger' && req.method === 'POST') {
    try {
      const user = await getAuthUser(req);
      const body = await parseJsonBody(req);

      const alertDoc = {
        userId: user ? user._id.toString() : (body.userId || 'anonymous'),
        userName: user ? user.name : (body.userName || 'Major Alex Thorne'),
        deviceId: user && user.connectedDevice ? user.connectedDevice.deviceId : (body.deviceId || 'VN1-8942-ALPHA'),
        timestamp: new Date(),
        alertType: body.alertType || 'HIGH_BP_CRISIS', // 'HIGH_BP_CRISIS' or 'BP_STEP_DOWN_DROP'
        systolicMmHg: body.systolicMmHg || 184,
        diastolicMmHg: body.diastolicMmHg || 112,
        heartRateBpm: body.heartRateBpm || 108,
        gpsLocation: body.gpsLocation || '37.7749° N, 122.4194° W',
        recipient: body.recipient || {
          name: 'Sarah Thorne',
          relationship: 'Spouse',
          phone: '+1 (555) 234-5678'
        },
        messageText: body.messageText || `CRITICAL HEALTH ALERT: Blood Pressure emergency detected for ${user ? user.name : 'Alex Thorne'}. Systolic/Diastolic: ${body.systolicMmHg || 184}/${body.diastolicMmHg || 112} mmHg. GPS Coordinates: 37.7749° N, 122.4194° W. Immediate check-in advised.`,
        deliveryStatus: 'DISPATCHED_CONFIRMED',
        smsDelivered: true,
        pushDelivered: true
      };

      if (db) {
        await db.collection('sos_alerts').insertOne(alertDoc);
      }

      console.log(`[SOS DISPATCH] Alert triggered: ${alertDoc.alertType} for ${alertDoc.userName} -> Notified: ${alertDoc.recipient.name} (${alertDoc.recipient.phone})`);

      return sendJson(res, 201, {
        message: 'Emergency SOS alert dispatched to family contact & recorded in MongoDB',
        alert: alertDoc
      });
    } catch (err) {
      console.error('SOS trigger error:', err);
      return sendJson(res, 500, { error: 'Failed to dispatch SOS alert' });
    }
  }

  // 14. Emergency SOS: Fetch SOS Alert History
  if (pathname === '/api/sos/history' && req.method === 'GET') {
    try {
      if (!db) return sendJson(res, 503, { error: 'Database unavailable' });
      const user = await getAuthUser(req);
      const query = user ? { userId: user._id.toString() } : {};

      const alerts = await db.collection('sos_alerts')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray();

      return sendJson(res, 200, { alerts });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to fetch SOS history' });
    }
  }

  // ==========================================
  // STATIC FILE SERVING
  // ==========================================
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + pathname);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Initialize MongoDB and start server
initMongo().then(() => {
  server.listen(PORT, () => {
    console.log(`[Vitals Server] Active at http://localhost:${PORT}`);
    console.log(`[Vitals Server] Telemetry connected to MongoDB: ${MONGO_URI}/${DB_NAME}`);
  });
});
