const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// ✅ تنظیمات کامل CORS - حل مشکل دسترسی از GitHub Pages
// ============================================================
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://amirabbasbakhtiary282-cmd.github.io',
    'https://arzankala-9.onrender.com'
];

// CORS اصلی
app.use(cors({
    origin: function (origin, callback) {
        // اگر درخواست بدون origin بود (مثل ابزارهای محلی) اجازه بده
        if (!origin) return callback(null, true);
        
        // اگر origin در لیست مجاز بود اجازه بده
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked for origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// هدرهای اضافی برای اطمینان
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // پاسخ به درخواست‌های OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

// ============================================================
// 📦 Import route files
// ============================================================
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

// In-memory fallback stores (when database unavailable)
const memoryStores = {
    products: [],
    users: [],
    comments: [],
    orders: []
};

// ============================================================
// 🗄️ Database initialization
// ============================================================
async function initializeDatabase() {
    try {
        const { connectDB } = require('./config/database');
        const collections = await connectDB();
        console.log('✅ دیتابیس AxioDB متصل شد');
        
        // Set collections on controllers
        productController.setCollection(collections.productsCollection);
        userController.setCollection(collections.usersCollection);
        commentController.setCollections(collections.commentsCollection, collections.productsCollection);
        orderController.setCollection(collections.ordersCollection);
        
        return { useDatabase: true, collections };
    } catch (error) {
        console.warn('⚠️ دیتابیس در دسترس نیست، استفاده از حافظه موقت:', error.message);
        
        // Load fallback data from products-data.js
        let fallbackProducts = [];
        try {
            fallbackProducts = require('../frontend/js/products-data.js');
        } catch (e) {
            fallbackProducts = [];
        }
        
        memoryStores.products = fallbackProducts;
        
        // Create mock collections for controllers
        const mockCollection = (storeName) => ({
            store: memoryStores[storeName],
            async insert(doc) { 
                const newDoc = { ...doc, id: Date.now(), documentId: `mem_${Date.now()}`, createdAt: new Date().toISOString() };
                this.store.push(newDoc);
                return { success: true, data: newDoc };
            },
            async find(query = {}) { 
                let results = [...this.store];
                if (query.category) results = results.filter(p => p.category === query.category);
                if (query.search) {
                    const term = query.search.toLowerCase();
                    results = results.filter(p => p.name.toLowerCase().includes(term));
                }
                return { success: true, data: { documents: results } };
            },
            async findOne(query) { 
                const key = Object.keys(query)[0];
                const val = query[key];
                const found = this.store.find(p => p[key] === val);
                return { success: true, data: found };
            },
            async update(query, update) { 
                const key = Object.keys(query)[0];
                const val = query[key];
                const idx = this.store.findIndex(p => p[key] === val);
                if (idx >= 0) {
                    this.store[idx] = { ...this.store[idx], ...update, updatedAt: new Date().toISOString() };
                    return { success: true, data: this.store[idx] };
                }
                return { success: false, error: 'Not found' };
            },
            async delete(query) { 
                const key = Object.keys(query)[0];
                const val = query[key];
                const idx = this.store.findIndex(p => p[key] === val);
                if (idx >= 0) {
                    this.store.splice(idx, 1);
                    return { success: true };
                }
                return { success: false, error: 'Not found' };
            },
            async count() { return { success: true, count: this.store.length }; }
        });
        
        const mockCollections = {
            productsCollection: mockCollection('products'),
            usersCollection: mockCollection('users'),
            commentsCollection: mockCollection('comments'),
            ordersCollection: mockCollection('orders')
        };
        
        productController.setCollection(mockCollections.productsCollection);
        userController.setCollection(mockCollections.usersCollection);
        commentController.setCollections(mockCollections.commentsCollection, mockCollections.productsCollection);
        orderController.setCollection(mockCollections.ordersCollection);
        
        return { useDatabase: false, collections: mockCollections };
    }
}

// ============================================================
// 🚀 Start server
// ============================================================
async function startServer() {
    try {
        await initializeDatabase();

        // Mount routes
        app.use('/api/products', productRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/comments', commentRoutes);
        app.use('/api/orders', orderRoutes);

        // Serve frontend static files
        const frontendPath = path.join(__dirname, '..', 'frontend');
        app.use(express.static(frontendPath));

        // Explicit route for root path
        app.get('/', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        // SPA fallback: serve index.html for all non-API routes
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path === '/health') {
                return next();
            }
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        // Health check
        app.get('/health', (req, res) => {
            res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
        });

        // Debug endpoint
        app.get('/debug/frontend-path', (req, res) => {
            const fs = require('fs');
            const fp = path.join(__dirname, '..', 'frontend');
            res.json({
                __dirname,
                frontendPath: fp,
                indexPath: path.join(fp, 'index.html'),
                frontendExists: fs.existsSync(fp),
                indexExists: fs.existsSync(path.join(fp, 'index.html')),
                frontendContents: fs.existsSync(fp) ? fs.readdirSync(fp) : []
            });
        });

        // ============================================================
        // 💰 Exchange Rate API
        // ============================================================
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