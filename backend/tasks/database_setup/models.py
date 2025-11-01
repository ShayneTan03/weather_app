from sqlalchemy import (
    Column, Integer, BigInteger, String, Float, Text, TIMESTAMP,
    ForeignKey, CheckConstraint, UniqueConstraint, Sequence, ARRAY, LargeBinary, Point
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()
class AlembicVersion(Base):
    __tablename__ = "alembic_version"

    version_num = Column(String(32), primary_key=True)

class RadarImage(Base):
    __tablename__ = "radar_image"

    image_id = Column(Integer, primary_key=True)
    timestamp = Column(TIMESTAMP, nullable=False, unique=True)
    range_km = Column(Integer, CheckConstraint("range_km = ANY (ARRAY[70, 240])"), nullable=False)
    url = Column(Text, nullable=False)
    s3_key = Column(Text, unique=True)
    status = Column(String)

    # Relationships
    storm_observations = relationship("ArchiveStormObservation", back_populates="radar_image", cascade="all, delete")


class StormGrid(Base):
    __tablename__ = "storm_grid"

    timestamp = Column(TIMESTAMP, primary_key=True)
    grid_data = Column(LargeBinary)


## archiving old storm table for easier migration
class ArchiveStorm(Base):
    __tablename__ = "archive_storm"

    storm_id = Column(Integer, primary_key=True)
    start_time = Column(TIMESTAMP, nullable=False)
    end_time = Column(TIMESTAMP)
    intensity = Column(Float)
    notes = Column(Text)

    # Relationships
    observations = relationship("ArchiveStormObservation", back_populates="storm", cascade="all, delete")


## archiving old storm observation table for easier migration
class ArchiveStormObservation(Base):
    __tablename__ = "archive_storm_observation"

    obs_id = Column(Integer, primary_key=True)
    storm_id = Column(Integer, ForeignKey("archive_storm.storm_id", ondelete="CASCADE"), nullable=False)
    image_id = Column(Integer, ForeignKey("radar_image.image_id", ondelete="CASCADE"), nullable=False)
    centroid_lat = Column(Float)
    centroid_lon = Column(Float)
    area_km2 = Column(Float)
    max_intensity = Column(Float)

    # Relationships
    storm = relationship("ArchiveStorm", back_populates="observations")
    radar_image = relationship("RadarImage", back_populates="storm_observations")


class StormObservation(Base):
    __tablename__ = "storm_observation"

    obs_id = Column(Integer, primary_key=True)
    timestamp = Column(TIMESTAMP)
    grid_id = Column(Integer)
    centroid_x = Column(Float)
    centroid_y = Column(Float)
    anchor_x = Column(Float)
    anchor_y = Column(Float)
    peak_dbz = Column(Float)
    area_px = Column(Float)


class Storm(Base):
    __tablename__ = "storm"

    storm_id = Column(BigInteger, primary_key=True)
    track_id = Column(Integer)
    parent_id = Column(Integer)
    start_time = Column(TIMESTAMP)
    end_time = Column(TIMESTAMP)
    duration = Column(Float)
    avg_centroid_x = Column(Float)
    avg_centroid_y = Column(Float)
    avg_dbz = Column(Float)
    avg_area = Column(Float)
    n_frames = Column(Integer)
    num_children = Column(Integer)
    classification = Column(Text)
    obs_id_list = Column(ARRAY(Integer))
    anchor_x_list = Column(ARRAY(Float))
    anchor_y_list = Column(ARRAY(Float))
    area_list = Column(ARRAY(Float))
    obs_id_hash = Column(Text, nullable=False, unique=True)

    __table_args__ = (
        UniqueConstraint("obs_id_hash", name="unique_obs_id_hash"),
    )


class WeatherStation(Base):
    __tablename__ = "weather_station"

    station_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    coord_basemap = Column(Point)
    coord = Column(Point)

    # Relationships
    observations = relationship("WeatherObservation", back_populates="station", cascade="all, delete")


class WeatherObservation(Base):
    __tablename__ = "weather_observation"

    obs_id = Column(Integer, primary_key=True)
    station_id = Column(String, ForeignKey("weather_station.station_id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False)
    wind_speed = Column(Float)
    wind_direction = Column(Float)
    rainfall_mm = Column(Float)
    temperature_c = Column(Float)
    humidity_pct = Column(Float)

    __table_args__ = (
        UniqueConstraint("station_id", "timestamp", name="uq_station_timestamp"),
    )

    # Relationships
    station = relationship("WeatherStation", back_populates="observations")
