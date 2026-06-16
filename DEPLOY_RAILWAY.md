# راهنمای Deploy بک‌اند روی Railway (رایگان)

## پیش‌نیازها
- GitHub account
- Repository: `https://github.com/amirabbasbakhtiary282-cmd/arzankala--9`

---

## مراحل Deploy

### 1. Railway CLI نصب و لاگین
```bash
npm install -g @railway/cli
railway login
```

### 2. پروژه Railway بسازید
```bash
cd D:\arzankala\source-code\backend
railway init
# گزینه "Create new project" رو انتخاب کنید
```

### 3. Environment Variables ست کنید
در داشبورد Railway (Settings > Variables) این‌ها رو اضافه کنید:

```
PORT=3000
NODE_ENV=production
JWT_SECRET=arzankala_super_secret_key_2024_change_this_in_production
JWT_EXPIRES_IN=7d
BCRYPT_SALT=10
DEEPSEEK_API_KEY=sk-729f7e55bea5458c9ce275501667a963
FRONTEND_URL=https://amirabbasbakhtiary282-cmd.github.io/arzankala--9
```

### 4. Deploy کنید
```bash
railway up
```

### 5. آدرس بک‌اند رو بگیرید
بعد از deploy، Railway یه URL میده مثلاً:
```
https://arzankala-backend-production.up.railway.app
```

---

## آپدیت فرانت‌اند

بعد از گرفتن آدرس Railway، فایل `js/config.js` رو آپدیت کنید:

```javascript
const CONFIG = {
    API_URL: 'https://YOUR-RAILWAY-URL.railway.app/api',
    isLocalhost: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
    useLocalData: function() {
        return !this.API_URL || this.isLocalhost;
    }
};
window.CONFIG = CONFIG;
```

سپس commit و push کنید:
```bash
cd D:\arzankala\source-code
git add .
git commit -m "feat: update API_URL for Railway backend"
git push origin main
```

---

## تست

1. سایت GitHub Pages رو باز کنید: `https://amirabbasbakhtiary282-cmd.github.io/arzankala--9/`
2. در کنسول مرورگر (F12) باید ببینید:
   ```
   [API] Environment: production | API_URL: https://your-url.railway.app/api
   ```
3. نرخ ارز، محصولات، نظرات، سفارشات همه از بک‌اند میاد

---

## نکات مهم

- **Railway Free Tier**: 500 ساعت ماهانه، 1GB RAM، 1GB دیسک
- **AxioDB**: فایل-بیس، روی Railway persisted نمیشه (هر deploy ریست میشه)
- برای داده‌های دائمی، MongoDB Atlas (رایگان 512MB) بهتره
- `railway logs` برای دیباگ

---

## عیب‌یابی

| مشکل | راه حل |
|-------|--------|
| CORS error | `FRONTEND_URL` در Railway env ست شده؟ |
| 502/503 | `railway logs` ببینید، احتمالاً build fail شده |
| AxioDB reset | برای production از MongoDB استفاده کنید |
| نرخ ارز 0 | Railway بلاک نکرده؟ IP ایران رو چک کنید |

---

## آپدیت‌های بعدی
```bash
cd backend
git add .
git commit -m "update"
git push
railway up
```