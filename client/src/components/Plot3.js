import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";


function duration_intensity ({Data3}) {
    const x = Data3 ? Data3.map(d => d.duration) : [];
    const y = Data3 ? Data3.map(d => d.avg_dbz) : [];
    const size = Data3 ? Data3.map(d => d.avg_area) : [];
    const parseData = { x, y, size };
    const sizes = parseData.size && parseData.size.length ? parseData.size : [1];
    const maxSize = Math.max(...sizes);
    const desiredMaxPx = 7.5;
    const sizeref = 2 * maxSize / (desiredMaxPx * desiredMaxPx);

    const sampleIndices = sizes.length >= 3
      ? [0, Math.floor(sizes.length / 2), sizes.length - 1]
      : sizes.map((_, i) => i);
    const legendTraces = sampleIndices.map(i => ({
      type: 'scatter',
      mode: 'markers',
      x: [parseData.x[i]],
      y: [parseData.y[i]],
      name: `Area: ${sizes[i]}`,
      marker: {
        size: sizes[i],
        sizemode: 'area',
        sizeref,
        sizemin: 4
      },
      // legend entries only (we keep the plotted sample points; they are few)
      showlegend: true,
      hoverinfo: 'none'
    }));

    return (
        <Plot
            data={[
                {
                    type: 'scatter',
                    mode: 'markers',
                    x: parseData.x,
                    y: parseData.y,
                    marker: {
                        size: parseData.size,
                        sizeref,
                        sizemode: 'area',
                        sizemin: 4,
                        opacity: 0.8
                    },
                    hovertemplate: 'Duration: %{x}<br>Intensity: %{y}<br>Area: %{marker.size}<extra></extra>',
                    showlegend: false
                },
                ...legendTraces
            ]}
            layout={{
                title: 'Storm Duration vs Intensity',
                xaxis: { title: 'Duration' },
                yaxis: { title: 'Intensity (dbZ)' },
                // reduce render size so axis titles remain visible
                width: 700,
                height: 450,
                margin: { l: 60, r: 150, t: 60, b: 60 },
                font: { size: 12 },
                legend: {
                    orientation: 'v',
                    x: 1.02,
                    xanchor: 'left',
                    y: 1
                }
            }}
            config={{ responsive: true }}
        />
    );
}

export default duration_intensity;