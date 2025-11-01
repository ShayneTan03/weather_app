// math.js
/**
 * 
 * @param {Obj} reading 
 * @returns {Obj} 
 */
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

/**
 * 
 * @param {Date} start - The start time of the storm
 * @param {Date} end - The end time of the storm 
 * @returns {{ hours: int, minutes: int, seconds: int }}
 */
export function getDuration({start, end}) {
    const minute = 1000 * 60;
    const hour = minute * 60;
    const durationMs = end - start // in milliseconds
    const hours = Math.floor(durationMs / hour);
    const minutes = Math.floor((durationMs % hour)/minute);
    const seconds = Math.floor((durationMs % minute) /1000)

    return {hours, minutes, seconds};
}
