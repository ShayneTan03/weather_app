import {Button, ButtonGroup} from 'react-bootstrap';

const labelMap = [
    { label: "map", value: "Radar Scan" },
    { label: "plot", value: "Feature Analysis" }
];

function Navigation({activeView, setActiveView, buttonArr}) {
    console.log(activeView)
    console.log(buttonArr)
    return (
        <ButtonGroup className = 'w-100'>
            {buttonArr.map((name) => {
                const mappedValue = labelMap.find((item) => item.label === name)?.value;
                return(
                    <Button
                        key={name}
                        className="w-50"
                        variant = {activeView === name ? 'primary' : 'outline-primary'}
                        onClick = {() => setActiveView(name)}
                        type='button'>
                        {mappedValue}
                    </Button>
            )})}
        </ButtonGroup>
    );
};

export default Navigation;