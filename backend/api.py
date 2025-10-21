#This file contains all the apis that will directly support the frontend of this project.

from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv
import os

from flask import abort
load_dotenv()  # Load from .env

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT")

app = Flask(__name__)
CORS(app)

conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)

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
@app.route('/list/weatherstations', methods = ["GET"])
def weatherstations():
    """
    responses:
        200:
        description: lists all weatherstations
    """
    cur = conn.cursor()
    cur.execute("SELECT * FROM weather_station;")
    rows = cur.fetchall()
    
    # Convert to JSON-friendly format
    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    return jsonify(data)

## get specific weatherstation
@app.route('/weatherstation/<int:id>', methods = ["GET"])
def display_weatherstation():
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
    cur = conn.cursor()
    cur.execute("SELECT * FROM weather_station WHERE id = %s;", (id,))
    rows = cur.fetchall()
    
    # Convert to JSON-friendly format
    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    return jsonify(data)

#direct pull and list weather observation data
## list all weather observations
@app.route('/list/weatherobs', methods = ["GET"])
def weatherobs():
    """
    responses:
        200:
        description: lists all weather observations
    """
    cur = conn.cursor()
    cur.execute("SELECT * FROM weather_observation;")
    rows = cur.fetchall()
    
    # Convert to JSON-friendly format
    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    return jsonify(data)

##get specific weather observation
@app.route('/weatherobs/<int:id>', methods = ["GET"])
def display_weatherobs():
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
    cur = conn.cursor()
    cur.execute("SELECT * FROM weather_observation WHERE id = %s;", (id,))
    rows = cur.fetchall()
    
    # Convert to JSON-friendly format
    colnames = [desc[0] for desc in cur.description]
    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    return jsonify(data)

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