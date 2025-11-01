import pandas as pd 
import numpy as np 
import requests
from datetime import datetime 
import json
import os 

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
            ,'value' : 'wind_speed_knots'
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
            ,'value' : 'wind_direction_degrees'
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

    # add time_stamp and rearrange
    combined_df['time_stamp'] = query_date_time
    combined_df = combined_df[['time_stamp','station_id','wind_direction_degrees','wind_speed_knots','rainfall_mm','temperature_c','humidity_pct']]



    # print(combined_df['station_id'].unique())
    # print(len(combined_df['station_id'].unique()))
    # print(combined_df)
    # print(combined_df.dtypes)
    

    # inner join all upload one table on postgre
    # station_id                 object
    # wind_direction_degrees      int64
    # wind_speed_knots          float64
    # rainfall_mm                 int64
    # temperature_C             float64
    # humidity_pct                float64

    return combined_df

#################################################