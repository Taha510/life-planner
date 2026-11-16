import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  CATEGORIES,
  belongsToTopic,
  clampDate,
  createDefaultState,
  createId,
  dateKey,
  defaultStructure,
  isValidIsoDate,
  planForDate,
  toDate,
  type FlowItem,
  type PlannerState,
  type ThemePreference,
  type Tracker,
  type Topic,
} from '@/lib/planner';

const STORAGE_KEY = 'life-planner-mobile:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArrays(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [key, items] of Object.entries(value)) {
    if (
      Array.isArray(items) &&
      items.every((item): item is string => typeof item === 'string')
    ) {
      result[key] = items;
    }
  }
  return result;
}

function savedTrackers(value: unknown): Tracker[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (tracker): tracker is Tracker =>
      isRecord(tracker) &&
      typeof tracker.id === 'string' &&
      typeof tracker.name === 'string' &&
      typeof tracker.unit === 'string' &&
      typeof tracker.increment === 'number' &&
      Number.isFinite(tracker.increment) &&
      tracker.increment > 0 &&
      (tracker.goal === null ||
        (typeof tracker.goal === 'number' &&
          Number.isFinite(tracker.goal) &&
          tracker.goal > 0)) &&
      typeof tracker.color === 'string',
  );
}

function savedTrackerValues(
  value: unknown,
): PlannerState['trackerValues'] {
  if (!isRecord(value)) return {};
  const days: PlannerState['trackerValues'] = {};
  for (const [day, entries] of Object.entries(value)) {
    if (!isRecord(entries)) continue;
    const counts: Record<string, number> = {};
    for (const [id, amount] of Object.entries(entries)) {
      if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) {
        counts[id] = amount;
      }
    }
    days[day] = counts;
  }
  return days;
}

function restoreState(raw: string): PlannerState {
  const fallback = createDefaultState();
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return fallback;

  const storedRange = isRecord(parsed.range) ? parsed.range : {};
  const startDate =
    typeof storedRange.startDate === 'string' &&
    isValidIsoDate(storedRange.startDate)
      ? storedRange.startDate
      : fallback.range.startDate;
  const endDate =
    typeof storedRange.endDate === 'string' &&
    isValidIsoDate(storedRange.endDate) &&
    storedRange.endDate >= startDate
      ? storedRange.endDate
      : fallback.range.endDate;
  const range = { startDate, endDate };
  const storedStructure = isRecord(parsed.structure) ? parsed.structure : {};
  const defaultedStructure = defaultStructure();
  const customTopics = Array.isArray(storedStructure.customTopics)
    ? storedStructure.customTopics.filter(
        (topic): topic is Topic =>
          isRecord(topic) &&
          typeof topic.id === 'string' &&
          typeof topic.name === 'string' &&
          typeof topic.hours === 'string' &&
          typeof topic.icon === 'string' &&
          typeof topic.color === 'string',
      )
    : [];
  const flow = Array.isArray(storedStructure.flow)
    ? storedStructure.flow.filter(
        (item): item is FlowItem =>
          isRecord(item) &&
          typeof item.id === 'string' &&
          typeof item.time === 'string' &&
          typeof item.description === 'string',
      )
    : defaultedStructure.flow;
  const topicDetails = isRecord(storedStructure.topicDetails)
    ? Object.fromEntries(
        Object.entries(storedStructure.topicDetails)
          .filter(
            ([, details]) =>
              isRecord(details) &&
              typeof details.name === 'string' &&
              typeof details.hours === 'string',
          )
          .map(([id, details]) => [
            id,
            {
              name: (details as { name: string }).name,
              hours: (details as { hours: string }).hours,
            },
          ]),
      )
    : {};
  const addedTasks = isRecord(storedStructure.addedTasks)
    ? Object.fromEntries(
        Object.entries(storedStructure.addedTasks).filter(
          ([, tasks]) =>
            Array.isArray(tasks) &&
            tasks.every(
              (task) =>
                isRecord(task) &&
                typeof task.id === 'string' &&
                typeof task.text === 'string',
            ),
        ),
      )
    : {};
  const theme = ['system', 'light', 'dark'].includes(String(parsed.theme))
    ? (parsed.theme as ThemePreference)
    : 'system';
  const selectedDate =
    typeof parsed.selectedDate === 'string' &&
    isValidIsoDate(parsed.selectedDate)
      ? clampDate(parsed.selectedDate, range)
      : clampDate(dateKey(new Date()), range);

  return {
    range,
    selectedDate,
    checks: stringArrays(parsed.checks),
    overrides: isRecord(parsed.overrides)
      ? (parsed.overrides as PlannerState['overrides'])
      : {},
    trackers: savedTrackers(parsed.trackers),
    trackerValues: savedTrackerValues(parsed.trackerValues),
    theme,
    structure: {
      customTopics,
      hiddenTopicIds: Array.isArray(storedStructure.hiddenTopicIds)
        ? storedStructure.hiddenTopicIds.filter(
            (id): id is string => typeof id === 'string',
          )
        : [],
      topicDetails,
      deletedTaskIds: stringArrays(storedStructure.deletedTaskIds),
      addedTasks: addedTasks as PlannerState['structure']['addedTasks'],
      flow,
    },
  };
}

