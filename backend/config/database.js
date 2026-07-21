const { AxioDB } = require('axiodb');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'AxioDB');
const JSON_DB_PATH = path.join(__dirname, '..', 'jsondb');

if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}
if (!fs.existsSync(JSON_DB_PATH)) {
    fs.mkdirSync(JSON_DB_PATH, { recursive: true });
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

// ---------- JSON file-backed fallback (persistent) ----------
function jsonFileHelpers(collectionName) {
    const filePath = path.join(JSON_DB_PATH, `${collectionName}.json`);

    function readAll() {
        try {
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
            }
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw || '[]');
        } catch (e) {
            console.error('json read error:', e.message);
            return [];
        }
    }

    function writeAll(data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (e) {
            console.error('json write error:', e.message);
            return false;
        }
    }

    return {
        async getAll() {
            return readAll();
        },
        async find(filter) {
            const all = readAll();
            if (!filter || Object.keys(filter).length === 0) return all;
            return all.filter(doc => Object.keys(filter).every(k => String(doc[k]) === String(filter[k])));
        },
        async getById(id) {
            const all = readAll();
            return all.find(d => d.id === parseInt(id) || d.id === id || d._id === id) || null;
        },
        async getByUsername(username) {
            const all = readAll();
            return all.find(d => d.username === username) || null;
        },
        async insert(data) {
            const all = readAll();
            const doc = { ...data };
            if (!doc.id) {
                const ids = all.map(d => parseInt(d.id)).filter(n => !isNaN(n));
                doc.id = ids.length > 0 ? Math.max(...ids) + 1 : 1;
            }
            all.push(doc);
            writeAll(all);
            return doc;
        },
        async update(filter, updates) {
            const all = readAll();
            const key = Object.keys(filter)[0];
            const val = filter[key];
            const idx = all.findIndex(d => String(d[key]) === String(val));
            if (idx === -1) return null;
            all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
            writeAll(all);
            return all[idx];
        },
        async delete(filter) {
            const all = readAll();
            const key = Object.keys(filter)[0];
            const val = filter[key];
            const newAll = all.filter(d => String(d[key]) !== String(val));
            const changed = newAll.length < all.length;
            if (changed) writeAll(newAll);
            return changed;
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

        return { productsCollection, usersCollection, commentsCollection, ordersCollection, usingAxioDB: true };
    } catch (error) {
        console.error('❌ خطا در اتصال به AxioDB:', error.message);
        console.error('⚠️ در حال استفاده از دیتابیس JSON فایل‌محور جایگزین (persistent fallback)...');

        const productsCollection = jsonFileHelpers('products');
        const usersCollection = jsonFileHelpers('users');
        const commentsCollection = jsonFileHelpers('comments');
        const ordersCollection = jsonFileHelpers('orders');

        return {
            productsCollection,
            usersCollection,
            commentsCollection,
            ordersCollection,
            usingAxioDB: false,
            jsonDbPath: JSON_DB_PATH
        };
    }
};

module.exports = { connectDB, db };
