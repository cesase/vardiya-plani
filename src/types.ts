export type WorkShiftId = 'morning' | 'afternoon' | 'full';
export type ShiftId = WorkShiftId | 'off';

export interface ShiftDefinition {
  id: WorkShiftId;
  label: string;
  start: string;
  end: string;
  breakMinutes: number;
}

export interface Employee {
  id: string;
  name: string;
  allowedShifts: WorkShiftId[];
}

export type LeavePriority = 'fixed' | 'preferred';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  date: string;
  priority: LeavePriority;
}

export type DayAssignments = Record<string, ShiftId>;

export interface WeekSchedule {
  weekStart: string;
  assignments: Record<string, DayAssignments>;
  generatedAt: string;
  edited: boolean;
}

export interface AppData {
  employees: Employee[];
  shifts: ShiftDefinition[];
  leaveRequests: LeaveRequest[];
  schedules: WeekSchedule[];
}

export type IssueSeverity = 'warning' | 'critical';

export interface ScheduleIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
  date?: string;
  employeeId?: string;
}

export interface GenerationResult {
  schedule?: WeekSchedule;
  errors: string[];
}

