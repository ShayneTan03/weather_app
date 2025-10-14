import {Card, Col, Row} from 'react-bootstrap';

function MetricCard({
    title,
    change,
    icon,
    unit,
    recent,
    historical
}) {
    return (
        <Col md={6} lg={3}>
            <Card className="h-100">
                <Card.Body>
                    <div className="d-flex align-items-center mb-2 gap-2">
                        {icon}
                        <span className="fw-medium">
                            {title}
                        </span>
                    </div>
                    <h4 className="fw-bold">
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(1)}%
                    </h4>
                    <div className="text-muted small">
                        {recent.toFixed(1)} vs {historical.toFixed(1)} {unit}
                    </div>
                </Card.Body>
            </Card>
        </Col>
    )
};

export function MetricRow({metrics}) {
    return(
        <Row className="g-4 mb-4">
            {metrics.map((m,i)=> (
                <MetricCard
                    key={i}
                    title={m.title}
                    change={m.change}
                    icon={m.icon}
                    unit={m.unit}
                    recent={m.recent}
                    historical={m.historical}
            />))}
        </Row>
    )
};
