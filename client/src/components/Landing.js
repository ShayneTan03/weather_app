import { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import { Container, Row, Col, Card } from "react-bootstrap";
import { ArrowDown } from "react-bootstrap-icons";
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
import {
    ping,
    getWeatherObs,
    getWeatherStations,
    getStorms,
} from "../api/fetchApi";
import { useMemo } from "react";

function Dashboard() {
    const [activeView, setActiveView] = useState("map");

    /**
     * set date range here to determine what filter to use on the readingss
     */
    const [dateRange, setDateRange] = useState({
        start: new Date("2025-10-05T00:00:00Z"),
        end: new Date("2025-11-31T23:59:59Z"),
    });

    /**
     * state for date range picker and passing to feature analysis component (stormSummary~stormEventLog)
     */
    const [range, setRange] = useState([
        { startDate: new Date(), endDate: new Date(), key: "selection" },
    ]); // default time range

    const [stormSummaryData, setStormSummaryData] = useState([]);
    const [selectedStormId, setSelectedStormId] = useState(null);
    const [stormEventLogData, setStormEventLogData] = useState(null);

    const [readings, setReadings] = useState(null);
    const [storms, setStorms] = useState(null);

    // any asynchronous logic should be handled within useEffect with a nested fn
    // this will load the necessary data before loading the components of the web page
    useEffect(() => {
        async function loadData() {
            try {
                // Fetch actual weather observations and stations from the API

                const stations = await getWeatherStations();
                const observations = await getWeatherObs();
                const storms = await getStorms();

                // Calculate metrics using the fetched data and current dateRange
                const metrics = getMetrics(observations, dateRange);

                // Map stations to readings with metrics
                console.log(metrics);
                const readingMap = stations.map((station) => {
                    const stationMetrics = metrics[station.station_id] || {};
                    return {
                        ...station, // include existing station fields
                        humidity: stationMetrics.humidity_pct ?? null,
                        rainfall: stationMetrics.rainfall_mm ?? null,
                        wind_speed: stationMetrics.wind_speed_knots ?? null,
                        wind_direction:
                            stationMetrics.wind_direction_degrees ?? null,
                        temperature: stationMetrics.temperature_c ?? null,
                    };
                });

                setReadings(readingMap);
                setStorms(storms);
            } catch (err) {
                console.error(err.message);
            }
        }
        loadData();
    }, []);

    // react checks if the values in the arr of dependencies changes
    // reruns if there's any change
    // if empty arr it runs once
    // otherwise i.e [date] it runs whenever the date changes

   
    //data for plot1
    const Data1 = [
        {
            stormId: "STORM_A",
            points: [
                { timestamp: "2025-10-20T00:00Z", rainfall: 1.5, size: 60 },
                { timestamp: "2025-10-20T01:00Z", rainfall: 6.2, size: 140 },
                { timestamp: "2025-10-20T02:00Z", rainfall: 4.0, size: 100 },
                { timestamp: "2025-10-20T03:00Z", rainfall: 2.1, size: 70 },
                { timestamp: "2025-10-20T04:00Z", rainfall: 7.3, size: 150 },
                { timestamp: "2025-10-20T05:00Z", rainfall: 3.2, size: 90 },
            ],
        },
        {
            stormId: "STORM_B",
            points: [
                { timestamp: "2025-10-20T02:00Z", rainfall: 2.5, size: 50 },
                { timestamp: "2025-10-20T03:00Z", rainfall: 8.1, size: 180 },
                { timestamp: "2025-10-20T04:00Z", rainfall: 12.3, size: 240 },
                { timestamp: "2025-10-20T05:00Z", rainfall: 5.0, size: 110 },
                { timestamp: "2025-10-20T06:00Z", rainfall: 3.8, size: 90 },
            ],
        },
    ];
    // data for plot2 (each storm is a single averaged point)
    const Data2 = [
        {
            stormId: "STORM_C",
            rainfall: 4.3,
            windspeed: 20.4,
            size: 102,
            intensity: 5.6,
        },
        {
            stormId: "STORM_D",
            rainfall: 5.3,
            windspeed: 28.0,
            size: 150,
            intensity: 7.8,
        },
        {
            stormId: "STORM_E",
            rainfall: 6.1,
            windspeed: 33.7,
            size: 178,
            intensity: 8.6,
        },
        {
            stormId: "STORM_F",
            rainfall: 3.9,
            windspeed: 18.5,
            size: 88,
            intensity: 4.7,
        },
        {
            stormId: "STORM_G",
            rainfall: 2.7,
            windspeed: 12.9,
            size: 60,
            intensity: 3.2,
        },
        {
            stormId: "STORM_H",
            rainfall: 7.4,
            windspeed: 41.2,
            size: 210,
            intensity: 9.3,
        },
        {
            stormId: "STORM_I",
            rainfall: 4.9,
            windspeed: 24.6,
            size: 125,
            intensity: 6.1,
        },
    ];

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

    const avg = (key) =>
        readings
        .map(r => Number(r[key]) || 0)
        .reduce((a, b) => a + b, 0) / readings.length;

    const metrics = useMemo(() => {
    if (!readings || readings.length === 0) return [];

    return [
        { title: "Temperature", reading: avg("temperature"), icon: <ArrowDown className="text-danger" />, unit: "°C" },
        { title: "Rainfall", reading: avg("rainfall_mm"), icon: <ArrowDown className="text-danger" />, unit: "mm" },
        { title: "Humidity", reading: avg("humidity_pct"), icon: <ArrowDown className="text-danger" />, unit: "%" },
        { title: "Wind Speed", reading: avg("wind_speed_knots"), icon: <ArrowDown className="text-danger" />, unit: "knots" },
        { title: "Wind Direction", reading: avg("wind_direction_degrees"), icon: <ArrowDown className="text-danger" />, unit: "°" },
    ];
    }, [readings, dateRange]);
     

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
            <GlobalDateRangePicker range={range} setRange={setRange} />

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
                        <MetricRow metrics={metrics} />
                        <Row className="justify-content-center mb-4 mt-5">
                            <Col xs={12} md={8}>
                                <RadarMap readings={readings} storms={storms} dateRange={dateRange} />
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
                            {/* Display Feature Analysis */}
                            {<StormFeatureAnalysis storms={storms} Data1={Data1} />}
                            {/* Wrap the Plot1 with Col and Card for cleaner layout */}
                            <Col xs={12}>
                                <Card>
                                    <Card.Body>
                                        {/* Display Plot1 */}
                                        <Plot1 Data1={Data1} />
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
                                        {/* Display Plot2 */}
                                        <Plot2 Data2={Data2} />
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col lg={6}>
                                <Card>
                                    <Card.Body>
                                        <Card.Title>
                                            Storm Classification Distribution
                                        </Card.Title>
                                        <Plot
                                            data={[classificationTrace]}
                                            layout={{
                                                autosize: true,
                                                showlegend: false,
                                                margin: {
                                                    t: 20,
                                                    b: 20,
                                                    l: 20,
                                                    r: 20,
                                                },
                                                paper_bgcolor: "transparent",
                                                plot_bgcolor: "transparent",
                                            }}
                                            config={{
                                                responsive: true,
                                                displayModeBar: false,
                                            }}
                                            style={{
                                                width: "100%",
                                                height: "300px",
                                            }}
                                        />
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
