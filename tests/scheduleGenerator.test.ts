import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA, DEFAULT_SHIFTS } from '../src/constants';
import { generateSchedule } from '../src/services/scheduleGenerator';
import { getAllWeekStats } from '../src/services/scheduleStats';
import { validateSchedule } from '../src/services/scheduleValidation';
import { Employee, LeaveRequest, ShiftId } from '../src/types';
import { getWeekDates } from '../src/utils/date';

const WEEK_START = '2026-09-07';

describe('haftalık vardiya oluşturucu', () => {
  it('dört personel için dengeli ve geçerli bir hafta üretir', () => {
    const result = generateSchedule({
      weekStart: WEEK_START,
      employees: DEFAULT_DATA.employees,
      shifts: DEFAULT_SHIFTS,
      leaveRequests: [],
      schedules: [],
    });

    expect(result.errors).toEqual([]);
    expect(result.schedule).toBeDefined();
    const schedule = result.schedule!;
    const stats = getAllWeekStats(schedule, DEFAULT_DATA.employees, DEFAULT_SHIFTS);
    expect(stats.every((item) => item.counts.off === 1)).toBe(true);
    expect(stats.every((item) => item.totalMinutes >= 44 * 60 && item.totalMinutes <= 46 * 60)).toBe(true);
    expect(stats.reduce((sum, item) => sum + item.totalMinutes, 0)).toBe(179 * 60);

    const issues = validateSchedule({
      schedule,
      employees: DEFAULT_DATA.employees,
      shifts: DEFAULT_SHIFTS,
      leaveRequests: [],
      schedules: [],
    });
    expect(issues.filter((issue) => issue.severity === 'critical')).toEqual([]);
  });

  it('kesin izin talebini uygular', () => {
    const request: LeaveRequest = {
      id: 'request-1',
      employeeId: 'ekrem',
      date: '2026-09-12',
      priority: 'fixed',
    };
    const result = generateSchedule({
      weekStart: WEEK_START,
      employees: DEFAULT_DATA.employees,
      shifts: DEFAULT_SHIFTS,
      leaveRequests: [request],
      schedules: [],
    });

    expect(result.schedule?.assignments['2026-09-12'].ekrem).toBe('off');
  });

  it('personelin çalışamayacağı vardiyayı ona vermez', () => {
    const employees: Employee[] = DEFAULT_DATA.employees.map((employee) =>
      employee.id === 'deniz'
        ? { ...employee, allowedShifts: ['morning', 'afternoon'] }
        : employee,
    );
    const result = generateSchedule({
      weekStart: WEEK_START,
      employees,
      shifts: DEFAULT_SHIFTS,
      leaveRequests: [],
      schedules: [],
    });

    expect(result.schedule).toBeDefined();
    getWeekDates(WEEK_START).forEach((date) => {
      expect(result.schedule?.assignments[date].deniz).not.toBe('full');
    });
  });

  it('aynı personelin iki kesin izninde sessizce yanlış plan üretmez', () => {
    const requests: LeaveRequest[] = [
      { id: 'r1', employeeId: 'faruk', date: '2026-09-08', priority: 'fixed' },
      { id: 'r2', employeeId: 'faruk', date: '2026-09-10', priority: 'fixed' },
    ];
    const result = generateSchedule({
      weekStart: WEEK_START,
      employees: DEFAULT_DATA.employees,
      shifts: DEFAULT_SHIFTS,
      leaveRequests: requests,
      schedules: [],
    });

    expect(result.schedule).toBeUndefined();
    expect(result.errors.join(' ')).toContain('birden fazla kesin izin');
  });

  it('elle yapılan eksik açılışı kritik sorun olarak gösterir', () => {
    const generated = generateSchedule({
      weekStart: WEEK_START,
      employees: DEFAULT_DATA.employees,
      shifts: DEFAULT_SHIFTS,
      leaveRequests: [],
      schedules: [],
    }).schedule!;
    const date = WEEK_START;
    const changed = {
      ...generated,
      assignments: {
        ...generated.assignments,
        [date]: Object.fromEntries(
          Object.keys(generated.assignments[date]).map((employeeId) => [employeeId, 'afternoon']),
        ) as Record<string, ShiftId>,
      },
    };
    const issues = validateSchedule({
      schedule: changed,
      employees: DEFAULT_DATA.employees,
      shifts: DEFAULT_SHIFTS,
      leaveRequests: [],
      schedules: [],
    });

    expect(issues.some((issue) => issue.id === `opening-${date}` && issue.severity === 'critical')).toBe(true);
  });
});
