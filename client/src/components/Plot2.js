import Plot from "react-plotly.js";

function getIntensityCategory(intensity) {
    /**
     * Helper function 1: Categorizes storm intensity into defined ranges
     */
    if (intensity < 66) return '64-66 dBZ';
    if (intensity < 68) return '66-68 dBZ';
    return '68-70 dBZ';
}

function getIntensityColor(intensity) {
    /**
     * Helper function 2: Maps storm intensity to specific colors
     */
    if (intensity < 66) return '#22c55e';  // 64-66 dBZ - Green
    if (intensity < 68) return '#eab308';  // 66-68 dBZ - Yellow
    return                    '#ef4444';   // 68-70 dBZ - Red
}

function storm_frequency ({Data2}) {
    /**
     * Second plot: Scatter plot of storm features against average rainfall and wind speed
     */
    const x = Data2.map(d => Number(d.rainfall));
    const y = Data2.map(d => Number(d.windspeed));
    const sizes = Data2.map(d => Math.max(6, Number(d.size)*0.1 || 6));
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
                ...['64-66 dBZ', '66-68 dBZ', '68-70 dBZ'].map(category => ({
                    x: [null],
                    y: [null],
                    mode: 'markers',
                    marker: {
                        size: 10,
                        color: getIntensityColor(
                            category === '64-66 dBZ' ? 65 :
                            category === '66-68 dBZ' ? 67 : 69
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
