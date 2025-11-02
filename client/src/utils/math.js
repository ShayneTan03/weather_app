// math.js
/**
 * 
 * @param {Obj} storm 
 * @returns {Obj} 
 */
export function isStormCandidate(storm) {
    const MIN_HUMIDITY = 70;
    return storm.humidity > MIN_HUMIDITY;
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
export function getDuration(start, end) {
    const minute = 1000 * 60;
    const hour = minute * 60;
    const durationMs = end - start // in milliseconds
    const hours = Math.floor(durationMs / hour);
    const minutes = Math.floor((durationMs % hour)/minute);
    const seconds = Math.floor((durationMs % minute) /1000)

    return {hours, minutes, seconds};
}

// format a Date object to "YYYY-MM-DD HH:MM:SS"
// helper to format Date as 'YYYY-MM-DD HH:mm:ss' in UTC+8
export function formatTimestamp(date) {
  // Create a new Date adjusted to +8
  const utc = date.getTime() + date.getTimezoneOffset() * 60000; // UTC ms
  const tz8 = new Date(utc - (0 * 60 * 60 * 1000));

  const year = tz8.getFullYear();
  const month = String(tz8.getMonth() + 1).padStart(2, "0");
  const day = String(tz8.getDate()).padStart(2, "0");
  const hours = String(tz8.getHours()).padStart(2, "0");
  const minutes = String(tz8.getMinutes()).padStart(2, "0");
  const seconds = String(tz8.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


export function toISODate(d) {
    if (!d) return ''; // handle error case
    const z = new Date(d);
    const y = z.getFullYear();
    const m = String(z.getMonth() + 1).padStart(2, "0");
    const day = String(z.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}