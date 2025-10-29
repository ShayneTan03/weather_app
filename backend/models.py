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
    #timestamp = Column(TIMESTAMP, nullable=False, unique=True)
    timestamp = Column(TIMESTAMP, ForeignKey("storm_observation.timestamp"), nullable=False)
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
    parent_id = Column(Integer)
    start_time = Column(TIMESTAMP, nullable=False)
    end_time = Column(TIMESTAMP)
    duration = Column(Float)
    avg_centroid_x = Column(Float)
    avg_centroid_y = Column(Float)
    avg_dbz = Column(Float)
    avg_area = Column(Float)
    n_frames = Column(Integer)
    num_children = Column(Integer)
    classification = Column(String)
    grid_id_list = Column(Text)
    anchor_x_list = Column(Text)
    anchor_y_list = Column(Text)
    area_list = Column(Text)



class StormObservation(Base):
    __tablename__ = "storm_observation"

    # obs_id = Column(Integer, primary_key=True, index=True)
    # storm_id = Column(Integer, ForeignKey("storm.storm_id", ondelete="CASCADE"), nullable=False)
    # image_id = Column(Integer, ForeignKey("radar_image.image_id", ondelete="CASCADE"), nullable=False)
    # centroid_lat = Column(Float)
    # centroid_lon = Column(Float)
    # area_km2 = Column(Float)
    # max_intensity = Column(Float)
    obs_id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(TIMESTAMP, nullable=False)
    grid_id = Column(TIMESTAMP, ForeignKey("storm_grid.timestamp"))
    centroid_x = Column(Float)
    centroid_y = Column(Float)
    anchor_x = Column(Float)
    anchor_y = Column(Float)
    peak_dBZ = Column(Float)
    area_px = Column(Float)

radar_image = relationship("RadarImage", back_populates="storm_observation")
storm_grid = relationship("StormGrid", back_populates="storm_observations")

class StormGrid(Base):
    __tablename__ = "storm_grid"

    timestamp = Column(TIMESTAMP, primary_key=True)
    grid_data = Column(Text, nullable=False)

    storm_observations = relationship("StormObservation", back_populates="storm_grid")


class WeatherStation(Base):
    __tablename__ = "weather_station"

    station_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    coord_basemap = Column(Text)
    coord = Column(Text)

    observations = relationship("WeatherObservation", back_populates="station")

#added new columns temperature_c and humidity_pct
class WeatherObservation(Base):
    __tablename__ = "weather_observation"

    obs_id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String, ForeignKey("weather_station.station_id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False)
    temperature_c = Column(Float)
    rainfall_mm = Column(Float)
    wind_speed_knots = Column(Float)
    wind_direction_degrees = Column(Float)
    humidity_pct = Column(Float)

    station = relationship("WeatherStation", back_populates="observations")
