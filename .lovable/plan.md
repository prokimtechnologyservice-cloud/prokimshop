# แผนงาน 2 ระบบใหญ่

## 1. กล่องสุ่ม (Mystery Box / Gacha)

### Database
- เพิ่มค่า `product_type = 'mystery_box'` ให้ตาราง `products`
- คอลัมน์ใหม่ที่ `products`:
  - `box_spin_price` numeric — ราคา/สุ่ม 1 ครั้ง
  - `box_border_color` text — เก็บชื่อสีจาก preset (default/green/blue/white/red/black/purple/pink/orange/yellow/navy)
  - `box_bg_color` text
- ตารางใหม่ `mystery_box_items`:
  - `box_product_id` (ref กล่อง), `prize_product_id` (ref สินค้ารางวัล), `weight` int (น้ำหนักการสุ่ม), `stock` int (จำนวนคงเหลือในกล่อง — ลดลงเมื่อถูกสุ่มออก, 0 = ไม่ออกอีก)
- ตารางใหม่ `mystery_box_spins`: log การสุ่ม (`user_id`, `box_id`, `prize_product_id`, `order_id`, `roblox_name`, `delivered_payload`, `created_at`)

### หน้าลูกค้า
- เปิดสินค้าประเภทกล่องสุ่ม → หน้ากล่องสุ่มพิเศษ: แสดงรูปกล่อง, คำอธิบาย, ราคา/สุ่ม, สต็อกรวม, และ **แถบรูปสินค้าในกล่องเลื่อนอัตโนมัติ** (marquee ซ้าย↔ขวา)
- ปุ่ม "สุ่ม" — ถ้าสินค้ารางวัลข้างในเป็น type `normal`/`account` ที่ต้อง Roblox ID → เปิด `RobloxIdDialog` ก่อน (ใช้ ID เดียวคุมทั้งการสุ่ม)
- กด "สุ่ม" = **ตัดเงินทันทีจาก balance** (ไม่ผ่านตะกร้า), เรียก API `/api/public/spin-box`
- Animation หลังสุ่ม: แถบรูปเลื่อนเร็ว → ช้าลง → หยุดที่รางวัล → โชว์รูป + ชื่อสินค้า + confetti
- ออเดอร์ที่ถูกสร้างจะมี `order_items.mystery_box_id` + `mystery_box_name` → หน้า `/orders` แสดงป้าย **"สินค้าจากกล่องสุ่ม (ชื่อกล่อง)"**
- ใช้สี border/bg ตาม preset กับ card ของกล่องสุ่มบนหน้าแรก

### Server function `/api/public/spin-box`
- ตรวจ user, balance ≥ price
- ดึง `mystery_box_items` ที่ `stock > 0` → weighted random
- ถ้าไม่มีของเหลือ → error "หมด"
- ถ้ารางวัลเป็น type `account` → reserve 1 row จาก `product_account_stock`; ไม่พอ → error
- สร้าง `orders` (paid_from_balance=true, payment_status=paid, status=pending) + `order_items` (1 row: รางวัล พร้อม delivered_payload ถ้ามี, roblox_name, mystery_box_id, mystery_box_name)
- `deduct_balance` และ `mystery_box_items.stock -= 1`
- Insert `mystery_box_spins`
- คืน `{ prize: {name,image_url}, order_id, receipt_code }`

### Admin
- ProductForm: เพิ่ม option "กล่องสุ่ม" ใน product_type
  - ฟิลด์เพิ่มเติม: ราคา/สุ่ม, ตัวเลือกสี border, สี bg (dropdown 11 สี), และ **tab "รางวัลในกล่อง"** ให้เลือกสินค้ามาใส่ (ค้นหา+เพิ่ม), กำหนด weight + stock ต่อรางวัล
- ในหน้าติดตามคำสั่งซื้อ admin ให้แสดงป้าย "จากกล่องสุ่ม" เหมือน user

---

## 2. ระบบแชทในเว็บไซต์ (User ↔ Admin)

### Database
- `chat_threads`: `id`, `user_id` (unique 1 คน 1 thread), `last_message_at`, `unread_admin`, `unread_user`
- `chat_messages`: `id`, `thread_id`, `sender` (`user`/`admin`), `body` text, `created_at`
- เปิด Realtime สำหรับทั้ง 2 ตาราง
- RLS:
  - user เห็น/ส่งข้อความเฉพาะ thread ของตัวเอง
  - admin (staff) เห็น/ส่งทุก thread

### UI ฝั่งลูกค้า
- ปุ่มลอย 💬 มุมล่างขวา (แสดงเมื่อล็อกอินแล้ว) พร้อม badge จำนวน `unread_user`
- คลิก → เปิด Sheet/Dialog แชท: header "ติดต่อแอดมิน", รายการข้อความ, กล่องพิมพ์+ปุ่มส่ง
- Realtime subscribe เฉพาะ thread ของตัวเอง
- เมื่อเปิด sheet → reset `unread_user = 0`

### UI ฝั่งแอดมิน
- เพิ่ม tab ใหม่ในหน้า admin: **"แชทลูกค้า"**
- Layout 2 คอลัมน์: ซ้าย = list threads (เรียงตาม `last_message_at desc`, badge unread, ชื่อ/อีเมลผู้ใช้), ขวา = ห้องแชท
- Realtime subscribe ทุก thread → ถ้ามีข้อความใหม่ list เด้งขึ้นบน + badge
- เมื่อเปิด thread → reset `unread_admin = 0`

### Server functions
- `sendChatMessage({thread_id, body})` — auth required, insert message + update `last_message_at` + เพิ่ม unread ของอีกฝั่ง
- `ensureUserThread()` — สร้าง thread ให้ user ถ้ายังไม่มี, return thread_id

---

## Technical Notes
- Migration แบ่ง 2 ก้อน: (1) mystery box tables/columns + RLS + grants, (2) chat tables/RLS/grants + realtime publication
- Frontend files ใหม่: `src/components/MysteryBoxView.tsx`, `src/components/MysteryBoxReel.tsx`, `src/lib/mysteryBox.ts`, `src/routes/api/public/spin-box.ts`, `src/components/ChatWidget.tsx`, `src/components/admin/ChatAdmin.tsx`, `src/lib/chat.ts`
- แก้ไข: `src/routes/index.tsx` (render กล่องสุ่มพร้อมสี), `src/routes/product.$id.tsx` (redirect ตามเดิมแต่หน้า home ต้องรู้จัก mystery_box), `src/routes/admin.index.tsx` (ProductForm + Chat tab), `src/routes/orders.tsx` (แสดงป้ายกล่องสุ่ม), `src/routes/__root.tsx` (mount ChatWidget), `src/integrations/supabase/types.ts`

## ลำดับการทำ
1. Migration mystery_box + chat (ครั้งเดียว)
2. Backend: `spin-box` API, `chat` server fns
3. Admin ProductForm รองรับ mystery_box + tab รางวัล
4. หน้า user: MysteryBoxView + reel animation
5. Chat widget (user) + Chat tab (admin) + realtime
6. ป้ายกล่องสุ่มใน `/orders`

งานนี้ใหญ่มาก จะทำเป็นก้อนเดียวทั้งหมดตามลำดับด้านบน หากอยากตัดสโคป (เช่นเอาแชทก่อน/กล่องสุ่มก่อน) บอกได้ครับ
