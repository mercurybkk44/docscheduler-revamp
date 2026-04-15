import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Lang = 'en' | 'th';

const translations = {
  // App / Nav
  'nav.doctors': { en: 'Doctors', th: 'แพทย์' },
  'nav.availability': { en: 'Availability', th: 'วันว่าง' },
  'nav.holidays': { en: 'Holidays', th: 'วันหยุด' },
  'nav.schedule': { en: 'Schedule', th: 'ตารางเวร' },

  // Common
  'common.loading': { en: 'Loading...', th: 'กำลังโหลด...' },
  'common.save': { en: 'Save Changes', th: 'บันทึก' },
  'common.clearAll': { en: 'Clear All', th: 'ล้างทั้งหมด' },
  'common.reset': { en: 'Reset', th: 'รีเซ็ต' },
  'common.none': { en: 'None', th: 'ไม่มี' },
  'common.selected': { en: 'Selected', th: 'ที่เลือก' },

  // Doctors Page
  'doctors.title': { en: 'Doctor Setup', th: 'ตั้งค่าแพทย์' },
  'doctors.subtitle': { en: 'Add up to 7 doctors and configure their shift quotas.', th: 'เพิ่มแพทย์ได้สูงสุด 7 คน และกำหนดโควต้าเวรของแต่ละคน' },
  'doctors.addNew': { en: 'Add New Doctor', th: 'เพิ่มแพทย์ใหม่' },
  'doctors.name': { en: 'Name', th: 'ชื่อ' },
  'doctors.namePlaceholder': { en: 'Dr. Smith', th: 'นพ. สมชาย' },
  'doctors.weekdayShifts': { en: 'Weekday Shifts', th: 'เวรวันธรรมดา' },
  'doctors.weekendShifts': { en: 'Weekend Shifts', th: 'เวรวันหยุด' },
  'doctors.addButton': { en: 'Add Doctor', th: 'เพิ่มแพทย์' },
  'doctors.editTitle': { en: 'Edit Doctor', th: 'แก้ไขแพทย์' },
  'doctors.weekdayLabel': { en: 'Weekday', th: 'วันธรรมดา' },
  'doctors.weekendLabel': { en: 'Weekend', th: 'วันหยุด' },
  'doctors.shifts': { en: 'shifts', th: 'เวร' },
  'doctors.maxReached': { en: 'Maximum 7 doctors allowed', th: 'เพิ่มได้สูงสุด 7 คน' },
  'doctors.enterName': { en: 'Please enter a doctor name', th: 'กรุณาใส่ชื่อแพทย์' },
  'doctors.added': { en: 'Doctor added', th: 'เพิ่มแพทย์แล้ว' },
  'doctors.removed': { en: 'Doctor removed', th: 'ลบแพทย์แล้ว' },
  'doctors.updated': { en: 'Doctor updated', th: 'อัปเดตแพทย์แล้ว' },
  'doctors.noDoctors': { en: 'No doctors added yet', th: 'ยังไม่มีแพทย์' },
  'doctors.addFirst': { en: 'Add doctors first on the Doctors page.', th: 'กรุณาเพิ่มแพทย์ในหน้าตั้งค่าแพทย์ก่อน' },

  // Availability Page
  'avail.title': { en: 'Doctor Availability', th: 'วันว่างของแพทย์' },
  'avail.subtitle': { en: 'Set unavailable and preferred dates for each doctor for next month.', th: 'กำหนดวันที่ไม่ว่างและวันที่ต้องการเข้าเวรของแพทย์แต่ละคนสำหรับเดือนถัดไป' },
  'avail.selectDoctor': { en: 'Select Doctor', th: 'เลือกแพทย์' },
  'avail.selectPlaceholder': { en: 'Select a doctor', th: 'เลือกแพทย์' },
  'avail.quotaSummary': { en: 'Shift Quota Summary', th: 'สรุปโควต้าเวร' },
  'avail.weekdayShifts': { en: 'Weekday shifts', th: 'เวรวันธรรมดา' },
  'avail.weekendShifts': { en: 'Weekend shifts', th: 'เวรวันหยุด' },
  'avail.weekdays': { en: 'weekdays', th: 'วันธรรมดา' },
  'avail.weekendDays': { en: 'weekend days', th: 'วันหยุด' },
  'avail.markUnavail': { en: 'cannot', th: 'ไม่สามารถ' },
  'avail.markPref': { en: 'prefer', th: 'ต้องการ' },
  'avail.unavailTitle': { en: 'Unavailable Dates', th: 'วันที่ไม่ว่าง' },
  'avail.prefTitle': { en: 'Preferred Shift Dates', th: 'วันที่ต้องการเข้าเวร' },
  'avail.noUnavail': { en: 'No unavailable dates set.', th: 'ยังไม่ได้กำหนดวันที่ไม่ว่าง' },
  'avail.noPref': { en: 'No preferred dates set.', th: 'ยังไม่ได้กำหนดวันที่ต้องการ' },
  'avail.helpText': { en: 'Mark dates this doctor {unavail} work as unavailable, and dates they {pref} to work as preferred.', th: 'กำหนดวันที่แพทย์คนนี้ {unavail} ทำงานเป็นวันไม่ว่าง และวันที่ {pref} เข้าเวรเป็นวันที่ต้องการ' },
  'avail.dateRemoved': { en: 'Date removed', th: 'ลบวันที่แล้ว' },
  'avail.allUnavailCleared': { en: 'All unavailable dates cleared', th: 'ล้างวันที่ไม่ว่างทั้งหมดแล้ว' },
  'avail.allPrefCleared': { en: 'All preferred dates cleared', th: 'ล้างวันที่ต้องการทั้งหมดแล้ว' },

  // Holidays Page
  'holidays.title': { en: 'Holidays', th: 'วันหยุดนักขัตฤกษ์' },
  'holidays.subtitle': { en: 'Configure public holidays for next month. No doctors will be scheduled on these dates.', th: 'กำหนดวันหยุดนักขัตฤกษ์สำหรับเดือนถัดไป จะไม่มีการจัดเวรในวันเหล่านี้' },
  'holidays.selectDates': { en: 'Select Holiday Dates', th: 'เลือกวันหยุด' },
  'holidays.count': { en: 'Holidays', th: 'วันหยุด' },
  'holidays.noHolidays': { en: 'No holidays configured. Click dates on the calendar to add them.', th: 'ยังไม่ได้กำหนดวันหยุด กดที่ปฏิทินเพื่อเพิ่ม' },
  'holidays.removed': { en: 'Holiday removed', th: 'ลบวันหยุดแล้ว' },

  // Schedule Page
  'schedule.title': { en: 'Schedule Generator', th: 'สร้างตารางเวร' },
  'schedule.subtitle': { en: 'Generate the on-call schedule for', th: 'สร้างตารางเวรสำหรับ' },
  'schedule.schedulingFor': { en: 'Scheduling for', th: 'สร้างตารางสำหรับ' },
  'schedule.generate': { en: 'Generate Schedule', th: 'สร้างตารางเวร' },
  'schedule.generated': { en: 'Schedule generated for', th: 'สร้างตารางเวรสำหรับ' },
  'schedule.summary': { en: 'Schedule Summary', th: 'สรุปตารางเวร' },
  'schedule.doctor': { en: 'Doctor', th: 'แพทย์' },
  'schedule.quota': { en: 'Quota', th: 'โควต้า' },
  'schedule.unavailDates': { en: 'Unavailable Dates', th: 'วันไม่ว่าง' },
  'schedule.prefDates': { en: 'Preferred Dates', th: 'วันที่ต้องการ' },
  'schedule.weekday': { en: 'Weekday', th: 'วันธรรมดา' },
  'schedule.weekend': { en: 'Weekend', th: 'วันหยุด' },
  'schedule.total': { en: 'Total', th: 'รวม' },
  'schedule.assignDoctor': { en: 'Assign Doctor', th: 'กำหนดแพทย์' },
  'schedule.currentlyAssigned': { en: 'Currently assigned', th: 'แพทย์ที่กำหนดอยู่' },
  'schedule.removeAssignment': { en: 'Remove Assignment', th: 'ลบการกำหนด' },
  'schedule.addFirst': { en: 'Add doctors first', th: 'กรุณาเพิ่มแพทย์ก่อน' },
  'schedule.holidayNoShift': { en: 'This date is a holiday — no shifts allowed', th: 'วันนี้เป็นวันหยุด — ไม่สามารถจัดเวรได้' },
  'schedule.assigned': { en: 'assigned to', th: 'ได้รับมอบหมายให้' },
  'schedule.assignmentRemoved': { en: 'Assignment removed', th: 'ลบการกำหนดแล้ว' },
  'schedule.allCleared': { en: 'All data cleared (schedule, availability, holidays)', th: 'ล้างข้อมูลทั้งหมดแล้ว (ตารางเวร, วันว่าง, วันหยุด)' },

  // Errors
  'error.loadFailed': { en: 'Failed to load data', th: 'โหลดข้อมูลไม่สำเร็จ' },
  'error.saveFailed': { en: 'Failed to save', th: 'บันทึกไม่สำเร็จ' },
  'error.removeFailed': { en: 'Failed to remove', th: 'ลบไม่สำเร็จ' },
  'error.clearFailed': { en: 'Failed to clear', th: 'ล้างไม่สำเร็จ' },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('docscheduler-lang');
    return (saved === 'th' ? 'th' : 'en') as Lang;
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('docscheduler-lang', newLang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    return entry ? entry[lang] : key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
