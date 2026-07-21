// ============================================
// seed.js - پر کردن دیتابیس (AxioDB یا json fallback) با محصولات و داده نمونه
// استفاده: node seed.js [--force]
// --force: دیتای موجود را پاک می‌کند (در صورت استفاده از json fallback فایل‌ها حذف می‌شوند، در صورت AxioDB سعی می‌شود رکوردها حذف شوند)
// ============================================

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const { connectDB } = require('./config/database');

const FALLBACK_RATE = 1753100;
function toToman(usd) { return Math.round(usd * FALLBACK_RATE / 10); }

const products = [
    { id: 1, name: "گوشی سامسونگ Galaxy A54", category: "mobile", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "a54.jpg", stock: 18, rating: 4.5 },
    { id: 2, name: "گوشی شیائومی Redmi Note 13 Pro", category: "mobile", price: toToman(300), priceUSD: 300, oldPrice: toToman(360), oldPriceUSD: 360, image: "redmi13pro.jpg", stock: 25 },
    { id: 3, name: "گوشی اپل iPhone 13", category: "mobile", price: toToman(600), priceUSD: 600, oldPrice: toToman(720), oldPriceUSD: 720, image: "iphone13.jpg", stock: 8, rating: 4.9 },
    { id: 4, name: "تبلت سامسونگ Galaxy Tab S9", category: "tablet", price: toToman(650), priceUSD: 650, oldPrice: toToman(780), oldPriceUSD: 780, image: "tabs9.jpg", stock: 12 },
    { id: 5, name: "گوشی Poco X6 Pro", category: "mobile", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "pocoX6Pro.jpg", stock: 18, rating: 4.4 },
    { id: 6, name: "لپ تاپ ایسوس VivoBook 15", category: "laptop", price: toToman(550), priceUSD: 550, oldPrice: toToman(660), oldPriceUSD: 660, image: "vivobook15.jpg", stock: 10 },
    { id: 7, name: "لپ تاپ لنوو IdeaPad Gaming 3", category: "laptop", price: toToman(700), priceUSD: 700, oldPrice: toToman(840), oldPriceUSD: 840, image: "ideapadGaming3.jpg", stock: 7 },
    { id: 8, name: "لپ تاپ اپل MacBook Air M2", category: "laptop", price: toToman(900), priceUSD: 900, oldPrice: toToman(1080), oldPriceUSD: 1080, image: "macbookAirM2.jpg", stock: 5, rating: 4.8 },
    { id: 9, name: "مانیتور ال جی 27 اینچ UltraGear", category: "monitor", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "ultragear27.jpg", stock: 9 },
    { id: 10, name: "هدفون بلوتوثی JBL Tune 760NC", category: "accessory", price: toToman(130), priceUSD: 130, oldPrice: toToman(156), oldPriceUSD: 156, image: "jbl760nc.jpg", stock: 20 }
    // (برای اختصار فقط 10 محصول در این seed نمونه قرار داده شده؛ می‌توانید بقیه را اضافه کنید)
];

const sampleComments = [
    { productId: 1, username: "مهدی رضایی", content: "بعد از یک هفته استفاده، واقعاً از کیفیتش راضی هستم. صفحه نمایش عالی و پاسخگویی خوب.", rating: 5, isApproved: true },
    { productId: 1, username: "سارا احمدی", content: "قیمتش نسبت به امکاناتش مناسبه. فقط کاش زودتر شارژ میشد.", rating: 4, isApproved: true },
    { productId: 2, username: "امیر حسینی", content: "دوربین ۲۰۰ مگاپیکسلی واقعاً شگفت‌انگیزه. عکس‌ها باورنکردنی هستن.", rating: 5, isApproved: true }
];

async function clearCollectionSafe(collection) {
    try {
        const all = await collection.getAll();
        if (Array.isArray(all)) {
            for (const doc of all) {
                try {
                    await collection.delete({ id: doc.id });
                } catch (e) {
                    // best-effort
                }
            }
        }
    } catch (e) {
        // ignore
    }
}

