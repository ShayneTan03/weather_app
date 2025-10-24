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

export function RainfallStormsize ({Data1}) {
    const summary = SummarizeStorms(Data1);

    const globalMaxSize = Math.max(
        3,
        ...summary.flatMap((s) => (Array.isArray(s.size) && s.size.length ? s.size : [1]))
    );
    const sizeRef = (0.5 * globalMaxSize) / (30 ** 2);
    const traces = summary.map((s) => ({
        x: s.times,
        y: s.rainfall,
        mode: "markers+lines",
        name: s.stormId,
        marker: {
            size: s.size, 
            sizemode: "area",
            sizeref: sizeRef,
            sizemin: 4, 
            showscale: false,
        },
        line: {dash: "dot", width: 1},        
    }));

    return (
        <Plot
            data={traces}
            layout={{
                title: {
                text: "Rainfall & Storm Size vs Time",
                font: { size: 16 },
                },
                xaxis: {
                title: {
                    text: "Time (hours)", // ← X-axis label
                    font: { size: 14 },
                },
                tickfont: { size: 12 },
                },
                yaxis: {
                title: {
                    text: "Rainfall (mm)", // ← Y-axis label
                    font: { size: 14 },
                },
                tickfont: { size: 12 },
                },
                hovermode: "x unified",
                margin: { l: 60, r: 40, t: 50, b: 60 }, // add space for axis labels
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