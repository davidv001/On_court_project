import Dexie, { Table } from 'dexie';
import { Match } from '../types/tennis';

export class AceTrackDatabase extends Dexie {
  matches!: Table<Match, number>;

  constructor() {
    super('AceTrackDB');
    this.version(1).stores({
      matches: 'match_id, date, is_completed, updated_at',
    });
  }
}

export const db = new AceTrackDatabase();

const LOCAL_STORAGE_KEY = 'acetrack_matches_backup';

export const MatchRepository = {
  async saveMatch(match: Match): Promise<void> {
    try {
      await db.matches.put(match);
    } catch (err) {
      console.warn('Dexie save error, falling back to localStorage:', err);
    }

    // Also sync to localStorage as redundant offline safety
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const matches: Match[] = stored ? JSON.parse(stored) : [];
      const idx = matches.findIndex((m) => m.match_id === match.match_id);
      if (idx >= 0) {
        matches[idx] = match;
      } else {
        matches.unshift(match);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(matches));
    } catch (e) {
      console.warn('LocalStorage backup error:', e);
    }
  },

  async getMatch(matchId: number): Promise<Match | null> {
    try {
      const match = await db.matches.get(matchId);
      if (match) return match;
    } catch (err) {
      console.warn('Dexie get error:', err);
    }

    // Fallback
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const matches: Match[] = JSON.parse(stored);
        return matches.find((m) => m.match_id === matchId) || null;
      }
    } catch (e) {
      console.warn('LocalStorage get error:', e);
    }

    return null;
  },

  async getAllMatches(): Promise<Match[]> {
    try {
      const matches = await db.matches.orderBy('match_id').reverse().toArray();
      if (matches && matches.length > 0) return matches;
    } catch (err) {
      console.warn('Dexie getAll error:', err);
    }

    // Fallback
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('LocalStorage getAll error:', e);
    }

    return [];
  },

  async deleteMatch(matchId: number): Promise<void> {
    try {
      await db.matches.delete(matchId);
    } catch (err) {
      console.warn('Dexie delete error:', err);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const matches: Match[] = JSON.parse(stored);
        const filtered = matches.filter((m) => m.match_id !== matchId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('LocalStorage delete error:', e);
    }
  },
};
