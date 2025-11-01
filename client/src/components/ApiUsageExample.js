import { useEffect, useState } from 'react';
import {
  getWeatherStations,
  getStormObservations,
  getStormsAtTimestamp,
  getPlot1Data,
  getPlot2Data,
  getPlot3Data,
  getRadarMapData
} from '../api/fetchApi';

/**
 * Example component showing how to use the fetchApi functions
 */
export default function ApiUsageExample() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Example 1: Fetch all weather stations on mount
  useEffect(() => {
    async function loadStations() {
      setLoading(true);
      setError(null);
      try {
        const stations = await getWeatherStations();
        console.log('Weather stations:', stations);
        setData(stations);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStations();
  }, []);

  // Example 2: Fetch storms at a specific timestamp
  const fetchStormsAtTime = async (timestamp) => {
    setLoading(true);
    setError(null);
    try {
      const storms = await getStormsAtTimestamp({ timestamp });
      console.log('Storms at timestamp:', storms);
      setData(storms);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Fetch storm observations with date range
  const fetchStormObsByDateRange = async (start, end) => {
    setLoading(true);
    setError(null);
    try {
      const observations = await getStormObservations({ start, end });
      console.log('Storm observations:', observations);
      setData(observations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Example 4: Fetch formatted data for plots
  const fetchPlotData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plot1, plot2, plot3] = await Promise.all([
        getPlot1Data(),
        getPlot2Data(),
        getPlot3Data()
      ]);
      console.log('Plot data:', { plot1, plot2, plot3 });
      setData({ plot1, plot2, plot3 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Example 5: Fetch radar map data with parameters
  const fetchRadarData = async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const radarData = await getRadarMapData({
        start: dateRange.start,
        end: dateRange.end
      });
      console.log('Radar map data:', radarData);
      setData(radarData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>API Usage Examples</h2>
      
      <div>
        <button onClick={() => fetchStormsAtTime('2025-10-20T10:00:00Z')}>
          Fetch Storms at Timestamp
        </button>
        <button onClick={() => fetchStormObsByDateRange('2025-10-20T00:00:00Z', '2025-10-20T12:00:00Z')}>
          Fetch Storm Obs (Date Range)
        </button>
        <button onClick={fetchPlotData}>
          Fetch All Plot Data
        </button>
        <button onClick={() => fetchRadarData({ start: '2025-10-20T00:00:00Z', end: '2025-10-20T12:00:00Z' })}>
          Fetch Radar Data
        </button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {data && (
        <pre style={{ maxHeight: 400, overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
