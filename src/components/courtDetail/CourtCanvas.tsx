import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Coordinate, DerivedServeZone, ServeSide } from '../../types/tennis';
import {
  COURT_CONFIG,
  toPixel,
  toNormalized,
  clampCoordinate,
  calculateServeZone,
  ConstraintRule,
} from '../../lib/courtGeometry';

export interface MarkerConfig {
  id: string;
  label: string;
  sublabel?: string;
  coord: Coordinate; // normalized 0-1
  color: string;
  icon?: string;
  rule: ConstraintRule;
}

interface CourtCanvasProps {
  markers: MarkerConfig[];
  onMarkerChange: (id: string, newCoord: Coordinate) => void;
  serveSide?: ServeSide;
  activeServeBox?: ServeSide;
  highlightServeBox?: boolean;
  showTrajectories?: boolean;
  interactive?: boolean;
  currentServeZone?: DerivedServeZone | null;
  className?: string;
}

export const CourtCanvas: React.FC<CourtCanvasProps> = ({
  markers,
  onMarkerChange,
  serveSide = 'deuce',
  activeServeBox,
  highlightServeBox = false,
  showTrajectories = true,
  interactive = true,
  currentServeZone,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const getSvgCoordinates = useCallback((e: React.PointerEvent<SVGSVGElement> | PointerEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const x = ((clientX - rect.left) / rect.width) * COURT_CONFIG.VIEW_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * COURT_CONFIG.VIEW_HEIGHT;

    return { x, y };
  }, []);

  const handlePointerDown = (markerId: string, e: React.PointerEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraggingId(markerId);
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;

    // Find nearest marker if clicked close to one, or move the first active ball marker
    if (markers.length === 1) {
      const marker = markers[0];
      const clamped = clampCoordinate(coords, marker.rule, (serveSide || 'deuce') as ServeSide, false);
      onMarkerChange(marker.id, toNormalized(clamped));
      setDraggingId(marker.id);
    }
  };

  useEffect(() => {
    if (!draggingId || !interactive) return;

    const handlePointerMove = (e: PointerEvent) => {
      const coords = getSvgCoordinates(e);
      if (!coords) return;

      const marker = markers.find((m) => m.id === draggingId);
      if (!marker) return;

      const clamped = clampCoordinate(coords, marker.rule, (serveSide || 'deuce') as ServeSide, false);
      onMarkerChange(draggingId, toNormalized(clamped));
    };

    const handlePointerUp = () => {
      setDraggingId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingId, interactive, getSvgCoordinates, markers, onMarkerChange, serveSide]);

  // Coordinates for lines
  const {
    VIEW_WIDTH,
    VIEW_HEIGHT,
    SINGLES_LEFT,
    SINGLES_RIGHT,
    SINGLES_TOP,
    SINGLES_BOTTOM,
    NET_Y,
    CENTER_X,
    SERVICE_TOP_Y,
    SERVICE_BOTTOM_Y,
  } = COURT_CONFIG;

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Live Zone Tag if serving */}
      {currentServeZone && (
        <div className="absolute top-2 right-3 z-10 px-2.5 py-1 rounded-full bg-[#112240]/90 border border-[#CCFF00]/40 text-[#CCFF00] text-xs font-semibold backdrop-blur shadow-md flex items-center gap-1.5 animate-pulse">
          <span>📍 Saque:</span>
          <span className="uppercase tracking-wider font-bold">
            {currentServeZone === 'wide' ? 'Abierto (Wide)' : currentServeZone === 'body' ? 'Cuerpo (Body)' : 'Centro (T)'}
          </span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full max-w-[320px] sm:max-w-[360px] h-auto max-h-[58vh] touch-none rounded-xl border border-[#233554] shadow-2xl bg-[#0d1f3d]"
        onPointerDown={handleSvgPointerDown}
      >
        {/* Court Ground & Textures */}
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0d1f3d" />

        {/* Outer Singles Court Fill */}
        <rect
          x={SINGLES_LEFT}
          y={SINGLES_TOP}
          width={SINGLES_RIGHT - SINGLES_LEFT}
          height={SINGLES_BOTTOM - SINGLES_TOP}
          fill="#162c54"
          stroke="none"
        />

        {/* Active Service Box Highlight */}
        {highlightServeBox && (
          <rect
            x={serveSide === 'deuce' ? SINGLES_LEFT : CENTER_X}
            y={SERVICE_TOP_Y}
            width={(SINGLES_RIGHT - SINGLES_LEFT) / 2}
            height={NET_Y - SERVICE_TOP_Y}
            fill="#CCFF00"
            fillOpacity="0.12"
            stroke="#CCFF00"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Outer Court Boundary Lines */}
        <rect
          x={SINGLES_LEFT}
          y={SINGLES_TOP}
          width={SINGLES_RIGHT - SINGLES_LEFT}
          height={SINGLES_BOTTOM - SINGLES_TOP}
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1.5"
        />

        {/* Service Lines (Top and Bottom) */}
        <line
          x1={SINGLES_LEFT}
          y1={SERVICE_TOP_Y}
          x2={SINGLES_RIGHT}
          y2={SERVICE_TOP_Y}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.2"
        />
        <line
          x1={SINGLES_LEFT}
          y1={SERVICE_BOTTOM_Y}
          x2={SINGLES_RIGHT}
          y2={SERVICE_BOTTOM_Y}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.2"
        />

        {/* Center Service Line */}
        <line
          x1={CENTER_X}
          y1={SERVICE_TOP_Y}
          x2={CENTER_X}
          y2={SERVICE_BOTTOM_Y}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.2"
        />

        {/* Baseline Center Marks */}
        <line
          x1={CENTER_X}
          y1={SINGLES_TOP}
          x2={CENTER_X}
          y2={SINGLES_TOP + 6}
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1.2"
        />
        <line
          x1={CENTER_X}
          y1={SINGLES_BOTTOM - 6}
          x2={CENTER_X}
          y2={SINGLES_BOTTOM}
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1.2"
        />

        {/* Tennis Net */}
        <line
          x1={SINGLES_LEFT - 10}
          y1={NET_Y}
          x2={SINGLES_RIGHT + 10}
          y2={NET_Y}
          stroke="#00F0FF"
          strokeWidth="2"
          strokeOpacity="0.8"
        />
        {/* Net Posts */}
        <circle cx={SINGLES_LEFT - 10} cy={NET_Y} r="2.5" fill="#00F0FF" />
        <circle cx={SINGLES_RIGHT + 10} cy={NET_Y} r="2.5" fill="#00F0FF" />

        {/* Opponent / Server Side labels */}
        <text
          x={CENTER_X}
          y={SINGLES_TOP - 12}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.3)"
          fontSize="7"
          fontWeight="bold"
          letterSpacing="1"
        >
          RESTADOR / RIVAL
        </text>
        <text
          x={CENTER_X}
          y={SINGLES_BOTTOM + 20}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.3)"
          fontSize="7"
          fontWeight="bold"
          letterSpacing="1"
        >
          SACADOR / FONDO
        </text>

        {/* Trajectory lines between 2 markers if present */}
        {showTrajectories && markers.length >= 2 && (
          <line
            x1={toPixel(markers[0].coord).x}
            y1={toPixel(markers[0].coord).y}
            x2={toPixel(markers[1].coord).x}
            y2={toPixel(markers[1].coord).y}
            stroke={markers[1].color}
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.8"
          />
        )}

        {/* Markers */}
        {markers.map((marker) => {
          const pixel = toPixel(marker.coord);
          const isDragging = draggingId === marker.id;

          return (
            <g
              key={marker.id}
              transform={`translate(${pixel.x}, ${pixel.y})`}
              className={`transition-transform duration-75 ${
                interactive ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              onPointerDown={(e) => handlePointerDown(marker.id, e)}
            >
              {/* Outer Pulse Glow */}
              <circle
                r={isDragging ? 18 : 12}
                fill={marker.color}
                fillOpacity={isDragging ? 0.45 : 0.25}
                className={isDragging ? '' : 'animate-ping origin-center'}
                style={{ animationDuration: '2.5s' }}
              />

              {/* Marker Body */}
              <circle
                r={isDragging ? 9 : 7}
                fill={marker.color}
                stroke="#0A192F"
                strokeWidth="1.8"
                style={{ filter: `drop-shadow(0 0 6px ${marker.color})` }}
              />

              {/* Center Dot */}
              <circle r="2.5" fill="#0A192F" />

              {/* Label Pill */}
              <g transform="translate(0, -13)">
                <rect
                  x="-28"
                  y="-11"
                  width="56"
                  height="11"
                  rx="3"
                  fill="#0A192F"
                  fillOpacity="0.9"
                  stroke={marker.color}
                  strokeWidth="0.8"
                />
                <text
                  x="0"
                  y="-3.5"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="5.5"
                  fontWeight="bold"
                  letterSpacing="0.2"
                >
                  {marker.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Subtitle helper */}
      {interactive && (
        <div className="mt-2 text-center text-xs text-slate-400 font-medium">
          💡 Toca o arrastra los marcadores para posicionar con exactitud
        </div>
      )}
    </div>
  );
};
