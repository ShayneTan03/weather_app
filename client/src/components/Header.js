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
            </Card.Body>
        </Card>
    );
}

export default Header;