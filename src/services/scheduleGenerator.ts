import {
  MAX_CONSECUTIVE_DAYS,
  MIN_CLOSING_STAFF,
  MIN_OPENING_STAFF,
  TARGET_MONTHLY_MINUTES,
  TARGET_WEEKLY_MINUTES,
  WORK_SHIFT_IDS,
} from '../constants';
import {
  DayAssignments,
  Employee,
  GenerationResult,
  LeaveRequest,
  ShiftDefinition,
  WeekSchedule,
  WorkShiftId,
} from '../types';
import { addDays, getWeekDates, isDateInWeek, monthKey } from '../utils/date';
import { getShiftMinutes } from '../utils/time';
import { getHistoricalShiftCounts, getMonthMinutes } from './scheduleStats';

interface GenerateInput {
  weekStart: string;
  employees: Employee[];
  shifts: ShiftDefinition[];
  leaveRequests: LeaveRequest[];
  schedules: WeekSchedule[];
}

interface OffPlan {
  days: Record<string, number>;
  score: number;
}

interface DayCandidate {
  assignments: Record<string, WorkShiftId>;
  score: number;
}

interface BeamState {
  assignments: Record<string, DayAssignments>;
  totals: Record<string, number>;
  counts: Record<string, Record<WorkShiftId, number>>;
  lastShift: Record<string, WorkShiftId | 'off' | undefined>;
  score: number;
}

const MAX_OFF_PLANS = 24;
const MAX_DAY_CANDIDATES = 120;
const BEAM_WIDTH = 180;

function findAssignment(date: string, employeeId: string, schedules: WeekSchedule[]) {
  const schedule = schedules.find(
    (item) => date >= item.weekStart && date <= addDays(item.weekStart, 6),
  );
  return schedule?.assignments[date]?.[employeeId];
}

function trailingWorkDays(employeeId: string, weekStart: string, schedules: WeekSchedule[]): number {
  let count = 0;
  for (let offset = 1; offset <= MAX_CONSECUTIVE_DAYS + 7; offset += 1) {
    const assignment = findAssignment(addDays(weekStart, -offset), employeeId, schedules);
    if (!assignment || assignment === 'off') break;
    count += 1;
  }
  return count;
}

function buildOffPlans(
  weekStart: string,
  employees: Employee[],
  requests: LeaveRequest[],
  schedules: WeekSchedule[],
): { plans: OffPlan[]; errors: string[] } {
  const weekRequests = requests.filter((request) => isDateInWeek(request.date, weekStart));
  const fixedByEmployee = new Map<string, number[]>();
  const preferredByEmployee = new Map<string, number[]>();

  weekRequests.forEach((request) => {
    const dayIndex = Math.round(
      (new Date(`${request.date}T12:00:00`).getTime() - new Date(`${weekStart}T12:00:00`).getTime()) /
        86_400_000,
    );
    const map = request.priority === 'fixed' ? fixedByEmployee : preferredByEmployee;
    map.set(request.employeeId, [...(map.get(request.employeeId) ?? []), dayIndex]);
  });

  const errors: string[] = [];
  employees.forEach((employee) => {
    const fixedDays = [...new Set(fixedByEmployee.get(employee.id) ?? [])];
    if (fixedDays.length > 1) {
      errors.push(`${employee.name} için aynı hafta içinde birden fazla kesin izin bulunuyor.`);
    }
  });
  if (errors.length > 0) return { plans: [], errors };

  const normalCapacity = Math.max(1, Math.ceil(employees.length / 7));
  const forcedCounts = Array.from({ length: 7 }, () => 0);
  employees.forEach((employee) => {
    const fixedDay = fixedByEmployee.get(employee.id)?.[0];
    if (fixedDay !== undefined) forcedCounts[fixedDay] += 1;
  });
  const capacities = forcedCounts.map((forced) => Math.max(normalCapacity, forced));

  const ordered = [...employees].sort((a, b) => {
    const aFixed = fixedByEmployee.has(a.id) ? 1 : 0;
    const bFixed = fixedByEmployee.has(b.id) ? 1 : 0;
    return bFixed - aFixed;
  });
  const dayCounts = Array.from({ length: 7 }, () => 0);
  const chosen: Record<string, number> = {};
  const plans: OffPlan[] = [];

  function visit(index: number, score: number) {
    if (plans.length > 8_000) return;
    if (index === ordered.length) {
      plans.push({ days: { ...chosen }, score });
      return;
    }

    const employee = ordered[index];
    const fixedDay = fixedByEmployee.get(employee.id)?.[0];
    const preferredDays = preferredByEmployee.get(employee.id) ?? [];
    const options = fixedDay === undefined ? [0, 1, 2, 3, 4, 5, 6] : [fixedDay];
    const previousRun = trailingWorkDays(employee.id, weekStart, schedules);

    options.forEach((dayIndex) => {
      if (dayCounts[dayIndex] >= capacities[dayIndex]) return;
      dayCounts[dayIndex] += 1;
      chosen[employee.id] = dayIndex;

      let nextScore = score;
      if (preferredDays.length > 0 && !preferredDays.includes(dayIndex)) nextScore += 28;
      const consecutiveBeforeOff = previousRun + dayIndex;
      if (consecutiveBeforeOff > MAX_CONSECUTIVE_DAYS) {
        nextScore += (consecutiveBeforeOff - MAX_CONSECUTIVE_DAYS) * 70;
      }

      const previousSchedules = schedules
        .filter((schedule) => schedule.weekStart < weekStart)
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      const recentOffDate = previousSchedules
        .flatMap((schedule) => Object.entries(schedule.assignments))
        .find(([, day]) => day[employee.id] === 'off')?.[0];
      if (recentOffDate) {
        const recentWeekday = Math.round(
          (new Date(`${recentOffDate}T12:00:00`).getDay() + 6) % 7,
        );
        if (recentWeekday === dayIndex) nextScore += 2;
      }

      visit(index + 1, nextScore);
      dayCounts[dayIndex] -= 1;
      delete chosen[employee.id];
    });
  }

  visit(0, 0);
  plans.sort((a, b) => a.score - b.score);
  return { plans: plans.slice(0, MAX_OFF_PLANS), errors: [] };
}

