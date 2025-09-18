export var DriveResult;
(function (DriveResult) {
    DriveResult["TD"] = "TD";
    DriveResult["FG"] = "FG";
    DriveResult["NONE"] = "NONE";
})(DriveResult || (DriveResult = {}));
const MIN_POINTS_PER_DRIVE = 0.2;
const MAX_POINTS_PER_DRIVE = 4.0;
const MAX_SCORING_PROBABILITY = 0.85;
const BASE_SCORING_MULTIPLIER = 0.4;
const DEFAULT_DRIVES_PER_TEAM = 12;
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
const createRandomGenerator = (seed) => {
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
const validatePointsPerDrive = (label, value) => {
    if (!(value > 0)) {
        throw new Error(`${label} must be greater than 0`);
    }
};
/**
 * Simula un drive individual en base a la eficiencia ofensiva propia y la defensa rival.
 */
export const simulateDrive = (offensePtsDrive, defensePtsDrive, rng = Math.random) => {
    validatePointsPerDrive("offensePtsDrive", offensePtsDrive);
    validatePointsPerDrive("defensePtsDrive", defensePtsDrive);
    const offense = clamp(offensePtsDrive, MIN_POINTS_PER_DRIVE, MAX_POINTS_PER_DRIVE);
    const defense = clamp(defensePtsDrive, MIN_POINTS_PER_DRIVE, MAX_POINTS_PER_DRIVE);
    const offensiveFactor = offense / defense;
    const scoringProbability = clamp(BASE_SCORING_MULTIPLIER * offensiveFactor, 0, MAX_SCORING_PROBABILITY);
    if (rng() < scoringProbability) {
        return rng() < 0.75
            ? { result: DriveResult.TD, points: 7 }
            : { result: DriveResult.FG, points: 3 };
    }
    return { result: DriveResult.NONE, points: 0 };
};
/**
 * Simula un partido completo, alternando drives entre local y visitante.
 */
export const simulateGame = (home, away, config = {}) => {
    const rng = createRandomGenerator(config.seed);
    const drivesPerTeam = config.drivesPerTeam ?? DEFAULT_DRIVES_PER_TEAM;
    const allowTies = config.allowTies ?? true;
    const overtimeConfig = config.overtime;
    if (!(drivesPerTeam > 0)) {
        throw new Error("drivesPerTeam must be greater than 0");
    }
    const homeDrives = [];
    const awayDrives = [];
    let homeScore = 0;
    let awayScore = 0;
    const summary = {
        homeTDs: 0,
        homeFGs: 0,
        awayTDs: 0,
        awayFGs: 0,
    };
    const recordOutcome = (team, outcome) => {
        if (team === "home") {
            homeDrives.push(outcome);
            homeScore += outcome.points;
            if (outcome.result === DriveResult.TD)
                summary.homeTDs += 1;
            if (outcome.result === DriveResult.FG)
                summary.homeFGs += 1;
        }
        else {
            awayDrives.push(outcome);
            awayScore += outcome.points;
            if (outcome.result === DriveResult.TD)
                summary.awayTDs += 1;
            if (outcome.result === DriveResult.FG)
                summary.awayFGs += 1;
        }
    };
    for (let i = 0; i < drivesPerTeam; i += 1) {
        recordOutcome("home", simulateDrive(home.offPtsDrive, away.defPtsDrive, rng));
        recordOutcome("away", simulateDrive(away.offPtsDrive, home.defPtsDrive, rng));
    }
    const overtimeEnabled = !allowTies && (overtimeConfig?.enabled ?? true);
    const maxOvertimeRounds = overtimeConfig?.maxRounds ?? (overtimeEnabled ? 6 : 0);
    let roundsPlayed = 0;
    while (overtimeEnabled && homeScore === awayScore) {
        if (Number.isFinite(maxOvertimeRounds) && roundsPlayed >= maxOvertimeRounds) {
            break;
        }
        roundsPlayed += 1;
        recordOutcome("home", simulateDrive(home.offPtsDrive, away.defPtsDrive, rng));
        recordOutcome("away", simulateDrive(away.offPtsDrive, home.defPtsDrive, rng));
    }
    return {
        homeScore,
        awayScore,
        homeDrives,
        awayDrives,
        summary,
    };
};
