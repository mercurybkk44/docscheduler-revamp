import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarOff, X, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Doctor, DOCTOR_COLORS } from '@/lib/types';
import { loadDoctors, loadUnavailableDates, setUnavailableDates, loadPreferredDates, setPreferredDates } from '@/lib/store';
import { toast } from 'sonner';

export default function UnavailablePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [unavailable, setUnavailable] = useState<{ doctor_id: string; date: string }[]>([]);
  const [preferred, setPreferred] = useState<{ doctor_id: string; date: string }[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-primary" />
          Doctor Availability
        </h1>
        <p className="text-muted-foreground mt-1">Set unavailable and preferred dates for each doctor.</p>
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
        <Tabs defaultValue="unavailable" className="space-y-4">
          <TabsList>
            <TabsTrigger value="unavailable" className="gap-2"><CalendarOff className="h-4 w-4" />Unavailable Dates</TabsTrigger>
            <TabsTrigger value="preferred" className="gap-2"><Star className="h-4 w-4" />Preferred Dates</TabsTrigger>
          </TabsList>

          <TabsContent value="unavailable">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Pick Unavailable Dates</CardTitle></CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar mode="multiple" selected={unavailDates} onSelect={handleUnavailSelect} className="pointer-events-auto" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Unavailable Dates ({doctorUnavailDates.length})</CardTitle></CardHeader>
                <CardContent>
                  {doctorUnavailDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No unavailable dates set.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {doctorUnavailDates.map(ud => (
                        <Badge key={ud.date} variant="secondary" className="gap-1 pr-1">
                          {format(new Date(ud.date + 'T00:00:00'), 'MMM d, yyyy')}
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removeUnavailDate(ud.date)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preferred">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Pick Preferred Dates</CardTitle></CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar mode="multiple" selected={prefDates} onSelect={handlePrefSelect} className="pointer-events-auto" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Preferred Dates ({doctorPrefDates.length})</CardTitle></CardHeader>
                <CardContent>
                  {doctorPrefDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No preferred dates set.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {doctorPrefDates.map(pd => (
                        <Badge key={pd.date} variant="secondary" className="gap-1 pr-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {format(new Date(pd.date + 'T00:00:00'), 'MMM d, yyyy')}
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removePrefDate(pd.date)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
