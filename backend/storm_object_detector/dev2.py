import pandas as pd 
import numpy as np 
import requests
from datetime import datetime 
import boto3
import pg8000
import json
import os 
import requests
from PIL import Image
from io import BytesIO
import math
from scipy.ndimage import label
import io


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


######################################################################################
# this part is from radar_image_processor.py

# convert jpeg to RGBA 
legend = [
    ((  0, 255, 255),  5.0),  # cyan
    ((  0, 200, 150), 10.0),  # aqua-green
    ((  0, 255,   0), 20.0),  # green
    ((150, 255,   0), 28.0),  # yellow-green
    ((255, 255,   0), 35.0),  # yellow
    ((255, 200,   0), 42.0),  # amber
    ((255, 150,   0), 50.0),  # orange
    ((255, 100,   0), 58.0),  # red-orange
    ((255,   0,   0), 65.0),  # red
    ((255,   0, 255), 70.0),  # magenta/purple
]

def rgb_to_dbz(img) :
    img_convert = img.convert('RGBA')
    rgba_array = np.array(img_convert,dtype= np.uint8)

    # decompose the channels
    rgb = rgba_array[... , :3] 
    alpha = rgba_array[... , 3]
    H, W = rgb.shape[:2] # storing image dimensions
    mask = alpha > 0 # for downstream boolean masking

    # legend arrays
    legend_rgb = np.array([c for c, _ in legend], dtype=np.int16)   # (K,3) , pull and convert to array for vectorised 
    legend_dbz = np.array([z for _, z in legend], dtype=np.float32) # (K,) 

    #flatten pixels for vectorized distance calc
    flat = rgb.reshape(-1, 3) # from grid to single list of each pixel
    N, K = flat.shape[0], legend_rgb.shape[0]

    #l2 distances to all legend colors (N,K)
    d2 = np.sum((flat[:, None, :] - legend_rgb[None, :, :])**2, axis=2)  # squared distances
    d  = np.sqrt(d2, dtype=np.float32) 

    #find top 2 closest
    nearest_two = np.argsort(d, axis=1)[:, :2] # sort against all colors on the legend
    i0 = nearest_two[:, 0] # extract the index to map back to dbz value                 
    i1 = nearest_two[:, 1]                      

    d0 = d[np.arange(N), i0] # returns actual distance between each pixel and the nearest color                 
    d1 = d[np.arange(N), i1]                     
    z0 = legend_dbz[i0] # map the dbz value           
    z1 = legend_dbz[i1]                             


    exact = (d0 == 0.0) # the first closest is exact 
    # start with zeros
    dbz_flat = np.zeros(N, dtype=np.float32)

    eps = 1e-6 # to prevent 0 division

    # weighted interpolation
    w0 = np.where(exact, 1.0, 1.0 / np.maximum(d0, eps))
    w1 = np.where(exact, 0.0, 1.0 / np.maximum(d1, eps))
    num = w0 * z0 + w1 * z1
    den = w0 + w1
    dbz_flat = np.where(exact, z0, num / np.maximum(den, eps))

    dbz_grid = dbz_flat.reshape(H, W)
    dbz_grid[~mask] = float(0) # anything that was transparent ie no rain , set dbz = 0 

    return np.rint(dbz_grid).astype(int)

def binary_storm_mask(dbz_grid,threshold_dbz) : 
    mask = (dbz_grid >= threshold_dbz).astype(np.uint8) # binary mask 
    return mask

