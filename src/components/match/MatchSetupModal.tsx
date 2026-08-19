import React, { useState } from 'react';
import { MatchFormat, PlayerId } from '../../types/tennis';
import { Plus, X, Sparkles, Trophy } from 'lucide-react';

interface MatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMatch: (data: {
    playerAName: string;
    playerBName: string;
    matchFormat: MatchFormat;
    surface: string;
    firstServer: PlayerId;
    notes: string;
  }) => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  isOpen,
  onClose,
  onCreateMatch,
}) => {
  const [playerAName, setPlayerAName] = useState('Jugador A');
  const [playerBName, setPlayerBName] = useState('Jugador B');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('best_of_3');
  const [surface, setSurface] = useState('Hard (Cemento)');
  const [firstServer, setFirstServer] = useState<PlayerId>('A');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateMatch({
      playerAName: playerAName.trim() || 'Jugador A',
      playerBName: playerBName.trim() || 'Jugador B',
      matchFormat,
      surface,
      firstServer,
      notes,
    });
    onClose();
  };

  const handleApplyPreset = (a: string, b: string, surf: string) => {
    setPlayerAName(a);
    setPlayerBName(b);
    setSurface(surf);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#112240] border border-[#233554] rounded-2xl shadow-2xl overflow-hidden glass-modal flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#233554] bg-[#0A192F]/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#CCFF00]/15 text-[#CCFF00]">
              <Trophy className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-base text-white">Nuevo Partido de Tenis</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
              Plantillas Rápidas:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('C. Alcaraz', 'J. Sinner', 'Hard (Cemento)')}
                className="px-2.5 py-1.5 rounded-lg bg-[#1B2D4F] hover:bg-[#233554] border border-[#233554] text-slate-300 font-medium transition"
              >
                ⚡ Alcaraz vs Sinner (Hard)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('N. Djokovic', 'R. Nadal', 'Clay (Tierra batida)')}
                className="px-2.5 py-1.5 rounded-lg bg-[#1B2D4F] hover:bg-[#233554] border border-[#233554] text-slate-300 font-medium transition"
              >
                🎾 Djokovic vs Nadal (Clay)
              </button>
            </div>
          </div>

          {/* Players */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Nombre Jugador A:</label>
              <input
                type="text"
                required
                value={playerAName}
                onChange={(e) => setPlayerAName(e.target.value)}
                placeholder="Ej. Carlos Alcaraz"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A192F] border border-[#233554] text-white focus:outline-none focus:border-[#CCFF00] font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Nombre Jugador B:</label>
              <input
                type="text"
                required
                value={playerBName}
                onChange={(e) => setPlayerBName(e.target.value)}
                placeholder="Ej. Jannik Sinner"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A192F] border border-[#233554] text-white focus:outline-none focus:border-[#00F0FF] font-medium"
              />
            </div>
          </div>

          {/* Primer Sacador */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Primer Sacador del Partido:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFirstServer('A')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  firstServer === 'A'
                    ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00]'
                    : 'bg-[#1B2D4F]/50 text-slate-300 border-[#233554]'
                }`}
              >
                Saca {playerAName || 'Jugador A'}
              </button>
              <button
                type="button"
                onClick={() => setFirstServer('B')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  firstServer === 'B'
                    ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00]'
                    : 'bg-[#1B2D4F]/50 text-slate-300 border-[#233554]'
                }`}
              >
                Saca {playerBName || 'Jugador B'}
              </button>
            </div>
          </div>

          {/* Formato & Superficie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Formato del Partido:</label>
              <select
                value={matchFormat}
                onChange={(e) => setMatchFormat(e.target.value as MatchFormat)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A192F] border border-[#233554] text-white focus:outline-none focus:border-[#CCFF00]"
              >
                <option value="best_of_3">Al mejor de 3 sets</option>
                <option value="best_of_5">Al mejor de 5 sets (Grand Slam)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Superficie:</label>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A192F] border border-[#233554] text-white focus:outline-none focus:border-[#CCFF00]"
              >
                <option value="Hard (Cemento)">Hard (Cemento / Dura)</option>
                <option value="Clay (Tierra batida)">Clay (Tierra batida)</option>
                <option value="Grass (Césped)">Grass (Césped)</option>
                <option value="Indoor (Pista cubierta)">Indoor (Cubierta)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300">Notas / Torneo (Opcional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Final Torneo Regional - Court Central"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A192F] border border-[#233554] text-white focus:outline-none focus:border-[#CCFF00]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#233554]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-extrabold bg-[#CCFF00] text-[#0A192F] hover:bg-[#b8e600] glow-accent shadow-lg transition-transform active:scale-95"
            >
              Comenzar Partido 🎾
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
