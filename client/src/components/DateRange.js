import React, { useState, useEffect, useRef } from "react";
import { DateRange } from "react-date-range";
import { enUS } from "date-fns/locale";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

// Global Date Range Picker component
function GlobalDateRangePicker({ range, setRange }) {
    const [showPicker, setShowPicker] = useState(false);
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

    return (
        <div style={{position: "relative", marginBottom: "1rem"}}>
        {/* Top bar with a hotel.com-style Dates button */}
        <div style={{ display: "flex", gap: 8, alignItems: "center"}}>
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
        </div>
    );
}

export default GlobalDateRangePicker;


/* ---------- Helper Functions ---------- */
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