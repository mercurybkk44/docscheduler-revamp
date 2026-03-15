import { Doctor, ScheduleEntry } from './types';

function isWeekendOrHoliday(dateStr: string, holidayDates: Set<string>): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6 || holidayDates.has(dateStr);
}

function isFriday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 5;
}

function shiftDate(dateStr: string, offset: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hasAdjacentAssignment(
  docId: string,
  dateStr: string,
  assignments: Map<string, string>,
  ignoreDates: Set<string> = new Set()
): boolean {
  const prevDay = shiftDate(dateStr, -1);
  const nextDay = shiftDate(dateStr, 1);
  const prevDoc = ignoreDates.has(prevDay) ? undefined : assignments.get(prevDay);
  const nextDoc = ignoreDates.has(nextDay) ? undefined : assignments.get(nextDay);
  return prevDoc === docId || nextDoc === docId;
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

  // Friday constraint: 4 Fridays => max 1 per doctor, 5 Fridays => max 2 per doctor
  const totalFridays = days.filter(d => isFriday(d)).length;
  const maxFridayPerDoctor = totalFridays <= 4 ? 1 : 2;
  const fridayCounts = new Map<string, number>();
  for (const doc of doctors) {
    fridayCounts.set(doc.id, 0);
  }

  const canDoFriday = (docId: string, dateStr: string): boolean => {
    if (!isFriday(dateStr)) return true;
    return fridayCounts.get(docId)! < maxFridayPerDoctor;
  };

  const hasQuota = (docId: string, weekend: boolean) => {
    const doc = doctors.find(d => d.id === docId)!;
    const count = weekend ? weekendCounts.get(docId)! : weekdayCounts.get(docId)!;
    const quota = weekend ? doc.weekend_quota : doc.weekday_quota;
    return count < quota;
  };

  const addCount = (docId: string, weekend: boolean, dateStr: string) => {
    if (weekend) weekendCounts.set(docId, weekendCounts.get(docId)! + 1);
    else weekdayCounts.set(docId, weekdayCounts.get(docId)! + 1);
    if (isFriday(dateStr)) fridayCounts.set(docId, fridayCounts.get(docId)! + 1);
  };

  const removeCount = (docId: string, weekend: boolean, dateStr: string) => {
    if (weekend) weekendCounts.set(docId, Math.max(0, weekendCounts.get(docId)! - 1));
    else weekdayCounts.set(docId, Math.max(0, weekdayCounts.get(docId)! - 1));
    if (isFriday(dateStr)) fridayCounts.set(docId, Math.max(0, fridayCounts.get(docId)! - 1));
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
      preferred.has(doc.id) &&
      !unavailable.has(doc.id) &&
      hasQuota(doc.id, weekend) &&
      canDoFriday(doc.id, day) &&
      !hasAdjacentAssignment(doc.id, day, assignments)
    );

    if (candidates.length === 0) continue;

    sortByQuotaRoom(candidates, weekend);
    assignments.set(day, candidates[0].id);
    addCount(candidates[0].id, weekend, day);
  }

  // ===== PASS 2: Fill remaining days =====
  for (const day of days) {
    if (assignments.has(day)) continue;

    const weekend = isWeekendOrHoliday(day, holidayDates);
    const unavailable = unavailableMap.get(day) || new Set();

    const eligible = doctors.filter(doc =>
      !unavailable.has(doc.id) &&
      hasQuota(doc.id, weekend) &&
      canDoFriday(doc.id, day) &&
      !hasAdjacentAssignment(doc.id, day, assignments)
    );

    if (eligible.length === 0) continue;

    sortByQuotaRoom(eligible, weekend);
    assignments.set(day, eligible[0].id);
    addCount(eligible[0].id, weekend, day);
  }

  // ===== PASS 2.5: Fill unassigned days (only if quota allows) =====
  for (const day of days) {
    if (assignments.has(day)) continue;

    const weekend = isWeekendOrHoliday(day, holidayDates);
    const unavailable = unavailableMap.get(day) || new Set();

    const withQuota = doctors.filter(doc =>
      !unavailable.has(doc.id) &&
      hasQuota(doc.id, weekend) &&
      canDoFriday(doc.id, day) &&
      !hasAdjacentAssignment(doc.id, day, assignments)
    );

    if (withQuota.length === 0) continue;

    sortByQuotaRoom(withQuota, weekend);
    assignments.set(day, withQuota[0].id);
    addCount(withQuota[0].id, weekend, day);
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
        const directIdx = unassigned.findIndex(day => {
          const unavailable = unavailableMap.get(day) || new Set();
          return (
            !unavailable.has(item.doc.id) &&
            canDoFriday(item.doc.id, day) &&
            !hasAdjacentAssignment(item.doc.id, day, assignments)
          );
        });

        if (directIdx !== -1) {
          const day = unassigned.splice(directIdx, 1)[0];
          assignments.set(day, item.doc.id);
          addCount(item.doc.id, weekend, day);
          item.deficit--;
          continue;
        }

        let swapped = false;
        for (const day of days) {
          if (isWeekendOrHoliday(day, holidayDates) !== weekend) continue;
          const donorId = assignments.get(day);
          if (!donorId || donorId === item.doc.id) continue;

          const unavailableOnAssigned = unavailableMap.get(day) || new Set();
          if (unavailableOnAssigned.has(item.doc.id)) continue;
          if (!canDoFriday(item.doc.id, day)) continue;
          if (hasAdjacentAssignment(item.doc.id, day, assignments)) continue;

          const donorPreferred = preferredMap.get(day);
          if (donorPreferred?.has(donorId)) continue;

          const fallbackIdx = unassigned.findIndex(freeDay => {
            const unavailableOnFree = unavailableMap.get(freeDay) || new Set();
            const donorFridayCount = fridayCounts.get(donorId)!;
            const donorFridayAfterRelease = isFriday(day) ? donorFridayCount - 1 : donorFridayCount;
            const donorCanTakeFreeFriday = !isFriday(freeDay) || donorFridayAfterRelease < maxFridayPerDoctor;
            return (
              !unavailableOnFree.has(donorId) &&
              donorCanTakeFreeFriday &&
              !hasAdjacentAssignment(donorId, freeDay, assignments, new Set([day]))
            );
          });

          if (fallbackIdx === -1) continue;

          const freeDay = unassigned.splice(fallbackIdx, 1)[0];
          if (isFriday(day)) {
            fridayCounts.set(donorId, fridayCounts.get(donorId)! - 1);
          }
          assignments.set(day, item.doc.id);
          assignments.set(freeDay, donorId);
          addCount(item.doc.id, weekend, day);
          if (isFriday(freeDay)) {
            fridayCounts.set(donorId, fridayCounts.get(donorId)! + 1);
          }
          item.deficit--;
          swapped = true;
          break;
        }

        if (!swapped) break;
      }
    }
  };

  rebalanceForType(false);
  rebalanceForType(true);

  // ===== PASS 3: Final consecutive cleanup =====
  const tryReassignDay = (day: string, currentDocId: string): boolean => {
    const weekend = isWeekendOrHoliday(day, holidayDates);
    const unavailable = unavailableMap.get(day) || new Set();

    const alternatives = doctors.filter(doc =>
      doc.id !== currentDocId &&
      !unavailable.has(doc.id) &&
      hasQuota(doc.id, weekend) &&
      canDoFriday(doc.id, day) &&
      !hasAdjacentAssignment(doc.id, day, assignments)
    );

    if (alternatives.length === 0) return false;

    sortByQuotaRoom(alternatives, weekend);
    const replacementId = alternatives[0].id;
    assignments.set(day, replacementId);
    removeCount(currentDocId, weekend, day);
    addCount(replacementId, weekend, day);
    return true;
  };

  for (let i = 1; i < days.length; i++) {
    const prevDay = days[i - 1];
    const currDay = days[i];
    const prevDoc = assignments.get(prevDay);
    const currDoc = assignments.get(currDay);

    if (!prevDoc || !currDoc || prevDoc !== currDoc) continue;

    if (tryReassignDay(currDay, currDoc)) continue;
    tryReassignDay(prevDay, prevDoc);
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
