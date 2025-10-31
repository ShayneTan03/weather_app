import { useState, useEffect, useRef } from "react";
import { Row, Col, Card } from "react-bootstrap"; 
import { DateRange } from "react-date-range";
import { enUS } from "date-fns/locale";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { max, set } from "date-fns";

/* ---------- Helper Functions ---------- */

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


function DateRangePicker({ range, setRange }) {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef(null);
    const [currentView, setCurrentView] = useState(range[0].startDate);

    useEffect(() => {
        function onDocClick(e) {
            if (!pickerRef.current) return;
            if (!pickerRef.current.contains(e.target)) setShowPicker(false);
        }
        if (showPicker) document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [showPicker]);
    
    const maxSelectableDate = new Date();
    maxSelectableDate.setDate(maxSelectableDate.getDate() - 5);
    maxSelectableDate.setHours(23,59,59,999);

    const defaultStartDate = new Date(maxSelectableDate);
    defaultStartDate.setHours(0, 0, 0, 0);

    const defaultRange = [{
        startDate: defaultStartDate,
        endDate: defaultStartDate,
        key: "selection"
    }]

    const start = range[0].startDate;
    const end = range[0].endDate;

    return (
        <Card className="mb-4">
            <Card.Body>
                {/* Wrap by Card component */}
                <Card.Title>Select Date Range</Card.Title>
                    <div style={{ 
                        position: "relative", 
                        maxWidth: "500px",  
                        margin: "0 auto"   
                    }}>
                        
                        {/* Date Button */}
                        <Row 
                            onClick={() => setShowPicker(v => !v)}
                            style={{ 
                                cursor: "pointer", 
                                border: "1px solid #dee2e6",
                                borderRadius: "0.375rem",
                                backgroundColor: "white"
                            }}
                        >
                            <Col xs={6} style={{ padding: "0.5rem 1rem", borderRight: "1px solid #dee2e6" }}>
                                <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>From</div>
                                <div style={{ fontWeight: "500" }}>
                                    {start ? fmt(start) : "Add date"}
                                </div>
                            </Col>
                            <Col xs={6} style={{ padding: "0.5rem 1rem" }}>
                                <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>To</div>
                                <div style={{ fontWeight: "500" }}>
                                    {end ? fmt(end) : "Add date"}
                                </div>
                            </Col>
                        </Row>

                        {/* Popup Calendar */}
                        {showPicker && (
                            <div
                                ref={pickerRef}
                                style={{
                                    position: "absolute",
                                    zIndex: 50,
                                    marginTop: 4, 
                                    background: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                                    width: "max-content", 
                                    overflow: "hidden",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                }}
                            >
                                {/* Date Range Component */}
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
                                    maxDate={maxSelectableDate}
                                    showDateDisplay={false}
                                    onShownDateChange={(date) => setCurrentView(date)}
                                />
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 12px 12px" }}>
                                    {/* Clear Button */}
                                    <button
                                        onClick={() => {
                                            const firstDayOfView = new Date(
                                                currentView.getFullYear(),
                                                currentView.getMonth(),
                                                1
                                            );
                                            // catch edge case where first day exceeds maxSelectableDate
                                            let resetDate = firstDayOfView;
                                            if (firstDayOfView > maxSelectableDate) {
                                                resetDate = maxSelectableDate;
                                            }

                                            setRange([{
                                                startDate: resetDate,
                                                endDate: resetDate,
                                                key: "selection"
                                            }]);

                                        }}
                                        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "white" }}
                                        type="button"
                                    >
                                        Clear
                                    </button>

                                    {/* Return Button */}
                                    <button
                                        onClick = {() =>{
                                            setRange(defaultRange);
                                            setCurrentView(defaultStartDate);
                                        }}
                                        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: '#f0f0f0' }}
                                        type="button"
                                    >
                                        Return
                                    </button>

                                    {/* Done Button */}
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
            </Card.Body>
        </Card>
    );
}

export default DateRangePicker;