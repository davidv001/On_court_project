import React, { useState, useEffect } from 'react';
import {
  DraftPoint,
  FinalType,
  Match,
  PlayerId,
  Point,
  PointResult,
  ReturnType,
  ServeResult,
  ServeType,
} from '../../types/tennis';
import {
  calculateScoreState,
  recordPointInMatch,
  ScoreState,
} from '../../lib/tennisScoreEngine';
import { CourtDetailModal, CourtModalMode } from '../courtDetail/CourtDetailModal';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Activity,
  Award,
  Check,
  ChevronRight,
  Flame,
  HelpCircle,
  History,
  Info,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LiveCaptureViewProps {
  match: Match;
  onUpdateMatch: (updatedMatch: Match) => void;
  onNavigateToStats: () => void;
  onNavigateToHistory: () => void;
}

export const LiveCaptureView: React.FC<LiveCaptureViewProps> = ({
  match,
  onUpdateMatch,
  onNavigateToStats,
  onNavigateToHistory,
}) => {
  // Score state
  const scoreState: ScoreState = calculateScoreState(match);

  // Draft point state
  const [draft, setDraft] = useState<DraftPoint>({
    serve_type: 1,
    serve_result: 'in_play',
    point_result: null,
    winner: null,
    return_type: null,
    final_type: null,
    ball_count: 4,
    court_detail: {},
    derived_serve_zone: null,
    return_switch: 'none',
    start_time_ms: Date.now(),
  });

  // Modals state
  const [courtModalMode, setCourtModalMode] = useState<CourtModalMode | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Live timer
  const [pointElapsedSec, setPointElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPointElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [draft.start_time_ms]);

  // Reset draft on score/game change
  const resetDraft = (keepServeType: ServeType = 1) => {
    setDraft({
      serve_type: keepServeType,
      serve_result: 'in_play',
      point_result: null,
      winner: null,
      return_type: null,
      final_type: null,
      ball_count: 4,
      court_detail: {},
      derived_serve_zone: null,
      return_switch: 'none',
      start_time_ms: Date.now(),
    });
    setPointElapsedSec(0);
  };

  // Handle Serve Selection (Step 1)
  const handleSelectServe = (type: ServeType, result: ServeResult) => {
    if (result === 'ace') {
      setDraft((prev) => ({
        ...prev,
        serve_type: type,
        serve_result: 'ace',
        point_result: 'ace',
        winner: scoreState.server,
        ball_count: 1,
      }));
    } else if (result === 'double_fault') {
      setDraft((prev) => ({
        ...prev,
        serve_type: 2,
        serve_result: 'double_fault',
        point_result: 'double_fault',
        winner: scoreState.returner,
        ball_count: 1,
        court_detail: {},
        derived_serve_zone: null,
      }));
    } else {
      // 1st or 2nd serve in play
      setDraft((prev) => ({
        ...prev,
        serve_type: type,
        serve_result: 'in_play',
        // If it was ace or double fault before, clear inferred results
        point_result:
          prev.point_result === 'ace' || prev.point_result === 'double_fault'
            ? null
            : prev.point_result,
        winner:
          prev.point_result === 'ace' || prev.point_result === 'double_fault'
            ? null
            : prev.winner,
        ball_count: prev.ball_count === 1 ? 4 : prev.ball_count,
      }));
    }
  };

  // Handle Point Winner (Step 2)
  const handleSelectWinner = (winner: PlayerId) => {
    setDraft((prev) => ({
      ...prev,
      winner,
    }));
  };

  // Handle Nature of Point End (Step 3)
  const handleSelectNature = (nature: PointResult) => {
    setDraft((prev) => {
      let finalType = prev.final_type;
      if (nature === 'winner' && (!finalType || ['slice', 'smash'].includes(finalType))) {
        finalType = 'forehand';
      } else if (
        nature === 'unforced_error' &&
        (!finalType || finalType === 'drop_shot')
      ) {
        finalType = 'forehand';
      } else if (nature === 'forced_error') {
        finalType = null;
      }

      return {
        ...prev,
        point_result: nature,
        final_type: finalType,
      };
    });
  };

  // Handle Stroke Selection
  const handleSelectFinalStroke = (stroke: FinalType) => {
    setDraft((prev) => ({
      ...prev,
      final_type: stroke,
    }));
  };

  // Save Court Detail Callback
  const handleCourtDetailSaved = (data: {
    courtDetail: any;
    derivedServeZone?: any;
    returnType?: ReturnType | null;
    returnSwitch?: 'none' | 'return_winner' | 'return_error';
  }) => {
    setDraft((prev) => {
      const mergedDetail = { ...prev.court_detail, ...data.courtDetail };
      let newPointResult = prev.point_result;
      let newWinner = prev.winner;
      let newBallCount = prev.ball_count;

      if (data.returnSwitch === 'return_winner') {
        newPointResult = 'return_winner';
        newWinner = scoreState.returner;
        newBallCount = 2;
      } else if (data.returnSwitch === 'return_error') {
        newPointResult = 'return_error';
        newWinner = scoreState.server;
        newBallCount = 2;
      }

      return {
        ...prev,
        court_detail: mergedDetail,
        derived_serve_zone: data.derivedServeZone || prev.derived_serve_zone,
        return_type: data.returnType !== undefined ? data.returnType : prev.return_type,
        return_switch: data.returnSwitch || prev.return_switch,
        point_result: newPointResult,
        winner: newWinner,
        ball_count: newBallCount,
      };
    });
  };

  // Check if form is ready to commit
  const isDraftValid = (): boolean => {
    if (draft.serve_result === 'ace' || draft.serve_result === 'double_fault') {
      return true;
    }
    if (draft.return_switch === 'return_winner' || draft.return_switch === 'return_error') {
      return true;
    }
    if (!draft.winner) return false;
    if (!draft.point_result) return false;
    if (
      (draft.point_result === 'winner' || draft.point_result === 'unforced_error') &&
      !draft.final_type
    ) {
      return false;
    }
    return true;
  };

  // Open confirmation modal
  const handleOpenConfirm = () => {
    if (!isDraftValid()) return;
    setIsConfirmModalOpen(true);
  };

  // Commit Point to Match
  const handleConfirmPoint = () => {
    const endTime = new Date().toISOString();
    const startTime = new Date(draft.start_time_ms).toISOString();
    const durationMs = Math.max(500, Date.now() - draft.start_time_ms);

    const newPoint: Point = {
      point_id: Date.now(),
      server: scoreState.server,
      returner: scoreState.returner,
      serve_side: scoreState.serveSide,
      serve_type: draft.serve_type,
      serve_result: draft.serve_result,
      point_result: draft.point_result || 'winner',
      winner: draft.winner || 'A',
      score_before: scoreState.scoreBeforeString,
      point_context: scoreState.pointContext,
      return_type: draft.return_type,
      final_type: draft.final_type,
      ball_count: draft.ball_count,
      start_time: startTime,
      end_time: endTime,
      duration_ms: durationMs,
      derived_serve_zone: draft.derived_serve_zone,
      court_detail: Object.keys(draft.court_detail).length > 0 ? draft.court_detail : null,
    };

    const updatedMatch = recordPointInMatch(match, newPoint);
    onUpdateMatch(updatedMatch);

    setIsConfirmModalOpen(false);

    // If match won, trigger celebration confetti
    const nextState = calculateScoreState(updatedMatch);
    if (nextState.isMatchCompleted) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#CCFF00', '#00F0FF', '#FFFFFF'],
      });
    }

    resetDraft(1);
  };

  const isReturnWinnerOrError =
    draft.return_switch === 'return_winner' || draft.return_switch === 'return_error';
  const isAceOrDF =
    draft.serve_result === 'ace' || draft.serve_result === 'double_fault';

  const playerAName = match.players.player_a.name;
  const playerBName = match.players.player_b.name;

  return (
    <div className="flex flex-col min-h-screen pb-28 sm:pb-24">
      {/* Top Match HUD Bar */}
      <header className="sticky top-0 z-30 bg-[#0A192F]/95 backdrop-blur-xl border-b border-[#233554] px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Match Title & Surface */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00] font-black">
              🎾
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 truncate max-w-[140px] sm:max-w-[240px]">
                {match.surface} • {match.match_format === 'best_of_5' ? 'Mejor de 5' : 'Mejor de 3'}
              </div>
              <div className="text-[11px] text-slate-400">
                Set {scoreState.currentSetIndex + 1} • Game {scoreState.isTiebreak ? 'TIE-BREAK' : scoreState.currentGameIndex + 1}
              </div>
            </div>
          </div>

          {/* Quick Navs */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToStats}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#112240] hover:bg-[#1B2D4F] border border-[#233554] text-xs font-semibold text-slate-200 transition"
              title="Estadísticas & Heatmap"
            >
              <Activity className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="hidden sm:inline">Analítica</span>
            </button>
            <button
              onClick={onNavigateToHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#112240] hover:bg-[#1B2D4F] border border-[#233554] text-xs font-semibold text-slate-200 transition"
              title="Historial de partidos"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Partidos</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Match Completed Banner */}
        {scoreState.isMatchCompleted && (
          <div className="p-4 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/40 text-center space-y-2 animate-bounce">
            <div className="flex items-center justify-center gap-2 text-base font-extrabold text-[#CCFF00]">
              <Trophy className="w-6 h-6" />
              <span>¡PARTIDO FINALIZADO!</span>
            </div>
            <div className="text-sm font-semibold text-white">
              Ganador:{' '}
              <span className="text-[#00F0FF] underline">
                {scoreState.matchWinner === 'A' ? playerAName : playerBName}
              </span>
            </div>
            <button
              onClick={onNavigateToStats}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#CCFF00] text-[#0A192F] font-bold text-xs"
            >
              Ver Análisis Completo y Mapas de Calor
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tie-break change ends warning */}
        {scoreState.shouldChangeEndsTiebreak && (
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>CAMBIO DE LADO (Puntos combinados: {scoreState.tiebreakPointsSum})</span>
          </div>
        )}

        {/* HIGH CONTRAST ATP SCOREBOARD HUD */}
        <section className="rounded-2xl bg-[#112240] border border-[#233554] p-4 shadow-xl space-y-3 glass-panel">
          {/* Header row: Context Badges */}
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#233554]/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">
                {scoreState.serveSide === 'deuce' ? 'Lado: DEUCE (Iguales)' : 'Lado: AD (Ventaja)'}
              </span>
            </div>

            {/* Context Badge */}
            <div>
              {scoreState.pointContext === 'match_point' && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400 text-amber-300 font-extrabold text-[11px] tracking-wider animate-pulse">
                  MATCH POINT 🏆
                </span>
              )}
              {scoreState.pointContext === 'set_point' && (
                <span className="px-2.5 py-0.5 rounded-md bg-rose-500/25 border border-rose-400 text-rose-300 font-extrabold text-[11px] tracking-wider animate-pulse">
                  SET POINT 🔥
                </span>
              )}
              {scoreState.pointContext === 'break_point' && (
                <span className="px-2.5 py-0.5 rounded-md bg-[#CCFF00]/25 border border-[#CCFF00] text-[#CCFF00] font-extrabold text-[11px] tracking-wider animate-pulse">
                  BREAK POINT ⚡
                </span>
              )}
              {scoreState.pointContext === 'game_point' && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400 text-emerald-300 font-bold text-[11px]">
                  GAME POINT
                </span>
              )}
              {scoreState.pointContext === 'deuce' && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-400 text-purple-300 font-bold text-[11px]">
                  DEUCE
                </span>
              )}
            </div>
          </div>

          {/* Score Grid: Player A & Player B */}
          <div className="space-y-2">
            {/* Player A Row */}
            <div
              className={`p-3 rounded-xl transition-all flex items-center justify-between ${
                scoreState.server === 'A'
                  ? 'bg-[#1B2D4F] border border-[#CCFF00]/40 shadow-md'
                  : 'bg-[#0A192F]/60 border border-[#233554]/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {scoreState.server === 'A' ? (
                  <span className="w-6 h-6 rounded-full bg-[#CCFF00] text-[#0A192F] flex items-center justify-center text-xs font-black shadow-md shadow-[#CCFF00]/30 animate-pulse" title="Sacando">
                    🎾
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">
                    R
                  </span>
                )}
                <span className="font-extrabold text-sm sm:text-base text-white truncate">
                  {playerAName}
                </span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 font-mono-numbers">
                {/* Completed Sets */}
                {scoreState.completedSetsScore.map((set, idx) => (
                  <span key={idx} className="text-slate-400 font-bold text-sm">
                    {set.A}
                  </span>
                ))}
                {/* Current Set Games */}
                <span className="text-base sm:text-lg font-black text-white px-2 py-0.5 rounded bg-black/30">
                  {scoreState.gamesInCurrentSet.A}
                </span>
                {/* Current Point / Tiebreak */}
                <span className="w-12 text-center text-xl sm:text-2xl font-black text-[#CCFF00] tracking-tight">
                  {scoreState.scoreDisplay.A}
                </span>
              </div>
            </div>

            {/* Player B Row */}
            <div
              className={`p-3 rounded-xl transition-all flex items-center justify-between ${
                scoreState.server === 'B'
                  ? 'bg-[#1B2D4F] border border-[#CCFF00]/40 shadow-md'
                  : 'bg-[#0A192F]/60 border border-[#233554]/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {scoreState.server === 'B' ? (
                  <span className="w-6 h-6 rounded-full bg-[#CCFF00] text-[#0A192F] flex items-center justify-center text-xs font-black shadow-md shadow-[#CCFF00]/30 animate-pulse" title="Sacando">
                    🎾
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">
                    R
                  </span>
                )}
                <span className="font-extrabold text-sm sm:text-base text-white truncate">
                  {playerBName}
                </span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 font-mono-numbers">
                {/* Completed Sets */}
                {scoreState.completedSetsScore.map((set, idx) => (
                  <span key={idx} className="text-slate-400 font-bold text-sm">
                    {set.B}
                  </span>
                ))}
                {/* Current Set Games */}
                <span className="text-base sm:text-lg font-black text-white px-2 py-0.5 rounded bg-black/30">
                  {scoreState.gamesInCurrentSet.B}
                </span>
                {/* Current Point / Tiebreak */}
                <span className="w-12 text-center text-xl sm:text-2xl font-black text-[#CCFF00] tracking-tight">
                  {scoreState.scoreDisplay.B}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CAPTURE WIZARD FLOW (Section 6) */}

        {/* PASO 1 — SERVICIO */}
        <section className="p-4 rounded-2xl bg-[#112240] border border-[#233554] space-y-3 glass-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#CCFF00] text-[#0A192F] font-black text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                Servicio ({scoreState.server === 'A' ? playerAName : playerBName})
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Arranca el punto</span>
          </div>

          {/* 4 Main Service Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1st Serve */}
            <button
              type="button"
              onClick={() => handleSelectServe(1, 'in_play')}
              className={`p-3 rounded-xl border text-center transition-all touch-target font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 ${
                draft.serve_type === 1 && draft.serve_result === 'in_play'
                  ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00] shadow-lg shadow-[#CCFF00]/20'
                  : 'bg-[#1B2D4F]/60 text-slate-200 border-[#233554] hover:border-slate-400'
              }`}
            >
              <span>1° Saque</span>
              <span className="text-[10px] font-normal opacity-80">En juego</span>
            </button>

            {/* 2nd Serve */}
            <button
              type="button"
              onClick={() => handleSelectServe(2, 'in_play')}
              className={`p-3 rounded-xl border text-center transition-all touch-target font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 ${
                draft.serve_type === 2 && draft.serve_result === 'in_play'
                  ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00] shadow-lg shadow-[#CCFF00]/20'
                  : 'bg-[#1B2D4F]/60 text-slate-200 border-[#233554] hover:border-slate-400'
              }`}
            >
              <span>2° Saque</span>
              <span className="text-[10px] font-normal opacity-80">En juego</span>
            </button>

            {/* Ace */}
            <button
              type="button"
              onClick={() => handleSelectServe(draft.serve_type, 'ace')}
              className={`p-3 rounded-xl border text-center transition-all touch-target font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 ${
                draft.serve_result === 'ace'
                  ? 'bg-[#00F0FF] text-[#0A192F] border-[#00F0FF] glow-winner'
                  : 'bg-[#1B2D4F]/60 text-[#00F0FF] border-[#233554] hover:border-[#00F0FF]/50'
              }`}
            >
              <span>Ace ⚡</span>
              <span className="text-[10px] font-normal opacity-80">Punto sacador</span>
            </button>

            {/* Double Fault */}
            <button
              type="button"
              onClick={() => handleSelectServe(2, 'double_fault')}
              className={`p-3 rounded-xl border text-center transition-all touch-target font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 ${
                draft.serve_result === 'double_fault'
                  ? 'bg-[#FF4D4D] text-white border-[#FF4D4D] glow-error'
                  : 'bg-[#1B2D4F]/60 text-[#FF4D4D] border-[#233554] hover:border-[#FF4D4D]/50'
              }`}
            >
              <span>Doble Falta ❌</span>
              <span className="text-[10px] font-normal opacity-80">Punto restador</span>
            </button>
          </div>

          {/* Optional Court Detail Pills for Serve / Return */}
          {!isAceOrDF && (
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCourtModalMode('saque')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition touch-target ${
                  draft.court_detail?.saque?.bote
                    ? 'bg-[#CCFF00]/20 text-[#CCFF00] border-[#CCFF00]'
                    : 'bg-[#0A192F]/60 text-slate-300 border-[#233554] hover:border-slate-400'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>📍 Registrar Saque</span>
                {draft.derived_serve_zone && (
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-[#CCFF00] text-[#0A192F] font-bold text-[10px] uppercase">
                    {draft.derived_serve_zone}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCourtModalMode('devolucion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition touch-target ${
                  draft.court_detail?.devolucion?.bote || draft.return_switch !== 'none'
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]'
                    : 'bg-[#0A192F]/60 text-slate-300 border-[#233554] hover:border-slate-400'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>📍 Registrar Devolución</span>
                {draft.return_switch === 'return_winner' && (
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-[#00F0FF] text-[#0A192F] font-bold text-[10px]">
                    WINNER
                  </span>
                )}
                {draft.return_switch === 'return_error' && (
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-[#FF4D4D] text-white font-bold text-[10px]">
                    ERROR
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Optional Ace Court Detail Button */}
          {draft.serve_result === 'ace' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setCourtModalMode('ace')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  draft.court_detail?.saque?.bote
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]'
                    : 'bg-[#0A192F]/60 text-slate-300 border-[#233554] hover:border-[#00F0FF]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>📍 Court Detail (Bote del Ace)</span>
                {draft.derived_serve_zone && (
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-[#00F0FF] text-[#0A192F] font-bold text-[10px] uppercase">
                    {draft.derived_serve_zone}
                  </span>
                )}
              </button>
            </div>
          )}
        </section>

        {/* PASO 2 — GANADOR DEL PUNTO (Only if not Ace/DF and not return winner/error) */}
        {!isAceOrDF && !isReturnWinnerOrError && (
          <section className="p-4 rounded-2xl bg-[#112240] border border-[#233554] space-y-3 glass-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#CCFF00] text-[#0A192F] font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                  Ganador del Punto
                </h2>
              </div>
              <span className="text-xs text-slate-400">¿Quién ganó el tanto?</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Player A */}
              <button
                type="button"
                onClick={() => handleSelectWinner('A')}
                className={`p-3.5 rounded-xl border text-left transition-all touch-target ${
                  draft.winner === 'A'
                    ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00] font-black shadow-lg shadow-[#CCFF00]/20'
                    : 'bg-[#1B2D4F]/60 text-white border-[#233554] hover:border-slate-400'
                }`}
              >
                <div className="text-xs opacity-75 font-semibold">Jugador A</div>
                <div className="text-sm sm:text-base font-extrabold truncate">{playerAName}</div>
              </button>

              {/* Player B */}
              <button
                type="button"
                onClick={() => handleSelectWinner('B')}
                className={`p-3.5 rounded-xl border text-left transition-all touch-target ${
                  draft.winner === 'B'
                    ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00] font-black shadow-lg shadow-[#CCFF00]/20'
                    : 'bg-[#1B2D4F]/60 text-white border-[#233554] hover:border-slate-400'
                }`}
              >
                <div className="text-xs opacity-75 font-semibold">Jugador B</div>
                <div className="text-sm sm:text-base font-extrabold truncate">{playerBName}</div>
              </button>
            </div>
          </section>
        )}

        {/* PASO 3 — ¿CÓMO TERMINÓ EL PUNTO? (Only if not Ace/DF and not return winner/error) */}
        {!isAceOrDF && !isReturnWinnerOrError && (
          <section className="p-4 rounded-2xl bg-[#112240] border border-[#233554] space-y-3 glass-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#CCFF00] text-[#0A192F] font-black text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                  ¿Cómo terminó el punto?
                </h2>
              </div>
              <span className="text-xs text-slate-400">Naturaleza</span>
            </div>

            {/* 3 Main Endings */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectNature('winner')}
                className={`p-3 rounded-xl border text-center transition-all touch-target font-bold text-xs sm:text-sm ${
                  draft.point_result === 'winner'
                    ? 'bg-[#00F0FF] text-[#0A192F] border-[#00F0FF] glow-winner'
                    : 'bg-[#1B2D4F]/60 text-slate-200 border-[#233554] hover:border-[#00F0FF]/60'
                }`}
              >
                <span>Winner 🟢</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectNature('unforced_error')}
                className={`p-3 rounded-xl border text-center transition-all touch-target font-bold text-xs sm:text-sm ${
                  draft.point_result === 'unforced_error'
                    ? 'bg-[#FF4D4D] text-white border-[#FF4D4D] glow-error'
                    : 'bg-[#1B2D4F]/60 text-slate-200 border-[#233554] hover:border-[#FF4D4D]/60'
                }`}
              >
                <span>Error No Forz. 🔴</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectNature('forced_error')}
                className={`p-3 rounded-xl border text-center transition-all touch-target font-bold text-xs sm:text-sm ${
                  draft.point_result === 'forced_error'
                    ? 'bg-slate-300 text-[#0A192F] border-slate-300 font-black'
                    : 'bg-[#1B2D4F]/60 text-slate-300 border-[#233554] hover:border-slate-400'
                }`}
              >
                <span>Error Forzado ⚪</span>
              </button>
            </div>

            {/* Sub-taxonomies of strokes (Section 7.1) */}
            {draft.point_result === 'winner' && (
              <div className="p-3 rounded-xl bg-[#0A192F]/70 border border-[#00F0FF]/30 space-y-2.5 animate-fadeIn">
                <div className="text-xs font-bold text-[#00F0FF] flex items-center justify-between">
                  <span>Golpe Ganador (Winner):</span>
                  <button
                    type="button"
                    onClick={() => setCourtModalMode('winner')}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] hover:bg-[#00F0FF]/30 font-semibold"
                  >
                    <MapPin className="w-3 h-3" />
                    📍 Court Detail
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'forehand', label: 'Derecha' },
                    { id: 'backhand', label: 'Revés' },
                    { id: 'volley', label: 'Volea' },
                    { id: 'drop_shot', label: 'Dejada' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectFinalStroke(st.id as FinalType)}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg border touch-target transition-all ${
                        draft.final_type === st.id
                          ? 'bg-[#00F0FF] text-[#0A192F] border-[#00F0FF] font-black shadow-md'
                          : 'bg-[#1B2D4F]/40 text-slate-300 border-[#233554] hover:border-slate-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draft.point_result === 'unforced_error' && (
              <div className="p-3 rounded-xl bg-[#0A192F]/70 border border-[#FF4D4D]/30 space-y-2.5 animate-fadeIn">
                <div className="text-xs font-bold text-[#FF4D4D] flex items-center justify-between">
                  <span>Golpe Errado (Error No Forzado):</span>
                  <button
                    type="button"
                    onClick={() => setCourtModalMode('unforced_error')}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#FF4D4D]/20 text-[#FF4D4D] hover:bg-[#FF4D4D]/30 font-semibold"
                  >
                    <MapPin className="w-3 h-3" />
                    📍 Court Detail
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'forehand', label: 'Derecha' },
                    { id: 'backhand', label: 'Revés' },
                    { id: 'slice', label: 'Slice' },
                    { id: 'volley', label: 'Volea' },
                    { id: 'smash', label: 'Smash' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectFinalStroke(st.id as FinalType)}
                      className={`py-2 px-1 text-[11px] font-semibold rounded-lg border touch-target transition-all ${
                        draft.final_type === st.id
                          ? 'bg-[#FF4D4D] text-white border-[#FF4D4D] font-black shadow-md'
                          : 'bg-[#1B2D4F]/40 text-slate-300 border-[#233554] hover:border-slate-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TIMING / RALLY LENGTH SELECTOR (Section 6) */}
        <section className="p-3.5 rounded-2xl bg-[#112240] border border-[#233554] flex items-center justify-between gap-3 glass-card">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#CCFF00]" />
            <div>
              <div className="text-xs font-bold text-slate-200">
                Bolas jugadas (Rally)
              </div>
              <div className="text-[10px] text-slate-400">
                {isAceOrDF || isReturnWinnerOrError
                  ? 'Inferido automáticamente por el sistema'
                  : 'Cuenta desde el saque'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono-numbers">
            <button
              type="button"
              disabled={isAceOrDF || isReturnWinnerOrError || draft.ball_count <= 1}
              onClick={() => setDraft((p) => ({ ...p, ball_count: Math.max(1, p.ball_count - 1) }))}
              className="w-8 h-8 rounded-lg bg-[#1B2D4F] border border-[#233554] disabled:opacity-40 text-slate-300 flex items-center justify-center hover:bg-[#233554]"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="w-10 text-center font-black text-lg text-[#CCFF00]">
              {draft.ball_count}
            </span>

            <button
              type="button"
              disabled={isAceOrDF || isReturnWinnerOrError}
              onClick={() => setDraft((p) => ({ ...p, ball_count: p.ball_count + 1 }))}
              className="w-8 h-8 rounded-lg bg-[#1B2D4F] border border-[#233554] disabled:opacity-40 text-slate-300 flex items-center justify-center hover:bg-[#233554]"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </main>

      {/* FIXED BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A192F]/95 backdrop-blur-2xl border-t border-[#233554] p-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => resetDraft(1)}
            className="p-3.5 rounded-xl bg-[#112240] hover:bg-[#1B2D4F] border border-[#233554] text-slate-300 transition"
            title="Limpiar borrador del punto"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled={!isDraftValid() || scoreState.isMatchCompleted}
            onClick={handleOpenConfirm}
            className="flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm sm:text-base bg-[#CCFF00] text-[#0A192F] hover:bg-[#b8e600] disabled:opacity-35 disabled:cursor-not-allowed glow-accent shadow-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] touch-target"
          >
            <span>REGISTRAR PUNTO 🎾</span>
            <ChevronRight className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {courtModalMode && (
        <CourtDetailModal
          isOpen={true}
          onClose={() => setCourtModalMode(null)}
          mode={courtModalMode}
          serveSide={scoreState.serveSide}
          initialCourtDetail={draft.court_detail}
          initialReturnType={draft.return_type}
          initialReturnSwitch={draft.return_switch}
          playerNameA={playerAName}
          playerNameB={playerBName}
          activePlayer={scoreState.server}
          onSave={handleCourtDetailSaved}
        />
      )}

      {isConfirmModalOpen && (
        <ConfirmationModal
          isOpen={true}
          draft={draft}
          match={match}
          scoreState={scoreState}
          onReview={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmPoint}
        />
      )}
    </div>
  );
};
