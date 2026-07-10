const Product = require('../models/Product');
const exchangeRateService = require('../services/exchangeRateService');

let productsCollection = null;

const setCollection = (collection) => {
    productsCollection = collection;
    console.log('productController: محصولات تنظیم شد');
};

function applyExchangeRate(products) {
    const rate = exchangeRateService.getCurrentRate();
    if (!rate) return products;
    const items = Array.isArray(products) ? products : [products];
    for (const p of items) {
        if (p.priceUSD) {
            p.price = Math.round(p.priceUSD * rate / 10);
        }
        if (p.oldPriceUSD) {
            p.oldPrice = Math.round(p.oldPriceUSD * rate / 10);
        }
    }
    return products;
}

const getAllProducts = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, search, sort, page = 1, limit = 20, ids, brand } = req.query;
        let products = await productsCollection.getAll();
        applyExchangeRate(products);

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
            products = products.filter(p => p.name.toLowerCase().includes(query));
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
        const products = await productsCollection.getAll();
        applyExchangeRate(products);
        const product = products.find(p => p.id === parseInt(id));

        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        await productsCollection.update({ id: parseInt(id) }, { viewCount: (product.viewCount || 0) + 1 });

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
        applyExchangeRate(products);

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
        applyExchangeRate(products);

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
        applyExchangeRate(products);

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
        applyExchangeRate(products);

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
        applyExchangeRate(products);

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
        applyExchangeRate(products);

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
        applyExchangeRate(products);

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
        applyExchangeRate(products);
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

        let products = await productsCollection.getAll();
        const product = products.find(p => p.id === parseInt(id));

        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ success: false, error: 'موجودی کافی نیست' });
        }

        await productsCollection.update(
            { id: parseInt(id) },
            { stock: product.stock - quantity, purchaseCount: (product.purchaseCount || 0) + quantity }
        );

        res.json({ success: true, message: 'موجودی به‌روز شد' });
    } catch (error) {
        console.error('خطا در decreaseStock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const createProduct = async (req, res) => {
    try {
        let products = await productsCollection.getAll();
        const ids = products.map(p => parseInt(p.id)).filter(id => !isNaN(id));
        const newId = ids.length > 0 ? Math.max(...ids) + 1 : 26;

        const rate = exchangeRateService.getCurrentRate();
        const body = { ...req.body };
        if (body.priceUSD) {
            body.price = Math.round(parseFloat(body.priceUSD) * rate / 10) * 10;
        }
        if (body.oldPriceUSD) {
            body.oldPrice = Math.round(parseFloat(body.oldPriceUSD) * rate / 10) * 10;
        }

        const newProduct = {
            id: newId,
            ...body,
            viewCount: 0,
            purchaseCount: 0,
            createdAt: new Date().toISOString()
        };

        await productsCollection.insert(newProduct);
        res.status(201).json({ success: true, data: newProduct });
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
            updates.price = Math.round(parseFloat(updates.priceUSD) * rate / 10) * 10;
        }
        if (updates.oldPriceUSD) {
            updates.oldPrice = Math.round(parseFloat(updates.oldPriceUSD) * rate / 10) * 10;
        }

        let products = await productsCollection.getAll();
        const product = products.find(p => p.id === parseInt(id));

        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        await productsCollection.update({ id: parseInt(id) }, updates);

        products = await productsCollection.getAll();
        applyExchangeRate(products);
        const updated = products.find(p => p.id === parseInt(id));

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('خطا در updateProduct:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        let products = await productsCollection.getAll();
        const product = products.find(p => p.id === parseInt(id));

        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        await productsCollection.delete({ id: parseInt(id) });
        res.json({ success: true, message: 'محصول حذف شد' });
    } catch (error) {
        console.error('خطا در deleteProduct:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getProductsStats = async (req, res) => {
    try {
        let products = await productsCollection.getAll();
        applyExchangeRate(products);

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
        const products = await productsCollection.getAll();
        applyExchangeRate(products);
        const product = products.find(p => p.id === parseInt(id));
        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }
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
        const products = await productsCollection.getAll();
        applyExchangeRate(products);
        const product = products.find(p => p.id === parseInt(id));
        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }
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

// ========== محصولات مکمل ==========
const getComplementaryProducts = async (req, res) => {
    try {
        const { cartIds } = req.query;
        if (!cartIds) {
            return res.status(400).json({ success: false, error: 'شناسه محصولات سبد خرید الزامی است' });
        }
        const ids = cartIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        const products = await productsCollection.getAll();
        applyExchangeRate(products);
        const cartProducts = products.filter(p => ids.includes(p.id));
        const cartCategories = [...new Set(cartProducts.map(p => p.category))];
        const complementaryMap = {
            mobile: ['accessory', 'tablet'],
            laptop: ['accessory', 'monitor'],
            tablet: ['accessory'],
            accessory: ['mobile', 'laptop'],
            camera: ['accessory'],
            monitor: ['accessory'],
            gaming: ['monitor', 'accessory'],
            home: ['accessory'],
            tv: ['accessory']
        };
        let targetCategories = [];
        cartCategories.forEach(cat => {
            if (complementaryMap[cat]) {
                complementaryMap[cat].forEach(t => {
                    if (!targetCategories.includes(t)) targetCategories.push(t);
                });
            }
        });
        let complementary = products.filter(p =>
            !ids.includes(p.id) &&
            targetCategories.includes(p.category) &&
            p.stock > 0
        );
        complementary.sort((a, b) => {
            const aCatMatch = targetCategories.indexOf(a.category);
            const bCatMatch = targetCategories.indexOf(b.category);
            if (aCatMatch !== bCatMatch) return aCatMatch - bCatMatch;
            return (b.rating || 0) - (a.rating || 0);
        });
        res.json({ success: true, data: complementary.slice(0, 6), cartCategories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========== رهگیری بازدید زنده ==========
const activeViewers = new Map();

const trackLiveView = (req, res) => {
    try {
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, error: 'شناسه محصول الزامی است' });
        }

        const now = Date.now();
        const viewerId = req.user?.id || req.ip || 'anonymous';

        if (!activeViewers.has(productId)) {
            activeViewers.set(productId, new Map());
        }

        const viewers = activeViewers.get(productId);
        viewers.set(viewerId, now + 30000);

        // Clean expired viewers
        for (const [id, expiry] of viewers) {
            if (now > expiry) viewers.delete(id);
        }

        res.json({ success: true, data: { liveViewers: viewers.size } });
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
