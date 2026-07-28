// ============================================================
// config/database.js
// اتصال به MySQL — تنها دیتابیس پروژه
// ============================================================
// این ماژول یک استخر اتصال (pool) به MySQL می‌سازد، جدول‌ها را
// در صورت نبود ایجاد می‌کند و برای هر جدول یک «collection» با
// همان اینترفیسی که کنترلرها انتظار دارند برمی‌گرداند:
//   getAll / getById / getByUsername / find / insert / update / delete / count
// ============================================================

const mysql = require('mysql2/promise');

// ============================================================
// 🔧 خواندن تنظیمات اتصال از متغیرهای محیطی
// ============================================================
// از هر دو حالت پشتیبانی می‌کند:
//   ۱) یک URL کامل:  mysql://user:pass@host:port/dbname
//      (نام‌های رایج: DATABASE_URL, MYSQL_URL, MYSQL_PUBLIC_URL, JAWSDB_URL, CLEARDB_DATABASE_URL)
//   ۲) متغیرهای جدا: MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE
//      (و معادل‌های DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME)
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
        const parsed = new URL(url);
        cfg = {
            host: decodeURIComponent(parsed.hostname),
            port: parseInt(parsed.port || '3306', 10),
            user: decodeURIComponent(parsed.username || 'root'),
            password: decodeURIComponent(parsed.password || ''),
            database: decodeURIComponent((parsed.pathname || '').replace(/^\//, '')) || 'railway',
            source: 'url'
        };
        // بعضی سرویس‌ها SSL را در query string اعلام می‌کنند
        if (/ssl-mode=REQUIRED|sslaccept=strict|ssl=true/i.test(parsed.search || '')) {
            cfg.forceSSL = true;
        }
    } else {
        cfg = {
            host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
            user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
            password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
            database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'arzankala',
            source: 'env'
        };
    }

    // فعال‌سازی SSL (برای ارائه‌دهنده‌های ابری مثل Aiven / PlanetScale)
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
// فیلدهای «ساختاردار» (آرایه/شیء) در ستون JSON ذخیره می‌شوند تا
// دقیقاً همان شکل داده‌ای که کنترلرها انتظار دارند حفظ شود.
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

// ستون‌هایی که مقدارشان JSON است و باید هنگام خواندن/نوشتن تبدیل شوند
const JSON_COLUMNS = {
    products: ['specs'],
    users: ['addresses', 'wishlist', 'searchHistory', 'settings'],
    comments: ['pros', 'cons', 'images', 'helpfulUsers', 'reply', 'aiAnalysis'],
    orders: ['items']
};

// ستون‌هایی که باید به boolean واقعی تبدیل شوند (MySQL آن‌ها را 0/1 برمی‌گرداند)
const BOOL_COLUMNS = {
    products: [],
    users: ['isActive'],
    comments: ['isApproved', 'isVerifiedPurchase'],
    orders: []
};

// ============================================================
// 🔁 تبدیل ردیف MySQL به شیء جاوااسکریپت (همان شکل قبلی)
// ============================================================
function parseRow(table, row) {
    if (!row) return null;
    const out = { ...row };

    for (const col of JSON_COLUMNS[table] || []) {
        const val = out[col];
        if (val === null || val === undefined) {
            // مقدار پیش‌فرض منطقی بر اساس نوع فیلد
            out[col] = (col === 'reply')
                ? { content: '', repliedBy: null, repliedAt: null }
                : (col === 'specs' || col === 'settings' || col === 'aiAnalysis') ? (col === 'aiAnalysis' ? null : {}) : [];
            continue;
        }
        if (typeof val === 'string') {
            try { out[col] = JSON.parse(val); } catch { /* مقدار خام بماند */ }
        }
        // اگر درایور خودش parse کرده باشد، همان مقدار درست است
    }

    for (const col of BOOL_COLUMNS[table] || []) {
        if (out[col] !== null && out[col] !== undefined) {
            out[col] = Boolean(out[col]);
        }
    }

    // اعداد اعشاری MySQL به صورت رشته برمی‌گردند
    if (table === 'products') {
        if (out.rating !== null && out.rating !== undefined) out.rating = parseFloat(out.rating);
        if (out.priceUSD !== null && out.priceUSD !== undefined) out.priceUSD = parseFloat(out.priceUSD);
        if (out.oldPriceUSD !== null && out.oldPriceUSD !== undefined) out.oldPriceUSD = parseFloat(out.oldPriceUSD);
    }

    return out;
}

// آماده‌سازی مقدار برای نوشتن در MySQL
function serializeValue(table, col, val) {
    if ((JSON_COLUMNS[table] || []).includes(col)) {
        return val === undefined ? null : JSON.stringify(val ?? null);
    }
    if ((BOOL_COLUMNS[table] || []).includes(col)) {
        if (val === undefined || val === null) return null;
        return val ? 1 : 0;
    }
    if (val === undefined) return null;
    // شیء/آرایه‌ای که ستون JSON نیست را هم به رشته تبدیل می‌کنیم تا خطا ندهد
    if (val !== null && typeof val === 'object') return JSON.stringify(val);
    return val;
}

// ============================================================
// 📚 ساخت اینترفیس collection برای هر جدول
// ============================================================
function createCollection(table) {
    // فقط ستون‌هایی که واقعاً در جدول هستند نوشته می‌شوند
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

    // ساخت WHERE از یک فیلتر ساده {key: value}
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
            // اگر id داده نشده باشد، AUTO_INCREMENT خود MySQL آن را تعیین می‌کند
            const entries = Object.entries(data)
                .filter(([k, v]) => cols.has(k) && !(k === 'id' && (v === undefined || v === null)));

            if (entries.length === 0) throw new Error(`insert: هیچ ستون معتبری برای جدول ${table} ارسال نشد`);

            const names = entries.map(([k]) => `\`${k}\``).join(', ');
            const holders = entries.map(() => '?').join(', ');
            const params = entries.map(([k, v]) => serializeValue(table, k, v));

            const [result] = await pool.query(
                `INSERT INTO \`${table}\` (${names}) VALUES (${holders})`, params
            );

            // شناسهٔ نهایی: یا همان که دادیم، یا آنچه MySQL تولید کرده
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

            // بازگرداندن رکورد به‌روزشده (مثل رفتار قبلی)
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

        // بیشترین id فعلی — برای تولید id بعدی بدون خواندن کل جدول
        async maxId() {
            const [rows] = await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM \`${table}\``);
            return Number(rows[0].m) || 0;
        },

        // ------------------------------------------------------------
        // درج با شناسهٔ خودکار
        // ------------------------------------------------------------
        // شناسه را خود MySQL از طریق AUTO_INCREMENT تولید می‌کند؛
        // این کار کاملاً اتمیک است و در درخواست‌های همزمان هرگز
        // شناسهٔ تکراری یا رکورد گم‌شده به وجود نمی‌آید.
        // ------------------------------------------------------------
        async insertWithNextId(data) {
            const payload = { ...data };
            delete payload.id;
            return await this.insert(payload);
        }
    };
}

