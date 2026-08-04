import { useEffect, useState } from "react";
import { getStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Save, Copy, Download } from "lucide-react";
import {
  TEMPLATE_SPECS,
  TPL_KEYS,
  exportGuidelineText,
  loadTemplateSettings,
  saveTemplateSettings,
  specToText,
} from "@/lib/templates";

const SHADOW_OPTIONS = ["none", "sm", "md", "lg", "xl"];

export function TemplateCustomizer() {
  const staff = getStaff();
  const isManager = staff?.role === "manager";

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setValues(await loadTemplateSettings());
    } catch (e: any) {
      toast.error("โหลดไม่สำเร็จ: " + e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  async function saveSection(keys: string[]) {
    setLoading(true);
    try {
      const partial: Record<string, string> = {};
      keys.forEach((k) => (partial[k] = values[k] ?? ""));
      await saveTemplateSettings(partial);
      toast.success("บันทึกแล้ว");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("คัดลอกแล้ว");
  }

  function exportGuideline() {
    const text = exportGuidelineText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prokim-template-guideline.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Product block style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สไตล์กล่องสินค้า</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <ColorField label="สีพื้นหลัง" value={values[TPL_KEYS.productBg] ?? ""} onChange={(v) => set(TPL_KEYS.productBg, v)} />
            <ColorField label="สีขอบ" value={values[TPL_KEYS.productBorder] ?? ""} onChange={(v) => set(TPL_KEYS.productBorder, v)} />
            <div className="space-y-1">
              <Label>ความโค้งมุม (px)</Label>
              <Input value={values[TPL_KEYS.productRadius] ?? ""} onChange={(e) => set(TPL_KEYS.productRadius, e.target.value)} placeholder="12" />
            </div>
            <div className="space-y-1">
              <Label>เงา</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={values[TPL_KEYS.productShadow] ?? "sm"}
                onChange={(e) => set(TPL_KEYS.productShadow, e.target.value)}
              >
                {SHADOW_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <Button size="sm" onClick={() => saveSection([TPL_KEYS.productBg, TPL_KEYS.productBorder, TPL_KEYS.productRadius, TPL_KEYS.productShadow])} disabled={loading}>
            <Save className="mr-1 h-4 w-4" /> บันทึก
          </Button>
        </CardContent>
      </Card>

      {/* Buy button style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สไตล์ปุ่มซื้อ / เพิ่มลงตะกร้า</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <ColorField label="สีพื้นหลัง" value={values[TPL_KEYS.buyBg] ?? ""} onChange={(v) => set(TPL_KEYS.buyBg, v)} />
            <ColorField label="สีตัวอักษร" value={values[TPL_KEYS.buyText] ?? ""} onChange={(v) => set(TPL_KEYS.buyText, v)} />
            <div className="space-y-1">
              <Label>ความโค้งมุม (px)</Label>
              <Input value={values[TPL_KEYS.buyRadius] ?? ""} onChange={(e) => set(TPL_KEYS.buyRadius, e.target.value)} placeholder="8" />
            </div>
          </div>
          <Button size="sm" onClick={() => saveSection([TPL_KEYS.buyBg, TPL_KEYS.buyText, TPL_KEYS.buyRadius])} disabled={loading}>
            <Save className="mr-1 h-4 w-4" /> บันทึก
          </Button>
        </CardContent>
      </Card>

      {/* Mystery box block style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สไตล์กล่องสุ่ม (Mystery Box)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <ColorField label="สีพื้นหลัง" value={values[TPL_KEYS.boxBg] ?? ""} onChange={(v) => set(TPL_KEYS.boxBg, v)} />
            <ColorField label="สีขอบ" value={values[TPL_KEYS.boxBorder] ?? ""} onChange={(v) => set(TPL_KEYS.boxBorder, v)} />
            <div className="space-y-1">
              <Label>ความโค้งมุม (px)</Label>
              <Input value={values[TPL_KEYS.boxRadius] ?? ""} onChange={(e) => set(TPL_KEYS.boxRadius, e.target.value)} placeholder="16" />
            </div>
            <div className="space-y-1">
              <Label>เงา</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={values[TPL_KEYS.boxShadow] ?? "md"}
                onChange={(e) => set(TPL_KEYS.boxShadow, e.target.value)}
              >
                {SHADOW_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <Button size="sm" onClick={() => saveSection([TPL_KEYS.boxBg, TPL_KEYS.boxBorder, TPL_KEYS.boxRadius, TPL_KEYS.boxShadow])} disabled={loading}>
            <Save className="mr-1 h-4 w-4" /> บันทึก
          </Button>
        </CardContent>
      </Card>

      {/* Main site background - manager only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>พื้นหลังหลักของเว็บไซต์</span>
            {!isManager && (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> เฉพาะผู้จัดการเท่านั้นที่แก้ไขได้
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>URL รูปพื้นหลัง</Label>
              <Input
                disabled={!isManager}
                value={values[TPL_KEYS.mainBgImage] ?? ""}
                onChange={(e) => set(TPL_KEYS.mainBgImage, e.target.value)}
                placeholder="https://... (แนะนำ 1920x1080)"
              />
            </div>
            <ColorField
              label="สีพื้นหลัง (สำรอง)"
              value={values[TPL_KEYS.mainBgColor] ?? ""}
              onChange={(v) => set(TPL_KEYS.mainBgColor, v)}
              disabled={!isManager}
            />
          </div>
          <Button
            size="sm"
            onClick={() => saveSection([TPL_KEYS.mainBgImage, TPL_KEYS.mainBgColor])}
            disabled={!isManager || loading}
          >
            <Save className="mr-1 h-4 w-4" /> บันทึก
          </Button>
        </CardContent>
      </Card>

      {/* Guideline table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>คู่มือขนาดรูปมาตรฐาน</span>
            <Button size="sm" variant="outline" onClick={exportGuideline}>
              <Download className="mr-1 h-4 w-4" /> Export Guideline (.txt)
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">รายการ</th>
                  <th className="py-2">ขนาด</th>
                  <th className="py-2">อัตราส่วน</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATE_SPECS.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2">{s.label}</td>
                    <td className="py-2">{s.width}x{s.height}px</td>
                    <td className="py-2">{s.ratio}</td>
                    <td className="py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => copyText(specToText(s))}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> คัดลอก
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          disabled={disabled}
          className="h-9 w-12 p-1"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#ffffff" />
      </div>
    </div>
  );
}
