# This script is designed to backfill radar images from a specified start date to an end date (inclusive) into an S3 bucket and the associated metadata into an RDS instance.
# Before running this script, ensure that the RDS instance is set up with the radar_image table.
# The SQL for creating the table can be found in the readme.md file.
# You must set the following environment variables before running this script:
# export S3_BUCKET=your_s3_bucket_name
# export SECRET_ARN=your_secret_arn
# export RANGE_KM=70 (or 150, depending on which range you want to backfill)
# You will also need to have the following python packages installed:
# pip install boto3 requests pg8000 tenacity
# you can run this script locally or on AWS lambda (see below for lambda_handler function)
# if running locally, make sure you have your AWS credentials set up in ~/.aws/credentials
# you can run this script with python backfill.py
# or you can run this script on AWS lambda by creating a lambda function and uploading this script

#recommended to run this script on AWS lambda with sufficient timeout and memory (at least 30min timeout/ month, 512MB memory), 
# or run it locally if you have a stable internet connection, do not run this on NUS WIFI as you will not be able to connect to the DB

import os
import json
import boto3
import requests
import pg8000
from datetime import datetime, timezone,timedelta
import concurrent.futures
from tenacity import retry, stop_after_attempt, wait_fixed

#replace with your own credentials if running locally
s3_client: boto3.client = boto3.client(
            "s3",
            aws_access_key_id="AKIAWNNLNZEXUYBQAENT",
            aws_secret_access_key="1aa/xfRy3CzYPvh5mvTHExTvPr3rLSulPFYXJI3C",
            # aws_session_token="",
        )

#secrets are stored on AWS secrets manager
secrets_client = boto3.client('secretsmanager', region_name='ap-southeast-2')
s3 = boto3.client('s3', region_name='ap-southeast-2')

# Global connection object to reuse between invocations (connection pooling benefit)
_db_conn = None


def dynamic_date( 
        start_date:str = ''
        ,end_date:str = ''
):
    """
    this function will take in 2 dates as strings in the format YYYY-MM-DD, and return a list of dates starting and ending on the dates inclusive. return type is a list of strings
    """


    # handling input 
    to_date = datetime.strptime(end_date,"%Y-%m-%d")
    from_date = datetime.strptime(start_date,"%Y-%m-%d")

    date_diff = (to_date - from_date).days
    date_list = [(to_date - timedelta(days=x)).strftime('%Y-%m-%d') for x in range(date_diff + 1)]
    return date_list

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

#instead of using a global connection, create a new connection for each thread to avoid "connection already closed" error
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

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def fetch_image(url):
    # using different combination of header seems to help with the anti scrape problem
    headers_sample = [
    
    {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
    }
,
    {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
    }
,
    {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
    }
,
    {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    }
,
    {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    }
,
    {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
    }
]

    for header in headers_sample :
        r = requests.get(url, timeout=15,headers=header) # try each header 
        r.raise_for_status() # new line for downstream functionality 
        return r.content
    raise Exception("all headers failed")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def upload_to_s3(bucket, key, data):
    s3.put_object(Bucket=bucket, Key=key, Body=data) # overwrites by default

def insert_metadata(conn, ts, range_km, url, s3_key, status='ok'):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO radar_image (timestamp, range_km, url, s3_key, status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (timestamp) DO UPDATE SET s3_key = EXCLUDED.s3_key, status = EXCLUDED.status,url = EXCLUDED.url;
        """, (ts, range_km, url, s3_key, status)) 
        conn.commit()


def process_timestamp(ts, url, range_km, s3_bucket, secret_arn):
    print(url)
    try:
        img = fetch_image(url)
        s3_key = f"radar/{ts.strftime('%Y/%m/%d/%H%M')}.png"
        upload_to_s3(s3_bucket, s3_key, img)
        #print("success upload to s3")
        conn = get_db_conn(secret_arn)
        insert_metadata(conn, ts, int(range_km), url, s3_key, 'ok')
        conn.close()
        #print("success upload")
        return ('success', ts)
    except requests.exceptions.HTTPError as e:
        try:
            conn = get_db_conn(secret_arn)
            insert_metadata(conn, ts, range_km, url, None, 'missing')
        except Exception as e2:
            print(f"Database error for {ts}: {e2}")
            return ('db_error', ts, str(e2))
        return ('fail', ts, e.response.status_code)
    except pg8000.dbapi.DatabaseError as e:
        print(f"Database error for {ts}: {e}")
        return ('db_error', ts, str(e))
    except Exception as e:
        print(f"Failed to process {url}: {e}")
        return ('fail', ts, str(e))

def backfill(start_date, end_date):
    backfill_date_range = dynamic_date(start_date, end_date)
    failed_timings = []
    successful = 0

    hours = [f"{h:02d}" for h in range(24)]
    minutes = [f"{m:02d}" for m in range(0, 60, 5)]
    range_km = os.environ.get('RANGE_KM', '70')
    s3_bucket = os.environ.get('S3_BUCKET', 'dsa3101-storm-tracking-tw08')
    secret_arn = os.environ.get('SECRET_ARN', 'arn:aws:secretsmanager:ap-southeast-2:441130535215:secret:prod/storm-tracking/postgresql-XrpBps')

    tasks = []
    for date in backfill_date_range:
        for h in hours:
            for m in minutes:
                ts_str = date.replace('-', '') + h + m
                ts = datetime.strptime(ts_str, "%Y%m%d%H%M")
                url = f'https://www.nea.gov.sg/docs/default-source/rain-area/dpsri_{range_km}km_{ts_str}0000dBR.dpsri.png'
                tasks.append((ts, url, range_km, s3_bucket, secret_arn))

    # dione: calls process_timestamp to download and upload to DB in parallel. (much faster execution)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(process_timestamp, *task) for task in tasks]
        #print(futures)
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result[0] == 'success':
                successful += 1
                print(f"Processed successfully: {result[1]}")
            else:
                failed_timings.append(result)

    return {
        "backfill status": 'done',
        "success_count": successful,
        "fail_count": len(failed_timings),
        "failed_timings": failed_timings
    }

def lambda_handler(event, context):
    try:
        start_date = event.get("start_date")
        end_date = event.get("end_date")
        if not start_date or not end_date:
            return {"status": "error", "reason": "missing dates"}

        result = backfill(start_date, end_date) # call backfiller
        return {"status": "ok", "result": result} # this will return the final output return of backfill()
    except Exception as e:
        return {"status": "error", "reason": str(e)}

if __name__ == "__main__":
    event = {
        "start_date" : "2025-06-23" # format is "2025-09-20" WITH quotes
        ,"end_date" : "2025-07-02" 
        } ## if running locally, insert backfill date range here. 
    context = {}
    print(lambda_handler(event, context))


# If running this on aws lambda, use the following JSON format in the test event to set the date range:
# {
#   "start_date": "2025-06-23",
#   "end_date": "2025-09-23"
# }
# this will override the default date range in the main function
