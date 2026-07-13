import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RobloxIdDialog({
  open,
  defaultName,
  productName,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  defaultName: string | null | undefined;
  productName: string;
  onConfirm: (robloxName: string) => void;
  onOpenChange: (v: boolean) => void;
}) {
  const [useOther, setUseOther] = useState(false);
  const [other, setOther] = useState("");
  const hasDefault = !!(defaultName && defaultName.trim().length > 0);

  function confirm() {
    const name = useOther || !hasDefault ? other.trim() : (defaultName ?? "").trim();
    if (!name) return;
    onConfirm(name);
    setUseOther(false);
    setOther("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-card border-primary/40">
        <DialogHeader>
          <DialogTitle className="font-display text-gradient-gold">
            ระบุชื่อผู้เล่น Roblox
          </DialogTitle>
          <DialogDescription>
            สำหรับสินค้า <span className="text-gold">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {hasDefault && (
            <label className="flex items-center gap-2 p-3 rounded-lg border border-border bg-onyx/40 cursor-pointer">
              <input
                type="radio"
                checked={!useOther}
                onChange={() => setUseOther(false)}
              />
              <div className="text-sm">
                <div className="font-medium">ใช้ ID ที่สมัคร</div>
                <div className="text-gold">{defaultName}</div>
              </div>
            </label>
          )}
          <label className="flex items-start gap-2 p-3 rounded-lg border border-border bg-onyx/40 cursor-pointer">
            <input
              type="radio"
              checked={useOther || !hasDefault}
              onChange={() => setUseOther(true)}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">ใส่ ID ใหม่</Label>
              <Input
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="เช่น RobloxUser123"
                onFocus={() => setUseOther(true)}
              />
            </div>
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button variant="luxe" onClick={confirm}>
            เพิ่มลงตะกร้า
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
