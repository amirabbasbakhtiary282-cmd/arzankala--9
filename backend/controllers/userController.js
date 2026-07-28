const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let usersCollection = null;
const JWT_SECRET = process.env.JWT_SECRET || 'arzankala_super_secret_key_2024';
const JWT_EXPIRES_IN = '7d';

const setCollection = (collection) => {
    usersCollection = collection;
    console.log('userController: کاربران تنظیم شد');
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (userId, username, role) => {
    return jwt.sign({ id: userId, username, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const register = async (req, res) => {
    try {
        const { username, password, fullname, email, mobile, birthYear } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'نام کاربری و رمز عبور الزامی است' });
        }

        // بررسی تکراری نبودن نام کاربری (ستون username در MySQL هم UNIQUE است)
        const existingUser = await usersCollection.getByUsername(username);
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'این نام کاربری قبلاً ثبت شده است' });
        }

        const hashedPassword = await hashPassword(password);

        const userData = {
            username,
            password: hashedPassword,
            fullname: fullname || '',
            email: email || '',
            mobile: mobile || '',
            birthYear: birthYear || null,
            role: 'user',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            addresses: [],
            wishlist: [],
            searchHistory: [],
            settings: {},
            totalOrders: 0,
            totalSpent: 0
        };

        let newUser;
        try {
            // درج امن در برابر درخواست‌های همزمان
            newUser = await usersCollection.insertWithNextId(userData);
        } catch (e) {
            // اگر همزمان کاربر دیگری همین نام را ثبت کرده باشد
            if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
                return res.status(409).json({ success: false, error: 'این نام کاربری قبلاً ثبت شده است' });
            }
            throw e;
        }

        const token = generateToken(newUser.id, newUser.username, newUser.role);
        const { password: _, ...userResponse } = newUser;

        res.status(201).json({ success: true, token, user: userResponse });
    } catch (error) {
        console.error('خطا در register:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'نام کاربری و رمز عبور الزامی است' });
        }

        const users = await usersCollection.getAll();
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ success: false, error: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        if (user.isActive === false) {
            return res.status(403).json({ success: false, error: 'حساب کاربری شما غیرفعال شده است' });
        }

        await usersCollection.update({ id: user.id }, { lastLogin: new Date().toISOString() });

        const token = generateToken(user.id, user.username, user.role);
        const { password: _, ...userResponse } = user;

        res.json({ success: true, token, user: userResponse });
    } catch (error) {
        console.error('خطا در login:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await usersCollection.getById(userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        const { password, ...userResponse } = user;
        res.json({ success: true, data: userResponse });
    } catch (error) {
        console.error('خطا در getProfile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullname, email, mobile, birthYear, settings } = req.body;

        const user = await usersCollection.getById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        const updates = {};
        if (fullname !== undefined) updates.fullname = fullname;
        if (email !== undefined) updates.email = email;
        if (mobile !== undefined) updates.mobile = mobile;
        if (birthYear !== undefined) updates.birthYear = birthYear;
        if (settings !== undefined) updates.settings = settings;
        updates.updatedAt = new Date().toISOString();

        await usersCollection.update({ id: userId }, updates);

        const updatedUser = await usersCollection.getById(userId);
        const { password, ...userResponse } = updatedUser;

        res.json({ success: true, data: userResponse });
    } catch (error) {
        console.error('خطا در updateProfile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'رمز عبور فعلی و جدید الزامی است' });
        }

        const user = await usersCollection.getById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        const isPasswordValid = await comparePassword(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: 'رمز عبور فعلی اشتباه است' });
        }

        const hashedNewPassword = await hashPassword(newPassword);
        await usersCollection.update({ id: userId }, { password: hashedNewPassword });

        res.json({ success: true, message: 'رمز عبور با موفقیت تغییر کرد' });
    } catch (error) {
        console.error('خطا در changePassword:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await usersCollection.getById(userId);

        res.json({ success: true, data: user?.addresses || [] });
    } catch (error) {
        console.error('خطا در getAddresses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const addAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullAddress, city, postalCode, phone, isDefault } = req.body;

        if (!fullAddress) {
            return res.status(400).json({ success: false, error: 'آدرس کامل الزامی است' });
        }

        const user = await usersCollection.getById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        const newAddress = {
            id: Date.now(),
            fullAddress,
            city: city || '',
            postalCode: postalCode || '',
            phone: phone || '',
            isDefault: isDefault || false,
            createdAt: new Date().toISOString()
        };

        let addresses = user.addresses || [];
        if (newAddress.isDefault) {
            addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
        }
        addresses.push(newAddress);

        await usersCollection.update({ id: userId }, { addresses });
        res.json({ success: true, data: addresses });
    } catch (error) {
        console.error('خطا در addAddress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const removeAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        const user = await usersCollection.getById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        const addresses = (user.addresses || []).filter(addr => addr.id !== parseInt(addressId));
        await usersCollection.update({ id: userId }, { addresses });

        res.json({ success: true, data: addresses });
    } catch (error) {
        console.error('خطا در removeAddress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await usersCollection.getById(userId);

        res.json({ success: true, data: user?.wishlist || [] });
    } catch (error) {
        console.error('خطا در getWishlist:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, error: 'شناسه محصول الزامی است' });
        }

        const user = await usersCollection.getById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        let wishlist = user.wishlist || [];
        if (wishlist.includes(productId)) {
            return res.status(409).json({ success: false, error: 'این محصول قبلاً در علاقه‌مندی‌ها وجود دارد' });
        }

        wishlist.push(productId);
        await usersCollection.update({ id: userId }, { wishlist });

        res.json({ success: true, data: wishlist });
    } catch (error) {
        console.error('خطا در addToWishlist:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const user = await usersCollection.getById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        const wishlist = (user.wishlist || []).filter(id => id !== parseInt(productId));
        await usersCollection.update({ id: userId }, { wishlist });

        res.json({ success: true, data: wishlist });
    } catch (error) {
        console.error('خطا در removeFromWishlist:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const addSearchHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ success: false, error: 'عبارت جستجو الزامی است' });
        }

        const user = await usersCollection.getById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        }

        let searchHistory = user.searchHistory || [];
        searchHistory = searchHistory.filter(item => item.query !== query);
        searchHistory.unshift({ query, timestamp: new Date().toISOString() });
        if (searchHistory.length > 20) searchHistory = searchHistory.slice(0, 20);

        await usersCollection.update({ id: userId }, { searchHistory });
        res.json({ success: true });
    } catch (error) {
        console.error('خطا در addSearchHistory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getSearchHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await usersCollection.getById(userId);

        res.json({ success: true, data: user?.searchHistory || [] });
    } catch (error) {
        console.error('خطا در getSearchHistory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const users = await usersCollection.getAll();
        const publicUsers = users.map(({ password, ...rest }) => rest);

        res.json({ success: true, data: publicUsers });
    } catch (error) {
        console.error('خطا در getAllUsers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const deactivateUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const { id } = req.params;
        await usersCollection.update({ id: parseInt(id) }, { isActive: false });

        res.json({ success: true, message: 'کاربر غیرفعال شد' });
    } catch (error) {
        console.error('خطا در deactivateUser:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const activateUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز' });
        }

        const { id } = req.params;
        await usersCollection.update({ id: parseInt(id) }, { isActive: true });

        res.json({ success: true, message: 'کاربر فعال شد' });
    } catch (error) {
        console.error('خطا در activateUser:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    setCollection,
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    getAddresses,
    addAddress,
    removeAddress,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    addSearchHistory,
    getSearchHistory,
    getAllUsers,
    deactivateUser,
    activateUser
};
