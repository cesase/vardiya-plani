import {
  MAX_CONSECUTIVE_DAYS,
  MIN_CLOSING_STAFF,
  MIN_OPENING_STAFF,
} from '../constants';
import {
  Employee,
  LeaveRequest,
  ScheduleIssue,
  ShiftDefinition,
  WeekSchedule,
} from '../types';
import { addDays, formatDayLong, getWeekDates, isDateInWeek } from '../utils/date';
import { formatMinutes } from '../utils/time';
import { getAllWeekStats } from './scheduleStats';

interface ValidateInput {
  schedule: WeekSchedule;
  employees: Employee[];
  shifts: ShiftDefinition[];
  leaveRequests: LeaveRequest[];
  schedules: WeekSchedule[];
}

function assignmentAt(
  date: string,
  employeeId: string,
  current: WeekSchedule,
  schedules: WeekSchedule[],
) {
  if (date >= current.weekStart && date <= addDays(current.weekStart, 6)) {
    return current.assignments[date]?.[employeeId];
  }
  const schedule = schedules.find(
    (item) => item.weekStart !== current.weekStart && date >= item.weekStart && date <= addDays(item.weekStart, 6),
  );
  return schedule?.assignments[date]?.[employeeId];
}

export function validateSchedule(input: ValidateInput): ScheduleIssue[] {
  const { schedule, employees, shifts, leaveRequests, schedules } = input;
  const issues: ScheduleIssue[] = [];
  const dates = getWeekDates(schedule.weekStart);

  dates.forEach((date) => {
    const day = schedule.assignments[date] ?? {};
    const opening = employees.filter((employee) => {
      const shift = day[employee.id];
      return shift === 'morning' || shift === 'full';
    }).length;
    const closing = employees.filter((employee) => {
      const shift = day[employee.id];
      return shift === 'afternoon' || shift === 'full';
    }).length;
    const offCount = employees.filter((employee) => day[employee.id] === 'off').length;

    if (opening < MIN_OPENING_STAFF) {
      issues.push({
        id: `opening-${date}`,
        severity: 'critical',
        date,
        message: `${formatDayLong(date)} açılışında yalnızca ${opening} kişi var.`,
      });
    }
    if (closing < MIN_CLOSING_STAFF) {
      issues.push({
        id: `closing-${date}`,
        severity: 'critical',
        date,
        message: `${formatDayLong(date)} kapanışında yalnızca ${closing} kişi var.`,
      });
    }
    if (offCount > 1 && employees.length <= 7) {
      issues.push({
        id: `double-off-${date}`,
        severity: 'warning',
        date,
        message: `${formatDayLong(date)} günü ${offCount} kişi izinli.`,
      });
    }
  });

  employees.forEach((employee) => {
    const stats = getAllWeekStats(schedule, [employee], shifts)[0];
    if (stats.counts.off !== 1) {
      issues.push({
        id: `off-count-${employee.id}`,
        severity: 'warning',
        employeeId: employee.id,
        message: `${employee.name} için haftada ${stats.counts.off} izin günü bulunuyor.`,
      });
    }
    if (stats.totalMinutes < 44 * 60 || stats.totalMinutes > 46 * 60) {
      issues.push({
        id: `hours-${employee.id}`,
        severity: 'warning',
        employeeId: employee.id,
        message: `${employee.name} haftalık ${formatMinutes(stats.totalMinutes)} çalışıyor.`,
      });
    }

    dates.forEach((date) => {
      const shiftId = schedule.assignments[date]?.[employee.id];
      if (shiftId && shiftId !== 'off' && !employee.allowedShifts.includes(shiftId)) {
        issues.push({
          id: `restriction-${employee.id}-${date}`,
          severity: 'critical',
          employeeId: employee.id,
          date,
          message: `${employee.name}, ${formatDayLong(date)} günü izin verilmeyen bir vardiyada.`,
        });
      }
    });

    let consecutiveWork = 0;
    let consecutiveFull = 0;
    for (let offset = -10; offset < 7; offset += 1) {
      const date = addDays(schedule.weekStart, offset);
      const shiftId = assignmentAt(date, employee.id, schedule, schedules);
      if (!shiftId) {
        consecutiveWork = 0;
        consecutiveFull = 0;
        continue;
      }
      if (shiftId === 'off') {
        consecutiveWork = 0;
        consecutiveFull = 0;
        continue;
      }
      consecutiveWork += 1;
      consecutiveFull = shiftId === 'full' ? consecutiveFull + 1 : 0;
      if (offset >= 0 && consecutiveWork === MAX_CONSECUTIVE_DAYS + 1) {
        issues.push({
          id: `consecutive-${employee.id}-${date}`,
          severity: 'warning',
          employeeId: employee.id,
          date,
          message: `${employee.name} 10 günden uzun aralıksız çalışıyor.`,
        });
      }
      if (offset >= 0 && consecutiveFull === 2) {
        issues.push({
          id: `full-${employee.id}-${date}`,
          severity: 'warning',
          employeeId: employee.id,
          date,
          message: `${employee.name} art arda iki gün Full çalışıyor.`,
        });
      }
    }
  });

  leaveRequests
    .filter((request) => request.priority === 'fixed' && isDateInWeek(request.date, schedule.weekStart))
    .forEach((request) => {
      if (schedule.assignments[request.date]?.[request.employeeId] !== 'off') {
        const employee = employees.find((item) => item.id === request.employeeId);
        issues.push({
          id: `fixed-leave-${request.id}`,
          severity: 'critical',
          employeeId: request.employeeId,
          date: request.date,
          message: `${employee?.name ?? 'Personel'} için kesin izin talebi karşılanmıyor.`,
        });
      }
    });

  return issues;
}

