import {MapContainer, TileLayer, Marker, Popup, Circle} from "react-leaflet";

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

function RadarMap(
    {readings}
) {
    return (
        <SingaporeMap 
            readings={readings}
        />
    );
}

export default RadarMap;
