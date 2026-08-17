import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LeaveScreen } from './src/screens/LeaveScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { generateSchedule } from './src/services/scheduleGenerator';
import { validateSchedule } from './src/services/scheduleValidation';
import { useAppData } from './src/hooks/useAppData';
import {
  Employee,
  LeavePriority,
  ShiftDefinition,
  ShiftId,
  WeekSchedule,
} from './src/types';
import { colors, radius } from './src/theme';
import { startOfWeek } from './src/utils/date';

type TabId = 'schedule' | 'leave' | 'settings';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'schedule', label: 'Plan', icon: '▦' },
  { id: 'leave', label: 'İzinler', icon: '○' },
  { id: 'settings', label: 'Ayarlar', icon: '⚙' },
];

const TITLES: Record<TabId, { title: string; subtitle: string }> = {
  schedule: { title: 'Haftalık Plan', subtitle: 'Vardiyaları oluştur ve düzenle' },
  leave: { title: 'İzinler', subtitle: 'Bu haftanın talepleri' },
  settings: { title: 'Ayarlar', subtitle: 'Personeller ve vardiya saatleri' },
};

export default function App() {
  const { data, setData, hydrated, resetData } = useAppData();
  const [tab, setTab] = useState<TabId>('schedule');
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const schedule = data.schedules.find((item) => item.weekStart === weekStart);
  const issues = useMemo(
    () =>
      schedule
        ? validateSchedule({
            schedule,
            employees: data.employees,
            shifts: data.shifts,
            leaveRequests: data.leaveRequests,
            schedules: data.schedules,
          })
        : [],
    [schedule, data.employees, data.shifts, data.leaveRequests, data.schedules],
  );

  function saveSchedule(nextSchedule: WeekSchedule) {
    setData((current) => ({
      ...current,
      schedules: [
        ...current.schedules.filter((item) => item.weekStart !== nextSchedule.weekStart),
        nextSchedule,
      ].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    }));
  }

  function runGenerator() {
    const result = generateSchedule({
      weekStart,
      employees: data.employees,
      shifts: data.shifts,
      leaveRequests: data.leaveRequests,
      schedules: data.schedules,
    });
    if (!result.schedule) {
      Alert.alert('Plan oluşturulamadı', result.errors.join('\n\n'));
      return;
    }
    saveSchedule(result.schedule);
  }

  function generate() {
    if (!schedule) {
      runGenerator();
      return;
    }
    Alert.alert(
      'Planı yeniden oluştur',
      'Bu haftadaki elle yaptığınız değişiklikler yeni planla değiştirilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Oluştur', onPress: runGenerator },
      ],
    );
  }

  function commitAssignment(nextSchedule: WeekSchedule) {
    const nextIssues = validateSchedule({
      schedule: nextSchedule,
      employees: data.employees,
      shifts: data.shifts,
      leaveRequests: data.leaveRequests,
      schedules: data.schedules,
    });
    const previousIds = new Set(issues.map((issue) => issue.id));
    const newlyCreated = nextIssues.filter((issue) => !previousIds.has(issue.id));

    if (newlyCreated.length === 0) {
      saveSchedule(nextSchedule);
      return;
    }

    const details = newlyCreated.slice(0, 3).map((issue) => `• ${issue.message}`).join('\n');
    const extra = newlyCreated.length > 3 ? `\n• ${newlyCreated.length - 3} uyarı daha` : '';
    Alert.alert(
      'Bu değişiklik sorun oluşturabilir',
      `${details}${extra}\n\nYine de kaydetmek ister misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yine de kaydet', onPress: () => saveSchedule(nextSchedule) },
      ],
    );
  }

  function changeAssignment(date: string, employeeId: string, shiftId: ShiftId) {
    if (!schedule) return;
    const nextSchedule: WeekSchedule = {
      ...schedule,
      edited: true,
      assignments: {
        ...schedule.assignments,
        [date]: { ...schedule.assignments[date], [employeeId]: shiftId },
      },
    };
    commitAssignment(nextSchedule);
  }

  function addLeave(employeeId: string, date: string, priority: LeavePriority) {
    setData((current) => ({
      ...current,
      leaveRequests: [
        ...current.leaveRequests.filter(
          (request) => !(request.employeeId === employeeId && request.date === date),
        ),
        { id: `leave-${Date.now()}`, employeeId, date, priority },
      ],
    }));
  }

  function deleteLeave(requestId: string) {
    setData((current) => ({
      ...current,
      leaveRequests: current.leaveRequests.filter((request) => request.id !== requestId),
    }));
  }

  function saveEmployee(employee: Employee) {
    setData((current) => {
      const exists = current.employees.some((item) => item.id === employee.id);
      return {
        ...current,
        employees: exists
          ? current.employees.map((item) => (item.id === employee.id ? employee : item))
          : [...current.employees, employee],
      };
    });
  }

  function deleteEmployee(employeeId: string) {
    setData((current) => ({
      ...current,
      employees: current.employees.filter((employee) => employee.id !== employeeId),
      leaveRequests: current.leaveRequests.filter((request) => request.employeeId !== employeeId),
      schedules: current.schedules.map((item) => ({
        ...item,
        assignments: Object.fromEntries(
          Object.entries(item.assignments).map(([date, day]) => {
            const { [employeeId]: _removed, ...remaining } = day;
            return [date, remaining];
          }),
        ),
      })),
    }));
  }

  function saveShift(shift: ShiftDefinition) {
    setData((current) => ({
      ...current,
      shifts: current.shifts.map((item) => (item.id === shift.id ? shift : item)),
    }));
  }

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Vardiya planı hazırlanıyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{TITLES[tab].title}</Text>
            <Text style={styles.subtitle}>{TITLES[tab].subtitle}</Text>
          </View>
          <View style={styles.brandMark}>
            <View style={styles.brandLine} />
            <View style={[styles.brandLine, styles.brandLineShort]} />
            <View style={styles.brandLine} />
          </View>
        </View>

        <View style={styles.screen}>
          {tab === 'schedule' && (
            <ScheduleScreen
              weekStart={weekStart}
              onChangeWeek={setWeekStart}
              schedule={schedule}
              schedules={data.schedules}
              employees={data.employees}
              shifts={data.shifts}
              issues={issues}
              onGenerate={generate}
              onChangeAssignment={changeAssignment}
            />
          )}
          {tab === 'leave' && (
            <LeaveScreen
              weekStart={weekStart}
              onChangeWeek={setWeekStart}
              employees={data.employees}
              requests={data.leaveRequests}
              onAdd={addLeave}
              onDelete={deleteLeave}
            />
          )}
          {tab === 'settings' && (
            <SettingsScreen
              employees={data.employees}
              shifts={data.shifts}
              onSaveEmployee={saveEmployee}
              onDeleteEmployee={deleteEmployee}
              onSaveShift={saveShift}
              onReset={resetData}
            />
          )}
        </View>

        <View style={styles.navOuter}>
          <View style={styles.nav}>
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.navItem}>
                  <View style={[styles.navIconWrap, active && styles.navIconActive]}>
                    <Text style={[styles.navIcon, active && styles.navTextActive]}>{item.icon}</Text>
                  </View>
                  <Text style={[styles.navLabel, active && styles.navTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
  },
  shell: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { minHeight: 78, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 4 },
  brandLine: { width: 20, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  brandLineShort: { width: 13, alignSelf: 'flex-start', marginLeft: 11 },
  screen: { flex: 1 },
  navOuter: { position: 'absolute', left: 14, right: 14, bottom: Platform.OS === 'ios' ? 8 : 12, alignItems: 'center' },
  nav: { width: '100%', maxWidth: 520, height: 72, borderRadius: radius.large, flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: '#17211B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8, paddingHorizontal: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIconWrap: { width: 32, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  navIconActive: { backgroundColor: colors.primarySoft },
  navIcon: { color: colors.textMuted, fontSize: 18, fontWeight: '800' },
  navLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  navTextActive: { color: colors.primary },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 13 },
});
