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
        <main style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0' }}>
            <div style={{ width: 'calc(100% - 40px)' }} id={ELEMENT_ID_1}></div>
            <div style={{ width: 'calc(100% - 40px)' }} id={ELEMENT_ID_2}></div>
        </main>
    );
}

export default App;
