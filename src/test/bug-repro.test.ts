import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../lib/scheduler';
import { Doctor } from '../lib/types';

// May 2025: 1=Thu, 2=Fri, 3=Sat, 4=Sun, 5=Mon...31=Sat
const YEAR = 2025;
const MONTH = 4; // 0-indexed = May

const doctors: Doctor[] = [
  { id: 'nooenuy', name: 'Nooenuy', weekday_quota: 3, weekend_quota: 2, color_index: 0 },
  { id: 'martin',  name: 'Martin',  weekday_quota: 3, weekend_quota: 2, color_index: 1 },
  { id: 'fei',     name: 'Fei',     weekday_quota: 3, weekend_quota: 2, color_index: 2 },
  { id: 'pair',    name: 'Pair',    weekday_quota: 3, weekend_quota: 2, color_index: 3 },
  { id: 'nanhub',  name: 'NanHub',  weekday_quota: 3, weekend_quota: 2, color_index: 4 },
  { id: 'jack',    name: 'Mr.Jack', weekday_quota: 3, weekend_quota: 2, color_index: 5 },
  { id: 'pop',     name: 'Pop',     weekday_quota: 3, weekend_quota: 1, color_index: 6 },
];

const rawUnavail: Record<string, number[]> = {
  nooenuy: [1, 5, 8, 9, 10, 14, 15, 16, 17, 19, 22, 28, 29],
  martin:  [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 20, 22, 25, 26, 27, 29, 30, 31],
  fei:     [1, 6, 8, 9, 13, 15, 16, 20, 23, 27, 29, 30, 31],
  pair:    [1, 2, 5, 7, 12, 19, 21, 23, 24, 25, 26],
  nanhub:  [2, 7, 10, 12, 14, 16, 21, 24, 26, 28, 30],
  jack:    [1, 2, 3, 4, 7, 13, 14, 16, 17, 21, 23, 26, 27, 28, 29, 30, 31],
  pop:     [1, 2, 3, 4, 7, 8, 10, 11, 14, 15, 16, 18, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31],
};

const unavailableDates = Object.entries(rawUnavail).flatMap(([doctorId, days]) =>
  days.map(d => ({
    doctor_id: doctorId,
    date: `2025-05-${String(d).padStart(2, '0')}`,
  }))
);

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

describe('Bug repro: May 2025 real-world data', () => {
  const schedule = generateSchedule(YEAR, MONTH, doctors, unavailableDates, [], new Set());

  const allDays = Array.from({ length: 31 }, (_, i) =>
    `2025-05-${String(i + 1).padStart(2, '0')}`
  );
  const assignedDates = new Set(schedule.map(s => s.date));
  const unassignedDays = allDays.filter(d => !assignedDates.has(d));

  it('แสดงวันที่ไม่มีแพทย์ (diagnostic)', () => {
    console.log('\n=== Unassigned days ===');
    for (const day of unassignedDays) {
      const d = new Date(day + 'T00:00:00');
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      // หาว่าหมอคนไหนว่างวันนั้นบ้าง (ignoring adjacency)
      const avail = doctors.filter(doc => {
        const key = doc.id as keyof typeof rawUnavail;
        const dayNum = parseInt(day.split('-')[2]);
        return !rawUnavail[key].includes(dayNum);
      }).map(d => d.name);
      console.log(`  ${day} (${dayName}) → eligible (no adjacency check): [${avail.join(', ')}]`);
    }
    console.log('');
    console.log('=== Schedule ===');
    for (const entry of schedule.sort((a, b) => a.date.localeCompare(b.date))) {
      const d = new Date(entry.date + 'T00:00:00');
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      const doc = doctors.find(x => x.id === entry.doctor_id);
      console.log(`  ${entry.date} (${dayName}) → ${doc?.name}`);
    }
    console.log('');
    console.log('=== Per-doctor shift count ===');
    for (const doc of doctors) {
      const wd = schedule.filter(s => s.doctor_id === doc.id && s.type === 'weekday').length;
      const we = schedule.filter(s => s.doctor_id === doc.id && s.type === 'weekend').length;
      console.log(`  ${doc.name}: weekday=${wd}/${doc.weekday_quota}  weekend=${we}/${doc.weekend_quota}  total=${wd+we}`);
    }
  });

  it('วันที่ May 16 ต้องถูก assign', () => {
    // May 16 = Fri, มีเพียง Pair ที่ available (no unavail constraint)
    // ถ้า Pair ไม่ได้รับ adjacency block ควรได้ assigned
    const may16 = schedule.find(s => s.date === '2025-05-16');
    expect(may16).toBeDefined();
  });

  it('Pop ควรได้เวรอย่างน้อย 3 วัน (quota wd=3 we=1)', () => {
    const popShifts = schedule.filter(s => s.doctor_id === 'pop');
    expect(popShifts.length).toBeGreaterThanOrEqual(3);
  });
});

// วิเคราะห์แยกส่วน: May 15 vs May 16
describe('Root cause: May 15/16 conflict', () => {
  it('ถ้า Pass 2 เดินวันตามปฏิทิน May 15 ก่อน → Pair ถูก assign May 15 → May 16 ว่าง', () => {
    // ตรวจว่า Pair เป็นคนเดียวที่ available บน May 16
    const may16AvailDoctors = doctors.filter(doc => {
      const key = doc.id as keyof typeof rawUnavail;
      return !rawUnavail[key].includes(16);
    });
    console.log('\nDoctors available on May 16:', may16AvailDoctors.map(d => d.name));
    expect(may16AvailDoctors.map(d => d.id)).toEqual(['pair']);
  });

  it('Pair available ทั้ง May 15 และ May 16 → สองวันติดกัน แต่ assign ได้แค่วันเดียว', () => {
    const may15AvailDoctors = doctors.filter(doc => {
      const key = doc.id as keyof typeof rawUnavail;
      return !rawUnavail[key].includes(15);
    });
    const may16AvailDoctors = doctors.filter(doc => {
      const key = doc.id as keyof typeof rawUnavail;
      return !rawUnavail[key].includes(16);
    });
    console.log('\nDoctors available on May 15:', may15AvailDoctors.map(d => d.name));
    console.log('Doctors available on May 16:', may16AvailDoctors.map(d => d.name));

    // May 15 มีหลายคน แต่ May 16 มีแค่ Pair
    // ถ้า Pair ถูก assign ไป May 15 ก่อน → May 16 จะว่าง!
    const pairAvailBoth = !rawUnavail.pair.includes(15) && !rawUnavail.pair.includes(16);
    expect(pairAvailBoth).toBe(true); // Pair available ทั้งสองวัน
    expect(may16AvailDoctors).toHaveLength(1); // May 16 มีแค่คนเดียว
    expect(may16AvailDoctors[0].id).toBe('pair');
  });
});
