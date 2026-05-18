export type LeaderboardEntry = {
  name: string;
  steps: number;
  durationMs: number;
  completedAt: string;
};

const LEADERBOARD_KEY = 'river-crossing.leaderboard';
const MAX_LEADERBOARD_ENTRIES = 50;
const MAX_NAME_LENGTH = 12;

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<LeaderboardEntry>;
  return (
    typeof entry.name === 'string' &&
    typeof entry.steps === 'number' &&
    Number.isFinite(entry.steps) &&
    typeof entry.durationMs === 'number' &&
    Number.isFinite(entry.durationMs) &&
    typeof entry.completedAt === 'string'
  );
}

function readStoredEntries(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  const stored = window.localStorage.getItem(LEADERBOARD_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLeaderboardEntry);
  } catch {
    return [];
  }
}

function writeStoredEntries(entries: LeaderboardEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function timestamp(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

export function normalizeLeaderboardName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => (
    a.steps - b.steps ||
    a.durationMs - b.durationMs ||
    timestamp(a.completedAt) - timestamp(b.completedAt)
  ));
}

export function getLeaderboard(): LeaderboardEntry[] {
  return sortLeaderboard(readStoredEntries()).slice(0, MAX_LEADERBOARD_ENTRIES);
}

export function saveLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const next = sortLeaderboard([
    ...readStoredEntries(),
    {
      name: normalizeLeaderboardName(entry.name),
      steps: Math.max(0, Math.round(entry.steps)),
      durationMs: Math.max(0, Math.round(entry.durationMs)),
      completedAt: entry.completedAt,
    },
  ]).slice(0, MAX_LEADERBOARD_ENTRIES);
  writeStoredEntries(next);
  return next;
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
