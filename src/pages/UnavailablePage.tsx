import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarOff, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Doctor, UnavailableDate, DOCTOR_COLORS } from '@/lib/types';
import { loadDoctors, loadUnavailableDates, saveUnavailableDates } from '@/lib/store';
import { toast } from 'sonner';

export default function UnavailablePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableDate[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  useEffect(() => {
    const docs = loadDoctors();
    setDoctors(docs);
    setUnavailable(loadUnavailableDates());
    if (docs.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(docs[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      const dates = unavailable
        .filter(u => u.doctorId === selectedDoctorId)
        .map(u => new Date(u.date + 'T00:00:00'));
      setSelectedDates(dates);
    }
  }, [selectedDoctorId, unavailable]);

  const handleSelect = (dates: Date[] | undefined) => {
    if (!dates || !selectedDoctorId) return;
    
    // Remove old entries for this doctor, add new ones
    const otherDoctorDates = unavailable.filter(u => u.doctorId !== selectedDoctorId);
    const newEntries: UnavailableDate[] = dates.map(d => ({
      doctorId: selectedDoctorId,
      date: format(d, 'yyyy-MM-dd'),
    }));
    
    const updated = [...otherDoctorDates, ...newEntries];
    setUnavailable(updated);
    saveUnavailableDates(updated);
  };

  const removeDate = (dateStr: string) => {
    const updated = unavailable.filter(
      u => !(u.doctorId === selectedDoctorId && u.date === dateStr)
    );
    setUnavailable(updated);
    saveUnavailableDates(updated);
    toast.success('Date removed');
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const doctorDates = unavailable
    .filter(u => u.doctorId === selectedDoctorId)
    .sort((a, b) => a.date.localeCompare(b.date));

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-primary" />
          Unavailable Dates
        </h1>
        <p className="text-muted-foreground mt-1">
          Select dates when a doctor is not available for shifts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Doctor</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(doc => (
                <SelectItem key={doc.id} value={doc.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full inline-block"
                      style={{ backgroundColor: DOCTOR_COLORS[doc.colorIndex] }}
                    />
                    {doc.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDoctor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pick Dates</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={handleSelect}
                className="pointer-events-auto"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Unavailable Dates ({doctorDates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {doctorDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No unavailable dates set. Click dates on the calendar to add them.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {doctorDates.map(ud => (
                    <Badge
                      key={ud.date}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {format(new Date(ud.date + 'T00:00:00'), 'MMM d, yyyy')}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeDate(ud.date)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
