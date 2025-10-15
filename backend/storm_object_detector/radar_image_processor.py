# library
import requests
from PIL import Image
from io import BytesIO
import numpy as np
from scipy.ndimage import label
import pandas as pd
import matplotlib.pyplot as plt
from skimage.color import rgb2lab

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
