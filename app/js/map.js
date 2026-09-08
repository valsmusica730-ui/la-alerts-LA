/**
 * LA Real Estate Alerts — Interactive Map (Leaflet.js)
 * Shows markers for LA neighborhoods mentioned in alerts.
 */

let mapInstance = null;
let mapInitialized = false;

// LA neighborhood coordinates (approximate centers)
const LA_LOCATIONS = {
  'koreatown':      { lat: 34.0577, lng: -118.3005, label: 'Koreatown' },
  'hollywood':      { lat: 34.0928, lng: -118.3287, label: 'Hollywood' },
  'venice':         { lat: 33.9850, lng: -118.4695, label: 'Venice' },
  'silver lake':    { lat: 34.0869, lng: -118.2702, label: 'Silver Lake' },
  'echo park':      { lat: 34.0782, lng: -118.2606, label: 'Echo Park' },
  'downtown':       { lat: 34.0407, lng: -118.2468, label: 'Downtown LA' },
  'dtla':           { lat: 34.0407, lng: -118.2468, label: 'Downtown LA' },
  'north hollywood':{ lat: 34.1870, lng: -118.3814, label: 'North Hollywood' },
  'noho':           { lat: 34.1870, lng: -118.3814, label: 'North Hollywood' },
  'palisades':      { lat: 34.0459, lng: -118.5260, label: 'Pacific Palisades' },
  'santa monica':   { lat: 34.0195, lng: -118.4912, label: 'Santa Monica' },
  'beverly hills':  { lat: 34.0736, lng: -118.4004, label: 'Beverly Hills' },
  'west hollywood': { lat: 34.0900, lng: -118.3617, label: 'West Hollywood' },
  'culver city':    { lat: 34.0211, lng: -118.3965, label: 'Culver City' },
  'inglewood':      { lat: 33.9617, lng: -118.3531, label: 'Inglewood' },
  'boyle heights':  { lat: 34.0336, lng: -118.2103, label: 'Boyle Heights' },
  'highland park':  { lat: 34.1113, lng: -118.1945, label: 'Highland Park' },
  'los feliz':      { lat: 34.1063, lng: -118.2879, label: 'Los Feliz' },
  'atwater village':{ lat: 34.1168, lng: -118.2566, label: 'Atwater Village' },
  'eagle rock':     { lat: 34.1395, lng: -118.2148, label: 'Eagle Rock' },
  'glendale':       { lat: 34.1425, lng: -118.2551, label: 'Glendale' },
  'pasadena':       { lat: 34.1478, lng: -118.1445, label: 'Pasadena' },
  'burbank':        { lat: 34.1808, lng: -118.3090, label: 'Burbank' },
  'long beach':     { lat: 33.7701, lng: -118.1937, label: 'Long Beach' },
  'torrance':       { lat: 33.8358, lng: -118.3406, label: 'Torrance' },
  'watts':          { lat: 33.9425, lng: -118.2468, label: 'Watts' },
  'south la':       { lat: 33.9500, lng: -118.2700, label: 'South LA' },
  'compton':        { lat: 33.8958, lng: -118.2201, label: 'Compton' },
  'wilshire':       { lat: 34.0624, lng: -118.3079, label: 'Wilshire' },
  'westwood':       { lat: 34.0585, lng: -118.4412, label: 'Westwood' },
  'brentwood':      { lat: 34.0573, lng: -118.4748, label: 'Brentwood' },
  'encino':         { lat: 34.1592, lng: -118.5014, label: 'Encino' },
  'sherman oaks':   { lat: 34.1508, lng: -118.4490, label: 'Sherman Oaks' },
  'studio city':    { lat: 34.1453, lng: -118.3963, label: 'Studio City' },
  'van nuys':       { lat: 34.1867, lng: -118.4490, label: 'Van Nuys' },
  'woodland hills': { lat: 34.1684, lng: -118.6059, label: 'Woodland Hills' },
  'canoga park':    { lat: 34.2011, lng: -118.5968, label: 'Canoga Park' },
  'sun valley':     { lat: 34.2191, lng: -118.3739, label: 'Sun Valley' },
  'sylmar':         { lat: 34.3086, lng: -118.4469, label: 'Sylmar' },
  'chatsworth':     { lat: 34.2572, lng: -118.6001, label: 'Chatsworth' },
  'wilmington':     { lat: 33.7835, lng: -118.2640, label: 'Wilmington' },
  'san pedro':      { lat: 33.7361, lng: -118.2923, label: 'San Pedro' },
  'playa del rey':  { lat: 33.9562, lng: -118.4413, label: 'Playa del Rey' },
  'mar vista':      { lat: 34.0006, lng: -118.4313, label: 'Mar Vista' },
  'el sereno':      { lat: 34.0847, lng: -118.1848, label: 'El Sereno' },
  'glassell park':  { lat: 34.1202, lng: -118.2279, label: 'Glassell Park' },
  'lincoln heights':{ lat: 34.0676, lng: -118.2109, label: 'Lincoln Heights' },
  'chinatown':      { lat: 34.0621, lng: -118.2401, label: 'Chinatown' },
  'little tokyo':   { lat: 34.0498, lng: -118.2395, label: 'Little Tokyo' },
  'arts district':  { lat: 34.0393, lng: -118.2317, label: 'Arts District' },
};

