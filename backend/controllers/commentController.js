const { analyzeComment } = require('../services/deepseekService');

let commentsCollection = null;
let productsCollection = null;

const setCollections = (comments, products) => {
    commentsCollection = comments;
    productsCollection = products;
    console.log('commentController: نظرات و محصولات تنظیم شد');
};

const recalculateProductRating = async (productId) => {
    try {
        const comments = await commentsCollection.getAll();
        const productComments = comments.filter(c => c.productId === productId && c.isApproved === true);

        const count = productComments.length;
        let avgRating = 0;
        if (count > 0) {
            const sum = productComments.reduce((acc, c) => acc + c.rating, 0);
            avgRating = Math.round((sum / count) * 10) / 10;
        }

        await productsCollection.update({ id: productId }, { rating: avgRating, ratingCount: count });
    } catch (error) {
        console.error('خطا در به‌روزرسانی امتیاز:', error);
    }
};

const getProductComments = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        let comments = await commentsCollection.getAll();
        let productComments = comments.filter(c => c.productId === parseInt(productId) && c.isApproved === true);

        if (sort === 'newest') {
            productComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort === 'helpful') {
            productComments.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
        } else if (sort === 'highest_rating') {
            productComments.sort((a, b) => b.rating - a.rating);
        } else if (sort === 'lowest_rating') {
            productComments.sort((a, b) => a.rating - b.rating);
        }

        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedComments = productComments.slice(startIndex, startIndex + parseInt(limit));

        const total = productComments.length;
        const averageRating = total > 0 ? productComments.reduce((acc, c) => acc + c.rating, 0) / total : 0;

        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        productComments.forEach(c => {
            if (ratingDistribution[c.rating] !== undefined) ratingDistribution[c.rating]++;
        });

        res.json({
            success: true,
            data: paginatedComments,
            summary: {
                total,
                averageRating: parseFloat(averageRating.toFixed(1)),
                ratingDistribution
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(productComments.length / parseInt(limit)),
                totalItems: productComments.length
            }
        });
    } catch (error) {
        console.error('خطا در getProductComments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const addComment = async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        const { productId, rating, title, content, pros, cons } = req.body;

        if (!productId || !content) {
            return res.status(400).json({ success: false, error: 'شناسه محصول و متن نظر الزامی است' });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'امتیاز باید بین 1 تا 5 باشد' });
        }

        if (content.length < 5) {
            return res.status(400).json({ success: false, error: 'متن نظر باید حداقل ۵ کاراکتر باشد' });
        }

        if (content.length > 2000) {
            return res.status(400).json({ success: false, error: 'متن نظر نباید بیشتر از ۲۰۰۰ کاراکتر باشد' });
        }

        // ورودی‌های آرایه‌ای (pros/cons) باید فقط رشته باشند و محدود به تعداد و طول معقول
        const sanitizeList = (list) => {
            if (!Array.isArray(list)) return [];
            return list
                .filter(item => typeof item === 'string')
                .map(item => item.trim().slice(0, 100))
                .filter(item => item.length > 0)
                .slice(0, 10);
        };
        const safePros = sanitizeList(pros);
        const safeCons = sanitizeList(cons);
        const safeTitle = typeof title === 'string' ? title.trim().slice(0, 150) : '';

        const product = await productsCollection.getById(parseInt(productId));
        if (!product) {
            return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
        }

        const now = new Date().toISOString();

        // درج امن در برابر درخواست‌های همزمان
        const newComment = await commentsCollection.insertWithNextId({
            productId: parseInt(productId),
            userId: String(userId),
            username: username,
            rating: parseInt(rating),
            title: safeTitle,
            content: content.trim(),
            pros: safePros,
            cons: safeCons,
            images: [],
            isApproved: false,
            isVerifiedPurchase: false,
            helpfulCount: 0,
            unhelpfulCount: 0,
            helpfulUsers: [],
            reply: { content: '', repliedBy: null, repliedAt: null },

            createdAt: now,
            updatedAt: now
        });

        // Recalculate product rating (non-blocking)
        recalculateProductRating(parseInt(productId));

        // AI analysis in background (non-blocking)
        analyzeComment(newComment.content).then(analysis => {
            if (analysis) {
                commentsCollection.update({ id: newComment.id }, { aiAnalysis: analysis }).catch(() => {});
            }
        }).catch(() => {});

        res.status(201).json({
            success: true,
            message: 'نظر شما با موفقیت ثبت شد. پس از تأیید مدیر نمایش داده می‌شود',
            data: {
                id: newComment.id,
                productId: newComment.productId,
                username: newComment.username,
                rating: newComment.rating,
                content: newComment.content,
                createdAt: newComment.createdAt
            }
        });
    } catch (error) {
        console.error('خطا در addComment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const approveComment = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const { id } = req.params;
        const commentId = parseInt(id);

        await commentsCollection.update({ id: commentId }, { isApproved: true, updatedAt: new Date().toISOString() });

        const comments = await commentsCollection.getAll();
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
            await recalculateProductRating(comment.productId);
        }

        res.json({ success: true, message: 'نظر با موفقیت تأیید شد' });
    } catch (error) {
        console.error('خطا در approveComment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const commentId = parseInt(id);

        const comments = await commentsCollection.getAll();
        const comment = comments.find(c => c.id === commentId);

        if (!comment) {
            return res.status(404).json({ success: false, error: 'نظر یافت نشد' });
        }

        if (req.user.role !== 'admin' && comment.userId !== req.user.id) {
            return res.status(403).json({ success: false, error: 'شما مجاز به حذف این نظر نیستید' });
        }

        const productId = comment.productId;
        await commentsCollection.delete({ id: commentId });
        await recalculateProductRating(productId);

        res.json({ success: true, message: 'نظر با موفقیت حذف شد' });
    } catch (error) {
        console.error('خطا در deleteComment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const markAsHelpful = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const commentId = parseInt(id);

        const comments = await commentsCollection.getAll();
        const comment = comments.find(c => c.id === commentId);

        if (!comment) {
            return res.status(404).json({ success: false, error: 'نظر یافت نشد' });
        }

        let helpfulUsers = comment.helpfulUsers || [];

        if (helpfulUsers.includes(userId)) {
            return res.status(409).json({ success: false, error: 'شما قبلاً به این نظر رأی مفید داده‌اید' });
        }

        helpfulUsers.push(userId);

        await commentsCollection.update(
            { id: commentId },
            {
                helpfulCount: (comment.helpfulCount || 0) + 1,
                helpfulUsers: helpfulUsers,
                updatedAt: new Date().toISOString()
            }
        );

        res.json({ success: true, message: 'نظر به عنوان مفید ثبت شد' });
    } catch (error) {
        console.error('خطا در markAsHelpful:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const markAsUnhelpful = async (req, res) => {
    try {
        const { id } = req.params;
        const commentId = parseInt(id);

        const comments = await commentsCollection.getAll();
        const comment = comments.find(c => c.id === commentId);

        if (!comment) {
            return res.status(404).json({ success: false, error: 'نظر یافت نشد' });
        }

        await commentsCollection.update(
            { id: commentId },
            {
                unhelpfulCount: (comment.unhelpfulCount || 0) + 1,
                updatedAt: new Date().toISOString()
            }
        );

        res.json({ success: true, message: 'نظر به عنوان غیرمفید ثبت شد' });
    } catch (error) {
        console.error('خطا در markAsUnhelpful:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const replyToComment = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const { id } = req.params;
        const { reply } = req.body;
        const commentId = parseInt(id);

        if (!reply || reply.trim() === '') {
            return res.status(400).json({ success: false, error: 'متن پاسخ نمی‌تواند خالی باشد' });
        }

        await commentsCollection.update(
            { id: commentId },
            {
                reply: {
                    content: reply.trim(),
                    repliedBy: req.user.id,
                    repliedAt: new Date().toISOString()
                },
                updatedAt: new Date().toISOString()
            }
        );

        res.json({ success: true, message: 'پاسخ با موفقیت ثبت شد' });
    } catch (error) {
        console.error('خطا در replyToComment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteReply = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const { id } = req.params;
        const commentId = parseInt(id);

        await commentsCollection.update(
            { id: commentId },
            {
                reply: { content: '', repliedBy: null, repliedAt: null },
                updatedAt: new Date().toISOString()
            }
        );

        res.json({ success: true, message: 'پاسخ با موفقیت حذف شد' });
    } catch (error) {
        console.error('خطا در deleteReply:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAllComments = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const { status = 'all', page = 1, limit = 20 } = req.query;

        let comments = await commentsCollection.getAll();

        if (status === 'approved') {
            comments = comments.filter(c => c.isApproved === true);
        } else if (status === 'pending') {
            comments = comments.filter(c => c.isApproved === false);
        }

        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedComments = comments.slice(startIndex, startIndex + parseInt(limit));

        res.json({
            success: true,
            data: paginatedComments,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(comments.length / parseInt(limit)),
                totalItems: comments.length
            }
        });
    } catch (error) {
        console.error('خطا در getAllComments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getCommentsStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const comments = await commentsCollection.getAll();

        const total = comments.length;
        const approved = comments.filter(c => c.isApproved === true).length;
        const pending = comments.filter(c => c.isApproved === false).length;
        const withReply = comments.filter(c => c.reply && c.reply.content).length;

        const approvedComments = comments.filter(c => c.isApproved === true);
        const avgRating = approvedComments.length > 0
            ? approvedComments.reduce((acc, c) => acc + c.rating, 0) / approvedComments.length
            : 0;

        res.json({
            success: true,
            data: {
                total,
                approved,
                pending,
                withReply,
                averageRating: parseFloat(avgRating.toFixed(1))
            }
        });
    } catch (error) {
        console.error('خطا در getCommentsStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========== تحلیل جامع هوش مصنوعی برای یک محصول ==========
const getAIReviewAnalysis = async (req, res) => {
    try {
        const { productId } = req.params;
        const comments = await commentsCollection.getAll();
        const productComments = comments.filter(c => c.productId === parseInt(productId) && c.isApproved === true);
        if (productComments.length === 0) {
            return res.json({
                success: true,
                data: {
                    total: 0,
                    averageRating: 0,
                    sentiment: { positive: 0, negative: 0, neutral: 0, positivePercent: 0, negativePercent: 0, neutralPercent: 0 },
                    pros: [],
                    cons: [],
                    topics: [],
                    recommendationScore: 0,
                    recommendationLabel: 'بدون نظر',
                    overallAnalysis: 'هنوز نظری برای این محصول ثبت نشده است.',
                    timeline: [],
                    topKeywords: [],
                    verifiedPurchaseCount: 0
                }
            });
        }

        let positive = 0, negative = 0, neutral = 0;
        let ratingSum = 0;
        const allPros = [];
        const allCons = [];
        const topicKeywords = {
            باتری: ['باتری', 'شارژ', 'عمر باتری', 'شارژدهی', 'power'],
            دوربین: ['دوربین', 'عکاسی', 'فیلم', 'کیفیت عکس', 'camera'],
            طراحی: ['طراحی', 'ظاهر', 'جنس', 'رنگ', 'body', 'build'],
            عملکرد: ['سرعت', 'عملکرد', 'قدرت', 'پردازنده', 'رم', 'performance'],
            صفحه‌نمایش: ['صفحه', 'نمایشگر', 'رزولوشن', 'صفحه نمایش', 'display', 'screen'],
            قیمت: ['قیمت', 'ارزش', 'قیمتش', 'money', 'value'],
            نرم‌افزار: ['نرم‌افزار', 'سیستم عامل', 'آپدیت', 'software', 'update'],
            صدا: ['صدا', 'اسپیکر', 'بلندگو', 'هدفون', 'sound', 'audio'],
            کیفیت: ['کیفیت', 'ساخت', 'کیفیت ساخت', 'build quality'],
            گارانتی: ['گارانتی', 'خدمات', 'پشتیبانی', 'warranty', 'support']
        };
        const topicCounts = {};
        Object.keys(topicKeywords).forEach(t => { topicCounts[t] = { count: 0, sentiment: 0, commentIds: [] }; });
        const topicCommentIds = {};

        let verifiedCount = 0;
        const monthlySentiment = {};

        productComments.forEach(c => {
            ratingSum += c.rating || 0;
            if (c.isVerifiedPurchase) verifiedCount++;

            const content = (c.content || '') + ' ' + (c.title || '');
            let commentSentiment = 'neutral';
            if (c.aiAnalysis && c.aiAnalysis.sentiment) {
                commentSentiment = c.aiAnalysis.sentiment;
            }
            if (commentSentiment === 'positive') positive++;
            else if (commentSentiment === 'negative') negative++;
            else neutral++;

            // Collect pros/cons
            if (c.pros && Array.isArray(c.pros)) {
                c.pros.forEach(p => { if (p && p.trim()) allPros.push(p.trim()); });
            }
            if (c.aiAnalysis && c.aiAnalysis.positivePoints) {
                c.aiAnalysis.positivePoints.forEach(p => { if (p && p.trim()) allPros.push(p.trim()); });
            }
            if (c.cons && Array.isArray(c.cons)) {
                c.cons.forEach(p => { if (p && p.trim()) allCons.push(p.trim()); });
            }
            if (c.aiAnalysis && c.aiAnalysis.negativePoints) {
                c.aiAnalysis.negativePoints.forEach(p => { if (p && p.trim()) allCons.push(p.trim()); });
            }

            // Topic matching
            const lowerContent = (c.content + ' ' + (c.title || '') + ' ' + (c.pros || []).join(' ') + ' ' + (c.cons || []).join(' ')).toLowerCase();
            Object.keys(topicKeywords).forEach(topic => {
                const matched = topicKeywords[topic].some(kw => lowerContent.includes(kw));
                if (matched) {
                    topicCounts[topic].count++;
                    topicCounts[topic].sentiment += c.rating || 3;
                    if (!topicCommentIds[topic]) topicCommentIds[topic] = [];
                    topicCommentIds[topic].push(c.id);
                }
            });

            // Timeline by month
            if (c.createdAt) {
                const monthKey = c.createdAt.substring(0, 7);
                if (!monthlySentiment[monthKey]) {
                    monthlySentiment[monthKey] = { positive: 0, negative: 0, neutral: 0, count: 0, avgRating: 0 };
                }
                monthlySentiment[monthKey].count++;
                monthlySentiment[monthKey].avgRating += c.rating || 0;
                if (commentSentiment === 'positive') monthlySentiment[monthKey].positive++;
                else if (commentSentiment === 'negative') monthlySentiment[monthKey].negative++;
                else monthlySentiment[monthKey].neutral++;
            }
        });

        // Compute pros frequency
        const prosFreq = {};
        allPros.forEach(p => { prosFreq[p] = (prosFreq[p] || 0) + 1; });
        const sortedPros = Object.entries(prosFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([text, count]) => ({ text, count }));

        // Compute cons frequency
        const consFreq = {};
        allCons.forEach(p => { consFreq[p] = (consFreq[p] || 0) + 1; });
        const sortedCons = Object.entries(consFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([text, count]) => ({ text, count }));

        // Compute topic scores
        const totalComments = productComments.length;
        const topics = Object.entries(topicCounts)
            .map(([name, data]) => ({
                name,
                count: data.count,
                percentage: totalComments > 0 ? Math.round((data.count / totalComments) * 100) : 0,
                avgRating: data.count > 0 ? parseFloat((data.sentiment / data.count).toFixed(1)) : 0
            }))
            .filter(t => t.count > 0)
            .sort((a, b) => b.count - a.count);

        // Compute timeline
        const timeline = Object.entries(monthlySentiment)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, data]) => ({
                month,
                count: data.count,
                avgRating: data.count > 0 ? parseFloat((data.avgRating / data.count).toFixed(1)) : 0,
                positivePercent: data.count > 0 ? Math.round((data.positive / data.count) * 100) : 0,
                negativePercent: data.count > 0 ? Math.round((data.negative / data.count) * 100) : 0
            }));

        // Extract top keywords from comment content
        const wordFreq = {};
        const stopWords = ['این', 'که', 'با', 'از', 'برای', 'و', 'در', 'به', 'یک', 'را', 'شد', 'شده', 'است', 'تا', 'آن', 'های', 'خود', 'یا', 'اما', 'باید', 'می', 'شود', 'هست', 'خیلی', 'بسیار', 'هر', 'هم', 'نه', 'اگر', 'بعد', 'قبل', 'حال', 'شما', 'ما', 'چون', 'زیرا', 'لطفاً', 'باشه', 'کردم', 'کردن'];
        productComments.forEach(c => {
            const words = (c.content || '').split(/[\s,،.]+/);
            words.forEach(w => {
                w = w.trim();
                if (w.length > 2 && !stopWords.includes(w) && isNaN(w)) {
                    wordFreq[w] = (wordFreq[w] || 0) + 1;
                }
            });
        });
        const topKeywords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word, frequency]) => ({ word, frequency }));

        // Compute recommendation score (0-100)
        const avgRating = parseFloat((ratingSum / totalComments).toFixed(1));
        const positiveRatio = totalComments > 0 ? positive / totalComments : 0;
        const prosCount = sortedPros.length;
        const consCount = sortedCons.length;
        let recommendationScore = Math.round((avgRating / 5) * 50 + positiveRatio * 40 + Math.min(prosCount / Math.max(consCount, 1), 2) * 5);
        recommendationScore = Math.min(100, Math.max(0, recommendationScore));

        let recommendationLabel = 'مناسب';
        if (recommendationScore >= 80) recommendationLabel = '🔥 فوق‌العاده';
        else if (recommendationScore >= 65) recommendationLabel = '✅ عالی';
        else if (recommendationScore >= 50) recommendationLabel = '👍 خوب';
        else if (recommendationScore >= 35) recommendationLabel = '⚖️ قابل قبول';
        else recommendationLabel = '⚠️ ضعیف';

        // Generate overall analysis
        let overallAnalysis = `از مجموع ${totalComments} نظر ثبت شده برای این محصول، `;
        overallAnalysis += `${positive} نظر مثبت (${totalComments > 0 ? Math.round(positive/totalComments*100) : 0}%)، `;
        overallAnalysis += `${negative} نظر منفی (${totalComments > 0 ? Math.round(negative/totalComments*100) : 0}%) و `;
        overallAnalysis += `${neutral} نظر خنثی است. `;
        overallAnalysis += `میانگین امتیاز کاربران ${avgRating} از 5 می‌باشد. `;
        if (sortedPros.length > 0) {
            overallAnalysis += `نقاط قوت اصلی: ${sortedPros.slice(0, 3).map(p => p.text).join('، ')}. `;
        }
        if (sortedCons.length > 0) {
            overallAnalysis += `نقاط ضعف اصلی: ${sortedCons.slice(0, 3).map(p => p.text).join('، ')}. `;
        }
        if (topics.length > 0) {
            const topTopic = topics[0];
            overallAnalysis += `بیشترین بحث کاربران پیرامون "${topTopic.name}" با میانگین امتیاز ${topTopic.avgRating} از 5 بوده است.`;
        }

        res.json({
            success: true,
            data: {
                total: totalComments,
                averageRating: avgRating,
                sentiment: {
                    positive,
                    negative,
                    neutral,
                    positivePercent: totalComments > 0 ? Math.round((positive / totalComments) * 100) : 0,
                    negativePercent: totalComments > 0 ? Math.round((negative / totalComments) * 100) : 0,
                    neutralPercent: totalComments > 0 ? Math.round((neutral / totalComments) * 100) : 0
                },
                pros: sortedPros,
                cons: sortedCons,
                topics: topics,
                recommendationScore,
                recommendationLabel,
                overallAnalysis,
                timeline,
                topKeywords,
                verifiedPurchaseCount: verifiedCount
            }
        });
    } catch (error) {
        console.error('خطا در getAIReviewAnalysis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========== خلاصه تحلیل AI برای یک محصول ==========
const getAISentimentSummary = async (req, res) => {
    try {
        const { productId } = req.params;
        const comments = await commentsCollection.getAll();
        const productComments = comments.filter(c => c.productId === parseInt(productId) && c.isApproved === true);
        if (productComments.length === 0) {
            return res.json({ success: true, data: { total: 0, sentiment: 'neutral', positivePercent: 0, negativePercent: 0, neutralPercent: 0, commonPros: [], commonCons: [], averageRating: 0 } });
        }
        let positive = 0, negative = 0, neutral = 0;
        const allPros = [];
        const allCons = [];
        let ratingSum = 0;
        productComments.forEach(c => {
            ratingSum += c.rating || 0;
            if (c.aiAnalysis && c.aiAnalysis.sentiment) {
                if (c.aiAnalysis.sentiment === 'positive') positive++;
                else if (c.aiAnalysis.sentiment === 'negative') negative++;
                else neutral++;
                if (c.aiAnalysis.positivePoints) c.aiAnalysis.positivePoints.forEach(p => { if (p && !allPros.includes(p)) allPros.push(p); });
                if (c.aiAnalysis.negativePoints) c.aiAnalysis.negativePoints.forEach(p => { if (p && !allCons.includes(p)) allCons.push(p); });
            }
        });
        const analyzed = positive + negative + neutral;
        const total = productComments.length;
        res.json({
            success: true,
            data: {
                total,
                analyzed,
                sentiment: positive > negative && positive > neutral ? 'positive' : negative > positive && negative > neutral ? 'negative' : 'neutral',
                positivePercent: analyzed > 0 ? Math.round((positive / analyzed) * 100) : 0,
                negativePercent: analyzed > 0 ? Math.round((negative / analyzed) * 100) : 0,
                neutralPercent: analyzed > 0 ? Math.round((neutral / analyzed) * 100) : 0,
                commonPros: allPros.slice(0, 5),
                commonCons: allCons.slice(0, 5),
                averageRating: total > 0 ? parseFloat((ratingSum / total).toFixed(1)) : 0
            }
        });
    } catch (error) {
        console.error('خطا در getAISentimentSummary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========== Seed comments for all products ==========
let productCommentsData = null;

const getProductCommentsData = () => {
    if (productCommentsData) return productCommentsData;
    productCommentsData = {
        1: [
                { rating: 5, title: 'عالی برای استفاده روزمره', content: 'بعد از دو هفته استفاده از گلکسی A54 واقعاً راضی هستم. صفحه نمایش AMOLED فوق‌العاده روان و روشنایی عالی داره. باتری هم یک روز کامل رو به راحتی جواب میده.', pros: ['صفحه نمایش عالی', 'باتری قوی', 'رابط کاربری روان'], cons: ['شارژ نسبتاً کند'], sentiment: 'positive', positivePoints: ['صفحه نمایش', 'باتری', 'رابط کاربری'], negativePoints: ['شارژ کند'], summary: 'کاربر از خرید خود راضی است و محصول را برای استفاده روزمره مناسب می‌داند.' },
                { rating: 4, title: 'قیمت مناسبه', content: 'با این قیمت، واقعاً ارزش خرید داره. دوربین خوبی داره مخصوصاً در نور روز. فقط کاش از شارژ سریع‌تر پشتیبانی می‌کرد.', pros: ['قیمت مناسب', 'دوربین خوب', 'طراحی زیبا'], cons: ['سرعت شارژ پایین'], sentiment: 'positive', positivePoints: ['قیمت', 'دوربین'], negativePoints: ['شارژ'], summary: 'کاربرد از کیفیت کلی رضایت دارد اما به شارژ کند اشاره کرده است.' },
                { rating: 3, title: 'معمولی هست', content: 'محصول بدی نیست ولی انتظار بیشتری داشتم. دوربین در شب خوب نیست و گاهی لگ داره. برای استفاده معمولی اوکیه.', pros: ['صفحه نمایش خوب'], cons: ['دوربین در شب', 'لگ گاهی'], sentiment: 'neutral', positivePoints: ['صفحه نمایش'], negativePoints: ['دوربین', 'لگ'], summary: 'نظر کاربر خنثی است.' },
            ],
            2: [
                { rating: 5, title: 'دوربین ۲۰۰ مگاپیکسلی عالی', content: 'دوربین ۲۰۰ مگاپیکسلی واقعاً شگفت‌انگیزه. جزئیات باورنکردنی داره و عکس‌های پرتره فوق‌العاده‌ای می‌گیره. شارژ ۶۷ وات هم خیلی سریع تموم میشه.', pros: ['دوربین فوق‌العاده', 'شارژ سریع', 'صفحه نمایش AMOLED'], cons: [], sentiment: 'positive', positivePoints: ['دوربین', 'شارژ سریع', 'صفحه نمایش'], negativePoints: [], summary: 'کاربر از دوربین و شارژ سریع بسیار راضی است.' },
                { rating: 4, title: 'ارزش خرید بالایی داره', content: 'در این رده قیمتی، واقعاً بهترین گزینه‌ست. طراحی خوش‌دستی داره و MIUI هم پیشرفت کرده. کاش زودتر آپدیت اندروید ۱۴ می‌گرفت.', pros: ['ارزش خرید', 'طراحی خوش‌دست', 'شارژ فوق‌سریع'], cons: ['تأخیر در آپدیت'], sentiment: 'positive', positivePoints: ['ارزش خرید', 'طراحی', 'شارژ'], negativePoints: ['آپدیت'], summary: 'کاربر از ارزش خرید بالا راضی اما از تأخیر آپدیت ناراضی است.' },
            ],
            3: [
                { rating: 5, title: 'آیفون همیشه عالیه', content: 'این دومین آیفون منه و واقعاً از اکوسیستم اپل راضی هستم. تراشه A15 هنوز هم قدرتمنده و دوربین‌ها کیفیت فوق‌العاده‌ای دارن. iOS هم که همیشه روان بوده.', pros: ['تراشه قدرتمند', 'دوربین عالی', 'iOS روان'], cons: ['شارژر داخل جعبه نیست'], sentiment: 'positive', positivePoints: ['تراشه', 'دوربین', 'iOS'], negativePoints: ['شارژر'], summary: 'کاربر از آیفون خود بسیار راضی است.' },
                { rating: 4, content: 'گوشی خوبی هست ولی نسبت به نسل قبل پیشرفت خاصی نداشته. با این قیمت رقبای اندرویدی امکانات بیشتری می‌دن.', pros: ['کیفیت ساخت', 'دوربین', 'پایداری'], cons: ['عدم پیشرفت نسبت به ۱۲', 'قیمت بالا'], sentiment: 'neutral', positivePoints: ['کیفیت ساخت', 'دوربین', 'پایداری'], negativePoints: ['قیمت بالا'], summary: 'نظر کاربر خنثی است.' },
            ],
            4: [
                { rating: 5, title: 'تبلت بی‌نظیر', content: 'Galaxy Tab S9 بهترین تبلت اندرویدی بازار هست. صفحه نمایش AMOLED فوق‌العاده، قلم S-Pen که داخل جعبه هست و پردازنده Snapdragon 8 Gen 2 که عالی کار می‌کنه.', pros: ['صفحه نمایش AMOLED', 'قلم S-Pen', 'پردازنده قوی', 'باتری خوب'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['صفحه نمایش', 'قلم', 'باتری', 'پردازنده'], negativePoints: ['قیمت'], summary: 'کاربر از خرید تبلت بسیار راضی است.' },
            ],
            5: [
                { rating: 5, title: 'قدرتمند و اقتصادی', content: 'Poco X6 Pro با این قیمت واقعاً یه غول قدرتمنده. دایمنسیتی 8300 اولترا برای بازی عالیه و نمایشگر AMOLED 120Hz هم تجربه کاربری فوق‌العاده‌ای میده.', pros: ['پردازنده قدرتمند', 'نمایشگر 120Hz', 'قیمت مناسب'], cons: [], sentiment: 'positive', positivePoints: ['پردازنده', 'نمایشگر', 'قیمت'], negativePoints: [], summary: 'کاربر از قدرت و قیمت محصول راضی است.' },
            ],
            6: [
                { rating: 4, title: 'لپ‌تاپ سبک و خوش‌دست', content: 'برای کارهای اداری و دانشجویی واقعاً عالیه. وزن سبک و طراحی شیکی داره. صفحه نمایش IPS خوبی داره و صدای هارمن کارتون رو هم عالی شنیده میشه.', pros: ['وزن سبک', 'طراحی شیک', 'صفحه نمایش خوب', 'صدای هارمن'], cons: ['باتری متوسط'], sentiment: 'positive', positivePoints: ['وزن', 'طراحی', 'صدا', 'صفحه نمایش'], negativePoints: ['باتری'], summary: 'کاربر از لپ‌تاپ برای کار روزمره راضی است.' },
            ],
            7: [
                { rating: 5, title: 'گیمینگ عالی با قیمت مناسب', content: 'برای ورود به دنیای گیمینگ عالیه. RTX 3050 بازی‌های روز رو با کیفیت خوب اجرا می‌کنه و صفحه 120Hz تجربه بازی رو لذت‌بخش می‌کنه.', pros: ['کارت گرافیک', 'نمایشگر 120Hz', 'قیمت'], cons: ['طراحی ساده'], sentiment: 'positive', positivePoints: ['کارت گرافیک', 'نمایشگر', 'قیمت'], negativePoints: ['طراحی'], summary: 'کاربر از لپ‌تاپ گیمینگ راضی است.' },
            ],
            8: [
                { rating: 5, title: 'فوق‌العاده سبک و قدرتمند', content: 'مک‌بوک ایر M2 بهترین لپ‌تاپ برای کارهای روزمره و برنامه‌نویسی. تراشه M2 باورنکردنیه، فن نداره و بی‌صدا کار می‌کنه. باتری هم تا ۱۸ ساعت جواب میده.', pros: ['تراشه M2', 'فوق‌العاده سبک', 'باتری طولانی', 'بی‌صدا'], cons: ['فقط دو پورت USB-C'], sentiment: 'positive', positivePoints: ['M2', 'وزن', 'باتری', 'بی‌صدا'], negativePoints: ['پورت'], summary: 'کاربر از مک‌بوک ایر خود بسیار راضی است.' },
            ],
            9: [
                { rating: 4, content: 'مانیتور عالی برای گیمینگ حرفه‌ای. رزولوشن QHD با نرخ 165Hz ترکیب فوق‌العاده‌ای ایجاد کرده. فقط کاش HDR بهتری داشت.', pros: ['رزولوشن QHD', 'نرخ 165Hz', 'صفحه IPS'], cons: ['HDR متوسط'], sentiment: 'positive', positivePoints: ['رزولوشن', 'نرخ', 'IPS'], negativePoints: ['HDR'], summary: 'کاربر از مانیتور گیمینگ راضی است.' },
            ],
            10: [
                { rating: 4, content: 'هدفون با نویز کنسلینگ خوب و صدای متعادل. برای استفاده روزمره و مسافرت عالیه. باتری هم 35 ساعت دوام میاره.', pros: ['نویز کنسلینگ', 'باتری', 'صدای متعادل'], cons: ['کیفیت ساخت پلاستیکی'], sentiment: 'positive', positivePoints: ['نویز کنسلینگ', 'باتری', 'صدا'], negativePoints: ['کیفیت ساخت'], summary: 'کاربر از هدفون راضی است.' },
            ],
            11: [
                { rating: 5, content: 'ست کیبورد و موس بی‌سیم عالی برای محیط اداری. نویز کمی داره و تایپ باهاش لذت‌بخشه. موس هم دقیق کار می‌کنه.', pros: ['کیفیت تایپ', 'موس دقیق', 'بی‌صدا'], cons: [], sentiment: 'positive', positivePoints: ['کیفیت', 'موس', 'بی‌صدا'], negativePoints: [], summary: 'کاربر از ست کیبورد راضی است.' },
            ],
            12: [
                { rating: 4, content: 'پاوربانک عالی با ظرفیت واقعی 20000 میلی‌آمپر. دو گوشی رو کامل شارژ می‌کنه و خودش سریع شارژ میشه. فقط کمی سنگینه.', pros: ['ظرفیت بالا', 'شارژ سریع', 'کیفیت ساخت'], cons: ['وزن بالا'], sentiment: 'positive', positivePoints: ['ظرفیت', 'شارژ', 'کیفیت'], negativePoints: ['وزن'], summary: 'کاربر از پاوربانک راضی است.' },
            ],
            13: [
                { rating: 5, content: 'هارد عالی با سرعت مناسب. برای بکاپ اطلاعات عالیه و طراحی کوچیک و خوش‌دستی داره. نرم‌افزار WD هم خوب کار می‌کنه.', pros: ['سرعت', 'طراحی کوچک', 'برند معتبر'], cons: ['کابل کوتاه'], sentiment: 'positive', positivePoints: ['سرعت', 'طراحی', 'برند'], negativePoints: ['کابل'], summary: 'کاربر از هارد راضی است.' },
            ],
            14: [
                { rating: 4, content: 'وبکم خوب با کیفیت Full HD. برای جلسات آنلاین عالیه و میکروفونش هم قابل قبوله. فوکوس خودکار داره.', pros: ['کیفیت تصویر', 'فوکوس خودکار', 'میکروفون خوب'], cons: ['زاویه دید محدود'], sentiment: 'positive', positivePoints: ['کیفیت', 'فوکوس', 'میکروفون'], negativePoints: ['زاویه'], summary: 'کاربر از وبکم راضی است.' },
            ],
            15: [
                { rating: 4, content: 'دوربین DSLR عالی برای شروع عکاسی. کیفیت تصویر عالی داره و کار باهاش سادست. فقط فیلمبرداری 4K محدودیت داره.', pros: ['کیفیت تصویر', 'راحتی کار', 'قیمت'], cons: ['فیلمبرداری محدود'], sentiment: 'positive', positivePoints: ['کیفیت', 'راحتی', 'قیمت'], negativePoints: ['فیلمبرداری'], summary: 'کاربر از دوربین راضی است.' },
            ],
            16: [
                { rating: 5, title: 'دوربین حرفه‌ای بی‌نظیر', content: 'سونی A6400 برای عکاسی پرتره و خیابانی فوق‌العاده. فوکوس خودکارش باورنکردنیه و کیفیت تصویر در نور کم عالیه.', pros: ['فوکوس خودکار عالی', 'کیفیت تصویر', 'وزن سبک'], cons: ['بدنه پلی کربنات'], sentiment: 'positive', positivePoints: ['فوکوس', 'کیفیت', 'وزن'], negativePoints: ['بدنه'], summary: 'کاربر از دوربین حرفه‌ای راضی است.' },
            ],
            17: [
                { rating: 5, content: 'یه یخچال عالی با فضای داخلی هوشمندانه. مصرف انرژی A++ داره و خیلی کم‌صدا کار می‌کنه. یخ‌ساز خودکارش هم عالیه.', pros: ['فضای زیاد', 'کم‌صدا', 'Consumption A++'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['فضا', 'صدا', 'مصرف'], negativePoints: ['قیمت'], summary: 'کاربر از یخچال راضی است.' },
            ],
            18: [
                { rating: 4, content: 'ماشین لباسشویی خوب با ظرفیت ۹ کیلو. برنامه‌های شستشوی متنوع و موتور Inverter بی‌صدا کار می‌کنه. مصرف آب و برق مناسبی داره.', pros: ['ظرفیت', 'بی‌صدا', 'مصرف مناسب'], cons: ['برنامه طولانی'], sentiment: 'positive', positivePoints: ['ظرفیت', 'صدا', 'مصرف'], negativePoints: ['برنامه'], summary: 'کاربر از ماشین لباسشویی راضی است.' },
            ],
            19: [
                { rating: 5, title: 'هدفون بی‌سیم عالی', content: 'ایرپادز پرو ۲ بهترین هدفون بی‌سیم برای اکوسیستم اپل. نویز کنسلینگش شگفت‌انگیزه و صدای فضایی (Spatial Audio) تجربه شنیداری فوق‌العاده‌ای میده.', pros: ['نویز کنسلینگ عالی', 'Spatial Audio', 'کیفیت ساخت'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['نویز کنسلینگ', 'Spatial Audio', 'کیفیت'], negativePoints: ['قیمت'], summary: 'کاربر از ایرپادز پرو راضی است.' },
            ],
            20: [
                { rating: 5, content: 'اسپیکر قابل حمل عالی با صدای قدرتمند. باس خوبی داره و برای مهمونی عالیه. ضد آب IP67 هم هست.', pros: ['صدای قوی', 'باس خوب', 'ضد آب'], cons: ['اندازه نسبتاً بزرگ'], sentiment: 'positive', positivePoints: ['صدا', 'باس', 'ضد آب'], negativePoints: ['اندازه'], summary: 'کاربر از اسپیکر راضی است.' },
            ],
            21: [
                { rating: 4, content: 'دستبند عالی برای پیگیری سلامتی. صفحه AMOLED شفافه و سنسورها دقیق کار می‌کنن. باتری تا دو هفته دوام میاره.', pros: ['صفحه AMOLED', 'باتری طولانی', 'قیمت مناسب'], cons: ['دقت GPS'], sentiment: 'positive', positivePoints: ['صفحه', 'باتری', 'قیمت'], negativePoints: ['GPS'], summary: 'کاربر از دستبند راضی است.' },
            ],
            22: [
                { rating: 4, content: 'گوشی ساده و مقاوم با باتری فوق‌العاده که تا یک هفته دوام میاره. برای افراد مسن یا استفاده دوم خیلی مناسبه.', pros: ['باتری طولانی', 'مقاوم', 'سادگی'], cons: ['صفحه نمایش کوچک'], sentiment: 'positive', positivePoints: ['باتری', 'مقاوم', 'سادگی'], negativePoints: ['صفحه'], summary: 'کاربر از گوشی ساده راضی است.' },
            ],
            23: [
                { rating: 5, title: 'تلویزیون عالی', content: 'تلویزیون سامسونگ 55 اینچی با کیفیت تصویر 4K فوق‌العاده. سیستم عامل Tizen روان کار می‌کنه و رنگ‌ها زنده و طبیعی هستن.', pros: ['کیفیت تصویر', 'رنگ‌های زنده', 'Tizen روان'], cons: [], sentiment: 'positive', positivePoints: ['تصویر', 'رنگ', 'Tizen'], negativePoints: [], summary: 'کاربر از تلویزیون راضی است.' },
            ],
            24: [
                { rating: 5, content: 'کنترلر عالی با ارگونومی فوق‌العاده. برای بازی‌های مختلف عالیه و باتری لیتیومی با دوام خوبی داره.', pros: ['ارگونومی', 'کیفیت ساخت', 'باتری'], cons: [], sentiment: 'positive', positivePoints: ['ارگونومی', 'کیفیت', 'باتری'], negativePoints: [], summary: 'کاربر از کنترلر راضی است.' },
            ],
            25: [
                { rating: 4, content: 'ساندویچ‌ساز خوب با کیفیت ساخت مناسب. نان‌ها رو طلایی و خوشمزه می‌کنه ولی کاش صفحات نچسب بهتری داشت.', pros: ['کیفیت ساخت', 'سرعت', 'طراحی'], cons: ['صفحات نچسب'], sentiment: 'positive', positivePoints: ['کیفیت', 'سرعت', 'طراحی'], negativePoints: ['صفحات'], summary: 'کاربر از ساندویچ‌ساز راضی است.' },
            ],
            26: [
                { rating: 5, title: 'پرچمدار واقعی سامسونگ', content: 'گلکسی S24 Ultra بهترین گوشی اندرویدی سال. قلم S-Pen انقلابی در استفاده روزمره ایجاد کرده و هوش مصنوعی Galaxy AI کارهاش واقعاً جذابه. دوربین ۲۰۰ مگاپیکسلی با زوم ۱۰۰ برابر شگفت‌انگیزه.', pros: ['دوربین فوق‌حرفه‌ای', 'Galaxy AI', 'قلم S-Pen', 'طراحی تیتانیومی'], cons: ['قیمت بسیار بالا', 'شارژ نسبتاً کند'], sentiment: 'positive', positivePoints: ['دوربین', 'Galaxy AI', 'S-Pen', 'طراحی'], negativePoints: ['قیمت', 'شارژ'], summary: 'کاربر از پرچمدار سامسونگ بسیار راضی است.' },
                { rating: 4, title: 'بزرگ و قدرتمند', content: 'گوشی بزرگی هست و ممکنه برای همه مناسب نباشه. اما از نظر قدرت، دوربین و امکانات حرف اول رو میزنه. قلم S-Pen یه مزیت بزرگ نسبت به رقباست.', pros: ['قلم S-Pen', 'دوربین', 'صفحه نمایش عالی'], cons: ['سنگین و بزرگ', 'قیمت'], sentiment: 'positive', positivePoints: ['S-Pen', 'دوربین', 'صفحه'], negativePoints: ['وزن', 'قیمت'], summary: 'کاربر از قدرت محصول راضی اما از اندازه آن کمی ناراضی است.' },
                { rating: 3, content: 'گوشی خوبیه اما انتظار بیشتری داشتم. باتری نسبت به نسل قبل بهبود چندانی نداشته و قیمتش هم خیلی بالاست.', pros: ['دوربین', 'صفحه نمایش'], cons: ['باتری', 'قیمت'], sentiment: 'neutral', positivePoints: ['دوربین', 'صفحه'], negativePoints: ['باتری', 'قیمت'], summary: 'نظر کاربر خنثی است.' },
            ],
            27: [
                { rating: 5, title: 'بهترین آیفون تاریخ', content: 'آیفون ۱۵ پرو مکس با بدنه تیتانیومی فوق‌العاده شده. تراشه A17 Pro قدرتمندترین پردازنده موبایل بازار و دوربین ۴۸ مگاپیکسلی عکس‌های حرفه‌ای می‌گیره. دکمه Action Button هم یه افزودنی جذابه.', pros: ['بدنه تیتانیومی', 'تراشه A17 Pro', 'دوربین حرفه‌ای', 'باتری خوب'], cons: ['قیمت گزاف'], sentiment: 'positive', positivePoints: ['تیتانیوم', 'A17 Pro', 'دوربین', 'باتری'], negativePoints: ['قیمت'], summary: 'کاربر از آیفون ۱۵ پرو مکس بسیار راضی است.' },
                { rating: 5, title: 'فوق‌العاده با ارزش', content: 'قیمتش بالاس اما ارزش هر ریال رو داره. اکوسیستم اپل، دوربین، نمایشگر و عملکرد همه در بالاترین سطح هستن.', pros: ['اکوسیستم اپل', 'دوربین', 'نمایشگر'], cons: ['قیمت'], sentiment: 'positive', positivePoints: ['اکوسیستم', 'دوربین', 'نمایشگر'], negativePoints: ['قیمت'], summary: 'کاربر از خرید راضی است.' },
            ],
            28: [
                { rating: 5, title: 'طراحی Glyph فوق‌العاده', content: 'Nothing Phone 2 طراحی منحصربه‌فردی داره که توجه هر کسی رو جلب می‌کنه. Glyph Interface برای نوتیفیکیشن‌ها و تماس‌ها خیلی کاربردی و باحاله. تجربه خالص اندروید هم روان و سریع کار می‌کنه.', pros: ['طراحی Glyph', 'اندروید خالص', 'طراحی منحصربه‌فرد'], cons: [], sentiment: 'positive', positivePoints: ['Glyph', 'اندروید خالص', 'طراحی'], negativePoints: [], summary: 'کاربر از طراحی منحصربه‌فرد راضی است.' },
            ],
            29: [
                { rating: 5, title: 'بهترین هدفون نویز کنسلینگ', content: 'سونی WH-1000XM5 بهترین هدفون نویز کنسلینگ بازار. نویز کنسلینگ تطبیقی عالیه و صدای Hi-Res تجربه شنیداری فوق‌العاده‌ای میده. باتری ۴۰ ساعته هم عالیه.', pros: ['نویز کنسلینگ بی‌نظیر', 'صدای Hi-Res', 'باتری ۴۰ ساعت'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['نویز کنسلینگ', 'صدا', 'باتری'], negativePoints: ['قیمت'], summary: 'کاربر از هدفون سونی بسیار راضی است.' },
            ],
            30: [
                { rating: 4, title: 'طراحی لوکس اپل', content: 'ایرپادز مکس طراحی فوق‌العاده‌ای داره و صداش عالیه. نویز کنسلینگ خوبی داره ولی نسبت به رقبا سنگین‌تر و گرون‌تر هست.', pros: ['طراحی لوکس', 'کیفیت صدا', 'اکوسیستم اپل'], cons: ['سنگین', 'قیمت'], sentiment: 'positive', positivePoints: ['طراحی', 'صدا', 'اکوسیستم'], negativePoints: ['وزن', 'قیمت'], summary: 'کاربر از هدفون راضی اما از وزن آن کمی ناراضی است.' },
            ],
            31: [
                { rating: 5, title: 'غول گیمینگ در ابعاد ۱۴ اینچ', content: 'ROG Zephyrus G14 قدرت یک لپ‌تاپ گیمینگ ۱۷ اینچی رو در یه بدنه ۱۴ اینچی داره. Ryzen 9 و RTX 4070 هر بازی رو با حداکثر تنظیمات اجرا می‌کنن.', pros: ['قدرت فوق‌العاده', 'ابعاد جمع‌وجور', 'صفحه QHD 165Hz'], cons: ['فن‌ها در حالت گیمینگ پرصدا'], sentiment: 'positive', positivePoints: ['قدرت', 'ابعاد', 'صفحه'], negativePoints: ['صدا'], summary: 'کاربر از لپ‌تاپ گیمینگ بسیار راضی است.' },
            ],
            32: [
                { rating: 5, title: 'مک بوک پرو واقعی', content: 'مک‌بوک پرو ۱۴ اینچ با تراشه M3 Pro قدرت و کارایی فوق‌العاده‌ای داره. نمایشگر Liquid Retina XDR برای کارهای گرافیکی عالیه و باتری تا ۱۸ ساعت دوام میاره.', pros: ['تراشه M3 Pro', 'نمایشگر XDR', 'باتری طولانی'], cons: ['قیمت بسیار بالا'], sentiment: 'positive', positivePoints: ['M3 Pro', 'نمایشگر', 'باتری'], negativePoints: ['قیمت'], summary: 'کاربر از مک‌بوک پرو راضی است.' },
            ],
            33: [
                { rating: 4, content: 'لپ‌تاپ خوش‌ساخت با نمایشگر OLED 4K فوق‌العاده. برای کارهای حرفه‌ای طراحی و برنامه‌نویسی عالیه. فقط کاش پورت بیشتری داشت.', pros: ['نمایشگر OLED', 'طراحی باریک', 'عملکرد خوب'], cons: ['پورت محدود'], sentiment: 'positive', positivePoints: ['OLED', 'طراحی', 'عملکرد'], negativePoints: ['پورت'], summary: 'کاربر از لپ‌تاپ راضی است.' },
            ],
            34: [
                { rating: 5, content: 'بهترین ساعت هوشمند اندرویدی. صفحه چرخان فیزیکی (Bezel) فوق‌العاده کاربردی و نمایشگر Super AMOLED با کیفیت عالی. حسگرهای سلامتی دقیق کار می‌کنن.', pros: ['صفحه چرخان', 'نمایشگر AMOLED', 'حسگرها دقیق'], cons: ['باتری یک روزه'], sentiment: 'positive', positivePoints: ['Bezel', 'AMOLED', 'حسگرها'], negativePoints: ['باتری'], summary: 'کاربر از ساعت هوشمند راضی است.' },
            ],
            35: [
                { rating: 5, title: 'کنسول نسل جدید واقعی', content: 'PS5 Slim با SSD فوق‌سریع خودش تجربه بازی رو متحول کرده. کنترلر DualSense با بازخورد لمسی و Adaptive Triggers هر بازی رو زنده می‌کنه.', pros: ['SSD فوق‌سریع', 'DualSense', 'گرافیک عالی'], cons: ['حافظه داخلی محدود'], sentiment: 'positive', positivePoints: ['SSD', 'DualSense', 'گرافیک'], negativePoints: ['حافظه'], summary: 'کاربر از PS5 بسیار راضی است.' },
            ],
            36: [
                { rating: 5, content: 'کنسول فوق‌العاده برای بازی‌های انحصاری نینتندو. نمایشگر OLED کیفیت تصویر رو نسبت به مدل قبلی خیلی بهتر کرده و طراحی هیبریدی عالیه.', pros: ['نمایشگر OLED', 'بازی‌های انحصاری', 'طراحی هیبریدی'], cons: [], sentiment: 'positive', positivePoints: ['OLED', 'بازی', 'طراحی'], negativePoints: [], summary: 'کاربر از سوییچ راضی است.' },
            ],
            37: [
                { rating: 5, content: 'جاروبرقی دایسون V15 بی‌نظیره. سنسور لیزری گردوغبار رو نشون میده و مکش فوق‌العاده قوی داره. نمایشگر LCD اطلاعات مفیدی رو نشون میده.', pros: ['مکش قوی', 'سنسور لیزری', 'نمایشگر LCD'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['مکش', 'سنسور', 'LCD'], negativePoints: ['قیمت'], summary: 'کاربر از جاروبرقی راضی است.' },
            ],
            38: [
                { rating: 5, content: 'هدفون بی‌سیم عالی با صدای 24bit Hi-Fi. نویز کنسلینگ هوشمند خیلی خوب کار می‌کنه و طراحی کوچیک و خوش‌دستی داره.', pros: ['صدای Hi-Fi', 'نویز کنسلینگ', 'طراحی کوچک'], cons: [], sentiment: 'positive', positivePoints: ['صدا', 'نویز کنسلینگ', 'طراحی'], negativePoints: [], summary: 'کاربر از گلکسی بادز راضی است.' },
            ],
            39: [
                { rating: 5, title: 'تبلت حرفه‌ای برای کار و خلاقیت', content: 'iPad Air M2 با تراشه قدرتمند M2 و Apple Pencil برای طراحی و یادداشت‌برداری عالیه. صفحه نمایش Liquid Retina هم کیفیت فوق‌العاده‌ای داره.', pros: ['تراشه M2', 'Apple Pencil', 'iPadOS'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['M2', 'Apple Pencil', 'iPadOS'], negativePoints: ['قیمت'], summary: 'کاربر از آیپد ایر راضی است.' },
            ],
            40: [
                { rating: 5, content: 'گوپرو ۱۲ بلک بهترین دوربین اکشن. تثبیت‌کننده HyperSmooth 6.0 عالیه و فیلمبرداری 5.3K کیفیت فوق‌العاده‌ای داره.', pros: ['تثبیت‌کننده عالی', 'کیفیت 5.3K', 'مقاومت بالا'], cons: [], sentiment: 'positive', positivePoints: ['HyperSmooth', '5.3K', 'مقاومت'], negativePoints: [], summary: 'کاربر از دوربین اکشن راضی است.' },
            ],
            41: [
                { rating: 5, content: 'تلویزیون OLED ال‌جی C3 با کیفیت تصویر فوق‌العاده. رنگ‌ها زنده و مشکی‌ها واقعی. پردازنده α9 Gen6 هوش مصنوعی تصویر رو بهینه می‌کنه.', pros: ['کیفیت OLED', 'پردازنده AI', 'رنگ‌های زنده'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['OLED', 'AI', 'رنگ'], negativePoints: ['قیمت'], summary: 'کاربر از تلویزیون OLED راضی است.' },
            ],
            42: [
                { rating: 5, content: 'موس گیمینگ فوق‌العاده سبک با وزن ۶۰ گرم. سنسور Hero 2 دقیق و سریع کار می‌کنه و باتری هم تا ۹۵ ساعت دوام میاره.', pros: ['وزن ۶۰ گرم', 'سنسور Hero 2', 'باتری طولانی'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['وزن', 'سنسور', 'باتری'], negativePoints: ['قیمت'], summary: 'کاربر از موس گیمینگ بسیار راضی است.' },
            ],
            43: [
                { rating: 5, content: 'مانیتور گیمینگ Odyssey G7 با صفحه Mini LED و ۴K. نرخ ۱۴۴Hz با G-Sync تجربه بازی روان و بدون پارگی تصویر رو فراهم می‌کنه.', pros: ['Mini LED', '4K 144Hz', 'G-Sync'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['Mini LED', '4K', 'G-Sync'], negativePoints: ['قیمت'], summary: 'کاربر از مانیتور گیمینگ راضی است.' },
            ],
            44: [
                { rating: 5, content: 'هدفون بی‌سیم WF-1000XM5 سونی با نویز کنسلینگ فوق‌العاده. طراحی کوچیک‌تر از نسل قبل و صدای Hi-Res با جزئیات بالا.', pros: ['نویز کنسلینگ عالی', 'صدای Hi-Res', 'طراحی کوچک'], cons: ['قیمت بالا'], sentiment: 'positive', positivePoints: ['نویز کنسلینگ', 'صدا', 'طراحی'], negativePoints: ['قیمت'], summary: 'کاربر از هدفون سونی راضی است.' },
            ],
            45: [
                { rating: 5, content: 'کیبورد مکانیکی Keychron Q1 Pro با بدنه آلومینیومی و طراحی 75%. سوئیچ‌های Gateron Jupiter عالی تایپ می‌شن و اتصال بی‌سیم پایدار هست.', pros: ['بدنه آلومینیومی', 'سوئیچ عالی', 'اتصال بی‌سیم'], cons: [], sentiment: 'positive', positivePoints: ['آلومینیوم', 'سوئیچ', 'بی‌سیم'], negativePoints: [], summary: 'کاربر از کیبورد Keychron راضی است.' },
            ],
        };
    return productCommentsData;
};

const seedComments = async (req, res) => {
    try {
        const existing = await commentsCollection.getAll();
        const force = req.query.force === 'true';
        
        if (force) {
            for (const c of existing) {
                try { await commentsCollection.delete({ id: c.id }); } catch(e) {}
            }
        }
        
        if (!force && existing.length > 10) {
            return res.json({ success: true, message: 'نظرات قبلاً ثبت شده است', count: existing.length });
        }
        
        let existingProductIds = new Set();
        if (!force) existing.forEach(c => existingProductIds.add(c.productId));
        
        const users = ['علی محمدی', 'سارا احمدی', 'محمد رضایی', 'زهرا حسینی', 'رضا کریمی', 'مریم موسوی', 'حسن جعفری', 'فاطمه نوری', 'امیر رضوی', 'نیلوفر صادقی', 'پوریا کاظمی', 'آتنا مرادی', 'کامران شریفی', 'یلدا تقوی', 'بهنام فرهادی'];
        
        let insertedCount = 0;
        const productData = getProductCommentsData();
        for (const [productId, comments] of Object.entries(productData)) {
            const pid = parseInt(productId);
            if (existingProductIds.has(pid)) {
                continue;
            }
            
            for (const c of comments) {
                const daysAgo = Math.floor(Math.random() * 90);
                const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

                const comment = {
                    productId: pid,
                    userId: 'seed_user',
                    username: users[Math.floor(Math.random() * users.length)],
                    rating: c.rating,
                    title: c.title || '',
                    content: c.content,
                    pros: c.pros || [],
                    cons: c.cons || [],
                    images: [],
                    isApproved: true,
                    isVerifiedPurchase: Math.random() > 0.3,
                    helpfulCount: Math.floor(Math.random() * 15),
                    unhelpfulCount: Math.floor(Math.random() * 3),
                    helpfulUsers: [],
                    reply: { content: '', repliedBy: null, repliedAt: null },
                    aiAnalysis: {
                        sentiment: c.sentiment || 'neutral',
                        positivePoints: c.positivePoints || [],
                        negativePoints: c.negativePoints || [],
                        summary: c.summary || '',
                        analyzedBy: 'keyword'
                    },
                    createdAt: date.toISOString(),
                    updatedAt: date.toISOString()
                };
                
                try {
                    await commentsCollection.insertWithNextId(comment);
                    insertedCount++;
                } catch (e) {
                    console.error('خطا در ثبت نظر:', e.message);
                }
            }
            
            // Recalculate rating for each product
            try {
                const productCommentsAll = await commentsCollection.getAll();
                const filtereds = productCommentsAll.filter(c => c.productId === pid && c.isApproved === true);
                const count = filtereds.length;
                let avgRating = 0;
                if (count > 0) {
                    const sum = filtereds.reduce((acc, c) => acc + c.rating, 0);
                    avgRating = Math.round((sum / count) * 10) / 10;
                }
                await productsCollection.update({ id: pid }, { rating: avgRating, ratingCount: count });
            } catch(e) {
                console.error('خطا در به‌روزرسانی امتیاز:', e.message);
            }
        }

        res.json({ success: true, message: 'نظرات با موفقیت ثبت شد', count: insertedCount });
    } catch (error) {
        console.error('خطا در seedComments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    setCollections,
    getProductComments,
    addComment,
    approveComment,
    deleteComment,
    markAsHelpful,
    markAsUnhelpful,
    replyToComment,
    deleteReply,
    getAllComments,
    getCommentsStats,
    getAISentimentSummary,
    getAIReviewAnalysis,
    seedComments
};
