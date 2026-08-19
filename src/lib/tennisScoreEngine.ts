import {
  Match,
  Set,
  Game,
  Point,
  PlayerId,
  PointContext,
  ServeSide,
  MatchFormat,
} from '../types/tennis';

export interface ScoreState {
  currentSetIndex: number;
  currentGameIndex: number;
  isTiebreak: boolean;
  setsWon: { A: number; B: number };
  gamesInCurrentSet: { A: number; B: number };
  completedSetsScore: { A: number; B: number; tb?: string }[];
  currentPoints: { A: number; B: number }; // Raw points in current game
  scoreDisplay: { A: string; B: string };  // e.g. { A: "40", B: "30" } or { A: "5", B: "4" }
  scoreBeforeString: string;               // e.g. "40-30" or "5-4"
  server: PlayerId;
  returner: PlayerId;
  serveSide: ServeSide;
  pointContext: PointContext;
  isMatchCompleted: boolean;
  matchWinner: PlayerId | null;
  tiebreakPointsSum: number;
  shouldChangeEndsTiebreak: boolean;
}

/**
 * Convert numerical game points to tennis score string
 */
export function formatGamePoint(
  ptsA: number,
  ptsB: number,
  isTiebreak: boolean
): { A: string; B: string } {
  if (isTiebreak) {
    return { A: ptsA.toString(), B: ptsB.toString() };
  }

  if (ptsA >= 3 && ptsB >= 3) {
    if (ptsA === ptsB) return { A: '40', B: '40' };
    if (ptsA === ptsB + 1) return { A: 'Ad', B: '40' };
    if (ptsB === ptsA + 1) return { A: '40', B: 'Ad' };
  }

  const pointMap = ['0', '15', '30', '40'];
  return {
    A: pointMap[Math.min(ptsA, 3)] || '40',
    B: pointMap[Math.min(ptsB, 3)] || '40',
  };
}

/**
 * Determine who serves in regular game and tie-break
 */
export function determineServer(
  firstServer: PlayerId,
  totalRegularGamesCompleted: number,
  isTiebreak: boolean,
  tiebreakPointsCompleted: number
): { server: PlayerId; returner: PlayerId } {
  const otherPlayer = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A');

  if (!isTiebreak) {
    const server = totalRegularGamesCompleted % 2 === 0 ? firstServer : otherPlayer(firstServer);
    return { server, returner: otherPlayer(server) };
  } else {
    // Tie-break initial server
    const tbInitialServer = totalRegularGamesCompleted % 2 === 0 ? firstServer : otherPlayer(firstServer);
    
    // In tiebreak:
    // Pt 0: tbInitialServer
    // Pt 1, 2: other
    // Pt 3, 4: tbInitialServer
    // Pt 5, 6: other ...
    // Rule: pt 0 is server 1. For pt N >= 1, floor((N + 1)/2) % 2 === 1 ? other : server 1
    if (tiebreakPointsCompleted === 0) {
      return { server: tbInitialServer, returner: otherPlayer(tbInitialServer) };
    }
    const rotation = Math.floor((tiebreakPointsCompleted + 1) / 2);
    const server = rotation % 2 === 1 ? otherPlayer(tbInitialServer) : tbInitialServer;
    return { server, returner: otherPlayer(server) };
  }
}

/**
 * Check if winning the next point will win the set
 */
function wouldWinSet(
  player: PlayerId,
  gamesWonA: number,
  gamesWonB: number,
  wouldWinGame: boolean,
  isTiebreak: boolean,
  ptsA: number,
  ptsB: number
): boolean {
  if (!wouldWinGame) return false;

  if (isTiebreak) {
    // Winning the tiebreak wins the set 7-6
    return true;
  }

  const playerGames = player === 'A' ? gamesWonA + 1 : gamesWonB + 1;
  const oppGames = player === 'A' ? gamesWonB : gamesWonA;

  if (playerGames >= 6 && playerGames - oppGames >= 2) return true;
  if (playerGames === 7 && oppGames === 5) return true;
  return false;
}

/**
 * Check if winning the next point will win the match
 */
