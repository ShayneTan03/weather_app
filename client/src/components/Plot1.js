import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";             
import { DateRange } from "react-date-range";
import { enUS } from "date-fns/locale";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";


function sampleEvery(points, intervalMin = 30) {
  /**
   * parses through the given points to filter points at a 30-minute interval 
   * which are to be displayed in the plot
   */
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
  /**
   * Summarizes the storm data into full and sampled time series for rainfall and size.
   * Sampling is done at 30-minute intervals to reduce the number of points plotted.
   */
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
  /**
   * Plots rainfall and storm size over time using Plotly.
   */
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
                tickformat: "%b %d, %H:%M",  // Show both date and time
                // Remove fixed dtick to allow Plotly to auto-adjust based on zoom level
                rangeslider: { 
                    visible: true,
                    bgcolor: "#f5f5f5",
                    bordercolor: "#ddd",
                    borderwidth: 1,
                    thickness: 0.08,
                },
                uirevision: "keep-x-zoom",
                // Auto-adjust tick spacing based on range
                autorange: true,
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
  return (
    <div style={{ position: "relative" }}>
      {/* <RainfallStormsize Data1={filteredData1} /> */}
        <RainfallStormsize Data1={Data1} />
      </div>
  );
}

export default Plot1;