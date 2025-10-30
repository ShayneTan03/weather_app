import { Card, Col, Row } from "react-bootstrap";

function MetricCard({title, metric, icon, unit }) {
    const validValues = Array.isArray(metric)
        ? metric.filter((v) => v !== null && v !== undefined)
        : metric != null
        ? [metric]
        : [];

    const average =
        validValues.length > 0
            ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length
            : 0;

    return (
        <Col md={6} lg={3}>
            <Card className="h-100">
                <Card.Body>
                    <div className="d-flex align-items-center mb-2 gap-2">
                        {icon}
                        <span className="fw-medium">{title}</span>
                    </div>
                    <h4 className="fw-bold">
                        {unit ? `${average.toFixed(1)} ${unit}` : average.toFixed(1)}
                    </h4>
                </Card.Body>
            </Card>
        </Col>
    );
}

export default MetricCard;


export function MetricRow({ metrics }) {
    console.log('row')
    console.log(metrics);
    return (
        <Row className="g-4 mb-4">
            {metrics.map((m, i) => (
                <MetricCard
                    key={i}
                    title={m.title}
                    metric={m.reading} // pass the actual array here
                    icon={m.icon}
                    unit={m.unit}
                />
            ))}
        </Row>
    );
}
