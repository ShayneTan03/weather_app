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

function sampleEvery(points, intervalMin = 30) {
  if (!points?.length) return [];
  const stepMs = intervalMin * 60 * 1000;
  const out = [];
  let lastMs = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const t = new Date(points[i].timestamp).getTime();
    if (i === 0 || t - lastMs >= stepMs || i === points.length - 1) {
      out.push(points[i]);
      lastMs = t;
    }
  }
  return out;
}

export function SummarizeStorms(storms) {
  return storms.map((storm) => {
    const pts = storm.points ?? [];
    const sampled = sampleEvery(pts, 30);

    return {
      stormId: storm.stormId,
      full: {
        times: pts.map((p) => p.timestamp),
        rainfall: pts.map((p) => p.rainfall),
        size: pts.map((p) => p.size),
      },
      sampled: {
        times: sampled.map((p) => p.timestamp),
        rainfall: sampled.map((p) => p.rainfall),
        size: sampled.map((p) => p.size),
      },
    };
  });
}

export function RainfallStormsize({ Data1 }) {
  const summary = SummarizeStorms(Data1);

  const globalMaxSize = Math.max(
    3,
    ...summary.flatMap((s) =>
      Array.isArray(s.sampled.size) && s.sampled.size.length ? s.sampled.size : [1]
    )
  );
  const sizeRef = (0.5 * globalMaxSize) / (30 ** 2);

  // Get time range for dummy trace
  const allTimes = summary.flatMap(s => s.full.times);
  const minTime = allTimes.length > 0 ? allTimes[0] : new Date().toISOString();
  const maxTime = allTimes.length > 0 ? allTimes[allTimes.length - 1] : new Date().toISOString();

  const traces = [
    // Invisible dummy trace on x-axis to enable rangeslider
    {
      x: [minTime, maxTime],
      y: [0, 0],
      mode: "lines",
      line: { width: 0 },
      showlegend: false,
      hoverinfo: "skip",
      rangeselector: { visible: false },
    },
    ...summary.flatMap((s) => {
      const lineTrace = {
        x: s.full.times,
        y: s.full.rainfall,
        mode: "lines",
        name: `${s.stormId} (line)`,
        line: { dash: "dot", width: 1 },
        hovertemplate:
          "Time: %{x}<br>Rainfall: %{y} mm<extra></extra>",
        showlegend: false,
        xaxis: "x2",
      };

      const markerTrace = {
          x: s.sampled.times,
          y: s.sampled.rainfall,
          mode: "markers",
          name: s.stormId,
          xaxis: "x2",        
          marker: {
              size: s.sampled.size,
              sizemode: "area",
              sizeref: sizeRef,
              sizemin: 4,
              showscale: false,
          },
          hovertemplate:
              "Time: %{x}<br>Rainfall: %{y} mm<br>Storm size: %{marker.size}<extra></extra>",
      };

      return [lineTrace, markerTrace];
    })
  ];

  return (
    <Plot
        data={traces}
        layout={{
            title: { text: "Rainfall & Storm Size vs Time", font: { size: 16 } },

            xaxis: {
                title: { text: "Time" },
                type: "date",
                tickformat: "%b %d",
                dtick: 7 * 24 * 60 * 60 * 1000,
                rangeslider: { 
                    visible: true,
                    bgcolor: "#f5f5f5",
                    bordercolor: "#ddd",
                    borderwidth: 1,
                    thickness: 0.08,
                },
                uirevision: "keep-x-zoom",
            },

            // invisible twin axis for markers and lines
            xaxis2: {
                overlaying: "x",
                matches: "x",
                showgrid: true,
                zeroline: false,
                showline: false,
                ticks: "",
                showticklabels: false,
            },

            yaxis: { title: { text: "Rainfall (mm)" }, fixedrange: true },
            hovermode: "x unified",
            dragmode: "zoom",
            margin: { l: 60, r: 40, t: 50, b: 60 },
        }}
        config={{
            responsive: true,
            scrollZoom: true,
            displaylogo: false,
            modeBarButtonsToRemove: ["autoScale2d", "zoom2d", "pan2d"],
            modeBarButtonsToAdd: ["resetScale2d", "select2d", "lasso2d"],
        }}
        style={{ width: "100%", height: "450px" }}
    />
    );
}

function Plot1({ Data1 }) {
  return <RainfallStormsize Data1={Data1} />;
}
export default Plot1;