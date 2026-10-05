# ONE SPACE → Onelogin · ข้อมูลที่ ONE SPACE ต้องได้รับ

> **จาก:** ทีม ONE SPACE (ERP · `https://onespace-ose7.onrender.com`)
> **ถึง:** ทีม Onelogin
> **อ้างอิง:** เอกสาร "Onelogin - SSO" ข้อ 1.5, 1.6, 4.4, 4.5, 4.7, 5.1, 7.1, 8.5
> **client_id:** `cli_8761e610ca8c1002`
> **วันที่:** 5 ต.ค. 2569 (ฉบับปรับปรุง)

---

## สรุปสั้น

ONE SPACE ต้องการข้อมูลจาก Onelogin 3 จังหวะ:

1. **ตอนล็อกอิน**: `POST /api/v1/sso/verify` บอกว่าคนนี้คือใคร มีสิทธิ์อะไร
2. **ระหว่างใช้งาน**: `/api/v1/authz/effective` และ `/api/v1/authz/check` ใช้ดึงสิทธิ์ล่าสุด รายการหมวก และเช็กสิทธิ์ก่อนทำงาน
3. **เช็กเซสชันเป็นรอบ (~1 นาที)**: `/sso/session` ใช้ตรวจว่ายังใช้งานได้อยู่ไหม และสิทธิ์เปลี่ยนหรือยัง

ตัวย่อสถานะ: ✅ มีแล้ว · 🆕 ขอเพิ่ม · ⏳ รอเฟสถัดไป

---

## 1. ตอนล็อกอิน: `POST /api/v1/sso/verify` (ข้อ 4.4)

ขอให้ **เพิ่มฟิลด์อย่างเดียว** ห้ามเปลี่ยนหรือลบฟิลด์เดิม

| ฟิลด์ | ความหมาย / ONE SPACE ใช้ทำอะไร | สถานะ |
|---|---|---|
| `sub` | รหัสผู้ใช้ ONE SPACE ใช้จำคน (`onelogin_sub` UNIQUE) | ✅ |
| `name` | ชื่อแสดงผล | ✅ |
| `email` | แสดงผลเท่านั้น ไม่ใช้หาตัวผู้ใช้ | ✅ |
| `id_token` | ใช้ตอนออกจากระบบ (RP-initiated logout) | ✅ |
| `iat` | เวลาออก token | ✅ |
| `profile.user_type` | `employee` \| `guest` (guest = เข้าด้วย OTP จากคำเชิญ) คำนวณจาก `app_user.auth_type` | 🆕 |
| `profile.login_method` | `feishu` \| `google` \| `otp` (\| `goodhr` เมื่อมีปุ่ม) | 🆕 |
| `profile.department` | แผนก (วันนี้มาจาก Lark ส่วนคนนอกเป็น `null`) | 🆕 |
| `profile.title` | ตำแหน่ง | 🆕 |
| `profile.avatar_url` | รูปโปรไฟล์ | ⏳ เฟส 3 |
| `app.has_access` | มีสิทธิ์ใช้ ONE SPACE หรือไม่ | ✅ * |
| `app.roles` | role ของผู้ใช้ใน ONE SPACE | ✅ * |
| `app.base_level` / `app.can_share` | ระดับตั้งต้น และสิทธิ์แชร์ | ✅ * |
| `app.resources` | ระดับสิทธิ์รายเมนู เช่น `{ "home": "view" }` | ✅ * |
| `app.capabilities` | ความสามารถพิเศษ เช่น approve | ✅ * |
| `app.scopes` | ขอบเขตข้อมูล (ไม่มีคีย์ = เห็นทุกค่า) | 🆕 |
| `app.masked_fields` | ช่องข้อมูลอ่อนไหวที่ห้ามแสดง | 🆕 |
| `app.grants_version` | เวอร์ชันสิทธิ์ ใช้เทียบกับ `/sso/session` | 🆕 |

