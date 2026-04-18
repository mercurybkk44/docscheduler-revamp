import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../lib/scheduler';
import { Doctor } from '../lib/types';

// ทดสอบ: เดือนมิถุนายน 2025 (มี 4 วันศุกร์: 6, 13, 20, 27)
const YEAR = 2025;
const MONTH = 5; // 0-indexed = June

function makeDoctors(configs: { name: string; wdq: number; weq: number }[]): Doctor[] {
  return configs.map((c, i) => ({
    id: `doc-${i + 1}`,
    name: c.name,
    weekday_quota: c.wdq,
    weekend_quota: c.weq,
    color_index: i,
  }));
}

function getFridaysInMonth(year: number, month: number): string[] {
  const fridays: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 5) {
      fridays.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return fridays;
}

function getConsecutivePairs(schedule: { date: string; doctor_id: string }[]) {
  const sorted = [...schedule].sort((a, b) => a.date.localeCompare(b.date));
  const pairs: { dates: [string, string]; doctorId: string }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].doctor_id === sorted[i - 1].doctor_id) {
      const prev = new Date(sorted[i - 1].date + 'T00:00:00');
      const curr = new Date(sorted[i].date + 'T00:00:00');
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) {
        pairs.push({ dates: [sorted[i - 1].date, sorted[i].date], doctorId: sorted[i].doctor_id });
      }
    }
  }
  return pairs;
}

// ========================================================
// Scenario 1: หมอ 1 คน ทำเครื่องหมาย ทุกวันศุกร์เป็น unavailable
// ========================================================
describe('Scenario: 1 doctor, all Fridays unavailable', () => {
  const doctors = makeDoctors([{ name: 'Dr.A', wdq: 15, weq: 6 }]);
  const fridays = getFridaysInMonth(YEAR, MONTH);

  const unavailable = fridays.map(date => ({ doctor_id: 'doc-1', date }));
  const schedule = generateSchedule(YEAR, MONTH, doctors, unavailable, [], new Set());

  it('ไม่มีวันศุกร์ถูกจัดให้ Dr.A', () => {
    const fridayShifts = schedule.filter(s => fridays.includes(s.date));
    expect(fridayShifts).toHaveLength(0);
  });

  it('วันศุกร์ทุกวันต้องไม่มีเวร (unassigned) เพราะมีหมอแค่คนเดียว', () => {
    const assignedDates = new Set(schedule.map(s => s.date));
    for (const fri of fridays) {
      expect(assignedDates.has(fri)).toBe(false);
    }
  });

  it('ไม่มีวันติดกัน (consecutive)', () => {
    const pairs = getConsecutivePairs(schedule);
    expect(pairs).toHaveLength(0);
  });

  it('เวรทั้งหมดต้องไม่เกิน quota', () => {
    const weekdayShifts = schedule.filter(s => s.type === 'weekday').length;
    const weekendShifts = schedule.filter(s => s.type === 'weekend').length;
    expect(weekdayShifts).toBeLessThanOrEqual(15);
    expect(weekendShifts).toBeLessThanOrEqual(6);
  });
});

// ========================================================
// Scenario 2: หมอ 3 คน มีคนเดียวที่ mark วันศุกร์ไม่ว่าง
// ========================================================
describe('Scenario: 3 doctors, only Doc-1 has all Fridays unavailable', () => {
  const doctors = makeDoctors([
    { name: 'Dr.A', wdq: 8, weq: 3 },
    { name: 'Dr.B', wdq: 8, weq: 3 },
    { name: 'Dr.C', wdq: 8, weq: 3 },
  ]);
  const fridays = getFridaysInMonth(YEAR, MONTH);
  const unavailable = fridays.map(date => ({ doctor_id: 'doc-1', date }));
  const schedule = generateSchedule(YEAR, MONTH, doctors, unavailable, [], new Set());

  it('Dr.A ต้องไม่มีเวรวันศุกร์เลย', () => {
    const docAFridays = schedule.filter(s => s.doctor_id === 'doc-1' && fridays.includes(s.date));
    expect(docAFridays).toHaveLength(0);
  });

  it('วันศุกร์ทั้งหมดต้องถูก assign ให้ Dr.B หรือ Dr.C', () => {
    for (const fri of fridays) {
      const entry = schedule.find(s => s.date === fri);
      expect(entry).toBeDefined();
      expect(['doc-2', 'doc-3']).toContain(entry!.doctor_id);
    }
  });

  it('ไม่มีวันติดกัน (consecutive) สำหรับหมอทุกคน', () => {
    const pairs = getConsecutivePairs(schedule);
    expect(pairs).toHaveLength(0);
  });

  it('ไม่มีหมอคนใดเกิน quota', () => {
    for (const doc of doctors) {
      const wd = schedule.filter(s => s.doctor_id === doc.id && s.type === 'weekday').length;
      const we = schedule.filter(s => s.doctor_id === doc.id && s.type === 'weekend').length;
      expect(wd).toBeLessThanOrEqual(doc.weekday_quota);
      expect(we).toBeLessThanOrEqual(doc.weekend_quota);
    }
  });
});

// ========================================================
// Scenario 3: Friday cap scaling — หมอ 2 คน, เดือนมี 4 วันศุกร์
// ต้องปรับ cap เป็น 2 (ไม่ใช่ 1) เพื่อ cover ทุกวันศุกร์
// ========================================================
describe('Scenario: Friday cap scales when fewer doctors than Fridays', () => {
  const doctors = makeDoctors([
    { name: 'Dr.A', wdq: 12, weq: 5 },
    { name: 'Dr.B', wdq: 12, weq: 5 },
  ]);
  const fridays = getFridaysInMonth(YEAR, MONTH); // 4 Fridays in June 2025
  const schedule = generateSchedule(YEAR, MONTH, doctors, [], [], new Set());

  it('มี 4 วันศุกร์ แต่หมอ 2 คน → cap ต้องปรับเป็น 2 → วันศุกร์ทุกวันต้องถูก assign', () => {
    for (const fri of fridays) {
      const entry = schedule.find(s => s.date === fri);
      expect(entry).toBeDefined();
    }
  });

  it('แต่ละคนทำ Friday ไม่เกิน 2 วัน', () => {
    for (const doc of doctors) {
      const fridayCount = schedule.filter(s => s.doctor_id === doc.id && fridays.includes(s.date)).length;
      expect(fridayCount).toBeLessThanOrEqual(2);
    }
  });
});

// ========================================================
// Scenario 4: Cross-month adjacency — หมอที่เข้าเวรวันสุดท้ายของเดือนก่อน
// ต้องไม่ได้เวรวันแรกของเดือนใหม่
// ========================================================
describe('Scenario: Cross-month adjacency', () => {
  const doctors = makeDoctors([
    { name: 'Dr.A', wdq: 10, weq: 4 },
    { name: 'Dr.B', wdq: 10, weq: 4 },
  ]);

  // Dr.A เข้าเวรวันสุดท้ายของเดือนก่อน (31 May 2025)
  const schedule = generateSchedule(YEAR, MONTH, doctors, [], [], new Set(), 'doc-1');
  const firstDay = `${YEAR}-${String(MONTH + 1).padStart(2, '0')}-01`;

  it('Dr.A ต้องไม่ได้เวรวันที่ 1 (ติดกับวันสุดท้ายของเดือนก่อน)', () => {
    const firstEntry = schedule.find(s => s.date === firstDay);
    if (firstEntry) {
      expect(firstEntry.doctor_id).not.toBe('doc-1');
    }
    // ถ้าไม่มี entry เลยก็ถือว่าผ่าน
  });
});
