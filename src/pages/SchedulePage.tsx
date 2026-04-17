import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarDays, RefreshCw, Trash2, CalendarOff, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Doctor, ScheduleEntry, DOCTOR_COLORS, DOCTOR_BG_COLORS, DOCTOR_EMOJIS } from '@/lib/types';
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
    } catch {
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
    } catch {
      toast.error(t('error.saveFailed'));
    }
  };

  const handleReset = async () => {
    try {
      await clearAllData();
      setSchedule([]); setUnavailable([]); setPreferred([]); setHolidays([]);
      toast.success(t('schedule.allCleared'));
    } catch {
      toast.error(t('error.clearFailed'));
    }
  };

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach(d => map.set(d.id, d));
    return map;
  }, [doctors]);

  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  const calendarEvents = useMemo(() => {
    const events: {
      id: string; title: string; start: string; allDay: boolean;
      backgroundColor: string; textColor: string; borderColor: string;
      display?: string; classNames?: string[];
    }[] = [];
    for (const entry of schedule) {
      const doc = doctorMap.get(entry.doctor_id);
      events.push({
        id: 'sched-' + entry.date,
        title: doc ? `${DOCTOR_EMOJIS[doc.color_index]} ${doc.name}` : 'Unknown',
        start: entry.date,
        allDay: true,
        backgroundColor: doc ? DOCTOR_BG_COLORS[doc.color_index] : '#ccc',
        textColor: doc ? DOCTOR_COLORS[doc.color_index] : '#666',
        borderColor: 'transparent',
      });
    }
    for (const h of holidays) {
      events.push({
        id: 'hol-bg-' + h.date, title: '', start: h.date, allDay: true,
        backgroundColor: 'hsl(0, 72%, 93%)', textColor: 'hsl(0, 72%, 45%)',
        borderColor: 'transparent', display: 'background',
      });
      events.push({
        id: 'hol-text-' + h.date, title: '🎉 Holiday', start: h.date, allDay: true,
        backgroundColor: 'hsl(0, 72%, 90%)', textColor: 'hsl(0, 72%, 40%)',
        borderColor: 'hsl(0, 72%, 80%)',
      });
    }
    return events;
  }, [schedule, doctorMap, holidays]);

  const handleDateClick = (info: { dateStr: string }) => {
    if (holidaySet.has(info.dateStr)) { toast.info(t('schedule.holidayNoShift')); return; }
    setEditDate(info.dateStr);
    setEditDialogOpen(true);
  };

  const assignDoctor = async (doctorId: string) => {
    if (!editDate) return;
    const type = isWeekend(editDate) ? 'weekend' : 'weekday';
    try {
      await updateScheduleEntry(editDate, doctorId, type);
      setSchedule(await loadSchedule());
      setEditDialogOpen(false);
      toast.success(`${doctorMap.get(doctorId)?.name} ${t('schedule.assigned')} ${editDate}`);
    } catch {
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
    } catch {
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
    return {
      doctor: doc,
      unavailDates: docUnavail.map(u => u.date).sort(),
      prefDates: docPref.map(p => p.date).sort(),
      weekdayShifts,
      weekendShifts,
      totalShifts: weekdayShifts + weekendShifts,
    };
  });

  if (loading) return <div className="text-center py-16 text-muted-foreground">{t('common.loading')}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t('schedule.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('schedule.subtitle')} <strong>{monthLabel}</strong>
        </p>
      </div>

      {/* Action bar */}
      <Card>
        <CardContent className="py-4 px-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 text-sm font-medium px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-center sm:text-left">
              {t('schedule.schedulingFor')}: <strong>{monthLabel}</strong>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} className="flex-1 sm:flex-none gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('schedule.generate')}
              </Button>
              {schedule.length > 0 && (
                <Button variant="outline" onClick={handleReset} className="flex-1 sm:flex-none gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                  {t('common.reset')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctor legend */}
      {doctors.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {doctors.map(doc => (
            <div key={doc.id} className="flex items-center gap-1.5 text-sm">
              <span className="text-base leading-none">{DOCTOR_EMOJIS[doc.color_index]}</span>
              <span className="font-medium" style={{ color: DOCTOR_COLORS[doc.color_index] }}>{doc.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-2 sm:p-4 fc-mobile-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={calendarDate}
            key={calendarDate}
            events={calendarEvents}
            dateClick={handleDateClick}
            headerToolbar={{ left: '', center: 'title', right: '' }}
            height="auto"
            fixedWeekCount={false}
          />
        </CardContent>
      </Card>

      {/* Summary cards */}
      {doctors.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-base">
            {t('schedule.summary')} — {monthLabel}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {summaryData.map(row => (
              <Card key={row.doctor.id} className="overflow-hidden">
                {/* Colored top strip */}
                <div className="h-1.5" style={{ backgroundColor: DOCTOR_COLORS[row.doctor.color_index] }} />
                <CardContent className="p-4 space-y-4">
                  {/* Doctor name row */}
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: DOCTOR_COLORS[row.doctor.color_index] + '20' }}
                    >
                      {DOCTOR_EMOJIS[row.doctor.color_index]}
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">{row.doctor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('schedule.quota')}: {row.doctor.weekday_quota}W · {row.doctor.weekend_quota}WE
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-2 bg-muted/50 rounded-xl">
                      <span className="text-xl font-bold">{row.weekdayShifts}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">{t('schedule.weekday')}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-muted/50 rounded-xl">
                      <span className="text-xl font-bold">{row.weekendShifts}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">{t('schedule.weekend')}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-xl" style={{ backgroundColor: DOCTOR_COLORS[row.doctor.color_index] + '18' }}>
                      <span className="text-xl font-bold" style={{ color: DOCTOR_COLORS[row.doctor.color_index] }}>{row.totalShifts}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">{t('schedule.total')}</span>
                    </div>
                  </div>

                  {/* Unavail dates */}
                  {row.unavailDates.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                        <CalendarOff className="h-3 w-3" />
                        <span>{t('schedule.unavailDates')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {row.unavailDates.map(d => (
                          <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {format(new Date(d + 'T00:00:00'), 'MMM d')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preferred dates */}
                  {row.prefDates.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span>{t('schedule.prefDates')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {row.prefDates.map(d => (
                          <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-200">
                            {format(new Date(d + 'T00:00:00'), 'MMM d')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit assignment dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editDate ? `${t('schedule.assignDoctor')} — ${editDate}` : t('schedule.assignDoctor')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {currentAssignment && (
              <p className="text-sm text-muted-foreground mb-3">
                {t('schedule.currentlyAssigned')}: <strong>{doctorMap.get(currentAssignment.doctor_id)?.name}</strong>
              </p>
            )}
            {doctors.map(doc => (
              <Button
                key={doc.id}
                variant={currentAssignment?.doctor_id === doc.id ? 'default' : 'outline'}
                className="w-full justify-start gap-3"
                onClick={() => assignDoctor(doc.id)}
              >
                <span className="text-base">{DOCTOR_EMOJIS[doc.color_index]}</span>
                {doc.name}
              </Button>
            ))}
            {currentAssignment && (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={removeAssignment}
              >
                {t('schedule.removeAssignment')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
