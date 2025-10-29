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
        scale: 15,
        label: "Rainfall",
        unit: "%",
    },
    {
        key: "windSpeed",
        display: displays.windSpeed,
        color: "green",
        scale: 15,
        label: "Wind Speed",
        unit: "%",
    },
    {
        key: "windDirection",
        display: displays.windDirection,
        color: "orange",
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
];
