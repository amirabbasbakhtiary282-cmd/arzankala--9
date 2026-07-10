const https = require('https');
const http = require('http');
const FETCH_INTERVAL = 60 * 1000;
const FALLBACK_RATE = 1753100;

let currentRate = FALLBACK_RATE;
let previousRate = FALLBACK_RATE;
let currentSource = 'fallback';
let lastFetch = 0;
let lastSuccessTime = null;
const rateHistory = [];

function httpGet(url, timeout = 8000) {
    return new Promise((resolve) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { timeout }, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(data));
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
}

async function fetchTgju() {
    try {
        const html = await httpGet('https://www.tgju.org/profile/price_dollar_rl', 4000);
        if (!html) return null;
        const match = html.match(/class="price[^"]*"[^>]*>([0-9,]+)/);
        if (match && match[1]) {
            const rate = parseInt(match[1].replace(/,/g, ''));
            if (rate > 0) return { rate: rate, source: 'tgju.org' };
        }
    } catch {}
    return null;
}

async function fetchNobitex() {
    try {
        const data = await httpGet('https://api.nobitex.ir/v2/orderbook/USDTIRT');
        if (!data) return null;
        const parsed = JSON.parse(data);
        if (parsed && parsed.lastTradePrice) {
            return { rate: parseInt(parsed.lastTradePrice), source: 'Nobitex' };
        }
    } catch {}
    return null;
}

async function fetchWallex() {
    try {
        const data = await httpGet('https://api.wallex.ir/v1/markets');
        if (!data) return null;
        const parsed = JSON.parse(data);
        if (parsed && parsed.result && parsed.result.markets && parsed.result.markets.USDTIRT) {
            const priceStr = parsed.result.markets.USDTIRT.price;
            const price = parseInt(parseFloat(priceStr));
            if (price > 0) return { rate: price, source: 'Wallex' };
        }
    } catch {}
    return null;
}

async function refreshRate() {
    const [tgju, nobitex, wallex] = await Promise.all([fetchTgju(), fetchNobitex(), fetchWallex()]);
    const results = [tgju, nobitex, wallex].filter(r => r !== null && r.rate > 0);

    previousRate = currentRate;

    if (results.length > 0) {
        results.sort((a, b) => a.rate - b.rate);
        const median = results.length % 2 === 1
            ? results[Math.floor(results.length / 2)].rate
            : Math.round((results[results.length / 2 - 1].rate + results[results.length / 2].rate) / 2);
        currentRate = Math.round(median);
        currentSource = results.map(r => r.source).join('+');
        lastSuccessTime = new Date().toISOString();
        rateHistory.push({ rate: currentRate, time: lastSuccessTime, sources: currentSource });
        if (rateHistory.length > 500) rateHistory.splice(0, rateHistory.length - 500);
        console.log(`[نرخ ارز] ${currentSource}: ${currentRate.toLocaleString()} IRR/USD (${previousRate !== currentRate ? 'تغییر کرد' : 'ثابت'})`);
    } else {
        console.log(`[نرخ ارز] استفاده از مقدار پیش‌فرض: ${currentRate.toLocaleString()} IRR/USD`);
    }
    lastFetch = Date.now();
}

async function getRate() {
    if (Date.now() - lastFetch > FETCH_INTERVAL) {
        await refreshRate();
    }
    return {
        rate: currentRate,
        previousRate,
        source: currentSource,
        lastUpdate: lastSuccessTime,
        change: currentRate - previousRate,
        changePercent: previousRate > 0 ? parseFloat(((currentRate - previousRate) / previousRate * 100).toFixed(2)) : 0
    };
}

function getCurrentRate() {
    return currentRate;
}

function getRateHistory() {
    return rateHistory.slice(-100);
}

refreshRate().catch(() => {});
setInterval(refreshRate, FETCH_INTERVAL);

module.exports = { getRate, refreshRate, getCurrentRate, getRateHistory };
