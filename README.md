# DSA3101_storm_4

This is the complete code repository for DSA3101: the storms database project

# Storm Tracking System 🌪️

A comprehensive data-driven solution for detecting, tracking, and analyzing storms using radar and weather data in Singapore. This system combines real-time data ingestion, automated storm detection algorithms, and interactive visualization to provide meteorological insights into storm behavior and evolution.

## 🌀 Overview

This project implements a full-stack storm tracking platform that:
- **Detects** storms from NEA radar imagery using reflectivity-based algorithms
- **Tracks** storm evolution across consecutive radar scans
- **Analyzes** storm properties including size, intensity, trajectory, and lifecycle
- **Visualizes** historical storm data through an interactive dashboard

The system processes radar reflectivity data (dBZ) combined with weather station observations (rainfall, wind speed, humidity, temperature) to identify and validate storm events across Singapore.

## 🏗️ Architecture

**Frontend:** React.js with interactive maps and analytics components  
**Backend:** Python (Flask API) with PostgreSQL database  
**Infrastructure:** AWS (Lambda, EventBridge, S3, Aurora RDS)  
**Containerization:** Docker

### Key Components
- **Radar Image Processor**: Converts NEA radar images to reflectivity grids
- **Storm Detection Algorithm**: Identifies storm regions using threshold-based criteria (≥40 dBZ, ≥80 pixels)
- **Storm Tracker**: Matches storms across frames using centroid distance and overlap ratio
- **Weather Validation**: Confirms detected storms against ground station observations
- **Automated Pipeline**: Scheduled data ingestion and processing via AWS Lambda

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available

### Running the Application

1. **Clone the repository**
```bash
git clone https://github.com/unfulw/DSA3101-2510-storm-04.git
cd DSA3101-2510-storm-04
```

2. **Start all services**
```bash
docker compose up
```

This command will:
- Build and start the backend Flask API server
- Build and start the frontend React application
- Set up networking between services
- Initialize the local cache database

3. **Access the application**
- Frontend Dashboard: `http://localhost:3000`
- Backend API: `http://localhost:5001`

4. **Dashboard features**
- The dashboard will only render data once user selects the date range
- The user can either select the date range from the calendar drop-down or quick access on the top right corner
- "Radar Scan" tab displays weather information and the trackable map
- "Feature Analysis" tab displays 3 interactive plots:
    - "Rainfall & Storm Size vs Time" is an interactive plot where the user can adjust the time frame as needed
    - The other two plots will also provide additional storm information by hovering the mouse over each data point

4. **Stop the services**
```bash
docker compose down
```

### Development Mode

For development with hot-reloading:
```bash
docker compose up --build
```

## 📂 Repository Structure

```
├── backend/                # Core backend modules
├── dockerisation/          # Multi-container orchestration
├── client/                 # React application
└── README.md               # This file
```

## 🔑 Key Features

- **Real-time Data Ingestion**: Automated collection of radar images and weather data every 5 minutes
- **Storm Detection**: Threshold-based algorithm (40 dBZ, 80 pixels minimum area)
- **Storm Tracking**: Frame-by-frame matching with split/merge handling
- **Weather Validation**: Cross-reference with rainfall, wind, humidity, and temperature data
- **Interactive Dashboard**: Visualize storm patterns, trajectories, and statistical analyses
- **Cloud-Native**: Serverless automation with AWS Lambda and EventBridge

## 📊 Data Sources

- **Radar Imagery**: NEA Rain Areas and DPSRI (5-minute intervals)
- **Weather Stations**: NEA real-time observations (61 stations)
- **Coverage**: Historical data from June 2024 onwards

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, React-Bootstrap, Leaflet |
| Backend | Python, Flask, SQLAlchemy |
| Database | PostgreSQL (AWS Aurora RDS), Local SQLite cache |
| Storage | Amazon S3 |
| Automation | AWS Lambda, EventBridge Scheduler |
| Containerization | Docker, Docker Compose |

## 📖 Documentation

Detailed documentation for algorithms and architecture can be found in the project wiki, including:
- Storm Detection Algorithm Parameters
- Storm Tracking Methodology
- Database Schema and ER Diagrams
- API Endpoints Reference
- Threshold Calibration Rationale

## 👥 Team

**Front-end:** Chong Wai Shan · Kiguchi Yohei · Kim Minjun · Tan Yan Hao  
**Back-end:** Adam Loh Shunhao · Javier Goh Yi Heng · Tan Shayne · Yong Kai Xin Dione

## ⚖️ Ethical Considerations

This project respects data source terms of service while implementing anti-scraping workarounds for research purposes. All storm detection thresholds are literature-based or empirically calibrated for meteorological validity.

## 📝 License

This project is developed for academic purposes as part of DSA3101-2510.

---

For questions or issues, please refer to the [project wiki](https://dsa3101.nus-dsds.org/doku.php?id=projectnamespace20:home) or contact the development team.