function wouldWinMatch(
  player: PlayerId,
  setsWonA: number,
  setsWonB: number,
  format: MatchFormat,
  wouldWinCurSet: boolean
): boolean {
  if (!wouldWinCurSet) return false;
  const setsNeeded = format === 'best_of_5' ? 3 : 2;
  const curSets = player === 'A' ? setsWonA + 1 : setsWonB + 1;
  return curSets >= setsNeeded;
}

/**
 * Infer the Point Context automatically according to tennis rules
 */
export function inferPointContext(
  ptsA: number,
  ptsB: number,
  gamesWonA: number,
  gamesWonB: number,
  setsWonA: number,
  setsWonB: number,
  server: PlayerId,
  isTiebreak: boolean,
  matchFormat: MatchFormat
): PointContext {
  const returner = server === 'A' ? 'B' : 'A';

  // Helper: Would player win current game if they win this point?
  const checkWouldWinGame = (player: PlayerId): boolean => {
    if (isTiebreak) {
      const pPts = player === 'A' ? ptsA + 1 : ptsB + 1;
      const oPts = player === 'A' ? ptsB : ptsA;
      return pPts >= 7 && pPts - oPts >= 2;
    } else {
      const pPts = player === 'A' ? ptsA : ptsB;
      const oPts = player === 'A' ? ptsB : ptsA;
      if (pPts >= 3 && oPts < 3) return true; // 40-0, 40-15, 40-30 -> win
      if (pPts >= 3 && oPts >= 3 && pPts === oPts + 1) return true; // Ad -> win
      return false;
    }
  };

  const serverCanWinGame = checkWouldWinGame(server);
  const returnerCanWinGame = checkWouldWinGame(returner);

  // Check Match Point
  if (serverCanWinGame) {
    const winsSet = wouldWinSet(server, gamesWonA, gamesWonB, true, isTiebreak, ptsA, ptsB);
    if (wouldWinMatch(server, setsWonA, setsWonB, matchFormat, winsSet)) {
      return 'match_point';
    }
  }
  if (returnerCanWinGame) {
    const winsSet = wouldWinSet(returner, gamesWonA, gamesWonB, true, isTiebreak, ptsA, ptsB);
    if (wouldWinMatch(returner, setsWonA, setsWonB, matchFormat, winsSet)) {
      return 'match_point';
    }
  }

  // Check Set Point
  if (serverCanWinGame && wouldWinSet(server, gamesWonA, gamesWonB, true, isTiebreak, ptsA, ptsB)) {
    return 'set_point';
  }
  if (returnerCanWinGame && wouldWinSet(returner, gamesWonA, gamesWonB, true, isTiebreak, ptsA, ptsB)) {
    return 'set_point';
  }

  // Check Break Point (Returner can win regular game)
  if (returnerCanWinGame && !isTiebreak) {
    return 'break_point';
  }

  // Check Game Point (Server can win regular game)
  if (serverCanWinGame && !isTiebreak) {
    return 'game_point';
  }

  // Deuce
  if (!isTiebreak && ptsA >= 3 && ptsB >= 3 && ptsA === ptsB) {
    return 'deuce';
  }

  return 'regular';
}

/**
 * Calculate full current score state from a Match structure
 */
