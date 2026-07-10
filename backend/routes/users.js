// ============================================
// routes/users.js
// مسیرهای API مربوط به کاربران
// ============================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// ========== مسیرهای عمومی ==========
router.post('/register', userController.register);
router.post('/login', userController.login);

// ========== مسیرهای محافظت شده ==========
router.get('/profile', auth.protect, userController.getProfile);
router.put('/profile', auth.protect, userController.updateProfile);
router.put('/change-password', auth.protect, userController.changePassword);

// ========== مدیریت آدرس‌ها ==========
router.get('/addresses', auth.protect, userController.getAddresses);
router.post('/addresses', auth.protect, userController.addAddress);
router.delete('/addresses/:addressId', auth.protect, userController.removeAddress);

// ========== مدیریت علاقه‌مندی‌ها ==========
router.get('/wishlist', auth.protect, userController.getWishlist);
router.post('/wishlist', auth.protect, userController.addToWishlist);
router.delete('/wishlist/:productId', auth.protect, userController.removeFromWishlist);

// ========== تاریخچه کاربر ==========
router.post('/search-history', auth.protect, userController.addSearchHistory);
router.get('/search-history', auth.protect, userController.getSearchHistory);

// ========== مسیرهای مدیریتی ==========
router.get('/admin/all', auth.protect, auth.adminOnly, userController.getAllUsers);
router.put('/admin/deactivate/:id', auth.protect, auth.adminOnly, userController.deactivateUser);
router.put('/admin/activate/:id', auth.protect, auth.adminOnly, userController.activateUser);

module.exports = router;