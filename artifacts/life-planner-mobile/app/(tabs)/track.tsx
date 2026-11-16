import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useState, type ComponentProps } from 'react';
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
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { usePlanner } from '@/hooks/usePlanner';
import {
  dateKey,
  formatDate,
  toDate,
  type Tracker,
} from '@/lib/planner';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Draft = {
  id?: string;
  name: string;
  unit: string;
  increment: string;
  goal: string;
};

const QUICK_TRACKERS = [
  { name: 'Water', unit: 'glasses', increment: '1', goal: '8' },
  { name: 'Cigarettes', unit: 'cigarettes', increment: '1', goal: '' },
];

export default function TrackScreen() {
  const planner = usePlanner();
  const colors = useColors(planner.state?.theme ?? 'system');
  const systemScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickerDate, setPickerDate] = useState(
    planner.state ? toDate(planner.state.selectedDate) : new Date(),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!planner.state) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { state } = planner;
  const selectedDate = toDate(state.selectedDate);
  const values = state.trackerValues[state.selectedDate] ?? {};
  const isDark =
    state.theme === 'dark' ||
    (state.theme === 'system' && systemScheme === 'dark');

  const setDraftField = (key: keyof Draft, value: string) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const openEditor = (tracker?: Tracker) => {
    setDraft(
      tracker
        ? {
            id: tracker.id,
            name: tracker.name,
            unit: tracker.unit,
            increment: String(tracker.increment),
            goal: tracker.goal === null ? '' : String(tracker.goal),
          }
        : { name: '', unit: '', increment: '1', goal: '' },
    );
  };

  const saveTracker = () => {
    if (!draft?.name.trim()) {
      Alert.alert('Name required', 'Enter a name for this tracker.');
      return;
    }
    const increment = Number(draft.increment);
    const goal = draft.goal.trim() ? Number(draft.goal) : null;
    if (!Number.isFinite(increment) || increment <= 0) {
      Alert.alert('Check the increment', 'The amount added per tap must be greater than zero.');
      return;
    }
    if (goal !== null && (!Number.isFinite(goal) || goal <= 0)) {
      Alert.alert('Check the daily goal', 'Enter a goal greater than zero, or leave it blank.');
      return;
    }
    if (draft.id) {
      const existing = state.trackers.find((tracker) => tracker.id === draft.id);
      if (!existing) return;
      planner.editTracker({
        ...existing,
        name: draft.name.trim(),
        unit: draft.unit.trim() || 'times',
        increment,
        goal,
      });
    } else {
      planner.addTracker(
        draft.name.trim(),
        draft.unit.trim() || 'times',
        increment,
        goal,
      );
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDraft(null);
  };

  const pickDate = (offset: number) => {
    const next = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate() + offset,
    );
    const key = dateKey(next);
    if (key >= state.range.startDate && key <= state.range.endDate) {
      planner.selectDate(key);
      Haptics.selectionAsync();
    }
  };

  const showDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        display: 'default',
        minimumDate: toDate(state.range.startDate),
        maximumDate: toDate(state.range.endDate),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) planner.selectDate(dateKey(picked));
        },
      });
    } else {
      setPickerDate(selectedDate);
      setPickerOpen(true);
    }
  };

  const addQuickTracker = (item: (typeof QUICK_TRACKERS)[number]) => {
    planner.addTracker(
      item.name,
      item.unit,
      Number(item.increment),
      item.goal ? Number(item.goal) : null,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
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
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>Track</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Daily counters you choose
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a tracker"
            onPress={() => openEditor()}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            testID="add-tracker"
          >
            <Ionicons name="add" size={20} color={colors.primaryForeground} />
            <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>
              Add
            </Text>
          </Pressable>
        </View>

        <View style={[styles.dateCard, { backgroundColor: colors.card }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous tracker date"
            disabled={state.selectedDate <= state.range.startDate}
            onPress={() => pickDate(-1)}
            style={styles.dateArrow}
          >
            <Ionicons name="chevron-back" size={21} color={colors.foreground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose tracker date"
            onPress={showDatePicker}
            style={[styles.dateSelect, { backgroundColor: colors.secondary }]}
            testID="tracker-date"
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <View>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>TRACKING FOR</Text>
              <Text style={[styles.dateValue, { color: colors.foreground }]}>
                {formatDate(selectedDate, { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next tracker date"
            disabled={state.selectedDate >= state.range.endDate}
            onPress={() => pickDate(1)}
            style={styles.dateArrow}
          >
            <Ionicons name="chevron-forward" size={21} color={colors.foreground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to today"
            onPress={() => planner.selectDate(dateKey(new Date()))}
            style={[styles.todayButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.todayText, { color: colors.primaryForeground }]}>Today</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your trackers</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Add as many daily counters as you need
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.countBadgeText, { color: colors.primary }]}>
              {state.trackers.length}
            </Text>
          </View>
        </View>

        {state.trackers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="stats-chart-outline" size={27} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Start with a daily counter
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Track an amount, set an optional goal, and tap plus or minus during the day. Your counts stay on this device.
            </Text>
            <View style={styles.quickAddRow}>
              {QUICK_TRACKERS.map((item) => (
                <Pressable
                  key={item.name}
                  accessibilityRole="button"
                  onPress={() => addQuickTracker(item)}
                  style={[styles.quickAddButton, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name={item.name === 'Water' ? 'water-outline' : 'flame-outline'}
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={[styles.quickAddText, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => openEditor()}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Create a custom tracker
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.trackerList}>
            {state.trackers.map((tracker) => {
              const amount = values[tracker.id] ?? 0;
              const ratio =
                tracker.goal === null
                  ? null
                  : Math.min(amount / tracker.goal, 1);
              return (
                <View
                  key={tracker.id}
                  style={[styles.trackerCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.trackerHeader}>
                    <View
                      style={[
                        styles.trackerIcon,
                        { backgroundColor: `${tracker.color}1A` },
                      ]}
                    >
                      <Ionicons
                        name={iconForTracker(tracker) as IconName}
                        size={22}
                        color={tracker.color}
                      />
                    </View>
                    <View style={styles.trackerTitleCopy}>
                      <Text style={[styles.trackerName, { color: colors.foreground }]}>
                        {tracker.name}
                      </Text>
                      <Text style={[styles.trackerUnit, { color: colors.mutedForeground }]}>
                        {tracker.unit}
                        {tracker.increment !== 1
                          ? ` · +${formatAmount(tracker.increment)} per tap`
                          : ''}
                      </Text>
                    </View>
                    <IconAction
                      icon="pencil-outline"
                      label={`Edit ${tracker.name}`}
                      color={colors.mutedForeground}
                      onPress={() => openEditor(tracker)}
                    />
                    <IconAction
                      icon="trash-outline"
                      label={`Delete ${tracker.name}`}
                      color={colors.destructive}
                      onPress={() =>
                        Alert.alert(
                          `Delete ${tracker.name}?`,
                          'This also deletes all saved daily counts for this tracker.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => planner.deleteTracker(tracker.id),
                            },
                          ],
                        )
                      }
                    />
                  </View>

                  <View style={styles.counterRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Subtract ${formatAmount(tracker.increment)} ${tracker.unit}`}
                      disabled={amount <= 0}
                      onPress={() => {
                        planner.adjustTracker(tracker.id, -tracker.increment);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.counterButton,
                        styles.counterButtonSmall,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                          opacity: amount <= 0 ? 0.45 : 1,
                        },
                      ]}
                      testID={`decrease-${tracker.id}`}
                    >
                      <Ionicons name="remove" size={22} color={colors.foreground} />
                    </Pressable>
                    <View style={styles.amountDisplay}>
                      <Text style={[styles.amountValue, { color: colors.foreground }]}>
                        {formatAmount(amount)}
                      </Text>
                      <Text style={[styles.amountUnit, { color: colors.mutedForeground }]}>
                        {tracker.unit} today
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${formatAmount(tracker.increment)} ${tracker.unit}`}
                      onPress={() => {
                        planner.adjustTracker(tracker.id, tracker.increment);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.counterButton,
                        styles.counterButtonLarge,
                        { backgroundColor: tracker.color },
                      ]}
                      testID={`increase-${tracker.id}`}
                    >
                      <Ionicons name="add" size={25} color="#ffffff" />
                    </Pressable>
                  </View>

                  {tracker.goal !== null && (
                    <View style={styles.goalWrap}>
                      <View style={styles.goalLabelRow}>
                        <Text style={[styles.goalLabel, { color: colors.mutedForeground }]}>
                          Daily goal
                        </Text>
                        <Text style={[styles.goalValue, { color: colors.foreground }]}>
                          {formatAmount(amount)} / {formatAmount(tracker.goal)} {tracker.unit}
                        </Text>
                      </View>
                      <View style={[styles.goalTrack, { backgroundColor: colors.secondary }]}>
                        <View
                          style={[
                            styles.goalFill,
                            {
                              width: `${Math.round((ratio ?? 0) * 100)}%`,
                              backgroundColor: tracker.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => openEditor()}
          style={[styles.wideAddButton, { borderColor: colors.border }]}
          testID="add-another-tracker"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.wideAddText, { color: colors.primary }]}>
            Add another tracker
          </Text>
        </Pressable>

        <View style={[styles.noteCard, { backgroundColor: colors.accent }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.foreground }]}>
            Counts are stored locally on this device and saved separately for each date.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={draft !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDraft(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDraft(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <KeyboardAwareScrollViewCompat
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              bottomOffset={30}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                    {draft?.id ? 'Edit tracker' : 'New tracker'}
                  </Text>
                  <Text style={[styles.sheetHint, { color: colors.mutedForeground }]}>
                    Choose what to count each day.
                  </Text>
                </View>
                <IconAction
                  icon="close"
                  label="Close"
                  color={colors.mutedForeground}
                  onPress={() => setDraft(null)}
                />
              </View>
              <TrackerField
                label="Name"
                value={draft?.name ?? ''}
                placeholder="e.g. Water or cigarettes"
                onChange={(value) => setDraftField('name', value)}
                colors={colors}
              />
              <TrackerField
                label="Unit"
                value={draft?.unit ?? ''}
                placeholder="e.g. glasses, ml, cigarettes"
                onChange={(value) => setDraftField('unit', value)}
                colors={colors}
              />
              <TrackerField
                label="Amount added per tap"
                value={draft?.increment ?? '1'}
                placeholder="1"
                onChange={(value) => setDraftField('increment', value)}
                colors={colors}
                keyboardType="decimal-pad"
              />
              <TrackerField
                label="Daily goal (optional)"
                value={draft?.goal ?? ''}
                placeholder="Leave blank for no goal"
                onChange={(value) => setDraftField('goal', value)}
                colors={colors}
                keyboardType="decimal-pad"
              />
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => setDraft(null)}
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={saveTracker}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                    {draft?.id ? 'Save tracker' : 'Add tracker'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAwareScrollViewCompat>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'ios' && (
        <Modal
          visible={pickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPickerOpen(false)}
            />
            <View style={[styles.sheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                    Choose date
                  </Text>
                  <IconAction
                    icon="close"
                    label="Close date picker"
                    color={colors.mutedForeground}
                    onPress={() => setPickerOpen(false)}
                  />
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  minimumDate={toDate(state.range.startDate)}
                  maximumDate={toDate(state.range.endDate)}
                  onChange={(_event, date) => {
                    if (date) setPickerDate(date);
                  }}
                  style={styles.iosDatePicker}
                />
                <Pressable
                  onPress={() => {
                    planner.selectDate(dateKey(pickerDate));
                    setPickerOpen(false);
                  }}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function iconForTracker(tracker: Tracker): IconName {
  const target = `${tracker.name} ${tracker.unit}`.toLowerCase();
  if (target.includes('water') || target.includes('glass') || target.includes('ml') || target.includes('litre') || target.includes('liter')) {
    return 'water-outline';
  }
  if (target.includes('cigarette') || target.includes('smok')) return 'flame-outline';
  return 'stats-chart-outline';
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
}

function IconAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconAction, pressed && { opacity: 0.62 }]}
    >
      <Ionicons name={icon} size={19} color={color} />
    </Pressable>
  );
}

function TrackerField({
  label,
  value,
  placeholder,
  onChange,
  colors,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        style={[
          styles.fieldInput,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100, gap: 16 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, gap: 3 },
  title: { fontSize: 28, letterSpacing: -0.5, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  addButton: { minHeight: 40, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dateCard: { minHeight: 65, borderRadius: 18, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateArrow: { width: 30, height: 42, alignItems: 'center', justifyContent: 'center' },
  dateSelect: { flex: 1, minHeight: 46, borderRadius: 13, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dateLabel: { fontSize: 9, letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold' },
  dateValue: { marginTop: 2, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  todayButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  todayText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 21, letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  sectionSubtitle: { marginTop: 3, fontSize: 12, fontFamily: 'Inter_400Regular' },
  countBadge: { minWidth: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  emptyCard: { borderRadius: 21, padding: 20, alignItems: 'center', gap: 12, elevation: 1, shadowColor: '#3e366f', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  quickAddRow: { flexDirection: 'row', gap: 8, width: '100%', marginVertical: 2 },
  quickAddButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickAddText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  primaryButton: { minHeight: 46, width: '100%', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  primaryButtonText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  trackerList: { gap: 12 },
  trackerCard: { borderRadius: 19, padding: 15, gap: 13, elevation: 1, shadowColor: '#3e366f', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  trackerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackerIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  trackerTitleCopy: { flex: 1, gap: 3 },
  trackerName: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  trackerUnit: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  iconAction: { width: 31, height: 36, alignItems: 'center', justifyContent: 'center' },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  counterButton: { alignItems: 'center', justifyContent: 'center' },
  counterButtonSmall: { width: 46, height: 46, borderRadius: 15, borderWidth: 1 },
  counterButtonLarge: { width: 55, height: 55, borderRadius: 18, elevation: 2, shadowColor: '#35304f', shadowOpacity: 0.13, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  amountDisplay: { minWidth: 112, alignItems: 'center', gap: 1 },
  amountValue: { fontSize: 31, letterSpacing: -0.5, fontFamily: 'Inter_700Bold' },
  amountUnit: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  goalWrap: { gap: 6 },
  goalLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  goalLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  goalValue: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  goalTrack: { height: 6, borderRadius: 10, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 10 },
  wideAddButton: { minHeight: 48, borderWidth: 1, borderStyle: 'dashed', borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  wideAddText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  noteCard: { borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12, 14, 24, 0.38)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingTop: 9, paddingBottom: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 13 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 3 },
  sheetTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  sheetHint: { marginTop: 4, fontSize: 12, fontFamily: 'Inter_400Regular' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  fieldInput: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 15, fontFamily: 'Inter_400Regular' },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 7, paddingBottom: 6 },
  secondaryButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  iosDatePicker: { alignSelf: 'center', width: '100%' },
});
