const { connectDB } = require('./config/database');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use the frontend products data as canonical seed source
const productsSource = require('../frontend/js/products-data.js');

const FORCE = process.argv.includes('--force');

async function seedDatabase() {
    try {
        console.log('🔄 اتصال به دیتابیس (wrapper) ...');
        const { productsCollection, usersCollection, commentsCollection } = await connectDB();

        // If --force provided, remove existing documents safely using wrapper
        if (FORCE) {
            console.log('⚠️ پاک‌سازی داده‌های موجود (force) ...');
            const existingProducts = await productsCollection.getAll();
            for (const p of existingProducts) {
                await productsCollection.delete({ id: p.id });
            }
            const existingComments = await commentsCollection.getAll();
            for (const c of existingComments) {
                await commentsCollection.delete({ id: c.id });
            }
            const existingUsers = await usersCollection.getAll();
            for (const u of existingUsers) {
                // avoid deleting system/admin if you want — here we delete all for a clean slate
                await usersCollection.delete({ id: u.id });
            }
            console.log('🧹 پاک‌سازی کامل انجام شد');
        }

        // ========== محصولات ==========
        console.log('📦 اضافه کردن محصولات از frontend/js/products-data.js ...');
        let addedCount = 0;
        for (const product of productsSource) {
            const exists = await productsCollection.getById(product.id);
            if (exists) continue;
            // ensure createdAt
            const p = { ...product, createdAt: new Date().toISOString() };
            await productsCollection.insert(p);
            addedCount++;
            if (addedCount % 10 === 0) console.log(`✅ ${addedCount} محصول اضافه شد`);
        }
        console.log(`🎉 ${addedCount} محصول جدید اضافه شد (در صورت وجود مجدد نادیده گرفته شد)`);

        // ========== کاربر ادمین ==========
        const adminUsername = 'admin';
        const adminExists = await usersCollection.getByUsername ? await usersCollection.getByUsername(adminUsername) : (await usersCollection.getAll()).find(u => u.username === adminUsername);
        if (!adminExists) {
            console.log('🔐 ایجاد کاربر ادمین ...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const adminUser = {
                id: 1,
                username: adminUsername,
                password: hashedPassword,
                fullname: 'مدیر سایت',
                email: 'admin@arzankala.com',
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
            };
            await usersCollection.insert(adminUser);
            console.log('✅ کاربر ادمین ایجاد شد (username: admin, password: admin123)');
        } else {
            console.log('ℹ️ کاربر ادمین قبلاً وجود دارد، ایجاد نشد');
        }

        // ========== نظرات نمونه (اختیاری) ==========
        console.log('💬 افزودن چند نظر نمونه ...');
        const sampleComments = [
            { productId: 1, username: 'مهدی رضایی', content: 'بعد از یک هفته استفاده، واقعاً از کیفیتش راضی هستم.', rating: 5, isApproved: true },
            { productId: 2, username: 'امیر حسینی', content: 'دوربین عالی است، مخصوصاً برای عکاسی روزانه.', rating: 4, isApproved: true },
            { productId: 6, username: 'الناز موسوی', content: 'لپ‌تاپ بد نیست، باتری متوسطی داشت.', rating: 4, isApproved: false }
        ];

        let commentStartId = 1;
        const existingComments = await commentsCollection.getAll();
        if (existingComments && existingComments.length > 0) {
            const ids = existingComments.map(c => parseInt(c.id)).filter(n => !isNaN(n));
            commentStartId = ids.length > 0 ? Math.max(...ids) + 1 : commentStartId;
        }

        let commentAdded = 0;
        for (const c of sampleComments) {
            // do not duplicate same content
            const all = await commentsCollection.getAll();
            const dup = all.find(x => x.productId === c.productId && x.username === c.username && x.content === c.content);
            if (dup) continue;
            const comment = { id: commentStartId++, ...c, createdAt: new Date().toISOString() };
            await commentsCollection.insert(comment);
            commentAdded++;
        }
        console.log(`🎉 ${commentAdded} نظر نمونه اضافه شد`);

        // ========== محاسبهٔ امتیاز محصولات بر اساس نظرات تأیید شده ==========
        console.log('🔢 بازمحاسبه امتیازات محصولات بر اساس نظرات تأیید شده ...');
        const allComments = await commentsCollection.getAll();
        const approvedComments = allComments.filter(cc => cc.isApproved === true);
        const productRatings = {};
        for (const c of approvedComments) {
            if (!productRatings[c.productId]) productRatings[c.productId] = { sum: 0, count: 0 };
            productRatings[c.productId].sum += (c.rating || 0);
            productRatings[c.productId].count += 1;
        }
        for (const [productId, data] of Object.entries(productRatings)) {
            const avgRating = Math.round((data.sum / data.count) * 10) / 10;
            await productsCollection.update({ id: parseInt(productId) }, { rating: avgRating, ratingCount: data.count });
            console.log(`⭐ محصول ${productId}: امتیاز ${avgRating} (${data.count} نظر)`);
        }

        console.log('🎉 عملیات seed با موفقیت انجام شد');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطا در seed:', error.message);
        process.exit(1);
    }
}

seedDatabase();
