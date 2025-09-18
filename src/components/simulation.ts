export interface TeamStats {
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  yardsPerPlay: number;
  turnoverRate: number;
}

export interface TeamSimulationDetail {
  expectedPoints: number;
  variation: number;
  turnoverPenalty: number;
  rawProjection: number;
  finalPoints: number;
  overtimePoints: number[];
}

export interface OvertimeResult {
  rounds: number;
  homePoints: number[];
  awayPoints: number[];
  tiebreakApplied: "expected" | "home" | null;
}

export interface SimulationResult {
  homeScore: number;
  awayScore: number;
  homeDetail: TeamSimulationDetail;
  awayDetail: TeamSimulationDetail;
  overtime?: OvertimeResult;
}

export interface GameConfig {
  seed?: number;
  allowTies?: boolean;
  maxOtRounds?: number;
  otScale?: number;
  tiebreakPolicy?: "expected" | "home";
}

type RandomFn = () => number;

const TURNOVER_PENALTY_FACTOR = 2;
const TURNOVER_PENALTY_FACTOR_OT = 0.8;
const DEFAULT_ALLOW_TIES = false;
const DEFAULT_MAX_OT_ROUNDS = 3;
const DEFAULT_OT_SCALE = 0.25;
const DEFAULT_TIEBREAK_POLICY: "expected" | "home" = "expected";

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const createRandomGenerator = (seed?: number): RandomFn => {
  if (typeof seed !== "number" || Number.isNaN(seed)) {
    return Math.random;
  }

  let state = Math.floor(seed) % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const randomGaussian = (rng: RandomFn, mean = 0, stdDev = 1): number => {
  let u = 0;
  let v = 0;

  while (u === 0) {
    u = rng();
  }

  while (v === 0) {
    v = rng();
  }

  const magnitude = Math.sqrt(-2.0 * Math.log(u));
  const angle = 2.0 * Math.PI * v;
  const standard = magnitude * Math.cos(angle);
  return mean + standard * Math.max(stdDev, 0);
};

const ensureNonNegative = (label: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un numero mayor o igual a 0.`);
  }
};

const ensurePositive = (label: string, value: number): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} debe ser un numero mayor que 0.`);
  }
};

const calculateTeamDetail = (
  team: TeamStats,
  opponent: TeamStats,
  rng: RandomFn,
): TeamSimulationDetail => {
  ensureNonNegative("pointsPerGame", team.pointsPerGame);
  ensureNonNegative("pointsAllowedPerGame", team.pointsAllowedPerGame);
  ensurePositive("yardsPerPlay", team.yardsPerPlay);
  ensureNonNegative("turnoverRate", team.turnoverRate);
  ensureNonNegative("pointsAllowedPerGame", opponent.pointsAllowedPerGame);

  const expected = (team.pointsPerGame + opponent.pointsAllowedPerGame) / 2;
  const variation = randomGaussian(rng, 0, Math.max(0.1, team.yardsPerPlay * 0.5));
  const turnoverPenalty = team.turnoverRate * TURNOVER_PENALTY_FACTOR;
  const rawProjection = expected + variation - turnoverPenalty;
  const finalPoints = Math.max(0, Math.round(rawProjection));

  return {
    expectedPoints: expected,
    variation,
    turnoverPenalty,
    rawProjection,
    finalPoints,
    overtimePoints: [],
  };
};

/**
 * Calcula los puntos anotados por un equipo en una ronda de tiempo extra.
 * Usa una fracción del esperado en tiempo regular, con menor varianza y penalización reducida.
 */
const simulateOtPoints = (
  expectedReg: number,
  ypp: number,
  turnoverRate: number,
  scale: number,
  rng: RandomFn,
): number => {
  ensureNonNegative("expectedReg", expectedReg);
  ensurePositive("ypp", ypp);
  ensureNonNegative("turnoverRate", turnoverRate);

  const safeScale = clamp(Number.isFinite(scale) ? scale : DEFAULT_OT_SCALE, 0, 1);
  const expectedOT = clamp(expectedReg * safeScale, 0, 12);
  const variation = randomGaussian(rng, 0, Math.max(0.1, ypp * 0.25));
  const penalty = turnoverRate * TURNOVER_PENALTY_FACTOR_OT;
  const projection = expectedOT + variation - penalty;

  return Math.max(0, Math.round(projection));
};

export const simulateGame = (
  home: TeamStats,
  away: TeamStats,
  config: GameConfig = {},
): SimulationResult => {
  const rng = createRandomGenerator(config.seed);

  const allowTies = config.allowTies ?? DEFAULT_ALLOW_TIES;
  const maxOtRounds = Number.isFinite(config.maxOtRounds)
    ? Math.max(0, Math.floor(config.maxOtRounds as number))
    : DEFAULT_MAX_OT_ROUNDS;
  const otScale = config.otScale ?? DEFAULT_OT_SCALE;
  const tiebreakPolicy = config.tiebreakPolicy ?? DEFAULT_TIEBREAK_POLICY;

  const homeDetail = calculateTeamDetail(home, away, rng);
  const awayDetail = calculateTeamDetail(away, home, rng);

  let homeScore = homeDetail.finalPoints;
  let awayScore = awayDetail.finalPoints;

  const overtimePointsHome: number[] = [];
  const overtimePointsAway: number[] = [];
  let roundsPlayed = 0;
  let tiebreakApplied: "expected" | "home" | null = null;

  if (!allowTies && homeScore === awayScore) {
    // Ejecuta rondas de tiempo extra hasta encontrar un ganador o agotar el limite configurado.
    while (homeScore === awayScore && roundsPlayed < maxOtRounds) {
      const homeOt = simulateOtPoints(
        homeDetail.expectedPoints,
        home.yardsPerPlay,
        home.turnoverRate,
        otScale,
        rng,
      );
      const awayOt = simulateOtPoints(
        awayDetail.expectedPoints,
        away.yardsPerPlay,
        away.turnoverRate,
        otScale,
        rng,
      );

      overtimePointsHome.push(homeOt);
      overtimePointsAway.push(awayOt);
      homeScore += homeOt;
      awayScore += awayOt;
      roundsPlayed += 1;
    }

    if (homeScore === awayScore) {
      tiebreakApplied = tiebreakPolicy;
      if (tiebreakPolicy === "expected") {
        if (homeDetail.expectedPoints > awayDetail.expectedPoints) {
          homeScore += 1;
        } else if (awayDetail.expectedPoints > homeDetail.expectedPoints) {
          awayScore += 1;
        } else {
          homeScore += 1;
        }
      } else {
        homeScore += 1;
      }
    }
  }

  const overtime: OvertimeResult | undefined =
    roundsPlayed > 0 || tiebreakApplied !== null
      ? {
          rounds: roundsPlayed,
          homePoints: overtimePointsHome,
          awayPoints: overtimePointsAway,
          tiebreakApplied,
        }
      : undefined;

  return {
    homeScore,
    awayScore,
    homeDetail: { ...homeDetail, overtimePoints: overtimePointsHome.slice() },
    awayDetail: { ...awayDetail, overtimePoints: overtimePointsAway.slice() },
    overtime,
  };
};
