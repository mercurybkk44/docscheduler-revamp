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
  unavailableDates: { doctor_id: string; date: string }[],
  preferredDates: { doctor_id: string; date: string }[],
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

  // Helper: check if doctor still has quota
  const hasQuota = (doc: Doctor, weekend: boolean) => {
    const count = weekend ? weekendCounts.get(doc.id)! : weekdayCounts.get(doc.id)!;
    const quota = weekend ? doc.weekend_quota : doc.weekday_quota;
    return count < quota;
  };

  const assignDoctor = (doc: Doctor, day: string, weekend: boolean) => {
    schedule.push({ date: day, doctor_id: doc.id, type: weekend ? 'weekend' : 'weekday' });
    if (weekend) weekendCounts.set(doc.id, weekendCounts.get(doc.id)! + 1);
    else weekdayCounts.set(doc.id, weekdayCounts.get(doc.id)! + 1);
    lastAssigned = doc.id;
  };

  for (const day of days) {
    // Skip holidays
    if (holidayDates.has(day)) {
      lastAssigned = null;
      continue;
    }

    const weekend = isWeekend(day);
    const unavailable = unavailableMap.get(day) || new Set();
    const preferred = preferredMap.get(day) || new Set();

    // Check if any doctor has a preferred date here
    const preferredDoctors = doctors.filter(doc =>
      preferred.has(doc.id) && !unavailable.has(doc.id) && hasQuota(doc, weekend)
    );

    // If a preferred doctor exists, allow them even if they were last assigned (relax consecutive rule)
    if (preferredDoctors.length > 0) {
      // Among preferred, pick the one with fewest total shifts (and prefer non-consecutive if possible)
      preferredDoctors.sort((a, b) => {
        const aConsec = a.id === lastAssigned ? 1 : 0;
        const bConsec = b.id === lastAssigned ? 1 : 0;
        if (aConsec !== bConsec) return aConsec - bConsec;
        const totalA = weekdayCounts.get(a.id)! + weekendCounts.get(a.id)!;
        const totalB = weekdayCounts.get(b.id)! + weekendCounts.get(b.id)!;
        return totalA - totalB;
      });
      assignDoctor(preferredDoctors[0], day, weekend);
      continue;
    }

    // Standard eligible: not unavailable, not consecutive, has quota
    const eligible = doctors.filter(doc =>
      !unavailable.has(doc.id) && doc.id !== lastAssigned && hasQuota(doc, weekend)
    );

    if (eligible.length > 0) {
      eligible.sort((a, b) => {
        const totalA = weekdayCounts.get(a.id)! + weekendCounts.get(a.id)!;
        const totalB = weekdayCounts.get(b.id)! + weekendCounts.get(b.id)!;
        return totalA - totalB;
      });
      assignDoctor(eligible[0], day, weekend);
      continue;
    }

    // Fallback: relax consecutive constraint
    const fallback = doctors.filter(doc =>
      !unavailable.has(doc.id) && hasQuota(doc, weekend)
    );

    if (fallback.length > 0) {
      fallback.sort((a, b) => {
        const totalA = weekdayCounts.get(a.id)! + weekendCounts.get(a.id)!;
        const totalB = weekdayCounts.get(b.id)! + weekendCounts.get(b.id)!;
        return totalA - totalB;
      });
      assignDoctor(fallback[0], day, weekend);
    } else {
      lastAssigned = null;
    }
  }

  return schedule;
}
