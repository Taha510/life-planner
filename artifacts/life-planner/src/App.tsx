import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  addDays, banners, CATEGORIES, dateKey, dayDistance, DEFAULT_END, DEFAULT_START,
  FLOW, isValidIsoDate, makePlan, monthLabel, monthStart, TIPS, toDate, type CategoryId,
} from './planner-data';

type DateRange = { startDate: string; endDate: string };
type Checks = Record<string, string[]>;
type Overrides = Record<string, Record<string, string>>;
type Theme = 'light' | 'dark' | 'system';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`lp:${key}`) ?? 'null');
    return parsed !== null ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}
function loadRange(): DateRange {
  const stored = loadJson<DateRange>('range', { startDate: DEFAULT_START, endDate: DEFAULT_END });
  if (!isValidIsoDate(stored.startDate) || !isValidIsoDate(stored.endDate) || stored.startDate > stored.endDate) {
    return { startDate: DEFAULT_START, endDate: DEFAULT_END };
  }
  return stored;
}
function loadChecks(): Checks {
  const stored = loadJson<Checks>('checks', {});
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !/^lp:\d{4}-\d{2}-\d{2}$/.test(key) || stored[key.slice(3)]) continue;
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (Array.isArray(value) && value.every((id) => typeof id === 'string')) stored[key.slice(3)] = value;
    }
  } catch { /* Keep the checks already loaded if a legacy entry is malformed. */ }
  return stored;
}
function saveLocal(key: string, value: unknown) {
  try { localStorage.setItem(`lp:${key}`, JSON.stringify(value)); } catch { /* Device storage may be unavailable. */ }
}
function clampDate(value: string, range: DateRange): string {
  if (value < range.startDate) return range.startDate;
  if (value > range.endDate) return range.endDate;
  return value;
}
function countTasks(date: Date): number {
  return Object.values(makePlan(date)).reduce((total, tasks) => total + tasks.length, 0);
}
function progressFor(date: Date, checks: Checks): number {
  const total = countTasks(date);
  if (total === 0) return 0;
  const validIds = new Set(Object.values(makePlan(date)).flatMap((tasks) => tasks.map((task) => task.id)));
  const complete = (checks[dateKey(date)] ?? []).filter((id) => validIds.has(id)).length;
  return complete / total;
}
function initialSelectedDate(range: DateRange): string {
  const now = dateKey(new Date());
  return clampDate(now, range);
}

