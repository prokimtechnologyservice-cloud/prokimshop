import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Save, RefreshCw } from "lucide-react";

type Settings = {
  stats_manual: boolean;
  stat_online: number;
  stat_users: number;
  stat_topup: number;
  stat_sold: number;
};

const defaults: Settings = { stats_manual: false, stat_online: 0, stat_users: 0, stat_topup: 0, stat_sold: 0 };

export function PublicStatsManager() {
  const staff = getStaff();
  const isManager = staff?.role === "manager";

  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("site_settings")
      .select("stats_manual, stat_online, stat_users, stat_topup, stat_sold")
      .eq("id", 1)
      .maybeSingle();
    if (data) {
      setSettings({
        stats_manual: (data as any).stats_manual ?? false,
        stat_online: (data as any).stat_online ?? 0,
        stat_users: (data as any).stat_users ?? 0,
        stat_topup: (data as any).stat_topup ?? 0,
        stat_sold: (data as any).stat_sold ?? 0,
      });
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!isManager) return;
    setLoading(true);
    const { error } = await supabase.from("site_settings").update(settings).eq("id", 1);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("บันทึกแล้ว");
  }

  const field = (
    key: keyof Omit<Settings, "stats_manual">,
    label: string
  ) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="number"
        disabled={!isManager}
        value={settings[key]}
        onChange={(e) => setSettings((s) => ({ ...s, [key]: Number(e.target.value) }))}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>สถิติสาธารณะ (หน้าแรก)</span>
          {!isManager && (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> เฉพาะผู้จัดการ
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch
            checked={settings.stats_manual}
            disabled={!isManager}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, stats_manual: v }))}
          />
          <div>
            <p className="text-sm font-medium">กำหนดค่าสถิติเอง (Manual)</p>
            <p className="text-xs text-muted-foreground">เมื่อเปิด จะแสดงตัวเลขที่กำหนดไว้ด้านล่างแทนค่าที่คำนวณอัตโนมัติ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {field("stat_online", "ผู้ใช้ออนไลน์")}
          {field("stat_users", "จำนวนสมาชิก")}
          {field("stat_topup", "ยอดเติมเงิน")}
          {field("stat_sold", "สินค้าที่ขายแล้ว")}
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={!isManager || loading}>
            <Save className="mr-1 h-4 w-4" /> บันทึก
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="mr-1 h-4 w-4" /> โหลดใหม่
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
