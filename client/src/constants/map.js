export const singaporeCoords = [1.3521, 103.8198];

export const getMapPointers = (displays) => [
    // accept the obj entirely without destructuring otherwise you can't fetch the attributes
    {
        key: "humidity",
        display: displays.humidity,
        color: "red",
        scale: 15,
        label: "Humidity",
        unit: "%",
    },
    {
        key: "rainfall",
        display: displays.rainfall,
        color: "blue",
        scale: 1000,
        label: "Rainfall",
        unit: "%",
    },
    {
        key: "wind_speed",
        display: displays.windSpeed,
        color: "green",
        scale: 1000,
        label: "Wind Speed",
        unit: "%",
    },
    {
        key: "wind_direction",
        display: displays.windDirection,
        scale: 15,
        label: "Wind Direction",
        unit: "°",
    },
    {
        key: "stormIntensity",
        display: displays.stormIntensity,
        color: "purple",
        scale: 15,
        label: "Storm Intensity",
        unit: "dBZ",
    },
    {
        key: "temperature",
        display: displays.temperature,
        color: "purple",
        scale: 15,
        label: "Temperature",
        unit: "celcius",
    },
];
