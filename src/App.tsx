import { useEffect } from "react";
import { drawExample1, drawExample2 } from "./drawExample";

const ELEMENT_ID_1 = "scichart-root1";
const ELEMENT_ID_2 = "scichart-root2";

function App() {
    useEffect(() => {
        drawExample1(ELEMENT_ID_1);
        drawExample2(ELEMENT_ID_2);
    }, []);

    return (
        <main style={{ width: '100%', height: '100%' }}>
            <div id={ELEMENT_ID_1}></div>
            <div id={ELEMENT_ID_2}></div>
        </main>
    );
}

export default App;
