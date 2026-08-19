import { Match, PlayerId, Point } from '../types/tennis';

export interface PlayerStats {
  playerId: PlayerId;
  name: string;
  totalPointsWon: number;
  totalPointsPlayed: number;
  
  // Serve
  servesAttempted: number;
  firstServesAttempted: number;
  firstServesIn: number;
  firstServePercentage: number;
  firstServePointsWon: number;
  firstServeWonPercentage: number;
  secondServesAttempted: number;
  secondServesWon: number;
  secondServeWonPercentage: number;
  aces: number;
  doubleFaults: number;
  serveZones: {
    wide: number;
    body: number;
    t: number;
  };

  // Return
  firstServeReturnWon: number;
  firstServeReturnTotal: number;
  secondServeReturnWon: number;
  secondServeReturnTotal: number;
  returnWinners: number;
  returnErrors: number;
  returnByStroke: {
    forehand: number;
    backhand: number;
    block_slice: number;
  };

  // Point Endings
  winners: number;
  winnersByStroke: {
    forehand: number;
    backhand: number;
    volley: number;
    drop_shot: number;
    return_winner: number;
  };
  unforcedErrors: number;
  unforcedErrorsByStroke: {
    forehand: number;
    backhand: number;
    slice: number;
    volley: number;
    smash: number;
    return_error: number;
  };
  forcedErrors: number;

  // Key Situations
  breakPointsConverted: number;
  breakPointsOpportunities: number;
  breakPointsSaved: number;
  breakPointsFaced: number;

  // Rally Length Performance
  rallyLengthWon: {
    short_1_3: number;
    medium_4_6: number;
    long_7_9: number;
    extended_10_plus: number;
  };
}

export interface MatchAggregatedStats {
  totalPoints: number;
  durationMinutes: number;
  playerA: PlayerStats;
  playerB: PlayerStats;
  allPointsWithCoords: Point[];
}

function initPlayerStats(playerId: PlayerId, name: string): PlayerStats {
  return {
    playerId,
    name,
    totalPointsWon: 0,
    totalPointsPlayed: 0,
    servesAttempted: 0,
    firstServesAttempted: 0,
    firstServesIn: 0,
    firstServePercentage: 0,
    firstServePointsWon: 0,
    firstServeWonPercentage: 0,
    secondServesAttempted: 0,
    secondServesWon: 0,
    secondServeWonPercentage: 0,
    aces: 0,
    doubleFaults: 0,
    serveZones: { wide: 0, body: 0, t: 0 },
    firstServeReturnWon: 0,
    firstServeReturnTotal: 0,
    secondServeReturnWon: 0,
    secondServeReturnTotal: 0,
    returnWinners: 0,
    returnErrors: 0,
    returnByStroke: { forehand: 0, backhand: 0, block_slice: 0 },
    winners: 0,
    winnersByStroke: { forehand: 0, backhand: 0, volley: 0, drop_shot: 0, return_winner: 0 },
    unforcedErrors: 0,
    unforcedErrorsByStroke: { forehand: 0, backhand: 0, slice: 0, volley: 0, smash: 0, return_error: 0 },
    forcedErrors: 0,
    breakPointsConverted: 0,
    breakPointsOpportunities: 0,
    breakPointsSaved: 0,
    breakPointsFaced: 0,
    rallyLengthWon: { short_1_3: 0, medium_4_6: 0, long_7_9: 0, extended_10_plus: 0 },
  };
}

