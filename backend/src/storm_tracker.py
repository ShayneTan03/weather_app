import io
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from itertools import count
import pickle
import json
import boto3
import pg8000
from botocore.exceptions import ClientError
from pg8000.dbapi import DatabaseError, ProgrammingError
from dotenv import load_dotenv
from datetime import datetime, timedelta, time
import gc
import os
import hashlib

# --- S3 SETUP ---
BUCKET_NAME = "dsa3101-storm-tracking-tw08"

# create s3 client (this reads credentials from ~/.aws/credentials)
s3 = boto3.client("s3")


####################################################################################################
# helpers 
# def get_secret(secret_arn):
#     resp = secrets_client.get_secret_value(SecretId=secret_arn)
#     return json.loads(resp['SecretString'])

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

def query_to_df(conn, query, params=None):
    """
    execute an sql query and return results as a pandas dataframe.
    returns an empty dataframe if no rows are found.
    """
    with conn.cursor() as cur:
        cur.execute(query, params or ())

        # handle queries that return no result set
        if cur.description is None:
            return pd.DataFrame()

        # get column names
        columns = [desc[0] for desc in cur.description]

        # safe fetch for empty results
        try:
            rows = cur.fetchall()
        except Exception:
            rows = []

    # handle no rows fetched
    if not rows:
        return pd.DataFrame(columns=columns)

    return pd.DataFrame(rows, columns=columns)


####################################################################################################

##############################
# Matched labeled storms
# Using overlap and centroid distance between 2 consecutive frames
##############################
def match_frames(labels_t1, df_t1, labels_t2, df_t2, 
                 overlap_threshold=0.02, dist_threshold=20,
                 verbose=False):

    matches = []

    for _, row1 in df_t1.iterrows():
        id1 = int(row1["grid_id"])
        mask1 = (labels_t1 == id1)
        y1, x1 = row1["centroid_y"], row1["centroid_x"]

        for _, row2 in df_t2.iterrows():
            id2 = int(row2["grid_id"])
            mask2 = (labels_t2 == id2)
            y2, x2 = row2["centroid_y"], row2["centroid_x"]

            #Overlap
            inter = np.logical_and(mask1, mask2)
            denom = min(mask1.sum(), mask2.sum())
            if denom == 0:
                continue
            overlap_ratio = inter.sum() / denom

            #Distance
            dist = np.hypot(x2 - x1, y2 - y1)

            #Match Criteria
            if overlap_ratio >= overlap_threshold and dist <= dist_threshold:
                matches.append({
                    "t1_id": id1,
                    "t2_id": id2,
                    "overlap": round(overlap_ratio, 3),
                    "distance": round(dist, 2)
                })

    if not matches:
        return pd.DataFrame(columns=["t1_id", "t2_id", "overlap", "distance"])

    return pd.DataFrame(matches) 



##############################
# Classify storm splitting, merging, forming, dissipating
##############################
def classify_relationships(matches, df_t1, df_t2):
    rels = []
    t1_ids = set(df_t1["grid_id"])
    t2_ids = set(df_t2["grid_id"])

    if matches.empty:
        return pd.DataFrame(
            [{"type": "dissipated", "t1_id": did} for did in t1_ids] +
            [{"type": "new", "t2_id": nid} for nid in t2_ids]
        )

    matched_t1 = set(matches["t1_id"])
    matched_t2 = set(matches["t2_id"])

    #Continuations (1 → 1)
    for id1, group in matches.groupby("t1_id"):
        if len(group) == 1:
            rels.append({
                "type": "continue",
                "t1_id": id1,
                "t2_id": group["t2_id"].iloc[0]
            })

    #Splits (1 → many)
    for id1, group in matches.groupby("t1_id"):
        if len(group) > 1:
            rels.append({"type": "split", "t1_id": id1, "t2_id": group["t2_id"].tolist()})

    #Merges (many → 1)
    for id2, group in matches.groupby("t2_id"):
        if len(group) > 1:
            rels.append({"type": "merge", "t2_id": id2, "t1_id": group["t1_id"].tolist()})

    #New storms
    new_storms = list(t2_ids - matched_t2)
    for nid in new_storms:
        rels.append({"type": "new", "t2_id": nid})

    #Dissipated storms
    dead_storms = list(t1_ids - matched_t1)
    for did in dead_storms:
        rels.append({"type": "dissipated", "t1_id": did})

    return pd.DataFrame(rels)



