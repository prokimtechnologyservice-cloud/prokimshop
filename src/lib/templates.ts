import { supabase } from "@/integrations/supabase/client";

// ===== site_content keys used by the template customizer (prefix tpl_) =====
export const TPL_KEYS = {
  productBg: "tpl_product_bg_color",
  productBorder: "tpl_product_border_color",
  productRadius: "tpl_product_radius",
  productShadow: "tpl_product_shadow",

  buyBg: "tpl_buy_bg_color",
  buyText: "tpl_buy_text_color",
  buyRadius: "tpl_buy_radius",

  boxBg: "tpl_box_bg_color",
  boxBorder: "tpl_box_border_color",
  boxRadius: "tpl_box_radius",
  boxShadow: "tpl_box_shadow",

  mainBgImage: "tpl_main_bg_image",
  mainBgColor: "tpl_main_bg_color",
} as const;

export type TplKey = (typeof TPL_KEYS)[keyof typeof TPL_KEYS];

export async function loadTemplateSettings(): Promise<Record<string, string>> {
  const keys = Object.values(TPL_KEYS);
  const { data, error } = await supabase.from("site_content").select("*").in("key", keys as string[]);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((r: any) => {
    map[r.key] = r.value ?? "";
  });
  return map;
}

export async function saveTemplateSettings(values: Record<string, string>) {
  const rows = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    type: "text",
    label: key,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

// ===== standard image / asset size guideline =====
export type TemplateSpec = {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
  note?: string;
};

export const TEMPLATE_SPECS: TemplateSpec[] = [
  { id: "product_card", label: "รูปสินค้า (การ์ดสินค้า)", width: 800, height: 800, ratio: "1:1" },
  { id: "category_banner", label: "แบนเนอร์หมวดหมู่", width: 1600, height: 800, ratio: "2:1" },
  { id: "box_banner", label: "แบนเนอร์กล่องสุ่ม", width: 1200, height: 675, ratio: "16:9" },
  { id: "hero", label: "รูปฮีโร่/สไลด์หน้าแรก", width: 1920, height: 1080, ratio: "16:9" },
  { id: "main_bg", label: "พื้นหลังหลักของเว็บไซต์", width: 1920, height: 1080, ratio: "16:9" },
  { id: "gift_card", label: "รูปบัตรของขวัญ", width: 1000, height: 600, ratio: "5:3" },
];

export function specToText(s: TemplateSpec): string {
  return `${s.label}: ${s.width}x${s.height}px (${s.ratio})`;
}

export function exportGuidelineText(): string {
  const lines = [
    "PROKIM - Template Image Size Guideline",
    `สร้างเมื่อ: ${new Date().toLocaleString("th-TH")}`,
    "",
    ...TEMPLATE_SPECS.map(specToText),
  ];
  return lines.join("\n");
}
