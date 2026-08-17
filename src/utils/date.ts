const TURKISH_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const TURKISH_DAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TURKISH_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(value: string | Date, amount: number): string {
  const date = typeof value === 'string' ? parseDateKey(value) : new Date(value);
  date.setDate(date.getDate() + amount);
  return formatDateKey(date);
}

export function startOfWeek(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? parseDateKey(value) : new Date(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return formatDateKey(date);
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatDayShort(dateKey: string): string {
  return TURKISH_DAYS_SHORT[parseDateKey(dateKey).getDay()];
}

export function formatDayLong(dateKey: string): string {
  return TURKISH_DAYS_LONG[parseDateKey(dateKey).getDay()];
}

export function formatDayMonth(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]}`;
}

export function formatWeekRange(weekStart: string): string {
  const end = parseDateKey(addDays(weekStart, 6));
  const start = parseDateKey(weekStart);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${TURKISH_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${TURKISH_MONTHS[start.getMonth()]} – ${end.getDate()} ${TURKISH_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

export function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function isDateInWeek(dateKey: string, weekStart: string): boolean {
  return dateKey >= weekStart && dateKey <= addDays(weekStart, 6);
}

