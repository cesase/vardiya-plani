import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_DATA } from '../constants';
import { AppData } from '../types';

const STORAGE_KEY = '@vardiya-plani/data-v1';

function freshDefaults(): AppData {
  return JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData;
}

export async function loadAppData(): Promise<AppData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return freshDefaults();
    const parsed = JSON.parse(stored) as Partial<AppData>;
    if (!Array.isArray(parsed.employees) || !Array.isArray(parsed.shifts)) return freshDefaults();
    return {
      employees: parsed.employees,
      shifts: parsed.shifts,
      leaveRequests: Array.isArray(parsed.leaveRequests) ? parsed.leaveRequests : [],
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
    };
  } catch {
    return freshDefaults();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearAppData(): Promise<AppData> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return freshDefaults();
}

