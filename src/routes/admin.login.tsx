import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import {
  loginStaff,
  setStaff,
  STAFF_GATE_PASSWORD,
  STAFF_GATE_USERNAME,
} from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const nav = useNavigate();
  const [step, setStep] = useState<"gate" | "staff">("gate");
  const [gateUser, setGateUser] = useState("");
  const [gatePwd, setGatePwd] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");

  function checkGate() {
    if (gateUser.trim() === STAFF_GATE_USERNAME && gatePwd === STAFF_GATE_PASSWORD) {
      toast.success("ผ่านด่านแรก กรุณายืนยันข้อมูลพนักงาน");
      setStep("staff");
    } else {
      toast.error("ข้อมูลไม่ถูกต้อง");
    }
  }

  async function doLogin() {
    try {
      await loginStaff(name.trim(), code.trim(), pwd);
      toast.success("เข้าสู่ระบบหลังบ้านสำเร็จ");
      nav({ to: "/admin" });
    } catch (e: any) {
      toast.error(e.message ?? "ไม่สำเร็จ");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-card border border-border rounded-2xl p-8 shadow-luxe">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-crimson flex items-center justify-center shadow-luxe mb-3">
            {step === "gate" ? <Lock className="w-6 h-6 text-gold" /> : <Crown className="w-6 h-6 text-gold" />}
          </div>
          <h1 className="font-display text-2xl text-gradient-gold">
            {step === "gate" ? "หลังบ้าน PROKIM" : "ยืนยันพนักงาน"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {step === "gate" ? "กรุณาระบุรหัสเข้าระบบ" : "ระบุข้อมูลพนักงาน 3 อย่าง"}
          </p>
        </div>

        {step === "gate" ? (
          <div className="space-y-3">
            <div>
              <Label>ชื่อผู้ใช้</Label>
              <Input value={gateUser} onChange={(e) => setGateUser(e.target.value)} />
            </div>
            <div>
              <Label>รหัสผ่าน</Label>
              <Input type="password" value={gatePwd} onChange={(e) => setGatePwd(e.target.value)} />
            </div>
            <Button onClick={checkGate} variant="luxe" className="w-full">เข้าสู่ระบบ</Button>
            <button onClick={goStaffStep} className="w-full text-xs text-muted-foreground hover:text-gold underline">
              เข้าด้วยรหัสพนักงาน (สำหรับทีมงาน)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>ชื่อพนักงาน</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Yok" />
            </div>
            <div>
              <Label>รหัสประจำตัว</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="AM-1212" />
            </div>
            <div>
              <Label>รหัสผ่าน</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <Button onClick={doLogin} variant="luxe" className="w-full">เข้าสู่ระบบ</Button>
          </div>
        )}
      </div>
    </div>
  );
}
