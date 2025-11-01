
function getMetrics(data, dateRange) {
  const { start, end } = dateRange;
  const obsMap = {};

  for (let i = 0; i < data.length; i++) {
    const reading = data[i];
    const ts = new Date(reading.timestamp);

    if (ts >= start && ts <= end) {
      if (!obsMap[reading.station_id]) {
        obsMap[reading.station_id] = {};
      }

      obsMap[reading.station_id].humidity_pct = parseFloat(reading.humidity_pct);
      obsMap[reading.station_id].rainfall_mm = parseFloat(reading.rainfall_mm);
      obsMap[reading.station_id].wind_speed_knots = parseFloat(reading.wind_speed_knots);
      obsMap[reading.station_id].wind_direction_degrees = parseFloat(reading.wind_direction_degrees);
      obsMap[reading.station_id].temperature = parseFloat(reading.temperature_c);
    }
  }

  return obsMap;
}

export {getMetrics };
