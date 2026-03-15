import { Doctor, ScheduleEntry } from './types';

function isWeekendOrHoliday(dateStr: string, holidayDates: Set<string>): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6 || holidayDates.has(dateStr);
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

  const weekdayCounts = new Map<string, number>();
  const weekendCounts = new Map<string, number>();
  const assignments = new Map<string, string>(); // date -> doctor_id

  for (const doc of doctors) {
    weekdayCounts.set(doc.id, 0);
    weekendCounts.set(doc.id, 0);
  }

  const hasQuota = (docId: string, weekend: boolean) => {
    const doc = doctors.find(d => d.id === docId)!;
    const count = weekend ? weekendCounts.get(docId)! : weekdayCounts.get(docId)!;
    const quota = weekend ? doc.weekend_quota : doc.weekday_quota;
    return count < quota;
  };

  const addCount = (docId: string, weekend: boolean) => {
    if (weekend) weekendCounts.set(docId, weekendCounts.get(docId)! + 1);
    else weekdayCounts.set(docId, weekdayCounts.get(docId)! + 1);
  };

  // Helper: sort doctors by type-specific quota room (most room first), then lowest total
  const sortByQuotaRoom = (list: Doctor[], weekend: boolean) => {
    list.sort((a, b) => {
      const roomA = weekend
        ? a.weekend_quota - weekendCounts.get(a.id)!
        : a.weekday_quota - weekdayCounts.get(a.id)!;
      const roomB = weekend
        ? b.weekend_quota - weekendCounts.get(b.id)!
        : b.weekday_quota - weekdayCounts.get(b.id)!;
      if (roomB !== roomA) return roomB - roomA;
      const totalA = weekdayCounts.get(a.id)! + weekendCounts.get(a.id)!;
      const totalB = weekdayCounts.get(b.id)! + weekendCounts.get(b.id)!;
      return totalA - totalB;
    });
  };

  // ===== PASS 1: Reserve preferred dates =====
  const prefDays = days.filter(day => preferredMap.has(day));

  prefDays.sort((a, b) => {
    const aCount = preferredMap.get(a)?.size || 0;
    const bCount = preferredMap.get(b)?.size || 0;
    return aCount - bCount;
  });

  for (const day of prefDays) {
    const weekend = isWeekendOrHoliday(day, holidayDates);
    const unavailable = unavailableMap.get(day) || new Set();
    const preferred = preferredMap.get(day)!;

    const candidates = doctors.filter(doc =>
      preferred.has(doc.id) && !unavailable.has(doc.id) && hasQuota(doc.id, weekend)
    );

    if (candidates.length === 0) continue;

    sortByQuotaRoom(candidates, weekend);
    assignments.set(day, candidates[0].id);
    addCount(candidates[0].id, weekend);
  }

  // ===== PASS 2: Fill remaining days =====
  let lastAssigned: string | null = null;

  for (const day of days) {
    if (assignments.has(day)) {
      lastAssigned = assignments.get(day)!;
      continue;
    }

    const weekend = isWeekendOrHoliday(day, holidayDates);
    const unavailable = unavailableMap.get(day) || new Set();

    const eligible = doctors.filter(doc =>
      !unavailable.has(doc.id) && doc.id !== lastAssigned && hasQuota(doc.id, weekend)
    );

    if (eligible.length > 0) {
      sortByQuotaRoom(eligible, weekend);
      assignments.set(day, eligible[0].id);
      addCount(eligible[0].id, weekend);
      lastAssigned = eligible[0].id;
      continue;
    }

    // Fallback: relax consecutive constraint
    const fallback = doctors.filter(doc =>
      !unavailable.has(doc.id) && hasQuota(doc.id, weekend)
    );

    if (fallback.length > 0) {
      sortByQuotaRoom(fallback, weekend);
      assignments.set(day, fallback[0].id);
      addCount(fallback[0].id, weekend);
      lastAssigned = fallback[0].id;
    } else {
      lastAssigned = null;
    }
  }

  // ===== PASS 2.5: Fill unassigned days (only if quota allows) =====
  for (const day of days) {
    if (assignments.has(day)) continue;

    const weekend = isWeekendOrHoliday(day, holidayDates);
    const unavailable = unavailableMap.get(day) || new Set();

    const withQuota = doctors.filter(doc =>
      !unavailable.has(doc.id) && hasQuota(doc.id, weekend)
    );
    if (withQuota.length === 0) continue; // leave unassigned rather than exceed quota

    sortByQuotaRoom(withQuota, weekend);
    assignments.set(day, withQuota[0].id);
    addCount(withQuota[0].id, weekend);
  }

  // ===== PASS 2.6: Rebalance to satisfy missing quota using unassigned days =====
  const rebalanceForType = (weekend: boolean) => {
    const unassigned = days.filter(
      day => !assignments.has(day) && isWeekendOrHoliday(day, holidayDates) === weekend
    );
    if (unassigned.length === 0) return;

    const deficits = doctors
      .map(doc => {
        const count = weekend ? weekendCounts.get(doc.id)! : weekdayCounts.get(doc.id)!;
        const quota = weekend ? doc.weekend_quota : doc.weekday_quota;
        return { doc, deficit: quota - count };
      })
      .filter(item => item.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit);

    for (const item of deficits) {
      while (item.deficit > 0 && unassigned.length > 0) {
        // 1) Try direct assignment from unassigned day
        const directIdx = unassigned.findIndex(day => {
          const unavailable = unavailableMap.get(day) || new Set();
          return !unavailable.has(item.doc.id);
        });

        if (directIdx !== -1) {
          const day = unassigned.splice(directIdx, 1)[0];
          assignments.set(day, item.doc.id);
          addCount(item.doc.id, weekend);
          item.deficit--;
          continue;
        }

        // 2) Try swap: give one assigned day to deficit doctor and move donor to an unassigned day
        let swapped = false;
        for (const day of days) {
          if (isWeekendOrHoliday(day, holidayDates) !== weekend) continue;
          const donorId = assignments.get(day);
          if (!donorId || donorId === item.doc.id) continue;

          const unavailableOnAssigned = unavailableMap.get(day) || new Set();
          if (unavailableOnAssigned.has(item.doc.id)) continue;

          // Avoid breaking preferred day for donor when possible
          const donorPreferred = preferredMap.get(day);
          if (donorPreferred?.has(donorId)) continue;

          const fallbackIdx = unassigned.findIndex(freeDay => {
            const unavailableOnFree = unavailableMap.get(freeDay) || new Set();
            return !unavailableOnFree.has(donorId);
          });

          if (fallbackIdx === -1) continue;

          const freeDay = unassigned.splice(fallbackIdx, 1)[0];
          assignments.set(day, item.doc.id);
          assignments.set(freeDay, donorId);
          addCount(item.doc.id, weekend); // donor keeps same type count via moved day
          item.deficit--;
          swapped = true;
          break;
        }

        if (!swapped) break;
      }
    }
  };

  rebalanceForType(false); // weekday
  rebalanceForType(true);  // weekend

  // ===== PASS 3: Fix consecutive assignments =====
  const sortedDays = days.filter(d => assignments.has(d));
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = sortedDays[i - 1];
    const currDay = sortedDays[i];
    const prevDoc = assignments.get(prevDay)!;
    const currDoc = assignments.get(currDay)!;

    if (prevDoc !== currDoc) continue;

    const currPreferred = preferredMap.get(currDay);
    if (currPreferred?.has(currDoc)) continue;

    const prevPreferred = preferredMap.get(prevDay);
    if (prevPreferred?.has(prevDoc)) {
      const weekend = isWeekendOrHoliday(currDay, holidayDates);
      const unavailable = unavailableMap.get(currDay) || new Set();
      const alt = doctors.find(doc =>
        doc.id !== currDoc && !unavailable.has(doc.id) && hasQuota(doc.id, weekend)
      );
    }
  }

  // Build final schedule
  const schedule: ScheduleEntry[] = [];
  for (const day of days) {
    if (!assignments.has(day)) continue;
    const weekend = isWeekendOrHoliday(day, holidayDates);
    schedule.push({
      date: day,
      doctor_id: assignments.get(day)!,
      type: weekend ? 'weekend' : 'weekday',
    });
  }

  return schedule;
}
