import {Card, Form} from "react-bootstrap";

function Header({
    analysisTimeframe,
    setAnalysisTimeframe,
    title,
    subtitle,
}) {
    return (
        // keep margin-bottom as 4 for web
        <Card className="mb-4"> 
            <Card.Body className="d-flex justify-content-between align-items-center">
                <div>
                    <Card.Title>{title}</Card.Title>
                    <Card.Text className="text-muted">{subtitle}</Card.Text>
                </div>

                <div className="d-flex gap-2">
                    <Form.Select value={analysisTimeframe} onChange={(e) => setAnalysisTimeframe(e.target.value)}>

                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="monthly">Monthly</option>

                    </Form.Select>
                </div>
            </Card.Body>
        </Card>
    );
}

export default Header;