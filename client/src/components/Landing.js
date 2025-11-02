import { useState, useEffect, use } from "react";
import Plot from "react-plotly.js";
import { Container, Row, Col, Card } from "react-bootstrap";
import {ArrowDown } from "react-bootstrap-icons";
import Header from "./Header";
import { MetricRow } from "./Metrics";
import Navigation from "./Navigation";
import {getMetrics} from "../api/fetchMetrics";
import RadarMap, { DetectedStorms } from "./RadarMap";
import Plot1 from "./Plot1";
import Plot2 from "./Plot2";
import StormFeatureAnalysis from "./FeatureAnalysis";
import GlobalDateRangePicker from "./DateRange";

// Final API imports
// import { 
//     getPlot1Data, 
//     getPlot2Data, 
//     getPlot3Data,
//     getRadarMapData,
//     getClientReadings
// } from '../api/fetchApi';

// temporary import until API is ready
import { getPlot1Data, display_join as getPlot2Data } from "../api/fetchPlots";
import { getWeatherObs, getWeatherStations } from '../api/fetchApi';
import { useMemo } from "react";
import { de } from "date-fns/locale";
import { set } from "date-fns";


/**
 * Helper function for date formatting for API call
 */
function toISODate(d) {
    if (!d) return ''; // handle error case
    const z = new Date(d);
    const y = z.getFullYear();
    const m = String(z.getMonth() + 1).padStart(2, "0");
    const day = String(z.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}


/**
 * The main Dashboard Displaying different components
 */
function Dashboard() {
    const [activeView, setActiveView] = useState("map");

    /**
     * set date range here to determine what filter to use on the readingss
     */
    const [dateRange, setDateRange] = useState({
        start: new Date("2025-05-01T00:00:00Z"),
        end: new Date("2025-10-31T23:59:59Z")
    });

    /**
     * state for date range picker
     * default start date : D-5 from today
     */
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - 5); // 5 days ago
    defaultDate.setHours(0,0,0,0); // set to start of day
    const [range, setRange] = useState([
        { startDate : defaultDate, endDate : defaultDate, key : "selection"}
    ]); // default time range

    /**
     * state that contains storm data fetched from API
     */
    const [fullStormData, setFullStormData] = useState(null);
    const [plot1Data, setPlot1Data] = useState(null);
    const [plot2Data, setPlot2Data] = useState(null);
    // const [plot3Data, setPlot3Data] = useState(null); 
    const [apiLoading, setApiLoading] = useState(false);
    const [apiError, setApiError] = useState(null);


    /**
     * API CALL HERE
     * fetch storm data whenever date range changes 
     */
    useEffect(() => {

        const { startDate, endDate } = range[0];

        if (!startDate || !endDate) return; // do nothing if dates are invalid

        const loadPlotData = async () => {
            setApiLoading(true);
            setApiError(null);

            // parameters for API call
            const params = {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            };

            try {
                // Call 3 APIs at once using Promise.all
                // const [p1, p2, p3] = await Promise.all([

                // Call 2 APIs at once using Promise.all
                const [p1, p2] = await Promise.all([
                    getPlot1Data(params),
                    getPlot2Data(params),
                    // getPlot3Data(params),
                ]);

                setPlot1Data(p1);
                setPlot2Data(p2);
                // setPlot3Data(p3);

            } catch (error) {
                console.error("Failed to load plot data:", error); // for debugging
                setApiError(error.message || "Failed to load plot data");
                // reset data on error
                setPlot1Data(null);
                setPlot2Data(null);
                // setPlot3Data(null);
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
    // any asynchronous logic should be handled within useEffect with a nested fn
    // this will load the necessary data before loading the components of the web page
    useEffect(() => {
        async function loadData() {
            try {
                // Fetch actual weather observations and stations from the API
                const observations = await getWeatherObs();

                const stations = await getWeatherStations();

                // Calculate metrics using the fetched data and current dateRange
                const metrics = getMetrics(observations, dateRange);


                // Map stations to readings with metrics
                const readingMap = stations.map((station) => {
                    const stationMetrics = metrics[station.station_id] || {};

                    return {
                        ...station, // include existing station fields
                        humidity: stationMetrics.humidity_pct ?? null,
                        rainfall: stationMetrics.rainfall_mm ?? null,
                        wind_speed: stationMetrics.wind_speed_knots ?? null,
                        wind_direction: stationMetrics.wind_direction_degrees ?? null,
                        temperature: stationMetrics.temperature_c ?? null,
                    };
                });

                setReadings(readingMap);
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

    const trendData = [
        {
            period: "2022-01",
            stormCount: 45,
            avgDuration: 18.2,
            avgArea: 280,
            avgIntensity: 6.1,
            avgDistance: 8.5,
        },
        {
            period: "2022-02",
            stormCount: 38,
            avgDuration: 19.8,
            avgArea: 295,
            avgIntensity: 6.3,
            avgDistance: 9.1,
        },
        {
            period: "2023-01",
            stormCount: 38,
            avgDuration: 22.1,
            avgArea: 320,
            avgIntensity: 6.8,
            avgDistance: 11.2,
        },
        {
            period: "2023-02",
            stormCount: 32,
            avgDuration: 25.3,
            avgArea: 355,
            avgIntensity: 7.4,
            avgDistance: 13.5,
        },
    ];
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
        { stormId: "STORM_C", rainfall: 4.3, windspeed: 20.4, size: 102, intensity: 5.6 },
        { stormId: "STORM_D", rainfall: 5.3, windspeed: 28.0, size: 150, intensity: 7.8 },
        { stormId: "STORM_E", rainfall: 6.1, windspeed: 33.7, size: 178, intensity: 8.6 },
        { stormId: "STORM_F", rainfall: 3.9, windspeed: 18.5, size: 88,  intensity: 4.7 },
        { stormId: "STORM_G", rainfall: 2.7, windspeed: 12.9, size: 60,  intensity: 3.2 },
        { stormId: "STORM_H", rainfall: 7.4, windspeed: 41.2, size: 210, intensity: 9.3 },
        { stormId: "STORM_I", rainfall: 4.9, windspeed: 24.6, size: 125, intensity: 6.1 },
    ];

    // Dummy data for feature analysis component
    const Data3 = [
    {
        storm_id: "STORM-A-2025",
        start_time: "2025-10-01T10:00:00Z",
        end_time: "2025-10-01T12:00:00Z",
        duration: 120, 
        avg_area: 150.5,
        max_area: 300.0,
        avg_dbz: 40.2,
        max_dbz: 55.0,
        total_distance_traveled: 25.5 // km
    },
    {
        storm_id: "STORM-B-2025",
        start_time: "2025-10-02T14:00:00Z",
        end_time: "2025-10-02T15:30:00Z",
        duration: 90,
        avg_area: 120.0,
        max_area: 250.0,
        avg_dbz: 38.0,
        max_dbz: 50.0,
        total_distance_traveled: 15.0
    }
];

    const recent2023 = trendData.filter((d) => d.period.startsWith("2023"));
    const historical2022 = trendData.filter((d) => d.period.startsWith("2022"));

    const avg = (arr, key) =>
        arr.reduce((sum, d) => sum + d[key], 0) / arr.length;

    const avgRecent = {
        stormCount: avg(recent2023, "stormCount"),
        avgDuration: avg(recent2023, "avgDuration"),
        avgArea: avg(recent2023, "avgArea"),
        avgIntensity: avg(recent2023, "avgIntensity"),
        avgDistance: avg(recent2023, "avgDistance"),
    };

    const avgHistorical = {
        stormCount: avg(historical2022, "stormCount"),
        avgDuration: avg(historical2022, "avgDuration"),
        avgArea: avg(historical2022, "avgArea"),
        avgIntensity: avg(historical2022, "avgIntensity"),
        avgDistance: avg(historical2022, "avgDistance"),
    };

    const stormClassification = [
        { name: "Light (<5 dBZ)", value: 35, color: "#22c55e" },
        { name: "Moderate (5–7 dBZ)", value: 40, color: "#eab308" },
        { name: "Heavy (7–9 dBZ)", value: 20, color: "#f59e0b" },
        { name: "Severe (>9 dBZ)", value: 5, color: "#ef4444" },
    ];

    // data for plotly to trace
    const frequencyTrace = {
        x: trendData.map((d) => d.period),
        y: trendData.map((d) => d.stormCount),
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#0d6efd", width: 3 },
        marker: { size: 6 },
        name: "Storm Count",
    };

    const classificationTrace = {
        values: stormClassification.map((d) => d.value),
        labels: stormClassification.map((d) => d.name),
        type: "pie",
        marker: { colors: stormClassification.map((d) => d.color) },
        textinfo: "label+percent",
        hole: 0.5,
    };

    const metrics = useMemo(() => {
        if (!readings) return [];
        const temperatureArr = readings.map(r => r.temperature);
        const rainfallArr = readings.map(r => r.rainfall);
        const humidityArr = readings.map(r => r.humidity);
        const windSpeedArr = readings.map(r => r.wind_speed)
        return [
            {
                title: "Temperature",
                reading: temperatureArr,
                icon: <ArrowDown className="text-danger" />,
                unit: "°C",
            },
            {
                title: "Rainfall",
                reading: rainfallArr,
                icon: <ArrowDown className="text-danger" />,
                unit: "mm",
            },
            {
                title: "Humidity",
                reading: humidityArr,
                icon: <ArrowDown className="text-danger" />,
                unit: "mm",
            },
            {
                title: "Wind Speed",
                reading: windSpeedArr,
                icon: <ArrowDown className="text-danger" />,
                unit: "mm",
            },
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
            <GlobalDateRangePicker
                range={range}
                setRange={setRange}
                activeShortcut={activeShortcut}
                setActiveShortcut={setActiveShortcut}
                /> 

            <div className = 'my-4'>
                <Navigation
                activeView = {activeView}
                setActiveView = {setActiveView}
                buttonArr={["map", "plot"]}
                />
            </div>
            <div className="mt-4"> 
                {activeView === 'map' && (
                    <>
                        <MetricRow metrics={metrics} />
                        <Row className="justify-content-center mb-4 mt-5">
                            <Col xs={12} md={8}>
                                <RadarMap readings={readings} />
                            </Col>
                            <Col xs={12} md={4}>
                                <div>
                                    <DetectedStorms readings={readings} />
                                </div>
                            </Col>
                        </Row>
                    </>
                )}

                    
            </div>

            <div className="mt-4">
            {activeView === 'plot' && (
                <Col>

                <Row className="g-4"> 
                    {/* Handle loading and error states */}
                    {apiLoading && <div>Loading charts...</div>}
                    {apiError && <div style={{ color: 'red' }}>Error: {apiError}</div>}
                    {/* Display Feature Analysis */}
                    {/* Replace Data3 with actual StormData when API is ready */}
                    <StormFeatureAnalysis stormSummaryData={Data3} />
                    
                    {/* Wrap the Plot1 with Col and Card for cleaner layout */}
                    <Col xs={12}>
                        <Card>
                            <Card.Body>
                                {/* Display Plot1 only if data is available */}
                                {plot1Data && <Plot1 Data1 = {plot1Data} />}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Row className="g-4 mb-4">
                    <Col lg={6}> 
                        <Card>
                            <Card.Body>
                                <Card.Title>
                                    Storm Features Against Rainfall and Wind Speed
                                </Card.Title>
                                {/* Display Plot2 only if data is available */}
                                {plot2Data && <Plot2 Data2 = {plot2Data} />}
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
                                        margin: { t: 20, b: 20, l: 20, r: 20 },
                                        paper_bgcolor: "transparent",
                                        plot_bgcolor: "transparent",
                                    }}
                                    config={{
                                        responsive: true,
                                        displayModeBar: false,
                                    }}
                                    style={{ width: "100%", height: "300px" }}
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
