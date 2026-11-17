export type Tracker = {
  id: string;
  name: string;
  unit: string;
  increment: number;
  goal: number | null;
  color: string;
};

export type TrackerInput = {
  id?: string;
  name: string;
  unit: string;
  increment: number;
  goal: number | null;
};

export type TrackerDraft = {
  id?: string;
  name: string;
  unit: string;
  increment: string;
  goal: string;
};

export type TrackerValues = Record<string, Record<string, number>>;

export const TRACKER_COLORS = [
  '#4d7cfe',
  '#00b894',
  '#e17055',
  '#d4a017',
  '#8e7cff',
  '#e84393',
];

export const QUICK_TRACKERS: TrackerInput[] = [
  { name: 'Water', unit: 'glasses', increment: 1, goal: 8 },
  { name: 'Cigarettes', unit: 'cigarettes', increment: 1, goal: null },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(`lp:${key}`) ?? 'null');
  } catch {
    return null;
  }
}

function isTracker(value: unknown): value is Tracker {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.unit === 'string' &&
    typeof value.increment === 'number' &&
    Number.isFinite(value.increment) &&
    value.increment > 0 &&
    (value.goal === null ||
      (typeof value.goal === 'number' &&
        Number.isFinite(value.goal) &&
        value.goal > 0)) &&
    typeof value.color === 'string'
  );
}

export function loadTrackers(): Tracker[] {
  const stored = readStorage('trackers');
  return Array.isArray(stored) ? stored.filter(isTracker) : [];
}

export function loadTrackerValues(): TrackerValues {
  const stored = readStorage('tracker-values');
  if (!isRecord(stored)) return {};

  const values: TrackerValues = {};
  for (const [date, rawCounts] of Object.entries(stored)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isRecord(rawCounts)) continue;
    const dayCounts: Record<string, number> = {};
    for (const [trackerId, amount] of Object.entries(rawCounts)) {
      if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) {
        dayCounts[trackerId] = amount;
      }
    }
    if (Object.keys(dayCounts).length) values[date] = dayCounts;
  }
  return values;
}

export function formatTrackerValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function trackerIcon(tracker: Tracker): string {
  const description = `${tracker.name} ${tracker.unit}`.toLowerCase();
  if (
    description.includes('water') ||
    description.includes('glass') ||
    description.includes('ml') ||
    description.includes('litre') ||
    description.includes('liter')
  ) {
    return '💧';
  }
  if (description.includes('cigarette') || description.includes('smok')) return '🚬';
  return '◉';
}
