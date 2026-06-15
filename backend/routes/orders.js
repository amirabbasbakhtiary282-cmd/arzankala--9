const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

router.post('/', auth.protect, orderController.createOrder);
router.get('/', auth.protect, orderController.getUserOrders);
router.get('/admin/all', auth.protect, auth.adminOnly, orderController.getAllOrders);
router.put('/:id/status', auth.protect, auth.adminOnly, orderController.updateOrderStatus);

module.exports = router;
