# Frontend API Client Documentation

## Overview
The `fetchApi.js` module provides a centralized client for making HTTP requests to the backend API. It handles request/response formatting, error handling, and unwrapping backend response wrappers.

## Configuration

### Environment Variables
Create a `.env.local` file in the `client/` directory:

```bash
REACT_APP_API_URL=http://localhost:5000
```

**Important**: Restart the development server after modifying `.env` files.

### Environment Files
- `.env.local` - Local development (not committed to git)
- `.env.production` - Production build configuration

## Available Functions

### Weather Stations
```javascript
import { getWeatherStations, getWeatherStationById } from '../api/fetchApi';

// Get all weather stations
const stations = await getWeatherStations();

// Get specific station
const station = await getWeatherStationById('S01');
```

### Weather Observations
```javascript
import { getWeatherObs, getWeatherObsById } from '../api/fetchApi';

// Get all observations (with optional query params)
const observations = await getWeatherObs({ 
  start: '2025-10-20T00:00:00Z', 
  end: '2025-10-20T12:00:00Z' 
});

// Get specific observation
const obs = await getWeatherObsById(123);
```

### Radar Images
```javascript
import { getRadarImages, getRadarImageById } from '../api/fetchApi';

// Get all radar images
const images = await getRadarImages();

// Get specific image
const image = await getRadarImageById(456);
```

### Storm Observations
```javascript
import { 
  getStormObservations, 
  getStormObservationsDateRange,
  getStormObservationById 
} from '../api/fetchApi';

// Get all storm observations
const stormObs = await getStormObservations();

// Get storm observations with date range
const rangeObs = await getStormObservationsDateRange({
  start: '2025-10-20T00:00:00Z',
  end: '2025-10-20T12:00:00Z',
  interval: 30
});

// Get specific observation
const obs = await getStormObservationById(789);
```

### Storms
```javascript
import { getStorms, getStormsAtTimestamp } from '../api/fetchApi';

// Get all storms
const storms = await getStorms();

// Get storms at specific timestamp or date range
const timestampStorms = await getStormsAtTimestamp({ 
  timestamp: '2025-10-20T10:00:00Z' 
});

const rangeStorms = await getStormsAtTimestamp({
  start: '2025-10-20T00:00:00Z',
  end: '2025-10-20T12:00:00Z'
});
```

### Client-Formatted Data (for specific components)
```javascript
import { 
  getPlot1Data, 
  getPlot2Data, 
  getPlot3Data,
  getRadarMapData,
  getClientReadings
} from '../api/fetchApi';

// Get data formatted for Plot1 component
const plot1Data = await getPlot1Data();

// Get data formatted for Plot2 component
const plot2Data = await getPlot2Data();

// Get data formatted for Plot3 component
const plot3Data = await getPlot3Data();

// Get data formatted for RadarMap component
const radarData = await getRadarMapData({
  start: '2025-10-20T00:00:00Z',
  end: '2025-10-20T12:00:00Z'
});

// Get client-ready readings
const readings = await getClientReadings();
```

## Response Format

### Wrapped Responses
Most endpoints return a wrapped response:
```json
{
  "status": "success",
  "data": [...],
  "message": "Fetched successfully",
  "timestamp": "2025-11-01T10:00:00Z"
}
```

The `unwrap()` function automatically extracts the `data` field, so you only get the actual data.

### Error Handling
```javascript
try {
  const data = await getWeatherStations();
  // Use data
} catch (error) {
  console.error('API Error:', error.message);
  // Handle error (show to user, retry, etc.)
}
```

Errors include:
- Network errors (timeout, connection failed)
- HTTP errors (404, 500, etc.)
- Backend errors (unwrapped from error responses)

## Usage in React Components

### Basic Pattern
```javascript
import React, { useEffect, useState } from 'react';
import { getWeatherStations } from '../api/fetchApi';

function WeatherStations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);

  useEffect(() => {
    let mounted = true;
    
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getWeatherStations();
        if (mounted) setStations(data);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {stations.map(s => (
        <li key={s.station_id}>{s.name}</li>
      ))}
    </ul>
  );
}
```

### With Query Parameters
```javascript
async function fetchData() {
  const params = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    interval: 30
  };
  
  const data = await getStormObservationsDateRange(params);
  setData(data);
}
```

### Parallel Requests
```javascript
async function fetchAll() {
  const [stations, observations, storms] = await Promise.all([
    getWeatherStations(),
    getStormObservations(),
    getStorms()
  ]);
  
  return { stations, observations, storms };
}
```

## Backend Endpoints Reference

| Function | Backend Route | Method | Wrapped |
|----------|--------------|--------|---------|
| `getWeatherStations()` | `/list/weatherstations` | GET | Yes |
| `getWeatherStationById(id)` | `/weatherstation/:id` | GET | Yes |
| `getWeatherObs()` | `/list/weatherobs` | GET | Yes |
| `getWeatherObsById(id)` | `/weatherobs/:id` | GET | Yes |
| `getRadarImages()` | `/list/radarimages` | GET | Yes |
| `getRadarImageById(id)` | `/radarimage/:id` | GET | Yes |
| `getStormObservations()` | `/list/stormobservations` | GET | Yes |
| `getStormObservationById(id)` | `/stormobservation/:id` | GET | Yes |
| `getStormObsRaw()` | `/list/stormobs` | GET | No |
| `getStormObsById(id)` | `/stormobs/:id` | GET | No |
| `getStorms()` | `/list/storms` | GET | Yes |
| `getStormsAtTimestamp()` | `/storms` | GET | Yes |
| `getPlot1Data()` | `/export/plot1` | GET | Yes |
| `getPlot2Data()` | `/export/plot2` | GET | Yes |
| `getPlot3Data()` | `/export/plot3` | GET | Yes |
| `getRadarMapData()` | `/export/radarmap` | GET | Yes |
| `getClientReadings()` | `/export/client_readings` | GET | Yes |

## Notes

- All functions return Promises (use `async/await` or `.then()`)
- Requests timeout after 30 seconds by default
- The client automatically adds `Content-Type: application/json` header
- Query parameters are automatically URL-encoded
- Dates should be in ISO 8601 format (e.g., `2025-10-20T10:00:00Z`)

## Example Component

See `src/components/ApiUsageExample.js` for a complete example showing various usage patterns.
