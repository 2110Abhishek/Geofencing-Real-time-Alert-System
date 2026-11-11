const http = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('crypto');

const PORT = process.env.PORT || 8080;

// High-resolution nanosecond timer
function getHrTimeNs(startTime) {
  const diff = process.hrtime(startTime);
  return (BigInt(diff[0]) * 1000000000n + BigInt(diff[1])).toString();
}

// Point-in-polygon Ray-Casting with boundary inclusion
function isPointOnSegment(lat, lng, p1Lat, p1Lng, p2Lat, p2Lng) {
  const minLat = Math.min(p1Lat, p2Lat) - 1e-9;
  const maxLat = Math.max(p1Lat, p2Lat) + 1e-9;
  const minLng = Math.min(p1Lng, p2Lng) - 1e-9;
  const maxLng = Math.max(p1Lng, p2Lng) + 1e-9;

  if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
    return false;
  }

  const cross = (lat - p1Lat) * (p2Lng - p1Lng) - (lng - p1Lng) * (p2Lat - p1Lat);
  return Math.abs(cross) < 1e-8;
}

function pointInPolygon(lat, lng, coords) {
  const n = coords.length;
  if (n < 4) return false;

  // Boundary check
  for (let i = 0; i < n - 1; i++) {
    if (isPointOnSegment(lat, lng, coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])) {
      return true; // Explicit boundary inclusion
    }
  }

  // Ray-Casting
  let inside = false;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const yi = coords[i][0], xi = coords[i][1];
    const yj = coords[j][0], xj = coords[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

// In-Memory Database
const db = {
  vehicles: [
    {
      id: "9c4e2b1a-8e31-4d1a-bf44-77a8b9c0d1e1",
      vehicle_number: "KA-01-AB-1234",
      driver_name: "John Doe",
      vehicle_type: "Truck",
      phone: "+1-555-0101",
      status: "active",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      last_location: { latitude: 37.7780, longitude: -122.4120, recorded_at: new Date().toISOString() },
      current_geofences: []
    },
    {
      id: "9c4e2b1a-8e31-4d1a-bf44-77a8b9c0d1e2",
      vehicle_number: "KA-02-CD-5678",
      driver_name: "Sarah Connor",
      vehicle_type: "Van",
      phone: "+1-555-0102",
      status: "active",
      created_at: new Date(Date.now() - 72000000).toISOString(),
      last_location: { latitude: 37.8500, longitude: -122.5000, recorded_at: new Date().toISOString() },
      current_geofences: []
    },
    {
      id: "9c4e2b1a-8e31-4d1a-bf44-77a8b9c0d1e3",
      vehicle_number: "MH-12-EF-9012",
      driver_name: "Alex Mercer",
      vehicle_type: "Truck",
      phone: "+1-555-0103",
      status: "active",
      created_at: new Date(Date.now() - 36000000).toISOString(),
      last_location: null,
      current_geofences: []
    }
  ],
  geofences: [
    {
      id: "7b2d5a8e-5b12-4f33-8ecb-99f8d1c68401",
      name: "Downtown Commercial Delivery Zone",
      description: "Approved logistics loading zone for downtown commercial stores",
      category: "delivery_zone",
      status: "active",
      coordinates: [
        [37.7700, -122.4200],
        [37.7850, -122.4200],
        [37.7850, -122.4050],
        [37.7700, -122.4050],
        [37.7700, -122.4200]
      ],
      point_count: 5,
      created_at: new Date(Date.now() - 90000000).toISOString()
    },
    {
      id: "7b2d5a8e-5b12-4f33-8ecb-99f8d1c68402",
      name: "Naval Harbor Restricted Security Perimeter",
      description: "Unauthorized access prohibited. Monitored restricted security zone",
      category: "restricted_zone",
      status: "active",
      coordinates: [
        [37.7950, -122.3950],
        [37.8100, -122.3950],
        [37.8100, -122.3800],
        [37.7950, -122.3800],
        [37.7950, -122.3950]
      ],
      point_count: 5,
      created_at: new Date(Date.now() - 85000000).toISOString()
    },
    {
      id: "7b2d5a8e-5b12-4f33-8ecb-99f8d1c68403",
      name: "Bay Bridge Express Toll Plaza",
      description: "Electronic toll collection and rate compliance corridor",
      category: "toll_zone",
      status: "active",
      coordinates: [
        [37.7880, -122.3880],
        [37.7940, -122.3880],
        [37.7940, -122.3780],
        [37.7880, -122.3780],
        [37.7880, -122.3880]
      ],
      point_count: 5,
      created_at: new Date(Date.now() - 80000000).toISOString()
    }
  ],
  alertConfigs: [
    {
      id: "3f4a5b6c-7d8e-9f0a-1b2c-3d4e5f6a7b81",
      geofence_id: "7b2d5a8e-5b12-4f33-8ecb-99f8d1c68402",
      geofence_name: "Naval Harbor Restricted Security Perimeter",
      geofence_category: "restricted_zone",
      vehicle_id: null,
      event_type: "entry",
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: "3f4a5b6c-7d8e-9f0a-1b2c-3d4e5f6a7b82",
      geofence_id: "7b2d5a8e-5b12-4f33-8ecb-99f8d1c68401",
      geofence_name: "Downtown Commercial Delivery Zone",
      geofence_category: "delivery_zone",
      vehicle_id: null,
      event_type: "both",
      status: "active",
      created_at: new Date().toISOString()
    }
  ],
  vehicleGeofenceStates: new Map(), // key: `${vehicle_id}_${geofence_id}`, value: boolean
  events: []
};

// Seed initial state for vehicle 1 inside downtown delivery zone
db.vehicleGeofenceStates.set("9c4e2b1a-8e31-4d1a-bf44-77a8b9c0d1e1_7b2d5a8e-5b12-4f33-8ecb-99f8d1c68401", true);
db.vehicles[0].current_geofences = ["7b2d5a8e-5b12-4f33-8ecb-99f8d1c68401"];

// HTTP Server
const server = http.createServer((req, res) => {
  const startTime = process.hrtime();
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJSON = (statusCode, data) => {
    data.time_ns = getHrTimeNs(startTime);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const parseBody = (cb) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        cb(body ? JSON.parse(body) : {});
      } catch (e) {
        sendJSON(400, { error: 'Invalid JSON payload', code: 'INVALID_JSON' });
      }
    });
  };

  // Health check
  if (pathname === '/health' && method === 'GET') {
    return sendJSON(200, { status: 'healthy', database: 'connected (in-memory-engine)' });
  }

  // 1. POST /geofences
  if (pathname === '/geofences' && method === 'POST') {
    parseBody(body => {
      if (!body.name || !body.category || !Array.isArray(body.coordinates)) {
        return sendJSON(400, { error: 'Missing required geofence fields', code: 'INVALID_PAYLOAD' });
      }
      if (body.coordinates.length < 4) {
        return sendJSON(400, { error: 'Polygon must have at least 4 coordinate pairs', code: 'INVALID_COORDINATES' });
      }
      const newGeofence = {
        id: require('crypto').randomUUID(),
        name: body.name.trim(),
        description: body.description || '',
        category: body.category,
        status: 'active',
        coordinates: body.coordinates,
        point_count: body.coordinates.length,
        created_at: new Date().toISOString()
      };
      db.geofences.unshift(newGeofence);
      sendJSON(201, newGeofence);
    });
    return;
  }

  // 2. GET /geofences
  if (pathname === '/geofences' && method === 'GET') {
    const category = urlObj.searchParams.get('category');
    let items = db.geofences;
    if (category) {
      items = items.filter(g => g.category.toLowerCase() === category.toLowerCase());
    }
    return sendJSON(200, { geofences: items, total: items.length });
  }

  // 2b. DELETE /geofences/:id
  const geofenceIdMatch = pathname.match(/^\/geofences\/([a-zA-Z0-9_-]+)$/);
  if (geofenceIdMatch && method === 'DELETE') {
    const id = geofenceIdMatch[1];
    const idx = db.geofences.findIndex(g => g.id === id);
    if (idx === -1) {
      return sendJSON(404, { error: 'Geofence not found', code: 'NOT_FOUND' });
    }
    const removed = db.geofences.splice(idx, 1)[0];
    return sendJSON(200, { status: 'deleted', id: id, name: removed.name });
  }

  // 3. POST /vehicles
  if (pathname === '/vehicles' && method === 'POST') {
    parseBody(body => {
      if (!body.vehicle_number || !body.driver_name || !body.vehicle_type || !body.phone) {
        return sendJSON(400, { error: 'All vehicle fields are required', code: 'INVALID_PAYLOAD' });
      }
      const num = body.vehicle_number.trim().toUpperCase();
      if (db.vehicles.some(v => v.vehicle_number === num)) {
        return sendJSON(409, { error: 'Vehicle number already registered', code: 'VEHICLE_EXISTS' });
      }
      const newVeh = {
        id: require('crypto').randomUUID(),
        vehicle_number: num,
        driver_name: body.driver_name.trim(),
        vehicle_type: body.vehicle_type,
        phone: body.phone.trim(),
        status: 'active',
        created_at: new Date().toISOString(),
        last_location: null,
        current_geofences: []
      };
      db.vehicles.unshift(newVeh);
      sendJSON(201, newVeh);
    });
    return;
  }

  // 4. GET /vehicles
  if (pathname === '/vehicles' && method === 'GET') {
    return sendJSON(200, { vehicles: db.vehicles, total: db.vehicles.length });
  }

  // 4b. PUT /vehicles/:id (Update vehicle details)
  const vehIdMatch = pathname.match(/^\/vehicles\/([a-zA-Z0-9_-]+)$/);
  if (vehIdMatch && method === 'PUT') {
    const id = vehIdMatch[1];
    parseBody(body => {
      const idx = db.vehicles.findIndex(v => v.id === id);
      if (idx === -1) {
        return sendJSON(404, { error: 'Vehicle not found', code: 'NOT_FOUND' });
      }
      if (body.vehicle_number) {
        const num = body.vehicle_number.trim().toUpperCase();
        if (db.vehicles.some((v, i) => i !== idx && v.vehicle_number === num)) {
          return sendJSON(409, { error: 'Vehicle number already registered', code: 'DUPLICATE_NUMBER' });
        }
        db.vehicles[idx].vehicle_number = num;
      }
      if (body.driver_name !== undefined) db.vehicles[idx].driver_name = body.driver_name.trim();
      if (body.vehicle_type !== undefined) db.vehicles[idx].vehicle_type = body.vehicle_type.trim();
      if (body.phone !== undefined) db.vehicles[idx].phone = body.phone.trim();
      if (body.status !== undefined) db.vehicles[idx].status = body.status.trim();
      return sendJSON(200, db.vehicles[idx]);
    });
    return;
  }

  // 4c. DELETE /vehicles/:id (Delete vehicle)
  if (vehIdMatch && method === 'DELETE') {
    const id = vehIdMatch[1];
    const idx = db.vehicles.findIndex(v => v.id === id);
    if (idx === -1) {
      return sendJSON(404, { error: 'Vehicle not found', code: 'NOT_FOUND' });
    }
    const removed = db.vehicles.splice(idx, 1)[0];
    return sendJSON(200, { status: 'deleted', id: id, vehicle_number: removed.vehicle_number });
  }

  // 5. POST /vehicles/location
  if (pathname === '/vehicles/location' && method === 'POST') {
    parseBody(body => {
      const { vehicle_id, latitude, longitude, timestamp } = body;
      const vehicle = db.vehicles.find(v => v.id === vehicle_id);
      if (!vehicle) {
        return sendJSON(404, { error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
      }
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || !timestamp ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return sendJSON(400, { error: 'Invalid coordinates: latitude must be in [-90, 90] and longitude in [-180, 180]', code: 'INVALID_LOCATION' });
      }

      const recTime = new Date(timestamp);
      // Stale timestamp check
      const lastRecTime = vehicle.last_location ? new Date(vehicle.last_location.recorded_at) : null;
      if (lastRecTime && recTime <= lastRecTime) {
        // Stale update: accept without state transition
        return sendJSON(200, {
          vehicle_id,
          current_geofences: vehicle.current_geofences.map(id => {
            const g = db.geofences.find(x => x.id === id);
            return g ? { id: g.id, name: g.name, category: g.category } : null;
          }).filter(Boolean),
          events_generated: []
        });
      }

      vehicle.last_location = { latitude, longitude, recorded_at: timestamp };

      // Calculate current membership for each geofence
      const coveredGeofences = [];
      const eventsGenerated = [];
      const updatedMemberships = [];

      // Check if vehicle has any prior recorded state (Rule 2: Initial Fix)
      const hasPriorState = db.geofences.some(g => db.vehicleGeofenceStates.has(`${vehicle_id}_${g.id}`));

      db.geofences.forEach(g => {
        const isInsideNow = pointInPolygon(latitude, longitude, g.coordinates);
        if (isInsideNow) {
          coveredGeofences.push({ id: g.id, name: g.name, category: g.category });
          updatedMemberships.push(g.id);
        }

        const stateKey = `${vehicle_id}_${g.id}`;
        const prevInside = db.vehicleGeofenceStates.get(stateKey) || false;

        if (!hasPriorState) {
          // Rule 2: Initialize baseline state without artificial transitions
          db.vehicleGeofenceStates.set(stateKey, isInsideNow);
        } else {
          // Evaluate transition
          let transition = null;
          if (!prevInside && isInsideNow) transition = 'entry';
          if (prevInside && !isInsideNow) transition = 'exit';

          if (transition) {
            db.vehicleGeofenceStates.set(stateKey, isInsideNow);
            const eventId = require('crypto').randomUUID();
            const eventRecord = {
              event_id: eventId,
              vehicle_id,
              vehicle_number: vehicle.vehicle_number,
              driver_name: vehicle.driver_name,
              geofence_id: g.id,
              geofence_name: g.name,
              geofence_category: g.category,
              event_type: transition,
              latitude,
              longitude,
              event_timestamp: timestamp,
              created_at: new Date().toISOString()
            };
            db.events.unshift(eventRecord);
            eventsGenerated.push({
              event_id: eventId,
              event_type: transition,
              geofence_id: g.id,
              geofence_name: g.name,
              timestamp
            });

            // Match active alert configurations
            const matchingRule = db.alertConfigs.find(r =>
              r.geofence_id === g.id &&
              r.status === 'active' &&
              (!r.vehicle_id || r.vehicle_id === vehicle_id) &&
              (r.event_type === 'both' || r.event_type === transition)
            );

            if (matchingRule) {
              const severity = g.category === 'restricted_zone'
                ? (transition === 'entry' ? 'critical' : 'warning')
                : 'informational';

              broadcastWSAlert({
                event_id: eventId,
                event_type: transition,
                timestamp,
                severity,
                vehicle: {
                  vehicle_id: vehicle.id,
                  vehicle_number: vehicle.vehicle_number,
                  driver_name: vehicle.driver_name
                },
                geofence: {
                  geofence_id: g.id,
                  geofence_name: g.name,
                  category: g.category
                },
                location: { latitude, longitude }
              });
            }
          }
        }
      });

      vehicle.current_geofences = updatedMemberships;

      sendJSON(200, {
        vehicle_id,
        current_geofences: coveredGeofences,
        events_generated: eventsGenerated
      });
    });
    return;
  }

  // 6. GET /vehicles/location/:vehicle_id
  if (pathname.startsWith('/vehicles/location/') && method === 'GET') {
    const vehicleId = pathname.replace('/vehicles/location/', '');
    const vehicle = db.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return sendJSON(404, { error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
    }
    const currentGeos = vehicle.current_geofences.map(id => {
      const g = db.geofences.find(x => x.id === id);
      return g ? { id: g.id, name: g.name, category: g.category } : null;
    }).filter(Boolean);

    return sendJSON(200, {
      vehicle: {
        id: vehicle.id,
        vehicle_number: vehicle.vehicle_number,
        driver_name: vehicle.driver_name,
        vehicle_type: vehicle.vehicle_type
      },
      current_location: vehicle.last_location,
      current_geofences: currentGeos
    });
  }

  // 7. POST /alerts/configure
  if (pathname === '/alerts/configure' && method === 'POST') {
    parseBody(body => {
      const { geofence_id, vehicle_id, event_type } = body;
      const geofence = db.geofences.find(g => g.id === geofence_id);
      if (!geofence) {
        return sendJSON(404, { error: 'Geofence not found', code: 'GEOFENCE_NOT_FOUND' });
      }
      let vNum = null, vDriver = null;
      if (vehicle_id) {
        const vehicle = db.vehicles.find(v => v.id === vehicle_id);
        if (!vehicle) {
          return sendJSON(404, { error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
        }
        vNum = vehicle.vehicle_number;
        vDriver = vehicle.driver_name;
      }
      const newRule = {
        id: require('crypto').randomUUID(),
        geofence_id,
        geofence_name: geofence.name,
        geofence_category: geofence.category,
        vehicle_id: vehicle_id || null,
        vehicle_number: vNum,
        driver_name: vDriver,
        event_type,
        status: 'active',
        created_at: new Date().toISOString()
      };
      db.alertConfigs.unshift(newRule);
      sendJSON(201, newRule);
    });
    return;
  }

  // 8. GET /alerts
  if (pathname === '/alerts' && method === 'GET') {
    return sendJSON(200, { alerts: db.alertConfigs, total: db.alertConfigs.length });
  }

  // 9. GET /violations/history
  if (pathname === '/violations/history' && method === 'GET') {
    const vehicleId = urlObj.searchParams.get('vehicle_id');
    const geofenceId = urlObj.searchParams.get('geofence_id');
    const eventType = urlObj.searchParams.get('event_type');
    const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);
    const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

    let items = db.events;
    if (vehicleId) items = items.filter(e => e.vehicle_id === vehicleId);
    if (geofenceId) items = items.filter(e => e.geofence_id === geofenceId);
    if (eventType) items = items.filter(e => e.event_type === eventType);

    const total = items.length;
    const pageItems = items.slice(offset, offset + limit);

    return sendJSON(200, {
      events: pageItems,
      total,
      limit,
      offset
    });
  }

  sendJSON(404, { error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// WebSocket Server on /ws/alerts
const wss = new WebSocketServer({ noServer: true });
const activeClients = new Set();

server.on('upgrade', (request, socket, head) => {
  const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (urlObj.pathname === '/ws/alerts') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  activeClients.add(ws);
  console.log(`[WebSocket] Client connected. Total active clients: ${activeClients.size}`);

  ws.on('close', () => {
    activeClients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total active clients: ${activeClients.size}`);
  });

  ws.on('error', (err) => {
    activeClients.delete(ws);
    console.error(`[WebSocket] Client error: ${err.message}`);
  });
});

function broadcastWSAlert(payload) {
  const msg = JSON.stringify(payload);
  for (const client of activeClients) {
    if (client.readyState === 1) { // OPEN
      client.send(msg);
    }
  }
  console.log(`[WebSocket Broadcast] Dispatched alert: ${payload.event_type.toUpperCase()} in ${payload.geofence.geofence_name}`);
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` GeoTrack Backend & WebSocket Server Running!`);
  console.log(`======================================================`);
  console.log(` REST API URL:       http://localhost:${PORT}`);
  console.log(` WebSocket Endpoint: ws://localhost:${PORT}/ws/alerts`);
  console.log(` Health Check:       http://localhost:${PORT}/health`);
  console.log(` Active Fleet Units: ${db.vehicles.length}`);
  console.log(` Monitored Zones:    ${db.geofences.length}`);
  console.log(` Active Alert Rules: ${db.alertConfigs.length}`);
  console.log(`======================================================\n`);
});
