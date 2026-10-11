import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Path, Svg } from 'react-native-svg';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { usePlanner } from '@/hooks/usePlanner';
import {
  addDays,
  dateKey,
  dayBanners,
  dayDistance,
  formatDate,
  monthKey,
  monthLabel,
  monthsBetween,
  planForDate,
  progressFor,
  streakFor,
  toDate,
  topicsFor,
  TIPS,
  type FlowItem,
  type PlannerState,
  type ThemePreference,
  type Topic,
} from '@/lib/planner';

type PlannerController = Omit<ReturnType<typeof usePlanner>, 'state'> & {
  state: PlannerState;
};
type IconName = ComponentProps<typeof Ionicons>['name'];
type DateTarget = 'selected' | 'start' | 'end';
type Editor =
  | { kind: 'flow'; id: string; time: string; description: string }
  | { kind: 'topic'; id: string; name: string; hours: string }
  | { kind: 'new-topic'; name: string; hours: string }
  | { kind: 'task'; topicId: string; taskId?: string; text: string };

export default function PlannerScreen() {
  const planner = usePlanner();
  const systemColors = useColors('system');

  if (!planner.state) {
    return (
      <View style={[styles.loading, { backgroundColor: systemColors.background }]}>
        {planner.storageError ? (
          <>
            <Ionicons name="cloud-offline-outline" size={28} color={systemColors.primary} />
            <Text style={[styles.loadingText, { color: systemColors.foreground }]}>
              {planner.storageError}
            </Text>
            <Pressable onPress={planner.retryStorage} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator size="large" color={systemColors.primary} />
        )}
      </View>
    );
  }
  return <PlannerContent planner={planner as PlannerController} />;
}

