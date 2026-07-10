// ============================================
// models/Product.js
// مدل (ساختار) محصولات فروشگاه
// ============================================

class Product {
    // سازنده کلاس - هنگام ساخت محصول جدید اجرا میشه
    constructor(data) {
        // فیلدهای اجباری (همه محصولات باید اینها رو داشته باشن)
        this.id = data.id;                     // شناسه یکتای محصول (عدد)
        this.name = data.name;                 // نام محصول (متن)
        this.category = data.category;         // دسته بندی (mobile, laptop, accessory, ...)
        this.price = data.price;               // قیمت فعلی (عدد)
        this.priceUSD = data.priceUSD || null;  // قیمت به دلار
        
        // فیلدهای اختیاری (ممکنه بعضی محصولات نداشته باشن)
        this.oldPrice = data.oldPrice || null; // قیمت قبل از تخفیف (اگه تخفیف داره)
        this.oldPriceUSD = data.oldPriceUSD || null; // قیمت قدیم به دلار
        this.image = data.image || 'default.jpg'; // نام فایل تصویر
        this.stock = data.stock !== undefined ? data.stock : 0;  // تعداد موجودی
        this.rating = data.rating || 0;        // امتیاز محصول (0 تا 5)
        this.description = data.description || ''; // توضیحات محصول
        this.specs = data.specs || {};         // مشخصات فنی (شیء)
        
        // فیلدهای زمانی (تاریخ ایجاد و آخرین ویرایش)
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = new Date();
        
        // فیلدهای آماری (برای سیستم پیشنهاد هوشمند)
        this.viewCount = data.viewCount || 0;        // تعداد بازدید
        this.purchaseCount = data.purchaseCount || 0; // تعداد فروش
        this.wishlistCount = data.wishlistCount || 0; // تعداد علاقه‌مندی‌ها
    }
    
    // ========== متدهای محاسباتی ==========
    
    // محاسبه درصد تخفیف
    getDiscountPercent() {
        if (!this.oldPrice || this.oldPrice <= this.price) return 0;
        const discount = ((this.oldPrice - this.price) / this.oldPrice) * 100;
        return Math.round(discount);
    }
    
    // قیمت با فرمت تومان (برای نمایش در فرانت‌اند)
    getFormattedPrice() {
        return this.price.toLocaleString('fa-IR') + ' تومان';
    }
    
    // قیمت قدیم با فرمت تومان
    getFormattedOldPrice() {
        if (!this.oldPrice) return null;
        return this.oldPrice.toLocaleString('fa-IR') + ' تومان';
    }
    
    // محاسبه امتیاز برای الگوریتم پیشنهاد هوشمند
    calculateScore(profile) {
        let score = 0;
        
        // امتیاز بر اساس موجودی
        if (this.stock > 10) score += 10;
        else if (this.stock > 5) score += 7;
        else if (this.stock > 0) score += 3;
        else score -= 10;
        
        // امتیاز بر اساس رتبه کاربران
        if (this.rating >= 4.5) score += 15;
        else if (this.rating >= 4) score += 10;
        else if (this.rating >= 3.5) score += 5;
        
        // امتیاز بر اساس تخفیف
        const discountPercent = this.getDiscountPercent();
        if (discountPercent >= 20) score += 20;
        else if (discountPercent >= 10) score += 10;
        else if (discountPercent >= 5) score += 5;
        
        // امتیاز بر اساس نوع کاربر (اگه پروفایل داشته باشیم)
        if (profile) {
            // کاربر گیمر
            if (profile.usage === 'gaming' && 
                (this.category === 'laptop' || this.category === 'monitor')) {
                score += 10;
            }
            // کاربر دانشجو
            if (profile.usage === 'student' && 
                (this.category === 'laptop' || this.category === 'tablet' || this.category === 'mobile')) {
                score += 10;
            }
            // کاربر اداری
            if (profile.usage === 'office' && 
                (this.category === 'laptop' || this.category === 'monitor' || this.category === 'accessory')) {
                score += 10;
            }
            
            // فوریت خرید
            if (profile.urgency === 'urgent' && this.stock > 3) {
                score += 15;
            }
        }
        
        return score;
    }
    
    // ========== متدهای شرطی ==========
    
    // آیا محصول موجود است؟
    isInStock() {
        return this.stock > 0;
    }
    
    // آیا محصول تخفیف دارد؟
    hasDiscount() {
        return this.oldPrice !== null && this.oldPrice > this.price;
    }
    
    // آیا محصول جدید است؟ (کمتر از 30 روز از ایجادش گذشته)
    isNew() {
        const daysOld = (new Date() - this.createdAt) / (1000 * 60 * 60 * 24);
        return daysOld < 30;
    }
    
    // موجودی کم است؟ (کمتر از 5 عدد)
    isLowStock() {
        return this.stock > 0 && this.stock < 5;
    }
    
    // ========== متدهای آماری ==========
    
    // افزایش تعداد بازدید
    incrementViewCount() {
        this.viewCount++;
        this.updatedAt = new Date();
    }
    
    // افزایش تعداد فروش (زمانی که محصول خریداری بشه)
    incrementPurchaseCount(quantity = 1) {
        this.purchaseCount += quantity;
        this.stock -= quantity;
        this.updatedAt = new Date();
    }
    
