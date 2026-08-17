import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OFF_LABEL, SHIFT_COLORS, SHIFT_IDS } from '../constants';
import { ModalSheet } from '../components/ModalSheet';
import { PrimaryButton } from '../components/PrimaryButton';
import { WeekNavigator } from '../components/WeekNavigator';
import {
  Employee,
  ScheduleIssue,
  ShiftDefinition,
  ShiftId,
  WeekSchedule,
} from '../types';
import { colors, radius } from '../theme';
import { formatDayLong, formatDayMonth, formatDayShort, getWeekDates, monthKey } from '../utils/date';
import { formatMinutes, getShiftMinutes } from '../utils/time';
import { getAllWeekStats, getMonthMinutes } from '../services/scheduleStats';

interface Props {
  weekStart: string;
  onChangeWeek: (weekStart: string) => void;
  schedule?: WeekSchedule;
  schedules: WeekSchedule[];
  employees: Employee[];
  shifts: ShiftDefinition[];
  issues: ScheduleIssue[];
  onGenerate: () => void;
  onChangeAssignment: (date: string, employeeId: string, shiftId: ShiftId) => void;
}

interface EditingCell {
  date: string;
  employee: Employee;
}

export function ScheduleScreen({
  weekStart,
  onChangeWeek,
  schedule,
  schedules,
  employees,
  shifts,
  issues,
  onGenerate,
  onChangeAssignment,
}: Props) {
  const dates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const stats = useMemo(
    () => getAllWeekStats(schedule, employees, shifts),
    [schedule, employees, shifts],
  );

  useEffect(() => {
    setSelectedDate(weekStart);
  }, [weekStart]);

  const shiftById = Object.fromEntries(shifts.map((shift) => [shift.id, shift]));
  const selectedMonth = monthKey(selectedDate);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <WeekNavigator weekStart={weekStart} onChange={onChangeWeek} />

      <View style={styles.dayStrip}>
        {dates.map((date) => {
          const selected = date === selectedDate;
          return (
            <Pressable
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[styles.dayButton, selected && styles.dayButtonSelected]}
            >
              <Text style={[styles.dayShort, selected && styles.dayTextSelected]}>{formatDayShort(date)}</Text>
              <Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>
                {Number(date.slice(-2))}
              </Text>
              {schedule && <View style={[styles.dayDot, selected && styles.dayDotSelected]} />}
            </Pressable>
          );
        })}
      </View>

      {!schedule ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>7</Text>
          </View>
          <Text style={styles.emptyTitle}>Bu haftanın planı hazır değil</Text>
          <Text style={styles.emptyText}>
            İzinleri ve çalışma saatlerini dikkate alarak dengeli bir plan oluşturun.
          </Text>
          <PrimaryButton label="Haftayı oluştur" onPress={onGenerate} style={styles.fullButton} />
        </View>
      ) : (
        <>
          {issues.length > 0 && (
            <View style={[styles.issueCard, issues.some((issue) => issue.severity === 'critical') && styles.issueCritical]}>
              <Text style={styles.issueTitle}>
                {issues.some((issue) => issue.severity === 'critical') ? 'Dikkat edilmesi gerekenler' : 'Plan notları'}
              </Text>
              {issues.slice(0, 3).map((issue) => (
                <Text key={issue.id} style={styles.issueText}>• {issue.message}</Text>
              ))}
              {issues.length > 3 && <Text style={styles.issueMore}>+{issues.length - 3} not daha</Text>}
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.eyebrow}>{formatDayLong(selectedDate)}</Text>
                <Text style={styles.sectionTitle}>{formatDayMonth(selectedDate)}</Text>
              </View>
              <Text style={styles.tapHint}>Değiştirmek için dokun</Text>
            </View>

            {employees.map((employee, index) => {
              const shiftId = schedule.assignments[selectedDate]?.[employee.id] ?? 'off';
              const shift = shiftId === 'off' ? undefined : shiftById[shiftId];
              const palette = SHIFT_COLORS[shiftId];
              return (
                <View key={employee.id} style={[styles.employeeRow, index > 0 && styles.employeeBorder]}>
                  <View style={styles.personBlock}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{employee.name.trim().charAt(0).toLocaleUpperCase('tr-TR')}</Text>
                    </View>
                    <View>
                      <Text style={styles.personName}>{employee.name}</Text>
                      <Text style={styles.personTime}>
                        {shift ? `${shift.start}–${shift.end}` : 'Çalışma yok'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setEditingCell({ date: selectedDate, employee })}
                    style={[styles.shiftPill, { backgroundColor: palette.background }]}
                  >
                    <View style={[styles.shiftDot, { backgroundColor: palette.accent }]} />
                    <Text style={[styles.shiftText, { color: palette.text }]}>
                      {shift?.label ?? OFF_LABEL}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <PrimaryButton label="Planı yeniden oluştur" variant="secondary" onPress={onGenerate} />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Haftalık toplamlar</Text>
            <Text style={styles.summaryHint}>Hedef kişi başı yaklaşık 45 saat</Text>
            {stats.map((item, index) => {
              const employee = employees.find((person) => person.id === item.employeeId);
              const monthMinutes = getMonthMinutes(item.employeeId, selectedMonth, schedules, shifts);
              return (
                <View key={item.employeeId} style={[styles.totalRow, index > 0 && styles.employeeBorder]}>
                  <View style={styles.totalNameWrap}>
                    <Text style={styles.personName}>{employee?.name}</Text>
                    <Text style={styles.countText}>
                      Sabah {item.counts.morning} · Öğlen {item.counts.afternoon} · Full {item.counts.full} · İzin {item.counts.off}
                    </Text>
                  </View>
                  <View style={styles.totalRight}>
                    <Text style={styles.totalValue}>{formatMinutes(item.totalMinutes)}</Text>
                    <Text style={styles.monthValue}>Ay: {formatMinutes(monthMinutes)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <ModalSheet
        visible={Boolean(editingCell)}
        title={editingCell ? `${editingCell.employee.name} · ${formatDayLong(editingCell.date)}` : 'Vardiya seç'}
        onClose={() => setEditingCell(null)}
      >
        <Text style={styles.modalHint}>Yeni vardiyayı seçin. Kurala aykırı bir durum olursa kaydetmeden önce uyarılırsınız.</Text>
        <View style={styles.shiftOptions}>
          {SHIFT_IDS.map((shiftId) => {
            const shift = shiftId === 'off' ? undefined : shiftById[shiftId];
            const disabled = Boolean(
              editingCell && shiftId !== 'off' && !editingCell.employee.allowedShifts.includes(shiftId),
            );
            const palette = SHIFT_COLORS[shiftId];
            return (
              <Pressable
                key={shiftId}
                disabled={disabled}
                onPress={() => {
                  if (!editingCell) return;
                  onChangeAssignment(editingCell.date, editingCell.employee.id, shiftId);
                  setEditingCell(null);
                }}
                style={[styles.shiftOption, { backgroundColor: palette.background }, disabled && styles.disabled]}
              >
                <View style={[styles.optionAccent, { backgroundColor: palette.accent }]} />
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>{shift?.label ?? OFF_LABEL}</Text>
                  <Text style={[styles.optionSubtitle, { color: palette.text }]}>
                    {shift ? `${shift.start}–${shift.end} · ${formatMinutes(getShiftMinutes(shift))}` : 'Haftalık izin'}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: palette.text }]}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </ModalSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120, gap: 16 },
  dayStrip: { flexDirection: 'row', gap: 5, marginTop: 2 },
  dayButton: { flex: 1, minWidth: 38, paddingVertical: 9, alignItems: 'center', borderRadius: radius.medium },
  dayButtonSelected: { backgroundColor: colors.primary },
  dayShort: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  dayNumber: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  dayTextSelected: { color: '#FFFFFF' },
  dayDot: { width: 4, height: 4, marginTop: 5, borderRadius: 2, backgroundColor: colors.primary },
  dayDotSelected: { backgroundColor: '#FFFFFF' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 6,
  },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: colors.primary, fontSize: 24, fontWeight: '900' },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  emptyText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  fullButton: { alignSelf: 'stretch', marginTop: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, padding: 17 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 2 },
  tapHint: { color: colors.textMuted, fontSize: 10, marginBottom: 3 },
  employeeRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  employeeBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  personBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  personName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  personTime: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  shiftPill: { minWidth: 92, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  shiftDot: { width: 7, height: 7, borderRadius: 4 },
  shiftText: { fontSize: 13, fontWeight: '800' },
  issueCard: { borderRadius: radius.medium, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: '#F0DEAB', padding: 14 },
  issueCritical: { backgroundColor: colors.dangerSoft, borderColor: '#F1C9C9' },
  issueTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 5 },
  issueText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  issueMore: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  summaryHint: { color: colors.textMuted, fontSize: 12, marginTop: 3, marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 68, gap: 10 },
  totalNameWrap: { flex: 1 },
  countText: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  totalRight: { alignItems: 'flex-end' },
  totalValue: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  monthValue: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  modalHint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  shiftOptions: { gap: 10, paddingBottom: 8 },
  shiftOption: { minHeight: 62, borderRadius: radius.medium, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', paddingRight: 16 },
  optionAccent: { width: 5, alignSelf: 'stretch' },
  optionCopy: { flex: 1, paddingHorizontal: 14 },
  optionTitle: { fontSize: 15, fontWeight: '800' },
  optionSubtitle: { fontSize: 11, marginTop: 4, opacity: 0.82 },
  chevron: { fontSize: 27 },
  disabled: { opacity: 0.35 },
});
