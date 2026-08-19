import React from 'react';
import { DraftPoint, Match, PointContext } from '../../types/tennis';
import { ScoreState } from '../../lib/tennisScoreEngine';
import { Check, Edit3, ShieldAlert, Sparkles, Trophy, Zap } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  draft: DraftPoint;
  match: Match;
  scoreState: ScoreState;
  onReview: () => void;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  draft,
  match,
  scoreState,
  onReview,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const playerAName = match.players.player_a.name;
  const playerBName = match.players.player_b.name;
  const winnerName = draft.winner === 'A' ? playerAName : playerBName;
  const serverName = scoreState.server === 'A' ? playerAName : playerBName;

  // Format headline
  let natureLabel = '';
  if (draft.serve_result === 'ace') {
    natureLabel = '⚡ Ace';
  } else if (draft.serve_result === 'double_fault') {
    natureLabel = '❌ Doble Falta';
  } else if (draft.point_result === 'return_winner') {
    natureLabel = `🟢 Devolución Ganadora (${draft.return_type === 'forehand' ? 'Derecha' : draft.return_type === 'backhand' ? 'Revés' : 'Bloqueo/Slice'})`;
  } else if (draft.point_result === 'return_error') {
    natureLabel = `🔴 Error de Devolución (${draft.return_type === 'forehand' ? 'Derecha' : draft.return_type === 'backhand' ? 'Revés' : 'Bloqueo/Slice'})`;
  } else if (draft.point_result === 'winner') {
    const stroke =
      draft.final_type === 'forehand'
        ? 'Derecha'
        : draft.final_type === 'backhand'
        ? 'Revés'
        : draft.final_type === 'volley'
        ? 'Volea'
        : draft.final_type === 'drop_shot'
        ? 'Dejada'
        : '';
    natureLabel = `🟢 Winner de ${stroke}`;
  } else if (draft.point_result === 'unforced_error') {
    const stroke =
      draft.final_type === 'forehand'
        ? 'Derecha'
        : draft.final_type === 'backhand'
        ? 'Revés'
        : draft.final_type === 'slice'
        ? 'Slice'
        : draft.final_type === 'volley'
        ? 'Volea'
        : draft.final_type === 'smash'
        ? 'Smash'
        : '';
    natureLabel = `🔴 Error No Forzado de ${stroke}`;
  } else if (draft.point_result === 'forced_error') {
    natureLabel = '⚪ Error Forzado';
  }

  const getContextBadge = (ctx: PointContext) => {
    switch (ctx) {
      case 'match_point':
        return { label: 'MATCH POINT 🏆', color: 'bg-amber-500/20 text-amber-300 border-amber-400' };
      case 'set_point':
        return { label: 'SET POINT 🔥', color: 'bg-rose-500/20 text-rose-300 border-rose-400' };
      case 'break_point':
        return { label: 'BREAK POINT ⚡', color: 'bg-yellow-500/20 text-[#CCFF00] border-[#CCFF00]' };
      case 'game_point':
        return { label: 'GAME POINT', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400' };
      case 'deuce':
        return { label: 'DEUCE (40-40)', color: 'bg-purple-500/20 text-purple-300 border-purple-400' };
      default:
        return null;
    }
  };

  const contextBadge = getContextBadge(scoreState.pointContext);

  const hasSaqueCoord = !!draft.court_detail?.saque?.bote;
  const hasDevCoord = !!draft.court_detail?.devolucion?.bote;
  const hasFinalCoord = !!draft.court_detail?.golpe_final?.ejecutor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/85 backdrop-blur-[20px] animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#112240] border border-[#233554] rounded-2xl shadow-2xl overflow-hidden glass-modal flex flex-col">
        {/* Top Header Glow */}
        <div className="px-6 pt-5 pb-4 border-b border-[#233554]/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#CCFF00]/15 text-[#CCFF00]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-white">Revisar y Confirmar</h3>
              <p className="text-xs text-slate-400">Verifica el punto antes de avanzar el marcador</p>
            </div>
          </div>
          {contextBadge && (
            <span
              className={`px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-md border ${contextBadge.color}`}
            >
              {contextBadge.label}
            </span>
          )}
        </div>

        {/* Body Info */}
        <div className="p-6 space-y-4">
          {/* Winner Highlight Card */}
          <div className="p-4 rounded-xl bg-[#0A192F]/80 border border-[#233554] space-y-1.5">
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Resultado del punto
            </div>
            <div className="text-base font-extrabold text-[#CCFF00] flex items-center justify-between">
              <span>{natureLabel}</span>
            </div>
            <div className="text-sm font-semibold text-white pt-1">
              Punto para: <span className="text-[#00F0FF] underline underline-offset-4">{winnerName}</span>
            </div>
          </div>

          {/* Point Context Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#1B2D4F]/40 border border-[#233554]/60 space-y-1">
              <div className="text-slate-400 font-medium">Marcador Previo</div>
              <div className="text-sm font-mono-numbers font-bold text-white">
                {scoreState.scoreBeforeString} ({scoreState.serveSide === 'deuce' ? 'Deuce/Iguales' : 'Ad/Ventaja'})
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1B2D4F]/40 border border-[#233554]/60 space-y-1">
              <div className="text-slate-400 font-medium">Servicio & Bolas</div>
              <div className="text-sm font-bold text-white flex items-center gap-1">
                <span>{draft.serve_type === 1 ? '1° Saque' : '2° Saque'}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono-numbers text-[#CCFF00]">{draft.ball_count} bolas</span>
              </div>
            </div>
          </div>

          {/* Serve Zone & Court Detail Tags */}
          <div className="p-3 rounded-xl bg-[#1B2D4F]/30 border border-[#233554]/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Detalle Espacial:</span>
              <div className="flex items-center gap-1.5">
                {hasSaqueCoord && (
                  <span className="px-2 py-0.5 rounded bg-[#CCFF00]/15 text-[#CCFF00] font-semibold text-[10px]">
                    Saque {draft.derived_serve_zone ? `(${draft.derived_serve_zone.toUpperCase()})` : '✓'}
                  </span>
                )}
                {hasDevCoord && (
                  <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-semibold text-[10px]">
                    Devolución ✓
                  </span>
                )}
                {hasFinalCoord && (
                  <span className="px-2 py-0.5 rounded bg-purple-400/15 text-purple-300 font-semibold text-[10px]">
                    Golpe Final ✓
                  </span>
                )}
                {!hasSaqueCoord && !hasDevCoord && !hasFinalCoord && (
                  <span className="text-slate-500 italic">No registrado</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-[#233554] bg-[#0A192F]/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReview}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-slate-300 hover:text-white bg-[#1B2D4F] border border-[#233554] hover:bg-[#233554] transition flex items-center justify-center gap-2 touch-target"
          >
            <Edit3 className="w-4 h-4" />
            Revisar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-extrabold bg-[#CCFF00] text-[#0A192F] hover:bg-[#b8e600] glow-accent shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 touch-target"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