// Category colors for markers
const CAT_MARKER_COLORS = {
  zoning:       '#887bb5',
  rent:         '#b87a91',
  adu:          '#6aa19a',
  construction: '#b58c58',
  tax:          '#a6924b',
  policy:       '#68947a',
  legal:        '#a35f5f',
  other:        '#6a6870',
};

/**
 * Extract mentioned locations from alert text
 */
function extractLocations(alert) {
  const text = `${alert.title} ${alert.summary}`.toLowerCase();
  const found = [];

  for (const [key, loc] of Object.entries(LA_LOCATIONS)) {
    if (text.includes(key)) {
      found.push({ ...loc, alert });
    }
  }

  return found;
}

/**
 * Create a colored circle marker icon
 */
function createMarkerIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2px solid rgba(255,255,255,0.8);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 12px ${color}60;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Initialize or update the map
 */
function initMap(alerts) {
  const container = document.getElementById('map-container');
  if (!container) return;

  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded');
    container.innerHTML = '<p style="padding:2rem;text-align:center;color:#94a3b8;">Error: Leaflet no cargó.</p>';
    return;
  }

  // Initialize map only once
  if (!mapInstance) {
    mapInstance = L.map(container, {
      center: [34.0522, -118.2437],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    // Light tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Force map resize after rendering
    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  // Clear existing markers
  mapInstance.eachLayer(layer => {
    if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
  });

  // Aggregate markers: one per location, with all alerts
  const locationAlerts = {};
  alerts.forEach(alert => {
    const locs = extractLocations(alert);
    locs.forEach(loc => {
      const key = `${loc.lat},${loc.lng}`;
      if (!locationAlerts[key]) {
        locationAlerts[key] = { lat: loc.lat, lng: loc.lng, label: loc.label, alerts: [] };
      }
      locationAlerts[key].alerts.push(alert);
    });
  });

  // Add markers
  Object.values(locationAlerts).forEach(loc => {
    const primaryCat = loc.alerts[0].category || 'other';
    const color = CAT_MARKER_COLORS[primaryCat] || '#6b7280';

    const popupContent = `
      <div style="font-family: 'Outfit', sans-serif; max-width: 280px;">
        <strong style="font-size: 14px; color: #232128;">${loc.label}</strong>
        <div style="font-size: 11px; color: #5a5761; margin: 4px 0 8px;">
          ${loc.alerts.length} alerta${loc.alerts.length > 1 ? 's' : ''}
        </div>
        ${loc.alerts.slice(0, 3).map(a => `
          <div style="margin-bottom: 6px; font-size: 12px;">
            <a href="${a.link}" target="_blank" rel="noopener"
               style="color: #b39263; text-decoration: none; line-height: 1.4;">
              ${a.title.length > 80 ? a.title.slice(0, 80) + '…' : a.title}
            </a>
          </div>
        `).join('')}
        ${loc.alerts.length > 3 ? `<div style="font-size: 11px; color: #8a8690;">+ ${loc.alerts.length - 3} más</div>` : ''}
      </div>
    `;

    L.marker([loc.lat, loc.lng], { icon: createMarkerIcon(color) })
      .addTo(mapInstance)
      .bindPopup(popupContent, {
        className: 'la-popup',
        maxWidth: 300,
      });
  });

  mapInitialized = true;
}
