import React, {useState} from "react";
import {Card, Col, Row, Form, Button, Placeholder} from 'react-bootstrap';
import { CSVLink } from "react-csv";


/**
 * Helper function to format ISO time strings to a more readable format
 * YYYY-MM-DD HH:MM(24hr)
 * Used Swedish locale to get the desired format easily
 * @param {*} isoString 
 * @returns {string} Formatted time string YYYY-MM-DD HH:MM (24hr) or "N/A" if input is invalid
 */
function fmtTime(isoString) {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

/**
 * A simple card component that shows a single value
 */
function FeatureCard({title, value, unit, start_time, end_time}) {
    return (
        <Col md = {4}>
            <Card className = 'h-100'>
                <Card.Body>
                    <div className = 'd-flex align-items-center mb-2 gap-2'>
                        <span className = 'fw-medium'>
                            {title}
                        </span>
                    </div>

                    {/* <h4 className = 'fw-bold'>
                        {value.toFixed(1)}
                        <span className = "text-muted small ms-2">
                            {unit}
                        </span>
                    </h4> */}
                    
                    <div className='d-flex justify-content-between align-items-baseline'>
                        {/* Main Value */}
                        <h4 className = 'fw-bold mb-0'>
                            {/* If value is an integer, show without decimal places */}
                            {value % 1 === 0 ? value : value.toFixed(1)} 
                            <span className = "text-muted small ms-2">
                                {unit}
                            </span>
                        </h4>

                        {/* Start/End Times (Show if available) */}
                        {start_time && end_time && (
                            <div className='text-end text-muted' style={{fontSize: '1.1rem', lineHeight: '1.4'}}>
                                <div><strong>Start:</strong> {fmtTime(start_time)}</div>
                                <div><strong>End:</strong> {fmtTime(end_time)}</div>
                            </div>
                        )}
                    </div>
                    
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
                    start_time={feature.start_time}
                    end_time={feature.end_time}
                />
            ))}
        </Row>
    )
}


/**
 * Actual Component for Storm Feature Analysis
 */