function App() {
  const [range, setRange] = useState<DateRange>(loadRange);
  const [selectedDate, setSelectedDate] = useState(() => initialSelectedDate(loadRange()));
  const [checks, setChecks] = useState<Checks>(loadChecks);
  const [overrides, setOverrides] = useState<Overrides>(() => loadJson<Overrides>('overrides', {}));
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = loadJson<Theme | null>('theme', null);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [calendarMonth, setCalendarMonth] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'system' ? '' : theme;
    saveLocal('theme', theme);
  }, [theme]);
  useEffect(() => saveLocal('range', range), [range]);
  useEffect(() => {
    saveLocal('checks', checks);
    Object.entries(checks).forEach(([date, ids]) => saveLocal(date, ids));
  }, [checks]);
  useEffect(() => saveLocal('overrides', overrides), [overrides]);

  const selected = toDate(selectedDate);
  const plan = useMemo(() => makePlan(selected), [selectedDate]);
  const selectedChecks = checks[selectedDate] ?? [];
  const allTasks = Object.values(plan).flat();
  const selectedProgress = allTasks.length ? selectedChecks.filter((id) => allTasks.some((task) => task.id === id)).length / allTasks.length : 0;
  const duration = dayDistance(toDate(range.startDate), toDate(range.endDate)) + 1;
  const dayNumber = dayDistance(toDate(range.startDate), selected) + 1;
  const remaining = duration - dayNumber;
  const circumference = 326.7;
  const monthDates: Date[] = [];
  const firstMonth = monthStart(toDate(range.startDate));
  const lastMonth = monthStart(toDate(range.endDate));
  for (let cursor = firstMonth; cursor <= lastMonth; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    monthDates.push(cursor);
  }
  const activeMonth = monthDates.find((month) => dateKey(month) === calendarMonth) ?? monthStart(selected);
  const monthDays = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate();
  const leadingDays = (activeMonth.getDay() + 6) % 7;
  const today = dateKey(new Date());

  const setCompletion = (taskId: string, checked: boolean) => {
    setChecks((previous) => {
      const current = previous[selectedDate] ?? [];
      const next = checked ? [...new Set([...current, taskId])] : current.filter((id) => id !== taskId);
      return { ...previous, [selectedDate]: next };
    });
  };
  const changeStart = (value: string) => {
    if (!isValidIsoDate(value)) return;
    const nextRange = { startDate: value, endDate: value > range.endDate ? value : range.endDate };
    setRange(nextRange);
    setSelectedDate((current) => clampDate(current, nextRange));
    setCalendarMonth(null);
  };
  const changeEnd = (value: string) => {
    if (!isValidIsoDate(value)) return;
    const nextRange = { startDate: value < range.startDate ? value : range.startDate, endDate: value };
    setRange(nextRange);
    setSelectedDate((current) => clampDate(current, nextRange));
    setCalendarMonth(null);
  };
  const goToDate = (date: string) => {
    if (date < range.startDate || date > range.endDate) return;
    setSelectedDate(date);
    setCalendarMonth(null);
  };
  const changeDay = (offset: number) => goToDate(dateKey(addDays(selected, offset)));
  const goToday = () => goToDate(clampDate(today, range));

  const toggleTheme = () => {
    const current = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    setTheme(current === 'dark' ? 'light' : 'dark');
  };
  const beginEdit = (taskId: string, text: string) => {
    setEditingId(taskId);
    setDraft(overrides[selectedDate]?.[taskId] ?? text);
  };
  const saveEdit = (taskId: string) => {
    setOverrides((previous) => ({
      ...previous,
      [selectedDate]: { ...previous[selectedDate], [taskId]: draft },
    }));
    setEditingId(null);
  };
  const restoreGenerated = (taskId: string) => {
    setOverrides((previous) => {
      const dateOverrides = { ...previous[selectedDate] };
      delete dateOverrides[taskId];
      const next = { ...previous };
      if (Object.keys(dateOverrides).length) next[selectedDate] = dateOverrides;
      else delete next[selectedDate];
      return next;
    });
    setEditingId(null);
  };
  const streak = (() => {
    const todayDate = toDate(today);
    let current = dayDistance(toDate(range.startDate), todayDate);
    let total = 0;
    while (current >= 0 && current < duration) {
      const date = addDays(toDate(range.startDate), current);
      if (progressFor(date, checks) >= .7) total++;
      else if (dateKey(date) < today) break;
      current--;
    }
    return total;
  })();

  const beginEditingTask = (taskId: string, generated: string) => beginEdit(taskId, generated);
  const saveEditOnKey = (event: KeyboardEvent<HTMLInputElement>, taskId: string) => {
    if (event.key === 'Enter') saveEdit(taskId);
    if (event.key === 'Escape') setEditingId(null);
  };

  return (
    <>
      <div className="bg-orbs" aria-hidden="true"><i /><i /><i /></div>
      <main className="wrap">
        <header className="reveal">
          <div className="header-line">
            <div>
              <h1>Life Planner</h1>
              <p className="sub" data-testid="text-date-range-summary">
                {toDate(range.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} → {toDate(range.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · one day at a time
              </p>
            </div>
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch theme; current theme ${theme}`} data-testid="button-toggle-theme">
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </header>

        <section className="top reveal" aria-label="Today's progress">
          <div className="ring" role="img" aria-label={`${Math.round(selectedProgress * 100)} percent of today's tasks complete`}>
            <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
              <circle className="track" cx="60" cy="60" r="52" />
              <circle className="progress" cx="60" cy="60" r="52" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - selectedProgress)} />
            </svg>
            <b id="pct" data-testid="value-progress-percent">{Math.round(selectedProgress * 100)}%</b>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>Today's progress</div>
            <div className="stats">
              <span className="chip">Day <b data-testid="value-day-count">{dayNumber}</b> / <b data-testid="value-total-days">{duration}</b></span>
              <span className="chip">Left <b data-testid="value-remaining-days">{remaining}</b> days</span>
              <span className="chip">🔥 Streak <b data-testid="value-streak">{streak}</b></span>
              <span className="chip">Total <b data-testid="value-daily-hours">14–15h</b>/day</span>
            </div>
          </div>
        </section>

        <nav className="nav reveal" aria-label="Date navigation">
          <button type="button" aria-label="Previous day" data-testid="button-previous-day" disabled={selectedDate <= range.startDate} onClick={() => changeDay(-1)}>‹</button>
          <input
            type="date"
            aria-label="Choose a date"
            data-testid="input-selected-date"
            value={selectedDate}
            min={range.startDate}
            max={range.endDate}
            onChange={(event) => goToDate(event.currentTarget.value)}
          />
          <button type="button" aria-label="Next day" data-testid="button-next-day" disabled={selectedDate >= range.endDate} onClick={() => changeDay(1)}>›</button>
          <button type="button" data-testid="button-today" onClick={goToday}>Today</button>
        </nav>

        <details className="range-tools">
          <summary data-testid="control-date-range">Change tracker dates</summary>
          <div className="range-fields">
            <label>Start date
              <input type="date" value={range.startDate} aria-label="Tracker start date" data-testid="input-range-start" onChange={(event) => changeStart(event.currentTarget.value)} />
            </label>
            <label>End date
              <input type="date" value={range.endDate} aria-label="Tracker end date" data-testid="input-range-end" onChange={(event) => changeEnd(event.currentTarget.value)} />
            </label>
          </div>
        </details>

        <h2 className="day" data-testid="value-selected-day">{selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
        <div id="notes" aria-live="polite">
          {banners(selected, range.startDate, range.endDate).map((banner, index) => (
            <div className="note" key={`${selectedDate}-banner-${index}`} data-testid={`banner-date-${index}`}>{banner}</div>
          ))}
        </div>
        <section className="flow reveal" id="flow" aria-label="Daily flow">
          {FLOW.map(([time, description]) => <div key={time}><b>{time}</b>{description}</div>)}
        </section>

        <section id="cards" aria-label="Daily tasks">
          {(Object.keys(CATEGORIES) as CategoryId[]).map((category, categoryIndex) => {
            const meta = CATEGORIES[category];
            const tasks = plan[category];
            const completed = tasks.filter((task) => selectedChecks.includes(task.id)).length;
            return (
              <article className="task-card" key={category} style={{ '--category-color': meta.color, animationDelay: `${categoryIndex * 70}ms` } as CSSProperties} data-testid={`card-category-${category}`}>
                <div className="ch">
                  <span className="icon" aria-hidden="true">{meta.icon}</span>
                  <h3>{meta.name}</h3>
                  <em>{meta.hours}</em>
                </div>
                <div className="bar" role="progressbar" aria-label={`${meta.name} progress`} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={tasks.length}>
                  <i style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} />
                </div>
                {tasks.map((task) => {
                  const override = overrides[selectedDate]?.[task.id];
                  const text = override ?? task.text;
                  const checked = selectedChecks.includes(task.id);
                  const isEditing = editingId === task.id;
                  return (
                    <div className="task-row" key={task.id} data-testid={`task-row-${task.id}`}>
                      <input
                        id={`check-${task.id}`}
                        type="checkbox"
                        checked={checked}
                        aria-label={`Mark task complete: ${text}`}
                        data-testid={`checkbox-task-${task.id}`}
                        onChange={(event) => setCompletion(task.id, event.currentTarget.checked)}
                      />
                      <label className="checkmark" htmlFor={`check-${task.id}`} aria-hidden="true" />
                      {isEditing ? (
                        <div className="task-editor">
                          <label className="sr-only" htmlFor={`edit-${task.id}`}>Edit task for {selected.toLocaleDateString('en-GB')}</label>
                          <input
                            id={`edit-${task.id}`}
                            type="text"
                            autoFocus
                            value={draft}
                            data-testid={`input-edit-task-${task.id}`}
                            onChange={(event) => setDraft(event.currentTarget.value)}
                            onKeyDown={(event) => saveEditOnKey(event, task.id)}
                          />
                          <div className="task-editor-actions">
                            <button type="button" className="save" data-testid={`button-save-task-${task.id}`} onClick={() => saveEdit(task.id)}>Save</button>
                            <button type="button" data-testid={`button-cancel-task-${task.id}`} onClick={() => setEditingId(null)}>Cancel</button>
                            {override !== undefined && <button type="button" data-testid={`button-restore-task-${task.id}`} onClick={() => restoreGenerated(task.id)}>Restore generated</button>}
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="task-copy" data-testid={`text-task-${task.id}`}>{text}</span>
                          <div className="task-controls">
                            <button
                              type="button"
                              className="task-edit"
                              aria-label={`Edit task: ${text}`}
                              data-testid={`button-edit-task-${task.id}`}
                              onClick={() => beginEditingTask(task.id, task.text)}
                            >Edit</button>
                            {override !== undefined && <button
                              type="button"
                              className="task-edit"
                              aria-label={`Restore generated task: ${task.text}`}
                              data-testid={`button-restore-task-${task.id}`}
                              onClick={() => restoreGenerated(task.id)}
                            >Restore</button>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </article>
            );
          })}
        </section>

        <h2 className="reveal">Calendar</h2>
        <div className="tabs reveal" role="tablist" aria-label="Calendar month">
          {monthDates.map((month) => {
            const id = dateKey(month);
            const active = dateKey(activeMonth) === id;
            return <button
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? 'on' : ''}
              key={id}
              data-testid={`tab-month-${id}`}
              onClick={() => setCalendarMonth(id)}
            >{monthLabel(month)}</button>;
          })}
        </div>
        <div className="cal reveal" role="grid" aria-label={`${monthLabel(activeMonth)} calendar`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <small role="columnheader" key={`${day}-${index}`}>{day}</small>)}
          {Array.from({ length: leadingDays }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
          {Array.from({ length: monthDays }, (_, index) => {
            const date = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), index + 1);
            const key = dateKey(date);
            const inRange = key >= range.startDate && key <= range.endDate;
            const ratio = inRange ? progressFor(date, checks) : 0;
            return <button
              type="button"
              role="gridcell"
              aria-label={`${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${inRange ? `, ${Math.round(ratio * 100)} percent complete` : ', outside tracker dates'}`}
              aria-current={key === today ? 'date' : undefined}
              className={key === selectedDate ? 'sel' : ''}
              key={key}
              disabled={!inRange}
              style={{ '--ratio': ratio, animationDelay: `${(index + 1) * 12}ms` } as CSSProperties}
              data-testid={`button-calendar-date-${key}`}
              onClick={() => {
                goToDate(key);
                window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
              }}
            >{index + 1}</button>;
          })}
        </div>

        <h2 className="reveal">Tips &amp; tricks</h2>
        <section className="tips" id="tips">
          {TIPS.map(([title, kind, items], index) => (
            <article className={`tip reveal ${kind}`} key={title} data-testid={`tip-card-${index}`}>
              <h3>{title}</h3>
              <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </section>
        <footer className="reveal">Consistency beats intensity. Tick things off, review on Sundays, adjust when life happens.</footer>
      </main>
    </>
  );
}

export default App;
