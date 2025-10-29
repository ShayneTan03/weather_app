import { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import { Container, Row, Col, Card, Form } from "react-bootstrap";
import { ArrowUp, ArrowDown, Clock } from "react-bootstrap-icons";
import Header from "./Header";
import { MetricRow } from "./Metrics";
import Navigation from "./Navigation";
import fetchHumidity from "../api/fetchHumidity";
import RadarMap, {DetectedStorms} from "./RadarMap";
import Plot1 from "./Plot1";
import StormFeatureAnalysis from "./FeatureAnalysis";

function Dashboard() {
    const [activeView, setActiveView] = useState("map"); 
    const [mapView, setMapView] = useState("map"); // Default => show Map view
    const [analysisTimeframe, setAnalysisTimeframe] = useState("Daily"); // default toggle
    const [readings, setReadings] = useState(null);

    // any asynchronous logic should be handled within useEffect with a nested fn
    // this will load the necessary data before loading the components of the web page
    useEffect(() => {
        async function loadData() {
            try {
                const [stationsArr, readingData] = await fetchHumidity(
                    "2025-10-15"
                );
                const readingMap = stationsArr.map((station) => ({
                    ...station, //takes the existing kv pairs
                    humidity: readingData[station.id] ?? "NA",
                }));

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

    const calculateChange = (recent, historical) =>
        ((recent - historical) / historical) * 100;

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
    

    // feed required data into map

    return (
        <Container fluid className="py-4">
            <Header
                analysisTimeframe={analysisTimeframe}
                setAnalysisTimeframe={setAnalysisTimeframe}
                title="Storm Tracker Dashboard"
                subtitle="Track storms over different intervals"
            />

            <div className = 'my-4'>
                <Navigation
                activeView = {activeView}
                setActiveView = {setActiveView}
                buttonArr={["Storm Map","Feature Analysis"]}
                />
            </div>
            <div className="mt-4"> 
                {activeView === 'Storm Map' && (
                    <>
                        <Form.Select 
                        value={analysisTimeframe} 
                        onChange={(e) => setAnalysisTimeframe(e.target.value)}
                        style={{ width: '120px', height: '32px', fontSize: '0.9rem' }}>

                            <option value="hourly">Daily</option>
                            <option value="daily">Weekly</option>
                            <option value="monthly">Monthly</option>

                        </Form.Select>
                        <MetricRow
                            metrics={[
                                {
                                    title: "Frequency",
                                    change: calculateChange(
                                        avgRecent.stormCount,
                                        avgHistorical.stormCount
                                    ),
                                    icon: <ArrowDown className="text-danger" />,
                                    unit: "storms/month",
                                    recent: avgRecent.stormCount,
                                    historical: avgHistorical.stormCount,
                                },
                                {
                                    title: "Duration",
                                    change: calculateChange(
                                        avgRecent.avgDuration,
                                        avgHistorical.avgDuration
                                    ),
                                    icon: <Clock className="text-primary" />,
                                    unit: "min avg",
                                    recent: avgRecent.avgDuration,
                                    historical: avgHistorical.avgDuration,
                                },
                                {
                                    title: "Size",
                                    change: calculateChange(
                                        avgRecent.avgArea,
                                        avgHistorical.avgArea
                                    ),
                                    unit: "km squared avg",
                                    recent: avgRecent.avgArea,
                                    historical: avgHistorical.avgArea,
                                },
                                {
                                    title: "Distance",
                                    change: calculateChange(
                                        avgRecent.avgDistance,
                                        avgHistorical.avgDistance
                                    ),
                                    icon: <ArrowUp className="text-warning" />,
                                    unit: "km avg",
                                    recent: avgRecent.avgDistance,
                                    historical: avgHistorical.avgDistance,
                                },
                            ]}
                        />
                        <RadarMap readings={readings}/>
                        <Row className="justify-content-center mb-4 mt-5">
                            <Col xs={12} md={8}>
                                <Card>
                                    <Card.Body>
                                        <Card.Title className="mb-2">Radar Map</Card.Title>
                                            <div className="my-4 mb-5">
                                                <Navigation
                                                    activeView={mapView}
                                                    setActiveView={setMapView}
                                                    buttonArr={["map","x", "y", "z"]}
                                                />
                                            </div>
                                        {mapView === "map" && (
                                            <RadarMap readings={readings} />
                                        )}
                                        {mapView === "x" && <p>x</p>}
                                        {mapView === "y" && <p>y</p>}
                                        {mapView === "z" && <p>z</p>}
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xs={12} md={4}>
                                <div>
                                <DetectedStorms readings={readings}/>
                                </div>
                            </Col>
                        </Row>
                    </>
                )}

                    
            </div>

            <div className="mt-4">
            {activeView === 'Feature Analysis' && (
                <Col>

                <Row className="g-4"> 
                        {/* Display Feature Analysis */}
                        {<StormFeatureAnalysis Data1={Data1} />}
                        {/* Wrap the Plot1 with Col and Card for cleaner layout */}
                        <Col xs={12}> 
                            <Card>
                                <Card.Body>
                                    {/* Display Plot1 */}
                                    <Plot1 Data1 = {Data1} />
                                </Card.Body>
                            </Card>
                        </Col>
                </Row>

                <Row className="g-4 mb-4">
                    <Col lg={6}>
                        <Card>
                            <Card.Body>
                                <Card.Title>Storm Features Against Rain Frequency</Card.Title>
                                // FIXME: write code for plot2 and add plot2 here
                                <Plot
                                    data={[frequencyTrace]}
                                    layout={{
                                        autosize: true,
                                        margin: { t: 20, b: 40, l: 40, r: 20 },
                                        xaxis: { title: "Period" },
                                        yaxis: { title: "Storm Count" },
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
