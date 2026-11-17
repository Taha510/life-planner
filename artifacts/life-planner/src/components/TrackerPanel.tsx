import { useState, type CSSProperties, type FormEvent } from 'react';
import {
  formatTrackerValue,
  QUICK_TRACKERS,
  trackerIcon,
  type Tracker,
  type TrackerDraft,
  type TrackerInput,
  type TrackerValues,
} from '../tracker-data';

type Props = {
  trackers: Tracker[];
  values: TrackerValues;
  selectedDate: string;
  startDate: string;
  endDate: string;
  onSelectDate: (date: string) => void;
  onStepDay: (offset: number) => void;
  onGoToday: () => void;
  onSaveTracker: (tracker: TrackerInput) => void;
  onDeleteTracker: (id: string) => void;
  onAdjustCount: (id: string, amount: number) => void;
};

const emptyDraft = (): TrackerDraft => ({
  name: '',
  unit: '',
  increment: '1',
  goal: '',
});

export function TrackerPanel({
  trackers,
  values,
  selectedDate,
  startDate,
  endDate,
  onSelectDate,
  onStepDay,
  onGoToday,
  onSaveTracker,
  onDeleteTracker,
  onAdjustCount,
}: Props) {
  const [draft, setDraft] = useState<TrackerDraft | null>(null);
  const [formError, setFormError] = useState('');
  const dayValues = values[selectedDate] ?? {};
  const selected = new Date(`${selectedDate}T12:00:00`);

  const beginEdit = (tracker: Tracker) => {
    setDraft({
      id: tracker.id,
      name: tracker.name,
      unit: tracker.unit,
      increment: String(tracker.increment),
      goal: tracker.goal === null ? '' : String(tracker.goal),
    });
    setFormError('');
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    const unit = draft.unit.trim() || 'times';
    const increment = Number(draft.increment);
    const goal = draft.goal.trim() ? Number(draft.goal) : null;
    if (!name) {
      setFormError('Enter a name for this tracker.');
      return;
    }
    if (!Number.isFinite(increment) || increment <= 0) {
      setFormError('The amount per tap must be greater than zero.');
      return;
    }
    if (goal !== null && (!Number.isFinite(goal) || goal <= 0)) {
      setFormError('Enter a goal greater than zero, or leave it blank.');
      return;
    }
    onSaveTracker({
      ...(draft.id ? { id: draft.id } : {}),
      name,
      unit,
      increment,
      goal,
    });
    setDraft(null);
    setFormError('');
  };

  const addPreset = (tracker: TrackerInput) => {
    onSaveTracker(tracker);
  };

  return (
    <section className="tracker-view reveal" aria-label="Daily tracking" data-testid="panel-track">
      <div className="tracker-heading">
        <div>
          <h2>Track</h2>
          <p className="sub">Daily counters you choose. Add as many as you need.</p>
        </div>
        <button
          type="button"
          className="tracker-add-button"
          onClick={() => {
            setDraft(emptyDraft());
            setFormError('');
          }}
          data-testid="button-add-tracker"
        >
          + Add tracker
        </button>
      </div>

      <div className="tracker-date-panel">
        <button
          type="button"
          aria-label="Previous tracking day"
          disabled={selectedDate <= startDate}
          onClick={() => onStepDay(-1)}
        >
          ‹
        </button>
        <label>
          <span>Tracking for</span>
          <input
            type="date"
            aria-label="Choose tracking date"
            value={selectedDate}
            min={startDate}
            max={endDate}
            onChange={(event) => onSelectDate(event.currentTarget.value)}
            data-testid="input-tracker-date"
          />
        </label>
        <button
          type="button"
          aria-label="Next tracking day"
          disabled={selectedDate >= endDate}
          onClick={() => onStepDay(1)}
        >
          ›
        </button>
        <button type="button" className="tracker-today" onClick={onGoToday}>
          Today
        </button>
      </div>
      <p className="tracker-range-note">
        {selected.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        {' · '}change the tracker range in the Plan tab
      </p>

      <div className="tracker-list-heading">
        <div>
          <h3>Your trackers</h3>
          <p>{trackers.length} {trackers.length === 1 ? 'counter' : 'counters'} for this planner</p>
        </div>
        {trackers.length > 0 && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setDraft(emptyDraft());
              setFormError('');
            }}
          >
            + Add another
          </button>
        )}
      </div>

      {draft && (
        <form className="tracker-form" onSubmit={saveDraft} data-testid="form-tracker">
          <h3>{draft.id ? 'Edit tracker' : 'New tracker'}</h3>
          <label>
            Tracker name
            <input
              autoFocus
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })}
              placeholder="e.g. Water, cigarettes, exercise"
              required
              data-testid="input-tracker-name"
            />
          </label>
          <label>
            Unit
            <input
              value={draft.unit}
              onChange={(event) => setDraft({ ...draft, unit: event.currentTarget.value })}
              placeholder="e.g. glasses, ml, cigarettes"
              data-testid="input-tracker-unit"
            />
          </label>
          <div className="tracker-form-numbers">
            <label>
              Amount per tap
              <input
                type="number"
                min="0.01"
                step="any"
                value={draft.increment}
                onChange={(event) => setDraft({ ...draft, increment: event.currentTarget.value })}
                required
                data-testid="input-tracker-increment"
              />
            </label>
            <label>
              Daily goal (optional)
              <input
                type="number"
                min="0.01"
                step="any"
                value={draft.goal}
                onChange={(event) => setDraft({ ...draft, goal: event.currentTarget.value })}
                placeholder="No goal"
                data-testid="input-tracker-goal"
              />
            </label>
          </div>
          {formError && <p className="tracker-form-error" role="alert">{formError}</p>}
          <div className="tracker-form-actions">
            <button type="submit" className="save">
              {draft.id ? 'Save tracker' : 'Add tracker'}
            </button>
            <button type="button" onClick={() => { setDraft(null); setFormError(''); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {trackers.length === 0 ? (
        <div className="tracker-empty">
          <span className="tracker-empty-icon" aria-hidden="true">◉</span>
          <h3>Start with a daily counter</h3>
          <p>Tap plus or minus as your day goes on. Your counts are saved separately for each date on this device.</p>
          <div className="tracker-presets">
            {QUICK_TRACKERS.map((preset) => (
              <button
                type="button"
                key={preset.name}
                onClick={() => addPreset(preset)}
                data-testid={`button-quick-add-${preset.name.toLowerCase()}`}
              >
                <span aria-hidden="true">{preset.name === 'Water' ? '💧' : '🚬'}</span>
                Add {preset.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tracker-create-link"
            onClick={() => {
              setDraft(emptyDraft());
              setFormError('');
            }}
          >
            Create a custom tracker
          </button>
        </div>
      ) : (
        <div className="tracker-grid">
          {trackers.map((tracker) => {
            const amount = dayValues[tracker.id] ?? 0;
            const progress = tracker.goal === null ? null : Math.min(amount / tracker.goal, 1);
            return (
              <article
                className="tracker-card"
                key={tracker.id}
                style={{ '--tracker-color': tracker.color } as CSSProperties}
                data-testid={`tracker-card-${tracker.id}`}
              >
                <div className="tracker-card-header">
                  <span className="tracker-icon" aria-hidden="true">
                    {trackerIcon(tracker)}
                  </span>
                  <div className="tracker-card-title">
                    <h3>{tracker.name}</h3>
                    <p>
                      {tracker.unit}
                      {tracker.increment !== 1
                        ? ` · +${formatTrackerValue(tracker.increment)} per tap`
                        : ''}
                    </p>
                  </div>
                  <div className="tracker-card-actions">
                    <button type="button" aria-label={`Edit ${tracker.name}`} onClick={() => beginEdit(tracker)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete-action"
                      aria-label={`Delete ${tracker.name}`}
                      onClick={() => {
                        if (window.confirm(`Delete ${tracker.name} and all its saved daily counts?`)) {
                          onDeleteTracker(tracker.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="tracker-counter">
                  <button
                    type="button"
                    aria-label={`Subtract ${formatTrackerValue(tracker.increment)} ${tracker.unit}`}
                    disabled={amount <= 0}
                    onClick={() => onAdjustCount(tracker.id, -tracker.increment)}
                    data-testid={`button-decrease-tracker-${tracker.id}`}
                  >
                    −
                  </button>
                  <div className="tracker-amount">
                    <strong data-testid={`value-tracker-${tracker.id}`}>
                      {formatTrackerValue(amount)}
                    </strong>
                    <span>{tracker.unit} today</span>
                  </div>
                  <button
                    type="button"
                    className="tracker-increment"
                    aria-label={`Add ${formatTrackerValue(tracker.increment)} ${tracker.unit}`}
                    onClick={() => onAdjustCount(tracker.id, tracker.increment)}
                    data-testid={`button-increase-tracker-${tracker.id}`}
                  >
                    +
                  </button>
                </div>

                {tracker.goal !== null && progress !== null && (
                  <div className="tracker-goal">
                    <div className="tracker-goal-label">
                      <span>Daily goal</span>
                      <strong>
                        {formatTrackerValue(amount)} / {formatTrackerValue(tracker.goal)} {tracker.unit}
                      </strong>
                    </div>
                    <div
                      className="tracker-goal-track"
                      role="progressbar"
                      aria-label={`${tracker.name} daily goal`}
                      aria-valuenow={Math.min(amount, tracker.goal)}
                      aria-valuemin={0}
                      aria-valuemax={tracker.goal}
                    >
                      <i style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {trackers.length > 0 && (
        <button
          type="button"
          className="tracker-add-another"
          onClick={() => {
            setDraft(emptyDraft());
            setFormError('');
          }}
        >
          + Add another tracker
        </button>
      )}
      <p className="tracker-storage-note">Counts are saved locally on this device.</p>
    </section>
  );
}
