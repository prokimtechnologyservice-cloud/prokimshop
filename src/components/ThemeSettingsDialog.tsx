import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTheme, DEFAULT_THEME, type ThemePalette, type ThemeSize } from "@/lib/theme";
import { cn } from "@/lib/utils";

const SIZE_LABELS: Record<ThemeSize, string> = {
  1: "1 ปกติ",
  2: "2 ใหญ่ขึ้น 30%",
  3: "3 ใหญ่ขึ้น 50%",
};

const PALETTES: { id: ThemePalette; label: string; swatch: string }[] = [
  { id: "default", label: "ปกติ", swatch: "bg-primary" },
  { id: "green", label: "พื้นหลังเขียว-ขอบดำ", swatch: "bg-[oklch(0.55_0.15_150)]" },
  { id: "blue", label: "พื้นหลังฟ้า-ขอบขาว", swatch: "bg-[oklch(0.55_0.15_250)]" },
  { id: "yellow", label: "พื้นหลังเหลือง-ขอบดำ", swatch: "bg-[oklch(0.85_0.15_95)]" },
];

export function ThemeSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-gradient-gold">ตั้งค่าธีมเว็บไซต์</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div>
            <div className="text-sm font-medium mb-2">โหมด</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={theme.mode === "dark" ? "default" : "outline"}
                onClick={() => setTheme({ mode: "dark" })}
              >
                โหมดมืด
              </Button>
              <Button
                variant={theme.mode === "light" ? "default" : "outline"}
                onClick={() => setTheme({ mode: "light" })}
              >
                โหมดสว่าง
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">
              ขนาดข้อความ <span className="text-muted-foreground">— {SIZE_LABELS[theme.size]}</span>
            </div>
            <Slider
              min={1}
              max={3}
              step={1}
              value={[theme.size]}
              onValueChange={(v) => setTheme({ size: (v[0] as ThemeSize) ?? 1 })}
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">สีเว็บ</div>
            <div className="grid grid-cols-2 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTheme({ palette: p.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition",
                    theme.palette === p.id ? "border-primary bg-secondary/60" : "border-border hover:bg-secondary/30",
                  )}
                >
                  <span className={cn("h-4 w-4 rounded-full border border-border shrink-0", p.swatch)} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => setTheme(DEFAULT_THEME)}>
            รีเซ็ตเป็นค่าเริ่มต้น
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
