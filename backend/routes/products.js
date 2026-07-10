// ============================================
// routes/products.js
// مسیرهای API مربوط به محصولات
// ============================================

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

// ========== مسیرهای عمومی ==========
router.get('/', productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/new', productController.getNewProducts);
router.get('/best-sellers', productController.getBestSellers);
router.get('/discounted', productController.getDiscountedProducts);
router.get('/search', productController.searchProducts);
router.get('/recommendations', productController.getSmartRecommendations);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/complementary', productController.getComplementaryProducts);
router.get('/:id/related', productController.getRelatedProducts);
router.post('/track-view', productController.trackLiveView);
router.get('/stats', productController.getProductsStats);
router.get('/:id', productController.getProductById);
router.get('/:id/price-history', productController.getPriceHistory);
router.get('/:id/price-prediction', productController.getPricePrediction);

// ========== مسیرهای محافظت شده (ادمین) ==========
router.post('/', auth.protect, auth.adminOnly, productController.createProduct);
router.put('/:id', auth.protect, auth.adminOnly, productController.updateProduct);
router.delete('/:id', auth.protect, auth.adminOnly, productController.deleteProduct);
router.put('/:id/decrease-stock', auth.protect, productController.decreaseStock);

module.exports = router;