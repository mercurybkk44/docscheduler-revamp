import { Doctor, UnavailableDate, PreferredDate, Holiday, ScheduleEntry } from './types';

const KEYS = {
  doctors: 'docscheduler-doctors',
  unavailable: 'docscheduler-unavailable',
  preferred: 'docscheduler-preferred',
  holidays: 'docscheduler-holidays',
  schedules: 'docscheduler-schedules',
};

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function uuid(): string {
  return crypto.randomUUID();
}

// Doctors
export async function loadDoctors(): Promise<Doctor[]> {
  return read<Doctor>(KEYS.doctors).sort((a, b) => a.color_index - b.color_index);
}

export async function saveDoctor(doctor: Omit<Doctor, 'id'>): Promise<Doctor> {
  const doctors = read<Doctor>(KEYS.doctors);
  const newDoctor: Doctor = { ...doctor, id: uuid() };
  write(KEYS.doctors, [...doctors, newDoctor]);
  return newDoctor;
}

export async function updateDoctor(id: string, updates: Partial<Doctor>): Promise<void> {
  const doctors = read<Doctor>(KEYS.doctors);
  write(KEYS.doctors, doctors.map(d => d.id === id ? { ...d, ...updates } : d));
}

export async function deleteDoctor(id: string): Promise<void> {
  write(KEYS.doctors, read<Doctor>(KEYS.doctors).filter(d => d.id !== id));
  write(KEYS.unavailable, read<UnavailableDate>(KEYS.unavailable).filter(u => u.doctor_id !== id));
  write(KEYS.preferred, read<PreferredDate>(KEYS.preferred).filter(p => p.doctor_id !== id));
}

// Unavailable Dates
export async function loadUnavailableDates(): Promise<UnavailableDate[]> {
  return read<UnavailableDate>(KEYS.unavailable);
}

export async function setUnavailableDates(doctorId: string, dates: string[]): Promise<void> {
  const existing = read<UnavailableDate>(KEYS.unavailable).filter(u => u.doctor_id !== doctorId);
  write(KEYS.unavailable, [...existing, ...dates.map(date => ({ id: uuid(), doctor_id: doctorId, date }))]);
}

// Preferred Dates
export async function loadPreferredDates(): Promise<PreferredDate[]> {
  return read<PreferredDate>(KEYS.preferred);
}

export async function setPreferredDates(doctorId: string, dates: string[]): Promise<void> {
  const existing = read<PreferredDate>(KEYS.preferred).filter(p => p.doctor_id !== doctorId);
  write(KEYS.preferred, [...existing, ...dates.map(date => ({ id: uuid(), doctor_id: doctorId, date }))]);
}

// Holidays
export async function loadHolidays(): Promise<Holiday[]> {
  return read<Holiday>(KEYS.holidays).sort((a, b) => a.date.localeCompare(b.date));
}

export async function addHoliday(date: string): Promise<Holiday> {
  const holidays = read<Holiday>(KEYS.holidays);
  const newHoliday: Holiday = { id: uuid(), date, label: null };
  write(KEYS.holidays, [...holidays, newHoliday]);
  return newHoliday;
}

export async function deleteHoliday(id: string): Promise<void> {
  write(KEYS.holidays, read<Holiday>(KEYS.holidays).filter(h => h.id !== id));
}

// Schedule
export async function loadSchedule(): Promise<ScheduleEntry[]> {
  return read<ScheduleEntry>(KEYS.schedules);
}

export async function saveScheduleEntries(entries: ScheduleEntry[], monthPrefix: string): Promise<void> {
  const existing = read<ScheduleEntry>(KEYS.schedules).filter(s => !s.date.startsWith(monthPrefix));
  write(KEYS.schedules, [...existing, ...entries.map(e => ({ ...e, id: e.id ?? uuid() }))]);
}

export async function updateScheduleEntry(date: string, doctorId: string, type: 'weekday' | 'weekend'): Promise<void> {
  const entries = read<ScheduleEntry>(KEYS.schedules).filter(s => s.date !== date);
  write(KEYS.schedules, [...entries, { id: uuid(), date, doctor_id: doctorId, type }]);
}

export async function deleteScheduleEntry(date: string): Promise<void> {
  write(KEYS.schedules, read<ScheduleEntry>(KEYS.schedules).filter(s => s.date !== date));
}

export async function clearSchedule(): Promise<void> {
  write(KEYS.schedules, []);
}

export async function clearAllData(): Promise<void> {
  write(KEYS.schedules, []);
  write(KEYS.holidays, []);
}
