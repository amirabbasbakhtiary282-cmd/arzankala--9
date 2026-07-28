// ============================================
// routes/comments.js
// مسیرهای API مربوط به نظرات
// ============================================

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

// ========== مسیر سیــد ==========
router.post('/seed', commentController.seedComments);

// ========== مسیرهای عمومی ==========
router.get('/product/:productId/ai-analysis', commentController.getAIReviewAnalysis);
router.get('/product/:productId/ai-summary', commentController.getAISentimentSummary);
router.get('/product/:productId', commentController.getProductComments);

// ========== مسیرهای محافظت شده ==========
router.post('/', auth.protect, commentController.addComment);
router.post('/with-ai', auth.protect, commentController.addComment);
router.put('/:id/helpful', auth.protect, commentController.markAsHelpful);
router.put('/:id/unhelpful', auth.protect, commentController.markAsUnhelpful);
router.delete('/:id', auth.protect, commentController.deleteComment);

// ========== مسیرهای مدیریتی ==========
router.put('/:id/approve', auth.protect, auth.adminOnly, commentController.approveComment);
// هر دو متد پشتیبانی می‌شوند تا پنل مدیریت (که PUT می‌فرستد) هم کار کند
router.post('/:id/reply', auth.protect, auth.adminOnly, commentController.replyToComment);
router.put('/:id/reply', auth.protect, auth.adminOnly, commentController.replyToComment);
router.delete('/:id/reply', auth.protect, auth.adminOnly, commentController.deleteReply);
router.get('/admin/all', auth.protect, auth.adminOnly, commentController.getAllComments);
router.get('/admin/stats', auth.protect, auth.adminOnly, commentController.getCommentsStats);

module.exports = router;