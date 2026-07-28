#!/usr/bin/env node
// ============================================================
// scripts/test-connection.js
// تست اتصال به MySQL بدون بالا آوردن کل سرور
// اجرا:  npm run test:db
// ============================================================

require('dotenv').config();

const { connectDB, closeDB, dbConfig } = require('../config/database');

(async () => {
    console.log('========================================');
    console.log('🔍 تست اتصال به MySQL');
    console.log('========================================');
    console.log(`   میزبان:    ${dbConfig.host}`);
    console.log(`   پورت:      ${dbConfig.port}`);
    console.log(`   کاربر:     ${dbConfig.user}`);
    console.log(`   دیتابیس:   ${dbConfig.database}`);
    console.log(`   SSL:       ${dbConfig.ssl ? 'فعال' : 'غیرفعال'}`);
    console.log('========================================');

    try {
        const db = await connectDB();

        const counts = {
            products: await db.productsCollection.count(),
            users: await db.usersCollection.count(),
            comments: await db.commentsCollection.count(),
            orders: await db.ordersCollection.count()
        };

        console.log('');
        console.log('✅ اتصال موفق بود!');
        console.log('');
        console.log('📊 تعداد رکوردها:');
        console.log(`   محصولات: ${counts.products}`);
        console.log(`   کاربران:  ${counts.users}`);
        console.log(`   نظرات:   ${counts.comments}`);
        console.log(`   سفارشات: ${counts.orders}`);
        console.log('');

        if (counts.products === 0) {
            console.log('💡 دیتابیس خالی است. برای پر کردن آن دستور زیر را اجرا کنید:');
            console.log('   npm run seed');
            console.log('');
        }

        await closeDB();
        process.exit(0);
    } catch (error) {
        console.error('');
        console.error('❌ اتصال ناموفق بود:');
        console.error(`   ${error.message}`);
        console.error('');
        try { await closeDB(); } catch { /* ignore */ }
        process.exit(1);
    }
})();
