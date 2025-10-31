import React, {useState} from "react";
import {Card, Col, Row, Form, Button, Placeholder} from 'react-bootstrap';

/**
 * A simple card component that shows a single value
 */
function FeatureCard({title, value, unit}) {
    return (
        <Col md = {4}>
            <Card className = 'h-100'>
                <Card.Body>
                    <div className = 'd-flex align-items-center mb-2 gap-2'>
                        <span className = 'fw-medium'>
                            {title}
                        </span>
                    </div>
                    <h4 className = 'fw-bold'>
                        {value.toFixed(1)}
                        <span className = "text-muted small ms-2">
                            {unit}
                        </span>
                    </h4>
                </Card.Body>
            </Card>
        </Col>
    );
}

/**
 * Reciecves the array of features and shows them in a row of FeatureCards
 */
function FeatureRow({features}) {
    return (
        <Row className = 'g-4'>
            {features.map((feature, index) => (
                <FeatureCard
                    key = {index}
                    title = {feature.title}
                    value = {feature.value}
                    unit = {feature.unit}
                />
            ))}
        </Row>
    )
}

/**
 * Analyze the storm data from the points array.
 * @param {Array} points - Array of data points to analyze
 * @returns {object} - {peakRainfall, avgSize, durationHours}
 */
// function analyzeStormData(points) {
//     // return 0 if no data
//     if (!points || points.length === 0) {
//         return {peakRainfall: 0, avgSize: 0, durationHours: 0};
//     }

//     // 1. Peak Rainfall
//     const peakRainfall = Math.max(...points.map(p => p.rainfall));

//     // 2. Average Size
//     const rawavgSize = points.reduce((sum, p) => sum + p.size, 0) / points.length;
//     const avgSize = Math.round(rawavgSize * 100) / 100; // round to 2 decimal places

//     // 3. Duration in hours
//     const startTime = new Date(points[0].timestamp);
//     const endTime = new Date(points[points.length - 1].timestamp);
//     const durationHours = Math.abs(endTime - startTime) / (1000 * 60 * 60); // convert ms to hours

//     // return the analyzed metrics
//     return {peakRainfall, avgSize, durationHours};
// }

/**
 * Actual Component for Storm Feature Analysis
 */
function StormFeatureAnalysis({ stormSummaryData }) {

    // Initialize selectedStormID with the stormId of the first element in Data1
    const [selectedStormID, setSelectedStormID] = useState(
        stormSummaryData && stormSummaryData.length > 0 ? stormSummaryData[0].storm_id : null
    );

    // Handler for changing the selected storm ID
    const handleStormChange = (event) => {
        setSelectedStormID(event.target.value);
    };

    // If stormSummaryDate is not provided or empty, show a message
    if (!stormSummaryData || stormSummaryData.length === 0) {
        return <p>No storm data for selected date range.</p>;
    }

    // Find the data for the selected storm ID
    const selectedStorm = stormSummaryData.find(
        (storm) => storm.storm_id === selectedStormID
    );

    // Retrieve points array from the selected storm
    // const pointsToAnalyze = selectedStormData ? selectedStormData.points : null;
    // const features = analyzeStormData(pointsToAnalyze);

    // Prepare array of features for display
    const featuresArray = selectedStorm ? [
        {
            title: "Max Area",
            value: selectedStorm.max_area || 0,
            unit: "km²", // need to confirm unit
        },
        {
            title: "Total Distance",
            value: selectedStorm.total_distance_traveled || 0,
            unit: "km",
        },
        {
            title: "Duration",
            value: selectedStorm.duration || 0,
            unit: "minutes", // need to confirm unit
        },
        {
            title: "Max Intensity",
            value: selectedStorm.max_dbz || 0,
            unit: "dBZ",
        },
        {
            title: "Avg Area",
            value: selectedStorm.avg_area || 0,
            unit: "km²",
        },
        {
            title: "Avg Intensity",
            value: selectedStorm.avg_dbz || 0,
            unit: "dBZ",
        }
    ] : []; // Fallback to empty array if no storm is selected

    // Show dropdown and metrics for the selected storm ID
    return (
        <Col xs = {12}>
            <Card>
                <Card.Body>
                    <Card.Title>Storm Feature Analysis</Card.Title>

                    {/* Dropdown to select storm ID */}
                    <Form.Group controlID = 'stormSelet' className = 'mb-3'>
                        <Form.Label>Select Storm ID:</Form.Label>
                        <Form.Select
                            value = {selectedStormID}
                            onChange = {handleStormChange}
                        >
                            {stormSummaryData.map((storm) => (
                                <option key = {storm.storm_id} value={storm.storm_id}>
                                    {storm.storm_id}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    
                    {/* Display corresponding feature cards of the selected storm */}
                    <FeatureRow features = {featuresArray} />

                    {/* CSV Export Button */}
                    <div className = 'mt-4'>
                        <Button variant="outline-secondary">
                            Export Storm Log to CSV
                        </Button>
                    </div>

                    {/* Storm Trajectory Map*/}
                    <Card className="mt-4">
                        <Card.Header>Storm Trajectory Map</Card.Header>
                        <Card.Body style = {{ height: '300px', backgroundColor: '#f8f9fa' }}>
                            <Placeholder as="div" animation="glow" style={{ height: '100%' }}>
                                <Placeholder xs={12} style={{ height: '100%', borderRadius: '0.375rem',
                                                            display: 'flex', alignItems: 'center',
                                                            justifyContent: 'center', color: '#6c757d' }}>
                                    Map rendering area (API 2 data will be used here)
                                </Placeholder>
                            </Placeholder>
                        </Card.Body>
                    </Card>

                </Card.Body>
            </Card>
        </Col>
    );
}

export default StormFeatureAnalysis;