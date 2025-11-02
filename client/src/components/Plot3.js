import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";


function duration_intensity ({Data3}) {
    /**
     * Third plot: Scatter plot of storm duration against average intensity
     * Marker size represents average storm area, scaled for better visibility
     */
    const x = Data3 ? Data3.map(d => d.duration) : [];
    const y = Data3 ? Data3.map(d => d.avg_dbz) : [];
    const rawSizes = Data3 ? Data3.map(d => Number(d.avg_area) || 1) : [1];

    // scale raw area values to pixel diameters so markers render consistently
    const minRaw = Math.min(...rawSizes);
    const maxRaw = Math.max(...rawSizes);
    const minPx = 10;   
    const maxPx = 50;  
    const scaledSizes = rawSizes.map(s => {
      if (maxRaw === minRaw) return Math.round(Math.max(minPx, Math.min(maxPx, s)));
      const norm = (s - minRaw) / (maxRaw - minRaw);
      return Math.round(minPx + norm * (maxPx - minPx));
    });

    const sizes = scaledSizes.length ? scaledSizes : [4];
    const sampleIndices = sizes.length >= 3
      ? [0, Math.floor(sizes.length / 2), sizes.length - 1]
      : sizes.map((_, i) => i);

   // create legend-only traces with a real point but hidden from the plot
   const legendTraces = sampleIndices.map(i => ({
     type: 'scatter',
     mode: 'markers',
     x: [0],
     y: [0],
     name: `Area: ${rawSizes[i]}`,
     marker: {
       size: sizes[i],      
       sizemode: 'diameter',
       color: '#000000',    
       opacity: 0.95,
       symbol: 'circle'
     },
     visible: 'legendonly', 
     showlegend: true,
     hoverinfo: 'none'
   }));

    return (
        <Plot
            data={[
                {
                    type: 'scatter',
                    mode: 'markers',
                    x,
                    y,
                    marker: {
                        size: sizes,          
                        sizemode: 'diameter',
                        opacity: 0.8
                    },
                    customdata: rawSizes,
                    hovertemplate: 'Duration: %{x}<br>Intensity: %{y}<br>Area: %{customdata}<extra></extra>',
                    showlegend: false
                },
                ...legendTraces
            ]}
            layout={{
                title: 'Storm Duration vs Intensity',
                xaxis: { 
                    title: {
                        text: "Duration",
                        standoff: 20  
                    },
                    autorange: true 
                },
                yaxis: { 
                    title: {
                        text: "Average Intensity (dbZ)",
                        standoff: 20  
                    },
                    autorange: true 
                },
                hovermode: "closest",
                showscale: true,
                margin: { 
                    l: 80,  
                    r: 50, 
                    t: 50, 
                    b: 80 
                }
            }}
            config = {{responsive: true }}
            style = {{width: "100%", height: "450px"}}
        />
    );
}


export default duration_intensity