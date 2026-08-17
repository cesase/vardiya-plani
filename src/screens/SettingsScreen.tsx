import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WORK_SHIFT_IDS } from '../constants';
import { ModalSheet } from '../components/ModalSheet';
import { PrimaryButton } from '../components/PrimaryButton';
import { Employee, ShiftDefinition, WorkShiftId } from '../types';
import { colors, radius } from '../theme';
import { formatMinutes, getShiftMinutes, isValidShiftDefinition } from '../utils/time';

interface Props {
  employees: Employee[];
  shifts: ShiftDefinition[];
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onSaveShift: (shift: ShiftDefinition) => void;
  onReset: () => void;
}

const SHIFT_NAMES: Record<WorkShiftId, string> = {
  morning: 'Sabah',
  afternoon: 'Öğlen',
  full: 'Full',
};

export function SettingsScreen({
  employees,
  shifts,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveShift,
  onReset,
}: Props) {
  const [employeeDraft, setEmployeeDraft] = useState<Employee | null>(null);
  const [shiftDraft, setShiftDraft] = useState<ShiftDefinition | null>(null);
  const [breakText, setBreakText] = useState('');
  const isNewEmployee = Boolean(employeeDraft && !employees.some((employee) => employee.id === employeeDraft.id));

  function openNewEmployee() {
    setEmployeeDraft({
      id: `person-${Date.now()}`,
      name: '',
      allowedShifts: [...WORK_SHIFT_IDS],
    });
  }

  function toggleAllowed(shiftId: WorkShiftId) {
    if (!employeeDraft) return;
    const included = employeeDraft.allowedShifts.includes(shiftId);
    const next = included
      ? employeeDraft.allowedShifts.filter((item) => item !== shiftId)
      : [...employeeDraft.allowedShifts, shiftId];
    setEmployeeDraft({ ...employeeDraft, allowedShifts: next });
  }

  function saveEmployee() {
    if (!employeeDraft) return;
    const trimmed = employeeDraft.name.trim();
    if (!trimmed) {
      Alert.alert('İsim gerekli', 'Personelin adını yazın.');
      return;
    }
    if (employeeDraft.allowedShifts.length === 0) {
      Alert.alert('Vardiya gerekli', 'Personelin çalışabileceği en az bir vardiya seçin.');
      return;
    }
    onSaveEmployee({ ...employeeDraft, name: trimmed });
    setEmployeeDraft(null);
  }

  function confirmDelete(employee: Employee) {
    Alert.alert(
      'Personeli sil',
      `${employee.name} personel listesinden silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => onDeleteEmployee(employee.id) },
      ],
    );
  }

  function openShift(shift: ShiftDefinition) {
    setShiftDraft({ ...shift });
    setBreakText(String(shift.breakMinutes));
  }

  function saveShift() {
    if (!shiftDraft) return;
    const updated = { ...shiftDraft, breakMinutes: Number(breakText) };
    if (!Number.isFinite(updated.breakMinutes) || !isValidShiftDefinition(updated)) {
      Alert.alert('Saatleri kontrol edin', 'Saatleri 08:45 biçiminde, mola süresini dakika olarak yazın.');
      return;
    }
    onSaveShift(updated);
    setShiftDraft(null);
  }

  function confirmReset() {
    Alert.alert(
      'Tüm verileri sıfırla',
      'Personeller, izin talepleri ve kayıtlı haftalar ilk haline döner. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sıfırla', style: 'destructive', onPress: onReset },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.pageTitle}>Personeller</Text>
          <Text style={styles.pageText}>İsimleri ve çalışabilecekleri vardiyaları yönetin.</Text>
        </View>
        <PrimaryButton label="+ Ekle" compact onPress={openNewEmployee} />
      </View>

      <View style={styles.card}>
        {employees.map((employee, index) => (
          <Pressable
            key={employee.id}
            onPress={() => setEmployeeDraft({ ...employee, allowedShifts: [...employee.allowedShifts] })}
            style={[styles.employeeRow, index > 0 && styles.borderTop]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{employee.name.charAt(0).toLocaleUpperCase('tr-TR')}</Text>
            </View>
            <View style={styles.employeeCopy}>
              <Text style={styles.employeeName}>{employee.name}</Text>
              <Text style={styles.allowedText}>
                {employee.allowedShifts.map((id) => SHIFT_NAMES[id]).join(' · ')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.pageTitle}>Vardiya saatleri</Text>
        <Text style={styles.pageText}>Mola süresi net çalışma saatinden otomatik düşülür.</Text>
      </View>
      <View style={styles.card}>
        {shifts.map((shift, index) => (
          <Pressable key={shift.id} onPress={() => openShift(shift)} style={[styles.shiftRow, index > 0 && styles.borderTop]}>
            <View style={styles.shiftCopy}>
              <Text style={styles.employeeName}>{shift.label}</Text>
              <Text style={styles.allowedText}>{shift.start}–{shift.end} · {shift.breakMinutes} dk mola</Text>
            </View>
            <Text style={styles.netTime}>{formatMinutes(getShiftMinutes(shift))}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>Planın temel kuralları</Text>
        <Text style={styles.ruleText}>• Her personele normalde haftada 1 izin</Text>
        <Text style={styles.ruleText}>• Açılış ve kapanışta en az 2 kişi</Text>
        <Text style={styles.ruleText}>• Haftada mümkün olduğunca 45 saat</Text>
        <Text style={styles.ruleText}>• İzin öncesi Sabah, izin sonrası Öğlen tercihi</Text>
        <Text style={styles.ruleText}>• Arka arkaya Full vardiyasından kaçınma</Text>
      </View>

      <PrimaryButton label="Tüm verileri sıfırla" variant="danger" onPress={confirmReset} />

      <ModalSheet
        visible={Boolean(employeeDraft)}
        title={isNewEmployee ? 'Personel ekle' : 'Personeli düzenle'}
        onClose={() => setEmployeeDraft(null)}
      >
        <Text style={styles.fieldLabel}>Adı</Text>
        <TextInput
          value={employeeDraft?.name ?? ''}
          onChangeText={(name) => employeeDraft && setEmployeeDraft({ ...employeeDraft, name })}
          placeholder="Personel adı"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Çalışabileceği vardiyalar</Text>
        <Text style={styles.fieldHint}>Seçili olmayan vardiya otomatik planda bu personele verilmez.</Text>
        <View style={styles.allowedChoices}>
          {WORK_SHIFT_IDS.map((shiftId) => {
            const selected = employeeDraft?.allowedShifts.includes(shiftId);
            return (
              <Pressable
                key={shiftId}
                onPress={() => toggleAllowed(shiftId)}
                style={[styles.allowedChoice, selected && styles.allowedChoiceSelected]}
              >
                <Text style={[styles.allowedChoiceText, selected && styles.allowedChoiceTextSelected]}>
                  {selected ? '✓ ' : ''}{SHIFT_NAMES[shiftId]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton label="Kaydet" onPress={saveEmployee} style={styles.saveButton} />
        {!isNewEmployee && employeeDraft && (
          <PrimaryButton
            label="Personeli sil"
            variant="danger"
            onPress={() => {
              const employee = employeeDraft;
              setEmployeeDraft(null);
              confirmDelete(employee);
            }}
            style={styles.secondaryButton}
          />
        )}
      </ModalSheet>

      <ModalSheet visible={Boolean(shiftDraft)} title={`${shiftDraft?.label ?? ''} vardiyası`} onClose={() => setShiftDraft(null)}>
        <Text style={styles.fieldLabel}>Başlangıç</Text>
        <TextInput
          value={shiftDraft?.start ?? ''}
          onChangeText={(start) => shiftDraft && setShiftDraft({ ...shiftDraft, start })}
          placeholder="08:45"
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Bitiş</Text>
        <TextInput
          value={shiftDraft?.end ?? ''}
          onChangeText={(end) => shiftDraft && setShiftDraft({ ...shiftDraft, end })}
          placeholder="21:15"
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Mola (dakika)</Text>
        <TextInput
          value={breakText}
          onChangeText={setBreakText}
          placeholder="60"
          keyboardType="number-pad"
          style={styles.input}
        />
        {shiftDraft && isValidShiftDefinition({ ...shiftDraft, breakMinutes: Number(breakText) }) && (
          <Text style={styles.calculatedText}>
            Net çalışma: {formatMinutes(getShiftMinutes({ ...shiftDraft, breakMinutes: Number(breakText) }))}
          </Text>
        )}
        <PrimaryButton label="Saatleri kaydet" onPress={saveShift} style={styles.saveButton} />
      </ModalSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120, gap: 16 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingCopy: { flex: 1 },
  pageTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  pageText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  card: { backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  employeeRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11 },
  borderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  employeeCopy: { flex: 1 },
  employeeName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  allowedText: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  chevron: { color: colors.textMuted, fontSize: 25 },
  sectionHeader: { marginTop: 5 },
  shiftRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10 },
  shiftCopy: { flex: 1 },
  netTime: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  rulesCard: { backgroundColor: colors.primarySoft, borderRadius: radius.large, padding: 17 },
  rulesTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 7 },
  ruleText: { color: colors.textMuted, fontSize: 12, lineHeight: 20 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  fieldHint: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: -3, marginBottom: 9 },
  input: { minHeight: 50, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 14, color: colors.text, fontSize: 15 },
  allowedChoices: { flexDirection: 'row', gap: 8 },
  allowedChoice: { flex: 1, paddingHorizontal: 9, paddingVertical: 12, alignItems: 'center', borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  allowedChoiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  allowedChoiceText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  allowedChoiceTextSelected: { color: colors.primary },
  saveButton: { marginTop: 22 },
  secondaryButton: { marginTop: 10, marginBottom: 8 },
  calculatedText: { color: colors.primary, fontSize: 13, fontWeight: '800', marginTop: 12 },
});
