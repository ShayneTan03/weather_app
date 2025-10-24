import React from "react";
import {Button, ButtonGroup} from 'react-bootstrap';
// import {Link, useLocation} from "react-router-dom";

// const Navigation = () => {

//     const location = useLocation(); // Get the current location

//     return (
//         <nav className = "main-nav">
//             <ul className = "nav-links">
//                 <li>
//                     <Link to = "/" className = {location.path.name === '/' ? 'active' : ''}>
//                         Map
//                     </Link>
//                 </li>
//                 <li>
//                     <Link to = '/plots' className = {location.pathnme === '/plots' ? 'active' : ''}>
//                         Plots
//                     </Link>
//                 </li>
//             </ul>
//         </nav>
//     );
// };

function Navigation({activeView, setActiveView, buttonArr}) {

    return (
        <ButtonGroup className = 'w-100'>
            {buttonArr.map((name) => {
                return(
                    <Button
                        key={name}
                        variant = {activeView === name ? 'primary' : 'outline-primary'}
                        onClick = {() => setActiveView(name)}
                        type='button'>
                        {name}
                    </Button>
            )})}
        </ButtonGroup>
    );
    // return (
    //     <ButtonGroup>
    //         <Button
    //             variant = {activeView === 'map'? 'primary' : 'outline-primary'}
    //             onClick = {() => setActiveView('map')}
    //             >
    //                 Map
    //         </Button>
    //         <Button
    //             variant = {activeView === 'plot'? 'primary' : 'outline-primary'}
    //             onClick = {() => setActiveView('plot')}
    //             >
    //                 Plot
    //         </Button>
    //     </ButtonGroup>
    // );
};

export default Navigation;