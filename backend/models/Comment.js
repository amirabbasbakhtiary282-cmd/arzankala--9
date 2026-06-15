// ============================================
// models/Comment.js
// مدل (ساختار) نظرات کاربران
// ============================================

class Comment {
    // سازنده کلاس - هنگام ساخت نظر جدید اجرا میشه
    constructor(data) {
        // فیلدهای اجباری
        this.id = data.id;                      // شناسه یکتای نظر
        this.productId = data.productId;        // شناسه محصولی که نظر براش نوشته شده
        this.userId = data.userId;              // شناسه کاربر نویسنده
        this.username = data.username;          // نام کاربری نویسنده (برای نمایش سریع)
        
        // محتوای نظر
        this.rating = data.rating || 5;         // امتیاز (1 تا 5)
        this.title = data.title || '';          // عنوان نظر
        this.content = data.content || '';       // متن نظر
        this.pros = data.pros || [];             // نقاط قوت (لیست)
        this.cons = data.cons || [];             // نقاط ضعف (لیست)
        
        // تصاویر پیوست (اختیاری)
        this.images = data.images || [];
        
        // وضعیت نظر
        this.isApproved = data.isApproved !== undefined ? data.isApproved : false; // تأیید شده؟
        this.isVerifiedPurchase = data.isVerifiedPurchase || false; // خرید تأیید شده؟
        
        // تحلیل هوش مصنوعی
        this.aiAnalysis = data.aiAnalysis || {
            sentiment: 'neutral',   // positive, negative, neutral
            summary: '',
            positivePoints: [],
            negativePoints: []
        };
        
        // پاسخ به نظر (از طرف مدیریت)
        this.reply = data.reply || {
            content: '',
            repliedBy: null,
            repliedAt: null
        };
        
        // کمک‌کننده بودن نظر (مفید بودن)
        this.helpfulCount = data.helpfulCount || 0;
        this.unhelpfulCount = data.unhelpfulCount || 0;
        this.helpfulUsers = data.helpfulUsers || []; // لیست کاربرانی که مفید رای دادند
        
        // زمان‌ها
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = new Date();
    }
    
    // ========== متدهای محاسباتی ==========
    
    // محاسبه امتیاز مفید بودن
    getHelpfulScore() {
        const total = this.helpfulCount + this.unhelpfulCount;
        if (total === 0) return 0;
        return (this.helpfulCount / total) * 100;
    }
    
    // آیا نظر تأیید شده است؟
    isApprovedComment() {
        return this.isApproved;
    }
    
    // آیا نظر دارای تحلیل AI است؟
    hasAIAnalysis() {
        return this.aiAnalysis && Object.keys(this.aiAnalysis).length > 0;
    }
    
    // ========== متدهای امتیازدهی مفید بودن ==========
    
    // ثبت رای مفید
    markAsHelpful(userId) {
        if (!userId) return false;
        
        // جلوگیری از رای تکراری
        if (this.helpfulUsers.includes(userId)) {
            return false;
        }
        
        this.helpfulUsers.push(userId);
        this.helpfulCount++;
        this.updatedAt = new Date();
        return true;
    }
    
    // ثبت رای غیرمفید
    markAsUnhelpful() {
        this.unhelpfulCount++;
        this.updatedAt = new Date();
    }
    
    // ========== متدهای مدیریتی ==========
    
    // تأیید نظر توسط مدیر
    approve() {
        this.isApproved = true;
        this.updatedAt = new Date();
    }
    
    // رد نظر توسط مدیر
    reject() {
        this.isApproved = false;
        this.updatedAt = new Date();
    }
    
    // اضافه کردن پاسخ از طرف مدیریت
    addReply(replyContent, adminId) {
        if (!replyContent || replyContent.trim() === '') return false;
        
        this.reply = {
            content: replyContent,
            repliedBy: adminId,
            repliedAt: new Date()
        };
        
        this.updatedAt = new Date();
        return true;
    }
    
    // حذف پاسخ مدیریت
    removeReply() {
        this.reply = {
            content: '',
            repliedBy: null,
            repliedAt: null
        };
        this.updatedAt = new Date();
    }
    
    // ========== متدهای تحلیل AI ==========
    
    // تنظیم تحلیل هوش مصنوعی
    setAIAnalysis(analysis) {
        this.aiAnalysis = {
            sentiment: analysis.sentiment || 'neutral',
            summary: analysis.summary || '',
            positivePoints: analysis.positivePoints || [],
            negativePoints: analysis.negativePoints || []
        };
        this.updatedAt = new Date();
    }
    
    // گرفتن خلاصه احساسات به صورت فارسی
    getSentimentInPersian() {
        const sentiments = {
            positive: 'مثبت',
            negative: 'منفی',
            neutral: 'خنثی'
        };
        return sentiments[this.aiAnalysis.sentiment] || 'خنثی';
    }
    
    // گرفتن رنگ احساسات برای نمایش
    getSentimentColor() {
        const colors = {
            positive: '#00c853',
            negative: '#ff5252',
            neutral: '#ffc107'
        };
        return colors[this.aiAnalysis.sentiment] || '#ffc107';
    }
    
    // ========== متدهای اضافه کردن نقاط قوت/ضعف ==========
    
