import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    Tooltip,
    Polyline,
} from "react-leaflet";
import { useState, useEffect } from "react";
import { Card, Badge, Form, Button } from "react-bootstrap";
import { FaPlay, FaPause, FaForward, FaBackward } from "react-icons/fa";
import { getMapPointers, singaporeCoords } from "../constants/map";
import { isStormCandidate } from "../utils/math";
import { getStormsAtTimestamp } from "../api/fetchApi";
import { formatTimestamp, generateTimeline, getColorForValue, getDbzColor } from "../utils/math";
import L from "leaflet";

const singaporeBounds = {
    north: 1.47, // northernmost latitude
    south: 1.13, // southernmost latitude
    east: 104.03, // easternmost longitude
    west: 103.61, // westernmost longitude
};

function RadarOverlay({ selectedTime }) {
    const [stormFrames, setStormFrames] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        const fetchStorms = async () => {
            setLoading(true);
            try {
                const timestampStr = formatTimestamp(new Date(selectedTime));
                const storms = await getStormsAtTimestamp({
                    timestamp: timestampStr,
                });

                console.log(storms);

                if (!isCancelled) {
                    const frames = storms.flatMap((storm) => {
                        const start = new Date(storm.start_time).getTime();
                        const end = new Date(storm.end_time).getTime();
                        const n = storm.n_frames;

                        return Array.from({ length: n }, (_, i) => {
                            const t = start + (i / (n - 1)) * (end - start);
                            return {
                                timestamp: new Date(t),
                                centroid_x: storm.anchor_x_list[i],
                                centroid_y: storm.anchor_y_list[i],
                                area: storm.area_list[i],
                                avg_dbz: storm.avg_dbz,
                                storm_id: storm.storm_id,
                            };
                        });
                    });

                    setStormFrames(frames);
                }
            } catch (err) {
                console.error(err);
                if (!isCancelled) setStormFrames([]);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        fetchStorms();

        return () => {
            isCancelled = true;
        };
    }, [selectedTime]);

    if (loading) {
        return (
            <div>
                Loading storms for {new Date(selectedTime).toLocaleString()}...
            </div>
        );
    }

    if (!stormFrames.length) return null;

    const fmt = (n, dp = 1) => {
        const num = Number(n);
        return Number.isFinite(num) ? num.toFixed(dp) : n;
    };

    const selectedDate = new Date(selectedTime);

    // start of previous hour
    const startOfPrevHour = new Date(selectedDate);
    startOfPrevHour.setHours(selectedDate.getHours() - 1, 0, 0, 0);

    console.log("Selected Time:", selectedDate.getTime());
    console.log("Start of Previous Hour:", startOfPrevHour.getTime());

    stormFrames.forEach((f, idx) => {
        console.log(`Frame ${idx}: ${new Date(f.timestamp).getTime()}`);
    });

    const framesToRender = stormFrames.filter(
        (f) =>
            new Date(f.timestamp).getTime() >= startOfPrevHour.getTime() ||
            new Date(f.timestamp).getTime() <= selectedDate.getTime()
    );

    console.log("Frames to Render:", framesToRender);

    return (
        <>
            {framesToRender.map((f, idx) => {
                const lat =
                    singaporeBounds.south +
                    (singaporeBounds.north - singaporeBounds.south) *
                        (1 - f.centroid_y / 100);
                const lng =
                    singaporeBounds.west +
                    ((singaporeBounds.east - singaporeBounds.west) *
                        f.centroid_x) /
                        100;

                return (
                    <Circle
                        key={`${f.storm_id}-${idx}`}
                        center={[lat, lng]}
                        radius={f.area * 100} // adjust scale
                        fillColor={getDbzColor(f.avg_dbz)}
                        fillOpacity={0.4}
                        stroke={false}
                    >
                        <Tooltip>
                                    <div>
                                        <div>Storm ID: {f.storm_id}</div>
                                        <div>Area: {fmt(f.area, 1)}</div>
                                        <div>dBZ: {fmt(f.avg_dbz, 1)}</div>
                                        <div>Time: {f.timestamp.toLocaleString()}</div>
                                    </div>
                        </Tooltip>
                    </Circle>
                );
            })}

            {/* Connect frames with a line if the storm_id is the same */}
            {framesToRender.reduce((lines, f, idx, arr) => {
                if (idx === 0) return lines; // skip first
                const prev = arr[idx - 1];
                if (f.storm_id === prev.storm_id) {
                    const latlngs = [
                        [
                            singaporeBounds.south +
                                (singaporeBounds.north -
                                    singaporeBounds.south) *
                                    (1 - prev.centroid_y / 100),
                            singaporeBounds.west +
                                ((singaporeBounds.east - singaporeBounds.west) *
                                    prev.centroid_x) /
                                    100,
                        ],
                        [
                            singaporeBounds.south +
                                (singaporeBounds.north -
                                    singaporeBounds.south) *
                                    (1 - f.centroid_y / 100),
                            singaporeBounds.west +
                                ((singaporeBounds.east - singaporeBounds.west) *
                                    f.centroid_x) /
                                    100,
                        ],
                    ];
                    lines.push(
                        <Polyline
                            key={`${f.storm_id}-line-${idx}`}
                            positions={latlngs}
                            color={getDbzColor(f.avg_dbz)}
                            weight={2}
                            dashArray="4"
                        />
                    );
                }
                return lines;
            }, [])}
        </>
    );
}

