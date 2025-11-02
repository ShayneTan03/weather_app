# This file contains all the apis that will directly support the frontend of this project.

import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from flask_caching import Cache
import os

from flask import abort

import logging

# Configure logging to show cache hit or miss, and pull from db accordingly
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()  # Load from .env file

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT")

app = Flask(__name__)
CORS(app)

# cache setup
cache = Cache(app, config={
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 300
})

# Remove global connection. Use get_connection() to create a fresh connection per request.
def get_connection():
    """
    Create a new psycopg2 connection with TCP keepalive options to prevent silent idle drops.
    Adjust keepalives_* values if you have other network constraints.
    """
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode="require",        # keep if your RDS requires TLS; remove if not
        connect_timeout=10,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5
    )
    return conn

# helper to run a SELECT and return list[dict]
def fetch_query(sql, params=None):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        # RealDictCursor already returns dictionaries
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Database query error: {str(e)}")
        raise
    finally:
        try:
            if cur:
                cur.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

# helper function for json structure (keeps your original structure)
def make_response(status, data=None, message=None, code=200):
    response = {
        "status": status,
        "data": data,
        "message": message,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    return jsonify(response), code


# test
@app.route('/api')
def initial_fn():
    print("Successful /api")
    return jsonify({'Hello': 'World!'})

'''
apis to build:
- direct pull weather station data (e.g. coordinates, name, id)
- direct pull storm observation data (e.g. temp, rainfall, humidity, wind speed, coordinates)
- identified storm objects?
'''

# direct pull and list weather station data
## list all weather stations
@cache.cached()
@app.route('/list/weatherstations', methods=["GET"])
def weatherstations():
    """
    responses:
        200:
        description: lists all weather stations
    """
    cache_key = "weatherstations"
    data = cache.get(cache_key)
    if data:
        logger.info("Cache hit for weatherstations")
        return make_response("success", data=data, message="Fetched all weather stations successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM weather_station;")
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /list/weatherstations")
        return make_response("success", data=rows, message="Fetched all weather stations successfully.")
    except Exception as e:
        logger.error(f"Error fetching weather stations: {str(e)}")
        return make_response("error", message=str(e), code=500)


## get specific weatherstation for efficiency
@cache.cached()
@app.route('/weatherstation/<string:station_id>', methods=["GET"])
def display_weatherstation(station_id):
    """
    parameters:
        id: id
        in: path
        type: int
        required: true
        description: id of weather station to display
    responses:
        200:
        description: displays information of one weather station
    """
    cache_key = f"weatherstation_{station_id}"
    data = cache.get(cache_key)

    if data:
        logger.info(f"Cache hit for weatherstation {station_id}")
        return make_response("success", data=data, message=f"Fetched weather station {station_id} successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM weather_station WHERE station_id = %s;", (station_id,))
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /weatherstation/<station_id>")
        return make_response("success", data=rows, message=f"Fetched weather station {station_id} successfully.")
    except Exception as e:
        logger.error(f"Error fetching weather station {station_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)


# direct pull and list weather observation data
## list all weather observations
@cache.cached()
@app.route('/list/weatherobs', methods=["GET"])
def weatherobs():
    """
    responses:
        200:
        description: lists all weather observations
    """
    cache_key = "weatherobs"
    data = cache.get(cache_key)
    if data:
        logger.info("Cache hit for weatherobs")
        return make_response("success", data=data, message="Fetched all weather observations successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM weather_observation;")
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /list/weatherobs")
        return make_response("success", data=rows, message="Fetched all weather observations successfully.")
    except Exception as e:
        logger.error(f"Error fetching weather observations: {str(e)}")
        return make_response("error", message=str(e), code=500)


## get specific weather observation
@cache.cached()
@app.route('/weatherobs/<int:obs_id>', methods=["GET"])
def display_weatherobs(obs_id):
    """
    parameters:
        id: id
        in: path
        type: int
        required: true
        description: id of weather observation to display
    responses:
        200:
        description: displays information of one weather observation
    """
    cache_key = f"weatherobs_{obs_id}"
    data = cache.get(cache_key)
    if data:
        logger.info(f"Cache hit for weather observation {obs_id}")
        return make_response("success", data=data, message=f"Fetched weather observation {obs_id} successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM weather_observation WHERE obs_id = %s;", (obs_id,))
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /weatherobs/<obs_id>")
        return make_response("success", data=rows, message=f"Fetched weather observation {obs_id} successfully.")
    except Exception as e:
        logger.error(f"Error fetching weather observation {obs_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)


## get radar images
@cache.cached()
@app.route('/list/radarimages', methods=["GET"])
def radarimages():
    """
    responses:
        200:
        description: lists all radar images
    """
    cache_key = "radarimages"
    data = cache.get(cache_key)
    if data:
        logger.info("Cache hit for radar images")
        return make_response("success", data=data, message="Fetched all radar images successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM radar_image;")
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /list/radarimages")
        return make_response("success", data=rows, message="Fetched all radar images successfully.")
    except Exception as e:
        logger.error(f"Error fetching radar images: {str(e)}")
        return make_response("error", message=str(e), code=500)


## get specific radar image
@cache.cached()
@app.route('/radarimage/<int:image_id>', methods=["GET"])
def display_radarimage(image_id):
    """
    parameters:
        id: id
        in: path
        type: int
        required: true
        description: id of radar image to display
    responses:
        200:
        description: displays information of one radar image
    """
    cache_key = f"radarimage_{image_id}"
    data = cache.get(cache_key)
    if data:
        logger.info(f"Cache hit for radar image {image_id}")
        return make_response("success", data=data, message=f"Fetched radar image {image_id} successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM radar_image WHERE image_id = %s;", (image_id,))
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /radarimage/<image_id>")
        return make_response("success", data=rows, message=f"Fetched radar image {image_id} successfully.")
    except Exception as e:
        logger.error(f"Error fetching radar image {image_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)


## get storm observations
@cache.cached()
@app.route('/list/stormobservations', methods=["GET"])
def stormobservations():
    """
    responses:
        200:
        description: lists all storm observations
    """
    cache_key = "stormobservations"
    data = cache.get(cache_key)
    if data:
        logger.info("Cache hit for storm observations")
        return make_response("success", data=data, message="Fetched all storm observations successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM storm_observation;")
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /list/stormobservations")
        return make_response("success", data=rows, message="Fetched all storm observations successfully.")
    except Exception as e:
        logger.error(f"Error fetching storm observations: {str(e)}")
        return make_response("error", message=str(e), code=500)


## get specific storm observation
@cache.cached()
@app.route('/stormobservation/<int:obs_id>', methods=["GET"])
def display_stormobservation(obs_id):
    """
    parameters:
        id: id
        in: path
        type: int
        required: true
        description: id of storm observation to display
    responses:
        200:
        description: displays information of one storm observation
    """
    cache_key = f"stormobservation_{obs_id}"
    data = cache.get(cache_key)
    if data:
        logger.info(f"Cache hit for storm observation {obs_id}")
        return make_response("success", data=data, message=f"Fetched storm observation {obs_id} successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM storm_observation WHERE obs_id = %s;", (obs_id,))
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /stormobservation/<obs_id>")
        return make_response("success", data=rows, message=f"Fetched storm observation {obs_id} successfully.")
    except Exception as e:
        logger.error(f"Error fetching storm observation {obs_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)


## get storms
@cache.cached()
@app.route('/list/storms', methods=["GET"])
def storms():
    """
    responses:
        200:
        description: lists all storms
    """
    cache_key = "storms"
    data = cache.get(cache_key)
    if data:
        logger.info("Cache hit for storms")
        return make_response("success", data=data, message="Fetched all storms successfully from cache.")

    try:
        rows = fetch_query("SELECT * FROM storm WHERE duration > 0;")
        cache.set(cache_key, rows)
        logger.info("Stored new result in cache for /list/storms")
        return make_response("success", data=rows, message="Fetched all storms successfully.")
    except Exception as e:
        logger.error(f"Error fetching storms: {str(e)}")
        return make_response("error", message=str(e), code=500)

## get specific storm based on timestamp
@app.route('/storms', methods=["GET"])
@cache.cached(query_string=True)
def storms_at_timestamp():
    """
    responses:
        200:
        description: displays information of storms active at queried timestamp
    example URL: /storms?timestamp=2025-10-01%2010:00:00
    """
    timestamp = request.args.get('timestamp')

    if not timestamp:
        return jsonify({"error": "Missing 'timestamp' query parameter"}), 400

    try:
        rows = fetch_query(
            "SELECT * FROM storm WHERE (start_time <= %s AND end_time >= %s AND duration > 0);",
            (timestamp, timestamp)
        )
        logger.info("Stored new results in cache for /storms")
    except Exception as e:
        logger.error(f"Error fetching storms by time: {str(e)}")
        return make_response("error", message=str(e), code=500)

    return make_response("success", data=rows, message=f"Fetched all storms at {timestamp} successfully")

@app.route('/join/plot2', methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def display_join():
    """
    Fetch aggregated storm data with averaged weather readings
    Filter by date range (start_time and end_time)
    Returns: Array of storms with averaged metrics (for scatter plot)
    """
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    sql_query = """
        WITH avg_weather AS (
            SELECT
                timestamp,
                AVG(rainfall_mm) AS avg_rainfall_mm,
                AVG(wind_speed) AS avg_wind_speed
            FROM
                weather_observation
            GROUP BY
                timestamp
        )
        SELECT
            s.storm_id,
            AVG(COALESCE(aw.avg_rainfall_mm, 0)) AS rainfall,
            AVG(COALESCE(aw.avg_wind_speed, 0)) AS windspeed,
            AVG(so.area_px) AS size,
            AVG(so.peak_dbz) AS intensity
        FROM
            storm s
        INNER JOIN
            storm_observation AS so ON so.obs_id = ANY(s.obs_id_list)
        LEFT JOIN
            avg_weather AS aw ON so.timestamp = aw.timestamp
        WHERE
            s.duration > 0
    """
    
    params = []
    if start_time:
        sql_query += " AND s.start_time >= %s"
        params.append(start_time)
    if end_time:
        sql_query += " AND s.end_time <= %s"
        params.append(end_time)
    
    sql_query += """
        GROUP BY s.storm_id
        ORDER BY s.storm_id;
    """
    
    try:
        rows = fetch_query(sql_query, tuple(params) if params else None)
        
        # Format data to match Plot2 expectations
        data = []
        for row in rows:
            data.append({
                "stormId": row['storm_id'],
                "rainfall": round(float(row['rainfall']), 2) if row['rainfall'] else 0,
                "windspeed": round(float(row['windspeed']), 2) if row['windspeed'] else 0,
                "size": round(float(row['size']), 1) if row['size'] else 0,
                "intensity": round(float(row['intensity']), 1) if row['intensity'] else 0
            })
        
        logger.info(f"Stored new results in cache for /join/plot2 (returned {len(data)} storms)")
        return make_response("success", data=data, message=f"Fetched {len(data)} storms with averaged metrics successfully")

    except Exception as e:
        logger.error(f"Error fetching plot2 data: {str(e)}")
        return make_response("error", message=str(e), code=500)

@app.route('/join/plot3', methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def get_plot3_data():
    """
    Returns storm summary statistics for Plot3 visualization
    Format: Wrapped JSON array of storms with aggregated metrics
    Each storm includes: storm_id, start_time, end_time, duration,
    avg_area, max_area, avg_dbz, max_dbz, total_distance_traveled
    
    Optional query params:
    - start_time: Filter storms starting after this time (YYYY-MM-DD)
    - end_time: Filter storms ending before this time (YYYY-MM-DD)
    """
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    # SQL query to get summary statistics per storm
    sql_query = """
        SELECT
            s.storm_id,
            s.start_time,
            s.end_time,
            s.duration,
            AVG(so.area_px) AS avg_area,
            MAX(so.area_px) AS max_area,
            AVG(so.peak_dbz) AS avg_dbz,
            MAX(so.peak_dbz) AS max_dbz,
            CASE 
                WHEN array_length(s.anchor_x_list, 1) > 1 THEN
                    SQRT(
                        POWER(s.anchor_x_list[array_length(s.anchor_x_list, 1)] - s.anchor_x_list[1], 2) +
                        POWER(s.anchor_y_list[array_length(s.anchor_y_list, 1)] - s.anchor_y_list[1], 2)
                    )
                ELSE 0
            END AS total_displacement
        FROM
            storm s
        INNER JOIN
            storm_observation so ON so.obs_id = ANY(s.obs_id_list)
        WHERE
            s.duration > 0
    """
    
    params = []
    if start_time:
        sql_query += " AND s.start_time >= %s"
        params.append(start_time)
    if end_time:
        sql_query += " AND s.end_time <= %s"
        params.append(end_time)
    
    sql_query += """
        GROUP BY
            s.storm_id, s.start_time, s.end_time, s.duration, s.anchor_x_list, s.anchor_y_list
        ORDER BY
            s.start_time
    """
    
    try:
        logger.info(f"Fetching plot3 data with params: start={start_time}, end={end_time}")
        rows = fetch_query(sql_query, params)
        
        # Format the data to match the expected structure
        data = []
        for row in rows:
            data.append({
                "storm_id": row['storm_id'],
                "start_time": row['start_time'].isoformat() if row['start_time'] else None,
                "end_time": row['end_time'].isoformat() if row['end_time'] else None,
                "duration": float(row['duration']) if row['duration'] else 0,
                "avg_area": round(float(row['avg_area']), 1) if row['avg_area'] else 0,
                "max_area": round(float(row['max_area']), 1) if row['max_area'] else 0,
                "avg_dbz": round(float(row['avg_dbz']), 1) if row['avg_dbz'] else 0,
                "max_dbz": round(float(row['max_dbz']), 1) if row['max_dbz'] else 0,
                "total_distance_traveled": round(float(row['total_displacement']), 1) if row['total_displacement'] else 0
            })
        
        logger.info(f"Returning {len(data)} storms for plot3")
        return make_response("success", data=data, message=f"Fetched {len(data)} storms successfully")
        
    except Exception as e:
        logger.error(f"Error in get_plot3_data: {str(e)}")
        return make_response("error", message=str(e), code=500)

@app.route('/join/plot1', methods=["GET"])
@cache.cached(timeout=3600, query_string=True)
def get_plot1_data():
    """
    Returns storm time-series data for Plot1 visualization
    Format: Array of storms, each with storm_id and time-series points
    Each point contains: timestamp, rainfall, windspeed, size
    
    Optional query params:
    - start_time: Filter storms starting after this time
    - end_time: Filter storms ending before this time
    """
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    
    # SQL query to get storm observations with averaged weather data
    sql_query = """
        WITH weather_avg AS (
            SELECT
                timestamp,
                AVG(rainfall_mm) AS avg_rainfall,
                AVG(wind_speed) AS avg_windspeed
            FROM
                weather_observation
            GROUP BY
                timestamp
        )
        SELECT
            s.storm_id,
            so.timestamp,
            so.area_px,
            COALESCE(wa.avg_rainfall, 0) AS rainfall,
            COALESCE(wa.avg_windspeed, 0) AS windspeed
        FROM
            storm s
        INNER JOIN
            storm_observation so ON so.obs_id = ANY(s.obs_id_list)
        LEFT JOIN
            weather_avg wa ON so.timestamp = wa.timestamp
        WHERE
            s.duration > 0
    """
    
    params = []
    if start_time:
        sql_query += " AND s.start_time >= %s"
        params.append(start_time)
    if end_time:
        sql_query += " AND s.end_time <= %s"
        params.append(end_time)
    
    sql_query += " ORDER BY s.storm_id, so.timestamp;"
    
    try:
        raw_data = fetch_query(sql_query, tuple(params) if params else None)
        
        # Transform data into required format: group by storm_id
        storms_dict = {}
        for row in raw_data:
            storm_id = row['storm_id']
            if storm_id not in storms_dict:
                storms_dict[storm_id] = {
                    'stormId': storm_id,
                    'points': []
                }
            
            storms_dict[storm_id]['points'].append({
                'timestamp': row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else str(row['timestamp']),
                'rainfall': float(row['rainfall']) if row['rainfall'] is not None else 0.0,
                'windspeed': float(row['windspeed']) if row['windspeed'] is not None else 0.0,
                'size': float(row['area_px']) if row['area_px'] is not None else 0.0
            })
        
        # Convert dict to list
        data = list(storms_dict.values())
        
        logger.info(f"Stored new results in cache for /plot1 (returned {len(data)} storms)")
        return make_response("success", data=data, message=f"Fetched {len(data)} storms with time-series data successfully")
    
    except Exception as e:
        logger.error(f"Error fetching plot1 data: {str(e)}")
        return make_response("error", message=str(e), code=500)

if __name__ == '__main__':
    app.run(debug=True)
