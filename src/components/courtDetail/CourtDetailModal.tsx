import React, { useState, useEffect } from 'react';
import {
  Coordinate,
  CourtDetail,
  DerivedServeZone,
  ReturnType,
  ServeSide,
} from '../../types/tennis';
import { CourtCanvas, MarkerConfig } from './CourtCanvas';
import {
  calculateServeZone,
  getDefaultMarkerPosition,
  ConstraintRule,
} from '../../lib/courtGeometry';
import { X, Check, RotateCcw, AlertTriangle, Sparkles, Navigation } from 'lucide-react';

export type CourtModalMode = 'saque' | 'ace' | 'devolucion' | 'winner' | 'unforced_error';

interface CourtDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: CourtModalMode;
  serveSide: ServeSide;
  initialCourtDetail?: CourtDetail;
  initialReturnType?: ReturnType | null;
  initialReturnSwitch?: 'none' | 'return_winner' | 'return_error';
  playerNameA: string;
  playerNameB: string;
  activePlayer: 'A' | 'B';
  onSave: (data: {
    courtDetail: CourtDetail;
    derivedServeZone?: DerivedServeZone | null;
    returnType?: ReturnType | null;
    returnSwitch?: 'none' | 'return_winner' | 'return_error';
  }) => void;
}

export const CourtDetailModal: React.FC<CourtDetailModalProps> = ({
  isOpen,
  onClose,
  mode,
  serveSide,
  initialCourtDetail,
  initialReturnType,
  initialReturnSwitch = 'none',
  playerNameA,
  playerNameB,
  activePlayer,
  onSave,
}) => {
  if (!isOpen) return null;

  // Local state for coordinates
  const [markers, setMarkers] = useState<MarkerConfig[]>([]);
  const [returnType, setReturnType] = useState<ReturnType>(initialReturnType || 'forehand');
  const [returnSwitch, setReturnSwitch] = useState<'none' | 'return_winner' | 'return_error'>(
    initialReturnSwitch
  );

  // Initialize markers based on mode
  useEffect(() => {
    initMarkers();
  }, [mode, serveSide, returnSwitch]);

  const initMarkers = () => {
    switch (mode) {
      case 'saque':
      case 'ace': {
        const defaultBounce =
          initialCourtDetail?.saque?.bote ||
          getDefaultMarkerPosition('serve_bounce', serveSide);

        setMarkers([
          {
            id: 'saque_bote',
            label: mode === 'ace' ? 'ACE' : 'BOTE SAQUE',
            coord: defaultBounce,
            color: '#CCFF00',
            rule: 'serve_bounce',
          },
        ]);
        break;
      }

      case 'devolucion': {
        const defaultRestador =
          initialCourtDetail?.devolucion?.restador ||
          getDefaultMarkerPosition('returner_player', serveSide);

        const ballRule: ConstraintRule =
          returnSwitch === 'return_error' ? 'return_ball_error' : 'return_ball_valid';

        const defaultBote =
          initialCourtDetail?.devolucion?.bote ||
          getDefaultMarkerPosition(ballRule, serveSide);

        setMarkers([
          {
            id: 'returner_player',
            label: 'RESTADOR',
            coord: defaultRestador,
            color: '#CCFF00',
            rule: 'returner_player',
          },
          {
            id: 'return_ball',
            label:
              returnSwitch === 'return_winner'
                ? 'DEVOLUCIÓN WINNER'
                : returnSwitch === 'return_error'
                ? 'ERROR DEVOLUCIÓN'
                : 'BOTE DEVOLUCIÓN',
            coord: defaultBote,
            color:
              returnSwitch === 'return_error'
                ? '#FF4D4D'
                : '#00F0FF',
            rule: ballRule,
          },
        ]);
        break;
      }

      case 'winner': {
        const defaultEjecutor =
          initialCourtDetail?.golpe_final?.ejecutor ||
          getDefaultMarkerPosition('winner_player', serveSide);
        const defaultDestino =
          initialCourtDetail?.golpe_final?.destino ||
          getDefaultMarkerPosition('winner_dest', serveSide);

        setMarkers([
          {
            id: 'winner_player',
            label: 'EJECUTOR',
            coord: defaultEjecutor,
            color: '#CCFF00',
            rule: 'winner_player',
          },
          {
            id: 'winner_dest',
            label: 'DESTINO WINNER',
            coord: defaultDestino,
            color: '#00F0FF',
            rule: 'winner_dest',
          },
        ]);
        break;
      }

      case 'unforced_error': {
        const defaultEjecutor =
          initialCourtDetail?.golpe_final?.ejecutor ||
          getDefaultMarkerPosition('unforced_player', serveSide);
        const defaultErrado =
          initialCourtDetail?.golpe_final?.tiro_errado ||
          getDefaultMarkerPosition('unforced_error_ball', serveSide);

        setMarkers([
          {
            id: 'unforced_player',
            label: 'JUGADOR',
            coord: defaultEjecutor,
            color: '#CCFF00',
            rule: 'unforced_player',
          },
          {
            id: 'unforced_error_ball',
            label: 'TIRO ERRADO',
            coord: defaultErrado,
            color: '#FF4D4D',
            rule: 'unforced_error_ball',
          },
        ]);
        break;
      }
    }
  };

  const handleMarkerChange = (id: string, newCoord: Coordinate) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, coord: newCoord } : m))
    );
  };

  // Compute live serve zone if saque/ace
  const currentServeZone: DerivedServeZone | null =
    mode === 'saque' || mode === 'ace'
      ? calculateServeZone(
          markers.find((m) => m.id === 'saque_bote')?.coord || { x: 0.5, y: 0.3 },
          serveSide
        )
      : null;

  const handleSave = () => {
    const detail: CourtDetail = {};
    let derivedZone: DerivedServeZone | null = null;

    if (mode === 'saque' || mode === 'ace') {
      const b = markers.find((m) => m.id === 'saque_bote');
      if (b) {
        detail.saque = { bote: b.coord };
        derivedZone = calculateServeZone(b.coord, serveSide);
      }
    } else if (mode === 'devolucion') {
      const restador = markers.find((m) => m.id === 'returner_player');
      const bote = markers.find((m) => m.id === 'return_ball');
      if (restador && bote) {
        detail.devolucion = {
          restador: restador.coord,
          bote: bote.coord,
        };
      }
    } else if (mode === 'winner') {
      const ejecutor = markers.find((m) => m.id === 'winner_player');
      const destino = markers.find((m) => m.id === 'winner_dest');
      if (ejecutor && destino) {
        detail.golpe_final = {
          ejecutor: ejecutor.coord,
          destino: destino.coord,
        };
      }
    } else if (mode === 'unforced_error') {
      const ejecutor = markers.find((m) => m.id === 'unforced_player');
      const errado = markers.find((m) => m.id === 'unforced_error_ball');
      if (ejecutor && errado) {
        detail.golpe_final = {
          ejecutor: ejecutor.coord,
          tiro_errado: errado.coord,
        };
      }
    }

    onSave({
      courtDetail: detail,
      derivedServeZone: derivedZone,
      returnType: mode === 'devolucion' ? returnType : undefined,
      returnSwitch: mode === 'devolucion' ? returnSwitch : undefined,
    });
    onClose();
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'saque':
        return '📍 Registrar Saque (Bote)';
      case 'ace':
        return '⚡ Court Detail: Ace';
      case 'devolucion':
        return '📍 Registrar Devolución';
      case 'winner':
        return '🟢 Court Detail: Winner';
      case 'unforced_error':
        return '🔴 Court Detail: Error No Forzado';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/85 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#112240] border border-[#233554] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#233554] bg-[#0A192F]/60">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#CCFF00]" />
            <h3 className="font-bold text-base text-slate-100">{getModalTitle()}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* DEVOLUCION SPECIAL PRESENTATION (Section 7) */}
          {mode === 'devolucion' && (
            <div className="space-y-2 bg-[#0A192F]/70 p-3 rounded-xl border border-[#233554]">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Tipo de Golpe de Devolución <span className="text-[#CCFF00]">*</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'forehand', label: 'Derecha' },
                  { id: 'backhand', label: 'Revés' },
                  { id: 'block_slice', label: 'Bloqueo / Slice' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setReturnType(st.id as ReturnType)}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg border touch-target transition-all ${
                      returnType === st.id
                        ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00] font-bold shadow-md shadow-[#CCFF00]/20'
                        : 'bg-[#1B2D4F]/50 text-slate-300 border-[#233554] hover:border-slate-400'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Court Canvas */}
          <CourtCanvas
            markers={markers}
            onMarkerChange={handleMarkerChange}
            serveSide={serveSide}
            highlightServeBox={mode === 'saque' || mode === 'ace'}
            currentServeZone={currentServeZone}
          />

          {/* DEVOLUCION EXCLUSIVE SWITCHES (Section 6 & 7) */}
          {mode === 'devolucion' && (
            <div className="space-y-2 bg-[#0A192F]/80 p-3 rounded-xl border border-[#233554]">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                Información de Devolución (Opcional - Mutuamente excluyentes)
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Switch 1: Return Winner */}
                <button
                  type="button"
                  onClick={() =>
                    setReturnSwitch((prev) =>
                      prev === 'return_winner' ? 'none' : 'return_winner'
                    )
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    returnSwitch === 'return_winner'
                      ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF] glow-winner'
                      : 'bg-[#1B2D4F]/40 border-[#233554] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Devolución Ganadora</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        returnSwitch === 'return_winner'
                          ? 'border-[#00F0FF] bg-[#00F0FF]'
                          : 'border-slate-500'
                      }`}
                    >
                      {returnSwitch === 'return_winner' && (
                        <Check className="w-2.5 h-2.5 text-[#0A192F] stroke-[3]" />
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Infiere ganador (Restador) y finaliza punto (2 bolas).
                  </span>
                </button>

                {/* Switch 2: Return Error */}
                <button
                  type="button"
                  onClick={() =>
                    setReturnSwitch((prev) =>
                      prev === 'return_error' ? 'none' : 'return_error'
                    )
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    returnSwitch === 'return_error'
                      ? 'bg-[#FF4D4D]/15 border-[#FF4D4D] text-[#FF4D4D] glow-error'
                      : 'bg-[#1B2D4F]/40 border-[#233554] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Error de Devolución</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        returnSwitch === 'return_error'
                          ? 'border-[#FF4D4D] bg-[#FF4D4D]'
                          : 'border-slate-500'
                      }`}
                    >
                      {returnSwitch === 'return_error' && (
                        <Check className="w-2.5 h-2.5 text-[#0A192F] stroke-[3]" />
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Infiere ganador (Sacador) y finaliza punto (2 bolas).
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#233554] bg-[#0A192F]/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={initMarkers}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#1B2D4F] border border-[#233554] hover:bg-[#233554] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#CCFF00] text-[#0A192F] hover:bg-[#b8e600] glow-accent shadow-lg transition-transform active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Guardar Posición
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
