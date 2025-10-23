import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";



export function LocalExtrema(points, key = "rainfall") {
    const extrema = [];
    for (let i=1; i<points.length-1; i++) {
        const prev = points[i-1][key];
        const curr = points[i][key];
        const next = points[i+1][key];
        if ((curr>prev && curr>next) || (curr<prev && curr<next)) {
            extrema.push(points[i]);
        }
    }
    return extrema;
}

export function SummarizeStorms(storms) {
    return storms.map((storm) => {
        const pts = storm.points;
        if (pts.length < 2) return storm;
        const filtered = [pts[0], ...LocalExtrema(pts), pts[pts.length - 1]];
        return {
            stormId: storm.stormId,
            times: filtered.map((p) => p.timestamp),
            rainfall: filtered.map((p) => p.rainfall),
            size: filtered.map((p) => p.size),
        };
    });
}

// changed the name to RainfallStormsize from rainfall_stormsize
export function RainfallStormsize ({Data1}) {
    const summary = SummarizeStorms(Data1);

    const traces = summary.map((s) => ({
        x: s.times,
        y: s.rainfall,
        mode: "markers+lines",
        name: s.stormId,
        marker: {
            size: s.size,
            opacity: 0.8,
            line: {width: 1, color: 'DarkSlateGrey'}
        },
        line: {dash: "dot", width: 1},        
    }));

    return (
        <Plot
            data={traces}
            layout={{
                title: "Rainfall & Storm Size vs Time",
                xaxis: { title: "Time" },
                yaxis: { title: "Rainfall (mm)" },
                hovermode: "x unified",   
            }}
            config = {{responsive: true }}
            style = {{width: "100%", height: "450px"}}
        />
    );
}



function Plot1(
    {Data1}
) {
    
    return (
        // <plot1
        //     rainfall_stormsize={Data1}
        // />
        <RainfallStormsize Data1 = {Data1} />
    )
}
export default Plot1;