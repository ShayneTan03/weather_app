// run if node -v <= 16 else ignore since fetch is built-in (only if you want to test in node)
// const fetch = (...args) =>
//   import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_URL = "https://api-open.data.gov.sg/v2/real-time/api";

async function fetchHumidity(queryDateTime) {
    const url = `${BASE_URL}/relative-humidity?date=${queryDateTime}`;
    // console.log(url);

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`${res.status}`);
    }

    const output = await res.json();
    const stationInfo = output.data.stations;
    const readings = output.data.readings[0].data;

    // console.log(stationInfo.length);
    // console.log(readings.length);
    const readingMap = {};
    readings.forEach((r) => {readingMap[r.stationId] = r.value;});

    const stationsArr = [];
    for (let i=0;i<stationInfo.length;i++) {
        const s = stationInfo[i];
        stationsArr.push({
            id: s.deviceId,
            name: s.name,
            latitude: s.location.latitude,
            longitude: s.location.longitude
        })
    };
    return [stationsArr, readingMap];
}
// fetchHumidity("2025-10-15")
//   .then((data) => console.log(data))
export default fetchHumidity;