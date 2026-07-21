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
    // Normalize AxioDB collection API to a predictable interface used by controllers
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
            return docs.find(d => d.id === parseInt(id) || d.id === id || d._id === id) || null;
        },

        async getByUsername(username) {
            const docs = await this.find({});
            return docs.find(d => d.username === username) || null;
        },

        async insert(data) {
            try {
                const res = await axiodbCollection.insert(data);
                // Try to normalize return value: prefer inserted document if provided
                if (res && res.data) return res.data;
                if (res && typeof res === 'object') return res;
                return data;
            } catch (e) {
                console.error('insert error:', e.message);
                throw e;
            }
        },

        async update(filter, updates) {
            try {
                const op = axiodbCollection.update(filter || {});
                const res = await op.UpdateOne(updates);
                // Try to return the updated document for convenience
                const id = filter && (filter.id || filter._id);
                if (id) {
                    return await this.getById(id);
                }
                return res;
            } catch (e) {
                console.error('update error:', e.message);
                throw e;
            }
        },

        async delete(filter) {
            try {
                const op = axiodbCollection.delete(filter || {});
                const res = await op.deleteOne();
                // Normalize to boolean success if possible
                if (res && typeof res === 'object') {
                    if ('success' in res) return res.success;
                    if ('deletedCount' in res) return res.deletedCount > 0;
                }
                return true;
            } catch (e) {
                console.error('delete error:', e.message);
                throw e;
            }
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
            insert: async (data) => { jsonDB.products.push(data); return data; },
            update: async (filter, updates) => {
                const doc = jsonDB.products.find(p => p.id === filter.id || p._id === filter._id);
                if (doc) { Object.assign(doc, updates); return doc; }
                return null;
            },
            delete: async (filter) => {
                const origLen = jsonDB.products.length;
                jsonDB.products = jsonDB.products.filter(p => p.id !== filter.id);
                return jsonDB.products.length < origLen;
            }
        };

        const jsonUsersCollection = {
            find: async (filter) => jsonDB.users,
            getAll: async () => jsonDB.users,
            getById: async (id) => jsonDB.users.find(u => u.id === parseInt(id) || u.id === id),
            getByUsername: async (username) => jsonDB.users.find(u => u.username === username),
            insert: async (data) => { jsonDB.users.push(data); return data; },
            update: async (filter, updates) => {
                const doc = jsonDB.users.find(u => u.id === filter.id || u._id === filter._id);
                if (doc) { Object.assign(doc, updates); return doc; }
                return null;
            },
            delete: async (filter) => {
                const origLen = jsonDB.users.length;
                jsonDB.users = jsonDB.users.filter(u => u.id !== filter.id);
                return jsonDB.users.length < origLen;
            }
        };

        const jsonCommentsCollection = {
            find: async (filter) => jsonDB.comments,
            getAll: async () => jsonDB.comments,
            getById: async (id) => jsonDB.comments.find(c => c.id === parseInt(id) || c.id === id),
            insert: async (data) => { jsonDB.comments.push(data); return data; },
            update: async (filter, updates) => {
                const doc = jsonDB.comments.find(c => c.id === filter.id || c._id === filter._id);
                if (doc) { Object.assign(doc, updates); return doc; }
                return null;
            },
            delete: async (filter) => {
                const origLen = jsonDB.comments.length;
                jsonDB.comments = jsonDB.comments.filter(c => c.id !== filter.id);
                return jsonDB.comments.length < origLen;
            }
        };

        const jsonOrdersCollection = {
            find: async (filter) => jsonDB.orders,
            getAll: async () => jsonDB.orders,
            getById: async (id) => jsonDB.orders.find(o => o.id === parseInt(id) || o.id === id),
            insert: async (data) => { jsonDB.orders.push(data); return data; },
            update: async (filter, updates) => {
                const doc = jsonDB.orders.find(o => o.id === filter.id || o._id === filter._id);
                if (doc) { Object.assign(doc, updates); return doc; }
                return null;
            },
            delete: async (filter) => {
                const origLen = jsonDB.orders.length;
                jsonDB.orders = jsonDB.orders.filter(o => o.id !== filter.id);
                return jsonDB.orders.length < origLen;
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