function buildDayCandidates(workers: Employee[]): DayCandidate[] {
  if (workers.length < 2) return [];
  const candidates: DayCandidate[] = [];
  const current: Record<string, WorkShiftId> = {};
  let visited = 0;

  function visit(index: number, opening: number, closing: number, fullCount: number) {
    if (visited > 30_000 || candidates.length > 2_000) return;
    visited += 1;
    const remaining = workers.length - index;
    if (opening + remaining < MIN_OPENING_STAFF || closing + remaining < MIN_CLOSING_STAFF) return;

    if (index === workers.length) {
      if (opening < MIN_OPENING_STAFF || closing < MIN_CLOSING_STAFF) return;
      const minimumFull = Math.max(0, MIN_OPENING_STAFF + MIN_CLOSING_STAFF - workers.length);
      const morningCount = Object.values(current).filter((shift) => shift === 'morning').length;
      const afternoonCount = Object.values(current).filter((shift) => shift === 'afternoon').length;
      candidates.push({
        assignments: { ...current },
        score: Math.max(0, fullCount - minimumFull) * 14 + Math.abs(morningCount - afternoonCount),
      });
      return;
    }

    const employee = workers[index];
    const options = WORK_SHIFT_IDS.filter((shiftId) => employee.allowedShifts.includes(shiftId));
    options.forEach((shiftId) => {
      current[employee.id] = shiftId;
      visit(
        index + 1,
        opening + (shiftId === 'morning' || shiftId === 'full' ? 1 : 0),
        closing + (shiftId === 'afternoon' || shiftId === 'full' ? 1 : 0),
        fullCount + (shiftId === 'full' ? 1 : 0),
      );
      delete current[employee.id];
    });
  }

  visit(0, 0, 0, 0);
  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, MAX_DAY_CANDIDATES);
}

function createEmptyState(employees: Employee[]): BeamState {
  const totals: Record<string, number> = {};
  const counts: Record<string, Record<WorkShiftId, number>> = {};
  employees.forEach((employee) => {
    totals[employee.id] = 0;
    counts[employee.id] = { morning: 0, afternoon: 0, full: 0 };
  });
  return { assignments: {}, totals, counts, lastShift: {}, score: 0 };
}

