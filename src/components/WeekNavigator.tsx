import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { addDays, formatWeekRange, startOfWeek } from '../utils/date';

interface Props {
  weekStart: string;
  onChange: (weekStart: string) => void;
}

export function WeekNavigator({ weekStart, onChange }: Props) {
  const currentWeek = startOfWeek();
  return (
    <View style={styles.wrapper}>
      <Pressable accessibilityLabel="Önceki hafta" onPress={() => onChange(addDays(weekStart, -7))} style={styles.arrow}>
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Pressable onPress={() => onChange(currentWeek)} style={styles.labelWrap}>
        <Text style={styles.label}>{formatWeekRange(weekStart)}</Text>
        <Text style={styles.hint}>{weekStart === currentWeek ? 'Bu hafta' : 'Bugüne dön'}</Text>
      </Pressable>
      <Pressable accessibilityLabel="Sonraki hafta" onPress={() => onChange(addDays(weekStart, 7))} style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrowText: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },
  labelWrap: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  label: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});

