# This is the lambda script that we will be running within AWS lamda to scrape and upload images to S3 and DB

# Instructions for backend team:
# only modify code in lambda_handler() function
# when testing locally, event and context will not be available
# you need to generate aws access key and secret token
# any questions ask dione

# app.py
import os
import json
import boto3
import requests
import psycopg2
from datetime import datetime, timezone

#secrets are stored on AWS secrets manager
secrets_client = boto3.client('secretsmanager')
s3 = boto3.client('s3')

# Global connection object to reuse between invocations (connection pooling benefit)
_db_conn = None

def get_secret(secret_arn):
    resp = secrets_client.get_secret_value(SecretId=secret_arn)
    return json.loads(resp['SecretString'])

def get_db_conn(secret_arn):
    global _db_conn
    if _db_conn:
        try:
            _db_conn.cursor().execute("SELECT 1;")
            return _db_conn
        except Exception:
            _db_conn = None
    secret = get_secret(secret_arn)
    host = secret['host']
    dbname = secret['dbname']
    user = secret['username']
    password = secret['password']
    port = secret.get('port', 5432)
    _db_conn = psycopg2.connect(host=host, dbname=dbname, user=user, password=password, port=port)
    _db_conn.autocommit = True
    return _db_conn

def fetch_image(url):
    r = requests.get(url, timeout=15)
    if r.status_code == 200:
        return r.content
    raise RuntimeError(f"Failed to download {url}: {r.status_code}")

def upload_to_s3(bucket, key, data):
    s3.put_object(Bucket=bucket, Key=key, Body=data)

def insert_metadata(conn, ts, range_km, url, s3_key, status='ok'):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO radar_images (timestamp, range_km, url, s3_key, status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (timestamp) DO UPDATE SET s3_key = EXCLUDED.s3_key, status = EXCLUDED.status
        """, (ts, range_km, url, s3_key, status))
        conn.commit()

def lambda_handler(event, context):
    # compute timestamp (rounded to 5-min) or accept in event
    now = datetime.now(timezone.utc)
    minute = (now.minute // 5) * 5
    ts = now.replace(minute=minute, second=0, microsecond=0)
    ts_str = ts.strftime("%Y%m%d%H%M")
    range_km = os.environ.get('RANGE_KM', '70')
    url_template = os.environ.get('IMAGE_TEMPLATE',
        'https://www.nea.gov.sg/docs/default-source/rain-area/dpsri_{range_km}km_{ts}0000dBR.dpsri.png')
    url = url_template.format(range_km=range_km, ts=ts_str)
    try:
        img = fetch_image(url)
        s3_bucket = os.environ['S3_BUCKET']
        s3_key = f"radar/{ts.strftime('%Y/%m/%d/%H%M')}.png"
        upload_to_s3(s3_bucket, s3_key, img)

        secret_arn = os.environ['SECRET_ARN']
        conn = get_db_conn(secret_arn)
        insert_metadata(conn, ts, int(range_km), url, s3_key, 'ok')
        return {"status": "ok", "s3_key": s3_key}
    except Exception as e:
        # Attempt to persist failed state to DB if possible
        try:
            secret_arn = os.environ['SECRET_ARN']
            conn = get_db_conn(secret_arn)
            insert_metadata(conn, ts, int(range_km), url, None, 'missing')
        except Exception:
            pass
        return {"status":"error","error": str(e)}

if __name__ == "__main__":
    event = {}
    context = {}
    print(lambda_handler(event, context))