function removeTaskChecks(
  checks: PlannerState['checks'],
  ids: Set<string>,
): PlannerState['checks'] {
  return Object.fromEntries(
    Object.entries(checks)
      .map(([date, values]) => [date, values.filter((id) => !ids.has(id))] as const)
      .filter(([, values]) => values.length > 0),
  );
}

function removeTaskOverrides(
  overrides: PlannerState['overrides'],
  ids: Set<string>,
): PlannerState['overrides'] {
  return Object.fromEntries(
    Object.entries(overrides)
      .map(
        ([date, values]) =>
          [date, Object.fromEntries(Object.entries(values).filter(([id]) => !ids.has(id)))] as const,
      )
      .filter(([, values]) => Object.keys(values).length > 0),
  );
}

function usePlannerController() {
  const [state, setState] = useState<PlannerState | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setReady(false);
    setStorageError(null);
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        setState(saved ? restoreState(saved) : createDefaultState());
        setReady(true);
      } catch {
        if (!active) return;
        setStorageError('Planner data could not be read from this device.');
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (!ready || !state) return;
    let active = true;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      .then(() => {
        if (active) setStorageError(null);
      })
      .catch(() => {
        if (active) setStorageError('Changes may not have been saved on this device.');
      });
    return () => {
      active = false;
    };
  }, [ready, state]);

  const update = (change: (current: PlannerState) => PlannerState) => {
    setState((current) => (current ? change(current) : current));
  };

  const retryStorage = () => setLoadAttempt((attempt) => attempt + 1);
  const selectDate = (date: string) =>
    update((current) => ({
      ...current,
      selectedDate: clampDate(date, current.range),
    }));
  const setTheme = (theme: ThemePreference) =>
    update((current) => ({ ...current, theme }));
  const toggleTask = (taskId: string) =>
    update((current) => {
      const checked = current.checks[current.selectedDate] ?? [];
      const next = checked.includes(taskId)
        ? checked.filter((id) => id !== taskId)
        : [...checked, taskId];
      return {
        ...current,
        checks: { ...current.checks, [current.selectedDate]: next },
      };
    });
  const editTaskText = (taskId: string, text: string) =>
    update((current) => ({
      ...current,
      overrides: {
        ...current.overrides,
        [current.selectedDate]: {
          ...current.overrides[current.selectedDate],
          [taskId]: text,
        },
      },
    }));
  const restoreTaskText = (taskId: string) =>
    update((current) => {
      const dayOverrides = { ...current.overrides[current.selectedDate] };
      delete dayOverrides[taskId];
      const overrides = { ...current.overrides };
      if (Object.keys(dayOverrides).length) {
        overrides[current.selectedDate] = dayOverrides;
      } else {
        delete overrides[current.selectedDate];
      }
      return { ...current, overrides };
    });

  const setStartDate = (value: string) =>
    update((current) => {
      if (!isValidIsoDate(value)) return current;
      const range = {
        startDate: value,
        endDate: value > current.range.endDate ? value : current.range.endDate,
      };
      return { ...current, range, selectedDate: clampDate(current.selectedDate, range) };
    });
  const setEndDate = (value: string) =>
    update((current) => {
      if (!isValidIsoDate(value)) return current;
      const range = {
        startDate: value < current.range.startDate ? value : current.range.startDate,
        endDate: value,
      };
      return { ...current, range, selectedDate: clampDate(current.selectedDate, range) };
    });

  const addFlow = (time: string, description: string) =>
    update((current) => ({
      ...current,
      structure: {
        ...current.structure,
        flow: [...current.structure.flow, { id: `flow-${createId()}`, time, description }],
      },
    }));
  const editFlow = (item: FlowItem) =>
    update((current) => ({
      ...current,
      structure: {
        ...current.structure,
        flow: current.structure.flow.some((entry) => entry.id === item.id)
          ? current.structure.flow.map((entry) => (entry.id === item.id ? item : entry))
          : current.structure.flow,
      },
    }));
  const deleteFlow = (id: string) =>
    update((current) => ({
      ...current,
      structure: {
        ...current.structure,
        flow: current.structure.flow.filter((entry) => entry.id !== id),
      },
    }));

  const addTopic = (name: string, hours: string) =>
    update((current) => {
      const palette = ['#6c5ce7', '#00b894', '#e17055', '#4d7cfe', '#e84393', '#0a9396'];
      const topic: Topic = {
        id: `topic-${createId()}`,
        name,
        hours: hours || 'custom',
        icon: 'bookmark-outline',
        color: palette[current.structure.customTopics.length % palette.length],
      };
      return {
        ...current,
        structure: {
          ...current.structure,
          customTopics: [...current.structure.customTopics, topic],
        },
      };
    });
  const editTopic = (id: string, name: string, hours: string) =>
    update((current) => ({
      ...current,
      structure: current.structure.customTopics.some((topic) => topic.id === id)
        ? {
            ...current.structure,
            customTopics: current.structure.customTopics.map((topic) =>
              topic.id === id ? { ...topic, name, hours } : topic,
            ),
          }
        : {
            ...current.structure,
            topicDetails: {
              ...current.structure.topicDetails,
              [id]: { name, hours },
            },
          },
    }));
  const deleteTopic = (topicId: string) =>
    update((current) => {
      const taskIds = new Set(
        [
          ...Object.values(current.checks).flat(),
          ...Object.values(current.overrides).flatMap((values) => Object.keys(values)),
          ...Object.values(planForDate(toDate(current.selectedDate), current.structure)).flat().map((task) => task.id),
        ].filter((id) => belongsToTopic(id, topicId)),
      );
      return {
        ...current,
        checks: removeTaskChecks(current.checks, taskIds),
        overrides: removeTaskOverrides(current.overrides, taskIds),
        structure: {
          ...current.structure,
          customTopics: current.structure.customTopics.filter((topic) => topic.id !== topicId),
          hiddenTopicIds: CATEGORIES[topicId]
            ? [...new Set([...current.structure.hiddenTopicIds, topicId])]
            : current.structure.hiddenTopicIds,
          topicDetails: Object.fromEntries(
            Object.entries(current.structure.topicDetails).filter(([id]) => id !== topicId),
          ),
          deletedTaskIds: Object.fromEntries(
            Object.entries(current.structure.deletedTaskIds).filter(([id]) => id !== topicId),
          ),
          addedTasks: Object.fromEntries(
            Object.entries(current.structure.addedTasks).filter(([id]) => id !== topicId),
          ),
        },
      };
    });

  const addTask = (topicId: string, text: string) =>
    update((current) => ({
      ...current,
      structure: {
        ...current.structure,
        addedTasks: {
          ...current.structure.addedTasks,
          [topicId]: [
            ...(current.structure.addedTasks[topicId] ?? []),
            { id: `custom:${topicId}:${createId()}`, text },
          ],
        },
      },
    }));
  const deleteTask = (topicId: string, taskId: string) =>
    update((current) => {
      const added = current.structure.addedTasks[topicId] ?? [];
      const isAdded = added.some((task) => task.id === taskId);
      return {
        ...current,
        checks: removeTaskChecks(current.checks, new Set([taskId])),
        overrides: removeTaskOverrides(current.overrides, new Set([taskId])),
        structure: isAdded
          ? {
              ...current.structure,
              addedTasks: {
                ...current.structure.addedTasks,
                [topicId]: added.filter((task) => task.id !== taskId),
              },
            }
          : {
              ...current.structure,
              deletedTaskIds: {
                ...current.structure.deletedTaskIds,
                [topicId]: [
                  ...new Set([...(current.structure.deletedTaskIds[topicId] ?? []), taskId]),
                ],
              },
            },
      };
    });

  const addTracker = (
    name: string,
    unit: string,
    increment: number,
    goal: number | null,
  ) =>
    update((current) => {
      const palette = ['#4d7cfe', '#00b894', '#e17055', '#d4a017', '#8e7cff', '#e84393'];
      const tracker: Tracker = {
        id: `tracker-${createId()}`,
        name,
        unit,
        increment,
        goal,
        color: palette[current.trackers.length % palette.length],
      };
      return { ...current, trackers: [...current.trackers, tracker] };
    });
  const editTracker = (tracker: Tracker) =>
    update((current) => ({
      ...current,
      trackers: current.trackers.map((item) =>
        item.id === tracker.id ? tracker : item,
      ),
    }));
  const deleteTracker = (id: string) =>
    update((current) => ({
      ...current,
      trackers: current.trackers.filter((tracker) => tracker.id !== id),
      trackerValues: Object.fromEntries(
        Object.entries(current.trackerValues)
          .map(([day, entries]) => {
            const next = { ...entries };
            delete next[id];
            return [day, next] as const;
          })
          .filter(([, entries]) => Object.keys(entries).length > 0),
      ),
    }));
  const adjustTracker = (id: string, amount: number) =>
    update((current) => {
      const day = current.trackerValues[current.selectedDate] ?? {};
      const nextAmount = Math.max(
        0,
        Math.round(((day[id] ?? 0) + amount + Number.EPSILON) * 100) / 100,
      );
      return {
        ...current,
        trackerValues: {
          ...current.trackerValues,
          [current.selectedDate]: { ...day, [id]: nextAmount },
        },
      };
    });
  const setTrackerValue = (id: string, amount: number) =>
    update((current) => {
      if (!Number.isFinite(amount)) return current;
      const day = current.trackerValues[current.selectedDate] ?? {};
      return {
        ...current,
        trackerValues: {
          ...current.trackerValues,
          [current.selectedDate]: {
            ...day,
            [id]: Math.max(0, Math.round((amount + Number.EPSILON) * 100) / 100),
          },
        },
      };
    });

  return {
    state,
    ready,
    storageError,
    retryStorage,
    selectDate,
    setTheme,
    toggleTask,
    editTaskText,
    restoreTaskText,
    setStartDate,
    setEndDate,
    addFlow,
    editFlow,
    deleteFlow,
    addTopic,
    editTopic,
    deleteTopic,
    addTask,
    deleteTask,
    addTracker,
    editTracker,
    deleteTracker,
    adjustTracker,
    setTrackerValue,
  };
}

const PlannerContext = createContext<ReturnType<typeof usePlannerController> | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const planner = usePlannerController();
  return React.createElement(PlannerContext.Provider, { value: planner }, children);
}

export function usePlanner() {
  const planner = useContext(PlannerContext);
  if (!planner) {
    throw new Error('usePlanner must be used inside PlannerProvider.');
  }
  return planner;
}
