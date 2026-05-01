import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginUser, signupUser } from "@/lib/auth";
import { toast } from "sonner";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  // login fields
  const [lUser, setLUser] = useState("");
  const [lPwd, setLPwd] = useState("");
  // signup fields
  const [sUser, setSUser] = useState("");
  const [sPwd, setSPwd] = useState("");
  const [sRoblox, setSRoblox] = useState("");

  async function doLogin() {
    setLoading(true);
    try {
      await loginUser(lUser.trim(), lPwd);
      toast.success("เข้าสู่ระบบสำเร็จ");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function doSignup() {
    if (!sUser.trim() || !sPwd || !sRoblox.trim()) {
      toast.error("กรอกให้ครบทุกช่อง");
      return;
    }
    setLoading(true);
    try {
      await signupUser(sUser.trim(), sPwd, sRoblox.trim());
      toast.success("สมัครสำเร็จ");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "สมัครไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-gradient-gold">
            ยินดีต้อนรับสู่ PROKIM
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
            <TabsTrigger value="signup">สมัครสมาชิก</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-3 pt-2">
            <div>
              <Label>ชื่อผู้ใช้</Label>
              <Input value={lUser} onChange={(e) => setLUser(e.target.value)} />
            </div>
            <div>
              <Label>รหัสผ่าน</Label>
              <Input type="password" value={lPwd} onChange={(e) => setLPwd(e.target.value)} />
            </div>
            <Button onClick={doLogin} disabled={loading} variant="luxe" className="w-full">
              เข้าสู่ระบบ
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3 pt-2">
            <div>
              <Label>ชื่อผู้ใช้</Label>
              <Input value={sUser} onChange={(e) => setSUser(e.target.value)} />
            </div>
            <div>
              <Label>รหัสผ่าน</Label>
              <Input type="password" value={sPwd} onChange={(e) => setSPwd(e.target.value)} />
            </div>
            <div>
              <Label>ชื่อ Roblox</Label>
              <Input value={sRoblox} onChange={(e) => setSRoblox(e.target.value)} />
            </div>
            <Button onClick={doSignup} disabled={loading} variant="luxe" className="w-full">
              สมัครสมาชิก
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
