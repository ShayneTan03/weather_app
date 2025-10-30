import pandas as pd 
import numpy as np 
import requests
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
from skimage.color import rgb2lab
from pg8000.dbapi import DatabaseError, ProgrammingError
from dotenv import load_dotenv
from datetime import datetime, timedelta, time
import gc


# --- S3 SETUP ---
BUCKET_NAME = "dsa3101-storm-tracking-tw08"

# create s3 client (this reads credentials from ~/.aws/credentials)
s3 = boto3.client("s3")

####################################################################################################
# helpers 
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

def fetch_s3_bytes(s3_key):
    # if key is None, just return None
    if s3_key is None:
        return None
    # otherwise fetch the object bytes from s3
    return s3.get_object(Bucket=BUCKET_NAME, Key=s3_key)['Body'].read()
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

def rgb_to_dbz(img, use_lab=True, snap_tol=8.0, alpha_min=10):
    rgba = np.array(img.convert('RGBA'), dtype=np.uint8)
    rgb  = rgba[..., :3]
    alpha = rgba[..., 3]
    H, W = rgb.shape[:2]

    # Legend arrays
    legend_rgb = np.array([c for c, _ in legend], dtype=np.float32)     # (K,3)
    legend_dbz = np.array([z for _, z in legend], dtype=np.float32)     # (K,)
    K = legend_rgb.shape[0]

    # Prepare working color arrays
    flat_rgb = rgb.reshape(-1, 3).astype(np.float32)                    # (N,3)

    if use_lab:
        # Convert both to Lab in [0,1] input range
        legend_lab = rgb2lab(legend_rgb[None, ...] / 255.0)[0]          # (K,3)
        flat_lab   = rgb2lab(flat_rgb[None, ...]   / 255.0)[0]          # (N,3)
        # Distances in Lab (DeltaE ~ Euclidean here)
        d = np.sqrt(np.sum((flat_lab[:, None, :] - legend_lab[None, :, :])**2, axis=2), dtype=np.float32)  # (N,K)
    else:
        # Euclidean in RGB
        d = np.sqrt(np.sum((flat_rgb[:, None, :] - legend_rgb[None, :, :])**2, axis=2), dtype=np.float32)  # (N,K)

    # closest 2 two legend bins
    nearest_two = np.argsort(d, axis=1)[:, :2]  # (N,2)
    i0 = nearest_two[:, 0]                      # nearest index
    i1 = nearest_two[:, 1]                      # second nearest

    d0 = d[np.arange(d.shape[0]), i0]
    d1 = d[np.arange(d.shape[0]), i1]
    z0 = legend_dbz[i0]
    z1 = legend_dbz[i1]


    dbz_flat = np.zeros(d.shape[0], dtype=np.float32)

    # snap within tolerance to exact bin (handles anti-aliased purple)
    snap_mask = (d0 <= float(snap_tol))
    dbz_flat[snap_mask] = z0[snap_mask]

    # else, blend by inverse distance between the two closest bins
    rem = ~snap_mask
    eps = 1e-6
    w0 = 1.0 / np.maximum(d0[rem], eps)
    w1 = 1.0 / np.maximum(d1[rem], eps)
    num = w0 * z0[rem] + w1 * z1[rem]
    den = w0 + w1
    dbz_flat[rem] = num / np.maximum(den, eps)

    # reshape
    dbz_grid = dbz_flat.reshape(H, W)

    # drop true background
    if alpha_min is not None:
        mask = (alpha > alpha_min)
        dbz_grid[~mask] = 0.0

    # return integers
    return np.rint(dbz_grid).astype(np.int32)

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
                if input_df['wind_speed'].iloc[0] >= wind_speed_threshold:
                        threshold_flags[0] = True
                if input_df['rainfall_mm'].iloc[0] >= rainfall_threshold:
                        threshold_flags[1] = True
                if input_df['temperature_c'].iloc[0] <= temperature_threshold:
                        threshold_flags[2] = True
                if input_df['humidity_pct'].iloc[0] >= humidty_threshold:
                        threshold_flags[3] = True


        # if multi station, average all 
        else:
                cols_to_avg = ["wind_speed", "rainfall_mm", "temperature_c", "humidity_pct"]
                mean_df = input_df[cols_to_avg].mean()

                if mean_df['wind_speed'] >= wind_speed_threshold:
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

        ,dist_tol
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
                if weather_data_df['distance_to_station'].iloc[0] <= dist_tol:
                        res = True
                        return res 
                # call and return nearest station 
                nearby_stations = weather_data_df.head(1)

        res = metric_threshold_calc(nearby_stations,wind_speed_threshold,rainfall_threshold,temperature_threshold,humidty_threshold)

        return res
