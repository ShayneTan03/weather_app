import React, { useEffect, useMemo, useRef, useState } from "react";
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

function Plot1({ Data1, onDateRangeChange }) {
  // --- date-range dropdown state ---
  const [showPicker, setShowPicker] = useState(false);
  const [range, setRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);
  const pickerRef = useRef(null);

  // close picker on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target)) setShowPicker(false);
    }
    if (showPicker) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showPicker]);

  const start = range[0].startDate;
  const end = range[0].endDate;

  // --- filter Data1 by selected range (inclusive) ---
  const filteredData1 = useMemo(() => {
    if (!start || !end) return Data1 || [];
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);               // start of day
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);          // end of day

    return (Data1 || [])
      .map(storm => ({
        ...storm,
        points: (storm.points || []).filter(p => {
          const t = new Date(p.timestamp).getTime();
          return t >= s.getTime() && t <= e.getTime();
        })
      }))
      .filter(storm => storm.points.length > 0);
  }, [Data1, start, end]);

  // notify parent (optional)
  useEffect(() => {
    if (!onDateRangeChange) return;
    onDateRangeChange({
      start: start ? toISODate(start) : null,
      end: end ? toISODate(end) : null,
    });
  }, [start, end, onDateRangeChange]);

  return (
    <div style={{ position: "relative" }}>
      {/* Top bar with a hotel.com-style Dates button */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <DateButton
          start={start}
          end={end}
          onClick={() => setShowPicker(v => !v)}
        />
      </div>

      {showPicker && (
        <div
          ref={pickerRef}
          style={{
            position: "absolute",
            zIndex: 50,
            marginTop: 8,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            width: 620,
            overflow: "hidden",
          }}
        >
          <DateRange
            locale={enUS}
            onChange={(ranges) => {
              setRange([ranges.selection]);
            }}
            moveRangeOnFirstSelection={false}
            ranges={range}
            months={2}
            direction="horizontal"
            editableDateInputs
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 12px 12px" }}>
            <button
              onClick={() => {
                setRange([{ startDate: null, endDate: null, key: "selection" }]);
                setShowPicker(false);
              }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "white" }}
              type="button"
            >
              Clear
            </button>
            <button
              onClick={() => setShowPicker(false)}
              style={{ padding: "6px 10px", borderRadius: 8, border: 0, background: "black", color: "white" }}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Your existing chart, now fed the filtered data */}
      <RainfallStormsize Data1={filteredData1} />
    </div>
  );
}

export default Plot1;

/* ---------- small helpers ---------- */
function DateButton({ start, end, onClick }) {
  const label =
    start && end ? `${fmt(start)} → ${fmt(end)}` : "Select dates";
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid #d1d5db",
        background: "white",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function fmt(d) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toISODate(d) {
  const z = new Date(d);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const day = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}