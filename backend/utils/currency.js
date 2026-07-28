// ============================================================
// utils/currency.js
// تبدیل قیمت دلاری به تومان بر اساس نرخ لحظه‌ای دلار
// ============================================================
// نرخی که سرویس exchangeRateService برمی‌گرداند بر حسب «ریال» است،
// بنابراین برای رسیدن به «تومان» بر ۱۰ تقسیم می‌شود.
// (همان فرمولی که در seed.js استفاده شده بود)
// ============================================================

// نرخ پیش‌فرض در صورتی که نرخ لحظه‌ای در دسترس نباشد (ریال)
const FALLBACK_RATE = 1753100;

/**
 * تبدیل مبلغ دلاری به تومان
 * @param {number} usd مبلغ به دلار
 * @param {number} [rate] نرخ دلار به ریال
 * @returns {number|null} مبلغ به تومان (گرد شده)
 */
function convertUsdToToman(usd, rate) {
    const amount = Number(usd);
    if (!isFinite(amount) || amount <= 0) return null;

    const effectiveRate = Number(rate) > 0 ? Number(rate) : FALLBACK_RATE;
    return Math.round((amount * effectiveRate) / 10);
}

/**
 * تبدیل مبلغ تومانی به دلار
 * @param {number} toman مبلغ به تومان
 * @param {number} [rate] نرخ دلار به ریال
 * @returns {number|null} مبلغ به دلار با دو رقم اعشار
 */
function convertTomanToUsd(toman, rate) {
    const amount = Number(toman);
    if (!isFinite(amount) || amount <= 0) return null;

    const effectiveRate = Number(rate) > 0 ? Number(rate) : FALLBACK_RATE;
    return Math.round((amount * 10 / effectiveRate) * 100) / 100;
}

module.exports = { convertUsdToToman, convertTomanToUsd, FALLBACK_RATE };