##############################
# Update track IDs on matches
##############################
def update_tracks(matches, rels, id_map, next_track_id, parent_map):
    new_map = {}

    #Continuations (1 → 1)
    for _, row in matches.iterrows():
        id1, id2 = int(row["t1_id"]), int(row["t2_id"])
        if id1 in id_map:
            track_id = id_map[id1]
        else:
            track_id = next(next_track_id)
            parent_map[track_id] = track_id
        new_map[id2] = track_id

    #Splits (1 → many)
    for _, row in rels.iterrows():
        if row["type"] == "split":
            parent_tid = id_map.get(row["t1_id"])
            for child_gid in row["t2_id"]:
                child_tid = next(next_track_id)
                id_map[child_gid] = child_tid
                parent_map[child_tid] = parent_tid

    #Merges (many → 1)
    if row["type"] == "merge":
        merged_tid = next(next_track_id)
        id_map[row["t2_id"]] = merged_tid
        for p in row["t1_id"]:
            if p in id_map:
                parent_map[merged_tid] = id_map[p]

    #New storms
    handled = set(new_map.keys())
    for nid in map(int, rels.loc[rels["type"] == "new", "t2_id"].tolist()):
        if nid not in handled:
            new_track = next(next_track_id)
            new_map[nid] = new_track
            parent_map[new_track] = new_track

    #Fill in missing parents
    for gid, tid in id_map.items():
        if tid not in parent_map or parent_map[tid] is None:
            parent_map[tid] = tid

    return new_map



##############################
# Summarize storm life-cycle statistics for each tracked storm
##############################
def summarize_tracks(df, parent_map):
    #Frame interval from df order (minutes)
    frame_interval = (
        df["timestamp"].sort_values().diff().dt.total_seconds().dropna().mode()[0] / 60.0
    )

    rows = []

    for tid, g in df.groupby("track_id", sort=False):
        g = g.sort_values("timestamp")
        start = g["timestamp"].iloc[0]
        last  = g["timestamp"].iloc[-1]
        end   = last + pd.Timedelta(minutes=frame_interval) 

        rows.append({
            "storm_id": tid,
            "parent_id": parent_map.get(tid, tid),
            "start_time": start,
            "end_time": end,
            "duration": (end - start).total_seconds() / 60.0,
            "avg_centroid_x": g["centroid_x"].mean(),
            "avg_centroid_y": g["centroid_y"].mean(),
            "avg_dbz": g["peak_dbz"].mean(),
            "avg_area": g["area_px"].mean(),
            "n_frames": g["timestamp"].nunique()
        })

    summary = pd.DataFrame(rows)




    #Lineage Counts
    child_counts = pd.Series(list(parent_map.values())).value_counts()
    summary["num_children"] = summary["storm_id"].map(child_counts).fillna(0).astype(int)
    summary["is_root"] = summary["storm_id"] == summary["parent_id"]

    #Base Class
    summary["classification"] = np.where(summary["is_root"], "root", "continue")
    summary.loc[summary["num_children"] > 1, "classification"] = "split"

    #Dissipated if not reaching the very last frame boundary
    final_boundary = df["timestamp"].max() + pd.Timedelta(minutes=frame_interval)
    died = summary["end_time"] < final_boundary
    summary.loc[died, "classification"] = summary.loc[died, "classification"] + ", dissipated"

    return summary.sort_values(["start_time", "storm_id"]).reset_index(drop=True)

def bytes_to_array(b):
    if b is None:
        return None
    return np.load(io.BytesIO(b), allow_pickle=False)

def simple_hash(values):
    s = ",".join(map(str, values))
    return hashlib.sha256(s.encode()).hexdigest()


##############################
# Main Storm Tracker
##############################
def _root_parent(track_id, parent_map):
    """Return the ultimate root for a track_id."""
    p = parent_map.get(track_id, track_id)
    while p != parent_map.get(p, p):
        p = parent_map[p]
    return p


