const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/database');

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        const { usersCollection, productsCollection } = await connectDB();

        // Seed admin user
        const users = await usersCollection.getAll();
        const adminExists = users.find(u => u.username === 'admin');
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const adminUser = {
                id: 1,
                username: 'admin',
                password: hashedPassword,
                fullname: 'مدیر ارزان‌کالا',
                email: 'admin@arzankala.com',
                mobile: '',
                birthYear: null,
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString(),
                addresses: [],
                wishlist: [],
                totalOrders: 0,
                totalSpent: 0
            };
            await usersCollection.insert(adminUser);
            console.log('✅ Admin user created: admin / admin123');
        } else {
            console.log('✅ Admin user already exists');
        }

        // Seed products from productsDatabase if empty
        const products = await productsCollection.getAll();
        if (products.length === 0) {
            console.log('📦 Seeding products from productsDatabase...');
            const productsData = require('../js/products-data.js');
            // Note: products-data.js is frontend, we need backend version
            // For now, just log that products would be seeded
            console.log('⚠️ Products seeding skipped - use backend seed data');
        } else {
            console.log(`✅ ${products.length} products already in database`);
        }

        console.log('🌱 Seeding complete');
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
    }
}

module.exports = { seedDatabase };