import React, { useMemo, useState } from "react";
import {
  DriveOutcome,
  DriveResult,
  GameConfig,
  SimulationResult,
  TeamStats,
  simulateGame,
} from "./simulation";
import styles from "./NFLSimulator.module.css";

type TeamInputs = Record<keyof TeamStats, string>;

interface ConfigInputs {
  drivesPerTeam: string;
  allowTies: boolean;
  overtimeEnabled: boolean;
  maxRounds: string;
  seed: string;
}

interface UsedConfig {
  drivesPerTeam: number;
  allowTies: boolean;
  overtimeEnabled: boolean;
  maxRounds?: number;
}

const formatDriveLabel = (drive: DriveOutcome, index: number): string => {
  const prefix = `Drive ${index + 1}`;
  if (drive.result === DriveResult.NONE) {
    return `${prefix}: sin puntos`;
  }

  const label = drive.result === DriveResult.TD ? "TD" : "FG";
  return `${prefix}: ${label} (${drive.points} pts)`;
};

const NFLSimulator: React.FC = () => {
  const [homeInputs, setHomeInputs] = useState<TeamInputs>({
    offPtsDrive: "2.5",
    defPtsDrive: "2.2",
  });
  const [awayInputs, setAwayInputs] = useState<TeamInputs>({
    offPtsDrive: "2.3",
    defPtsDrive: "2.4",
  });
  const [configInputs, setConfigInputs] = useState<ConfigInputs>({
    drivesPerTeam: "12",
    allowTies: true,
    overtimeEnabled: true,
    maxRounds: "3",
    seed: "",
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedConfig, setUsedConfig] = useState<UsedConfig | null>(null);
  const [usedSeed, setUsedSeed] = useState<number | undefined>(undefined);

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

  const handleConfigNumericChange = (
    field: "drivesPerTeam" | "maxRounds" | "seed",
    value: string,
  ) => {
    setError(null);
    setConfigInputs((prev) => ({ ...prev, [field]: value }));
  };

  const parseTeamStats = (inputs: TeamInputs, label: string): TeamStats => {
    const off = Number.parseFloat(inputs.offPtsDrive);
    const def = Number.parseFloat(inputs.defPtsDrive);

    if (Number.isNaN(off)) {
      throw new Error(`Ingresa un numero valido para el promedio ofensivo (${label}).`);
    }
    if (Number.isNaN(def)) {
      throw new Error(`Ingresa un numero valido para el promedio defensivo (${label}).`);
    }

    return {
      offPtsDrive: off,
      defPtsDrive: def,
    };
  };

  const buildGameConfig = (): GameConfig & UsedConfig => {
    const drives = Number.parseInt(configInputs.drivesPerTeam, 10);
    if (Number.isNaN(drives) || drives <= 0) {
      throw new Error("Drives por equipo debe ser un entero positivo.");
    }

    const allowTies = configInputs.allowTies;

    let maxRounds: number | undefined;
    if (configInputs.maxRounds.trim().length > 0) {
      const parsedMax = Number.parseInt(configInputs.maxRounds, 10);
      if (Number.isNaN(parsedMax) || parsedMax <= 0) {
        throw new Error("Rondas de OT debe ser un entero positivo.");
      }
      maxRounds = parsedMax;
    }

    let seedValue: number | undefined;
    if (configInputs.seed.trim().length > 0) {
      const parsedSeed = Number.parseInt(configInputs.seed, 10);
      if (Number.isNaN(parsedSeed)) {
        throw new Error("La semilla debe ser un numero entero.");
      }
      seedValue = parsedSeed;
    }

    const overtimeEnabled = !allowTies && configInputs.overtimeEnabled;

    const gameConfig: GameConfig = {
      drivesPerTeam: drives,
      allowTies,
      seed: seedValue,
    };

    if (!allowTies) {
      gameConfig.overtime = {
        enabled: overtimeEnabled,
        maxRounds,
      };
    }

    return {
      ...gameConfig,
      drivesPerTeam: drives,
      allowTies,
      overtimeEnabled,
      maxRounds,
    };
  };

  const handleSimulate = () => {
    try {
      const homeStats = parseTeamStats(homeInputs, "Equipo local");
      const awayStats = parseTeamStats(awayInputs, "Equipo visitante");
      const config = buildGameConfig();

      const simulation = simulateGame(homeStats, awayStats, config);

      setResult(simulation);
      setUsedConfig({
        drivesPerTeam: config.drivesPerTeam,
        allowTies: config.allowTies ?? true,
        overtimeEnabled: config.overtimeEnabled,
        maxRounds: config.maxRounds,
      });
      setUsedSeed(config.seed);
      setError(null);
    } catch (err) {
      setResult(null);
      setUsedConfig(null);
      setError(err instanceof Error ? err.message : "Ocurrio un error inesperado");
    }
  };

  const overtimeInfo = useMemo(() => {
    if (!result || !usedConfig) {
      return { rounds: 0, wasApplied: false, capped: false };
    }

    const extraDrives = result.homeDrives.length - usedConfig.drivesPerTeam;
    const rounds = extraDrives > 0 ? extraDrives : 0;

    const wasApplied = rounds > 0;
    const capped =
      wasApplied &&
      usedConfig.overtimeEnabled &&
      typeof usedConfig.maxRounds === "number" &&
      rounds >= usedConfig.maxRounds &&
      result.homeScore === result.awayScore;

    return { rounds, wasApplied, capped };
  }, [result, usedConfig]);

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

      {usedSeed !== undefined && (
        <div className={styles.info}>Semilla utilizada: {usedSeed}</div>
      )}

      <div className={styles.drivesContainer}>
        <div className={styles.driveList}>
          <h3>Drives local</h3>
          <ul>
            {result.homeDrives.map((drive, index) => (
              <li key={`home-drive-${index}`} className={styles.driveItem}>
                {formatDriveLabel(drive, index)}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.driveList}>
          <h3>Drives visitante</h3>
          <ul>
            {result.awayDrives.map((drive, index) => (
              <li key={`away-drive-${index}`} className={styles.driveItem}>
                {formatDriveLabel(drive, index)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <h3>Resumen de anotaciones</h3>
        <p>
          <strong>Local:</strong> {result.summary.homeTDs} TD / {result.summary.homeFGs} FG
        </p>
        <p>
          <strong>Visitante:</strong> {result.summary.awayTDs} TD / {result.summary.awayFGs} FG
        </p>
        <p className={styles.info}>
          {overtimeInfo.wasApplied && usedConfig ? (
            <>
              Se jugaron {overtimeInfo.rounds} rondas de tiempo extra.
              {overtimeInfo.capped && usedConfig.maxRounds && (
                <> Empate tras agotar {usedConfig.maxRounds} rondas.</>
              )}
            </>
          ) : (
            <>No fue necesario tiempo extra.</>
          )}
        </p>
      </div>
    </div>
  ) : (
    <div className={styles.placeholder}>
      <h3>Simula un partido</h3>
      <p>Ajusta los promedios ofensivos y defensivos de cada equipo para estimar su eficiencia por drive.</p>
      <p>Presiona "Simular partido" para ver el marcador, el detalle de cada serie y el resumen de anotaciones.</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Simulador NFL por Drive</h1>

      <div className={styles.desktopLayout}>
        <div className={styles.leftPanel}>
          <div className={styles.formSection}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Equipo local</h2>
              <div className={styles.field}>
                <label htmlFor="home-off">Promedio ofensivo (pts/drive)</label>
                <input
                  id="home-off"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Ej: 2.5"
                  value={homeInputs.offPtsDrive}
                  onChange={(event) =>
                    handleTeamInputChange("home", "offPtsDrive", event.target.value)
                  }
                />
                <span className={styles.helpText}>Promedio ofensivo por drive.</span>
              </div>
              <div className={styles.field}>
                <label htmlFor="home-def">Promedio defensivo (pts/drive)</label>
                <input
                  id="home-def"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Ej: 2.2"
                  value={homeInputs.defPtsDrive}
                  onChange={(event) =>
                    handleTeamInputChange("home", "defPtsDrive", event.target.value)
                  }
                />
                <span className={styles.helpText}>Puntos permitidos por drive.</span>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Equipo visitante</h2>
              <div className={styles.field}>
                <label htmlFor="away-off">Promedio ofensivo (pts/drive)</label>
                <input
                  id="away-off"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Ej: 2.3"
                  value={awayInputs.offPtsDrive}
                  onChange={(event) =>
                    handleTeamInputChange("away", "offPtsDrive", event.target.value)
                  }
                />
                <span className={styles.helpText}>Promedio ofensivo por drive.</span>
              </div>
              <div className={styles.field}>
                <label htmlFor="away-def">Promedio defensivo (pts/drive)</label>
                <input
                  id="away-def"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Ej: 2.4"
                  value={awayInputs.defPtsDrive}
                  onChange={(event) =>
                    handleTeamInputChange("away", "defPtsDrive", event.target.value)
                  }
                />
                <span className={styles.helpText}>Puntos permitidos por drive.</span>
              </div>
            </div>

            <div className={`${styles.card} ${styles.fullWidthCard}`}>
              <h2 className={styles.cardTitle}>Configuracion del partido</h2>
              <div className={styles.field}>
                <label htmlFor="drives">Drives por equipo</label>
                <input
                  id="drives"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="Ej: 12"
                  value={configInputs.drivesPerTeam}
                  onChange={(event) =>
                    handleConfigNumericChange("drivesPerTeam", event.target.value)
                  }
                />
                <span className={styles.helpText}>
                  Un drive es una posesion ofensiva completa: empieza cuando un equipo gana el balon (kickoff, despeje o entrega) y termina cuando anota, entrega el balon, patea un gol de campo o expira el reloj.
                  Este valor fija cuantas series ofensivas tiene cada franquicia en el tiempo reglamentario y, por lo tanto, el marco total de oportunidades para generar puntos antes de pasar la posesion al rival.
                  En la NFL real los equipos suelen tener entre 10 y 14 drives por partido segun ritmo y eficiencia, asi que modificar este numero permite simular juegos mas rapidos, defensivos o, por el contrario, duelos con muchas posesiones.
                </span>
              </div>
              <div className={styles.checkboxRow}>
                <input
                  id="ties"
                  type="checkbox"
                  checked={configInputs.allowTies}
                  onChange={(event) => {
                    setError(null);
                    const allowTies = event.target.checked;
                    setConfigInputs((prev) => ({
                      ...prev,
                      allowTies,
                      overtimeEnabled: allowTies ? false : prev.overtimeEnabled || true,
                    }));
                  }}
                />
                <label htmlFor="ties">Permitir empates</label>
              </div>
              <div className={styles.field}>
                <label htmlFor="ot-rounds">Rondas maximas de OT</label>
                <input
                  id="ot-rounds"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="Ej: 3"
                  value={configInputs.maxRounds}
                  onChange={(event) =>
                    handleConfigNumericChange("maxRounds", event.target.value)
                  }
                  disabled={configInputs.allowTies || !configInputs.overtimeEnabled}
                />
                <span className={styles.helpText}>
                  Se agrega un drive por equipo en cada ronda de tiempo extra.
                </span>
              </div>
              <div className={styles.field}>
                <label htmlFor="seed">Semilla (opcional)</label>
                <input
                  id="seed"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  placeholder="Ej: 2024"
                  value={configInputs.seed}
                  onChange={(event) =>
                    handleConfigNumericChange("seed", event.target.value)
                  }
                />
                <span className={styles.helpText}>Usa una semilla para reproducir el resultado.</span>
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

