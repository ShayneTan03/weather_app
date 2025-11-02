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
    const durationMs = end - start; // in milliseconds
    const hours = Math.floor(durationMs / hour);
    const minutes = Math.floor((durationMs % hour) / minute);
    const seconds = Math.floor((durationMs % minute) / 1000);

    return { hours, minutes, seconds };
}

// format a Date object to "YYYY-MM-DD HH:MM:SS"
export function formatTimestamp(date) {
    const utc = date.getTime() // UTC ms
    const tz8 = new Date(utc - 0 * 60 * 60 * 1000);

    const year = tz8.getFullYear();
    const month = String(tz8.getMonth() + 1).padStart(2, "0");
    const day = String(tz8.getDate()).padStart(2, "0");
    const hours = String(tz8.getHours()).padStart(2, "0");
    const minutes = String(tz8.getMinutes()).padStart(2, "0");
    const seconds = String(tz8.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function toISODate(d) {
    if (!d) return ""; // handle error case
    const z = new Date(d);
    const y = z.getFullYear();
    const m = String(z.getMonth() + 1).padStart(2, "0");
    const day = String(z.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export const generateTimeline = (rawStart, rawEnd) => {
    const times = [];
    const startMs = new Date(rawStart).getTime();
    const endMs = new Date(rawEnd).getTime();

    const msPerHour = 1000 * 60 * 60;
    const start = new Date(Math.ceil(startMs / msPerHour) * msPerHour);
    const end = new Date(Math.floor(endMs / msPerHour) * msPerHour);

    let current = new Date(start);

    while (current <= end) {
        times.push(current.toISOString());
        current.setHours(current.getHours() + 1); //increment by 1 hour
    }
    return times;
};

export function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function rgbToHex(r, g, b) {
    return (
        "#" +
        [r, g, b]
            .map((x) => {
                const hex = x.toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
}

export function interpolateColor(hex1, hex2, t) {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return rgbToHex(r, g, b);
}

export function getColorForValue(value, min, max, colorRange) {
    // handle degenerate range
    if (min === undefined || max === undefined || min === max) {
        return colorRange[1] || colorRange[0];
    }
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return interpolateColor(colorRange[0], colorRange[1], t);
}


// helper to color code dBZ intensity
export function getDbzColor(dbz) {
    if (dbz >= 50) return "red";
    if (dbz >= 20) return "orange";
    return "blue";
}