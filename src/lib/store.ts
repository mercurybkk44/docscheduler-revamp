import { supabase } from '@/integrations/supabase/client';
import { Doctor, UnavailableDate, PreferredDate, Holiday, ScheduleEntry } from './types';

// Doctors
export async function loadDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase.from('doctors').select('*').order('color_index');
  if (error) throw error;
  return (data || []).map(d => ({
    id: d.id,
    name: d.name,
    weekday_quota: d.weekday_quota,
    weekend_quota: d.weekend_quota,
    color_index: d.color_index,
  }));
}

export async function saveDoctor(doctor: Omit<Doctor, 'id'>): Promise<Doctor> {
  const { data, error } = await supabase.from('doctors').insert({
    name: doctor.name,
    weekday_quota: doctor.weekday_quota,
    weekend_quota: doctor.weekend_quota,
    color_index: doctor.color_index,
  }).select().single();
  if (error) throw error;
  return data as Doctor;
}

export async function updateDoctor(id: string, updates: Partial<Doctor>): Promise<void> {
  const { error } = await supabase.from('doctors').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteDoctor(id: string): Promise<void> {
  const { error } = await supabase.from('doctors').delete().eq('id', id);
  if (error) throw error;
}

// Unavailable Dates
export async function loadUnavailableDates(): Promise<UnavailableDate[]> {
  const { data, error } = await supabase.from('unavailable_dates').select('*');
  if (error) throw error;
  return (data || []) as UnavailableDate[];
}

export async function setUnavailableDates(doctorId: string, dates: string[]): Promise<void> {
  // Delete existing for this doctor
  await supabase.from('unavailable_dates').delete().eq('doctor_id', doctorId);
  if (dates.length > 0) {
    const { error } = await supabase.from('unavailable_dates').insert(
      dates.map(date => ({ doctor_id: doctorId, date }))
    );
    if (error) throw error;
  }
}

// Preferred Dates
export async function loadPreferredDates(): Promise<PreferredDate[]> {
  const { data, error } = await supabase.from('preferred_dates').select('*');
  if (error) throw error;
  return (data || []) as PreferredDate[];
}

export async function setPreferredDates(doctorId: string, dates: string[]): Promise<void> {
  await supabase.from('preferred_dates').delete().eq('doctor_id', doctorId);
  if (dates.length > 0) {
    const { error } = await supabase.from('preferred_dates').insert(
      dates.map(date => ({ doctor_id: doctorId, date }))
    );
    if (error) throw error;
  }
}

// Holidays
export async function loadHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase.from('holidays').select('*').order('date');
  if (error) throw error;
  return (data || []) as Holiday[];
}

export async function addHoliday(date: string): Promise<Holiday> {
  const { data, error } = await supabase.from('holidays').insert({ date }).select().single();
  if (error) throw error;
  return data as Holiday;
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase.from('holidays').delete().eq('id', id);
  if (error) throw error;
}

// Schedule
export async function loadSchedule(): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase.from('schedules').select('*');
  if (error) throw error;
  return (data || []).map(s => ({
    id: s.id,
    date: s.date,
    doctor_id: s.doctor_id,
    type: s.type as 'weekday' | 'weekend',
  }));
}

export async function saveScheduleEntries(entries: ScheduleEntry[], monthPrefix: string): Promise<void> {
  // Delete existing entries for this month
  await supabase.from('schedules').delete().like('date', `${monthPrefix}%`);
  if (entries.length > 0) {
    const { error } = await supabase.from('schedules').insert(
      entries.map(e => ({ date: e.date, doctor_id: e.doctor_id, type: e.type }))
    );
    if (error) throw error;
  }
}

export async function updateScheduleEntry(date: string, doctorId: string, type: 'weekday' | 'weekend'): Promise<void> {
  // Upsert by deleting existing and inserting new
  await supabase.from('schedules').delete().eq('date', date);
  const { error } = await supabase.from('schedules').insert({ date, doctor_id: doctorId, type });
  if (error) throw error;
}

export async function deleteScheduleEntry(date: string): Promise<void> {
  const { error } = await supabase.from('schedules').delete().eq('date', date);
  if (error) throw error;
}

export async function clearSchedule(): Promise<void> {
  const { error } = await supabase.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export async function clearAllData(): Promise<void> {
  const results = await Promise.all([
    supabase.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ]);
  for (const { error } of results) {
    if (error) throw error;
  }
}
