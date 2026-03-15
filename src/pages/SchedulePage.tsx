import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Doctor, ScheduleEntry, DOCTOR_COLORS, DOCTOR_BG_COLORS } from '@/lib/types';
import {
  loadDoctors, loadUnavailableDates, loadPreferredDates, loadHolidays,
  loadSchedule, saveScheduleEntries, updateScheduleEntry, deleteScheduleEntry, clearSchedule
} from '@/lib/store';
import { generateSchedule } from '@/lib/scheduler';
import { toast } from 'sonner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function SchedulePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [unavailable, setUnavailable] = useState<{ doctor_id: string; date: string }[]>([]);
  const [preferred, setPreferred] = useState<{ doctor_id: string; date: string }[]>([]);
  const [holidays, setHolidays] = useState<{ date: string }[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [docs, sched, unavail, pref, hols] = await Promise.all([
        loadDoctors(), loadSchedule(), loadUnavailableDates(), loadPreferredDates(), loadHolidays()
      ]);
      setDoctors(docs);
      setSchedule(sched);
      setUnavailable(unavail);
      setPreferred(pref);
      setHolidays(hols);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleGenerate = async () => {
    if (doctors.length === 0) { toast.error('Add doctors first'); return; }
    const holidaySet = new Set(holidays.map(h => h.date));
    const newSchedule = generateSchedule(year, month, doctors, unavailable, preferred, holidaySet);
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    try {
      await saveScheduleEntries(newSchedule, monthStr);
      // Reload to get IDs
      const sched = await loadSchedule();
      setSchedule(sched);
      toast.success(`Schedule generated for ${MONTHS[month]} ${year}`);
    } catch (e) {
      toast.error('Failed to save schedule');
    }
  };

  const handleReset = async () => {
    try {
      await clearSchedule();
      setSchedule([]);
      toast.success('Schedule cleared');
    } catch (e) {
      toast.error('Failed to clear schedule');
    }
  };

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach(d => map.set(d.id, d));
    return map;
  }, [doctors]);

  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  const calendarEvents = useMemo(() => {
    const events: any[] = [];
    // Doctor assignments
    for (const entry of schedule) {
      const doc = doctorMap.get(entry.doctor_id);
      events.push({
        id: 'sched-' + entry.date,
        title: doc ? doc.name : 'Unknown',
        start: entry.date,
        allDay: true,
        backgroundColor: doc ? DOCTOR_BG_COLORS[doc.color_index] : '#ccc',
        textColor: doc ? DOCTOR_COLORS[doc.color_index] : '#666',
        borderColor: 'transparent',
      });
    }
    // Holidays
    for (const h of holidays) {
      events.push({
        id: 'hol-' + h.date,
        title: 'HOLIDAY',
        start: h.date,
        allDay: true,
        backgroundColor: 'hsl(0, 72%, 93%)',
        textColor: 'hsl(0, 72%, 45%)',
        borderColor: 'transparent',
        display: 'background',
        classNames: ['holiday-event'],
      });
      // Also add a foreground event for text
      events.push({
        id: 'hol-text-' + h.date,
        title: '🎉 HOLIDAY',
        start: h.date,
        allDay: true,
        backgroundColor: 'hsl(0, 72%, 90%)',
        textColor: 'hsl(0, 72%, 40%)',
        borderColor: 'hsl(0, 72%, 80%)',
      });
    }
    return events;
  }, [schedule, doctorMap, holidays]);

  const handleDateClick = (info: { dateStr: string }) => {
    if (holidaySet.has(info.dateStr)) {
      toast.info('This date is a holiday — no shifts allowed');
      return;
    }
    setEditDate(info.dateStr);
    setEditDialogOpen(true);
  };

  const assignDoctor = async (doctorId: string) => {
    if (!editDate) return;
    const type = isWeekend(editDate) ? 'weekend' : 'weekday';
    try {
      await updateScheduleEntry(editDate, doctorId, type);
      const sched = await loadSchedule();
      setSchedule(sched);
      setEditDialogOpen(false);
      const doc = doctorMap.get(doctorId);
      toast.success(`${doc?.name} assigned to ${editDate}`);
    } catch (e) {
      toast.error('Failed to assign');
    }
  };

  const removeAssignment = async () => {
    if (!editDate) return;
    try {
      await deleteScheduleEntry(editDate);
      const sched = await loadSchedule();
      setSchedule(sched);
      setEditDialogOpen(false);
      toast.success('Assignment removed');
    } catch (e) {
      toast.error('Failed to remove');
    }
  };

  const currentAssignment = editDate ? schedule.find(s => s.date === editDate) : null;
  const calendarDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  // Summary data
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
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

  if (loading) return <div className="text-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Schedule Generator
        </h1>
        <p className="text-muted-foreground mt-1">Generate and view the monthly doctor schedule.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (<SelectItem key={i} value={String(i)}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Generate Schedule
            </Button>
            {schedule.length > 0 && (
              <Button variant="destructive" onClick={handleReset}>Reset</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
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

      {/* Summary Panel */}
      {doctors.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule Summary — {MONTHS[month]} {year}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Unavailable Dates</TableHead>
                  <TableHead>Preferred Dates</TableHead>
                  <TableHead className="text-center">Weekday</TableHead>
                  <TableHead className="text-center">Weekend</TableHead>
                  <TableHead className="text-center">Total</TableHead>
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
                      {row.unavailDates.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.unavailDates.map(d => (
                            <Badge key={d} variant="secondary" className="text-xs">
                              {format(new Date(d + 'T00:00:00'), 'MMM d')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.prefDates.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.prefDates.map(d => (
                            <Badge key={d} variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                              {format(new Date(d + 'T00:00:00'), 'MMM d')}
                            </Badge>
                          ))}
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
            <DialogTitle>{editDate ? `Assign Doctor — ${editDate}` : 'Assign Doctor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {currentAssignment && (
              <p className="text-sm text-muted-foreground mb-3">
                Currently assigned: <strong>{doctorMap.get(currentAssignment.doctor_id)?.name}</strong>
              </p>
            )}
            {doctors.map(doc => (
              <Button
                key={doc.id}
                variant={currentAssignment?.doctor_id === doc.id ? 'default' : 'outline'}
                className="w-full justify-start gap-3"
                onClick={() => assignDoctor(doc.id)}
              >
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: DOCTOR_COLORS[doc.color_index] }} />
                {doc.name}
              </Button>
            ))}
            {currentAssignment && (
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={removeAssignment}>
                Remove Assignment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
