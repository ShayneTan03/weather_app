import { useState, useEffect, useMemo } from "react";
import Plot from "react-plotly.js";
import { Container, Row, Col, Card } from "react-bootstrap";
import { ThermometerHalf, CloudRain, Droplet, Wind, ArrowDown } from "react-bootstrap-icons";
import Header from "./Header";
import { MetricRow } from "./Metrics";
import Navigation from "./Navigation";
import { getMetrics } from "../api/fetchMetrics";
import RadarMap, { DetectedStorms } from "./RadarMap";
import Plot1 from "./Plot1";
import Plot2 from "./Plot2";
import Plot3 from "./Plot3";
import StormFeatureAnalysis from "./FeatureAnalysis";
import GlobalDateRangePicker from "./DateRange";
import { getPlot1Data, getPlot2Data, getPlot3Data } from "../api/fetchPlots";
import { getWeatherObs, getWeatherStations, getStorms } from "../api/fetchApi";
import { toISODate } from "../utils/math";

// Final API imports
// import {
//     getPlot1Data,
//     getPlot2Data,
//     getPlot3Data,
//     getRadarMapData,
//     getClientReadings
// } from '../api/fetchApi';

/**
 * The main Dashboard Displaying different components
 */
function Dashboard() {
    const [activeView, setActiveView] = useState("map");
    /**
     * state for date range picker
     * default start date : D-5 from today
     */
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - 5); // 5 days ago
    defaultDate.setHours(0, 0, 0, 0); // set to start of day
    const [range, setRange] = useState([
        { startDate: defaultDate, endDate: defaultDate, key: "selection" },
    ]); // default time range

    /**
     * state that contains storm data fetched from API
     */
    const [fullStormData, setFullStormData] = useState(null);
    const [plot1Data, setPlot1Data] = useState(null);
    const [plot2Data, setPlot2Data] = useState(null);
    const [plot3Data, setPlot3Data] = useState(null);
    const [apiLoading, setApiLoading] = useState(false);
    const [apiError, setApiError] = useState(null);


