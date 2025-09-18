import React, { useState } from "react";
import {
  GameConfig,
  SimulationResult,
  TeamSimulationDetail,
  TeamStats,
  simulateGame,
} from "./simulation";
import styles from "./NFLSimulator.module.css";

type TeamInputs = Record<keyof TeamStats, string>;

interface ConfigInputs {
  allowTies: boolean;
  maxOtRounds: string;
  otScale: string;
  tiebreakPolicy: "expected" | "home";
}

const DEFAULT_HOME_INPUTS: TeamInputs = {
  pointsPerGame: "24.6",
  pointsAllowedPerGame: "20.9",
  yardsPerPlay: "5.9",
  turnoverRate: "1.1",
};

const DEFAULT_AWAY_INPUTS: TeamInputs = {
  pointsPerGame: "22.3",
  pointsAllowedPerGame: "21.7",
  yardsPerPlay: "5.7",
  turnoverRate: "1.3",
};

const DEFAULT_CONFIG_INPUTS: ConfigInputs = {
  allowTies: false,
  maxOtRounds: "3",
  otScale: "0.25",
  tiebreakPolicy: "expected",
};

const formatSigned = (value: number): string => {
  const rounded = value.toFixed(1);
  return value >= 0 ? `+${rounded}` : rounded;
};

const parsePositiveNumber = (value: string, label: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un numero mayor que 0.`);
  }
  return parsed;
};

const parseNonNegativeNumber = (value: string, label: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un numero mayor o igual a 0.`);
  }
  return parsed;
};

const parseTeamStats = (inputs: TeamInputs, label: string): TeamStats => {
  return {
    pointsPerGame: parseNonNegativeNumber(inputs.pointsPerGame, `${label}: puntos por juego`),
    pointsAllowedPerGame: parseNonNegativeNumber(
      inputs.pointsAllowedPerGame,
      `${label}: puntos permitidos por juego`,
    ),
    yardsPerPlay: parsePositiveNumber(inputs.yardsPerPlay, `${label}: yardas por jugada`),
    turnoverRate: parseNonNegativeNumber(inputs.turnoverRate, `${label}: entregas por juego`),
  };
};

const parseConfig = (inputs: ConfigInputs): GameConfig => {
  const allowTies = inputs.allowTies;

  const maxOtRounds = Number.parseInt(inputs.maxOtRounds, 10);
  if (!Number.isFinite(maxOtRounds) || maxOtRounds < 0) {
    throw new Error("Las rondas maximas de OT deben ser un entero mayor o igual a 0.");
  }

  const otScale = Number.parseFloat(inputs.otScale);
  if (!Number.isFinite(otScale) || otScale < 0 || otScale > 1) {
    throw new Error("La escala de OT debe estar entre 0 y 1.");
  }

  return {
    allowTies,
    maxOtRounds,
    otScale,
    tiebreakPolicy: inputs.tiebreakPolicy,
  };
};

const sumPoints = (points: number[]): number => points.reduce((total, value) => total + value, 0);

const renderTeamSummary = (title: string, detail: TeamSimulationDetail) => {
  const overtimeTotal = sumPoints(detail.overtimePoints);
  const finalWithOt = detail.finalPoints + overtimeTotal;

  return (
    <div className={styles.summaryCard}>
      <h3>{title}</h3>
      <p>
        <strong>Esperado:</strong> {detail.expectedPoints.toFixed(1)} pts
      </p>
      <p>
        <strong>Variacion (YPP):</strong> {formatSigned(detail.variation)} pts
      </p>
      <p>
        <strong>Penalizacion por entregas:</strong> -{detail.turnoverPenalty.toFixed(1)} pts
      </p>
      <p>
        <strong>Proyeccion ajustada:</strong> {detail.rawProjection.toFixed(1)} pts
      </p>
      <p>
        <strong>Marcador regulacion:</strong> {detail.finalPoints} pts
      </p>
      {detail.overtimePoints.length > 0 && (
        <p>
          <strong>OT:</strong> {overtimeTotal} pts ({detail.overtimePoints.join(", ")})
        </p>
      )}
      <p>
        <strong>Marcador final:</strong> {finalWithOt} pts
      </p>
    </div>
  );
};

