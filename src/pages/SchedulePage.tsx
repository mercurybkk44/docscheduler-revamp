import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Doctor, ScheduleEntry, DOCTOR_COLORS, DOCTOR_BG_COLORS } from '@/lib/types';
import {
  loadDoctors, loadUnavailableDates, loadPreferredDates, loadHolidays,
  loadSchedule, saveScheduleEntries, updateScheduleEntry, deleteScheduleEntry, clearAllData
} from '@/lib/store';
import { generateSchedule } from '@/lib/scheduler';
import { getNextMonth, getNextMonthLabel, getNextMonthPrefix } from '@/lib/nextMonth';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function SchedulePage() {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [unavailable, setUnavailable] = useState<{ doctor_id: string; date: string }[]>([]);
  const [preferred, setPreferred] = useState<{ doctor_id: string; date: string }[]>([]);
  const [holidays, setHolidays] = useState<{ date: string }[]>([]);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { month, year } = getNextMonth();
  const monthLabel = getNextMonthLabel();
  const monthStr = getNextMonthPrefix();
  const calendarDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const fetchAll = async () => {
    try {
      const [docs, sched, unavail, pref, hols] = await Promise.all([
        loadDoctors(), loadSchedule(), loadUnavailableDates(), loadPreferredDates(), loadHolidays()
      ]);
      setDoctors(docs); setSchedule(sched); setUnavailable(unavail); setPreferred(pref); setHolidays(hols);
    } catch (e) {
      toast.error(t('error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleGenerate = async () => {
    if (doctors.length === 0) { toast.error(t('schedule.addFirst')); return; }
    const holidaySet = new Set(holidays.map(h => h.date));
    const newSchedule = generateSchedule(year, month, doctors, unavailable, preferred, holidaySet);
    try {
      await saveScheduleEntries(newSchedule, monthStr);
      setSchedule(await loadSchedule());
      toast.success(`${t('schedule.generated')} ${monthLabel}`);
    } catch (e) {
      toast.error(t('error.saveFailed'));
    }
  };

  const handleReset = async () => {
    try {
      await clearAllData();
      setSchedule([]); setUnavailable([]); setPreferred([]); setHolidays([]);
      toast.success(t('schedule.allCleared'));
    } catch (e) {
      toast.error(t('error.clearFailed'));
    }
  };

  const doctorMap = useMemo(() => { const map = new Map<string, Doctor>(); doctors.forEach(d => map.set(d.id, d)); return map; }, [doctors]);
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  const calendarEvents = useMemo(() => {
    const events: any[] = [];
    for (const entry of schedule) {
      const doc = doctorMap.get(entry.doctor_id);
      events.push({ id: 'sched-' + entry.date, title: doc ? doc.name : 'Unknown', start: entry.date, allDay: true, backgroundColor: doc ? DOCTOR_BG_COLORS[doc.color_index] : '#ccc', textColor: doc ? DOCTOR_COLORS[doc.color_index] : '#666', borderColor: 'transparent' });
    }
    for (const h of holidays) {
      events.push({ id: 'hol-' + h.date, title: 'HOLIDAY', start: h.date, allDay: true, backgroundColor: 'hsl(0, 72%, 93%)', textColor: 'hsl(0, 72%, 45%)', borderColor: 'transparent', display: 'background', classNames: ['holiday-event'] });
      events.push({ id: 'hol-text-' + h.date, title: '🎉 HOLIDAY', start: h.date, allDay: true, backgroundColor: 'hsl(0, 72%, 90%)', textColor: 'hsl(0, 72%, 40%)', borderColor: 'hsl(0, 72%, 80%)' });
    }
    return events;
  }, [schedule, doctorMap, holidays]);

  const handleDateClick = (info: { dateStr: string }) => {
    if (holidaySet.has(info.dateStr)) { toast.info(t('schedule.holidayNoShift')); return; }
    setEditDate(info.dateStr); setEditDialogOpen(true);
  };

  const assignDoctor = async (doctorId: string) => {
    if (!editDate) return;
    const type = isWeekend(editDate) ? 'weekend' : 'weekday';
    try {
      await updateScheduleEntry(editDate, doctorId, type);
      setSchedule(await loadSchedule());
      setEditDialogOpen(false);
      const doc = doctorMap.get(doctorId);
      toast.success(`${doc?.name} ${t('schedule.assigned')} ${editDate}`);
    } catch (e) {
      toast.error(t('error.saveFailed'));
    }
  };

  const removeAssignment = async () => {
    if (!editDate) return;
    try {
      await deleteScheduleEntry(editDate);
      setSchedule(await loadSchedule());
      setEditDialogOpen(false);
      toast.success(t('schedule.assignmentRemoved'));
    } catch (e) {
      toast.error(t('error.removeFailed'));
    }
  };

  const currentAssignment = editDate ? schedule.find(s => s.date === editDate) : null;

  const monthSchedule = schedule.filter(s => s.date.startsWith(monthStr));
  const summaryData = doctors.map(doc => {
    const docUnavail = unavailable.filter(u => u.doctor_id === doc.id && u.date.startsWith(monthStr));
    const docPref = preferred.filter(p => p.doctor_id === doc.id && p.date.startsWith(monthStr));
    const docShifts = monthSchedule.filter(s => s.doctor_id === doc.id);
    const weekdayShifts = docShifts.filter(s => s.type === 'weekday').length;
    const weekendShifts = docShifts.filter(s => s.type === 'weekend').length;
    return { doctor: doc, unavailDates: docUnavail.map(u => u.date).sort(), prefDates: docPref.map(p => p.date).sort(), weekdayShifts, weekendShifts, totalShifts: weekdayShifts + weekendShifts };
  });

  if (loading) return <div className="text-center py-16 text-muted-foreground">{t('common.loading')}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          {t('schedule.title')}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('schedule.subtitle')} <strong>{monthLabel}</strong>.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="text-sm font-medium px-4 py-2 rounded-md bg-secondary text-secondary-foreground">
              {t('schedule.schedulingFor')}: <strong>{monthLabel}</strong>
            </div>
            <Button onClick={handleGenerate} className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t('schedule.generate')}
            </Button>
            {schedule.length > 0 && (
              <Button variant="destructive" onClick={handleReset}>{t('common.reset')}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {doctors.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {doctors.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DOCTOR_COLORS[doc.color_index] }} />
              <span className="font-medium">{doc.name}</span>
            </div>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-2 sm:p-4">
          <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" initialDate={calendarDate} key={calendarDate} events={calendarEvents} dateClick={handleDateClick} headerToolbar={{ left: '', center: 'title', right: '' }} height="auto" fixedWeekCount={false} />
        </CardContent>
      </Card>

      {doctors.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('schedule.summary')} — {monthLabel}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('schedule.doctor')}</TableHead>
                  <TableHead>{t('schedule.quota')}</TableHead>
                  <TableHead>{t('schedule.unavailDates')}</TableHead>
                  <TableHead>{t('schedule.prefDates')}</TableHead>
                  <TableHead className="text-center">{t('schedule.weekday')}</TableHead>
                  <TableHead className="text-center">{t('schedule.weekend')}</TableHead>
                  <TableHead className="text-center">{t('schedule.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map(row => (
                  <TableRow key={row.doctor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: DOCTOR_COLORS[row.doctor.color_index] }} />
                        <span className="font-medium">{row.doctor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm leading-relaxed">
                        <div>{t('schedule.weekday')}: <strong>{row.doctor.weekday_quota}</strong> {t('doctors.shifts')}</div>
                        <div>{t('schedule.weekend')}: <strong>{row.doctor.weekend_quota}</strong> {t('doctors.shifts')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.unavailDates.length === 0 ? <span className="text-muted-foreground text-sm">{t('common.none')}</span> : (
                        <div className="flex flex-wrap gap-1">
                          {row.unavailDates.map(d => <Badge key={d} variant="secondary" className="text-xs">{format(new Date(d + 'T00:00:00'), 'MMM d')}</Badge>)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.prefDates.length === 0 ? <span className="text-muted-foreground text-sm">{t('common.none')}</span> : (
                        <div className="flex flex-wrap gap-1">
                          {row.prefDates.map(d => <Badge key={d} variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">{format(new Date(d + 'T00:00:00'), 'MMM d')}</Badge>)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{row.weekdayShifts}</TableCell>
                    <TableCell className="text-center font-medium">{row.weekendShifts}</TableCell>
                    <TableCell className="text-center font-bold">{row.totalShifts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editDate ? `${t('schedule.assignDoctor')} — ${editDate}` : t('schedule.assignDoctor')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {currentAssignment && (
              <p className="text-sm text-muted-foreground mb-3">
                {t('schedule.currentlyAssigned')}: <strong>{doctorMap.get(currentAssignment.doctor_id)?.name}</strong>
              </p>
            )}
            {doctors.map(doc => (
              <Button key={doc.id} variant={currentAssignment?.doctor_id === doc.id ? 'default' : 'outline'} className="w-full justify-start gap-3" onClick={() => assignDoctor(doc.id)}>
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: DOCTOR_COLORS[doc.color_index] }} />
                {doc.name}
              </Button>
            ))}
            {currentAssignment && (
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={removeAssignment}>{t('schedule.removeAssignment')}</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
