import {MapContainer, TileLayer, Marker, Popup, Circle} from "react-leaflet";
import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

function SingaporeMap ({readings}) {
    const singaporeCoords = [1.3521, 103.8198];
     if (!readings) {
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
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {readings.map((r) => {
                    if (r.humidity === "NA") r.humidity=0;
                    return(
                        <>
                        <Marker key={r.id} position={[r.latitude, r.longitude]}>
                            <Popup>{r.name} <br/> Humidity: {r.humidity}%</Popup>
                        </Marker>
                        <Circle 
                            center={[r.latitude, r.longitude]} 
                            radius={r.humidity * 15}
                            fillColor="red"
                            fillOpacity="0.3">
                        </Circle>
                        </>
                    );
                })}
                
            </MapContainer>
        </div>
  );
};

// to include other variables that helps us detect storms. ideally this should be some average or formula thats geo standard
function isStormCandidate(reading) {
    const minHumidity = 70;
    const minArea = 20;

    return reading.humidity > 70;
}

// to be chucked into obj folder maybe class idk
function createStormObj(reading, index) {
    const intensity = Math.round((reading.humidity))
    const area = (Math.random() * 50 * 10).toFixed(1); // rnd for now

    return {
        id: `Storm-${index + 1}`,
        intensity,
        area,
        center: {
            x: reading.latitude.toFixed(3),
            y: reading.longitude.toFixed(3)
        }
    }
}

export function DetectedStorms({readings}) {
    const [storms, setStorms] = useState([]);
    
    useEffect(() => {
        if (readings && readings.length > 0) {
            const detectedStorms = readings
            .filter(isStormCandidate)
            .map((reading, i) => createStormObj(reading,i));

        setStorms(detectedStorms);
            
        }
    }, [readings]);


    if (!readings) {
        return <div>Loading storm data...</div>;
    }

    return (
        <>
        <Card className="h-100">
            <Card.Header>
                <Card.Title>Detected Storms</Card.Title>
                <small className="text-muted">{storms.length} storms detected</small>
            </Card.Header>
            <Card.Body style={{ maxHeight:"54.5vh", overflowY:"auto"}}>
                {storms.map((storm) => (
                <div className="border rounded p-3 mb-3">
                    <div className="d-flex mb-2 justify-content-between align-items-center2">
                    <span className="fw-medium">{storm.id}</span>
                    <Badge
                        bg={
                        storm.intensity >= 8
                            ? "danger"
                            : storm.intensity >= 6
                            ? "primary"
                            : "secondary"
                        }
                    >
                        {storm.intensity} dBZ
                    </Badge>
                    </div>
                    <div className="text-muted small">
                    <div>Area: {storm.area} km²</div>
                    <div>Shape: {storm.shape}</div>
                    <div>
                        Center: ({storm.center.x}, {storm.center.y})
                    </div>
                    </div>
                </div>
                ))}
            </Card.Body>
            </Card>
        </>
    )
};

function RadarMap(
    {readings}
) {
    return (
        <>
            <SingaporeMap readings={readings} />
        </>
    );
}

export default RadarMap;
