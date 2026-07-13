# แผนงานใหญ่ 3 กลุ่ม

## 1. ลิงก์แชร์ (Deep Link) — คงความเร็ว SPA
- เพิ่ม route ใหม่ 2 อันแบบ **client-side navigation** (SPA):
  - `src/routes/category.$slug.tsx` → `/category/<slug>`
  - `src/routes/product.$id.tsx` → `/product/<id>`
- ทั้งสอง route จะ redirect ไปหน้า `/` พร้อม search param เช่น `/?cat=<slug>` หรือ `/?p=<id>` ทันทีที่โหลด — หน้าแรกจะอ่าน param แล้ว scroll/เปิด popup ให้เอง ดังนั้นการเข้าจาก URL ตรงๆ ก็เร็ว ส่วนการคลิกใน UI ยังใช้ในหน้าเดิม (ไม่โหลดใหม่)
- เพิ่ม `head()` ใส่ title/description/og:image ให้ route ใหม่เพื่อ SEO/แชร์
- เพิ่มปุ่ม **แชร์** (คัดลอกลิงก์) ที่:
  - ป๊อปอัปหมวดหมู่ (ในหน้า home)
  - ป๊อปอัปสินค้า
  - หน้ารายละเอียดสินค้า (ผ่าน `/product/<id>`)

## 2. ระบบไก่ตัน (บัญชี) — สต็อกเป็นคลัง
- เพิ่มคอลัมน์ `products.product_type` (`normal` | `account`) และ `products.claim_instructions` (text)
- ตาราง `product_account_stock` (คลังบัญชี):
  - `product_id`, `payload` (ข้อความบัญชีที่แอดมินพิมพ์ไว้), `status` (`available`/`sold`), `sold_to`, `sold_at`
- สต็อกของ product แบบ account = `count(status='available')` แสดงในหน้าร้าน (0 = "หมด" กด checkout ไม่ได้)
- Checkout API: ถ้ามี item เป็น account type → เช็คสต็อกใน `product_account_stock`, ล็อกและ mark `sold`, เก็บ `payload` ใน `order_items.delivered_payload`; ถ้าสต็อกไม่พอ rollback ทั้ง order + คืนเงิน
- Admin UI: ในหน้าแก้ไขสินค้า เพิ่ม tab "บัญชีในคลัง" (textarea 1 บรรทัด = 1 บัญชี, ปุ่มเพิ่ม) + ช่อง "คำแนะนำหลังซื้อ"
- User หน้า `/orders`: item ไก่ตันจะมีปุ่ม "ดูบัญชี" แสดง `delivered_payload` + กล่องคำแนะนำ (ตกแต่งสวย) + วิธีเคลม (ข้อความมาตรฐานตามที่ user ให้มา)

## 3. เลือก Roblox ID ตอนกดใส่ตะกร้า (เฉพาะสินค้าปกติ)
- ก่อนเพิ่มลงตะกร้าเปิด dialog เล็ก: "ใช้ ID ที่สมัคร (roblox_name)" หรือ "ใส่ ID ใหม่"
- เก็บ `roblox_name_used` ที่ระดับ `cart_items` และส่งต่อเป็น `order_items.roblox_name`
- Migration: เพิ่ม `cart_items.roblox_name`, `order_items.roblox_name`

## 4. Admin ดูรายการสินค้าแบบรวมต่อบัญชี
- Tab "ติดตามคำสั่งซื้อ" ของแอดมิน: จัดกลุ่มตาม `order_id` (แทนที่จะ 1 บล็อก = 1 item)
- แสดงหัวบล็อก: ผู้ใช้/receipt/IP/เวลา/รวม
- ในบล็อกแสดง item ทุกตัวพร้อม **รูปภาพ**, ชื่อ, จำนวน, roblox ID ที่ใช้, ปุ่มเปลี่ยนสถานะรายตัว
- ฝั่งลูกค้า (`/orders`) คงเดิม — 1 บล็อก = 1 item

## 5. หมวดหมู่โหมดภาพ 16:9
- Migration เพิ่ม `categories.display_mode` (`text`/`image`), `categories.image_url`
- Admin: เพิ่มปุ่มอัปโหลดรูป 16:9 + toggle โหมด
- หน้า home: ถ้า `display_mode='image'` และมี image → render `<img class="aspect-video">` แทนชื่อ

## 6. บั๊กและปรับปรุง
1. **สินค้าแนะนำ/มาใหม่ไม่อัปเดต** — ตรวจ query cache; refetch หลัง admin update
2. **ลำดับสินค้าแอดมิน ≠ ผู้ใช้** — ใช้ `ORDER BY sort_order NULLS LAST, created_at DESC` ทั้ง 2 ฝั่งให้ตรงกัน
3. **แอดมินแก้ไข "แนะนำ/มาใหม่" ได้** — เพิ่มคอลัมน์ `products.is_featured`, `products.is_new` (boolean) + toggle ในหน้า admin แก้ไขสินค้า; หน้า home ดึงตาม flag แทน logic เดิม

## ลำดับการทำ
1. Migration ทั้งหมด (schema + RLS + grants)
2. Admin UI (แก้ไขสินค้า/หมวดหมู่ + tab คลังบัญชี + toggle featured/new + regroup orders)
3. Checkout API รองรับ account type
4. Deep link routes + ปุ่มแชร์
5. Roblox ID dialog + integration cart
6. `/orders` แสดง payload + คำแนะนำ
7. แก้บั๊ก sort/refresh

## หมายเหตุ
งานนี้เยอะมากและกินเวลานาน — ผมจะทยอยทำเป็นรอบ ๆ ให้ครบทุกข้อ ถ้าอยากลดสโคปหรือทำก่อนบางส่วน บอกได้เลยครับ