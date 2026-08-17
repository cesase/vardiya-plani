import { AppData, ShiftDefinition, ShiftId, WorkShiftId } from './types';

export const WORK_SHIFT_IDS: WorkShiftId[] = ['morning', 'afternoon', 'full'];
export const SHIFT_IDS: ShiftId[] = ['morning', 'afternoon', 'full', 'off'];

export const DEFAULT_SHIFTS: ShiftDefinition[] = [
  { id: 'morning', label: 'Sabah', start: '08:45', end: '17:00', breakMinutes: 60 },
  { id: 'afternoon', label: 'Öğlen', start: '14:00', end: '21:15', breakMinutes: 60 },
  { id: 'full', label: 'Full', start: '08:45', end: '21:15', breakMinutes: 90 },
];

export const DEFAULT_DATA: AppData = {
  employees: [
    { id: 'oguz', name: 'Oğuz', allowedShifts: [...WORK_SHIFT_IDS] },
    { id: 'ekrem', name: 'Ekrem', allowedShifts: [...WORK_SHIFT_IDS] },
    { id: 'faruk', name: 'Faruk', allowedShifts: [...WORK_SHIFT_IDS] },
    { id: 'deniz', name: 'Deniz', allowedShifts: [...WORK_SHIFT_IDS] },
  ],
  shifts: DEFAULT_SHIFTS,
  leaveRequests: [],
  schedules: [],
};

export const SHIFT_COLORS: Record<ShiftId, { background: string; text: string; accent: string }> = {
  morning: { background: '#FFF4D7', text: '#7A4A00', accent: '#E2A62B' },
  afternoon: { background: '#E8F1FF', text: '#23518A', accent: '#5A8FD8' },
  full: { background: '#EAE7F8', text: '#4F407D', accent: '#7662AD' },
  off: { background: '#F0F2F0', text: '#626962', accent: '#919891' },
};

export const OFF_LABEL = 'İzin';
export const TARGET_WEEKLY_MINUTES = 45 * 60;
export const TARGET_MONTHLY_MINUTES = 180 * 60;
export const MIN_OPENING_STAFF = 2;
export const MIN_CLOSING_STAFF = 2;
export const MAX_CONSECUTIVE_DAYS = 10;

