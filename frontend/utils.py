import random
import datetime
import pandas as pd

def gen_rnd_weather(num_rows=10):
    rows = []

    for i in range(num_rows):
        station_id = random.randint(1, 20)
        timestamp = datetime.datetime.now() - datetime.timedelta(
            minutes=i
        )
        date = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        wind_dir_deg = random.randint(0, 359)
        wind_speed_knots = round(random.uniform(0, 50), 1)
        rainfall_mm = round(random.uniform(0, 100), 1)
        temperature = round(random.uniform(24, 34), 1)
        humidity_pct = random.randint(60, 100)

        row = [
            station_id, date, wind_dir_deg, wind_speed_knots, rainfall_mm, temperature, humidity_pct
        ]

        rows.append(row)

    df = pd.DataFrame(rows, columns = ['station_id', 'date', 'wind_direction', 'wind_speed', 'rainfall_mm', 'temperature', 'humidity_pct'])
    df.set_index('station_id', inplace=True)
    
    return df