function SingaporeMap({ readings, selectedOptions, selectedTime }) {
    const MAP_POINTERS = getMapPointers(selectedOptions);

    if (!readings || readings.length === 0) {
        return <div>Loading radar data...</div>;
    }

    // Color ranges for different metrics (light -> dark)
    const COLOR_RANGES = {
        humidity: ["#f7fbff", "#08306b"],
        rainfall: ["#fff5f0", "#67000d"],
        windSpeed: ["#ffffe5", "#d95f0e"],
        temperature: ["#ffffcc", "#800026"],
        stormIntensity: ["#fff5f0", "#b30000"],
        // fallback
        default: ["#eeeeee", "#444444"],
    };

    // compute min/max/avg for each pointer
    // mark whether this pointer uses a color gradient (wind_direction doesn't)
    const pointerStats = MAP_POINTERS.map((v) => {
        const isGradient = v.key !== "wind_direction";
        const vals = readings.map((r) => {
            const n = Number(r[v.key]);
            return Number.isFinite(n) ? n : 0;
        });
        const min = vals.length ? Math.min(...vals) : 0;
        const max = vals.length ? Math.max(...vals) : 0;
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        const colors = isGradient ? (COLOR_RANGES[v.key] || COLOR_RANGES.default) : null;
        return { ...v, min, max, avg, colors, isGradient };
    });

    return (
        <div id="map-container" style={{ position: "relative" }}>
            <MapContainer
                center={singaporeCoords}
                zoom={12}
                scrollWheelZoom={true}
                style={{ height: "50vh", width: "100%" }}
            >
                {/* Base map tiles */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Station markers */}
                {readings.map((r) => (
                    <Marker
                        key={r.station_id}
                        position={[r.latitude, r.longitude]}
                    >
                        <Popup>
                            <strong>{r.name}</strong>
                            {MAP_POINTERS.map((v) =>
                                v.display && (
                                    <div key={`${r.station_id}-${v.key}`}>
                                        {v.label}: {(() => {
                                            const raw = r[v.key];
                                            const n = Number(raw);
                                            if (Number.isFinite(n)) return n.toFixed(1);
                                            return raw === "NA" ? "0" : raw;
                                        })()} {v.unit}
                                    </div>
                                )
                            )}
                        </Popup>
                    </Marker>
                ))}

                {/* Humidity or metric circles with color gradient based on min/max/avg */}
                {pointerStats.map((v) =>
                    v.display
                        ? readings.map((r) => {
                              const safeVal = Number.isFinite(Number(r[v.key]))
                                  ? Number(r[v.key])
                                  : 0;

                              if (v.key === "wind_direction") {
                                  // render arrow for wind direction (keep original styling)
                                  const angle = safeVal; // wind direction in degrees
                                  const arrowIcon = L.divIcon({
                                      className: "wind-arrow",
                                      html: `<div style="transform: rotate(${angle}deg); font-size: 30px; line-height:0;">↑</div>`,
                                      iconSize: [20, 20],
                                      iconAnchor: [10, 10],
                                  });

                                  return (
                                      <Marker
                                          key={`${v.key}-${r.station_id}`}
                                          position={[r.latitude, r.longitude]}
                                          icon={arrowIcon}
                                      >
                                          <Popup>
                                              {r.name} <br />
                                              Wind Direction: {Math.round(angle)}°
                                          </Popup>
                                      </Marker>
                                  );
                              }

                              const fillColor = getColorForValue(
                                  safeVal,
                                  v.min,
                                  v.max,
                                  v.colors
                              );

                              // render circle for other metrics
                              return (
                                  <Circle
                                      key={`${v.key}-${r.station_id}`}
                                      center={[r.latitude, r.longitude]}
                                      radius={safeVal * v.scale}
                                      fillColor={fillColor}
                                      fillOpacity={0.75}
                                      stroke={false}
                                  />
                              );
                          })
                        : null
                )}

                {readings && selectedTime && (
                    <RadarOverlay selectedTime={selectedTime} />
                )}
            </MapContainer>

                {/* Legend overlay: show gradient per active metric (min / avg / max) */}
                <div
                    className="radar-legend"
                    style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        zIndex: 1000,
                        width: 220,
                        maxHeight: "60vh",
                        overflowY: "auto",
                        background: "rgba(255,255,255,0.95)",
                        padding: 8,
                        borderRadius: 6,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                >
                    {pointerStats
                        .filter((p) => p.display)
                        .map((p) => {
                            // if this pointer is non-gradient (e.g. wind_direction), show a simple legend entry
                            if (!p.isGradient) {
                                return (
                                    <div key={`legend-${p.key}`} style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                            <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 4, border: "1px solid #ddd" }}>
                                                {/* simple arrow example */}
                                                <div style={{ transform: "rotate(0deg)", fontSize: 16 }}>↑</div>
                                            </div>
                                            <div style={{ fontSize: 12, color: "#444" }}>Direction (arrows on map)</div>
                                        </div>
                                    </div>
                                );
                            }

                            const min = p.min;
                            const max = p.max;
                            const avg = p.avg;
                            const colors = p.colors || ["#eee", "#444"];
                            const range = max - min === 0 ? 1 : max - min;
                            const avgPct = Math.max(0, Math.min(100, Math.round(((avg - min) / range) * 100)));

                            // format numbers with one decimal and show unit when present
                            const fmt = (n) => Number(n).toFixed(1);
                            const unitLabel = p.unit ? ` ${p.unit}` : "";

                            return (
                                <div key={`legend-${p.key}`} style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}{unitLabel}</div>
                                    <div style={{ position: "relative", height: 16, borderRadius: 4, overflow: "hidden", background: "#eee" }}>
                                        <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, background: `linear-gradient(to right, ${colors[0]}, ${colors[1]})` }} />
                                        <div title={`avg: ${avg.toFixed(2)}`} style={{ position: "absolute", left: `${avgPct}%`, top: 0, bottom: 0, width: 2, background: "rgba(0,0,0,0.6)", transform: "translateX(-50%)" }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#444" }}>
                                        <div>{fmt(min)}{unitLabel}</div>
                                        <div>{fmt(avg)}{unitLabel}</div>
                                        <div>{fmt(max)}{unitLabel}</div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
        </div>
    );
}