def track_storms_for_day(df, grids, overlap_threshold=0.02, dist_threshold=20):

    #Prepare Frames
    frames = {ts: g.copy() for ts, g in df.groupby("timestamp", sort=True)}
    timestamps = sorted(frames.keys())


    next_id = count(1)
    parent_map = {} 
    track_records = []
    id_map = {}

    #First Frame
    t0 = timestamps[0]
    df0 = frames[t0]


    for gid in df0["grid_id"]:
        tid = next(next_id)
        id_map[int(gid)] = tid
        parent_map[tid] = tid


    #Attach First Frame
    df0 = df0.copy()
    df0["track_id"] = df0["grid_id"].map(id_map)
    df0["parent_track_id"] = df0["track_id"].map(lambda z: parent_map.get(z, z))
    track_records.append(df0)


    #Subsequent Frames
    prev_ts, prev_df, prev_labels = t0, df0, grids[t0] 



    for ts in timestamps[1:]:
        # print('path3')
        cur_df = frames[ts].copy()
        cur_labels = grids[ts]

        #Compute matches
        matches = match_frames(prev_labels, prev_df, cur_labels, cur_df,
                               overlap_threshold=overlap_threshold,
                               dist_threshold=dist_threshold,
                               verbose=False)

        # decide relations
        rels = classify_relationships(matches, prev_df, cur_df)


        # Build next_id_map ONLY from this pair of frames (strict)
        next_id_map = {}

        # 1) continuations (1->1)
        cont = rels[rels["type"] == "continue"][["t1_id", "t2_id"]].dropna().astype(int)
        for _, r in cont.iterrows():
            t1, t2 = int(r["t1_id"]), int(r["t2_id"])
            if t1 in id_map:
                next_id_map[t2] = id_map[t1]  # carry same storm id

        # 2) splits (1->many): keep max-overlap child; others new with parent = root
        for _, s in rels[rels["type"] == "split"].iterrows():
            t1 = int(s["t1_id"])
            children = list(map(int, s["t2_id"]))
            if t1 not in id_map:
                continue
            parent_tid = id_map[t1]
            parent_root = _root_parent(parent_tid, parent_map)

            # choose primary child by max overlap
            m_sub = matches[matches["t1_id"] == t1].set_index("t2_id")
            primary = max(children, key=lambda c: m_sub.loc[c, "overlap"] if c in m_sub.index else -1)

            # primary keeps id
            next_id_map[primary] = parent_tid
            # the rest are brand-new with parent set to root
            for child in children:
                if child == primary:
                    continue
                new_tid = next(next_id)
                next_id_map[child] = new_tid
                parent_map[new_tid] = parent_root

        # 3) merges (many->1): winner by max overlap keeps id; others end
        for _, m in rels[rels["type"] == "merge"].iterrows():
            t2 = int(m["t2_id"])
            parents = list(map(int, m["t1_id"]))
            # choose parent with max overlap
            m_sub = matches[matches["t2_id"] == t2].set_index("t1_id")
            winner = max(parents, key=lambda p: m_sub.loc[p, "overlap"] if p in m_sub.index else -1)
            if winner in id_map:
                next_id_map[t2] = id_map[winner]
                # ensure lineage preserved
                wid = id_map[winner]
                parent_map[wid] = parent_map.get(wid, wid)

        # 4) brand-new storms at t (no inbound match)
        new_ids = set(cur_df["grid_id"].astype(int)) - set(next_id_map.keys())
        for nid in sorted(new_ids):
            new_tid = next(next_id)
            next_id_map[nid] = new_tid
            parent_map[new_tid] = new_tid  #new root (no continuity from t-Δt)

        #Replace current mapping with newly decided mapping
        id_map = next_id_map



        #Attach current frame rows with chosen ids
        cur_df["track_id"] = cur_df["grid_id"].map(id_map)
        cur_df["parent_track_id"] = cur_df["track_id"].map(lambda z: parent_map.get(z, z))
        track_records.append(cur_df)




        prev_ts, prev_df, prev_labels = ts, cur_df, cur_labels

    #Aggregate all frames
    full_tracks = pd.concat(track_records, ignore_index=True).sort_values(["timestamp", "track_id"])

    #Summarize
    summary = summarize_tracks(full_tracks, parent_map)

    #Rebase storm ids to 1..N and keep parent linkage consistent
    rebase = {old: i for i, old in enumerate(sorted(summary["storm_id"].unique()), start=1)}
    summary["storm_id"] = summary["storm_id"].map(rebase)
    summary["parent_id"] = summary["parent_id"].map(lambda x: rebase.get(x, rebase.get(x, x))).astype(int)
    full_tracks["track_id"] = full_tracks["track_id"].map(rebase)
    full_tracks["parent_track_id"] = full_tracks["track_id"].map(lambda x: summary.set_index("storm_id").loc[x, "parent_id"])

    #Per-storm, Per-frame lists
    per_storm_lists = (
        full_tracks.sort_values(["track_id", "timestamp"])
        .groupby("track_id", sort=False)
        .apply(lambda g: pd.Series({
            "obs_id_list":  g["obs_id"].astype(int).tolist(),
            "anchor_x_list": g["anchor_x"].round(2).tolist(),
            "anchor_y_list": g["anchor_y"].round(2).tolist(),
            "area_list":     g["area_px"].round(3).tolist(),
            "n_list_frames": len(g)  # quick check
        }))
        .reset_index()
        .rename(columns={"track_id": "storm_id"})
    )

    per_storm_lists["obs_id_hash"] = per_storm_lists["obs_id_list"].apply(simple_hash)

    summary = summary.merge(per_storm_lists, on="storm_id", how="left")

    summary = summary.rename(columns={"storm_id": "track_id"})

    #Rounding of values
    summary = summary.round({
        "avg_centroid_x": 2, "avg_centroid_y": 2, "avg_dbz": 2, "avg_area": 3
    })

    summary = summary[
        [
            "track_id", "parent_id", "start_time", "end_time", "duration",
            "avg_centroid_x", "avg_centroid_y", "avg_dbz", "avg_area",
            "n_frames", "num_children", "classification",
            "obs_id_list", "anchor_x_list", "anchor_y_list", "area_list",'obs_id_hash'
        ]
    ]
    return summary, full_tracks, parent_map