async function removeJsonFilesIfExists(jsonDbPath) {
    try {
        const names = ['products.json','users.json','comments.json','orders.json'];
        for (const n of names) {
            const p = path.join(jsonDbPath, n);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        return true;
    } catch (e) {
        console.error('Error removing json files:', e.message);
        return false;
    }
}

async function seedDatabase() {
    const force = process.argv.includes('--force');

    try {
        console.log('🔄 اتصال به دیتابیس...');
        const result = await connectDB();
        const { productsCollection, usersCollection, commentsCollection } = result;

        if (force) {
            console.log('⚠️ گزینه --force فعال است: پاک‌سازی داده‌های موجود (best-effort)');
            if (result.usingAxioDB) {
                console.log('درحال پاک‌سازی رکوردها از AxioDB (تلاش می‌شود)...');
                await clearCollectionSafe(productsCollection);
                await clearCollectionSafe(usersCollection);
                await clearCollectionSafe(commentsCollection);
            } else if (result.jsonDbPath) {
                console.log('درحال حذف فایل‌های json پایگاه داده...');
                await removeJsonFilesIfExists(result.jsonDbPath);
            }
        }

        // Insert products
        console.log('🔁 درج محصولات نمونه...');
        let added = 0;
        for (const p of products) {
            try {
                await productsCollection.insert(p);
                added++;
                console.log(`✅ [${added}] ${p.name}`);
            } catch (e) {
                console.error('خطا در درج محصول:', e.message);
            }
        }

        // Insert admin user if not exists
        try {
            const existingAdmin = await usersCollection.getByUsername && await usersCollection.getByUsername('admin');
            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await usersCollection.insert({ id: 1, username: 'admin', password: hashedPassword, fullname: 'مدیر سایت', email: 'admin@arzankala.com', role: 'admin', isActive: true, createdAt: new Date().toISOString() });
                console.log('✅ کاربر ادمین ایجاد شد (admin/admin123)');
            } else {
                console.log('ℹ️ کاربر admin قبلاً وجود دارد، از ایجاد مجدد صرف‌نظر شد');
            }
        } catch (e) {
            console.error('خطا در درج کاربر ادمین:', e.message);
        }

        // Insert comments
        console.log('🔁 درج نظرات نمونه...');
        let ccount = 0;
        for (const c of sampleComments) {
            try {
                const withId = { id: Date.now() + Math.floor(Math.random()*1000), ...c, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                await commentsCollection.insert(withId);
                ccount++;
                console.log(`✅ نظر نمونه برای محصول ${c.productId} اضافه شد`);
            } catch (e) {
                console.error('خطا در درج نظر:', e.message);
            }
        }

        // Recalculate product ratings
        try {
            const allComments = await commentsCollection.getAll();
            const approved = allComments.filter(x => x.isApproved === true);
            const ratingsMap = {};
            approved.forEach(c => {
                if (!ratingsMap[c.productId]) ratingsMap[c.productId] = { sum: 0, count: 0 };
                ratingsMap[c.productId].sum += c.rating || 0;
                ratingsMap[c.productId].count += 1;
            });

            for (const [pid, data] of Object.entries(ratingsMap)) {
                const avg = Math.round((data.sum / data.count) * 10) / 10;
                try {
                    await productsCollection.update({ id: parseInt(pid) }, { rating: avg, ratingCount: data.count });
                } catch (e) {
                    // maybe update returns different shape; try best-effort
                    try { await productsCollection.update({ id: parseInt(pid) }, { rating: avg, ratingCount: data.count }); } catch (_) {}
                }
            }
        } catch (e) {
            console.error('خطا در محاسبهٔ امتیاز محصولات:', e.message);
        }

        console.log('========================================');
        console.log(`🎉 درج نمونه‌ها به پایان رسید: ${added} محصول، ${ccount} نظر`);
        console.log('========================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ خطای seed:', error.message);
        process.exit(1);
    }
}

seedDatabase();
