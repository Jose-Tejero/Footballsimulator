import { jsx as _jsx } from "react/jsx-runtime";
import NFLSimulator from "./components/NFLSimulator";
import styles from "./App.module.css";
const App = () => {
    return (_jsx("div", { className: styles.app, children: _jsx(NFLSimulator, {}) }));
};
export default App;
