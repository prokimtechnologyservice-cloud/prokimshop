import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { ShieldAlert } from "lucide-react";

export type FarmDetails = {
  farm_account_name: string;
  farm_account_password: string;
};

export function FarmDialog({
  open,
  productName,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  productName: string;
  onConfirm: (details: FarmDetails) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [accountName, setAccountName] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState([false, false, false]);

  function reset() {
    setAccountName("");
    setPassword("");
    setChecked([false, false, false]);
  }

  function confirm() {
    const name = accountName.trim();
    if (!name || !password.trim() || checked.some((value) => !value)) return;
    onConfirm({ farm_account_name: name, farm_account_password: password });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) reset(); onOpenChange(value); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-gradient-gold">รายละเอียดงานฟาร์ม</DialogTitle>
          <DialogDescription>สินค้า: {productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2 text-destructive">
            <div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />โปรดอ่านเงื่อนไขก่อนสั่งซื้อ</div>
            <p>ใช้ระยะเวลาฟาร์มตั้งแต่ 1 วัน - 1 เดือนตามงาน</p>
            <p>⛔ ปิดระบบความปลอดภัยชั่วคราว: รบกวนลูกค้าปิดยืนยันสองขั้นตอน (2FA/Authenticator) ชั่วคราว เพื่อความสะดวกรวดเร็วในการเข้าไอดี</p>
            <p>🚫 ห้ามเข้าซ้อน: ระหว่างที่ช่างกำลังฟาร์ม ห้ามลูกค้าเข้าไอดีเด็ดขาด หากเข้าซ้อนแล้วหลุด ทางร้านไม่รับผิดชอบระยะเวลาที่ล่าช้า หากซ้อนเกิน 2 ครั้ง ขอยกเลิกงานและไม่คืนเงิน</p>
            <p>🔄️ เปลี่ยนรหัสผ่าน: หลังจากงานเสร็จสิ้น แนะนำให้ลูกค้าเปลี่ยนรหัสผ่านทันทีเพื่อความสบายใจของทั้งสองฝ่าย</p>
          </div>

          <div className="space-y-2">
            <div><Label htmlFor="farm-account-name">ชื่อไอดี (ตรง @)</Label><Input id="farm-account-name" value={accountName} onChange={(event) => setAccountName(event.target.value)} maxLength={100} placeholder="ชื่อไอดี Roblox" /></div>
            <div><Label htmlFor="farm-account-password">รหัสผ่าน</Label><PasswordInput id="farm-account-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={200} autoComplete="off" /></div>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            {[
              "ตรวจสอบชื่อและรหัสแล้ว",
              "ปิด 2FA แล้ว",
              "ยอมรับเงื่อนไขการบริการตามที่ร้านกำหนด",
            ].map((label, index) => (
              <label key={label} className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={checked[index]} onCheckedChange={(value) => setChecked((current) => current.map((item, itemIndex) => itemIndex === index ? value === true : item))} />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button variant="luxe" onClick={confirm} disabled={!accountName.trim() || !password.trim() || checked.some((value) => !value)}>ยืนยันและใส่ตะกร้า</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
