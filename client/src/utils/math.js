// math.js
/*
* analysisTimeframe = Timeframe for data to be aggregated
*/
export const calculateChange = (analysisTimeframe, recent, historical) => {
    return ((recent - historical) / historical) * 100;
};

export function isStormCandidate(reading) {
    const MIN_HUMIDITY = 70;
    const MIN_AREA = 20;

    return reading.humidity > 70;
}