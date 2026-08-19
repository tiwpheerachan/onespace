# ONE SPACE · Enterprise Portal

หน้าเดียวที่รวมทุกระบบ ERP ขององค์กร — ปุ่มเข้าแต่ละระบบ พร้อมโลโก้ ลิงก์ หมวดหมู่ และการกำหนดสิทธิ์ตามบทบาท
*A single, permission-aware entry point to every ERP system your company runs.*

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Supabase / Postgres · ไทย / English / 中文

---

## 1. เริ่มใช้งาน (Quick start)

```bash
npm install
cp .env.example .env.local     # ปล่อยว่างไว้ก่อนก็ได้ = โหมดสาธิต
npm run dev                    # http://localhost:3000
```

**โหมดสาธิต (Demo mode)** — ถ้ายังไม่ได้ตั้งค่า Supabase พอร์ทัลจะทำงานได้ทันทีโดยเก็บข้อมูลไว้ใน
`localStorage` ของเบราว์เซอร์ พร้อมข้อมูลตัวอย่าง 12 แอป / 6 ผู้ใช้ / 4 บทบาท
เข้าสู่ระบบด้วยอีเมลใดก็ได้ในรายการ และ **รหัสผ่านอะไรก็ได้**:

| อีเมล | บทบาท | เห็นอะไรบ้าง |
|---|---|---|
| `admin@shd-technology.co.th` | System Administrator | ทุกอย่าง + เมนูผู้ดูแลระบบ |
| `manager@shd-technology.co.th` | Department Manager | แอปปฏิบัติการ + บันทึกการใช้งาน |
| `finance@shd-technology.co.th` | Finance Officer | เฉพาะระบบการเงิน/วิเคราะห์/จัดซื้อ |
| `staff@shd-technology.co.th` | Staff | แอปที่เปิดให้ทุกคน |

---

## 2. ต่อฐานข้อมูลจริง (Supabase)

1. สร้างโปรเจ็กต์ที่ [supabase.com](https://supabase.com)
2. เปิด **SQL Editor** แล้วรันไฟล์ [`supabase/schema.sql`](supabase/schema.sql)
   (สร้างตาราง `portal_apps`, `portal_users`, `portal_roles`, `portal_audit`
   พร้อม Row Level Security, ฟังก์ชัน `has_permission()` และข้อมูลตั้งต้น)
3. ใส่ค่าใน `.env.local`

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

4. ใน **Authentication → Users** สร้างบัญชีให้ตรงกับอีเมลในตาราง `portal_users`
5. รีสตาร์ท `npm run dev` — แถบ "โหมดสาธิต" จะหายไป และหน้า *ตั้งค่า* จะแสดง "เชื่อมต่อ Supabase แล้ว"

> โค้ดตรวจจับ env เองอัตโนมัติ (`src/lib/supabase/client.ts`) จึงสลับระหว่างโหมดสาธิตกับฐานข้อมูลจริงได้โดยไม่ต้องแก้โค้ด

---

## 3. ฟีเจอร์

**หน้าเข้าสู่ระบบ** — split-screen, aurora mesh เคลื่อนไหว, marquee โลโก้ระบบทั้งหมด, สลับภาษาได้ทันที, บัญชีทดลองกดกรอกอัตโนมัติ

**หน้าหลัก (Workspace)**
- การ์ดแอปแบบ 3D tilt ตามเมาส์ + แสงตามเคอร์เซอร์ + สีประจำระบบ
- ค้นหาแบบทันที, กรองตามหมวดหมู่, สลับมุมมองตาราง/รายการ
- ปักหมุด (pin) แอปที่ใช้บ่อย และแถบ "เปิดล่าสุด"
- การ์ดสถิติ: แอปที่เข้าถึงได้ / ปักหมุด / ผู้ใช้ / uptime
- แอปที่บทบาทไม่มีสิทธิ์จะขึ้นสถานะล็อกแทนปุ่มเปิด

**Command palette (⌘K / Ctrl+K)** — เปิดแอป ข้ามหน้า สลับธีมและภาษา ด้วยคีย์บอร์ดล้วน

**ผู้ดูแลระบบ**
- *จัดการแอป* — เพิ่ม/แก้/ลบ, อัปโหลดโลโก้ (ไฟล์หรือ URL), เลือกสี, หมวดหมู่, สถานะ, เวอร์ชัน, ผู้ดูแล, บทบาทที่เปิดได้ พร้อม **ตัวอย่างการ์ดสด**
- *ผู้ใช้งาน* — เชิญ/แก้ไข/ลบ, กำหนดบทบาท, ฝ่าย, สถานะ (ใช้งาน/รอตอบรับ/ระงับ)
- *บทบาทและสิทธิ์* — การ์ดบทบาท + **ตารางสิทธิ์แบบกดติ๊กได้ทันที** (7 สิทธิ์)
- *บันทึกการใช้งาน* — ไทม์ไลน์ของทุกการเปิดแอปและการแก้ไข

**ทั่วทั้งระบบ** — ธีมสว่าง/มืด, 3 ภาษา (ไทย/English/中文) เปลี่ยนได้ทุกหน้า, จำค่าที่เลือกไว้, responsive, รองรับ `prefers-reduced-motion`

---

## 4. โครงสร้างโปรเจ็กต์

```
src/
├─ app/
│  ├─ layout.tsx                 # providers, ฟอนต์, กัน theme flash
│  ├─ page.tsx                   # เปลี่ยนเส้นทางไป /login หรือ /dashboard
│  ├─ login/page.tsx
│  └─ (portal)/
│     ├─ layout.tsx              # ยาม (guard) + เปลือกแอป
│     ├─ dashboard/page.tsx      # หน้ารวมแอป
│     ├─ settings/page.tsx
│     └─ admin/{apps,users,roles,audit}/page.tsx
├─ components/                   # Shell, AppTile, CommandPalette, ui primitives
└─ lib/
   ├─ data/{repository,store,seed}.ts   # ชั้นข้อมูล + สลับ Supabase/Demo
   ├─ i18n/{dictionaries,provider}.ts   # 3 ภาษา
   ├─ supabase/client.ts
   ├─ types.ts                          # สิทธิ์ / บทบาท / แอป
   └─ utils.ts
supabase/schema.sql                     # ตาราง + RLS + seed
```

## 5. สิทธิ์ในระบบ

`portal.view` · `app.launch` · `app.manage` · `user.manage` · `role.manage` · `audit.view` · `settings.manage`

การมองเห็นแอปคำนวณจาก: ผู้ใช้ → บทบาท → สิทธิ์ + รายการบทบาทที่แอปนั้นอนุญาต
(`roles` ว่าง = เปิดให้ทุกคน) และถูกบังคับซ้ำอีกชั้นด้วย RLS ฝั่ง Postgres

## 6. คำสั่ง

```bash
npm run dev     # โหมดพัฒนา
npm run build   # build production
npm run start   # รัน production
```

## 7. ปรับแต่ง

- สี/เงา/แอนิเมชัน: `tailwind.config.ts` และตัวแปร CSS ใน `src/app/globals.css`
- ข้อความทั้ง 3 ภาษา: `src/lib/i18n/dictionaries.ts`
- ข้อมูลตัวอย่าง: `src/lib/data/seed.ts`
# onespace
