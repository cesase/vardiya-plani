import { ShiftDefinition, ShiftId } from '../types';

export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getShiftMinutes(shift: ShiftDefinition): number {
  const start = parseClock(shift.start);
  const end = parseClock(shift.end);
  if (start === null || end === null) return 0;
  const gross = end >= start ? end - start : 24 * 60 - start + end;
  return Math.max(0, gross - shift.breakMinutes);
}

export function getAssignmentMinutes(shiftId: ShiftId | undefined, shifts: ShiftDefinition[]): number {
  if (!shiftId || shiftId === 'off') return 0;
  const definition = shifts.find((shift) => shift.id === shiftId);
  return definition ? getShiftMinutes(definition) : 0;
}

export function formatMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return minutes === 0 ? `${hours} sa` : `${hours} sa ${minutes} dk`;
}

export function isValidShiftDefinition(shift: ShiftDefinition): boolean {
  return parseClock(shift.start) !== null && parseClock(shift.end) !== null && shift.breakMinutes >= 0 && getShiftMinutes(shift) > 0;
}

