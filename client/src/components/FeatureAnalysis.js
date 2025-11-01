import {useState} from "react";
import {Card, Col, Row, Form} from 'react-bootstrap';

// Hello I'm Yohei!

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
function analyzeStormData(points) {
    // return 0 if no data
    if (!points || points.length === 0) {
        return {peakRainfall: 0, avgSize: 0, durationHours: 0};
    }

    // 1. Peak Rainfall
    const peakRainfall = Math.max(...points.map(p => p.rainfall));

    // 2. Average Size
    const rawavgSize = points.reduce((sum, p) => sum + p.size, 0) / points.length;
    const avgSize = Math.round(rawavgSize * 100) / 100; // round to 2 decimal places

    // 3. Duration in hours
    const startTime = new Date(points[0].timestamp);
    const endTime = new Date(points[points.length - 1].timestamp);
    const durationHours = Math.abs(endTime - startTime) / (1000 * 60 * 60); // convert ms to hours

    // return the analyzed metrics
    return {peakRainfall, avgSize, durationHours};
}

/**
 * Actual Component for Storm Feature Analysis
 */
function StormFeatureAnalysis({Data1}) {

    // Initialize selectedStormID with the stormId of the first element in Data1
    const [selectedStormID, setSelectedStormID] = useState(
        Data1 && Data1.length > 0 ? Data1[0].stormId : null
    );

    // Handler for changing the selected storm ID
    const handleStormChange = (event) => {
        setSelectedStormID(event.target.value);
    };

    // If Data1 is not provided or empty, show a message
    if (!Data1 || Data1.length === 0) {
        return <p>No storm data for selected Storm ID</p>;
    }

    // Find the data for the selected storm ID
    const selectedStormData = Data1.find(
        (storm) => storm.stormId === selectedStormID
    );

    // Retrieve points array from the selected storm
    const pointsToAnalyze = selectedStormData ? selectedStormData.points : null;
    const features = analyzeStormData(pointsToAnalyze);

    // Prepare array of features for display
    const featuresArray = [
        {
            title: "Peak Rainfall",
            value: features.peakRainfall,
            unit: "mm",
        },
        {
            title: "Average Size",
            value: features.avgSize,
            unit: "km²",
        },
        {
            title: "Duration",
            value: features.durationHours,
            unit: "hours",
        },
    ];

    // Show dropdown and metrics for the selected storm ID
    return (
        <Col xs = {12}>
            <Card>
                <Card.Body>
                    <Card.Title>Storm Feature Analysis</Card.Title>

                    {/* Dropdown to select storm ID */}
                    <Form.Group controlID = 'stormSelet' classname = 'mb-3'>
                        <Form.Label>Select Storm ID:</Form.Label>
                        <Form.Select
                            value = {selectedStormID}
                            onChange = {handleStormChange}
                        >
                            {Data1.map((storm) => (
                                <option key = {storm.stormId} value={storm.stormId}>
                                    {storm.stormId}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    
                    {/* Display corresponding feature cards of the selected storm */}
                    <FeatureRow features = {featuresArray} />
                </Card.Body>
            </Card>
        </Col>
    );
}

export default StormFeatureAnalysis;