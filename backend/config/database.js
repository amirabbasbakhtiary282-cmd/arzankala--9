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

// Persistent JSON fallback utilities
const JSON_DB_FILE = path.join(DB_PATH, 'fallback-db.json');
function loadJsonDB() {
    try {
        if (fs.existsSync(JSON_DB_FILE)) {
            const raw = fs.readFileSync(JSON_DB_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('loadJsonDB error:', e.message);
    }
    return { products: [], users: [], comments: [], orders: [] };
}

function saveJsonDB(dbObj) {
    try {
        fs.writeFileSync(JSON_DB_FILE + '.tmp', JSON.stringify(dbObj, null, 2), 'utf8');
        fs.renameSync(JSON_DB_FILE + '.tmp', JSON_DB_FILE);
    } catch (e) {
        console.error('saveJsonDB error:', e.message);
    }
}

function createJsonCollection(dbObj, key) {
    return {
        find: async (filter) => {
            return dbObj[key];
        },
        getAll: async () => dbObj[key],
        getById: async (id) => dbObj[key].find(d => d.id === parseInt(id) || d.id === id) || null,
        getByUsername: async (username) => dbObj[key].find(d => d.username === username) || null,
        insert: async (data) => {
            const item = { ...data };
            if (!Object.prototype.hasOwnProperty.call(item, 'id')) item.id = Date.now();
            dbObj[key].push(item);
            saveJsonDB(dbObj);
            return item;
        },
        update: async (filter, updates) => {
            const keyName = Object.keys(filter)[0];
            const val = filter[keyName];
            const idx = dbObj[key].findIndex(d => String(d[keyName]) === String(val));
            if (idx >= 0) {
                dbObj[key][idx] = { ...dbObj[key][idx], ...updates, updatedAt: new Date().toISOString() };
                saveJsonDB(dbObj);
                return dbObj[key][idx];
            }
            return null;
        },
        delete: async (filter) => {
            const keyName = Object.keys(filter)[0];
            const val = filter[keyName];
            const origLen = dbObj[key].length;
            dbObj[key] = dbObj[key].filter(d => String(d[keyName]) !== String(val));
            const changed = dbObj[key].length < origLen;
            if (changed) saveJsonDB(dbObj);
            return changed;
        }
    };
}

const connectDB = async () => {
    // Allow forcing JSON fallback via env var
    const forceJson = process.env.FORCE_JSON_DB === 'true' || process.env.USE_JSON_DB === 'true';

    if (!forceJson) {
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
            // fall through to JSON fallback
        }
    } else {
        console.warn('⚠️ FORCE_JSON_DB enabled - using JSON fallback instead of AxioDB');
    }

    // Persistent JSON fallback
    const jsonDB = loadJsonDB();

    const jsonProductsCollection = createJsonCollection(jsonDB, 'products');
    const jsonUsersCollection = createJsonCollection(jsonDB, 'users');
    const jsonCommentsCollection = createJsonCollection(jsonDB, 'comments');
    const jsonOrdersCollection = createJsonCollection(jsonDB, 'orders');

    console.log('⚠️ از دیتابیس JSON جایگزین استفاده می‌شود (فایل ذخیره‌سازی: ' + JSON_DB_FILE + ')');

    return {
        productsCollection: jsonProductsCollection,
        usersCollection: jsonUsersCollection,
        commentsCollection: jsonCommentsCollection,
        ordersCollection: jsonOrdersCollection
    };
};

module.exports = { connectDB, db };