function createStormObj(reading, index) {
    const intensity = Math.round(reading.humidity);
    const area = (Math.random() * 50 * 10).toFixed(1); // rnd for now

    return {
        id: `Storm-${index + 1}`,
        intensity,
        area,
        center: {
            x: reading.lat,
            y: reading.lon,
        },
    };
}

export function DetectedStorms({ storms }) {
    useEffect(() => {
        if (storms && storms.length > 0) {
            const detectedStorms = storms
                .filter(isStormCandidate)
                .map((reading, i) => createStormObj(reading, i));
        }
    }, [storms]);

    if (!storms) {
        return <div>Loading storm data...</div>;
    }
    return (
        <>
            <Card className="h-100">
                <Card.Header>
                    <Card.Title>Detected Storms</Card.Title>
                    <small className="text-muted">
                        {storms.length} storms detected
                    </small>
                </Card.Header>
                <Card.Body style={{ maxHeight: "68vh", overflowY: "auto" }}>
                    {storms &&
                        storms.map((storm) => (
                            <div className="border rounded p-3 mb-3">
                                <div className="d-flex mb-2 justify-content-between align-items-center2">
                                    <span className="fw-medium">
                                        {storm.id}
                                    </span>
                                    <Badge
                                        bg={
                                            storm.avg_dbz >= 50
                                                ? "danger"
                                                : storm.avg_dbz >= 20
                                                ? "primary"
                                                : "secondary"
                                        }
                                    >
                                        {storm.avg_dbz} dBZ
                                    </Badge>
                                </div>
                                <div className="text-muted small">
                                    <div>Storm-{storm.storm_id}</div>
                                    <div>Start: {storm.start_time}</div>
                                    <div>End: {storm.end_time}</div>
                                    <div>Area: {storm.avg_area} km²</div>
                                    <div>
                                        {" "}
                                        Center: ({storm.avg_centroid_x},{" "}
                                        {storm.avg_centroid_y}){" "}
                                    </div>
                                    <div>
                                        {" "}
                                        Duration: {storm.duration} minutes{" "}
                                    </div>
                                </div>
                            </div>
                        ))}
                </Card.Body>
            </Card>
        </>
    );
}

