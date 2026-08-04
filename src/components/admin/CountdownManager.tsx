import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save, Clock } from "lucide-react";
import {
  Countdown,
  createCountdown,
  deleteCountdown,
  formatRemaining,
  listCountdowns,
  updateCountdown,
} from "@/lib/countdowns";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CountdownManager() {
  const [items, setItems] = useState<Countdown[]>([]);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);

  const [nTitle, setNTitle] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nEndsAt, setNEndsAt] = useState("");
  const [nActive, setNActive] = useState(true);

  async function load() {
    try {
      setItems(await listCountdowns());
    } catch (e: any) {
      toast.error("โหลดไม่สำเร็จ: " + e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function add() {
    if (!nTitle.trim() || !nEndsAt) return toast.error("กรอกหัวข้อและเวลาสิ้นสุด");
    setLoading(true);
    try {
      await createCountdown({
        title: nTitle.trim(),
        description: nDesc || null,
        ends_at: new Date(nEndsAt).toISOString(),
        active: nActive,
      });
      setNTitle("");
      setNDesc("");
      setNEndsAt("");
      setNActive(true);
      toast.success("เพิ่มนับถอยหลังแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveItem(c: Countdown) {
    try {
      await updateCountdown(c.id, {
        title: c.title,
        description: c.description,
        ends_at: c.ends_at,
        active: c.active,
      });
      toast.success("บันทึกแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("ลบนับถอยหลังนี้?")) return;
    try {
      await deleteCountdown(id);
      toast.success("ลบแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function patch(id: string, patch: Partial<Countdown>) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">เพิ่มตัวนับถอยหลังใหม่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>หัวข้อ</Label>
              <Input value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder="เช่น โปรโมชั่นสิ้นสุด" />
            </div>
            <div className="space-y-1">
              <Label>วันเวลาสิ้นสุด</Label>
              <Input type="datetime-local" value={nEndsAt} onChange={(e) => setNEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>คำอธิบาย</Label>
            <Textarea value={nDesc} onChange={(e) => setNDesc(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={nActive} onCheckedChange={setNActive} />
            <span className="text-sm">เปิดใช้งาน</span>
          </div>
          <Button onClick={add} disabled={loading}>
            <Plus className="mr-1 h-4 w-4" /> เพิ่ม
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีตัวนับถอยหลัง</p>}
        {items.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-3 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>หัวข้อ</Label>
                  <Input value={c.title} onChange={(e) => patch(c.id, { title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>วันเวลาสิ้นสุด</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(c.ends_at)}
                    onChange={(e) => patch(c.id, { ends_at: new Date(e.target.value).toISOString() })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>คำอธิบาย</Label>
                <Textarea
                  value={c.description ?? ""}
                  onChange={(e) => patch(c.id, { description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={c.active} onCheckedChange={(v) => patch(c.id, { active: v })} />
                  <span className="text-sm">เปิดใช้งาน</span>
                </div>
                <div key={tick} className="flex items-center gap-1 text-sm font-medium text-primary">
                  <Clock className="h-4 w-4" /> เหลือ: {formatRemaining(c.ends_at)}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveItem(c)}>
                    <Save className="mr-1 h-4 w-4" /> บันทึก
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> ลบ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
