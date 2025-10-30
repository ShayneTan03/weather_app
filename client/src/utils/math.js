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

export function getAverage(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (typeof val === "number" && !isNaN(val)) {
            sum += val;
            count++;
        }
    }

    return count > 0 ? sum / count : 0;
}