export function calculateScoreState(match: Match): ScoreState {
  const firstServer = match.first_server || 'A';
  const sets = match.sets || [];
  const format = match.match_format || 'best_of_3';
  const setsNeeded = format === 'best_of_5' ? 3 : 2;

  let setsWonA = 0;
  let setsWonB = 0;
  let totalRegularGames = 0;
  const completedSetsScore: { A: number; B: number; tb?: string }[] = [];

  let currentSetIndex = Math.max(0, sets.length - 1);
  let currentGameIndex = 0;
  let isTiebreak = false;
  let gamesA = 0;
  let gamesB = 0;
  let ptsA = 0;
  let ptsB = 0;

  // Process completed & current sets
  for (let sIdx = 0; sIdx < sets.length; sIdx++) {
    const set = sets[sIdx];
    const isCurrentSet = sIdx === sets.length - 1;
    let setGamesA = 0;
    let setGamesB = 0;

    for (let gIdx = 0; gIdx < set.games.length; gIdx++) {
      const game = set.games[gIdx];
      const isCurrentGame = isCurrentSet && gIdx === set.games.length - 1;

      if (!game.is_tiebreak) {
        totalRegularGames++;
      }

      // Count points in game
      let gPtsA = 0;
      let gPtsB = 0;
      for (const pt of game.points) {
        if (pt.winner === 'A') gPtsA++;
        else if (pt.winner === 'B') gPtsB++;
      }

      if (isCurrentGame) {
        currentGameIndex = gIdx;
        isTiebreak = game.is_tiebreak;
        ptsA = gPtsA;
        ptsB = gPtsB;
      } else {
        // Game already decided
        if (game.is_tiebreak) {
          if (gPtsA > gPtsB) setGamesA++;
          else setGamesB++;
        } else {
          // Normal game
          if (gPtsA > gPtsB) setGamesA++;
          else setGamesB++;
        }
      }
    }

    if (!isCurrentSet) {
      if (setGamesA > setGamesB) setsWonA++;
      else setsWonB++;
      completedSetsScore.push({ A: setGamesA, B: setGamesB });
    } else {
      gamesA = setGamesA;
      gamesB = setGamesB;
    }
  }

  // Check if match is already completed
  const isMatchCompleted = setsWonA >= setsNeeded || setsWonB >= setsNeeded;
  const matchWinner = setsWonA >= setsNeeded ? 'A' : setsWonB >= setsNeeded ? 'B' : null;

  // Total points in current game
  const ptsSum = ptsA + ptsB;

  // Serve side: even -> deuce, odd -> ad
  const serveSide: ServeSide = ptsSum % 2 === 0 ? 'deuce' : 'ad';

  // Server rotation
  const { server, returner } = determineServer(
    firstServer,
    totalRegularGames - (isTiebreak ? 0 : 1), // games prior to current
    isTiebreak,
    ptsSum
  );

  const scoreDisplay = formatGamePoint(ptsA, ptsB, isTiebreak);
  const scoreBeforeString = `${scoreDisplay.A}-${scoreDisplay.B}`;

  const pointContext = isMatchCompleted
    ? 'regular'
    : inferPointContext(
        ptsA,
        ptsB,
        gamesA,
        gamesB,
        setsWonA,
        setsWonB,
        server,
        isTiebreak,
        format
      );

  const shouldChangeEndsTiebreak = isTiebreak && ptsSum > 0 && ptsSum % 6 === 0;

  return {
    currentSetIndex,
    currentGameIndex,
    isTiebreak,
    setsWon: { A: setsWonA, B: setsWonB },
    gamesInCurrentSet: { A: gamesA, B: gamesB },
    completedSetsScore,
    currentPoints: { A: ptsA, B: ptsB },
    scoreDisplay,
    scoreBeforeString,
    server,
    returner,
    serveSide,
    pointContext,
    isMatchCompleted,
    matchWinner,
    tiebreakPointsSum: ptsSum,
    shouldChangeEndsTiebreak,
  };
}

/**
 * Add a Point to a Match and advance games/sets cleanly
 */
