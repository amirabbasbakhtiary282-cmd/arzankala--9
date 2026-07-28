// ============================================================
// seed.js — پر کردن دیتابیس MySQL با داده‌های اولیه
// ============================================================
// استفاده:
//   node seed.js            → فقط اگر جدول‌ها خالی باشند داده وارد می‌کند
//   node seed.js --force    → همه داده‌ها را پاک و از نو وارد می‌کند
//
// همچنین تابع autoSeed از داخل server.js صدا زده می‌شود تا در
// اولین اجرا روی سرور (Render) دیتابیس به‌صورت خودکار پر شود.
// ============================================================

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// ------------------------------------------------------------
// 📦 محصولات — از فایل products.json خوانده می‌شود (۴۵ محصول واقعی)
// ------------------------------------------------------------
function loadProducts() {
    const jsonPath = path.join(__dirname, 'products.json');
    try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : (parsed.products || []);
        return list.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            oldPrice: p.oldPrice || null,
            priceUSD: p.priceUSD || null,
            oldPriceUSD: p.oldPriceUSD || null,
            image: p.image || 'default.jpg',
            stock: p.stock !== undefined ? p.stock : 0,
            rating: p.rating || 0,
            ratingCount: p.ratingCount || 0,
            description: p.description || '',
            specs: p.specs || {},
            viewCount: p.viewCount || 0,
            purchaseCount: p.purchaseCount || 0,
            wishlistCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));
    } catch (e) {
        console.error('⚠️ خواندن products.json ناموفق بود:', e.message);
        return [];
    }
}

// ------------------------------------------------------------
// 💬 نظرات نمونه
// ------------------------------------------------------------
const SAMPLE_COMMENTS = [
    { productId: 1, username: 'مهدی رضایی', rating: 5, title: 'کیفیت عالی', content: 'بعد از یک هفته استفاده، واقعاً از کیفیتش راضی هستم. صفحه نمایش عالی و پاسخگویی خوب.', pros: ['صفحه نمایش عالی', 'باتری خوب'], cons: [], sentiment: 'positive' },
    { productId: 1, username: 'سارا احمدی', rating: 4, title: '', content: 'قیمتش نسبت به امکاناتش مناسبه. فقط کاش زودتر شارژ میشد.', pros: ['قیمت مناسب'], cons: ['سرعت شارژ'], sentiment: 'positive' },
    { productId: 2, username: 'امیر حسینی', rating: 5, title: 'دوربین فوق‌العاده', content: 'دوربین ۲۰۰ مگاپیکسلی واقعاً شگفت‌انگیزه. عکس‌ها باورنکردنی هستن.', pros: ['دوربین عالی', 'قیمت مناسب'], cons: [], sentiment: 'positive' },
    { productId: 3, username: 'زهرا حسینی', rating: 5, title: 'ارزش خرید بالا', content: 'آیفون ۱۳ هنوز هم یکی از بهترین گزینه‌هاست. عملکرد روان و دوربین بی‌نظیر.', pros: ['عملکرد روان', 'دوربین'], cons: ['قیمت بالا'], sentiment: 'positive' },
    { productId: 6, username: 'رضا کریمی', rating: 4, title: '', content: 'برای کارهای اداری و دانشجویی کاملاً مناسبه. سبک و خوش‌دست.', pros: ['سبک', 'مناسب دانشجو'], cons: ['گرافیک ضعیف'], sentiment: 'positive' },
    { productId: 8, username: 'مریم موسوی', rating: 5, title: 'بهترین لپ‌تاپ', content: 'تراشه M2 فوق‌العاده سریعه و باتری تمام روز دوام میاره. بی‌صدا و خنک.', pros: ['سرعت M2', 'باتری عالی', 'بدون فن'], cons: ['قیمت بالا'], sentiment: 'positive' },
    { productId: 10, username: 'حسن جعفری', rating: 4, title: '', content: 'نویز کنسلینگ خوبی داره و برای قیمتش صدای خوبی میده.', pros: ['نویز کنسلینگ', 'قیمت مناسب'], cons: [], sentiment: 'positive' },
    { productId: 19, username: 'فاطمه نوری', rating: 5, title: 'عالی', content: 'ایرپاد پرو ۲ نویز کنسلینگ فوق‌العاده‌ای داره. کیفیت صدا عالیه.', pros: ['نویز کنسلینگ عالی', 'کیفیت صدا'], cons: ['قیمت'], sentiment: 'positive' }
];

const RANDOM_USERS = ['علی محمدی', 'سارا احمدی', 'محمد رضایی', 'زهرا حسینی', 'رضا کریمی', 'مریم موسوی', 'حسن جعفری', 'فاطمه نوری'];

