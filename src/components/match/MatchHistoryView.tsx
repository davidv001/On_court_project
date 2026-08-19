import React, { useRef } from 'react';
import { Match } from '../../types/tennis';
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Database,
  Download,
  FilePlus,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
} from 'lucide-react';

interface MatchHistoryViewProps {
  matches: Match[];
  currentMatchId: number | null;
  onSelectMatch: (match: Match) => void;
  onOpenNewMatchModal: () => void;
  onLoadDemoMatch: () => void;
  onDeleteMatch: (matchId: number) => void;
  onImportMatch: (imported: Match) => void;
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({
  matches,
  currentMatchId,
  onSelectMatch,
  onOpenNewMatchModal,
  onLoadDemoMatch,
  onDeleteMatch,
  onImportMatch,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.match_id && parsed.players && parsed.sets) {
          onImportMatch(parsed);
        } else {
          alert('El archivo no cumple con el esquema v0.3 de AceTrack.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A192F] pb-20">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0A192F]/95 backdrop-blur-xl border-b border-[#233554] px-4 py-3.5 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 text-[#CCFF00] flex items-center justify-center font-bold text-base">
              🎾
            </span>
            <div>
              <h1 className="text-base font-extrabold text-white">AceTrack • Partidos</h1>
              <p className="text-xs text-slate-400">Historial & Captura en Vivo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#112240] hover:bg-[#1B2D4F] border border-[#233554] text-xs font-semibold text-slate-300 transition"
              title="Importar JSON Schema v0.3"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </button>

            <button
              onClick={onOpenNewMatchModal}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#CCFF00] text-[#0A192F] hover:bg-[#b8e600] text-xs font-extrabold shadow-lg transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Partido</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl w-full mx-auto px-4 py-6 space-y-5">
        {/* Quick Demo CTA if needed */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#112240] to-[#1B2D4F] border border-[#233554] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black text-[#00F0FF] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Demo de Muestra con Court Detail Completo</span>
            </div>
            <p className="text-xs text-slate-300">
              Explora una final ATP Masters 1000 cargada con estadísticas avanzadas, botes de saque, winners y errores no forzados.
            </p>
          </div>

          <button
            onClick={onLoadDemoMatch}
            className="px-4 py-2 rounded-xl bg-[#00F0FF] text-[#0A192F] hover:bg-[#00d4e6] text-xs font-extrabold shadow-md whitespace-nowrap transition"
          >
            Cargar Partido Demo ⚡
          </button>
        </div>

        {/* Matches List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Partidos Guardados ({matches.length})</span>
            <span className="text-[11px] lowercase font-normal">Offline-first (Dexie IndexedDB)</span>
          </div>

          {matches.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#112240]/40 border border-[#233554] border-dashed space-y-3">
              <Database className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No hay partidos registrados aún</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Crea un nuevo partido para comenzar a capturar datos tácticos en tiempo real o carga el partido demo.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={onOpenNewMatchModal}
                  className="px-4 py-2 rounded-xl bg-[#CCFF00] text-[#0A192F] text-xs font-extrabold"
                >
                  Crear Nuevo Partido
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {matches.map((m) => {
                const isSelected = m.match_id === currentMatchId;
                const totalPoints = m.sets.reduce(
                  (acc, s) => acc + s.games.reduce((gAcc, g) => gAcc + g.points.length, 0),
                  0
                );

                return (
                  <div
                    key={m.match_id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-[#1B2D4F]/90 border-[#CCFF00]/50 shadow-xl'
                        : 'bg-[#112240] hover:bg-[#1B2D4F]/50 border-[#233554]'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {m.is_completed ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                            Finalizado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#CCFF00]/20 text-[#CCFF00] text-[10px] font-bold uppercase animate-pulse">
                            En Vivo
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{m.date}</span>
                        <span className="text-xs text-slate-400">• {m.surface}</span>
                      </div>

                      <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                        <span>{m.players.player_a.name}</span>
                        <span className="text-slate-400 text-xs font-normal">vs</span>
                        <span>{m.players.player_b.name}</span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>{m.sets.length} Set(s)</span>
                        <span>•</span>
                        <span>{totalPoints} Puntos capturados</span>
                        {m.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px] italic">{m.notes}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => onDeleteMatch(m.match_id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/15 transition"
                        title="Eliminar partido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectMatch(m)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-[#CCFF00] text-[#0A192F] shadow-lg glow-accent'
                            : 'bg-[#1B2D4F] text-white hover:bg-[#233554] border border-[#233554]'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isSelected ? 'Partido Activo' : 'Abrir Partido'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
