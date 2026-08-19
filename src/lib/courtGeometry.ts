import { Coordinate, DerivedServeZone, ServeSide } from '../types/tennis';

/**
 * Court Dimensions (ViewBox 200 x 400 - 1:2 aspect ratio)
 * Singles Court: 115 x 330
 */
export const COURT_CONFIG = {
  VIEW_WIDTH: 200,
  VIEW_HEIGHT: 400,

  // Singles Court Bounds (centered)
  SINGLES_LEFT: 42.5,
  SINGLES_RIGHT: 157.5,
  SINGLES_TOP: 35.0,
  SINGLES_BOTTOM: 365.0,
  
  // Dimensions
  SINGLES_WIDTH: 115.0,
  SINGLES_HEIGHT: 330.0,

  // Key Lines
  NET_Y: 200.0,
  CENTER_X: 100.0,
  SERVICE_TOP_Y: 117.5,    // Net - 82.5
  SERVICE_BOTTOM_Y: 282.5, // Net + 82.5

  // Center mark height
  CENTER_MARK_LEN: 6.0,
};

/**
 * Convert pixel coords (0-200, 0-400) to normalized (0-1)
 */
export function toNormalized(pixelCoord: Coordinate): Coordinate {
  return {
    x: Math.max(0, Math.min(1, pixelCoord.x / COURT_CONFIG.VIEW_WIDTH)),
    y: Math.max(0, Math.min(1, pixelCoord.y / COURT_CONFIG.VIEW_HEIGHT)),
  };
}

/**
 * Convert normalized coords (0-1) to pixel coords (0-200, 0-400)
 */
export function toPixel(normCoord: Coordinate): Coordinate {
  return {
    x: normCoord.x * COURT_CONFIG.VIEW_WIDTH,
    y: normCoord.y * COURT_CONFIG.VIEW_HEIGHT,
  };
}

/**
 * Get Service Box Pixel Bounds based on ServeSide (serving from bottom to top)
 */
export function getServiceBoxBounds(serveSide: ServeSide) {
  if (serveSide === 'deuce') {
    // Cross court to Top-Left service box
    return {
      minX: COURT_CONFIG.SINGLES_LEFT,
      maxX: COURT_CONFIG.CENTER_X,
      minY: COURT_CONFIG.SERVICE_TOP_Y,
      maxY: COURT_CONFIG.NET_Y,
    };
  } else {
    // Cross court to Top-Right service box
    return {
      minX: COURT_CONFIG.CENTER_X,
      maxX: COURT_CONFIG.SINGLES_RIGHT,
      minY: COURT_CONFIG.SERVICE_TOP_Y,
      maxY: COURT_CONFIG.NET_Y,
    };
  }
}

/**
 * Classify Serve Zone (Wide / Body / T) from normalized or pixel point
 */
export function calculateServeZone(
  coord: Coordinate,
  serveSide: ServeSide,
  isNormalized = true
): DerivedServeZone {
  const pixel = isNormalized ? toPixel(coord) : coord;
  const box = getServiceBoxBounds(serveSide);
  
  // Clamped relative X in box (0 to 1)
  const relX = Math.max(0, Math.min(1, (pixel.x - box.minX) / (box.maxX - box.minX)));

  if (serveSide === 'deuce') {
    // Box is [SINGLES_LEFT, CENTER_X]
    // Left (0 - 0.333): Wide (nearest to sideline)
    // Mid  (0.333 - 0.666): Body
    // Right (0.666 - 1.0): T (nearest to center T line)
    if (relX <= 0.333) return 'wide';
    if (relX <= 0.666) return 'body';
    return 't';
  } else {
    // Ad Box is [CENTER_X, SINGLES_RIGHT]
    // Left (0 - 0.333): T (nearest to center T line)
    // Mid  (0.333 - 0.666): Body
    // Right (0.666 - 1.0): Wide (nearest to sideline)
    if (relX <= 0.333) return 't';
    if (relX <= 0.666) return 'body';
    return 'wide';
  }
}

export type ConstraintRule =
  | 'serve_bounce'        // In active service box
  | 'winner_dest'         // Inside opponent singles court (Top half)
  | 'winner_player'       // Own side (Bottom half) inside/outside
  | 'unforced_player'     // Own side (Bottom half) inside/outside
  | 'unforced_error_ball' // Outside opponent singles court OR in net
  | 'returner_player'     // Receiver own side (Top half)
  | 'return_ball_valid'   // Inside opponent singles court (Bottom half)
  | 'return_ball_error';  // Outside opponent singles court (Bottom half)

/**
 * Clamps coordinates to obey business rules according to Section 7.2
 */
