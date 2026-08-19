/**
 * Tennis Data Model v0.3
 * Exact TypeScript definitions matching JSON Schema draft-07
 */

export type PlayerId = 'A' | 'B';

export type MatchFormat = 'best_of_3' | 'best_of_5';

export type ServeSide = 'deuce' | 'ad';

export type ServeType = 1 | 2;

export type ServeResult = 'in_play' | 'ace' | 'double_fault';

export type PointResult =
  | 'ace'
  | 'double_fault'
  | 'return_winner'
  | 'return_error'
  | 'winner'
  | 'forced_error'
  | 'unforced_error';

export type PointContext =
  | 'break_point'
  | 'game_point'
  | 'set_point'
  | 'match_point'
  | 'deuce'
  | 'regular';

export type ReturnType = 'forehand' | 'backhand' | 'block_slice';

export type FinalType =
  | 'forehand'
  | 'backhand'
  | 'volley'
  | 'drop_shot'
  | 'slice'
  | 'smash';

export type DerivedServeZone = 'wide' | 'body' | 't';

export interface Coordinate {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface ServeCourtDetail {
  bote: Coordinate;
}

export interface ReturnCourtDetail {
  restador: Coordinate;
  bote: Coordinate;
}

export interface FinalShotCourtDetail {
  ejecutor: Coordinate;
  destino?: Coordinate;     // Required when point_result = winner
  tiro_errado?: Coordinate; // Required when point_result = unforced_error
}

export interface CourtDetail {
  saque?: ServeCourtDetail | null;
  devolucion?: ReturnCourtDetail | null;
  golpe_final?: FinalShotCourtDetail | null;
}

export interface Point {
  point_id: number;
  server: PlayerId;
  returner: PlayerId;
  serve_side: ServeSide;
  serve_type: ServeType;
  serve_result: ServeResult;
  point_result: PointResult;
  winner: PlayerId;
  score_before: string; // e.g. "15-30" or "5-6"
  point_context: PointContext;
  return_type?: ReturnType | null;
  final_type?: FinalType | null;
  ball_count: number | null;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  duration_ms?: number;
  derived_serve_zone?: DerivedServeZone | null;
  court_detail?: CourtDetail | null;
}

export interface Game {
  game_number: number | null; // null when is_tiebreak is true
  is_tiebreak: boolean;
  points: Point[];
}

export interface Set {
  set_number: number;
  games: Game[];
}

export interface Player {
  name: string;
}

export interface Match {
  match_id: number;
  players: {
    player_a: Player;
    player_b: Player;
  };
  match_format: MatchFormat;
  surface: string;
  date: string;
  notes?: string;
  sets: Set[];
  is_completed?: boolean;
  winner?: PlayerId | null;
  first_server?: PlayerId;
  created_at?: string;
  updated_at?: string;
}

/**
 * Draft state during live point capture in UI
 */
export interface DraftPoint {
  serve_type: ServeType;
  serve_result: ServeResult;
  point_result: PointResult | null;
  winner: PlayerId | null;
  return_type: ReturnType | null;
  final_type: FinalType | null;
  ball_count: number;
  court_detail: CourtDetail;
  derived_serve_zone: DerivedServeZone | null;
  return_switch: 'none' | 'return_winner' | 'return_error';
  start_time_ms: number;
}
