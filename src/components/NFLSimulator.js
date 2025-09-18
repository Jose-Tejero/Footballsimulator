import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { DriveResult, simulateGame } from "./simulation";
import styles from "./NFLSimulator.module.css";
const formatDriveLabel = (drive, index) => {
  const prefix = `Drive ${index + 1}`;
  if (drive.result === DriveResult.NONE) {
    return `${prefix}: sin puntos`;
  }
  const label = drive.result === DriveResult.TD ? "TD" : "FG";
  return `${prefix}: ${label} (${drive.points} pts)`;
};
const NFLSimulator = () => {
  const [homeInputs, setHomeInputs] = useState({
    offPtsDrive: "2.5",
    defPtsDrive: "2.2",
  });
  const [awayInputs, setAwayInputs] = useState({
    offPtsDrive: "2.3",
    defPtsDrive: "2.4",
  });
  const [configInputs, setConfigInputs] = useState({
    drivesPerTeam: "12",
    allowTies: true,
    overtimeEnabled: true,
    maxRounds: "3",
    seed: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [usedConfig, setUsedConfig] = useState(null);
  const [usedSeed, setUsedSeed] = useState(undefined);
  const handleTeamInputChange = (team, field, value) => {
    setError(null);
    if (team === "home") {
      setHomeInputs((prev) => ({ ...prev, [field]: value }));
    } else {
      setAwayInputs((prev) => ({ ...prev, [field]: value }));
    }
  };
  const handleConfigNumericChange = (field, value) => {
    setError(null);
    setConfigInputs((prev) => ({ ...prev, [field]: value }));
  };
  const parseTeamStats = (inputs, label) => {
    const off = Number.parseFloat(inputs.offPtsDrive);
    const def = Number.parseFloat(inputs.defPtsDrive);
    if (Number.isNaN(off)) {
      throw new Error(
        `Ingresa un numero valido para el promedio ofensivo (${label}).`
      );
    }
    if (Number.isNaN(def)) {
      throw new Error(
        `Ingresa un numero valido para el promedio defensivo (${label}).`
      );
    }
    return {
      offPtsDrive: off,
      defPtsDrive: def,
    };
  };
  const buildGameConfig = () => {
    const drives = Number.parseInt(configInputs.drivesPerTeam, 10);
    if (Number.isNaN(drives) || drives <= 0) {
      throw new Error("Drives por equipo debe ser un entero positivo.");
    }
    const allowTies = configInputs.allowTies;
    let maxRounds;
    if (configInputs.maxRounds.trim().length > 0) {
      const parsedMax = Number.parseInt(configInputs.maxRounds, 10);
      if (Number.isNaN(parsedMax) || parsedMax <= 0) {
        throw new Error("Rondas de OT debe ser un entero positivo.");
      }
      maxRounds = parsedMax;
    }
    let seedValue;
    if (configInputs.seed.trim().length > 0) {
      const parsedSeed = Number.parseInt(configInputs.seed, 10);
      if (Number.isNaN(parsedSeed)) {
        throw new Error("La semilla debe ser un numero entero.");
      }
      seedValue = parsedSeed;
    }
    const overtimeEnabled = !allowTies && configInputs.overtimeEnabled;
    const gameConfig = {
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
      setError(
        err instanceof Error ? err.message : "Ocurrio un error inesperado"
      );
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
  return _jsxs("div", {
    className: styles.container,
    children: [
      _jsx("h1", {
        className: styles.heading,
        children: "Simulador NFL por Drive",
      }),
      _jsxs("div", {
        className: styles.formSection,
        children: [
          _jsxs("div", {
            className: styles.card,
            children: [
              _jsx("h2", {
                className: styles.cardTitle,
                children: "Equipo local",
              }),
              _jsxs("div", {
                className: styles.field,
                children: [
                  _jsx("label", {
                    htmlFor: "home-off",
                    children: "Promedio ofensivo (pts/drive)",
                  }),
                  _jsx("input", {
                    id: "home-off",
                    type: "number",
                    step: "0.1",
                    inputMode: "decimal",
                    placeholder: "Ej: 2.5",
                    value: homeInputs.offPtsDrive,
                    onChange: (event) =>
                      handleTeamInputChange(
                        "home",
                        "offPtsDrive",
                        event.target.value
                      ),
                  }),
                  _jsx("span", {
                    className: styles.helpText,
                    children: "Promedio ofensivo por drive.",
                  }),
                ],
              }),
              _jsxs("div", {
                className: styles.field,
                children: [
                  _jsx("label", {
                    htmlFor: "home-def",
                    children: "Promedio defensivo (pts/drive)",
                  }),
                  _jsx("input", {
                    id: "home-def",
                    type: "number",
                    step: "0.1",
                    inputMode: "decimal",
                    placeholder: "Ej: 2.2",
                    value: homeInputs.defPtsDrive,
                    onChange: (event) =>
                      handleTeamInputChange(
                        "home",
                        "defPtsDrive",
                        event.target.value
                      ),
                  }),
                  _jsx("span", {
                    className: styles.helpText,
                    children: "Puntos permitidos por drive.",
                  }),
                ],
              }),
            ],
          }),
          _jsxs("div", {
            className: styles.card,
            children: [
              _jsx("h2", {
                className: styles.cardTitle,
                children: "Equipo visitante",
              }),
              _jsxs("div", {
                className: styles.field,
                children: [
                  _jsx("label", {
                    htmlFor: "away-off",
                    children: "Promedio ofensivo (pts/drive)",
                  }),
                  _jsx("input", {
                    id: "away-off",
                    type: "number",
                    step: "0.1",
                    inputMode: "decimal",
                    placeholder: "Ej: 2.3",
                    value: awayInputs.offPtsDrive,
                    onChange: (event) =>
                      handleTeamInputChange(
                        "away",
                        "offPtsDrive",
                        event.target.value
                      ),
                  }),
                  _jsx("span", {
                    className: styles.helpText,
                    children: "Promedio ofensivo por drive.",
                  }),
                ],
              }),
              _jsxs("div", {
                className: styles.field,
                children: [
                  _jsx("label", {
                    htmlFor: "away-def",
                    children: "Promedio defensivo (pts/drive)",
                  }),
                  _jsx("input", {
                    id: "away-def",
                    type: "number",
                    step: "0.1",
                    inputMode: "decimal",
                    placeholder: "Ej: 2.4",
                    value: awayInputs.defPtsDrive,
                    onChange: (event) =>
                      handleTeamInputChange(
                        "away",
                        "defPtsDrive",
                        event.target.value
                      ),
                  }),
                  _jsx("span", {
                    className: styles.helpText,
                    children: "Puntos permitidos por drive.",
                  }),
                ],
              }),
            ],
          }),
          _jsxs("div", {
            className: styles.card,
            children: [
              _jsx("h2", {
                className: styles.cardTitle,
                children: "Configuracion del partido",
              }),
              _jsxs("div", {
                className: styles.field,
                children: [
                  _jsx("label", {
                    htmlFor: "drives",
                    children: "Drives por equipo",
                  }),
                  _jsx("input", {
                    id: "drives",
                    type: "number",
                    min: "1",
                    step: "1",
                    inputMode: "numeric",
                    placeholder: "Ej: 12",
                    value: configInputs.drivesPerTeam,
                    onChange: (event) =>
                      handleConfigNumericChange(
                        "drivesPerTeam",
                        event.target.value
                      ),
                  }),
                ],
              }),
              _jsxs("div", {
                className: styles.checkboxRow,
                children: [
                  _jsx("input", {
                    id: "ties",
                    type: "checkbox",
                    checked: configInputs.allowTies,
                    onChange: (event) => {
                      setError(null);
                      const allowTies = event.target.checked;
                      setConfigInputs((prev) => ({
                        ...prev,
                        allowTies,
                        overtimeEnabled: allowTies
                          ? false
                          : prev.overtimeEnabled || true,
                      }));
                    },
                  }),
                  _jsx("label", {
                    htmlFor: "ties",
                    children: "Permitir empates",
                  }),
                ],
              }),
              _jsxs("div", {
                className: styles.checkboxRow,
                children: [
                  _jsx("input", {
                    id: "ot",
                    type: "checkbox",
                    checked: configInputs.overtimeEnabled,
                    disabled: configInputs.allowTies,
                    onChange: (event) => {
                      setError(null);
                      setConfigInputs((prev) => ({
                        ...prev,
                        overtimeEnabled: event.target.checked,
                      }));
                    },
                  }),
                  _jsx("label", {
                    htmlFor: "ot",
                    children: "Activar tiempo extra",
                  }),
                ],
              }),
              _jsxs("div", {
                className: styles.field,
                children: [
                  _jsx("label", {
                    htmlFor: "ot-rounds",
                    children: "Rondas maximas de OT",
                  }),
                  _jsx("input", {
                    id: "ot-rounds",
                    type: "number",
                    min: "1",
                    step: "1",
                    inputMode: "numeric",
                    placeholder: "Ej: 3",
                    value: configInputs.maxRounds,
                    onChange: (event) =>
                      handleConfigNumericChange(
                        "maxRounds",
                        event.target.value
                      ),
                    disabled:
                      configInputs.allowTies || !configInputs.overtimeEnabled,
                  }),
                  _jsx("span", {
                    className: styles.helpText,
                    children:
                      "Se agrega un drive por equipo en cada ronda de tiempo extra.",
                  }),
                ],
              }),
              _jsxs("div", {
                className: styles.field,
                children: [
                  _jsx("label", {
                    htmlFor: "seed",
                    children: "Semilla (opcional)",
                  }),
                  _jsx("input", {
                    id: "seed",
                    type: "number",
                    step: "1",
                    inputMode: "numeric",
                    placeholder: "Ej: 2024",
                    value: configInputs.seed,
                    onChange: (event) =>
                      handleConfigNumericChange("seed", event.target.value),
                  }),
                  _jsx("span", {
                    className: styles.helpText,
                    children: "Usa una semilla para reproducir el resultado.",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsx("button", {
        className: styles.button,
        type: "button",
        onClick: handleSimulate,
        children: "Simular partido",
      }),
      error && _jsx("div", { className: styles.error, children: error }),
      result &&
        _jsxs("div", {
          className: styles.resultsSection,
          children: [
            _jsxs("div", {
              className: styles.scoreboard,
              children: [
                _jsxs("div", {
                  className: styles.scoreBlock,
                  children: [
                    _jsx("span", {
                      className: styles.scoreLabel,
                      children: "Local",
                    }),
                    _jsx("span", {
                      className: styles.scoreValue,
                      children: result.homeScore,
                    }),
                  ],
                }),
                _jsxs("div", {
                  className: styles.scoreBlock,
                  children: [
                    _jsx("span", {
                      className: styles.scoreLabel,
                      children: "Visitante",
                    }),
                    _jsx("span", {
                      className: styles.scoreValue,
                      children: result.awayScore,
                    }),
                  ],
                }),
              ],
            }),
            usedSeed !== undefined &&
              _jsxs("div", {
                className: styles.info,
                children: ["Semilla utilizada: ", usedSeed],
              }),
            _jsxs("div", {
              className: styles.drivesContainer,
              children: [
                _jsxs("div", {
                  className: styles.driveList,
                  children: [
                    _jsx("h3", { children: "Drives local" }),
                    _jsx("ul", {
                      children: result.homeDrives.map((drive, index) =>
                        _jsx(
                          "li",
                          {
                            className: styles.driveItem,
                            children: formatDriveLabel(drive, index),
                          },
                          `home-drive-${index}`
                        )
                      ),
                    }),
                  ],
                }),
                _jsxs("div", {
                  className: styles.driveList,
                  children: [
                    _jsx("h3", { children: "Drives visitante" }),
                    _jsx("ul", {
                      children: result.awayDrives.map((drive, index) =>
                        _jsx(
                          "li",
                          {
                            className: styles.driveItem,
                            children: formatDriveLabel(drive, index),
                          },
                          `away-drive-${index}`
                        )
                      ),
                    }),
                  ],
                }),
              ],
            }),
            _jsxs("div", {
              className: styles.summaryCard,
              children: [
                _jsx("h3", { children: "Resumen de anotaciones" }),
                _jsxs("p", {
                  children: [
                    _jsx("strong", { children: "Local:" }),
                    " ",
                    result.summary.homeTDs,
                    " TD / ",
                    result.summary.homeFGs,
                    " FG",
                  ],
                }),
                _jsxs("p", {
                  children: [
                    _jsx("strong", { children: "Visitante:" }),
                    " ",
                    result.summary.awayTDs,
                    " TD / ",
                    result.summary.awayFGs,
                    " FG",
                  ],
                }),
                _jsx("p", {
                  className: styles.info,
                  children:
                    overtimeInfo.wasApplied && usedConfig
                      ? _jsxs(_Fragment, {
                          children: [
                            "Se jugaron ",
                            overtimeInfo.rounds,
                            " rondas de tiempo extra.",
                            overtimeInfo.capped &&
                              usedConfig.maxRounds &&
                              _jsxs(_Fragment, {
                                children: [
                                  " Empate tras agotar ",
                                  usedConfig.maxRounds,
                                  " rondas.",
                                ],
                              }),
                          ],
                        })
                      : _jsx(_Fragment, {
                          children: "No fue necesario tiempo extra.",
                        }),
                }),
              ],
            }),
          ],
        }),
    ],
  });
};
export default NFLSimulator;
