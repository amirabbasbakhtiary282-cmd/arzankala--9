// ============================================
// models/User.js
// مدل (ساختار) کاربران فروشگاه
// ============================================

class User {
    // سازنده کلاس - هنگام ساخت کاربر جدید اجرا میشه
    constructor(data) {
        // فیلدهای اجباری
        this.id = data.id;                          // شناسه یکتای کاربر
        this.username = data.username;               // نام کاربری (یکتا)
        this.password = data.password;               // رمز عبور (هش شده)
        this.fullname = data.fullname || '';         // نام کامل
        
        // فیلدهای اطلاعات شخصی
        this.email = data.email || '';               // ایمیل
        this.mobile = data.mobile || '';             // شماره موبایل
        this.birthYear = data.birthYear || null;     // سال تولد
        
        // نقش کاربر (admin, user, moderator)
        this.role = data.role || 'user';
        
        // وضعیت حساب
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.isVerified = data.isVerified !== undefined ? data.isVerified : false;
        
        // زمان‌ها
        this.createdAt = data.createdAt || new Date();
        this.lastLogin = data.lastLogin || null;
        this.updatedAt = new Date();
        
        // آدرس‌ها (برای ارسال سفارش)
        this.addresses = data.addresses || [];
        
        // تاریخچه فعالیت‌ها
        this.searchHistory = data.searchHistory || [];    // آخرین جستجوها
        this.viewHistory = data.viewHistory || [];       // آخرین محصولات دیده شده
        this.cartHistory = data.cartHistory || [];       // سبدهای خرید قبلی
        
        // آمار کاربر
        this.totalOrders = data.totalOrders || 0;
        this.totalSpent = data.totalSpent || 0;
        this.wishlist = data.wishlist || [];             // لیست علاقه‌مندی‌ها
        
        // تنظیمات کاربر
        this.settings = data.settings || {
            theme: 'dark',
            notifications: true,
            language: 'fa'
        };
    }
    
    // ========== متدهای اعتبارسنجی ==========
    
    // بررسی اعتبار نام کاربری
    static isValidUsername(username) {
        if (!username || username.length < 3) return false;
        if (username.length > 20) return false;
        // فقط حروف انگلیسی، اعداد و زیرخط مجاز است
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        return usernameRegex.test(username);
    }
    
