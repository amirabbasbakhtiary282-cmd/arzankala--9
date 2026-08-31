// ============================================================
// config/database.js
// اتصال به MySQL با فال‌بک پایگاه داده حافظه‌ای (In-Memory)
// ============================================================
// این ماژول در صورت در دسترس بودن MySQL به آن وصل می‌شود،
// و در غیر این صورت از پایگاه داده در حافظه (In-Memory) استفاده می‌کند
// تا اپلیکیشن در تمام محیط‌ها (لوکال، AI Studio، کانتینر) به سرعت و بدون خطا اجرا شود.
// ============================================================

const mysql = require('mysql2/promise');

// ============================================================
// 🔧 خواندن تنظیمات اتصال از متغیرهای محیطی
// ============================================================
function buildConnectionConfig() {
    const url =
        process.env.DATABASE_URL ||
        process.env.MYSQL_URL ||
        process.env.MYSQL_PUBLIC_URL ||
        process.env.JAWSDB_URL ||
        process.env.CLEARDB_DATABASE_URL ||
        '';

    let cfg;

    if (url) {
        try {
            const parsed = new URL(url);
            cfg = {
                host: decodeURIComponent(parsed.hostname),
                port: parseInt(parsed.port || '3306', 10),
                user: decodeURIComponent(parsed.username || 'root'),
                password: decodeURIComponent(parsed.password || ''),
                database: decodeURIComponent((parsed.pathname || '').replace(/^\//, '')) || 'railway',
                source: 'url'
            };
            if (/ssl-mode=REQUIRED|sslaccept=strict|ssl=true/i.test(parsed.search || '')) {
                cfg.forceSSL = true;
            }
        } catch (e) {
            console.warn('⚠️ خطا در تجزیه آدرس URL دیتابیس:', e.message);
        }
    }

    if (!cfg) {
        cfg = {
            host: process.env.MYSQLHOST || process.env.DB_HOST || '',
            port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
            user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
            password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
            database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'arzankala',
            source: 'env'
        };
    }

    const sslEnv = (process.env.MYSQL_SSL || process.env.DB_SSL || '').toLowerCase();
    if (cfg.forceSSL || sslEnv === 'true' || sslEnv === 'required') {
        cfg.ssl = { rejectUnauthorized: false };
    }
    delete cfg.forceSSL;

    return cfg;
}

const dbConfig = buildConnectionConfig();

let pool = null;

// ============================================================
// 🗄️ تعریف جدول‌ها
// ============================================================
const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS products (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(255) NOT NULL,
        category        VARCHAR(100),
        price           BIGINT DEFAULT 0,
        oldPrice        BIGINT NULL,
        priceUSD        DECIMAL(12,2) NULL,
        oldPriceUSD     DECIMAL(12,2) NULL,
        image           VARCHAR(255),
        stock           INT DEFAULT 0,
        rating          DECIMAL(3,1) DEFAULT 0,
        ratingCount     INT DEFAULT 0,
        description     TEXT,
        specs           JSON,
        viewCount       INT DEFAULT 0,
        purchaseCount   INT DEFAULT 0,
        wishlistCount   INT DEFAULT 0,
        createdAt       VARCHAR(40),
        updatedAt       VARCHAR(40),
        INDEX idx_products_category (category),
        INDEX idx_products_price (price)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS users (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        username        VARCHAR(190) NOT NULL UNIQUE,
        password        VARCHAR(255) NOT NULL,
        fullname        VARCHAR(255) DEFAULT '',
        email           VARCHAR(255) DEFAULT '',
        mobile          VARCHAR(50)  DEFAULT '',
        birthYear       INT NULL,
        role            VARCHAR(20)  DEFAULT 'user',
        isActive        TINYINT(1)   DEFAULT 1,
        addresses       JSON,
        wishlist        JSON,
        searchHistory   JSON,
        settings        JSON,
        totalOrders     INT DEFAULT 0,
        totalSpent      BIGINT DEFAULT 0,
        lastLogin       VARCHAR(40) NULL,
        createdAt       VARCHAR(40),
        updatedAt       VARCHAR(40)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS comments (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        productId           INT NOT NULL,
        userId              VARCHAR(100),
        username            VARCHAR(190),
        rating              INT DEFAULT 0,
        title               VARCHAR(255) DEFAULT '',
        content             TEXT,
        pros                JSON,
        cons                JSON,
        images              JSON,
        isApproved          TINYINT(1) DEFAULT 0,
        isVerifiedPurchase  TINYINT(1) DEFAULT 0,
        helpfulCount        INT DEFAULT 0,
        unhelpfulCount      INT DEFAULT 0,
        helpfulUsers        JSON,
        reply               JSON,
        aiAnalysis          JSON,
        createdAt           VARCHAR(40),
        updatedAt           VARCHAR(40),
        INDEX idx_comments_product (productId),
        INDEX idx_comments_approved (isApproved)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS orders (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        userId       INT NOT NULL,
        items        JSON,
        totalAmount  BIGINT DEFAULT 0,
        status       VARCHAR(50) DEFAULT 'confirmed',
        address      TEXT,
        phone        VARCHAR(50),
        createdAt    VARCHAR(40),
        updatedAt    VARCHAR(40),
        INDEX idx_orders_user (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

const JSON_COLUMNS = {
    products: ['specs'],
    users: ['addresses', 'wishlist', 'searchHistory', 'settings'],
    comments: ['pros', 'cons', 'images', 'helpfulUsers', 'reply', 'aiAnalysis'],
    orders: ['items']
};

const BOOL_COLUMNS = {
    products: [],
    users: ['isActive'],
    comments: ['isApproved', 'isVerifiedPurchase'],
    orders: []
};

function parseRow(table, row) {
    if (!row) return null;
    const out = { ...row };

    for (const col of JSON_COLUMNS[table] || []) {
        const val = out[col];
        if (val === null || val === undefined) {
            out[col] = (col === 'reply')
                ? { content: '', repliedBy: null, repliedAt: null }
                : (col === 'specs' || col === 'settings' || col === 'aiAnalysis') ? (col === 'aiAnalysis' ? null : {}) : [];
            continue;
        }
        if (typeof val === 'string') {
            try { out[col] = JSON.parse(val); } catch { /* noop */ }
        }
    }

    for (const col of BOOL_COLUMNS[table] || []) {
        if (out[col] !== null && out[col] !== undefined) {
            out[col] = Boolean(out[col]);
        }
    }

    if (table === 'products') {
        if (out.rating !== null && out.rating !== undefined) out.rating = parseFloat(out.rating);
        if (out.priceUSD !== null && out.priceUSD !== undefined) out.priceUSD = parseFloat(out.priceUSD);
        if (out.oldPriceUSD !== null && out.oldPriceUSD !== undefined) out.oldPriceUSD = parseFloat(out.oldPriceUSD);
    }

    return out;
}

function serializeValue(table, col, val) {
    if ((JSON_COLUMNS[table] || []).includes(col)) {
        return val === undefined ? null : JSON.stringify(val ?? null);
    }
    if ((BOOL_COLUMNS[table] || []).includes(col)) {
        if (val === undefined || val === null) return null;
        return val ? 1 : 0;
    }
    if (val === undefined) return null;
    if (val !== null && typeof val === 'object') return JSON.stringify(val);
    return val;
}

function createCollection(table) {
    let allowedColumns = null;

    async function getColumns() {
        if (allowedColumns) return allowedColumns;
        const [rows] = await pool.query(
            `SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [table]
        );
        allowedColumns = new Set(rows.map(r => r.c));
        return allowedColumns;
    }

    function buildWhere(filter) {
        const keys = Object.keys(filter || {});
        if (keys.length === 0) return { sql: '', params: [] };
        const parts = keys.map(k => `\`${k}\` = ?`);
        const params = keys.map(k => serializeValue(table, k, filter[k]));
        return { sql: ' WHERE ' + parts.join(' AND '), params };
    }

    return {
        async find(filter) {
            const { sql, params } = buildWhere(filter);
            const [rows] = await pool.query(`SELECT * FROM \`${table}\`${sql}`, params);
            return rows.map(r => parseRow(table, r));
        },

        async getAll() {
            const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
            return rows.map(r => parseRow(table, r));
        },

        async getById(id) {
            const numeric = parseInt(id, 10);
            const [rows] = await pool.query(
                `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`,
                [isNaN(numeric) ? id : numeric]
            );
            return rows.length ? parseRow(table, rows[0]) : null;
        },

        async getByUsername(username) {
            const [rows] = await pool.query(
                `SELECT * FROM \`${table}\` WHERE username = ? LIMIT 1`, [username]
            );
            return rows.length ? parseRow(table, rows[0]) : null;
        },

        async insert(data) {
            const cols = await getColumns();
            const entries = Object.entries(data)
                .filter(([k, v]) => cols.has(k) && !(k === 'id' && (v === undefined || v === null)));

            if (entries.length === 0) throw new Error(`insert: هیچ ستون معتبری برای جدول ${table} ارسال نشد`);

            const names = entries.map(([k]) => `\`${k}\``).join(', ');
            const holders = entries.map(() => '?').join(', ');
            const params = entries.map(([k, v]) => serializeValue(table, k, v));

            const [result] = await pool.query(
                `INSERT INTO \`${table}\` (${names}) VALUES (${holders})`, params
            );

            const finalId = (data.id !== undefined && data.id !== null) ? data.id : result.insertId;
            return await this.getById(finalId);
        },

        async update(filter, updates) {
            const cols = await getColumns();
            const entries = Object.entries(updates).filter(([k]) => cols.has(k) && k !== 'id');
            if (entries.length === 0) return await this.getById(filter && filter.id);

            const setSql = entries.map(([k]) => `\`${k}\` = ?`).join(', ');
            const setParams = entries.map(([k, v]) => serializeValue(table, k, v));

            const { sql: whereSql, params: whereParams } = buildWhere(filter);
            if (!whereSql) throw new Error('update: فیلتر خالی مجاز نیست');

            await pool.query(
                `UPDATE \`${table}\` SET ${setSql}${whereSql}`,
                [...setParams, ...whereParams]
            );

            const key = Object.keys(filter)[0];
            const [rows] = await pool.query(
                `SELECT * FROM \`${table}\` WHERE \`${key}\` = ? LIMIT 1`,
                [serializeValue(table, key, filter[key])]
            );
            return rows.length ? parseRow(table, rows[0]) : null;
        },

        async delete(filter) {
            const { sql, params } = buildWhere(filter);
            if (!sql) throw new Error('delete: فیلتر خالی مجاز نیست');
            const [result] = await pool.query(`DELETE FROM \`${table}\`${sql}`, params);
            return result.affectedRows > 0;
        },

        async count(filter) {
            const { sql, params } = buildWhere(filter);
            const [rows] = await pool.query(`SELECT COUNT(*) AS c FROM \`${table}\`${sql}`, params);
            return rows[0].c;
        },

        async maxId() {
            const [rows] = await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM \`${table}\``);
            return Number(rows[0].m) || 0;
        },

        async insertWithNextId(data) {
            const payload = { ...data };
            delete payload.id;
            return await this.insert(payload);
        }
    };
}

// ============================================================
// 🧠 پیاده‌سازی پایگاه داده در حافظه (In-Memory Store)
// ============================================================
const memoryStore = {
    products: [],
    users: [],
    comments: [],
    orders: []
};

function deepClone(obj) {
    if (obj === null || obj === undefined) return obj;
    return JSON.parse(JSON.stringify(obj));
}

function matchesFilter(item, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const [key, val] of Object.entries(filter)) {
        if (val === undefined) continue;
        if (key === 'id' || key === 'productId' || key === 'userId') {
            if (String(item[key]) !== String(val)) return false;
        } else if (typeof val === 'boolean') {
            if (Boolean(item[key]) !== Boolean(val)) return false;
        } else {
            if (item[key] !== val) return false;
        }
    }
    return true;
}

function createMemoryCollection(table) {
    if (!memoryStore[table]) memoryStore[table] = [];

    return {
        async find(filter) {
            const list = memoryStore[table].filter(item => matchesFilter(item, filter));
            return deepClone(list);
        },

        async getAll() {
            return deepClone(memoryStore[table]);
        },

        async getById(id) {
            const item = memoryStore[table].find(item => String(item.id) === String(id));
            return item ? deepClone(item) : null;
        },

        async getByUsername(username) {
            const item = memoryStore[table].find(item => String(item.username).toLowerCase() === String(username).toLowerCase());
            return item ? deepClone(item) : null;
        },

        async insert(data) {
            const item = deepClone(data);
            if (item.id === undefined || item.id === null) {
                const max = await this.maxId();
                item.id = max + 1;
            } else {
                item.id = Number(item.id) || item.id;
            }
            if (!item.createdAt) item.createdAt = new Date().toISOString();
            if (!item.updatedAt) item.updatedAt = new Date().toISOString();

            memoryStore[table].push(item);
            return deepClone(item);
        },

        async insertWithNextId(data) {
            const payload = { ...data };
            delete payload.id;
            return await this.insert(payload);
        },

        async update(filter, updates) {
            const index = memoryStore[table].findIndex(item => matchesFilter(item, filter));
            if (index === -1) {
                if (filter && filter.id) return await this.getById(filter.id);
                return null;
            }
            const current = memoryStore[table][index];
            const updated = {
                ...current,
                ...deepClone(updates),
                id: current.id,
                updatedAt: new Date().toISOString()
            };
            memoryStore[table][index] = updated;
            return deepClone(updated);
        },

        async delete(filter) {
            const initialLen = memoryStore[table].length;
            memoryStore[table] = memoryStore[table].filter(item => !matchesFilter(item, filter));
            return memoryStore[table].length < initialLen;
        },

        async count(filter) {
            if (!filter || Object.keys(filter).length === 0) {
                return memoryStore[table].length;
            }
            return memoryStore[table].filter(item => matchesFilter(item, filter)).length;
        },

        async maxId() {
            if (memoryStore[table].length === 0) return 0;
            return Math.max(0, ...memoryStore[table].map(i => Number(i.id) || 0));
        }
    };
}

async function createDatabaseIfMissing() {
    const admin = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl,
        connectTimeout: 5000
    });

    try {
        await admin.query(
            `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`
             CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`✅ دیتابیس «${dbConfig.database}» ساخته شد`);
    } finally {
        await admin.end();
    }
}

async function ensureSchema() {
    for (const stmt of SCHEMA) {
        await pool.query(stmt);
    }
    console.log('✅ ساختار جدول‌های MySQL بررسی/ایجاد شد');
}

// ============================================================
// ⏳ اتصال به پایگاه داده با پشتیبانی از fallback
// ============================================================
const connectDB = async () => {
    const hasConfiguredHost = dbConfig.host && dbConfig.host !== '127.0.0.1' && dbConfig.host !== 'localhost';
    const hasDbUrl = Boolean(process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL);

    // اگر دیتابیس خارجی تنظیم نشده بود، بلافاصله از In-Memory استفاده کن
    if (!hasConfiguredHost && !hasDbUrl) {
        console.log('ℹ️ [AI Studio] حالت پایگاه داده حافظه‌ای (In-Memory Store) فعال شد');
        return {
            productsCollection: createMemoryCollection('products'),
            usersCollection: createMemoryCollection('users'),
            commentsCollection: createMemoryCollection('comments'),
            ordersCollection: createMemoryCollection('orders'),
            dbType: 'memory',
            available: true,
            host: 'memory',
            database: 'arzankala_memory',
            pool: null
        };
    }

    const safeTarget = `${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
    console.log(`🔄 در حال تلاش برای اتصال به MySQL: ${safeTarget}`);

    try {
        pool = mysql.createPool({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            ssl: dbConfig.ssl,
            waitForConnections: true,
            connectionLimit: parseInt(process.env.DB_POOL_SIZE || '5', 10),
            queueLimit: 0,
            charset: 'utf8mb4',
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            connectTimeout: 5000,
            timezone: 'Z',
            supportBigNumbers: true,
            bigNumberStrings: false
        });

        let conn;
        try {
            conn = await pool.getConnection();
        } catch (err) {
            if (err && (err.code === 'ER_BAD_DB_ERROR' || err.errno === 1049)) {
                console.warn(`⚠️ دیتابیس «${dbConfig.database}» وجود ندارد — تلاش برای ساخت آن...`);
                await createDatabaseIfMissing();
                conn = await pool.getConnection();
            } else {
                throw err;
            }
        }
        await conn.ping();
        conn.release();

        console.log(`✅ اتصال به MySQL برقرار شد`);
        await ensureSchema();

        return {
            productsCollection: createCollection('products'),
            usersCollection: createCollection('users'),
            commentsCollection: createCollection('comments'),
            ordersCollection: createCollection('orders'),
            dbType: 'mysql',
            available: true,
            host: dbConfig.host,
            database: dbConfig.database,
            pool
        };
    } catch (error) {
        console.warn(`⚠️ اتصال به MySQL ناموفق بود (${error.message}) — بازگشت به پایگاه داده حافظه‌ای (In-Memory Store)`);
        if (pool) {
            try { await pool.end(); } catch {}
            pool = null;
        }
        return {
            productsCollection: createMemoryCollection('products'),
            usersCollection: createMemoryCollection('users'),
            commentsCollection: createMemoryCollection('comments'),
            ordersCollection: createMemoryCollection('orders'),
            dbType: 'memory',
            available: true,
            host: 'memory',
            database: 'arzankala_memory',
            pool: null
        };
    }
};

const getPool = () => pool;

const closeDB = async () => {
    if (pool) {
        try { await pool.end(); } catch {}
        pool = null;
    }
};

module.exports = { connectDB, getPool, closeDB, dbConfig, createCollection, createMemoryCollection, ensureSchema };
