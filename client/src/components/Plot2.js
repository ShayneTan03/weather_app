import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";

function getIntensityCategory(intensity) {
    if (intensity < 5) return 'Light';
    if (intensity < 7) return 'Moderate';
    if (intensity < 9) return 'Heavy';
    return 'Severe';
}

function getIntensityColor(intensity) {
    if (intensity < 5) return '#22c55e';  // Light - Green
    if (intensity < 7) return '#eab308';  // Moderate - Yellow
    if (intensity < 9) return '#f59e0b';  // Heavy - Orange
    return                    '#ef4444';  // Severe - Red
}

function storm_frequency ({Data2}) {
    const x = Data2.map(d => Number(d.rainfall));
    const y = Data2.map(d => Number(d.windspeed));
    const sizes = Data2.map(d => Math.max(6, Number(d.size)*0.5 || 6));
    const intensities = Data2.map(d => Number(d.intensity));
    const colors = intensities.map(i => getIntensityColor(i));
    const categories = intensities.map(i => getIntensityCategory(i));
    return (
        <Plot
            data={[
                {
                    x,
                    y,
                    mode: "markers",
                    type: "scatter",
                    marker: {
                        size: sizes,
                        color: colors,
                        opacity: 0.8,
                    },
                    text: Data2.map(d => 
                        `Storm: ${d.stormId}<br>` +
                        `Rainfall: ${d.rainfall} mm<br>` +
                        `Wind Speed: ${d.windspeed} km/s<br>` +
                        `Size: ${d.size} km²<br>` +
                        `Intensity: ${d.intensity} dBZ`
                    ),
                    hoverinfo: "text",
                    name: "Storms",
                    showlegend: false
                },
                ...['Light', 'Moderate', 'Heavy', 'Severe'].map(category => ({
                    x: [null],
                    y: [null],
                    mode: 'markers',
                    marker: {
                        size: 10,
                        color: getIntensityColor(
                            category === 'Light' ? 4 :
                            category === 'Moderate' ? 6 :
                            category === 'Heavy' ? 8 : 10
                        )
                    },
                    name: category,
                    showlegend: true
                }))
            ]}
            layout={{
                title: "Storm Features Against Average Rainfall and Wind Speed",
                xaxis: { 
                    title: {
                        text: "Avg Rainfall (mm)",
                        standoff: 20  // Add space between axis and title
                    },
                    autorange: true 
                },
                yaxis: { 
                    title: {
                        text: "Avg Windspeed (km/s)",
                        standoff: 20  // Add space between axis and title
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
    )
}


const Plot2 = storm_frequency;
export default Plot2;
