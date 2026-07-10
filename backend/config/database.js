const { AxioDB } = require('axiodb');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'AxioDB');

if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

const db = new AxioDB({
    GUI: true,
    port: 27018,
    CustomPath: DB_PATH
});

function createCollectionWrapper(axiodbCollection) {
    return {
        async find(filter) {
            try {
                if (!axiodbCollection || typeof axiodbCollection.query !== 'function') {
                    console.error('find: axiodbCollection is invalid');
                    return [];
                }
                const result = await axiodbCollection.query(filter || {}).Limit(10000).exec();
                const docs = result?.data?.documents || [];
                return docs.map(doc => {
                    const plain = { ...doc };
                    if (plain._id && !plain.id) {
                        plain.id = plain._id;
                    }
                    return plain;
                });
            } catch (e) {
                console.error('find error:', e.message);
                return [];
            }
        },

        async getAll() {
            return this.find({});
        },

        async getById(id) {
            const docs = await this.find({});
            return docs.find(d => d.id === parseInt(id) || d.id === id || d._id === id);
        },

        async getByUsername(username) {
            const docs = await this.find({});
            return docs.find(d => d.username === username);
        },

        async insert(data) {
            return await axiodbCollection.insert(data);
        },

        async update(filter, updates) {
            const op = axiodbCollection.update(filter);
            return await op.UpdateOne(updates);
        },

        async delete(filter) {
            const op = axiodbCollection.delete(filter);
            return await op.deleteOne();
        }
    };
}

const connectDB = async () => {
    try {
        console.log('🔄 در حال اتصال به دیتابیس AxioDB...');

        const mainDB = await db.createDB('ArzanKalaDB');

        let productsRaw, usersRaw, commentsRaw;

        try { productsRaw = await mainDB.createCollection('products'); } catch (e) { productsRaw = await mainDB.createCollection('products'); }
        try { usersRaw = await mainDB.createCollection('users'); } catch (e) { usersRaw = await mainDB.createCollection('users'); }
        try { commentsRaw = await mainDB.createCollection('comments'); } catch (e) { commentsRaw = await mainDB.createCollection('comments'); }
        let ordersRaw;
        try { ordersRaw = await mainDB.createCollection('orders'); } catch (e) { ordersRaw = await mainDB.createCollection('orders'); }

        const productsCollection = createCollectionWrapper(productsRaw);
        const usersCollection = createCollectionWrapper(usersRaw);
        const commentsCollection = createCollectionWrapper(commentsRaw);
        const ordersCollection = createCollectionWrapper(ordersRaw);

        console.log('✅ اتصال به دیتابیس AxioDB برقرار شد');
        console.log(`🌐 محیط گرافیکی: http://localhost:27018`);

        // Small delay to allow GUI server to initialize
        await new Promise(resolve => setTimeout(resolve, 500));

        return { productsCollection, usersCollection, commentsCollection, ordersCollection };
    } catch (error) {
        console.error('❌ خطا در اتصال به AxioDB:', error.message);
        console.error('⚠️ در حال استفاده از دیتابیس JSON جایگزین...');

        const jsonDB = {
            products: [],
            users: [],
            comments: [],
            orders: []
        };

        const jsonProductsCollection = {
            find: async (filter) => jsonDB.products,
            getAll: async () => jsonDB.products,
            getById: async (id) => jsonDB.products.find(p => p.id === parseInt(id) || p.id === id),
            insert: async (data) => { jsonDB.products.push(data); return true; },
            update: async (filter, updates) => {
                const doc = jsonDB.products.find(p => p.id === filter.id);
                if (doc) { Object.assign(doc, updates); return true; }
                return false;
            },
            delete: async (filter) => {
                jsonDB.products = jsonDB.products.filter(p => p.id !== filter.id);
                return true;
            }
        };

        const jsonUsersCollection = {
            find: async (filter) => jsonDB.users,
            getAll: async () => jsonDB.users,
            getById: async (id) => jsonDB.users.find(u => u.id === parseInt(id) || u.id === id),
            getByUsername: async (username) => jsonDB.users.find(u => u.username === username),
            insert: async (data) => { jsonDB.users.push(data); return true; },
            update: async (filter, updates) => {
                const doc = jsonDB.users.find(u => u.id === filter.id);
                if (doc) { Object.assign(doc, updates); return true; }
                return false;
            },
            delete: async (filter) => {
                jsonDB.users = jsonDB.users.filter(u => u.id !== filter.id);
                return true;
            }
        };

        const jsonCommentsCollection = {
            find: async (filter) => jsonDB.comments,
            getAll: async () => jsonDB.comments,
            getById: async (id) => jsonDB.comments.find(c => c.id === parseInt(id) || c.id === id),
            insert: async (data) => { jsonDB.comments.push(data); return true; },
            update: async (filter, updates) => {
                const doc = jsonDB.comments.find(c => c.id === filter.id);
                if (doc) { Object.assign(doc, updates); return true; }
                return false;
            },
            delete: async (filter) => {
                jsonDB.comments = jsonDB.comments.filter(c => c.id !== filter.id);
                return true;
            }
        };

        const jsonOrdersCollection = {
            find: async (filter) => jsonDB.orders,
            getAll: async () => jsonDB.orders,
            getById: async (id) => jsonDB.orders.find(o => o.id === parseInt(id) || o.id === id),
            insert: async (data) => { jsonDB.orders.push(data); return true; },
            update: async (filter, updates) => {
                const doc = jsonDB.orders.find(o => o.id === filter.id);
                if (doc) { Object.assign(doc, updates); return true; }
                return false;
            },
            delete: async (filter) => {
                jsonDB.orders = jsonDB.orders.filter(o => o.id !== filter.id);
                return true;
            }
        };

        console.log('⚠️ از دیتابیس JSON جایگزین استفاده می‌شود');

        return {
            productsCollection: jsonProductsCollection,
            usersCollection: jsonUsersCollection,
            commentsCollection: jsonCommentsCollection,
            ordersCollection: jsonOrdersCollection
        };
    }
};

module.exports = { connectDB, db };
