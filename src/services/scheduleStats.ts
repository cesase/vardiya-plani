import { Employee, ShiftDefinition, ShiftId, WeekSchedule, WorkShiftId } from '../types';
import { monthKey } from '../utils/date';
import { getAssignmentMinutes } from '../utils/time';

export interface EmployeeWeekStats {
  employeeId: string;
  totalMinutes: number;
  counts: Record<ShiftId, number>;
}

export function getEmployeeWeekStats(
  schedule: WeekSchedule | undefined,
  employee: Employee,
  shifts: ShiftDefinition[],
): EmployeeWeekStats {
  const counts: Record<ShiftId, number> = { morning: 0, afternoon: 0, full: 0, off: 0 };
  let totalMinutes = 0;

  if (schedule) {
    Object.values(schedule.assignments).forEach((day) => {
      const shiftId = day[employee.id];
      if (!shiftId) return;
      counts[shiftId] += 1;
      totalMinutes += getAssignmentMinutes(shiftId, shifts);
    });
  }

  return { employeeId: employee.id, totalMinutes, counts };
}

export function getAllWeekStats(
  schedule: WeekSchedule | undefined,
  employees: Employee[],
  shifts: ShiftDefinition[],
): EmployeeWeekStats[] {
  return employees.map((employee) => getEmployeeWeekStats(schedule, employee, shifts));
}

export function getMonthMinutes(
  employeeId: string,
  targetMonth: string,
  schedules: WeekSchedule[],
  shifts: ShiftDefinition[],
): number {
  let total = 0;
  schedules.forEach((schedule) => {
    Object.entries(schedule.assignments).forEach(([date, day]) => {
      if (monthKey(date) === targetMonth) {
        total += getAssignmentMinutes(day[employeeId], shifts);
      }
    });
  });
  return total;
}

export function getHistoricalShiftCounts(
  employeeId: string,
  schedules: WeekSchedule[],
  beforeWeek: string,
  limit = 4,
): Record<WorkShiftId, number> {
  const counts: Record<WorkShiftId, number> = { morning: 0, afternoon: 0, full: 0 };
  schedules
    .filter((schedule) => schedule.weekStart < beforeWeek)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, limit)
    .forEach((schedule) => {
      Object.values(schedule.assignments).forEach((day) => {
        const shiftId = day[employeeId];
        if (shiftId && shiftId !== 'off') counts[shiftId] += 1;
      });
    });
  return counts;
}