function buildScheduleForOffPlan(
  weekStart: string,
  employees: Employee[],
  shifts: ShiftDefinition[],
  schedules: WeekSchedule[],
  offPlan: OffPlan,
): BeamState | undefined {
  const dates = getWeekDates(weekStart);
  const shiftMinutes = Object.fromEntries(shifts.map((shift) => [shift.id, getShiftMinutes(shift)])) as Record<
    WorkShiftId,
    number
  >;
  let beam: BeamState[] = [createEmptyState(employees)];

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex += 1) {
    const date = dates[dayIndex];
    const offEmployees = employees.filter((employee) => offPlan.days[employee.id] === dayIndex);
    const workers = employees.filter((employee) => offPlan.days[employee.id] !== dayIndex);
    const candidates = buildDayCandidates(workers);
    if (candidates.length === 0) return undefined;
    const next: BeamState[] = [];

    beam.forEach((state) => {
      candidates.forEach((candidate) => {
        const totals = { ...state.totals };
        const counts: BeamState['counts'] = {};
        employees.forEach((employee) => {
          counts[employee.id] = { ...state.counts[employee.id] };
        });
        const lastShift = { ...state.lastShift };
        const dayAssignments: DayAssignments = {};
        let score = state.score + candidate.score;

        offEmployees.forEach((employee) => {
          dayAssignments[employee.id] = 'off';
          lastShift[employee.id] = 'off';
        });

        workers.forEach((employee) => {
          const shiftId = candidate.assignments[employee.id];
          dayAssignments[employee.id] = shiftId;
          totals[employee.id] += shiftMinutes[shiftId];
          counts[employee.id][shiftId] += 1;

          if (shiftId === 'full' && state.lastShift[employee.id] === 'full') score += 24;
          if (offPlan.days[employee.id] === dayIndex + 1 && shiftId !== 'morning') score += 10;
          if (offPlan.days[employee.id] === dayIndex - 1 && shiftId !== 'afternoon') score += 10;
          lastShift[employee.id] = shiftId;
        });

        const expectedProgress = (TARGET_WEEKLY_MINUTES * (dayIndex + 1)) / 7;
        employees.forEach((employee) => {
          const difference = totals[employee.id] - expectedProgress;
          score += (difference * difference) / 180_000;
          score += Math.abs(counts[employee.id].morning - counts[employee.id].afternoon) * 0.25;
        });

        next.push({
          assignments: { ...state.assignments, [date]: dayAssignments },
          totals,
          counts,
          lastShift,
          score,
        });
      });
    });

    next.sort((a, b) => a.score - b.score);
    beam = next.slice(0, BEAM_WIDTH);
    if (beam.length === 0) return undefined;
  }

  const historyCounts = Object.fromEntries(
    employees.map((employee) => [
      employee.id,
      getHistoricalShiftCounts(employee.id, schedules, weekStart),
    ]),
  ) as Record<string, Record<WorkShiftId, number>>;

  beam.forEach((state) => {
    employees.forEach((employee) => {
      const totalDifference = (state.totals[employee.id] - TARGET_WEEKLY_MINUTES) / 15;
      state.score += totalDifference * totalDifference * 2;
      state.score += Math.abs(state.counts[employee.id].morning - state.counts[employee.id].afternoon) * 3;
      state.score += Math.pow(state.counts[employee.id].full - 1, 2) * 10;
    });

    WORK_SHIFT_IDS.forEach((shiftId) => {
      const combined = employees.map(
        (employee) => historyCounts[employee.id][shiftId] + state.counts[employee.id][shiftId],
      );
      const spread = Math.max(...combined) - Math.min(...combined);
      state.score += spread * spread * 2;
    });

    const monthsInWeek = [...new Set(Object.keys(state.assignments).map(monthKey))];
    employees.forEach((employee) => {
      monthsInWeek.forEach((targetMonth) => {
        const prior = getMonthMinutes(employee.id, targetMonth, schedules, shifts);
        let planned = 0;
        Object.entries(state.assignments).forEach(([date, day]) => {
          if (monthKey(date) === targetMonth) {
            const shiftId = day[employee.id];
            if (shiftId !== 'off') planned += shiftMinutes[shiftId];
          }
        });
        const overTarget = Math.max(0, prior + planned - TARGET_MONTHLY_MINUTES) / 15;
        state.score += overTarget * overTarget * 3;
      });
    });

    state.score += offPlan.score;
  });

  beam.sort((a, b) => a.score - b.score);
  return beam[0];
}

export function generateSchedule(input: GenerateInput): GenerationResult {
  const { weekStart, employees, shifts, leaveRequests } = input;
  const schedules = input.schedules.filter((schedule) => schedule.weekStart !== weekStart);
  if (employees.length < 3) {
    return { errors: ['Haftalık izin ve iki kişilik açılış/kapanış için en az 3 personel gerekiyor.'] };
  }
  const missingShift = WORK_SHIFT_IDS.find((shiftId) => !shifts.some((shift) => shift.id === shiftId));
  if (missingShift) return { errors: ['Vardiya tanımlarından biri eksik. Ayarlardaki vardiyaları kontrol edin.'] };
  const unavailable = employees.find((employee) => employee.allowedShifts.length === 0);
  if (unavailable) return { errors: [`${unavailable.name} için çalışabileceği en az bir vardiya seçilmeli.`] };

  const { plans, errors } = buildOffPlans(weekStart, employees, leaveRequests, schedules);
  if (errors.length > 0) return { errors };
  if (plans.length === 0) {
    return { errors: ['İzin kurallarıyla uygun bir haftalık dağılım bulunamadı.'] };
  }

  let best: BeamState | undefined;
  plans.forEach((plan) => {
    const candidate = buildScheduleForOffPlan(weekStart, employees, shifts, schedules, plan);
    if (candidate && (!best || candidate.score < best.score)) best = candidate;
  });

  if (!best) {
    return {
      errors: [
        'Açılış ve kapanışta iki kişi bulunduran bir plan oluşturulamadı.',
        'Kesin izinleri ve personellerin çalışabildiği vardiyaları kontrol edin.',
      ],
    };
  }

  return {
    schedule: {
      weekStart,
      assignments: best.assignments,
      generatedAt: new Date().toISOString(),
      edited: false,
    },
    errors: [],
  };
}