export function clampCoordinate(
  coord: Coordinate,
  rule: ConstraintRule,
  serveSide: ServeSide = 'deuce',
  isNormalized = true
): Coordinate {
  let p = isNormalized ? toPixel(coord) : { ...coord };

  // Keep within canvas
  p.x = Math.max(4, Math.min(COURT_CONFIG.VIEW_WIDTH - 4, p.x));
  p.y = Math.max(4, Math.min(COURT_CONFIG.VIEW_HEIGHT - 4, p.y));

  switch (rule) {
    case 'serve_bounce': {
      const box = getServiceBoxBounds(serveSide);
      p.x = Math.max(box.minX + 2, Math.min(box.maxX - 2, p.x));
      p.y = Math.max(box.minY + 2, Math.min(box.maxY - 2, p.y));
      break;
    }

    case 'winner_dest': {
      // Opponent singles half (Top half: y in [SINGLES_TOP, NET_Y])
      p.x = Math.max(COURT_CONFIG.SINGLES_LEFT + 2, Math.min(COURT_CONFIG.SINGLES_RIGHT - 2, p.x));
      p.y = Math.max(COURT_CONFIG.SINGLES_TOP + 2, Math.min(COURT_CONFIG.NET_Y - 2, p.y));
      break;
    }

    case 'winner_player':
    case 'unforced_player': {
      // Own side (Bottom half: y in [NET_Y + 2, VIEW_HEIGHT])
      p.y = Math.max(COURT_CONFIG.NET_Y + 2, Math.min(COURT_CONFIG.VIEW_HEIGHT - 4, p.y));
      break;
    }

    case 'unforced_error_ball': {
      // Must be outside opponent singles court OR in net
      // If dropped inside opponent court [SINGLES_LEFT, SINGLES_RIGHT] x [SINGLES_TOP, NET_Y], push outside
      const insideOpponentCourt =
        p.x >= COURT_CONFIG.SINGLES_LEFT &&
        p.x <= COURT_CONFIG.SINGLES_RIGHT &&
        p.y >= COURT_CONFIG.SINGLES_TOP &&
        p.y <= COURT_CONFIG.NET_Y;

      if (insideOpponentCourt) {
        // Push nearest to outside baseline or sideline
        const distLeft = p.x - COURT_CONFIG.SINGLES_LEFT;
        const distRight = COURT_CONFIG.SINGLES_RIGHT - p.x;
        const distTop = p.y - COURT_CONFIG.SINGLES_TOP;

        if (distTop <= distLeft && distTop <= distRight) {
          p.y = COURT_CONFIG.SINGLES_TOP - 8;
        } else if (distLeft < distRight) {
          p.x = COURT_CONFIG.SINGLES_LEFT - 8;
        } else {
          p.x = COURT_CONFIG.SINGLES_RIGHT + 8;
        }
      }
      break;
    }

    case 'returner_player': {
      // Receiver side (Top half: y in [0, NET_Y - 2])
      p.y = Math.max(4, Math.min(COURT_CONFIG.NET_Y - 2, p.y));
      break;
    }

    case 'return_ball_valid': {
      // Inside opponent singles court (Bottom half: [SINGLES_LEFT, SINGLES_RIGHT] x [NET_Y, SINGLES_BOTTOM])
      p.x = Math.max(COURT_CONFIG.SINGLES_LEFT + 2, Math.min(COURT_CONFIG.SINGLES_RIGHT - 2, p.x));
      p.y = Math.max(COURT_CONFIG.NET_Y + 2, Math.min(COURT_CONFIG.SINGLES_BOTTOM - 2, p.y));
      break;
    }

    case 'return_ball_error': {
      // Must NOT be inside opponent bottom court
      const insideBottomCourt =
        p.x >= COURT_CONFIG.SINGLES_LEFT &&
        p.x <= COURT_CONFIG.SINGLES_RIGHT &&
        p.y >= COURT_CONFIG.NET_Y &&
        p.y <= COURT_CONFIG.SINGLES_BOTTOM;

      if (insideBottomCourt) {
        const distLeft = p.x - COURT_CONFIG.SINGLES_LEFT;
        const distRight = COURT_CONFIG.SINGLES_RIGHT - p.x;
        const distBottom = COURT_CONFIG.SINGLES_BOTTOM - p.y;

        if (distBottom <= distLeft && distBottom <= distRight) {
          p.y = COURT_CONFIG.SINGLES_BOTTOM + 8;
        } else if (distLeft < distRight) {
          p.x = COURT_CONFIG.SINGLES_LEFT - 8;
        } else {
          p.x = COURT_CONFIG.SINGLES_RIGHT + 8;
        }
      }
      break;
    }
  }

  // Bound check within SVG canvas
  p.x = Math.max(2, Math.min(COURT_CONFIG.VIEW_WIDTH - 2, p.x));
  p.y = Math.max(2, Math.min(COURT_CONFIG.VIEW_HEIGHT - 2, p.y));

  return isNormalized ? toNormalized(p) : p;
}

/**
 * Get default starting positions for markers
 */
export function getDefaultMarkerPosition(rule: ConstraintRule, serveSide: ServeSide = 'deuce'): Coordinate {
  switch (rule) {
    case 'serve_bounce': {
      const box = getServiceBoxBounds(serveSide);
      return toNormalized({
        x: (box.minX + box.maxX) / 2,
        y: (box.minY + box.maxY) / 2,
      });
    }
    case 'winner_player':
    case 'unforced_player':
      return toNormalized({ x: COURT_CONFIG.CENTER_X, y: 350 });
    case 'winner_dest':
      return toNormalized({ x: 80, y: 90 });
    case 'unforced_error_ball':
      return toNormalized({ x: COURT_CONFIG.CENTER_X, y: 20 });
    case 'returner_player':
      return toNormalized({ x: COURT_CONFIG.CENTER_X, y: 50 });
    case 'return_ball_valid':
      return toNormalized({ x: 85, y: 320 });
    case 'return_ball_error':
      return toNormalized({ x: 25, y: 300 });
  }
}