def filter_by_area(storm_mask
                   ,dbz_grid
                   ,min_area_px):
    
    # identifying connected components
    structure = np.ones((3, 3), dtype=int)
    labels_raw, n_raw = label(storm_mask.astype(np.uint8), structure=structure)

    # checking for each component
    keep = np.zeros_like(labels_raw, dtype=bool)
    for lab in range(1, n_raw + 1):
        comp = (labels_raw == lab) # masks only the current storm to 1, else is 0 
        area = int(comp.sum())
        if area < min_area_px: # must be big enoogh
            continue
        peak = float(dbz_grid[comp].max()) if area > 0 else -np.inf
        keep |= comp

    # relabelled only filtered 
    labels_kept, n_kept = label(keep.astype(np.uint8), structure=structure)

    # for each possible storm find area, peak, centriod (geometric center relative to storm) and anchor pixel closest pair to the storm centriod just round off
    records = []
    for new_id in range(1, n_kept + 1):
        comp = (labels_kept == new_id) # binary mask

        # area
        area_px = int(comp.sum()) *0.088 # convert to km^2 

        # peak & anchor pixel 
        values = dbz_grid[comp] # pull reflectivity numbers for this storm
        peak_dbz = float(values.max()) if area_px > 0 else float("-inf") # find peak dbz in the storm, -inf is safety net 
        ys, xs = np.where(comp) # return every pixel coordinate in the storm
        # print(ys)
        # print(xs)
        
        # centroid (geometric center) — floats
        centroid_y = float(ys.mean()) if area_px > 0 else np.nan
        centroid_x = float(xs.mean()) if area_px > 0 else np.nan

        records.append({
            "grid_id": new_id,
            "area_px": area_px,
            "peak_dbz": round(peak_dbz, 2),
            "anchor_y": round(centroid_y,0), # just round to near whole number, for down stream processing
            "anchor_x": round(centroid_x,0),
            "centroid_y": round(centroid_y, 2),
            "centroid_x": round(centroid_x, 2),
        })

    storm_df = pd.DataFrame.from_records(
        records,
        columns=["grid_id", "area_px", "peak_dbz", "anchor_y", "anchor_x", "centroid_y", "centroid_x"]
    )

    return labels_kept, storm_df
######################################################################################

######################################################################################
# main function 
def image_to_possible_storm(
    data
    ,dbz_threshold
    ,min_area_threshold
) : 
    """
    This function combines the helper functions above to process a radar image. 
    
    inputs: 
        1) data : bytedata of an image 
        2) dbz_threshold : integer, the decision marker on which pixels will constitute as a storm 
        3) min_area_threshold : integer, the decision marker on which storms will be filtered out
    
    ouputs: 
        possible_storm_grid : array of the same dimensions as input image, contains the labeled possible storms with unique label for each 
        possible_storm_df : contains metadata about the storm namely
            - grid_id : unique identifier
            - area_px : area of storm (calculated as number of pixel for now)
            - peak_dbz : maximum dbz value of a storm component
            - centroid_x : geometric mean of the storms' pixels x coordinate
            - centroid_y : geometric mean of the storms' pixels y coordinate
            - anchor_x : centroid_x rounded to nearest whole number for downstream
            - anchor_y : centroid_y rounded to nearest whole number for downstream
    """
    
    image_buffer = BytesIO(data)
    img = Image.open(image_buffer)

    # convert from image bytedata -> RGB channel data -> map RGB values by distance to dBz 
    dbz_per_pixel = rgb_to_dbz(img)

    # filter on a fixed threshold 
    dbz_above_threshold = binary_storm_mask(dbz_per_pixel,dbz_threshold)

    # from binary storm mask , identify connected components and filter again on minimum storm area
    possible_storm_grid , possible_storm_df = filter_by_area(dbz_above_threshold,dbz_per_pixel,min_area_threshold)

    return possible_storm_grid, possible_storm_df
######################################################################################



######################################################################################

# this portion is from storm_object_detector.py
def storm_pixel_coordinates(
        storm_id
        ,full_storm_grid
): 
        # binary mask 
        storm_mask = (full_storm_grid == storm_id).astype(np.uint8)

        #print(int(storm_mask.sum()))

        # return coordinates for every pixel 
        ys,xs = np.where(storm_mask)

        # pack into dataframe 
        coord = list(zip(xs,ys))
        df = pd.DataFrame({'coord':coord})

        return df

def metric_threshold_calc(
        input_df
        ,wind_speed_threshold
        ,rainfall_threshold
        ,temperature_threshold
        ,humidty_threshold
): 
        res = False
        threshold_flags = [False,False,False,False]

        # if single station 
        if input_df.shape[0] == 1: 
                if input_df['wind_speed_knots'].iloc[0] >= wind_speed_threshold:
                        threshold_flags[0] = True
                if input_df['rainfall_mm'].iloc[0] >= rainfall_threshold:
                        threshold_flags[1] = True
                if input_df['temperature_c'].iloc[0] <= temperature_threshold:
                        threshold_flags[2] = True
                if input_df['humidity_pct'].iloc[0] >= humidty_threshold:
                        threshold_flags[3] = True


        # if multi station, average all 
        else:
                cols_to_avg = ["wind_speed_knots", "rainfall_mm", "temperature_c", "humidity_pct"]
                mean_df = input_df[cols_to_avg].mean()

                if mean_df['wind_speed_knots'] >= wind_speed_threshold:
                        threshold_flags[0] = True
                if mean_df['rainfall_mm'] >= rainfall_threshold:
                        threshold_flags[1] = True
                if mean_df['temperature_c'] <= temperature_threshold:
                        threshold_flags[2] = True
                if mean_df['humidity_pct'] >= humidty_threshold:
                        threshold_flags[3] = True

        if sum(threshold_flags) == 4:
                res = True
        return res


