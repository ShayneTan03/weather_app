# This is the backend repository for DSA3101: Storm tracking 

**Authors:** Adam Loh, Dione Yong, Javier Goh, Shayne Tan

The goal of the backend team is to use the cloud to set up a DB for this project for easy centralised access.
We will also be designing the data architecture to support the frontend team in their processes.

We have set up a DB using AWS, and will be using a lambda function to run our scraping scripts.
The DB was set up through models.py and alembic. and a DB instance was created in AWS RDS to allow the running of scripts through lambda.

We have three scraping scripts, real_time_weather_ingestion.py, lambda_v2.py and backfill.py. 
These scripts will be scraping the NEA website for storm images. 
Byte data of the images will be stored on S3, and metadata and other information will be uploaded to our DB.

The data obtained by a single scrape by real_time_weather_ingestion.py is not complete due to anti-scraping.
Thus lambda_v2.py comes in to backfill the missing data.
backfill.py helps us access historica data before the date we started scraping.
We use Amazon Eventbridge to automate the triggering of the lambda script, scraping the website every 5 minutes

## How to use the scripts:
1. Setting up the DB
   run models.py through alembic to migrate the structure of the DB
   on AWS, set up the following:
   - use Aurora and RDS to set up a DB instance.
   - set up a bucket in S3 to store the image bytedata.

4. Run backfill.py
   - If running with Lambda, you will need to create a lambda function, and run it with a test instance. the script automatically connects and pushes to S3 anad DB, so no additional configuration is required.
   - If running locally, ensure your device has enough resources and run on local machine.
   - Follow the instructions in backfill.py to fill in date range.

3. Create lambda functions to run the two files:
   - lambda_v2.py
   - real_time_weather_ingestion.py

5. Set up Amazon EventBridge Scheduler to trigger the two lambda functions as needed:
   - lambda_v2.py: once daily
   - real_time_weather_ingestion.py: every 5mins, 10min lag time

