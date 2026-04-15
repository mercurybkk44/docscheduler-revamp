import { useState, useEffect, useMemo } from 'react';
import { format, endOfMonth } from 'date-fns';
import { PartyPopper, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Holiday } from '@/lib/types';
import { loadHolidays, addHoliday, deleteHoliday } from '@/lib/store';
import { getNextMonth, getNextMonthLabel } from '@/lib/nextMonth';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function HolidaysPage() {
  const { t } = useI18n();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  const { month, year } = getNextMonth();
  const monthLabel = getNextMonthLabel();
  const nextMonthStart = useMemo(() => new Date(year, month, 1), [month, year]);
  const nextMonthEnd = useMemo(() => endOfMonth(nextMonthStart), [nextMonthStart]);

  const fetchHolidays = async () => {
    try { setHolidays(await loadHolidays()); }
    catch (e) { toast.error(t('error.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const selectedDates = holidays.map(h => new Date(h.date + 'T00:00:00'));

  const handleSelect = async (dates: Date[] | undefined) => {
    if (!dates) return;
    const newDateStrs = new Set(dates.map(d => format(d, 'yyyy-MM-dd')));
    const existingDateStrs = new Set(holidays.map(h => h.date));
    for (const ds of newDateStrs) { if (!existingDateStrs.has(ds)) { try { await addHoliday(ds); } catch (e) { /* dup */ } } }
    for (const h of holidays) { if (!newDateStrs.has(h.date)) { await deleteHoliday(h.id); } }
    await fetchHolidays();
  };

  const removeHoliday = async (id: string) => {
    try { await deleteHoliday(id); await fetchHolidays(); toast.success(t('holidays.removed')); }
    catch (e) { toast.error(t('error.removeFailed')); }
  };

  const disabledDays = (date: Date) => date < nextMonthStart || date > nextMonthEnd;

  if (loading) return <div className="text-center py-16 text-muted-foreground">{t('common.loading')}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PartyPopper className="h-6 w-6 text-primary" />
          {t('holidays.title')} — {monthLabel}
        </h1>
        <p className="text-muted-foreground mt-1">{t('holidays.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('holidays.selectDates')}</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <Calendar mode="multiple" selected={selectedDates} onSelect={handleSelect} defaultMonth={nextMonthStart} disabled={disabledDays} className="pointer-events-auto" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('holidays.count')} ({holidays.length})</CardTitle></CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('holidays.noHolidays')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {holidays.map(h => (
                  <Badge key={h.id} className="gap-1 pr-1 bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                    {format(new Date(h.date + 'T00:00:00'), 'MMM d, yyyy')}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removeHoliday(h.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
