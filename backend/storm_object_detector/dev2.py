import pandas as pd 
import numpy as np 
import requests
from datetime import datetime 
import boto3
import pg8000
import json
import os 


####################################################################################################
# helpers 
def get_secret(secret_arn):
    resp = secrets_client.get_secret_value(SecretId=secret_arn)
    return json.loads(resp['SecretString'])

def get_db_conn(secret_arn):
    global _db_conn
    if _db_conn:
        try:
            cur = _db_conn.cursor()
            cur.execute("SELECT 1;")
            cur.close()
            return _db_conn
        except Exception:
            _db_conn = None
    secret = get_secret(secret_arn)
    host = secret['host']
    dbname = secret['dbname']
    user = secret['username']
    password = secret['password']
    port = int(secret.get('port', 5432))
    _db_conn = pg8000.connect(
        host=host,
        database=dbname,
        user=user,
        password=password,
        port=port
    )
    return _db_conn

def query_to_df(conn, query, params=None):
    """
    Execute an SQL query and return results as a pandas DataFrame.

    Args:
        conn : active pg8000 connection
        query : SQL query string (use %s placeholders)
        params : tuple/list of parameters (optional)
    """
    with conn.cursor() as cur:
        cur.execute(query, params or ())
        # Extract column names from cursor description
        columns = [desc[0] for desc in cur.description]
        data = cur.fetchall()
    # Create DataFrame
    return pd.DataFrame(data, columns=columns)
####################################################################################################



## need to create conn object 

## pipeline from 5 min radar image to list of possible storm, together with gridded component representation 

## timeframe is 5 minute
ts = # datetime object 

####################################################################################################
## pull station data 
station_query = """
SELECT * 
FROM weather_station 
WHERE 
    timestamp = %s;
"""

station_data = query_to_df(conn,station_query, (ts,))


## pull weather data 
weather_query = """
SELECT * 
FROM weather_observation 
WHERE 
    timestamp = %s;
"""

weather_data = query_to_df(conn,weather_query, (ts,))

## pull image data
image_query = """
SELECT * 
FROM radar_image 
WHERE 
    timestamp = %s;
"""

image_data = query_to_df(conn,image_query, (ts,))

# pull image from s3, 
image_byte_data = 

####################################################################################################

####################################################################################################
## weather data left join station data 
weather_and_station_data = weather_data.merge(station_data, on = 'station_id',how = 'left')



## storm_object_checker_algo


####################################################################################################
