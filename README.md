# 🛒 ارزان‌کالا (Arzankala)

فروشگاه اینترنتی لوازم دیجیتال — بک‌اند **Node.js/Express + MySQL** و فرانت‌اند استاتیک (HTML + Vanilla JS).

---

## 📦 معماری

```
arzankala--9/
├── backend/          API با Express و دیتابیس MySQL
│   ├── config/       اتصال به MySQL و ساخت خودکار جدول‌ها
│   ├── controllers/  منطق محصولات، کاربران، نظرات، سفارش‌ها
│   ├── routes/       مسیرهای API
│   ├── middleware/   احراز هویت (JWT) و مدیریت خطا
│   ├── services/     نرخ ارز و تحلیل نظرات
│   ├── scripts/      ابزار تست اتصال دیتابیس
│   ├── products.json داده اولیه ۲۵ محصول
│   └── seed.js       پر کردن دیتابیس
└── frontend/         صفحات سایت (فارسی/RTL) + PWA
```

**دیتابیس: فقط MySQL.** پشتیبانی از AxioDB و فایل JSON کاملاً حذف شده و همهٔ داده‌ها روی سرور دیتابیس ذخیره می‌شوند.

---

## 🗄️ جدول‌های دیتابیس

هنگام اولین اجرا، جدول‌ها به‌صورت خودکار ساخته می‌شوند:

| جدول | توضیح |
|------|-------|
| `products` | محصولات (مشخصات فنی در ستون JSON) |
| `users` | کاربران، آدرس‌ها، علاقه‌مندی‌ها، تاریخچه جستجو |
| `comments` | نظرات، امتیازها، پاسخ مدیر، تحلیل هوش مصنوعی |
| `orders` | سفارش‌ها و اقلام آن‌ها |

شناسه‌ها `AUTO_INCREMENT` هستند، پس در درخواست‌های همزمان هیچ رکوردی گم یا تکراری نمی‌شود.

---

## 🚀 اجرا روی سیستم خودتان

```bash
cd backend
npm install
cp .env.example .env      # سپس مقادیر داخل .env را پر کنید
npm run test:db           # تست اتصال به دیتابیس
npm run seed              # وارد کردن ۲۵ محصول و کاربر مدیر
npm run dev               # اجرا با nodemon
```

سپس باز کنید:

- `http://localhost:3000/` — فرانت‌اند
- `http://localhost:3000/api/products` — API محصولات
- `http://localhost:3000/health` — وضعیت سرویس و دیتابیس

---

## ⚙️ متغیرهای محیطی

| متغیر | الزامی | توضیح |
|-------|:------:|-------|
| `MYSQL_URL` | ✅ | آدرس کامل اتصال: `mysql://user:pass@host:port/dbname` |
| `JWT_SECRET` | ✅ | کلید امضای توکن — یک رشتهٔ تصادفی و طولانی |
| `ADMIN_PASSWORD` | ✅ | رمز کاربر مدیر که در اولین اجرا ساخته می‌شود |
| `ADMIN_USERNAME` | ➖ | پیش‌فرض `admin` |
| `AUTO_SEED` | ➖ | پیش‌فرض `true` — پر کردن خودکار دیتابیس خالی |
| `MYSQL_SSL` | ➖ | اگر دیتابیس SSL می‌خواهد `true` بگذارید |
| `DB_MAX_RETRIES` | ➖ | تعداد تلاش مجدد اتصال (پیش‌فرض ۸) |
| `ALLOWED_ORIGINS` | ➖ | محدود کردن دامنه‌های مجاز (خالی = همه) |
| `RATE_LIMIT_AUTH` | ➖ | سقف تلاش ناموفق ورود در ۱۵ دقیقه (پیش‌فرض ۱۵) |
| `RATE_LIMIT_API` | ➖ | سقف درخواست API در ۱۵ دقیقه (پیش‌فرض ۶۰۰) |
| `DEEPSEEK_API_KEY` | ➖ | تحلیل نظرات با AI (بدون آن تحلیل کلیدواژه‌ای کار می‌کند) |

به‌جای `MYSQL_URL` می‌توانید متغیرهای جدا هم بدهید:
`MYSQLHOST` / `MYSQLPORT` / `MYSQLUSER` / `MYSQLPASSWORD` / `MYSQLDATABASE`

---

## ☁️ استقرار: دیتابیس روی Railway + بک‌اند روی Render

> Render سرویس MySQL آماده ندارد (فقط PostgreSQL)، بنابراین دیتابیس را از Railway می‌گیریم.

### گام ۱ — ساخت دیتابیس MySQL در Railway

