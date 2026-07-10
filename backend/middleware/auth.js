// ============================================
// middleware/auth.js
// میان‌افزارهای احراز هویت و مدیریت دسترسی
// ============================================

const jwt = require('jsonwebtoken');

// کلید مخفی برای امضای توکن (باید با server.js هماهنگ باشد)
const JWT_SECRET = process.env.JWT_SECRET || 'arzankala_super_secret_key_2024';

// ========== میان‌افزار محافظت از مسیرها ==========

// بررسی وجود توکن معتبر و اضافه کردن اطلاعات کاربر به req
const protect = async (req, res, next) => {
    try {
        let token;
        
        // دریافت توکن از هدر Authorization
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        // اگر توکن وجود نداشت
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'دسترسی غیرمجاز. لطفاً وارد حساب کاربری خود شوید',
                message: 'توکن احراز هویت یافت نشد',
                code: 'INVALID_TOKEN'
            });
        }
        
        // اعتبارسنجی توکن
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // اضافه کردن اطلاعات کاربر به req برای استفاده در کنترلرها
            req.user = {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
            
            next();
        } catch (jwtError) {
            // خطاهای مختلف توکن
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'توکن نامعتبر است. لطفاً دوباره وارد شوید',
                    code: 'INVALID_TOKEN'
                });
            } else {
                return res.status(401).json({
                    success: false,
                    error: 'خطا در احراز هویت. لطفاً دوباره تلاش کنید',
                    code: 'AUTH_ERROR'
                });
            }
        }
        
    } catch (error) {
        console.error('خطا در middleware protect:', error);
        res.status(500).json({
            success: false,
            error: 'خطای داخلی سرور در احراز هویت'
        });
    }
};

// ========== میان‌افزار بررسی نقش مدیر ==========

// بررسی اینکه کاربر نقش مدیر دارد (بعد از protect استفاده شود)
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'احراز هویت نشده است'
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'دسترسی غیرمجاز. این بخش فقط برای مدیران سیستم قابل دسترسی است',
            code: 'ADMIN_ONLY'
        });
    }
    
    next();
};

// ========== میان‌افزار بررسی نقش کاربر معمولی ==========

// بررسی اینکه کاربر نقش معمولی دارد (اختیاری - برای تمایز)
const userOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'احراز هویت نشده است'
        });
    }
    
    if (req.user.role !== 'user' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'دسترسی غیرمجاز'
        });
    }
    
    next();
};

// ========== میان‌افزار بررسی مالکیت ==========

// بررسی اینکه کاربر مالک منبع است یا مدیر
// این تابع یک فیلد برای بررسی مالکیت دریافت می‌کند
const checkOwnership = (getResourceUserId) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'احراز هویت نشده است'
                });
            }
            
            // اگر کاربر مدیر است، اجازه دسترسی دارد
            if (req.user.role === 'admin') {
                return next();
            }
            
            // دریافت شناسه کاربر مالک منبع
            const resourceUserId = await getResourceUserId(req);
            
            // اگر کاربر جاری مالک منبع است، اجازه دسترسی دارد
            if (req.user.id === resourceUserId) {
                return next();
            }
            
            // در غیر این صورت، دسترسی غیرمجاز
            res.status(403).json({
                success: false,
                error: 'شما مجاز به انجام این عملیات نیستید',
                code: 'NOT_OWNER'
            });
        } catch (error) {
            console.error('خطا در checkOwnership:', error);
            res.status(500).json({
                success: false,
                error: 'خطا در بررسی دسترسی'
            });
        }
    };
};

// ========== توابع کمکی برای تولید و مدیریت توکن ==========

// تولید توکن جدید (برای استفاده در کنترلرها)
const generateToken = (userId, username, role) => {
    return jwt.sign(
        { id: userId, username: username, role: role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// بررسی اعتبار توکن (بدون throw)
const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

// ========== خروجی ماژول ==========

module.exports = {
    protect,
    adminOnly,
    userOnly,
    checkOwnership,
    generateToken,
    verifyToken,
    JWT_SECRET
};