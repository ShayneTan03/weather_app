# This is the backend repository for DSA3101: Storm tracking 

**authors:** Adam Loh, Dione Yong, Javier Goh, Shayne Tan

The goal of the backend team is to use the cloud to set up a DB for this project for easy centralised access.
We will also be designing the data architecture to support the frontend team in their processes.



we have set up a DB using AWS, and will be using a lambda function to run our scraping scripts.
the DB was set up through models.py and alembic. and a DB instance was created in AWS RDS to allow the running of scripts through lambda.

we have two scraping scripts, lambda.py and backfill.py. 
both scripts will be scraping the NEA website for storm images. 
raw images will be stored on S3, and metadata and other information will be uploaded to our DB

lambda.py runs every 5 mins to scrape the website. hoever, due to anti scrape, the data obtained is not complete.
thus backfill.py comes in to backfill the missing data.
we use Amazon Eventbridge to automate the triggering of the lambda script, scraping the website every 5 minutes

