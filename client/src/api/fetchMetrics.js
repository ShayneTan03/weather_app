function getMetrics(data, dateRange) {
    const { start, end } = dateRange;
    const obsMap = {};

    for (let i = 0; i < data.length; i++) {
        const reading = data[i];
        const ts = new Date(reading.timestamp);

        if (ts >= start && ts <= end) {
            if (!obsMap[reading.station_id]) {
                obsMap[reading.station_id] = {
                    humidity_pct: [],
                    rainfall_mm: [],
                    wind_speed_knots: [],
                    wind_direction_degrees: [],
                    temperature: [],
                };
            }

            if (!isNaN(reading.humidity_pct)) obsMap[reading.station_id].humidity_pct.push(parseFloat(reading.humidity_pct));
            if (!isNaN(reading.rainfall_mm)) obsMap[reading.station_id].rainfall_mm.push(parseFloat(reading.rainfall_mm));
            if (!isNaN(reading.wind_speed_knots)) obsMap[reading.station_id].wind_speed_knots.push(parseFloat(reading.wind_speed_knots));
            if (!isNaN(reading.wind_direction_degrees)) obsMap[reading.station_id].wind_direction_degrees.push(parseFloat(reading.wind_direction_degrees));
            if (!isNaN(reading.temperature_c)) obsMap[reading.station_id].temperature.push(parseFloat(reading.temperature_c));
        }
    }

    Object.keys(obsMap).forEach((stationId) => {
        const station = obsMap[stationId];
        for (const key in station) {
            const values = station[key];
            if (values.length > 0) {
                station[key] = values.reduce((a, b) => a + b, 0) / values.length;
            } else {
                station[key] = null;
            }
        }
    });

    return obsMap;
}

export { getMetrics };