    // اضافه کردن نقطه قوت
    addProsPoint(point) {
        if (!point || point.trim() === '') return false;
        if (!this.pros.includes(point)) {
            this.pros.push(point);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }
    
    // اضافه کردن نقطه ضعف
    addConsPoint(point) {
        if (!point || point.trim() === '') return false;
        if (!this.cons.includes(point)) {
            this.cons.push(point);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }
    
    // حذف نقطه قوت
    removeProsPoint(index) {
        if (index >= 0 && index < this.pros.length) {
            this.pros.splice(index, 1);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }
    
    // حذف نقطه ضعف
    removeConsPoint(index) {
        if (index >= 0 && index < this.cons.length) {
            this.cons.splice(index, 1);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }
    
    // ========== متدهای تبدیل ==========
    
    // تبدیل نظر به یک شیء ساده (برای ذخیره در دیتابیس)
    toJSON() {
        return {
            id: this.id,
            productId: this.productId,
            userId: this.userId,
            username: this.username,
            rating: this.rating,
            title: this.title,
            content: this.content,
            pros: this.pros,
            cons: this.cons,
            images: this.images,
            isApproved: this.isApproved,
            isVerifiedPurchase: this.isVerifiedPurchase,
            aiAnalysis: this.aiAnalysis,
            reply: this.reply,
            helpfulCount: this.helpfulCount,
            unhelpfulCount: this.unhelpfulCount,
            helpfulUsers: this.helpfulUsers,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    // خروجی عمومی (برای ارسال به فرانت‌اند)
    toPublicJSON() {
        return {
            id: this.id,
            productId: this.productId,
            username: this.username,
            rating: this.rating,
            title: this.title,
            content: this.content,
            pros: this.pros,
            cons: this.cons,
            images: this.images,
            isVerifiedPurchase: this.isVerifiedPurchase,
            aiAnalysis: this.aiAnalysis,
            reply: this.reply,
            helpfulCount: this.helpfulCount,
            helpfulScore: this.getHelpfulScore(),
            createdAt: this.createdAt
        };
    }
    
    // ========== متدهای استاتیک ==========
    
    // اعتبارسنجی نظر
    static validate(commentData) {
        const errors = [];
        
        if (!commentData.productId) {
            errors.push('شناسه محصول الزامی است');
        }
        
        if (!commentData.userId) {
            errors.push('شناسه کاربر الزامی است');
        }
        
        if (!commentData.content || commentData.content.trim().length < 5) {
            errors.push('متن نظر باید حداقل ۵ کاراکتر باشد');
        }
        
        if (commentData.rating < 1 || commentData.rating > 5) {
            errors.push('امتیاز باید بین 1 تا 5 باشد');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // دریافت میانگین امتیازات یک محصول
    static getAverageRating(comments) {
        if (!comments || comments.length === 0) return 0;
        const sum = comments.reduce((acc, comment) => acc + comment.rating, 0);
        return sum / comments.length;
    }
    
    // دریافت توزیع امتیازات (چند نفر ۱ ستاره، چند نفر ۲ ستاره و ...)
    static getRatingDistribution(comments) {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        comments.forEach(comment => {
            if (distribution[comment.rating] !== undefined) {
                distribution[comment.rating]++;
            }
        });
        
        return distribution;
    }
    
    // فیلتر نظرات تأیید شده
    static filterApproved(comments) {
        return comments.filter(comment => comment.isApproved);
    }
    
    // مرتب‌سازی نظرات بر اساس مفیدترین
    static sortByMostHelpful(comments) {
        return [...comments].sort((a, b) => b.getHelpfulScore() - a.getHelpfulScore());
    }
    
    // مرتب‌سازی نظرات بر اساس جدیدترین
    static sortByNewest(comments) {
        return [...comments].sort((a, b) => b.createdAt - a.createdAt);
    }
    
    // مرتب‌سازی بر اساس بالاترین امتیاز
    static sortByHighestRating(comments) {
        return [...comments].sort((a, b) => b.rating - a.rating);
    }
    
    // خلاصه نظرات برای نمایش سریع
    static getSummary(comments) {
        const approvedComments = this.filterApproved(comments);
        const totalComments = approvedComments.length;
        const averageRating = this.getAverageRating(approvedComments);
        const distribution = this.getRatingDistribution(approvedComments);
        
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;
        
        approvedComments.forEach(comment => {
            const sentiment = comment.aiAnalysis?.sentiment;
            if (sentiment === 'positive') positiveCount++;
            else if (sentiment === 'negative') negativeCount++;
            else neutralCount++;
        });
        
        return {
            total: totalComments,
            averageRating: parseFloat(averageRating.toFixed(1)),
            ratingDistribution: distribution,
            positive: positiveCount,
            negative: negativeCount,
            neutral: neutralCount
        };
    }
    
    // ایجاد یک نظر نمونه (برای تست)
    static createSample() {
        return new Comment({
            id: 1,
            productId: 1,
            userId: 1,
            username: 'کاربر نمونه',
            rating: 5,
            title: 'عالی بود!',
            content: 'این محصول واقعاً عالی است. من راضی هستم.',
            pros: ['کیفیت بالا', 'قیمت مناسب'],
            cons: ['هیچکدام'],
            isApproved: true,
            isVerifiedPurchase: true
        });
    }
}

module.exports = Comment;