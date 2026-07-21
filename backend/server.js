const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// ✅ تنظیمات CORS - ساده و بدون مشکل
// ============================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// middleware اضافی برای اطمینان
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

const productController = require('./controllers/productController');
const userController = require('./controllers/userController');
const commentController = require('./controllers/commentController');
const orderController = require('./controllers/orderController');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// ============================================================
// 💾 In-memory fallback stores
// ============================================================
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
        
        productController.setCollection(collections.productsCollection);
        userController.setCollection(collections.usersCollection);
        commentController.setCollections(collections.commentsCollection, collections.productsCollection);
        orderController.setCollection(collections.ordersCollection);
        
        return { useDatabase: true, collections };
    } catch (error) {
        console.warn('⚠️ دیتابیس در دسترس نیست، استفاده از حافظه موقت:', error.message);
        
        let fallbackProducts = [];
        try {
            // frontend/js/products-data.js now exports the array
            const pd = require('../frontend/js/products-data.js');
            if (Array.isArray(pd)) fallbackProducts = pd;
            else if (Array.isArray(pd.productsDatabase)) fallbackProducts = pd.productsDatabase;
        } catch (e) {
            fallbackProducts = [];
        }
        memoryStores.products = fallbackProducts;

        // Create mock collections that match the same interface used by controllers
        const makeMockCollection = (storeName) => ({
            async getAll() {
                return memoryStores[storeName];
            },
            async find(filter) {
                // provide a simple compatibility layer (returns array)
                if (!filter || Object.keys(filter).length === 0) return memoryStores[storeName];
                return memoryStores[storeName].filter(doc => {
                    return Object.keys(filter).every(k => String(doc[k]) === String(filter[k]));
                });
            },
            async getById(id) {
                const list = memoryStores[storeName];
                return list.find(d => d.id === parseInt(id) || d.id === id || d._id === id) || null;
            },
            async getByUsername(username) {
                const list = memoryStores[storeName];
                return list.find(d => d.username === username) || null;
            },
            async insert(data) {
                const list = memoryStores[storeName];
                const newDoc = { ...data };
                if (!newDoc.id) newDoc.id = Date.now();
                list.push(newDoc);
                return newDoc;
            },
            async update(filter, updates) {
                const list = memoryStores[storeName];
                const key = Object.keys(filter)[0];
                const val = filter[key];
                const idx = list.findIndex(p => String(p[key]) === String(val));
                if (idx >= 0) {
                    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
                    return list[idx];
                }
                return null;
            },
            async delete(filter) {
                const list = memoryStores[storeName];
                const key = Object.keys(filter)[0];
                const val = filter[key];
                const origLen = list.length;
                memoryStores[storeName] = list.filter(p => String(p[key]) !== String(val));
                return { success: memoryStores[storeName].length < origLen };
            },
            async count() {
                return memoryStores[storeName].length;
            }
        });
        
        const mockCollections = {
            productsCollection: makeMockCollection('products'),
            usersCollection: makeMockCollection('users'),
            commentsCollection: makeMockCollection('comments'),
            ordersCollection: makeMockCollection('orders')
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

        app.use('/api/products', productRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/comments', commentRoutes);
        app.use('/api/orders', orderRoutes);

        const frontendPath = path.join(__dirname, '..', 'frontend');
        app.use(express.static(frontendPath));

        app.get('/', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path === '/health') {
                return next();
            }
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        app.get('/health', (req, res) => {
            res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
        });

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

        app.use(notFoundHandler);
        app.use(errorHandler);

        app.listen(PORT, () => {
            console.log('');
            console.log('========================================');
            console.log('🚀 سرور ارزان‌کالا روشن شد');
            console.log('========================================');
            console.log(`📡 آدرس: http://localhost:${PORT}`);
            console.log(`📡 محصولات: http://localhost:${PORT}/api/products`);
            console.log(`📡 سلامت: http://localhost:${PORT}/health`);
            console.log('========================================');
        });
    } catch (error) {
        console.error('❌ خطا در راه‌اندازی سرور:', error.message);
        process.exit(1);
    }
}

startServer();