//     const Data3 = [
//     {
//         "storm_id": "STORM-A-2025",
//         "start_time": "2025-10-28T10:00:00Z",
//         "end_time": "2025-10-28T12:30:00Z",
//         "duration": 150.0,
//         "avg_area": 150.5,
//         "max_area": 300.0,
//         "avg_dbz": 40.2,
//         "max_dbz": 55.0,
//         "total_distance_traveled": 25.5
//     },
//     {
//         "storm_id": "STORM-B-2025",
//         "start_time": "2025-10-28T14:00:00Z",
//         "end_time": "2025-10-28T15:30:00Z",
//         "duration": 90.0,
//         "avg_area": 120.0,
//         "max_area": 250.0,
//         "avg_dbz": 38.0,
//         "max_dbz": 50.0,
//         "total_distance_traveled": 15.0
//     },
//     {
//         "storm_id": "STORM-C-2025",
//         "start_time": "2025-10-28T18:00:00Z",
//         "end_time": "2025-10-28T18:45:00Z",
//         "duration": 45.0,
//         "avg_area": 80.2,
//         "max_area": 110.0,
//         "avg_dbz": 35.5,
//         "max_dbz": 48.0,
//         "total_distance_traveled": 8.2
//     }
// ];





    /**
     * API CALL HERE
     * fetch storm data whenever date range changes
     */
    useEffect(() => {
        const { startDate, endDate } = range[0];

        if (!startDate || !endDate) return; // do nothing if dates are invalid

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        const loadPlotData = async () => {
            setApiLoading(true);
            setApiError(null);

            // parameters for API call
            const params = {
                start_time: toISODate(startDate),
                end_time: toISODate(endOfDay),
            };

            try {
                // Call 3 APIs at once using Promise.all
                const [p1, p2, p3] = await Promise.all([
                    getPlot1Data(params),
                    getPlot2Data(params),
                    getPlot3Data(params),
                ]);

                setPlot1Data(p1);
                setPlot2Data(p2);
                setPlot3Data(p3);
            } catch (error) {
                console.error("Failed to load plot data:", error); // for debugging
                setApiError(error.message || "Failed to load plot data");
                // reset data on error
                setPlot1Data(null);
                setPlot2Data(null);
                setPlot3Data(null);
            } finally {
                setApiLoading(false);
            }
        };

        loadPlotData();
    }, [range]); // Runs whenever date range changes

    /**
     * state for passing to FeatureAnalysis component (stormSummary~stormEventLog)
     */
    const [activeShortcut, setActiveShortcut] = useState(1);
    const [stormSummaryData, setStormSummaryData] = useState([]);
    const [selectedStormId, setSelectedStormId] = useState(null);
    const [stormEventLogData, setStormEventLogData] = useState(null);

    const [readings, setReadings] = useState(null);
    const [storms, setStorms] = useState(null);
    const [metrics, setMetrics] = useState(null);

    // any asynchronous logic should be handled within useEffect with a nested fn
    // this will load the necessary data before loading the components of the web page
    useEffect(() => {
        async function loadData() {
            try {
                const { startDate, endDate } = range[0];
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);

                const stations = await getWeatherStations();
                const observations = await getWeatherObs();
                const stormsData = await getStorms();

                const metrics = getMetrics(observations, {
                    start: startDate,
                    end: endOfDay,
                });

                const readingMap = stations
                    .map((station) => {
                        const stationMetrics =
                            metrics[station.station_id] || {};
                        const reading = {
                            ...station,
                            humidity: stationMetrics.humidity_pct ?? null,
                            rainfall: stationMetrics.rainfall_mm ?? null,
                            wind_speed: stationMetrics.wind_speed ?? null,
                            wind_direction:
                                stationMetrics.wind_direction ?? null,
                            temperature: stationMetrics.temperature ?? null,
                        };
                        return reading;
                    })
                    // keep only stations with at least one non-null metric
                    .filter(
                        (r) =>
                            r.humidity !== null ||
                            r.rainfall !== null ||
                            r.wind_speed !== null ||
                            r.wind_direction !== null ||
                            r.temperature !== null
                    );

                const filteredStorms = stormsData.filter((storm) => {
                    const stormStart = new Date(storm.start_time);
                    const stormEnd = new Date(storm.end_time);
                    return stormStart >= startDate && stormEnd <= endOfDay;
                });

                setReadings(readingMap);
                setMetrics(metrics);
                setStorms(filteredStorms);
            } catch (err) {
                console.error(err.message);
            }
        }

        loadData();
    }, [range]);
    // Runs whenever date range changes
    // react checks if the values in the arr of dependencies changes
    // reruns if there's any change
    // if empty arr it runs once
    // otherwise i.e [date] it runs whenever the date changes

    const stormClassification = [
        { name: "Light (<5 dBZ)", value: 35, color: "#22c55e" },
        { name: "Moderate (5–7 dBZ)", value: 40, color: "#eab308" },
        { name: "Heavy (7–9 dBZ)", value: 20, color: "#f59e0b" },
        { name: "Severe (>9 dBZ)", value: 5, color: "#ef4444" },
    ];

    const classificationTrace = {
        values: stormClassification.map((d) => d.value),
        labels: stormClassification.map((d) => d.name),
        type: "pie",
        marker: { colors: stormClassification.map((d) => d.color) },
        textinfo: "label+percent",
        hole: 0.5,
    };

    // Helper to compute average
    const avg = (key) => {
        if (!metrics || typeof metrics !== "object") return null;

        const metricsArray = Object.values(metrics); // convert object to array
        if (metricsArray.length === 0) return null;

        const values = metricsArray
            .map((r) => r[key])
            .filter((v) => v !== null && v !== undefined && !isNaN(v));

        if (values.length === 0) return null;

        return values.reduce((a, b) => a + b, 0) / values.length;
    };

    const avgMetrics = useMemo(() => {
        if (!metrics || typeof metrics !== "object") return [];

        const windDirectionAvg = avg("wind_direction");

        return [
            {
                title: "Temperature",
                reading: avg("temperature"),
                icon: <ThermometerHalf className="text-danger" />,
                unit: "°C",
            },
            {
                title: "Rainfall",
                reading: avg("rainfall_mm"),
                icon: <CloudRain className="text-primary" />,
                unit: "mm",
            },
            {
                title: "Humidity",
                reading: avg("humidity_pct"),
                icon: <Droplet className="text-info" />,
                unit: "%",
            },
            {
                title: "Wind Speed",
                reading: avg("wind_speed"),
                icon: <Wind className="text-warning" />,
                unit: "knots",
            },
            {
                title: "Wind Direction",
                reading: windDirectionAvg,
                icon:
                    windDirectionAvg !== null ? (
                        <ArrowDown
                            className="text-primary"
                            style={{
                                transform: `rotate(${windDirectionAvg}deg)`,
                            }}
                        />
                    ) : (
                        <span>-</span>
                    ),
                unit: "",
            },
        ];
    }, [metrics, range]);

    return (
        <Container fluid className="py-4">
            <Header
                className="header-large"
                title={<span className="h2">Storm Tracker Dashboard</span>}
                subtitle={
                    <span className="h5">
                        Track storms over different intervals
                    </span>
                }
            />

            {/* Show Date Range Picker above navigation bar*/}
            <GlobalDateRangePicker
                range={range}
                setRange={setRange}
                activeShortcut={activeShortcut}
                setActiveShortcut={setActiveShortcut}
            />

            <div className="my-4">
                <Navigation
                    activeView={activeView}
                    setActiveView={setActiveView}
                    buttonArr={["map", "plot"]}
                />
            </div>
            <div className="mt-4">
                {activeView === "map" && storms && (
                    <>
                        <MetricRow metrics={avgMetrics} />
                        <Row className="justify-content-center mb-4 mt-5">
                            <Col xs={12} md={8}>
                                <RadarMap readings={readings} range={range} />
                            </Col>
                            <Col xs={12} md={4}>
                                <div>
                                    <DetectedStorms storms={storms} />
                                </div>
                            </Col>
                        </Row>
                    </>
                )}
            </div>

            <div className="mt-4">
                {activeView === "plot" && (
                    <Col>
                        <Row className="g-4">
                            {/* Handle loading and error states */}
                            {apiLoading && <div>Loading charts...</div>}
                            {apiError && (
                                <div style={{ color: "red" }}>
                                    Error: {apiError}
                                </div>
                            )}
                            {/* Display Feature Analysis */}
                            {plot3Data && <StormFeatureAnalysis storms={plot3Data} plot1Data={plot1Data} />}

                            {/* Wrap the Plot1 with Col and Card for cleaner layout */}
                            <Col xs={12}>
                                <Card>
                                    <Card.Body>
                                        {/* Display Plot1 only if data is available */}
                                        {plot1Data && (
                                            <Plot1 Data1={plot1Data} />
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Row className="g-4 mb-4">
                            <Col lg={6}>
                                <Card>
                                    <Card.Body>
                                        <Card.Title>
                                            Storm Features Against Rainfall and
                                            Wind Speed
                                        </Card.Title>
                                        {/* Display Plot2 only if data is available */}
                                        {plot2Data && (
                                            <Plot2 Data2={plot2Data} />
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col lg={6}>
                                <Card>
                                    <Card.Body>
                                        <Card.Title>
                                            Storm Duration vs Intensity
                                        </Card.Title>
                                        {/* Display Plot3 only if data is available */}
                                        {plot3Data && <Plot3 Data3 = {plot3Data} />}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Col>
                )}
            </div>
        </Container>
    );
}

export default Dashboard;
