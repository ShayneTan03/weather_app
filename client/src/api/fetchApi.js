// mock api functions simulating database responses for weather radar and storm tracking models
const singaporeCoords = [1.3521, 103.8198];

// generate random numbers and timestamps
const randomFloat = (min, max) =>
    (Math.random() * (max - min) + min).toFixed(2);

const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const randomTimestamp = (
    start = new Date(2025, 0, 1),
    end = new Date(2025, 9, 1)
) => {
    return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
    ).toISOString();
};

/**
 *
 * @returns Storm Array
 */
async function fetchStorms() {
    const data = Array.from({ length: 10 }, (_, i) => ({
        storm_id: i + 1,
        parent_id: i > 0 ? randomInt(1, i) : null,
        start_time: randomTimestamp(),
        end_time: randomTimestamp(),
        duration: randomFloat(0.5, 5.0),
        avg_centroid_x: randomFloat(0, 100),
        avg_centroid_y: randomFloat(0, 100),
        avg_dbz: randomFloat(20, 60),
        avg_area: randomFloat(10, 200),
        n_frames: randomInt(5, 30),
        num_children: randomInt(0, 3),
        classification: ["isolated", "clustered", "squall-line"][
            randomInt(0, 2)
        ],
        grid_id_list: JSON.stringify(
            Array.from({ length: 5 }, () => randomInt(1000, 2000))
        ),
        anchor_x_list: JSON.stringify(
            Array.from({ length: 5 }, () => randomFloat(0, 100))
        ),
        anchor_y_list: JSON.stringify(
            Array.from({ length: 5 }, () => randomFloat(0, 100))
        ),
        area_list: JSON.stringify(
            Array.from({ length: 5 }, () => randomFloat(10, 300))
        ),
    }));
    return Promise.resolve(data);
}

async function fetchStormObservations() {
    const data = Array.from({ length: 10 }, (_, i) => ({
        obs_id: i + 1,
        timestamp: randomTimestamp(),
        grid_id: randomTimestamp(),
        centroid_x: randomFloat(0, 100),
        centroid_y: randomFloat(0, 100),
        anchor_x: randomFloat(0, 100),
        anchor_y: randomFloat(0, 100),
        peak_dBZ: randomFloat(30, 60),
        area_px: randomFloat(1000, 5000),
    }));
    return Promise.resolve(data);
}

async function fetchStormGrids() {
    const data = Array.from({ length: 10 }, () => ({
        timestamp: randomTimestamp(),
        grid_data: JSON.stringify({
            intensity: randomFloat(10, 60),
            coverage: randomFloat(20, 80),
            cellCount: randomInt(5, 20),
        }),
    }));
    return Promise.resolve(data);
}

async function fetchWeatherStations() {
  const [baseLat, baseLon] = singaporeCoords;

  const LAT_RANGE = 0.1; // ~10 km north/south
  const LON_RANGE = 0.05; // ~5 km east/west

  const data = Array.from({ length: 10 }, (_, i) => {
    const lat = parseFloat(
      randomFloat(baseLat - LAT_RANGE, baseLat + LAT_RANGE)
    );
    const lon = parseFloat(
      randomFloat(baseLon - LON_RANGE, baseLon + LON_RANGE)
    );

    return {
      station_id: `STN${100 + i}`,
      name: `Weather Station ${i + 1}`,
      lat,
      lon,
      coord_basemap: {
        lat: randomFloat(baseLat - LAT_RANGE, baseLat + LAT_RANGE),
        lon: randomFloat(baseLon - LON_RANGE, baseLon + LON_RANGE),
      },
      coord: {
        x: randomFloat(0, 100),
        y: randomFloat(0, 100),
      },
    };
  });

  return Promise.resolve(data);
}

async function fetchWeatherObservations() {
    const stations = await fetchWeatherStations();
    const data = Array.from({ length: 10 }, (_, i) => ({
        obs_id: i + 1,
        station_id: stations[randomInt(0, stations.length - 1)].station_id,
        timestamp: randomTimestamp(),
        temperature_c: randomFloat(22, 34),
        rainfall_mm: randomFloat(0, 500),
        wind_speed_knots: randomFloat(0, 25),
        wind_direction_degrees: randomFloat(0, 360),
        humidity_pct: randomFloat(40, 100),
    }));
    return Promise.resolve(data);
}

module.exports = {
    fetchStorms,
    fetchStormObservations,
    fetchStormGrids,
    fetchWeatherStations,
    fetchWeatherObservations,
};
