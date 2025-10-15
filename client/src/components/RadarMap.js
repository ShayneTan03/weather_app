import { useEffect, useState } from "react";
import {MapContainer, TileLayer, Marker, Popup, Circle} from "react-leaflet";
import fetchHumidity from "../api/fetchHumidity";

function SingaporeMap () {
    const singaporeCoords = [1.3521, 103.8198];
    const [readings, setReadings] = useState([]);

    // any asynchronous logic should be handled within useEffect with a nested fn
    // this will load the necessary data before loading the components of the web page
    useEffect(() => {
        async function loadData() {
            try {
                const [stationsArr,readings] = await fetchHumidity("2025-10-15");
                const readingMap = stationsArr.map((station) => ({
                    ...station, //takes the kv pairs
                    humidity: readings[station.id] ?? "NA"
                }));

                setReadings(readingMap);

            } catch(err) {
                console.error(err.message);
            }
        }
        loadData();
    }, []); 
    // react checks if the values in the arr of dependencies changes
    // reruns if there's any change
    // if empty arr it runs once
    // otherwise i.e [date] it runs whenever the date changes 
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
) {
    return (
        <SingaporeMap 
        />
    );
}

export default RadarMap;
