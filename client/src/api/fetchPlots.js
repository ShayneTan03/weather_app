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

// Plot1
export async function getPlot1Data(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const p = await request(`/join/plot1${qs ? `?${qs}` : ""}`);
  return unwrap(p);
}

// Plot2
export async function display_join(params = {}) {
    const qs = new URLSearchParams(params).toString();
    console.log(qs);
    const p = await request(`/join/plot2${qs ? `?${qs}` : ""}`);
    return unwrap(p);
}