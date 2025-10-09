######################
# this script is used to ingest real-time weather data from data.gov.sg API
# and store the data in a PostgreSQL database.
# The data includes wind speed, wind direction, rainfall, temperature, and humidity.
# The script is designed to be run as an AWS Lambda function, triggered every 5 minutes
# to fetch the latest data and update the database accordingly.
######################

import pandas as pd 
import numpy as np 
import requests
from datetime import datetime 
import boto3
import pg8000
import json
import os 

secrets_client = boto3.client('secretsmanager')
s3 = boto3.client('s3')

# Global connection object to reuse between invocations (connection pooling benefit)
_db_conn = None
#################################################


#################################################
## query date handling
current_datetime = datetime.today()
minute = (current_datetime.minute // 5) * 5
run_datetime= current_datetime.replace(minute = minute,second = 0, microsecond=0).isoformat()
# print(run_datetime)
#################################################


#################################################
## database function
def get_secret(secret_arn):
    resp = secrets_client.get_secret_value(SecretId=secret_arn)
    return json.loads(resp['SecretString'])

# def get_db_conn(secret_arn):
#     global _db_conn
#     if _db_conn:
#         try:
#             cur = _db_conn.cursor()
#             cur.execute("SELECT 1;")
#             cur.close()
#             return _db_conn
#         except Exception:
#             _db_conn = None
#     secret = get_secret(secret_arn)
#     host = secret['host']
#     dbname = secret['dbname']
#     user = secret['username']
#     password = secret['password']
#     port = int(secret.get('port', 5432))
#     _db_conn = pg8000.connect(
#         host=host,
#         database=dbname,
#         user=user,
#         password=password,
#         port=port
#     )
#     return _db_conn

#instead of a global connection object, we will create a new connection each time
def get_db_conn(secret_arn):
    secret = get_secret(secret_arn)
    host = secret['host']
    dbname = secret['dbname']
    user = secret['username']
    password = secret['password']
    port = int(secret.get('port', 5432))
    return pg8000.connect(
        host=host,
        database=dbname,
        user=user,
        password=password,
        port=port
    )

def insert_metadata(conn,input_df):
    data_payload = input_df.to_records(index = False).tolist()
    with conn.cursor() as cur:
        cur.executemany(
            #table name: weather_observation
            #updated column names to match models.py
        """
        INSERT INTO weather_observation (
                station_id,
                timestamp,
                wind_direction,
                wind_speed,
                rainfall_mm,
                temperature_c,
                humidity_pct
            )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (station_id, timestamp) DO UPDATE
        SET wind_direction = EXCLUDED.wind_direction,
            wind_speed = EXCLUDED.wind_speed,
            rainfall_mm = EXCLUDED.rainfall_mm,
            temperature_c = EXCLUDED.temperature_c,
            humidity_pct = EXCLUDED.humidity_pct;
        """, data_payload)
        conn.commit()

#################################################

#################################################
## api functions 
def wind_speed_api(
    query_date_time
) : 
    base_url = 'https://api-open.data.gov.sg/v2/real-time/api/wind-speed?date='
    run_url = base_url + query_date_time

    header = { 
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }

    res = requests.get(run_url,headers = header)

    if res.status_code == 200: 
        output = res.json()
        # station_info = output['data']['stations']
        read_output = output['data']['readings'][0]['data']

        reading_output_df = pd.DataFrame(read_output)
        reading_output_df.rename(columns={
            'stationId' : 'station_id'
            ,'value' : 'wind_speed'
        },inplace=True)
        return reading_output_df 
    else:
        raise ValueError(f'wind speed API failed with code :{res.status_code}')

def wind_direction_api(
    query_date_time
) : 
    base_url = 'https://api-open.data.gov.sg/v2/real-time/api/wind-direction?date='
    run_url = base_url + query_date_time

    header = { 
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }

    res = requests.get(run_url,headers = header)

    if res.status_code == 200: 
        output = res.json()
        # station_info = output['data']['stations']
        read_output = output['data']['readings'][0]['data']

        reading_output_df = pd.DataFrame(read_output)
        reading_output_df.rename(columns={
            'stationId' : 'station_id'
            ,'value' : 'wind_direction'
        },inplace=True)
        return reading_output_df 
    else:
        raise ValueError(f'wind direction API failed with code :{res.status_code}')

def rainfall_api(
    query_date_time
) : 
    base_url = 'https://api-open.data.gov.sg/v2/real-time/api/rainfall?date='
    run_url = base_url + query_date_time

    header = { 
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }

    res = requests.get(run_url,headers = header)

    if res.status_code == 200: 
        output = res.json()
        # station_info = output['data']['stations']
        read_output = output['data']['readings'][0]['data']

        reading_output_df = pd.DataFrame(read_output)
        reading_output_df.rename(columns={
            'stationId' : 'station_id'
            ,'value' : 'rainfall_mm'
        },inplace=True)
        return reading_output_df 
    else:
        raise ValueError(f'rainfall API failed with code :{res.status_code}')

def humidity_api(
    query_date_time
) : 
    base_url = 'https://api-open.data.gov.sg/v2/real-time/api/relative-humidity?date='
    run_url = base_url + query_date_time

    header = { 
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }

    res = requests.get(run_url,headers = header)

    if res.status_code == 200: 
        output = res.json()
        # station_info = output['data']['stations']
        read_output = output['data']['readings'][0]['data']

        reading_output_df = pd.DataFrame(read_output)
        reading_output_df.rename(columns={
            'stationId' : 'station_id'
            ,'value' : 'humidity_pct'
        },inplace=True)
        return reading_output_df 
    else:
        raise ValueError(f'humidity API failed with code :{res.status_code}')

def temperature_api(
    query_date_time
) : 
    base_url = 'https://api-open.data.gov.sg/v2/real-time/api/air-temperature?date='
    run_url = base_url + query_date_time

    header = { 
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }

    res = requests.get(run_url,headers = header)

    if res.status_code == 200: 
        output = res.json()
        # station_info = output['data']['stations']
        read_output = output['data']['readings'][0]['data']

        reading_output_df = pd.DataFrame(read_output)
        reading_output_df.rename(columns={
            'stationId' : 'station_id'
            ,'value' : 'temperature_c'
        },inplace=True)
        return reading_output_df 
    else:
        raise ValueError(f'temperature API failed with code :{res.status_code}')

def main_scrapper(
    query_date_time
) : 

    
    # call all 3 API 
    wind_direction_df = wind_direction_api(query_date_time)
    wind_speed_df = wind_speed_api(query_date_time)
    rainfall_df = rainfall_api(query_date_time)
    temperature_df = temperature_api(query_date_time)
    humidity_df = humidity_api(query_date_time)

    combined_df = wind_direction_df.merge(wind_speed_df,on='station_id',how = 'inner').merge(rainfall_df,on='station_id',how = 'inner').merge(temperature_df,on='station_id',how = 'inner').merge(humidity_df,on='station_id',how = 'inner')

    # add timestamp and rearrange
    combined_df['timestamp'] = pd.to_datetime(query_date_time)
    combined_df = combined_df[['station_id','timestamp','wind_direction','wind_speed','rainfall_mm','temperature_c','humidity_pct']]
# some issues with the data types, need to convert to correct types, will cont working on this when i m not dying


    # print(combined_df['station_id'].unique())
    # print(len(combined_df['station_id'].unique()))
    # print(combined_df)
    # print(combined_df.dtypes)
    

    # inner join all upload one table on postgre
    # station_id                 object
    # wind_direction              int64
    # wind_speed                float64
    # rainfall_mm                 int64
    # temperature_C             float64
    # humidity_pct                float64

    return combined_df

#################################################

#################################################
## main working functions 
def scrap_and_upload(query_date_time, conn):
    try:
        # Validate connection before scraping
        if conn is None:
            raise ValueError('Database connection is None')
        
        # Perform scraping
        result = main_scrapper(query_date_time)
        
        # Validate scraping result
        if result is None:
            raise ValueError(f'Scraping returned no results for {query_date_time}')
        
        # Insert into database
        insert_metadata(conn, result)
        
        print(f'Success for {query_date_time}!')
        return {
            "status": "success",
            "timestamp": str(query_date_time),
            "records_inserted": len(result) if hasattr(result, '__len__') else None
        }
        
    except ValueError as e:
        # Handle validation errors
        print(f"Validation error for {query_date_time}: {e}")
        return {
            "status": "error",
            "reason": "validation_failed",
            "error": str(e),
            "timestamp": str(query_date_time)
        }
        
    except pg8000.dbapi.DatabaseError as e:
        # Handle database-specific errors
        print(f"Database error for {query_date_time}: {e}")
        return {
            "status": "error",
            "reason": "database_error",
            "error": str(e),
            "timestamp": str(query_date_time)
        }
        
    except requests.exceptions.RequestException as e:
        # Handle network/scraping errors (if using requests)
        print(f"Scraping error for {query_date_time}: {e}")
        return {
            "status": "error",
            "reason": "scraping_failed",
            "error": str(e),
            "timestamp": str(query_date_time)
        }
        
    except Exception as e:
        # Catch-all for unexpected errors
        print(f"Unexpected error for {query_date_time}: {type(e).__name__} - {e}")
        return {
            "status": "error",
            "reason": "unexpected_error",
            "error": str(e),
            "error_type": type(e).__name__,
            "timestamp": str(query_date_time)
        }
    

#added db_conn as parameter
def lambda_handler(event, context):
    conn = get_db_conn(os.environ['SECRET_ARN'])
    return scrap_and_upload(run_datetime, conn)

if __name__ == "__main__":
    event = {} 
    context = {}
    print(lambda_handler(event, context))
#################################################
