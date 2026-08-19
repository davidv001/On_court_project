import React, { useState, useEffect } from 'react';
import { Match, MatchFormat, PlayerId } from './types/tennis';
import { MatchRepository } from './lib/db';
import { createSampleGrandSlamMatch } from './lib/sampleMatch';
import { createNewMatch } from './lib/tennisScoreEngine';
import { LiveCaptureView } from './components/match/LiveCaptureView';
import { MatchAnalyticsView } from './components/analytics/MatchAnalyticsView';
import { MatchHistoryView } from './components/match/MatchHistoryView';
import { MatchSetupModal } from './components/match/MatchSetupModal';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [currentView, setCurrentView] = useState<'live' | 'analytics' | 'history'>('live');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load matches from Dexie / LocalStorage on mount
  useEffect(() => {
    async function loadData() {
      try {
        const storedMatches = await MatchRepository.getAllMatches();
        if (storedMatches && storedMatches.length > 0) {
          setMatches(storedMatches);
          setActiveMatch(storedMatches[0]);
        } else {
          // Initialize with rich sample match so users can see features immediately
          const sample = createSampleGrandSlamMatch();
          await MatchRepository.saveMatch(sample);
          setMatches([sample]);
          setActiveMatch(sample);
        }
      } catch (err) {
        console.warn('Initial data load error:', err);
        const sample = createSampleGrandSlamMatch();
        setMatches([sample]);
        setActiveMatch(sample);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  // Update match handler (autosaves to Dexie)
  const handleUpdateMatch = async (updated: Match) => {
    setActiveMatch(updated);
    setMatches((prev) =>
      prev.map((m) => (m.match_id === updated.match_id ? updated : m))
    );
    await MatchRepository.saveMatch(updated);
  };

  // Create new match handler
  const handleCreateNewMatch = async (data: {
    playerAName: string;
    playerBName: string;
    matchFormat: MatchFormat;
    surface: string;
    firstServer: PlayerId;
    notes: string;
  }) => {
    const match = createNewMatch(
      data.playerAName,
      data.playerBName,
      data.matchFormat,
      data.surface,
      data.firstServer,
      data.notes
    );

    await MatchRepository.saveMatch(match);
    setMatches((prev) => [match, ...prev]);
    setActiveMatch(match);
    setCurrentView('live');
  };

  // Load demo match handler
  const handleLoadDemoMatch = async () => {
    const demo = createSampleGrandSlamMatch();
    demo.match_id = Date.now();
    await MatchRepository.saveMatch(demo);
    setMatches((prev) => [demo, ...prev]);
    setActiveMatch(demo);
    setCurrentView('live');
  };

  // Delete match handler
  const handleDeleteMatch = async (matchId: number) => {
    await MatchRepository.deleteMatch(matchId);
    setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
    if (activeMatch?.match_id === matchId) {
      const remaining = matches.filter((m) => m.match_id !== matchId);
      setActiveMatch(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Import match handler
  const handleImportMatch = async (imported: Match) => {
    await MatchRepository.saveMatch(imported);
    setMatches((prev) => [imported, ...prev]);
    setActiveMatch(imported);
    setCurrentView('live');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-[#CCFF00] border-t-transparent animate-spin" />
        <div className="text-sm font-bold tracking-wider">Cargando AceTrack...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A192F] text-slate-100 font-sans selection:bg-[#CCFF00] selection:text-[#0A192F]">
      {/* View routing */}
      {currentView === 'live' && activeMatch && (
        <LiveCaptureView
          match={activeMatch}
          onUpdateMatch={handleUpdateMatch}
          onNavigateToStats={() => setCurrentView('analytics')}
          onNavigateToHistory={() => setCurrentView('history')}
        />
      )}

      {currentView === 'analytics' && activeMatch && (
        <MatchAnalyticsView
          match={activeMatch}
          onBackToLive={() => setCurrentView('live')}
        />
      )}

      {currentView === 'history' && (
        <MatchHistoryView
          matches={matches}
          currentMatchId={activeMatch?.match_id || null}
          onSelectMatch={(m) => {
            setActiveMatch(m);
            setCurrentView('live');
          }}
          onOpenNewMatchModal={() => setIsSetupModalOpen(true)}
          onLoadDemoMatch={handleLoadDemoMatch}
          onDeleteMatch={handleDeleteMatch}
          onImportMatch={handleImportMatch}
        />
      )}

      {/* If no active match (e.g. all deleted), prompt creation */}
      {!activeMatch && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-4">
          <span className="text-5xl">🎾</span>
          <h2 className="text-xl font-extrabold text-white">No hay partido seleccionado</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Crea un nuevo partido o carga el partido demo para comenzar a capturar datos.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#CCFF00] text-[#0A192F] font-bold text-sm"
            >
              Nuevo Partido
            </button>
            <button
              onClick={handleLoadDemoMatch}
              className="px-5 py-2.5 rounded-xl bg-[#1B2D4F] text-white font-bold text-sm"
            >
              Cargar Demo
            </button>
          </div>
        </div>
      )}

      {/* New Match Setup Modal */}
      {isSetupModalOpen && (
        <MatchSetupModal
          isOpen={true}
          onClose={() => setIsSetupModalOpen(false)}
          onCreateMatch={handleCreateNewMatch}
        />
      )}
    </div>
  );
}
