// ============================================
// utils/helpers.js
// توابع کمکی عمومی برای استفاده در کل پروژه
// ============================================

// ========== توابع فرمت و تبدیل ==========

// تبدیل قیمت به فرمت تومان با جداکننده هزارگان
const formatPrice = (price, withTomans = true) => {
    if (price === null || price === undefined) return '۰';
    const formatted = price.toLocaleString('fa-IR');
    return withTomans ? `${formatted} تومان` : formatted;
};

// تبدیل تاریخ به فرمت فارسی
const formatDate = (date, withTime = false) => {
    if (!date) return 'نامشخص';
    const d = new Date(date);
    
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    if (withTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return d.toLocaleDateString('fa-IR', options);
};

// محاسبه درصد تخفیف
const getDiscountPercent = (price, oldPrice) => {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
};

// ========== توابع اعتبارسنجی ==========

// بررسی اعتبار ایمیل
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// بررسی اعتبار شماره موبایل ایران
const isValidMobile = (mobile) => {
    const mobileRegex = /^09[0-9]{9}$/;
    return mobileRegex.test(mobile);
};

// بررسی اعتبار کد ملی
const isValidNationalCode = (code) => {
    if (!code || code.length !== 10) return false;
    
    const controlDigit = parseInt(code.charAt(9));
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
        sum += parseInt(code.charAt(i)) * (10 - i);
    }
    
    const remainder = sum % 11;
    const isValid = remainder < 2 ? controlDigit === remainder : controlDigit === (11 - remainder);
    
    return isValid;
};

// ========== توابع پردازش متن ==========

// محدود کردن طول متن
const truncateText = (text, maxLength = 100, suffix = '...') => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
};

// حذف تگ‌های HTML از متن
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
};

// تبدیل متن به اسلاگ (برای URL)
const slugify = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// ========== توابع تولید شناسه و توکن ==========

// تولید شناسه یکتا (عدد تصادفی)
const generateUniqueId = () => {
    return Date.now() + Math.floor(Math.random() * 10000);
};

// تولید رشته تصادفی برای توکن
const generateRandomString = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// ========== توابع مرتب‌سازی ==========

// مرتب‌سازی محصولات بر اساس چندین فیلد
const sortProducts = (products, sortBy, order = 'desc') => {
    if (!products || products.length === 0) return products;
    
    const sorted = [...products];
    const multiplier = order === 'desc' ? -1 : 1;
    
    sorted.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (sortBy === 'price') {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        } else if (sortBy === 'rating') {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }
        
        if (aVal < bVal) return -1 * multiplier;
        if (aVal > bVal) return 1 * multiplier;
        return 0;
    });
    
    return sorted;
};

// ========== توابع صفحه‌بندی ==========

// ایجاد اطلاعات صفحه‌بندی
const paginate = (items, page = 1, limit = 20) => {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    
    const paginatedItems = items.slice(startIndex, endIndex);
    
    const pagination = {
        currentPage: pageNum,
        totalPages: Math.ceil(items.length / limitNum),
        totalItems: items.length,
        itemsPerPage: limitNum,
        hasNextPage: endIndex < items.length,
        hasPrevPage: startIndex > 0
    };
    
    return {
        data: paginatedItems,
        pagination: pagination
    };
};

// ========== توابع پاسخ API ==========

// پاسخ موفقیت‌آمیز
const successResponse = (res, data, message = 'عملیات با موفقیت انجام شد', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message: message,
        data: data,
        timestamp: new Date().toISOString()
    });
};

// پاسخ خطا (برای استفاده در کنترلرها)
const errorResponse = (res, message, statusCode = 400, details = null) => {
    const response = {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    };
    
    if (details) {
        response.details = details;
    }
    
    return res.status(statusCode).json(response);
};

// ========== توابع لاگینگ ==========

// لاگ ساده برای دیباگ
const log = (message, type = 'INFO') => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type}]`;
    
    switch (type) {
        case 'ERROR':
            console.error(`${prefix} ${message}`);
            break;
        case 'WARNING':
            console.warn(`${prefix} ${message}`);
            break;
        default:
            console.log(`${prefix} ${message}`);
    }
};

// ========== خروجی ماژول ==========

module.exports = {
    formatPrice,
    formatDate,
    getDiscountPercent,
    isValidEmail,
    isValidMobile,
    isValidNationalCode,
    truncateText,
    stripHtml,
    slugify,
    generateUniqueId,
    generateRandomString,
    sortProducts,
    paginate,
    successResponse,
    errorResponse,
    log
};