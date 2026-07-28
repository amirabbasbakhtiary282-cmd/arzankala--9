let ordersCollection = null;

const setCollection = (collection) => {
    ordersCollection = collection;
    console.log('orderController: سفارشات تنظیم شد');
};

const createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, totalAmount, address, phone } = req.body;

        if (!items || !totalAmount || !address || !phone) {
            return res.status(400).json({ success: false, error: 'همه فیلدها الزامی است' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'سبد خرید خالی است' });
        }

        const now = new Date().toISOString();

        // درج امن در برابر درخواست‌های همزمان
        const order = await ordersCollection.insertWithNextId({
            userId,
            items,
            totalAmount,
            status: 'confirmed',
            address,
            phone,
            createdAt: now,
            updatedAt: now
        });

        res.status(201).json({ success: true, data: order });
    } catch (error) {
        console.error('خطا در createOrder:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await ordersCollection.getAll();
        const userOrders = orders.filter(o => o.userId === userId);

        res.json({ success: true, data: userOrders });
    } catch (error) {
        console.error('خطا در getUserOrders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await ordersCollection.getAll();
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('خطا در getAllOrders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const orders = await ordersCollection.getAll();
        const order = orders.find(o => o.id === parseInt(id));

        if (!order) {
            return res.status(404).json({ success: false, error: 'سفارش یافت نشد' });
        }

        await ordersCollection.update({ id: parseInt(id) }, { status });

        res.json({ success: true, message: 'وضعیت سفارش به‌روز شد' });
    } catch (error) {
        console.error('خطا در updateOrderStatus:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    setCollection,
    createOrder,
    getUserOrders,
    getAllOrders,
    updateOrderStatus
};
