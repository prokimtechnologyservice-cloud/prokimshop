import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Wallet, Crown, Menu } from "lucide-react";
import { getUser, refreshUser, setUser, type UserSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./AuthDialog";
import { CartSheet } from "./CartSheet";
import { SideMenu } from "./SideMenu";
import { useSiteContent, sc } from "@/lib/siteContent";

export function SiteHeader({ onSelectCategory }: { onSelectCategory?: (id: string) => void }) {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { content } = useSiteContent();

  useEffect(() => {
    setUserState(getUser());
    const onAuth = () => setUserState(getUser());
    window.addEventListener("auth-change", onAuth);

    // ดึงยอดเงินล่าสุดจากฐานข้อมูลทุก 15 วินาที + ตอนกลับมาที่แท็บ
    const tick = () => { refreshUser(); };
    tick();
    const id = setInterval(tick, 15000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("auth-change", onAuth);
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
    };
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-md hover:bg-secondary border border-border/60"
            aria-label="เมนู"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-crimson flex items-center justify-center shadow-luxe">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <div className="leading-none">
              <div className="font-display text-xl font-bold text-gradient-gold">{sc(content, "site_brand", "PROKIM")}</div>
              <div className="text-[10px] tracking-[0.3em] text-muted-foreground">{sc(content, "site_tagline", "LUXE STORE")}</div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
                <Wallet className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium">฿{user.balance.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-md hover:bg-secondary border border-border/60"
                aria-label="ตะกร้า"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </>
          )}
          {!user && (
            <Button onClick={() => setAuthOpen(true)} variant="luxe" size="sm">
              สมัคร
            </Button>
          )}
        </div>
      </div>

      <SideMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onOpenAuth={() => setAuthOpen(true)}
        onSelectCategory={(id) => {
          onSelectCategory?.(id);
          navigate({ to: "/" });
        }}
      />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
