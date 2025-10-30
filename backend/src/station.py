## This script pulls weather station data from NEA's API providing weather information

import pandas as pd
import requests
import json

overall_data = {
    'Station Name': [],
    'Latitude': [],
    'Longitude': [],
    'Station ID': []
}
print(overall_data)
all_station_data = pd.DataFrame(overall_data)

## getting station id from data.gov.sg api
url_list = [
    "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
    "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
    "https://api-open.data.gov.sg/v2/real-time/api/wind-direction",
    "https://api-open.data.gov.sg/v2/real-time/api/wind-speed",
    "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity"]

responses = [requests.get(url) for url in url_list]
json_data = [response.json() for response in responses]

for i in range(len(url_list)):
    data = json_data[i]
    for station in data['data']['stations']:
        if station['id'] not in overall_data['Station ID']:
            name = station['name']
            id = station['id']
            lat = station['location']['latitude']
            long = station['location']['longitude']

            overall_data['Station Name'].append(name)
            overall_data['Latitude'].append(lat)
            overall_data['Longitude'].append(long)
            overall_data['Station ID'].append(id)
        else:
            continue

## sanity check: number of stations collected in overall_data
len(overall_data['Station Name'])

all_station_data = pd.DataFrame(overall_data)
# all_station_data

########################################################################################
# do not change
lat_min, lat_max = 1.15, 1.47
lon_min, lon_max = 103.56, 104.14   
########################################################################################

########################################################################################
# do not change
scale_x = 217 / 853
scale_y = 120 / 479
########################################################################################


def latlon_to_xy(lat, lon, lat_min, lat_max, lon_min, lon_max, width, height):
    """
    Convert latitude and longitude to pixel coordinates on the radar image grid.

    Args:
        lat, lon : float
        lat_min, lat_max, lon_min, lon_max : float
            Bounding box of the radar coverage.
        width, height : int
            Dimensions of the radar image (e.g. 217x120).

    Returns:
        (x, y) pixel coordinates (integers)
    """

    # normalize longitude to horizontal position
    x = (lon - lon_min) / (lon_max - lon_min) * (width - 1)
    # normalize latitude to vertical position (note inversion: north is top)
    y = (lat_max - lat) / (lat_max - lat_min) * (height - 1)

    return int(round(x)), int(round(y))

def basemap_to_radar(X, Y):
    x = X * scale_x
    y = Y * scale_y
    return int(round(x)), int(round(y))

all_station_data['coord_basemap'] = all_station_data.apply(lambda row : latlon_to_xy(row['Latitude'],row['Longitude'],lat_min, lat_max, lon_min, lon_max,853,479),axis = 1)

all_station_data.rename(columns={'Station Name':'station_name','Latitude':'latitude','Longitude':'longitude','Station ID':'station_id'},inplace = True)


all_station_data["coord"] = all_station_data["coord_basemap"].apply(lambda xy: basemap_to_radar(xy[0], xy[1]))
