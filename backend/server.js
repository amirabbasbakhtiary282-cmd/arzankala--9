const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Import database
const { connectDB } = require('./config/database');

// Import route files
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const orderRoutes = require('./routes/orders');

// Import controllers for setting collections
const productController = require('./controllers/productController');
const userController = require('./controllers/userController');
const commentController = require('./controllers/commentController');
const orderController = require('./controllers/orderController');

// Import error handler
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Start server
async function startServer() {
    try {
        const collections = await connectDB();

        // Seed database (create admin user, etc.)
        const { seedDatabase } = require('./seed');
        await seedDatabase();

        // Set collections on controllers
        productController.setCollection(collections.productsCollection);
        userController.setCollection(collections.usersCollection);
        commentController.setCollections(collections.commentsCollection, collections.productsCollection);
        orderController.setCollection(collections.ordersCollection);

        // Mount routes
        app.use('/api/products', productRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/comments', commentRoutes);
        app.use('/api/orders', orderRoutes);

        // Serve frontend static files
        const frontendPath = path.join(__dirname, '..', 'frontend');
        app.use(express.static(frontendPath));

        // Health check
        app.get('/health', (req, res) => {
            res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
        });

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
        res.json({ success: true, rate: 750000, previousRate: 750000, source: 'fallback', lastUpdate: null, change: 0, changePercent: 0 });
    }
});

        // Error handling
        app.use(notFoundHandler);
        app.use(errorHandler);

        app.listen(PORT, () => {
            console.log('');
            console.log('========================================');
            console.log('🚀 سرور ارزان‌کالا روشن شد');
            console.log('========================================');
            console.log(`📡 آدرس: http://localhost:${PORT}`);
            console.log(`📡 محصولات: http://localhost:${PORT}/api/products`);
            console.log(`📡 کاربران: http://localhost:${PORT}/api/users`);
            console.log(`📡 نظرات: http://localhost:${PORT}/api/comments`);
            console.log(`📡 سلامت: http://localhost:${PORT}/health`);
            console.log('========================================');
        });
    } catch (error) {
        console.error('❌ خطا در راه‌اندازی سرور:', error.message);
        process.exit(1);
    }
}

startServer();
