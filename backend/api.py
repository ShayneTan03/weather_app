#This file contains all the apis that will directly support the frontend of this project.

from flask import Flask, jsonify 
from flask import abort                                                                    

app = Flask(__name__)

@app.route('/api')                                               #<2>
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
    
    return 

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
    
    
    return 

#direct pull and list weather observation data
## list all weather observations
@app.route('/list/weatherobs', methods = ["GET"])
def weatherobs():
    """
    responses:
        200:
        description: lists all weather observations
    """
    return

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
    return