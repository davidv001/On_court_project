import React, { useState } from 'react';
import { Match, PlayerId, Point } from '../../types/tennis';
import { computeMatchStats, MatchAggregatedStats } from '../../lib/matchStatsEngine';
import { COURT_CONFIG, toPixel } from '../../lib/courtGeometry';
import {
  Activity,
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  Flame,
  Layers,
  MapPin,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

interface MatchAnalyticsViewProps {
  match: Match;
  onBackToLive: () => void;
}

export const MatchAnalyticsView: React.FC<MatchAnalyticsViewProps> = ({
  match,
  onBackToLive,
}) => {
  const stats: MatchAggregatedStats = computeMatchStats(match);
  const [activeTab, setActiveTab] = useState<'stats' | 'heatmap' | 'timeline'>('stats');

  // Heatmap Filters
  const [heatmapPlayer, setHeatmapPlayer] = useState<PlayerId | 'ALL'>('ALL');
  const [heatmapCategory, setHeatmapCategory] = useState<
    'ALL' | 'SERVES' | 'WINNERS' | 'ERRORS' | 'RETURNS'
  >('ALL');
  const [selectedPointDetail, setSelectedPointDetail] = useState<Point | null>(null);

  // Timeline Filters
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'BREAKS' | 'WINNERS' | 'ACES'>('ALL');

  const playerAName = match.players.player_a.name;
  const playerBName = match.players.player_b.name;

  // Flatten all points for timeline & heatmap
  const allPoints: Point[] = [];
  match.sets.forEach((set) => {
    set.games.forEach((game) => {
      game.points.forEach((pt) => allPoints.push(pt));
    });
  });

  // Filtered heatmap points
  const pointsWithSpatial = stats.allPointsWithCoords.filter((pt) => {
    if (heatmapPlayer !== 'ALL') {
      // Check if player executed or won
      if (pt.winner !== heatmapPlayer && pt.server !== heatmapPlayer) return false;
    }

    if (heatmapCategory === 'SERVES') {
      return pt.court_detail?.saque?.bote || pt.serve_result === 'ace';
    }
    if (heatmapCategory === 'WINNERS') {
      return pt.point_result === 'winner' || pt.point_result === 'return_winner';
    }
    if (heatmapCategory === 'ERRORS') {
      return pt.point_result === 'unforced_error' || pt.point_result === 'return_error';
    }
    if (heatmapCategory === 'RETURNS') {
      return pt.court_detail?.devolucion?.bote;
    }

    return true;
  });

  // Export JSON Schema v0.3
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(match, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${match.match_id}_${playerAName}_vs_${playerBName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper for comparison bar
  const renderComparisonBar = (
    label: string,
    valA: number | string,
    valB: number | string,
    numA: number,
    numB: number,
    unit = ''
  ) => {
    const total = numA + numB || 1;
    const pctA = Math.round((numA / total) * 100);
    const pctB = 100 - pctA;

    return (
      <div className="py-2.5 border-b border-[#233554]/60 space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#CCFF00] font-mono-numbers font-bold text-sm">
            {valA}
            {unit}
          </span>
          <span className="text-slate-300 text-center text-xs font-medium px-2">{label}</span>
          <span className="text-[#00F0FF] font-mono-numbers font-bold text-sm">
            {valB}
            {unit}
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#0A192F] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[#CCFF00] rounded-l-full transition-all duration-500"
            style={{ width: `${pctA}%` }}
          />
          <div
            className="h-full bg-[#00F0FF] rounded-r-full transition-all duration-500"
            style={{ width: `${pctB}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A192F] pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0A192F]/95 backdrop-blur-xl border-b border-[#233554] px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBackToLive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#112240] hover:bg-[#1B2D4F] border border-[#233554] text-xs font-bold text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#CCFF00]" />
            <span>Volver a Captura</span>
          </button>

          <div className="text-center">
            <h1 className="text-sm font-extrabold text-white">Análisis & Estadísticas</h1>
            <p className="text-[11px] text-slate-400">
              {playerAName} vs {playerBName} • {match.surface}
            </p>
          </div>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#CCFF00] text-[#0A192F] hover:bg-[#b8e600] text-xs font-extrabold shadow-md transition"
            title="Exportar JSON v0.3"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar JSON</span>
          </button>
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="max-w-4xl w-full mx-auto px-4 pt-4">
        <div className="flex rounded-xl bg-[#112240] border border-[#233554] p-1 gap-1">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-[#CCFF00] text-[#0A192F] shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Estadísticas Clave</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'heatmap'
                ? 'bg-[#00F0FF] text-[#0A192F] shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Court Detail & Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'bg-purple-400 text-[#0A192F] shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Log Punto a Punto</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-4 py-4 space-y-4">
        {/* TAB 1: KEY STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Players Banner */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#112240] border border-[#233554] glass-card">
              <div className="p-3 rounded-xl bg-[#0A192F]/60 border border-[#CCFF00]/30 text-left space-y-1">
                <div className="text-[10px] text-[#CCFF00] font-black uppercase">Jugador A</div>
                <div className="text-base sm:text-lg font-black text-white truncate">
                  {playerAName}
                </div>
                <div className="text-xs text-slate-300 font-mono-numbers">
                  {stats.playerA.totalPointsWon} pts ganados
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0A192F]/60 border border-[#00F0FF]/30 text-right space-y-1">
                <div className="text-[10px] text-[#00F0FF] font-black uppercase">Jugador B</div>
                <div className="text-base sm:text-lg font-black text-white truncate">
                  {playerBName}
                </div>
                <div className="text-xs text-slate-300 font-mono-numbers">
                  {stats.playerB.totalPointsWon} pts ganados
                </div>
              </div>
            </div>

            {/* Servicio & Devolución */}
            <div className="p-4 rounded-2xl bg-[#112240] border border-[#233554] glass-card space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#CCFF00]" />
                Rendimiento de Saque y Devolución
              </h3>

              <div className="space-y-1">
                {renderComparisonBar(
                  '1° Saque Dentro',
                  `${stats.playerA.firstServePercentage}% (${stats.playerA.firstServesIn}/${stats.playerA.firstServesAttempted})`,
                  `${stats.playerB.firstServePercentage}% (${stats.playerB.firstServesIn}/${stats.playerB.firstServesAttempted})`,
                  stats.playerA.firstServePercentage,
                  stats.playerB.firstServePercentage
                )}

                {renderComparisonBar(
                  'Ptos Ganados con 1° Saque',
                  `${stats.playerA.firstServeWonPercentage}% (${stats.playerA.firstServePointsWon}/${stats.playerA.firstServesIn})`,
                  `${stats.playerB.firstServeWonPercentage}% (${stats.playerB.firstServePointsWon}/${stats.playerB.firstServesIn})`,
                  stats.playerA.firstServeWonPercentage,
                  stats.playerB.firstServeWonPercentage
                )}

                {renderComparisonBar(
                  'Ptos Ganados con 2° Saque',
                  `${stats.playerA.secondServeWonPercentage}% (${stats.playerA.secondServesWon}/${stats.playerA.secondServesAttempted})`,
                  `${stats.playerB.secondServeWonPercentage}% (${stats.playerB.secondServesWon}/${stats.playerB.secondServesAttempted})`,
                  stats.playerA.secondServeWonPercentage,
                  stats.playerB.secondServeWonPercentage
                )}

                {renderComparisonBar(
                  'Aces',
                  stats.playerA.aces,
                  stats.playerB.aces,
                  stats.playerA.aces,
                  stats.playerB.aces
                )}

                {renderComparisonBar(
                  'Dobles Faltas',
                  stats.playerA.doubleFaults,
                  stats.playerB.doubleFaults,
                  stats.playerA.doubleFaults,
                  stats.playerB.doubleFaults
                )}

                {renderComparisonBar(
                  'Break Points Convertidos',
                  `${stats.playerA.breakPointsConverted}/${stats.playerA.breakPointsOpportunities}`,
                  `${stats.playerB.breakPointsConverted}/${stats.playerB.breakPointsOpportunities}`,
                  stats.playerA.breakPointsConverted,
                  stats.playerB.breakPointsConverted
                )}
              </div>
            </div>

            {/* Winners vs Errores */}
            <div className="p-4 rounded-2xl bg-[#112240] border border-[#233554] glass-card space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#00F0FF]" />
                Ganadores y Errores por Tipo de Golpe
              </h3>

              <div className="space-y-1">
                {renderComparisonBar(
                  'Total Winners',
                  stats.playerA.winners,
                  stats.playerB.winners,
                  stats.playerA.winners,
                  stats.playerB.winners
                )}

                {renderComparisonBar(
                  'Winners de Derecha',
                  stats.playerA.winnersByStroke.forehand,
                  stats.playerB.winnersByStroke.forehand,
                  stats.playerA.winnersByStroke.forehand,
                  stats.playerB.winnersByStroke.forehand
                )}

                {renderComparisonBar(
                  'Winners de Revés',
                  stats.playerA.winnersByStroke.backhand,
                  stats.playerB.winnersByStroke.backhand,
                  stats.playerA.winnersByStroke.backhand,
                  stats.playerB.winnersByStroke.backhand
                )}

                {renderComparisonBar(
                  'Winners de Volea / Dejada',
                  stats.playerA.winnersByStroke.volley + stats.playerA.winnersByStroke.drop_shot,
                  stats.playerB.winnersByStroke.volley + stats.playerB.winnersByStroke.drop_shot,
                  stats.playerA.winnersByStroke.volley + stats.playerA.winnersByStroke.drop_shot,
                  stats.playerB.winnersByStroke.volley + stats.playerB.winnersByStroke.drop_shot
                )}

                {renderComparisonBar(
                  'Total Errores No Forzados',
                  stats.playerA.unforcedErrors,
                  stats.playerB.unforcedErrors,
                  stats.playerA.unforcedErrors,
                  stats.playerB.unforcedErrors
                )}

                {renderComparisonBar(
                  'Errores Forzados',
                  stats.playerA.forcedErrors,
                  stats.playerB.forcedErrors,
                  stats.playerA.forcedErrors,
                  stats.playerB.forcedErrors
                )}
              </div>
            </div>

            {/* Distribución de Zonas de Saque (Wide / Body / T) */}
            <div className="p-4 rounded-2xl bg-[#112240] border border-[#233554] glass-card space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#CCFF00]" />
                Distribución de Zonas de Saque (Inferidas por Coordenadas)
              </h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Player A Serve Zones */}
                <div className="p-3 rounded-xl bg-[#0A192F]/60 border border-[#233554] space-y-2">
                  <div className="text-xs font-bold text-[#CCFF00] truncate">{playerAName}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Abierto (Wide):</span>
                      <span className="font-mono-numbers font-bold">{stats.playerA.serveZones.wide}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cuerpo (Body):</span>
                      <span className="font-mono-numbers font-bold">{stats.playerA.serveZones.body}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Centro (T):</span>
                      <span className="font-mono-numbers font-bold">{stats.playerA.serveZones.t}</span>
                    </div>
                  </div>
                </div>

                {/* Player B Serve Zones */}
                <div className="p-3 rounded-xl bg-[#0A192F]/60 border border-[#233554] space-y-2">
                  <div className="text-xs font-bold text-[#00F0FF] truncate">{playerBName}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Abierto (Wide):</span>
                      <span className="font-mono-numbers font-bold">{stats.playerB.serveZones.wide}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cuerpo (Body):</span>
                      <span className="font-mono-numbers font-bold">{stats.playerB.serveZones.body}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Centro (T):</span>
                      <span className="font-mono-numbers font-bold">{stats.playerB.serveZones.t}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Longitud del Rally */}
            <div className="p-4 rounded-2xl bg-[#112240] border border-[#233554] glass-card space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Dominio por Largo de Rally (Cantidad de Golpes)
              </h3>

              <div className="space-y-1">
                {renderComparisonBar(
                  'Rallies Cortos (1-3 bolas)',
                  stats.playerA.rallyLengthWon.short_1_3,
                  stats.playerB.rallyLengthWon.short_1_3,
                  stats.playerA.rallyLengthWon.short_1_3,
                  stats.playerB.rallyLengthWon.short_1_3
                )}
                {renderComparisonBar(
                  'Rallies Medios (4-6 bolas)',
                  stats.playerA.rallyLengthWon.medium_4_6,
                  stats.playerB.rallyLengthWon.medium_4_6,
                  stats.playerA.rallyLengthWon.medium_4_6,
                  stats.playerB.rallyLengthWon.medium_4_6
                )}
                {renderComparisonBar(
                  'Rallies Largos (7-9 bolas)',
                  stats.playerA.rallyLengthWon.long_7_9,
                  stats.playerB.rallyLengthWon.long_7_9,
                  stats.playerA.rallyLengthWon.long_7_9,
                  stats.playerB.rallyLengthWon.long_7_9
                )}
                {renderComparisonBar(
                  'Rallies Extendidos (10+ bolas)',
                  stats.playerA.rallyLengthWon.extended_10_plus,
                  stats.playerB.rallyLengthWon.extended_10_plus,
                  stats.playerA.rallyLengthWon.extended_10_plus,
                  stats.playerB.rallyLengthWon.extended_10_plus
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COURT DETAIL & HEATMAP */}
        {activeTab === 'heatmap' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-[#112240] border border-[#233554] glass-card space-y-3">
              {/* Player Filter */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Filtrar por Jugador:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'Ambos Jugadores' },
                    { id: 'A', label: playerAName },
                    { id: 'B', label: playerBName },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setHeatmapPlayer(p.id as any)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg border transition ${
                        heatmapPlayer === p.id
                          ? 'bg-[#CCFF00] text-[#0A192F] border-[#CCFF00]'
                          : 'bg-[#1B2D4F]/50 text-slate-300 border-[#233554]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shot Type Filter */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Categoría de Tiro:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'SERVES', label: 'Saques & Aces' },
                    { id: 'WINNERS', label: 'Winners' },
                    { id: 'ERRORS', label: 'Errores' },
                    { id: 'RETURNS', label: 'Devoluciones' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setHeatmapCategory(cat.id as any)}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition ${
                        heatmapCategory === cat.id
                          ? 'bg-[#00F0FF] text-[#0A192F] border-[#00F0FF] font-bold'
                          : 'bg-[#1B2D4F]/50 text-slate-300 border-[#233554]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Visual Canvas */}
            <div className="p-4 rounded-2xl bg-[#112240] border border-[#233554] glass-card flex flex-col items-center">
              <div className="relative w-full max-w-sm flex justify-center">
                <svg
                  viewBox={`0 0 ${COURT_CONFIG.VIEW_WIDTH} ${COURT_CONFIG.VIEW_HEIGHT}`}
                  className="w-full h-auto rounded-xl border border-[#233554] shadow-2xl bg-[#0d1f3d]"
                >
                  {/* Court Base */}
                  <rect width={COURT_CONFIG.VIEW_WIDTH} height={COURT_CONFIG.VIEW_HEIGHT} fill="#0d1f3d" />
                  <rect
                    x={COURT_CONFIG.SINGLES_LEFT}
                    y={COURT_CONFIG.SINGLES_TOP}
                    width={COURT_CONFIG.SINGLES_WIDTH}
                    height={COURT_CONFIG.SINGLES_HEIGHT}
                    fill="#162c54"
                  />
                  {/* Outer Lines */}
                  <rect
                    x={COURT_CONFIG.SINGLES_LEFT}
                    y={COURT_CONFIG.SINGLES_TOP}
                    width={COURT_CONFIG.SINGLES_WIDTH}
                    height={COURT_CONFIG.SINGLES_HEIGHT}
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                  />
                  {/* Service Lines */}
                  <line
                    x1={COURT_CONFIG.SINGLES_LEFT}
                    y1={COURT_CONFIG.SERVICE_TOP_Y}
                    x2={COURT_CONFIG.SINGLES_RIGHT}
                    y2={COURT_CONFIG.SERVICE_TOP_Y}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={COURT_CONFIG.SINGLES_LEFT}
                    y1={COURT_CONFIG.SERVICE_BOTTOM_Y}
                    x2={COURT_CONFIG.SINGLES_RIGHT}
                    y2={COURT_CONFIG.SERVICE_BOTTOM_Y}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={COURT_CONFIG.CENTER_X}
                    y1={COURT_CONFIG.SERVICE_TOP_Y}
                    x2={COURT_CONFIG.CENTER_X}
                    y2={COURT_CONFIG.SERVICE_BOTTOM_Y}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.2"
                  />
                  {/* Net */}
                  <line
                    x1={COURT_CONFIG.SINGLES_LEFT - 8}
                    y1={COURT_CONFIG.NET_Y}
                    x2={COURT_CONFIG.SINGLES_RIGHT + 8}
                    y2={COURT_CONFIG.NET_Y}
                    stroke="#00F0FF"
                    strokeWidth="2"
                    strokeOpacity="0.8"
                  />

                  {/* Plotted Points */}
                  {pointsWithSpatial.map((pt) => {
                    const elements: React.ReactNode[] = [];

                    // 1. Saque
                    if (
                      pt.court_detail?.saque?.bote &&
                      (heatmapCategory === 'ALL' || heatmapCategory === 'SERVES')
                    ) {
                      const p = toPixel(pt.court_detail.saque.bote);
                      elements.push(
                        <g
                          key={`saque_${pt.point_id}`}
                          onClick={() => setSelectedPointDetail(pt)}
                          className="cursor-pointer group"
                        >
                          <circle cx={p.x} cy={p.y} r="4" fill="#CCFF00" opacity="0.85" />
                          <circle cx={p.x} cy={p.y} r="8" fill="#CCFF00" opacity="0.2" className="animate-ping origin-center" />
                        </g>
                      );
                    }

                    // 2. Winner Destino
                    if (
                      pt.court_detail?.golpe_final?.destino &&
                      (heatmapCategory === 'ALL' || heatmapCategory === 'WINNERS')
                    ) {
                      const p = toPixel(pt.court_detail.golpe_final.destino);
                      elements.push(
                        <g
                          key={`win_${pt.point_id}`}
                          onClick={() => setSelectedPointDetail(pt)}
                          className="cursor-pointer"
                        >
                          <circle cx={p.x} cy={p.y} r="5" fill="#00F0FF" stroke="#0A192F" strokeWidth="1" />
                          <circle cx={p.x} cy={p.y} r="9" fill="#00F0FF" opacity="0.25" />
                        </g>
                      );
                    }

                    // 3. Error No Forzado Tiro Errado
                    if (
                      pt.court_detail?.golpe_final?.tiro_errado &&
                      (heatmapCategory === 'ALL' || heatmapCategory === 'ERRORS')
                    ) {
                      const p = toPixel(pt.court_detail.golpe_final.tiro_errado);
                      elements.push(
                        <g
                          key={`err_${pt.point_id}`}
                          onClick={() => setSelectedPointDetail(pt)}
                          className="cursor-pointer"
                        >
                          <circle cx={p.x} cy={p.y} r="5" fill="#FF4D4D" stroke="#0A192F" strokeWidth="1" />
                          <circle cx={p.x} cy={p.y} r="9" fill="#FF4D4D" opacity="0.25" />
                        </g>
                      );
                    }

                    // 4. Devolución
                    if (
                      pt.court_detail?.devolucion?.bote &&
                      (heatmapCategory === 'ALL' || heatmapCategory === 'RETURNS')
                    ) {
                      const p = toPixel(pt.court_detail.devolucion.bote);
                      const col =
                        pt.point_result === 'return_error' ? '#FF4D4D' : '#00F0FF';
                      elements.push(
                        <g
                          key={`dev_${pt.point_id}`}
                          onClick={() => setSelectedPointDetail(pt)}
                          className="cursor-pointer"
                        >
                          <circle cx={p.x} cy={p.y} r="4.5" fill={col} stroke="#0A192F" strokeWidth="1" />
                        </g>
                      );
                    }

                    return elements;
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#CCFF00]" />
                  <span className="text-slate-300">Saques / Bote</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#00F0FF]" />
                  <span className="text-slate-300">Winners</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF4D4D]" />
                  <span className="text-slate-300">Errores</span>
                </div>
              </div>

              {/* Point Inspector Pop-up */}
              {selectedPointDetail && (
                <div className="mt-4 w-full p-3.5 rounded-xl bg-[#0A192F] border border-[#00F0FF]/50 space-y-1.5 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#CCFF00]">
                      Punto #{selectedPointDetail.point_id}
                    </span>
                    <button
                      onClick={() => setSelectedPointDetail(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-slate-200">
                    <strong>Marcador:</strong> {selectedPointDetail.score_before} •{' '}
                    <strong>Ganador:</strong> {selectedPointDetail.winner === 'A' ? playerAName : playerBName}
                  </div>
                  <div className="text-slate-300">
                    <strong>Naturaleza:</strong> {selectedPointDetail.point_result}{' '}
                    {selectedPointDetail.final_type ? `(${selectedPointDetail.final_type})` : ''} •{' '}
                    <strong>Bolas:</strong> {selectedPointDetail.ball_count}
                  </div>
                  {selectedPointDetail.derived_serve_zone && (
                    <div className="text-[#CCFF00]">
                      <strong>Zona Saque:</strong> {selectedPointDetail.derived_serve_zone.toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TIMELINE LOG */}
        {activeTab === 'timeline' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Timeline Filter */}
            <div className="p-3 rounded-xl bg-[#112240] border border-[#233554] flex gap-2">
              {[
                { id: 'ALL', label: 'Todos los Puntos' },
                { id: 'BREAKS', label: 'Break Points' },
                { id: 'WINNERS', label: 'Winners' },
                { id: 'ACES', label: 'Aces' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTimelineFilter(f.id as any)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    timelineFilter === f.id
                      ? 'bg-purple-400 text-[#0A192F] border-purple-400 font-bold'
                      : 'bg-[#1B2D4F]/50 text-slate-300 border-[#233554]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* List of Points */}
            <div className="space-y-2">
              {allPoints
                .filter((pt) => {
                  if (timelineFilter === 'BREAKS') return pt.point_context === 'break_point';
                  if (timelineFilter === 'WINNERS')
                    return pt.point_result === 'winner' || pt.point_result === 'return_winner';
                  if (timelineFilter === 'ACES') return pt.serve_result === 'ace';
                  return true;
                })
                .map((pt, idx) => {
                  const winnerName = pt.winner === 'A' ? playerAName : playerBName;
                  const isBreakPoint = pt.point_context === 'break_point';
                  const isAce = pt.serve_result === 'ace';
                  const isWinner = pt.point_result === 'winner' || pt.point_result === 'return_winner';

                  return (
                    <div
                      key={pt.point_id || idx}
                      className="p-3 rounded-xl bg-[#112240] border border-[#233554] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-numbers font-bold text-slate-300">
                            {pt.score_before}
                          </span>
                          <span className="font-extrabold text-white">
                            Punto para {winnerName}
                          </span>
                          {isBreakPoint && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              BP
                            </span>
                          )}
                          {isAce && (
                            <span className="px-1.5 py-0.2 rounded bg-[#CCFF00]/20 text-[#CCFF00] text-[10px] font-bold">
                              ACE
                            </span>
                          )}
                          {isWinner && (
                            <span className="px-1.5 py-0.2 rounded bg-[#00F0FF]/20 text-[#00F0FF] text-[10px] font-bold">
                              WINNER
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {pt.serve_type === 1 ? '1° Saque' : '2° Saque'} •{' '}
                          {pt.final_type || pt.return_type || pt.point_result} •{' '}
                          {pt.ball_count} bolas • Lado: {pt.serve_side}
                        </div>
                      </div>

                      {pt.court_detail && (
                        <span className="p-1.5 rounded-lg bg-[#1B2D4F] text-[#00F0FF]" title="Tiene detalle espacial">
                          <MapPin className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
