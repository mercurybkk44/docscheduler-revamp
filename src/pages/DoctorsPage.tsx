import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Users, Pencil } from "lucide-react";
import { Doctor, DOCTOR_COLORS } from "@/lib/types";
import { loadDoctors, saveDoctor, updateDoctor, deleteDoctor } from "@/lib/store";
import { toast } from "sonner";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [name, setName] = useState("");
  const [weekdayQuota, setWeekdayQuota] = useState(2);
  const [weekendQuota, setWeekendQuota] = useState(2);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [editName, setEditName] = useState("");
  const [editWeekdayQuota, setEditWeekdayQuota] = useState(4);
  const [editWeekendQuota, setEditWeekendQuota] = useState(2);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchDoctors = async () => {
    try {
      const docs = await loadDoctors();
      setDoctors(docs);
    } catch (e) {
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const addDoctor = async () => {
    if (!name.trim()) {
      toast.error("Please enter a doctor name");
      return;
    }
    if (doctors.length >= 7) {
      toast.error("Maximum 7 doctors allowed");
      return;
    }

    try {
      await saveDoctor({
        name: name.trim(),
        weekday_quota: weekdayQuota,
        weekend_quota: weekendQuota,
        color_index: doctors.length,
      });
      setName("");
      await fetchDoctors();
      toast.success("Doctor added");
    } catch (e) {
      toast.error("Failed to add doctor");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoctor(id);
      await fetchDoctors();
      toast.success("Doctor removed");
    } catch (e) {
      toast.error("Failed to remove doctor");
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
      await updateDoctor(editDoctor.id, {
        name: editName.trim(),
        weekday_quota: editWeekdayQuota,
        weekend_quota: editWeekendQuota,
      });
      setEditDialogOpen(false);
      await fetchDoctors();
      toast.success("Doctor updated");
    } catch (e) {
      toast.error("Failed to update doctor");
    }
  };

  if (loading) return <div className="text-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Doctor Setup
        </h1>
        <p className="text-muted-foreground mt-1">Add up to 7 doctors and configure their shift quotas.</p>
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
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDoctor()}
              />
            </div>
            <div className="space-y-2">
              <Label>Weekday Shifts</Label>
              <Input
                type="number"
                min={0}
                max={22}
                value={weekdayQuota}
                onChange={(e) => setWeekdayQuota(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Weekend Shifts</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={weekendQuota}
                onChange={(e) => setWeekendQuota(Number(e.target.value))}
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
          {doctors.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: DOCTOR_COLORS[doc.color_index] + "22",
                    color: DOCTOR_COLORS[doc.color_index],
                  }}
                >
                  {doc.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Weekday: {doc.weekday_quota} shifts · Weekend: {doc.weekend_quota} shifts
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} className="shrink-0">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc.id)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
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
            <DialogTitle>Edit Doctor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weekday Shifts</Label>
                <Input
                  type="number"
                  min={0}
                  max={22}
                  value={editWeekdayQuota}
                  onChange={(e) => setEditWeekdayQuota(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Weekend Shifts</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={editWeekendQuota}
                  onChange={(e) => setEditWeekendQuota(Number(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
