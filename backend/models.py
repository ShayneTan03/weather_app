###
# models.py
# SQLAlchemy ORM models for weather radar and storm tracking application.
###


from sqlalchemy import Column, Integer, String, Float, Text, TIMESTAMP, ForeignKey, CheckConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class RadarImage(Base):
    __tablename__ = "radar_image"

    image_id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(TIMESTAMP, nullable=False, unique=True)
    range_km = Column(Integer, nullable=False)
    url = Column(Text, nullable=False)
    s3_key = Column(Text, unique=True)
    status = Column(String, default='ok')

    __table_args__ = (
        CheckConstraint("range_km IN (70, 240)", name="valid_range_km"),
    )

    observations = relationship("StormObservation", back_populates="radar_image")


class Storm(Base):
    __tablename__ = "storm"

    storm_id = Column(Integer, primary_key=True, index=True)
    start_time = Column(TIMESTAMP, nullable=False)
    end_time = Column(TIMESTAMP)
    intensity = Column(Float)
    notes = Column(Text)

    observations = relationship("StormObservation", back_populates="storm")


class StormObservation(Base):
    __tablename__ = "storm_observation"

    obs_id = Column(Integer, primary_key=True, index=True)
    storm_id = Column(Integer, ForeignKey("storm.storm_id", ondelete="CASCADE"), nullable=False)
    image_id = Column(Integer, ForeignKey("radar_image.image_id", ondelete="CASCADE"), nullable=False)
    centroid_lat = Column(Float)
    centroid_lon = Column(Float)
    area_km2 = Column(Float)
    max_intensity = Column(Float)

    storm = relationship("Storm", back_populates="observations")
    radar_image = relationship("RadarImage", back_populates="observations")


class WeatherStation(Base):
    __tablename__ = "weather_station"

    station_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    observations = relationship("WeatherObservation", back_populates="station")


class WeatherObservation(Base):
    __tablename__ = "weather_observation"

    obs_id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("weather_station.station_id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False)
    wind_speed = Column(Float)
    wind_direction = Column(Float)
    rainfall_mm = Column(Float)

    station = relationship("WeatherStation", back_populates="observations")