\* ก้อน `app` จะมาก็ต่อเมื่อผูก ONE SPACE กับโมเดลสิทธิ์แล้ว (ดูข้อ 4) ถ้ายังไม่ผูกจะได้ `app: null`

### ตัวอย่าง response ที่ต้องการ

```json
{
  "sub": "42",
  "name": "สมชาย ใจดี",
  "email": "somchai@shd-technology.co.th",
  "id_token": "eyJ…",
  "iat": 1790000000,
  "profile": {
    "user_type": "employee",
    "login_method": "feishu",
    "department": "บัญชี",
    "title": "พนักงานบัญชี",
    "avatar_url": null
  },
  "app": {
    "has_access": true,
    "roles": ["employee"],
    "base_level": "view",
    "can_share": false,
    "resources": { "home": "view" },
    "capabilities": [],
    "scopes": {},
    "masked_fields": [],
    "grants_version": "a1b2c3"
  }
}
```

### Status code ที่ ONE SPACE รองรับ

| Code | ONE SPACE ทำอะไร |
|---|---|
| `200` + `has_access: true` | เข้าระบบ |
| `200` + `has_access: false` หรือ `403` | แสดงหน้า "ไม่มีสิทธิ์ใช้ ONE SPACE" + ปุ่มกลับ Onelogin **และไม่เด้งกลับไป authorize เอง** |
| `400` | code หมดอายุหรือถูกใช้แล้ว ให้ล็อกอินใหม่ |
| `401` | client_secret ผิด (ปัญหาการตั้งค่า) |

---

## 2. ระหว่างใช้งาน: `/api/v1/authz/effective` และ `/api/v1/authz/check`

### 2.1 `/authz/effective`: สิทธิ์ทั้งหมดของผู้ใช้

| ข้อมูล | ใช้ทำอะไร | สถานะ |
|---|---|---|
| roles, resources, capabilities, scopes, masked_fields, grants_version | สร้างเมนู และเช็กสิทธิ์ฝั่งเซิร์ฟเวอร์ | ✅ |
| **`assignments`** (รายการหมวก) | ใช้กับปุ่มสลับหมวกที่มุมจอ ONE SPACE (ข้อ 1.6) | ⏳ เฟส 3 |
| `employment` (`last_working_date`, `access_end_date`, ช่วงเคลียร์งาน) | แยก "งานก่อนวันออก" ของคนลาออก (ข้อ 5.1) | ⏳ เฟส 1 |

#### รูปแบบ `assignments` ที่ต้องการ

```json
"assignments": [
  {
    "id": "asg_…",
    "label": "พนักงานบัญชี · สาขาใหญ่",
    "is_primary": true,
    "roles": ["employee"]
  },
  {
    "id": "asg_…",
    "label": "หัวหน้าจัดซื้อ (รักษาการ) · เชียงใหม่",
    "is_primary": false,
    "roles": ["manager"]
  }
]
```

- `id`: ต้องคงที่ข้ามการล็อกอิน เพราะ ONE SPACE จะจำ "หมวกที่ใช้ล่าสุด" ไว้
- `label`: ข้อความพร้อมแสดงผล รูปแบบ "ตำแหน่ง · สาขา"
- `is_primary`: ใบหลักมีได้ 1 ใบ ใช้เป็นหมวกเริ่มต้นตอนเข้าแอป
- `roles`: role ทุกตัวของใบนั้น
- ถ้าผู้ใช้มีใบเดียว หรือยังไม่มีข้อมูลใบสังกัด ขอให้ส่ง array ว่างหรือ 1 รายการ แล้ว ONE SPACE จะซ่อนตัวสลับเอง

### 2.2 `/authz/check`: เช็กสิทธิ์รายครั้ง (ถ้าตัดสินแบบ ข · ข้อ 8.5)

