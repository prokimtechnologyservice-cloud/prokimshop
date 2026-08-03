import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Crown, X } from "lucide-react";

type Popup = {
  id: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  href: string | null;
  active: boolean;
  updated_at: string;
};

const STORAGE_KEY = "site-popup-dismiss";

function isDismissed(p: Popup) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { popupId, updatedAt, until } = JSON.parse(raw);
    if (popupId !== p.id || updatedAt !== p.updated_at) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

function dismissFor1Day(p: Popup) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      popupId: p.id,
      updatedAt: p.updated_at,
      until: Date.now() + 24 * 60 * 60 * 1000,
    }),
  );
}

export function SitePopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_popups")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      const p = ((data as any[]) ?? [])[0] as Popup | undefined;
      if (p && !isDismissed(p)) {
        setPopup(p);
        setOpen(true);
      }
    })();
  }, []);

  function close() {
    if (popup && dontShow) dismissFor1Day(popup);
    setOpen(false);
  }

  function handleClick() {
    if (!popup?.href) return;
    if (/^https?:\/\//.test(popup.href)) {
      window.open(popup.href, "_blank", "noopener,noreferrer");
    } else {
      navigate({ to: popup.href as any });
    }
    close();
  }

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 overflow-hidden bg-gradient-card border-primary/40">
        <button
          onClick={close}
          className="absolute top-2 right-2 z-10 rounded-full bg-onyx/70 p-1.5 text-foreground hover:bg-onyx"
          aria-label="ปิด"
        >
          <X className="w-4 h-4" />
        </button>
        <div
          className={`w-full ${popup.href ? "cursor-pointer" : ""}`}
          onClick={popup.href ? handleClick : undefined}
        >
          <div className="aspect-square w-full bg-onyx">
            {popup.image_url ? (
              <img src={popup.image_url} alt={popup.title ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Crown className="w-16 h-16 text-primary/30" />
              </div>
            )}
          </div>
          <div className="p-4 space-y-2">
            {popup.title && <h3 className="font-display text-xl text-gradient-gold">{popup.title}</h3>}
            {popup.body && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{popup.body}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 pb-4">
          <Checkbox
            id="popup-dismiss"
            checked={dontShow}
            onCheckedChange={(v) => setDontShow(!!v)}
          />
          <Label htmlFor="popup-dismiss" className="text-xs text-muted-foreground cursor-pointer">
            ไม่แสดงอีก 1 วัน
          </Label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
