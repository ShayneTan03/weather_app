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

if __name__ == '__main__':
    app.run(debug=True)