function PlannerContent({ planner }: { planner: PlannerController }) {
  const { state } = planner;
  const colors = useColors(state.theme);
  const systemScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<string | null>(null);
  const [openTip, setOpenTip] = useState<number | null>(0);
  const [dateTarget, setDateTarget] = useState<DateTarget | null>(null);
  const [pickerDate, setPickerDate] = useState(toDate(state.selectedDate));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const topics = useMemo(() => topicsFor(state.structure), [state.structure]);
  const selected = toDate(state.selectedDate);
  const plan = useMemo(
    () => planForDate(selected, state.structure),
    [state.selectedDate, state.structure],
  );
  const checked = new Set(state.checks[state.selectedDate] ?? []);
  const allTasks = Object.values(plan).flat();
  const progress = allTasks.length
    ? allTasks.filter((task) => checked.has(task.id)).length / allTasks.length
    : 0;
  const duration = dayDistance(toDate(state.range.startDate), toDate(state.range.endDate)) + 1;
  const dayNumber = dayDistance(toDate(state.range.startDate), selected) + 1;
  const remaining = duration - dayNumber;
  const today = dateKey(new Date());
  const streak = streakFor(new Date(), state.range, state.checks, state.structure);
  const months = useMemo(() => monthsBetween(state.range), [state.range]);
  const activeMonth = months.find((month) => monthKey(month) === calendarMonth) ?? toDate(monthKey(selected));
  const monthDays = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate();
  const leadingDays = (activeMonth.getDay() + 6) % 7;
  const calendarCells: Array<Date | null> = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: monthDays }, (_, index) =>
      new Date(activeMonth.getFullYear(), activeMonth.getMonth(), index + 1),
    ),
  ];
  while (calendarCells.length % 7) calendarCells.push(null);
  const calendarRows = Array.from(
    { length: calendarCells.length / 7 },
    (_, index) => calendarCells.slice(index * 7, index * 7 + 7),
  );
  const isDark =
    state.theme === 'dark' ||
    (state.theme === 'system' && systemScheme === 'dark');

  const changeDay = (offset: number) => {
    const next = dateKey(addDays(selected, offset));
    if (next >= state.range.startDate && next <= state.range.endDate) {
      planner.selectDate(next);
      Haptics.selectionAsync();
    }
  };

  const applyDate = (target: DateTarget, value: Date) => {
    const key = dateKey(value);
    if (target === 'selected') planner.selectDate(key);
    if (target === 'start') planner.setStartDate(key);
    if (target === 'end') planner.setEndDate(key);
    setCalendarMonth(null);
  };

  const showDatePicker = (target: DateTarget) => {
    const value =
      target === 'selected'
        ? selected
        : target === 'start'
          ? toDate(state.range.startDate)
          : toDate(state.range.endDate);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        display: 'default',
        ...(target === 'selected'
          ? {
              minimumDate: toDate(state.range.startDate),
              maximumDate: toDate(state.range.endDate),
            }
          : {}),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) applyDate(target, picked);
        },
      });
      return;
    }
    setDateTarget(target);
    setPickerDate(value);
    setDatePickerOpen(true);
  };

  const confirmDelete = (title: string, message: string, remove: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const saveEditor = () => {
    if (!editor) return;
    if (editor.kind === 'flow') {
      if (!editor.time.trim() || !editor.description.trim()) return;
      const item: FlowItem = {
        id: editor.id,
        time: editor.time.trim(),
        description: editor.description.trim(),
      };
      if (state.structure.flow.some((entry) => entry.id === item.id)) planner.editFlow(item);
      else planner.addFlow(item.time, item.description);
    } else if (editor.kind === 'topic') {
      if (!editor.name.trim()) return;
      planner.editTopic(editor.id, editor.name.trim(), editor.hours.trim());
    } else if (editor.kind === 'new-topic') {
      if (!editor.name.trim()) return;
      planner.addTopic(editor.name.trim(), editor.hours.trim());
    } else {
      if (!editor.text.trim()) return;
      if (editor.taskId) planner.editTaskText(editor.taskId, editor.text.trim());
      else planner.addTask(editor.topicId, editor.text.trim());
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditor(null);
  };

  const updateEditor = (patch: Record<string, string>) => {
    setEditor((current) => (current ? ({ ...current, ...patch } as Editor) : current));
  };

  const currentThemeLabel = isDark ? 'Use light theme' : 'Use dark theme';
  const changeTheme = () => {
    const next: ThemePreference = isDark ? 'light' : 'dark';
    planner.setTheme(next);
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.brand, { color: colors.primary }]}>Life Planner</Text>
            <Text style={[styles.rangeSummary, { color: colors.mutedForeground }]}>
              {formatDate(toDate(state.range.startDate), {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              →{' '}
              {formatDate(toDate(state.range.endDate), {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {'  ·  '}one day at a time
            </Text>
          </View>
          <IconButton
            icon={isDark ? 'sunny-outline' : 'moon-outline'}
            label={currentThemeLabel}
            onPress={changeTheme}
            color={colors.foreground}
            testID="theme-toggle"
          />
        </View>

        {planner.storageError && (
          <View style={[styles.storageNotice, { backgroundColor: colors.accent }]}>
            <Ionicons name="warning-outline" size={18} color={colors.primary} />
            <Text style={[styles.storageNoticeText, { color: colors.foreground }]}>
              {planner.storageError}
            </Text>
          </View>
        )}

        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <View style={styles.progressTop}>
            <ProgressRing progress={progress} color={colors.primary} track={colors.border} text={colors.foreground} />
            <View style={styles.progressCopy}>
              <Text style={[styles.progressEyebrow, { color: colors.mutedForeground }]}>
                TODAY&apos;S PROGRESS
              </Text>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>
                {Math.round(progress * 100)}% complete
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <StatPill label="Day" value={`${dayNumber} / ${duration}`} colors={colors} />
            <StatPill label="Left" value={`${remaining} days`} colors={colors} />
            <StatPill label="Streak" value={`${streak} days`} colors={colors} />
            <StatPill label="Daily plan" value="14–15h" colors={colors} />
          </View>
        </View>

        <View style={[styles.dateCard, { backgroundColor: colors.card }]}>
          <View style={styles.dateNavigation}>
            <IconButton
              icon="chevron-back"
              label="Previous day"
              onPress={() => changeDay(-1)}
              color={colors.foreground}
              disabled={state.selectedDate <= state.range.startDate}
              testID="previous-day"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Selected date ${formatDate(selected, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}. Tap to change date.`}
              onPress={() => showDatePicker('selected')}
              style={[styles.selectedDateButton, { backgroundColor: colors.secondary }]}
              testID="selected-date"
            >
              <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              <Text style={[styles.selectedDateText, { color: colors.foreground }]}>
                {formatDate(selected, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </Pressable>
            <IconButton
              icon="chevron-forward"
              label="Next day"
              onPress={() => changeDay(1)}
              color={colors.foreground}
              disabled={state.selectedDate >= state.range.endDate}
              testID="next-day"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                planner.selectDate(today);
                setCalendarMonth(null);
              }}
              style={[styles.todayButton, { backgroundColor: colors.primary }]}
              testID="today-button"
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => setRangeOpen(true)}
            style={styles.rangeButton}
            accessibilityRole="button"
            testID="edit-range"
          >
            <Ionicons name="options-outline" size={17} color={colors.primary} />
            <Text style={[styles.rangeButtonText, { color: colors.primary }]}>
              Change tracker dates
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.dayHeadingRow}>
          <View style={[styles.dayAccent, { backgroundColor: colors.primary }]} />
          <Text style={[styles.dayHeading, { color: colors.foreground }]}>
            {formatDate(selected, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {dayBanners(selected, state.range).map((banner, index) => (
          <View key={`${state.selectedDate}-${index}`} style={[styles.banner, { backgroundColor: colors.accent }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.bannerText, { color: colors.foreground }]}>{banner}</Text>
          </View>
        ))}

        <SectionTitle title="Daily flow" subtitle="A flexible outline for your day" colors={colors} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flowRail}
          keyboardShouldPersistTaps="handled"
        >
          {state.structure.flow.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.flowCard,
                { backgroundColor: colors.card, borderTopColor: FLOW_COLORS[index % FLOW_COLORS.length] },
              ]}
            >
              <View style={styles.flowCardTop}>
                <Text style={[styles.flowTime, { color: colors.foreground }]}>{item.time}</Text>
                <View style={styles.iconActions}>
                  <IconButton
                    icon="pencil-outline"
                    label={`Edit ${item.time} block`}
                    color={colors.mutedForeground}
                    onPress={() => setEditor({ kind: 'flow', ...item })}
                  />
                  <IconButton
                    icon="trash-outline"
                    label={`Delete ${item.time} block`}
                    color={colors.destructive}
                    onPress={() =>
                      confirmDelete(
                        'Delete time block?',
                        `Remove “${item.time}” from your daily flow?`,
                        () => planner.deleteFlow(item.id),
                      )
                    }
                  />
                </View>
              </View>
              <Text style={[styles.flowDescription, { color: colors.mutedForeground }]}>
                {item.description}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => setEditor({ kind: 'flow', id: '', time: '', description: '' })}
            style={[styles.addFlowCard, { borderColor: colors.border, backgroundColor: colors.card }]}
            testID="add-flow"
          >
            <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            <Text style={[styles.addFlowText, { color: colors.primary }]}>Add time block</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily topics</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Tap a task to mark it complete
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setEditor({ kind: 'new-topic', name: '', hours: '' })}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            testID="add-topic"
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
            <Text style={styles.addButtonText}>Topic</Text>
          </Pressable>
        </View>

        {topics.map((topic) => {
          const tasks = plan[topic.id] ?? [];
          const completed = tasks.filter((task) => checked.has(task.id)).length;
          const ratio = tasks.length ? completed / tasks.length : 0;
          return (
            <View
              key={topic.id}
              style={[
                styles.topicCard,
                { backgroundColor: colors.card, borderLeftColor: topic.color },
              ]}
            >
              <View style={styles.topicHeader}>
                <View style={[styles.topicIcon, { backgroundColor: `${topic.color}1A` }]}>
                  <Ionicons name={topic.icon as IconName} size={20} color={topic.color} />
                </View>
                <View style={styles.topicHeadingCopy}>
                  <Text style={[styles.topicName, { color: colors.foreground }]}>{topic.name}</Text>
                  <Text style={[styles.topicHours, { color: colors.mutedForeground }]}>
                    {topic.hours || 'Daily topic'} · {completed}/{tasks.length} done
                  </Text>
                </View>
                <View style={styles.iconActions}>
                  <IconButton
                    icon="pencil-outline"
                    label={`Edit topic ${topic.name}`}
                    color={colors.mutedForeground}
                    onPress={() =>
                      setEditor({
                        kind: 'topic',
                        id: topic.id,
                        name: topic.name,
                        hours: topic.hours,
                      })
                    }
                  />
                  <IconButton
                    icon="trash-outline"
                    label={`Delete topic ${topic.name}`}
                    color={colors.destructive}
                    onPress={() =>
                      confirmDelete(
                        `Delete ${topic.name}?`,
                        'This removes the topic, its tasks, and their saved completion history.',
                        () => planner.deleteTopic(topic.id),
                      )
                    }
                  />
                </View>
              </View>
              <View style={styles.topicProgressTrack}>
                <View
                  style={[
                    styles.topicProgressFill,
                    { width: `${Math.round(ratio * 100)}%`, backgroundColor: topic.color },
                  ]}
                />
              </View>
              {tasks.map((task) => {
                const isChecked = checked.has(task.id);
                const text = state.overrides[state.selectedDate]?.[task.id] ?? task.text;
                const hasOverride = state.overrides[state.selectedDate]?.[task.id] !== undefined;
                return (
                  <View
                    key={task.id}
                    style={[styles.taskRow, { borderTopColor: colors.border }]}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isChecked }}
                      accessibilityLabel={`${isChecked ? 'Uncheck' : 'Complete'} ${text}`}
                      onPress={() => {
                        planner.toggleTask(task.id);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isChecked ? topic.color : colors.border,
                          backgroundColor: isChecked ? topic.color : 'transparent',
                        },
                      ]}
                      testID={`task-${task.id}`}
                    >
                      {isChecked && <Ionicons name="checkmark" size={15} color="#ffffff" />}
                    </Pressable>
                    <Text
                      style={[
                        styles.taskText,
                        { color: isChecked ? colors.mutedForeground : colors.foreground },
                        isChecked && styles.taskCompleted,
                      ]}
                    >
                      {text}
                    </Text>
                    <View style={styles.taskActions}>
                      <IconButton
                        icon="create-outline"
                        label={`Edit task ${text}`}
                        color={colors.mutedForeground}
                        onPress={() =>
                          setEditor({
                            kind: 'task',
                            topicId: topic.id,
                            taskId: task.id,
                            text,
                          })
                        }
                      />
                      {hasOverride && (
                        <IconButton
                          icon="refresh-outline"
                          label="Restore generated text"
                          color={colors.primary}
                          onPress={() => planner.restoreTaskText(task.id)}
                        />
                      )}
                      <IconButton
                        icon="trash-outline"
                        label={`Delete task ${text}`}
                        color={colors.destructive}
                        onPress={() =>
                          confirmDelete(
                            'Delete this checkbox?',
                            'This removes the task from this topic on every date and clears its saved completion history.',
                            () => planner.deleteTask(topic.id, task.id),
                          )
                        }
                      />
                    </View>
                  </View>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setEditor({ kind: 'task', topicId: topic.id, text: '' })
                }
                style={[styles.addTaskButton, { borderTopColor: colors.border }]}
                testID={`add-task-${topic.id}`}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addTaskText, { color: colors.primary }]}>
                  Add checkbox
                </Text>
              </Pressable>
            </View>
          );
        })}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calendar</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Choose a day in your tracker
            </Text>
          </View>
        </View>
        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          <View style={styles.monthHeader}>
            <IconButton
              icon="chevron-back"
              label="Previous month"
              onPress={() => {
                const index = months.findIndex((month) => monthKey(month) === monthKey(activeMonth));
                if (index > 0) setCalendarMonth(monthKey(months[index - 1]));
              }}
              color={colors.foreground}
              disabled={months.findIndex((month) => monthKey(month) === monthKey(activeMonth)) <= 0}
            />
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>
              {monthLabel(activeMonth)}
            </Text>
            <IconButton
              icon="chevron-forward"
              label="Next month"
              onPress={() => {
                const index = months.findIndex((month) => monthKey(month) === monthKey(activeMonth));
                if (index >= 0 && index < months.length - 1) setCalendarMonth(monthKey(months[index + 1]));
              }}
              color={colors.foreground}
              disabled={
                months.findIndex((month) => monthKey(month) === monthKey(activeMonth)) >= months.length - 1
              }
            />
          </View>
          <View style={styles.calendarWeekdays}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
              <Text
                key={`${label}-${index}`}
                style={[styles.weekdayLabel, { color: colors.mutedForeground }]}
              >
                {label}
              </Text>
            ))}
          </View>
          {calendarRows.map((row, rowIndex) => (
            <View key={`week-${rowIndex}`} style={styles.calendarRow}>
              {row.map((date, columnIndex) => {
                if (!date) {
                  return <View key={`empty-${rowIndex}-${columnIndex}`} style={styles.calendarCell} />;
                }
                const key = dateKey(date);
                const inRange = key >= state.range.startDate && key <= state.range.endDate;
                const ratio = inRange
                  ? progressFor(date, state.checks, state.structure)
                  : 0;
                const selectedDay = key === state.selectedDate;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDate(date, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}${inRange ? `, ${Math.round(ratio * 100)} percent complete` : ', outside tracker dates'}`}
                    accessibilityState={{
                      selected: selectedDay,
                      disabled: !inRange,
                    }}
                    disabled={!inRange}
                    onPress={() => {
                      planner.selectDate(key);
                      setCalendarMonth(monthKey(date));
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.calendarCell,
                      styles.calendarDay,
                      {
                        backgroundColor: selectedDay
                          ? colors.primary
                          : ratio > 0
                            ? `${colors.primary}${Math.max(0x18, Math.round(ratio * 0x40)).toString(16).padStart(2, '0')}`
                            : 'transparent',
                        opacity: inRange ? 1 : 0.28,
                      },
                    ]}
                    testID={`calendar-${key}`}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        { color: selectedDay ? colors.primaryForeground : colors.foreground },
                        key === today && !selectedDay && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={styles.calendarLegend}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
              Filled days show saved progress
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tips & tricks</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Small habits for steady progress
            </Text>
          </View>
        </View>
        {TIPS.map((tip, index) => {
          const expanded = openTip === index;
          return (
            <View
              key={tip.title}
              style={[styles.tipCard, { backgroundColor: colors.card }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpenTip(expanded ? null : index)}
                style={styles.tipHeader}
              >
                <Text style={[styles.tipTitle, { color: colors.foreground }]}>
                  {tip.title}
                </Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
              {expanded && (
                <View style={styles.tipItems}>
                  {tip.items.map((item) => (
                    <View key={item} style={styles.tipItem}>
                      <View style={[styles.tipBullet, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Consistency beats intensity. Tick things off, review on Sundays, and adjust when life happens.
        </Text>
      </ScrollView>

      <Modal
        visible={editor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditor(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditor(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <KeyboardAwareScrollViewCompat
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              bottomOffset={28}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  {editor?.kind === 'flow'
                    ? state.structure.flow.some((item) => item.id === editor.id)
                      ? 'Edit time block'
                      : 'Add time block'
                    : editor?.kind === 'topic'
                      ? 'Edit topic'
                      : editor?.kind === 'new-topic'
                        ? 'Add a topic'
                        : editor?.taskId
                          ? 'Edit task'
                          : 'Add a checkbox'}
                </Text>
                <IconButton
                  icon="close"
                  label="Close"
                  color={colors.mutedForeground}
                  onPress={() => setEditor(null)}
                />
              </View>
              {editor?.kind === 'flow' && (
                <>
                  <FormField
                    label="Block name"
                    value={editor.time}
                    placeholder="e.g. Morning"
                    onChangeText={(time) => updateEditor({ time })}
                    colors={colors}
                  />
                  <FormField
                    label="Description"
                    value={editor.description}
                    placeholder="What happens in this block?"
                    onChangeText={(description) => updateEditor({ description })}
                    colors={colors}
                  />
                </>
              )}
              {(editor?.kind === 'topic' || editor?.kind === 'new-topic') && (
                <>
                  <FormField
                    label="Topic name"
                    value={editor.name}
                    placeholder="e.g. Fitness"
                    onChangeText={(name) => updateEditor({ name })}
                    colors={colors}
                  />
                  <FormField
                    label="Daily time (optional)"
                    value={editor.hours}
                    placeholder="e.g. 30 min"
                    onChangeText={(hours) => updateEditor({ hours })}
                    colors={colors}
                  />
                </>
              )}
              {editor?.kind === 'task' && (
                <FormField
                  label={editor.taskId ? 'Task text' : 'New checkbox'}
                  value={editor.text}
                  placeholder="Type the task"
                  onChangeText={(text) => updateEditor({ text })}
                  colors={colors}
                  multiline
                />
              )}
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => setEditor(null)}
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={saveEditor}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.primaryButtonText}>
                    {editor?.kind === 'flow' && !state.structure.flow.some((item) => item.id === editor.id)
                      ? 'Add block'
                      : editor?.kind === 'new-topic'
                        ? 'Add topic'
                        : editor?.kind === 'task' && !editor.taskId
                          ? 'Add checkbox'
                          : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAwareScrollViewCompat>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rangeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRangeOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRangeOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                    Tracker dates
                  </Text>
                  <Text style={[styles.sheetHint, { color: colors.mutedForeground }]}>
                    Days outside this range won&apos;t be counted.
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  label="Close date settings"
                  color={colors.mutedForeground}
                  onPress={() => setRangeOpen(false)}
                />
              </View>
              <DateSetting
                title="Start date"
                date={toDate(state.range.startDate)}
                colors={colors}
                onPress={() => showDatePicker('start')}
              />
              <DateSetting
                title="End date"
                date={toDate(state.range.endDate)}
                colors={colors}
                onPress={() => showDatePicker('end')}
              />
              <Pressable
                onPress={() => setRangeOpen(false)}
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'ios' && (
        <Modal
          visible={datePickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setDatePickerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setDatePickerOpen(false)}
            />
            <View style={[styles.sheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                    Choose date
                  </Text>
                  <IconButton
                    icon="close"
                    label="Close date picker"
                    color={colors.mutedForeground}
                    onPress={() => setDatePickerOpen(false)}
                  />
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  minimumDate={
                    dateTarget === 'selected' ? toDate(state.range.startDate) : undefined
                  }
                  maximumDate={
                    dateTarget === 'selected' ? toDate(state.range.endDate) : undefined
                  }
                  onChange={(_event, date) => {
                    if (date) setPickerDate(date);
                  }}
                  style={styles.iosDatePicker}
                />
                <Pressable
                  onPress={() => {
                    if (dateTarget) applyDate(dateTarget, pickerDate);
                    setDatePickerOpen(false);
                  }}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const FLOW_COLORS = ['#8b7dff', '#4d7cfe', '#00b894', '#e17055', '#d4a017'];

function ProgressRing({
  progress,
  color,
  track,
  text,
}: {
  progress: number;
  color: string;
  track: string;
  text: string;
}) {
  const radius = 46;
  const endAngle = progress * 2 * Math.PI - Math.PI / 2;
  const endX = 56 + radius * Math.cos(endAngle);
  const endY = 56 + radius * Math.sin(endAngle);
  const arcPath = `M 56 ${56 - radius} A ${radius} ${radius} 0 ${progress > 0.5 ? 1 : 0} 1 ${endX} ${endY}`;
  return (
    <View style={styles.ringWrap} accessibilityLabel={`${Math.round(progress * 100)} percent complete`}>
      <Svg width={112} height={112} viewBox="0 0 112 112">
        <Circle cx="56" cy="56" r={radius} fill="none" stroke={track} strokeWidth="8" />
        {progress >= 0.999 ? (
          <Circle cx="56" cy="56" r={radius} fill="none" stroke={color} strokeWidth="8" />
        ) : progress > 0 ? (
          <Path d={arcPath} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        ) : null}
      </Svg>
      <Text style={[styles.ringValue, { color: text }]}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

function StatPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  color,
  disabled,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      <Ionicons name={icon} size={19} color={disabled ? '#aeb3c4' : color} />
    </Pressable>
  );
}

function SectionTitle({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  colors,
  multiline = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
}) {
  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
        returnKeyType={multiline ? 'default' : 'done'}
        testID={`input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      />
    </View>
  );
}

function DateSetting({
  title,
  date,
  colors,
  onPress,
}: {
  title: string;
  date: Date;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.dateSetting, { backgroundColor: colors.secondary }]}
    >
      <View style={styles.dateSettingCopy}>
        <Text style={[styles.dateSettingLabel, { color: colors.mutedForeground }]}>{title}</Text>
        <Text style={[styles.dateSettingValue, { color: colors.foreground }]}>
          {formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>
      <Ionicons name="calendar-outline" size={21} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  loadingText: { fontSize: 16, textAlign: 'center', fontFamily: 'Inter_500Medium' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 44, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6 },
  headerText: { flex: 1, gap: 4 },
  brand: { fontSize: 29, letterSpacing: -0.7, fontFamily: 'Inter_700Bold' },
  rangeSummary: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.62 },
  disabled: { opacity: 0.45 },
  progressCard: { borderRadius: 23, padding: 17, gap: 16, elevation: 2, shadowColor: '#3e366f', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  ringValue: { position: 'absolute', fontSize: 23, fontFamily: 'Inter_700Bold' },
  progressCopy: { flex: 1, gap: 8 },
  progressEyebrow: { fontSize: 10, letterSpacing: 1.3, fontFamily: 'Inter_700Bold' },
  progressTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  progressBarTrack: { height: 6, borderRadius: 99, backgroundColor: '#e9eaf3', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 99 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: { flexGrow: 1, minWidth: '46%', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, gap: 2 },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dateCard: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 11, gap: 5 },
  dateNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3 },
  selectedDateButton: { flex: 1, minHeight: 42, borderRadius: 13, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  selectedDateText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  todayButton: { minHeight: 39, paddingHorizontal: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  todayButtonText: { color: '#ffffff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  rangeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8 },
  rangeButtonText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  dayHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 3 },
  dayAccent: { width: 4, height: 23, borderRadius: 5 },
  dayHeading: { flex: 1, fontSize: 20, letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 14 },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  sectionHeader: { marginTop: 5, marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 21, letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  sectionSubtitle: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  flowRail: { gap: 10, paddingVertical: 1, paddingRight: 3 },
  flowCard: { width: 238, minHeight: 120, borderRadius: 17, borderTopWidth: 3, padding: 13, gap: 9, elevation: 1, shadowColor: '#3e366f', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  flowCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flowTime: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  flowDescription: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  iconActions: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  addFlowCard: { width: 142, minHeight: 120, borderRadius: 17, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addFlowText: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  addButton: { minHeight: 38, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 11 },
  addButtonText: { color: '#ffffff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  topicCard: { borderRadius: 19, padding: 14, borderLeftWidth: 4, gap: 7, elevation: 1, shadowColor: '#3e366f', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 5 },
  topicIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  topicHeadingCopy: { flex: 1, gap: 3 },
  topicName: { fontSize: 15, lineHeight: 19, fontFamily: 'Inter_700Bold' },
  topicHours: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  topicProgressTrack: { height: 5, borderRadius: 99, overflow: 'hidden', backgroundColor: '#eceef4', marginBottom: 3 },
  topicProgressFill: { height: '100%', borderRadius: 99 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  checkbox: { width: 21, height: 21, borderWidth: 1.6, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  taskText: { flex: 1, fontSize: 13, lineHeight: 19, paddingTop: 1, fontFamily: 'Inter_400Regular' },
  taskCompleted: { textDecorationLine: 'line-through' },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 0, marginLeft: -4 },
  addTaskButton: { minHeight: 37, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
  addTaskText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  calendarCard: { borderRadius: 20, padding: 14, gap: 9 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  calendarWeekdays: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  calendarRow: { flexDirection: 'row' },
  calendarCell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { borderRadius: 12 },
  calendarDayText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingTop: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  tipCard: { borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 28 },
  tipTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  tipItems: { paddingTop: 7, gap: 9 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  tipBullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  footer: { textAlign: 'center', fontSize: 12, lineHeight: 18, paddingVertical: 10, fontFamily: 'Inter_400Regular' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12, 14, 24, 0.38)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingTop: 9, paddingBottom: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 13 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 3 },
  sheetTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  sheetHint: { marginTop: 4, fontSize: 12, fontFamily: 'Inter_400Regular' },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  textInput: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 15, fontFamily: 'Inter_400Regular' },
  multilineInput: { minHeight: 96, paddingTop: 12 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 7, paddingBottom: 6 },
  primaryButton: { minHeight: 46, borderRadius: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  secondaryButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  dateSetting: { minHeight: 70, borderRadius: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateSettingCopy: { gap: 3 },
  dateSettingLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  dateSettingValue: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  iosDatePicker: { alignSelf: 'center', width: '100%' },
  storageNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12 },
  storageNoticeText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium' },
});
