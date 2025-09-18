import NFLSimulator from "./components/NFLSimulator";
import styles from "./App.module.css";

const App: React.FC = () => {
  return (
    <div className={styles.app}>
      <NFLSimulator />
    </div>
  );
};

export default App;