function RadarMap({ readings, range }) {
    const [selectedOptions, setSelectedOptions] = useState({
        humidity: false,
        rainfall: false,
        windSpeed: false,
        windDirection: false,
        stormIntensity: false,
        temperature: false,
    });

    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(2); // multiplier
    const [selectedTime, setSelectedTime] = useState(null);
    const { startDate, endDate } = range[0];
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Set default start and end if API returns null
    const start = startDate
        ? startDate.toISOString()
        : new Date().toISOString();
    const end = endOfDay ? endOfDay.toISOString() : new Date().toISOString();
    const timeline = generateTimeline(start, end);
    const currentIndex = timeline.findIndex((t) => t === selectedTime);

    if (selectedTime === null) setSelectedTime(timeline[0]);

    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setSelectedTime((prev) => {
                const idx = timeline.findIndex((t) => t === prev);
                return timeline[idx + 1] || timeline[0];
            });
        }, 1000 / playbackSpeed);

        return () => clearInterval(interval); // clear and reset if off
    }, [isPlaying, playbackSpeed]);

    useEffect(() => {
        if (range && range[0]) {
            const { startDate, endDate } = range[0];
            if (startDate) {
                setSelectedTime(new Date(startDate).toISOString());
            }
        }
    }, [range]);

    const handleSliderChange = (e) => {
        setSelectedTime(timeline[Number(e.target.value)]);
    };

    const handleOption = (e) => {
        const { name, checked } = e.target;
        setSelectedOptions((prev) => ({ ...prev, [name]: checked }));
    };

    return (
        <>
            <Card>
                <Card.Body>
                    <Card.Title className="mb-4">Radar Scan</Card.Title>
                    <Form className="mb-4">
                        <div className="d-flex flex-wrap justify-content-start gap-2">
                            <Form.Label>
                                {new Date(selectedTime)
                                    .toString()
                                    .split(" ")
                                    .slice(0, 4)
                                    .join(" ")}
                            </Form.Label>
                            <Form.Label>
                                {new Date(selectedTime)
                                    .getHours()
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {new Date(selectedTime)
                                    .getMinutes()
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {new Date(selectedTime)
                                    .getSeconds()
                                    .toString()
                                    .padStart(2, "0")}{" "}
                                GMT
                            </Form.Label>
                        </div>

                        <Form.Range
                            min={0}
                            max={timeline.length - 1}
                            value={currentIndex}
                            onChange={handleSliderChange}
                        />

                        <div className="d-flex flex-wrap justify-content-center gap-5 mb-2">
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() =>
                                    setSelectedTime(
                                        timeline[
                                            (currentIndex -
                                                1 +
                                                timeline.length) %
                                                timeline.length
                                        ]
                                    )
                                }
                            >
                                <FaBackward />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                {isPlaying ? <FaPause /> : <FaPlay />}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() =>
                                    setSelectedTime(
                                        timeline[
                                            (currentIndex + 1) % timeline.length
                                        ]
                                    )
                                }
                            >
                                <FaForward />
                            </Button>
                        </div>

                        <div className="mb-3 text-muted small">
                            {range &&
                                range[0] &&
                                range[0].startDate &&
                                range[0].endDate && (
                                    <div>
                                        Coverage:{" "}
                                        {Math.round(
                                            (new Date(
                                                range[0].endDate
                                            ).getTime() -
                                                new Date(
                                                    range[0].startDate
                                                ).getTime()) /
                                                (1000 * 60 * 60)
                                        )}{" "}
                                        hours
                                    </div>
                                )}
                        </div>
                        <div className="d-flex flex-wrap justify-content-end gap-3">
                            <Form.Check
                                type="checkbox"
                                label="Humidity"
                                name="humidity"
                                checked={selectedOptions.humidity}
                                onChange={handleOption}
                            />
                            <Form.Check
                                type="checkbox"
                                label="Rainfall"
                                name="rainfall"
                                checked={selectedOptions.rainfall}
                                onChange={handleOption}
                            />
                            <Form.Check
                                type="checkbox"
                                label="Wind Speed"
                                name="windSpeed"
                                checked={selectedOptions.windSpeed}
                                onChange={handleOption}
                            />
                            <Form.Check
                                type="checkbox"
                                label="Wind Direction"
                                name="windDirection"
                                checked={selectedOptions.windDirection}
                                onChange={handleOption}
                            />
                            <Form.Check
                                type="checkbox"
                                label="Temperature"
                                name="temperature"
                                checked={selectedOptions.temperature}
                                onChange={handleOption}
                            />
                        </div>
                    </Form>
                    <SingaporeMap
                        readings={readings}
                        selectedOptions={selectedOptions}
                        selectedTime={selectedTime}
                    />
                </Card.Body>
            </Card>
        </>
    );
}

export default RadarMap;
