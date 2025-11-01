#This file contains all the apis that will directly support the frontend of this project.

import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
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
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT")

app = Flask(__name__)
CORS(app)

#cache setup
cache = Cache(app, config={
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 300
})

conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)

#helper function for json structure
def make_response(status, data=None, message=None, code=200):
    response = {
        "status": status,
        "data": data,
        "message": message,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    return jsonify(response), code


#test
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
@app.route('/list/weatherstations', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM weather_station;")
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /list/weatherstations")
        
        return make_response("success", data=data, message="Fetched all weather stations successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching weather stations: {str(e)}")
        return make_response("error", message=str(e), code=500)

## get specific weatherstation for efficiency
@cache.cached()
@app.route('/weatherstation/<string:station_id>', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM weather_station WHERE station_id = %s;", (station_id,))
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /weatherstation/<station_id>")
        
        return make_response("success", data=data, message=f"Fetched weather station {station_id} successfully.")

    except Exception as e:
        logger.error(f"Error fetching weather station {station_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)


#direct pull and list weather observation data
## list all weather observations
@cache.cached()
@app.route('/list/weatherobs', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM weather_observation;")
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /list/weatherobs")
        
        return make_response("success", data=data, message="Fetched all weather observations successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching weather observations: {str(e)}")
        return make_response("error", message=str(e), code=500)


##get specific weather observation
@cache.cached()
@app.route('/weatherobs/<int:obs_id>', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM weather_observation WHERE obs_id = %s;", (obs_id,))
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /weatherobs/<obs_id>")
        
        return make_response("success", data=data, message=f"Fetched weather observation {obs_id} successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching weather observation {obs_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)
    
    
##get radar images
@cache.cached()
@app.route('/list/radarimages', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM radar_image;")
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /list/radarimages")
        
        return make_response("success", data=data, message="Fetched all radar images successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching radar images: {str(e)}")
        return make_response("error", message=str(e), code=500)
    
##get specific radar image
@cache.cached()
@app.route('/radarimage/<int:image_id>', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM radar_image WHERE image_id = %s;", (image_id,))
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /radarimage/<image_id>")
        
        return make_response("success", data=data, message=f"Fetched radar image {image_id} successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching radar image {image_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)
    
    
##get storm observations
@cache.cached()
@app.route('/list/stormobservations', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM storm_observation;")
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /list/stormobservations")
        
        return make_response("success", data=data, message="Fetched all storm observations successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching storm observations: {str(e)}")
        return make_response("error", message=str(e), code=500)
    
##get storm observations over a date range
@cache.cached()
@app.route('/list/stormobservations', methods = ["GET"])
def stormobservations_daterange():
    """
    responses:
        200:
        description: lists all storm observations over a date range at 30 minute intervals
    query params:
        start: ISO UTC e.g. 2025-10-01T00:00:00Z
        end:   ISO UTC e.g. 2025-10-01T12:00:00Z
    """
    start_str = request.args.get("start")
    end_str = request.args.get("end")
    if not start_str or not end_str:
        return make_response("error", message="Missing 'start' or 'end' query parameter", code=400)

    try:
        start_dt = datetime.datetime.strptime(start_str, "%Y-%m-%dT%H:%M:%SZ")
        end_dt = datetime.datetime.strptime(end_str, "%Y-%m-%dT%H:%M:%SZ")
    except Exception as e:
        return make_response("error", message=f"Invalid datetime format: {str(e)}. Use YYYY-MM-DDTHH:MM:SSZ", code=400)

    cache_key = f"stormobservations_{start_str}_{end_str}"
    cached = cache.get(cache_key)
    if cached:
        logger.info("Cache hit for storm observations daterange")
        return make_response("success", data=cached, message="Fetched storm observations for date range from cache.")

    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM storm_observation;")
        rows = cur.fetchall()
        colnames = [desc[0] for desc in cur.description]
        cur.close()

        # Build list of dict rows and try to detect a datetime per row
        observations = []
        for row in rows:
            row_dict = dict(zip(colnames, row))
            obs_time = None

            # prefer actual datetime objects in row values
            for v in row:
                if isinstance(v, datetime.datetime):
                    obs_time = v
                    break

            # if none found, attempt to parse any string-like fields
            if obs_time is None:
                for v in row:
                    if isinstance(v, str):
                        for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
                            try:
                                obs_time = datetime.datetime.strptime(v, fmt)
                                break
                            except Exception:
                                continue
                    if obs_time is not None:
                        break

            # attach parsed obs_time (if found) for easier filtering
            if obs_time is not None:
                # normalize naive datetimes to naive UTC assumed
                if obs_time.tzinfo is not None:
                    obs_time = obs_time.astimezone(datetime.timezone.utc).replace(tzinfo=None)
                row_dict["_obs_time"] = obs_time
                observations.append(row_dict)

        # Filter by range and bucket into 30-minute intervals
        buckets = {}
        for obs in observations:
            obs_time = obs.get("_obs_time")
            if obs_time is None:
                continue
            if obs_time < start_dt or obs_time > end_dt:
                continue
            seconds_since_start = (obs_time - start_dt).total_seconds()
            bucket_index = int(seconds_since_start // (30 * 60))
            bucket_time = start_dt + datetime.timedelta(minutes=30 * bucket_index)
            bucket_key = bucket_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            # remove helper key when returning
            obs_copy = {k: v for k, v in obs.items() if k != "_obs_time"}
            buckets.setdefault(bucket_key, []).append(obs_copy)

        # Build final list covering every 30-minute interval between start and end inclusive
        results = []
        current = start_dt
        while current <= end_dt:
            key = current.strftime("%Y-%m-%dT%H:%M:%SZ")
            results.append({
                "timestamp": key,
                "observations": buckets.get(key, [])
            })
            current += datetime.timedelta(minutes=30)

        cache.set(cache_key, results)
        logger.info("Stored new result in cache for /list/stormobservations (daterange)")

        return make_response("success", data=results, message=f"Fetched storm observations from {start_str} to {end_str} at 30-minute intervals.")
    except Exception as e:
        logger.error(f"Error fetching storm observations (daterange): {str(e)}")
        return make_response("error", message=str(e), code=500)
        
##get specific storm observation
@cache.cached()
@app.route('/stormobservation/<int:obs_id>', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM storm_observation WHERE obs_id = %s;", (obs_id,))
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /stormobservation/<obs_id>")
        
        return make_response("success", data=data, message=f"Fetched storm observation {obs_id} successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching storm observation {obs_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)

##get storms
@cache.cached()
@app.route('/list/storms', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM storm WHERE duration > 0;")
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /list/storms")
        
        return make_response("success", data=data, message="Fetched all storms successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching storms: {str(e)}")
        return make_response("error", message=str(e), code=500)
    
##get specific storm based on timestamp
@app.route('/storms', methods = ["GET"])
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
        cur = conn.cursor()
        cur.execute("SELECT * FROM storm WHERE (start_time <= %s AND end_time >= %s AND duration > 0);", (timestamp, timestamp))
        rows = cur.fetchall()

        # convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        logger.info("Stored new results in cache for /storms")

    except Exception as e:
        logger.error(f"Error fetching storms by time: {str(e)}")
        return make_response("error", message=str(e), code=500)
    
    return make_response("success", data=data, message=f"Fetched all storms at {timestamp} successfully")

@app.route('/list/stormobs', methods=["GET"])
def stormobs():
    """
    responses:
        200:
        description: lists all storm observations
    """
    cur = conn.cursor()
    cur.execute("SELECT * FROM storm_observation;")
    rows = cur.fetchall()
    
    # Convert to JSON-friendly format
    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    return jsonify(data)

@app.route('/stormobs/<int:id>', methods=["GET"])
def display_stormobs():
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
    cur = conn.cursor()
    cur.execute("SELECT * FROM storm_observation WHERE id = %s;",(id,))
    
    rows = cur.fetchall()

    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    return jsonify(data)

##Exporting client-side specific json objects
def transform_to_radarmap(row_dict, DateRange: str):
    pass

def transform_to_stormMetric(row_dict):
    pass

def transform_to_stormLog(row_dict):
    pass

def transform_to_plot1():
    """ 
    Shape needed for Plot1.js (Data1): 
    Array of storms, each element being an array of timestamp, rainfall, and size at a 30 minute interval
    Inputs storm_obs and weather_obs should already be filtered by dateRange before passing it to this function
    """
    Data1 = {}
    stormobs = stormobservations_daterange()
    for timestamp in stormobs:
        for obs in timestamp["observations"]:
            id = obs["storm_id"]
            if id not in Data1:
                Data1[id] = [{ "timestamp": obs["timestamp"], "size": obs["size"]}]
                #FIXME: join weather_observation before returning stormobservations_daterange
            else:
                Data1[id].append({ "timestamp": obs["timestamp"], "size": obs["size"]})

    Data1 = [
        {"storm_id": storm_id, "points": points}
        for storm_id, points in Data1.items()
    ]
    return Data1


def transform_to_plot2(row_dict):
    pass

def transform_to_plot3(row_dict):
    pass

if __name__ == '__main__':
    app.run(debug=True)