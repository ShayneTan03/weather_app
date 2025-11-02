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
                    wind_speed: [],
                    wind_direction: [],
                    temperature: [],
                };
            }

            if (reading.humidity_pct != null && !isNaN(+reading.humidity_pct))
                obsMap[reading.station_id].humidity_pct.push(
                    +reading.humidity_pct
                );

            if (reading.rainfall_mm != null && !isNaN(+reading.rainfall_mm))
                obsMap[reading.station_id].rainfall_mm.push(
                    +reading.rainfall_mm
                );

            if (reading.wind_speed != null && !isNaN(+reading.wind_speed))
                obsMap[reading.station_id].wind_speed.push(+reading.wind_speed);

            if (
                reading.wind_direction != null &&
                !isNaN(+reading.wind_direction)
            )
                obsMap[reading.station_id].wind_direction.push(
                    +reading.wind_direction
                );

            if (reading.temperature_c != null && !isNaN(+reading.temperature_c))
                obsMap[reading.station_id].temperature.push(
                    +reading.temperature_c
                );
        }
    }

    Object.keys(obsMap).forEach((stationId) => {
        const station = obsMap[stationId];
        for (const key in station) {
            const values = station[key];
            station[key] =
                values.length > 0
                    ? values.reduce((a, b) => a + b, 0) / values.length
                    : null;
        }
    });

    return obsMap;
}

export { getMetrics };
