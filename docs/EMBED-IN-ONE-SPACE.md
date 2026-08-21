# คู่มือ: เปิดให้แอปแสดงในพอร์ทัล ONE SPACE ได้ (Embedding Guide)

> ส่งเอกสารนี้ให้ทีมที่ดูแล **แต่ละแอปลูก** (เช่น OneBook, GoodHR ฯลฯ)
> ใช้เวลาแก้ ~2 นาที ต่อแอป

---

## ปัญหา

พอร์ทัล **ONE SPACE** เปิดแอปต่างๆ แบบฝังหน้าต่างในตัว (`<iframe>`) แต่แอปของคุณขึ้น
**"ปฏิเสธการเชื่อมต่อ / refused to connect"** เพราะแอปส่ง HTTP header:

```
X-Frame-Options: DENY
```

`X-Frame-Options` สั่งเบราว์เซอร์ว่า **"ห้ามฝังในเว็บอื่นทุกกรณี"** และ **ไม่สามารถ**
ระบุอนุญาตเฉพาะบางโดเมนได้ (มีแค่ `DENY` กับ `SAMEORIGIN`) — จึงต้องเลิกใช้แล้วเปลี่ยนไปใช้
**CSP `frame-ancestors`** ที่อนุญาตเฉพาะโดเมนที่ต้องการได้

---

## กติกาความปลอดภัย (สำคัญมาก)

✅ **อนุญาตเฉพาะโดเมนพอร์ทัลเท่านั้น**

```
frame-ancestors 'self' https://onespace-ose7.onrender.com
```

> ถ้ามีโดเมนพอร์ทัลหลายอัน (เช่น custom domain) ให้เว้นวรรคต่อท้าย:
> `frame-ancestors 'self' https://onespace-ose7.onrender.com https://portal.shd-technology.co.th`

❌ **ห้ามเด็ดขาด** — อย่าเปิดกว้างให้ทุกเว็บฝัง (เสี่ยง clickjacking):

```
frame-ancestors *            ← ห้าม! เปิดให้ทุกเว็บ
frame-ancestors https:       ← ห้าม! กว้างเกินไป
```

- `'self'` = ให้ตัวแอปเองฝังหน้าตัวเองได้ (ปกติควรใส่ไว้)
- ต่อด้วย **โดเมนพอร์ทัลแบบเต็ม** (มี `https://`) เท่านั้น
- **ต้องลบ `X-Frame-Options` ออก** ไม่งั้นมันจะบล็อกทับ CSP

---

## วิธีแก้ตาม stack

### Next.js — `next.config.js` / `next.config.mjs`

```js
const securityHeaders = [
  // ❌ ลบบรรทัดนี้ออก:
  // { key: 'X-Frame-Options', value: 'DENY' },

  // ✅ ใส่แทน — อนุญาตเฉพาะพอร์ทัล:
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self' https://onespace-ose7.onrender.com",
  },
  // ...header ความปลอดภัยอื่นๆ คงไว้ได้ตามเดิม
];

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
```

> ถ้าแอปมี `Content-Security-Policy` อยู่แล้ว **อย่าใส่ header ซ้ำ 2 อัน** — ให้เพิ่ม
> `frame-ancestors ...` ต่อท้ายค่า CSP เดิม (คั่นด้วย `;`)

### Express / Node (helmet)

```js
import helmet from 'helmet';

app.use(helmet({
  frameguard: false, // ปิด X-Frame-Options
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      frameAncestors: ["'self'", "https://onespace-ose7.onrender.com"],
    },
  },
}));
```

หรือถ้าตั้ง header เอง:
```js
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy',
    "frame-ancestors 'self' https://onespace-ose7.onrender.com");
  next();
});
```

### Nginx

```nginx
# ลบของเดิมออก (อย่าให้เหลือ add_header X-Frame-Options ...)
proxy_hide_header X-Frame-Options;
add_header Content-Security-Policy "frame-ancestors 'self' https://onespace-ose7.onrender.com" always;
```

### Apache (.htaccess / vhost)

```apache
Header always unset X-Frame-Options
Header always set Content-Security-Policy "frame-ancestors 'self' https://onespace-ose7.onrender.com"
```

### Django — `settings.py`

```python
# ลบ/อย่าตั้ง X_FRAME_OPTIONS = 'DENY'
# ปิด middleware กันเฟรมของ Django:
# (เอา 'django.middleware.clickjacking.XFrameOptionsMiddleware' ออกจาก MIDDLEWARE)

# ใช้ CSP แทน (เช่น django-csp):
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "frame-ancestors": ["'self'", "https://onespace-ose7.onrender.com"],
    },
}
```

### Laravel / PHP (middleware)

```php
$response->headers->remove('X-Frame-Options');
$response->headers->set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://onespace-ose7.onrender.com"
);
```

### ตั้งที่ CDN / Cloudflare (Transform Rules)

- **Remove** response header: `X-Frame-Options`
- **Set** response header: `Content-Security-Policy` =
  `frame-ancestors 'self' https://onespace-ose7.onrender.com`

---

## ตรวจสอบหลังแก้ + deploy

```bash
curl -sI https://<โดเมนแอปคุณ> | grep -iE "x-frame-options|content-security-policy"
```

**ผลที่ถูกต้อง:**
```
content-security-policy: frame-ancestors 'self' https://onespace-ose7.onrender.com
```
- ต้อง **ไม่มี** บรรทัด `x-frame-options` เหลืออยู่
- ถ้ายังเห็น `x-frame-options: deny/sameorigin` = ยังมีจุดตั้งซ้ำอยู่ที่อื่น (CDN, proxy, framework) ให้ตามลบ

จากนั้นกลับไปเปิดแอปในพอร์ทัล ONE SPACE — จะแสดงในหน้าต่างได้เลย ✅

---

## FAQ

**Q: ปลอดภัยไหมที่ให้ฝังได้?**
ปลอดภัย ตราบใดที่ `frame-ancestors` ระบุ**เฉพาะโดเมนพอร์ทัล**ที่เชื่อถือได้ เว็บอื่นยังฝังไม่ได้
(กัน clickjacking เหมือนเดิม) — อันตรายเฉพาะตอนใช้ `*`

**Q: จำเป็นต้องลบ header ความปลอดภัยอื่นไหม?**
ไม่ — `X-Content-Type-Options`, `HSTS`, `Referrer-Policy` ฯลฯ คงไว้ได้ แก้เฉพาะเรื่องเฟรม

**Q: แอปมี login / cookie — ฝังแล้วยังล็อกอินได้ไหม?**
ได้ แต่ควรตั้ง cookie เป็น `SameSite=None; Secure` เพื่อให้ session ทำงานใน iframe ข้ามโดเมน

**Q: แก้แล้วแต่ยังไม่ขึ้น?**
1) เคลียร์ cache / hard reload  2) เช็คว่า CDN ไม่ได้ cache header เก่า  3) ยืนยันด้วย `curl -sI` ตามด้านบน

---

*เอกสารนี้จาก ONE SPACE Portal · โดเมนพอร์ทัลที่ต้องอนุญาต: `https://onespace-ose7.onrender.com`*
