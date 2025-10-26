#This file contains all the apis that will directly support the frontend of this project.

import datetime
from flask import Flask, jsonify
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
- calculate validation metrics
- identified storm objects?
- identified storm trajectories?
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
        cur.execute("SELECT * FROM storm;")
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
    
##get specific storm
@cache.cached()
@app.route('/storm/<int:storm_id>', methods = ["GET"])
def display_storm(storm_id):
    """
    parameters:
        id: id
        in: path
        type: int
        required: true
        description: id of storm to display
    responses:
        200:
        description: displays information of one storm
    """
    cache_key = f"storm_{storm_id}"
    data = cache.get(cache_key)
    if data:
        logger.info(f"Cache hit for storm {storm_id}")
        return make_response("success", data=data, message=f"Fetched storm {storm_id} successfully from cache.")
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM storm WHERE storm_id = %s;", (storm_id,))
        rows = cur.fetchall()
        
        # Convert to JSON-friendly format
        colnames = [desc[0] for desc in cur.description]
        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        
        cache.set(cache_key, data)
        logger.info("Stored new result in cache for /storm/<storm_id>")
        
        return make_response("success", data=data, message=f"Fetched storm {storm_id} successfully.")
    
    except Exception as e:
        logger.error(f"Error fetching storm {storm_id}: {str(e)}")
        return make_response("error", message=str(e), code=500)

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

@app.route('/list/storms', methods=["GET"])
def storms():
    """
    responses:
        200:
        description: lists all storms
    """
    cur = conn.cursor()
    cur.execute("SELECT * FROM storm;")

    rows = cur.fetchall()

    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    return jsonify(data)

@app.route('/storm/<int:id>', methods=["GET"])
def display_storm():
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
    cur.exececute("SELECT * FROM storm WHERE id = %s;", (id,))
    rows = cur.fetchall()
    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]
    cur.close()

    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)