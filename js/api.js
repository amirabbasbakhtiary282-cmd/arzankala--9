const API = {};

// Auto-detect API URL: localhost for dev, try relative /api for production
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_URL = isLocalhost ? 'http://localhost:3000/api' : '/api';

console.log('[API] Environment:', isLocalhost ? 'localhost' : 'production', '| API_URL:', API_URL);

// Generic fetch wrapper with error handling
async function apiRequest(endpoint, options = {}) {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const url = `${API_URL}${endpoint}`;
        console.log(`[API] Request: ${url}`);
        const response = await fetch(url, { ...options, headers });
        console.log(`[API] Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'خطای سرور' }));
            const errMsg = errorData.error || `HTTP ${response.status}`;
            console.error(`[API] Error ${response.status}:`, errMsg);
            return { success: false, error: errMsg, status: response.status, code: errorData.code };
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`[API] Network Error [${endpoint}]:`, error);
        return { success: false, error: error.message, networkError: true };
    }
}

// ========== PRODUCTS ==========
API.getProducts = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const result = await apiRequest(`/products${query ? '?' + query : ''}`);
    if (result.success) return result;
    // Fallback to local data
    if (typeof productsDatabase !== 'undefined') {
        let products = [...productsDatabase];
        if (params.category) products = products.filter(p => p.category === params.category);
        if (params.search) products = products.filter(p => p.name.includes(params.search));
        if (params.minPrice) products = products.filter(p => p.price >= params.minPrice);
        if (params.maxPrice) products = products.filter(p => p.price <= params.maxPrice);
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
        if (params.brand) {
            const brandLower = params.brand.toLowerCase();
            const persianBrand = brandMap[brandLower] || brandLower;
            products = products.filter(p => {
                const name = (p.name || '').toLowerCase();
                return name.includes(brandLower) || name.includes(persianBrand);
            });
        }
        // Sorting
        if (params.sort === 'price_asc') products.sort((a,b) => a.price - b.price);
        else if (params.sort === 'price_desc') products.sort((a,b) => b.price - a.price);
        else if (params.sort === 'rating') products.sort((a,b) => b.rating - a.rating);
        // Pagination
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 20;
        const start = (page - 1) * limit;
        const paginated = products.slice(start, start + limit);
        return { success: true, data: paginated, pagination: { currentPage: page, totalPages: Math.ceil(products.length/limit), totalItems: products.length } };
    }
    return { success: false, data: [] };
};

API.getProductById = async (id) => {
    const result = await apiRequest(`/products/${id}`);
    if (result.success) return { product: result.data, error: null };
    // If product not found (404), don't fall back to local DB - return error
    if (result.error && result.error.includes('یافت نشد')) {
        return { product: null, error: result.error };
    }
    // For other errors, fall back to local DB
    if (typeof productsDatabase !== 'undefined') {
        const localProduct = productsDatabase.find(p => p.id == id);
        if (localProduct) return { product: localProduct, error: null };
    }
    return { product: null, error: result.error || 'خطای ناشناخته' };
};

API.getProductsByCategory = async (category) => {
    const result = await apiRequest(`/products/category/${category}`);
    if (result.success) return result.data;
    if (typeof productsDatabase !== 'undefined') return productsDatabase.filter(p => p.category === category);
    return [];
};

API.searchProducts = async (query) => {
    const result = await apiRequest(`/products/search?q=${encodeURIComponent(query)}`);
    if (result.success) return result;
    if (typeof productsDatabase !== 'undefined') {
        const filtered = productsDatabase.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        return { success: true, data: filtered, totalResults: filtered.length };
    }
    return { success: false, data: [], totalResults: 0 };
};

API.getSmartRecommendations = async (usage, budget, urgency, limit = 8) => {
    const result = await apiRequest(`/products/recommendations?usage=${usage}&budget=${budget}&urgency=${urgency}&limit=${limit}`);
    if (result.success) return result.data;
    // Fallback algorithm
    let products = typeof productsDatabase !== 'undefined' ? [...productsDatabase] : [];
    if (usage === 'gaming') products = products.filter(p => ['laptop','monitor'].includes(p.category));
    else if (usage === 'student') products = products.filter(p => ['laptop','tablet','mobile'].includes(p.category));
    else if (usage === 'office') products = products.filter(p => ['laptop','monitor','accessory'].includes(p.category));
    // Score
    const scored = products.map(p => {
        let score = 0;
        score += p.stock > 10 ? 10 : p.stock > 5 ? 7 : p.stock > 0 ? 3 : -10;
        score += p.rating >= 4.5 ? 15 : p.rating >= 4 ? 10 : p.rating >= 3.5 ? 5 : 0;
        if (p.oldPrice) { const d = ((p.oldPrice - p.price)/p.oldPrice)*100; score += d >= 20 ? 20 : d >= 10 ? 10 : d >= 5 ? 5 : 0; }
        if (urgency === 'urgent' && p.stock > 3) score += 15;
        if (usage === 'gaming' && ['laptop','monitor'].includes(p.category)) score += 10;
        if (usage === 'student' && ['laptop','tablet','mobile'].includes(p.category)) score += 10;
        if (usage === 'office' && ['laptop','monitor','accessory'].includes(p.category)) score += 10;
        return { ...p, score };
    });
    scored.sort((a,b) => b.score - a.score);
    return scored.slice(0, limit);
};

API.getRelatedProducts = async (productId, limit = 4) => {
    const result = await apiRequest(`/products/${productId}/related?limit=${limit}`);
    if (result.success) return result.data;
    if (typeof productsDatabase !== 'undefined') {
        const product = productsDatabase.find(p => p.id == productId);
        if (product) return productsDatabase.filter(p => p.category === product.category && p.id != productId).slice(0, limit);
    }
    return [];
};

// ========== COMMENTS ==========
API.getProductComments = async (productId, page = 1, limit = 10, sort = 'newest') => {
    const result = await apiRequest(`/comments/product/${productId}?page=${page}&limit=${limit}&sort=${sort}`);
    return result.success ? result : { data: [], summary: { total: 0, averageRating: 0, ratingDistribution: {1:0,2:0,3:0,4:0,5:0} } };
};

API.addComment = async (productId, rating, title, content, pros = [], cons = []) => {
    const token = localStorage.getItem('token');
    if (!token) { API.showNotification('لطفاً ابتدا وارد شوید', 'error'); return { success: false }; }
    return await apiRequest('/comments', {
        method: 'POST',
        body: JSON.stringify({ productId, rating, title, content, pros, cons })
    });
};

API.submitProductCommentWithAI = async (productId, rating, title, content, pros = [], cons = []) => {
    const token = localStorage.getItem('token');
    if (!token) { API.showNotification('لطفاً ابتدا وارد شوید', 'error'); return { success: false }; }
    const result = await apiRequest('/comments/with-ai', {
        method: 'POST',
        body: JSON.stringify({ productId, rating, title, content, pros, cons })
    });
    return result;
};

API.markCommentHelpful = async (commentId) => {
    return await apiRequest(`/comments/${commentId}/helpful`, { method: 'PUT' });
};

API.getAISentimentSummary = async (productId) => {
    const result = await apiRequest(`/comments/product/${productId}/ai-summary`);
    if (result.success) return result.data;
    return { total: 0, sentiment: 'neutral', positivePercent: 0, negativePercent: 0, neutralPercent: 0, commonPros: [], commonCons: [], averageRating: 0 };
};

API.getAIReviewAnalysis = async (productId) => {
    const result = await apiRequest(`/comments/product/${productId}/ai-analysis`);
    if (result.success) return result.data;
    return null;
};

API.getPricePrediction = async (productId) => {
    const result = await apiRequest(`/products/${productId}/price-prediction`);
    if (result.success) return result.data;
    return null;
};

API.getComplementaryProducts = async (cartIds) => {
    if (!cartIds || cartIds.length === 0) return [];
    const result = await apiRequest(`/products/complementary?cartIds=${cartIds.join(',')}`);
    if (result.success) return result.data;
    return [];
};

// ========== PRICE HISTORY ==========
API.getProductPriceHistory = async (productId) => {
    const result = await apiRequest(`/products/${productId}/price-history`);
    if (result.success) return result.data;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return [
        { date: new Date(now - 30 * dayMs).toISOString().split('T')[0], price: 0 },
        { date: new Date(now - 20 * dayMs).toISOString().split('T')[0], price: 0 },
        { date: new Date(now - 10 * dayMs).toISOString().split('T')[0], price: 0 },
        { date: new Date(now - 5 * dayMs).toISOString().split('T')[0], price: 0 },
        { date: new Date(now).toISOString().split('T')[0], price: 0 }
    ];
};

// ========== PREVIOUS CART RECOMMENDATIONS ==========
API.getPreviousCartRecommendations = async () => {
    const history = JSON.parse(localStorage.getItem('cartHistory') || '[]');
    if (history.length === 0) return [];
    const productIds = [...new Set(history.map(item => item.id))];
    const result = await apiRequest(`/products?limit=${productIds.length}`);
    if (result.success && result.data) {
        return result.data.filter(p => productIds.includes(p.id));
    }
    if (typeof productsDatabase !== 'undefined') {
        return productsDatabase.filter(p => productIds.includes(p.id));
    }
    return [];
};

// ========== USER DISCOUNT ==========
API.trackProductPrice = function (productId, price) {
    let tracked = JSON.parse(localStorage.getItem('priceTracker') || '[]');
    let existing = tracked.find(function (t) { return t.id === productId; });
    if (existing) {
        if (price < existing.price) existing.price = price;
        existing.checkedAt = Date.now();
    } else {
        tracked.push({ id: productId, price: price, checkedAt: Date.now() });
        if (tracked.length > 20) tracked = tracked.slice(-20);
    }
    localStorage.setItem('priceTracker', JSON.stringify(tracked));
};

API.getUserDiscount = () => {
    const purchaseCount = parseInt(localStorage.getItem('purchaseCount') || '0');
    if (purchaseCount >= 10) return 15;
    if (purchaseCount >= 5) return 10;
    if (purchaseCount >= 2) return 5;
    return 0;
};

// ========== USERS ==========
API.register = async (fullname, username, password, email = '', mobile = '', birthYear = '') => {
    const result = await apiRequest('/users/register', {
        method: 'POST',
        body: JSON.stringify({ fullname, username, password, email, mobile, birthYear })
    });
    if (result.success) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
};

API.login = async (username, password) => {
    const result = await apiRequest('/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    if (result.success) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
};

API.logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

API.getProfile = async () => {
    const result = await apiRequest('/users/profile');
    return result.success ? result.data : null;
};

// ========== WISHLIST ==========
API.addToWishlist = async (productId) => {
    return await apiRequest('/users/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId })
    });
};

API.removeFromWishlist = async (productId) => {
    return await apiRequest(`/users/wishlist/${productId}`, { method: 'DELETE' });
};

API.getWishlist = async () => {
    const result = await apiRequest('/users/wishlist');
    return result.success ? result.data : [];
};

// ========== CART ==========
API.addToCart = function(product) {
    if (typeof window.addToCart === 'function') {
        window.addToCart(product);
    } else {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existing = cart.find(item => item.id === product.id);
        if (existing) { existing.quantity = (existing.quantity || 1) + 1; }
        else { cart.push({ ...product, quantity: 1 }); }
        localStorage.setItem('cart', JSON.stringify(cart));
        if (typeof window.updateCartUI === 'function') window.updateCartUI();
    }
};

API.removeFromCart = function(productId) {
    if (typeof window.removeFromCart === 'function') { window.removeFromCart(productId); return; }
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
};

API.updateCartQuantity = function(productId, quantity) {
    if (typeof window.increaseQuantity === 'function' || typeof window.decreaseQuantity === 'function') {
        if (quantity <= 0) { if (typeof window.removeFromCart === 'function') window.removeFromCart(productId); return; }
        const current = API.getCart().find(i => i.id === productId);
        if (!current) return;
        if (quantity > current.quantity && typeof window.increaseQuantity === 'function') {
            for (let i = current.quantity; i < quantity; i++) window.increaseQuantity(productId);
        } else if (quantity < current.quantity && typeof window.decreaseQuantity === 'function') {
            for (let i = quantity; i < current.quantity; i++) window.decreaseQuantity(productId);
        }
        return;
    }
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (quantity <= 0) { cart = cart.filter(item => item.id !== productId); }
        else { item.quantity = quantity; }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
};

API.clearCart = function() {
    if (typeof window.clearCart === 'function') { window.clearCart(); return; }
    localStorage.setItem('cart', JSON.stringify([]));
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
};

API.getCart = function() {
    return JSON.parse(localStorage.getItem('cart')) || [];
};

// ========== EXCHANGE RATE ==========
const FALLBACK_RATE = 1750000;
let lastDisplayedRate = parseInt(localStorage.getItem('exchangeRate')) || FALLBACK_RATE;
let rateLastFetchTime = 0;
let liveTimerInterval = null;

async function fetchDirect(url, name) {
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const data = await res.json();
        return { data, source: name };
    } catch (e) {
        console.warn('Direct fetch failed for', name, e);
        return null;
    }
}

async function fetchWithProxy(url, name) {
    try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const res = await fetch(proxyUrl);
        if (!res.ok) return null;
        const text = await res.text();
        const data = JSON.parse(text);
        return { data, source: name };
    } catch (e) {
        console.warn('fetchWithProxy failed for', name, e);
        return null;
    }
}

async function fetchRateFromNobitex() {
    let result = await fetchDirect('https://api.nobitex.ir/v2/orderbook/USDTIRT', 'Nobitex');
    if (!result) result = await fetchWithProxy('https://api.nobitex.ir/v2/orderbook/USDTIRT', 'Nobitex');
    if (!result) return null;
    const data = result.data;
    if (data && data.lastTradePrice) return { rate: parseInt(data.lastTradePrice), source: 'Nobitex' };
    if (data && data.asks && data.asks.length > 0) return { rate: parseInt(data.asks[0].price), source: 'Nobitex' };
    return null;
}

async function fetchRateFromWallex() {
    let result = await fetchDirect('https://api.wallex.ir/v1/markets', 'Wallex');
    if (!result) result = await fetchWithProxy('https://api.wallex.ir/v1/markets', 'Wallex');
    if (!result) return null;
    const data = result.data;
    if (data && data.result && data.result.markets && data.result.markets.USDTIRT) {
        return { rate: parseInt(data.result.markets.USDTIRT.price), source: 'Wallex' };
    }
    return null;
}

async function fetchRateFromTGJU() {
    try {
        const res = await fetch('https://www.tgju.org/profile/price_dollar_rl');
        if (!res.ok) return null;
        const html = await res.text();
        const match = html.match(/class="price[^"]*"[^>]*>\s*([\d,]+)\s*</);
        if (match) {
            const price = parseInt(match[1].replace(/,/g, ''));
            if (price > 100000) return { rate: price, source: 'TGJU' };
        }
        return null;
    } catch (e) {
        console.warn('TGJU fetch failed', e);
        return null;
    }
}

async function fetchRateFromFreeCurrencyAPI() {
    try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.usd && data.usd.irr) {
            const rate = Math.round(data.usd.irr * 1.015);
            return { rate, source: 'CurrencyAPI' };
        }
        return null;
    } catch (e) {
        console.warn('CurrencyAPI fetch failed', e);
        return null;
    }
}

async function fetchRateDirect() {
    const fetchers = [
        fetchRateFromNobitex(),
        fetchRateFromWallex(),
        fetchRateFromTGJU(),
        fetchRateFromFreeCurrencyAPI()
    ];
    const results = await Promise.allSettled(fetchers);
    const validResults = results
        .filter(r => r.status === 'fulfilled' && r.value && r.value.rate > 100000);
    if (validResults.length === 0) return null;
    const rates = validResults.map(r => r.value.rate);
    rates.sort((a, b) => a - b);
    const mid = rates[Math.floor(rates.length / 2)];
    const sources = validResults.map(r => r.value.source);
    console.log('Exchange rate sources:', sources, 'rates:', rates, 'median:', mid);
    return { rate: mid, source: sources.join('+') || 'API' };
}

API.getExchangeRate = async () => {
    const prev = parseInt(localStorage.getItem('exchangeRate')) || FALLBACK_RATE;
    try {
        const result = await apiRequest('/exchange-rate');
        if (result.success && result.rate && result.rate > 100000) {
            const rate = Math.round(result.rate / 10) * 10;
            localStorage.setItem('exchangeRate', rate);
            rateLastFetchTime = Date.now();
            localStorage.setItem('exchangeRateTime', rateLastFetchTime.toString());
            localStorage.setItem('exchangeRateSource', result.source || '؟');
            localStorage.setItem('exchangeRateLastUpdate', result.lastUpdate || new Date().toISOString());
            localStorage.setItem('exchangeRateChange', (rate - prev));
            localStorage.setItem('exchangeRateChangePercent', result.changePercent || 0);
            return rate;
        }
    } catch (e) {
        console.warn('Backend exchange rate failed:', e);
    }
    const direct = await fetchRateDirect();
    if (direct && direct.rate > 100000) {
        const rate = Math.round(direct.rate / 10) * 10;
        localStorage.setItem('exchangeRate', rate);
        rateLastFetchTime = Date.now();
        localStorage.setItem('exchangeRateTime', rateLastFetchTime.toString());
        localStorage.setItem('exchangeRateSource', direct.source);
        localStorage.setItem('exchangeRateLastUpdate', new Date().toISOString());
        localStorage.setItem('exchangeRateChange', (rate - prev));
        console.log('Got direct exchange rate:', rate, 'from', direct.source);
        return rate;
    }
    console.warn('All exchange rate sources failed, using cached/fallback');
    const cached = localStorage.getItem('exchangeRate');
    return cached ? parseInt(cached) : FALLBACK_RATE;
};

function flashPricesOnChange(newRate) {
    if (!lastDisplayedRate || lastDisplayedRate === 0) { lastDisplayedRate = newRate; return; }
    if (newRate === lastDisplayedRate) return;
    const dir = newRate > lastDisplayedRate ? 'up' : 'down';
    const flashClass = dir === 'up' ? 'price-flash-red' : 'price-flash-green';
    document.querySelectorAll('.price, .product-price, [class*="price"]').forEach(el => {
        el.classList.remove('price-flash-red', 'price-flash-green');
        void el.offsetWidth;
        el.classList.add(flashClass);
        setTimeout(() => el.classList.remove(flashClass), 1500);
    });
    document.querySelectorAll('[data-live-price]').forEach(el => {
        const usd = parseFloat(el.getAttribute('data-live-price'));
        if (!isNaN(usd) && usd > 0) {
            const newToman = Math.round(usd * newRate / 10) * 10;
            el.textContent = newToman.toLocaleString();
        }
    });
    lastDisplayedRate = newRate;
}

function updateBannerTimer() {
    const timerEl = document.getElementById('rateTimer');
    if (!timerEl) return;
    const elapsed = Math.floor((Date.now() - rateLastFetchTime) / 1000);
    if (elapsed < 60) {
        timerEl.textContent = elapsed + ' ثانیه پیش';
    } else {
        timerEl.textContent = Math.floor(elapsed / 60) + ' دقیقه پیش';
    }
}

API.displayExchangeRate = async function() {
    let container = document.getElementById('exchangeRateDisplay');
    if (!container) {
        container = document.createElement('div');
        container.id = 'exchangeRateDisplay';
        container.style.cssText = 'text-align:center;padding:6px 0;background:var(--bg-navbar);border-bottom:1px solid var(--border-color);font-size:0.8rem;transition:all 0.3s ease;direction:ltr;';
        const nav = document.querySelector('nav') || document.querySelector('header') || document.body;
        if (nav && nav.parentNode) {
            nav.parentNode.insertBefore(container, nav);
        } else {
            document.body.prepend(container);
        }
    }
    try {
        let rate = null, change = 0, source = '';
        const result = await apiRequest('/exchange-rate');
        if (result.success && result.rate && result.rate > 100000) {
            rate = Math.round(result.rate / 10) * 10;
            change = result.changePercent || 0;
            source = result.source || 'Backend';
        } else {
            const direct = await fetchRateDirect();
            if (direct && direct.rate > 100000) {
                rate = Math.round(direct.rate / 10) * 10;
                source = direct.source || 'Direct API';
                const prevRate = parseInt(localStorage.getItem('exchangeRate')) || rate;
                change = prevRate > 0 ? ((rate - prevRate) / prevRate * 100).toFixed(1) : 0;
            }
        }
        if (rate && rate > 100000) {
            const prevRate = parseInt(localStorage.getItem('exchangeRate')) || rate;
            rateLastFetchTime = Date.now();
            localStorage.setItem('exchangeRate', rate);
            localStorage.setItem('exchangeRateSource', source);
            flashPricesOnChange(rate);

            const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '◆';
            const arrowColor = change > 0 ? '#ff5252' : change < 0 ? '#00c853' : '#00c853';
            const dotColor = change > 0 ? '#ff5252' : change < 0 ? '#ffc107' : '#00c853';
            const liveDot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dotColor + ';animation:pulse 1.5s ease-in-out infinite;margin:0 4px;vertical-align:middle;"></span>';

            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;direction:rtl;">' +
                '<span style="display:flex;align-items:center;gap:4px;">' +
                liveDot +
                '<span style="color:var(--text-muted);font-size:0.8rem;">نرخ لحظه‌ای</span>' +
                '</span>' +
                '<span style="background:linear-gradient(135deg,rgba(0,200,83,0.15),rgba(0,200,83,0.05));padding:2px 16px;border-radius:20px;border:1px solid rgba(0,200,83,0.2);">' +
                '<strong id="rateValue" style="color:var(--green-primary);font-size:1.1rem;letter-spacing:0.5px;font-family:monospace;">' + rate.toLocaleString() + '</strong>' +
                ' <span style="color:var(--text-muted);font-size:0.75rem;">تومان</span>' +
                '</span>' +
                '<span style="color:' + arrowColor + ';font-weight:bold;font-size:0.85rem;background:rgba(' + (change > 0 ? '255,82,82' : '0,200,83') + ',0.1);padding:1px 10px;border-radius:10px;">' + arrow + ' ' + (change > 0 ? '+' : '') + change + '%</span>' +
                '<span style="color:#888;font-size:0.7rem;display:flex;align-items:center;gap:3px;"><i class="fa fa-refresh ms-1" style="font-size:0.6rem;"></i> <span id="rateTimer">0 ثانیه پیش</span></span>' +
                '<span style="color:#555;font-size:0.6rem;border:1px solid #333;border-radius:4px;padding:0 6px;">' + source + '</span>' +
                '</div>';
        } else {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:8px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#888;"></span><span style="color:#888;"><i class="fa fa-exchange-alt ms-1"></i> نرخ دلار: <strong>' + lastDisplayedRate.toLocaleString() + '</strong> تومان</span></div>';
        }
    } catch(e) {
        console.error('displayExchangeRate error:', e);
        const cached = localStorage.getItem('exchangeRate');
        if (cached) {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:8px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#888;"></span><span style="color:#888;"><i class="fa fa-exchange-alt ms-1"></i> نرخ دلار: <strong>' + parseInt(cached).toLocaleString() + '</strong> تومان</span></div>';
        }
    }
    if (liveTimerInterval) clearInterval(liveTimerInterval);
    liveTimerInterval = setInterval(updateBannerTimer, 1000);
};

API.showLivePriceWarning = function() {
    let key = 'livePriceWarningShown';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    let banner = document.createElement('div');
    banner.id = 'livePriceWarning';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:linear-gradient(135deg,rgba(0,200,83,0.95),rgba(0,128,64,0.95));color:white;text-align:center;padding:10px 16px;font-size:0.85rem;font-weight:600;backdrop-filter:blur(10px);box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.5s ease;';
    banner.innerHTML = '<i class="fa fa-bolt ms-2"></i> قیمت‌ها لحظه‌ای و بر اساس نرخ لحظه‌ای ارز محاسبه می‌شوند <i class="fa fa-exchange-alt me-2"></i>';
    document.body.prepend(banner);
    setTimeout(function() {
        banner.style.opacity = '0';
        setTimeout(function() { banner.remove(); }, 500);
    }, 2000);
};

API.startRatePolling = function() {
    API.showLivePriceWarning();
    API.displayExchangeRate();
    setInterval(function() {
        API.getExchangeRate().then(function(newRate) {
            API.displayExchangeRate();
            const changePercent = parseFloat(localStorage.getItem('exchangeRateChangePercent') || '0');
            if (Math.abs(changePercent) >= 1 && window.API && typeof API.showNotification === 'function') {
                let dir = changePercent > 0 ? 'افزایش' : 'کاهش';
                let icon = changePercent > 0 ? '📈' : '📉';
                API.showNotification(icon + ' نرخ ارز ' + dir + ' یافت: ' + (changePercent > 0 ? '+' : '') + changePercent + '%', changePercent > 0 ? 'error' : 'success');
            }
        });
    }, 15000);
};

// ========== NOTIFICATION ==========
API.showNotification = function(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        const div = document.createElement('div');
        div.id = 'notificationContainer';
        div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(div);
    }
    const notif = document.createElement('div');
    notif.style.cssText = `background:${type === 'success' ? '#00c853' : '#ff5252'};color:white;padding:12px 24px;border-radius:12px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.3);animation:slideDown 0.3s ease;text-align:center;min-width:250px;`;
    notif.textContent = message;
    document.getElementById('notificationContainer').appendChild(notif);
    setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.3s'; setTimeout(() => notif.remove(), 300); }, 2500);
};

// ========== DESKTOP NOTIFICATIONS ==========
API.sendDesktopNotification = function(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        try {
            new Notification(title, { body: body, icon: './img/icons/icon-192x192.png' });
        } catch(e) {
            console.log('Desktop notification failed');
        }
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                try {
                    new Notification(title, { body: body, icon: './img/icons/icon-192x192.png' });
                } catch(e) {}
            }
        });
    }
};

// Add animation style
const style = document.createElement('style');
style.textContent = `
@keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes flashGreen { 0% { background: rgba(0,200,83,0); } 30% { background: rgba(0,200,83,0.3); } 100% { background: rgba(0,200,83,0); } }
@keyframes flashRed { 0% { background: rgba(255,82,82,0); } 30% { background: rgba(255,82,82,0.3); } 100% { background: rgba(255,82,82,0); } }
.price-flash-green { animation: flashGreen 1.5s ease; border-radius: 4px; }
.price-flash-red { animation: flashRed 1.5s ease; border-radius: 4px; }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    API.startRatePolling();
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    if (themeToggle && themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-bs-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', next);
            localStorage.setItem('theme', next);
            themeIcon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            themeToggle.style.transform = 'rotate(180deg)';
            themeToggle.style.transition = 'transform 0.4s ease';
            setTimeout(() => { themeToggle.style.transform = 'rotate(0)'; }, 400);
        });
    }
    const userStr = localStorage.getItem('user');
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        let isAdmin = false;
        if (userStr) {
            try { const user = JSON.parse(userStr); isAdmin = user.role === 'admin'; } catch (e) {}
        }
        adminLink.style.display = isAdmin ? '' : 'none';
    }

    // Price drop detection
    (function checkPriceDrops() {
        let tracked = JSON.parse(localStorage.getItem('priceTracker') || '[]');
        if (tracked.length === 0) return;
        let checkedIds = tracked.map(function (t) { return t.id; });
        apiRequest('/products?ids=' + checkedIds.join(',')).then(function (result) {
            if (!result || !result.success || !result.data) return;
            let drops = [];
            result.data.forEach(function (p) {
                let old = tracked.find(function (t) { return t.id === p.id; });
                if (old && p.price < old.price) {
                    let dropPercent = Math.round(((old.price - p.price) / old.price) * 100);
                    if (dropPercent >= 3) {
                        drops.push({ name: p.name, oldPrice: old.price, newPrice: p.price, dropPercent: dropPercent, id: p.id });
                    }
                }
            });
            if (drops.length > 0) {
                let msg = '📉 ' + drops.map(function (d) { return d.name + ': ' + d.dropPercent + '% تخفیف'; }).join('\n');
                API.showNotification(msg, 'success');
                // Update tracked prices
                result.data.forEach(function (p) {
                    let idx = tracked.findIndex(function (t) { return t.id === p.id; });
                    if (idx !== -1) tracked[idx].price = p.price;
                });
                localStorage.setItem('priceTracker', JSON.stringify(tracked));
            }
        }).catch(function () {});
    })();
});

window.API = API;
window.apiRequest = apiRequest;
console.log('✅ API.js loaded');
