import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";


// function storm_frequency ({Data2}) {
//     return (
//         <Plot
//             data={[
//                 {
//                     x: time,
//                     y: rainfall,
//                     mode: "markers",
//                     type: "scatter",
//                     marker: {
//                         size: stromsize,
//                         color: 'blue',
//                         opacity: 0.8,
//                     },
//                     name: "Storm incidents and sizes",
//                 },
//             ]}
//             layout={{
//                 title: "Rainfall & Storm Size vs Time",
//                 xaxis: { title: "Time" },
//                 yaxis: { title: "Rainfall (mm)" },
//                 hovermode: "closest",
//             }}
//             config = {{responsive: true }}
//             style = {{width: "100%", height: "450px"}}
//         />
//     )
// }



// function Plot1(
//     {Data1}
// ) {
//     return (
//         <plot1
//             rainfall_stormsize={Data1}
//         />
//     )
// }

// export default Plot1;