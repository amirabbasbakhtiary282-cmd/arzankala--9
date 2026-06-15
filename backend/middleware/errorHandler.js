// ============================================
// middleware/errorHandler.js
// مدیریت متمرکز خطاهای سرور
// ============================================

// ========== کلاس خطای سفارشی ==========

class AppError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

// ========== خطاهای رایج ==========

const createNotFoundError = (resource) => {
    return new AppError(`${resource} یافت نشد`, 404, 'NOT_FOUND');
};

const createValidationError = (details) => {
    const error = new AppError('اطلاعات وارد شده نامعتبر است', 400, 'VALIDATION_ERROR');
    error.details = details;
    return error;
};

const createUnauthorizedError = (message = 'احراز هویت نشده است') => {
    return new AppError(message, 401, 'UNAUTHORIZED');
};

const createForbiddenError = (message = 'دسترسی غیرمجاز') => {
    return new AppError(message, 403, 'FORBIDDEN');
};

const createDuplicateError = (field, value) => {
    return new AppError(`${field} "${value}" قبلاً ثبت شده است`, 409, 'DUPLICATE_ENTRY');
};

// ========== میان‌افزار خطاهای 404 ==========

const notFoundHandler = (req, res, next) => {
    const error = new AppError(`مسیر ${req.originalUrl} یافت نشد`, 404, 'ROUTE_NOT_FOUND');
    next(error);
};

// ========== میان‌افزار اصلی مدیریت خطاها ==========

const errorHandler = (err, req, res, next) => {
    // تنظیم مقادیر پیش‌فرض
    let statusCode = err.statusCode || 500;
    let message = err.message || 'خطای داخلی سرور';
    let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
    let details = err.details || null;
    
    // لاگ خطا برای دیباگ (در محیط توسعه کامل، در محیط تولید خلاصه)
    if (process.env.NODE_ENV === 'development') {
        console.error('========================================');
        console.error('❌ خطا رخ داد:');
        console.error(`   پیام: ${message}`);
        console.error(`   کد وضعیت: ${statusCode}`);
        console.error(`   کد خطا: ${errorCode}`);
        console.error(`   مسیر: ${req.method} ${req.originalUrl}`);
        console.error(`   زمان: ${new Date().toISOString()}`);
        if (err.stack) {
            console.error('   استک تریس:');
            console.error(err.stack);
        }
        console.error('========================================');
    } else {
        // در محیط تولید فقط خطاهای مهم را لاگ کن
        if (statusCode >= 500) {
            console.error(`❌ خطای سرور: ${message} - ${req.method} ${req.originalUrl}`);
        }
    }
    
    // ========== مدیریت خطاهای مختلف ==========
    
    // خطای JWT (توکن نامعتبر)
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'توکن نامعتبر است. لطفاً دوباره وارد شوید';
        errorCode = 'INVALID_TOKEN';
    }
    
    // خطای انقضای توکن
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید';
        errorCode = 'TOKEN_EXPIRED';
    }
    
    // خطای اعتبارسنجی MongoDB (تکراری)
    if (err.code === 11000) {
        statusCode = 409;
        message = 'اطلاعات تکراری وارد شده است';
        errorCode = 'DUPLICATE_KEY';
        const field = Object.keys(err.keyPattern)[0];
        details = `${field} قبلاً ثبت شده است`;
    }
    
    // خطای اتصال به دیتابیس
    if (err.message && err.message.includes('ECONNREFUSED')) {
        statusCode = 503;
        message = 'اتصال به دیتابیس با مشکل مواجه شده است. لطفاً چند لحظه دیگر تلاش کنید';
        errorCode = 'DB_CONNECTION_ERROR';
    }
    
    // ========== ارسال پاسخ خطا ==========
    
    const errorResponse = {
        success: false,
        error: message,
        code: errorCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };
    
    if (details && process.env.NODE_ENV === 'development') {
        errorResponse.details = details;
    }
    
    // در محیط توسعه، استک تریس را هم نمایش بده
    if (process.env.NODE_ENV === 'development' && err.stack) {
        errorResponse.stack = err.stack;
    }
    
    res.status(statusCode).json(errorResponse);
};

// ========== میان‌افزار اعتبارسنجی ورودی‌ها ==========

// بررسی وجود فیلدهای اجباری در بدنه درخواست
const validateRequiredFields = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = [];
        
        for (const field of requiredFields) {
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                missingFields.push(field);
            }
        }
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'فیلدهای اجباری تکمیل نشده است',
                missingFields: missingFields,
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }
        
        next();
    };
};

// اعتبارسنجی شناسه (id) در پارامترهای مسیر
const validateIdParam = (paramName = 'id') => {
    return (req, res, next) => {
        const id = parseInt(req.params[paramName]);
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                error: `شناسه ${paramName} نامعتبر است`,
                code: 'INVALID_ID'
            });
        }
        
        req.validatedId = id;
        next();
    };
};

// ========== خروجی ماژول ==========

module.exports = {
    AppError,
    createNotFoundError,
    createValidationError,
    createUnauthorizedError,
    createForbiddenError,
    createDuplicateError,
    notFoundHandler,
    errorHandler,
    validateRequiredFields,
    validateIdParam
};