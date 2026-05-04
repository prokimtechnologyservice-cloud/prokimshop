import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Overlay = {
  id: string;
  page: string;
  label: string | null;
  kind: string; // text | image | button
  content: string | null;
  image_url: string | null;
  href: string | null;
  x: number; y: number; w: number; h: number; rotate: number;
  font_size: number;
  color: string | null;
  bg: string | null;
  z_index: number;
  visible: boolean;
};

export function pageKeyFromPath(path: string): string {
  if (path === "/" || path === "") return "home";
  return path.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "_") || "home";
}

export function useOverlays(page: string) {
  const [items, setItems] = useState<Overlay[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_overlays")
        .select("*")
        .eq("page", page)
        .eq("visible", true);
      setItems((data as Overlay[]) ?? []);
      setLoaded(true);
    })();
  }, [page]);
  return { items, loaded };
}
