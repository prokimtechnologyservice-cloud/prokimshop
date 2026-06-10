import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteContentRow = {
  key: string;
  value: string | null;
  type: string;
  label: string | null;
};

export function useSiteContent() {
  const [map, setMap] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_content").select("*");
      const m: Record<string, string> = {};
      ((data as SiteContentRow[]) ?? []).forEach((r) => {
        m[r.key] = r.value ?? "";
      });
      setMap(m);
      setLoaded(true);
    })();

    function onPreview(e: Event) {
      const next = (e as CustomEvent<Record<string, string>>).detail;
      if (next) setMap((current) => ({ ...current, ...next }));
    }

    window.addEventListener("site-content-preview", onPreview);
    return () => window.removeEventListener("site-content-preview", onPreview);
  }, []);

  return { content: map, loaded };
}

export function sc(map: Record<string, string>, key: string, fallback = "") {
  return map[key] && map[key].length > 0 ? map[key] : fallback;
}

export function scBool(map: Record<string, string>, key: string, fallback = true) {
  if (!(key in map)) return fallback;
  return map[key] === "true";
}