const NFLSimulator: React.FC = () => {
  const [homeInputs, setHomeInputs] = useState<TeamInputs>(DEFAULT_HOME_INPUTS);
  const [awayInputs, setAwayInputs] = useState<TeamInputs>(DEFAULT_AWAY_INPUTS);
  const [configInputs, setConfigInputs] = useState<ConfigInputs>(DEFAULT_CONFIG_INPUTS);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTeamInputChange = (
    team: "home" | "away",
    field: keyof TeamInputs,
    value: string,
  ) => {
    setError(null);
    if (team === "home") {
      setHomeInputs((prev) => ({ ...prev, [field]: value }));
    } else {
      setAwayInputs((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleConfigChange = <Key extends keyof ConfigInputs>(field: Key, value: ConfigInputs[Key]) => {
    setError(null);
    setConfigInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleSimulate = () => {
    try {
      const homeStats = parseTeamStats(homeInputs, "Equipo local");
      const awayStats = parseTeamStats(awayInputs, "Equipo visitante");
      const config = parseConfig(configInputs);

      const simulation = simulateGame(homeStats, awayStats, config);
      setResult(simulation);
      setError(null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Ocurrio un error inesperado");
    }
  };

  const renderResults = result ? (
    <div className={styles.resultsSection}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreBlock}>
          <span className={styles.scoreLabel}>Local</span>
          <span className={styles.scoreValue}>{result.homeScore}</span>
        </div>
        <div className={styles.scoreBlock}>
          <span className={styles.scoreLabel}>Visitante</span>
          <span className={styles.scoreValue}>{result.awayScore}</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        {renderTeamSummary("Equipo local", result.homeDetail)}
        {renderTeamSummary("Equipo visitante", result.awayDetail)}
      </div>

      {result.overtime && (
        <div className={styles.overtimeSummary}>
          <h3>Tiempo extra</h3>
          <p>
            Rondas jugadas: <strong>{result.overtime.rounds}</strong>
          </p>
          <p>
            Puntos OT local: <strong>{sumPoints(result.overtime.homePoints)}</strong>
            {result.overtime.homePoints.length > 0 && ` (${result.overtime.homePoints.join(", ")})`}
          </p>
          <p>
            Puntos OT visitante: <strong>{sumPoints(result.overtime.awayPoints)}</strong>
            {result.overtime.awayPoints.length > 0 && ` (${result.overtime.awayPoints.join(", ")})`}
          </p>
          {result.overtime.tiebreakApplied && (
            <div className={styles.tiebreakTag}>
              Desempate por politica: {result.overtime.tiebreakApplied}
            </div>
          )}
        </div>
      )}

      <div className={styles.info}>
        El modelo usa promedios de puntos, eficiencia ofensiva y entregas para generar una
        proyeccion rapida del marcador. Ajusta las entradas para explorar distintos
        escenarios.
      </div>
    </div>
  ) : (
    <div className={styles.placeholder}>
      <h3>Simula un partido</h3>
      <p>
        Ingresa puntos por juego, puntos permitidos, yardas por jugada y entregas por juego
        para cada equipo.
      </p>
      <p>Configura el tiempo extra para garantizar un ganador.</p>
      <p>Presiona "Simular partido" para obtener una proyeccion de marcador.</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Simulador NFL por Juego</h1>

      <div className={styles.desktopLayout}>
        <div className={styles.leftPanel}>
          <div className={styles.formSection}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Equipo local</h2>
              <div className={styles.field}>
                <label htmlFor="home-ppg">Puntos por juego (PPG)</label>
                <input
                  id="home-ppg"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={homeInputs.pointsPerGame}
                  onChange={(event) =>
                    handleTeamInputChange("home", "pointsPerGame", event.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="home-papg">Puntos permitidos por juego (PAPG)</label>
                <input
                  id="home-papg"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={homeInputs.pointsAllowedPerGame}
                  onChange={(event) =>
                    handleTeamInputChange("home", "pointsAllowedPerGame", event.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="home-ypp">Yardas por jugada (YPP)</label>
                <input
                  id="home-ypp"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={homeInputs.yardsPerPlay}
                  onChange={(event) =>
                    handleTeamInputChange("home", "yardsPerPlay", event.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="home-turnovers">Entregas por juego</label>
                <input
                  id="home-turnovers"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={homeInputs.turnoverRate}
                  onChange={(event) =>
                    handleTeamInputChange("home", "turnoverRate", event.target.value)
                  }
                />
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Equipo visitante</h2>
              <div className={styles.field}>
                <label htmlFor="away-ppg">Puntos por juego (PPG)</label>
                <input
                  id="away-ppg"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={awayInputs.pointsPerGame}
                  onChange={(event) =>
                    handleTeamInputChange("away", "pointsPerGame", event.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="away-papg">Puntos permitidos por juego (PAPG)</label>
                <input
                  id="away-papg"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={awayInputs.pointsAllowedPerGame}
                  onChange={(event) =>
                    handleTeamInputChange("away", "pointsAllowedPerGame", event.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="away-ypp">Yardas por jugada (YPP)</label>
                <input
                  id="away-ypp"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={awayInputs.yardsPerPlay}
                  onChange={(event) =>
                    handleTeamInputChange("away", "yardsPerPlay", event.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="away-turnovers">Entregas por juego</label>
                <input
                  id="away-turnovers"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={awayInputs.turnoverRate}
                  onChange={(event) =>
                    handleTeamInputChange("away", "turnoverRate", event.target.value)
                  }
                />
              </div>
            </div>

            <div className={`${styles.card} ${styles.fullWidthCard}`}>
              <h2 className={styles.cardTitle}>Configuracion de OT</h2>
              <div className={styles.checkboxRow}>
                <input
                  id="allow-ties"
                  type="checkbox"
                  checked={configInputs.allowTies}
                  onChange={(event) => handleConfigChange("allowTies", event.target.checked)}
                />
                <label htmlFor="allow-ties">Permitir empates</label>
              </div>
              <div className={styles.field}>
                <label htmlFor="ot-rounds">Rondas maximas de OT</label>
                <input
                  id="ot-rounds"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={configInputs.maxOtRounds}
                  onChange={(event) => handleConfigChange("maxOtRounds", event.target.value)}
                  disabled={configInputs.allowTies}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="ot-scale">Escala de OT (0-1)</label>
                <input
                  id="ot-scale"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  inputMode="decimal"
                  value={configInputs.otScale}
                  onChange={(event) => handleConfigChange("otScale", event.target.value)}
                  disabled={configInputs.allowTies}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="tiebreak">Politica de desempate</label>
                <select
                  id="tiebreak"
                  value={configInputs.tiebreakPolicy}
                  onChange={(event) =>
                    handleConfigChange("tiebreakPolicy", event.target.value as ConfigInputs["tiebreakPolicy"])
                  }
                  disabled={configInputs.allowTies}
                >
                  <option value="expected">expected</option>
                  <option value="home">home</option>
                </select>
              </div>
            </div>
          </div>

          <button className={styles.button} type="button" onClick={handleSimulate}>
            Simular partido
          </button>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.rightPanel}>{renderResults}</div>
      </div>
    </div>
  );
};

export default NFLSimulator;
