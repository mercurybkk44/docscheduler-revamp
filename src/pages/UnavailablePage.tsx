import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarOff, X, Star, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Doctor, DOCTOR_COLORS } from '@/lib/types';
import { loadDoctors, loadUnavailableDates, setUnavailableDates, loadPreferredDates, setPreferredDates } from '@/lib/store';
import { getNextMonth, getNextMonthLabel } from '@/lib/nextMonth';
import { toast } from 'sonner';

export default function UnavailablePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [unavailable, setUnavailable] = useState<{ doctor_id: string; date: string }[]>([]);
  const [preferred, setPreferred] = useState<{ doctor_id: string; date: string }[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const { month, year } = getNextMonth();
  const monthLabel = getNextMonthLabel();
  const nextMonthStart = useMemo(() => new Date(year, month, 1), [month, year]);
  const nextMonthEnd = useMemo(() => endOfMonth(nextMonthStart), [nextMonthStart]);

  useEffect(() => {
    const load = async () => {
      try {
        const docs = await loadDoctors();
        setDoctors(docs);
        setUnavailable(await loadUnavailableDates());
        setPreferred(await loadPreferredDates());
        if (docs.length > 0) setSelectedDoctorId(docs[0].id);
      } catch (e) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const unavailDates = unavailable.filter(u => u.doctor_id === selectedDoctorId).map(u => new Date(u.date + 'T00:00:00'));
  const prefDates = preferred.filter(p => p.doctor_id === selectedDoctorId).map(p => new Date(p.date + 'T00:00:00'));

  const handleUnavailSelect = async (dates: Date[] | undefined) => {
    if (!dates || !selectedDoctorId) return;
    const dateStrs = dates.map(d => format(d, 'yyyy-MM-dd'));
    try {
      await setUnavailableDates(selectedDoctorId, dateStrs);
      const otherDates = unavailable.filter(u => u.doctor_id !== selectedDoctorId);
      setUnavailable([...otherDates, ...dateStrs.map(date => ({ doctor_id: selectedDoctorId, date }))]);
    } catch (e) {
      toast.error('Failed to save');
    }
  };

  const handlePrefSelect = async (dates: Date[] | undefined) => {
    if (!dates || !selectedDoctorId) return;
    const dateStrs = dates.map(d => format(d, 'yyyy-MM-dd'));
    try {
      await setPreferredDates(selectedDoctorId, dateStrs);
      const otherDates = preferred.filter(p => p.doctor_id !== selectedDoctorId);
      setPreferred([...otherDates, ...dateStrs.map(date => ({ doctor_id: selectedDoctorId, date }))]);
    } catch (e) {
      toast.error('Failed to save');
    }
  };

  const removeUnavailDate = async (dateStr: string) => {
    const updated = unavailable.filter(u => !(u.doctor_id === selectedDoctorId && u.date === dateStr));
    const doctorDates = updated.filter(u => u.doctor_id === selectedDoctorId).map(u => u.date);
    try {
      await setUnavailableDates(selectedDoctorId, doctorDates);
      setUnavailable(updated);
      toast.success('Date removed');
    } catch (e) {
      toast.error('Failed to remove');
    }
  };

  const removePrefDate = async (dateStr: string) => {
    const updated = preferred.filter(p => !(p.doctor_id === selectedDoctorId && p.date === dateStr));
    const doctorDates = updated.filter(p => p.doctor_id === selectedDoctorId).map(p => p.date);
    try {
      await setPreferredDates(selectedDoctorId, doctorDates);
      setPreferred(updated);
      toast.success('Date removed');
    } catch (e) {
      toast.error('Failed to remove');
    }
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const doctorUnavailDates = unavailable.filter(u => u.doctor_id === selectedDoctorId).sort((a, b) => a.date.localeCompare(b.date));
  const doctorPrefDates = preferred.filter(p => p.doctor_id === selectedDoctorId).sort((a, b) => a.date.localeCompare(b.date));

  // Count weekdays and weekend days in next month
  const totalWeekdays = useMemo(() => {
    let count = 0;
    const d = new Date(nextMonthStart);
    while (d <= nextMonthEnd) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }, [nextMonthStart, nextMonthEnd]);

  const totalWeekendDays = useMemo(() => {
    let count = 0;
    const d = new Date(nextMonthStart);
    while (d <= nextMonthEnd) {
      const day = d.getDay();
      if (day === 0 || day === 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }, [nextMonthStart, nextMonthEnd]);

  // Restrict calendar to only next month
  const disabledDays = (date: Date) => date < nextMonthStart || date > nextMonthEnd;

  if (loading) return <div className="text-center py-16 text-muted-foreground">Loading...</div>;

  if (doctors.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No doctors added yet</h2>
        <p className="text-muted-foreground">Add doctors first on the Doctors page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-primary" />
          Doctor Availability — {monthLabel}
        </h1>
        <p className="text-muted-foreground mt-1">Set unavailable and preferred dates for each doctor for next month.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Select Doctor</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(doc => (
                <SelectItem key={doc.id} value={doc.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: DOCTOR_COLORS[doc.color_index] }} />
                    {doc.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDoctor && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {selectedDoctor.name} — Shift Quota Summary
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>Weekday shifts: <strong className="text-foreground">{selectedDoctor.weekday_quota}</strong> <span className="text-xs">/ {totalWeekdays} weekdays</span></span>
                  <span>Weekend shifts: <strong className="text-foreground">{selectedDoctor.weekend_quota}</strong> <span className="text-xs">/ {totalWeekendDays} weekend days</span></span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mark dates this doctor <span className="font-medium text-destructive">cannot</span> work as unavailable, and dates they <span className="font-medium text-yellow-600">prefer</span> to work as preferred.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unavailable Dates Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-destructive" />
                Unavailable Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={unavailDates}
                  onSelect={handleUnavailSelect}
                  defaultMonth={nextMonthStart}
                  disabled={disabledDays}
                  className="pointer-events-auto"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-muted-foreground">
                  Selected ({doctorUnavailDates.length})
                </p>
                {doctorUnavailDates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No unavailable dates set.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {doctorUnavailDates.map(ud => (
                      <Badge key={ud.date} variant="secondary" className="gap-1 pr-1">
                        {format(new Date(ud.date + 'T00:00:00'), 'MMM d')}
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removeUnavailDate(ud.date)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preferred Dates Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Preferred Shift Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={prefDates}
                  onSelect={handlePrefSelect}
                  defaultMonth={nextMonthStart}
                  disabled={disabledDays}
                  className="pointer-events-auto"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-muted-foreground">
                  Selected ({doctorPrefDates.length})
                </p>
                {doctorPrefDates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No preferred dates set.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {doctorPrefDates.map(pd => (
                      <Badge key={pd.date} variant="secondary" className="gap-1 pr-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {format(new Date(pd.date + 'T00:00:00'), 'MMM d')}
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removePrefDate(pd.date)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
