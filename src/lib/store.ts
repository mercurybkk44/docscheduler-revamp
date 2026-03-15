import { Doctor, UnavailableDate, ScheduleEntry } from './types';

const DOCTORS_KEY = 'doctor-scheduler-doctors';
const UNAVAILABLE_KEY = 'doctor-scheduler-unavailable';
const SCHEDULE_KEY = 'doctor-scheduler-schedule';

export function loadDoctors(): Doctor[] {
  const data = localStorage.getItem(DOCTORS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveDoctors(doctors: Doctor[]) {
  localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
}

export function loadUnavailableDates(): UnavailableDate[] {
  const data = localStorage.getItem(UNAVAILABLE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveUnavailableDates(dates: UnavailableDate[]) {
  localStorage.setItem(UNAVAILABLE_KEY, JSON.stringify(dates));
}

export function loadSchedule(): ScheduleEntry[] {
  const data = localStorage.getItem(SCHEDULE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSchedule(entries: ScheduleEntry[]) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(entries));
}
