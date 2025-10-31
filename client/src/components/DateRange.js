import { useState, useEffect, useRef, use } from "react";
import { Row, Col, Card, ButtonGroup, Button } from "react-bootstrap"; 
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

/* ---------- Main Component ---------- */

function DateRangePicker({ range, setRange, activeShortcut, setActiveShortcut }) {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef(null); // ref for date picker popup
    const shortcutRef = useRef(null); // ref for shortcut buttons
    const [currentView, setCurrentView] = useState(range[0].startDate);

    useEffect(() => {
        function onDocClick(e) {
            if (pickerRef.current.contains(e.target)){
                return;  // do nothing if click inside picker
            } 
            if (shortcutRef.current && shortcutRef.current.contains(e.target)) {
                return; // do nothing if click on shortcut buttons
            }
            // else close the picker
            setShowPicker(false);
        }
        if (showPicker) document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [showPicker]);
    
    /** Default Date Setting (D-5) */
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

    /** Shortcut Date Range (D-1, D-7, D-30) */
    const handleShortcut = (days) => {
        const endDate = new Date(maxSelectableDate); // end date is always D-5
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        // set the range
        setRange([{
            startDate: startDate,
            endDate: endDate,
            key: "selection"
        }]);
        // move the current view to startDate
        setCurrentView(startDate);
        // set active button
        setActiveShortcut(days);
        // close the picker
        // setShowPicker(false);
    }

    const start = range[0].startDate;
    const end = range[0].endDate;

    return (
        <Card className="mb-4">
            <Card.Body>
                {/* Wrap by Card component */}
                <div className="d-flex justify-content-between align-items-center mb-3">

                    <Card.Title className="mb-0">Select Date Range</Card.Title>
                    
                    {/* Shortcut Buttons */}
                    <ButtonGroup size="sm" ref={shortcutRef}>
                        {/* Last 1 Day  */}
                        <Button
                            variant = "outline-secondary"
                            onClick={() => handleShortcut(1)}
                            active={activeShortcut === 1}
                        >
                            Last 1 Day
                        </Button>
                        {/* Last 7 Days */}
                        <Button
                            variant = "outline-secondary"
                            onClick={() => handleShortcut(7)}
                            active={activeShortcut === 7}
                        >
                            Last 7 Days
                        </Button>
                        {/* Last 30 Days */}
                        <Button
                            variant = "outline-secondary"
                            onClick={() => handleShortcut(30)}
                            active={activeShortcut === 30}
                        >
                            Last 30 Days
                        </Button>                       
                    </ButtonGroup>
                </div>
                            
                {/* Date Button */}
                <div style = {{
                    position: "relative",
                    maxWidth: "500px",
                    margin: "0 auto"
                }}>
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
                                    setActiveShortcut(null); // deactivate shortcut buttons if manually selected
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

                                        setActiveShortcut(null); // deactivate shortcut buttons if cleared

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
                                        setActiveShortcut(1); // set active button to D-1
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