// ============================================================
// 🏗️ ساخت دیتابیس در صورت نبود
// ============================================================
// روی سرویس‌های ابری معمولاً دیتابیس از قبل ساخته شده است، اما
// روی سرور یا سیستم شخصی ممکن است هنوز وجود نداشته باشد.
// ============================================================
async function createDatabaseIfMissing() {
    // اتصال بدون انتخاب دیتابیس
    const admin = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl,
        connectTimeout: 15000
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

// ============================================================
// 🏗️ ساخت جدول‌ها
// ============================================================
async function ensureSchema() {
    for (const stmt of SCHEMA) {
        await pool.query(stmt);
    }
    console.log('✅ ساختار جدول‌های MySQL بررسی/ایجاد شد');
}

// ============================================================
// ⏳ اتصال با تلاش مجدد
// ============================================================
// روی Render گاهی سرور زودتر از دیتابیس بالا می‌آید، پس چند بار
// با تأخیر فزاینده تلاش می‌کنیم و در صورت شکست کامل خطا می‌دهیم.
// ============================================================
const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '8', 10);
const RETRY_BASE_MS = parseInt(process.env.DB_RETRY_DELAY_MS || '2000', 10);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const connectDB = async () => {
    const safeTarget = `${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
    console.log(`🔄 در حال اتصال به MySQL: ${safeTarget}`);

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            pool = mysql.createPool({
                host: dbConfig.host,
                port: dbConfig.port,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                ssl: dbConfig.ssl,
                waitForConnections: true,
                connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
                queueLimit: 0,
                charset: 'utf8mb4',
                enableKeepAlive: true,
                keepAliveInitialDelay: 10000,
                connectTimeout: 15000,
                timezone: 'Z',
                // اعداد بزرگ به صورت رشته برنگردند
                supportBigNumbers: true,
                bigNumberStrings: false
            });

            // تست واقعی اتصال
            let conn;
            try {
                conn = await pool.getConnection();
            } catch (err) {
                // اگر فقط «دیتابیس وجود ندارد» بود، یک بار تلاش می‌کنیم بسازیمش
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

            console.log(`✅ اتصال به MySQL برقرار شد (تلاش ${attempt})`);

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
            lastError = error;
            // استخر ناموفق را ببندیم تا نشتی نداشته باشیم
            if (pool) {
                try { await pool.end(); } catch { /* ignore */ }
                pool = null;
            }

            console.error(`❌ تلاش ${attempt}/${MAX_RETRIES} برای اتصال به MySQL ناموفق بود: ${error.message}`);

            if (attempt < MAX_RETRIES) {
                const delay = Math.min(RETRY_BASE_MS * attempt, 15000);
                console.log(`⏳ ${Math.round(delay / 1000)} ثانیه صبر و تلاش مجدد...`);
                await sleep(delay);
            }
        }
    }

    // همه تلاش‌ها ناموفق بود
    const hint = [
        '',
        '💡 راهنمای رفع مشکل:',
        '   • متغیر MYSQL_URL (یا DATABASE_URL) را در تنظیمات سرویس بررسی کنید.',
        '   • اگر از Railway استفاده می‌کنید حتماً آدرس عمومی (MYSQL_PUBLIC_URL) را بگذارید،',
        '     نه آدرس داخلی mysql.railway.internal — چون Render به شبکه داخلی Railway دسترسی ندارد.',
        '   • اگر دیتابیس SSL می‌خواهد، MYSQL_SSL=true را اضافه کنید.',
        ''
    ].join('\n');

    throw new Error(`اتصال به MySQL پس از ${MAX_RETRIES} تلاش برقرار نشد: ${lastError && lastError.message}${hint}`);
};

// دسترسی مستقیم به pool (برای seed و تست)
const getPool = () => pool;

const closeDB = async () => {
    if (pool) {
        try { await pool.end(); } catch { /* ignore */ }
        pool = null;
    }
};

module.exports = { connectDB, getPool, closeDB, dbConfig, createCollection, ensureSchema };
