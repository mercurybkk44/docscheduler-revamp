import { useState, useEffect, useMemo } from 'react';
import { format, endOfMonth } from 'date-fns';
import { CalendarOff, X, Star, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Doctor, DOCTOR_COLORS, DOCTOR_EMOJIS } from '@/lib/types';
import { loadDoctors, loadUnavailableDates, setUnavailableDates, loadPreferredDates, setPreferredDates } from '@/lib/store';
import { getNextMonth, getNextMonthLabel } from '@/lib/nextMonth';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function UnavailablePage() {
  const { t } = useI18n();
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
        toast.error(t('error.loadFailed'));
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
      toast.error(t('error.saveFailed'));
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
      toast.error(t('error.saveFailed'));
    }
  };

  const removeUnavailDate = async (dateStr: string) => {
    const updated = unavailable.filter(u => !(u.doctor_id === selectedDoctorId && u.date === dateStr));
    const doctorDates = updated.filter(u => u.doctor_id === selectedDoctorId).map(u => u.date);
    try {
      await setUnavailableDates(selectedDoctorId, doctorDates);
      setUnavailable(updated);
      toast.success(t('avail.dateRemoved'));
    } catch (e) {
      toast.error(t('error.removeFailed'));
    }
  };

  const removePrefDate = async (dateStr: string) => {
    const updated = preferred.filter(p => !(p.doctor_id === selectedDoctorId && p.date === dateStr));
    const doctorDates = updated.filter(p => p.doctor_id === selectedDoctorId).map(p => p.date);
    try {
      await setPreferredDates(selectedDoctorId, doctorDates);
      setPreferred(updated);
      toast.success(t('avail.dateRemoved'));
    } catch (e) {
      toast.error(t('error.removeFailed'));
    }
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const doctorUnavailDates = unavailable.filter(u => u.doctor_id === selectedDoctorId).sort((a, b) => a.date.localeCompare(b.date));
  const doctorPrefDates = preferred.filter(p => p.doctor_id === selectedDoctorId).sort((a, b) => a.date.localeCompare(b.date));

  const totalWeekdays = useMemo(() => {
    let count = 0;
    const d = new Date(nextMonthStart);
    while (d <= nextMonthEnd) { if (d.getDay() !== 0 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
    return count;
  }, [nextMonthStart, nextMonthEnd]);

  const totalWeekendDays = useMemo(() => {
    let count = 0;
    const d = new Date(nextMonthStart);
    while (d <= nextMonthEnd) { if (d.getDay() === 0 || d.getDay() === 6) count++; d.setDate(d.getDate() + 1); }
    return count;
  }, [nextMonthStart, nextMonthEnd]);

  const disabledDays = (date: Date) => date < nextMonthStart || date > nextMonthEnd;

  if (loading) return <div className="text-center py-16 text-muted-foreground">{t('common.loading')}</div>;

  if (doctors.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('doctors.noDoctors')}</h2>
        <p className="text-muted-foreground">{t('doctors.addFirst')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-primary" />
          {t('avail.title')} — {monthLabel}
        </h1>
        <p className="text-muted-foreground mt-1">{t('avail.subtitle')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('avail.selectDoctor')}</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t('avail.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(doc => (
                <SelectItem key={doc.id} value={doc.id}>
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{DOCTOR_EMOJIS[doc.color_index]}</span>
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
                  {selectedDoctor.name} — {t('avail.quotaSummary')}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>{t('avail.weekdayShifts')}: <strong className="text-foreground">{selectedDoctor.weekday_quota}</strong> <span className="text-xs">/ {totalWeekdays} {t('avail.weekdays')}</span></span>
                  <span>{t('avail.weekendShifts')}: <strong className="text-foreground">{selectedDoctor.weekend_quota}</strong> <span className="text-xs">/ {totalWeekendDays} {t('avail.weekendDays')}</span></span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('avail.helpText').replace('{unavail}', t('avail.markUnavail')).replace('{pref}', t('avail.markPref'))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-destructive" />
                {t('avail.unavailTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Calendar mode="multiple" selected={unavailDates} onSelect={handleUnavailSelect} defaultMonth={nextMonthStart} disabled={disabledDays} className="pointer-events-auto" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{t('common.selected')} ({doctorUnavailDates.length})</p>
                  {doctorUnavailDates.length > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={async () => {
                        try { await setUnavailableDates(selectedDoctorId, []); setUnavailable(prev => prev.filter(u => u.doctor_id !== selectedDoctorId)); toast.success(t('avail.allUnavailCleared')); }
                        catch { toast.error(t('error.clearFailed')); }
                      }}>{t('common.clearAll')}</Button>
                  )}
                </div>
                {doctorUnavailDates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('avail.noUnavail')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {doctorUnavailDates.map(ud => (
                      <Badge key={ud.date} variant="secondary" className="gap-1 pr-1">
                        {format(new Date(ud.date + 'T00:00:00'), 'MMM d')}
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removeUnavailDate(ud.date)}><X className="h-3 w-3" /></Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                {t('avail.prefTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Calendar mode="multiple" selected={prefDates} onSelect={handlePrefSelect} defaultMonth={nextMonthStart} disabled={disabledDays} className="pointer-events-auto" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{t('common.selected')} ({doctorPrefDates.length})</p>
                  {doctorPrefDates.length > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs text-yellow-600 border-yellow-400/30 hover:bg-yellow-50"
                      onClick={async () => {
                        try { await setPreferredDates(selectedDoctorId, []); setPreferred(prev => prev.filter(p => p.doctor_id !== selectedDoctorId)); toast.success(t('avail.allPrefCleared')); }
                        catch { toast.error(t('error.clearFailed')); }
                      }}>{t('common.clearAll')}</Button>
                  )}
                </div>
                {doctorPrefDates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('avail.noPref')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {doctorPrefDates.map(pd => (
                      <Badge key={pd.date} variant="secondary" className="gap-1 pr-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {format(new Date(pd.date + 'T00:00:00'), 'MMM d')}
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removePrefDate(pd.date)}><X className="h-3 w-3" /></Button>
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
