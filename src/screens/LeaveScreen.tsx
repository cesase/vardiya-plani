import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ModalSheet } from '../components/ModalSheet';
import { PrimaryButton } from '../components/PrimaryButton';
import { WeekNavigator } from '../components/WeekNavigator';
import { Employee, LeavePriority, LeaveRequest } from '../types';
import { colors, radius } from '../theme';
import { formatDayLong, formatDayMonth, formatDayShort, getWeekDates, isDateInWeek } from '../utils/date';

interface Props {
  weekStart: string;
  onChangeWeek: (weekStart: string) => void;
  employees: Employee[];
  requests: LeaveRequest[];
  onAdd: (employeeId: string, date: string, priority: LeavePriority) => void;
  onDelete: (requestId: string) => void;
}

export function LeaveScreen({ weekStart, onChangeWeek, employees, requests, onAdd, onDelete }: Props) {
  const dates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekRequests = requests.filter((request) => isDateInWeek(request.date, weekStart));
  const [modalOpen, setModalOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [date, setDate] = useState(dates[0]);
  const [priority, setPriority] = useState<LeavePriority>('preferred');

  function openForm() {
    setEmployeeId(employees[0]?.id ?? '');
    setDate(dates[0]);
    setPriority('preferred');
    setModalOpen(true);
  }

  function save() {
    if (!employeeId) return;
    onAdd(employeeId, date, priority);
    setModalOpen(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <WeekNavigator weekStart={weekStart} onChange={onChangeWeek} />

      <View style={styles.introCard}>
        <View style={styles.introCopy}>
          <Text style={styles.introTitle}>İzin talepleri</Text>
          <Text style={styles.introText}>Planı oluşturmadan önce bu haftanın izinlerini ekleyin.</Text>
        </View>
        <PrimaryButton label="+ Ekle" compact onPress={openForm} />
      </View>

      {weekRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Bu hafta izin talebi yok</Text>
          <Text style={styles.emptyText}>Her personele otomatik olarak bir izin günü verilmeye devam eder.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {weekRequests
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((request, index) => {
              const employee = employees.find((item) => item.id === request.employeeId);
              return (
                <View key={request.id} style={[styles.requestRow, index > 0 && styles.borderTop]}>
                  <View style={styles.dateTile}>
                    <Text style={styles.dateDay}>{formatDayShort(request.date)}</Text>
                    <Text style={styles.dateNumber}>{Number(request.date.slice(-2))}</Text>
                  </View>
                  <View style={styles.requestCopy}>
                    <Text style={styles.employeeName}>{employee?.name ?? 'Silinmiş personel'}</Text>
                    <Text style={styles.requestDate}>{formatDayMonth(request.date)}</Text>
                    <View style={[styles.priorityBadge, request.priority === 'fixed' && styles.fixedBadge]}>
                      <Text style={[styles.priorityText, request.priority === 'fixed' && styles.fixedText]}>
                        {request.priority === 'fixed' ? 'Kesin izin' : 'Tercih edilen'}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => onDelete(request.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteText}>Sil</Text>
                  </Pressable>
                </View>
              );
            })}
        </View>
      )}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Nasıl çalışır?</Text>
        <Text style={styles.noteText}>Kesin izin değiştirilemez. Tercih edilen izin, kurallar uygunsa uygulanır; uygun değilse başka gün seçilir.</Text>
      </View>

      <ModalSheet visible={modalOpen} title="İzin talebi ekle" onClose={() => setModalOpen(false)}>
        <Text style={styles.fieldLabel}>Personel</Text>
        <View style={styles.choiceWrap}>
          {employees.map((employee) => (
            <Pressable
              key={employee.id}
              onPress={() => setEmployeeId(employee.id)}
              style={[styles.choiceChip, employeeId === employee.id && styles.choiceChipSelected]}
            >
              <Text style={[styles.choiceText, employeeId === employee.id && styles.choiceTextSelected]}>{employee.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Gün</Text>
        <View style={styles.daysGrid}>
          {dates.map((item) => (
            <Pressable
              key={item}
              onPress={() => setDate(item)}
              style={[styles.modalDay, date === item && styles.modalDaySelected]}
            >
              <Text style={[styles.modalDayName, date === item && styles.choiceTextSelected]}>{formatDayShort(item)}</Text>
              <Text style={[styles.modalDayNumber, date === item && styles.choiceTextSelected]}>{Number(item.slice(-2))}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Öncelik</Text>
        <View style={styles.priorityOptions}>
          <Pressable
            onPress={() => setPriority('preferred')}
            style={[styles.priorityOption, priority === 'preferred' && styles.priorityOptionSelected]}
          >
            <Text style={styles.optionTitle}>Tercih edilen</Text>
            <Text style={styles.optionText}>Mümkünse bu gün izin verilir.</Text>
          </Pressable>
          <Pressable
            onPress={() => setPriority('fixed')}
            style={[styles.priorityOption, priority === 'fixed' && styles.priorityOptionSelected]}
          >
            <Text style={styles.optionTitle}>Kesin izin</Text>
            <Text style={styles.optionText}>Personel bu gün çalışamaz.</Text>
          </Pressable>
        </View>

        <PrimaryButton label="İzni kaydet" onPress={save} disabled={!employeeId} style={styles.saveButton} />
      </ModalSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120, gap: 16 },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft, borderRadius: radius.large, padding: 17 },
  introCopy: { flex: 1 },
  introTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  introText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  requestRow: { flexDirection: 'row', alignItems: 'center', minHeight: 92, gap: 12 },
  borderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dateTile: { width: 48, height: 58, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  dateNumber: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
  requestCopy: { flex: 1 },
  employeeName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  requestDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  priorityBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  fixedBadge: { backgroundColor: colors.warningSoft },
  priorityText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  fixedText: { color: colors.warning },
  deleteButton: { padding: 10 },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  noteCard: { borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, padding: 15 },
  noteTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  noteText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 9 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  choiceChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  choiceTextSelected: { color: '#FFFFFF' },
  daysGrid: { flexDirection: 'row', gap: 5 },
  modalDay: { flex: 1, minWidth: 38, alignItems: 'center', paddingVertical: 10, borderRadius: radius.medium, backgroundColor: colors.surfaceMuted },
  modalDaySelected: { backgroundColor: colors.primary },
  modalDayName: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  modalDayNumber: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 3 },
  priorityOptions: { gap: 9 },
  priorityOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 14 },
  priorityOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  optionText: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  saveButton: { marginTop: 20, marginBottom: 8 },
});

