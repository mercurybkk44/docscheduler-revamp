export interface Doctor {
  id: string;
  name: string;
  weekdayQuota: number;
  weekendQuota: number;
  colorIndex: number;
}

export interface UnavailableDate {
  doctorId: string;
  date: string; // YYYY-MM-DD
}

export interface ScheduleEntry {
  date: string; // YYYY-MM-DD
  doctorId: string;
}

export const DOCTOR_COLORS = [
  'hsl(199, 89%, 38%)',
  'hsl(165, 60%, 40%)',
  'hsl(280, 60%, 50%)',
  'hsl(35, 85%, 50%)',
  'hsl(350, 70%, 50%)',
  'hsl(210, 60%, 55%)',
  'hsl(140, 50%, 40%)',
];

export const DOCTOR_BG_COLORS = [
  'hsl(199, 89%, 93%)',
  'hsl(165, 60%, 92%)',
  'hsl(280, 60%, 93%)',
  'hsl(35, 85%, 92%)',
  'hsl(350, 70%, 93%)',
  'hsl(210, 60%, 93%)',
  'hsl(140, 50%, 92%)',
];
