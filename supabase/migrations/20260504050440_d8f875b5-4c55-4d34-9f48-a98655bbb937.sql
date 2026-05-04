CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT NOT NULL DEFAULT 'text',
  label TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "public write site_content" ON public.site_content FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.site_content (key, value, type, label) VALUES
  ('hero_title', 'PROKIM LUXE STORE', 'text', 'หัวข้อใหญ่หน้าแรก'),
  ('hero_subtitle', 'ร้านค้าพรีเมียม สินค้าเกม Roblox และ Code เติมเกม', 'textarea', 'คำโปรยใต้หัวข้อ'),
  ('hero_cta_text', 'เริ่มช้อปเลย', 'text', 'ข้อความปุ่ม Hero'),
  ('logo_url', '', 'image', 'รูปโลโก้ (URL)'),
  ('banner_url', '', 'image', 'รูป Banner หน้าแรก (URL)'),
  ('footer_text', '© PROKIM LUXE STORE — ติดต่อแอดมินผ่าน Messenger', 'textarea', 'ข้อความ Footer'),
  ('contact_note', 'แอดมินตอบไว ภายใน 5 นาที', 'text', 'หมายเหตุการติดต่อ'),
  ('show_announcements', 'true', 'boolean', 'แสดงป้ายประกาศหน้าแรก'),
  ('show_hero', 'true', 'boolean', 'แสดง Hero section');