| ขอเพิ่ม | รายละเอียด | สถานะ |
|---|---|---|
| พารามิเตอร์หมวก เช่น `assignment_id` | ONE SPACE ส่งหมวกที่เลือกมาด้วย แล้ว Onelogin คิดสิทธิ์จากหมวกนั้นอย่างเดียว (สิทธิ์พื้นฐานที่ทุกหมวกมีร่วมกันยังใช้ได้) | ⏳ เฟส 3 |
| key แคชรวมหมวก | ผลของหมวกต่างกันต้องไม่ปนกัน | ⏳ เฟส 3 |
| audit บันทึกหมวกที่ใช้ | ตรวจย้อนหลังได้ว่าอนุมัติในหมวกไหน | ⏳ เฟส 3 |

> ถ้าตัดสินแบบ ก (แค่ซ่อนเมนู) ฝั่ง Onelogin ส่งแค่ `assignments` อย่างเดียวพอ ไม่ต้องทำตารางนี้

---

## 3. เช็กเซสชันเป็นรอบ: `/sso/session` (ข้อ 4.7)

ONE SPACE จะเรียกทุก ~1 นาที และเรียกสดทุกครั้งก่อนงานเสี่ยง (อนุมัติเงิน แก้สิทธิ์) ขอให้ตอบอย่างน้อย:

| ข้อมูล | ใช้ทำอะไร |
|---|---|
| เซสชันยังใช้ได้หรือไม่ | ถ้าบัญชีถูกปิด (ลาออก / พักงาน) ONE SPACE จะเตะออก |
| `grants_version` | ถ้าไม่ตรงกับที่ถืออยู่ ONE SPACE จะโหลดสิทธิ์ใหม่จาก `/authz/effective` |

ระยะยาว: Back-Channel Logout (ข้อ 5)

---

## 3.1 PKCE S256 (ข้อ 4.7 · E7): ขอยืนยันชื่อพารามิเตอร์

ONE SPACE เพิ่มการส่ง PKCE แล้ว (ยังไม่ deploy) โดยใช้ชื่อพารามิเตอร์มาตรฐาน OAuth 2.0 (RFC 7636) **ขอให้ยืนยันว่า mini-SSO ใช้ชื่อเดียวกัน**

| จังหวะ | Endpoint | พารามิเตอร์ที่ ONE SPACE ส่ง |
|---|---|---|
| เริ่มล็อกอิน | `GET /api/v1/sso/authorize` | `code_challenge` = base64url(SHA-256(verifier)) · `code_challenge_method=S256` |
| แลก code | `POST /api/v1/sso/verify` (JSON body) | `code_verifier` (ส่งคู่กับ `code`, `client_id`, `client_secret`) |

- ใช้ S256 เท่านั้น ไม่ใช้ plain
- ขอคำตอบด้วยว่า ถ้าส่ง `code_challenge` ตอน authorize แต่ `code_verifier` ไม่ตรง verify จะตอบ status อะไร (ONE SPACE จะได้แสดงข้อความให้ถูก)

---

## 4. การตั้งค่าในหน้าแอดมิน Onelogin (ข้อ 4.5 ก.)

ไม่ต้องเขียนโค้ด แต่ต้องทำก่อน ก้อน `app` ถึงจะส่งมา

- [ ] สร้างแอป "ONE SPACE (ERP)" ใน Permission Template
- [ ] ผูกลิงก์ `cli_8761e610ca8c1002` เข้ากับแอปนั้น (`portal_app_id`)
- [ ] สร้างบทบาทตั้งต้น:

  | บทบาท | ให้ใคร | ระดับตั้งต้น | หมายเหตุ |
  |---|---|---|---|
  | `erp_admin` | ทีม IT / เจ้าของ ERP (รายคน) | manage | ห้ามให้ผ่านกลุ่ม |
  | `employee` | พนักงาน (ผ่านกลุ่มแผนก Lark) | view | **ห้ามให้ผ่านกลุ่ม "พนักงานทุกคน"** เพราะรวมคนนอกด้วย |
  | `guest` | คนนอก (รายคน ตั้งตอนเชิญ) | view | ตั้งวันหมดอายุทุกครั้ง |
  | `clearance` | คนลาออกช่วงเคลียร์งาน | – | เฟส 1 |

  resource ตั้งต้น: `home` อย่างเดียว