    // افزایش تعداد علاقه‌مندی
    incrementWishlistCount() {
        this.wishlistCount++;
        this.updatedAt = new Date();
    }
    
    // کاهش تعداد علاقه‌مندی
    decrementWishlistCount() {
        if (this.wishlistCount > 0) this.wishlistCount--;
        this.updatedAt = new Date();
    }
    
    // ========== متدهای تبدیل ==========
    
    // تبدیل محصول به یک شیء ساده (برای ذخیره در دیتابیس)
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            category: this.category,
            price: this.price,
            priceUSD: this.priceUSD,
            oldPrice: this.oldPrice,
            oldPriceUSD: this.oldPriceUSD,
            image: this.image,
            stock: this.stock,
            rating: this.rating,
            description: this.description,
            specs: this.specs,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            viewCount: this.viewCount,
            purchaseCount: this.purchaseCount,
            wishlistCount: this.wishlistCount
        };
    }
    
    // تبدیل لیست محصولات به JSON
    static listToJSON(products) {
        return products.map(product => product.toJSON());
    }
    
    // ========== متدهای استاتیک (بدون نیاز به نمونه) ==========
    
    // اعتبارسنجی داده‌های محصول (قبل از ذخیره)
    static validate(productData) {
        const errors = [];
        
        if (!productData.name || productData.name.trim() === '') {
            errors.push('نام محصول الزامی است');
        }
        
        if (!productData.category || productData.category.trim() === '') {
            errors.push('دسته‌بندی محصول الزامی است');
        }
        
        if (!productData.price || productData.price <= 0) {
            errors.push('قیمت محصول باید بزرگتر از صفر باشد');
        }
        
        if (productData.stock !== undefined && productData.stock < 0) {
            errors.push('موجودی محصول نمی‌تواند منفی باشد');
        }
        
        if (productData.rating !== undefined && (productData.rating < 0 || productData.rating > 5)) {
            errors.push('امتیاز محصول باید بین 0 تا 5 باشد');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // ایجاد یک محصول نمونه (برای تست)
    static createSample() {
        return new Product({
            id: 999,
            name: 'محصول نمونه',
            category: 'mobile',
            price: 10000000,
            oldPrice: 12000000,
            image: 'sample.jpg',
            stock: 10,
            rating: 4.5,
            description: 'این یک محصول نمونه برای تست است',
            specs: {
                'رنگ': 'مشکی',
                'ضمانت': '۱۸ ماهه'
            }
        });
    }
    
    // ========== متدهای فیلترینگ ==========
    
    // فیلتر محصولات بر اساس کلمات کلیدی
    static filterByKeyword(products, keyword) {
        if (!keyword || keyword.trim() === '') return products;
        
        const lowerKeyword = keyword.toLowerCase().trim();
        
        return products.filter(product => 
            product.name.toLowerCase().includes(lowerKeyword) ||
            product.category.toLowerCase().includes(lowerKeyword) ||
            (product.description && product.description.toLowerCase().includes(lowerKeyword)) ||
            (product.specs && Object.values(product.specs).some(spec => 
                String(spec).toLowerCase().includes(lowerKeyword)
            ))
        );
    }
    
    // فیلتر محصولات بر اساس بازه قیمتی
    static filterByPriceRange(products, minPrice, maxPrice) {
        let filtered = [...products];
        
        if (minPrice !== undefined && minPrice !== null && minPrice > 0) {
            filtered = filtered.filter(p => p.price >= minPrice);
        }
        
        if (maxPrice !== undefined && maxPrice !== null && maxPrice > 0) {
            filtered = filtered.filter(p => p.price <= maxPrice);
        }
        
        return filtered;
    }
    
    // فیلتر بر اساس دسته‌بندی
    static filterByCategory(products, category) {
        if (!category || category === 'all') return products;
        return products.filter(p => p.category === category);
    }
    
    // ========== متدهای مرتب‌سازی ==========
    
    // مرتب‌سازی بر اساس قیمت (صعودی/نزولی)
    static sortByPrice(products, ascending = true) {
        return [...products].sort((a, b) => 
            ascending ? a.price - b.price : b.price - a.price
        );
    }
    
    // مرتب‌سازی بر اساس امتیاز (بیشترین اول)
    static sortByRating(products) {
        return [...products].sort((a, b) => b.rating - a.rating);
    }
    
    // مرتب‌سازی بر اساس جدیدترین
    static sortByNewest(products) {
        return [...products].sort((a, b) => b.createdAt - a.createdAt);
    }
    
    // مرتب‌سازی بر اساس پرفروش‌ترین
    static sortByPopular(products) {
        return [...products].sort((a, b) => b.purchaseCount - a.purchaseCount);
    }
    
    // مرتب‌سازی بر اساس پر بازدیدترین
    static sortByMostViewed(products) {
        return [...products].sort((a, b) => b.viewCount - a.viewCount);
    }
    
    // مرتب‌سازی ترکیبی (برای پیشنهاد هوشمند)
    static smartSort(products, profile) {
        return [...products].sort((a, b) => {
            const scoreA = a.calculateScore(profile);
            const scoreB = b.calculateScore(profile);
            return scoreB - scoreA;
        });
    }
}

// خروجی کلاس برای استفاده در فایل‌های دیگه
module.exports = Product;