    // بررسی اعتبار رمز عبور
    static isValidPassword(password) {
        if (!password || password.length < 6) return false;
        if (password.length > 50) return false;
        // حداقل یک عدد و یک حرف
        const hasNumber = /\d/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);
        return hasNumber && hasLetter;
    }
    
    // بررسی اعتبار ایمیل
    static isValidEmail(email) {
        if (!email) return true; // ایمیل اختیاری است
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // بررسی اعتبار شماره موبایل (ایران)
    static isValidMobile(mobile) {
        if (!mobile) return true; // موبایل اختیاری است
        const mobileRegex = /^09[0-9]{9}$/;
        return mobileRegex.test(mobile);
    }
    
    // ========== متدهای مدیریت تاریخچه ==========
    
    // اضافه کردن جستجو به تاریخچه
    addToSearchHistory(query) {
        if (!query || query.trim() === '') return;
        
        // حذف تکراری‌ها
        this.searchHistory = this.searchHistory.filter(item => item.query !== query);
        
        // اضافه کردن به اول لیست
        this.searchHistory.unshift({
            query: query,
            timestamp: new Date()
        });
        
        // نگهداری فقط ۲۰ جستجوی آخر
        if (this.searchHistory.length > 20) {
            this.searchHistory = this.searchHistory.slice(0, 20);
        }
        
        this.updatedAt = new Date();
    }
    
    // اضافه کردن محصول به تاریخچه بازدید
    addToViewHistory(productId) {
        if (!productId) return;
        
        // حذف تکراری‌ها
        this.viewHistory = this.viewHistory.filter(item => item.productId !== productId);
        
        // اضافه کردن به اول لیست
        this.viewHistory.unshift({
            productId: productId,
            timestamp: new Date()
        });
        
        // نگهداری فقط ۵۰ بازدید آخر
        if (this.viewHistory.length > 50) {
            this.viewHistory = this.viewHistory.slice(0, 50);
        }
        
        this.updatedAt = new Date();
    }
    
    // اضافه کردن محصول به علاقه‌مندی‌ها
    addToWishlist(productId) {
        if (!productId) return false;
        
        if (!this.wishlist.includes(productId)) {
            this.wishlist.push(productId);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }
    
    // حذف از علاقه‌مندی‌ها
    removeFromWishlist(productId) {
        if (!productId) return false;
        
        const index = this.wishlist.indexOf(productId);
        if (index !== -1) {
            this.wishlist.splice(index, 1);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }
    
    // بررسی اینکه محصول در علاقه‌مندی‌ها هست یا نه
    isInWishlist(productId) {
        return this.wishlist.includes(productId);
    }
    
    // ========== متدهای آماری ==========
    
    // ثبت خرید جدید
    recordOrder(orderAmount) {
        this.totalOrders++;
        this.totalSpent += orderAmount;
        this.updatedAt = new Date();
    }
    
    // ثبت آخرین ورود
    recordLogin() {
        this.lastLogin = new Date();
        this.updatedAt = new Date();
    }
    
    // ========== متدهای نقش و دسترسی ==========
    
    // آیا کاربر مدیر است؟
    isAdmin() {
        return this.role === 'admin';
    }
    
    // آیا کاربر معمولی است؟
    isRegularUser() {
        return this.role === 'user';
    }
    
    // آیا حساب کاربری فعال است؟
    isAccountActive() {
        return this.isActive;
    }
    
    // غیرفعال کردن حساب کاربری
    deactivate() {
        this.isActive = false;
        this.updatedAt = new Date();
    }
    
    // فعال کردن حساب کاربری
    activate() {
        this.isActive = true;
        this.updatedAt = new Date();
    }
    
    // ========== متدهای آدرس ==========
    
    // اضافه کردن آدرس جدید
    addAddress(address) {
        if (!address || !address.fullAddress) return false;
        
        const newAddress = {
            id: Date.now(),
            fullAddress: address.fullAddress,
            city: address.city || '',
            postalCode: address.postalCode || '',
            phone: address.phone || '',
            isDefault: address.isDefault || false,
            createdAt: new Date()
        };
        
        // اگر این آدرس پیش‌فرض است، بقیه را غیرپیش‌فرض کن
        if (newAddress.isDefault) {
            this.addresses.forEach(addr => addr.isDefault = false);
        }
        
        // اگر اولین آدرس است، خودکار پیش‌فرض کن
        if (this.addresses.length === 0) {
            newAddress.isDefault = true;
        }
        
        this.addresses.push(newAddress);
        this.updatedAt = new Date();
        return true;
    }
    
    // حذف آدرس
    removeAddress(addressId) {
        const index = this.addresses.findIndex(addr => addr.id === addressId);
        if (index !== -1) {
            this.addresses.splice(index, 1);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }
    
    // دریافت آدرس پیش‌فرض
    getDefaultAddress() {
        return this.addresses.find(addr => addr.isDefault) || this.addresses[0] || null;
    }
    
    // ========== متدهای تبدیل و خروجی ==========
    
    // تبدیل کاربر به یک شیء ساده (برای ذخیره در دیتابیس)
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            password: this.password,
            fullname: this.fullname,
            email: this.email,
            mobile: this.mobile,
            birthYear: this.birthYear,
            role: this.role,
            isActive: this.isActive,
            isVerified: this.isVerified,
            createdAt: this.createdAt,
            lastLogin: this.lastLogin,
            updatedAt: this.updatedAt,
            addresses: this.addresses,
            searchHistory: this.searchHistory,
            viewHistory: this.viewHistory,
            cartHistory: this.cartHistory,
            totalOrders: this.totalOrders,
            totalSpent: this.totalSpent,
            wishlist: this.wishlist,
            settings: this.settings
        };
    }
    
    // خروجی عمومی (برای ارسال به فرانت‌اند - بدون اطلاعات حساس)
    toPublicJSON() {
        return {
            id: this.id,
            username: this.username,
            fullname: this.fullname,
            email: this.email,
            mobile: this.mobile,
            role: this.role,
            createdAt: this.createdAt,
            lastLogin: this.lastLogin,
            addresses: this.addresses,
            wishlist: this.wishlist,
            settings: this.settings,
            totalOrders: this.totalOrders,
            totalSpent: this.totalSpent
        };
    }
    
    // ========== متدهای استاتیک ==========
    
    // اعتبارسنجی کامل داده‌های کاربر (قبل از ثبت‌نام)
    static validate(userData, isUpdate = false) {
        const errors = [];
        
        if (!isUpdate) {
            // بررسی نام کاربری (فقط برای ثبت‌نام جدید)
            if (!userData.username) {
                errors.push('نام کاربری الزامی است');
            } else if (!this.isValidUsername(userData.username)) {
                errors.push('نام کاربری باید حداقل ۳ کاراکتر و فقط شامل حروف انگلیسی، اعداد و زیرخط باشد');
            }
            
            // بررسی رمز عبور (فقط برای ثبت‌نام جدید)
            if (!userData.password) {
                errors.push('رمز عبور الزامی است');
            } else if (!this.isValidPassword(userData.password)) {
                errors.push('رمز عبور باید حداقل ۶ کاراکتر و شامل حداقل یک عدد و یک حرف باشد');
            }
        }
        
        // بررسی نام کامل
        if (userData.fullname && userData.fullname.length < 3) {
            errors.push('نام کامل باید حداقل ۳ کاراکتر باشد');
        }
        
        // بررسی ایمیل
        if (userData.email && !this.isValidEmail(userData.email)) {
            errors.push('ایمیل نامعتبر است');
        }
        
        // بررسی موبایل
        if (userData.mobile && !this.isValidMobile(userData.mobile)) {
            errors.push('شماره موبایل نامعتبر است (باید با 09 شروع شود)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // ایجاد یک کاربر نمونه (برای تست)
    static createSample() {
        return new User({
            id: 1,
            username: 'sample_user',
            password: 'hashed_password_123',
            fullname: 'کاربر نمونه',
            email: 'sample@example.com',
            mobile: '09123456789',
            role: 'user',
            isActive: true,
            isVerified: true
        });
    }
    
    // ایجاد یک کاربر مدیر نمونه (برای تست)
    static createAdminSample() {
        return new User({
            id: 2,
            username: 'admin',
            password: 'hashed_admin_password',
            fullname: 'مدیر سیستم',
            email: 'admin@arzankala.com',
            role: 'admin',
            isActive: true,
            isVerified: true
        });
    }
}

module.exports = User;