######################################################################################

####################################################################################################
### data pulling from db
## pull station data 
station_query = """
SELECT * 
FROM weather_station 
"""

station_data = query_to_df(conn,station_query)
station_data



####################################################################################################
# threshold settings
dbz_threshold = 40# currently i set 40, but can change according to mapping too
min_area_threshold = 80# currently i set to 150, makes the most sense so far

wind_speed_threshold = 5
rainfall_threshold = 2
temperature_threshold = 24
humidty_threshold = 90
dist_tol = 40



####################################################################################################



##################################################################################################

# === inputs ===
start_date_str = "2025-08-21"
end_date_str   = "2025-08-31"

# === setup ===
start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
end_date   = datetime.strptime(end_date_str, "%Y-%m-%d").date()


current_date = start_date

# === main loop ===
while current_date <= end_date:
    # generate all hours in the day
    hours = [datetime.combine(current_date, time(h, 0)) for h in range(24)]
    day_start_ts = datetime.combine(current_date, time(0, 0))       # 00:00:00
    day_end_ts   = datetime.combine(current_date, time(23, 55))     # 23:55:00

    image_query = """
    SELECT * 
    FROM radar_image 
    WHERE 
        timestamp between %s and %s;
    """

    print(f'pulling radar images for {day_start_ts} to {day_end_ts}')
    image_data = query_to_df(conn,image_query, (day_start_ts,day_end_ts))

    weather_query = """
    SELECT * 
    FROM weather_observation 
    WHERE 
        timestamp between %s and %s;
    """

    print(f'pulling weather data for {day_start_ts} to {day_end_ts}')
    weather_data = query_to_df(conn,weather_query, (day_start_ts,day_end_ts))

    # batch retrieve from s3 
    image_data['s3_key'] = image_data['s3_key'].replace({None: pd.NA}).ffill().bfill() # if any s3_key is missing, ffill from previous row first , bfill is to catch corner case of first few leading rows is empty

    image_data['from_s3'] = image_data['s3_key'].apply(fetch_s3_bytes)

    print(f'starting hourly batch process for {day_start_ts} to {day_end_ts}')
    for i in range(len(hours)):
        start_ts = hours[i]
        # for the last hour, end at 23:55 instead of 00:00 next day
        if i == len(hours) - 1:
            end_ts = datetime.combine(current_date, time(23, 55))
        else:
            end_ts = hours[i] + timedelta(hours=1)

        # batch processing 
        print(f'processing for {start_ts} and {end_ts}')

        # 5 min batch runs 

        is_last_hour = (end_ts.hour == 0) or (start_ts.hour == 23)

        if is_last_hour:
            # 23:00 to 23:55 exactly
            timeline = pd.date_range(start=start_ts, end=start_ts + timedelta(minutes=55), freq='5min')
        else:
            # standard 01:00 to 01:55 etc.
            timeline = pd.date_range(start=start_ts, end=end_ts, freq='5min', inclusive='left')

        hour_rows_storm_obs = []
        hour_rows_radar_grid = []
        hour_timestamps_touched = []

        for ts in timeline:
            # === WEATHER MERGE PER 5-MIN ===
            weather_slice = weather_data[weather_data['timestamp'] == ts]
            weather_and_station_data = weather_slice.merge(station_data, on='station_id', how='left')

            # === IMAGE BYTES PER 5-MIN ===
            img_slice = image_data[image_data['timestamp'] == ts]
            if img_slice.empty:
                print(f'No image data for {ts}, skipping.')
                continue

            image_byte_data = img_slice.iloc[0]['from_s3']

            # === STORM DETECTION & VALIDATION ===
            possible_storm_grid, possible_storm_df = image_to_possible_storm(
                image_byte_data, dbz_threshold, min_area_threshold
            )

            final_storm_df = possible_storm_df.copy()
            final_storm_df['output'] = final_storm_df['grid_id'].apply(
                lambda x: storm_object_checker(
                    x, possible_storm_grid, weather_and_station_data,
                    wind_speed_threshold, rainfall_threshold,
                    temperature_threshold, humidty_threshold, dist_tol
                )
            )
            final_storm_df = final_storm_df[final_storm_df['output']]

            # === SKIP EMPTY RESULTS ===
            if final_storm_df.shape[0] == 0:
                print(f'No possible storms detected for {ts}, skipping DB upload.')
                continue

            # === PREPARE STORM OBSERVATION ROWS ===
            final_storm_df['timestamp'] = ts
            new_order = [
                'timestamp', 'grid_id', 'centroid_x', 'centroid_y',
                'anchor_x', 'anchor_y', 'peak_dbz', 'area_px', 'output'
            ]
            final_storm_df = final_storm_df[new_order]
            final_storm_df.drop(columns=['output'], inplace=True)
            final_storm_df = final_storm_df.replace({np.nan: None})

            # append all storm rows for the hour
            rows_this_ts = list(final_storm_df[[
                "timestamp", "grid_id", "centroid_x", "centroid_y",
                "anchor_x", "anchor_y", "peak_dbz", "area_px"
            ]].itertuples(index=False, name=None))
            hour_rows_storm_obs.extend(rows_this_ts)  # multiple rows per 5-min

            # === PREPARE GRID DATA ===
            to_keep = final_storm_df["grid_id"].unique()
            final_storm_grid = np.where(
                np.isin(possible_storm_grid, to_keep),
                possible_storm_grid, 0
            )

            buf = io.BytesIO()
            np.save(buf, final_storm_grid)
            buf.seek(0)
            binary_data = buf.read()

            hour_rows_radar_grid.append((ts, binary_data))  # one grid per 5-min
            hour_timestamps_touched.append(ts)              # for batch DELETE

        # === HOUR BATCH DB UPLOAD ===
        delete_sql_single = "DELETE FROM storm_observation WHERE timestamp = %s;"
        insert_storm_sql = """
        INSERT INTO storm_observation (
            timestamp, grid_id, centroid_x, centroid_y,
            anchor_x, anchor_y, peak_dbz, area_px
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """
        upsert_grid_sql = """
        INSERT INTO storm_grid (timestamp, grid_data)
        VALUES (%s, %s)
        ON CONFLICT (timestamp) DO UPDATE
        SET grid_data = EXCLUDED.grid_data;
        """

        try:
            with conn.cursor() as cur:
                if hour_timestamps_touched:
                    cur.executemany(delete_sql_single, [(t,) for t in hour_timestamps_touched])
                if hour_rows_storm_obs:
                    cur.executemany(insert_storm_sql, hour_rows_storm_obs)
                if hour_rows_radar_grid:
                    cur.executemany(upsert_grid_sql, hour_rows_radar_grid)

            conn.commit()
            print(f" Uploaded hour batch: {start_ts:%F %H:%M} to {end_ts:%F %H:%M} " )

        except (DatabaseError, ProgrammingError) as e:
            conn.rollback()
            print(" Database error while uploading hour batch:")
            raise

        del (
            hour_rows_storm_obs,
            hour_rows_radar_grid,
            hour_timestamps_touched,
            timeline,
            weather_slice,
            img_slice
        )
        gc.collect()

    del image_data, weather_data
    gc.collect()

    current_date += timedelta(days=1)