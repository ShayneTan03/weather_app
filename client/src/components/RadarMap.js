import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    Tooltip,
    Polyline
} from "react-leaflet";
import { useState, useEffect } from "react";
import { Card, Badge, Form, Button } from "react-bootstrap";
import { FaPlay, FaPause, FaForward, FaBackward } from "react-icons/fa";
import { getMapPointers, singaporeCoords } from "../constants/map";
import { isStormCandidate } from "../utils/math";
import { getStormsAtTimestamp } from "../api/fetchApi";
import { formatTimestamp, generateTimeline } from "../utils/math";

// helper to color code dBZ intensity
function getDbzColor(dbz) {
    if (dbz >= 50) return "red";
    if (dbz >= 20) return "orange";
    return "blue";
}

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
                                <div>Area: {f.area}</div>
                                <div>dBZ: {f.avg_dbz}</div>
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

    return (
        <div id="map-container">
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
                            {MAP_POINTERS.map(
                                (v) =>
                                    v.display && (
                                        <div key={`${r.station_id}-${v.key}`}>
                                            {v.label}:{" "}
                                            {r[v.key] === "NA" ? 0 : r[v.key]}{" "}
                                            {v.unit}
                                        </div>
                                    )
                            )}
                        </Popup>
                    </Marker>
                ))}

                {/* Humidity or metric circles */}
                {MAP_POINTERS.map((v) =>
                    v.display
                        ? readings.map((r) => {
                              const safeVal = Number.isFinite(Number(r[v.key]))
                                  ? Number(r[v.key])
                                  : 0;
                              return (
                                  <Circle
                                      key={`${v.key}-${r.station_id}`}
                                      center={[r.latitude, r.longitude]}
                                      radius={safeVal * v.scale}
                                      fillColor={v.color}
                                      fillOpacity={0.3}
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
                                    .toUTCString()
                                    .split(" ")
                                    .slice(0, 4)
                                    .join(" ")}
                            </Form.Label>
                            <Form.Label>
                                {new Date(selectedTime)
                                    .getUTCHours()
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {new Date(selectedTime)
                                    .getUTCMinutes()
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {new Date(selectedTime)
                                    .getUTCSeconds()
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
                            <div>Coverage: X Hours</div>
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
