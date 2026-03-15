import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Users } from 'lucide-react';
import { Doctor, DOCTOR_COLORS } from '@/lib/types';
import { loadDoctors, saveDoctors } from '@/lib/store';
import { toast } from 'sonner';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [name, setName] = useState('');
  const [weekdayQuota, setWeekdayQuota] = useState(4);
  const [weekendQuota, setWeekendQuota] = useState(2);

  useEffect(() => {
    setDoctors(loadDoctors());
  }, []);

  const addDoctor = () => {
    if (!name.trim()) {
      toast.error('Please enter a doctor name');
      return;
    }
    if (doctors.length >= 7) {
      toast.error('Maximum 7 doctors allowed');
      return;
    }

    const newDoctor: Doctor = {
      id: crypto.randomUUID(),
      name: name.trim(),
      weekdayQuota,
      weekendQuota,
      colorIndex: doctors.length,
    };

    const updated = [...doctors, newDoctor];
    setDoctors(updated);
    saveDoctors(updated);
    setName('');
    toast.success(`Dr. ${newDoctor.name} added`);
  };

  const removeDoctor = (id: string) => {
    const updated = doctors.filter(d => d.id !== id);
    // Reassign color indices
    updated.forEach((d, i) => (d.colorIndex = i));
    setDoctors(updated);
    saveDoctors(updated);
    toast.success('Doctor removed');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Doctor Setup
        </h1>
        <p className="text-muted-foreground mt-1">
          Add up to 7 doctors and configure their shift quotas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Doctor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Dr. Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDoctor()}
              />
            </div>
            <div className="space-y-2">
              <Label>Weekday Quota</Label>
              <Input
                type="number"
                min={0}
                max={22}
                value={weekdayQuota}
                onChange={e => setWeekdayQuota(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Weekend Quota</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={weekendQuota}
                onChange={e => setWeekendQuota(Number(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={addDoctor} disabled={doctors.length >= 7} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Doctor ({doctors.length}/7)
          </Button>
        </CardContent>
      </Card>

      {doctors.length > 0 && (
        <div className="space-y-3">
          {doctors.map(doc => (
            <Card key={doc.id} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: DOCTOR_COLORS[doc.colorIndex] + '22',
                    color: DOCTOR_COLORS[doc.colorIndex],
                  }}
                >
                  {doc.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Weekday: {doc.weekdayQuota} shifts · Weekend: {doc.weekendQuota} shifts
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDoctor(doc.id)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
