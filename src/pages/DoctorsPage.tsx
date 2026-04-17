import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Users, Pencil } from "lucide-react";
import { Doctor, DOCTOR_COLORS, DOCTOR_EMOJIS } from "@/lib/types";
import { loadDoctors, saveDoctor, updateDoctor, deleteDoctor } from "@/lib/store";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export default function DoctorsPage() {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [name, setName] = useState("");
  const [weekdayQuota, setWeekdayQuota] = useState(2);
  const [weekendQuota, setWeekendQuota] = useState(2);
  const [loading, setLoading] = useState(true);

  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [editName, setEditName] = useState("");
  const [editWeekdayQuota, setEditWeekdayQuota] = useState(4);
  const [editWeekendQuota, setEditWeekendQuota] = useState(2);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchDoctors = async () => {
    try {
      const docs = await loadDoctors();
      setDoctors(docs);
    } catch {
      toast.error(t('error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const addDoctor = async () => {
    if (!name.trim()) { toast.error(t('doctors.enterName')); return; }
    if (doctors.length >= 7) { toast.error(t('doctors.maxReached')); return; }
    try {
      await saveDoctor({ name: name.trim(), weekday_quota: weekdayQuota, weekend_quota: weekendQuota, color_index: doctors.length });
      setName("");
      await fetchDoctors();
      toast.success(`${DOCTOR_EMOJIS[doctors.length]} ${t('doctors.added')}`);
    } catch {
      toast.error(t('error.saveFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoctor(id);
      await fetchDoctors();
      toast.success(t('doctors.removed'));
    } catch {
      toast.error(t('error.removeFailed'));
    }
  };

  const openEdit = (doc: Doctor) => {
    setEditDoctor(doc);
    setEditName(doc.name);
    setEditWeekdayQuota(doc.weekday_quota);
    setEditWeekendQuota(doc.weekend_quota);
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editDoctor || !editName.trim()) return;
    try {
      await updateDoctor(editDoctor.id, { name: editName.trim(), weekday_quota: editWeekdayQuota, weekend_quota: editWeekendQuota });
      setEditDialogOpen(false);
      await fetchDoctors();
      toast.success(t('doctors.updated'));
    } catch {
      toast.error(t('error.saveFailed'));
    }
  };

  if (loading) return <div className="text-center py-16 text-muted-foreground">{t('common.loading')}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          {t('doctors.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('doctors.subtitle')}</p>
      </div>

      {/* Next emoji preview */}
      {doctors.length < 7 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <span className="text-xl">{DOCTOR_EMOJIS[doctors.length]}</span>
          <span>{t('doctors.addNew')} #{doctors.length + 1}</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">{t('doctors.addNew')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('doctors.name')}</Label>
              <Input
                placeholder={t('doctors.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDoctor()}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('doctors.weekdayShifts')}</Label>
              <Input type="number" min={0} max={22} value={weekdayQuota} onChange={(e) => setWeekdayQuota(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>{t('doctors.weekendShifts')}</Label>
              <Input type="number" min={0} max={10} value={weekendQuota} onChange={(e) => setWeekendQuota(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={addDoctor} disabled={doctors.length >= 7} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('doctors.addButton')} ({doctors.length}/7)
          </Button>
        </CardContent>
      </Card>

      {doctors.length > 0 && (
        <div className="space-y-3">
          {doctors.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              {/* Color strip */}
              <div className="h-1" style={{ backgroundColor: DOCTOR_COLORS[doc.color_index] }} />
              <div className="flex items-center gap-3 p-4">
                {/* Emoji avatar */}
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: DOCTOR_COLORS[doc.color_index] + '18' }}
                >
                  {DOCTOR_EMOJIS[doc.color_index]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('doctors.weekdayLabel')}: <strong>{doc.weekday_quota}</strong> {t('doctors.shifts')} · {t('doctors.weekendLabel')}: <strong>{doc.weekend_quota}</strong> {t('doctors.shifts')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-destructive hover:text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editDoctor && <span className="text-xl">{DOCTOR_EMOJIS[editDoctor.color_index]}</span>}
              {t('doctors.editTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t('doctors.name')}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('doctors.weekdayShifts')}</Label>
                <Input type="number" min={0} max={22} value={editWeekdayQuota} onChange={(e) => setEditWeekdayQuota(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{t('doctors.weekendShifts')}</Label>
                <Input type="number" min={0} max={10} value={editWeekendQuota} onChange={(e) => setEditWeekendQuota(Number(e.target.value))} />
              </div>
            </div>
            <Button onClick={handleUpdate} className="w-full">{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