// ------------------------------------------------------------
// 🌱 وارد کردن داده‌ها
// ------------------------------------------------------------
async function seedProducts(productsCollection, { force = false } = {}) {
    const existing = await productsCollection.count();

    if (existing > 0 && !force) {
        console.log(`ℹ️ ${existing} محصول از قبل موجود است — از درج مجدد صرف‌نظر شد`);
        return 0;
    }

    if (force && existing > 0) {
        const all = await productsCollection.getAll();
        for (const p of all) {
            await productsCollection.delete({ id: p.id });
        }
        console.log(`🗑️ ${all.length} محصول قبلی حذف شد`);
    }

    const products = loadProducts();
    let added = 0;
    for (const p of products) {
        try {
            await productsCollection.insert(p);
            added++;
        } catch (e) {
            console.error(`خطا در درج محصول ${p.id}:`, e.message);
        }
    }
    console.log(`✅ ${added} محصول وارد دیتابیس شد`);
    return added;
}

async function seedAdmin(usersCollection, { force = false } = {}) {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await usersCollection.getByUsername(adminUsername);
    if (existing && !force) {
        console.log(`ℹ️ کاربر مدیر «${adminUsername}» از قبل وجود دارد`);
        return false;
    }

    const hashed = await bcrypt.hash(adminPassword, 10);

    if (existing) {
        await usersCollection.update({ id: existing.id }, { password: hashed, role: 'admin', isActive: true });
        console.log(`♻️ رمز کاربر مدیر «${adminUsername}» به‌روزرسانی شد`);
        return true;
    }

    const maxId = await usersCollection.maxId();
    await usersCollection.insert({
        id: maxId + 1,
        username: adminUsername,
        password: hashed,
        fullname: 'مدیر سایت',
        email: 'admin@arzankala.com',
        mobile: '',
        birthYear: null,
        role: 'admin',
        isActive: true,
        addresses: [],
        wishlist: [],
        searchHistory: [],
        settings: {},
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    console.log(`✅ کاربر مدیر ایجاد شد (${adminUsername})`);
    if (!process.env.ADMIN_PASSWORD) {
        console.log('⚠️ رمز پیش‌فرض admin123 است — حتماً متغیر ADMIN_PASSWORD را تنظیم کنید');
    }
    return true;
}

async function seedComments(commentsCollection, productsCollection, { force = false } = {}) {
    const existing = await commentsCollection.count();

    if (existing > 0 && !force) {
        console.log(`ℹ️ ${existing} نظر از قبل موجود است — از درج مجدد صرف‌نظر شد`);
        return 0;
    }

    if (force && existing > 0) {
        const all = await commentsCollection.getAll();
        for (const c of all) {
            await commentsCollection.delete({ id: c.id });
        }
        console.log(`🗑️ ${all.length} نظر قبلی حذف شد`);
    }

    let nextId = (await commentsCollection.maxId()) + 1;
    let added = 0;

    for (const c of SAMPLE_COMMENTS) {
        // فقط برای محصولاتی که واقعاً وجود دارند نظر ثبت شود
        const product = await productsCollection.getById(c.productId);
        if (!product) continue;

        const daysAgo = Math.floor(Math.random() * 90);
        const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

        try {
            await commentsCollection.insert({
                id: nextId++,
                productId: c.productId,
                userId: 'seed_user',
                username: c.username || RANDOM_USERS[Math.floor(Math.random() * RANDOM_USERS.length)],
                rating: c.rating,
                title: c.title || '',
                content: c.content,
                pros: c.pros || [],
                cons: c.cons || [],
                images: [],
                isApproved: true,
                isVerifiedPurchase: Math.random() > 0.3,
                helpfulCount: Math.floor(Math.random() * 15),
                unhelpfulCount: Math.floor(Math.random() * 3),
                helpfulUsers: [],
                reply: { content: '', repliedBy: null, repliedAt: null },
                aiAnalysis: {
                    sentiment: c.sentiment || 'neutral',
                    positivePoints: c.pros || [],
                    negativePoints: c.cons || [],
                    summary: '',
                    analyzedBy: 'keyword'
                },
                createdAt: date,
                updatedAt: date
            });
            added++;
        } catch (e) {
            console.error('خطا در درج نظر:', e.message);
        }
    }

    console.log(`✅ ${added} نظر نمونه وارد دیتابیس شد`);
    return added;
}

// محاسبه مجدد امتیاز محصولات بر اساس نظرات تأییدشده
async function recalculateRatings(commentsCollection, productsCollection) {
    const comments = await commentsCollection.getAll();
    const approved = comments.filter(c => c.isApproved);

    const map = {};
    approved.forEach(c => {
        if (!map[c.productId]) map[c.productId] = { sum: 0, count: 0 };
        map[c.productId].sum += c.rating || 0;
        map[c.productId].count++;
    });

    for (const [pid, data] of Object.entries(map)) {
        const avg = Math.round((data.sum / data.count) * 10) / 10;
        try {
            await productsCollection.update({ id: parseInt(pid, 10) }, { rating: avg, ratingCount: data.count });
        } catch (e) {
            console.error(`خطا در به‌روزرسانی امتیاز محصول ${pid}:`, e.message);
        }
    }
}

// ------------------------------------------------------------
// 🔄 همگام‌سازی محصولات — فقط محصولات جاافتاده اضافه می‌شوند
// ------------------------------------------------------------
// برخلاف seedProducts که فقط وقتی جدول خالی باشد داده وارد می‌کند،
// این تابع در هر اجرا محصولات products.json را با دیتابیس مقایسه
// می‌کند و فقط محصولاتی که از قلم افتاده‌اند را اضافه می‌کند.
//
// ✅ فقط محصولات missing را اضافه می‌کند
// ✅ محصولات موجود را تغییر نمی‌دهد
// ✅ چیزی حذف نمی‌کند
// ✅ از MySQL فعلی استفاده می‌کند
// ------------------------------------------------------------
async function syncProducts(productsCollection) {
    const products = loadProducts();

    if (products.length === 0) {
        console.log('⚠️ محصولی در products.json یافت نشد');
        return 0;
    }

    console.log(`🔍 بررسی ${products.length} محصول از products.json برای همگام‌سازی...`);

    let added = 0;
    let skipped = 0;

    for (const p of products) {
        try {
            const existing = await productsCollection.getById(p.id);
            if (existing) {
                skipped++;
            } else {
                await productsCollection.insert(p);
                added++;
                console.log(`  ➕ محصول #${p.id} «${p.name}» به دیتابیس اضافه شد`);
            }
        } catch (e) {
            console.error(`  ❌ خطا در همگام‌سازی محصول ${p.id}: ${e.message}`);
        }
    }

    if (added > 0) {
        console.log(`✅ ${added} محصول جاافتاده به دیتابیس اضافه شد (${skipped} محصول از قبل موجود بود)`);
    } else {
        console.log(`✅ همه ${skipped} محصول از قبل در دیتابیس موجود هستند — چیزی برای اضافه کردن نیست`);
    }

    return added;
}

// ------------------------------------------------------------
// 🤖 داده‌گذاری خودکار (از داخل server.js)
// ------------------------------------------------------------
// فقط وقتی جدول‌ها خالی باشند داده وارد می‌کند، بنابراین اجرای
// مکرر آن روی Render هیچ داده‌ای را بازنویسی نمی‌کند.
// همچنین syncProducts را همیشه اجرا می‌کند تا محصولات جدیدی که
// ممکن است به products.json اضافه شده باشند، در دیتابیس هم بیایند.
// ------------------------------------------------------------
async function autoSeed(collections) {
    const { productsCollection, usersCollection, commentsCollection } = collections;

    const productCount = await productsCollection.count();
    const userCount = await usersCollection.count();
    const commentCount = await commentsCollection.count();

    if (productCount > 0 && userCount > 0) {
        console.log(`ℹ️ دیتابیس از قبل پر است (${productCount} محصول، ${userCount} کاربر) — داده‌گذاری اولیه لازم نیست`);
        // حتی اگر دیتابیس پر باشد، syncProducts را اجرا کن تا محصولات جاافتاده اضافه شوند
        await syncProducts(productsCollection);
        return;
    }

    console.log('🌱 دیتابیس خالی است — در حال وارد کردن داده‌های اولیه...');

    if (productCount === 0) await seedProducts(productsCollection);
    if (userCount === 0) await seedAdmin(usersCollection);
    if (commentCount === 0) await seedComments(commentsCollection, productsCollection);

    await recalculateRatings(commentsCollection, productsCollection);

    // بعد از seed اولیه، syncProducts اجرا می‌شود تا اگر
    // محصولی از قلم افتاده باشد، اضافه شود
    await syncProducts(productsCollection);

    console.log('🎉 داده‌گذاری اولیه کامل شد');
}

// ------------------------------------------------------------
// 🖥️ اجرای مستقیم از خط فرمان
// ------------------------------------------------------------
async function runCli() {
    const force = process.argv.includes('--force');
    const { connectDB, closeDB } = require('./config/database');

    try {
        console.log('🔄 اتصال به دیتابیس...');
        const db = await connectDB();

        if (force) {
            console.log('⚠️ حالت --force فعال است: داده‌های موجود پاک می‌شوند');
        }

        await seedProducts(db.productsCollection, { force });
        await seedAdmin(db.usersCollection, { force });
        await seedComments(db.commentsCollection, db.productsCollection, { force });
        await recalculateRatings(db.commentsCollection, db.productsCollection);
        await syncProducts(db.productsCollection);

        const counts = {
            products: await db.productsCollection.count(),
            users: await db.usersCollection.count(),
            comments: await db.commentsCollection.count(),
            orders: await db.ordersCollection.count()
        };

        console.log('========================================');
        console.log('🎉 داده‌گذاری کامل شد');
        console.log(`   محصولات: ${counts.products}`);
        console.log(`   کاربران:  ${counts.users}`);
        console.log(`   نظرات:   ${counts.comments}`);
        console.log(`   سفارشات: ${counts.orders}`);
        console.log('========================================');

        await closeDB();
        process.exit(0);
    } catch (error) {
        console.error('❌ خطای seed:', error.message);
        try { await closeDB(); } catch { /* ignore */ }
        process.exit(1);
    }
}

module.exports = { autoSeed, seedProducts, seedAdmin, seedComments, recalculateRatings, loadProducts, syncProducts };

// فقط وقتی مستقیماً اجرا شود (نه هنگام require از server.js)
if (require.main === module) {
    runCli();
}
