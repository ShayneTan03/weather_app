import { useState } from "react";
import Plot from "react-plotly.js";
import { Container, Row, Col, Card} from "react-bootstrap";
import { ArrowUp, ArrowDown, Clock} from "react-bootstrap-icons";
import Header from "./Header";
import { MetricRow } from "./Metrics";
import Navigation from "./Navigation";

function Dashboard() {
  const [analysisTimeframe, setAnalysisTimeframe] = useState("monthly"); // default toggle

  const trendData = [
    { period: "2022-01", stormCount: 45, avgDuration: 18.2, avgArea: 280, avgIntensity: 6.1, avgDistance: 8.5 },
    { period: "2022-02", stormCount: 38, avgDuration: 19.8, avgArea: 295, avgIntensity: 6.3, avgDistance: 9.1 },
    { period: "2023-01", stormCount: 38, avgDuration: 22.1, avgArea: 320, avgIntensity: 6.8, avgDistance: 11.2 },
    { period: "2023-02", stormCount: 32, avgDuration: 25.3, avgArea: 355, avgIntensity: 7.4, avgDistance: 13.5 },
  ];

  const recent2023 = trendData.filter(
    (d) => d.period.startsWith("2023"));
  const historical2022 = trendData.filter((d) => d.period.startsWith("2022"));

  const avg = (arr, key) => arr.reduce((sum, d) => sum + d[key], 0) / arr.length;

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

  const [activeView , setActiveView] = useState('map'); // Default => show Map view

  return (
    <Container fluid className="py-4">

      <Header
        analysisTimeframe={analysisTimeframe}
        setAnalysisTimeframe={setAnalysisTimeframe}
        title='Storm Tracker Dashboard'
        subtitle='Track storms over different intervals'
      />

      <div className = 'my-4'>
        <Navigation
          activeView = {activeView}
          setActiveView = {setActiveView}
        />
      </div>

      <div className="mt-4"> 
        {activeView === 'map' && <Map />}
        {activeView === 'plot' && <Plot />}
      </div>

      <MetricRow
        metrics={[
          {
            title: "Frequency",
            change: calculateChange(avgRecent.stormCount, avgHistorical.stormCount),
            icon: <ArrowDown className="text-danger" />,
            unit: "storms/month",
            recent: avgRecent.stormCount,
            historical: avgHistorical.stormCount,
          },
          {
            title: "Duration",
            change: calculateChange(avgRecent.avgDuration, avgHistorical.avgDuration),
            icon: <Clock className="text-primary" />,
            unit: "min avg",
            recent: avgRecent.avgDuration,
            historical: avgHistorical.avgDuration,
          },
          {
            title: "Size",
            change: calculateChange(avgRecent.avgArea, avgHistorical.avgArea),
            unit: "km squared avg",
            recent: avgRecent.avgArea,
            historical: avgHistorical.avgArea,
          },
          {
            title: "Distance",
            change: calculateChange(avgRecent.avgDistance, avgHistorical.avgDistance),
            icon: <ArrowUp className="text-warning" />,
            unit: "km avg",
            recent: avgRecent.avgDistance,
            historical: avgHistorical.avgDistance,
          },
        ]}
      />

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card>
            <Card.Body>
              <Card.Title>Storm Frequency Trend</Card.Title>
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
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "300px" }}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Body>
              <Card.Title>Storm Classification Distribution</Card.Title>
              <Plot
                data={[classificationTrace]}
                layout={{
                  autosize: true,
                  showlegend: false,
                  margin: { t: 20, b: 20, l: 20, r: 20 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "300px" }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>


    </Container>
  );
}


export default Dashboard;