def x_y_distance(
        tuple
        ,x2
        ,y2
) : 
        if isinstance(tuple, float) and np.isnan(tuple):
                d = np.inf
        else:
                x1 = tuple[0]
                y1 = tuple[1]
                d = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

        return d
######################################################################################

######################################################################################
# main function , call this with .apply to vectorise the function on dataframe for faster processing
def storm_object_checker(
        storm_id
        ,possible_storm_grid

        ,weather_data_df

        # threshholds 
        ,wind_speed_threshold
        ,rainfall_threshold
        ,temperature_threshold
        ,humidty_threshold
): 
        """
        This function is meant to be vectorised on a dataframe, to gauge if the storm meets required thresholds

        inputs: 
            storm_id : iterable ID from the input dataframe
            possible_storm_grid : a numppy grid array of labeled components
            weather_data_df : contains the weather data nearby stations, detected either by 1) storm has a pixel where the weather station is 
            
            thresholds: benchmarks to check if the storm is valid 

        outputs
            a boolean value for every row
        """
        curr_storm = storm_pixel_coordinates(storm_id, possible_storm_grid)

        nearby_stations = pd.merge(weather_data_df,curr_storm,how='inner' , on = 'coord')
        
        # storm does not encompass any stations
        if nearby_stations.shape[0] == 0:
                # find centriod point first
                xs, ys = zip(*curr_storm["coord"])

                anchor_y = round(float(np.mean(ys)),0)
                anchor_x = round(float(np.mean(xs)),0)
                weather_data_df['distance_to_station'] = weather_data_df['coord'].apply(lambda x: x_y_distance(x,anchor_x,anchor_y))
                weather_data_df.sort_values(by='distance_to_station',ascending=True,inplace=True,na_position='last')
                # call and return nearest station 
                nearby_stations = weather_data_df.head(1)

        res = metric_threshold_calc(nearby_stations,wind_speed_threshold,rainfall_threshold,temperature_threshold,humidty_threshold)
        
        return res
######################################################################################







####################################################################################################
### main task of this script
## need to create conn object 

## pipeline from 5 min radar image to list of possible storm, together with gridded component representation 

## timeframe is 5 minute
ts = # datetime object 

####################################################################################################
### data pulling from db
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

image_id = image_data['image_id'] # for downstream

# pull image from s3, 
image_byte_data = 

####################################################################################################



####################################################################################################
### run algos
## weather data left join station data 
weather_and_station_data = weather_data.merge(station_data, on = 'station_id',how = 'left')



## storm_object_checker_algo
possible_storm_grid, possible_storm_df = image_to_possible_storm(image_byte_data,dbz_threshold,min_area_threshold)

final_storm_df = possible_storm_df.copy()

final_storm_df['output'] = final_storm_df['new_id'].apply(lambda x: storm_object_checker(x,possible_storm_grid,weather_and_station_data,wind_speed_threshold,rainfall_threshold,temperature_threshold,humidty_threshold))

final_storm_df = final_storm_df[final_storm_df['output']]
####################################################################################################


####################################################################################################
### upload to db 


# add time stamp first 
final_storm_df['timestamp'] = ts # from above 
new_order = ['timestamp','grid_id','centroid_x','centroid_y','anchor_x','anchor_y','peak_dbz','area_px','output']
final_storm_df = final_storm_df[new_order]
final_storm_df.drop(columns = ['output'],inplace = True)


# db schema : storm_observation
# timestamp : same as previous tables 
# grid_id : int 
# centroid_x : float (juz need decimal)
# centriod_y : float 
# anchor_x : float
# anchor_y : float 
# peak_dbz : float 
# area_px : float 



# remove unwanted components 
to_keep = final_storm_df["grid_id"].unique()
final_storm_grid = np.where(np.isin(possible_storm_grid, to_keep), possible_storm_grid, 0)

# grid data need to convert into byte data first 
buf = io.BytesIO()
np.save(buf, final_storm_grid)   # Serialize the array to in-memory bytes
buf.seek(0)
binary_data = pg8000.Binary(buf.read())

# db schema : storm_grids
# timestamp :same as previous tables 
# grid_array : BYTEA (this one important)



####################################################################################################
