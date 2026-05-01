import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Bell, User, Wallet, LogOut, Crown } from "lucide-react";
import { getUser, setUser, type UserSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./AuthDialog";
import { AnnouncementsDialog } from "./AnnouncementsDialog";
import { CartSheet } from "./CartSheet";

export function SiteHeader() {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [annOpen, setAnnOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setUserState(getUser());
    const onAuth = () => setUserState(getUser());
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  useEffect(() => {
    async function loadCount() {
      const u = getUser();
      if (!u) return setCartCount(0);
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.id);
      setCartCount(count ?? 0);
    }
    loadCount();
    const refresh = () => loadCount();
    window.addEventListener("cart-change", refresh);
    window.addEventListener("auth-change", refresh);
    return () => {
      window.removeEventListener("cart-change", refresh);
      window.removeEventListener("auth-change", refresh);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-crimson flex items-center justify-center shadow-luxe">
            <Crown className="w-5 h-5 text-gold" />
          </div>
          <div className="leading-none">
            <div className="font-display text-xl font-bold text-gradient-gold">PROKIM</div>
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground">LUXE STORE</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" className="hover:text-gold transition">หน้าร้าน</Link>
          <Link to="/history" className="hover:text-gold transition">ประวัติการซื้อ</Link>
          <button onClick={() => setAnnOpen(true)} className="hover:text-gold transition flex items-center gap-1">
            <Bell className="w-4 h-4" /> ประกาศ
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
                <Wallet className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium">฿{user.balance.toFixed(2)}</span>
              </div>
              <button onClick={() => setCartOpen(true)} className="relative p-2 rounded-md hover:bg-secondary">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-sm pl-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{user.username}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setUser(null); navigate({ to: "/" }); }} title="ออกจากระบบ">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => setAuthOpen(true)} variant="luxe">
              เข้าสู่ระบบ
            </Button>
          )}
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <AnnouncementsDialog open={annOpen} onOpenChange={setAnnOpen} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
