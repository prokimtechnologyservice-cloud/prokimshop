INSERT INTO public.site_content (key, value, type, label) VALUES
  ('hero_title', 'PROKIM', 'text', 'หัวข้อ Hero'),
  ('hero_subtitle', 'ร้านไอเทมเกมพรีเมียม — Robux, Blox Fruits, Brookhaven, 99 คืนในป่า ราคาดี ส่งไว ปลอดภัย', 'textarea', 'คำบรรยาย Hero'),
  ('banner_url', '', 'image', 'รูปแบนเนอร์ Hero'),
  ('footer_text', '© PROKIM Luxe Store · Crafted with passion', 'textarea', 'ข้อความฟุตเตอร์'),
  ('show_hero', 'true', 'boolean', 'แสดงส่วน Hero')
ON CONFLICT (key) DO NOTHING;