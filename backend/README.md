# This is the backend repository for DSA3101: Storm tracking 

**Authors:** Adam Loh, Dione Yong, Javier Goh, Shayne Tan

The goal of the backend team is to use the cloud to set up a DB for this project for easy centralised access.
We will also be designing the data architecture to support the frontend team in their processes.

We have set up a DB using AWS, and will be using a lambda function to run our scraping scripts.
The DB was set up through models.py and alembic. and a DB instance was created in AWS RDS to allow the running of scripts through lambda.

## Overview

The backend is organized to separate **feature development**, **core source code**, and **task automation**.  
This helps ensure modular, maintainable, and reproducible development across different parts of the storm-tracking pipeline.


## Typical Workflow

1. **Feature Development**  
   Work on new modules, algorithms, or prototypes under the `feature_development/` directory.  
   These can include testing of new radar processors, storm detectors, or data ingestion logic.

2. **Source Code Consolidation**  
   Once features are stable and validated, migrate the relevant modules into the `src/` directory.  
   The `src/` folder acts as the *single source of truth* for reusable backend logic that all pipelines depend on.

3. **Task-Specific Automation**  
   The `tasks/` directory contains code for automation or production jobs (e.g., database backfills, ingestion daemons, or scheduled processes).  
   These task scripts use the code logic from respective files in `src/` and extend them with task-specific logic.

---

## Folder Structure

```bash
backend/
│
├── README.md                     # This file
│
├── src/                          # Core, reusable source code
│
├── feature_development/           # Sandbox for feature prototyping and testing
│   ├── radar_image_processor/
│   ├── raw_data_ingestion/
│   ├── station_info_ingestion/
│   ├── storm_object_detector/
│   └── storm_tracker/
│
├── tasks/                         # Task-based scripts
│   ├── backfill_database/
│   ├── database_setup/
│   └── script_automation/         # Scheduled or orchestrated scripts (cronjobs, airflow, etc.)