- [ ] เปิด `enforce_app_access` เพื่อให้คนที่ไม่มีบทบาทถูกหยุดที่ Onelogin (verify ตอบ 403)

---

## 5. คำถามที่ขอคำตอบ

1. ตอนนี้บน production ผูก ONE SPACE กับโมเดลสิทธิ์ (`portal_app_id`) แล้วหรือยัง
2. `profile` และ `scopes` / `masked_fields` / `grants_version` ใน `/sso/verify` จะ deploy ได้เมื่อไหร่
3. `assignments` (เฟส 3) มีกำหนดการคร่าว ๆ หรือยัง และต้องรอ GoodHR ส่ง `employee_assignment` ก่อนใช่ไหม
4. ข้อ 8.5 ตัดสินแล้วหรือยังว่าใช้แบบ ก หรือ ข (ONE SPACE เสนอแบบ ข)
5. `/sso/session` ใช้ path และรูปแบบ response อะไร มีเอกสารให้ไหม (ONE SPACE รอข้อนี้เพื่อทำงาน E5)
6. ข้อ 8.4: กลุ่ม everyone จะแก้ให้ไม่รวมคนนอกเมื่อไหร่
7. ชื่อพารามิเตอร์ PKCE ตรงกับข้อ 3.1 ไหม และมี environment ให้ทดสอบก่อนขึ้น production หรือไม่
8. role ที่จะส่งมาใน `app.roles` และ `assignments[].roles` ใช้ key อะไรบ้าง (เช่น `erp_admin`, `employee`, `guest`, `clearance`, `manager`, `finance`) ขอรายการทั้งหมด ONE SPACE ต้องใช้จับคู่กับสิทธิ์ภายใน

---

## 6. สถานะงานฝั่ง ONE SPACE (เพื่อให้เห็นภาพรวม)

| งาน | สถานะ | หมายเหตุ |
|---|---|---|
| ส่ง PKCE S256 (E7) | ✅ ทำแล้ว · ยังไม่ deploy | รอยืนยันชื่อพารามิเตอร์ (ข้อ 3.1) |
| หน้า "ไม่มีสิทธิ์ใช้ ONE SPACE" (E4) | ✅ ทำแล้ว · ยังไม่ deploy | แสดงเมื่อ verify ตอบ 403 หรือได้ `app.has_access: false` มีปุ่มกลับ `/dashboard` ของ Onelogin และไม่เด้งกลับ authorize เอง ถ้าได้ `app: null` ยังให้เข้าได้ตามเดิม |
| เก็บ `sub` / `profile` / `app` จาก verify | ✅ ทำแล้ว · ยังไม่ deploy | เก็บเป็นสำเนาไว้แสดงผล และเขียนทับใหม่ทุกครั้งที่ล็อกอิน |
| ตัวสลับหมวกที่มุมจอ (1.6) | ✅ ทำแล้ว · ยังไม่ deploy | ซ่อนไว้จนกว่าจะได้ `assignments` ที่มีมากกว่า 1 ใบ · เริ่มจากใบที่ใช้ล่าสุดหรือใบหลัก · บันทึก audit ทุกครั้งที่สลับ |
| หาผู้ใช้ด้วย `sub` แทนอีเมล (E3) | ⏳ ยังไม่ทำ | ต้องเพิ่มคอลัมน์ `onelogin_sub` UNIQUE ในฐานข้อมูล ONE SPACE |
| เช็กเซสชันทุก ~1 นาที (E5) | ⏳ รอ Onelogin | รอ spec ของ `/sso/session` (คำถามข้อ 5) |
| อ่าน `assignments` จาก `/authz/effective` | ⏳ รอ Onelogin เฟส 3 | ตัวสลับรองรับรูปแบบข้อ 2.1 ไว้แล้ว |