function StormFeatureAnalysis({storms, plot1Data}) {
    console.log(storms);
    
    // Initialize state FIRST (before any returns)
    const [selectedStormID, setSelectedStormID] = useState(
        storms && storms.length > 0 ? storms[0].storm_id : null
    );
    
    // Handler for changing the selected storm ID
    const handleStormChange = (event) => {
        setSelectedStormID(Number(event.target.value));
    };
    
    // Early return if no data (AFTER all hooks)
    if (!storms || storms.length === 0) {
        return <p>No storm data for selected date range.</p>;
    }
    
    // Calculate averages AFTER confirming we have data
    const averageDuration = storms.reduce((sum, storm) => sum + storm.duration, 0) / storms.length;
    const averageIntensity = storms.reduce((sum, storm) => sum + storm.avg_dbz, 0) / storms.length;
    const averageSize = storms.reduce((sum, storm) => sum + storm.avg_area, 0) / storms.length;

    // Find the data for the selected storm ID
    const selectedStorm = storms.find(
        (storm) => storm.storm_id === selectedStormID
    );

    // Find the log data for the selected storm ID from plot1Data

    // FeatureAnalysis.js (155行目) を修正 [cite: FeatureAnalysis.js]
    const selectedStormLog = plot1Data?.find(s => s.stormId === selectedStormID)?.points || [];
    // const selectedStormLog = plot1Data
    //     ? plot1Data.find(s => s.stormId === selectedStormID)?.points 
    //     : [];

    // Retrieve points array from the selected storm
    // const pointsToAnalyze = selectedStormData ? selectedStormData.points : null;
    // const features = analyzeStormData(pointsToAnalyze);


    const avgFeaturesArray = [
        {
            title: "Average Duration",
            value: averageDuration,
            unit: "minutes",
        },
        {
            title: "Average Intensity",
            value: averageIntensity,
            unit: "dbz",
        },
        {
            title: "Average Size",
            value: averageSize,
            unit: "km²",
        },
    ]

    const featuresArray = selectedStorm ? [
        {
            title: "Max Area",
            value: selectedStorm.max_area || 0,
            unit: "km²", // need to confirm unit
        },
        {
            title: "Max Intensity",
            value: selectedStorm.max_dbz || 0,
            unit: "dBZ",
        },
        {
            title: "Duration",
            value: selectedStorm.duration || 0,
            unit: "minutes", // need to confirm unit
            start_time: selectedStorm.start_time,
            end_time: selectedStorm.end_time
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
        },
        {
            title: "Total Distance",
            value: selectedStorm.total_distance_traveled || 0,
            unit: "km",
        }
    ] : []; // Fallback to empty array if no storm is selected

    // Show dropdown and metrics for the selected storm ID
    return (
        <Col xs = {12}>
            <Card>
                <Card.Body>
                    <Card.Title>Storm Feature Analysis</Card.Title>

                    <Card.Subtitle className="mb-3 text-muted">
                        Averages for all storms in selected range
                    </Card.Subtitle>

                    {storms && <FeatureRow features = {avgFeaturesArray} />}

                    <h5 className="mt-4 mb-3">Individual Storm Features</h5>

                    {/* Dropdown to select storm ID */}
                    <Form.Group controlID = 'stormSelet' className = 'mb-3'>
                        <Form.Label style={{ fontSize: '1.1rem' }}>Select Storm ID:</Form.Label>
                        <Form.Select
                            value = {selectedStormID}
                            onChange = {handleStormChange}
                        >
                            {storms.map((storm) => (
                                <option key = {storm.storm_id} value={storm.storm_id}>
                                    {storm.storm_id}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    
                    {/* Display corresponding feature cards of the selected storm */}
                    <FeatureRow features = {featuresArray} />

                    {/* CSV Export Button */}
                    <div className = 'mt-4 d-flex gap-2'>
                        <CSVLink
                            data = { storms }
                            headers = {[
                                { label: "Storm ID", key: "storm_id" },
                                { label: "Start Time", key: "start_time" },
                                { label: "End Time", key: "end_time" },
                                { label: "Duration (minutes)", key: "duration" },
                                { label: "Avg Area (km²)", key: "avg_area" },
                                { label: "Max Area (km²)", key: "max_area" },
                                { label: "Avg Intensity (dBZ)", key: "avg_dbz" },
                                { label: "Max Intensity (dBZ)", key: "max_dbz" },         
                                { label: "Total Distance (km)", key: "total_distance_traveled" }                 
                            ]}
                            filename = {"storm_summary_export.csv"}
                            style = {{ textDecoration: 'none' }}
                        >
                            <Button variant="outline-secondary">
                                Export Storm Summary (All Storms) to CSV
                            </Button>
                        </CSVLink>

                        <CSVLink
                            data={ selectedStormLog } // Empty data for now
                            headers={[ // Define headers after API is connected
                                { label: "Timestamp", key: "timestamp" },
                                { label: "Wind Speed", key: "windspeed" },
                                { label: "Size (px)", key: "size" },
                                { label: "Rainfall (mm)", key: "rainfall" }
                            ]}
                            filename={
                                selectedStormID ? // set the filename based on selected storm ID
                                `${selectedStormID}_log_export.csv` : 
                                "storm_log_export.csv"
                            }
                            style = {{ textDecoration: 'none' }}
                            // Disable the link for now
                            // deleted the 'disabled' prop and added onClick handler to show alert
                            // onClick={(e) => { 
                            //     alert("This feature will be enabled when API is connected.");
                            //     e.preventDefault(); 
                            // }}
                        >
                            <Button variant="outline-secondary">
                                Export Log (Selected Storm) to CSV
                            </Button>
                        </CSVLink>
                    </div>

                </Card.Body>
            </Card>
        </Col>
    );
}

export default StormFeatureAnalysis;