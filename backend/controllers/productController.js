const Product = require('../models/Product');
const exchangeRateService = require('../services/exchangeRateService');
const { convertUsdToToman } = require('../utils/currency');

let productsCollection = null;

const setCollection = (collection) => {
    productsCollection = collection;
    console.log('productController: محصولات تنظیم شد');
};

function applyExchangeRateToItem(p, rate) {
    if (!p || !rate) return p;
    const cloned = { ...p };
    if (cloned.priceUSD) cloned.price = convertUsdToToman(cloned.priceUSD, rate);
    if (cloned.oldPriceUSD) cloned.oldPrice = convertUsdToToman(cloned.oldPriceUSD, rate);
    return cloned;
}

function applyExchangeRate(products) {
    const rate = exchangeRateService.getCurrentRate();
    if (!rate) return products;
    if (Array.isArray(products)) return products.map(p => applyExchangeRateToItem(p, rate));
    return applyExchangeRateToItem(products, rate);
}

const getAllProducts = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, search, sort, page = 1, limit = 20, ids, brand } = req.query;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        if (ids) {
            const idList = ids.split(',').map(Number).filter(n => !isNaN(n));
            if (idList.length > 0) products = products.filter(p => idList.includes(p.id));
        }

        if (category && category !== 'all') {
            products = products.filter(p => p.category === category);
        }

        // Brand mapping for Persian names
        const brandMap = {
            'samsung': 'سامسونگ',
            'apple': 'اپل',
            'xiaomi': 'شیائومی',
            'sony': 'سونی',
            'lg': 'ال جی',
            'asus': 'ایسوس',
            'lenovo': 'لنوو',
            'dell': 'دل',
            'canon': 'کانن',
            'nintendo': 'نینتندو',
            'logitech': 'لاجیتک',
            'jbl': 'جی‌بی‌ال'
        };

        if (brand) {
            const brandLower = brand.toLowerCase();
            const persianBrand = brandMap[brandLower] || brandLower;
            products = products.filter(p => {
                const name = (p.name || '').toLowerCase();
                return name.includes(brandLower) || name.includes(persianBrand);
            });
        }

        if (minPrice) {
            products = products.filter(p => p.price >= parseInt(minPrice));
        }

        if (maxPrice) {
            products = products.filter(p => p.price <= parseInt(maxPrice));
        }

        if (search) {
            const query = search.toLowerCase();
            products = products.filter(p => (p.name || '').toLowerCase().includes(query));
        }

        if (sort === 'price_asc') {
            products.sort((a, b) => a.price - b.price);
        } else if (sort === 'price_desc') {
            products.sort((a, b) => b.price - a.price);
        } else if (sort === 'rating') {
            products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else {
            products.sort((a, b) => b.id - a.id);
        }

        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedProducts = products.slice(startIndex, startIndex + parseInt(limit));

        res.json({
            success: true,
            data: paginatedProducts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(products.length / parseInt(limit)),
                totalItems: products.length
            }
        });
    } catch (error) {
        console.error('خطا در getAllProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        // fetch single item from collection for accuracy
        let product = await productsCollection.getById(parseInt(id));
        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        // increase view count and get updated doc
        const newViewCount = (product.viewCount || 0) + 1;
        await productsCollection.update({ id: parseInt(id) }, { viewCount: newViewCount });
        product = await productsCollection.getById(parseInt(id));

        product = applyExchangeRate(product);

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('خطا در getProductById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getFeaturedProducts = async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        const featured = products
            .sort((a, b) => {
                const scoreA = (a.viewCount || 0) + (a.rating || 0) * 100;
                const scoreB = (b.viewCount || 0) + (b.rating || 0) * 100;
                if (a.oldPrice && !b.oldPrice) return -1;
                if (!a.oldPrice && b.oldPrice) return 1;
                return scoreB - scoreA;
            })
            .slice(0, parseInt(limit));

        res.json({ success: true, data: featured });
    } catch (error) {
        console.error('خطا در getFeaturedProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getNewProducts = async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        const newProducts = products
            .sort((a, b) => b.id - a.id)
            .slice(0, parseInt(limit));

        res.json({ success: true, data: newProducts });
    } catch (error) {
        console.error('خطا در getNewProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getBestSellers = async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        const bestSellers = products
            .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
            .slice(0, parseInt(limit));

        res.json({ success: true, data: bestSellers });
    } catch (error) {
        console.error('خطا در getBestSellers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getDiscountedProducts = async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        const discounted = products
            .filter(p => p.oldPrice && p.oldPrice > p.price)
            .sort((a, b) => {
                const discountA = ((a.oldPrice - a.price) / a.oldPrice) * 100;
                const discountB = ((b.oldPrice - b.price) / b.oldPrice) * 100;
                return discountB - discountA;
            })
            .slice(0, parseInt(limit));

        res.json({ success: true, data: discounted });
    } catch (error) {
        console.error('خطا در getDiscountedProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        const filtered = products.filter(p => p.category === category);

        res.json({ success: true, data: filtered });
    } catch (error) {
        console.error('خطا در getProductsByCategory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const searchProducts = async (req, res) => {
    try {
        const q = req.query.q || req.query.search;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        if (!q) {
            return res.json({ success: true, data: [], totalResults: 0 });
        }

        const query = q.toLowerCase();
        const filtered = products.filter(p => p.name.toLowerCase().includes(query));

        res.json({ success: true, data: filtered, totalResults: filtered.length });
    } catch (error) {
        console.error('خطا در searchProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getSmartRecommendations = async (req, res) => {
    try {
        const { usage, budget, urgency, limit = 8 } = req.query;
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        if (usage === 'gaming') {
            products = products.filter(p => p.category === 'laptop' || p.category === 'monitor');
        } else if (usage === 'student') {
            products = products.filter(p => ['laptop', 'tablet', 'mobile'].includes(p.category));
        } else if (usage === 'office') {
            products = products.filter(p => ['laptop', 'monitor'].includes(p.category));
        }

        if (budget === 'low') {
            products = products.filter(p => p.price < 5000000);
        } else if (budget === 'medium') {
            products = products.filter(p => p.price >= 5000000 && p.price <= 20000000);
        } else if (budget === 'high') {
            products = products.filter(p => p.price > 20000000);
        }

        const scored = products.map(p => {
            let score = 0;
            score += p.stock > 10 ? 10 : p.stock > 5 ? 7 : p.stock > 0 ? 3 : -10;
            score += p.rating >= 4.5 ? 15 : p.rating >= 4 ? 10 : p.rating >= 3.5 ? 5 : 0;
            if (p.oldPrice) {
                const discount = ((p.oldPrice - p.price) / p.oldPrice) * 100;
                score += discount >= 20 ? 20 : discount >= 10 ? 10 : discount >= 5 ? 5 : 0;
            }
            if (urgency === 'urgent' && p.stock > 3) score += 15;
            if (budget === 'low') score += 5;
            return { ...p, score };
        });

        scored.sort((a, b) => b.score - a.score);

        res.json({ success: true, data: scored.slice(0, parseInt(limit)) });
    } catch (error) {
        console.error('خطا در getSmartRecommendations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getRelatedProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 4 } = req.query;

        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);
        const product = products.find(p => p.id === parseInt(id));

        if (!product) {
            return res.json({ success: true, data: [] });
        }

        const related = products
            .filter(p => p.category === product.category && p.id !== parseInt(id))
            .slice(0, parseInt(limit));

        res.json({ success: true, data: related });
    } catch (error) {
        console.error('خطا در getRelatedProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const decreaseStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity = 1 } = req.body;

        let product = await productsCollection.getById(parseInt(id));

        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ success: false, error: 'موجودی کافی نیست' });
        }

        const updated = await productsCollection.update(
            { id: parseInt(id) },
            { stock: product.stock - quantity, purchaseCount: (product.purchaseCount || 0) + quantity }
        );

        res.json({ success: true, message: 'موجودی به‌روز شد', data: updated });
    } catch (error) {
        console.error('خطا در decreaseStock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const createProduct = async (req, res) => {
    try {
        const rate = exchangeRateService.getCurrentRate();
        const body = { ...req.body };

        // قیمت می‌تواند تومانی (price) یا دلاری (priceUSD) داده شود
        if (body.priceUSD) {
            body.price = convertUsdToToman(body.priceUSD, rate);
        }
        if (body.oldPriceUSD) {
            body.oldPrice = convertUsdToToman(body.oldPriceUSD, rate);
        }

        if (!body.name || !String(body.name).trim()) {
            return res.status(400).json({ success: false, error: 'نام محصول الزامی است' });
        }
        if (!body.price || body.price <= 0) {
            return res.status(400).json({ success: false, error: 'قیمت محصول الزامی است' });
        }

        // شناسه توسط دیتابیس تعیین می‌شود تا از تداخل جلوگیری شود
        delete body.id;

        const now = new Date().toISOString();
        const inserted = await productsCollection.insertWithNextId({
            ...body,
            viewCount: 0,
            purchaseCount: 0,
            createdAt: now,
            updatedAt: now
        });

        const response = applyExchangeRate(inserted);
        res.status(201).json({ success: true, data: response });
    } catch (error) {
        console.error('خطا در createProduct:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        const rate = exchangeRateService.getCurrentRate();
        if (updates.priceUSD) {
            updates.price = convertUsdToToman(updates.priceUSD, rate);
        }
        if (updates.oldPriceUSD) {
            updates.oldPrice = convertUsdToToman(updates.oldPriceUSD, rate);
        }

        let product = await productsCollection.getById(parseInt(id));

        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        const updated = await productsCollection.update({ id: parseInt(id) }, updates);

        const response = applyExchangeRate(updated);

        res.json({ success: true, data: response });
    } catch (error) {
        console.error('خطا در updateProduct:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        let product = await productsCollection.getById(parseInt(id));
        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        const deleted = await productsCollection.delete({ id: parseInt(id) });
        res.json({ success: true, message: 'محصول حذف شد', data: deleted });
    } catch (error) {
        console.error('خطا در deleteProduct:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getProductsStats = async (req, res) => {
    try {
        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        const totalProducts = products.length;
        const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
        const avgPrice = totalProducts > 0 ? products.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0;

        const categoryCount = {};
        products.forEach(p => {
            categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                totalProducts,
                totalStock,
                totalValue,
                averagePrice: Math.round(avgPrice),
                categoryDistribution: categoryCount
            }
        });
    } catch (error) {
        console.error('خطا در getProductsStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getPriceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        let product = await productsCollection.getById(parseInt(id));
        if (!product) return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        product = applyExchangeRate(product);
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const history = [
            { date: new Date(now - 30 * dayMs).toISOString().split('T')[0], price: Math.round(product.price * (0.85 + Math.random() * 0.15)) },
            { date: new Date(now - 20 * dayMs).toISOString().split('T')[0], price: Math.round(product.price * (0.88 + Math.random() * 0.12)) },
            { date: new Date(now - 10 * dayMs).toISOString().split('T')[0], price: Math.round(product.price * (0.92 + Math.random() * 0.1)) },
            { date: new Date(now - 5 * dayMs).toISOString().split('T')[0], price: Math.round(product.price * (0.95 + Math.random() * 0.08)) },
            { date: new Date(now).toISOString().split('T')[0], price: product.price }
        ];
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========== پیش‌بینی قیمت ==========
const getPricePrediction = async (req, res) => {
    try {
        const { id } = req.params;
        let product = await productsCollection.getById(parseInt(id));
        if (!product) return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        product = applyExchangeRate(product);
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const basePrice = product.price;
        const trend = (Math.random() * 0.1) - 0.03;
        const prediction = [];
        for (let i = 1; i <= 7; i++) {
            const fluctuation = (Math.random() * 0.04) - 0.02;
            const predictedPrice = Math.round(basePrice * (1 + trend * (i / 7) + fluctuation));
            prediction.push({
                date: new Date(now + i * dayMs).toISOString().split('T')[0],
                predictedPrice,
                confidence: Math.round((0.7 + Math.random() * 0.25) * 100) / 100
            });
        }
        const priceDrop = prediction.some(p => p.predictedPrice < basePrice * 0.97);
        const priceRise = prediction.some(p => p.predictedPrice > basePrice * 1.03);
        let advice = 'منتظر کاهش قیمت بمانید';
        if (priceRise && !priceDrop) advice = 'همین الان بخرید، قیمت در حال افزایش است';
        else if (!priceRise && !priceDrop) advice = 'قیمت نسبتاً پایدار است';
        res.json({ success: true, data: { productId: parseInt(id), currentPrice: basePrice, prediction, advice, trendDirection: trend > 0 ? 'up' : 'down' } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========== محصولات مکمل سبد خرید ==========
// بر اساس دسته‌بندی کالاهای داخل سبد، لوازم جانبی و مکمل پیشنهاد می‌دهد
const COMPLEMENTARY_MAP = {
    mobile: ['accessory'],
    laptop: ['accessory', 'monitor'],
    tablet: ['accessory'],
    monitor: ['accessory', 'laptop'],
    camera: ['accessory'],
    console: ['accessory'],
    tv: ['accessory'],
    accessory: ['mobile', 'laptop'],
    appliance: ['accessory']
};

const getComplementaryProducts = async (req, res) => {
    try {
        const { cartIds, limit = 6 } = req.query;

        let products = await productsCollection.getAll();
        products = applyExchangeRate(products);

        const idList = (cartIds || '')
            .split(',')
            .map(n => parseInt(n, 10))
            .filter(n => !isNaN(n));

        if (idList.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const inCart = products.filter(p => idList.includes(p.id));
        if (inCart.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // دسته‌بندی‌های مکملِ کالاهای داخل سبد
        const wanted = new Set();
        inCart.forEach(p => {
            (COMPLEMENTARY_MAP[p.category] || ['accessory']).forEach(c => wanted.add(c));
        });

        const suggestions = products
            .filter(p => !idList.includes(p.id) && wanted.has(p.category) && (p.stock || 0) > 0)
            .sort((a, b) => {
                // امتیاز بالاتر و تخفیف‌دار بودن اولویت دارد
                const scoreA = (a.rating || 0) * 10 + (a.oldPrice && a.oldPrice > a.price ? 5 : 0);
                const scoreB = (b.rating || 0) * 10 + (b.oldPrice && b.oldPrice > b.price ? 5 : 0);
                return scoreB - scoreA;
            })
            .slice(0, parseInt(limit, 10));

        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('خطا در getComplementaryProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========== شمارنده بازدیدکننده زنده ==========
// تعداد بازدیدکننده‌های فعال هر محصول را در حافظه نگه می‌دارد.
// هر بازدید تا ۶۰ ثانیه معتبر است و پس از آن منقضی می‌شود.
const LIVE_VIEW_TTL = 60 * 1000;
const liveViews = new Map(); // productId -> Map<visitorKey, expiresAt>

function pruneLiveViews(productId) {
    const viewers = liveViews.get(productId);
    if (!viewers) return 0;
    const now = Date.now();
    for (const [key, expiresAt] of viewers) {
        if (expiresAt <= now) viewers.delete(key);
    }
    if (viewers.size === 0) liveViews.delete(productId);
    return viewers.size;
}

// پاکسازی دوره‌ای تا حافظه رشد نکند
const liveViewsCleanup = setInterval(() => {
    for (const productId of Array.from(liveViews.keys())) {
        pruneLiveViews(productId);
    }
}, LIVE_VIEW_TTL);
if (typeof liveViewsCleanup.unref === 'function') liveViewsCleanup.unref();

const trackLiveView = async (req, res) => {
    try {
        const productId = parseInt(req.body.productId, 10);
        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: 'شناسه محصول نامعتبر است' });
        }

        // شناسه تقریبی بازدیدکننده (بدون ذخیره اطلاعات شخصی)
        const visitorKey =
            (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
            req.ip ||
            req.socket?.remoteAddress ||
            'unknown';

        if (!liveViews.has(productId)) liveViews.set(productId, new Map());
        liveViews.get(productId).set(visitorKey, Date.now() + LIVE_VIEW_TTL);

        const liveViewers = pruneLiveViews(productId);

        res.json({ success: true, data: { productId, liveViewers } });
    } catch (error) {
        console.error('خطا در trackLiveView:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    setCollection,
    getAllProducts,
    getProductById,
    getFeaturedProducts,
    getNewProducts,
    getBestSellers,
    getDiscountedProducts,
    getProductsByCategory,
    searchProducts,
    getSmartRecommendations,
    getRelatedProducts,
    decreaseStock,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductsStats,
    getPriceHistory,
    getPricePrediction,
    getComplementaryProducts,
    trackLiveView
};
