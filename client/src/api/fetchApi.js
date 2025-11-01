const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

async function request(path, opts = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), opts.timeout || 30000);
  try {
    const res = await fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: Object.assign({"Content-Type": "application/json"}, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(id);

    // network layer errors
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }

    // try to parse JSON. Some endpoints return wrapped object {status, data, message, timestamp}
    const payload = await res.json().catch(() => null);
    return payload;
  } catch (err) {
    clearTimeout(id);
    // bubble up AbortError or other errors
    throw err;
  }
}

// Helper: handle wrapper {status, data, message, timestamp}
function unwrap(payload) {
  if (!payload) return null;
  // If backend uses make_response wrapper: { status: "success", data: .., message: .. }
  if (payload && typeof payload === "object" && "status" in payload && "data" in payload) {
    if (payload.status === "success") return payload.data;
    // if backend returns {status: "error"}
    throw new Error(payload.message || "API returned error status");
  }
  // If endpoint returns raw array/object, just return it
  return payload;
}

/* --- Exported endpoint helpers --- */

// Weather Stations
export async function getWeatherStations() {
  const p = await request("/list/weatherstations");
  return unwrap(p);
}

export async function getWeatherStationById(station_id) {
  const p = await request(`/weatherstation/${station_id}`);
  return unwrap(p);
}

// Weather Observations
export async function getWeatherObs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  console.log(qs)
  const p = await request(`/list/weatherobs${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

export async function getWeatherObsById(obs_id) {
  const p = await request(`/weatherobs/${obs_id}`);
  return unwrap(p);
}

// Radar Images
export async function getRadarImages(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/list/radarimages${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

export async function getRadarImageById(image_id) {
  const p = await request(`/radarimage/${image_id}`);
  return unwrap(p);
}

// Storm Observations
export async function getStormObservations() {
  const p = await request("/list/stormobservations");
  return unwrap(p);
}

export async function getStormObservationsDateRange(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/list/stormobservations${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

export async function getStormObservationById(obs_id) {
  const p = await request(`/stormobservation/${obs_id}`);
  return unwrap(p);
}

// Raw storm observations (non-wrapped endpoint)
export async function getStormObsRaw() {
  const p = await request("/list/stormobs");
  return unwrap(p);
}

export async function getStormObsById(id) {
  const p = await request(`/stormobs/${id}`);
  return unwrap(p);
}

// Storms
export async function getStorms() {
  const p = await request("/list/storms");
  return unwrap(p);
}

export async function getStormsAtTimestamp(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/storms${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

// Client-side formatted data exports
export async function getPlot1Data(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/export/plot1${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

export async function getPlot2Data(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/export/plot2${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

export async function getPlot3Data(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/export/plot3${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

export async function getRadarMapData(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/export/radarmap${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

export async function getClientReadings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/export/client_readings${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}