1. وارد [railway.app](https://railway.app) شوید و با GitHub ثبت‌نام کنید.
2. **New Project** → **Deploy MySQL** را بزنید.
3. چند ثانیه صبر کنید تا دیتابیس ساخته شود.
4. روی سرویس **MySQL** کلیک کنید → تب **Variables**.
5. مقدار **`MYSQL_PUBLIC_URL`** را کپی کنید.

   چیزی شبیه این است:
   ```
   mysql://root:AbCdEf123456@shinkansen.proxy.rlwy.net:34567/railway
   ```

> ⚠️ **مهم:** حتماً `MYSQL_PUBLIC_URL` را بردارید (شامل `proxy.rlwy.net`).
> متغیر `MYSQL_URL` در Railway آدرس **داخلی** (`mysql.railway.internal`) است و Render به شبکهٔ داخلی Railway دسترسی ندارد.

### گام ۲ — ساخت سرویس در Render

1. وارد [render.com](https://render.com) شوید و با GitHub وارد شوید.
2. **New** → **Web Service** → مخزن `arzankala--9` را انتخاب کنید.
3. تنظیمات:

   | گزینه | مقدار |
   |-------|-------|
   | Runtime | `Node` |
   | Build Command | `npm ci --omit=dev --prefix backend` |
   | Start Command | `node backend/server.js` |
   | Health Check Path | `/health` |

### گام ۳ — وارد کردن متغیرها در Render

در بخش **Environment** این مقادیر را اضافه کنید:

| Key | Value |
|-----|-------|
| `MYSQL_URL` | آدرسی که از Railway کپی کردید |
| `JWT_SECRET` | یک رشتهٔ تصادفی طولانی (مثلاً خروجی `openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | رمز دلخواه برای ورود مدیر |
| `NODE_ENV` | `production` |

### گام ۴ — انتشار

**Create Web Service** را بزنید. در اولین اجرا:

- جدول‌ها ساخته می‌شوند
- ۲۵ محصول، کاربر مدیر و نظرات نمونه وارد دیتابیس می‌شوند
- در لاگ‌ها می‌بینید: `🎉 داده‌گذاری اولیه کامل شد`

سلامت سرویس را بررسی کنید:

```
https://YOUR-APP.onrender.com/health
```

پاسخ درست:

```json
{
  "success": true,
  "database": { "available": true, "dbType": "mysql" },
  "counts": { "products": 25, "users": 1, "comments": 8, "orders": 0 }
}
```

### گام ۵ — اتصال فرانت‌اند GitHub Pages (در صورت استفاده)

در فایل `frontend/js/api.js` آدرس Render خود را جایگزین کنید،
یا در کنسول مرورگر یک‌بار این را اجرا کنید:

```js
localStorage.setItem('backendUrl', 'https://YOUR-APP.onrender.com/api');
```

---

## 🔧 رفع اشکال

| مشکل | راه‌حل |
|------|--------|
| `ECONNREFUSED` یا `ETIMEDOUT` | آدرس عمومی Railway (`proxy.rlwy.net`) را استفاده کنید، نه `.railway.internal` |
| `Access denied for user` | رمز داخل `MYSQL_URL` را دوباره از Railway کپی کنید |
| `/health` جواب نمی‌دهد | لاگ‌های Render را ببینید؛ پیام خطای اتصال دیتابیس آنجا چاپ می‌شود |
| دیتابیس خالی ماند | `AUTO_SEED=true` باشد، یا محلی `npm run seed` بزنید |
| سرویس Render کند بالا می‌آید | در پلن رایگان سرویس بعد از بی‌کاری می‌خوابد؛ اولین درخواست ~۵۰ ثانیه طول می‌کشد |

برای تست اتصال بدون بالا آوردن کل سرور:

```bash
npm run test:db --prefix backend
```

---

## 🔌 مهم‌ترین مسیرهای API

| متد | مسیر | توضیح |
|-----|------|-------|
| `GET` | `/health` | وضعیت سرویس و دیتابیس |
| `GET` | `/api/products` | لیست محصولات (فیلتر، مرتب‌سازی، صفحه‌بندی) |
| `GET` | `/api/products/:id` | جزئیات محصول |
| `GET` | `/api/products/search?q=` | جستجو |
| `GET` | `/api/products/complementary?cartIds=` | پیشنهاد کالای مکمل |
| `POST` | `/api/users/register` | ثبت‌نام |
| `POST` | `/api/users/login` | ورود |
| `GET` | `/api/users/profile` | پروفایل (نیازمند توکن) |
| `GET` | `/api/comments/product/:id` | نظرات محصول |
| `POST` | `/api/orders` | ثبت سفارش (نیازمند توکن) |

مسیرهای مدیریتی با `Authorization: Bearer <token>` و نقش `admin` در دسترس هستند.

---

## 🔒 امنیت

موارد زیر پیاده‌سازی و تست شده‌اند:

| مورد | وضعیت |
|------|:-----:|
| رمزنگاری رمز عبور با bcrypt | ✅ |
| احراز هویت با JWT و بررسی نقش مدیر | ✅ |
| مقاومت در برابر SQL Injection (کوئری پارامتری) | ✅ |
| عدم نشت رمز عبور در خروجی API | ✅ |
| هدرهای امنیتی با Helmet (CSP، HSTS، X-Frame-Options) | ✅ |
| محدودیت نرخ درخواست و جلوگیری از brute-force | ✅ |
| اعتبارسنجی ورودی‌ها (رمز، ایمیل، امتیاز، موجودی) | ✅ |
| پاک‌سازی خروجی در پنل مدیریت (جلوگیری از XSS) | ✅ |

**نکات مهم:**

- بعد از اولین ورود، رمز مدیر را عوض کنید.
- `JWT_SECRET` را هرگز داخل کد قرار ندهید — فقط در متغیرهای محیطی.
- فایل `.env` در `.gitignore` قرار دارد و نباید کامیت شود.
- برای محدود کردن دسترسی، `ALLOWED_ORIGINS` را تنظیم کنید.
