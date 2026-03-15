import { Doctor, ScheduleEntry } from './types';

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const daysCount = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysCount; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(date);
  }
  return days;
}

export function generateSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  unavailableDates: UnavailableDate[],
  preferredDates: PreferredDate[],
  holidayDates: Set<string>
): ScheduleEntry[] {
  if (doctors.length === 0) return [];

  const days = getDaysInMonth(year, month);
  const unavailableMap = new Map<string, Set<string>>();
  const preferredMap = new Map<string, Set<string>>();

  for (const ud of unavailableDates) {
    if (!unavailableMap.has(ud.date)) unavailableMap.set(ud.date, new Set());
    unavailableMap.get(ud.date)!.add(ud.doctor_id);
  }

  for (const pd of preferredDates) {
    if (!preferredMap.has(pd.date)) preferredMap.set(pd.date, new Set());
    preferredMap.get(pd.date)!.add(pd.doctor_id);
  }

  const schedule: ScheduleEntry[] = [];
  const weekdayCounts = new Map<string, number>();
  const weekendCounts = new Map<string, number>();

  for (const doc of doctors) {
    weekdayCounts.set(doc.id, 0);
    weekendCounts.set(doc.id, 0);
  }

  let lastAssigned: string | null = null;

  for (const day of days) {
    // Skip holidays
    if (holidayDates.has(day)) {
      lastAssigned = null;
      continue;
    }

    const weekend = isWeekend(day);
    const unavailable = unavailableMap.get(day) || new Set();
    const preferred = preferredMap.get(day) || new Set();

    // Get eligible doctors
    const eligible = doctors.filter(doc => {
      if (unavailable.has(doc.id)) return false;
      if (doc.id === lastAssigned) return false;
      const count = weekend ? weekendCounts.get(doc.id)! : weekdayCounts.get(doc.id)!;
      const quota = weekend ? doc.weekend_quota : doc.weekday_quota;
      if (count >= quota) return false;
      return true;
    });

    if (eligible.length === 0) {
      // Fallback: relax consecutive constraint
      const fallback = doctors.filter(doc => {
        if (unavailable.has(doc.id)) return false;
        const count = weekend ? weekendCounts.get(doc.id)! : weekdayCounts.get(doc.id)!;
        const quota = weekend ? doc.weekend_quota : doc.weekday_quota;
        return count < quota;
      });

      if (fallback.length === 0) {
        lastAssigned = null;
        continue;
      }

      fallback.sort((a, b) => {
        const totalA = weekdayCounts.get(a.id)! + weekendCounts.get(a.id)!;
        const totalB = weekdayCounts.get(b.id)! + weekendCounts.get(b.id)!;
        return totalA - totalB;
      });

      const chosen = fallback[0];
      schedule.push({ date: day, doctor_id: chosen.id, type: weekend ? 'weekend' : 'weekday' });
      if (weekend) weekendCounts.set(chosen.id, weekendCounts.get(chosen.id)! + 1);
      else weekdayCounts.set(chosen.id, weekdayCounts.get(chosen.id)! + 1);
      lastAssigned = chosen.id;
      continue;
    }

    // Priority: preferred doctors first, then by fewest total shifts
    eligible.sort((a, b) => {
      const aPref = preferred.has(a.id) ? 0 : 1;
      const bPref = preferred.has(b.id) ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
      const totalA = weekdayCounts.get(a.id)! + weekendCounts.get(a.id)!;
      const totalB = weekdayCounts.get(b.id)! + weekendCounts.get(b.id)!;
      return totalA - totalB;
    });

    const chosen = eligible[0];
    schedule.push({ date: day, doctor_id: chosen.id, type: weekend ? 'weekend' : 'weekday' });
    if (weekend) weekendCounts.set(chosen.id, weekendCounts.get(chosen.id)! + 1);
    else weekdayCounts.set(chosen.id, weekdayCounts.get(chosen.id)! + 1);
    lastAssigned = chosen.id;
  }

  return schedule;
}