export function recordPointInMatch(match: Match, newPoint: Point): Match {
  const updatedMatch: Match = JSON.parse(JSON.stringify(match));
  const format = updatedMatch.match_format || 'best_of_3';
  const setsNeeded = format === 'best_of_5' ? 3 : 2;

  // Ensure structure
  if (!updatedMatch.sets || updatedMatch.sets.length === 0) {
    updatedMatch.sets = [{
      set_number: 1,
      games: [{
        game_number: 1,
        is_tiebreak: false,
        points: [],
      }],
    }];
  }

  const curSet = updatedMatch.sets[updatedMatch.sets.length - 1];
  let curGame = curSet.games[curSet.games.length - 1];

  // Append point
  curGame.points.push(newPoint);

  // Check if current game is won
  let ptsA = 0;
  let ptsB = 0;
  for (const p of curGame.points) {
    if (p.winner === 'A') ptsA++;
    else if (p.winner === 'B') ptsB++;
  }

  let gameWonBy: PlayerId | null = null;
  if (curGame.is_tiebreak) {
    if (ptsA >= 7 && ptsA - ptsB >= 2) gameWonBy = 'A';
    else if (ptsB >= 7 && ptsB - ptsA >= 2) gameWonBy = 'B';
  } else {
    if (ptsA >= 4 && ptsA - ptsB >= 2) gameWonBy = 'A';
    else if (ptsB >= 4 && ptsB - ptsA >= 2) gameWonBy = 'B';
  }

  if (gameWonBy) {
    // Game won! Check if set is won
    let setGamesA = 0;
    let setGamesB = 0;

    for (const g of curSet.games) {
      let gA = 0;
      let gB = 0;
      for (const p of g.points) {
        if (p.winner === 'A') gA++;
        else if (p.winner === 'B') gB++;
      }
      if (g.is_tiebreak) {
        if (gA > gB) setGamesA++;
        else setGamesB++;
      } else {
        if (gA >= 4 && gA - gB >= 2) setGamesA++;
        else if (gB >= 4 && gB - gA >= 2) setGamesB++;
      }
    }

    let setWonBy: PlayerId | null = null;
    if (curGame.is_tiebreak) {
      setWonBy = gameWonBy;
    } else {
      if (setGamesA >= 6 && setGamesA - setGamesB >= 2) setWonBy = 'A';
      else if (setGamesB >= 6 && setGamesB - setGamesA >= 2) setWonBy = 'B';
      else if (setGamesA === 7 && setGamesB === 5) setWonBy = 'A';
      else if (setGamesB === 7 && setGamesA === 5) setWonBy = 'B';
    }

    if (setWonBy) {
      // Check if match won
      let setsWonA = 0;
      let setsWonB = 0;

      for (let i = 0; i < updatedMatch.sets.length; i++) {
        const s = updatedMatch.sets[i];
        let sA = 0;
        let sB = 0;
        for (const g of s.games) {
          let gA = 0;
          let gB = 0;
          for (const p of g.points) {
            if (p.winner === 'A') gA++;
            else if (p.winner === 'B') gB++;
          }
          if (gA > gB) sA++;
          else if (gB > gA) sB++;
        }
        if (sA > sB) setsWonA++;
        else if (sB > sA) setsWonB++;
      }

      if (setsWonA >= setsNeeded || setsWonB >= setsNeeded) {
        updatedMatch.is_completed = true;
        updatedMatch.winner = setsWonA >= setsNeeded ? 'A' : 'B';
      } else {
        // Start next set!
        updatedMatch.sets.push({
          set_number: updatedMatch.sets.length + 1,
          games: [{
            game_number: 1,
            is_tiebreak: false,
            points: [],
          }],
        });
      }
    } else {
      // Set not finished yet, start next game
      const isNextTiebreak = setGamesA === 6 && setGamesB === 6;
      curSet.games.push({
        game_number: isNextTiebreak ? null : curSet.games.length + 1,
        is_tiebreak: isNextTiebreak,
        points: [],
      });
    }
  }

  updatedMatch.updated_at = new Date().toISOString();
  return updatedMatch;
}

/**
 * Helper to initialize a brand new clean match
 */
export function createNewMatch(
  playerAName: string,
  playerBName: string,
  matchFormat: MatchFormat = 'best_of_3',
  surface = 'Hard',
  firstServer: PlayerId = 'A',
  notes = ''
): Match {
  const now = new Date().toISOString();
  return {
    match_id: Date.now(),
    players: {
      player_a: { name: playerAName.trim() || 'Jugador A' },
      player_b: { name: playerBName.trim() || 'Jugador B' },
    },
    match_format: matchFormat,
    surface,
    date: now.split('T')[0],
    notes,
    first_server: firstServer,
    is_completed: false,
    winner: null,
    created_at: now,
    updated_at: now,
    sets: [
      {
        set_number: 1,
        games: [
          {
            game_number: 1,
            is_tiebreak: false,
            points: [],
          },
        ],
      },
    ],
  };
}