export function computeMatchStats(match: Match): MatchAggregatedStats {
  const pA = initPlayerStats('A', match.players.player_a.name);
  const pB = initPlayerStats('B', match.players.player_b.name);

  const allPoints: Point[] = [];

  for (const set of match.sets || []) {
    for (const game of set.games || []) {
      for (const pt of game.points || []) {
        allPoints.push(pt);
      }
    }
  }

  for (const pt of allPoints) {
    const sObj = pt.server === 'A' ? pA : pB;
    const rObj = pt.returner === 'A' ? pA : pB;
    const wObj = pt.winner === 'A' ? pA : pB;

    pA.totalPointsPlayed++;
    pB.totalPointsPlayed++;
    wObj.totalPointsWon++;

    // Serve Tracking
    sObj.servesAttempted++;
    if (pt.serve_type === 1) {
      sObj.firstServesAttempted++;
      // In if not double fault
      if (pt.serve_result !== 'double_fault') {
        sObj.firstServesIn++;
        if (pt.winner === pt.server) {
          sObj.firstServePointsWon++;
        } else {
          rObj.firstServeReturnWon++;
        }
        rObj.firstServeReturnTotal++;
      }
    } else {
      // 2nd serve
      sObj.secondServesAttempted++;
      if (pt.serve_result !== 'double_fault') {
        if (pt.winner === pt.server) {
          sObj.secondServesWon++;
        } else {
          rObj.secondServeReturnWon++;
        }
        rObj.secondServeReturnTotal++;
      }
    }

    if (pt.serve_result === 'ace') {
      sObj.aces++;
      sObj.winners++;
    } else if (pt.serve_result === 'double_fault') {
      sObj.doubleFaults++;
      sObj.unforcedErrors++;
    }

    // Serve zones
    if (pt.derived_serve_zone) {
      if (pt.derived_serve_zone === 'wide') sObj.serveZones.wide++;
      else if (pt.derived_serve_zone === 'body') sObj.serveZones.body++;
      else if (pt.derived_serve_zone === 't') sObj.serveZones.t++;
    }

    // Point Results
    if (pt.point_result === 'winner') {
      wObj.winners++;
      if (pt.final_type === 'forehand') wObj.winnersByStroke.forehand++;
      else if (pt.final_type === 'backhand') wObj.winnersByStroke.backhand++;
      else if (pt.final_type === 'volley') wObj.winnersByStroke.volley++;
      else if (pt.final_type === 'drop_shot') wObj.winnersByStroke.drop_shot++;
    } else if (pt.point_result === 'return_winner') {
      rObj.winners++;
      rObj.returnWinners++;
      rObj.winnersByStroke.return_winner++;
      if (pt.return_type === 'forehand') rObj.returnByStroke.forehand++;
      else if (pt.return_type === 'backhand') rObj.returnByStroke.backhand++;
      else if (pt.return_type === 'block_slice') rObj.returnByStroke.block_slice++;
    } else if (pt.point_result === 'unforced_error') {
      // Error is committed by loser
      const loserObj = pt.winner === 'A' ? pB : pA;
      loserObj.unforcedErrors++;
      if (pt.final_type === 'forehand') loserObj.unforcedErrorsByStroke.forehand++;
      else if (pt.final_type === 'backhand') loserObj.unforcedErrorsByStroke.backhand++;
      else if (pt.final_type === 'slice') loserObj.unforcedErrorsByStroke.slice++;
      else if (pt.final_type === 'volley') loserObj.unforcedErrorsByStroke.volley++;
      else if (pt.final_type === 'smash') loserObj.unforcedErrorsByStroke.smash++;
    } else if (pt.point_result === 'return_error') {
      rObj.unforcedErrors++;
      rObj.returnErrors++;
      rObj.unforcedErrorsByStroke.return_error++;
    } else if (pt.point_result === 'forced_error') {
      const loserObj = pt.winner === 'A' ? pB : pA;
      loserObj.forcedErrors++;
    }

    // Break Points
    if (pt.point_context === 'break_point') {
      rObj.breakPointsOpportunities++;
      sObj.breakPointsFaced++;
      if (pt.winner === pt.returner) {
        rObj.breakPointsConverted++;
      } else {
        sObj.breakPointsSaved++;
      }
    }

    // Rally Length Categories
    const balls = pt.ball_count || 1;
    if (balls <= 3) {
      wObj.rallyLengthWon.short_1_3++;
    } else if (balls <= 6) {
      wObj.rallyLengthWon.medium_4_6++;
    } else if (balls <= 9) {
      wObj.rallyLengthWon.long_7_9++;
    } else {
      wObj.rallyLengthWon.extended_10_plus++;
    }
  }

  // Calculate percentages
  const finalizeStats = (p: PlayerStats) => {
    p.firstServePercentage =
      p.firstServesAttempted > 0
        ? Math.round((p.firstServesIn / p.firstServesAttempted) * 100)
        : 0;
    p.firstServeWonPercentage =
      p.firstServesIn > 0
        ? Math.round((p.firstServePointsWon / p.firstServesIn) * 100)
        : 0;
    p.secondServeWonPercentage =
      p.secondServesAttempted > 0
        ? Math.round((p.secondServesWon / p.secondServesAttempted) * 100)
        : 0;
  };

  finalizeStats(pA);
  finalizeStats(pB);

  const pointsWithCoords = allPoints.filter(
    (p) =>
      p.court_detail?.saque ||
      p.court_detail?.devolucion ||
      p.court_detail?.golpe_final
  );

  return {
    totalPoints: allPoints.length,
    durationMinutes: Math.max(5, Math.round(allPoints.length * 0.8)),
    playerA: pA,
    playerB: pB,
    allPointsWithCoords: pointsWithCoords,
  };
}
