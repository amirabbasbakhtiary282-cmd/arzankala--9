const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// پشت پروکسی Render قرار داریم؛ برای گرفتن IP واقعی کاربر لازم است
app.set('trust proxy', 1);

// نسخه Express را در هدرها اعلام نکن
app.disable('x-powered-by');

// ============================================================
// 🛡️ هدرهای امنیتی
// ============================================================
app.use(helmet({
    // فرانت‌اند از CDN (بوت‌استرپ، Chart.js، Font Awesome) و تصاویر خارجی
    // استفاده می‌کند، پس سیاست محتوا متناسب با آن تنظیم شده است.
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'data:', 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"]
        }
    },
    // اجازه بارگذاری تصاویر/فونت از دامنه دیگر (GitHub Pages → Render)
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// ============================================================
// 🚦 محدودیت نرخ درخواست
// ============================================================
// جلوگیری از حملات brute-force روی ورود/ثبت‌نام و سوءاستفاده از API
// ============================================================
const rateLimitOptions = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // شمارش بر اساس IP واقعی کاربر پشت پروکسی Render
    keyGenerator: (req) => req.ip
};

// محدودیت عمومی روی کل API
const apiLimiter = rateLimit({
    ...rateLimitOptions,
    windowMs: 15 * 60 * 1000,           // ۱۵ دقیقه
    limit: parseInt(process.env.RATE_LIMIT_API || '600', 10),
    message: {
        success: false,
        error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});

// محدودیت سخت‌گیرانه روی ورود و ثبت‌نام
const authLimiter = rateLimit({
    ...rateLimitOptions,
    windowMs: 15 * 60 * 1000,           // ۱۵ دقیقه
    limit: parseInt(process.env.RATE_LIMIT_AUTH || '15', 10),
    skipSuccessfulRequests: true,        // فقط تلاش‌های ناموفق شمرده می‌شوند
    message: {
        success: false,
        error: 'تلاش‌های ناموفق بیش از حد مجاز. لطفاً ۱۵ دقیقه دیگر تلاش کنید',
        code: 'TOO_MANY_ATTEMPTS'
    }
});

// ============================================================
// ✅ تنظیمات CORS
// ============================================================
// اگر ALLOWED_ORIGINS تعریف شده باشد فقط همان دامنه‌ها اجازه دارند،
// در غیر این صورت (پیش‌فرض) همه دامنه‌ها مجاز هستند تا GitHub Pages
// بتواند بدون تنظیم اضافی به API وصل شود.
// ============================================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// ============================================================
// 📦 Import route files
// ============================================================
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const orderRoutes = require('./routes/orders');

const productController = require('./controllers/productController');
const userController = require('./controllers/userController');
const commentController = require('./controllers/commentController');
const orderController = require('./controllers/orderController');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// وضعیت دیتابیس برای گزارش در /health
let dbStatus = {
    available: false,
    dbType: 'mysql',
    host: null,
    database: null
};

let globalCollections = {
    productsCollection: null,
    usersCollection: null,
    commentsCollection: null,
    ordersCollection: null
};

// ============================================================
// 🗄️ راه‌اندازی دیتابیس
// ============================================================
async function initializeDatabase() {
    const { connectDB } = require('./config/database');

    // در صورت شکست، connectDB خودش چند بار تلاش می‌کند و
    // در نهایت خطا می‌دهد تا سرور با وضعیت خطا متوقف شود.
    const result = await connectDB();

    globalCollections = {
        productsCollection: result.productsCollection,
        usersCollection: result.usersCollection,
        commentsCollection: result.commentsCollection,
        ordersCollection: result.ordersCollection
    };

    dbStatus = {
        available: true,
        dbType: result.dbType,
        host: result.host,
        database: result.database
    };

    productController.setCollection(result.productsCollection);
    userController.setCollection(result.usersCollection);
    commentController.setCollections(result.commentsCollection, result.productsCollection);
    orderController.setCollection(result.ordersCollection);

    // در اولین اجرا، اگر دیتابیس خالی بود داده‌های اولیه وارد می‌شود
    if (process.env.AUTO_SEED !== 'false') {
        try {
            const { autoSeed } = require('./seed');
            await autoSeed(globalCollections);
        } catch (e) {
            // خطای seed نباید جلوی بالا آمدن سرور را بگیرد
            console.error('⚠️ خطا در داده‌گذاری اولیه (سرور همچنان اجرا می‌شود):', e.message);
        }
    }

    return globalCollections;
}

// شمارش رکوردهای یک جدول برای /health
async function getCountFromCollection(col) {
    if (!col) return 0;
    try {
        return await col.count();
    } catch (e) {
        console.error('خطا در شمارش رکوردها:', e.message);
        return 0;
    }
}

// ============================================================
// 🚀 راه‌اندازی سرور
// ============================================================
async function startServer() {
    try {
        await initializeDatabase();

        // ---------- مسیرهای API ----------
        // محدودیت سخت روی ورود/ثبت‌نام (قبل از محدودیت عمومی)
        app.use('/api/users/login', authLimiter);
        app.use('/api/users/register', authLimiter);

        // محدودیت عمومی روی کل API
        app.use('/api', apiLimiter);

        app.use('/api/products', productRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/comments', commentRoutes);
        app.use('/api/orders', orderRoutes);

        const exchangeRateService = require('./services/exchangeRateService');

        app.get('/api/exchange-rate', async (req, res) => {
            try {
                const info = await exchangeRateService.getRate();
                res.json({
                    success: true,
                    rate: info.rate,
                    previousRate: info.previousRate,
                    source: info.source,
                    lastUpdate: info.lastUpdate,
                    change: info.change,
                    changePercent: info.changePercent
                });
            } catch (e) {
                res.json({
                    success: true,
                    rate: 750000,
                    previousRate: 750000,
                    source: 'fallback',
                    lastUpdate: null,
                    change: 0,
                    changePercent: 0
                });
            }
        });

        // ---------- بررسی سلامت سرویس ----------
        app.get('/health', async (req, res) => {
            try {
                const [products, users, comments, orders] = await Promise.all([
                    getCountFromCollection(globalCollections.productsCollection),
                    getCountFromCollection(globalCollections.usersCollection),
                    getCountFromCollection(globalCollections.commentsCollection),
                    getCountFromCollection(globalCollections.ordersCollection)
                ]);

                res.json({
                    success: true,
                    status: 'OK',
                    timestamp: new Date().toISOString(),
                    database: {
                        available: dbStatus.available,
                        dbType: dbStatus.dbType,
                        host: dbStatus.host,
                        database: dbStatus.database
                    },
                    counts: { products, users, comments, orders }
                });
            } catch (e) {
                res.status(503).json({
                    success: false,
                    status: 'DEGRADED',
                    error: e.message,
                    database: { available: false, dbType: dbStatus.dbType }
                });
            }
        });

        // ---------- فایل‌های استاتیک فرانت‌اند ----------
        const frontendPath = path.join(__dirname, '..', 'frontend');
        app.use(express.static(frontendPath));

        app.get('/', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        // مسیرهای ناشناختهٔ غیر-API به فرانت‌اند سپرده می‌شوند
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path === '/health') {
                return next();
            }
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        app.use(notFoundHandler);
        app.use(errorHandler);

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('========================================');
            console.log('🚀 سرور ارزان‌کالا روشن شد');
            console.log('========================================');
            console.log(`📡 پورت: ${PORT}`);
            console.log(`🗄️  دیتابیس: MySQL @ ${dbStatus.host}/${dbStatus.database}`);
            console.log(`📡 محصولات: /api/products`);
            console.log(`📡 سلامت: /health`);
            console.log('========================================');
        });

        // ---------- خاموش شدن تمیز (برای Render) ----------
        const shutdown = async (signal) => {
            console.log(`\n${signal} دریافت شد — در حال خاموش کردن سرور...`);
            server.close(async () => {
                try {
                    const { closeDB } = require('./config/database');
                    await closeDB();
                    console.log('✅ اتصال دیتابیس بسته شد');
                } catch { /* ignore */ }
                process.exit(0);
            });
            // اگر ظرف ۱۰ ثانیه بسته نشد، اجباری خارج شو
            setTimeout(() => process.exit(1), 10000).unref();
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('');
        console.error('========================================');
        console.error('❌ سرور راه‌اندازی نشد');
        console.error('========================================');
        console.error(error.message);
        console.error('========================================');
        process.exit(1);
    }
}

startServer();

module.exports = app;
