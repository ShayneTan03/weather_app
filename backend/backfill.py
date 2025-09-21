import os
import json
import boto3
import requests
import psycopg2
from datetime import datetime, timezone,timedelta
#secrets are stored on AWS secrets manager
secrets_client = boto3.client('secretsmanager')
s3 = boto3.client('s3')

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

def upload_to_s3(bucket, key, data):
    s3.put_object(Bucket=bucket, Key=key, Body=data) # overwrites by default

def insert_metadata(conn, ts, range_km, url, s3_key, status='ok'):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO radar_images (timestamp, range_km, url, s3_key, status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (timestamp) DO UPDATE SET s3_key = EXCLUDED.s3_key, status = EXCLUDED.status,url = EXCLUDED.url;
        """, (ts, range_km, url, s3_key, status)) 
        conn.commit()


# back fill loop

def backfill(
    start_date
    ,end_date
):
    """
    This backfiller will backfill radar image data for the specified dates. It will loop through every 5 mins of a date.

    For failed URL retrival, it will attempt to insert empty data into sql db 
    For errors in db, it will break loop immediately

    If backfiller runs successfully, will return a list 
    """

    backfill_date_range = dynamic_date(start_date,end_date)
    failed_timings=[]

    hours   = [f"{h:02d}" for h in range(24)]
    minutes = [f"{m:02d}" for m in range(0, 60, 5)]
    range_km = os.environ.get('RANGE_KM', '70')
    # range_km = 70 

    for date in backfill_date_range: 
        for h in hours :
            for m in minutes : 
                ts_str = date.replace('-','') + h + m
                ts = datetime.strptime(ts_str, "%Y%m%d%H%M") # for downstream

                url = 'https://www.nea.gov.sg/docs/default-source/rain-area/dpsri_'+str(range_km)+'km_'+ts_str+'0000dBR.dpsri.png'
                # print(url)

                try:
                    img = fetch_image(url)
                    s3_bucket = os.environ['S3_BUCKET']
                    s3_key = f"radar/{ts.strftime('%Y/%m/%d/%H%M')}.png"
                    upload_to_s3(s3_bucket, s3_key, img)

                    secret_arn = os.environ['SECRET_ARN']
                    conn = get_db_conn(secret_arn)
                    insert_metadata(conn, ts, int(range_km), url, s3_key, 'ok')
                    return {"status": "ok", "s3_key": s3_key}
                
                ## to dione : erorr handling will break all loops if db connection fails, if db connection is ok but URL fails, then it will record the empty data like you designed, but continue to loop 
                ## so if the program return error is because of db connection, juz solve the db connection issue and rerun for the same dates since the sql insert will overwrite, s3 will also skip the previously written keys

                # handle 404 error 
                except requests.exceptions.HTTPError as e: # url fail but db ok
                    error_rpt = (ts,e.response.status_code)
                    failed_timings.append(error_rpt)
                    try:
                        conn = get_db_conn(secret_arn)
                        insert_metadata(conn, ts, range_km, url, None, 'missing')
                    except Exception as e2: # url fail and db not ok 
                        return {"status": "error", "reason": "db connection failed", "error": str(e2)}
                
                except psycopg2.Error as e: # db not ok but url is success
                    return {"status": "error", "reason": "db connection failed", "error": str(e)}

    return{
        "backfill status" : 'done'
        ,"fail_count" : len(failed_timings)
        ,"failed_timings" : failed_timings
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
        "start_date" : "insert here" # format is "2025-09-20" WITH quotes
        ,"end_date" : "insert here" 
        } ## dione insert the backfill dates here
    context = {}
    print(lambda_handler(event, context))
