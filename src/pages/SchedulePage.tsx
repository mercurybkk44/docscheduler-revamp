import { useState, useEffect, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Doctor, ScheduleEntry, DOCTOR_COLORS, DOCTOR_BG_COLORS } from '@/lib/types';
import { loadDoctors, loadUnavailableDates, loadSchedule, saveSchedule } from '@/lib/store';
import { generateSchedule } from '@/lib/scheduler';
import { toast } from 'sonner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SchedulePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    setDoctors(loadDoctors());
    setSchedule(loadSchedule());
  }, []);

  const handleGenerate = () => {
    const docs = loadDoctors();
    const unavail = loadUnavailableDates();
    if (docs.length === 0) {
      toast.error('Add doctors first');
      return;
    }
    const newSchedule = generateSchedule(year, month, docs, unavail);
    // Merge: remove old entries for this month, add new ones
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const otherMonths = schedule.filter(s => !s.date.startsWith(monthStr));
    const merged = [...otherMonths, ...newSchedule];
    setSchedule(merged);
    saveSchedule(merged);
    toast.success(`Schedule generated for ${MONTHS[month]} ${year}`);
  };

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach(d => map.set(d.id, d));
    return map;
  }, [doctors]);

  const calendarEvents = useMemo(() => {
    return schedule.map(entry => {
      const doc = doctorMap.get(entry.doctorId);
      return {
        id: entry.date,
        title: doc ? doc.name : 'Unknown',
        start: entry.date,
        allDay: true,
        backgroundColor: doc ? DOCTOR_BG_COLORS[doc.colorIndex] : '#ccc',
        textColor: doc ? DOCTOR_COLORS[doc.colorIndex] : '#666',
        borderColor: 'transparent',
      };
    });
  }, [schedule, doctorMap]);

  const handleDateClick = (info: { dateStr: string }) => {
    setEditDate(info.dateStr);
    setEditDialogOpen(true);
  };

  const assignDoctor = (doctorId: string) => {
    if (!editDate) return;
    const updated = schedule.filter(s => s.date !== editDate);
    updated.push({ date: editDate, doctorId });
    setSchedule(updated);
    saveSchedule(updated);
    setEditDialogOpen(false);
    const doc = doctorMap.get(doctorId);
    toast.success(`${doc?.name} assigned to ${editDate}`);
  };

  const removeAssignment = () => {
    if (!editDate) return;
    const updated = schedule.filter(s => s.date !== editDate);
    setSchedule(updated);
    saveSchedule(updated);
    setEditDialogOpen(false);
    toast.success('Assignment removed');
  };

  const currentAssignment = editDate ? schedule.find(s => s.date === editDate) : null;
  const calendarDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Schedule Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate and view the monthly doctor schedule.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Generate Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      {doctors.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {doctors.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: DOCTOR_COLORS[doc.colorIndex] }}
              />
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
            headerToolbar={{
              left: '',
              center: 'title',
              right: '',
            }}
            height="auto"
            fixedWeekCount={false}
          />
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editDate ? `Assign Doctor — ${editDate}` : 'Assign Doctor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {currentAssignment && (
              <p className="text-sm text-muted-foreground mb-3">
                Currently assigned: <strong>{doctorMap.get(currentAssignment.doctorId)?.name}</strong>
              </p>
            )}
            {doctors.map(doc => (
              <Button
                key={doc.id}
                variant={currentAssignment?.doctorId === doc.id ? 'default' : 'outline'}
                className="w-full justify-start gap-3"
                onClick={() => assignDoctor(doc.id)}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: DOCTOR_COLORS[doc.colorIndex] }}
                />
                {doc.name}
              </Button>
            ))}
            {currentAssignment && (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={removeAssignment}
              >
                Remove Assignment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
